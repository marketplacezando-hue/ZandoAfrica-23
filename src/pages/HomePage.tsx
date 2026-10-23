import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Flame, RotateCw, Search, Sparkles, X } from 'lucide-react';
import { useZando } from '@/contexts/ZandoContext';
import { zandoApi } from '@/services/zandoApi';
import { supabase } from '@/db/supabase';
import type { BannerAd, Product } from '@/types/zando';
import { HeroBanner } from '@/components/public/HeroBanner';
import { VipPubBanner } from '@/components/public/VipPubBanner';
import { CategoryFilterBar } from '@/components/public/CategoryFilterBar';
import { ProductCard } from '@/components/public/ProductCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export const HomePage: React.FC = () => {
  const { selectedCountry, categories } = useZando();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState<Product[]>([]);
  const [popularProducts, setPopularProducts] = useState<Product[]>([]);
  const [bannerAd, setBannerAd] = useState<BannerAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [appliedSearchQuery, setAppliedSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const routeSearchQuery = searchParams.get('q') || '';
  const routeCategory = searchParams.get('category') || 'all';
  const popularScrollRef = useRef<HTMLDivElement>(null);
  const realtimeReloadTimerRef = useRef<number | null>(null);
  const [isPopularPaused, setIsPopularPaused] = useState(false);

  useEffect(() => {
    setSearchQuery(routeSearchQuery);
    setAppliedSearchQuery(routeSearchQuery);
  }, [routeSearchQuery]);

  useEffect(() => {
    setSelectedCategory(routeCategory);
  }, [routeCategory]);

  useEffect(() => {
    if (location.hash !== '#dernieres-annonces') return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('dernieres-annonces')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [location.hash]);

  useEffect(() => {
    const container = popularScrollRef.current;
    if (!container || popularProducts.length === 0) return;
    let animationId: number;
    const tick = () => {
      if (!isPopularPaused) {
        if (container.scrollLeft >= container.scrollWidth - container.clientWidth - 2) container.scrollLeft = 0;
        else container.scrollLeft += 0.85;
      }
      animationId = window.requestAnimationFrame(tick);
    };
    animationId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(animationId);
  }, [isPopularPaused, popularProducts]);

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [mixedResult, bannerAds] = await Promise.all([
        zandoApi.getMixedProducts({
          countryId: selectedCountry?.id,
          categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: appliedSearchQuery || undefined
        }),
        zandoApi.getBannerAds('active')
      ]);
      setProducts(mixedResult.products);
      setPopularProducts(mixedResult.popular);
      if (bannerAds.length > 0) setBannerAd(bannerAds[0]);
    } catch (error) {
      console.error('Error loading homepage data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadData();
    zandoApi.trackEvent({
      event_type: 'page_view',
      page_path: '/',
      country_code: selectedCountry?.id,
      city: selectedCountry?.name
    });
  }, [selectedCountry?.id, selectedCategory, appliedSearchQuery]);

  useEffect(() => {
    const channel = supabase
      .channel('home-realtime-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        if (realtimeReloadTimerRef.current !== null) window.clearTimeout(realtimeReloadTimerRef.current);
        realtimeReloadTimerRef.current = window.setTimeout(() => {
          realtimeReloadTimerRef.current = null;
          void loadData(true);
        }, 600);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'banner_ads' }, () => {
        void zandoApi.getBannerAds('active').then(ads => {
          if (ads.length > 0) setBannerAd(ads[0]);
        });
      })
      .subscribe();

    return () => {
      if (realtimeReloadTimerRef.current !== null) window.clearTimeout(realtimeReloadTimerRef.current);
      channel.unsubscribe();
    };
  }, [selectedCountry?.id, selectedCategory, appliedSearchQuery]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    const nextParams = new URLSearchParams(searchParams);
    if (categoryId === 'all') nextParams.delete('category');
    else nextParams.set('category', categoryId);
    setSearchParams(nextParams);
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const normalizedSearch = searchQuery.trim();
    const nextParams = new URLSearchParams(searchParams);
    if (normalizedSearch) nextParams.set('q', normalizedSearch);
    else nextParams.delete('q');
    setSearchParams(nextParams);
    setSearchQuery(normalizedSearch);
    if (normalizedSearch === appliedSearchQuery) void loadData();
    else setAppliedSearchQuery(normalizedSearch);
  };

  const handleSearchClear = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams);
    setSearchQuery('');
    setAppliedSearchQuery('');
  };

  const scrollPopular = (direction: 'left' | 'right') => {
    popularScrollRef.current?.scrollBy({ left: direction === 'left' ? -320 : 320, behavior: 'smooth' });
  };

  return (
    <div className="space-y-5 bg-[#fbfdff] pb-16 sm:space-y-7">
      <section className="-mx-4 bg-gradient-to-b from-[#edfffa] to-transparent px-4 pb-1 pt-3 sm:-mx-6 sm:px-6 sm:pt-4 lg:-mx-8 lg:px-8">
        <form
          onSubmit={handleSearchSubmit}
          className="mx-auto flex max-w-5xl items-center gap-2 rounded-full border-[5px] border-emerald-50 bg-white p-1.5 shadow-[0_8px_24px_rgba(0,166,81,0.13)] ring-1 ring-emerald-100/80 sm:p-2"
        >
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#079447] text-white shadow-sm sm:h-12 sm:w-12">
            <Search className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <div className="relative min-w-0 flex-1">
            <Input
              type="text"
              aria-label="Que recherchez-vous ?"
              placeholder="Que recherchez-vous ? (ex : téléphone, voiture, maison...)"
              value={searchQuery}
              onChange={event => setSearchQuery(event.target.value)}
              className="h-11 w-full rounded-full border-0 bg-[#f2f4f8] px-4 pr-9 text-xs text-foreground shadow-none placeholder:text-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 sm:h-12 sm:text-sm"
            />
            {searchQuery && (
              <button type="button" onClick={handleSearchClear} aria-label="Effacer la recherche" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Button type="submit" aria-label="Rechercher" className="h-11 w-11 shrink-0 rounded-full bg-[#079447] p-0 text-white shadow-sm hover:bg-[#087c3c] sm:h-12 sm:w-12">
            <ArrowRight className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </form>
      </section>

      <HeroBanner />
      <VipPubBanner banner={bannerAd} />

      <section className="rounded-2xl bg-white px-1 py-1 sm:px-2">
        <CategoryFilterBar categories={categories} selectedCategoryId={selectedCategory} onSelectCategory={handleCategorySelect} />
      </section>

      {popularProducts.length > 0 && (
        <section className="space-y-4 rounded-2xl bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-lg bg-orange-100 p-1.5 text-orange-600"><Flame className="h-4 w-4" /></span>
                <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">Produits populaires</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">75% {selectedCountry?.name || 'local'} · 25% étranger</p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => scrollPopular('left')} aria-label="Produits populaires précédents" className="rounded-full border border-border bg-white p-2 text-muted-foreground shadow-sm hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => scrollPopular('right')} aria-label="Produits populaires suivants" className="rounded-full border border-border bg-white p-2 text-muted-foreground shadow-sm hover:bg-muted"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
          <div ref={popularScrollRef} onMouseEnter={() => setIsPopularPaused(true)} onMouseLeave={() => setIsPopularPaused(false)} onTouchStart={() => setIsPopularPaused(true)} onTouchEnd={() => setIsPopularPaused(false)} className="flex items-stretch gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {popularProducts.map(product => (
              <div key={product.id} className="w-[260px] shrink-0 sm:w-[280px]"><ProductCard product={product} variant="popular" onProductClick={() => navigate(`/produit/${product.id}`)} /></div>
            ))}
          </div>
        </section>
      )}

      <section id="dernieres-annonces" className="scroll-mt-28 space-y-5 rounded-2xl bg-white p-4 sm:p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-emerald-100 p-1.5 text-emerald-600"><Sparkles className="h-4 w-4" /></span>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl">Dernières annonces publiées</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Sélection intelligente · mise à jour en direct</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="self-start rounded-full gap-2 text-xs font-semibold sm:self-auto">
            <RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(item => (
              <div key={item} className="space-y-3 rounded-2xl border border-border bg-card p-4 animate-pulse"><div className="aspect-[4/3] rounded-xl bg-muted" /><div className="h-4 w-3/4 rounded bg-muted" /><div className="h-4 w-1/2 rounded bg-muted" /><div className="h-8 rounded-xl bg-muted" /></div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map(product => <ProductCard key={product.id} product={product} variant="latest" onProductClick={() => navigate(`/produit/${product.id}`)} />)}
          </div>
        ) : (
          <div className="space-y-4 rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground"><Search className="h-6 w-6" /></div>
            <div><h3 className="font-bold text-foreground">Aucune annonce trouvée</h3><p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">Aucune annonce ne correspond à votre filtre actuel dans {selectedCountry?.name || 'votre pays'}.</p></div>
            <Button onClick={() => { setSelectedCategory('all'); setSearchQuery(''); handleCategorySelect('all'); }} variant="outline" size="sm" className="rounded-full">Réinitialiser les filtres</Button>
          </div>
        )}
      </section>
    </div>
  );
};
