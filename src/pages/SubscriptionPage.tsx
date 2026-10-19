import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZando } from '@/contexts/ZandoContext';
import { zandoApi } from '@/services/zandoApi';
import {
  CheckCircle2,
  Zap,
  ChevronLeft,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { createMonerooPayment } from '@/services/monerooPayments';

export const SubscriptionPage: React.FC = () => {
  const { settings } = useZando();
  const navigate = useNavigate();

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [selectedPlanMonths, setSelectedPlanMonths] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  const subscriptionPlans = settings.subscription_plans || [
    { months: 1, price: 15000, currency: 'FCFA', limit: 30, name: 'Formule Starter (1 Mois)' },
    { months: 2, price: 28000, currency: 'FCFA', limit: 70, name: 'Formule Pro (2 Mois)' },
    { months: 3, price: 40000, currency: 'FCFA', limit: 120, name: 'Formule VIP (3 Mois)' }
  ];

  const currentPlan = subscriptionPlans.find(p => p.months === selectedPlanMonths) || subscriptionPlans[0];

  const startSubscriptionPayment = async (itemId: string) => {
    const payment = await createMonerooPayment({
      serviceType: 'subscription',
      itemId,
      customer: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
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
    toast.error(payment.error || 'Le paiement est indisponible. Votre abonnement reste en attente.');
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phoneNumber.trim() || !email.trim()) {
      toast.error('Veuillez renseigner toutes les informations requises.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await zandoApi.createSubscription({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim(),
        email: email.trim(),
        plan_months: selectedPlanMonths
      });
      if (!result.success) {
        toast.error(`Erreur : ${result.error || 'Impossible d’enregistrer la demande'}`);
        return;
      }
      if (result.data?.id) setSubscriptionId(result.data.id);
      setRequestSubmitted(true);
      toast.info('Demande enregistrée. Redirection vers le paiement sécurisé Moneroo.');
      if (result.data?.id) await startSubscriptionPayment(result.data.id);
    } catch (err) {
      console.error(err);
      toast.error('Une erreur est survenue.');
    } finally {
      setSubmitting(false);
    }
  };

  if (requestSubmitted) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6 space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground">
            Demande d’abonnement reçue
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Merci <strong>{firstName} {lastName}</strong>. Votre demande pour <strong>{currentPlan.name}</strong> a été enregistrée. L’abonnement ne sera activé qu’après confirmation du paiement par Moneroo.
          </p>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          {subscriptionId && (
            <Button
              onClick={() => void startSubscriptionPayment(subscriptionId)}
              className="w-full sm:w-auto rounded-full bg-secondary font-bold gap-2 h-11"
            >
              <CreditCard className="w-4 h-4" /> Régler maintenant
            </Button>
          )}
          <Button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto rounded-full bg-primary font-bold h-11"
          >
            Retour à l'accueil
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold uppercase">
          <Zap className="w-3.5 h-3.5 text-emerald-600" />
          <span>Abonnement Vendeur Professionnel</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground">
          Souscrire un abonnement vendeur
        </h1>
        <p className="text-xs text-muted-foreground">
          Choisissez une formule et envoyez votre demande. L’activation interviendra uniquement après confirmation du paiement.
        </p>
      </div>

      <form onSubmit={handleSubscribe} className="bg-card rounded-2xl border border-border p-6 sm:p-8 space-y-6 shadow-sm">
        {/* Nom & Prénom */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Nom(s) *</label>
            <Input
              placeholder="Ex. : Kouassi"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Prénom(s) *</label>
            <Input
              placeholder="Ex. : Jean-Paul"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>
        </div>

        {/* Numéro & E-mail */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Numéro de téléphone (WhatsApp) *</label>
            <Input
              placeholder="Ex. : +242 06 123 4567"
              value={phoneNumber}
              onChange={e => setPhoneNumber(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
            <p className="text-[11px] text-muted-foreground">Ce numéro sera utilisé pour vous recontacter au sujet de votre demande.</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-foreground">Adresse e-mail *</label>
            <Input
              type="email"
              placeholder="Ex. : contact@boutique.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="h-11 rounded-xl"
              required
            />
          </div>
        </div>

        {/* Formules d'abonnement */}
        <div className="space-y-3 border-t pt-4">
          <label className="text-xs font-bold text-foreground">Sélectionnez votre formule d'abonnement *</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {subscriptionPlans.map(plan => (
              <div
                key={plan.months}
                onClick={() => setSelectedPlanMonths(plan.months)}
                className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  selectedPlanMonths === plan.months
                    ? 'border-primary bg-primary/5 shadow-xs'
                    : 'border-border bg-card hover:bg-muted/50'
                }`}
              >
                <div>
                  <div className="font-bold text-sm text-foreground">{plan.months} Mois</div>
                  <div className="text-[11px] text-muted-foreground">{plan.limit} annonces incluses</div>
                </div>
                <div className="text-base font-extrabold text-primary mt-3">
                  {new Intl.NumberFormat('fr-FR').format(plan.price)} FCFA
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Récapitulatif et Paiement */}
        <div className="p-4 rounded-xl bg-muted/40 border space-y-2 text-xs">
          <div className="flex justify-between font-medium">
            <span>Formule :</span>
            <span className="font-bold text-foreground">{currentPlan.name}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Quota d'annonces offertes :</span>
            <span className="font-bold text-emerald-600">{currentPlan.limit} annonces</span>
          </div>
          <div className="flex justify-between font-bold text-sm border-t pt-2 text-foreground">
            <span>Total :</span>
            <span className="text-primary font-extrabold">{new Intl.NumberFormat('fr-FR').format(currentPlan.price)} FCFA</span>
          </div>
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="w-full h-12 rounded-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold gap-2 text-base shadow-md cursor-pointer transition-transform active:scale-98"
        >
          <CheckCircle2 className="w-5 h-5" />
          <span>
            {submitting ? 'Enregistrement...' : 'Envoyer la demande'}
          </span>
        </Button>
      </form>
    </div>
  );
};
