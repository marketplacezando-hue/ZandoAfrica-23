import React from 'react';

const paymentLogos = [
  { name: 'Airtel Money', file: '/payment-logos/airtel.svg', kind: 'svg' },
  { name: 'MTN MoMo', file: '/payment-logos/mtn.png', kind: 'image' },
  { name: 'Orange Money', file: '/payment-logos/orange.svg', kind: 'svg' },
  { name: 'Africell', file: '/payment-logos/africell.png', kind: 'image' },
  { name: 'Vodacom', file: '/payment-logos/vodacom.png', kind: 'image' },
  { name: 'Wave', file: '/payment-logos/wave.png', kind: 'image' },
  { name: 'Visa', file: '/payment-logos/visa.svg', kind: 'svg' },
  { name: 'Mastercard', file: '/payment-logos/mastercard.svg', kind: 'svg' }
] as const;

export const PaymentLogosMarquee: React.FC = () => {
  const logos = [...paymentLogos, ...paymentLogos];
  return (
    <div className="w-full h-11 sm:h-12 rounded-2xl border border-border/80 bg-muted/30 overflow-hidden" aria-label="Moyens de paiement proposés selon le pays">
      <div className="flex h-full w-max items-center motion-safe:animate-[payment-marquee_28s_linear_infinite] motion-reduce:translate-x-0">
        {logos.map((logo, index) => (
          <div key={`${logo.name}-${index}`} className="mx-2 flex h-8 min-w-[112px] items-center justify-center gap-2 rounded-lg bg-white px-2 shadow-xs dark:bg-slate-950" title={`${logo.name} — disponibilité selon le pays`}>
            <img src={logo.file} alt="" aria-hidden="true" className="max-h-5 max-w-[38px] shrink-0 object-contain" loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />
            <span className="whitespace-nowrap text-[10px] font-extrabold leading-none text-slate-700 dark:text-slate-200">{logo.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
