// Bridge to the Bale miniapp SDK (https://tapi.bale.ai/miniapp.js).
// Every call is safe outside Bale: the app runs as a normal web app too.

let wa = null;
let backHandler = null;
let settingsHandler = null;

// Chrome logs a console error if vibrate() runs before any user gesture.
let interacted = false;
const markInteracted = () => {
  interacted = true;
  window.removeEventListener('pointerdown', markInteracted, true);
  window.removeEventListener('keydown', markInteracted, true);
};
window.addEventListener('pointerdown', markInteracted, true);
window.addEventListener('keydown', markInteracted, true);

export const Bale = {
  get available() { return !!wa; },
  get raw() { return wa; },

  init() {
    const w = window.Bale && window.Bale.WebApp;
    if (w && (w.initData || (w.initDataUnsafe && w.initDataUnsafe.user))) wa = w;
    if (!wa) return;
    try { wa.ready(); } catch {}
    try { wa.expand(); } catch {}
    try {
      if (wa.BackButton && typeof wa.BackButton.onClick === 'function') {
        wa.BackButton.onClick(() => { if (backHandler) backHandler(); });
      }
    } catch {}
    try {
      if (wa.SettingsButton && typeof wa.SettingsButton.onClick === 'function') {
        wa.SettingsButton.onClick(() => { if (settingsHandler) settingsHandler(); });
        wa.SettingsButton.show();
      }
    } catch {}
    try {
      wa.onEvent('contactRequested', (e) => {
        document.dispatchEvent(new CustomEvent('bale:contact', { detail: e }));
      });
    } catch {}
  },

  get user() {
    try { return wa?.initDataUnsafe?.user || null; } catch { return null; }
  },
  get initData() { try { return wa?.initData || ''; } catch { return ''; } },
  get startParam() { try { return wa?.initDataUnsafe?.start_param || ''; } catch { return ''; } },
  get colorScheme() { try { return wa?.colorScheme || null; } catch { return null; } },
  get themeParams() { try { return wa?.themeParams || null; } catch { return null; } },
  get platform() { try { return wa?.isIframe ? 'web' : 'android'; } catch { return 'unknown'; } },

  setBackHandler(fn) { backHandler = fn; },
  setSettingsHandler(fn) { settingsHandler = fn; },

  showBack(show) {
    if (!wa?.BackButton) return;
    try { show ? wa.BackButton.show() : wa.BackButton.hide(); } catch {}
  },

  setHeaderColor(cssColor) {
    if (!wa?.setHeaderColor) return;
    try { wa.setHeaderColor(cssColor); } catch {}
  },

  haptic(kind = 'light') {
    if (!interacted) return;
    try {
      if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 35 : kind === 'success' ? [15, 40, 15] : 12);
    } catch {}
  },

  openLink(url) {
    if (wa?.openLink) { try { wa.openLink(url); return; } catch {} }
    window.open(url, '_blank', 'noopener');
  },

  requestContact(cb) {
    if (wa?.requestContact) { try { wa.requestContact(cb); return true; } catch {} }
    return false;
  },

  addToHomeScreen() {
    if (wa?.addToHomeScreen) { try { wa.addToHomeScreen(); return true; } catch {} }
    return false;
  },

  sendData(data) {
    if (wa?.sendData) { try { wa.sendData(typeof data === 'string' ? data : JSON.stringify(data)); return true; } catch {} }
    return false;
  },

  enableClosingConfirmation(on) {
    if (!wa) return;
    try { on ? wa.enableClosingConfirmation() : wa.disableClosingConfirmation(); } catch {}
  },

  close() { try { wa?.close(); } catch {} },
};