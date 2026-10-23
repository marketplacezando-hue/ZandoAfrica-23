import React from 'react';
import type { Category } from '@/types/zando';
import {
  Briefcase,
  Car,
  Gamepad2,
  Home,
  Laptop,
  LayoutGrid,
  Shirt,
  Smartphone,
  Tv,
  type LucideIcon
} from 'lucide-react';

interface CategoryFilterBarProps {
  categories: Category[];
  selectedCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

const CATEGORY_STYLES = [
  { background: 'bg-orange-500', soft: 'bg-orange-50', icon: Smartphone },
  { background: 'bg-emerald-500', soft: 'bg-emerald-50', icon: Laptop },
  { background: 'bg-blue-600', soft: 'bg-blue-50', icon: Home },
  { background: 'bg-purple-600', soft: 'bg-purple-50', icon: Shirt },
  { background: 'bg-pink-600', soft: 'bg-pink-50', icon: Car },
  { background: 'bg-amber-500', soft: 'bg-amber-50', icon: Tv },
  { background: 'bg-teal-600', soft: 'bg-teal-50', icon: LayoutGrid },
  { background: 'bg-indigo-600', soft: 'bg-indigo-50', icon: Briefcase }
];

const getIcon = (iconName: string): LucideIcon => {
  switch (iconName.toLowerCase()) {
    case 'smartphone': return Smartphone;
    case 'laptop': return Laptop;
    case 'shirt': return Shirt;
    case 'tv': return Tv;
    case 'gamepad2': return Gamepad2;
    case 'car': return Car;
    case 'home': return Home;
    case 'briefcase': return Briefcase;
    default: return LayoutGrid;
  }
};

const shortLabel = (name: string) => {
  const replacements: Record<string, string> = {
    'Téléphones & Tablettes': 'Téléphones\n& Tablettes',
    'Informatique & Ordinateurs': 'Informatique\n& Accessoires',
    'Mode & Chaussures': 'Mode\n& Beauté',
    'Véhicules & Auto': 'Véhicules\n& Motos',
    'Électroménager': 'Meubles\n& Électroménager',
    'Services & Autres': 'Autres\nCatégories'
  };
  return replacements[name] || name;
};

export const CategoryFilterBar: React.FC<CategoryFilterBarProps> = ({
  categories,
  selectedCategoryId,
  onSelectCategory
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white shadow-sm">
            <LayoutGrid className="h-5 w-5" aria-hidden="true" />
          </span>
          <h2 className="truncate text-xl font-black tracking-tight text-[#07533f] sm:text-2xl">
            Toutes les catégories
          </h2>
        </div>
        <button
          type="button"
          onClick={() => onSelectCategory('all')}
          className={`inline-flex shrink-0 items-center gap-2 rounded-full border-2 px-4 py-2 text-xs font-bold transition-colors sm:px-5 sm:text-sm ${
            selectedCategoryId === 'all'
              ? 'border-emerald-600 bg-emerald-600 text-white'
              : 'border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50'
          }`}
        >
          Voir tout
          <span aria-hidden="true">›</span>
        </button>
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2 no-scrollbar sm:justify-between sm:gap-4">
        {categories.map((category, index) => {
          const style = CATEGORY_STYLES[index % CATEGORY_STYLES.length];
          const Icon = getIcon(category.icon);
          const isSelected = selectedCategoryId === category.id;
          const label = shortLabel(category.name);

          return (
            <button
              type="button"
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              aria-pressed={isSelected}
              className={`group flex w-[82px] shrink-0 flex-col items-center gap-2 rounded-2xl px-1 py-1 text-center transition-transform active:scale-95 sm:w-[96px] ${isSelected ? 'scale-[1.04]' : ''}`}
            >
              <span className={`flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-md transition-shadow group-hover:shadow-lg sm:h-[72px] sm:w-[72px] ${style.background} ${isSelected ? 'ring-4 ring-emerald-200 ring-offset-2' : ''}`}>
                <Icon className="h-8 w-8" strokeWidth={2.2} aria-hidden="true" />
              </span>
              <span className={`whitespace-pre-line text-[11px] font-semibold leading-[1.15] sm:text-xs ${isSelected ? 'text-emerald-700' : 'text-slate-700'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
