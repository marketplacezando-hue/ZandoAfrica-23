import React, { useState, useEffect } from 'react';
import { zandoApi } from '@/services/zandoApi';
import type { SellerSubscription } from '@/types/zando';
import { CreditCard, Search, Calendar, CheckCircle2, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const AdminSubscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<SellerSubscription[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSubs = async () => {
    setLoading(true);
    const data = await zandoApi.getSubscriptions();
    setSubscriptions(data);
    setLoading(false);
  };

  useEffect(() => {
    loadSubs();
  }, []);

  const handleToggleStatus = async (sub: SellerSubscription) => {
    const newStatus = sub.status === 'active' ? 'suspended' : 'active';
    const ok = await zandoApi.updateSubscription(sub.id, { status: newStatus });
    if (ok) {
      toast.success(newStatus === 'active' ? 'Abonnement réactivé.' : 'Abonnement suspendu.');
      loadSubs();
    }
  };

  const filtered = subscriptions.filter(s =>
    `${s.first_name} ${s.last_name} ${s.phone_number} ${s.promo_code}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground">Gestion des Abonnements Vendeurs</h1>
        <p className="text-xs text-muted-foreground">
          Consultez les abonnements actifs, le quota de publications restantes et les codes promotionnels associés.
        </p>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Rechercher par nom, téléphone, code promo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-10 rounded-xl text-xs"
        />
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="p-3.5 whitespace-nowrap">Vendeur</th>
                <th className="p-3.5 whitespace-nowrap">Numéro de téléphone</th>
                <th className="p-3.5 whitespace-nowrap">Formule</th>
                <th className="p-3.5 whitespace-nowrap">Code Promo Lié</th>
                <th className="p-3.5 whitespace-nowrap">Publications Utilisées</th>
                <th className="p-3.5 whitespace-nowrap">Expiration</th>
                <th className="p-3.5 whitespace-nowrap">Statut</th>
                <th className="p-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">Chargement...</td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map(s => (
                  <tr key={s.id} className="hover:bg-muted/20">
                    <td className="p-3.5 whitespace-nowrap font-bold text-foreground">
                      {s.first_name} {s.last_name}
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-mono">{s.phone_number}</td>
                    <td className="p-3.5 whitespace-nowrap">
                      {s.plan_months} Mois ({new Intl.NumberFormat('fr-FR').format(s.price)} {s.currency})
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-mono font-bold text-emerald-600">
                      {s.promo_code}
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-semibold">
                      {s.publications_used} / {s.publication_limit}
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                      {s.expires_at ? new Date(s.expires_at).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {s.status === 'active' ? 'Actif' : s.status === 'pending_payment' ? 'En attente de paiement' : s.status === 'expired' ? 'Expiré' : 'Suspendu'}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(s)}
                        className="h-7 text-[11px]"
                      >
                        {s.status === 'active' ? 'Suspendre' : 'Réactiver'}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">Aucun abonnement trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
