import type { MouseEvent } from 'react';
import type { NavigateFunction } from 'react-router-dom';

export const ADMIN_LOGIN_GESTURE_EVENT = 'zando:open-admin-login';

const CLICK_SEQUENCE_GAP_MS = 1500;
let logoClickCount = 0;
let resetTimer: number | null = null;

export function handleZandoLogoClick(
  event: MouseEvent<HTMLAnchorElement>,
  navigate: NavigateFunction
): void {
  // Preserve the browser's native behavior for modified or non-primary clicks.
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  event.preventDefault();
  navigate('/');
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

  if (resetTimer !== null) {
    window.clearTimeout(resetTimer);
  }

  logoClickCount += 1;
  if (logoClickCount >= 4) {
    logoClickCount = 0;
    resetTimer = null;
    window.dispatchEvent(new Event(ADMIN_LOGIN_GESTURE_EVENT));
    return;
  }

  resetTimer = window.setTimeout(() => {
    logoClickCount = 0;
    resetTimer = null;
  }, CLICK_SEQUENCE_GAP_MS);
}
