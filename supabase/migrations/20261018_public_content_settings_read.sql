-- Autoriser la lecture publique des deux champs textuels affichés sur les pages publiques.
-- La politique d’écriture settings_admin_manage reste inchangée et réservée aux administrateurs.
ALTER POLICY settings_public_read ON public.platform_settings
USING (
  key = ANY (ARRAY[
    'site_mode'::text,
    'theme'::text,
    'pricing_durations'::text,
    'subscription_plans'::text,
    'ad_pricing'::text,
    'media_upload_limits'::text,
    'about_content'::text,
    'security_content'::text
  ])
);
