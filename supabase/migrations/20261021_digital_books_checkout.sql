-- Livres numériques : jetons d'upload privés et extension transactionnelle Moneroo.
-- AVERTISSEMENT : migration LOCALE, NON EXÉCUTÉE sur le projet Supabase.
-- Ce fichier ne déclare PAS le paiement/la livraison prêts : déploiement, secrets,
-- vérification serveur Moneroo et Worker R2 privé restent à intégrer/tester.
-- Aucun retour navigateur, statut/URL client ou webhook non vérifié ne vaut preuve.
-- apply_moneroo_verified_payment reste exclusivement exécutable par service_role;
-- son appelant doit vérifier la référence et la réponse via l'API Moneroo serveur.
--
-- Pré-requis : 20261018_zando_core_secure, 20261019_moneroo_payments et
-- 20261020_digital_books. Les migrations existantes ne sont pas réécrites.
-- Les blocs historiques de submit_product (source cœur demandée) et des deux
-- fonctions Moneroo sont recopiés sans refactorisation : les ajouts sont gardés
-- par digital-products/book_purchase. Les frais d'annonce ne sont PAS le prix
-- d'achat du livre : ce dernier provient de products.price et countries.currency.
-- Ré-exécution : tables/index IF NOT EXISTS, index historique recréé, fonctions
-- CREATE OR REPLACE et ACL explicites. Pas de données d'achat fictives/backfill.

-- Limite admin configurable : 1 à 20 MiB. Le service d'upload vérifie aussi cette
-- plage et la quantité réelle de bytes; submit_product recontrôle la limite
-- courante lors de l'attachement. Ne pas écraser un choix admin en ré-exécution.
INSERT INTO public.platform_settings (key, value)
VALUES ('digital_pdf_max_bytes', '20971520'::jsonb)
ON CONFLICT (key) DO NOTHING;
-- Cette valeur numérique seule est publique, pas les uploads/événements/livres.
DROP POLICY IF EXISTS settings_digital_pdf_max_bytes_read ON public.platform_settings;
CREATE POLICY settings_digital_pdf_max_bytes_read ON public.platform_settings
  FOR SELECT TO anon, authenticated USING (key = 'digital_pdf_max_bytes');

-- Le pays Moneroo est celui choisi par l'ACHETEUR, jamais celui du vendeur.
-- NULL reste permis pour toutes les transactions historiques; les nouveaux
-- book_purchase exigent un code de pays actif transmis dans customer.country_code.
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS customer_country_code text;
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_customer_country_code_check;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_customer_country_code_check
  CHECK (customer_country_code IS NULL OR customer_country_code ~ '^[A-Z]{2}$');

-- Le service d'upload valide le PDF, crée l'original et l'aperçu PRIVÉS puis
-- stocke SHA-256(UTF-8 du jeton opaque) en hexadécimal minuscule. Le jeton brut
-- (CSPRNG, au moins 128 bits, 32 à 512 caractères) n'est jamais stocké en SQL.
CREATE TABLE IF NOT EXISTS public.digital_book_uploads (
  upload_token_hash text PRIMARY KEY CHECK (upload_token_hash ~ '^[0-9a-f]{64}$'),
  original_key text NOT NULL,
  preview_key text NOT NULL,
  page_count integer NOT NULL CHECK (page_count > 0),
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  content_hash text NOT NULL CHECK (content_hash ~ '^[0-9A-Fa-f]{64}$'),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  consumed_product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT digital_book_uploads_original_key_private_check
    CHECK (length(trim(original_key)) BETWEEN 1 AND 1024 AND original_key !~ '://'),
  CONSTRAINT digital_book_uploads_preview_key_private_check
    CHECK (length(trim(preview_key)) BETWEEN 1 AND 1024 AND preview_key !~ '://'),
  CONSTRAINT digital_book_uploads_consumption_check
    CHECK ((consumed_at IS NULL) = (consumed_product_id IS NULL)),
  CONSTRAINT digital_book_uploads_expiration_check CHECK (expires_at > created_at)
);
COMMENT ON TABLE public.digital_book_uploads IS
  'Uploads PDF validés côté serveur; jeton SHA-256, clés R2 privées et consommation atomique par submit_product. Aucun accès client direct.';
COMMENT ON COLUMN public.digital_book_uploads.upload_token_hash IS
  'SHA-256 hex minuscule du jeton brut UTF-8 digital_upload_token; seul le service d upload écrit cette empreinte.';
CREATE INDEX IF NOT EXISTS digital_book_uploads_unconsumed_expiry_idx
  ON public.digital_book_uploads (expires_at) WHERE consumed_at IS NULL;
ALTER TABLE public.digital_book_uploads ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.digital_book_uploads FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_book_uploads TO service_role;
-- Aucune politique RLS anon/authenticated et aucun RPC public de lecture du jeton.

-- Journal minimal privé d'import/accès : codes contrôlés, pas de message brut,
-- nom de fichier, email, URL, clé R2, contenu PDF, token ou empreinte de token.
-- Les services digitaux écrivent action/status/code/elapsed_ms (+ IDs facultatifs)
-- après leurs contrôles; les échecs pré-SQL doivent être journalisés par l'Edge.
-- Ce journal ne remplace ni l'API Moneroo vérifiée, ni les quotas anti-abus,
-- ni une politique de rétention à définir côté serveur.
CREATE TABLE IF NOT EXISTS public.digital_book_events (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  action text NOT NULL CHECK (action IN ('upload', 'preview', 'create_purchase', 'download', 'payment', 'unknown')),
  status integer NOT NULL CHECK (status BETWEEN 100 AND 599),
  code text CHECK (code IS NULL OR code ~ '^[a-z][a-z0-9_]{0,79}$'),
  elapsed_ms integer CHECK (elapsed_ms IS NULL OR elapsed_ms >= 0),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  digital_book_id uuid REFERENCES public.digital_books(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.digital_book_events IS
  'Historique digital privé minimal; codes techniques contrôlés uniquement, jamais fichier, token, clé privée, URL ou données client.';
CREATE INDEX IF NOT EXISTS digital_book_events_created_idx
  ON public.digital_book_events (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS digital_book_events_product_idx
  ON public.digital_book_events (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS digital_book_events_book_idx
  ON public.digital_book_events (digital_book_id, created_at DESC);
ALTER TABLE public.digital_book_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.digital_book_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.digital_book_events TO service_role;

-- Admin actif seulement, sans accès direct de table. Pagination bornée et ordre
-- stable; total_count concerne le filtre choisi. Aucun champ privé n'est projeté.
CREATE OR REPLACE FUNCTION public.admin_list_digital_book_events(
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_product_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid, action text, status integer, code text, elapsed_ms integer,
  product_id uuid, digital_book_id uuid, transaction_id uuid,
  created_at timestamptz, total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_zando_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100
     OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 100000 THEN
    RAISE EXCEPTION 'Pagination des événements invalide';
  END IF;
  RETURN QUERY
  SELECT e.id, e.action, e.status, e.code, e.elapsed_ms,
         coalesce(e.product_id, b.product_id), e.digital_book_id, e.transaction_id,
         e.created_at, count(*) OVER ()
  FROM public.digital_book_events e
  LEFT JOIN public.digital_books b ON b.id = e.digital_book_id
  WHERE p_product_id IS NULL OR coalesce(e.product_id, b.product_id) = p_product_id
  ORDER BY e.created_at DESC, e.id DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_digital_book_events(integer, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_digital_book_events(integer, integer, uuid) TO authenticated;

-- Vue groupée pour la page admin : IDs/pages/taille/statut et compte des droits
-- dont le statut correspond encore à la transaction. Aucun secret de stockage.
CREATE OR REPLACE FUNCTION public.admin_list_digital_book_summaries(p_product_ids uuid[])
RETURNS TABLE (
  product_id uuid, digital_book_id uuid, page_count integer, byte_size bigint,
  status text, completed_count bigint, pending_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_zando_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF coalesce(cardinality(p_product_ids), 0) > 500 THEN
    RAISE EXCEPTION 'Trop de produits pour une consultation digitale';
  END IF;
  RETURN QUERY
  SELECT b.product_id, b.id, b.page_count, b.byte_size, b.status,
         count(e.id) FILTER (WHERE e.status = 'completed' AND t.status = 'completed'
           AND t.verified_at IS NOT NULL AND nullif(trim(t.provider_reference), '') IS NOT NULL),
         count(e.id) FILTER (WHERE e.status = 'pending' AND t.status = 'pending')
  FROM public.digital_books b
  LEFT JOIN public.digital_book_entitlements e ON e.digital_book_id = b.id
  LEFT JOIN public.transactions t ON t.id = e.transaction_id
  WHERE b.product_id = ANY(coalesce(p_product_ids, '{}'::uuid[]))
  GROUP BY b.product_id, b.id, b.page_count, b.byte_size, b.status
  ORDER BY b.product_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_list_digital_book_summaries(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_digital_book_summaries(uuid[]) TO authenticated;

-- Le verrou/index global historique reste IDENTIQUE pour les trois prestations.
-- Un livre est vendu à plusieurs clients : unicité des seuls checkouts pending
-- par (livre, email normalisé), jamais une transaction globale pour tout le livre.
-- Les transactions terminées restent distinctes; aucune référence n'est réutilisée.
DROP INDEX IF EXISTS public.transactions_moneroo_one_pending_service_uidx;
CREATE UNIQUE INDEX transactions_moneroo_one_pending_service_uidx
  ON public.transactions (type, item_id)
  WHERE payment_method = 'Moneroo' AND status = 'pending' AND type <> 'book_purchase';
CREATE UNIQUE INDEX IF NOT EXISTS transactions_moneroo_one_pending_book_customer_uidx
  ON public.transactions (item_id, lower(trim(customer_email)))
  WHERE payment_method = 'Moneroo' AND status = 'pending' AND type = 'book_purchase';

-- Publication : toutes les lignes historiques du corps ci-dessous sont conservées
-- telles quelles. Seules les insertions conditionnelles digitales sont nouvelles.
-- Le jeton est une capacité d'upload à usage unique; il doit rester confidentiel.


CREATE OR REPLACE FUNCTION public.submit_product(p_product jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id uuid := extensions.gen_random_uuid();
  v_title text := trim(coalesce(p_product->>'title', ''));
  v_city text := trim(coalesce(p_product->>'city', ''));
  v_seller text := trim(coalesce(p_product->>'seller_name', ''));
  v_phone text := trim(coalesce(p_product->>'seller_phone', ''));
  v_country text := p_product->>'country_id';
  v_category text := p_product->>'category_id';
  v_days integer := coalesce((p_product->>'duration_days')::integer, 7);
  v_photos text[];
  v_mode text;
  v_media_base_url text;
  v_fee numeric(14,2);
  v_currency text;
  v_product_currency text;
  v_code text := nullif(upper(trim(coalesce(p_product->>'promo_code_used', ''))), '');
  v_status text := 'pending_payment';
  v_used_code text := NULL;
  v_sale_price numeric(14,2) := coalesce((p_product->>'price')::numeric, 0);
  -- Aucune initialisation/cast supplémentaire pour les catégories historiques.
  v_upload public.digital_book_uploads%ROWTYPE;
  v_upload_token text;
  v_pdf_max_bytes bigint;
  v_upload_rows integer;
BEGIN
  IF p_product IS NULL OR jsonb_typeof(p_product) <> 'object' THEN
    RAISE EXCEPTION 'Données de publication invalides';
  END IF;
  IF length(v_title) < 2 OR length(v_title) > 160 OR length(v_city) < 1 OR length(v_city) > 120 OR length(v_seller) < 1 OR length(v_seller) > 120 OR length(v_phone) < 6 OR length(v_phone) > 32 THEN
    RAISE EXCEPTION 'Champs de publication invalides';
  END IF;
  IF v_sale_price < 0 OR jsonb_typeof(p_product->'photos') <> 'array' THEN
    RAISE EXCEPTION 'Prix ou photos invalides';
  END IF;
  SELECT array_agg(photo ORDER BY ordinality) INTO v_photos
  FROM jsonb_array_elements_text(p_product->'photos') WITH ORDINALITY AS elems(photo, ordinality);
  IF coalesce(cardinality(v_photos), 0) < 1 OR cardinality(v_photos) > 4 THEN
    RAISE EXCEPTION 'Une à quatre photos sont obligatoires';
  END IF;
  SELECT value->>'worker_url' INTO v_media_base_url FROM public.platform_settings WHERE key = 'media_upload_limits';
  IF v_media_base_url IS NULL OR EXISTS (
    SELECT 1 FROM unnest(v_photos) AS media(media_url)
    WHERE media_url NOT LIKE v_media_base_url || '/media/%'
  ) THEN
    RAISE EXCEPTION 'Les photos doivent être téléversées sur le stockage Cloudflare du site';
  END IF;
  IF nullif(p_product->>'video_url', '') IS NOT NULL AND (v_media_base_url IS NULL OR (p_product->>'video_url') NOT LIKE v_media_base_url || '/media/%') THEN
    RAISE EXCEPTION 'La vidéo doit être téléversée sur le stockage Cloudflare du site';
  END IF;
  IF nullif(p_product->>'seller_photo_url', '') IS NOT NULL AND (v_media_base_url IS NULL OR (p_product->>'seller_photo_url') NOT LIKE v_media_base_url || '/media/%') THEN
    RAISE EXCEPTION 'La photo vendeur doit être téléversée sur le stockage Cloudflare du site';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.countries WHERE id = v_country AND is_active) OR NOT EXISTS (SELECT 1 FROM public.categories WHERE id = v_category AND is_active) THEN
    RAISE EXCEPTION 'Pays ou catégorie indisponible';
  END IF;
  SELECT currency INTO v_product_currency FROM public.countries WHERE id = v_country;
  SELECT value->>'mode' INTO v_mode FROM public.platform_settings WHERE key = 'site_mode';
  v_mode := coalesce(v_mode, 'paid');
  SELECT (item->>'price')::numeric, item->>'currency'
    INTO v_fee, v_currency
  FROM public.platform_settings s, LATERAL jsonb_array_elements(s.value) item
  WHERE s.key = 'pricing_durations' AND (item->>'days')::integer = v_days
  LIMIT 1;
  IF v_fee IS NULL THEN RAISE EXCEPTION 'Durée de publication non configurée'; END IF;

  IF v_category = 'digital-products' THEN
    -- Les pages/taille/hash envoyés par le navigateur sont ignorés. Les clés
    -- fournies par le client sont refusées; seule la ligne d'upload fait autorité.
    IF p_product ?| ARRAY['original_key', 'preview_key', 'digital_book', 'digital_books'] THEN
      RAISE EXCEPTION 'Les métadonnées privées du livre doivent provenir du service d upload';
    END IF;
    v_upload_token := p_product->>'digital_upload_token';
    IF jsonb_typeof(p_product->'digital_upload_token') IS DISTINCT FROM 'string'
       OR length(coalesce(v_upload_token, '')) NOT BETWEEN 32 AND 512
       OR v_upload_token <> trim(v_upload_token) THEN
      RAISE EXCEPTION 'Jeton de téléversement du livre invalide';
    END IF;
    SELECT u.* INTO v_upload
    FROM public.digital_book_uploads u
    WHERE u.upload_token_hash = encode(extensions.digest(convert_to(v_upload_token, 'UTF8'), 'sha256'), 'hex')
    FOR UPDATE;
    -- clock_timestamp est vérifié APRÈS acquisition du verrou : attendre un
    -- concurrent ne prolonge jamais artificiellement la validité du jeton.
    IF NOT FOUND OR v_upload.consumed_at IS NOT NULL OR v_upload.expires_at <= clock_timestamp() THEN
      RAISE EXCEPTION 'Téléversement du livre introuvable, expiré ou déjà utilisé';
    END IF;
    SELECT (value #>> '{}')::bigint INTO v_pdf_max_bytes
    FROM public.platform_settings WHERE key = 'digital_pdf_max_bytes';
    IF v_pdf_max_bytes IS NULL OR v_pdf_max_bytes NOT BETWEEN 1048576 AND 20971520
       OR v_upload.byte_size > v_pdf_max_bytes THEN
      RAISE EXCEPTION 'Limite de taille PDF invalide ou dépassée';
    END IF;
    -- Vérifier le numérique brut aussi : numeric(14,2) arrondit les décimales.
    IF v_sale_price::text = 'NaN' OR v_sale_price <= 0
       OR (p_product->>'price')::numeric <> trunc((p_product->>'price')::numeric) THEN
      RAISE EXCEPTION 'Le prix du livre doit être un montant positif entier';
    END IF;
    IF upper(coalesce(v_product_currency, '')) NOT IN ('XAF', 'XOF', 'CDF') THEN
      RAISE EXCEPTION 'Devise non prise en charge par cette configuration Moneroo';
    END IF;
  END IF;

  IF v_code IS NOT NULL THEN
    UPDATE public.promo_codes pc
      SET uses_count = pc.uses_count + 1
      WHERE upper(pc.code) = v_code
        AND pc.is_active = true
        AND (pc.expires_at IS NULL OR pc.expires_at > now())
        AND pc.uses_count < pc.max_uses
        AND pc.discount_type IN ('100_percent', 'free_publication')
        AND regexp_replace(pc.bound_phone, '[^0-9]', '', 'g') = regexp_replace(v_phone, '[^0-9]', '', 'g')
      RETURNING pc.code INTO v_used_code;
    IF v_used_code IS NULL THEN RAISE EXCEPTION 'Code invalide ou non applicable à ce numéro'; END IF;
  END IF;

  IF v_mode = 'free' OR v_fee = 0 OR v_used_code IS NOT NULL THEN v_status := 'published'; END IF;
  INSERT INTO public.products (
    id, title, description, price, currency, category_id, country_id, city,
    seller_name, seller_phone, seller_photo_url, seller_avatar, external_url, merchant_url,
    photos, video_url, dimensions, options, duration_days, status, is_popular,
    views_count, calls_count, whatsapp_clicks_count, published_at, expires_at
  ) VALUES (
    v_id, v_title, nullif(p_product->>'description', ''), v_sale_price,
    coalesce(v_product_currency, p_product->>'currency', 'XAF'), v_category, v_country, v_city,
    v_seller, v_phone, nullif(p_product->>'seller_photo_url', ''), nullif(p_product->>'seller_avatar', ''),
    nullif(p_product->>'external_url', ''), nullif(p_product->>'merchant_url', ''), v_photos,
    nullif(p_product->>'video_url', ''), nullif(p_product->>'dimensions', ''), coalesce(p_product->'options', '[]'::jsonb),
    v_days, v_status, false, 0, 0, 0,
    CASE WHEN v_status = 'published' THEN now() ELSE NULL END,
    CASE WHEN v_status = 'published' THEN now() + make_interval(days => v_days) ELSE now() + interval '14 days' END
  );
  INSERT INTO public.product_private_fields (product_id, listing_price, listing_currency, promo_code_used, payment_reference)
  VALUES (v_id, CASE WHEN v_used_code IS NOT NULL THEN 0 ELSE v_fee END, coalesce(v_currency, 'FCFA'), v_used_code, NULL);
  IF v_category = 'digital-products' THEN
    INSERT INTO public.digital_books (
      product_id, original_key, preview_key, page_count, byte_size, content_hash, status
    ) VALUES (
      v_id, v_upload.original_key, v_upload.preview_key, v_upload.page_count,
      v_upload.byte_size, v_upload.content_hash, v_status
    );
    UPDATE public.digital_book_uploads
    SET consumed_at = clock_timestamp(), consumed_product_id = v_id
    WHERE upload_token_hash = v_upload.upload_token_hash
      AND consumed_at IS NULL AND expires_at > clock_timestamp();
    GET DIAGNOSTICS v_upload_rows = ROW_COUNT;
    IF v_upload_rows <> 1 THEN
      RAISE EXCEPTION 'Téléversement du livre expiré ou déjà utilisé';
    END IF;
    -- Recontrôler aussi ici : un verrou promo/produit peut avoir retardé l'INSERT.
    -- Produit, champs privés, livre, éventuel promo et consommation partagent la
    -- même transaction PostgreSQL. Une erreur annule également la consommation.
  END IF;
  RETURN jsonb_build_object('id', v_id, 'status', v_status);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_product(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_product(jsonb) TO anon, authenticated;

-- Préparation : branche livre séparée, puis corps Moneroo historique intact.
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
  v_book_status text;
  v_product_currency text;
  v_customer_country_code text;
  v_entitlement public.digital_book_entitlements%ROWTYPE;
BEGIN
  IF p_type NOT IN ('product_listing', 'banner_ad', 'subscription', 'book_purchase') OR nullif(trim(p_item_id), '') IS NULL THEN
    RAISE EXCEPTION 'Référence de prestation invalide';
  END IF;
  IF length(v_first_name) NOT BETWEEN 1 AND 120 OR length(v_last_name) NOT BETWEEN 1 AND 120
     OR v_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' OR length(v_email) > 254 THEN
    RAISE EXCEPTION 'Coordonnées de paiement invalides';
  END IF;
  IF v_default_currency NOT IN ('XAF', 'XOF', 'CDF') THEN
    RAISE EXCEPTION 'La devise Moneroo par défaut doit être XAF, XOF ou CDF';
  END IF;

  IF p_type = 'book_purchase' THEN
    v_customer_country_code := upper(trim(coalesce(p_customer->>'country_code', '')));
    IF jsonb_typeof(p_customer->'country_code') IS DISTINCT FROM 'string'
       OR v_customer_country_code !~ '^[A-Z]{2}$'
       OR NOT EXISTS (SELECT 1 FROM public.countries WHERE id = v_customer_country_code AND is_active) THEN
      RAISE EXCEPTION 'Pays acheteur invalide ou indisponible';
    END IF;
    IF p_item_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'Livre introuvable';
    END IF;
    -- item_id est digital_books.id, conformément au trigger de 20261020.
    -- Canonicaliser l'UUID évite deux capacités pending par casse différente.
    p_item_id := (p_item_id::uuid)::text;
    PERFORM pg_advisory_xact_lock(hashtext(p_type), hashtext(p_item_id || ':' || v_email));

    SELECT p.price, upper(c.currency), p.status, p.title, p.seller_phone,
           b.status, upper(p.currency)
      INTO v_amount, v_currency, v_item_status, v_item_name, v_item_phone,
           v_book_status, v_product_currency
    FROM public.digital_books b
    JOIN public.products p ON p.id = b.product_id
    JOIN public.countries c ON c.id = p.country_id
    JOIN public.categories cat ON cat.id = p.category_id
    WHERE b.id = p_item_id::uuid AND p.category_id = 'digital-products'
      AND p.deleted_at IS NULL AND p.expires_at > clock_timestamp()
      AND c.is_active AND cat.is_active
    FOR SHARE OF b, p, c, cat;
    IF NOT FOUND THEN RAISE EXCEPTION 'Livre introuvable ou indisponible'; END IF;
    IF v_item_status <> 'published' OR v_book_status <> 'published' THEN
      RAISE EXCEPTION 'Ce livre ne peut pas être acheté dans son état actuel';
    END IF;
    IF v_amount IS NULL OR v_amount::text = 'NaN' OR v_amount <= 0 OR v_amount <> trunc(v_amount) THEN
      RAISE EXCEPTION 'Montant de paiement invalide';
    END IF;
    -- Même modèle que product_listing : la devise du pays fait autorité, sans
    -- prix/devise client ni remplacement arbitraire par p_default_currency.
    IF v_currency NOT IN ('XAF', 'XOF', 'CDF') OR v_product_currency IS DISTINCT FROM v_currency THEN
      RAISE EXCEPTION 'Devise non prise en charge ou incohérente pour ce livre';
    END IF;

    SELECT t.* INTO v_tx
    FROM public.transactions t
    WHERE t.type = p_type AND t.item_id = p_item_id
      AND t.payment_method = 'Moneroo' AND t.status = 'pending'
      AND lower(trim(t.customer_email)) = v_email
    ORDER BY t.created_at DESC
    LIMIT 1
    FOR UPDATE;
    IF FOUND THEN
      SELECT e.* INTO v_entitlement FROM public.digital_book_entitlements e
      WHERE e.transaction_id = v_tx.id FOR UPDATE;
      IF NOT FOUND OR v_entitlement.digital_book_id::text IS DISTINCT FROM v_tx.item_id
         OR v_entitlement.customer_email IS DISTINCT FROM v_email
         OR v_entitlement.amount IS DISTINCT FROM v_tx.amount
         OR v_entitlement.currency IS DISTINCT FROM v_tx.currency
         OR v_entitlement.status <> 'pending' OR v_tx.customer_country_code IS NULL THEN
        RAISE EXCEPTION 'Droit d achat incohérent avec la transaction du livre';
      END IF;
      -- Conserver le montant/devise figés du checkout déjà préparé : un changement
      -- ultérieur de catalogue ne réécrit jamais une transaction en cours.
      RETURN jsonb_build_object(
        'id', v_tx.id, 'reference', v_tx.reference, 'type', v_tx.type, 'item_id', v_tx.item_id,
        'amount', v_tx.amount, 'currency', v_tx.currency, 'status', v_tx.status,
        'checkout_state', v_tx.checkout_state, 'checkout_url', v_tx.checkout_url,
        'provider_reference', v_tx.provider_reference, 'created_at', v_tx.created_at,
        'customer', jsonb_build_object('first_name', v_tx.customer_first_name, 'last_name', v_tx.customer_last_name,
          'email', v_tx.customer_email, 'phone', v_tx.customer_phone, 'country_code', v_tx.customer_country_code),
        'entitlement_reference', v_entitlement.reference
      );
    END IF;

    INSERT INTO public.transactions (
      reference, type, amount, currency, payment_method, status, item_id, customer_phone,
      customer_email, customer_first_name, customer_last_name, checkout_state, customer_country_code
    ) VALUES (
      extensions.gen_random_uuid()::text, p_type, v_amount, v_currency, 'Moneroo', 'pending', p_item_id,
      coalesce(v_phone, v_item_phone), v_email, v_first_name, v_last_name, 'created', v_customer_country_code
    ) RETURNING * INTO v_tx;
    INSERT INTO public.digital_book_entitlements (
      reference, digital_book_id, transaction_id, customer_email, amount, currency, status
    ) VALUES (
      extensions.gen_random_uuid()::text, p_item_id::uuid, v_tx.id,
      v_email, v_tx.amount, v_tx.currency, 'pending'
    ) RETURNING * INTO v_entitlement;
    RETURN jsonb_build_object(
      'id', v_tx.id, 'reference', v_tx.reference, 'type', v_tx.type, 'item_id', v_tx.item_id,
      'amount', v_tx.amount, 'currency', v_tx.currency, 'status', v_tx.status,
      'checkout_state', v_tx.checkout_state, 'checkout_url', v_tx.checkout_url,
      'provider_reference', v_tx.provider_reference, 'created_at', v_tx.created_at,
      'customer', jsonb_build_object('first_name', v_tx.customer_first_name, 'last_name', v_tx.customer_last_name,
        'email', v_tx.customer_email, 'phone', v_tx.customer_phone, 'country_code', v_tx.customer_country_code),
      'service_name', v_item_name, 'duration', NULL,
      'entitlement_reference', v_entitlement.reference
    );
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

-- Relance : conserver le pays choisi du checkout, sans modifier les autres types.
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
    IF v_tx.type = 'book_purchase' THEN
      RETURN jsonb_build_object(
        'id', v_tx.id, 'reference', v_tx.reference, 'type', v_tx.type, 'item_id', v_tx.item_id,
        'amount', v_tx.amount, 'currency', v_tx.currency, 'status', v_tx.status,
        'checkout_state', v_tx.checkout_state, 'checkout_url', v_tx.checkout_url,
        'provider_reference', v_tx.provider_reference,
        'customer', jsonb_build_object('first_name', v_tx.customer_first_name, 'last_name', v_tx.customer_last_name,
          'email', v_tx.customer_email, 'phone', v_tx.customer_phone, 'country_code', v_tx.customer_country_code)
      );
    END IF;
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
  IF v_tx.type = 'book_purchase' THEN
    v_customer := v_customer || jsonb_build_object('country_code', v_tx.customer_country_code);
  END IF;
  RETURN public.prepare_moneroo_payment(v_tx.type, v_tx.item_id, v_customer, p_default_currency);
END;
$$;
REVOKE ALL ON FUNCTION public.retry_moneroo_payment(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.retry_moneroo_payment(text, text) TO service_role;

-- Contrôle du statut des droits privés (trigger existant conservé).
CREATE OR REPLACE FUNCTION public.validate_digital_book_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
BEGIN
  NEW.reference := trim(NEW.reference);
  NEW.customer_email := lower(trim(NEW.customer_email));
  NEW.currency := upper(trim(NEW.currency));

  SELECT t.* INTO v_tx
  FROM public.transactions AS t
  WHERE t.id = NEW.transaction_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction de livre introuvable';
  END IF;
  IF v_tx.type <> 'book_purchase' OR v_tx.item_id <> NEW.digital_book_id::text THEN
    RAISE EXCEPTION 'Transaction incompatible avec ce livre';
  END IF;
  IF v_tx.customer_email IS NULL
     OR lower(trim(v_tx.customer_email)) <> NEW.customer_email THEN
    RAISE EXCEPTION 'Email d’achat différent de la transaction validée';
  END IF;
  IF v_tx.amount <> NEW.amount
     OR upper(trim(v_tx.currency)) <> NEW.currency THEN
    RAISE EXCEPTION 'Montant ou devise différent de la transaction validée';
  END IF;

  -- L'invariant de 20261020 (FOR SHARE, livre/email/montant/devise) est conservé.
  -- Interdire aussi une promotion directe d'un droit pending par erreur serveur.
  IF v_tx.payment_method <> 'Moneroo' OR v_tx.amount::text = 'NaN'
     OR v_tx.amount <= 0 OR v_tx.amount <> trunc(v_tx.amount)
     OR NEW.status IS DISTINCT FROM v_tx.status THEN
    RAISE EXCEPTION 'Statut ou paiement du droit incompatible avec la transaction';
  END IF;
  IF NEW.status = 'completed' AND (
    v_tx.verified_at IS NULL OR nullif(trim(v_tx.provider_reference), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Le droit exige une confirmation Moneroo vérifiée';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_digital_book_entitlement() FROM PUBLIC, anon, authenticated;

-- Application de données VÉRIFIÉES côté serveur, jamais du retour navigateur.
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
  v_entitlement public.digital_book_entitlements%ROWTYPE;
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

  IF v_tx.type = 'book_purchase' THEN
    -- NULL ne doit pas contourner l'égalité historique des références. Une
    -- référence absente de la DB peut être récupérée par une vérification API
    -- serveur avec metadata.reference correspondant à cette transaction.
    IF nullif(trim(p_provider_reference), '') IS NULL
       OR (v_tx.provider_reference IS NOT NULL AND v_tx.provider_reference IS DISTINCT FROM p_provider_reference) THEN
      INSERT INTO public.moneroo_webhook_events(event_key,event_name,provider_reference,transaction_reference,remote_status,processing_result)
      VALUES (p_event_key,p_event_name,p_provider_reference,p_reference,p_remote_status,'provider_reference_mismatch')
      ON CONFLICT (event_key) DO NOTHING;
      RETURN jsonb_build_object('result','provider_reference_mismatch','status',v_tx.status);
    END IF;
    IF v_tx.amount::text = 'NaN' OR v_tx.amount <= 0 OR v_tx.amount <> trunc(v_tx.amount)
       OR v_tx.currency NOT IN ('XAF', 'XOF', 'CDF') THEN
      RAISE EXCEPTION 'Transaction de livre incompatible avec Moneroo';
    END IF;
    -- Ordre des verrous : transaction puis entitlement, comme lors d'une reprise.
    -- Ni création tardive ni réparation silencieuse : l'entitlement pending doit
    -- avoir été créé atomiquement par prepare_moneroo_payment.
    SELECT e.* INTO v_entitlement FROM public.digital_book_entitlements e
    WHERE e.transaction_id = v_tx.id FOR UPDATE;
    IF NOT FOUND OR v_entitlement.digital_book_id::text IS DISTINCT FROM v_tx.item_id
       OR v_entitlement.customer_email IS DISTINCT FROM v_tx.customer_email
       OR v_entitlement.amount IS DISTINCT FROM v_tx.amount
       OR v_entitlement.currency IS DISTINCT FROM v_tx.currency
       OR v_entitlement.status IS DISTINCT FROM v_tx.status THEN
      RAISE EXCEPTION 'Droit d achat incohérent avec la transaction du livre';
    END IF;
  END IF;

  v_new_status := CASE lower(coalesce(p_remote_status, ''))
    WHEN 'success' THEN 'completed'
    WHEN 'failed' THEN 'failed'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'initiated' THEN 'pending'
    WHEN 'pending' THEN 'pending'
    ELSE 'pending'
  END;
  -- Ne changer aucune transition historique des autres prestations.
  IF v_tx.type = 'book_purchase' AND lower(coalesce(p_remote_status, '')) = 'refunded' THEN
    v_new_status := 'refunded';
  END IF;
  INSERT INTO public.moneroo_webhook_events(event_key,event_name,provider_reference,transaction_reference,remote_status,processing_result)
  VALUES (p_event_key,p_event_name,p_provider_reference,p_reference,p_remote_status,'verified')
  ON CONFLICT (event_key) DO NOTHING;
  IF NOT FOUND THEN
    UPDATE public.transactions SET updated_at = now() WHERE id = v_tx.id;
    RETURN jsonb_build_object('result','duplicate','status',v_tx.status);
  END IF;

  IF v_tx.type = 'book_purchase' THEN
    -- Comme les prestations historiques, success est la SEULE promotion à
    -- completed. Les notifications pending/failed/cancelled tardives n'annulent
    -- pas un success vérifié; un remboursement vérifié révoque, lui, l'accès.
    -- refunded est terminal : même un success ancien rejoué ne recrée pas d'accès.
    IF v_tx.status = 'refunded'
       OR (v_tx.status = 'completed' AND v_new_status NOT IN ('completed', 'refunded')) THEN
      RETURN jsonb_build_object('result','ignored_downgrade','status',v_tx.status);
    END IF;
    UPDATE public.transactions
    SET provider_reference = p_provider_reference, status = v_new_status,
        checkout_state = 'initialized',
        verified_at = CASE WHEN v_new_status = 'completed' THEN now() ELSE verified_at END,
        updated_at = now()
    WHERE id = v_tx.id;
    UPDATE public.digital_book_entitlements
    SET status = v_new_status, updated_at = now()
    WHERE id = v_entitlement.id AND transaction_id = v_tx.id;
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN RAISE EXCEPTION 'Droit d achat du livre introuvable'; END IF;
    -- Le trigger voit la transaction mise à jour dans CE MÊME commit. Toute
    -- erreur rollback aussi la confirmation et le reçu d'événement Moneroo.
    RETURN jsonb_build_object('result',v_result,'status',v_new_status,
      'reference',v_tx.reference,'amount',v_tx.amount,'currency',v_tx.currency,'type',v_tx.type);
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
  -- Une annonce digitale payante publie son catalogue privé avec son produit,
  -- uniquement après confirmation de ses frais d'annonce. Pour les catégories
  -- historiques, cette branche ne change aucune ligne ni aucun statut métier.
  IF v_tx.type = 'product_listing' AND v_new_status = 'completed' THEN
    UPDATE public.digital_books b
    SET status = 'published', updated_at = now()
    FROM public.products p
    WHERE p.id = v_tx.item_id::uuid AND p.category_id = 'digital-products'
      AND p.status = 'published' AND b.product_id = p.id AND b.status = 'pending_payment';
  END IF;
  RETURN jsonb_build_object('result',v_result,'status',CASE WHEN v_tx.status = 'completed' THEN 'completed' ELSE v_new_status END,
    'reference',v_tx.reference,'amount',v_tx.amount,'currency',v_tx.currency,'type',v_tx.type);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_moneroo_verified_payment(text, text, text, numeric, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_moneroo_verified_payment(text, text, text, numeric, text, text, text) TO service_role;

-- Les fonctions claim/complete/uncertain/rejected et les ACL/RLS historiques
-- restent inchangées; retry ne change que la branche book_purchase. Elle délègue
-- déjà à prepare, donc les échecs
-- book_purchase créent un nouvel achat pending propre au même email/livre.
-- L'index provider_reference et la déduplication moneroo_webhook_events restent
-- ceux de 20261019. Aucun lien de téléchargement ni accès anon/authenticated
-- aux tables privées n'est créé. Le Worker doit relire entitlement ET transaction
-- completed, vérifier le client, la référence, l'expiration et les remboursements
-- avant de signer une URL privée. Un e-mail seul n'authentifie pas un acheteur.
-- Les doublons historiques préexistants ne sont pas supprimés automatiquement :
-- une incohérence empêche la migration/le paiement et nécessite un audit serveur.
