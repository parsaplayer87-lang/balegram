// Media helpers: image compression, playable seed audio, UI sounds, waveforms.

export function fileToDataURL(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export async function compressImage(file, maxDim = 1280, quality = .85) {
  const url = await fileToDataURL(file);
  if (file.type === 'image/svg+xml' || file.size < 120_000) return url;
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      res(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => res(url);
    img.src = url;
  });
}

export function downloadURI(uri, name) {
  const a = document.createElement('a');
  a.href = uri;
  a.download = name || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Deterministic pseudo-waveform for a message id.
export function waveformFor(id, bars = 32) {
  let h = 2166136261;
  const s = String(id);
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  const out = [];
  for (let i = 0; i < bars; i++) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    out.push(22 + Math.abs(h % 78));
  }
  return out;
}

// A real, playable WAV (16-bit PCM mono) so seeded voice notes actually play.
export function makeWavURI(seconds = 3, seed = 7) {
  const rate = 22050, n = Math.floor(rate * seconds);
  const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  ws(36, 'data'); v.setUint32(40, n * 2, true);
  let x = seed * 9301 + 49297;
  const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  const noteLen = Math.floor(rate * 0.34);
  for (let i = 0; i < n; i++) {
    const noteIdx = Math.floor(i / noteLen);
    const f = scale[(seed + noteIdx * 3 + Math.floor(rnd() * 0)) % scale.length];
    const t = i / rate, local = (i % noteLen) / noteLen;
    const env = Math.exp(-4.2 * local) * Math.min(1, local * 40);
    const smp = (Math.sin(2 * Math.PI * f * t) * .62 + Math.sin(2 * Math.PI * f * 2 * t) * .2 + Math.sin(2 * Math.PI * f * .5 * t) * .18) * env * .5;
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, smp)) * 32767, true);
  }
  let bin = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return 'data:audio/wav;base64,' + btoa(bin);
}

// Self-contained SVG "photos" for seeded conversations — always load, no network.
export function svgPhoto(kind) {
  const scenes = {
    mountains: `<defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#ffd9a0'/><stop offset='.5' stop-color='#f7a072'/><stop offset='1' stop-color='#c96f8e'/></linearGradient><linearGradient id='m' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#2d6a6f'/><stop offset='1' stop-color='#173f45'/></linearGradient></defs><rect width='640' height='420' fill='url(#s)'/><circle cx='470' cy='120' r='46' fill='#fff3d6' opacity='.95'/><path d='M0 300 140 150l90 110 80-90 130 150 70-60 130 120v40H0Z' fill='url(#m)' opacity='.85'/><path d='M0 340 110 240l120 100 100-80 150 110 160-70v120H0Z' fill='#123338'/><path d='M140 150l24 28-18 6-16-14Z' fill='#ffe9c9' opacity='.8'/><path d='M310 170l22 26-16 5-15-12Z' fill='#ffe9c9' opacity='.7'/><g fill='#0d262b'><path d='M60 380l8-26 8 26Zm26 0l7-20 7 20Zm420 6l8-30 8 30Zm28 0l6-20 6 20Z'/></g>`,
    city: `<defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1b2a52'/><stop offset='1' stop-color='#4b3a72'/></linearGradient></defs><rect width='640' height='420' fill='url(#s)'/><circle cx='520' cy='90' r='34' fill='#f4ecd8'/><circle cx='508' cy='82' r='30' fill='#243460' opacity='.55'/><g fill='#101a36'><rect x='30' y='180' width='70' height='240'/><rect x='120' y='120' width='86' height='300'/><rect x='226' y='210' width='60' height='210'/><rect x='306' y='150' width='92' height='270'/><rect x='418' y='230' width='66' height='190'/><rect x='504' y='170' width='90' height='250'/></g><g fill='#ffd97a' opacity='.9'><rect x='138' y='140' width='10' height='12'/><rect x='160' y='140' width='10' height='12'/><rect x='182' y='164' width='10' height='12'/><rect x='138' y='190' width='10' height='12'/><rect x='160' y='216' width='10' height='12'/><rect x='322' y='170' width='10' height='12'/><rect x='344' y='196' width='10' height='12'/><rect x='366' y='170' width='10' height='12'/><rect x='322' y='222' width='10' height='12'/><rect x='522' y='190' width='10' height='12'/><rect x='544' y='216' width='10' height='12'/><rect x='566' y='190' width='10' height='12'/><rect x='48' y='200' width='9' height='11'/><rect x='70' y='226' width='9' height='11'/><rect x='242' y='230' width='9' height='11'/><rect x='434' y='250' width='9' height='11'/></g><rect y='398' width='640' height='22' fill='#0a1128'/>`,
    sea: `<defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#8fd3e8'/><stop offset='.62' stop-color='#f7e3b0'/><stop offset='.63' stop-color='#2a9d9f'/><stop offset='1' stop-color='#17636b'/></linearGradient></defs><rect width='640' height='420' fill='url(#s)'/><circle cx='320' cy='238' r='40' fill='#ffdf8e'/><rect x='0' y='262' width='640' height='158' fill='#2a9d9f' opacity='.35'/><g stroke='#eaf7f7' stroke-width='3' opacity='.5' fill='none'><path d='M40 300q30-10 60 0t60 0'/><path d='M380 330q30-10 60 0t60 0'/><path d='M180 370q30-10 60 0t60 0'/><path d='M460 285q24-8 48 0'/></g><path d='M300 268h40l-8 14h-24Z' fill='#123c44'/><path d='M318 268v-34l22 30Z' fill='#f4f1e6'/><g fill='#22565e'><path d='M90 120q10-12 20 0 10-12 20 0-10 8-20 4-10 4-20-4Z'/><path d='M510 90q8-10 16 0 8-10 16 0-8 7-16 3-8 4-16-3Z'/></g>`,
    desk: `<defs><linearGradient id='w' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#e8d5b7'/><stop offset='1' stop-color='#cdb28e'/></linearGradient></defs><rect width='640' height='420' fill='url(#w)'/><rect x='150' y='90' width='340' height='210' rx='12' fill='#22303c'/><rect x='166' y='106' width='308' height='178' rx='6' fill='#0f1b24'/><g stroke='#39d0c4' stroke-width='4' fill='none' opacity='.9'><path d='M186 140h120M186 162h180M186 184h90M186 206h150'/></g><circle cx='430' cy='150' r='22' fill='#f2a516' opacity='.85'/><rect x='240' y='300' width='160' height='12' rx='6' fill='#1a2530'/><ellipse cx='320' cy='330' rx='210' ry='16' fill='#00000022'/><rect x='60' y='250' width='70' height='90' rx='8' fill='#b85c38'/><ellipse cx='95' cy='250' rx='35' ry='10' fill='#8f4527'/><path d='M130 270q26 6 0 34' stroke='#b85c38' stroke-width='10' fill='none'/><g fill='#3e7c59'><path d='M540 300q-6-60 22-84 8 52-22 84Z'/><path d='M540 300q-34-40-16-78 26 30 16 78Z'/></g><rect x='524' y='298' width='36' height='46' rx='6' fill='#c96f4a'/>`,
  };
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='420' viewBox='0 0 640 420'>${scenes[kind] || scenes.mountains}</svg>`;
  return 'data:image/svg+xml,' + encodeURIComponent(svg);
}

// ---- UI sound engine (WebAudio, tied to visible events) ----
let ctx = null;
let enabled = true;

export function setSoundsEnabled(on) { enabled = on; }

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, t0, dur, type = 'sine', gain = .12) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0, c.currentTime + t0);
  g.gain.linearRampToValueAtTime(gain, c.currentTime + t0 + .012);
  g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + .05);
}

export const Sfx = {
  send() { if (!enabled) return; tone(660, 0, .09, 'sine', .09); tone(990, .06, .12, 'sine', .08); },
  receive() { if (!enabled) return; tone(520, 0, .1, 'sine', .1); tone(780, .07, .14, 'sine', .07); },
  notify() { if (!enabled) return; tone(740, 0, .1, 'triangle', .09); tone(740, .14, .12, 'triangle', .09); tone(1100, .28, .18, 'sine', .06); },
  pop() { if (!enabled) return; tone(880, 0, .06, 'sine', .06); },
};