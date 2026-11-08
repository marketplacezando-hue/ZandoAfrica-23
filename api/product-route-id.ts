function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4);
  const binary = atob(normalized);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function decodeProductRouteId(routeId: string): string {
  if (!/^[A-Za-z0-9_-]{20,24}$/.test(routeId)) return routeId;
  try {
    const bytes = decodeBase64Url(routeId);
    if (bytes.length !== 16) return routeId;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return routeId;
  }
}

export function encodeProductRouteId(productId: string): string {
  try {
    const hex = productId.replaceAll('-', '');
    if (!/^[0-9a-f]{32}$/i.test(hex)) return productId;
    const bytes = Uint8Array.from(hex.match(/.{2}/g)!, pair => Number.parseInt(pair, 16));
    return encodeBase64Url(bytes);
  } catch {
    return productId;
  }
}
