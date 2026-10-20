import { describe, expect, it } from 'vitest';
import { convertFromOriginal, formatConvertedPrice, normalizeCurrency, type ExchangeRates } from './currency';

const rates: ExchangeRates = {
  base: 'USD',
  fetchedAt: Date.now(),
  rates: { USD: 1, EUR: 0.9, CDF: 2800, XAF: 600, XOF: 600 }
};

describe('currency conversion', () => {
  it('converts directly from the original currency without a cumulative conversion', () => {
    expect(convertFromOriginal(600, 'FCFA', 'USD', rates)).toBe(1);
    expect(convertFromOriginal(1, 'USD', 'CDF', rates)).toBe(2800);
    expect(convertFromOriginal(2800, 'CDF', 'FCFA', rates)).toBe(600);
  });

  it('uses FCFA as the display label for XOF and XAF', () => {
    expect(normalizeCurrency('XOF')).toBe('FCFA');
    expect(normalizeCurrency('XAF')).toBe('FCFA');
    expect(formatConvertedPrice(600, 'XOF', 'USD', rates)).toBe('1,00 USD');
  });

  it('does not claim a conversion when the rate set is unavailable', () => {
    expect(formatConvertedPrice(1500, 'CDF', 'EUR', null)).toBe('1 500 CDF');
  });
});
