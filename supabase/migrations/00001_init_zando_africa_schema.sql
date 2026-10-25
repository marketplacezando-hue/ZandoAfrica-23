-- 1. Create Tables
CREATE TABLE IF NOT EXISTS countries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    flag_emoji TEXT NOT NULL,
    dial_code TEXT NOT NULL,
    currency TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL DEFAULT 'Administrateur Zando',
    role TEXT NOT NULL DEFAULT 'super_admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'XAF',
    category_id TEXT NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    country_id TEXT NOT NULL REFERENCES countries(id) ON DELETE RESTRICT,
    city TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    seller_phone TEXT NOT NULL,
    seller_photo_url TEXT,
    external_url TEXT,
    photos TEXT[] NOT NULL DEFAULT '{}',
    video_url TEXT,
    duration_days INT NOT NULL DEFAULT 7,
    status TEXT NOT NULL DEFAULT 'published', -- 'published', 'pending_payment', 'expired', 'suspended', 'trashed'
    is_popular BOOLEAN NOT NULL DEFAULT false,
    views_count INT NOT NULL DEFAULT 0,
    calls_count INT NOT NULL DEFAULT 0,
    whatsapp_clicks_count INT NOT NULL DEFAULT 0,
    promo_code_used TEXT,
    payment_reference TEXT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS banner_ads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT NOT NULL,
    target_url TEXT,
    phone_number TEXT,
    duration_months INT NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'XAF',
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'pending_payment', 'expired', 'suspended'
    views_count INT NOT NULL DEFAULT 0,
    clicks_count INT NOT NULL DEFAULT 0,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seller_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT NOT NULL,
    plan_months INT NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'XAF',
    promo_code TEXT NOT NULL,
    publication_limit INT NOT NULL DEFAULT 10,
    publications_used INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'expired', 'suspended'
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    bound_phone TEXT NOT NULL,
    max_uses INT NOT NULL DEFAULT 5,
    uses_count INT NOT NULL DEFAULT 0,
    discount_type TEXT NOT NULL DEFAULT 'free_publication',
    is_active BOOLEAN NOT NULL DEFAULT true,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL, -- 'product_listing', 'banner_ad', 'subscription'
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'XAF',
    payment_method TEXT NOT NULL, -- 'MTN Money', 'Orange Money', 'Airtel Money', 'Carte bancaire'
    status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'pending', 'failed'
    item_id TEXT,
    customer_phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT UNIQUE NOT NULL,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'XAF',
    destination_channel TEXT NOT NULL,
    destination_account TEXT NOT NULL,
    fees NUMERIC NOT NULL DEFAULT 0,
    net_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'rejected'
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS traffic_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- 'page_view', 'product_view', 'whatsapp_click', 'call_click', 'banner_click', 'publish_click'
    item_id TEXT,
    page_path TEXT,
    country_code TEXT,
    city TEXT,
    device_type TEXT DEFAULT 'desktop',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_email TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Storage Bucket for uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('zando_media', 'zando_media', true)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS Setup
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE banner_ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE traffic_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Countries policies
CREATE POLICY "Public can view countries" ON countries FOR SELECT USING (true);
CREATE POLICY "Admins can manage countries" ON countries FOR ALL USING (true) WITH CHECK (true);

-- Categories policies
CREATE POLICY "Public can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON categories FOR ALL USING (true) WITH CHECK (true);

-- Platform settings policies
CREATE POLICY "Public can view settings" ON platform_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON platform_settings FOR ALL USING (true) WITH CHECK (true);

-- Admin users policies
CREATE POLICY "Admins can read admin users" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Admins can update admin users" ON admin_users FOR ALL USING (true) WITH CHECK (true);

-- Products policies
CREATE POLICY "Public can view published products" ON products FOR SELECT USING (status != 'trashed');
CREATE POLICY "Anyone can create products" ON products FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update product view counters or manage products" ON products FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete products" ON products FOR DELETE USING (true);

-- Banner ads policies
CREATE POLICY "Public can view active banner ads" ON banner_ads FOR SELECT USING (true);
CREATE POLICY "Anyone can submit banner ads" ON banner_ads FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update banner view counters" ON banner_ads FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete banner ads" ON banner_ads FOR DELETE USING (true);

-- Seller subscriptions policies
CREATE POLICY "Public and admins can view subscriptions" ON seller_subscriptions FOR SELECT USING (true);
CREATE POLICY "Anyone can subscribe" ON seller_subscriptions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update subscriptions" ON seller_subscriptions FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete subscriptions" ON seller_subscriptions FOR DELETE USING (true);

-- Promo codes policies
CREATE POLICY "Anyone can verify promo codes" ON promo_codes FOR SELECT USING (true);
CREATE POLICY "Anyone can create or redeem promo codes" ON promo_codes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update promo code use count" ON promo_codes FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admins can delete promo codes" ON promo_codes FOR DELETE USING (true);

-- Transactions policies
CREATE POLICY "Public and admins can view transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can create transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update transactions" ON transactions FOR UPDATE USING (true) WITH CHECK (true);

-- Withdrawal requests policies
CREATE POLICY "Public and admins can view withdrawals" ON withdrawal_requests FOR SELECT USING (true);
CREATE POLICY "Admins can create withdrawals" ON withdrawal_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can update withdrawals" ON withdrawal_requests FOR UPDATE USING (true) WITH CHECK (true);

-- Traffic events policies
CREATE POLICY "Anyone can view traffic events" ON traffic_events FOR SELECT USING (true);
CREATE POLICY "Anyone can log traffic events" ON traffic_events FOR INSERT WITH CHECK (true);

-- Audit logs policies
CREATE POLICY "Admins can view audit logs" ON admin_audit_logs FOR SELECT USING (true);
CREATE POLICY "Admins can create audit logs" ON admin_audit_logs FOR INSERT WITH CHECK (true);

-- Storage policies
CREATE POLICY "Public can view zando_media" ON storage.objects FOR SELECT USING (bucket_id = 'zando_media');
CREATE POLICY "Anyone can upload to zando_media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'zando_media');
CREATE POLICY "Admins can update zando_media" ON storage.objects FOR UPDATE USING (bucket_id = 'zando_media');
CREATE POLICY "Admins can delete zando_media" ON storage.objects FOR DELETE USING (bucket_id = 'zando_media');

-- 4. Initial Seed Data

-- Countries
INSERT INTO countries (id, name, flag_emoji, dial_code, currency, sort_order) VALUES
('CG', 'Congo-Brazzaville', '🇨🇬', '+242', 'XAF', 1),
('CD', 'RDC', '🇨🇩', '+243', 'CDF', 2),
('CI', 'Côte d''Ivoire', '🇨🇮', '+225', 'XOF', 3),
('SN', 'Sénégal', '🇸🇳', '+221', 'XOF', 4),
('BJ', 'Bénin', '🇧🇯', '+229', 'XOF', 5),
('CM', 'Cameroun', '🇨🇲', '+237', 'XAF', 6),
('BF', 'Burkina Faso', '🇧🇫', '+226', 'XOF', 7),
('ML', 'Mali', '🇲🇱', '+223', 'XOF', 8),
('TG', 'Togo', '🇹🇬', '+228', 'XOF', 9),
('GA', 'Gabon', '🇬🇦', '+241', 'XAF', 10),
('TD', 'Tchad', '🇹🇩', '+235', 'XAF', 11),
('GN', 'Guinée', '🇬🇳', '+224', 'GNF', 12)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, flag_emoji = EXCLUDED.flag_emoji, dial_code = EXCLUDED.dial_code, currency = EXCLUDED.currency;

-- Categories
INSERT INTO categories (id, name, icon, sort_order) VALUES
('telephones-tablettes', 'Téléphones & Tablettes', 'Smartphone', 1),
('informatique-ordinateurs', 'Informatique & Ordinateurs', 'Laptop', 2),
('mode-chaussures', 'Mode & Chaussures', 'Shirt', 3),
('electromenager', 'Électroménager', 'Tv', 4),
('jeux-consoles', 'Jeux & Consoles', 'Gamepad2', 5),
('vehicules', 'Véhicules & Auto', 'Car', 6),
('immobilier', 'Immobilier', 'Home', 7),
('services-autres', 'Services & Autres', 'Briefcase', 8)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon;

-- Admin user (immocongo@idriss.com / Idmozice@1996)
INSERT INTO admin_users (email, password_hash, full_name, role) VALUES
('immocongo@idriss.com', 'Idmozice@1996', 'Administrateur Principal', 'super_admin')
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Platform settings
INSERT INTO platform_settings (key, value) VALUES
('site_mode', '{"mode": "paid"}'::jsonb),
('theme', '{"primary_color": "#00A651", "secondary_color": "#FF8A00", "button_color": "#2563EB", "sidebar_color": "#092C22", "card_style": "rounded-xl"}'::jsonb),
('pricing_durations', '[
  {"days": 7, "price": 250, "currency": "FCFA", "label": "7 jours (250 FCFA)"},
  {"days": 14, "price": 500, "currency": "FCFA", "label": "14 jours / 1 mois (500 FCFA)"},
  {"days": 30, "price": 1000, "currency": "FCFA", "label": "30 jours / 2 mois (1 000 FCFA)"}
]'::jsonb),
('subscription_plans', '[
  {"months": 1, "price": 15000, "currency": "FCFA", "limit": 30, "name": "Formule Starter (1 Mois)"},
  {"months": 2, "price": 28000, "currency": "FCFA", "limit": 70, "name": "Formule Pro (2 Mois)"},
  {"months": 3, "price": 40000, "currency": "FCFA", "limit": 120, "name": "Formule VIP (3 Mois)"}
]'::jsonb),
('ad_pricing', '[
  {"months": 1, "price": 30000, "currency": "FCFA", "name": "Bannière VIP 1 Mois"},
  {"months": 2, "price": 55000, "currency": "FCFA", "name": "Bannière VIP 2 Mois"},
  {"months": 3, "price": 75000, "currency": "FCFA", "name": "Bannière VIP 3 Mois"}
]'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Initial Products
INSERT INTO products (
    id, title, description, price, currency, category_id, country_id, city,
    seller_name, seller_phone, photos, duration_days, status, is_popular,
    views_count, calls_count, whatsapp_clicks_count, expires_at
) VALUES
(
    '11111111-1111-1111-1111-111111111111',
    'iPhone 15 Pro',
    'Titane naturel 256Go, état comme neuf, batterie 100%, fourni avec chargeur rapide et coque de protection offerte.',
    750000, 'FCFA', 'telephones-tablettes', 'CG', 'Pointe-Noire',
    'Idriss M.', '+242061234567',
    ARRAY['https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=800&auto=format&fit=crop&q=80'],
    22, 'published', true, 142, 18, 45, now() + interval '22 days'
),
(
    '22222222-2222-2222-2222-222222222222',
    'Samsung Galaxy A14',
    'Smartphone 64Go, 4Go RAM, état neuf dans sa boîte. Double SIM, batterie longue durée 5000mAh.',
    85000, 'FCFA', 'telephones-tablettes', 'CG', 'Brazzaville',
    'Grace K.', '+242059876543',
    ARRAY['https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800&auto=format&fit=crop&q=80'],
    3, 'published', true, 89, 7, 24, now() + interval '3 days'
),
(
    '33333333-3333-3333-3333-333333333333',
    'PlayStation 5',
    'Console PS5 édition standard avec lecteur disque, 2 manettes DualSense sans fil, 3 jeux récents offerts.',
    450000, 'FCFA', 'jeux-consoles', 'BJ', 'Cotonou',
    'Michel A.', '+22997123456',
    ARRAY['https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&auto=format&fit=crop&q=80'],
    15, 'published', true, 210, 22, 63, now() + interval '15 days'
),
(
    '44444444-4444-4444-4444-444444444444',
    'Chaussures Nike Air Running',
    'Pointure 42, neuves sous emballage d''origine. Semelle amortissante idéale pour le sport ou le style quotidien.',
    45000, 'FCFA', 'mode-chaussures', 'CI', 'Abidjan',
    'Amadou D.', '+2250701020304',
    ARRAY['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&auto=format&fit=crop&q=80'],
    7, 'published', true, 178, 14, 39, now() + interval '7 days'
),
(
    '55555555-5555-5555-5555-555555555555',
    'HP Pavilion 15 Core i5',
    'Ordinateur portable HP Pavilion, écran 15.6 pouces FHD, processeur Intel Core i5 11e Génération, 16Go RAM, SSD 512Go.',
    250000, 'FCFA', 'informatique-ordinateurs', 'CD', 'Kinshasa',
    'Patrick M.', '+243812345678',
    ARRAY['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800&auto=format&fit=crop&q=80'],
    12, 'published', false, 115, 9, 31, now() + interval '12 days'
),
(
    '66666666-6666-6666-6666-666666666666',
    'Réfrigérateur Inox NoFrost',
    'Réfrigérateur combiné 320L, classe énergétique A+, froid ventilé sans givre. Garantie constructeur 1 an.',
    350000, 'FCFA', 'electromenager', 'SN', 'Dakar',
    'Fatou S.', '+221776543210',
    ARRAY['https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=800&auto=format&fit=crop&q=80'],
    19, 'published', false, 94, 6, 17, now() + interval '19 days'
),
(
    '77777777-7777-7777-7777-777777777777',
    'Bus de transport NZOKO VIP',
    'Très propre, révisé récemment, moteur impeccable, intérieur spacieux climatisé, idéal pour les lignes interurbaines.',
    75000, 'FCFA', 'vehicules', 'CG', 'Brazzaville',
    'Transport Express', '+242065554433',
    ARRAY['https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80'],
    7, 'published', false, 320, 35, 78, now() + interval '7 days'
)
ON CONFLICT (id) DO NOTHING;

-- Initial Banner Ads
INSERT INTO banner_ads (
    id, title, description, image_url, target_url, phone_number, duration_months, price, status, views_count, clicks_count
) VALUES
(
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'Votre site ici ! Boostez votre visibilité',
    'Touchez plus de 50 000 acheteurs potentiels par jour à travers 8 pays d''Afrique. Emplacement VIP en tête d''accueil.',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80',
    'https://zando-africa.com/contact',
    '+242061234567',
    1, 30000, 'active', 5420, 312
)
ON CONFLICT (id) DO NOTHING;

-- Initial Promo Codes
INSERT INTO promo_codes (code, bound_phone, max_uses, uses_count, is_active, expires_at) VALUES
('ZANDO10', '+242061234567', 10, 2, true, now() + interval '60 days'),
('CODE2025', '+242059876543', 5, 1, true, now() + interval '45 days'),
('VIP2025', '+2250701020304', 20, 4, true, now() + interval '90 days')
ON CONFLICT (code) DO NOTHING;

-- Initial Subscriptions
INSERT INTO seller_subscriptions (
    id, first_name, last_name, phone_number, email, plan_months, price, promo_code, publication_limit, publications_used, status
) VALUES
(
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'Idriss', 'Mozice', '+242061234567', 'immocongo@idriss.com', 1, 15000, 'ZANDO10', 30, 2, 'active'
),
(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Grace', 'Kouka', '+242059876543', 'grace@example.com', 2, 28000, 'CODE2025', 70, 1, 'active'
)
ON CONFLICT (id) DO NOTHING;

-- Initial Transactions
INSERT INTO transactions (reference, type, amount, currency, payment_method, status, customer_phone) VALUES
('TXN001245', 'subscription', 25000, 'FCFA', 'MTN Money', 'completed', '+242061234567'),
('TXN001244', 'banner_ad', 12500, 'FCFA', 'Orange Money', 'completed', '+2250701020304'),
('TXN001243', 'product_listing', 50000, 'FCFA', 'Carte bancaire', 'pending', '+22997123456'),
('TXN001242', 'product_listing', 8000, 'FCFA', 'Airtel Money', 'failed', '+243812345678'),
('TXN001241', 'subscription', 15000, 'FCFA', 'MTN Money', 'completed', '+242059876543')
ON CONFLICT (reference) DO NOTHING;

-- Initial Traffic Events
INSERT INTO traffic_events (event_type, item_id, page_path, country_code, city, device_type) VALUES
('page_view', null, '/', 'CG', 'Brazzaville', 'desktop'),
('page_view', null, '/', 'CD', 'Kinshasa', 'mobile'),
('page_view', null, '/', 'CI', 'Abidjan', 'mobile'),
('product_view', '11111111-1111-1111-1111-111111111111', '/produit/11111111-1111-1111-1111-111111111111', 'CG', 'Pointe-Noire', 'mobile'),
('whatsapp_click', '11111111-1111-1111-1111-111111111111', '/produit/11111111-1111-1111-1111-111111111111', 'CG', 'Pointe-Noire', 'mobile'),
('call_click', '22222222-2222-2222-2222-222222222222', '/', 'CG', 'Brazzaville', 'mobile'),
('banner_click', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '/', 'CG', 'Brazzaville', 'desktop');
