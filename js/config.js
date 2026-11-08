export const CONFIG = {
  APP_NAME: 'Balegram',
  VERSION: '1.0.0',
  STORAGE_KEY: 'balegram.v1',
  SUPABASE_URL: '',
  SUPABASE_ANON_KEY: '',
  BALE_SDK_URL: 'https://tapi.bale.ai/miniapp.js',
  DOCS_URL: 'https://docs.bale.ai/miniapp',
};

export function getSupabaseCreds() {
  try {
    const saved = JSON.parse(localStorage.getItem('balegram.supabase') || 'null');
    if (saved?.url && saved?.key) return saved;
  } catch {}
  if (CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY) {
    return { url: CONFIG.SUPABASE_URL, key: CONFIG.SUPABASE_ANON_KEY };
  }
  return null;
}

export function setSupabaseCreds(url, key) {
  if (url && key) localStorage.setItem('balegram.supabase', JSON.stringify({ url, key }));
  else localStorage.removeItem('balegram.supabase');
}