function addHttpsIfMissing(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || /[\r\n]/.test(trimmed)) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) {
    return /^https?:\/\//i.test(trimmed) ? trimmed : null;
  }
  return `https://${trimmed}`;
}

export function normalizeMerchantUrl(value: string): string | null {
  const candidate = addHttpsIfMissing(value);
  if (!candidate) return null;
  if (/^https?:\/\/.*https?:\/\//i.test(candidate)) return null;
  try {
    const url = new URL(candidate);
    if ((url.protocol !== 'https:' && url.protocol !== 'http:') || url.username || url.password || !url.hostname) return null;
    return candidate;
  } catch {
    return null;
  }
}

export function isValidMerchantUrl(value: string): boolean {
  return normalizeMerchantUrl(value) !== null;
}
