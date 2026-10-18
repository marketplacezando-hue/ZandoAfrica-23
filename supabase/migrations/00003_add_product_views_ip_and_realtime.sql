-- 1. Create product_views_ip table for deduplicating views per IP address
CREATE TABLE IF NOT EXISTS public.product_views_ip (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ip_address text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_product_ip UNIQUE (product_id, ip_address)
);

-- Enable RLS
ALTER TABLE public.product_views_ip ENABLE ROW LEVEL SECURITY;

-- Full RLS policies for anon and authenticated
CREATE POLICY "Allow public read product_views_ip" ON public.product_views_ip
  FOR SELECT TO public USING (true);

CREATE POLICY "Allow public insert product_views_ip" ON public.product_views_ip
  FOR INSERT TO public WITH CHECK (true);

-- 2. Function to atomically increment views count per unique IP
CREATE OR REPLACE FUNCTION public.increment_product_views_by_ip(p_product_id uuid, p_ip_address text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted boolean := false;
  v_new_views integer;
BEGIN
  -- Insert only if not already recorded for this product + IP
  INSERT INTO public.product_views_ip (product_id, ip_address)
  VALUES (p_product_id, p_ip_address)
  ON CONFLICT (product_id, ip_address) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted > 0 THEN
    UPDATE public.products
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = p_product_id
    RETURNING views_count INTO v_new_views;

    RETURN jsonb_build_object('incremented', true, 'views_count', v_new_views);
  ELSE
    SELECT COALESCE(views_count, 0) INTO v_new_views
    FROM public.products
    WHERE id = p_product_id;

    RETURN jsonb_build_object('incremented', false, 'views_count', v_new_views);
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.increment_product_views_by_ip(uuid, text) TO anon, authenticated, service_role;

-- 3. Enable realtime for products, banner_ads, product_reviews
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
ALTER PUBLICATION supabase_realtime ADD TABLE public.banner_ads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_reviews;
