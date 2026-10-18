import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZando } from '@/contexts/ZandoContext';
import { zandoApi } from '@/services/zandoApi';
import type { Country, Category, Product } from '@/types/zando';
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  Clock,
  KeyRound,
  CreditCard,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CountrySelect } from '@/components/common/CountrySelect';

export const PublishProductPage: React.FC = () => {
  const { countries, categories, selectedCountry, settings } = useZando();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [publishedId, setPublishedId] = useState<string | null>(null);
  const [publicationStatus, setPublicationStatus] = useState<Product['status'] | null>(null);

  // Form State
  // Step 1: Info
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || 'telephones-tablettes');
  const [price, setPrice] = useState<number | ''>('');
  const [currency, setCurrency] = useState(selectedCountry?.currency || 'XAF');
  const [countryId, setCountryId] = useState(selectedCountry?.id || 'CG');
  const [city, setCity] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [dialCode, setDialCode] = useState(selectedCountry?.dial_code || '+242');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  // Step 2: Media & Profil Vendeur
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [sellerPhotoUrl, setSellerPhotoUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Step 3: Billing & Duration & Promo Code
  const [selectedDurationDays, setSelectedDurationDays] = useState(30);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoCodeValid, setPromoCodeValid] = useState<boolean | null>(null);
  const [promoErrorMessage, setPromoErrorMessage] = useState('');

  // Update dial code when country changes
  useEffect(() => {
    const c = countries.find(item => item.id === countryId);
    if (c) {
      setDialCode(c.dial_code);
      setCurrency(c.currency);
    }
  }, [countryId, countries]);

  // Pricing calculations
  const defaultDurationOptions = [
    { days: 30, price: 1000, currency: 'FCFA', label: '1 mois' },
    { days: 60, price: 2000, currency: 'FCFA', label: '2 mois' },
    { days: 90, price: 3000, currency: 'FCFA', label: '3 mois' }
  ];
  const configuredDurationOptions = settings.pricing_durations?.filter(option => [30, 60, 90].includes(option.days)) || [];
  const durationOptions = configuredDurationOptions.length ? configuredDurationOptions : defaultDurationOptions;

  const currentDurationConfig = durationOptions.find(d => d.days === selectedDurationDays) || durationOptions[0];
  const selectedDurationLabel = currentDurationConfig?.label || `${Math.round(selectedDurationDays / 30)} mois`;
  const isFreeMode = settings.site_mode?.mode === 'free';
  const effectivePrice = isFreeMode || promoCodeValid ? 0 : currentDurationConfig.price;

  // Full normalized phone
  const fullPhone = `${dialCode}${phoneNumber.trim().replace(/^0+/, '')}`;

  // Image Upload handler
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).slice(0, 4 - photoUrls.length);
    if (files.length === 0) return;

    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];

    for (const file of files) {
      const url = await zandoApi.uploadMedia(file, 'products');
      if (url) {
        uploadedUrls.push(url);
      } else {
        toast.error(`Impossible de téléverser ${file.name}. Vérifiez la connexion au stockage puis réessayez.`);
      }
    }

    setPhotoUrls(prev => [...prev, ...uploadedUrls].slice(0, 4));
    setUploadingPhotos(false);
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Video Upload directly from gallery (Requirement 3)
  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingVideo(true);
    toast.info('Chargement de la vidéo depuis votre galerie...');

    const url = await zandoApi.uploadMedia(file, 'videos');
    if (url) {
      setVideoUrl(url);
      toast.success('Vidéo ajoutée avec succès !');
    } else {
      toast.error('La vidéo n’a pas été téléversée. Réessayez avant de continuer.');
    }
    setUploadingVideo(false);
  };

  // Seller Profile Photo Upload (Requirement 3)
  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setUploadingAvatar(true);
    toast.info('Chargement de votre photo de profil...');

    const url = await zandoApi.uploadMedia(file, 'avatars');
    if (url) {
      setSellerPhotoUrl(url);
      toast.success('Photo de profil vendeur mise à jour !');
    } else {
      toast.error('La photo de profil n’a pas été téléversée. Réessayez avant de continuer.');
    }
    setUploadingAvatar(false);
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!title.trim()) {
      toast.error('Veuillez renseigner le nom du produit.');
      return false;
    }
    if (price === '' || Number(price) <= 0) {
      toast.error('Veuillez renseigner un prix valide supérieur à 0.');
      return false;
    }
    if (!city.trim()) {
      toast.error('Veuillez renseigner la ville.');
      return false;
    }
    if (!sellerName.trim()) {
      toast.error('Veuillez renseigner le nom du vendeur.');
      return false;
    }
    if (!phoneNumber.trim() || phoneNumber.length < 6) {
      toast.error('Veuillez renseigner un numéro WhatsApp valide.');
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (photoUrls.length === 0) {
      toast.error('Veuillez ajouter au moins une photo du produit.');
      return false;
    }
    return true;
  };

  // Promo Code Verification
  const handleVerifyPromoCode = async () => {
    if (!promoCodeInput.trim()) {
      toast.error('Veuillez saisir un code promo.');
      return;
    }

    const res = await zandoApi.verifyPromoCode(promoCodeInput, fullPhone);
    if (res.valid) {
      setPromoCodeValid(true);
      setPromoErrorMessage('');
      toast.success('Code promotionnel validé avec succès ! Frais de publication offerts.');
    } else {
      setPromoCodeValid(false);
      setPromoErrorMessage(res.reason || 'Code promo invalide.');
      toast.error(res.reason || 'Code promo invalide.');
    }
  };

  // Final Publish Handler
  const handleFinalPublish = async () => {
    setSubmitting(true);
    try {
      // Les champs historiques dimensions/options restent en base pour les annonces existantes;
      // le nouveau formulaire ne les demande plus.
      const res = await zandoApi.createProduct({
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        currency,
        category_id: categoryId,
        country_id: countryId,
        city: city.trim(),
        seller_name: sellerName.trim(),
        seller_phone: fullPhone,
        seller_photo_url: sellerPhotoUrl || null,
        seller_avatar: sellerPhotoUrl || null,
        external_url: externalUrl.trim() || null,
        merchant_url: externalUrl.trim() || null,
        photos: photoUrls,
        video_url: videoUrl.trim() || null,
        duration_days: selectedDurationDays,
        promo_code_used: promoCodeValid ? promoCodeInput.trim() : null
      });

      if (res.success && res.data) {
        setPublishedId(res.data.id);
        setPublicationStatus(res.data.status);

        // Log track event
        zandoApi.trackEvent({
          event_type: 'post_ad_complete',
          item_id: res.data.id,
          country_code: countryId,
          city: city.trim()
        });

        setCurrentStep(4);
        if (res.data.status === 'published') {
          toast.success('Votre annonce est publiée.');
        } else {
          toast.info('Votre demande est enregistrée et sera publiée après confirmation du paiement.');
        }
      } else {
        toast.error(`Erreur lors de la publication : ${res.error || 'Erreur inconnue'}`);
      }
    } catch (e) {
      console.error(e);
      toast.error('Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* Stepper Header matching Image 4 */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground text-center mb-2">
          Publier un produit
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-md mx-auto mb-6">
          Vendez rapidement votre article à des milliers d'acheteurs en quelques minutes.
        </p>

        {/* 4 Steps Indicator */}
        <div className="flex items-center justify-between relative max-w-xl mx-auto">
          {[
            { num: 1, label: 'Informations' },
            { num: 2, label: 'Photos' },
            { num: 3, label: 'Paiement' },
            { num: 4, label: 'Confirmation' }
          ].map(s => {
            const isDone = currentStep > s.num;
            const isCurrent = currentStep === s.num;

            return (
              <div key={s.num} className="flex flex-col items-center z-10">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors ${
                    isDone
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                      ? 'bg-accent text-accent-foreground ring-4 ring-accent/20'
                      : 'bg-muted text-muted-foreground border border-border'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.num}
                </div>
                <span className={`text-[11px] font-semibold mt-1.5 ${isCurrent ? 'text-accent' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
          {/* Connector line */}
          <div className="absolute top-4.5 left-6 right-6 h-0.5 bg-border -z-0" />
        </div>
      </div>

      {/* Step Container Card */}
      <div className="bg-card rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
        {/* STEP 1: INFORMATIONS */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-foreground border-b pb-3">
              1. Informations sur le produit
            </h2>

            {/* Titre */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Nom du produit *</label>
              <Input
                placeholder="Ex. : iPhone 15 Pro, Chaussures Nike, Toyota RAV4..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Catégorie */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Catégorie *</label>
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Prix & Devise */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Prix de vente *</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={price}
                  onChange={e => setPrice(e.target.value ? Number(e.target.value) : '')}
                  className="h-11 rounded-xl font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Devise *</label>
                <Input
                  value={currency}
                  readOnly
                  className="h-11 rounded-xl bg-muted font-bold text-muted-foreground"
                />
              </div>
            </div>

            {/* Pays & Ville */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Pays *</label>
                <CountrySelect
                  countries={countries}
                  value={countryId}
                  onValueChange={setCountryId}
                  aria-label="Pays de l’annonce"
                  className="w-full h-11 rounded-xl bg-background text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Ville de localisation *</label>
                <Input
                  placeholder="Ex. : Brazzaville, Pointe-Noire, Kinshasa, Abidjan..."
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            {/* Vendeur & Numéro WhatsApp */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Votre nom / Nom de la boutique *</label>
                <Input
                  placeholder="Ex. : Idriss M. / Tech Store"
                  value={sellerName}
                  onChange={e => setSellerName(e.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Numéro WhatsApp *</label>
                <div className="flex gap-2">
                  <span className="inline-flex items-center px-3 rounded-xl bg-muted border border-border text-xs font-bold text-muted-foreground">
                    {dialCode}
                  </span>
                  <Input
                    placeholder="Ex. : 06 123 4567"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    className="h-11 rounded-xl flex-1"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Les acheteurs cliqueront directement sur ce numéro pour vous contacter sur WhatsApp.
                </p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Description de l'article</label>
              <Textarea
                placeholder="État de l'article, caractéristiques techniques, accessoires inclus, conditions..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="rounded-xl"
              />
            </div>

            {/* Lien vers le site marchand (Requirement 3) */}
            <div className="space-y-1.5 border-t pt-4">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Lien vers votre site marchand (Boutique en ligne)</span>
                <span className="text-[11px] text-primary font-normal">Active le bouton marchand</span>
              </label>
              <Input
                placeholder="https://maboutique.com/produit/123"
                value={externalUrl}
                onChange={e => setExternalUrl(e.target.value)}
                className="h-11 rounded-xl"
              />
              <p className="text-[11px] text-muted-foreground">
                Si renseigné, un bouton « Acheter sur le site marchand » apparaîtra directement sur la fiche produit pour rediriger l'acheteur vers votre site.
              </p>
            </div>

            {/* Next Button */}
            <div className="pt-4 flex justify-end">
              <Button
                onClick={() => {
                  if (validateStep1()) setCurrentStep(2);
                }}
                className="h-11 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 cursor-pointer shadow-xs"
              >
                <span>Continuer vers les photos</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: PHOTOS & MÉDIAS & PROFIL */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground border-b pb-3">
              2. Photos, Vidéo & Profil Vendeur
            </h2>

            {/* Photo de profil du vendeur (Requirement 3) */}
            <div className="p-4 rounded-xl border-2 border-primary/20 bg-primary/5 space-y-3">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Photo de profil du vendeur * (Pour identification des acheteurs)</span>
                <span className="text-[10px] text-primary font-semibold">Recommandé</span>
              </label>

              <div className="flex items-center gap-4">
                {sellerPhotoUrl ? (
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary shadow-xs">
                    <img src={sellerPhotoUrl} alt="Profil vendeur" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setSellerPhotoUrl('')}
                      className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                      title="Changer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center text-muted-foreground">
                    <Upload className="w-5 h-5" />
                  </div>
                )}

                <div className="flex-1">
                  <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border hover:bg-muted text-xs font-bold cursor-pointer transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    <span>Choisir ma photo de profil</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                      disabled={uploadingAvatar}
                    />
                  </label>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Permet aux acheteurs de reconnaître votre boutique ou visage pour plus de confiance.
                  </p>
                  {uploadingAvatar && <p className="text-[11px] text-primary font-semibold animate-pulse">Téléversement de la photo de profil...</p>}
                </div>
              </div>
            </div>

            {/* Photo Uploader */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground">Photos du produit (1 à 4 photos) *</label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {photoUrls.map((url, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-border group bg-muted">
                    <img src={url} alt={`Aperçu ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                      title="Supprimer la photo"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {i === 0 && (
                      <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-primary-foreground">
                        Photo principale
                      </span>
                    )}
                  </div>
                ))}

                {photoUrls.length < 4 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors bg-muted/20 hover:bg-primary/5">
                    <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs font-semibold text-foreground">Ajouter photo</span>
                    <span className="text-[10px] text-muted-foreground">Depuis la galerie</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoSelect}
                      className="hidden"
                      disabled={uploadingPhotos}
                    />
                  </label>
                )}
              </div>
              {uploadingPhotos && <p className="text-xs text-primary font-medium animate-pulse">Téléversement des photos en cours...</p>}
            </div>

            {/* Video selector directly from device gallery (Requirement 3) */}
            <div className="space-y-2 border-t pt-4">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Vidéo du produit (depuis la galerie de votre appareil)</span>
                <span className="text-[10px] text-muted-foreground">Facultatif</span>
              </label>

              {videoUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-border bg-black max-w-md">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full aspect-video object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setVideoUrl('')}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                    title="Supprimer la vidéo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-border hover:border-primary bg-muted/10 hover:bg-primary/5 cursor-pointer transition-colors">
                  <Upload className="w-8 h-8 text-primary mb-2" />
                  <span className="text-xs sm:text-sm font-bold text-foreground">
                    Sélectionner une vidéo depuis la galerie
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5">
                    Format MP4, MOV, WebM (Sélection directe sans obligation de lien externe)
                  </span>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    className="hidden"
                    disabled={uploadingVideo}
                  />
                </label>
              )}
              {uploadingVideo && <p className="text-xs text-primary font-medium animate-pulse">Chargement de la vidéo...</p>}
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 flex items-center justify-between border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="h-11 px-6 rounded-full font-semibold gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Retour</span>
              </Button>

              <Button
                onClick={() => {
                  if (validateStep2()) setCurrentStep(3);
                }}
                className="h-11 px-8 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-2 cursor-pointer shadow-xs"
              >
                <span>Choisir la durée & tarif</span>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: DURÉE, CODE PROMO & PAIEMENT */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-foreground border-b pb-3">
              3. Durée de publication & Modalités
            </h2>

            {/* Durées disponibles matching Image 4 */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-foreground">Durée de publication *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {durationOptions.map(opt => {
                  const isSelected = selectedDurationDays === opt.days;
                  return (
                    <div
                      key={opt.days}
                      onClick={() => setSelectedDurationDays(opt.days)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-xs'
                          : 'border-border bg-card hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{opt.label || `${Math.round(opt.days / 30)} mois`}</span>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-primary bg-primary text-white' : 'border-muted-foreground'}`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                      <div className="text-base font-extrabold text-primary mt-3">
                        {isFreeMode ? '0 FCFA (Gratuit)' : `${new Intl.NumberFormat('fr-FR').format(opt.price)} FCFA`}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Code Promo Input Section matching Image 4 */}
            <div className="bg-muted/40 p-4 rounded-xl border border-border/80 space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-500" />
                <label className="text-xs font-bold text-foreground">Code promo vendeur (facultatif)</label>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Saisissez votre code promo..."
                  value={promoCodeInput}
                  onChange={e => {
                    setPromoCodeInput(e.target.value.toUpperCase());
                    setPromoCodeValid(null);
                  }}
                  className="h-11 rounded-xl uppercase font-mono font-bold"
                />
                <Button
                  type="button"
                  onClick={handleVerifyPromoCode}
                  className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer"
                >
                  Vérifier
                </Button>
              </div>

              {promoCodeValid === true && (
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Code valide ! Publication gratuite autorisée pour le numéro <strong>{fullPhone}</strong>.</span>
                </div>
              )}

              {promoCodeValid === false && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{promoErrorMessage}</span>
                </div>
              )}

              <p className="text-[11px] text-muted-foreground">
                Astuce : Vous recevez un code promo gratuit lors de votre souscription à un abonnement vendeur.
              </p>
            </div>

            {/* Total recap & payment options */}
            <div className="p-5 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Durée choisie :</span>
                <span className="font-bold text-foreground">{selectedDurationLabel}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mode de la plateforme :</span>
                <span className="font-bold text-foreground">
                  {isFreeMode ? 'Mode Gratuit activé' : 'Mode Payant standard'}
                </span>
              </div>
              <div className="border-t pt-3 flex items-center justify-between text-base">
                <span className="font-bold text-foreground">Total à régler :</span>
                <span className="text-xl font-extrabold text-primary">
                  {effectivePrice === 0 ? 'GRATUIT (0 FCFA)' : `${effectivePrice} FCFA`}
                </span>
              </div>

              {effectivePrice > 0 && (
                <div className="flex items-start gap-2 pt-3 border-t text-xs text-amber-800 bg-amber-50 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>Le paiement en ligne n’est pas encore connecté. Votre demande sera enregistrée comme « en attente » ; aucun paiement ne sera prélevé et l’annonce ne sera visible qu’après validation.</p>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-4 flex items-center justify-between border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="h-11 px-6 rounded-full font-semibold gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Retour</span>
              </Button>

              <Button
                onClick={handleFinalPublish}
                disabled={submitting}
                className="h-12 px-8 rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold gap-2 cursor-pointer shadow-md text-sm sm:text-base active:scale-95"
              >
                <CreditCard className="w-4 h-4" />
                <span>{submitting ? 'Enregistrement...' : effectivePrice === 0 ? 'Publier gratuitement' : 'Envoyer la demande'}</span>
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRMATION */}
        {currentStep === 4 && (
          <div className="py-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-foreground">
                {publicationStatus === 'published' ? 'Votre annonce est en ligne' : 'Votre demande a été enregistrée'}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                {publicationStatus === 'published'
                  ? `Votre annonce « ${title} » est publiée sur Zando Africa. Les acheteurs peuvent désormais vous contacter directement.`
                  : `Votre annonce « ${title} » est en attente de confirmation du paiement. Aucun paiement n’a été prélevé et l’annonce n’est pas encore visible.`}
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              {publishedId && publicationStatus === 'published' && (
                <Button
                  onClick={() => navigate(`/produit/${publishedId}`)}
                  className="w-full sm:w-auto h-11 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  Voir mon annonce
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full sm:w-auto h-11 rounded-full font-semibold"
              >
                Retour à l'accueil
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
