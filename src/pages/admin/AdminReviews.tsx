import React, { useState, useEffect } from 'react';
import { zandoApi } from '@/services/zandoApi';
import type { ProductReview } from '@/types/zando';
import {
  MessageSquare,
  Trash2,
  Search,
  Star,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Filter,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

export const AdminReviews: React.FC = () => {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const data = await zandoApi.getAllProductReviews();
      setReviews(data);
    } catch (e) {
      console.error('Failed to load reviews:', e);
      toast.error('Erreur lors du chargement des avis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const ok = await zandoApi.deleteProductReview(deletingId);
      if (ok) {
        setReviews(prev => prev.filter(r => r.id !== deletingId));
        toast.success('Avis supprimé avec succès.');
      } else {
        toast.error('Impossible de supprimer cet avis.');
      }
    } catch (e) {
      toast.error('Erreur lors de la suppression.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredReviews = reviews.filter(r => {
    const matchesSearch =
      r.author_name.toLowerCase().includes(search.toLowerCase()) ||
      r.comment.toLowerCase().includes(search.toLowerCase()) ||
      (r.products?.title && r.products.title.toLowerCase().includes(search.toLowerCase()));

    const matchesRating = ratingFilter === 'all' || r.rating.toString() === ratingFilter;

    return matchesSearch && matchesRating;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground">
              Modération des Avis Clients
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Consultez tous les avis déposés sur les fiches produits et supprimez les avis inappropriés.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadReviews}
          disabled={loading}
          className="gap-2 text-xs font-semibold"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualiser</span>
        </Button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-2xl bg-card border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par auteur, produit ou mot-clé..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs rounded-xl bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Note :</span>
          </span>
          <select
            value={ratingFilter}
            onChange={e => setRatingFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input bg-background text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="all">Toutes les notes</option>
            <option value="5">5 étoiles ★★★★★</option>
            <option value="4">4 étoiles ★★★★</option>
            <option value="3">3 étoiles ★★★</option>
            <option value="2">2 étoiles ★★</option>
            <option value="1">1 étoile ★</option>
          </select>
        </div>
      </div>

      {/* Reviews Table / Grid */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">
          Chargement des avis...
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed bg-card/50 space-y-2">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
          <h3 className="font-bold text-sm text-foreground">Aucun avis trouvé</h3>
          <p className="text-xs text-muted-foreground">
            {search ? 'Aucun avis ne correspond à vos filtres.' : 'Aucun avis n\'a encore été publié par les utilisateurs.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredReviews.map(rev => (
            <div
              key={rev.id}
              className="p-5 rounded-2xl bg-card border shadow-xs flex flex-col justify-between space-y-4 hover:border-primary/40 transition-colors"
            >
              {/* Top row: Author & Rating */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                      {rev.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-foreground block">
                        {rev.author_name}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(rev.created_at).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className={`w-3 h-3 ${s <= rev.rating ? 'fill-amber-500' : 'text-muted-foreground/30'}`}
                      />
                    ))}
                    <span className="text-[11px] font-bold ml-1">{rev.rating}/5</span>
                  </div>
                </div>

                {/* Comment Content */}
                <p className="text-xs sm:text-sm text-foreground/90 bg-muted/30 p-3 rounded-xl border border-border/50 leading-relaxed">
                  "{rev.comment}"
                </p>
              </div>

              {/* Bottom row: Related Product & Actions */}
              <div className="pt-3 border-t flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {rev.products?.photos?.[0] && (
                    <img
                      src={rev.products.photos[0]}
                      alt="Produit"
                      className="w-8 h-8 rounded-md object-cover bg-muted shrink-0"
                    />
                  )}
                  <span className="text-xs font-semibold text-muted-foreground truncate">
                    {rev.products?.title || `Produit #${rev.product_id.slice(0, 8)}`}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href={`/produit/${rev.product_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Voir l'annonce"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeletingId(rev.id)}
                    className="h-8 px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 text-xs font-bold"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent className="max-w-[calc(100%-2rem)] md:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Confirmer la suppression de l'avis
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Êtes-vous sûr de vouloir supprimer définitivement cet avis client ? Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold"
            >
              Supprimer l'avis
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
