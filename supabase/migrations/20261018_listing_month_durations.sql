-- Durées de publication en mois calendaires; les annonces déjà enregistrées ne sont pas modifiées.
-- Les anciennes durées restent acceptées uniquement pour les formulaires déjà ouverts.
INSERT INTO public.platform_settings (key, value, updated_at)
VALUES (
  'pricing_durations',
  jsonb_build_array(
    jsonb_build_object('days', 30, 'price', 1000, 'currency', 'FCFA', 'label', '1 mois'),
    jsonb_build_object('days', 60, 'price', 2000, 'currency', 'FCFA', 'label', '2 mois'),
    jsonb_build_object('days', 90, 'price', 3000, 'currency', 'FCFA', 'label', '3 mois')
  ),
  now()
)
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, updated_at = now();

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
  v_days integer := coalesce((p_product->>'duration_days')::integer, 30);
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
  IF v_days NOT IN (7, 14, 30, 60, 90) THEN
    RAISE EXCEPTION 'La durée doit être de 1, 2 ou 3 mois';
  END IF;
  SELECT currency INTO v_product_currency FROM public.countries WHERE id = v_country;
  SELECT value->>'mode' INTO v_mode FROM public.platform_settings WHERE key = 'site_mode';
  v_mode := coalesce(v_mode, 'paid');
  SELECT (item->>'price')::numeric, item->>'currency'
    INTO v_fee, v_currency
  FROM public.platform_settings s, LATERAL jsonb_array_elements(s.value) item
  WHERE s.key = 'pricing_durations' AND (item->>'days')::integer = v_days
  LIMIT 1;
  IF v_fee IS NULL AND v_days = 7 THEN
    v_fee := 250;
    v_currency := 'FCFA';
  ELSIF v_fee IS NULL AND v_days = 14 THEN
    v_fee := 500;
    v_currency := 'FCFA';
  END IF;
  IF v_fee IS NULL THEN RAISE EXCEPTION 'Durée de publication non configurée'; END IF;

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
    CASE WHEN v_status = 'published' THEN now() + CASE WHEN v_days IN (30, 60, 90) THEN make_interval(months => v_days / 30) ELSE make_interval(days => v_days) END ELSE now() + interval '14 days' END
  );
  INSERT INTO public.product_private_fields (product_id, listing_price, listing_currency, promo_code_used, payment_reference)
  VALUES (v_id, CASE WHEN v_used_code IS NOT NULL THEN 0 ELSE v_fee END, coalesce(v_currency, 'FCFA'), v_used_code, NULL);
  RETURN jsonb_build_object('id', v_id, 'status', v_status);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_product(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_product(jsonb) TO anon, authenticated;
