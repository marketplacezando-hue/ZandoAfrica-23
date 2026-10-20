import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Clock3, CreditCard, Download, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { verifyMonerooPayment, retryMonerooPayment, type MonerooPaymentResult } from '@/services/monerooPayments';
import * as digitalBooks from '@/services/digitalBooks';

type ViewState = 'loading' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'error';
type PaymentReturnResult = MonerooPaymentResult & { type?: MonerooPaymentResult['type'] | 'book_purchase' };
type DigitalBooksApi = {
  getDigitalDownload?: (reference: string) => Promise<{ url?: string; error?: string }>;
};

const digitalBooksApi = digitalBooks as unknown as DigitalBooksApi;
const serviceLabels: Record<string, string> = {
  product_listing: 'Publication d’annonce',
  banner_ad: 'Publicité bannière',
  subscription: 'Abonnement vendeur',
  book_purchase: 'Achat de livre numérique',
};

const statusText: Record<ViewState, string> = {
  loading: 'Vérification du paiement',
  pending: 'Paiement en attente',
  completed: 'Paiement réussi',
  failed: 'Paiement échoué',
  cancelled: 'Paiement annulé',
  refunded: 'Paiement remboursé',
  error: 'Vérification indisponible',
};

export const PaymentReturnPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference');
  const paymentId = searchParams.get('paymentId');
  const [state, setState] = useState<ViewState>(reference ? 'loading' : 'error');
  const [payment, setPayment] = useState<PaymentReturnResult | null>(null);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const checkPayment = useCallback(async (manual = false) => {
    if (!reference || checking) return;
    setChecking(true);
    const result = await verifyMonerooPayment(reference, paymentId);
    if (result.data) {
      setPayment(result.data as PaymentReturnResult);
      setState(result.data.status);
      setMessage(result.data.verification === 'mismatch'
        ? 'Le montant ou la devise ne correspond pas à la demande. Le service reste désactivé pendant la vérification.'
        : result.data.status === 'pending'
          ? 'Moneroo n’a pas encore confirmé de résultat définitif. Votre service reste en attente.'
          : 'Le statut a été confirmé par Moneroo.');
    } else {
      setState('error');
      setMessage(result.error || (manual ? 'Réessayez la vérification dans quelques instants.' : 'La vérification sera réessayée automatiquement.'));
    }
    setChecking(false);
  }, [checking, paymentId, reference]);

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      if (cancelled || attempts >= 12) return;
      attempts += 1;
      const result = await verifyMonerooPayment(reference, paymentId);
      if (cancelled) return;
      if (result.data) {
        setPayment(result.data as PaymentReturnResult);
        setState(result.data.status);
        setMessage(result.data.status === 'pending'
          ? 'Moneroo n’a pas encore confirmé de résultat définitif. Votre service reste en attente.'
          : 'Le statut a été confirmé par Moneroo.');
        if (result.data.status === 'pending') window.setTimeout(poll, 5000);
      } else {
        setState('error');
        setMessage(result.error || 'La vérification sera réessayée automatiquement.');
        if (attempts < 12) window.setTimeout(poll, 7000);
      }
    };
    void poll();
    return () => { cancelled = true; };
  }, [paymentId, reference]);

  const handleRetry = async () => {
    if (!reference || checking) return;
    setChecking(true);
    const result = await retryMonerooPayment(reference);
    setChecking(false);
    if (result.data?.type === 'book_purchase') {
      try {
        const stored: unknown = JSON.parse(localStorage.getItem('zando_digital_purchases') || '[]');
        const purchases = Array.isArray(stored) ? stored : [];
        const previous = purchases.find(item => item && typeof item === 'object' && item.reference === reference) as { productId?: string } | undefined;
        localStorage.setItem('zando_digital_purchases', JSON.stringify([
          ...purchases.filter(item => item && typeof item === 'object' && item.reference !== result.data?.reference),
          { reference: result.data.reference, productId: previous?.productId }
        ].slice(-50)));
      } catch {
        // The retry remains usable if local browser storage is unavailable.
      }
    }
    if (result.data?.checkout_url) {
      window.location.assign(result.data.checkout_url);
      return;
    }
    if (result.data) {
      setPayment(result.data as PaymentReturnResult);
      setState(result.data.status);
      setMessage(result.data.status === 'pending'
        ? 'Cette transaction est déjà en cours de traitement. Nous n’en avons pas créé une deuxième.'
        : 'Aucun nouveau paiement n’a été démarré. Vérifiez le statut auprès de Moneroo.');
    } else {
      setMessage(result.error || 'Impossible de relancer le paiement.');
    }
  };

  const handleDigitalDownload = async () => {
    if (state !== 'completed' || payment?.type !== 'book_purchase' || !payment.reference || downloading) return;
    setDownloading(true);
    setDownloadError('');
    try {
      if (!digitalBooksApi.getDigitalDownload) {
        setDownloadError('Le téléchargement du livre numérique n’est pas encore disponible.');
        return;
      }
      const result = await digitalBooksApi.getDigitalDownload(payment.reference);
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setDownloadError(result.error || 'Le lien de téléchargement n’a pas pu être généré.');
    } catch {
      setDownloadError('Impossible de préparer le téléchargement du livre pour le moment.');
    } finally {
      setDownloading(false);
    }
  };

  const Icon = state === 'completed' ? CheckCircle2
    : state === 'failed' ? XCircle
        : state === 'cancelled' || state === 'refunded' ? AlertCircle
        : state === 'error' ? AlertCircle : state === 'loading' ? Loader2 : Clock3;
  const iconStyle = state === 'completed' ? 'bg-emerald-100 text-emerald-700'
    : state === 'failed' || state === 'cancelled' || state === 'refunded' || state === 'error' ? 'bg-rose-100 text-rose-700'
      : 'bg-amber-100 text-amber-700';
  const canRetry = state === 'failed' || state === 'cancelled'
    || (state === 'pending' && payment?.checkout_state === 'rejected');

  return (
    <div className="max-w-xl mx-auto py-12 sm:py-16 px-4 sm:px-6">
      <section className="rounded-2xl border border-border bg-card p-6 sm:p-8 text-center shadow-sm space-y-5" aria-live="polite">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${iconStyle}`}>
          <Icon className={`w-9 h-9 ${state === 'loading' ? 'animate-spin' : ''}`} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-foreground">{statusText[state]}</h1>
          <p className="text-sm text-muted-foreground">{message || 'Nous vérifions la réponse de Moneroo. Ne relancez pas le paiement pendant cette vérification.'}</p>
        </div>
        {payment && (
          <div className="rounded-xl bg-muted/50 border border-border p-4 text-left text-sm space-y-2">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Service</span><strong>{payment.type ? serviceLabels[payment.type] : 'Service ZandoAfrica'}</strong></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Montant</span><strong>{new Intl.NumberFormat('fr-FR').format(payment.amount ?? 0)} {payment.currency}</strong></div>
            {payment.created_at && <div className="flex justify-between gap-4"><span className="text-muted-foreground">Date</span><span>{new Date(payment.created_at).toLocaleString('fr-FR')}</span></div>}
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Référence</span><span className="font-mono text-xs break-all">{payment.reference}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Statut</span><strong>{statusText[state]}</strong></div>
          </div>
        )}
        {state === 'completed' && payment?.type === 'book_purchase' && (
          <div className="space-y-2">
            <Button onClick={() => void handleDigitalDownload()} disabled={downloading} className="rounded-full gap-2">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {downloading ? 'Préparation du téléchargement...' : 'Télécharger le livre'}
            </Button>
            {downloadError && <p className="text-sm text-rose-600 dark:text-rose-400">{downloadError}</p>}
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          {canRetry && (
            <Button onClick={handleRetry} disabled={checking} className="rounded-full gap-2">
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              {state === 'pending' ? 'Relancer le checkout Moneroo' : 'Réessayer le paiement'}
            </Button>
          )}
          {(state === 'pending' || state === 'error') && (
            <Button variant="outline" onClick={() => void checkPayment(true)} disabled={checking} className="rounded-full gap-2">
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock3 className="w-4 h-4" />}
              Vérifier le paiement
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate('/')} className="rounded-full">Retour à l’accueil</Button>
        </div>
        {state === 'pending' && <p className="text-xs text-muted-foreground">Un retour vers le site ou la fermeture de l’onglet ne change pas le statut du paiement.</p>}
      </section>
    </div>
  );
};
