import { supabase } from '@/db/supabase';
import type {
  Country,
  Category,
  Product,
  BannerAd,
  SellerSubscription,
  PromoCode,
  Transaction,
  WithdrawalRequest,
  TrafficEvent,
  AdminAuditLog,
  PlatformSettings,
  ProductReview
} from '@/types/zando';
import { getImageMime, MAX_IMAGE_UPLOAD_BYTES, validateImageFile } from '@/lib/imageValidation';

const PRODUCT_LIST_SELECT = 'id,title,description,price,currency,category_id,country_id,city,seller_name,seller_phone,photos,duration_days,status,is_popular,views_count,calls_count,whatsapp_clicks_count,published_at,expires_at,created_at,updated_at,countries(*),categories(*)';

function getVisitorId(): string {
  const storageKey = 'zando_visitor_id';
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) return stored;
    const visitorId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `visitor-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
    localStorage.setItem(storageKey, visitorId);
    return visitorId;
  } catch {
    return `visitor-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
  }
}

export const zandoApi = {
  // Countries
  async getCountries(): Promise<Country[]> {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('Error fetching countries:', error);
      return [];
    }
    return data || [];
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
    return data || [];
  },

  // Platform Settings
  async getPlatformSettings(): Promise<PlatformSettings> {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*');
    if (error) {
      console.error('Error fetching platform settings:', error);
    }
    
    const settingsMap: Record<string, unknown> = {};
    data?.forEach(item => {
      settingsMap[item.key] = item.value;
    });

    const defaultTheme: PlatformSettings['theme'] = {
      primary_color: '#00A651',
      secondary_color: '#FF8A00',
      button_color: '#2563EB',
      sidebar_color: '#092C22',
      card_style: 'rounded-xl',
      card_color: '#FFFFFF',
      surface_color: '#F3F6F8',
      border_color: '#E2E8F0'
    };

    return {
      site_mode: (settingsMap.site_mode as { mode: 'free' | 'paid' }) || { mode: 'paid' },
      default_display_currency: typeof settingsMap.default_display_currency === 'string' ? settingsMap.default_display_currency : 'FCFA',
      digital_pdf_max_bytes: Number.isInteger(settingsMap.digital_pdf_max_bytes) && Number(settingsMap.digital_pdf_max_bytes) > 0
        ? Number(settingsMap.digital_pdf_max_bytes)
        : 300 * 1024 * 1024,
      theme: { ...defaultTheme, ...((settingsMap.theme as Partial<PlatformSettings['theme']>) || {}) },
      pricing_durations: (settingsMap.pricing_durations as PlatformSettings['pricing_durations']) || [
        { days: 30, price: 1000, currency: 'FCFA', label: '1 mois' },
        { days: 60, price: 2000, currency: 'FCFA', label: '2 mois' },
        { days: 90, price: 3000, currency: 'FCFA', label: '3 mois' }
      ],
      subscription_plans: (settingsMap.subscription_plans as PlatformSettings['subscription_plans']) || [
        { months: 1, price: 15000, currency: 'FCFA', limit: 30, name: 'Formule Starter (1 Mois)' },
        { months: 2, price: 28000, currency: 'FCFA', limit: 70, name: 'Formule Pro (2 Mois)' },
        { months: 3, price: 40000, currency: 'FCFA', limit: 120, name: 'Formule VIP (3 Mois)' }
      ],
      ad_pricing: (settingsMap.ad_pricing as PlatformSettings['ad_pricing']) || [
        { months: 1, price: 30000, currency: 'FCFA', name: 'Bannière VIP 1 Mois' },
        { months: 2, price: 55000, currency: 'FCFA', name: 'Bannière VIP 2 Mois' },
        { months: 3, price: 75000, currency: 'FCFA', name: 'Bannière VIP 3 Mois' }
      ],
      about_content: (settingsMap.about_content as string) || "La plateforme moderne de petites annonces commerciales qui connecte acheteurs et vendeurs à travers toute l'Afrique.",
      security_content: (settingsMap.security_content as string) || 'Vérifiez les articles en personne avant tout paiement. Ne transférez jamais d’argent à l’avance à un vendeur que vous ne connaissez pas et signalez toute annonce suspecte.'
    };
  },

  async updatePlatformSetting(key: string, value: unknown): Promise<boolean> {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) {
      console.error(`Error updating setting ${key}:`, error);
      return false;
    }
    return true;
  },

  // Products
  async getProducts(params?: {
    countryId?: string;
    categoryId?: string;
    search?: string;
    isPopular?: boolean;
    status?: string;
    limit?: number;
    excludeCountryId?: string;
    summary?: boolean;
  }): Promise<Product[]> {
    let query = supabase
      .from('products')
      .select(params?.summary ? PRODUCT_LIST_SELECT : '*, countries(*), categories(*)')
      .order('created_at', { ascending: false });

    if (params?.status) {
      query = query.eq('status', params.status);
    } else {
      query = query.eq('status', 'published');
    }

    if (params?.countryId && params.countryId !== 'ALL') {
      query = query.eq('country_id', params.countryId);
    }

    if (params?.excludeCountryId && params.excludeCountryId !== 'ALL') {
      query = query.neq('country_id', params.excludeCountryId);
    }

    if (params?.categoryId && params.categoryId !== 'all') {
      query = query.eq('category_id', params.categoryId);
    }

    if (params?.isPopular) {
      query = query.eq('is_popular', true);
    }

    if (params?.search) {
      query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%,city.ilike.%${params.search}%`);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching products:', error);
      return [];
    }
    return (data || []) as unknown as Product[];
  },

  /**
   * Présente 75% de produits locaux et 25% de produits de l'étranger (Exigence Utilisateur)
   */
  async getMixedProducts(params?: {
    countryId?: string;
    categoryId?: string;
    search?: string;
    limit?: number;
  }): Promise<{ products: Product[]; popular: Product[] }> {
    const targetCountryId = params?.countryId && params.countryId !== 'ALL' ? params.countryId : null;
    const totalToTake = Math.min(params?.limit || 24, 48);
    const localLimit = targetCountryId ? Math.ceil(totalToTake * 0.75) : totalToTake;
    const foreignLimit = targetCountryId ? totalToTake - localLimit : 0;
    const common = {
      categoryId: params?.categoryId,
      search: params?.search,
      status: 'published' as const,
      summary: true
    };

    const [localProducts, foreignProducts, popularProducts] = await Promise.all([
      this.getProducts({ ...common, countryId: targetCountryId || undefined, limit: localLimit }),
      targetCountryId
        ? this.getProducts({ ...common, excludeCountryId: targetCountryId, limit: foreignLimit })
        : Promise.resolve([] as Product[]),
      this.getProducts({ ...common, isPopular: true, limit: 8 })
    ]);

    const mixedList: Product[] = [];
    let localIdx = 0;
    let foreignIdx = 0;
    while (mixedList.length < totalToTake && (localIdx < localProducts.length || foreignIdx < foreignProducts.length)) {
      for (let i = 0; i < 3 && localIdx < localProducts.length && mixedList.length < totalToTake; i++) mixedList.push(localProducts[localIdx++]);
      if (foreignIdx < foreignProducts.length && mixedList.length < totalToTake) mixedList.push(foreignProducts[foreignIdx++]);
    }

    return {
      products: mixedList.length > 0 ? mixedList : localProducts,
      popular: popularProducts
    };
  },

  async getProductById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*, countries(*), categories(*)')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching product by id:', error);
      return null;
    }
    return data;
  },

  async incrementProductViews(id: string, visitorId?: string): Promise<{ incremented: boolean; views_count: number }> {
    try {
      const visitor = visitorId || getVisitorId();
      const { data, error } = await supabase.rpc('increment_product_views_by_visitor', {
        p_product_id: id,
        p_visitor_id: visitor
      });

      if (!error && data) {
        return data as { incremented: boolean; views_count: number };
      }
    } catch (err) {
      console.warn('Erreur increment_product_views_by_visitor:', err);
    }
    return { incremented: false, views_count: 0 };
  },

  async incrementCallClicks(id: string): Promise<void> {
    await supabase.rpc('increment_product_contact', { p_product_id: id, p_kind: 'call' });
  },

  async incrementWhatsAppClicks(id: string): Promise<void> {
    await supabase.rpc('increment_product_contact', { p_product_id: id, p_kind: 'whatsapp' });
  },

  async createProduct(product: Partial<Product>): Promise<{ success: boolean; data?: { id: string; status: Product['status'] }; error?: string }> {
    const { data, error } = await supabase.rpc('submit_product', { p_product: product });

    if (error) {
      console.error('Error creating product:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<boolean> {
    const { data, error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error updating product:', error);
      return false;
    }
    return Boolean(data?.id);
  },

  async softDeleteProduct(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('products')
      .update({ status: 'trashed', deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error trashing product:', error);
      return false;
    }
    return true;
  },

  async restoreProduct(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('products')
      .update({ status: 'published', deleted_at: null })
      .eq('id', id);

    if (error) {
      console.error('Error restoring product:', error);
      return false;
    }
    return true;
  },

  async deleteProductPermanently(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error permanently deleting product:', error);
      return false;
    }
    return true;
  },

  // Banner Ads
  async getBannerAds(status = 'active'): Promise<BannerAd[]> {
    let query = supabase.from('banner_ads').select('*');
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching banner ads:', error);
      return [];
    }
    return data || [];
  },

  async createBannerAd(ad: Partial<BannerAd>): Promise<{ success: boolean; data?: BannerAd; error?: string }> {
    const { data, error } = await supabase.rpc('submit_banner_ad', { p_ad: ad });

    if (error) {
      console.error('Error creating banner ad:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data: data as BannerAd };
  },

  async incrementBannerClicks(id: string): Promise<void> {
    await supabase.rpc('increment_banner_click', { p_banner_id: id });
  },

  async updateBannerAd(id: string, updates: Partial<BannerAd>): Promise<boolean> {
    const { error } = await supabase
      .from('banner_ads')
      .update(updates)
      .eq('id', id);
    return !error;
  },

  // Subscriptions
  async getSubscriptions(): Promise<SellerSubscription[]> {
    const { data, error } = await supabase
      .from('seller_subscriptions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }
    return data || [];
  },

  async createSubscription(sub: Partial<SellerSubscription>): Promise<{ success: boolean; data?: SellerSubscription; error?: string }> {
    const { data, error } = await supabase.rpc('submit_seller_subscription', { p_sub: sub });

    if (error) {
      console.error('Error creating subscription:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data: data as SellerSubscription };
  },

  async updateSubscription(id: string, updates: Partial<SellerSubscription>): Promise<boolean> {
    const { error } = await supabase
      .from('seller_subscriptions')
      .update(updates)
      .eq('id', id);
    return !error;
  },

  // Promo Codes
  async getPromoCodes(): Promise<PromoCode[]> {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching promo codes:', error);
      return [];
    }
    return data || [];
  },

  async verifyPromoCode(code: string, phone: string): Promise<{
    valid: boolean;
    reason?: string;
    promoCode?: { expires_at: string | null; uses_count: number; max_uses: number };
  }> {
    const { data, error } = await supabase.rpc('verify_promo_code', {
      p_code: code.trim(),
      p_phone: phone.trim()
    });
    if (error || !data) return { valid: false, reason: 'Code invalide ou non applicable à ce numéro.' };
    return data as { valid: boolean; reason?: string; promoCode?: { expires_at: string | null; uses_count: number; max_uses: number } };
  },

  async createPromoCode(promo: Partial<PromoCode>): Promise<{ success: boolean; data?: PromoCode; error?: string }> {
    const { data, error } = await supabase
      .from('promo_codes')
      .insert([promo])
      .select()
      .single();

    if (error) {
      console.error('Error creating promo code:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  async updatePromoCode(id: string, updates: Partial<PromoCode>): Promise<boolean> {
    const { error } = await supabase
      .from('promo_codes')
      .update(updates)
      .eq('id', id);
    return !error;
  },

  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
    return data || [];
  },

  async createTransaction(tx: Partial<Transaction>): Promise<{ success: boolean; data?: Transaction; error?: string }> {
    const { data, error } = await supabase
      .from('transactions')
      .insert([tx])
      .select()
      .single();

    if (error) {
      console.error('Error creating transaction:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  // Withdrawals
  async getWithdrawals(): Promise<WithdrawalRequest[]> {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching withdrawals:', error);
      return [];
    }
    return data || [];
  },

  async createWithdrawal(w: Partial<WithdrawalRequest>): Promise<{ success: boolean; data?: WithdrawalRequest; error?: string }> {
    const { data, error } = await supabase
      .from('withdrawal_requests')
      .insert([w])
      .select()
      .single();

    if (error) {
      console.error('Error creating withdrawal request:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  },

  // Traffic & Analytics
  async trackEvent(event: {
    event_type: string;
    item_id?: string;
    page_path?: string;
    country_code?: string;
    city?: string;
    device_type?: string;
  }): Promise<void> {
    await supabase.from('traffic_events').insert([
      {
        ...event,
        device_type: window.innerWidth < 768 ? 'mobile' : 'desktop'
      }
    ]);
  },

  async getTrafficEvents(limit = 200): Promise<TrafficEvent[]> {
    const { data, error } = await supabase
      .from('traffic_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Error fetching traffic events:', error);
      return [];
    }
    return data || [];
  },

  // Audit Logs
  async getAuditLogs(limit = 100): Promise<AdminAuditLog[]> {
    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Error fetching audit logs:', error);
      return [];
    }
    return data || [];
  },

  async logAdminAction(adminEmail: string, action: string, entityType: string, entityId?: string, details?: Record<string, unknown>): Promise<void> {
    void adminEmail;
    await supabase.rpc('log_admin_action', {
      p_action: action,
      p_entity_type: entityType,
      p_entity_id: entityId ?? null,
      p_details: details ?? null
    });
  },

  // Media Upload via Cloudflare R2 Worker
  async uploadMedia(file: File, folder = 'products'): Promise<{ url: string | null; error: string | null }> {
    const workerUrl = import.meta.env.VITE_MEDIA_WORKER_URL;
    if (!workerUrl) {
      return { url: null, error: 'Le service de stockage des images n’est pas configuré sur cette version du site.' };
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    const mimeByExtension: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
      mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime'
    };
    const aliases: Record<string, string> = {
      'image/jpg': 'image/jpeg', 'image/pjpeg': 'image/jpeg', 'image/x-png': 'image/png'
    };
    const rawType = file.type.toLowerCase();
    const imageExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif'];
    const isImage = rawType.startsWith('image/') || imageExtensions.includes(extension);
    let contentType = aliases[rawType] || mimeByExtension[extension] || rawType;
    if (isImage) {
      const validationError = await validateImageFile(file);
      if (validationError) return { url: null, error: validationError };
      contentType = (await getImageMime(file)) || '';
    }
    const isVideo = ['video/mp4', 'video/webm', 'video/quicktime'].includes(contentType);
    if (!isImage && !isVideo) {
      return { url: null, error: 'Format non pris en charge. Images acceptées : JPG/JPEG, PNG, WebP, GIF ou AVIF.' };
    }

    const sizeLimit = isImage ? MAX_IMAGE_UPLOAD_BYTES : 50 * 1024 * 1024;
    if (file.size > sizeLimit) {
      return { url: null, error: isImage ? 'La photo ne doit pas dépasser 2 Mo.' : 'La vidéo ne doit pas dépasser 50 Mo.' };
    }

    try {
      const response = await fetch(`${workerUrl.replace(/\/$/, '')}/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
          'X-Media-Folder': folder
        },
        body: file
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        const messages: Record<string, string> = {
          'Origin not allowed': 'Ce domaine du site n’est pas autorisé. Ouvrez le domaine officiel ou l’aperçu stable.',
          'Unsupported media type': 'Le format réel du fichier n’est pas pris en charge.',
          'File too large': isImage ? 'La photo ne doit pas dépasser 2 Mo.' : 'La vidéo ne doit pas dépasser 50 Mo.',
          'Empty or oversized file': 'Le fichier est vide ou dépasse la limite autorisée.',
          'Invalid media folder': 'La destination de stockage est invalide.',
          'Upload limit reached': 'La limite temporaire de téléversements est atteinte. Réessayez plus tard.',
          'File signature mismatch': 'Le contenu du fichier ne correspond pas au type annoncé. Réexportez-le en JPG/JPEG, PNG, WebP, GIF ou AVIF.'
        };
        const detail = result.error ? messages[result.error] || result.error : 'Réponse invalide du stockage.';
        return { url: null, error: `${detail} (HTTP ${response.status})` };
      }
      const result = await response.json() as { url?: string };
      if (!result.url) return { url: null, error: 'Le stockage a accepté le fichier mais n’a pas renvoyé son adresse.' };
      return { url: result.url, error: null };
    } catch (e) {
      console.error('Upload exception:', e);
      return {
        url: null,
        error: 'Impossible de joindre le stockage. Vérifiez la connexion et que vous utilisez le domaine officiel ou l’aperçu stable.'
      };
    }
  },

  // Reviews Management
  async getProductReviews(productId: string): Promise<ProductReview[]> {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
    return data || [];
  },

  async createProductReview(review: { product_id: string; author_name: string; rating: number; comment: string }): Promise<ProductReview | null> {
    const { data, error } = await supabase
      .from('product_reviews')
      .insert([review])
      .select()
      .single();
    if (error) {
      console.error('Error creating review:', error);
      return null;
    }
    return data;
  },

  async getAllProductReviews(): Promise<ProductReview[]> {
    const { data, error } = await supabase
      .from('product_reviews')
      .select('*, products(title, photos)')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching all reviews:', error);
      return [];
    }
    return data || [];
  },

  async deleteProductReview(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('product_reviews')
      .delete()
      .eq('id', id);
    return !error;
  },
};
