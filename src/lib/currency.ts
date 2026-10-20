export type DisplayCurrency = 'FCFA' | 'CDF' | 'EUR' | 'USD';
export const DISPLAY_CURRENCIES: DisplayCurrency[] = ['FCFA', 'CDF', 'EUR', 'USD'];

export type ExchangeRates = {
  base: 'USD';
  rates: Record<string, number>;
  fetchedAt: number;
};

const CACHE_KEY = 'zando_exchange_rates_v1';
const RATE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CURRENCY_ALIASES: Record<string, DisplayCurrency> = {
  XAF: 'FCFA',
  XOF: 'FCFA',
  FCFA: 'FCFA',
  CDF: 'CDF',
  EUR: 'EUR',
  USD: 'USD'
};

export function normalizeCurrency(value: string | null | undefined): DisplayCurrency | null {
  return CURRENCY_ALIASES[String(value || '').trim().toUpperCase()] || null;
}

export function currencyLabel(currency: DisplayCurrency): string {
  return currency === 'FCFA' ? 'FCFA' : currency;
}

export function currencyFractionDigits(currency: DisplayCurrency): number {
  return currency === 'EUR' || currency === 'USD' ? 2 : 0;
}

export function readCachedExchangeRates(): ExchangeRates | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExchangeRates;
    if (parsed.base !== 'USD' || !Number.isFinite(parsed.fetchedAt) || Date.now() - parsed.fetchedAt > RATE_MAX_AGE_MS) return null;
    if (!parsed.rates || !Number.isFinite(parsed.rates.EUR) || !Number.isFinite(parsed.rates.CDF) || !Number.isFinite(parsed.rates.XAF) || !Number.isFinite(parsed.rates.XOF)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function fetchExchangeRates(signal?: AbortSignal): Promise<ExchangeRates> {
  const response = await fetch('https://open.er-api.com/v6/latest/USD', { signal });
  if (!response.ok) throw new Error(`exchange_rates_http_${response.status}`);
  const payload = await response.json() as { result?: string; rates?: Record<string, number> };
  const rates = payload.rates;
  if (payload.result !== 'success' || !rates || !['EUR', 'CDF', 'XAF', 'XOF'].every(code => Number.isFinite(rates[code]))) {
    throw new Error('exchange_rates_incomplete');
  }
  const result: ExchangeRates = { base: 'USD', rates, fetchedAt: Date.now() };
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(result)); } catch { /* cache facultatif */ }
  return result;
}

export function convertFromOriginal(amount: number, source: string, target: DisplayCurrency, rates: ExchangeRates): number | null {
  const sourceCurrency = normalizeCurrency(source);
  if (!sourceCurrency || !Number.isFinite(amount) || amount < 0) return null;
  if (sourceCurrency === target) return amount;
  const sourceRate = rates.rates[sourceCurrency === 'FCFA' ? 'XAF' : sourceCurrency];
  const targetRate = rates.rates[target === 'FCFA' ? 'XAF' : target];
  if (!Number.isFinite(sourceRate) || !Number.isFinite(targetRate) || sourceRate <= 0 || targetRate <= 0) return null;
  return amount / sourceRate * targetRate;
}

export function formatConvertedPrice(amount: number, source: string, target: DisplayCurrency, rates: ExchangeRates | null): string {
  const converted = rates ? convertFromOriginal(amount, source, target, rates) : null;
  const value = converted ?? amount;
  const currency = converted === null ? (normalizeCurrency(source) || target) : target;
  return `${new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: currencyFractionDigits(currency),
    maximumFractionDigits: currencyFractionDigits(currency)
  }).format(value)} ${currencyLabel(currency)}`;
}
