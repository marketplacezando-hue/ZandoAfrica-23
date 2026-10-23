import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, Headphones, ShoppingCart, ShieldCheck, Sparkles, Truck } from 'lucide-react';

interface HeroSlideItem {
  id: string;
  kind: 'marketplace' | 'message' | 'featured_image';
  tag?: string;
  title: string;
  description: string;
  imageUrl?: string;
  altText?: string;
}

const heroSlides: HeroSlideItem[] = [
  {
    id: 'marketplace-confidence',
    kind: 'marketplace',
    tag: 'ZandoAfrica',
    title: 'Votre marketplace de confiance',
    description: 'Achetez et vendez facilement en toute sécurité en Afrique.',
    imageUrl: '/home/hero-marketplace.jpg',
    altText: 'Panier de courses, smartphone et colis pour illustrer le marketplace Zando Africa'
  },
  {
    id: 'fast-direct',
    kind: 'message',
    tag: 'RAPIDE & DIRECT',
    title: 'Vendez vos articles en quelques clics',
    description: 'Entrez en contact direct avec des milliers d’acheteurs via WhatsApp et appel.'
  },
  {
    id: 'smartphone',
    kind: 'featured_image',
    title: 'Smartphone & High-Tech',
    description: 'Découvrez les nouveautés et les bonnes affaires près de chez vous.',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1400&auto=format&fit=crop&q=85',
    altText: 'Smartphone haut de gamme — Produit vedette Zando Africa'
  },
  {
    id: 'visibility',
    kind: 'message',
    tag: 'VISIBILITÉ & BOOST',
    title: 'Multipliez vos ventes rapidement',
    description: 'Mettez vos annonces en tête de liste et concluez vos transactions sans intermédiaire.'
  }
];

const trustItems = [
  { label: 'Paiement', detail: 'sécurisé', icon: ShieldCheck },
  { label: 'Livraison', detail: 'rapide', icon: Truck },
  { label: 'Assistance', detail: '24/7', icon: Headphones }
];

export const HeroBanner: React.FC = () => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const slide = heroSlides[currentSlideIndex];

  useEffect(() => {
    if (isPaused) return;
    const interval = window.setInterval(() => {
      setCurrentSlideIndex(previous => (previous + 1) % heroSlides.length);
    }, 5200);
    return () => window.clearInterval(interval);
  }, [isPaused]);

  const handlePrev = () => {
    setCurrentSlideIndex(previous => (previous === 0 ? heroSlides.length - 1 : previous - 1));
  };

  const handleNext = () => {
    setCurrentSlideIndex(previous => (previous + 1) % heroSlides.length);
  };

  return (
    <div
      className="relative isolate overflow-hidden rounded-[22px] bg-[#07533f] text-white shadow-[0_12px_34px_rgba(6,83,63,0.2)]"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      {slide.kind === 'marketplace' && slide.imageUrl ? (
        <div
          key={slide.id}
          className="relative min-h-[210px] bg-cover bg-center transition-all duration-500 sm:min-h-[220px] md:min-h-[260px]"
          style={{ backgroundImage: `url(${slide.imageUrl})` }}
          role="img"
          aria-label={slide.altText}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-[#064d3b] via-[#075b43]/95 via-55% to-transparent" />
          <div className="relative z-10 flex min-h-[210px] max-w-[62%] flex-col justify-center px-8 py-6 sm:min-h-[220px] sm:max-w-[60%] sm:px-10 sm:py-3 md:min-h-[260px] md:max-w-[55%] md:px-14">
            <span className="mb-2 inline-flex w-fit items-center rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black shadow-lg sm:text-xs">
              {slide.tag}
            </span>
            <h2 className="max-w-[450px] text-[25px] font-black leading-[1.02] tracking-tight sm:text-3xl md:text-4xl">
              Votre marketplace <span className="block text-white">de <span className="text-orange-400">confiance</span></span>
            </h2>
            <p className="mt-3 max-w-[340px] text-xs leading-relaxed text-emerald-50 sm:text-sm md:text-base">
              {slide.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[9px] font-medium text-white sm:text-[10px] md:text-xs">
              {trustItems.map(({ label, detail, icon: Icon }) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <Icon className="h-4 w-4 text-white" aria-hidden="true" />
                  <span>{label}<br /><span className="text-emerald-100">{detail}</span></span>
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : slide.kind === 'message' ? (
          <div key={slide.id} className="relative flex min-h-[210px] items-center overflow-hidden px-10 py-8 sm:min-h-[220px] sm:px-14 md:min-h-[260px]">
          <div className="absolute -right-10 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-emerald-300/10 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500 px-3 py-1 text-[10px] font-black uppercase tracking-wider sm:text-xs">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {slide.tag}
            </span>
            <h2 className="mt-3 text-3xl font-black leading-tight sm:text-4xl md:text-5xl">{slide.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-50 sm:text-base md:text-lg">{slide.description}</p>
            <Link to="/publier" className="mt-5 inline-flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-xs font-black shadow-lg transition-transform hover:bg-orange-600 active:scale-95 sm:text-sm">
              Publier une annonce
              <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
          <div key={slide.id} className="relative min-h-[210px] overflow-hidden sm:min-h-[220px] md:min-h-[260px]">
          <img src={slide.imageUrl} alt={slide.altText || slide.title} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#07533f]/95 via-[#07533f]/60 to-transparent" />
          <div className="relative z-10 flex min-h-[210px] max-w-[60%] flex-col justify-center px-8 py-8 sm:min-h-[220px] sm:px-14 md:min-h-[260px]">
            <span className="text-xs font-black uppercase tracking-wider text-orange-300">Produit vedette</span>
            <h2 className="mt-2 text-2xl font-black sm:text-4xl">{slide.title}</h2>
            <p className="mt-3 text-sm text-emerald-50 sm:text-base">{slide.description}</p>
          </div>
        </div>
      )}

      <button type="button" onClick={handlePrev} aria-label="Diapositive précédente" className="absolute left-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/35 transition-colors hover:bg-black/60 sm:left-4 sm:h-10 sm:w-10">
        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <button type="button" onClick={handleNext} aria-label="Diapositive suivante" className="absolute right-3 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/35 bg-black/35 transition-colors hover:bg-black/60 sm:right-4 sm:h-10 sm:w-10">
        <ChevronRight className="h-5 w-5" aria-hidden="true" />
      </button>

      <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2" aria-label="Navigation des diapositives">
        {heroSlides.map((item, index) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCurrentSlideIndex(index)}
            aria-label={`Aller à la diapositive ${index + 1}`}
            className={`h-2 rounded-full transition-all ${currentSlideIndex === index ? 'w-5 bg-orange-500' : 'w-2 bg-white/55 hover:bg-white'}`}
          />
        ))}
      </div>
    </div>
  );
};
