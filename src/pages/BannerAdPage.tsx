import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZando } from '@/contexts/ZandoContext';
import { zandoApi } from '@/services/zandoApi';
import {
  Megaphone,
  Upload,
  CheckCircle2,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createMonerooPayment } from '@/services/monerooPayments';

export const BannerAdPage: React.FC = () => {
  const { settings, formatPrice } = useZando();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<'active' | 'pending_payment' | null>(null);
  const [adId, setAdId] = useState<string | null>(null);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const adPricing = settings.ad_pricing || [
    { months: 1, price: 30000, currency: 'FCFA', name: 'Bannière VIP 1 Mois' },
    { months: 2, price: 55000, currency: 'FCFA', name: 'Bannière VIP 2 Mois' },
    { months: 3, price: 75000, currency: 'FCFA', name: 'Bannière VIP 3 Mois' }
  ];

  const currentPlan = adPricing.find(p => p.months === durationMonths) || adPricing[0];
  const isFreeMode = settings.site_mode?.mode === 'free';

  const startBannerPayment = async (itemId: string) => {
    const names = contactName.trim().split(/\s+/);
    const payment = await createMonerooPayment({
      serviceType: 'banner_ad',
      itemId,
      customer: {
        first_name: names[0] || 'Client',
        last_name: names.slice(1).join(' ') || '-',
        email: contactEmail.trim(),
        phone: phoneNumber.trim(),
      },
    });
    if (payment.data?.checkout_url) {
      window.location.assign(payment.data.checkout_url);
      return;
    }
    if (payment.data?.reference) {
      navigate(`/paiement/resultat?reference=${encodeURIComponent(payment.data.reference)}`);
      return;
    }
    toast.error(payment.error || 'Le paiement est indisponible. Votre campagne reste en attente et invisible.');
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    setUploadingImage(true);
    const result = await zandoApi.uploadMedia(e.target.files[0], 'banners');
    if (result.url) {
      setImageUrl(result.url);
      toast.success('Bannière téléversée avec succès !');
    } else {
      setImageUrl('');
      toast.error(result.error || 'La bannière n’a pas été téléversée. Réessayez avant de continuer.');
    }
    setUploadingImage(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Veuillez renseigner le titre de la publicité.');
      return;
    }
    if (!imageUrl) {
      toast.error('Veuillez téléverser une image de bannière.');
      return;
    }
    if (!phoneNumber.trim()) {
      toast.error('Veuillez renseigner un numéro de téléphone.');
      return;
    }
    if (!isFreeMode && currentPlan.price > 0 && (!contactName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim()))) {
      toast.error('Veuillez renseigner votre nom et une adresse e-mail valide pour le reçu.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await zandoApi.createBannerAd({
        title: title.trim(),
        description: description.trim(),
        image_url: imageUrl,
        target_url: targetUrl.trim() || null,
        phone_number: phoneNumber.trim(),
        duration_months: durationMonths,
        price: currentPlan.price,
        currency: 'FCFA'
      });

      if (res.success && res.data) {
        setAdId(res.data.id);
        const status = res.data.status === 'active' ? 'active' : 'pending_payment';
        setSubmissionStatus(status);
        if (status === 'active') {
          toast.success('Campagne enregistrée.');
        } else {
          toast.info('Votre campagne est enregistrée. Redirection vers Moneroo.');
          await startBannerPayment(res.data.id);
        }
      } else {
        toast.error(`Erreur : ${res.error || 'Impossible de créer la campagne'}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submissionStatus) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-extrabold text-foreground">
          {submissionStatus === 'active' ? 'Campagne publicitaire active' : 'Demande de publicité reçue'}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          {submissionStatus === 'active'
            ? `Votre bannière « ${title} » est active pour ${durationMonths} mois.`
            : `Votre bannière « ${title} » restera invisible jusqu’à confirmation du paiement par Moneroo.`}
        </p>
        <div className="pt-4 flex justify-center gap-3">
          {submissionStatus === 'pending_payment' && adId && (
            <Button onClick={() => void startBannerPayment(adId)} className="rounded-full bg-blue-600 font-bold">
              Régler maintenant
            </Button>
          )}
          <Button onClick={() => navigate('/')} className="rounded-full bg-primary font-bold">
            Voir sur la page d'accueil
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Retour</span>
      </button>

      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase">
          <Megaphone className="w-3.5 h-3.5" />
          <span>Espace Publicitaire VIP</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
          Passer une publicité VIP
        </h1>
        <p className="text-xs text-muted-foreground">
          Positionnez votre entreprise, vos services ou vos produits phares au premier plan de Zando Africa avec plus de 50 000 visites quotidiennes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Titre */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Titre de la publicité *</label>
          <Input
            placeholder="Ex. : Promo Exceptionnelle Boutique Abidjan..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="h-11 rounded-xl"
            required
          />
        </div>

        {/* Upload de l'image de bannière */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-foreground">Image de la bannière (Format paysage recommandé) *</label>
          {imageUrl ? (
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-muted">
              <img src={imageUrl} alt="Bannière" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => setImageUrl('')}
                className="absolute top-2 right-2 px-3 py-1 rounded-full bg-black/70 text-white text-xs font-semibold"
              >
                Changer l'image
              </button>
            </div>
          ) : (
            <label className="aspect-video rounded-xl border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center p-6 text-center cursor-pointer bg-muted/20 hover:bg-primary/5 transition-colors">
              <Upload className="w-8 h-8 text-muted-foreground mb-2" />
              <span className="text-sm font-semibold text-foreground">Téléverser l'affiche publicitaire</span>
              <span className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP (Dimensions recommandées: 1200x400px)</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleImageSelect}
                className="hidden"
                disabled={uploadingImage}
              />
            </label>
          )}
          {uploadingImage && <p className="text-xs text-primary font-medium animate-pulse">Téléversement en cours...</p>}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-foreground">Description du message publicitaire</label>
          <Textarea
            placeholder="Détails de votre offre, slogan, réduction..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            className="rounded-xl"
          />
        </div>

        {/* Lien de redirection & Téléphone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Lien vers votre site web ou page Facebook</label>
            <Input
              placeholder="https://..."
              value={targetUrl}
              onChange={e => setTargetUrl(e.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Numéro de contact professionnel *</label>
            <Input
              placeholder="+242 06..."
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground" htmlFor="banner-contact-name">Nom du contact {!isFreeMode && currentPlan.price > 0 ? '*' : '(facultatif)'}</label>
            <Input id="banner-contact-name" autoComplete="name" value={contactName} onChange={e => setContactName(e.target.value)} className="h-11 rounded-xl" required={!isFreeMode && currentPlan.price > 0} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground" htmlFor="banner-contact-email">E-mail pour le reçu Moneroo {!isFreeMode && currentPlan.price > 0 ? '*' : '(facultatif)'}</label>
            <Input id="banner-contact-email" type="email" autoComplete="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="h-11 rounded-xl" required={!isFreeMode && currentPlan.price > 0} />
          </div>
        </div>

        {/* Durée et tarifs */}
        <div className="space-y-3 border-t pt-4">
          <label className="text-xs font-bold text-foreground">Formule de diffusion *</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {adPricing.map(p => (
              <div
                key={p.months}
                onClick={() => setDurationMonths(p.months)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  durationMonths === p.months
                    ? 'border-blue-600 bg-blue-50/50 dark:bg-blue-950/20 shadow-xs'
                    : 'border-border bg-card hover:bg-muted/50'
                }`}
              >
                <div className="font-bold text-sm text-foreground">{p.months} Mois</div>
                <div className="text-base font-extrabold text-blue-600 mt-2">
                  {formatPrice(p.price, p.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Validation Button */}
        <div className="pt-4 border-t">
          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 text-base shadow-md cursor-pointer transition-transform active:scale-98"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>
            {submitting ? 'Envoi en cours...' : currentPlan.price > 0 ? 'Payer et lancer la campagne' : 'Envoyer la demande'}
            </span>
          </Button>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            Le règlement est traité sur la page sécurisée Moneroo. La campagne ne sera active qu’après confirmation du paiement.
          </p>
        </div>
      </form>
    </div>
  );
};
