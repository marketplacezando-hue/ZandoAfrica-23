-- Normalise les liens marchands saisis sans schéma avant la validation finale.
-- Les schémas autres que HTTP/HTTPS restent refusés.
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
  IF v_url IS NOT NULL AND v_url !~* '^[a-z][a-z0-9+.-]*://' THEN
    v_url := 'https://' || v_url;
  END IF;
  IF v_url IS NULL OR v_url !~* '^https?://[^[:space:][:cntrl:]]+$'
     OR v_url ~ '[[:cntrl:]]' OR v_url ~* '^https?://[^/]*@' THEN
    RAISE EXCEPTION 'Un lien marchand HTTP ou HTTPS valide est obligatoire pour un produit digital';
  END IF;
  NEW.merchant_url := v_url;
  NEW.external_url := v_url;
  RETURN NEW;
END;
$$;
