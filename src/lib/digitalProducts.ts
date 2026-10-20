export function isValidMerchantUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return (url.protocol === 'https:' || url.protocol === 'http:')
      && !url.username
      && !url.password
      && Boolean(url.hostname)
      && !/[\r\n]/.test(value);
  } catch {
    return false;
  }
}

export function normalizeMerchantUrl(value: string): string | null {
  const normalized = value.trim();
  return isValidMerchantUrl(normalized) ? normalized : null;
}
