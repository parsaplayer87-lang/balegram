#!/usr/bin/env node
/**
 * Balegram bot server — zero dependencies (Node 18+).
 *
 *   node bot/server.js
 *
 * Env:
 *   PORT            HTTP port for the miniapp (default 8080)
 *   MINIAPP_URL     Public HTTPS URL of this server, used in bot buttons.
 *                   Defaults to http://localhost:<PORT> (dev only).
 *   BALE_BOT_TOKEN  Token from @botfather. When set, the server long-polls
 *                   getUpdates and answers /start with a miniapp button.
 *
 * The static server sends CSP allowing Bale iframe embedding and never
 * sends X-Frame-Options (required for Bale web miniapps).
 *
 * To wire the main miniapp / menu button, set the MINIAPP_URL in @botfather
 * (Bale has no setChatMenuButton API). Direct link:
 *   https://ble.ir/<bot_username>?startapp
 */
'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = Number(process.env.PORT || 8080);
const ROOT = path.resolve(__dirname, '..');
const MINIAPP_URL = process.env.MINIAPP_URL || `http://localhost:${PORT}`;
const TOKEN = process.env.BALE_BOT_TOKEN || '';
const API = TOKEN ? `https://tapi.bale.ai/bot${TOKEN}` : '';
// On GitHub Actions each run self-terminates before the 6h runner cap so the
// workflow's chain step can start the successor run (continuous 24/7).
const RUN_MINUTES = Number(process.env.RUN_MINUTES || 0);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
};

function serveStatic(req, res) {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      // SPA fallback for in-app routes (we use in-memory routing, but be safe).
      const fallback = path.join(ROOT, 'index.html');
      fs.readFile(fallback, (e2, buf) => {
        if (e2) { res.writeHead(404); res.end('Not found'); return; }
        sendHtml(res, buf);
      });
      return;
    }
    const ext = path.extname(file).toLowerCase();
    const headers = {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=300',
      'Content-Security-Policy':
        "frame-src https://*.bale.ai; frame-ancestors 'self' https://*.bale.ai",
    };
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
}

function sendHtml(res, buf) {
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': buf.length,
    'Cache-Control': 'no-cache',
    'Content-Security-Policy':
      "frame-src https://*.bale.ai; frame-ancestors 'self' https://*.bale.ai",
  });
  res.end(buf);
}

/* ---------- Bale Bot API ---------- */

async function api(method, payload) {
  const r = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {}),
  });
  const j = await r.json().catch(() => null);
  if (!j || j.ok !== true) {
    console.error(`[bot] ${method} failed:`, j && (j.description || j.error_code));
  }
  return j;
}

const welcomeText =
  'به بلگرام خوش آمدید! ✈️\n\n' +
  'یک پیام‌رسان کامل داخل بله: گفتگو، گروه، کانال، پیام صوتی، واکنش و بیشتر.\n' +
  'روی دکمه زیر بزنید تا مینی‌اپ باز شود.\n\n' +
  'Welcome to Balegram — a full messenger inside Bale. Tap below to open the mini app.';

function miniappButtons() {
  return {
    inline_keyboard: [[{ text: '🚀 باز کردن بلگرام', web_app: { url: MINIAPP_URL } }]],
  };
}

async function handleUpdate(u) {
  const msg = u.message || u.edited_message;
  if (!msg || !msg.chat) return;
  const chatId = msg.chat.id;

  if (msg.web_app_data) {
    // Data sent from the miniapp via Bale.WebApp.sendData (≤4096 bytes).
    let parsed = null;
    try { parsed = JSON.parse(msg.web_app_data.data); } catch { /* raw string */ }
    console.log('[bot] web_app_data from', msg.from && msg.from.id, parsed || msg.web_app_data.data);
    await api('sendMessage', {
      chat_id: chatId,
      text: 'داده‌های مینی‌اپ دریافت شد. ✅\nMini app data received.',
    });
    return;
  }

  const text = (msg.text || '').trim();
  if (text.startsWith('/start')) {
    const param = text.split(' ').slice(1).join(' ');
    if (param) console.log('[bot] deep-link param:', param);
    await api('sendMessage', {
      chat_id: chatId,
      text: welcomeText,
      reply_markup: miniappButtons(),
    });
    // Also offer the reply-keyboard launcher next to the input bar.
    await api('sendMessage', {
      chat_id: chatId,
      text: 'دکمهٔ زیر همیشه در دسترس است 👇',
      reply_markup: {
        keyboard: [[{ text: '✈️ بلگرام', web_app: { url: MINIAPP_URL } }]],
        resize_keyboard: true,
      },
    });
    return;
  }
  if (text === '/help' || text === 'راهنما') {
    await api('sendMessage', {
      chat_id: chatId,
      text:
        '/start — باز کردن مینی‌اپ\n' +
        '/app — دکمهٔ ورود\n' +
        '/help — همین راهنما\n\n' +
        'همهٔ قابلیت‌ها داخل مینی‌اپ هستند: گفتگو، گروه، کانال، جستجو، پیام صوتی، واکنش، تنظیمات.',
      reply_markup: miniappButtons(),
    });
    return;
  }
  if (text === '/app' || text === '✈️ بلگرام') {
    await api('sendMessage', {
      chat_id: chatId,
      text: 'بلگرام را باز کنید:',
      reply_markup: miniappButtons(),
    });
    return;
  }
  if (msg.contact) {
    // Per Bale docs: only trust the phone when contact.user_id == from.id.
    const verified = msg.from && msg.contact.user_id === msg.from.id;
    console.log('[bot] contact received, verified:', verified);
    await api('sendMessage', {
      chat_id: chatId,
      text: verified
        ? 'شمارهٔ شما تأیید شد. ✅ حالا مینی‌اپ را باز کنید.'
        : 'دریافت شد. برای ادامه مینی‌اپ را باز کنید.',
      reply_markup: miniappButtons(),
    });
    return;
  }
}

let polling = false;
async function pollLoop() {
  if (!TOKEN || polling) return;
  polling = true;
  let offset = 0;
  console.log('[bot] polling getUpdates…');
  while (polling) {
    try {
      const j = await api('getUpdates', { offset, limit: 50, timeout: 25 });
      if (j && Array.isArray(j.result)) {
        for (const u of j.result) {
          offset = Math.max(offset, u.update_id + 1);
          handleUpdate(u).catch((e) => console.error('[bot] update error:', e.message));
        }
      }
    } catch (e) {
      console.error('[bot] poll error:', e.message);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

/* ---------- initData verification ---------- */
// Bale docs: secret = HMAC_SHA256(bot_token, "WebAppData"); the argument
// order is ambiguous, so accept either order (Telegram uses key="WebAppData").

function hmac(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function verifyInitData(initData) {
  if (!TOKEN || typeof initData !== 'string' || !initData) return false;
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return false;
  const pairs = [];
  for (const [k, v] of params.entries()) if (k !== 'hash') pairs.push(`${k}=${v}`);
  pairs.sort();
  const checkString = pairs.join('\n');
  const secretA = hmac('WebAppData', TOKEN); // Telegram convention
  const secretB = hmac(TOKEN, 'WebAppData'); // literal doc reading
  const a = crypto.createHmac('sha256', secretA).update(checkString).digest('hex');
  const b = crypto.createHmac('sha256', secretB).update(checkString).digest('hex');
  const ok = (x) => {
    try {
      return crypto.timingSafeEqual(Buffer.from(x, 'hex'), Buffer.from(hash, 'hex'));
    } catch { return false; }
  };
  if (!ok(a) && !ok(b)) return false;
  const authDate = Number(params.get('auth_date') || 0);
  return authDate > 0 && Date.now() / 1000 - authDate < 24 * 3600;
}

/* ---------- HTTP server ---------- */

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/verify-init-data') {
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 65536) req.destroy(); });
    req.on('end', () => {
      let initData = '';
      try { initData = JSON.parse(body).initData || ''; } catch { /* ignore */ }
      const valid = verifyInitData(initData);
      res.writeHead(valid ? 200 : 401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ valid }));
    });
    return;
  }
  if (req.method === 'GET' || req.method === 'HEAD') { serveStatic(req, res); return; }
  res.writeHead(405); res.end();
});

server.listen(PORT, () => {
  console.log(`Balegram miniapp:  http://localhost:${PORT}`);
  console.log(`Miniapp URL used in bot buttons: ${MINIAPP_URL}`);
  if (TOKEN) pollLoop();
  else console.log('BALE_BOT_TOKEN not set — static mode only (set it to enable the bot).');
  if (RUN_MINUTES > 0) {
    setTimeout(() => {
      console.log(`[bot] ${RUN_MINUTES}min run window elapsed; exiting for chain handoff.`);
      polling = false;
      server.close();
      process.exit(0);
    }, RUN_MINUTES * 60000);
  }
});

process.on('SIGINT', () => { polling = false; server.close(); process.exit(0); });