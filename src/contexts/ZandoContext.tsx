import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Country, Category, PlatformSettings } from '@/types/zando';
import { zandoApi } from '@/services/zandoApi';
import { supabase } from '@/db/supabase';
import { applyPlatformTheme } from '@/lib/platformTheme';

interface ZandoContextType {
  countries: Country[];
  selectedCountry: Country | null;
  setSelectedCountry: (country: Country) => void;
  categories: Category[];
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
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

export const ZandoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountryState] = useState<Country | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('XAF');
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('zando_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [settings, setSettings] = useState<PlatformSettings>({
    site_mode: { mode: 'paid' },
    digital_pdf_max_bytes: 20 * 1024 * 1024,
    theme: {
      primary_color: '#00A651',
      secondary_color: '#FF8A00',
      button_color: '#2563EB',
      sidebar_color: '#092C22',
      card_style: 'rounded-xl',
      card_color: '#FFFFFF',
      surface_color: '#F3F6F8',
      border_color: '#E2E8F0'
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
  });

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUserEmail, setAdminUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkAdmin = async (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!session?.user) {
        if (mounted) {
          setIsAdminAuthenticated(false);
          setAdminUserEmail(null);
        }
        return;
      }
      const { data, error } = await supabase.rpc('is_zando_admin');
      if (!mounted) return;
      if (error || data !== true) {
        setIsAdminAuthenticated(false);
        setAdminUserEmail(null);
        await supabase.auth.signOut();
        return;
      }
      setIsAdminAuthenticated(true);
      setAdminUserEmail(session.user.email ?? null);
    };
    void supabase.auth.getSession().then(({ data }) => checkAdmin(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void Promise.resolve().then(() => checkAdmin(session));
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const refreshSettings = async () => {
    try {
      const fetchedSettings = await zandoApi.getPlatformSettings();
      setSettings(fetchedSettings);
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  };

  useEffect(() => {
    applyPlatformTheme(settings.theme);
  }, [settings.theme]);

  useEffect(() => {
    const initData = async () => {
      const [countriesData, categoriesData, settingsData] = await Promise.all([
        zandoApi.getCountries(),
        zandoApi.getCategories(),
        zandoApi.getPlatformSettings()
      ]);

      setCountries(countriesData);
      setCategories(categoriesData);
      setSettings(settingsData);

      // Default country: Congo-Brazzaville (CG)
      const defaultCountry = countriesData.find(c => c.id === 'CG') || countriesData[0] || null;
      const savedCountryId = localStorage.getItem('zando_selected_country');
      const foundCountry = countriesData.find(c => c.id === savedCountryId) || defaultCountry;
      setSelectedCountryState(foundCountry);
      if (foundCountry) {
        setSelectedCurrency(foundCountry.currency);
      }
    };

    initData();
  }, []);

  const setSelectedCountry = (country: Country) => {
    setSelectedCountryState(country);
    setSelectedCurrency(country.currency);
    localStorage.setItem('zando_selected_country', country.id);
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const next = prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId];
      localStorage.setItem('zando_favorites', JSON.stringify(next));
      return next;
    });
  };

  const isFavorite = (productId: string) => favorites.includes(productId);

  const loginAdmin = async (email: string, pass: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass
    });
    if (error || !data.session) return false;
    const { data: isAdmin, error: roleError } = await supabase.rpc('is_zando_admin');
    if (roleError || isAdmin !== true) {
      await supabase.auth.signOut();
      return false;
    }
    setIsAdminAuthenticated(true);
    setAdminUserEmail(data.user.email ?? null);
    return true;
  };

  const logoutAdmin = async (): Promise<void> => {
    await supabase.auth.signOut();
    setIsAdminAuthenticated(false);
    setAdminUserEmail(null);
  };

  return (
    <ZandoContext.Provider
      value={{
        countries,
        selectedCountry,
        setSelectedCountry,
        categories,
        selectedCurrency,
        setSelectedCurrency,
        favorites,
        toggleFavorite,
        isFavorite,
        settings,
        refreshSettings,
        isAdminAuthenticated,
        adminUserEmail,
        loginAdmin,
        logoutAdmin
      }}
    >
      {children}
    </ZandoContext.Provider>
  );
};

export const useZando = () => {
  const context = useContext(ZandoContext);
  if (!context) {
    throw new Error('useZando must be used within a ZandoProvider');
  }
  return context;
};
