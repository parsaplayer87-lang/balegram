// Optional Supabase cloud mirror: backs up the workspace and syncs it across
// devices in realtime. The app is fully functional without it (local mode).
import { getSupabaseCreds, setSupabaseCreds } from './config.js';
import { store } from './store.js';

const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const cloud = {
  client: null,
  status: 'local', // local | connecting | connected | error
  channel: null,
  _pushTimer: null,
  _lastPushedRev: -1,
  _applying: false,

  async connect(url, key) {
    this.status = 'connecting';
    store.bus.emit('supabase', this.status);
    try {
      const mod = await import(CDN);
      const createClient = mod.createClient || mod.default?.createClient;
      if (!createClient) throw new Error('bad module');
      this.client = createClient(url, key, { realtime: { params: { eventsPerSecond: 5 } } });
      const { error } = await this.client.from('bg_chats').select('id').limit(1);
      if (error) throw error;
      setSupabaseCreds(url, key);
      await this.pullAll();
      await this.pushAll(true);
      this.subscribe();
      this.status = 'connected';
      store.bus.emit('supabase', this.status);
      this._hook = () => this.schedulePush();
      store.persistHooks.push(this._hook);
      return true;
    } catch (e) {
      console.warn('supabase connect failed', e);
      this.client = null;
      this.status = 'error';
      store.bus.emit('supabase', this.status);
      return false;
    }
  },

  disconnect() {
    try { this.channel?.unsubscribe(); } catch {}
    this.channel = null; this.client = null;
    setSupabaseCreds(null, null);
    this.status = 'local';
    if (this._hook) store.persistHooks = store.persistHooks.filter(fn => fn !== this._hook);
    store.bus.emit('supabase', this.status);
  },

  async pushAll(force = false) {
    if (!this.client || this._applying) return;
    const s = store.state;
    try {
      const profiles = Object.values(s.users).map(u => ({ id: u.id, data: u, updated_at: new Date().toISOString() }));
      const chats = Object.values(s.chats).map(c => ({ id: c.id, data: c, updated_at: new Date().toISOString() }));
      const messages = [];
      for (const [chatId, list] of Object.entries(s.messages))
        for (const m of list) messages.push({ id: m.id, chat_id: chatId, data: m, ts: m.ts, updated_at: new Date().toISOString() });
      for (const [table, rows] of [['bg_profiles', profiles], ['bg_chats', chats], ['bg_messages', messages]]) {
        for (let i = 0; i < rows.length; i += 200) {
          const { error } = await this.client.from(table).upsert(rows.slice(i, i + 200));
          if (error) throw error;
        }
      }
      this._lastPushedRev = s.rev;
    } catch (e) { console.warn('supabase push failed', e); }
  },

  schedulePush() {
    if (!this.client) return;
    clearTimeout(this._pushTimer);
    this._pushTimer = setTimeout(() => {
      if (store.state.rev !== this._lastPushedRev) this.pushAll();
    }, 2000);
  },

  async pullAll() {
    if (!this.client) return;
    this._applying = true;
    try {
      const [p, c, m] = await Promise.all([
        this.client.from('bg_profiles').select('*'),
        this.client.from('bg_chats').select('*'),
        this.client.from('bg_messages').select('*').order('ts', { ascending: true }),
      ]);
      const s = store.state;
      for (const row of p.data || []) if (row.data?.id) s.users[row.id] = { ...s.users[row.id], ...row.data };
      for (const row of c.data || []) if (row.data?.id) s.chats[row.id] = { ...s.chats[row.id], ...row.data };
      for (const row of m.data || []) {
        const msg = row.data;
        if (!msg?.id) continue;
        const list = s.messages[msg.chatId] || (s.messages[msg.chatId] = []);
        const i = list.findIndex(x => x.id === msg.id);
        if (i >= 0) list[i] = msg; else list.push(msg);
      }
      for (const list of Object.values(s.messages)) list.sort((a, b) => a.ts - b.ts);
      if (s.users['u-me']) s.me = s.users['u-me'];
      store.persist(true);
      store.bus.emit('sync');
    } catch (e) { console.warn('supabase pull failed', e); }
    finally { this._applying = false; }
  },

  subscribe() {
    if (!this.client) return;
    try {
      this.channel = this.client.channel('balegram-sync')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bg_messages' }, (payload) => {
          const row = payload.new;
          const msg = row?.data;
          if (!msg?.id || this._applying) return;
          const s = store.state;
          const list = s.messages[msg.chatId] || (s.messages[msg.chatId] = []);
          const i = list.findIndex(x => x.id === msg.id);
          const isNew = i < 0;
          if (isNew) list.push(msg); else list[i] = msg;
          list.sort((a, b) => a.ts - b.ts);
          store.bus.emit(isNew ? 'message:new' : 'message:update', { chatId: msg.chatId, msg, incoming: isNew && msg.from !== s.me.id, remote: true });
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'bg_chats' }, (payload) => {
          const chat = payload.new?.data;
          if (!chat?.id || this._applying) return;
          store.state.chats[chat.id] = { ...store.state.chats[chat.id], ...chat };
          store.bus.emit('chat:update', { chatId: chat.id, remote: true });
        })
        .subscribe();
    } catch (e) { console.warn('realtime subscribe failed', e); }
  },

  async autoConnect() {
    const creds = getSupabaseCreds();
    if (creds) await this.connect(creds.url, creds.key);
  },
};