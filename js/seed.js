import { svgPhoto, makeWavURI } from './media.js';

export const AVATAR_GRADS = [
  'linear-gradient(135deg,#2bb3a3,#17636b)',
  'linear-gradient(135deg,#5b8def,#2f4bc7)',
  'linear-gradient(135deg,#a06bf0,#6d3fd1)',
  'linear-gradient(135deg,#f0729d,#d13f77)',
  'linear-gradient(135deg,#f2b23e,#e07b1f)',
  'linear-gradient(135deg,#4cc38a,#1f8a5d)',
  'linear-gradient(135deg,#ef6a5a,#c23a3a)',
  'linear-gradient(135deg,#43b6d8,#20718f)',
];

const now = Date.now();
const min = 60_000, hr = 3_600_000, day = 86_400_000;

function user(id, name, opts = {}) {
  return {
    id, name, username: opts.username || '', bio: opts.bio || '',
    phone: opts.phone || '', color: opts.color ?? 0, emoji: opts.emoji || null,
    photo: null, online: !!opts.online, lastSeen: opts.lastSeen ?? now - 2 * hr,
    isBot: !!opts.isBot, persona: opts.persona || null,
  };
}

export function buildSeed(meOverride) {
  const me = {
    id: 'u-me',
    name: meOverride?.name || 'Shayan Rad',
    username: meOverride?.username || 'shayanrad',
    bio: 'Building small worlds on Bale 🌿',
    phone: meOverride?.phone || '',
    photo: meOverride?.photo || null,
    color: 0, emoji: null, online: true, lastSeen: now,
  };

  const users = {
    'u-me': me,
    'u-sara': user('u-sara', 'Sara Ahmadi', { username: 'sara_ahm', color: 3, online: true, bio: 'Product designer · tea person 🍵', persona: 'sara' }),
    'u-arman': user('u-arman', 'Arman Rezaei', { username: 'armanrz', color: 1, lastSeen: now - 14 * min, bio: 'Frontend engineer. Ships on Fridays.', persona: 'arman' }),
    'u-nima': user('u-nima', 'Nima Karimi', { username: 'nimak', color: 4, lastSeen: now - 40 * min, bio: 'Voice notes > texts 🎙', persona: 'nima' }),
    'u-laleh': user('u-laleh', 'Laleh Samiei', { username: 'lalehs', color: 2, online: true, bio: 'PM · lists for days', persona: 'laleh' }),
    'u-maman': user('u-maman', 'Maman ❤️', { color: 5, lastSeen: now - 5 * min, bio: 'زنگ بزن مادر', persona: 'maman' }),
    'u-baba': user('u-baba', 'Baba', { color: 6, lastSeen: now - 3 * hr, persona: 'baba' }),
    'u-kian': user('u-kian', 'Kian Mehr', { username: 'kianmehr', color: 7, lastSeen: now - day, bio: 'Photographer 📷', persona: 'kian' }),
    'u-dorsa': user('u-dorsa', 'Dorsa Fallah', { username: 'dorsaf', color: 2, online: true, bio: 'Illustrator', persona: 'dorsa' }),
    'u-omid': user('u-omid', 'Omid Nori', { username: 'omidn', color: 1, lastSeen: now - 2 * day, persona: 'omid' }),
    'u-assistant': user('u-assistant', 'Balegram Assistant', { username: 'balegram_assistant_bot', color: 0, emoji: '🤖', isBot: true, online: true, bio: 'Your guide inside Balegram. Type /help.', persona: 'bot' }),
    'u-designweekly': user('u-designweekly', 'Design Weekly', { username: 'designweekly', color: 2, emoji: '🎨', isBot: false, bio: 'Curated design, every week.' }),
    'u-techfa': user('u-techfa', 'فناوری روز', { username: 'techfa', color: 7, emoji: '📡', bio: 'اخبار فناوری به زبان ساده' }),
  };

  const chats = {
    'c-saved': { id: 'c-saved', type: 'saved', title: 'Saved Messages', color: 0, emoji: '🔖', members: ['u-me'], admins: ['u-me'], pinned: true, muted: false, archived: false, unread: 0, draft: '', lastReadTs: now, createdAt: now - 30 * day, joined: true },
    'c-sara': { id: 'c-sara', type: 'private', peerId: 'u-sara', title: 'Sara Ahmadi', color: 3, members: ['u-me', 'u-sara'], admins: [], pinned: true, muted: false, archived: false, unread: 2, draft: '', lastReadTs: now - 3 * hr, createdAt: now - 20 * day, joined: true },
    'c-team': { id: 'c-team', type: 'group', title: 'Balegram Team', description: 'Building the messenger that lives on Bale. Standup 10:00, ship on Fridays.', color: 1, emoji: '🚀', members: ['u-me', 'u-arman', 'u-sara', 'u-nima', 'u-laleh'], admins: ['u-laleh', 'u-me'], pinned: false, muted: false, archived: false, unread: 4, draft: '', lastReadTs: now - 5 * hr, createdAt: now - 12 * day, joined: true, username: 'balegram_team' },
    'c-arman': { id: 'c-arman', type: 'private', peerId: 'u-arman', title: 'Arman Rezaei', color: 1, members: ['u-me', 'u-arman'], admins: [], pinned: false, muted: false, archived: false, unread: 0, draft: '', lastReadTs: now - hr, createdAt: now - 18 * day, joined: true },
    'c-designweekly': { id: 'c-designweekly', type: 'channel', title: 'Design Weekly', description: 'Curated interface design, type and color. New issue every Sunday.', username: 'designweekly', color: 2, emoji: '🎨', members: ['u-designweekly'], admins: ['u-designweekly'], memberCount: 12480, pinned: false, muted: false, archived: false, unread: 3, draft: '', lastReadTs: now - 2 * day, createdAt: now - 90 * day, joined: true },
    'c-family': { id: 'c-family', type: 'group', title: 'خانوادهٔ راد', description: 'خانهٔ همیشه گرم ❤️', color: 5, emoji: '🏡', members: ['u-me', 'u-maman', 'u-baba'], admins: ['u-maman'], pinned: false, muted: false, archived: false, unread: 1, draft: '', lastReadTs: now - day, createdAt: now - 60 * day, joined: true },
    'c-nima': { id: 'c-nima', type: 'private', peerId: 'u-nima', title: 'Nima Karimi', color: 4, members: ['u-me', 'u-nima'], admins: [], pinned: false, muted: false, archived: false, unread: 0, draft: '', lastReadTs: now - 6 * hr, createdAt: now - 15 * day, joined: true },
    'c-assistant': { id: 'c-assistant', type: 'bot', peerId: 'u-assistant', title: 'Balegram Assistant', color: 0, emoji: '🤖', members: ['u-me', 'u-assistant'], admins: [], pinned: false, muted: false, archived: false, unread: 0, draft: '', lastReadTs: now - 2 * hr, createdAt: now - 10 * day, joined: true },
    'c-techfa': { id: 'c-techfa', type: 'channel', title: 'فناوری روز', description: 'مهم‌ترین خبرهای فناوری، هر روز صبح.', username: 'techfa', color: 7, emoji: '📡', members: ['u-techfa'], admins: ['u-techfa'], memberCount: 8340, pinned: false, muted: true, archived: false, unread: 0, draft: '', lastReadTs: now - day, createdAt: now - 45 * day, joined: true },
    'c-oldsprint': { id: 'c-oldsprint', type: 'group', title: 'Sprint 12 (done)', color: 6, emoji: '📦', members: ['u-me', 'u-arman', 'u-laleh'], admins: ['u-laleh'], pinned: false, muted: true, archived: true, unread: 0, draft: '', lastReadTs: now - 8 * day, createdAt: now - 25 * day, joined: true },
  };

  let seq = 0;
  const mid = () => `m-seed-${++seq}`;
  const msg = (chatId, from, kind, text, ts, extra = {}) => ({
    id: mid(), chatId, from, kind, text, ts, status: 'read', reactions: {}, pinned: false, ...extra,
  });

  const photoMount = svgPhoto('mountains'), photoCity = svgPhoto('city'), photoSea = svgPhoto('sea'), photoDesk = svgPhoto('desk');
  const voice1 = makeWavURI(3.4, 7), voice2 = makeWavURI(2.6, 21), voice3 = makeWavURI(4.1, 33);
  const fileNotes = 'data:text/plain;charset=utf-8,' + encodeURIComponent('Balegram — release notes v1.0\n\n• Chats, groups, channels\n• Voice notes with waveform\n• Reactions, replies, forwarding\n• EN / FA with full RTL\n• Supabase cloud sync (optional)\n\nMade for Bale miniapps. سلام به بله! 🌿');
  const filePalette = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='480' height='160'><rect width='480' height='160' fill='#f5f2ec'/><g><rect x='20' y='30' width='70' height='100' rx='10' fill='#0e8f8b'/><rect x='105' y='30' width='70' height='100' rx='10' fill='#2f6fed'/><rect x='190' y='30' width='70' height='100' rx='10' fill='#8b5cf6'/><rect x='275' y='30' width='70' height='100' rx='10' fill='#e5484d'/><rect x='360' y='30' width='70' height='100' rx='10' fill='#f2a516'/></g></svg>`);

  const messages = {
    'c-saved': [
      msg('c-saved', 'u-me', 'text', 'Ideas for the Bale port:\n1. miniapp shell + Bale SDK\n2. Supabase realtime\n3. voice notes & reactions', now - 2 * day - 3 * hr),
      msg('c-saved', 'u-me', 'text', 'https://docs.bale.ai/miniapp — SDK reference, BackButton + initData validation', now - day - 6 * hr, { reactions: { '⭐': ['u-me'] } }),
      msg('c-saved', 'u-me', 'file', '', now - day - 2 * hr, { media: { url: fileNotes, name: 'release-notes.txt', size: 312 } }),
      msg('c-saved', 'u-me', 'text', 'Remember: in-memory routing only — the docs warn that browser history breaks BackButton on web Bale.', now - 4 * hr),
    ],
    'c-sara': [
      msg('c-sara', 'u-me', 'text', 'Hey Sara! Did you get a chance to look at the new chat screens?', now - 3 * hr - 22 * min),
      msg('c-sara', 'u-sara', 'text', 'Yes! The bubbles feel really nice. Love the teal outgoing gradient 🌊', now - 3 * hr - 18 * min, { status: 'read' }),
      msg('c-sara', 'u-sara', 'photo', '', now - 3 * hr - 16 * min, { media: { url: photoMount, caption: 'Also — weekend hike pics. The light was unreal' } }),
      msg('c-sara', 'u-me', 'text', 'Wow 😍 that sky! Where is this?', now - 3 * hr - 10 * min, { replyTo: null }),
      msg('c-sara', 'u-sara', 'text', 'Tochal, right above Tehran. We should go together next time!', now - 3 * hr - 8 * min),
      msg('c-sara', 'u-sara', 'text', 'راستی، طرح جدید رو دیدی؟ فردا می‌فرستم برات 🌿', now - 24 * min),
      msg('c-sara', 'u-sara', 'sticker', '🌸', now - 22 * min),
    ],
    'c-team': [
      msg('c-team', 'u-laleh', 'service', '', now - 12 * day, { media: { service: 'createdGroup', name: 'Laleh Samiei', title: 'Balegram Team' } }),
      msg('c-team', 'u-laleh', 'text', 'Sprint goal: ship the miniapp shell with chats + realtime. Who owns what?', now - 5 * hr - 40 * min),
      msg('c-team', 'u-arman', 'text', 'I’ll take the composer + voice recording. MediaRecorder with a graceful fallback.', now - 5 * hr - 31 * min),
      msg('c-team', 'u-sara', 'text', 'Design system is done — 6 accents, 5 wallpapers, full RTL. Figma link in the channel 🎨', now - 5 * hr - 24 * min, { reactions: { '🔥': ['u-arman', 'u-me'], '👏': ['u-nima'] } }),
      msg('c-team', 'u-me', 'text', 'I’m wiring the Bale bridge: BackButton, SettingsButton, initData. Docs say use in-memory routing only.', now - 5 * hr - 12 * min),
      msg('c-team', 'u-nima', 'voice', '', now - 4 * hr, { media: { url: voice2, duration: 2.6 } }),
      msg('c-team', 'u-laleh', 'text', 'Pinned the checklist. Standup at 10:00 tomorrow — bring blockers, not status updates 🙂', now - 3 * hr - 44 * min, { pinned: true }),
      msg('c-team', 'u-arman', 'photo', '', now - 2 * hr - 50 * min, { media: { url: photoDesk, caption: 'Current situation. The build is green ✅' } }),
      msg('c-team', 'u-laleh', 'text', 'Beautiful. @shayanrad can you review the Supabase schema before EOD?', now - 55 * min),
      msg('c-team', 'u-sara', 'text', 'منم اوکی‌ام، هرچی لازم بود بگید 🙌', now - 41 * min),
    ],
    'c-arman': [
      msg('c-arman', 'u-arman', 'text', 'Did you see tapi.bale.ai is fully Telegram-compatible? Same methods, same JSON.', now - 2 * hr - 10 * min),
      msg('c-arman', 'u-me', 'text', 'Yes — our Telegram bot code ports almost 1:1. Only the base URL changes.', now - 2 * hr - 6 * min),
      msg('c-arman', 'u-arman', 'file', '', now - hr - 52 * min, { media: { url: filePalette, name: 'brand-palette.svg', size: 508 } }),
      msg('c-arman', 'u-arman', 'text', 'Palette export for the accent picker. Six hues, all tested on dark.', now - hr - 50 * min),
      msg('c-arman', 'u-me', 'text', 'Sounds good, ship it 🚀', now - hr - 44 * min, { status: 'read' }),
    ],
    'c-designweekly': [
      msg('c-designweekly', 'u-designweekly', 'photo', '', now - 2 * day - 2 * hr, { media: { url: photoCity, caption: 'Issue #48 — Night interfaces. How dark themes earn their contrast.' } }),
      msg('c-designweekly', 'u-designweekly', 'text', 'Three rules for dark UI:\n\n1. Never use pure black — lift surfaces to 8–12% luminance.\n2. Desaturate accents ~15% to stop halation.\n3. Let shadows do the separating, not borders.', now - 2 * day - hr, { reactions: { '❤️': ['u-sara', 'u-kian', 'u-dorsa'], '🔥': ['u-arman'] } }),
      msg('c-designweekly', 'u-designweekly', 'text', 'Type pick of the week: Vazirmatn for Persian + Manrope for Latin. Both open source, both gorgeous at small sizes.\n\nhttps://docs.bale.ai — see how Bale does bilingual docs right.', now - day - 3 * hr),
      msg('c-designweekly', 'u-designweekly', 'photo', '', now - 7 * hr, { media: { url: photoSea, caption: 'Color study: Caspian teal → saffron. A palette that belongs to its subject.' } }),
      msg('c-designweekly', 'u-designweekly', 'text', 'Poll results are in: 68% of you prefer message tails kept, 32% want flat bubbles. Tails stay. Democracy works. 🗳', now - 3 * hr - 20 * min, { reactions: { '😂': ['u-nima'], '👍': ['u-me', 'u-sara'] } }),
    ],
    'c-family': [
      msg('c-family', 'u-maman', 'text', 'بچه‌ها جمعه ناهان خونهٔ ما، همه بیاید ❤️', now - day - 2 * hr),
      msg('c-family', 'u-baba', 'text', 'منم هستم. قورمه‌سبزی داریم؟ 😄', now - day - hr, { reactions: { '😂': ['u-me', 'u-maman'] } }),
      msg('c-family', 'u-maman', 'text', 'بله عزیزم، از صبح بار گذاشتم 🍲', now - day - 50 * min),
      msg('c-family', 'u-me', 'text', 'منم میام! شیرینی هم می‌خرم 🌸', now - day - 30 * min),
      msg('c-family', 'u-maman', 'voice', '', now - 35 * min, { media: { url: voice3, duration: 4.1 } }),
    ],
    'c-nima': [
      msg('c-nima', 'u-nima', 'text', 'Bro the voice feature works?? Send me one', now - 7 * hr),
      msg('c-nima', 'u-me', 'voice', '', now - 6 * hr - 50 * min, { media: { url: voice1, duration: 3.4 } }),
      msg('c-nima', 'u-nima', 'text', 'hahaha the waveform is so smooth 🔥', now - 6 * hr - 40 * min, { replyTo: null }),
      msg('c-nima', 'u-nima', 'sticker', '🎧', now - 6 * hr - 38 * min),
      msg('c-nima', 'u-me', 'text', 'Recorded right in the browser. MediaRecorder + a little WebAudio magic.', now - 6 * hr - 30 * min),
    ],
    'c-assistant': [
      msg('c-assistant', 'u-assistant', 'text', 'سلام! I’m your Balegram assistant 🤖\n\nTry:\n• /help — what I can do\n• /time — current time\n• /joke — a fresh one\n• or just say hi!', now - 2 * hr),
    ],
    'c-techfa': [
      msg('c-techfa', 'u-techfa', 'text', 'صبح بخیر ☀️\n\n• مینی‌اپ‌های بله حالا از پرداخت کیف‌پولی پشتیبانی می‌کنند\n• مستندات جدید SDK منتشر شد\n• نسخهٔ وب بله از iframe برای مینی‌اپ‌ها استفاده می‌کند', now - day - 4 * hr),
      msg('c-techfa', 'u-techfa', 'text', 'خبر کوتاه: سرویس سفیر امکان ارسال پیام انبوه به شماره‌های بله را فراهم می‌کند — با کلید سازمانی و بدون نیاز به شروع گفتگو توسط کاربر.', now - 6 * hr),
    ],
    'c-oldsprint': [
      msg('c-oldsprint', 'u-laleh', 'text', 'Sprint 12 closed. 34/36 tasks done — great work everyone 🎉', now - 8 * day),
      msg('c-oldsprint', 'u-arman', 'text', 'Archiving this chat. See you in the new one!', now - 8 * day + hr),
    ],
  };

  // wire a reply + a forward for realism
  const saraPhoto = messages['c-sara'][2];
  messages['c-sara'][3].replyTo = saraPhoto.id;
  messages['c-nima'][2].replyTo = messages['c-nima'][1].id;
  messages['c-saved'].push(msg('c-saved', 'u-me', 'text', 'Three rules for dark UI: never pure black, desaturate accents, shadows over borders.', now - 2 * hr, { fwd: { name: 'Design Weekly', chatId: 'c-designweekly' } }));

  return {
    rev: 1,
    me, users, chats, messages,
    contacts: ['u-sara', 'u-arman', 'u-nima', 'u-laleh', 'u-maman', 'u-baba', 'u-kian', 'u-dorsa', 'u-omid'],
    settings: {
      theme: 'system', accent: 'caspian', wallpaper: 'doodles', fontSize: 15,
      lang: 'en', sounds: true, notifications: true, readReceipts: true, lastSeenPrivacy: true,
    },
    recentEmoji: ['😂', '❤️', '👍', '🔥', '🌿'],
    ambientDone: false,
  };
}

export const PERSONAS = {
  sara: {
    typingMs: [1100, 2000], delayMs: [2400, 4200],
    replies: ['Absolutely! Let’s do it 🌿', 'آره حتماً! عالی می‌شه', 'Haha yes 😄 send it over', 'I was just thinking the same thing!', 'باشه، فردا صبح می‌فرستم برات', 'Love that idea ✨', 'Can we hop on a call later? Actually — miniapps can’t call yet 😅', 'مرسی که گفتی! 🙏'],
    question: ['Good question — let me check and get back to you.', 'سؤال خوبیه! بذار بررسی کنم.', 'Hmm, I’d say yes. What do you think?'],
  },
  arman: {
    typingMs: [900, 1600], delayMs: [1800, 3400],
    replies: ['On it 🚀', 'Build is green, pushing now.', 'داشبورد، دارم روش کار می‌کنم', 'Nice catch — fixing.', 'LGTM ✅', 'Let’s ship it.', 'The API is Telegram-compatible so this was easy.', 'باشه، تا شب آماده‌ست'],
    question: ['Short answer: yes. Long answer: yes, with tests.', 'بذار کد رو ببینم… آره کار می‌کنه.', 'Check the docs — tapi.bale.ai has everything.'],
  },
  nima: {
    typingMs: [1400, 2400], delayMs: [2800, 5000],
    replies: ['hahaha 😂', 'bro that’s clean 🔥', 'داداش دمت گرم', 'Send a voice note, I’m driving', '🎧 on repeat', 'No wayyy', 'خیلی باحاله', 'Let’s catch up this week?'],
    question: ['Honestly? No idea 😅', 'نمی‌دونم والا، بذار ببینم', 'Google says yes, I say maybe.'],
  },
  laleh: {
    typingMs: [800, 1500], delayMs: [1600, 3000],
    replies: ['Added to the board 📋', 'Thanks! Noted for standup.', 'مرسی، اضافه شد به لیست', 'Can you own this one?', 'Perfect — exactly what we needed.', 'Let’s timebox it to tomorrow.'],
    question: ['Let’s discuss at standup — adding it to the agenda.', 'سؤال خوبیه، فردا بررسی می‌کنیم.'],
  },
  maman: {
    typingMs: [1800, 3000], delayMs: [3200, 5600],
    replies: ['قربونت برم مادر ❤️', 'خوبی مادر؟ غذا خوردی؟', 'باشه عزیزم، مراقب خودت باش', 'زنگ بزن صداتو بشنوم 📞', 'چشم، منتظرتم 🌸'],
    question: ['از بابات بپرس عزیزم 😄', 'نمی‌دونم مادر، ولی هرجی بخوای برات درست می‌کنم ❤️'],
  },
  baba: {
    typingMs: [2000, 3500], delayMs: [3800, 6500],
    replies: ['سلام بابا. خوبی؟', 'باشه پسرم 👍', 'من در جریانم، نگران نباش', 'هوا سرده، لباس گرم بپوش 😄'],
    question: ['بذار فکر کنم… آره درسته.', 'از مامانت بپرس، اون بهتر می‌دونه 😄'],
  },
  kian: {
    typingMs: [1200, 2200], delayMs: [2400, 4400],
    replies: ['📷 golden hour was perfect today', 'آره، عکس‌ها رو آپلود کردم', 'Let’s shoot this weekend?', 'نور عالی بود، حیف بود نگیرم'],
    question: ['Depends on the light — always depends on the light 😄'],
  },
  dorsa: {
    typingMs: [1100, 2000], delayMs: [2200, 4000],
    replies: ['I’ll sketch something tonight ✏️', 'وای آره! خیلی وقته می‌خواستم این کارو کنم', 'Send references?', 'رنگ‌هاش عالیه 🎨'],
    question: ['Let me draw it out and show you 🎨'],
  },
  omid: {
    typingMs: [1500, 2600], delayMs: [3000, 5200],
    replies: ['Sounds like a plan 👌', 'آره موافقم', 'Count me in', 'بذار هماهنگ کنم خبر می‌دم'],
    question: ['Probably yes — I’ll confirm tonight.'],
  },
};