import { Buffer } from 'buffer';

export function decodeProductRouteId(routeId: string): string {
  if (!/^[A-Za-z0-9_-]{20,24}$/.test(routeId)) return routeId;
  try {
    const binary = Buffer.from(routeId.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - routeId.length % 4) % 4), 'base64').toString('binary');
    if (binary.length !== 16) return routeId;
    const hex = Array.from(binary, char => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    return routeId;
  }
}

export function encodeProductRouteId(productId: string): string {
  try {
    const hex = productId.replace(/-/g, '');
    if (!/^[0-9a-f]{32}$/i.test(hex)) return productId;
    return Buffer.from(hex, 'hex').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  } catch {
    return productId;
  }
}
