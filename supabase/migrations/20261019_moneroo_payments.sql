-- Moneroo integration: additive migration; preserves existing transaction history.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_first_name text,
  ADD COLUMN IF NOT EXISTS customer_last_name text,
  ADD COLUMN IF NOT EXISTS checkout_url text,
  ADD COLUMN IF NOT EXISTS checkout_state text NOT NULL DEFAULT 'created';

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_checkout_state_check;
ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_checkout_state_check
  CHECK (checkout_state IN ('created', 'initializing', 'initialized', 'uncertain', 'rejected'));

CREATE UNIQUE INDEX IF NOT EXISTS transactions_moneroo_provider_reference_uidx
  ON public.transactions (provider_reference)
  WHERE payment_method = 'Moneroo' AND provider_reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS transactions_moneroo_one_pending_service_uidx
  ON public.transactions (type, item_id)
  WHERE payment_method = 'Moneroo' AND status = 'pending';

CREATE TABLE IF NOT EXISTS public.moneroo_webhook_events (
  event_key text PRIMARY KEY,
  event_name text NOT NULL,
  provider_reference text,
  transaction_reference text,
  remote_status text,
  processing_result text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.moneroo_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.moneroo_webhook_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.moneroo_webhook_events TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.transactions TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_moneroo_payment(
  p_type text,
  p_item_id text,
  p_customer jsonb,
  p_default_currency text DEFAULT 'XAF'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
  v_amount numeric(14,2);
  v_currency text;
  v_item_status text;
  v_item_name text;
  v_item_phone text;
  v_item_months integer;
  v_item_days integer;
  v_first_name text := trim(coalesce(p_customer->>'first_name', ''));
  v_last_name text := trim(coalesce(p_customer->>'last_name', ''));
  v_email text := lower(trim(coalesce(p_customer->>'email', '')));
  v_phone text := nullif(trim(coalesce(p_customer->>'phone', '')), '');
  v_default_currency text := upper(trim(coalesce(p_default_currency, 'XAF')));
BEGIN
  IF p_type NOT IN ('product_listing', 'banner_ad', 'subscription') OR nullif(trim(p_item_id), '') IS NULL THEN
    RAISE EXCEPTION 'Référence de prestation invalide';
  END IF;
  IF length(v_first_name) NOT BETWEEN 1 AND 120 OR length(v_last_name) NOT BETWEEN 1 AND 120
     OR v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' OR length(v_email) > 254 THEN
    RAISE EXCEPTION 'Coordonnées de paiement invalides';
  END IF;
  IF v_default_currency NOT IN ('XAF', 'XOF', 'CDF') THEN
    RAISE EXCEPTION 'La devise Moneroo par défaut doit être XAF, XOF ou CDF';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(p_type), hashtext(p_item_id));

  SELECT * INTO v_tx
  FROM public.transactions t
  WHERE t.type = p_type AND t.item_id = p_item_id
    AND t.payment_method = 'Moneroo' AND t.status = 'pending'
  ORDER BY t.created_at DESC
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'id', v_tx.id, 'reference', v_tx.reference, 'type', v_tx.type, 'item_id', v_tx.item_id,
      'amount', v_tx.amount, 'currency', v_tx.currency, 'status', v_tx.status,
      'checkout_state', v_tx.checkout_state, 'checkout_url', v_tx.checkout_url,
      'provider_reference', v_tx.provider_reference, 'created_at', v_tx.created_at,
      'customer', jsonb_build_object('first_name', v_tx.customer_first_name, 'last_name', v_tx.customer_last_name,
        'email', v_tx.customer_email, 'phone', v_tx.customer_phone)
    );
  END IF;

  IF p_type = 'product_listing' THEN
    IF p_item_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Annonce introuvable';
    END IF;
    SELECT pf.listing_price, upper(c.currency), p.status, p.title, p.seller_phone, p.duration_days
      INTO v_amount, v_currency, v_item_status, v_item_name, v_item_phone, v_item_days
    FROM public.products p
    JOIN public.product_private_fields pf ON pf.product_id = p.id
    JOIN public.countries c ON c.id = p.country_id
    WHERE p.id = p_item_id::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Annonce introuvable'; END IF;
  ELSIF p_type = 'banner_ad' THEN
    IF p_item_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Publicité introuvable';
    END IF;
    SELECT a.price,
      CASE WHEN upper(a.currency) IN ('XAF', 'XOF', 'CDF') THEN upper(a.currency) ELSE v_default_currency END,
      a.status, a.title, a.phone_number, a.duration_months
      INTO v_amount, v_currency, v_item_status, v_item_name, v_item_phone, v_item_months
    FROM public.banner_ads a WHERE a.id = p_item_id::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Publicité introuvable'; END IF;
  ELSE
    IF p_item_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Abonnement introuvable';
    END IF;
    SELECT s.price,
      CASE WHEN upper(s.currency) IN ('XAF', 'XOF', 'CDF') THEN upper(s.currency) ELSE v_default_currency END,
      s.status, concat(s.first_name, ' ', s.last_name), s.phone_number, s.plan_months
      INTO v_amount, v_currency, v_item_status, v_item_name, v_item_phone, v_item_months
    FROM public.seller_subscriptions s WHERE s.id = p_item_id::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Abonnement introuvable'; END IF;
  END IF;

  IF v_item_status <> 'pending_payment' THEN
    RAISE EXCEPTION 'Cette prestation ne peut pas être payée dans son état actuel';
  END IF;
  IF v_amount IS NULL OR v_amount <= 0 OR v_amount <> trunc(v_amount) THEN
    RAISE EXCEPTION 'Montant de paiement invalide';
  END IF;
  IF v_currency NOT IN ('XAF', 'XOF', 'CDF') THEN
    RAISE EXCEPTION 'Devise non prise en charge par cette configuration Moneroo';
  END IF;

  INSERT INTO public.transactions (
    reference, type, amount, currency, payment_method, status, item_id, customer_phone,
    customer_email, customer_first_name, customer_last_name, checkout_state
  ) VALUES (
    extensions.gen_random_uuid()::text, p_type, v_amount, v_currency, 'Moneroo', 'pending', p_item_id,
    coalesce(v_phone, v_item_phone), v_email, v_first_name, v_last_name, 'created'
  ) RETURNING * INTO v_tx;

  RETURN jsonb_build_object(
    'id', v_tx.id, 'reference', v_tx.reference, 'type', v_tx.type, 'item_id', v_tx.item_id,
    'amount', v_tx.amount, 'currency', v_tx.currency, 'status', v_tx.status,
    'checkout_state', v_tx.checkout_state, 'checkout_url', v_tx.checkout_url,
    'provider_reference', v_tx.provider_reference, 'created_at', v_tx.created_at,
    'customer', jsonb_build_object('first_name', v_tx.customer_first_name, 'last_name', v_tx.customer_last_name,
      'email', v_tx.customer_email, 'phone', v_tx.customer_phone),
    'service_name', v_item_name, 'duration', coalesce(v_item_days, v_item_months)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_moneroo_payment(text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_moneroo_payment(text, text, jsonb, text) TO service_role;

CREATE OR REPLACE FUNCTION public.retry_moneroo_payment(p_reference text, p_default_currency text DEFAULT 'XAF')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE v_tx public.transactions%ROWTYPE; v_customer jsonb;
BEGIN
  SELECT * INTO v_tx FROM public.transactions
  WHERE reference = p_reference AND payment_method = 'Moneroo'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction introuvable'; END IF;
  IF v_tx.status = 'pending' AND v_tx.checkout_state = 'rejected' THEN
    UPDATE public.transactions SET checkout_state = 'created', updated_at = now() WHERE id = v_tx.id;
    v_tx.checkout_state := 'created';
  END IF;
  IF v_tx.status = 'pending' OR v_tx.status = 'completed' THEN
    RETURN jsonb_build_object(
      'id', v_tx.id, 'reference', v_tx.reference, 'type', v_tx.type, 'item_id', v_tx.item_id,
      'amount', v_tx.amount, 'currency', v_tx.currency, 'status', v_tx.status,
      'checkout_state', v_tx.checkout_state, 'checkout_url', v_tx.checkout_url,
      'provider_reference', v_tx.provider_reference,
      'customer', jsonb_build_object('first_name', v_tx.customer_first_name, 'last_name', v_tx.customer_last_name,
        'email', v_tx.customer_email, 'phone', v_tx.customer_phone)
    );
  END IF;
  IF v_tx.status NOT IN ('failed', 'cancelled') THEN RAISE EXCEPTION 'Cette transaction ne peut pas être relancée'; END IF;
  v_customer := jsonb_build_object('first_name', v_tx.customer_first_name, 'last_name', v_tx.customer_last_name,
    'email', v_tx.customer_email, 'phone', v_tx.customer_phone);
  RETURN public.prepare_moneroo_payment(v_tx.type, v_tx.item_id, v_customer, p_default_currency);
END;
$$;
REVOKE ALL ON FUNCTION public.retry_moneroo_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retry_moneroo_payment(text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.claim_moneroo_checkout(p_reference text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH claimed AS (
    UPDATE public.transactions
    SET checkout_state = 'initializing'
    WHERE reference = p_reference AND payment_method = 'Moneroo'
      AND status = 'pending' AND checkout_state = 'created'
    RETURNING 1
  ) SELECT EXISTS (SELECT 1 FROM claimed);
$$;
REVOKE ALL ON FUNCTION public.claim_moneroo_checkout(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_moneroo_checkout(text) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_moneroo_checkout(p_reference text, p_provider_reference text, p_checkout_url text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_updated integer;
BEGIN
  IF nullif(trim(p_provider_reference), '') IS NULL OR p_checkout_url !~ '^https://checkout[.]moneroo[.]io/' THEN
    RAISE EXCEPTION 'Réponse Moneroo invalide';
  END IF;
  UPDATE public.transactions
  SET provider_reference = p_provider_reference, checkout_url = p_checkout_url,
      checkout_state = 'initialized', updated_at = now()
  WHERE reference = p_reference AND payment_method = 'Moneroo' AND status = 'pending'
    AND (provider_reference IS NULL OR provider_reference = p_provider_reference);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated = 1;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_moneroo_checkout(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_moneroo_checkout(text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_moneroo_checkout_uncertain(p_reference text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.transactions SET checkout_state = 'uncertain', updated_at = now()
  WHERE reference = p_reference AND payment_method = 'Moneroo' AND status = 'pending'
    AND checkout_state = 'initializing';
$$;
REVOKE ALL ON FUNCTION public.mark_moneroo_checkout_uncertain(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_moneroo_checkout_uncertain(text) TO service_role;

CREATE OR REPLACE FUNCTION public.mark_moneroo_checkout_rejected(p_reference text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.transactions SET checkout_state = 'rejected', updated_at = now()
  WHERE reference = p_reference AND payment_method = 'Moneroo' AND status = 'pending'
    AND checkout_state = 'initializing';
$$;
REVOKE ALL ON FUNCTION public.mark_moneroo_checkout_rejected(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_moneroo_checkout_rejected(text) TO service_role;

CREATE OR REPLACE FUNCTION public.apply_moneroo_verified_payment(
  p_reference text,
  p_provider_reference text,
  p_remote_status text,
  p_amount numeric,
  p_currency text,
  p_event_key text,
  p_event_name text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
  v_new_status text;
  v_result text := 'updated';
  v_rows integer;
BEGIN
  SELECT * INTO v_tx FROM public.transactions
  WHERE reference = p_reference AND payment_method = 'Moneroo'
  FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction Moneroo inconnue'; END IF;

  IF p_amount IS NULL OR p_amount <> v_tx.amount OR upper(coalesce(p_currency, '')) <> v_tx.currency THEN
    INSERT INTO public.moneroo_webhook_events(event_key,event_name,provider_reference,transaction_reference,remote_status,processing_result)
    VALUES (p_event_key,p_event_name,p_provider_reference,p_reference,p_remote_status,'amount_or_currency_mismatch')
    ON CONFLICT (event_key) DO NOTHING;
    RETURN jsonb_build_object('result','amount_or_currency_mismatch','status',v_tx.status);
  END IF;
  IF v_tx.provider_reference IS NOT NULL AND v_tx.provider_reference <> p_provider_reference THEN
    INSERT INTO public.moneroo_webhook_events(event_key,event_name,provider_reference,transaction_reference,remote_status,processing_result)
    VALUES (p_event_key,p_event_name,p_provider_reference,p_reference,p_remote_status,'provider_reference_mismatch')
    ON CONFLICT (event_key) DO NOTHING;
    RETURN jsonb_build_object('result','provider_reference_mismatch','status',v_tx.status);
  END IF;

  v_new_status := CASE lower(coalesce(p_remote_status, ''))
    WHEN 'success' THEN 'completed'
    WHEN 'failed' THEN 'failed'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'initiated' THEN 'pending'
    WHEN 'pending' THEN 'pending'
    ELSE 'pending'
  END;
  INSERT INTO public.moneroo_webhook_events(event_key,event_name,provider_reference,transaction_reference,remote_status,processing_result)
  VALUES (p_event_key,p_event_name,p_provider_reference,p_reference,p_remote_status,'verified')
  ON CONFLICT (event_key) DO NOTHING;
  IF NOT FOUND THEN
    UPDATE public.transactions SET updated_at = now() WHERE id = v_tx.id;
    RETURN jsonb_build_object('result','duplicate','status',v_tx.status);
  END IF;

  IF v_tx.status = 'completed' AND v_new_status <> 'completed' THEN
    RETURN jsonb_build_object('result','ignored_downgrade','status',v_tx.status);
  END IF;

  IF v_new_status = 'completed' AND v_tx.status <> 'completed' THEN
    IF v_tx.type = 'product_listing' THEN
      UPDATE public.products
      SET status = 'published', published_at = coalesce(published_at, now()),
          expires_at = now() + make_interval(days => duration_days),
          updated_at = now()
      WHERE id = v_tx.item_id::uuid AND status = 'pending_payment';
    ELSIF v_tx.type = 'banner_ad' THEN
      UPDATE public.banner_ads
      SET status = 'active', starts_at = now(), expires_at = now() + make_interval(days => duration_months * 30), updated_at = now()
      WHERE id = v_tx.item_id::uuid AND status = 'pending_payment';
    ELSIF v_tx.type = 'subscription' THEN
      UPDATE public.seller_subscriptions
      SET status = 'active', starts_at = now(), expires_at = now() + make_interval(months => plan_months), updated_at = now()
      WHERE id = v_tx.item_id::uuid AND status = 'pending_payment';
    END IF;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN
      IF v_tx.type = 'product_listing' AND NOT EXISTS (SELECT 1 FROM public.products WHERE id = v_tx.item_id::uuid) THEN RAISE EXCEPTION 'Prestation associée introuvable'; END IF;
      IF v_tx.type = 'banner_ad' AND NOT EXISTS (SELECT 1 FROM public.banner_ads WHERE id = v_tx.item_id::uuid) THEN RAISE EXCEPTION 'Prestation associée introuvable'; END IF;
      IF v_tx.type = 'subscription' AND NOT EXISTS (SELECT 1 FROM public.seller_subscriptions WHERE id = v_tx.item_id::uuid) THEN RAISE EXCEPTION 'Prestation associée introuvable'; END IF;
    END IF;
  END IF;

  UPDATE public.transactions
  SET provider_reference = p_provider_reference,
      status = CASE WHEN v_tx.status = 'completed' THEN 'completed' ELSE v_new_status END,
      checkout_state = 'initialized', verified_at = CASE WHEN v_new_status = 'completed' THEN now() ELSE verified_at END,
      updated_at = now()
  WHERE id = v_tx.id;
  RETURN jsonb_build_object('result',v_result,'status',CASE WHEN v_tx.status = 'completed' THEN 'completed' ELSE v_new_status END,
    'reference',v_tx.reference,'amount',v_tx.amount,'currency',v_tx.currency,'type',v_tx.type);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_moneroo_verified_payment(text, text, text, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_moneroo_verified_payment(text, text, text, numeric, text, text, text) TO service_role;
