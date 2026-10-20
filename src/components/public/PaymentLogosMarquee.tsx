import React from 'react';

const paymentLogos = [
  { name: 'Airtel Money', file: '/payment-logos/airtel-money-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[88px]' },
  { name: 'MTN MoMo', file: '/payment-logos/mtn-momo-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[88px]' },
  { name: 'Orange Money', file: '/payment-logos/orange-money-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[62px]' },
  { name: 'Africell', file: '/payment-logos/africell.png', kind: 'image', hasWordmark: true },
  { name: 'Vodacom', file: '/payment-logos/vodacom-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[72px]' },
  { name: 'Wave', file: '/payment-logos/wave.png', kind: 'image', hasWordmark: true },
  { name: 'Visa', file: '/payment-logos/visa-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[70px]' },
  { name: 'Mastercard', file: '/payment-logos/mastercard-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[92px]' },
  { name: 'Free Money', file: '/payment-logos/free-money.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[88px]' },
  { name: 'AT Money', file: '/payment-logos/at-money-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[52px]' },
  { name: 'Telecel Cash', file: '/payment-logos/telecel-cash-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[92px]' },
  { name: 'TNM', file: '/payment-logos/tnm-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[56px]' },
  { name: 'Tigo', file: '/payment-logos/tigo-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[70px]' },
  { name: 'HaloPesa', file: '/payment-logos/halopesa-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[92px]' },
  { name: 'Moov Africa', file: '/payment-logos/moov-africa-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[88px]' },
  { name: 'Zamtel Mobile Money', file: '/payment-logos/zamtel-money-pdf.png', kind: 'image', hasWordmark: true, imageClass: 'max-h-7 max-w-[70px]' }
] as const;

export const PaymentLogosMarquee: React.FC = () => {
  const logos = [...paymentLogos, ...paymentLogos];
  return (
    <div className="w-full h-11 sm:h-12 rounded-2xl border border-border/80 bg-muted/30 overflow-hidden" aria-label="Moyens de paiement proposés selon le pays">
      <div className="flex h-full w-max items-center motion-safe:animate-[payment-marquee_28s_linear_infinite] motion-reduce:translate-x-0">
        {logos.map((logo, index) => (
          <div key={`${logo.name}-${index}`} className="mx-2 flex h-8 min-w-[112px] items-center justify-center gap-2 rounded-lg bg-white px-2 shadow-xs dark:bg-slate-950" title={`${logo.name} — disponibilité selon le pays`}>
            <img src={logo.file} alt="" aria-hidden="true" className={`${'imageClass' in logo ? logo.imageClass : 'max-h-5 max-w-[38px]'} shrink-0 object-contain`} loading="lazy" onError={event => { event.currentTarget.style.display = 'none'; }} />
            {!('hasWordmark' in logo && logo.hasWordmark) && <span className="whitespace-nowrap text-[10px] font-extrabold leading-none text-slate-700 dark:text-slate-200">{logo.name}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};
