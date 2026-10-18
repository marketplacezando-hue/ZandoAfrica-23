CREATE OR REPLACE FUNCTION public.increment_product_views_by_ip(p_product_id uuid, p_ip_address text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inserted integer := 0;
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

GRANT EXECUTE ON FUNCTION public.increment_product_views_by_ip(uuid, text) TO anon, authenticated, service_role;
