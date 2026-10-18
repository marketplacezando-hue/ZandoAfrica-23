-- Indexes for foreign-key joins and cascades identified by Supabase advisors.
CREATE INDEX IF NOT EXISTS products_category_fk_idx ON public.products(category_id);
CREATE INDEX IF NOT EXISTS media_assets_product_fk_idx ON public.media_assets(product_id);
CREATE INDEX IF NOT EXISTS media_assets_banner_ad_fk_idx ON public.media_assets(banner_ad_id);

-- Evaluate auth.uid() once per query in this self-read policy.
DROP POLICY IF EXISTS admin_users_self_read ON public.admin_users;
CREATE POLICY admin_users_self_read ON public.admin_users FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
