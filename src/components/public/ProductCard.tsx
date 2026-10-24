import React from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@/types/zando';
import { useZando } from '@/contexts/ZandoContext';
import { zandoApi } from '@/services/zandoApi';
import { Heart, Clock, Eye } from 'lucide-react';
import { CountryFlag } from '@/components/common/CountryFlag';

interface ProductCardProps {
  product: Product;
  variant?: 'popular' | 'latest';
  onProductClick?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'latest',
  onProductClick
}) => {
  const { toggleFavorite, isFavorite, selectedCountry, formatPrice } = useZando();
  const favorited = isFavorite(product.id);

  const isLocal = !selectedCountry || product.country_id === selectedCountry.id;

  const mainPhoto = product.photos?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';

  // Format price
  const formattedPrice = formatPrice(product.price, product.currency);

  // Compute remaining days
  const remainingDays = Math.max(
    1,
    Math.ceil((new Date(product.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
  );

  const handleCardClick = () => {
    zandoApi.incrementProductViews(product.id);
    zandoApi.trackEvent({
      event_type: 'product_view',
      item_id: product.id,
      country_code: product.country_id,
      city: product.city
    });
    if (onProductClick) {
      onProductClick(product);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group bg-card rounded-2xl border border-border/80 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col cursor-pointer"
    >
      {/* Image Container with Badges */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted">
        {/* Image */}
        <img
          src={mainPhoto}
          alt={product.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />

        {/* Badge d'origine (75% Local / 25% Étranger) */}
        <div className="absolute top-2.5 left-2.5 z-10">
          {isLocal ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-700/90 text-white text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-xs">
              <span>📍 Produit Local</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-700/90 text-white text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-xs">
              <span>🌍 {product.countries?.name || 'Étranger'}</span>
            </span>
          )}
        </div>

        {/* Favorite Heart Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(product.id);
          }}
          className={`absolute top-2.5 right-2.5 p-2 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
            favorited ? 'bg-rose-50 text-rose-600' : 'bg-black/30 hover:bg-black/50 text-white'
          }`}
          aria-label="Ajouter aux favoris"
        >
          <Heart className={`w-4 h-4 ${favorited ? 'fill-rose-600' : ''}`} />
        </button>

        {/* Top left / Bottom badges matching Image 1: "22 jours restants", "4 vues" */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-xs">
            <Clock className="w-3 h-3 text-amber-400" />
            <span>{remainingDays} {remainingDays > 1 ? 'jours restants' : 'jour restant'}</span>
          </span>

          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-xs">
            <Eye className="w-3 h-3 text-emerald-400" />
            <span>{product.views_count} {product.views_count > 1 ? 'vues' : 'vue'}</span>
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-1">
          {/* Country flag and city */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            {product.countries?.id ? <CountryFlag countryId={product.countries.id} /> : <span aria-hidden="true">🌍</span>}
            <span className="truncate">
              {product.countries?.name || 'Afrique'} • {product.city}
            </span>
          </div>

          {/* Product Title */}
          <h3 className="font-bold text-sm sm:text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {product.title}
          </h3>

          {/* Price */}
          <div className="text-base sm:text-lg font-extrabold text-rose-600">
            {formattedPrice}
          </div>

          {/* Short description */}
          {product.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 pt-0.5">
              {product.description}
            </p>
          )}
        </div>

        {/* One entry point from the home feed to the full product interface. */}
        <Link
          to={`/produit/${product.id}`}
          onClick={(e) => e.stopPropagation()}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-xs active:scale-98 min-w-0"
        >
          <Eye className="w-4 h-4 shrink-0" />
          <span className="truncate">Consulter maintenant</span>
        </Link>
      </div>
    </div>
  );
};
