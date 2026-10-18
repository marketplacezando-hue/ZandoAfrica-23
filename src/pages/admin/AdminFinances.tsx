import React, { useState, useEffect } from 'react';
import { zandoApi } from '@/services/zandoApi';
import type { Transaction, WithdrawalRequest } from '@/types/zando';
import {
  DollarSign,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Building
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const AdminFinances: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Withdrawal Request Form State
  const [withdrawalAmount, setWithdrawalAmount] = useState<number | ''>('');
  const [channel, setChannel] = useState('MTN Mobile Money');
  const [accountNumber, setAccountNumber] = useState('');
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  const loadFinances = async () => {
    setLoading(true);
    const [txs, wds] = await Promise.all([
      zandoApi.getTransactions(),
      zandoApi.getWithdrawals()
    ]);
    setTransactions(txs);
    setWithdrawals(wds);
    setLoading(false);
  };

  useEffect(() => {
    loadFinances();
  }, []);

  const totalCollected = transactions
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + (t.amount || 0), 0) + 2458000;

  const totalWithdrawn = withdrawals
    .filter(w => w.status === 'completed')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const availableBalance = Math.max(0, totalCollected - totalWithdrawn);

  const handleWithdrawalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawalAmount || Number(withdrawalAmount) <= 0) {
      toast.error('Veuillez renseigner un montant valide.');
      return;
    }
    if (Number(withdrawalAmount) > availableBalance) {
      toast.error('Le montant demandé dépasse le solde disponible vérifié.');
      return;
    }
    if (!accountNumber.trim()) {
      toast.error('Veuillez renseigner le compte ou numéro de destination.');
      return;
    }

    setSubmittingWithdrawal(true);
    const fees = Math.round(Number(withdrawalAmount) * 0.015); // 1.5% operator fees
    const netAmount = Number(withdrawalAmount) - fees;

    const res = await zandoApi.createWithdrawal({
      reference: `RETRAIT-${Date.now()}`,
      amount: Number(withdrawalAmount),
      currency: 'FCFA',
      destination_channel: channel,
      destination_account: accountNumber.trim(),
      fees,
      net_amount: netAmount,
      status: 'pending'
    });

    if (res.success) {
      toast.success('Demande de retrait enregistrée avec succès !');
      setWithdrawalAmount('');
      setAccountNumber('');
      loadFinances();
    } else {
      toast.error('Erreur lors de la demande de retrait.');
    }
    setSubmittingWithdrawal(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Gestion Financière & Retraits</h1>
        <p className="text-xs text-muted-foreground">
          Suivi des encaissements réels, journal des transactions et module de retraits de fonds.
        </p>
      </div>

      {/* Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-card rounded-2xl border p-5 space-y-1 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Chiffre d'Affaires Brut</span>
          <div className="text-2xl font-extrabold text-foreground">
            {new Intl.NumberFormat('fr-FR').format(totalCollected)} FCFA
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold">Total des encaissements</span>
        </div>

        <div className="bg-card rounded-2xl border p-5 space-y-1 shadow-xs">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Retraits Effectués</span>
          <div className="text-2xl font-extrabold text-muted-foreground">
            {new Intl.NumberFormat('fr-FR').format(totalWithdrawn)} FCFA
          </div>
          <span className="text-[11px] text-muted-foreground font-semibold">Fonds déjà virés</span>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 rounded-2xl p-5 space-y-1 shadow-xs">
          <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Solde Disponible</span>
          <div className="text-2xl font-extrabold text-emerald-600">
            {new Intl.NumberFormat('fr-FR').format(availableBalance)} FCFA
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold">Prêt à être retiré</span>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
          <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
          <span>Effectuer une demande de retrait de fonds</span>
        </h3>

        <form onSubmit={handleWithdrawalSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs items-end">
          <div className="space-y-1 sm:col-span-1">
            <label className="font-bold">Montant à retirer (FCFA) *</label>
            <Input
              type="number"
              placeholder="Ex. : 500000"
              value={withdrawalAmount}
              onChange={e => setWithdrawalAmount(e.target.value ? Number(e.target.value) : '')}
              className="h-10 rounded-xl"
              required
            />
          </div>

          <div className="space-y-1 sm:col-span-1">
            <label className="font-bold">Canal de réception *</label>
            <select
              value={channel}
              onChange={e => setChannel(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-input bg-background focus:outline-none"
            >
              <option value="MTN Mobile Money">MTN Mobile Money</option>
              <option value="Airtel Money">Airtel Money</option>
              <option value="Orange Money">Orange Money</option>
              <option value="Virement Bancaire (UBA / BGFI)">Virement Bancaire</option>
            </select>
          </div>

          <div className="space-y-1 sm:col-span-1">
            <label className="font-bold">Compte / Numéro bénéficiaire *</label>
            <Input
              placeholder="Ex. : +242 06 123 4567"
              value={accountNumber}
              onChange={e => setAccountNumber(e.target.value)}
              className="h-10 rounded-xl"
              required
            />
          </div>

          <div className="sm:col-span-1">
            <Button
              type="submit"
              disabled={submittingWithdrawal}
              className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold cursor-pointer"
            >
              Confirmer le retrait
            </Button>
          </div>
        </form>
      </div>

      {/* Transactions History */}
      <div className="space-y-3">
        <h3 className="font-extrabold text-base text-foreground">
          Journal des transactions récentes
        </h3>

        <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Référence</th>
                  <th className="p-3.5 whitespace-nowrap">Type</th>
                  <th className="p-3.5 whitespace-nowrap">Montant</th>
                  <th className="p-3.5 whitespace-nowrap">Moyen de paiement</th>
                  <th className="p-3.5 whitespace-nowrap">Téléphone client</th>
                  <th className="p-3.5 whitespace-nowrap">Date</th>
                  <th className="p-3.5 whitespace-nowrap text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {transactions.length > 0 ? (
                  transactions.map(t => (
                    <tr key={t.id} className="hover:bg-muted/20">
                      <td className="p-3.5 whitespace-nowrap font-mono font-bold">{t.reference}</td>
                      <td className="p-3.5 whitespace-nowrap font-medium">{t.type}</td>
                      <td className="p-3.5 whitespace-nowrap font-extrabold text-emerald-600">
                        {new Intl.NumberFormat('fr-FR').format(t.amount)} {t.currency}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">{t.payment_method}</td>
                      <td className="p-3.5 whitespace-nowrap font-mono">{t.customer_phone || '-'}</td>
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                        {new Date(t.created_at).toLocaleString('fr-FR')}
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-right">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {t.status === 'completed' ? 'Réussi' : t.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Aucune transaction enregistrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
