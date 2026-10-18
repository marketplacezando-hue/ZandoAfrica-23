import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useZando } from '@/contexts/ZandoContext';
import { zandoApi } from '@/services/zandoApi';
import { supabase } from '@/db/supabase';
import type { Product, BannerAd } from '@/types/zando';
import { HeroBanner } from '@/components/public/HeroBanner';
import { VipPubBanner } from '@/components/public/VipPubBanner';
import { CategoryFilterBar } from '@/components/public/CategoryFilterBar';
import { ProductCard } from '@/components/public/ProductCard';
import {
  Search,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const HomePage: React.FC = () => {
  const { selectedCountry, categories } = useZando();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [bannerAd, setBannerAd] = useState<BannerAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');

  const popularScrollRef = useRef<HTMLDivElement>(null);
  const [isPopularPaused, setIsPopularPaused] = useState(false);

  // Défilement continu horizontal pour les produits populaires
  useEffect(() => {
    const container = popularScrollRef.current;
    if (!container || popularProducts.length === 0) return;

    let animId: number;
    const speed = 0.85;

    const tick = () => {
      if (!isPopularPaused && container) {
        if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 2) {
          container.scrollLeft = 0;
        } else {
          container.scrollLeft += speed;
        }
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [isPopularPaused, popularProducts]);

  // Chargement avec ratio 75% local et 25% étranger (Exigence Utilisateur)
  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [mixedResult, bannerAds] = await Promise.all([
        zandoApi.getMixedProducts({
          countryId: selectedCountry?.id,
          categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: searchQuery || undefined
        }),
        zandoApi.getBannerAds('active')
      ]);

      setProducts(mixedResult.products);
      setPopularProducts(mixedResult.popular);
      if (bannerAds.length > 0) {
        setBannerAd(bannerAds[0]);
      }
    } catch (err) {
      console.error('Error loading homepage data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    zandoApi.trackEvent({
      event_type: 'page_view',
      page_path: '/',
      country_code: selectedCountry?.id,
      city: selectedCountry?.name
    });
  }, [selectedCountry?.id, selectedCategory, searchQuery]);

  // Synchronisation en temps réel via Supabase Realtime (Exigence Utilisateur)
  useEffect(() => {
    const channel = supabase
      .channel('home-realtime-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          // Actualisation instantanée silencieuse en direct
          loadData(true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banner_ads' },
        () => {
          zandoApi.getBannerAds('active').then(ads => {
            if (ads.length > 0) setBannerAd(ads[0]);
          });
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedCountry?.id, selectedCategory, searchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    if (catId === 'all') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catId);
    }
    setSearchParams(searchParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      searchParams.set('q', searchQuery);
    } else {
      searchParams.delete('q');
    }
    setSearchParams(searchParams);
  };

  const scrollPopular = (direction: 'left' | 'right') => {
    if (popularScrollRef.current) {
      const offset = direction === 'left' ? -320 : 320;
      popularScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      {/* Search Header Bar */}
      <section className="bg-gradient-to-b from-primary/5 to-transparent pt-4 pb-2">
        <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto flex items-center gap-2 px-1">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Que recherchez-vous ? (ex: iPhone, Voiture, Appartement...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-9 py-2.5 h-12 rounded-full border-border/80 bg-card text-foreground shadow-xs text-xs sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            className="h-12 px-4 sm:px-6 shrink-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs text-xs sm:text-sm"
          >
            Rechercher
          </Button>
        </form>
      </section>

      {/* Hero Banner Showcase (Image Vedette dans Cadre Rouge & Cadre Vert, Étape 4) */}
      <section>
        <HeroBanner />
      </section>

      {/* VIP Advertising Banner (Cadre Bleu "PUB VIP", Étape 5) */}
      <section>
        <VipPubBanner banner={bannerAd} />
      </section>

      {/* Category Pills Filter Bar */}
      <section className="sticky top-20 z-30 bg-background/95 backdrop-blur-xs py-2 border-y border-border/60">
        <CategoryFilterBar
          categories={categories}
          selectedCategoryId={selectedCategory}
          onSelectCategory={handleCategorySelect}
        />
      </section>

      {/* Section 1: Produits populaires avec ratio 75% local et 25% étranger */}
      {popularProducts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-100 text-orange-600">
                  <Flame className="w-4 h-4" />
                </span>
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                  Produits populaires
                </h2>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span>Défilement continu</span>
                <span>•</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">75% Local ({selectedCountry?.name || 'Congo'})</span>
                <span>•</span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">25% Étranger</span>
              </p>
            </div>

            {/* Slider navigation arrows */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollPopular('left')}
                className="p-2 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-xs"
                aria-label="Précédent"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollPopular('right')}
                className="p-2 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shadow-xs"
                aria-label="Suivant"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Carrousel horizontal scrollable */}
          <div
            ref={popularScrollRef}
            onMouseEnter={() => setIsPopularPaused(true)}
            onMouseLeave={() => setIsPopularPaused(false)}
            onTouchStart={() => setIsPopularPaused(true)}
            onTouchEnd={() => setIsPopularPaused(false)}
            className="flex items-stretch gap-4 overflow-x-auto no-scrollbar pb-3 pt-1 scroll-smooth"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {popularProducts.map(p => (
              <div key={p.id} className="w-[260px] sm:w-[280px] shrink-0">
                <ProductCard
                  product={p}
                  variant="popular"
                  onProductClick={() => navigate(`/produit/${p.id}`)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 2: Dernières annonces publiées (Ratio 75% local / 25% étranger) */}
      <section id="dernieres-annonces" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                Dernières annonces publiées
              </h2>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span>Sélection intelligente :</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">75% {selectedCountry?.name || 'Local'}</span>
              <span>&</span>
              <span className="font-semibold text-blue-700 dark:text-blue-400">25% Étranger</span>
              <span className="text-[11px] bg-muted px-2 py-0.5 rounded-full ml-1">Mise à jour en direct</span>
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="self-start sm:self-auto rounded-full gap-2 text-xs font-semibold cursor-pointer"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </Button>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4 space-y-3 animate-pulse">
                <div className="aspect-4/3 bg-muted rounded-xl" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-8 bg-muted rounded-xl" />
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                variant="latest"
                onProductClick={() => navigate(`/produit/${p.id}`)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed border-border p-8 space-y-4">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
              <Search className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-foreground">Aucune annonce trouvée</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Aucune annonce ne correspond à votre filtre actuel dans {selectedCountry?.name}. Soyez le premier à publier !
              </p>
            </div>
            <Button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              Réinitialiser les filtres
            </Button>
          </div>
        )}
      </section>
    </div>
  );
};
