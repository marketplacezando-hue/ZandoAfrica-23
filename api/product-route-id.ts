export function decodeProductRouteId(routeId: string): string {
  if (!/^[A-Za-z0-9_-]{20,24}$/.test(routeId)) return routeId;
  try {
    const normalized = routeId.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - routeId.length % 4) % 4);
    const binary = atob(normalized);
    if (binary.length !== 16) return routeId;
    const hex = Array.from(binary, (char: string) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return routeId;
  }
}

export function encodeProductRouteId(productId: string): string {
  try {
    const hex = productId.replace(/-/g, '');
    if (!/^[0-9a-f]{32}$/i.test(hex)) return productId;
    const binary = (hex.match(/.{2}/g) || []).map(pair => String.fromCharCode(Number.parseInt(pair, 16))).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return productId;
  }
}
