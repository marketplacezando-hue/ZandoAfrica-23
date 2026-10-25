import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Country, Category, PlatformSettings } from '@/types/zando';
import { zandoApi } from '@/services/zandoApi';
import { supabase } from '@/db/supabase';
import { applyPlatformTheme } from '@/lib/platformTheme';
import {
  fetchExchangeRates,
  formatConvertedPrice,
  normalizeCurrency,
  readCachedExchangeRates,
  type DisplayCurrency,
  type ExchangeRates
} from '@/lib/currency';

type VisitorCountry = { code: string; name: string; currency: DisplayCurrency | null };

interface ZandoContextType {
  countries: Country[];
  selectedCountry: Country | null;
  setSelectedCountry: (country: Country) => void;
  categories: Category[];
  selectedCurrency: DisplayCurrency;
  setSelectedCurrency: (currency: string) => void;
  visitorCountry: VisitorCountry | null;
  exchangeRates: ExchangeRates | null;
  formatPrice: (amount: number, sourceCurrency: string) => string;
  favorites: string[];
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  settings: PlatformSettings;
  refreshSettings: () => Promise<void>;
  isAdminAuthenticated: boolean;
  adminUserEmail: string | null;
  loginAdmin: (email: string, pass: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
}

const ZandoContext = createContext<ZandoContextType | undefined>(undefined);

const defaultSettings: PlatformSettings = {
  site_mode: { mode: 'paid' },
  default_display_currency: 'FCFA',
  digital_pdf_max_bytes: 300 * 1024 * 1024,
  theme: {
    primary_color: '#00A651', secondary_color: '#FF8A00', button_color: '#2563EB', sidebar_color: '#092C22',
    card_style: 'rounded-xl', card_color: '#FFFFFF', surface_color: '#F3F6F8', border_color: '#E2E8F0'
  },
  pricing_durations: [
    { days: 30, price: 1000, currency: 'FCFA', label: '1 mois' },
    { days: 60, price: 2000, currency: 'FCFA', label: '2 mois' },
    { days: 90, price: 3000, currency: 'FCFA', label: '3 mois' }
  ],
  subscription_plans: [
    { months: 1, price: 15000, currency: 'FCFA', limit: 30, name: 'Formule Starter (1 Mois)' },
    { months: 2, price: 28000, currency: 'FCFA', limit: 70, name: 'Formule Pro (2 Mois)' },
    { months: 3, price: 40000, currency: 'FCFA', limit: 120, name: 'Formule VIP (3 Mois)' }
  ],
  ad_pricing: [
    { months: 1, price: 30000, currency: 'FCFA', name: 'Bannière VIP 1 Mois' },
    { months: 2, price: 55000, currency: 'FCFA', name: 'Bannière VIP 2 Mois' },
    { months: 3, price: 75000, currency: 'FCFA', name: 'Bannière VIP 3 Mois' }
  ],
  about_content: "La plateforme moderne de petites annonces commerciales qui connecte acheteurs et vendeurs à travers toute l'Afrique.",
  security_content: 'Vérifiez les articles en personne avant tout paiement. Ne transférez jamais d’argent à l’avance à un vendeur que vous ne connaissez pas et signalez toute annonce suspecte.'
};

const FALLBACK_COUNTRIES: Country[] = [
  { id: 'CG', name: 'Congo-Brazzaville', flag_emoji: '🇨🇬', dial_code: '+242', currency: 'XAF', is_active: true, sort_order: 1 },
  { id: 'CD', name: 'RDC', flag_emoji: '🇨🇩', dial_code: '+243', currency: 'CDF', is_active: true, sort_order: 2 },
  { id: 'CI', name: 'Côte d’Ivoire', flag_emoji: '🇨🇮', dial_code: '+225', currency: 'XOF', is_active: true, sort_order: 3 },
  { id: 'SN', name: 'Sénégal', flag_emoji: '🇸🇳', dial_code: '+221', currency: 'XOF', is_active: true, sort_order: 4 },
  { id: 'BJ', name: 'Bénin', flag_emoji: '🇧🇯', dial_code: '+229', currency: 'XOF', is_active: true, sort_order: 5 },
  { id: 'CM', name: 'Cameroun', flag_emoji: '🇨🇲', dial_code: '+237', currency: 'XAF', is_active: true, sort_order: 6 },
  { id: 'BF', name: 'Burkina Faso', flag_emoji: '🇧🇫', dial_code: '+226', currency: 'XOF', is_active: true, sort_order: 7 },
  { id: 'ML', name: 'Mali', flag_emoji: '🇲🇱', dial_code: '+223', currency: 'XOF', is_active: true, sort_order: 8 },
  { id: 'TG', name: 'Togo', flag_emoji: '🇹🇬', dial_code: '+228', currency: 'XOF', is_active: true, sort_order: 9 },
  { id: 'GA', name: 'Gabon', flag_emoji: '🇬🇦', dial_code: '+241', currency: 'XAF', is_active: true, sort_order: 10 },
  { id: 'TD', name: 'Tchad', flag_emoji: '🇹🇩', dial_code: '+235', currency: 'XAF', is_active: true, sort_order: 11 },
  { id: 'GN', name: 'Guinée', flag_emoji: '🇬🇳', dial_code: '+224', currency: 'GNF', is_active: true, sort_order: 12 }
];

const FALLBACK_CATEGORIES: Category[] = [
  { id: 'telephones-tablettes', name: 'Téléphones & Tablettes', icon: 'Smartphone', is_active: true, sort_order: 1 },
  { id: 'informatique-ordinateurs', name: 'Informatique & Ordinateurs', icon: 'Laptop', is_active: true, sort_order: 2 },
  { id: 'immobilier', name: 'Maison & Déco', icon: 'Home', is_active: true, sort_order: 3 },
  { id: 'mode-chaussures', name: 'Mode & Chaussures', icon: 'Shirt', is_active: true, sort_order: 4 },
  { id: 'vehicules', name: 'Véhicules & Auto', icon: 'Car', is_active: true, sort_order: 5 },
  { id: 'electromenager', name: 'Meubles & Électroménager', icon: 'Tv', is_active: true, sort_order: 6 },
  { id: 'services-autres', name: 'Autres Catégories', icon: 'Briefcase', is_active: true, sort_order: 7 }
];

export const ZandoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [countries, setCountries] = useState<Country[]>(FALLBACK_COUNTRIES);
  const [selectedCountry, setSelectedCountryState] = useState<Country | null>(FALLBACK_COUNTRIES[0]);
  const [categories, setCategories] = useState<Category[]>(FALLBACK_CATEGORIES);
  const [selectedCurrencyState, setSelectedCurrencyState] = useState<DisplayCurrency>(() => normalizeCurrency(localStorage.getItem('zando_display_currency')) || 'FCFA');
  const [visitorCountry, setVisitorCountry] = useState<VisitorCountry | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(() => readCachedExchangeRates());
  const [favorites, setFavorites] = useState<string[]>(() => {
    try { const saved = localStorage.getItem('zando_favorites'); return saved ? JSON.parse(saved) : []; } catch { return []; }
  });
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUserEmail, setAdminUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkAdmin = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!session?.user) { if (mounted) { setIsAdminAuthenticated(false); setAdminUserEmail(null); } return; }
      const { data, error } = await supabase.rpc('is_zando_admin');
      if (!mounted) return;
      if (error || data !== true) { setIsAdminAuthenticated(false); setAdminUserEmail(null); await supabase.auth.signOut(); return; }
      setIsAdminAuthenticated(true); setAdminUserEmail(session.user.email ?? null);
    };
    void supabase.auth.getSession().then(({ data }) => checkAdmin(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => { void Promise.resolve().then(() => checkAdmin(session)); });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => { applyPlatformTheme(settings.theme); }, [settings.theme]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    void fetchExchangeRates(controller.signal).then(setExchangeRates).catch(() => undefined).finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, []);

  useEffect(() => {
    if (countries.length === 0) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    void fetch('https://ipapi.co/json/', { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error('visitor_location_unavailable');
      return response.json() as Promise<{ country_code?: string; country_name?: string; currency?: string }>;
    }).then(location => {
      const code = String(location.country_code || '').toUpperCase();
      if (!code) return;
      const country = countries.find(item => item.id.toUpperCase() === code);
      setVisitorCountry({ code, name: location.country_name || country?.name || code, currency: normalizeCurrency(location.currency) });
      if (!localStorage.getItem('zando_currency_manual')) {
        const detectedCurrency = normalizeCurrency(location.currency);
        if (detectedCurrency) setSelectedCurrencyState(detectedCurrency);
      }
    }).catch(() => undefined).finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [countries]);

  useEffect(() => {
    const initData = async () => {
      try {
        const [countriesData, categoriesData, settingsData] = await Promise.all([zandoApi.getCountries(), zandoApi.getCategories(), zandoApi.getPlatformSettings()]);
        const availableCountries = countriesData.length > 0 ? countriesData : FALLBACK_COUNTRIES;
        const availableCategories = categoriesData.length > 0 ? categoriesData : FALLBACK_CATEGORIES;
        setCountries(availableCountries); setCategories(availableCategories); setSettings(settingsData);
        const defaultCountry = availableCountries.find(c => c.id === 'CG') || availableCountries[0] || null;
        const savedCountryId = localStorage.getItem('zando_selected_country');
        const foundCountry = availableCountries.find(c => c.id === savedCountryId) || defaultCountry;
        setSelectedCountryState(foundCountry);
        if (!localStorage.getItem('zando_currency_manual')) {
          const countryCurrency = foundCountry ? normalizeCurrency(foundCountry.currency) : null;
          const configuredDefault = normalizeCurrency(settingsData.default_display_currency);
          setSelectedCurrencyState(countryCurrency || configuredDefault || 'FCFA');
        }
      } catch (error) {
        console.warn('Backend indisponible, affichage des catégories et pays de secours.', error);
        setCountries(FALLBACK_COUNTRIES);
        setCategories(FALLBACK_CATEGORIES);
        setSelectedCountryState(FALLBACK_COUNTRIES[0]);
      }
    };
    void initData();
  }, []);

  const refreshSettings = async () => { try { setSettings(await zandoApi.getPlatformSettings()); } catch (error) { console.error('Failed to load platform settings:', error); } };
  const setSelectedCountry = (country: Country) => {
    setSelectedCountryState(country);
    localStorage.setItem('zando_selected_country', country.id);
    const countryCurrency = normalizeCurrency(country.currency);
    if (countryCurrency) {
      setSelectedCurrencyState(countryCurrency);
      localStorage.setItem('zando_display_currency', countryCurrency);
      localStorage.setItem('zando_currency_manual', '1');
    }
  };
  const setSelectedCurrency = (currency: string) => {
    const normalized = normalizeCurrency(currency);
    if (!normalized) return;
    setSelectedCurrencyState(normalized); localStorage.setItem('zando_display_currency', normalized); localStorage.setItem('zando_currency_manual', '1');
  };
  const formatPrice = (amount: number, sourceCurrency: string) => formatConvertedPrice(amount, sourceCurrency, selectedCurrencyState, exchangeRates);
  const toggleFavorite = (productId: string) => setFavorites(previous => { const next = previous.includes(productId) ? previous.filter(id => id !== productId) : [...previous, productId]; localStorage.setItem('zando_favorites', JSON.stringify(next)); return next; });
  const isFavorite = (productId: string) => favorites.includes(productId);
  const loginAdmin = async (email: string, pass: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: pass });
    if (error || !data.session) return false;
    const { data: isAdmin, error: roleError } = await supabase.rpc('is_zando_admin');
    if (roleError || isAdmin !== true) { await supabase.auth.signOut(); return false; }
    setIsAdminAuthenticated(true); setAdminUserEmail(data.user.email ?? null); return true;
  };
  const logoutAdmin = async () => { await supabase.auth.signOut(); setIsAdminAuthenticated(false); setAdminUserEmail(null); };

  return <ZandoContext.Provider value={{ countries, selectedCountry, setSelectedCountry, categories, selectedCurrency: selectedCurrencyState, setSelectedCurrency, visitorCountry, exchangeRates, formatPrice, favorites, toggleFavorite, isFavorite, settings, refreshSettings, isAdminAuthenticated, adminUserEmail, loginAdmin, logoutAdmin }}>{children}</ZandoContext.Provider>;
};

export const useZando = () => {
  const context = useContext(ZandoContext);
  if (!context) throw new Error('useZando must be used within a ZandoProvider');
  return context;
};
