-- ZandoAfrica-23 production bootstrap for a fresh Supabase project.
-- No sample listings, fake payments, promo codes, or administrator credentials are inserted.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.countries (
  id text PRIMARY KEY,
  name text NOT NULL,
  flag_emoji text NOT NULL,
  dial_code text NOT NULL,
  currency text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'Tag',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Admins are provisioned only after a Supabase Auth user is created out-of-band.
CREATE TABLE public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 160),
  description text,
  price numeric(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'XAF',
  category_id text NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  country_id text NOT NULL REFERENCES public.countries(id) ON DELETE RESTRICT,
  city text NOT NULL CHECK (length(trim(city)) BETWEEN 1 AND 120),
  seller_name text NOT NULL CHECK (length(trim(seller_name)) BETWEEN 1 AND 120),
  seller_phone text NOT NULL CHECK (length(trim(seller_phone)) BETWEEN 6 AND 32),
  seller_photo_url text,
  seller_avatar text,
  external_url text,
  merchant_url text,
  photos text[] NOT NULL DEFAULT '{}',
  video_url text,
  dimensions text,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  duration_days integer NOT NULL DEFAULT 7 CHECK (duration_days BETWEEN 1 AND 365),
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('published', 'pending_payment', 'expired', 'suspended', 'trashed')),
  is_popular boolean NOT NULL DEFAULT false,
  views_count integer NOT NULL DEFAULT 0 CHECK (views_count >= 0),
  calls_count integer NOT NULL DEFAULT 0 CHECK (calls_count >= 0),
  whatsapp_clicks_count integer NOT NULL DEFAULT 0 CHECK (whatsapp_clicks_count >= 0),
  published_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT products_max_four_photos CHECK (cardinality(photos) <= 4)
);

CREATE TABLE public.product_private_fields (
  product_id uuid PRIMARY KEY REFERENCES public.products(id) ON DELETE CASCADE,
  listing_price numeric(14,2) NOT NULL DEFAULT 0 CHECK (listing_price >= 0),
  listing_currency text NOT NULL DEFAULT 'XAF',
  promo_code_used text,
  payment_reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.banner_ads (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 2 AND 160),
  description text,
  image_url text NOT NULL,
  target_url text,
  phone_number text,
  duration_months integer NOT NULL DEFAULT 1 CHECK (duration_months BETWEEN 1 AND 3),
  price numeric(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'XAF',
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('active', 'pending_payment', 'expired', 'suspended')),
  views_count integer NOT NULL DEFAULT 0 CHECK (views_count >= 0),
  clicks_count integer NOT NULL DEFAULT 0 CHECK (clicks_count >= 0),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.seller_subscriptions (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone_number text NOT NULL,
  email text NOT NULL,
  plan_months integer NOT NULL CHECK (plan_months BETWEEN 1 AND 3),
  price numeric(14,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'XAF',
  promo_code text,
  publication_limit integer NOT NULL DEFAULT 0 CHECK (publication_limit >= 0),
  publications_used integer NOT NULL DEFAULT 0 CHECK (publications_used >= 0),
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'active', 'expired', 'suspended')),
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  code text NOT NULL UNIQUE,
  bound_phone text NOT NULL,
  max_uses integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  uses_count integer NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
  discount_type text NOT NULL DEFAULT 'free_publication',
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('product_listing', 'banner_ad', 'subscription')),
  amount numeric(14,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'XAF',
  payment_method text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded')),
  item_id text,
  customer_phone text,
  provider_reference text,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'XAF',
  destination_channel text NOT NULL,
  destination_account text NOT NULL,
  fees numeric(14,2) NOT NULL DEFAULT 0 CHECK (fees >= 0),
  net_amount numeric(14,2) NOT NULL CHECK (net_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

CREATE TABLE public.traffic_events (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  event_type text NOT NULL,
  item_id text,
  page_path text,
  country_code text,
  city text,
  device_type text NOT NULL DEFAULT 'desktop',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  admin_email text NOT NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.product_reviews (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (length(trim(author_name)) BETWEEN 1 AND 120),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL CHECK (length(trim(comment)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Store a digest of a browser-generated opaque visitor ID, never a raw IP address.
CREATE TABLE public.product_views_visitor (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_product_visitor UNIQUE (product_id, visitor_hash)
);

-- R2 object metadata; the bucket and objects remain private behind a Worker.
CREATE TABLE public.media_assets (
  id uuid PRIMARY KEY DEFAULT extensions.gen_random_uuid(),
  r2_key text NOT NULL UNIQUE,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  content_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'attached', 'deleted')),
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  banner_ad_id uuid REFERENCES public.banner_ads(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX products_public_listing_idx ON public.products (country_id, category_id, created_at DESC) WHERE status = 'published' AND deleted_at IS NULL;
CREATE INDEX products_expiration_idx ON public.products (expires_at) WHERE status = 'published';
CREATE INDEX banner_ads_public_idx ON public.banner_ads (starts_at, expires_at) WHERE status = 'active';
CREATE INDEX product_reviews_product_created_idx ON public.product_reviews (product_id, created_at DESC);
CREATE INDEX traffic_events_created_idx ON public.traffic_events (created_at DESC);

CREATE OR REPLACE FUNCTION public.is_zando_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid() AND a.is_active = true);
$$;

CREATE OR REPLACE FUNCTION public.is_zando_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = auth.uid() AND a.is_active = true AND a.role = 'super_admin');
$$;
REVOKE ALL ON FUNCTION public.is_zando_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_zando_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_zando_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_zando_super_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_set_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER banner_ads_set_updated_at BEFORE UPDATE ON public.banner_ads FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON public.seller_subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER promo_codes_set_updated_at BEFORE UPDATE ON public.promo_codes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER transactions_set_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER settings_set_updated_at BEFORE UPDATE ON public.platform_settings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_private_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_views_visitor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
GRANT SELECT ON public.countries, public.categories, public.platform_settings, public.products, public.banner_ads, public.product_reviews TO anon, authenticated;
GRANT INSERT ON public.product_reviews, public.traffic_events TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

CREATE POLICY countries_public_read ON public.countries FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY countries_admin_manage ON public.countries FOR ALL TO authenticated USING (public.is_zando_admin()) WITH CHECK (public.is_zando_admin());
CREATE POLICY categories_public_read ON public.categories FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY categories_admin_manage ON public.categories FOR ALL TO authenticated USING (public.is_zando_admin()) WITH CHECK (public.is_zando_admin());
CREATE POLICY settings_public_read ON public.platform_settings FOR SELECT TO anon, authenticated USING (key IN ('site_mode', 'theme', 'pricing_durations', 'subscription_plans', 'ad_pricing', 'media_upload_limits'));
CREATE POLICY settings_admin_manage ON public.platform_settings FOR ALL TO authenticated USING (public.is_zando_admin()) WITH CHECK (public.is_zando_admin());
CREATE POLICY admin_users_self_read ON public.admin_users FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY admin_users_super_manage ON public.admin_users FOR ALL TO authenticated USING (public.is_zando_super_admin()) WITH CHECK (public.is_zando_super_admin());

-- Public product rows contain no payment references, promo usage, or listing-fee details.
CREATE POLICY products_public_read_active ON public.products FOR SELECT TO anon, authenticated USING (status = 'published' AND expires_at > now() AND deleted_at IS NULL);
CREATE POLICY products_admin_manage ON public.products FOR ALL TO authenticated USING (public.is_zando_admin()) WITH CHECK (public.is_zando_admin());
CREATE POLICY product_private_admin_manage ON public.product_private_fields FOR ALL TO authenticated USING (public.is_zando_admin()) WITH CHECK (public.is_zando_admin());
CREATE POLICY banner_ads_public_read_active ON public.banner_ads FOR SELECT TO anon, authenticated USING (status = 'active' AND starts_at <= now() AND expires_at > now());
CREATE POLICY banner_ads_admin_manage ON public.banner_ads FOR ALL TO authenticated USING (public.is_zando_admin()) WITH CHECK (public.is_zando_admin());
CREATE POLICY subscriptions_admin_manage ON public.seller_subscriptions FOR ALL TO authenticated USING (public.is_zando_admin()) WITH CHECK (public.is_zando_admin());
CREATE POLICY promo_codes_admin_manage ON public.promo_codes FOR ALL TO authenticated USING (public.is_zando_admin()) WITH CHECK (public.is_zando_admin());
CREATE POLICY transactions_admin_manage ON public.transactions FOR ALL TO authenticated USING (public.is_zando_admin()) WITH CHECK (public.is_zando_admin());
CREATE POLICY withdrawals_admin_manage ON public.withdrawal_requests FOR ALL TO authenticated USING (public.is_zando_admin()) WITH CHECK (public.is_zando_admin());
CREATE POLICY traffic_events_admin_read ON public.traffic_events FOR SELECT TO authenticated USING (public.is_zando_admin());
CREATE POLICY traffic_events_public_insert ON public.traffic_events FOR INSERT TO anon, authenticated WITH CHECK (event_type IN ('page_view', 'product_view', 'whatsapp_click', 'call_click', 'banner_click', 'publish_click', 'post_ad_complete') AND length(coalesce(page_path, '')) <= 512 AND length(coalesce(city, '')) <= 120);
CREATE POLICY audit_logs_admin_read ON public.admin_audit_logs FOR SELECT TO authenticated USING (public.is_zando_admin());
CREATE POLICY reviews_public_read ON public.product_reviews FOR SELECT TO anon, authenticated USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published' AND p.expires_at > now() AND p.deleted_at IS NULL));
CREATE POLICY reviews_public_insert ON public.product_reviews FOR INSERT TO anon, authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_id AND p.status = 'published' AND p.expires_at > now() AND p.deleted_at IS NULL));
CREATE POLICY reviews_admin_manage ON public.product_reviews FOR ALL TO authenticated USING (public.is_zando_admin()) WITH CHECK (public.is_zando_admin());
CREATE POLICY media_assets_admin_manage ON public.media_assets FOR ALL TO authenticated USING (public.is_zando_admin()) WITH CHECK (public.is_zando_admin());

CREATE OR REPLACE FUNCTION public.verify_promo_code(p_code text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_expires_at timestamptz; v_uses_count integer; v_max_uses integer;
BEGIN
  SELECT pc.expires_at, pc.uses_count, pc.max_uses
    INTO v_expires_at, v_uses_count, v_max_uses
  FROM public.promo_codes pc
  WHERE upper(pc.code) = upper(trim(coalesce(p_code, '')))
    AND pc.is_active = true
    AND (pc.expires_at IS NULL OR pc.expires_at > now())
    AND pc.uses_count < pc.max_uses
    AND pc.discount_type IN ('100_percent', 'free_publication')
    AND regexp_replace(pc.bound_phone, '[^0-9]', '', 'g') = regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
  LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'Code invalide ou non applicable à ce numéro.');
  END IF;
  RETURN jsonb_build_object(
    'valid', true,
    'promoCode', jsonb_build_object('expires_at', v_expires_at, 'uses_count', v_uses_count, 'max_uses', v_max_uses)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.verify_promo_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_promo_code(text, text) TO anon, authenticated;

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
  RETURN jsonb_build_object('id', v_id, 'status', v_status);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_product(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_product(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_banner_ad(p_ad jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid := extensions.gen_random_uuid(); v_months integer; v_price numeric(14,2); v_currency text; v_mode text; v_status text; v_media_base_url text;
BEGIN
  v_months := coalesce((p_ad->>'duration_months')::integer, 1);
  IF length(trim(coalesce(p_ad->>'title',''))) NOT BETWEEN 2 AND 160 OR length(trim(coalesce(p_ad->>'image_url',''))) < 8 OR v_months NOT BETWEEN 1 AND 3 THEN
    RAISE EXCEPTION 'Informations de publicité invalides';
  END IF;
  SELECT value->>'worker_url' INTO v_media_base_url FROM public.platform_settings WHERE key='media_upload_limits';
  IF v_media_base_url IS NULL OR (p_ad->>'image_url') NOT LIKE v_media_base_url || '/media/%' THEN
    RAISE EXCEPTION 'L’image doit être téléversée sur le stockage Cloudflare du site';
  END IF;
  SELECT value->>'mode' INTO v_mode FROM public.platform_settings WHERE key = 'site_mode';
  SELECT (item->>'price')::numeric, item->>'currency' INTO v_price, v_currency
    FROM public.platform_settings s, LATERAL jsonb_array_elements(s.value) item
    WHERE s.key='ad_pricing' AND (item->>'months')::integer=v_months LIMIT 1;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Formule publicitaire non configurée'; END IF;
  v_status := CASE WHEN coalesce(v_mode, 'paid') = 'free' OR v_price = 0 THEN 'active' ELSE 'pending_payment' END;
  INSERT INTO public.banner_ads (id,title,description,image_url,target_url,phone_number,duration_months,price,currency,status,views_count,clicks_count,starts_at,expires_at)
  VALUES (v_id,trim(p_ad->>'title'),nullif(p_ad->>'description',''),p_ad->>'image_url',nullif(p_ad->>'target_url',''),nullif(p_ad->>'phone_number',''),v_months,v_price,coalesce(v_currency,p_ad->>'currency','XAF'),v_status,0,0,now(),now()+make_interval(days=>v_months*30));
  RETURN jsonb_build_object('id',v_id,'status',v_status,'price',v_price);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_banner_ad(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_banner_ad(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.submit_seller_subscription(p_sub jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_id uuid := extensions.gen_random_uuid(); v_months integer; v_price numeric(14,2); v_currency text; v_limit integer;
BEGIN
  v_months := coalesce((p_sub->>'plan_months')::integer, 1);
  IF length(trim(coalesce(p_sub->>'first_name',''))) < 1 OR length(trim(coalesce(p_sub->>'last_name',''))) < 1 OR length(trim(coalesce(p_sub->>'phone_number',''))) < 6 OR length(trim(coalesce(p_sub->>'email',''))) < 5 THEN
    RAISE EXCEPTION 'Informations d’abonnement invalides';
  END IF;
  SELECT (item->>'price')::numeric, item->>'currency', (item->>'limit')::integer
    INTO v_price, v_currency, v_limit
    FROM public.platform_settings s, LATERAL jsonb_array_elements(s.value) item
    WHERE s.key='subscription_plans' AND (item->>'months')::integer=v_months LIMIT 1;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Formule d’abonnement non configurée'; END IF;
  INSERT INTO public.seller_subscriptions (id,first_name,last_name,phone_number,email,plan_months,price,currency,publication_limit,publications_used,status,starts_at,expires_at)
  VALUES (v_id,trim(p_sub->>'first_name'),trim(p_sub->>'last_name'),trim(p_sub->>'phone_number'),lower(trim(p_sub->>'email')),v_months,v_price,coalesce(v_currency,p_sub->>'currency','XAF'),coalesce(v_limit,0),0,'pending_payment',NULL,NULL);
  RETURN jsonb_build_object('id',v_id,'status','pending_payment','price',v_price);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_seller_subscription(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_seller_subscription(jsonb) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_admin_action(p_action text, p_entity_type text, p_entity_id text DEFAULT NULL, p_details jsonb DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_zando_admin() THEN RAISE EXCEPTION 'Admin access required'; END IF;
  INSERT INTO public.admin_audit_logs (admin_email,action,entity_type,entity_id,details)
  VALUES (coalesce(auth.jwt()->>'email','admin'),left(p_action,160),left(p_entity_type,120),left(p_entity_id,160),p_details);
END;
$$;
REVOKE ALL ON FUNCTION public.log_admin_action(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_product_views_by_visitor(p_product_id uuid, p_visitor_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE v_inserted integer := 0; v_views integer := 0;
BEGIN
  IF p_visitor_id IS NULL OR length(p_visitor_id) < 16 OR length(p_visitor_id) > 128 THEN RAISE EXCEPTION 'Invalid visitor identifier'; END IF;
  INSERT INTO public.product_views_visitor (product_id, visitor_hash)
  SELECT p_product_id, encode(extensions.digest(convert_to(p_visitor_id, 'UTF8'), 'sha256'), 'hex')
  WHERE EXISTS (SELECT 1 FROM public.products p WHERE p.id=p_product_id AND p.status='published' AND p.expires_at>now() AND p.deleted_at IS NULL)
  ON CONFLICT (product_id, visitor_hash) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted > 0 THEN
    UPDATE public.products SET views_count=views_count+1 WHERE id=p_product_id RETURNING views_count INTO v_views;
  ELSE
    SELECT coalesce(views_count,0) INTO v_views FROM public.products WHERE id=p_product_id AND status='published' AND expires_at>now() AND deleted_at IS NULL;
  END IF;
  RETURN jsonb_build_object('incremented',v_inserted>0,'views_count',coalesce(v_views,0));
END;
$$;
REVOKE ALL ON FUNCTION public.increment_product_views_by_visitor(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_product_views_by_visitor(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_product_contact(p_product_id uuid, p_kind text)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  IF p_kind NOT IN ('call','whatsapp') THEN RAISE EXCEPTION 'Invalid contact type'; END IF;
  UPDATE public.products SET calls_count=calls_count+CASE WHEN p_kind='call' THEN 1 ELSE 0 END,
    whatsapp_clicks_count=whatsapp_clicks_count+CASE WHEN p_kind='whatsapp' THEN 1 ELSE 0 END
  WHERE id=p_product_id AND status='published' AND expires_at>now() AND deleted_at IS NULL
  RETURNING CASE WHEN p_kind='call' THEN calls_count ELSE whatsapp_clicks_count END INTO v_count;
  RETURN coalesce(v_count,0);
END;
$$;
REVOKE ALL ON FUNCTION public.increment_product_contact(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_product_contact(uuid, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.increment_banner_click(p_banner_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count integer;
BEGIN
  UPDATE public.banner_ads SET clicks_count=clicks_count+1
  WHERE id=p_banner_id AND status='active' AND starts_at<=now() AND expires_at>now()
  RETURNING clicks_count INTO v_count;
  RETURN coalesce(v_count,0);
END;
$$;
REVOKE ALL ON FUNCTION public.increment_banner_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_banner_click(uuid) TO anon, authenticated;

-- Public configuration defaults (editable only by admins); no user, payment or listing seed data.
INSERT INTO public.platform_settings (key,value) VALUES
  ('site_mode','{"mode":"paid"}'::jsonb),
  ('theme','{"primary_color":"#00A651","secondary_color":"#FF8A00","button_color":"#2563EB","sidebar_color":"#092C22","card_style":"rounded-xl"}'::jsonb),
  ('media_upload_limits','{"worker_url":"https://zandoafrica-media.marketplacezando-zandoafrica23.workers.dev","max_image_bytes":10485760,"max_video_bytes":52428800}'::jsonb),
  ('pricing_durations','[{"days":7,"price":250,"currency":"FCFA","label":"7 jours"},{"days":14,"price":500,"currency":"FCFA","label":"14 jours"},{"days":30,"price":1000,"currency":"FCFA","label":"30 jours"}]'::jsonb),
  ('subscription_plans','[{"months":1,"price":15000,"currency":"FCFA","limit":30,"name":"Formule Starter (1 Mois)"},{"months":2,"price":28000,"currency":"FCFA","limit":70,"name":"Formule Pro (2 Mois)"},{"months":3,"price":40000,"currency":"FCFA","limit":120,"name":"Formule VIP (3 Mois)"}]'::jsonb),
  ('ad_pricing','[{"months":1,"price":30000,"currency":"FCFA","name":"Bannière VIP 1 Mois"},{"months":2,"price":55000,"currency":"FCFA","name":"Bannière VIP 2 Mois"},{"months":3,"price":75000,"currency":"FCFA","name":"Bannière VIP 3 Mois"}]'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.countries (id,name,flag_emoji,dial_code,currency,sort_order) VALUES
  ('CG','Congo-Brazzaville','🇨🇬','+242','XAF',1),('CD','RDC','🇨🇩','+243','CDF',2),
  ('CI','Côte d’Ivoire','🇨🇮','+225','XOF',3),('SN','Sénégal','🇸🇳','+221','XOF',4),
  ('BJ','Bénin','🇧🇯','+229','XOF',5),('CM','Cameroun','🇨🇲','+237','XAF',6),
  ('BF','Burkina Faso','🇧🇫','+226','XOF',7),('ML','Mali','🇲🇱','+223','XOF',8)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.categories (id,name,icon,sort_order) VALUES
  ('telephones-tablettes','Téléphones & Tablettes','Smartphone',1),
  ('informatique-ordinateurs','Informatique & Ordinateurs','Laptop',2),
  ('mode-chaussures','Mode & Chaussures','Shirt',3),('electromenager','Électroménager','Tv',4),
  ('jeux-consoles','Jeux & Consoles','Gamepad2',5),('vehicules','Véhicules & Auto','Car',6),
  ('immobilier','Immobilier','Home',7),('services-autres','Services & Autres','Briefcase',8)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.banner_ads;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.product_reviews;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
