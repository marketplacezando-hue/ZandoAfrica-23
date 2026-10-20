import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useZando } from '@/contexts/ZandoContext';
import { zandoApi } from '@/services/zandoApi';
import * as digitalBooks from '@/services/digitalBooks';
import { supabase } from '@/db/supabase';
import type { Product, ProductReview } from '@/types/zando';
import {
  Heart,
  Share2,
  Clock,
  Eye,
  Phone,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  Check,
  AlertCircle,
  ShoppingBag,
  Star,
  MessageSquare,
  Sparkles,
  Layers,
  Ruler,
  Play,
  User,
  Plus,
  BookOpen,
  Loader2
} from 'lucide-react';
import { WhatsAppIcon } from '@/components/common/WhatsAppIcon';
import { CountryFlag } from '@/components/common/CountryFlag';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { isValidMerchantUrl } from '@/lib/digitalProducts';
import { PaymentLogosMarquee } from '@/components/public/PaymentLogosMarquee';

type DigitalBooksApi = {
  getDigitalPreview?: (productId: string) => Promise<{ blobUrl: string; totalPages: number; error?: string }>;
};
const digitalBooksApi = digitalBooks as unknown as DigitalBooksApi;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_PREVIEW_PAGES = 10;

const PdfPreviewReader: React.FC<{ blobUrl: string; maxPages?: number }> = ({ blobUrl, maxPages = MAX_PREVIEW_PAGES }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef(0);
  const [documentProxy, setDocumentProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let active = true;
    setRendering(true);
    setPageNumber(1);
    const loadingTask = pdfjsLib.getDocument(blobUrl);
    void loadingTask.promise.then(pdf => {
      if (!active) {
        void pdf.destroy();
        return;
      }
      setDocumentProxy(pdf);
      setPageCount(Math.min(pdf.numPages, maxPages));
    }).catch(() => {
      if (active) setDocumentProxy(null);
    });
    return () => {
      active = false;
      void loadingTask.destroy();
      setDocumentProxy(null);
    };
  }, [blobUrl, maxPages]);

  useEffect(() => {
    if (!documentProxy || !canvasRef.current || !readerRef.current) return;
    let active = true;
    setRendering(true);
    void documentProxy.getPage(pageNumber).then(page => {
      if (!active || !canvasRef.current || !readerRef.current) return;
      const baseViewport = page.getViewport({ scale: 1 });
      const availableWidth = Math.max(260, readerRef.current.clientWidth - 24);
      const scale = availableWidth / baseViewport.width;
      const viewport = page.getViewport({ scale });
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const canvas = canvasRef.current;
      canvas.width = Math.ceil(viewport.width * pixelRatio);
      canvas.height = Math.ceil(viewport.height * pixelRatio);
      canvas.style.width = `${Math.ceil(viewport.width)}px`;
      canvas.style.height = `${Math.ceil(viewport.height)}px`;
      const context = canvas.getContext('2d');
      if (!context) return;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      return page.render({ canvas, canvasContext: context, viewport }).promise;
    }).finally(() => {
      if (active) setRendering(false);
    });
    return () => { active = false; };
  }, [documentProxy, pageNumber]);

  const goToPage = (next: number) => setPageNumber(Math.max(1, Math.min(pageCount || 1, next)));
  const handleTouchStart = (event: React.TouchEvent) => {
    touchStartXRef.current = event.touches[0]?.clientX || 0;
  };
  const handleTouchEnd = (event: React.TouchEvent) => {
    const delta = touchStartXRef.current - (event.changedTouches[0]?.clientX || 0);
    if (Math.abs(delta) > 40) goToPage(pageNumber + (delta > 0 ? 1 : -1));
  };

  return (
    <div className="space-y-3">
      <div
        ref={readerRef}
        className="relative flex min-h-[50vh] w-full touch-pan-y items-center justify-center overflow-hidden rounded-xl border bg-slate-100 p-3 dark:bg-slate-900"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <canvas ref={canvasRef} className="max-h-[65vh] max-w-full rounded bg-white shadow-sm" aria-label={`Page ${pageNumber}`} />
        {rendering && <span className="absolute rounded-full bg-card/90 px-3 py-2 text-xs font-semibold text-muted-foreground shadow">Chargement de la page...</span>}
      </div>
      <div className="flex items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1} aria-label="Page précédente">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-xs font-semibold text-muted-foreground">Page {pageNumber} / {pageCount || '…'} · Glissez pour naviguer</span>
        <Button type="button" variant="outline" size="sm" onClick={() => goToPage(pageNumber + 1)} disabled={!pageCount || pageNumber >= pageCount} aria-label="Page suivante">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite, selectedCurrency, setSelectedCurrency, selectedCountry, formatPrice } = useZando();

  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  // Selected Variant Option
  const [selectedOption, setSelectedOption] = useState<string>('');

  // Reviews State (Requirement 4)
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [newReviewAuthor, setNewReviewAuthor] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Active Media Tab (Photos vs Video)
  const [mediaTab, setMediaTab] = useState<'photos' | 'video'>('photos');

  // Digital book purchase and server-limited preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [previewTotalPages, setPreviewTotalPages] = useState<number | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Support glissement tactile (swipe gauche/droite) pour la galerie photos (Étape 7)
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);

  const handleGalleryTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleGalleryTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchStartXRef.current - touchEndX;
    const deltaY = touchStartYRef.current - touchEndY;

    // Déclencher uniquement si le swipe horizontal est prédominant sans gêner le scroll vertical
    if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
      if (photos.length > 1) {
        if (deltaX > 0) {
          // Swipe vers la gauche -> Image suivante
          setActivePhotoIndex(prev => (prev + 1) % photos.length);
        } else {
          // Swipe vers la droite -> Image précédente
          setActivePhotoIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1));
        }
      }
    }
  };

  useEffect(() => {
    const fetchDetail = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const item = await zandoApi.getProductById(id);
        if (item) {
          setProduct(item);
          // Initialize selected option if options exist
          if (item.options && item.options.length > 0) {
            const firstOpt = typeof item.options[0] === 'string'
              ? item.options[0]
              : item.options[0]?.values?.[0] || '';
            if (firstOpt) setSelectedOption(firstOpt);
          }

          // Increment views uniquely by IP (Exigence Utilisateur)
          zandoApi.incrementProductViews(item.id).then(res => {
            if (res.incremented && res.views_count) {
              setProduct(prev => prev ? { ...prev, views_count: res.views_count } : null);
            }
          });

          // Fetch reviews
          const itemReviews = await zandoApi.getProductReviews(item.id);
          setReviews(itemReviews);

          // Fetch similar
          const similar = await zandoApi.getProducts({
            categoryId: item.category_id,
            limit: 4
          });
          setSimilarProducts(similar.filter(s => s.id !== item.id));
        }
      } catch (e) {
        console.error('Error fetching product:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [id]);

  // Synchronisation en temps réel via Supabase Realtime pour la fiche produit et les avis
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`product-live-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'products', filter: `id=eq.${id}` },
        (payload: { new: Record<string, unknown> }) => {
          if (payload.new) {
            setProduct(prev => prev ? { ...prev, ...(payload.new as unknown as Partial<Product>) } : null);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'product_reviews', filter: `product_id=eq.${id}` },
        () => {
          zandoApi.getProductReviews(id).then(r => setReviews(r));
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 px-4 space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 aspect-4/3 bg-muted rounded-2xl" />
          <div className="lg:col-span-5 space-y-4">
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-6 bg-muted rounded w-1/3" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
        <h2 className="text-xl font-bold">Annonce introuvable ou expirée</h2>
        <p className="text-xs text-muted-foreground">
          Cette annonce n'est plus disponible ou a été retirée par son propriétaire.
        </p>
        <Button onClick={() => navigate('/')} className="rounded-full">
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  const favorited = isFavorite(product.id);
  const basePrice = Number(product.price);

  const formattedPrice = formatPrice(basePrice, product.currency);
  const originalFormatted = new Intl.NumberFormat('fr-FR').format(basePrice);

  const remainingDays = Math.max(
    1,
    Math.ceil((new Date(product.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  );

  const photos = product.photos && product.photos.length > 0
    ? product.photos
    : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80'];

  const merchantLink = product.merchant_url || product.external_url;

  const normalizedOptions: string[] = Array.isArray(product.options)
    ? product.options.flatMap(opt => {
        if (typeof opt === 'string') return [opt];
        if (opt && typeof opt === 'object' && 'values' in opt && Array.isArray((opt as any).values)) {
          return (opt as any).values;
        }
        return [];
      })
    : [];

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success('Lien de l\'annonce copié dans le presse-papiers !');
    setTimeout(() => setCopied(false), 2000);
  };

  // Requirement 5: Do NOT display seller phone in plain text on the page
  const handleCall = () => {
    zandoApi.incrementCallClicks(product.id);
    zandoApi.trackEvent({
      event_type: 'call_click',
      item_id: product.id,
      country_code: product.country_id,
      city: product.city
    });
    window.location.href = `tel:${product.seller_phone}`;
  };

  // Requirement 5: Official WhatsApp integration without public phone display
  const handleWhatsApp = () => {
    zandoApi.incrementWhatsAppClicks(product.id);
    zandoApi.trackEvent({
      event_type: 'whatsapp_click',
      item_id: product.id,
      country_code: product.country_id,
      city: product.city
    });

    const cleanNumber = product.seller_phone.replace(/[^0-9]/g, '');
    const optionText = selectedOption ? ` (Option: ${selectedOption})` : '';
    const message = encodeURIComponent(
      `Bonjour ${product.seller_name}, je vous contacte depuis Zando Africa concernant votre annonce : "${product.title}"${optionText} affichée à ${originalFormatted} ${product.currency}. Est-elle disponible ?`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const handleMerchantSiteClick = () => {
    if (merchantLink && isValidMerchantUrl(merchantLink)) {
      zandoApi.trackEvent({
        event_type: 'merchant_click',
        item_id: product.id,
        country_code: product.country_id,
        city: product.city
      });
      window.open(merchantLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDigitalPreview = async () => {
    setPreviewError(null);
    setPreviewLoading(true);
    try {
      if (!digitalBooksApi.getDigitalPreview) {
        setPreviewError('L’aperçu du livre numérique n’est pas encore disponible.');
        return;
      }
      const result = await digitalBooksApi.getDigitalPreview(product.id);
      if (result.error || !result.blobUrl) {
        setPreviewError(result.error || 'Impossible de charger l’aperçu du livre.');
        return;
      }
      setPreviewBlobUrl(result.blobUrl);
      setPreviewTotalPages(result.totalPages);
      setPreviewOpen(true);
    } catch {
      setPreviewError('Impossible de charger l’aperçu du livre pour le moment.');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Submit Review Handler (Requirement 4)
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewAuthor.trim() || !newReviewComment.trim()) {
      toast.error('Veuillez saisir votre nom et votre avis.');
      return;
    }

    setSubmittingReview(true);
    const created = await zandoApi.createProductReview({
      product_id: product.id,
      author_name: newReviewAuthor.trim(),
      rating: newReviewRating,
      comment: newReviewComment.trim()
    });

    if (created) {
      setReviews(prev => [created, ...prev]);
      toast.success('Votre avis a été publié avec succès !');
      setNewReviewAuthor('');
      setNewReviewComment('');
      setNewReviewRating(5);
      setReviewsModalOpen(false);
    } else {
      toast.error('Impossible d\'enregistrer votre avis pour le moment.');
    }
    setSubmittingReview(false);
  };

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 space-y-8">
      {/* Top Breadcrumb & Back button */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Retour aux annonces</span>
        </button>

        {/* Reviews Quick Trigger Button (Requirement 4) */}
        <button
          type="button"
          onClick={() => setReviewsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-bold transition-colors cursor-pointer"
        >
          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
          <span>Avis ({reviews.length})</span>
        </button>
      </div>

      {/* Main product layout matching Image 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Visuals & Media (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Media Switcher Tab (if video exists) */}
          {product.video_url && (
            <div className="flex items-center gap-2 p-1 rounded-xl bg-muted w-fit text-xs font-bold">
              <button
                type="button"
                onClick={() => setMediaTab('photos')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  mediaTab === 'photos' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Photos ({photos.length})
              </button>
              <button
                type="button"
                onClick={() => setMediaTab('video')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  mediaTab === 'video' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Play className="w-3.5 h-3.5 text-primary fill-primary" />
                <span>Vidéo du produit</span>
              </button>
            </div>
          )}

          {/* Main Visual Frame avec support du Swipe tactile (Étape 7) */}
          <div
            onTouchStart={handleGalleryTouchStart}
            onTouchEnd={handleGalleryTouchEnd}
            className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-black/5 border border-border shadow-sm group select-none"
          >
            {mediaTab === 'video' && product.video_url ? (
              <video
                src={product.video_url}
                controls
                autoPlay
                className="w-full h-full object-contain bg-black"
              />
            ) : (
              <img
                src={photos[activePhotoIndex]}
                alt={product.title}
                className="w-full h-full object-cover transition-all duration-300 pointer-events-none"
              />
            )}

            {/* Boutons de navigation manuelle précédente / suivante (visibles ou au survol) */}
            {photos.length > 1 && mediaTab === 'photos' && (
              <>
                <button
                  type="button"
                  onClick={() => setActivePhotoIndex(prev => (prev === 0 ? photos.length - 1 : prev - 1))}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs shadow-md z-10 active:scale-95"
                  aria-label="Photo précédente"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActivePhotoIndex(prev => (prev + 1) % photos.length)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-xs shadow-md z-10 active:scale-95"
                  aria-label="Photo suivante"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Indicateur de position (ex: 1 / 4) */}
                <div className="absolute top-3 right-3 z-10">
                  <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs text-white text-[11px] font-bold shadow-xs">
                    {activePhotoIndex + 1} / {photos.length}
                  </span>
                </div>
              </>
            )}

            {/* Badges Overlay */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 text-xs text-white z-10">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>{remainingDays} jours restants</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-xs font-medium">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                <span>{product.views_count} vues</span>
              </span>
            </div>
          </div>

          {/* Thumbnails Row */}
          {photos.length > 1 && mediaTab === 'photos' && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {photos.map((img, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    activePhotoIndex === idx ? 'border-primary ring-2 ring-primary/30' : 'border-border/80 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Miniature ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information, Pricing, Seller & Actions matching Image 1 */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-5">
            
            {/* Country and location header matching Image 1 */}
            <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 font-bold text-foreground text-sm">
                  <CountryFlag countryId={product.countries?.id || product.country_id} className="h-[18px] w-[27px]" />
                  <span>{product.countries?.name || 'Congo-Brazzaville'} • {product.city || 'Brazzaville'}</span>
                </div>
                {(!selectedCountry || product.country_id === selectedCountry.id) ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 shadow-2xs">
                    <span>📍 Produit Local</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[11px] font-bold border border-blue-300 dark:border-blue-800 flex items-center gap-1 shadow-2xs">
                    <span>🌍 Produit de l'Étranger</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  title="Partager l'annonce"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => toggleFavorite(product.id)}
                  className={`p-2 rounded-full hover:bg-muted transition-colors cursor-pointer ${
                    favorited ? 'text-rose-600 fill-rose-600' : 'text-muted-foreground'
                  }`}
                  title="Favoris"
                >
                  <Heart className={`w-4 h-4 ${favorited ? 'fill-rose-600' : ''}`} />
                </button>
              </div>
            </div>

            {/* Product Title in uppercase bold matching Image 1 */}
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight uppercase leading-snug">
              {product.title}
            </h1>

            {/* Price matching Image 1 (Bold red) */}
            <div className="space-y-3">
              <div className="text-3xl sm:text-4xl font-black text-red-600 tracking-tight">
                {formattedPrice}
              </div>

              {/* Currency Selector matching Image 1: FCFA, CDF, EUR, USD */}
              <div className="flex items-center gap-2 text-xs font-semibold">
                <span className="text-muted-foreground">⇄ Devise affichée :</span>
                <div className="flex items-center gap-1.5">
                  {['FCFA', 'CDF', 'EUR', 'USD'].map(cur => (
                    <button
                      key={cur}
                      type="button"
                      onClick={() => setSelectedCurrency(cur)}
                      className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        selectedCurrency === cur
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      }`}
                    >
                      {cur}
                    </button>
                  ))}
                </div>
              </div>

              {/* Invoiced Currency warning matching Image 1 */}
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200">
                <div className="font-bold flex items-center gap-1">
                  <span>⚠️ Devise facturée par le vendeur :</span>
                  <span className="font-black text-amber-700 dark:text-amber-300">
                    {originalFormatted} {product.currency}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Prix direct vendeur • Aucun frais d'intermédiaire
                </div>
              </div>
            </div>

            {/* Product Dimensions & Options / Variants (Requirement 4) */}
            {(product.dimensions || (product.options && product.options.length > 0)) && (
              <div className="p-4 rounded-xl border border-border/80 bg-muted/30 space-y-3">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Ruler className="w-3.5 h-3.5 text-primary" />
                  <span>Caractéristiques & Dimensions</span>
                </h3>

                {product.dimensions && (
                  <div className="text-xs text-foreground/90 flex items-start gap-2">
                    <span className="font-bold text-muted-foreground">Dimensions :</span>
                    <span>{product.dimensions}</span>
                  </div>
                )}

                {normalizedOptions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-bold text-muted-foreground block">
                      Options / Variantes au choix :
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {normalizedOptions.map((opt, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedOption(opt)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            selectedOption === opt
                              ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                              : 'border-border bg-card text-foreground hover:bg-muted'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            <div className="space-y-2 border-t pt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Description du produit
              </h3>
              <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                {product.description || 'Aucune description détaillée fournie.'}
              </p>
            </div>

            {/* 1. Seller Card with Seller Name (Requirement 3: Step 1) */}
            <div className="rounded-2xl border-2 border-border/80 p-4 bg-card flex items-center gap-3.5 shadow-xs">
              <div className="relative w-14 h-14 rounded-full overflow-hidden border-2 border-primary/20 bg-primary/5 flex items-center justify-center shrink-0">
                {product.seller_avatar || product.seller_photo_url ? (
                  <img
                    src={(product.seller_avatar || product.seller_photo_url) ?? ''}
                    alt={product.seller_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7 text-primary" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm sm:text-base text-foreground truncate">
                  {product.seller_name || 'Vendeur Zando vérifié'}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {product.city || 'Brazzaville'}, {product.countries?.name || 'Congo-Brazzaville'}
                </div>
                <div className="inline-flex items-center gap-1 text-[10px] sm:text-xs text-emerald-700 dark:text-emerald-300 font-bold mt-1 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 max-w-full">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  <span className="break-words leading-tight">Vendeur certifié ZandoAfrica</span>
                </div>
              </div>
            </div>

            {/* 2. Transparence du parcours digital. */}
            {product.category_id === 'digital-products' ? (
              <div className="p-4 rounded-2xl border-2 border-primary/30 bg-primary/5 text-foreground space-y-2 shadow-xs">
                <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-primary">
                  <BookOpen className="w-5 h-5 shrink-0" />
                  <span className="uppercase tracking-wide">Aperçu gratuit et achat externe</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-muted-foreground">
                  Consultez gratuitement les 10 premières pages. ZandoAfrica ne vend pas ce livre, n’encaisse pas son prix et ne fournit pas le PDF complet. L’achat s’effectue uniquement sur le site marchand du vendeur.
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border-2 border-amber-600/50 bg-amber-500/10 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 space-y-2 shadow-xs">
                <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-amber-900 dark:text-amber-200">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <span className="uppercase tracking-wide">Avertissement de sécurité Zando</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-amber-950/90 dark:text-amber-100/90">
                  Ne versez <strong>JAMAIS d'argent d'avance</strong> (Mobile Money, Airtel Money, Orange Money ou virement) avant d'avoir vu le produit et vérifié l'identité du vendeur en personne. Privilégiez toujours la remise en main propre dans un endroit public.
                </p>
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="space-y-3 pt-1">
              {product.category_id === 'digital-products' ? (
                <div className="space-y-3">
                  <PaymentLogosMarquee />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleDigitalPreview()}
                    disabled={previewLoading}
                    className="w-full h-11 rounded-2xl font-bold text-sm gap-2 cursor-pointer"
                  >
                    {previewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                    <span>{previewLoading ? 'Chargement de l’aperçu...' : 'Consulter l’aperçu gratuit'}</span>
                  </Button>
                  {previewError && <p className="text-xs text-rose-600 dark:text-rose-400 text-center">{previewError}</p>}
                  {isValidMerchantUrl(merchantLink || '') ? (
                    <Button type="button" onClick={handleMerchantSiteClick} className="w-full h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm sm:text-base gap-2 shadow-md cursor-pointer">
                      <ShoppingBag className="w-5 h-5 shrink-0" />
                      <span className="truncate">Acheter vers le site marchand</span>
                      <ExternalLink className="w-4 h-4 ml-1 shrink-0" />
                    </Button>
                  ) : (
                    <p className="text-xs text-rose-600 dark:text-rose-400 text-center">Le lien marchand de cette annonce est indisponible.</p>
                  )}
                </div>
              ) : merchantLink && (
                <div className="space-y-1">
                  <Button
                    onClick={handleMerchantSiteClick}
                    className="w-full h-12 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm sm:text-base gap-2 shadow-md cursor-pointer transition-transform active:scale-98"
                  >
                    <ShoppingBag className="w-5 h-5 shrink-0" />
                    <span className="truncate">Acheter sur le site marchand</span>
                    <ExternalLink className="w-4 h-4 ml-1 shrink-0" />
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground font-medium">
                    Redirection vers le site officiel du vendeur
                  </p>
                </div>
              )}

              {/* 2. Bouton "Appeler maintenant" (Requirement 5: NO plain text phone display) */}
              <Button
                onClick={handleCall}
                className="w-full h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base gap-2 shadow-md cursor-pointer transition-transform active:scale-98"
              >
                <Phone className="w-5 h-5" />
                <span>Appeler maintenant</span>
              </Button>

              {/* 3. Bouton "Discussion" sur WhatsApp (Requirement 5: Official WhatsApp Logo & NO plain phone) */}
              <Button
                onClick={handleWhatsApp}
                className="w-full h-12 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm sm:text-base gap-2 shadow-md cursor-pointer transition-transform active:scale-98"
              >
                <WhatsAppIcon className="w-5 h-5 fill-white" />
                <span>Discussion WhatsApp</span>
              </Button>
            </div>

            {/* Avis Reviews Button & Rating Overview (Requirement 4 & Étape 3) */}
            <div className="pt-2 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <div className="flex items-center text-amber-500 shrink-0">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className="w-4 h-4 fill-amber-500" />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-foreground">
                    {averageRating} / 5 ({reviews.length} avis)
                  </span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReviewsModalOpen(true)}
                  className="rounded-full text-xs font-bold gap-1.5 border-primary/30 text-primary hover:bg-primary/5 h-auto py-2 px-3.5 max-w-full whitespace-normal text-center shrink-0 cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="leading-tight">Voir & donner un avis</span>
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Similar products section */}
      {similarProducts.length > 0 && (
        <section className="space-y-4 pt-8 border-t">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">
            Annonces similaires dans cette catégorie
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {similarProducts.map(item => (
              <div
                key={item.id}
                onClick={() => navigate(`/produit/${item.id}`)}
                className="bg-card rounded-2xl border p-3 flex flex-col justify-between gap-3 cursor-pointer hover:shadow-md transition-shadow group"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-muted">
                  <img
                    src={item.photos?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300'}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-foreground line-clamp-1">{item.title}</h4>
                  <p className="text-[11px] text-muted-foreground">{item.city}</p>
                  <div className="text-sm font-extrabold text-red-600 mt-1">
                    {new Intl.NumberFormat('fr-FR').format(item.price)} {item.currency}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-4xl p-3 sm:p-5 bg-card border shadow-2xl rounded-2xl">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <span>Aperçu du livre</span>
            </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                      {previewTotalPages ? `Ce livre contient ${previewTotalPages} page${previewTotalPages > 1 ? 's' : ''}. Seules les ${Math.min(10, previewTotalPages)} première${Math.min(10, previewTotalPages) > 1 ? 's' : ''} page${Math.min(10, previewTotalPages) > 1 ? 's' : ''} sont consultables gratuitement.` : 'Seules les dix premières pages du livre sont consultables gratuitement.'}
                    </DialogDescription>
          </DialogHeader>
          {previewBlobUrl && <PdfPreviewReader blobUrl={previewBlobUrl} maxPages={MAX_PREVIEW_PAGES} />}
        </DialogContent>
      </Dialog>

      {/* Reviews Modal (Requirement 4) */}
      <Dialog open={reviewsModalOpen} onOpenChange={setReviewsModalOpen}>
        <DialogContent className="max-w-[calc(100%-2rem)] md:max-w-lg p-6 bg-card border shadow-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              <span>Avis clients sur ce produit</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Consultez les retours d'expérience et partagez le vôtre en toute sincérité.
            </DialogDescription>
          </DialogHeader>

          {/* Post a Review Form */}
          <form onSubmit={handleReviewSubmit} className="space-y-4 pt-3 border-t">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-primary" />
              <span>Déposer un avis</span>
            </h4>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Votre Nom / Pseudo *</label>
              <Input
                placeholder="Ex. : Patrick M., Grace K."
                value={newReviewAuthor}
                onChange={e => setNewReviewAuthor(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Note sur 5 étoiles *</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewReviewRating(star)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        newReviewRating >= star
                          ? 'fill-amber-500 text-amber-500'
                          : 'text-muted-foreground/40'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-amber-600 ml-2">
                  {newReviewRating} / 5
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Votre commentaire *</label>
              <Textarea
                placeholder="Détaillez votre expérience avec ce produit ou vendeur..."
                value={newReviewComment}
                onChange={e => setNewReviewComment(e.target.value)}
                required
                rows={3}
                className="text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={submittingReview}
              className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
            >
              {submittingReview ? 'Publication en cours...' : 'Publier mon avis'}
            </Button>
          </form>

          {/* List of existing reviews */}
          <div className="space-y-3 pt-4 border-t">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Tous les avis ({reviews.length})
            </h4>

            {reviews.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucun avis pour l'instant. Soyez le premier à donner votre avis !
              </p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {reviews.map(rev => (
                  <div key={rev.id} className="p-3 rounded-xl bg-muted/40 border text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{rev.author_name}</span>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-500' : 'text-muted-foreground/30'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{rev.comment}</p>
                    <span className="text-[10px] text-muted-foreground/70 block">
                      {new Date(rev.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
