export function countryCodeToFlag(code: string | null | undefined): string {
  const normalized = String(code || '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return '🌍';
  return String.fromCodePoint(...normalized.split('').map(letter => 127397 + letter.charCodeAt(0)));
}
