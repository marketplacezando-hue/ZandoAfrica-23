import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useZando } from '@/contexts/ZandoContext';
import { zandoApi } from '@/services/zandoApi';
import type { Product } from '@/types/zando';
import { ProductCard } from '@/components/public/ProductCard';
import { Heart, ArrowLeft, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const FavoritesPage: React.FC = () => {
  const { favorites } = useZando();
  const navigate = useNavigate();
  const [favoriteProducts, setFavoriteProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      if (favorites.length === 0) {
        setFavoriteProducts([]);
        setLoading(false);
        return;
      }

      try {
        const all = await zandoApi.getProducts();
        setFavoriteProducts(all.filter(p => favorites.includes(p.id)));
      } catch (e) {
        console.error('Error fetching favorites:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [favorites]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
            <h1 className="text-2xl font-extrabold text-foreground">Mes Favoris ({favorites.length})</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Consultez facilement les annonces que vous avez sauvegardées.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="aspect-4/3 bg-muted rounded-2xl" />
          ))}
        </div>
      ) : favoriteProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {favoriteProducts.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              variant="latest"
              onProductClick={() => navigate(`/produit/${p.id}`)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-2xl border border-dashed p-8 space-y-4">
          <Heart className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="font-bold text-base text-foreground">Aucun favori pour l'instant</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Cliquez sur le coeur sur n'importe quelle annonce pour la retrouver ici à tout moment.
          </p>
          <Button onClick={() => navigate('/')} className="rounded-full">
            Découvrir des annonces
          </Button>
        </div>
      )}
    </div>
  );
};
