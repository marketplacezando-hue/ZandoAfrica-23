import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowRight, Sparkles } from 'lucide-react';

interface HeroSlideItem {
  id: string;
  type: 'message' | 'featured_image';
  tag?: string;
  title: string;
  description?: string;
  imageUrl?: string;
  altText?: string;
}

const heroSlides: HeroSlideItem[] = [
  // 1. Message Promotionnel fidèle à la capture Screenshot_20261018-010836.jpg
  {
    id: 'msg-rapide-direct',
    type: 'message',
    tag: 'RAPIDE & DIRECT',
    title: 'Vendez vos articles en quelques clics',
    description: "Entrez en contact direct avec des milliers d'acheteurs via WhatsApp et appel."
  },
  // 2. Image Vedette (Chaussure Nike rouge dans son grand cadre)
  {
    id: 'img-nike-red',
    type: 'featured_image',
    title: 'Chaussure de sport Nike rouge — Édition Vedette',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1000&auto=format&fit=crop&q=80',
    altText: 'Chaussure de sport Nike rouge — Produit vedette ZandoAfrica'
  },
  // 3. Message Promotionnel : Marketplace panafricaine
  {
    id: 'msg-marketplace',
    type: 'message',
    tag: 'MARKETPLACE AFRIQUE',
    title: 'Achetez et vendez en toute confiance',
    description: "Des milliers d'annonces vérifiées au Congo, en RDC et dans 8 pays d'Afrique."
  },
  // 4. Image Vedette : Smartphone haut de gamme
  {
    id: 'img-iphone-15',
    type: 'featured_image',
    title: 'Smartphone & High-Tech — Produit vedette',
    imageUrl: 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=1000&auto=format&fit=crop&q=80',
    altText: 'Smartphone haut de gamme — Produit vedette ZandoAfrica'
  },
  // 5. Message Promotionnel : Boost et visibilité maximale
  {
    id: 'msg-visibilite',
    type: 'message',
    tag: 'VISIBILITÉ & BOOST',
    title: 'Multipliez vos ventes rapidement',
    description: "Mettez vos annonces en tête de liste et concluez vos transactions sans intermédiaire."
  },
  // 6. Image Vedette : Console de jeu nouvelle génération
  {
    id: 'img-ps5-console',
    type: 'featured_image',
    title: 'Console de jeux vidéo — Produit vedette',
    imageUrl: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=1000&auto=format&fit=crop&q=80',
    altText: 'Console de jeux vidéo nouvelle génération — Produit vedette'
  }
];

export const HeroBanner: React.FC = () => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Rotation automatique régulière (4 secondes) entre messages et images vedettes (Étape 4)
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentSlideIndex(prev => (prev + 1) % heroSlides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isPaused, currentSlideIndex]);

  const slide = heroSlides[currentSlideIndex];

  const handlePrev = () => {
    setCurrentSlideIndex(prev => (prev === 0 ? heroSlides.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentSlideIndex(prev => (prev + 1) % heroSlides.length);
  };

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full rounded-3xl overflow-hidden bg-[#0a2f24] text-white shadow-2xl p-4 sm:p-6 md:p-8 space-y-4 transition-all duration-300"
    >
      {/* Ligne d'en-tête : Flèche gauche, Bouton centré « Publier mon annonce », Flèche droite */}
      <div className="flex items-center justify-between gap-3">
        {/* Flèche gauche */}
        <button
          type="button"
          onClick={handlePrev}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0 active:scale-95 border border-white/10"
          aria-label="Diapositive précédente"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        {/* Bouton centré orange « Publier mon annonce » */}
        <div className="flex-1 flex justify-center">
          <Link
            to="/publier"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:px-8 sm:py-3 rounded-full bg-[#f38100] hover:bg-[#d97200] text-white font-black text-xs sm:text-base tracking-wide shadow-lg transition-transform active:scale-95 border border-white/20"
          >
            <span>Publier mon annonce</span>
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </Link>
        </div>

        {/* Flèche droite */}
        <button
          type="button"
          onClick={handleNext}
          className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-all cursor-pointer shadow-md shrink-0 active:scale-95 border border-white/10"
          aria-label="Diapositive suivante"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Zone principale : défilement alterné entre messages et images vedettes (Étape 4 & Screenshot_20261018-010836.jpg) */}
      <div className="relative w-full min-h-[220px] sm:min-h-[280px] md:min-h-[340px] flex items-center justify-center">
        {slide.type === 'message' ? (
          /* Diapositive de Message promotionnel (conforme à Screenshot_20261018-010836.jpg) */
          <div
            key={slide.id}
            className="w-full h-full flex flex-col justify-center items-start text-left p-4 sm:p-8 space-y-3 sm:space-y-4 animate-in fade-in duration-500"
          >
            {/* Badge pill orange exact : RAPIDE & DIRECT */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#ff7a00] text-white text-xs sm:text-sm font-black uppercase tracking-wider shadow-md">
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              <span>{slide.tag}</span>
            </div>

            {/* Titre percutant blanc */}
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-white leading-tight tracking-tight break-words max-w-3xl">
              {slide.title}
            </h2>

            {/* Description claire et contrastée */}
            <p className="text-sm sm:text-base md:text-xl text-emerald-100/90 leading-relaxed max-w-2xl font-normal break-words pt-1">
              {slide.description}
            </p>
          </div>
        ) : (
          /* Diapositive d'Image Vedette : Cadre rouge grand format sans superposition de prix */
          <div
            key={slide.id}
            className="relative w-full aspect-[4/3] sm:aspect-[16/9] md:aspect-[2/1] max-h-[340px] rounded-3xl overflow-hidden bg-gradient-to-br from-[#c8102e] via-[#b50e28] to-[#8d0a1e] border-2 border-red-500/30 shadow-2xl flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-500"
          >
            <img
              src={slide.imageUrl}
              alt={slide.altText || slide.title}
              className="w-full h-full object-contain sm:object-cover rounded-2xl select-none transition-transform duration-700"
            />

            {/* Badge discret « Produit vedette » en bas à gauche */}
            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10">
              <span className="px-3 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-xs sm:text-sm font-semibold tracking-wide shadow-md">
                Produit vedette
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Indicateurs de progression (petits points discrets) */}
      <div className="flex items-center justify-center gap-2 pt-1 pb-1">
        {heroSlides.map((s, idx) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setCurrentSlideIndex(idx)}
            className={`transition-all duration-300 rounded-full cursor-pointer ${
              currentSlideIndex === idx
                ? 'w-7 h-2 bg-[#f38100]'
                : 'w-2 h-2 bg-white/30 hover:bg-white/60'
            }`}
            aria-label={`Aller à la diapositive ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
