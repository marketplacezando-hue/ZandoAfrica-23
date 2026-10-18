DO $$
DECLARE
  v_prod_id uuid;
  v_res1 jsonb;
  v_res2 jsonb;
BEGIN
  SELECT id INTO v_prod_id FROM public.products LIMIT 1;
  IF v_prod_id IS NOT NULL THEN
    -- First call with test IP
    v_res1 := public.increment_product_views_by_ip(v_prod_id, '192.168.1.100');
    -- Second call with SAME IP (should not increment)
    v_res2 := public.increment_product_views_by_ip(v_prod_id, '192.168.1.100');
    
    RAISE NOTICE 'Test 1 (New IP): %', v_res1;
    RAISE NOTICE 'Test 2 (Duplicate IP): %', v_res2;
    
    -- Clean up test entry
    DELETE FROM public.product_views_ip WHERE ip_address = '192.168.1.100';
  END IF;
END $$;