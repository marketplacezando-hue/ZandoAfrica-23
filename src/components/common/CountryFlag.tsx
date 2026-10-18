import React from 'react';

interface CountryFlagProps {
  countryId: string;
  className?: string;
}

const FlagArtwork: React.FC<{ countryId: string }> = ({ countryId }) => {
  switch (countryId.toUpperCase()) {
    case 'CG':
      return <><rect width="30" height="20" fill="#009543" /><path d="M30 0v20H0z" fill="#DC241F" /><path d="M0 14.5V20h4.5L30 5.5V0h-4.5z" fill="#FBDE4A" /></>;
    case 'CD':
      return <><rect width="30" height="20" fill="#007FFF" /><path d="M0 15.5 23.5 0H30L6.5 20H0z" fill="#F7D618" /><path d="M0 14 21.5 0H27L5.5 20H0z" fill="#CE1021" /><path d="m6 2.2 1.05 2.15 2.37.34-1.71 1.67.4 2.36L6 7.6l-2.11 1.12.4-2.36L2.58 4.69l2.37-.34z" fill="#F7D618" /></>;
    case 'CI':
      return <><rect width="10" height="20" fill="#F77F00" /><rect x="10" width="10" height="20" fill="#FFF" /><rect x="20" width="10" height="20" fill="#009E60" /></>;
    case 'SN':
      return <><rect width="10" height="20" fill="#00853F" /><rect x="10" width="10" height="20" fill="#FDEF42" /><rect x="20" width="10" height="20" fill="#E31B23" /><path d="m15 6 1.18 2.43 2.68.39-1.93 1.88.46 2.67L15 12.11l-2.39 1.26.46-2.67-1.93-1.88 2.68-.39z" fill="#00853F" /></>;
    case 'BJ':
      return <><rect width="12" height="20" fill="#008751" /><rect x="12" width="18" height="10" fill="#FCD116" /><rect x="12" y="10" width="18" height="10" fill="#E8112D" /></>;
    case 'CM':
      return <><rect width="10" height="20" fill="#007A5E" /><rect x="10" width="10" height="20" fill="#CE1126" /><rect x="20" width="10" height="20" fill="#FCD116" /><path d="m15 6 1.18 2.43 2.68.39-1.93 1.88.46 2.67L15 12.11l-2.39 1.26.46-2.67-1.93-1.88 2.68-.39z" fill="#FCD116" /></>;
    case 'BF':
      return <><rect width="30" height="10" fill="#EF2B2D" /><rect y="10" width="30" height="10" fill="#009E49" /><path d="m15 5 1.65 3.35 3.7.54-2.68 2.61.63 3.69L15 13.45l-3.3 1.74.63-3.69-2.68-2.61 3.7-.54z" fill="#FCD116" /></>;
    case 'ML':
      return <><rect width="10" height="20" fill="#14B53A" /><rect x="10" width="10" height="20" fill="#FCD116" /><rect x="20" width="10" height="20" fill="#CE1126" /></>;
    default:
      return <><rect width="30" height="20" fill="#E5E7EB" /><circle cx="15" cy="10" r="7" fill="#9CA3AF" /><path d="M12 10h6M15 7v6" stroke="#fff" strokeWidth="1.5" /></>;
  }
};

export const CountryFlag: React.FC<CountryFlagProps> = ({ countryId, className = '' }) => (
  <svg
    viewBox="0 0 30 20"
    className={`inline-block h-4 w-6 shrink-0 overflow-hidden rounded-[2px] ring-1 ring-black/10 ${className}`}
    aria-hidden="true"
    focusable="false"
  >
    <FlagArtwork countryId={countryId} />
  </svg>
);
