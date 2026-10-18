import React, { useState, useEffect } from 'react';
import { zandoApi } from '@/services/zandoApi';
import type { Product, Category, Country } from '@/types/zando';
import {
  Package,
  Search,
  Filter,
  Trash2,
  RotateCcw,
  Eye,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Flame
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export const AdminProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

        <select
          value={selectedCountry}
          onChange={e => setSelectedCountry(e.target.value)}
          className="h-10 px-3 rounded-xl border border-input bg-card text-xs text-foreground focus:outline-none"
        >
          <option value="ALL">Tous les pays</option>
          {countries.map(c => (
            <option key={c.id} value={c.id}>{c.flag_emoji} {c.name}</option>
          ))}
        </select>

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
                        <span>{p.countries?.flag_emoji || '🌍'}</span>
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
    </div>
  );
};
