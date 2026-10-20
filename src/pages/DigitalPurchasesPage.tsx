import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock3, Download, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { retryMonerooPayment, verifyMonerooPayment } from '@/services/monerooPayments';
import { getDigitalDownload } from '@/services/digitalBooks';

type StoredPurchase = { reference: string; productId?: string };
type PurchaseState = 'loading' | 'pending' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'error';
type Purchase = StoredPurchase & { state: PurchaseState; error?: string; amount?: number; currency?: string; checkout_state?: string };

const STORAGE_KEY = 'zando_digital_purchases';

function readStoredPurchases(): StoredPurchase[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is StoredPurchase =>
      !!item && typeof item === 'object' &&
      typeof item.reference === 'string' && /^[a-zA-Z0-9_-]{8,160}$/.test(item.reference)
    ).slice(-50).reverse();
  } catch {
    return [];
  }
}

export const DigitalPurchasesPage: React.FC = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const refreshPurchase = useCallback(async (purchase: StoredPurchase): Promise<Purchase> => {
    const result = await verifyMonerooPayment(purchase.reference);
    if (!result.data) {
      return { ...purchase, state: 'error', error: result.error || 'Vérification indisponible.' };
    }
    return {
      ...purchase,
      state: result.data.status,
      amount: result.data.amount,
      currency: result.data.currency,
      checkout_state: result.data.checkout_state,
      ...(result.data.verification === 'mismatch' ? { error: 'Le montant ou la devise ne correspond pas; l’accès reste verrouillé.' } : {})
    };
  }, []);

  const loadPurchases = useCallback(async () => {
    setRefreshing(true);
    const stored = readStoredPurchases();
    setPurchases(stored.map(item => ({ ...item, state: 'loading' })));
    const results = await Promise.all(stored.map(refreshPurchase));
    setPurchases(results);
    setRefreshing(false);
  }, [refreshPurchase]);

  useEffect(() => { void loadPurchases(); }, [loadPurchases]);

  const handleDownload = async (purchase: Purchase) => {
    if (purchase.state !== 'completed') return;
    setDownloading(purchase.reference);
    const result = await getDigitalDownload(purchase.reference);
    if (result.url) {
      window.location.assign(result.url);
    } else {
      setPurchases(previous => previous.map(item => item.reference === purchase.reference
        ? { ...item, error: result.error || 'Le téléchargement est indisponible.' }
        : item));
    }
    setDownloading(null);
  };

  const handleRetry = async (purchase: Purchase) => {
    setRetrying(purchase.reference);
    const result = await retryMonerooPayment(purchase.reference);
    const next = result.data;
    if (!next?.reference) {
      setPurchases(previous => previous.map(item => item.reference === purchase.reference
        ? { ...item, error: result.error || 'Impossible de relancer le paiement.' }
        : item));
      setRetrying(null);
      return;
    }
    try {
      const stored = readStoredPurchases();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([
        ...stored.filter(item => item.reference !== next.reference),
        { reference: next.reference, productId: purchase.productId }
      ].slice(-50)));
    } catch {
      // The checkout remains usable when browser storage is unavailable.
    }
    setRetrying(null);
    if (next.checkout_url) {
      window.location.assign(next.checkout_url);
      return;
    }
    await loadPurchases();
  };

  const iconFor = (state: PurchaseState) => state === 'completed'
    ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
    : state === 'failed' || state === 'cancelled' || state === 'refunded' || state === 'error'
      ? <XCircle className="h-5 w-5 text-rose-600" />
      : state === 'loading'
        ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        : <Clock3 className="h-5 w-5 text-amber-600" />;

  const statusLabel: Record<PurchaseState, string> = {
    loading: 'Vérification…', pending: 'En attente', completed: 'Paiement confirmé',
    failed: 'Échoué', cancelled: 'Annulé', refunded: 'Remboursé', error: 'Vérification indisponible'
  };

  return (
    <section className="mx-auto max-w-3xl space-y-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Mes achats numériques</h1>
          <p className="mt-1 text-sm text-muted-foreground">Les téléchargements sont disponibles uniquement après confirmation du paiement par Moneroo.</p>
        </div>
        <Button type="button" variant="outline" onClick={() => void loadPurchases()} disabled={refreshing} className="gap-2 self-start">
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Actualiser
        </Button>
      </div>

      {purchases.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Aucun achat numérique enregistré dans ce navigateur. Conservez la référence de paiement ou revenez sur cet appareil pour retrouver un achat.
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.map(purchase => (
            <article key={purchase.reference} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="mt-0.5 shrink-0">{iconFor(purchase.state)}</div>
                <div className="min-w-0">
                  <h2 className="break-all text-sm font-bold">Référence {purchase.reference}</h2>
                  <p className="text-xs text-muted-foreground">{statusLabel[purchase.state]}{purchase.amount !== undefined ? ` · ${new Intl.NumberFormat('fr-FR').format(purchase.amount)} ${purchase.currency || ''}` : ''}</p>
                  {purchase.error && <p className="mt-1 text-xs text-rose-600">{purchase.error}</p>}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {purchase.state !== 'completed' && purchase.state !== 'refunded' && (
                  <Button type="button" variant="outline" size="sm" onClick={() => void loadPurchases()} disabled={refreshing}>
                    Vérifier
                  </Button>
                )}
                {(purchase.state === 'failed' || purchase.state === 'cancelled' || (purchase.state === 'pending' && purchase.checkout_state === 'rejected')) && (
                  <Button type="button" variant="outline" size="sm" onClick={() => void handleRetry(purchase)} disabled={retrying === purchase.reference}>
                    {retrying === purchase.reference ? 'Relance…' : 'Réessayer le paiement'}
                  </Button>
                )}
                {purchase.state === 'completed' && (
                  <Button type="button" size="sm" onClick={() => void handleDownload(purchase)} disabled={downloading === purchase.reference} className="gap-2">
                    {downloading === purchase.reference ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Télécharger à nouveau
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <p className="text-xs text-muted-foreground">Cet espace retrouve les références enregistrées sur cet appareil. Le serveur vérifie de nouveau chaque paiement avant d’autoriser un téléchargement.</p>
    </section>
  );
};
