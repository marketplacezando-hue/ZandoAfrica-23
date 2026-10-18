-- Add columns to products if missing
ALTER TABLE products ADD COLUMN IF NOT EXISTS merchant_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seller_avatar text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS dimensions text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS options jsonb DEFAULT '[]'::jsonb;

-- Sync merchant_url with external_url if needed
UPDATE products SET merchant_url = external_url WHERE merchant_url IS NULL AND external_url IS NOT NULL;
UPDATE products SET seller_avatar = seller_photo_url WHERE seller_avatar IS NULL AND seller_photo_url IS NOT NULL;

-- Create product_reviews table
CREATE TABLE IF NOT EXISTS product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  author_name text NOT NULL,
  rating integer NOT NULL DEFAULT 5,
  comment text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on product_reviews"
  ON product_reviews FOR SELECT USING (true);

CREATE POLICY "Allow public insert on product_reviews"
  ON product_reviews FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public delete on product_reviews"
  ON product_reviews FOR DELETE USING (true);

CREATE POLICY "Allow public update on product_reviews"
  ON product_reviews FOR UPDATE USING (true);

-- Ensure media storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('zando-media', 'zando-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Bucket storage policies for zando-media
CREATE POLICY "Public media access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'zando-media');

CREATE POLICY "Public media upload"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'zando-media');

CREATE POLICY "Public media update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'zando-media');

CREATE POLICY "Public media delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'zando-media');
