const SHORT_ID_PATTERN = /^[A-Za-z0-9_-]{20,24}$/;

/** Encode un UUID en identifiant URL-safe de 22 caractères environ. */
export function toShortProductId(productId: string): string {
  try {
    const bytes = productId.replace(/-/g, '').match(/.{1,2}/g)?.map(pair => Number.parseInt(pair, 16));
    if (!bytes || bytes.length !== 16 || bytes.some(byte => Number.isNaN(byte))) return productId;
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  } catch {
    return productId;
  }
}

/** Accepte les nouveaux identifiants courts et les anciens UUID afin de préserver les liens existants. */
export function fromProductRouteId(routeId: string): string {
  if (!SHORT_ID_PATTERN.test(routeId)) return routeId;
  try {
    const binary = atob(routeId.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - routeId.length % 4) % 4));
    if (binary.length !== 16) return routeId;
    const hex = Array.from(binary, char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return routeId;
  }
}

export function shortProductPath(productId: string): string {
  return `/p/${toShortProductId(productId)}`;
}
