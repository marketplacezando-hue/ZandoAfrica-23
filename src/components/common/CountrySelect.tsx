import React from 'react';
import type { Country } from '@/types/zando';
import { CountryFlag } from '@/components/common/CountryFlag';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CountrySelectProps {
  countries: Country[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  includeAll?: boolean;
  allLabel?: string;
  'aria-label'?: string;
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  countries,
  value,
  onValueChange,
  className,
  placeholder = 'Sélectionner un pays',
  includeAll = false,
  allLabel = 'Tous les pays',
  'aria-label': ariaLabel = 'Sélectionner un pays'
}) => (
  <Select value={value} onValueChange={onValueChange}>
    <SelectTrigger aria-label={ariaLabel} className={className}>
      <SelectValue placeholder={placeholder} />
    </SelectTrigger>
    <SelectContent>
      {includeAll && <SelectItem value="ALL">{allLabel}</SelectItem>}
      {countries.map(country => (
        <SelectItem key={country.id} value={country.id}>
          <span className="flex items-center gap-2">
            <CountryFlag countryId={country.id} />
            <span>{country.name}</span>
            <span className="text-muted-foreground">({country.dial_code})</span>
          </span>
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
