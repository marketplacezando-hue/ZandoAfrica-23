import React, { useState, useEffect } from 'react';
import { zandoApi } from '@/services/zandoApi';
import { supabase } from '@/db/supabase';
import type { Product, Category, Country } from '@/types/zando';
import { Package, Search, Filter, Trash2, RotateCcw, Eye, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Flame, Pencil, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { CountrySelect } from '@/components/common/CountrySelect';
import { CountryFlag } from '@/components/common/CountryFlag';
import { useZando } from '@/contexts/ZandoContext';
import { validateImageFile } from '@/lib/imageValidation';

type DigitalBookSummary = {
  product_id: string;
  digital_book_id: string;
  page_count: number;
  byte_size: number;
  status: string;
  completed_count: number;
  pending_count: number;
};

export const AdminProducts: React.FC = () => {
  const { adminUserEmail } = useZando();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [digitalBookSummaries, setDigitalBookSummaries] = useState<Record<string, DigitalBookSummary>>({});
  const [digitalBookSummaryError, setDigitalBookSummaryError] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Filters
  const [currentTab, setCurrentTab] = useState<'published' | 'suspended' | 'trashed'>('published');
  const [search, setSearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const loadProducts = async () => {
    setLoading(true);
    try {
      const [prods, cats, cntrs] = await Promise.all([
        zandoApi.getProducts({
          status: currentTab,
          countryId: selectedCountry !== 'ALL' ? selectedCountry : undefined,
          categoryId: selectedCategory !== 'all' ? selectedCategory : undefined,
          search: search || undefined
        }),
        zandoApi.getCategories(),
        zandoApi.getCountries()
      ]);

      setProducts(prods);
      setCategories(cats);
      setCountries(cntrs);
      const digitalProductIds = prods.filter(product => product.category_id === 'digital-products').map(product => product.id).slice(0, 500);
      if (digitalProductIds.length) {
        const { data, error } = await supabase.rpc('admin_list_digital_book_summaries', { p_product_ids: digitalProductIds });
        setDigitalBookSummaryError(Boolean(error));
        setDigitalBookSummaries(Object.fromEntries(((data || []) as DigitalBookSummary[]).map(summary => [summary.product_id, summary])));
      } else {
        setDigitalBookSummaryError(false);
        setDigitalBookSummaries({});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!editPhotoPreview.startsWith('blob:')) return;
    return () => URL.revokeObjectURL(editPhotoPreview);
  }, [editPhotoPreview]);

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setEditTitle(product.title);
    setEditDescription(product.description || '');
    setEditPhotoFile(null);
    setEditPhotoPreview(product.photos?.[0] || '');
  };

  const handleEditPhotoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const error = await validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    setEditPhotoFile(file);
    setEditPhotoPreview(URL.createObjectURL(file));
  };

  const saveProductChanges = async () => {
    if (!editingProduct) return;
    const title = editTitle.trim();
    const description = editDescription.trim();
    if (title.length < 2 || title.length > 160) {
      toast.error('Le titre doit contenir entre 2 et 160 caractères.');
      return;
    }
    if (description.length > 10000) {
      toast.error('La description ne peut pas dépasser 10 000 caractères.');
      return;
    }

    setSavingEdit(true);
    try {
      let photos = editingProduct.photos || [];
      if (editPhotoFile) {
        const upload = await zandoApi.uploadMedia(editPhotoFile, 'products');
        if (!upload.url) {
          toast.error(upload.error || 'La nouvelle photo n’a pas pu être téléversée.');
          return;
        }
        photos = photos.length ? [upload.url, ...photos.slice(1)] : [upload.url];
      }

      const changedFields = [
        ...(title !== editingProduct.title ? ['title'] : []),
        ...(description !== (editingProduct.description || '') ? ['description'] : []),
        ...(editPhotoFile ? ['main_photo'] : [])
      ];
      if (!changedFields.length) {
        setEditingProduct(null);
        return;
      }

      const updates: Partial<Product> = { title, description: description || null };
      if (editPhotoFile) updates.photos = photos;
      const saved = await zandoApi.updateProduct(editingProduct.id, updates);
      if (!saved) {
        toast.error('Enregistrement refusé ou impossible. L’annonce existante n’a pas été modifiée.');
        return;
      }

      await zandoApi.logAdminAction(adminUserEmail || '', 'update_product', 'product', editingProduct.id, { changed_fields: changedFields });
      toast.success('Annonce mise à jour avec succès.');
      setEditingProduct(null);
      setEditPhotoFile(null);
      setEditPhotoPreview('');
      await loadProducts();
    } catch {
      toast.error('Une erreur est survenue. Les changements de cette annonce n’ont pas été confirmés.');
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [currentTab, selectedCountry, selectedCategory, search]);

  const handleToggleSuspend = async (product: Product) => {
    const newStatus = product.status === 'suspended' ? 'published' : 'suspended';
    const ok = await zandoApi.updateProduct(product.id, { status: newStatus });
    if (ok) {
      toast.success(newStatus === 'suspended' ? 'Annonce suspendue.' : 'Annonce réactivée.');
      loadProducts();
    } else {
      toast.error('Erreur lors de la modification.');
    }
  };

  const handleTogglePopular = async (product: Product) => {
    const ok = await zandoApi.updateProduct(product.id, { is_popular: !product.is_popular });
    if (ok) {
      toast.success(!product.is_popular ? 'Marquée comme populaire !' : 'Retirée des populaires.');
      loadProducts();
    }
  };

  const handleSendToTrash = async (id: string) => {
    if (!window.confirm('Voulez-vous déplacer cette annonce vers la corbeille ?')) return;
    const ok = await zandoApi.softDeleteProduct(id);
    if (ok) {
      toast.success('Annonce déplacée vers la corbeille.');
      loadProducts();
    }
  };

  const handleRestore = async (id: string) => {
    const ok = await zandoApi.restoreProduct(id);
    if (ok) {
      toast.success('Annonce restaurée.');
      loadProducts();
    }
  };

  const handleDeletePermanent = async (id: string) => {
    if (!window.confirm('Action irréversible : supprimer définitivement cette annonce ?')) return;
    const ok = await zandoApi.deleteProductPermanently(id);
    if (ok) {
      toast.success('Annonce supprimée définitivement.');
      loadProducts();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Gestion des Produits & Modération</h1>
          <p className="text-xs text-muted-foreground">
            Contrôlez les annonces en ligne, suspendez les contenus frauduleux et gérez la corbeille.
          </p>
        </div>
      </div>

      {/* Tabs: Actives / Suspendues / Corbeille */}
      <div className="flex items-center gap-2 border-b">
        <button
          type="button"
          onClick={() => setCurrentTab('published')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            currentTab === 'published' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Annonces Actives
        </button>
        <button
          type="button"
          onClick={() => setCurrentTab('suspended')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            currentTab === 'suspended' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Suspendues
        </button>
        <button
          type="button"
          onClick={() => setCurrentTab('trashed')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            currentTab === 'trashed' ? 'border-rose-600 text-rose-600' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Corbeille (Supprimées)
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par titre, ville..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl text-xs"
          />
        </div>

        <CountrySelect
          countries={countries}
          value={selectedCountry}
          onValueChange={setSelectedCountry}
          includeAll
          className="h-10 rounded-xl bg-card text-xs"
          aria-label="Filtrer par pays"
        />

        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="h-10 px-3 rounded-xl border border-input bg-card text-xs text-foreground focus:outline-none"
        >
          <option value="all">Toutes les catégories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Products Table */}
      {digitalBookSummaryError && products.some(product => product.category_id === 'digital-products') && (
        <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Les détails privés des livres numériques ne sont pas disponibles. Vérifiez les migrations digitales et les droits administrateur.
        </p>
      )}
      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
              <tr>
                <th className="p-3.5 whitespace-nowrap">Produit</th>
                <th className="p-3.5 whitespace-nowrap">Vendeur & Contact</th>
                <th className="p-3.5 whitespace-nowrap">Pays / Ville</th>
                <th className="p-3.5 whitespace-nowrap">Prix</th>
                <th className="p-3.5 whitespace-nowrap">Statistiques</th>
                <th className="p-3.5 whitespace-nowrap">Expiration</th>
                <th className="p-3.5 whitespace-nowrap text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Chargement des données...
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map(p => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    {/* Produit */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.photos?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150'}
                          alt={p.title}
                          className="w-10 h-10 rounded-lg object-cover bg-muted shrink-0"
                        />
                        <div className="min-w-0 max-w-[200px]">
                          <div className="font-bold text-foreground truncate">{p.title}</div>
                          <div className="text-[10px] text-muted-foreground truncate">{p.categories?.name}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span>Publié le {new Date(p.published_at || p.created_at).toLocaleDateString('fr-FR')}</span>
                            <span className={`rounded-full px-1.5 py-0.5 font-semibold ${p.status === 'published' ? 'bg-emerald-100 text-emerald-700' : p.status === 'suspended' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                              {({ published: 'Publié', pending_payment: 'Paiement en attente', expired: 'Expirée', suspended: 'Suspendue', trashed: 'Corbeille' })[p.status]}
                            </span>
                          </div>
                          {p.category_id === 'digital-products' && digitalBookSummaries[p.id] && (
                            <div className="mt-1 space-y-0.5 text-[10px] text-muted-foreground">
                              <div>{digitalBookSummaries[p.id].page_count} pages · {(digitalBookSummaries[p.id].byte_size / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} Mio · {digitalBookSummaries[p.id].status}</div>
                              <div>{digitalBookSummaries[p.id].completed_count} accès confirmés · {digitalBookSummaries[p.id].pending_count} paiements en attente</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Vendeur */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-semibold text-foreground">{p.seller_name}</div>
                      <div className="text-[11px] text-muted-foreground">{p.seller_phone}</div>
                    </td>

                    {/* Pays / Ville */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {p.countries?.id ? <CountryFlag countryId={p.countries.id} /> : <span aria-hidden="true">🌍</span>}
                        <span className="font-medium text-foreground">{p.city}</span>
                      </div>
                    </td>

                    {/* Prix */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-extrabold text-rose-600">
                        {new Intl.NumberFormat('fr-FR').format(p.price)} {p.currency}
                      </div>
                    </td>

                    {/* Stats */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="text-[11px] text-muted-foreground space-y-0.5">
                        <div>👁️ {p.views_count} vues</div>
                        <div>💬 {p.whatsapp_clicks_count} WhatsApp • 📞 {p.calls_count} appels</div>
                      </div>
                    </td>

                    {/* Expiration */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.expires_at).toLocaleDateString('fr-FR')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 whitespace-nowrap text-right space-x-1">
                      {currentTab !== 'trashed' ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openEditDialog(p)}
                            className="h-8 gap-1.5 px-2 text-[11px]"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Modifier l’annonce</span>
                          </Button>

                          {/* Toggle Popular */}
                          <button
                            type="button"
                            onClick={() => handleTogglePopular(p)}
                            title={p.is_popular ? 'Retirer des populaires' : 'Mettre en populaire'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              p.is_popular ? 'bg-orange-100 text-orange-600 border-orange-200' : 'text-muted-foreground hover:bg-muted'
                            }`}
                          >
                            <Flame className="w-3.5 h-3.5" />
                          </button>

                          {/* Suspend / Activate */}
                          <button
                            type="button"
                            onClick={() => handleToggleSuspend(p)}
                            title={p.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              p.status === 'suspended' ? 'bg-emerald-100 text-emerald-700' : 'text-amber-600 hover:bg-amber-50'
                            }`}
                          >
                            {p.status === 'suspended' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          </button>

                          {/* Soft Delete to Trash */}
                          <button
                            type="button"
                            onClick={() => handleSendToTrash(p.id)}
                            title="Envoyer dans la corbeille"
                            className="p-1.5 rounded-lg border text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          {/* Restore */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRestore(p.id)}
                            className="h-7 px-2 text-[11px] gap-1 text-emerald-600"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restaurer</span>
                          </Button>

                          {/* Delete permanently */}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeletePermanent(p.id)}
                            className="h-7 px-2 text-[11px] gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Supprimer</span>
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Aucun produit trouvé dans cette section.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={Boolean(editingProduct)} onOpenChange={open => { if (!open && !savingEdit) setEditingProduct(null); }}>
        <DialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-2xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Modifier l’annonce</DialogTitle>
            <DialogDescription>
              Corrige le titre, la description ou la photo principale. L’identifiant, le vendeur, le paiement, les avis et les dates d’origine sont conservés.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="admin-product-title" className="text-sm font-semibold">Titre de l’annonce</label>
              <Input id="admin-product-title" value={editTitle} onChange={event => setEditTitle(event.target.value)} maxLength={160} className="h-11" />
              <p className="text-xs text-muted-foreground">Entre 2 et 160 caractères.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="admin-product-description" className="text-sm font-semibold">Description</label>
              <Textarea id="admin-product-description" value={editDescription} onChange={event => setEditDescription(event.target.value)} maxLength={10000} rows={6} className="resize-y" />
              <p className="text-xs text-muted-foreground">{editDescription.length}/10 000 caractères.</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Photo principale</p>
              <div className="flex flex-wrap items-center gap-3">
                {editPhotoPreview ? (
                  <img src={editPhotoPreview} alt="Aperçu de la photo principale" className="h-24 w-24 rounded-xl border border-border bg-muted object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-muted-foreground">
                    <ImagePlus className="h-7 w-7" aria-hidden="true" />
                  </div>
                )}
                <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
                  <ImagePlus className="h-4 w-4" />
                  Remplacer la photo
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={handleEditPhotoSelect} className="sr-only" />
                </label>
              </div>
              {editPhotoFile && (
                <p className="text-xs text-muted-foreground">
                  {editPhotoFile.name} · {(editPhotoFile.size / (1024 * 1024)).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Mio · aperçu non enregistré
                </p>
              )}
              <p className="text-xs text-muted-foreground">JPG/JPEG, PNG, WebP, GIF ou AVIF · 2 Mo maximum. L’ancienne photo n’est pas supprimée automatiquement.</p>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" disabled={savingEdit} onClick={() => setEditingProduct(null)}>Annuler</Button>
              <Button type="button" disabled={savingEdit} onClick={saveProductChanges}>
                {savingEdit ? 'Enregistrement…' : 'Enregistrer les changements'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
