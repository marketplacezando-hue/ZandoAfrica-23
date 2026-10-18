import React from 'react';
import type { Category } from '@/types/zando';
import {
  LayoutGrid,
  Smartphone,
  Laptop,
  Shirt,
  Tv,
  Gamepad2,
  Car,
  Home,
  Briefcase
} from 'lucide-react';

interface CategoryFilterBarProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory
}) => {
  const getIcon = (iconName: string) => {
    switch (iconName.toLowerCase()) {
      case 'smartphone':
        return <Smartphone className="w-4 h-4" />;
      case 'laptop':
        return <Laptop className="w-4 h-4" />;
      case 'shirt':
        return <Shirt className="w-4 h-4" />;
      case 'tv':
        return <Tv className="w-4 h-4" />;
      case 'gamepad2':
        return <Gamepad2 className="w-4 h-4" />;
      case 'car':
        return <Car className="w-4 h-4" />;
      case 'home':
        return <Home className="w-4 h-4" />;
      case 'briefcase':
        return <Briefcase className="w-4 h-4" />;
      default:
        return <LayoutGrid className="w-4 h-4" />;
    }
  };

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-2">
      <div className="flex items-center gap-2 min-w-max pb-1">
        {/* "Toutes les catégories" pill */}
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            selectedCategoryId === 'all'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-card border border-border text-foreground hover:bg-muted/80'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Toutes les catégories</span>
        </button>

        {/* Dynamic Categories */}
        {categories.map(cat => {
          const isSelected = selectedCategoryId === cat.id;
          return (
            <button
              type="button"
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm font-semibold'
                  : 'bg-card border border-border text-foreground hover:bg-muted/80'
              }`}
            >
              {getIcon(cat.icon)}
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
