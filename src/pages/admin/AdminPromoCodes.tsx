import React, { useState, useEffect } from 'react';
import { zandoApi } from '@/services/zandoApi';
import type { PromoCode } from '@/types/zando';
import { KeyRound, Plus, CheckCircle2, XCircle, Search, Calendar, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const AdminPromoCodes: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Code Form
  const [code, setCode] = useState('');
  const [boundPhone, setBoundPhone] = useState('');
  const [maxUses, setMaxUses] = useState(30);
  const [durationDays, setDurationDays] = useState(30);

  const loadCodes = async () => {
    setLoading(true);
    const data = await zandoApi.getPromoCodes();
    setPromoCodes(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCodes();
  }, []);

  const handleToggleActive = async (p: PromoCode) => {
    const ok = await zandoApi.updatePromoCode(p.id, { is_active: !p.is_active });
    if (ok) {
      toast.success(!p.is_active ? 'Code promo activé.' : 'Code promo désactivé.');
      loadCodes();
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !boundPhone.trim()) {
      toast.error('Veuillez renseigner le code et le numéro associé.');
      return;
    }

    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    const res = await zandoApi.createPromoCode({
      code: code.trim().toUpperCase(),
      bound_phone: boundPhone.trim(),
      max_uses: maxUses,
      uses_count: 0,
      discount_type: '100_percent',
      is_active: true,
      expires_at: expiresAt
    });

    if (res.success) {
      toast.success('Code promotionnel créé avec succès !');
      setShowCreateModal(false);
      setCode('');
      setBoundPhone('');
      loadCodes();
    } else {
      toast.error('Erreur lors de la création du code.');
    }
  };

  const filtered = promoCodes.filter(c =>
    `${c.code} ${c.bound_phone}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Gestion des Codes Promotionnels</h1>
          <p className="text-xs text-muted-foreground">
            Codes promo liés aux numéros de téléphone pour autoriser les publications gratuites.
          </p>
        </div>
        <Button
          onClick={() => {
            setCode(`PROMO-${Math.random().toString(36).substring(2, 7).toUpperCase()}`);
            setShowCreateModal(true);
          }}
          className="rounded-full bg-primary font-bold gap-2 text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Générer un code promo</span>
        </Button>
      </div>

      <div className="max-w-md">
        <Input
          placeholder="Rechercher par code ou téléphone lié..."
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
                <th className="p-3.5 whitespace-nowrap">Code Promotionnel</th>
                <th className="p-3.5 whitespace-nowrap">Numéro Vendeur Lié</th>
                <th className="p-3.5 whitespace-nowrap">Utilisations</th>
                <th className="p-3.5 whitespace-nowrap">Type de Réduction</th>
                <th className="p-3.5 whitespace-nowrap">Date d'Expiration</th>
                <th className="p-3.5 whitespace-nowrap">Statut</th>
                <th className="p-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">Chargement...</td>
                </tr>
              ) : filtered.length > 0 ? (
                filtered.map(c => (
                  <tr key={c.id} className="hover:bg-muted/20">
                    <td className="p-3.5 whitespace-nowrap font-mono font-bold text-sm text-primary">
                      {c.code}
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-mono font-medium">
                      {c.bound_phone}
                    </td>
                    <td className="p-3.5 whitespace-nowrap font-bold">
                      {c.uses_count} / {c.max_uses} utilisations
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                        Gratuité 100%
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString('fr-FR') : 'Sans expiration'}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {c.is_active ? 'Actif' : 'Désactivé'}
                      </span>
                    </td>
                    <td className="p-3.5 whitespace-nowrap text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleActive(c)}
                        className="h-7 text-[11px]"
                      >
                        {c.is_active ? 'Désactiver' : 'Activer'}
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">Aucun code promotionnel trouvé.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Créer un code promo</h2>
            <form onSubmit={handleCreateCode} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Code promo (Majuscules)</label>
                <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} required className="font-mono font-bold" />
              </div>
              <div>
                <label className="font-bold block mb-1">Numéro de téléphone autorisé *</label>
                <Input value={boundPhone} onChange={e => setBoundPhone(e.target.value)} required placeholder="+242..." />
                <p className="text-[10px] text-muted-foreground mt-0.5">Seul ce numéro pourra utiliser ce code pour publier.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Nombre d'utilisations max</label>
                  <Input type="number" min={1} value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} />
                </div>
                <div>
                  <label className="font-bold block mb-1">Durée de validité (Jours)</label>
                  <Input type="number" min={1} value={durationDays} onChange={e => setDurationDays(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Annuler</Button>
                <Button type="submit" className="bg-primary">Créer le code promo</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
