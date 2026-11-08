import { CONFIG } from './config.js';
import { buildSeed, PERSONAS, AVATAR_GRADS } from './seed.js';
import { Sfx } from './media.js';

const uid = p => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
const rand = ([a, b]) => a + Math.random() * (b - a);

const GENERIC_REPLIES = ['Nice! 👌', 'جالبه، بیشتر بگو', 'Got it, thanks!', 'آره موافقم', 'Let me think about it 🤔', 'Sounds good to me'];

class Emitter {
  constructor() { this.map = new Map(); }
  on(ev, fn) { if (!this.map.has(ev)) this.map.set(ev, new Set()); this.map.get(ev).add(fn); return () => this.off(ev, fn); }
  off(ev, fn) { this.map.get(ev)?.delete(fn); }
  emit(ev, data) { this.map.get(ev)?.forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); }
}

let bc = null;
try { if (typeof BroadcastChannel !== 'undefined') bc = new BroadcastChannel('balegram-sync'); } catch {}

export const store = {
  state: null,
  typing: {},
  activeChatId: null,
  bus: new Emitter(),
  persistHooks: [],
  _saveTimer: null,
  _simTimers: new Set(),

  load() {
    let raw = null;
    try { raw = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEY) || 'null'); } catch {}
    if (raw && raw.chats && raw.messages && raw.me) {
      this.state = raw;
    } else {
      this.state = buildSeed();
      this.persist(true);
    }
    if (bc) {
      bc.onmessage = (e) => {
        const d = e.data || {};
        if (d.type === 'state' && d.state && d.state.rev > this.state.rev) {
          this.state = d.state;
          this.bus.emit('sync');
        } else if (d.type === 'typing' && d.chatId && d.userId !== this.state.me.id) {
          this.typing[d.chatId] = { userId: d.userId, until: Date.now() + 3500 };
          this.bus.emit('typing', { chatId: d.chatId });
        }
      };
    }
    return this.state;
  },

  persist(immediate = false) {
    this.state.rev = (this.state.rev || 0) + 1;
    const write = () => {
      try {
        localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(this.state));
        if (bc) bc.postMessage({ type: 'state', state: this.state });
      } catch (e) { console.warn('persist failed', e); }
      this.persistHooks.forEach(fn => { try { fn(this.state); } catch {} });
    };
    if (immediate) { clearTimeout(this._saveTimer); write(); return; }
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(write, 220);
  },

  // ---------- helpers ----------
  chat(id) { return this.state.chats[id] || null; },
  user(id) { return this.state.users[id] || null; },
  msgs(chatId) { return this.state.messages[chatId] || []; },
  lastMsg(chatId) { const m = this.msgs(chatId); return m[m.length - 1] || null; },
  peerOf(chat) { return chat?.peerId ? this.user(chat.peerId) : null; },
  chatTitle(chat) {
    if (!chat) return '';
    if (chat.type === 'saved') return 'Saved Messages';
    if (chat.type === 'private') { const p = this.peerOf(chat); return p ? p.name : chat.title; }
    return chat.title;
  },
  sortedChats({ archived = false, folder = 'all' } = {}) {
    return Object.values(this.state.chats)
      .filter(c => !!c.archived === archived && !c.deleted)
      .filter(c => {
        if (folder === 'personal') return c.type === 'private' || c.type === 'saved';
        if (folder === 'groups') return c.type === 'group';
        if (folder === 'channels') return c.type === 'channel';
        if (folder === 'bots') return c.type === 'bot';
        return true;
      })
      .sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        const ta = this.lastMsg(a.id)?.ts || a.createdAt, tb = this.lastMsg(b.id)?.ts || b.createdAt;
        return tb - ta;
      });
  },
  unreadTotal() {
    return Object.values(this.state.chats).reduce((n, c) => n + (c.archived || c.muted ? 0 : c.unread || 0), 0);
  },
  isOut(m) { return m.from === this.state.me.id; },
  displayName(userId) { return userId === this.state.me.id ? 'You' : (this.user(userId)?.name || 'Unknown'); },

  // ---------- messaging ----------
  sendMessage(chatId, { kind = 'text', text = '', media = null, replyTo = null, fwd = null } = {}) {
    const chat = this.chat(chatId);
    if (!chat) return null;
    const m = {
      id: uid('m'), chatId, from: this.state.me.id, kind, text, media,
      replyTo, fwd, ts: Date.now(), status: 'sending', reactions: {}, pinned: false,
    };
    if (!this.state.messages[chatId]) this.state.messages[chatId] = [];
    this.state.messages[chatId].push(m);
    chat.draft = '';
    this.persist();
    this.bus.emit('message:new', { chatId, msg: m, incoming: false });
    Sfx.send();
    setTimeout(() => { m.status = 'sent'; this.persist(); this.bus.emit('message:update', { chatId, msg: m }); }, 420);
    this._scheduleSim(chat, m);
    return m;
  },

  editMessage(chatId, id, text) {
    const m = this.msgs(chatId).find(x => x.id === id);
    if (!m) return;
    m.text = text; m.editedTs = Date.now();
    this.persist();
    this.bus.emit('message:update', { chatId, msg: m });
  },

  deleteMessages(chatId, ids) {
    const list = this.state.messages[chatId] || [];
    const removed = list.filter(m => ids.includes(m.id));
    this.state.messages[chatId] = list.filter(m => !ids.includes(m.id));
    const chat = this.chat(chatId);
    if (chat) chat.unread = this.msgs(chatId).filter(m => !this.isOut(m) && m.ts > (chat.lastReadTs || 0)).length;
    this.persist();
    this.bus.emit('messages:deleted', { chatId, ids });
    return removed;
  },

  restoreMessages(chatId, removed) {
    const list = this.state.messages[chatId] || (this.state.messages[chatId] = []);
    list.push(...removed);
    list.sort((a, b) => a.ts - b.ts);
    this.persist();
    this.bus.emit('sync');
  },

  toggleReaction(chatId, id, emoji) {
    const m = this.msgs(chatId).find(x => x.id === id);
    if (!m) return;
    const me = this.state.me.id;
    const arr = m.reactions[emoji] || [];
    if (arr.includes(me)) m.reactions[emoji] = arr.filter(x => x !== me);
    else {
      for (const k of Object.keys(m.reactions)) m.reactions[k] = m.reactions[k].filter(x => x !== me);
      m.reactions[emoji] = [...(m.reactions[emoji] || []), me];
    }
    if (m.reactions[emoji] && !m.reactions[emoji].length) delete m.reactions[emoji];
    for (const k of Object.keys(m.reactions)) if (!m.reactions[k].length) delete m.reactions[k];
    this.persist();
    this.bus.emit('message:update', { chatId, msg: m });
  },

  togglePinMessage(chatId, id) {
    const m = this.msgs(chatId).find(x => x.id === id);
    if (!m) return false;
    m.pinned = !m.pinned;
    this.persist();
    this.bus.emit('message:update', { chatId, msg: m });
    return m.pinned;
  },

  markRead(chatId) {
    const chat = this.chat(chatId);
    if (!chat || !chat.unread) return;
    chat.unread = 0; chat.lastReadTs = Date.now();
    this.persist();
    this.bus.emit('chat:update', { chatId });
  },

  setDraft(chatId, text) {
    const chat = this.chat(chatId);
    if (!chat || chat.draft === text) return;
    chat.draft = text;
    this.persist();
  },

  forwardMessages(fromChatId, ids, toChatId) {
    const src = this.msgs(fromChatId).filter(m => ids.includes(m.id));
    const to = this.chat(toChatId);
    if (!to || !src.length) return 0;
    if (!this.state.messages[toChatId]) this.state.messages[toChatId] = [];
    for (const m of src) {
      const fwdName = m.fwd?.name || (m.from === this.state.me.id ? this.state.me.name : (this.chat(fromChatId)?.type === 'channel' ? this.chatTitle(this.chat(fromChatId)) : this.displayName(m.from)));
      this.state.messages[toChatId].push({
        id: uid('m'), chatId: toChatId, from: this.state.me.id, kind: m.kind,
        text: m.text, media: m.media, replyTo: null,
        fwd: { name: fwdName, chatId: fromChatId },
        ts: Date.now(), status: 'sent', reactions: {}, pinned: false,
      });
    }
    this.persist();
    this.bus.emit('sync');
    return src.length;
  },

  // ---------- chats ----------
  toggleChatPin(id) { const c = this.chat(id); if (!c) return; c.pinned = !c.pinned; this.persist(); this.bus.emit('chat:update', { chatId: id }); return c.pinned; },
  toggleMute(id) { const c = this.chat(id); if (!c) return; c.muted = !c.muted; this.persist(); this.bus.emit('chat:update', { chatId: id }); return c.muted; },
  toggleArchive(id) { const c = this.chat(id); if (!c) return; c.archived = !c.archived; this.persist(); this.bus.emit('chat:update', { chatId: id }); return c.archived; },

  deleteChat(id) {
    delete this.state.chats[id];
    delete this.state.messages[id];
    this.persist();
    this.bus.emit('chat:deleted', { chatId: id });
  },

  clearHistory(id) {
    this.state.messages[id] = [];
    const c = this.chat(id); if (c) { c.unread = 0; c.lastReadTs = Date.now(); }
    this.persist();
    this.bus.emit('sync');
  },

  createPrivateChat(userId) {
    const existing = Object.values(this.state.chats).find(c => c.type === 'private' && c.peerId === userId && !c.deleted);
    if (existing) { if (existing.archived) { existing.archived = false; this.persist(); } return existing; }
    const u = this.user(userId);
    const c = {
      id: uid('c'), type: 'private', peerId: userId, title: u?.name || 'Chat',
      color: u?.color ?? 0, members: [this.state.me.id, userId], admins: [],
      pinned: false, muted: false, archived: false, unread: 0, draft: '',
      lastReadTs: Date.now(), createdAt: Date.now(), joined: true,
    };
    this.state.chats[c.id] = c;
    this.state.messages[c.id] = [];
    this.persist();
    this.bus.emit('chat:created', { chat: c });
    return c;
  },

  createGroup(title, memberIds, { emoji = null, color = 1, description = '' } = {}) {
    const c = {
      id: uid('c'), type: 'group', title, description, color, emoji,
      members: [this.state.me.id, ...memberIds.filter(x => x !== this.state.me.id)],
      admins: [this.state.me.id], memberCount: memberIds.length + 1,
      pinned: false, muted: false, archived: false, unread: 0, draft: '',
      lastReadTs: Date.now(), createdAt: Date.now(), joined: true,
      username: '', inviteLink: `https://ble.ir/join/${Math.random().toString(36).slice(2, 10)}`,
    };
    this.state.chats[c.id] = c;
    this.state.messages[c.id] = [{
      id: uid('m'), chatId: c.id, from: this.state.me.id, kind: 'service', text: '',
      ts: Date.now(), status: 'read', reactions: {}, pinned: false,
      media: { service: 'createdGroup', name: this.state.me.name, title },
    }];
    this.persist();
    this.bus.emit('chat:created', { chat: c });
    return c;
  },

  createChannel(title, description = '', { emoji = null, color = 2 } = {}) {
    const c = {
      id: uid('c'), type: 'channel', title, description, color, emoji,
      members: [this.state.me.id], admins: [this.state.me.id], memberCount: 1,
      pinned: false, muted: false, archived: false, unread: 0, draft: '',
      lastReadTs: Date.now(), createdAt: Date.now(), joined: true,
      username: '', inviteLink: `https://ble.ir/${title.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 20) || 'channel'}_${Math.random().toString(36).slice(2, 6)}`,
    };
    this.state.chats[c.id] = c;
    this.state.messages[c.id] = [{
      id: uid('m'), chatId: c.id, from: this.state.me.id, kind: 'service', text: '',
      ts: Date.now(), status: 'read', reactions: {}, pinned: false,
      media: { service: 'createdChannel', name: this.state.me.name, title },
    }];
    this.persist();
    this.bus.emit('chat:created', { chat: c });
    return c;
  },

  addMembers(chatId, ids) {
    const c = this.chat(chatId); if (!c) return;
    for (const id of ids) if (!c.members.includes(id)) c.members.push(id);
    c.memberCount = c.members.length;
    this.persist(); this.bus.emit('chat:update', { chatId });
  },

  removeMember(chatId, userId) {
    const c = this.chat(chatId); if (!c) return;
    c.members = c.members.filter(x => x !== userId);
    c.admins = c.admins.filter(x => x !== userId);
    c.memberCount = c.members.length;
    this.persist(); this.bus.emit('chat:update', { chatId });
  },

  toggleAdmin(chatId, userId) {
    const c = this.chat(chatId); if (!c) return false;
    if (c.admins.includes(userId)) c.admins = c.admins.filter(x => x !== userId);
    else c.admins.push(userId);
    this.persist(); this.bus.emit('chat:update', { chatId });
    return c.admins.includes(userId);
  },

  toggleBlock(chatId) {
    const c = this.chat(chatId); if (!c) return;
    c.blocked = !c.blocked;
    this.persist(); this.bus.emit('chat:update', { chatId });
    return c.blocked;
  },

  leaveChat(chatId) {
    const c = this.chat(chatId); if (!c) return;
    c.joined = false;
    c.members = c.members.filter(x => x !== this.state.me.id);
    this.persist(); this.bus.emit('chat:update', { chatId });
  },

  joinChat(chatId) {
    const c = this.chat(chatId); if (!c) return;
    c.joined = true;
    if (!c.members.includes(this.state.me.id)) c.members.push(this.state.me.id);
    if (c.type === 'channel') c.memberCount = (c.memberCount || 0) + 1;
    this.persist(); this.bus.emit('chat:update', { chatId });
  },

  // ---------- contacts & profile ----------
  addContact({ firstName, lastName = '', phone = '', username = '' }) {
    const id = uid('u');
    const name = [firstName, lastName].filter(Boolean).join(' ');
    this.state.users[id] = {
      id, name, username, phone, bio: '', color: Math.floor(Math.random() * AVATAR_GRADS.length),
      emoji: null, photo: null, online: false, lastSeen: Date.now() - 3600_000, isBot: false, persona: null,
    };
    if (!this.state.contacts.includes(id)) this.state.contacts.push(id);
    this.persist();
    this.bus.emit('contact:added', { userId: id });
    return this.state.users[id];
  },

  updateProfile(patch) {
    Object.assign(this.state.me, patch);
    this.persist();
    this.bus.emit('profile', {});
  },

  updateSettings(patch) {
    Object.assign(this.state.settings, patch);
    this.persist(true);
    this.bus.emit('settings', patch);
  },

  addRecentEmoji(e) {
    const r = this.state.recentEmoji || (this.state.recentEmoji = []);
    this.state.recentEmoji = [e, ...r.filter(x => x !== e)].slice(0, 24);
    this.persist();
  },

  resetAll() {
    this._simTimers.forEach(clearTimeout); this._simTimers.clear();
    this.typing = {};
    this.state = buildSeed();
    this.persist(true);
    this.bus.emit('sync');
  },

  // ---------- search ----------
  searchAll(q) {
    q = q.trim().toLowerCase();
    if (!q) return { chats: [], messages: [] };
    const chats = Object.values(this.state.chats)
      .filter(c => !c.deleted && (this.chatTitle(c).toLowerCase().includes(q) || (c.username || '').toLowerCase().includes(q)))
      .slice(0, 8);
    const messages = [];
    for (const [chatId, list] of Object.entries(this.state.messages)) {
      const chat = this.chat(chatId);
      if (!chat || chat.deleted) continue;
      for (const m of list) {
        if (m.kind === 'text' && m.text && m.text.toLowerCase().includes(q)) messages.push({ msg: m, chat });
        else if (m.media?.caption && m.media.caption.toLowerCase().includes(q)) messages.push({ msg: m, chat });
        else if (m.media?.name && m.media.name.toLowerCase().includes(q)) messages.push({ msg: m, chat });
      }
    }
    messages.sort((a, b) => b.msg.ts - a.msg.ts);
    return { chats, messages: messages.slice(0, 50) };
  },

  // ---------- simulation (local-mode life) ----------
  _later(fn, ms) {
    const t = setTimeout(() => { this._simTimers.delete(t); fn(); }, ms);
    this._simTimers.add(t);
    return t;
  },

  broadcastTyping(chatId) {
    if (bc) bc.postMessage({ type: 'typing', chatId, userId: this.state.me.id });
  },

  _scheduleSim(chat, userMsg) {
    if (chat.type === 'saved' || chat.type === 'channel' || chat.blocked) return;
    if (chat.type === 'group') {
      if (Math.random() > 0.6) return;
      const others = chat.members.filter(x => x !== this.state.me.id && this.user(x));
      if (!others.length) return;
      const who = rnd(others);
      this._simReply(chat, who, rnd(GENERIC_REPLIES), userMsg);
      return;
    }
    const peer = this.peerOf(chat);
    if (!peer) return;
    if (peer.isBot || chat.type === 'bot') {
      this._simReply(chat, peer.id, this._botReply(userMsg.text || ''), userMsg, true);
      return;
    }
    const persona = PERSONAS[peer.persona];
    const isQ = /\?|؟|چیه|چطوره|می‌تونی|can you|how|what|why/i.test(userMsg.text || '');
    const pool = persona ? (isQ && persona.question ? persona.question : persona.replies) : GENERIC_REPLIES;
    this._simReply(chat, peer.id, rnd(pool), userMsg);
  },

  _simReply(chat, userId, text, userMsg, fast = false) {
    const persona = PERSONAS[this.user(userId)?.persona];
    const typingDelay = fast ? 500 : rand(persona?.typingMs || [1000, 1800]);
    const replyDelay = typingDelay + (fast ? rand([900, 1600]) : rand(persona?.delayMs || [2200, 4000]));
    this._later(() => {
      this.typing[chat.id] = { userId, until: Date.now() + replyDelay - typingDelay + 800 };
      this.bus.emit('typing', { chatId: chat.id });
    }, typingDelay);
    this._later(() => {
      delete this.typing[chat.id];
      // they read our messages
      for (const m of this.msgs(chat.id)) if (this.isOut(m) && m.status !== 'read') m.status = 'read';
      const m = {
        id: uid('m'), chatId: chat.id, from: userId, kind: 'text', text,
        ts: Date.now(), status: 'read', reactions: {}, pinned: false,
      };
      if (!this.state.messages[chat.id]) this.state.messages[chat.id] = [];
      this.state.messages[chat.id].push(m);
      if (this.activeChatId === chat.id) { chat.lastReadTs = Date.now(); chat.unread = 0; }
      else chat.unread = (chat.unread || 0) + 1;
      this.persist();
      this.bus.emit('message:new', { chatId: chat.id, msg: m, incoming: true });
      if (this.activeChatId === chat.id) Sfx.receive();
      else if (!chat.muted) { Sfx.notify(); this.bus.emit('notify', { chat, msg: m }); }
    }, replyDelay);
  },

  _botReply(text) {
    const s = text.trim().toLowerCase();
    if (s.startsWith('/help')) return 'Here’s what I can do 🤖\n\n/time — current time\n/joke — a fresh joke\n/saved — open Saved Messages\n/status — your workspace stats\n\nOr just chat with me — I’m always here.';
    if (s.startsWith('/start')) return 'Welcome! I’m the Balegram assistant. Type /help to see my tricks ✨';
    if (s.startsWith('/time')) return `It’s ${new Date().toLocaleTimeString()} — ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} 🕰`;
    if (s.startsWith('/joke')) return rnd([
      'Why do programmers prefer dark mode? Because light attracts bugs. 🐛',
      'A SQL query walks into a bar, approaches two tables and asks: “May I JOIN you?” 🍺',
      'چرا برنامه‌نویس‌ها هالووین رو با کریسمس اشتباه می‌گیرن؟ چون OCT 31 == DEC 25 🎃',
      'There are 10 kinds of people: those who understand binary and those who don’t. 💾',
    ]);
    if (s.startsWith('/status')) {
      const chats = Object.keys(this.state.chats).length;
      const msgs = Object.values(this.state.messages).reduce((n, l) => n + l.length, 0);
      return `Workspace status 📊\n• ${chats} chats\n• ${msgs} messages\n• ${this.state.contacts.length} contacts\n• Mode: ${this.state.settings.lang === 'fa' ? 'فارسی' : 'English'}`;
    }
    if (s.startsWith('/saved')) return 'Saved Messages is your personal cloud — forward anything there and it stays just for you 🔖';
    if (/سلام|درود|hi|hello|hey|هی/.test(s)) return 'سلام! 👋 Happy to see you. Type /help anytime.';
    if (/خداحافظ|بای|bye/.test(s)) return 'خداحافظ! 👋 Come back soon.';
    if (/ممنون|مرسی|thanks|thank/.test(s)) return 'خواهش می‌کنم! 🌿 Always here.';
    if (/چطوری|خوبی|how are you/.test(s)) return 'Running at 60fps, thanks for asking 😄 How can I help?';
    if (s.includes('?') || s.includes('؟')) return rnd([
      'Good question! In local mode I keep it simple — connect Supabase in Settings for cloud sync, and everything follows you across devices.',
      'سؤال خوبیه! از تنظیمات می‌تونی زبان، پوسته و پس‌زمینه رو عوض کنی 🎨',
      'Try long-pressing (or right-clicking) a message — replies, reactions, pins and forwarding all live there.',
    ]);
    return rnd([
      'Got it! I’m a demo assistant living entirely in your browser — but the chats around me feel pretty real, no? 🙂',
      'پیامت رو گرفتم! 📨 یادت باشه پیام‌های صوتی و استیکرها هم کار می‌کنن.',
      'Interesting! Forward it to Saved Messages so you don’t lose it 🔖',
      'I’d love to help more — type /help to see my commands ✨',
    ]);
  },

  ambient() {
    if (this.state.ambientDone) return;
    this.state.ambientDone = true;
    this._later(() => {
      const chat = this.chat('c-nima');
      if (!chat || chat.deleted) return;
      const m = {
        id: uid('m'), chatId: chat.id, from: 'u-nima', kind: 'text',
        text: 'راستی، فردا استودیو هستی؟ یه ترک جدید دارم باید بشنوی 🎧',
        ts: Date.now(), status: 'read', reactions: {}, pinned: false,
      };
      this.state.messages[chat.id].push(m);
      if (this.activeChatId !== chat.id) chat.unread = (chat.unread || 0) + 1;
      this.persist();
      this.bus.emit('message:new', { chatId: chat.id, msg: m, incoming: true });
      if (this.activeChatId !== chat.id && !chat.muted) { Sfx.notify(); this.bus.emit('notify', { chat, msg: m }); }
    }, 9000);
    this.persist();
  },
};