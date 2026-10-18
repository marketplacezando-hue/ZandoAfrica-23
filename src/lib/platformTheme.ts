import type { PlatformSettings } from '@/types/zando';

const DEFAULT_THEME: PlatformSettings['theme'] = {
  primary_color: '#00A651',
  secondary_color: '#FF8A00',
  button_color: '#2563EB',
  sidebar_color: '#092C22',
  card_style: 'rounded-xl',
  card_color: '#FFFFFF',
  surface_color: '#F3F6F8',
  border_color: '#E2E8F0'
};

export function hexToHsl(value: string | undefined, fallback: string): string {
  const input = value ?? fallback;
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(input.trim());
  if (!match) return hexToHsl(fallback, '#00A651');

  const red = parseInt(match[1], 16) / 255;
  const green = parseInt(match[2], 16) / 255;
  const blue = parseInt(match[3], 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = delta / (1 - Math.abs(2 * lightness - 1));
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return `${Math.round(hue)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function applyPlatformTheme(theme: Partial<PlatformSettings['theme']> | undefined): void {
  if (typeof document === 'undefined') return;
  const colors = { ...DEFAULT_THEME, ...theme };
  const root = document.documentElement;
  const primary = hexToHsl(colors.primary_color, DEFAULT_THEME.primary_color);
  const accent = hexToHsl(colors.secondary_color, DEFAULT_THEME.secondary_color);
  const button = hexToHsl(colors.button_color, DEFAULT_THEME.button_color);
  const card = hexToHsl(colors.card_color, DEFAULT_THEME.card_color);
  const surface = hexToHsl(colors.surface_color, DEFAULT_THEME.surface_color);
  const border = hexToHsl(colors.border_color, DEFAULT_THEME.border_color);
  const sidebar = hexToHsl(colors.sidebar_color, DEFAULT_THEME.sidebar_color);

  root.style.setProperty('--primary', primary);
  root.style.setProperty('--ring', primary);
  root.style.setProperty('--sidebar-primary', primary);
  root.style.setProperty('--chart-1', primary);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--secondary', button);
  root.style.setProperty('--card', card);
  root.style.setProperty('--popover', card);
  root.style.setProperty('--muted', surface);
  root.style.setProperty('--border', border);
  root.style.setProperty('--input', border);
  root.style.setProperty('--sidebar-background', sidebar);
  root.style.setProperty('--zando-card-color', colors.card_color);
  root.style.setProperty('--zando-section-color', colors.surface_color);
  root.style.setProperty('--zando-border-color', colors.border_color);
}
