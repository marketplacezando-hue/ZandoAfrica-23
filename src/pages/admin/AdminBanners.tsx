import React, { useState, useEffect } from 'react';
import { zandoApi } from '@/services/zandoApi';
import type { BannerAd } from '@/types/zando';
import { Megaphone, Plus, Trash2, CheckCircle2, XCircle, Eye, MousePointerClick, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export const AdminBanners: React.FC = () => {
  const [banners, setBanners] = useState<BannerAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Banner State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);
  const [price, setPrice] = useState(30000);

  const loadBanners = async () => {
    setLoading(true);
    const data = await zandoApi.getBannerAds('');
    setBanners(data);
    setLoading(false);
  };

  useEffect(() => {
    loadBanners();
  }, []);

  const handleToggleStatus = async (banner: BannerAd) => {
    const newStatus = banner.status === 'active' ? 'suspended' : 'active';
    const ok = await zandoApi.updateBannerAd(banner.id, { status: newStatus });
    if (ok) {
      toast.success(newStatus === 'active' ? 'Campagne activée.' : 'Campagne suspendue.');
      loadBanners();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !imageUrl) {
      toast.error('Veuillez renseigner le titre et l\'URL de l\'image.');
      return;
    }

    const startsAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();

    const res = await zandoApi.createBannerAd({
      title,
      description,
      image_url: imageUrl,
      target_url: targetUrl || null,
      phone_number: phoneNumber || null,
      duration_months: durationMonths,
      price,
      currency: 'FCFA',
      status: 'active',
      starts_at: startsAt,
      expires_at: expiresAt
    });

    if (res.success) {
      toast.success('Bannière publicitaire VIP créée avec succès !');
      setShowCreateModal(false);
      setTitle('');
      setImageUrl('');
      loadBanners();
    } else {
      toast.error('Erreur lors de la création.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Gestion des Publicités VIP</h1>
          <p className="text-xs text-muted-foreground">
            Suivi des bannières publicitaires en tête de la page d'accueil, clics et dates d'expiration.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="rounded-full bg-primary font-bold gap-2 text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Créer une campagne VIP</span>
        </Button>
      </div>

      {/* Banners List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="text-xs text-muted-foreground">Chargement des publicités...</p>
        ) : banners.length > 0 ? (
          banners.map(b => (
            <div key={b.id} className="bg-card rounded-2xl border border-border p-5 space-y-3 shadow-xs">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                <span className={`absolute top-2 right-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  b.status === 'active' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                }`}>
                  {b.status === 'active' ? 'Active' : 'Suspendue'}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm text-foreground truncate">{b.title}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">{b.description}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-2">
                <span className="flex items-center gap-1 font-semibold">
                  <MousePointerClick className="w-3.5 h-3.5 text-blue-600" />
                  <span>{b.clicks_count} clics</span>
                </span>
                <span>{b.duration_months} mois ({new Intl.NumberFormat('fr-FR').format(b.price)} {b.currency})</span>
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                <span>Expire le : {new Date(b.expires_at).toLocaleDateString('fr-FR')}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleToggleStatus(b)}
                  className="h-7 text-[11px]"
                >
                  {b.status === 'active' ? 'Suspendre' : 'Activer'}
                </Button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground col-span-full">Aucune publicité pour le moment.</p>
        )}
      </div>

      {/* Modal Create Banner */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl border p-6 space-y-4 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Ajouter une bannière publicitaire VIP</h2>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="font-bold block mb-1">Titre de la campagne</label>
                <Input value={title} onChange={e => setTitle(e.target.value)} required />
              </div>
              <div>
                <label className="font-bold block mb-1">URL de l'image de bannière</label>
                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} required placeholder="https://..." />
              </div>
              <div>
                <label className="font-bold block mb-1">Lien de redirection externe</label>
                <Input value={targetUrl} onChange={e => setTargetUrl(e.target.value)} placeholder="https://..." />
              </div>
              <div>
                <label className="font-bold block mb-1">Description</label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold block mb-1">Durée (Mois)</label>
                  <Input type="number" min={1} value={durationMonths} onChange={e => setDurationMonths(Number(e.target.value))} />
                </div>
                <div>
                  <label className="font-bold block mb-1">Montant facturé (FCFA)</label>
                  <Input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>Annuler</Button>
                <Button type="submit" className="bg-primary">Enregistrer la bannière</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
