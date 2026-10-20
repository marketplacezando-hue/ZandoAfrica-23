-- ZandoAfrica digital products: external sales only, 10-page previews, 300 MiB PDFs.
-- Additive migration; existing non-digital listings and publication fees are preserved.

INSERT INTO public.platform_settings (key, value)
VALUES ('digital_pdf_max_bytes', '314572800'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = '314572800'::jsonb, updated_at = now();

CREATE OR REPLACE FUNCTION public.validate_digital_product_merchant_url()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_url text;
BEGIN
  IF NEW.category_id <> 'digital-products' THEN RETURN NEW; END IF;
  v_url := nullif(trim(coalesce(NEW.merchant_url, NEW.external_url)), '');
  IF v_url IS NULL OR v_url !~* '^https?://[^[:space:][:cntrl:]]+$'
     OR v_url ~ '[[:cntrl:]]' OR v_url ~* '^https?://[^/]*@' THEN
    RAISE EXCEPTION 'Un lien marchand HTTP ou HTTPS valide est obligatoire pour un produit digital';
  END IF;
  NEW.merchant_url := v_url;
  NEW.external_url := v_url;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS products_digital_merchant_url_validate ON public.products;
CREATE TRIGGER products_digital_merchant_url_validate
  BEFORE INSERT OR UPDATE OF category_id, merchant_url, external_url ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.validate_digital_product_merchant_url();

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
    IF v_pdf_max_bytes IS NULL OR v_pdf_max_bytes NOT BETWEEN 1048576 AND 314572800
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
