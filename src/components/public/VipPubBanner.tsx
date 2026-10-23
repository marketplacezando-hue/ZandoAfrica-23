import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone, ExternalLink, Globe, Sparkles, Phone, ArrowLeft, Eye } from 'lucide-react';
import type { BannerAd } from '@/types/zando';
import { zandoApi } from '@/services/zandoApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/db/supabase';

interface VipSlideItem {
  id: string;
  isPresentation: boolean;
  title: string;
  description: string;
  tagline?: string;
  imageUrl: string;
  targetUrl: string;
  phone?: string;
  companyName?: string;
}

interface VipPubBannerProps {
  banner?: BannerAd | null;
}

export const VipPubBanner: React.FC<VipPubBannerProps> = ({ banner }) => {
  const navigate = useNavigate();
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedAdForModal, setSelectedAdForModal] = useState<VipSlideItem | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [activeBanners, setActiveBanners] = useState<BannerAd[]>([]);

  // 1. Charger les publicités VIP actives enregistrées dans le système (Étape 5.2)
  useEffect(() => {
    let isMounted = true;
    const fetchBanners = async () => {
      try {
        const ads = await zandoApi.getBannerAds('active');
        if (isMounted && ads.length > 0) {
          setActiveBanners(ads);
        }
      } catch (err) {
        console.error('Erreur chargement bannières VIP:', err);
      }
    };
    fetchBanners();

    // Souscription en temps réel aux bannières publicitaires VIP
    const channel = supabase
      .channel('vip-ads-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'banner_ads' },
        () => {
          fetchBanners();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, []);

  // Diapositive 1 : Message VIP obligatoire (Étape 5.1)
  const presentationSlide: VipSlideItem = {
    id: 'presentation-zando-vip',
    isPresentation: true,
    title: 'Votre site ici ! Boostez votre visibilité',
    description: "Touchez plus de 50 000 acheteurs potentiels par jour à travers 8 pays d’Afrique.",
    tagline: 'Emplacement VIP en tête d’accueil.',
    imageUrl: '/home/vip-visibility.jpg',
    targetUrl: '/passer-pub'
  };

  // Liste des publicités VIP actives
  const vipAdsList: VipSlideItem[] = [];
  const availableBanners = activeBanners.length > 0 ? activeBanners : banner ? [banner] : [];

  if (availableBanners.length > 0) {
    availableBanners.forEach(b => {
      vipAdsList.push({
        id: b.id,
        isPresentation: false,
        title: b.title,
        description: b.description || 'Publicité VIP officielle vérifiée sur ZandoAfrica.',
        tagline: 'Annonceur partenaire vérifié',
        imageUrl: b.image_url,
        targetUrl: b.target_url || '/passer-pub',
        phone: b.phone_number || '',
        companyName: b.title
      });
    });
  }

  // Compléter avec des publicités actives pour assurer le défilement fluide
  if (vipAdsList.length === 0) {
    vipAdsList.push(
      {
        id: 'ad-tech-congo',
        isPresentation: false,
        title: 'Tech Congo Solutions • Vente & Réparation Informatique',
        description:
          'Smartphones, ordinateurs portables neufs et reconditionnés garantis 1 an. Livraison express sur Brazzaville et Pointe-Noire.',
        tagline: 'Boutique informatique agréée',
        imageUrl:
          'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&auto=format&fit=crop&q=80',
        targetUrl: '/passer-pub',
        phone: '+242 06 999 88 77',
        companyName: 'Tech Congo Solutions'
      },
      {
        id: 'ad-mode-prestige',
        isPresentation: false,
        title: 'Boutique Élégance Panafricaine • Mode & Accessoires',
        description:
          'Nouvelle collection de prêt-à-porter chic, maroquinerie italienne et chaussures de marque. Commandes rapides via WhatsApp.',
        tagline: 'Prêt-à-porter & Luxe',
        imageUrl:
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&auto=format&fit=crop&q=80',
        targetUrl: '/passer-pub',
        phone: '+242 05 123 45 67',
        companyName: 'Élégance Panafricaine'
      }
    );
  }

  // Toutes les étapes du carrousel : [Message VIP, Pub 1, Pub 2, ...]
  const allSlides: VipSlideItem[] = [presentationSlide, ...vipAdsList];

  // Rotation automatique régulière toutes les 4 secondes
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentSlideIndex(prev => (prev + 1) % allSlides.length);
    }, 4000);

    return () => clearTimeout(timer);
  }, [currentSlideIndex, allSlides.length]);

  const activeItem = allSlides[currentSlideIndex] || presentationSlide;

  // Ouvrir l'interface détaillée de la publicité cliquée (Étape 5.3)
  const handleOpenAdDetail = (adItem: VipSlideItem) => {
    if (adItem.isPresentation) {
      navigate('/passer-pub');
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      return;
    }

    if (adItem.id && !adItem.id.startsWith('ad-')) {
      zandoApi.incrementBannerClicks(adItem.id);
      zandoApi.trackEvent({
        event_type: 'banner_click',
        item_id: adItem.id,
        page_path: window.location.pathname
      });
    }

    setSelectedAdForModal(adItem);
    setDetailModalOpen(true);
  };

  const handleOpenExternalUrl = () => {
    if (selectedAdForModal?.targetUrl) {
      if (selectedAdForModal.targetUrl.startsWith('http')) {
        window.open(selectedAdForModal.targetUrl, '_blank', 'noopener,noreferrer');
      } else {
        navigate(selectedAdForModal.targetUrl);
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      }
    }
    setDetailModalOpen(false);
  };

  return (
    <>
      {/* Grand cadre bleu consacré aux publicités VIP (Étape 5) */}
      <div className="relative w-full overflow-hidden rounded-[22px] border-2 border-blue-500/40 bg-[#083ca3] text-white shadow-[0_14px_34px_rgba(17,72,185,0.25)] transition-all duration-500">
        {/* Glow décoratif */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Phase 5.1 : Message Promotionnel VIP */}
        {activeItem.isPresentation ? (
          <div
            key="presentation-slide"
            className="relative flex min-h-[320px] items-center overflow-hidden px-8 py-8 sm:min-h-[350px] sm:px-12 sm:py-6 md:min-h-[390px] md:px-14"
            style={{ backgroundImage: `url(${activeItem.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#073fae] via-[#084bbd]/95 via-58% to-transparent" />
            <div className="relative z-10 max-w-[58%] space-y-3 text-left sm:max-w-[55%] sm:space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#1f74ff] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider shadow-md sm:text-sm">
                <Sparkles className="h-4 w-4 fill-white" aria-hidden="true" />
                <span>PUB VIP</span>
              </div>

              <h3 className="text-[25px] font-black leading-[1.04] tracking-tight sm:text-4xl md:text-5xl">
                {activeItem.title}
              </h3>

              <p className="max-w-[430px] text-xs leading-relaxed text-blue-50 sm:text-sm md:text-base">
                {activeItem.description}
              </p>

              <p className="text-[10px] font-bold uppercase tracking-wide text-cyan-200 sm:text-xs">
                {activeItem.tagline}
              </p>

              <button
                type="button"
                onClick={() => handleOpenAdDetail(activeItem)}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#0877ff] px-4 py-2.5 text-xs font-black shadow-lg transition-transform hover:bg-[#1687ff] active:scale-95 sm:px-6 sm:py-3 sm:text-sm"
              >
                <Megaphone className="h-4 w-4" aria-hidden="true" />
                <span>Découvrir cette PUB VIP</span>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : (
          /* Phase 5.2 : Défilement des publicités enregistrées et actives */
          <div
            key={activeItem.id}
            onClick={() => handleOpenAdDetail(activeItem)}
            className="flex-1 flex flex-col md:flex-row items-center gap-6 py-2 cursor-pointer group animate-in fade-in duration-500 z-10"
          >
            {/* Image publicitaire intégrale et cliquable sans débordement (Étape 5.2 & 5.3) */}
            <div className="relative w-full md:w-5/12 aspect-[16/9] rounded-2xl overflow-hidden border-2 border-blue-400/50 shadow-xl bg-blue-950 shrink-0">
              <img
                src={activeItem.imageUrl}
                alt={activeItem.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-2 left-2 bg-[#2563eb] text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-md">
                VIP
              </div>
              <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Eye className="w-3 h-3" />
                <span>Cliquer pour voir</span>
              </div>
            </div>

            {/* Informations textuelles de la publicité sélectionnée */}
            <div className="flex-1 text-left space-y-2.5 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#2563eb] text-white text-xs font-black uppercase tracking-wider shadow-sm">
                <Sparkles className="w-3.5 h-3.5 fill-white" />
                <span>PUBLICITÉ VIP PARTENAIRE</span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white group-hover:text-blue-200 transition-colors break-words leading-tight">
                {activeItem.title}
              </h3>

              <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed line-clamp-3 break-words font-normal">
                {activeItem.description}
              </p>

              {activeItem.phone && (
                <div className="text-xs text-blue-200 font-medium flex items-center gap-1.5 pt-1">
                  <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Contact annonceur : {activeItem.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bouton permanent « Découvrir cette PUB VIP » (Étape 5) */}
        <div className={activeItem.isPresentation ? 'hidden pt-4 z-10' : 'pt-4 z-10'}>
          <button
            type="button"
            onClick={() => handleOpenAdDetail(activeItem)}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#3b82f6] hover:bg-[#2563eb] text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl transition-all duration-200 active:scale-[0.98] cursor-pointer border border-white/20"
          >
            <Megaphone className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span>Découvrir cette PUB VIP</span>
            <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </button>
        </div>
      </div>

      {/* Deuxième interface : Modale dédiée affichant les informations exactes de la publicité cliquée (Étape 5.3) */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-2xl p-0 overflow-hidden bg-card border-2 border-blue-600 shadow-2xl rounded-2xl">
          {selectedAdForModal && (
            <>
              <div className="relative aspect-[16/9] w-full bg-blue-950 overflow-hidden">
                <img
                  src={selectedAdForModal.imageUrl}
                  alt={selectedAdForModal.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                <div className="absolute top-4 left-4 z-10">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-black uppercase tracking-wider shadow-md">
                    <Sparkles className="w-3.5 h-3.5 fill-white" />
                    PUB VIP VÉRIFIÉE
                  </span>
                </div>

                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <DialogHeader>
                    <DialogTitle className="text-xl sm:text-2xl font-black text-white text-left break-words">
                      {selectedAdForModal.title}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-blue-200 text-left pt-1">
                      {selectedAdForModal.companyName || 'Annonceur partenaire vérifié ZandoAfrica'}
                    </DialogDescription>
                  </DialogHeader>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Détails de l'offre
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-line break-words">
                    {selectedAdForModal.description}
                  </p>
                </div>

                {selectedAdForModal.phone && (
                  <div className="p-4 rounded-xl bg-muted/40 border flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Contact direct : {selectedAdForModal.phone}</span>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                  <Button
                    onClick={handleOpenExternalUrl}
                    className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl gap-2 py-3 cursor-pointer"
                  >
                    <Globe className="w-4 h-4" />
                    <span>Visiter le site / Accéder à l'offre</span>
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setDetailModalOpen(false)}
                    className="w-full sm:w-auto rounded-xl py-3 cursor-pointer gap-1.5"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour à l'accueil</span>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
