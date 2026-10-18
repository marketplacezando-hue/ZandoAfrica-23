export interface Country {
  id: string;
  name: string;
  flag_emoji: string;
  dial_code: string;
  currency: string;
  is_active: boolean;
  sort_order: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  category_id: string;
  country_id: string;
  city: string;
  seller_name: string;
  seller_phone: string;
  seller_photo_url: string | null;
  seller_avatar?: string | null;
  external_url: string | null;
  merchant_url?: string | null;
  photos: string[];
  video_url: string | null;
  dimensions?: string | null;
  options?: Array<{ name: string; values: string[] }> | string[] | null;
  duration_days: number;
  status: 'published' | 'pending_payment' | 'expired' | 'suspended' | 'trashed';
  is_popular: boolean;
  views_count: number;
  calls_count: number;
  whatsapp_clicks_count: number;
  promo_code_used?: string | null;
  payment_reference?: string | null;
  published_at: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  countries?: Country;
  categories?: Category;
}

export interface ProductReview {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  comment: string;
  created_at: string;
  products?: {
    title: string;
    photos?: string[];
  };
}

export interface BannerAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  target_url: string | null;
  phone_number: string | null;
  duration_months: number;
  price: number;
  currency: string;
  status: 'active' | 'pending_payment' | 'expired' | 'suspended';
  views_count: number;
  clicks_count: number;
  starts_at: string;
  expires_at: string;
  created_at: string;
}

export interface SellerSubscription {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  plan_months: number;
  price: number;
  currency: string;
  promo_code: string;
  publication_limit: number;
  publications_used: number;
  status: 'pending_payment' | 'active' | 'expired' | 'suspended';
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface PromoCode {
  id: string;
  code: string;
  bound_phone: string;
  max_uses: number;
  uses_count: number;
  discount_type: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export interface Transaction {
  id: string;
  reference: string;
  type: 'product_listing' | 'banner_ad' | 'subscription';
  amount: number;
  currency: string;
  payment_method: string;
  status: 'completed' | 'pending' | 'failed' | 'cancelled' | 'refunded';
  item_id?: string | null;
  customer_phone?: string | null;
  provider_reference?: string | null;
  verified_at?: string | null;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  destination_channel: string;
  destination_account: string;
  fees: number;
  net_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  created_at: string;
}

export interface TrafficEvent {
  id: string;
  event_type: string;
  item_id?: string | null;
  page_path?: string | null;
  country_code?: string | null;
  city?: string | null;
  device_type?: string | null;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_email: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
}

export interface PlatformSettings {
  site_mode: { mode: 'free' | 'paid' };
  theme: {
    primary_color: string;
    secondary_color: string;
    button_color: string;
    sidebar_color: string;
    card_style: string;
    card_color: string;
    surface_color: string;
    border_color: string;
  };
  pricing_durations: Array<{
    days: number;
    price: number;
    currency: string;
    label: string;
  }>;
  subscription_plans: Array<{
    months: number;
    price: number;
    currency: string;
    limit: number;
    name: string;
  }>;
  ad_pricing: Array<{
    months: number;
    price: number;
    currency: string;
    name: string;
  }>;
  about_content: string;
  security_content: string;
}
