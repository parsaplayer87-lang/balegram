import { CONFIG, getSupabaseCreds } from './config.js';
import { store } from './store.js';
import { cloud } from './supabase.js';
import { Bale } from './bale.js';
import { t, setLang, getLang, fmtNum, fmtSize, fmtDuration, fmtAgo, fmtTime, fmtDay } from './i18n.js';
import { icon, LOGO_SVG } from './icons.js';
import { esc, linkify, avaHTML, chatAva, chatItemHTML, chatListHTML, messagesHTML, chatHeaderHTML, composerHTML, placeholderHTML, emojiPanelHTML, attachPopHTML, previewOf, switchHTML, rowHTML, initials, serviceText } from './ui.js';
import { AVATAR_GRADS } from './seed.js';
import { compressImage, fileToDataURL, downloadURI, Sfx, setSoundsEnabled } from './media.js';

const $ = sel => document.querySelector(sel);
const leftPane = $('#left-pane'), rightPane = $('#right-pane');

const ui = {
  leftView: 'chats', leftStack: [],
  chatId: null, anchorTs: 0,
  folder: 'all', listQuery: '',
  selecting: false, selected: new Set(),
  replyTo: null, editing: null,
  drawer: null, drawerTab: 'media',
  emoji: { open: false, tab: 'emoji', cat: 'recent' },
  attachOpen: false,
  groupDraft: null, channelDraft: null,
  searchQuery: '',
  photoTarget: 'chat',
  forwardPayload: null,
  confirmPayload: null,
  recording: null,
  longPressFired: false,
};

// ================= appearance =================
function applySettings() {
  const s = store.state.settings;
  setLang(s.lang);
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = s.theme === 'dark' || (s.theme === 'system' && ((Bale.available && Bale.colorScheme === 'dark') || (!Bale.available && prefersDark)));
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.accent = s.accent;
  document.documentElement.style.setProperty('--msg-font-size', s.fontSize + 'px');
  setSoundsEnabled(s.sounds);
  document.querySelectorAll('.wallpaper').forEach(w => { w.className = 'wallpaper wp-' + s.wallpaper; });
  requestAnimationFrame(() => {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim();
    if (/^#([0-9a-f]{6})$/i.test(c)) Bale.setHeaderColor(c);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = dark ? '#121b25' : '#0e8f8b';
  });
}
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
  if (store.state.settings.theme === 'system') { applySettings(); renderAll(); }
});

// ================= router =================
function isMobile() { return window.innerWidth <= 900; }
function chatVisible() { return !!ui.chatId && (!isMobile() || document.body.classList.contains('pane-chat')); }

function syncActive() { store.activeChatId = chatVisible() ? ui.chatId : null; }

function updateBack() {
  const needBack = document.body.classList.contains('pane-chat') || ui.leftStack.length > 0 || !!ui.drawer || ui.selecting;
  Bale.showBack(needBack);
}

function nav(view) {
  ui.leftStack.push(ui.leftView);
  ui.leftView = view;
  document.body.classList.remove('pane-chat');
  syncActive();
  closeDrawer(true);
  renderLeft();
  updateBack();
}

function backLeft() {
  ui.leftView = ui.leftStack.pop() || 'chats';
  renderLeft();
  updateBack();
}

function goBack() {
  if ($('#lightbox-root.open')) return closeLightbox();
  if ($('#context-root.open')) return closeContext();
  if ($('#modal-root.open')) return closeModal();
  if ($('#sheet-root.open')) return closeSheet();
  if (ui.emoji.open || ui.attachOpen) { ui.emoji.open = false; ui.attachOpen = false; renderComposerZone(); return; }
  if (ui.drawer) return closeDrawer();
  if (ui.selecting) return exitSelect();
  if (document.body.classList.contains('pane-chat')) {
    document.body.classList.remove('pane-chat');
    syncActive(); renderLeft(); updateBack(); return;
  }
  if (ui.leftStack.length) return backLeft();
}

function openChat(id, { scrollToMsg = null } = {}) {
  const chat = store.chat(id);
  if (!chat) return;
  if (ui.chatId !== id) { ui.replyTo = null; ui.editing = null; }
  ui.anchorTs = chat.unread > 0 ? (chat.lastReadTs || 0) : 0;
  ui.chatId = id;
  ui.selecting = false; ui.selected.clear();
  ui.emoji.open = false; ui.attachOpen = false;
  document.body.classList.add('pane-chat');
  store.markRead(id);
  syncActive();
  renderRight();
  renderLeft(true);
  updateBack();
  Bale.haptic('light');
  if (scrollToMsg) setTimeout(() => scrollToMessage(scrollToMsg), 60);
  else scrollBottom(false);
  if (!isMobile()) setTimeout(() => $('#composer-input')?.focus(), 80);
}

// ================= left pane views =================
function renderLeft(keepScroll = false) {
  const scroller = leftPane.querySelector('.list-scroll, .view-scroll');
  const scrollTop = scroller ? scroller.scrollTop : 0;
  let html = '';
  switch (ui.leftView) {
    case 'chats': html = viewChats(); break;
    case 'archived': html = viewArchived(); break;
    case 'contacts': html = viewContacts(false); break;
    case 'new-message': html = viewContacts(true); break;
    case 'settings': html = viewSettings(); break;
    case 'profile': html = viewProfile(); break;
    case 'search': html = viewSearch(); break;
    case 'new-group': html = viewNewGroup(); break;
    case 'new-channel': html = viewNewChannel(); break;
    default: html = viewChats();
  }
  leftPane.innerHTML = html;
  if (keepScroll) {
    const s2 = leftPane.querySelector('.list-scroll, .view-scroll');
    if (s2) s2.scrollTop = scrollTop;
  }
  if (ui.leftView === 'search') {
    const inp = $('#global-search');
    if (inp && document.activeElement !== inp && !isMobile()) inp.focus();
  }
}

function viewChats() {
  const s = store.state.settings;
  let chats = store.sortedChats({ folder: ui.folder });
  if (ui.listQuery) {
    const q = ui.listQuery.toLowerCase();
    chats = chats.filter(c => store.chatTitle(c).toLowerCase().includes(q) || (c.username || '').toLowerCase().includes(q));
  }
  const unread = store.unreadTotal();
  const archivedN = Object.values(store.state.chats).filter(c => c.archived && !c.deleted).length;
  const tabs = [
    ['all', t('all'), unread], ['personal', t('personal'), 0], ['groups', t('groups'), 0],
    ['channels', t('channels'), 0], ['bots', t('bots'), 0],
  ];
  return `
    <div class="bar">
      <button class="icon-btn" data-action="main-menu" title="${t('menu') || 'Menu'}">${icon('menu')}</button>
      <div class="grow search-box">${icon('search')}<input id="list-search" placeholder="${t('searchPh')}" value="${esc(ui.listQuery)}" data-role="list-search"></div>
      <button class="icon-btn ${s.sounds ? '' : 'accent'}" data-action="toggle-sounds" title="${t('sounds')}">${icon(s.sounds ? 'sound' : 'mute')}</button>
    </div>
    <div class="tabs">${tabs.map(([k, label, n]) =>
      `<button class="tab ${ui.folder === k ? 'active' : ''}" data-action="folder" data-folder="${k}">${label}${n ? `<span class="n">${fmtNum(n)}</span>` : ''}</button>`).join('')}
    </div>
    <div class="list-scroll">
      ${archivedN && !ui.listQuery && ui.folder === 'all' ? `<div class="chat-item" data-action="open-archived">${avaHTML({ name: 'A', color: 6, emoji: '🗃' }, 50)}<div class="ci-body"><div class="ci-row"><span class="ci-name">${t('archivedChats')}</span></div><div class="ci-preview"><span class="txt">${fmtNum(archivedN)} ${t('chats').toLowerCase()}</span></div></div></div>` : ''}
      ${ui.listQuery ? `<div class="sr-section" style="cursor:pointer" data-action="search-everywhere">${t('searchEverywhere')} →</div>` : ''}
      ${chatListHTML(chats, chatVisible() ? ui.chatId : null)}
    </div>
    <button class="fab" data-action="new-menu" title="${t('newMessage')}">${icon('pencil')}</button>`;
}

function viewArchived() {
  const chats = store.sortedChats({ archived: true });
  return `
    <div class="bar"><button class="icon-btn" data-action="back-left">${icon('back')}</button><div class="grow bar-title">${t('archivedChats')}</div></div>
    <div class="list-scroll">${chatListHTML(chats, chatVisible() ? ui.chatId : null, { archived: true })}</div>`;
}

function viewContacts(forNew) {
  const contacts = store.state.contacts.map(id => store.user(id)).filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name, getLang() === 'fa' ? 'fa' : 'en'));
  return `
    <div class="bar">
      <button class="icon-btn" data-action="back-left">${icon('back')}</button>
      <div class="grow bar-title">${forNew ? t('newMessage') : t('contacts')}</div>
      <button class="icon-btn accent" data-action="add-contact" title="${t('addContact')}">${icon('plus')}</button>
    </div>
    <div class="view-scroll">
      ${forNew ? `<div class="section" style="margin-top:10px">
        ${rowHTML({ ico: 'users', color: 'var(--mint)', title: t('newGroup'), action: 'nav-new-group', chev: true })}
        ${rowHTML({ ico: 'megaphone', color: 'var(--lapis)', title: t('newChannel'), action: 'nav-new-channel', chev: true })}
      </div>` : ''}
      <div class="section">
        ${contacts.map(u => `<div class="pick-row" data-action="contact-open" data-user="${u.id}">
          ${avaHTML(u, 42, { online: u.online })}
          <div class="p-body"><div class="p-name">${esc(u.name)}</div><div class="p-sub">${u.online ? `<span style="color:var(--accent)">${t('online')}</span>` : u.username ? '@' + esc(u.username) : t('lastSeen', { t: fmtAgo(u.lastSeen) })}</div></div>
        </div>`).join('') || `<div class="empty-note">${t('noChats')}</div>`}
      </div>
    </div>`;
}

function viewSearch() {
  const q = ui.searchQuery;
  const res = store.searchAll(q);
  let results = '';
  if (q.trim()) {
    if (!res.chats.length && !res.messages.length) {
      results = `<div class="empty-list">${icon('search')}<div class="e-title">${t('noResults', { q: esc(q) })}</div></div>`;
    } else {
      if (res.chats.length) results += `<div class="sr-section">${t('chats')}</div>` + res.chats.map(c => chatItemHTML(c, null)).join('');
      if (res.messages.length) {
        results += `<div class="sr-section">${t('messagesFound')} · ${fmtNum(res.messages.length)}</div>`;
        results += res.messages.map(({ msg, chat }) => {
          const p = previewOf(msg);
          const rx = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
          const text = esc(p.text).replace(rx, '<mark>$1</mark>');
          return `<div class="sr-msg" data-action="search-open" data-chat="${chat.id}" data-msg="${msg.id}">
            ${chatAva(chat, 42)}
            <div class="s-body"><div class="s-top"><span class="s-name">${esc(store.chatTitle(chat))}</span><span class="s-time">${fmtDay(msg.ts)}</span></div>
            <div class="s-text">${msg.from === store.state.me.id ? `<b>${t('you')}: </b>` : ''}${text}</div></div>
          </div>`;
        }).join('');
      }
    }
  } else {
    results = `<div class="empty-list">${icon('search')}<div class="e-title">${t('searchEverywhere')}</div><div>${t('searchPh')}</div></div>`;
  }
  return `
    <div class="bar">
      <button class="icon-btn" data-action="back-left">${icon('back')}</button>
      <div class="grow search-box" style="height:40px">${icon('search')}<input id="global-search" placeholder="${t('searchPh')}" value="${esc(q)}" data-role="global-search"></div>
    </div>
    <div class="view-scroll" id="search-results">${results}</div>`;
}

function viewNewGroup() {
  const d = ui.groupDraft || (ui.groupDraft = { members: [], step: 1, title: '', description: '', emoji: '👥', color: 1 });
  const contacts = store.state.contacts.map(id => store.user(id)).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  if (d.step === 1) {
    return `
      <div class="bar">
        <button class="icon-btn" data-action="back-left">${icon('back')}</button>
        <div class="grow"><div class="bar-title">${t('newGroup')}</div><div class="bar-sub">${t('addMembers')}</div></div>
        <button class="btn" style="padding:8px 18px" data-action="group-next" ${d.members.length ? '' : 'disabled'}>${t('next')}</button>
      </div>
      ${d.members.length ? `<div class="chips">${d.members.map(id => { const u = store.user(id); return `<span class="chip-person">${avaHTML(u, 24)}${esc(u.name.split(' ')[0])}<button data-action="group-unpick" data-user="${id}">${icon('close')}</button></span>`; }).join('')}</div>` : ''}
      <div class="view-scroll">
        ${contacts.map(u => `<div class="pick-row" data-action="group-pick" data-user="${u.id}">
          ${avaHTML(u, 42, { online: u.online })}
          <div class="p-body"><div class="p-name">${esc(u.name)}</div><div class="p-sub">${u.username ? '@' + esc(u.username) : t('lastSeen', { t: fmtAgo(u.lastSeen) })}</div></div>
          <div class="checkbox ${d.members.includes(u.id) ? 'on' : ''}">${icon('check')}</div>
        </div>`).join('')}
      </div>`;
  }
  const emojis = ['👥', '🚀', '🌿', '🎨', '⚽', '🎮', '📚', '💼', '🏡', '🎧'];
  return `
    <div class="bar">
      <button class="icon-btn" data-action="group-step1">${icon('back')}</button>
      <div class="grow"><div class="bar-title">${t('newGroup')}</div><div class="bar-sub">${t('members', { n: fmtNum(d.members.length + 1) })}</div></div>
      <button class="btn" style="padding:8px 18px" data-action="group-create" ${d.title.trim() ? '' : 'disabled'}>${t('create')}</button>
    </div>
    <div class="view-scroll">
      <div class="section" style="padding:16px">
        <div style="display:flex;gap:14px;align-items:center">
          ${avaHTML({ name: d.title || 'G', color: d.color, emoji: d.emoji }, 64)}
          <div class="grow field" style="padding:0"><label>${t('groupName')}</label><input id="group-title" value="${esc(d.title)}" placeholder="${t('groupName')}" data-role="group-title" maxlength="64"></div>
        </div>
        <div class="field"><label>${t('description')}</label><textarea id="group-desc" rows="2" placeholder="${t('descPh')}" data-role="group-desc">${esc(d.description)}</textarea></div>
        <div class="swatches" style="padding:8px 0 0">${emojis.map(e => `<button class="swatch" style="background:var(--surface-2);font-size:20px;display:flex;align-items:center;justify-content:center;${d.emoji === e ? 'border-color:var(--accent)' : ''}" data-action="group-emoji" data-emoji="${e}">${e}</button>`).join('')}</div>
      </div>
    </div>`;
}

function viewNewChannel() {
  const d = ui.channelDraft || (ui.channelDraft = { title: '', description: '' });
  return `
    <div class="bar">
      <button class="icon-btn" data-action="back-left">${icon('back')}</button>
      <div class="grow bar-title">${t('newChannel')}</div>
      <button class="btn" style="padding:8px 18px" data-action="channel-create" ${d.title.trim() ? '' : 'disabled'}>${t('create')}</button>
    </div>
    <div class="view-scroll">
      <div class="section" style="padding:16px">
        <div style="display:flex;gap:14px;align-items:center">
          ${avaHTML({ name: d.title || 'C', color: 2, emoji: '📣' }, 64)}
          <div class="grow field" style="padding:0"><label>${t('channelName')}</label><input id="channel-title" value="${esc(d.title)}" placeholder="${t('channelName')}" data-role="channel-title" maxlength="64"></div>
        </div>
        <div class="field"><label>${t('description')}</label><textarea rows="3" placeholder="${t('descPh')}" data-role="channel-desc">${esc(d.description)}</textarea></div>
        <p class="text-muted text-small p16" style="padding:8px 0 0">${t('onlyAdmins')}</p>
      </div>
    </div>`;
}

function viewProfile() {
  const me = store.state.me;
  const emojis = [null, '🦁', '🌿', '🚀', '🎨', '🎧', '🌊', '⚡', '🦊', '🌸'];
  return `
    <div class="bar">
      <button class="icon-btn" data-action="back-left">${icon('back')}</button>
      <div class="grow bar-title">${t('editProfile')}</div>
      <button class="btn" style="padding:8px 18px" data-action="profile-save">${t('save')}</button>
    </div>
    <div class="view-scroll">
      <div class="profile-hero">
        ${avaHTML(me, 96)}
        <button class="btn ghost" style="padding:8px 16px" data-action="profile-photo">${icon('camera')} ${t('setProfilePhoto')}</button>
        ${me.photo ? `<button class="text-small" style="color:var(--danger)" data-action="profile-photo-remove">${t('removePhoto')}</button>` : ''}
      </div>
      <div class="section">
        <div class="field"><label>${t('name')}</label><input data-role="p-name" value="${esc(me.name)}" maxlength="48"></div>
        <div class="field"><label>${t('username')}</label><input data-role="p-username" value="${esc(me.username)}" placeholder="${t('usernamePh')}" maxlength="32"></div>
        <div class="field"><label>${t('bio')}</label><textarea data-role="p-bio" rows="2" placeholder="${t('bioPh')}" maxlength="140">${esc(me.bio)}</textarea></div>
        <div class="field"><label>${t('phone')}</label><input data-role="p-phone" value="${esc(me.phone)}" placeholder="${t('phonePh')}" maxlength="20"></div>
      </div>
      <div class="section-title">${t('avatarColor')}</div>
      <div class="section"><div class="swatches">${AVATAR_GRADS.map((g, i) => `<button class="swatch ${me.color === i && !me.emoji ? 'active' : ''}" style="background:${g}" data-action="p-color" data-color="${i}"></button>`).join('')}</div></div>
      <div class="section-title">${t('emojiAvatar')}</div>
      <div class="section"><div class="swatches">${emojis.map(e => `<button class="swatch ${me.emoji === e ? 'active' : ''}" style="background:var(--surface-2);font-size:20px;display:flex;align-items:center;justify-content:center" data-action="p-emoji" data-emoji="${e ?? ''}">${e ?? '✕'}</button>`).join('')}</div></div>
    </div>`;
}

function viewSettings() {
  const s = store.state.settings;
  const me = store.state.me;
  const raw = localStorage.getItem(CONFIG.STORAGE_KEY) || '';
  const used = raw.length;
  let mediaBytes = 0;
  for (const list of Object.values(store.state.messages)) for (const m of list) if (m.media?.url) mediaBytes += m.media.url.length;
  const mediaPct = used ? Math.min(100, Math.round(mediaBytes / used * 100)) : 0;
  const themes = [['light', t('light'), 'sun'], ['dark', t('dark'), 'moon'], ['system', t('system'), 'settings']];
  const accents = [['caspian', t('acCaspian'), 'linear-gradient(135deg,#2bb3a3,#17636b)'], ['lapis', t('acLapis'), 'linear-gradient(135deg,#5b8def,#2f4bc7)'], ['violet', t('acViolet'), 'linear-gradient(135deg,#a06bf0,#6d3fd1)'], ['rose', t('acRose'), 'linear-gradient(135deg,#f0729d,#d13f77)'], ['saffron', t('acSaffron'), 'linear-gradient(135deg,#f2b23e,#e07b1f)'], ['mint', t('acMint'), 'linear-gradient(135deg,#4cc38a,#1f8a5d)']];
  const wps = [['doodles', t('wpDoodles')], ['mesh', t('wpMesh')], ['sunset', t('wpSunset')], ['ocean', t('wpOcean')], ['plain', t('wpPlain')]];
  const cloudBadge = cloud.status === 'connected' ? `<span class="badge" style="background:var(--ok)">${t('connectedBadge')}</span>` : `<span class="badge muted">${t('previewBadge')}</span>`;
  return `
    <div class="bar">
      <button class="icon-btn" data-action="back-left">${icon('back')}</button>
      <div class="grow bar-title">${t('settings')}</div>
    </div>
    <div class="view-scroll">
      <div class="profile-hero" data-action="nav-profile" style="cursor:pointer">
        ${avaHTML(me, 96)}
        <div class="p-name">${esc(me.name)}</div>
        <div class="p-sub">${me.username ? '@' + esc(me.username) : ''}${me.phone ? ' · ' + esc(me.phone) : ''}</div>
      </div>

      <div class="section-title">${t('appearance')}</div>
      <div class="section">
        <div class="row static"><div class="r-ico" style="background:var(--violet)">${icon('palette')}</div>
          <div class="r-body"><div class="r-title">${t('theme')}</div></div>
          <div style="display:flex;gap:4px;background:var(--surface-2);border-radius:11px;padding:3px">
            ${themes.map(([v, label, ic]) => `<button class="icon-btn" style="width:auto;padding:0 10px;height:32px;border-radius:8px;font-size:12.5px;font-weight:700;gap:5px;${s.theme === v ? 'background:var(--accent);color:#fff' : ''}" data-action="set-theme" data-value="${v}">${icon(ic)}<span class="theme-label">${label}</span></button>`).join('')}
          </div>
        </div>
        <div class="row static"><div class="r-ico" style="background:var(--rose)">${icon('heart')}</div><div class="r-body"><div class="r-title">${t('accentColor')}</div></div></div>
        <div class="swatches" style="padding-top:0">${accents.map(([v, label, g]) => `<button class="swatch ${s.accent === v ? 'active' : ''}" style="background:${g}" title="${label}" data-action="set-accent" data-value="${v}"></button>`).join('')}</div>
        <div class="row static"><div class="r-ico" style="background:var(--lapis)">${icon('image')}</div><div class="r-body"><div class="r-title">${t('wallpaper')}</div></div></div>
        <div class="wp-previews" style="padding-top:0">${wps.map(([v, label]) => `<div class="wp-preview wp-${v} ${s.wallpaper === v ? 'active' : ''}" data-action="set-wp" data-value="${v}" style="background-color:var(--chat-bg)"><span>${label}</span></div>`).join('')}</div>
        <div class="row static"><div class="r-ico" style="background:var(--saffron)">${icon('type')}</div><div class="r-body"><div class="r-title">${t('fontSize')}</div></div></div>
        <div class="slider-row" style="padding-top:0"><span style="font-size:12px">A</span><input type="range" min="13" max="19" step="1" value="${s.fontSize}" data-role="font-size"><span style="font-size:19px;font-weight:700">A</span><span class="val">${fmtNum(s.fontSize)}</span></div>
      </div>

      <div class="section-title">${t('general')}</div>
      <div class="section">
        ${rowHTML({ ico: 'globe', color: 'var(--lapis)', title: t('language'), value: getLang() === 'fa' ? t('persian') : t('english'), action: 'toggle-lang', chev: true })}
        <div class="row static"><div class="r-ico" style="background:var(--pomegranate)">${icon('bell')}</div><div class="r-body"><div class="r-title">${t('notifications')}</div><div class="r-sub">${t('notifSub')}</div></div>${switchHTML(s.notifications, 'set-toggle', 'data-key="notifications"')}</div>
        <div class="row static"><div class="r-ico" style="background:var(--accent)">${icon('sound')}</div><div class="r-body"><div class="r-title">${t('sounds')}</div><div class="r-sub">${t('soundsSub')}</div></div>${switchHTML(s.sounds, 'set-toggle', 'data-key="sounds"')}</div>
      </div>

      <div class="section-title">${t('privacy')}</div>
      <div class="section">
        <div class="row static"><div class="r-ico" style="background:var(--mint)">${icon('checks')}</div><div class="r-body"><div class="r-title">${t('readReceipts')}</div><div class="r-sub">${t('readReceiptsSub')}</div></div>${switchHTML(s.readReceipts, 'set-toggle', 'data-key="readReceipts"')}</div>
        <div class="row static"><div class="r-ico" style="background:var(--violet)">${icon('eye')}</div><div class="r-body"><div class="r-title">${t('lastSeenPrivacy')}</div><div class="r-sub">${t('lastSeenPrivacySub')}</div></div>${switchHTML(s.lastSeenPrivacy, 'set-toggle', 'data-key="lastSeenPrivacy"')}</div>
      </div>

      <div class="section-title">${t('storage')}</div>
      <div class="section">
        <div class="row static"><div class="r-ico" style="background:var(--saffron)">${icon('database')}</div>
          <div class="r-body"><div class="r-title">${t('storageUsed', { s: fmtSize(used) })}</div>
            <div class="storage-bar"><i style="width:${mediaPct}%;background:var(--saffron)"></i><i style="width:${100 - mediaPct}%;background:var(--accent)"></i></div>
            <div class="r-sub">${t('media')} ${fmtSize(mediaBytes)} · ${t('messages')} ${fmtSize(Math.max(0, used - mediaBytes))}</div>
          </div>
        </div>
        ${rowHTML({ ico: 'refresh', color: 'var(--lapis)', title: t('supabase'), sub: cloud.status === 'connected' ? t('connected') : t('supabaseSub'), action: 'supabase-modal', right: cloudBadge, chev: true })}
        ${rowHTML({ ico: 'trash', color: 'var(--danger)', title: t('clearCache'), sub: t('clearCacheSub'), action: 'reset-all' })}
      </div>

      <div class="section-title">${t('baleSection')}</div>
      <div class="bale-banner">${icon('zap')}<div>${Bale.available ? `<b>${t('insideBale')}</b> · ${Bale.platform}` : t('previewMode')}</div></div>
      <div class="section">
        ${rowHTML({ ico: 'phone', color: 'var(--mint)', title: t('requestPhone'), action: 'bale-phone', chev: true })}
        ${rowHTML({ ico: 'home', color: 'var(--accent)', title: t('addToHome'), action: 'bale-home', chev: true })}
        ${rowHTML({ ico: 'share', color: 'var(--violet)', title: t('shareApp'), action: 'bale-share', chev: true })}
        ${rowHTML({ ico: 'info', color: 'var(--lapis)', title: t('openDocs'), action: 'bale-docs', chev: true })}
      </div>

      <div class="section-title">${t('about')}</div>
      <div class="section">
        <div class="row static"><div class="r-ico" style="background:var(--accent-grad)">${LOGO_SVG.replace('<svg', '<svg style="width:22px;height:22px;color:#fff"')}</div><div class="r-body"><div class="r-title">${t('appName')}</div><div class="r-sub">${t('tagline')}</div></div><span class="r-value">${t('version')} ${CONFIG.VERSION}</span></div>
      </div>
    </div>`;
}

// ================= right pane =================
function renderRight() {
  const chat = store.chat(ui.chatId);
  if (!chat) { rightPane.innerHTML = placeholderHTML(); return; }
  rightPane.innerHTML = `
    ${chatHeaderHTML(chat, { selecting: ui.selecting, selectedCount: ui.selected.size })}
    <div class="messages-wrap">
      <div class="wallpaper wp-${store.state.settings.wallpaper}"></div>
      <div class="messages" id="messages">${messagesHTML(chat, ui.anchorTs)}${typingBubble()}</div>
      <button class="scroll-down hidden" id="scroll-down" data-action="scroll-bottom">${icon('down')}</button>
    </div>
    ${composerHTML(chat, ui)}`;
  const msgs = $('#messages');
  msgs?.addEventListener('scroll', onMessagesScroll, { passive: true });
  if (ui.selecting) markSelectedDOM();
}

function typingBubble() {
  const chat = store.chat(ui.chatId);
  if (!chat) return '';
  const ty = store.typing[chat.id];
  if (!ty || ty.until < Date.now()) return '';
  return `<div class="msg in typing-row"><div class="stack"><div class="bubble typing-bubble"><i></i><i></i><i></i></div></div></div>`;
}

function renderComposerZone() {
  const chat = store.chat(ui.chatId);
  const zone = rightPane.querySelector('.composer-zone');
  if (!chat || !zone) return;
  const val = $('#composer-input')?.value;
  zone.outerHTML = composerHTML(chat, ui);
  const inp = $('#composer-input');
  if (inp) {
    if (val !== undefined && !ui.editing) inp.value = val;
    autoGrow(inp);
    inp.addEventListener('input', onComposerInput);
    inp.addEventListener('keydown', onComposerKey);
    if (ui.emoji.open) $('#emoji-panel-slot').innerHTML = emojiPanelHTML(ui.emoji.tab, ui.emoji.cat);
    if (ui.attachOpen) $('#attach-slot').innerHTML = attachPopHTML();
  }
}

function atBottom() {
  const el = $('#messages');
  return !el || el.scrollHeight - el.scrollTop - el.clientHeight < 90;
}
function scrollBottom(smooth = true) {
  const el = $('#messages');
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}
function onMessagesScroll() {
  const btn = $('#scroll-down');
  if (btn) btn.classList.toggle('hidden', atBottom());
}

function updateMessagesView({ toBottom = false } = {}) {
  const chat = store.chat(ui.chatId);
  const el = $('#messages');
  if (!chat || !el) return;
  const wasBottom = atBottom();
  const st = el.scrollTop;
  el.innerHTML = messagesHTML(chat, ui.anchorTs) + typingBubble();
  if (toBottom || wasBottom) scrollBottom(false);
  else el.scrollTop = st;
  if (ui.selecting) markSelectedDOM();
  onMessagesScroll();
}

function updateHeader() {
  const chat = store.chat(ui.chatId);
  const titles = rightPane.querySelector('.chat-header .titles');
  if (chat && titles) {
    titles.innerHTML = `<div class="bar-title">${esc(store.chatTitle(chat))}</div>${chatSubHTMLSafe(chat)}`;
  }
}
function chatSubHTMLSafe(chat) {
  // re-use header sub logic without circular import weight
  const ty = store.typing[chat.id];
  if (ty && ty.until > Date.now()) {
    const name = chat.type === 'group' ? esc(store.displayName(ty.userId).split(' ')[0]) + ' ' : '';
    return `<div class="bar-sub typing">${name}${chat.type === 'group' ? t('typingDots') : t('typing')}</div>`;
  }
  if (chat.type === 'saved') return `<div class="bar-sub">${t('emptySaved')}</div>`;
  if (chat.type === 'private' || chat.type === 'bot') {
    const p = store.peerOf(chat);
    if (chat.blocked) return `<div class="bar-sub">${t('blocked')}</div>`;
    if (p?.isBot) return `<div class="bar-sub">${t('bot')}</div>`;
    if (p?.online) return `<div class="bar-sub online">${t('online')}</div>`;
    return `<div class="bar-sub">${t('lastSeen', { t: fmtAgo(p?.lastSeen || chat.createdAt) })}</div>`;
  }
  if (chat.type === 'channel') return `<div class="bar-sub">${t('subscribers', { n: fmtNum(chat.memberCount || chat.members.length) })}</div>`;
  return `<div class="bar-sub">${t('members', { n: fmtNum(chat.memberCount || chat.members.length) })}</div>`;
}

function scrollToMessage(id) {
  const el = rightPane.querySelector(`[data-msg="${id}"]`);
  if (!el) return;
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
}

function markSelectedDOM() {
  rightPane.querySelectorAll('.msg').forEach(el => el.classList.toggle('selected', ui.selected.has(el.dataset.msg)));
}
function exitSelect() { ui.selecting = false; ui.selected.clear(); renderRight(); updateBack(); }

// ================= drawer: chat info =================
function openDrawer(chatId) {
  ui.drawer = chatId; ui.drawerTab = 'media';
  renderDrawer();
  requestAnimationFrame(() => $('#drawer-root').classList.add('open'));
  updateBack();
}
function closeDrawer(instant = false) {
  if (!ui.drawer && !$('#drawer-root').innerHTML) return;
  ui.drawer = null;
  const root = $('#drawer-root');
  root.classList.remove('open');
  if (instant) root.innerHTML = '';
  else setTimeout(() => { if (!ui.drawer) root.innerHTML = ''; }, 280);
  updateBack();
}

function renderDrawer() {
  const chat = store.chat(ui.drawer);
  if (!chat) return closeDrawer(true);
  const isGroup = chat.type === 'group', isChannel = chat.type === 'channel', isPrivate = chat.type === 'private';
  const peer = store.peerOf(chat);
  const meAdmin = chat.admins.includes(store.state.me.id);
  const list = store.msgs(chat.id);
  const photos = list.filter(m => m.kind === 'photo');
  const files = list.filter(m => m.kind === 'file');
  const links = [];
  for (const m of list) { const mm = (m.text || '').match(/https?:\/\/[^\s]+/g); if (mm) links.push(...mm.map(url => ({ url, msg: m }))); }
  let tabContent = '';
  if (ui.drawerTab === 'media') tabContent = photos.length ? `<div class="media-grid">${photos.map(m => `<img src="${esc(m.media.url)}" data-action="photo" data-id="${m.id}" data-chat="${chat.id}" loading="lazy">`).join('')}</div>` : `<div class="empty-note">${icon('image')}${t('media')} · 0</div>`;
  else if (ui.drawerTab === 'files') tabContent = files.length ? files.map(m => `<div class="row" data-action="file-download" data-id="${m.id}" data-chat="${chat.id}"><div class="r-ico" style="background:var(--accent-grad)">${icon('file')}</div><div class="r-body"><div class="r-title">${esc(m.media.name)}</div><div class="r-sub">${fmtSize(m.media.size || 0)} · ${fmtDay(m.ts)}</div></div>${icon('download', 'chev')}</div>`).join('') : `<div class="empty-note">${icon('file')}${t('files')} · 0</div>`;
  else tabContent = links.length ? links.map(l => `<div class="row" data-action="link" data-url="${esc(l.url)}"><div class="r-ico" style="background:var(--lapis)">${icon('link')}</div><div class="r-body"><div class="r-title" style="word-break:break-all">${esc(l.url.replace(/^https?:\/\//, ''))}</div><div class="r-sub">${fmtDay(l.msg.ts)}</div></div></div>`).join('') : `<div class="empty-note">${icon('link')}${t('links')} · 0</div>`;

  $('#drawer-root').innerHTML = `
    <div class="drawer-scrim" data-action="drawer-close"></div>
    <div class="drawer">
      <div class="bar"><button class="icon-btn" data-action="drawer-close">${icon('close')}</button><div class="grow bar-title">${t('about')}</div></div>
      <div class="view-scroll">
        <div class="info-hero">
          ${chatAva(chat, 88)}
          <div class="i-name">${esc(store.chatTitle(chat))}</div>
          <div class="i-sub">${chat.type === 'channel' ? t('subscribers', { n: fmtNum(chat.memberCount || 1) }) : isGroup ? t('members', { n: fmtNum(chat.memberCount || chat.members.length) }) : peer?.online ? t('online') : peer ? t('lastSeen', { t: fmtAgo(peer.lastSeen) }) : ''}</div>
        </div>
        <div class="section">
          ${chat.username ? rowHTML({ ico: 'at', color: 'var(--lapis)', title: '@' + esc(chat.username), sub: t('username'), action: 'copy-text', right: '' }) : ''}
          ${(chat.description || peer?.bio) ? `<div class="row static"><div class="r-ico" style="background:var(--accent)">${icon('info')}</div><div class="r-body"><div class="r-title" style="white-space:normal">${esc(chat.description || peer.bio)}</div><div class="r-sub">${t('bio')}</div></div></div>` : ''}
          ${chat.inviteLink ? rowHTML({ ico: 'link', color: 'var(--violet)', title: t('inviteLink'), sub: esc(chat.inviteLink), action: 'copy-invite' }) : ''}
          ${isPrivate && peer?.phone ? rowHTML({ ico: 'phone', color: 'var(--mint)', title: esc(peer.phone), sub: t('phone'), action: 'copy-text' }) : ''}
          <div class="row static"><div class="r-ico" style="background:var(--saffron)">${icon('bell')}</div><div class="r-body"><div class="r-title">${t('notifications')}</div></div>${switchHTML(!chat.muted, 'drawer-mute')}</div>
        </div>
        ${isGroup ? `<div class="section">
          <div class="row" data-action="drawer-add-members"><div class="r-ico" style="background:var(--accent)">${icon('plus')}</div><div class="r-body"><div class="r-title">${t('addMembers')}</div></div></div>
          ${chat.members.map(id => { const u = store.user(id); if (!u) return ''; const role = id === store.state.me.id ? t('you') : chat.admins.includes(id) ? t('admin') : ''; return `<div class="member-row" data-action="member-menu" data-user="${id}">
            ${avaHTML(u, 42, { online: u.online })}
            <div class="m-body"><div class="m-name">${esc(u.name)}</div><div class="m-sub">${u.online ? t('online') : t('lastSeen', { t: fmtAgo(u.lastSeen) })}</div></div>
            ${role ? `<span class="m-role">${role}</span>` : ''}
          </div>`; }).join('')}
        </div>` : ''}
        <div class="section" style="padding:0;overflow:hidden">
          <div class="media-tabs">
            <button class="${ui.drawerTab === 'media' ? 'active' : ''}" data-action="drawer-tab" data-tab="media">${t('media')}</button>
            <button class="${ui.drawerTab === 'files' ? 'active' : ''}" data-action="drawer-tab" data-tab="files">${t('files')}</button>
            <button class="${ui.drawerTab === 'links' ? 'active' : ''}" data-action="drawer-tab" data-tab="links">${t('links')}</button>
          </div>
          ${tabContent}
        </div>
        <div class="section">
          ${rowHTML({ ico: 'trash', color: 'var(--saffron)', title: t('clearHistory'), action: 'drawer-clear' })}
          ${isPrivate ? rowHTML({ ico: 'lock', color: 'var(--danger)', title: chat.blocked ? t('unblock') : t('block'), action: 'drawer-block' }) : ''}
          ${isGroup || isChannel ? rowHTML({ ico: 'logout', color: 'var(--danger)', title: isChannel ? t('leaveChannel') : t('leaveGroup'), action: 'drawer-leave' }) : ''}
          ${rowHTML({ ico: 'trash', color: 'var(--danger)', title: t('deleteChat'), action: 'drawer-delete' })}
        </div>
      </div>
    </div>`;
}

// ================= modal / sheet / context / toast / lightbox =================
function openModal(html) { $('#modal-root').innerHTML = `<div class="modal-scrim" data-action="modal-cancel"></div><div class="modal">${html}</div>`; $('#modal-root').classList.add('open'); }
function closeModal() { $('#modal-root').classList.remove('open'); $('#modal-root').innerHTML = ''; ui.confirmPayload = null; ui.forwardPayload = null; }

function confirmModal({ title, body, okLabel = t('delete'), danger = true, onOk }) {
  ui.confirmPayload = onOk;
  openModal(`
    <div class="modal-head"><div class="m-title">${esc(title)}</div></div>
    <div class="modal-body padded"><p class="text-muted">${esc(body)}</p></div>
    <div class="modal-foot"><button class="btn ghost" data-action="modal-cancel">${t('cancel')}</button><button class="btn ${danger ? 'danger' : ''}" data-action="confirm-ok">${esc(okLabel)}</button></div>`);
}

function openSheet(html) { $('#sheet-root').innerHTML = `<div class="sheet-scrim" data-action="sheet-close"></div><div class="sheet"><div class="grabber"></div>${html}</div>`; $('#sheet-root').classList.add('open'); }
function closeSheet() { $('#sheet-root').classList.remove('open'); $('#sheet-root').innerHTML = ''; }

function sheetItem(ico, label, action, extra = '', danger = false) {
  return `<button class="menu-item ${danger ? 'danger' : ''}" data-action="${action}" ${extra}>${icon(ico)} ${label}</button>`;
}

function openContext(x, y, html) {
  const root = $('#context-root');
  root.innerHTML = `<div class="ctx-scrim" data-action="ctx-close"></div><div class="ctx-menu">${html}</div>`;
  root.classList.add('open');
  const menu = root.querySelector('.ctx-menu');
  const r = menu.getBoundingClientRect();
  const px = Math.min(Math.max(8, x), window.innerWidth - r.width - 8);
  const py = Math.min(Math.max(8, y), window.innerHeight - r.height - 8);
  menu.style.left = px + 'px'; menu.style.top = py + 'px';
}
function closeContext() { $('#context-root').classList.remove('open'); $('#context-root').innerHTML = ''; }

let toastTimer = null;
function toast(text, { icon: ic = 'check', action = null, duration = 2800 } = {}) {
  const root = $('#toast-root');
  root.innerHTML = `<div class="toast">${icon(ic)}<span>${esc(text)}</span>${action ? `<span class="t-action" id="toast-action">${esc(action.label)}</span>` : ''}</div>`;
  if (action) $('#toast-action').onclick = () => { root.innerHTML = ''; action.fn(); };
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    const el = root.querySelector('.toast');
    if (el) { el.classList.add('out'); setTimeout(() => { if (root.contains(el)) root.innerHTML = ''; }, 260); }
  }, duration);
}

function openLightbox(msg, chat) {
  const sender = msg.from === store.state.me.id ? t('you') : store.displayName(msg.from);
  $('#lightbox-root').innerHTML = `
    <div class="lb-scrim" data-action="lightbox-close"></div>
    <div class="lb-bar">
      ${avaHTML(store.user(msg.from) || { name: sender, color: 0 }, 40)}
      <div class="grow"><div class="lb-title">${esc(sender)}</div><div class="lb-sub">${fmtDay(msg.ts)}, ${fmtTime(msg.ts)}</div></div>
      <button class="icon-btn" data-action="lightbox-download" data-id="${msg.id}" data-chat="${chat.id}">${icon('download')}</button>
      <button class="icon-btn" data-action="lightbox-close">${icon('close')}</button>
    </div>
    <div class="lb-img-wrap"><img src="${esc(msg.media.url)}" alt=""></div>
    ${msg.media?.caption ? `<div class="lb-caption">${linkify(msg.media.caption)}</div>` : ''}`;
  $('#lightbox-root').classList.add('open');
}
function closeLightbox() { $('#lightbox-root').classList.remove('open'); $('#lightbox-root').innerHTML = ''; }

function findMsg(chatId, id) {
  if (chatId) return store.msgs(chatId).find(m => m.id === id);
  for (const list of Object.values(store.messages)) { const m = list.find(x => x.id === id); if (m) return m; }
  return null;
}

// ================= forward / member / contact / supabase modals =================
function openForwardModal(payload) {
  ui.forwardPayload = payload;
  const chats = [store.chat('c-saved'), ...store.sortedChats()].filter(Boolean).filter((c, i, a) => a.findIndex(x => x.id === c.id) === i);
  openModal(`
    <div class="modal-head"><div class="m-title">${t('forwardTo')}</div><button class="icon-btn" data-action="modal-cancel">${icon('close')}</button></div>
    <div class="search-wrap"><div class="search-box">${icon('search')}<input id="forward-search" placeholder="${t('chooseChat')}"></div></div>
    <div class="modal-body" id="forward-list">${chats.map(c => `<div class="chat-item" data-action="forward-to" data-chat="${c.id}">${chatAva(c, 44)}<div class="ci-body"><div class="ci-row"><span class="ci-name">${esc(store.chatTitle(c))}</span></div><div class="ci-preview"><span class="txt">${c.type === 'saved' ? t('emptySaved') : t('members', { n: fmtNum(c.members?.length || 1) })}</span></div></div></div>`).join('')}</div>`);
  $('#forward-search')?.addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const filtered = chats.filter(c => store.chatTitle(c).toLowerCase().includes(q));
    $('#forward-list').innerHTML = filtered.map(c => `<div class="chat-item" data-action="forward-to" data-chat="${c.id}">${chatAva(c, 44)}<div class="ci-body"><div class="ci-row"><span class="ci-name">${esc(store.chatTitle(c))}</span></div></div></div>`).join('');
  });
}

function openMemberModal(userId) {
  const u = store.user(userId);
  const chat = store.chat(ui.drawer);
  if (!u || !chat) return;
  const meAdmin = chat.admins.includes(store.state.me.id);
  const isMe = userId === store.state.me.id;
  const isAdmin = chat.admins.includes(userId);
  openModal(`
    <div class="modal-body padded" style="text-align:center">
      ${avaHTML(u, 80, { online: u.online })}
      <div class="p-name mt8" style="font-size:18px;font-weight:800">${esc(u.name)}</div>
      <div class="text-muted text-small">${u.username ? '@' + esc(u.username) : t('lastSeen', { t: fmtAgo(u.lastSeen) })}</div>
    </div>
    <div class="modal-body" style="padding-top:0">
      ${!isMe ? sheetItem('send', t('messageAction'), 'member-message', `data-user="${userId}"`) : ''}
      ${meAdmin && !isMe ? sheetItem('shield', isAdmin ? t('dismissAdmin') : t('makeAdmin'), 'member-admin', `data-user="${userId}"`) : ''}
      ${meAdmin && !isMe ? sheetItem('trash', t('removeMember'), 'member-remove', `data-user="${userId}"`, true) : ''}
    </div>`);
}

function openAddContactModal() {
  openModal(`
    <div class="modal-head"><div class="m-title">${t('newContact')}</div><button class="icon-btn" data-action="modal-cancel">${icon('close')}</button></div>
    <div class="modal-body">
      <div class="field"><label>${t('firstName')} *</label><input id="c-first" maxlength="32"></div>
      <div class="field"><label>${t('lastName')}</label><input id="c-last" maxlength="32"></div>
      <div class="field"><label>${t('phone')}</label><input id="c-phone" placeholder="+98 912 345 6789" maxlength="20"></div>
    </div>
    <div class="modal-foot"><button class="btn ghost" data-action="modal-cancel">${t('cancel')}</button><button class="btn" data-action="contact-create">${t('create')}</button></div>`);
  setTimeout(() => $('#c-first')?.focus(), 60);
}

function openSupabaseModal() {
  const creds = getSupabaseCreds();
  const status = cloud.status === 'connected' ? t('connected') : cloud.status === 'connecting' ? t('loading') : t('localMode');
  openModal(`
    <div class="modal-head"><div class="m-title">${t('supabase')}</div><button class="icon-btn" data-action="modal-cancel">${icon('close')}</button></div>
    <div class="modal-body">
      <div class="bale-banner" style="margin:8px 16px">${icon('database')}<div>${esc(status)}</div></div>
      <div class="field"><label>${t('supabaseUrl')}</label><input id="sb-url" placeholder="https://xxxx.supabase.co" value="${esc(creds?.url || '')}"></div>
      <div class="field"><label>${t('supabaseKey')}</label><input id="sb-key" placeholder="eyJhbGciOi…" value="${esc(creds?.key || '')}"></div>
      <p class="text-muted text-small" style="padding:8px 16px">${t('supabaseHint')}</p>
    </div>
    <div class="modal-foot">
      ${cloud.status === 'connected' ? `<button class="btn ghost" data-action="supabase-disconnect">${t('disconnect')}</button>` : ''}
      <button class="btn" data-action="supabase-connect">${cloud.status === 'connecting' ? t('loading') : t('connect')}</button>
    </div>`);
}

// ================= composer logic =================
function autoGrow(inp) {
  inp.style.height = 'auto';
  inp.style.height = Math.min(132, inp.scrollHeight) + 'px';
}
function updateSendBtn() {
  const inp = $('#composer-input');
  const btn = rightPane.querySelector('.send-btn');
  if (!inp || !btn) return;
  const has = !!inp.value.trim() || !!ui.editing;
  btn.classList.toggle('mic', !has);
  btn.innerHTML = has ? icon('send') : icon('mic');
}
let typingThrottle = 0;
function onComposerInput(e) {
  const inp = e.target;
  autoGrow(inp);
  updateSendBtn();
  if (ui.chatId) store.setDraft(ui.chatId, ui.editing ? '' : inp.value);
  if (Date.now() - typingThrottle > 2500) { typingThrottle = Date.now(); store.broadcastTyping(ui.chatId); }
}
function onComposerKey(e) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); doSend(); }
}

function doSend() {
  const chat = store.chat(ui.chatId);
  const inp = $('#composer-input');
  if (!chat || !inp) return;
  const text = inp.value.trim();
  if (ui.editing) {
    if (!text) return;
    store.editMessage(chat.id, ui.editing, text);
    ui.editing = null;
    renderComposerZone();
    updateMessagesView();
    Bale.haptic('light');
    return;
  }
  if (!text) { startRecording(); return; }
  store.sendMessage(chat.id, { kind: 'text', text, replyTo: ui.replyTo });
  ui.replyTo = null;
  inp.value = '';
  renderComposerZone();
  updateMessagesView({ toBottom: true });
  $('#composer-input')?.focus();
  Bale.haptic('light');
}

// ================= voice =================
let audioEl = null, audioMsgId = null, audioRate = 1;

function stopAudio() {
  if (audioEl) { audioEl.pause(); audioEl.src = ''; audioEl = null; }
  if (audioMsgId) {
    const card = document.querySelector(`[data-voice="${audioMsgId}"]`);
    card?.querySelector('.voice-play')?.replaceChildren();
    const btn = card?.querySelector('.voice-play');
    if (btn) btn.innerHTML = icon('play');
    card?.querySelectorAll('.waveform i').forEach(i => i.classList.remove('on'));
  }
  audioMsgId = null;
}

function playVoice(id) {
  const m = findMsg(ui.chatId, id) || findMsg(null, id);
  if (!m?.media?.url) return;
  if (audioMsgId === id && audioEl) {
    if (audioEl.paused) { audioEl.play(); setVoiceIcon(id, 'pause'); }
    else { audioEl.pause(); setVoiceIcon(id, 'play'); }
    return;
  }
  stopAudio();
  audioEl = new Audio(m.media.url);
  audioEl.playbackRate = audioRate;
  audioMsgId = id;
  audioEl.addEventListener('timeupdate', () => {
    const card = document.querySelector(`[data-voice="${id}"]`);
    if (!card || !audioEl) return;
    const ratio = audioEl.duration ? audioEl.currentTime / audioEl.duration : 0;
    const bars = card.querySelectorAll('.waveform i');
    bars.forEach((b, i) => b.classList.toggle('on', i / bars.length <= ratio));
    const time = card.querySelector('.v-time');
    if (time) time.textContent = fmtDuration(audioEl.duration ? audioEl.duration - audioEl.currentTime : m.media.duration);
  });
  audioEl.addEventListener('ended', () => { setVoiceIcon(id, 'play'); const card = document.querySelector(`[data-voice="${id}"]`); card?.querySelectorAll('.waveform i').forEach(i => i.classList.remove('on')); const time = card?.querySelector('.v-time'); if (time) time.textContent = fmtDuration(m.media.duration); audioMsgId = null; });
  audioEl.play().then(() => setVoiceIcon(id, 'pause')).catch(() => toast(t('error'), { icon: 'info' }));
}
function setVoiceIcon(id, which) {
  const btn = document.querySelector(`[data-voice="${id}"] .voice-play`);
  if (btn) btn.innerHTML = icon(which);
}
function seekVoice(id, ev) {
  if (audioMsgId !== id || !audioEl) { playVoice(id); return; }
  const wrap = ev.currentTarget || ev.target.closest('.waveform');
  const r = wrap.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
  if (audioEl.duration) audioEl.currentTime = ratio * audioEl.duration;
}
function cycleRate(id) {
  audioRate = audioRate === 1 ? 1.5 : audioRate === 1.5 ? 2 : 1;
  if (audioEl) audioEl.playbackRate = audioRate;
  document.querySelectorAll(`[data-voice="${id}"] .voice-rate`).forEach(b => b.textContent = audioRate + '×');
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    toast(t('micDenied'), { icon: 'mic' }); return;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : '';
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const started = Date.now();
    const timer = setInterval(() => {
      const el = $('#rec-time');
      if (el) el.textContent = fmtDuration((Date.now() - started) / 1000);
    }, 250);
    ui.recording = { rec, stream, chunks, started, timer, send: false };
    rec.onstop = async () => {
      clearInterval(timer);
      stream.getTracks().forEach(tr => tr.stop());
      const dur = (Date.now() - started) / 1000;
      const wasSend = ui.recording?.send;
      ui.recording = null;
      renderComposerZone();
      if (!wasSend) return;
      if (dur < 0.8) { toast(t('voiceTooShort'), { icon: 'mic' }); return; }
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      const url = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
      store.sendMessage(ui.chatId, { kind: 'voice', text: '', media: { url, duration: Math.round(dur * 10) / 10 }, replyTo: ui.replyTo });
      ui.replyTo = null;
      renderComposerZone();
      updateMessagesView({ toBottom: true });
    };
    rec.start();
    const zone = rightPane.querySelector('.composer-zone');
    if (zone) zone.innerHTML = `<div class="record-bar">
      <button class="icon-btn danger" data-action="rec-cancel">${icon('trash')}</button>
      <span class="rec-dot"></span><span class="rec-time" id="rec-time">0:00</span>
      <span class="rec-hint">${t('recHint')}</span>
      <button class="send-btn" data-action="rec-send" title="${t('stopSend')}">${icon('stop')}</button>
    </div>`;
    Bale.haptic('heavy');
  } catch {
    toast(t('micDenied'), { icon: 'mic' });
  }
}
function stopRecording(send) {
  if (!ui.recording) return;
  ui.recording.send = send;
  try { ui.recording.rec.stop(); } catch { ui.recording = null; renderComposerZone(); }
}

// ================= attachments =================
async function handlePhotos(files) {
  const chat = store.chat(ui.chatId);
  if (!chat) return;
  const caption = $('#composer-input')?.value.trim() || '';
  let first = true;
  for (const f of Array.from(files).slice(0, 6)) {
    const url = await compressImage(f);
    store.sendMessage(chat.id, { kind: 'photo', text: '', media: { url, caption: first ? caption : '' }, replyTo: first ? ui.replyTo : null });
    first = false;
  }
  ui.replyTo = null;
  renderComposerZone();
  updateMessagesView({ toBottom: true });
}
async function handleFile(file) {
  const chat = store.chat(ui.chatId);
  if (!chat || !file) return;
  if (file.size > 2 * 1048576 && cloud.status !== 'connected') { toast(t('fileTooBig'), { icon: 'file' }); return; }
  const url = await fileToDataURL(file);
  store.sendMessage(chat.id, { kind: 'file', text: '', media: { url, name: file.name, size: file.size }, replyTo: ui.replyTo });
  ui.replyTo = null;
  renderComposerZone();
  updateMessagesView({ toBottom: true });
}

// ================= message context menu =================
function msgContextMenu(id, x, y) {
  const chat = store.chat(ui.chatId);
  const m = findMsg(chat?.id, id);
  if (!chat || !m || m.kind === 'service') return;
  const out = store.isOut(m);
  const reacts = ['👍', '❤️', '😂', '🔥', '🥰', '👏', '🎉', '😢'];
  openContext(x, y, `
    <div class="ctx-reacts">${reacts.map(e => `<button data-action="ctx-react" data-id="${id}" data-emoji="${e}">${e}</button>`).join('')}</div>
    ${sheetItem('reply', t('reply'), 'ctx-reply', `data-id="${id}"`)}
    ${m.kind === 'text' || m.text ? sheetItem('copy', t('copy'), 'ctx-copy', `data-id="${id}"`) : ''}
    ${sheetItem('forward', t('forward'), 'ctx-forward', `data-id="${id}"`)}
    ${sheetItem(m.pinned ? 'pinned' : 'pin', m.pinned ? t('unpin') : t('pin'), 'ctx-pin', `data-id="${id}"`)}
    ${out && m.kind === 'text' ? sheetItem('edit', t('edit'), 'ctx-edit', `data-id="${id}"`) : ''}
    ${sheetItem('checks', t('select'), 'ctx-select', `data-id="${id}"`)}
    ${sheetItem('trash', t('delete'), 'ctx-delete', `data-id="${id}"`, true)}`);
  Bale.haptic('light');
}

function chatContextMenu(chatId, x, y) {
  const c = store.chat(chatId);
  if (!c) return;
  openContext(x, y, `
    ${sheetItem('pin', c.pinned ? t('unpinChat') : t('pinChat'), 'ctx-chat-pin', `data-chat="${chatId}"`)}
    ${sheetItem(c.muted ? 'sound' : 'mute', c.muted ? t('unmute') : t('mute'), 'ctx-chat-mute', `data-chat="${chatId}"`)}
    ${sheetItem('archive', c.archived ? t('unarchive') : t('archive'), 'ctx-chat-archive', `data-chat="${chatId}"`)}
    ${sheetItem('checks', t('markAllRead'), 'ctx-chat-read', `data-chat="${chatId}"`)}
    ${sheetItem('trash', t('clearHistory'), 'ctx-chat-clear', `data-chat="${chatId}"`)}
    ${sheetItem('trash', t('deleteChat'), 'ctx-chat-delete', `data-chat="${chatId}"`, true)}`);
}

// ================= actions =================
const actions = {
  'back': goBack,
  'back-left': backLeft,
  'open-chat': el => openChat(el.dataset.chat),
  'open-archived': () => nav('archived'),
  'folder': el => { ui.folder = el.dataset.folder; renderLeft(); },
  'main-menu': () => {
    const dark = document.documentElement.dataset.theme === 'dark';
    openSheet(`
      <div class="sheet-title">${t('appName')}</div>
      ${sheetItem('users', t('newGroup'), 'nav-new-group')}
      ${sheetItem('megaphone', t('newChannel'), 'nav-new-channel')}
      ${sheetItem('user', t('contacts'), 'nav-contacts')}
      ${sheetItem('bookmark', t('savedMessages'), 'open-saved')}
      ${sheetItem('archive', t('archived'), 'open-archived')}
      ${sheetItem('settings', t('settings'), 'nav-settings')}
      ${sheetItem('checks', t('markAllRead'), 'mark-all-read')}
      ${sheetItem(dark ? 'sun' : 'moon', dark ? t('light') : t('dark'), 'quick-theme')}
    `);
  },
  'new-menu': () => openSheet(`
    <div class="sheet-title">${t('newMessage')}</div>
    ${sheetItem('megaphone', t('newChannel'), 'nav-new-channel')}
    ${sheetItem('users', t('newGroup'), 'nav-new-group')}
    ${sheetItem('user', t('newMessage'), 'nav-new-message')}
  `),
  'nav-new-group': () => { closeSheet(); ui.groupDraft = null; nav('new-group'); },
  'nav-new-channel': () => { closeSheet(); ui.channelDraft = null; nav('new-channel'); },
  'nav-new-message': () => { closeSheet(); nav('new-message'); },
  'nav-contacts': () => { closeSheet(); nav('contacts'); },
  'nav-settings': () => { closeSheet(); nav('settings'); },
  'nav-profile': () => nav('profile'),
  'open-saved': () => { closeSheet(); const c = store.chat('c-saved') || Object.values(store.state.chats).find(x => x.type === 'saved'); if (c) openChat(c.id); },
  'mark-all-read': () => { closeSheet(); Object.values(store.state.chats).forEach(c => { c.unread = 0; c.lastReadTs = Date.now(); }); store.persist(); renderLeft(true); toast(t('allRead')); },
  'quick-theme': () => { closeSheet(); const dark = document.documentElement.dataset.theme === 'dark'; store.updateSettings({ theme: dark ? 'light' : 'dark' }); },
  'toggle-sounds': () => { store.updateSettings({ sounds: !store.state.settings.sounds }); renderLeft(true); if (store.state.settings.sounds) Sfx.pop(); },
  'toggle-lang': () => { store.updateSettings({ lang: getLang() === 'fa' ? 'en' : 'fa' }); },
  'set-theme': el => store.updateSettings({ theme: el.dataset.value }),
  'set-accent': el => store.updateSettings({ accent: el.dataset.value }),
  'set-wp': el => store.updateSettings({ wallpaper: el.dataset.value }),
  'search-everywhere': () => { ui.searchQuery = ui.listQuery; ui.listQuery = ''; nav('search'); },
  'chat-search': () => { ui.searchQuery = ''; nav('search'); },
  'search-open': el => { openChat(el.dataset.chat, { scrollToMsg: el.dataset.msg }); },
  'contact-open': el => { const c = store.createPrivateChat(el.dataset.user); openChat(c.id); },
  'add-contact': openAddContactModal,
  'contact-create': () => {
    const first = $('#c-first')?.value.trim();
    if (!first) { $('#c-first')?.focus(); return; }
    store.addContact({ firstName: first, lastName: $('#c-last')?.value.trim(), phone: $('#c-phone')?.value.trim() });
    closeModal(); toast(t('contactAdded'), { icon: 'user' });
    if (ui.leftView === 'contacts' || ui.leftView === 'new-message') renderLeft();
  },
  'group-pick': el => {
    const d = ui.groupDraft; const id = el.dataset.user;
    d.members = d.members.includes(id) ? d.members.filter(x => x !== id) : [...d.members, id];
    renderLeft();
  },
  'group-unpick': el => { ui.groupDraft.members = ui.groupDraft.members.filter(x => x !== el.dataset.user); renderLeft(); },
  'group-next': () => { ui.groupDraft.step = 2; renderLeft(); setTimeout(() => $('#group-title')?.focus(), 60); },
  'group-step1': () => { ui.groupDraft.step = 1; renderLeft(); },
  'group-emoji': el => { ui.groupDraft.emoji = el.dataset.emoji; renderLeft(); },
  'group-create': () => {
    const d = ui.groupDraft;
    if (!d.title.trim()) return;
    const c = store.createGroup(d.title.trim(), d.members, { emoji: d.emoji, color: d.color, description: d.description.trim() });
    ui.groupDraft = null; ui.leftStack = []; ui.leftView = 'chats';
    openChat(c.id); toast(t('groupCreated'), { icon: 'users' });
  },
  'channel-create': () => {
    const d = ui.channelDraft;
    if (!d.title.trim()) return;
    const c = store.createChannel(d.title.trim(), d.description.trim());
    ui.channelDraft = null; ui.leftStack = []; ui.leftView = 'chats';
    openChat(c.id); toast(t('channelCreated'), { icon: 'megaphone' });
  },
  'profile-save': () => {
    const name = leftPane.querySelector('[data-role="p-name"]')?.value.trim();
    if (!name) return;
    store.updateProfile({
      name,
      username: leftPane.querySelector('[data-role="p-username"]')?.value.trim().replace(/^@/, ''),
      bio: leftPane.querySelector('[data-role="p-bio"]')?.value.trim(),
      phone: leftPane.querySelector('[data-role="p-phone"]')?.value.trim(),
    });
    toast(t('saved')); backLeft();
  },
  'profile-photo': () => { ui.photoTarget = 'profile'; $('#file-photo').click(); },
  'profile-photo-remove': () => { store.updateProfile({ photo: null }); renderLeft(); },
  'p-color': el => { store.updateProfile({ color: +el.dataset.color, emoji: null }); renderLeft(); },
  'p-emoji': el => { store.updateProfile({ emoji: el.dataset.emoji || null }); renderLeft(); },
  'chat-info': () => { if (ui.chatId) openDrawer(ui.chatId); },
  'drawer-close': () => closeDrawer(),
  'drawer-tab': el => { ui.drawerTab = el.dataset.tab; renderDrawer(); $('#drawer-root').classList.add('open'); },
  'drawer-mute': el => { const c = store.chat(ui.drawer); store.toggleMute(c.id); toast(c.muted ? t('muted') : t('unmuted'), { icon: c.muted ? 'mute' : 'sound' }); renderDrawer(); $('#drawer-root').classList.add('open'); renderLeft(true); },
  'drawer-clear': () => { const c = store.chat(ui.drawer); confirmModal({ title: t('clearHistory'), body: t('confirmClear', { t: store.chatTitle(c) }), okLabel: t('delete'), onOk: () => { store.clearHistory(c.id); toast(t('historyCleared')); if (ui.chatId === c.id) { ui.anchorTs = 0; renderRight(); } renderDrawer(); $('#drawer-root').classList.add('open'); } }); },
  'drawer-block': () => { const c = store.chat(ui.drawer); const blocked = store.toggleBlock(c.id); toast(blocked ? t('blocked') : t('unblocked'), { icon: 'lock' }); renderDrawer(); $('#drawer-root').classList.add('open'); if (ui.chatId === c.id) renderRight(); },
  'drawer-leave': () => { const c = store.chat(ui.drawer); confirmModal({ title: c.type === 'channel' ? t('leaveChannel') : t('leaveGroup'), body: t('confirmLeave', { t: store.chatTitle(c) }), okLabel: t('delete'), onOk: () => { store.leaveChat(c.id); closeDrawer(); if (ui.chatId === c.id) renderRight(); renderLeft(true); } }); },
  'drawer-delete': () => { const c = store.chat(ui.drawer); confirmModal({ title: t('deleteChat'), body: t('confirmDeleteChat', { t: store.chatTitle(c) }), okLabel: t('delete'), onOk: () => { closeDrawer(); store.deleteChat(c.id); if (ui.chatId === c.id) { ui.chatId = null; document.body.classList.remove('pane-chat'); renderRight(); } renderLeft(true); toast(t('deleted'), { icon: 'trash' }); } }); },
  'drawer-add-members': () => {
    const c = store.chat(ui.drawer);
    const avail = store.state.contacts.map(id => store.user(id)).filter(u => u && !c.members.includes(u.id));
    openModal(`
      <div class="modal-head"><div class="m-title">${t('addMembers')}</div><button class="icon-btn" data-action="modal-cancel">${icon('close')}</button></div>
      <div class="modal-body">${avail.map(u => `<div class="pick-row" data-action="add-member-do" data-user="${u.id}">${avaHTML(u, 42)}<div class="p-body"><div class="p-name">${esc(u.name)}</div></div><div class="checkbox">${icon('plus')}</div></div>`).join('') || `<div class="empty-note">${t('noChats')}</div>`}</div>`);
  },
  'add-member-do': el => { store.addMembers(ui.drawer, [el.dataset.user]); closeModal(); toast(t('saved')); renderDrawer(); $('#drawer-root').classList.add('open'); },
  'member-menu': el => openMemberModal(el.dataset.user),
  'member-message': el => { closeModal(); closeDrawer(); const c = store.createPrivateChat(el.dataset.user); openChat(c.id); },
  'member-admin': el => { const on = store.toggleAdmin(ui.drawer, el.dataset.user); closeModal(); toast(on ? t('promoted') : t('demoted'), { icon: 'shield' }); renderDrawer(); $('#drawer-root').classList.add('open'); },
  'member-remove': el => { store.removeMember(ui.drawer, el.dataset.user); closeModal(); toast(t('memberRemoved'), { icon: 'trash' }); renderDrawer(); $('#drawer-root').classList.add('open'); },
  'copy-invite': () => { const c = store.chat(ui.drawer); copyText(c.inviteLink); toast(t('linkCopied'), { icon: 'link' }); },
  'copy-text': el => { const title = el.querySelector('.r-title')?.textContent; if (title) { copyText(title); toast(t('copied')); } },
  'join-chat': () => { store.joinChat(ui.chatId); renderRight(); Bale.haptic('success'); },
  'unblock': () => { const blocked = store.toggleBlock(ui.chatId); toast(blocked ? t('blocked') : t('unblocked'), { icon: 'lock' }); renderRight(); },
  'chat-menu': () => {
    const c = store.chat(ui.chatId); if (!c) return;
    openSheet(`
      <div class="sheet-title">${esc(store.chatTitle(c))}</div>
      ${sheetItem('info', t('about'), 'menu-info')}
      ${sheetItem('checks', t('select'), 'menu-select')}
      ${sheetItem(c.muted ? 'sound' : 'mute', c.muted ? t('unmute') : t('mute'), 'menu-mute')}
      ${sheetItem('trash', t('clearHistory'), 'menu-clear')}
      ${c.type === 'group' || c.type === 'channel' ? sheetItem('logout', c.type === 'channel' ? t('leaveChannel') : t('leaveGroup'), 'menu-leave', '', true) : sheetItem('trash', t('deleteChat'), 'menu-delete', '', true)}
    `);
  },
  'menu-info': () => { closeSheet(); openDrawer(ui.chatId); },
  'menu-select': () => { closeSheet(); ui.selecting = true; ui.selected.clear(); renderRight(); updateBack(); },
  'menu-mute': () => { closeSheet(); const m = store.toggleMute(ui.chatId); toast(m ? t('muted') : t('unmuted'), { icon: m ? 'mute' : 'sound' }); renderLeft(true); },
  'menu-clear': () => { closeSheet(); actions['drawer-clear'](); ui.drawer = ui.chatId; },
  'menu-leave': () => { closeSheet(); ui.drawer = ui.chatId; actions['drawer-leave'](); },
  'menu-delete': () => { closeSheet(); ui.drawer = ui.chatId; actions['drawer-delete'](); },
  'send': doSend,
  'attach': () => { ui.attachOpen = !ui.attachOpen; ui.emoji.open = false; $('#attach-slot').innerHTML = ui.attachOpen ? attachPopHTML() : ''; $('#emoji-panel-slot').innerHTML = ''; },
  'attach-photo': () => { ui.attachOpen = false; $('#attach-slot').innerHTML = ''; ui.photoTarget = 'chat'; $('#file-photo').click(); },
  'attach-file': () => { ui.attachOpen = false; $('#attach-slot').innerHTML = ''; $('#file-any').click(); },
  'emoji-panel': () => { ui.emoji.open = !ui.emoji.open; ui.attachOpen = false; $('#attach-slot').innerHTML = ''; $('#emoji-panel-slot').innerHTML = ui.emoji.open ? emojiPanelHTML(ui.emoji.tab, ui.emoji.cat) : ''; },
  'emoji-tab': el => { ui.emoji.tab = el.dataset.tab; $('#emoji-panel-slot').innerHTML = emojiPanelHTML(ui.emoji.tab, ui.emoji.cat); },
  'emoji-cat': el => { ui.emoji.cat = el.dataset.cat; $('#emoji-panel-slot').innerHTML = emojiPanelHTML(ui.emoji.tab, ui.emoji.cat); },
  'emoji-insert': el => {
    const inp = $('#composer-input');
    if (inp) {
      const e = el.dataset.emoji;
      const s = inp.selectionStart ?? inp.value.length, en = inp.selectionEnd ?? s;
      inp.setRangeText(e, s, en, 'end');
      inp.focus(); autoGrow(inp); updateSendBtn();
      store.addRecentEmoji(e);
      store.setDraft(ui.chatId, inp.value);
    }
  },
  'sticker-send': el => {
    ui.emoji.open = false;
    store.sendMessage(ui.chatId, { kind: 'sticker', text: el.dataset.emoji, replyTo: ui.replyTo });
    store.addRecentEmoji(el.dataset.emoji);
    ui.replyTo = null;
    renderComposerZone(); updateMessagesView({ toBottom: true });
    Bale.haptic('light');
  },
  'reply-cancel': () => { ui.replyTo = null; ui.editing = null; renderComposerZone(); $('#composer-input')?.focus(); },
  'msg-body': el => {
    if (!ui.selecting) return;
    const id = el.dataset.id;
    ui.selected.has(id) ? ui.selected.delete(id) : ui.selected.add(id);
    if (!ui.selected.size) return exitSelect();
    markSelectedDOM();
    const bar = rightPane.querySelector('.select-bar .count');
    if (bar) bar.textContent = t('selectMessages', { n: fmtNum(ui.selected.size) });
  },
  'msg-more': el => { const r = el.getBoundingClientRect(); msgContextMenu(el.dataset.id, r.left - 180, r.bottom + 4); },
  'ctx-close': closeContext,
  'ctx-react': el => { closeContext(); store.toggleReaction(ui.chatId, el.dataset.id, el.dataset.emoji); Bale.haptic('light'); },
  'ctx-reply': el => { closeContext(); ui.replyTo = el.dataset.id; ui.editing = null; renderComposerZone(); $('#composer-input')?.focus(); },
  'ctx-copy': el => { closeContext(); const m = findMsg(ui.chatId, el.dataset.id); copyText(m?.text || m?.media?.caption || ''); toast(t('copied')); },
  'ctx-forward': el => { closeContext(); openForwardModal({ chatId: ui.chatId, ids: [el.dataset.id] }); },
  'ctx-pin': el => { closeContext(); const on = store.togglePinMessage(ui.chatId, el.dataset.id); toast(on ? t('pinned') : t('unpinned'), { icon: 'pin' }); renderRight(); },
  'ctx-edit': el => { closeContext(); ui.editing = el.dataset.id; ui.replyTo = null; renderComposerZone(); const inp = $('#composer-input'); if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); } },
  'ctx-select': el => { closeContext(); ui.selecting = true; ui.selected = new Set([el.dataset.id]); renderRight(); updateBack(); },
  'ctx-delete': el => {
    closeContext(); const id = el.dataset.id; const chatId = ui.chatId;
    confirmModal({ title: t('delete'), body: t('confirmDeleteMsg', { n: fmtNum(1) }), okLabel: t('delete'), onOk: () => {
      const removed = store.deleteMessages(chatId, [id]);
      updateMessagesView(); renderLeft(true);
      toast(t('deleted'), { icon: 'trash', action: { label: t('undo'), fn: () => { store.restoreMessages(chatId, removed); if (ui.chatId === chatId) updateMessagesView(); renderLeft(true); toast(t('restored')); } } });
    } });
  },
  'react': el => { store.toggleReaction(ui.chatId, el.dataset.id, el.dataset.emoji); Bale.haptic('light'); },
  'reply-jump': el => scrollToMessage(el.dataset.target),
  'pinned-jump': el => scrollToMessage(el.dataset.target),
  'pinned-unpin': el => { store.togglePinMessage(ui.chatId, el.dataset.id); renderRight(); toast(t('unpinned'), { icon: 'pin' }); },
  'photo': el => { const m = findMsg(el.dataset.chat || ui.chatId, el.dataset.id); if (m) openLightbox(m, store.chat(m.chatId)); },
  'lightbox-close': closeLightbox,
  'lightbox-download': el => { const m = findMsg(el.dataset.chat, el.dataset.id); if (m) downloadURI(m.media.url, `photo-${m.id}.jpg`); },
  'file-download': el => { const m = findMsg(el.dataset.chat || ui.chatId, el.dataset.id); if (m?.media) { downloadURI(m.media.url, m.media.name); toast(t('download'), { icon: 'download' }); } },
  'voice-play': el => playVoice(el.dataset.id),
  'voice-seek': (el, ev) => seekVoice(el.dataset.id, ev),
  'voice-rate': el => cycleRate(el.dataset.id),
  'rec-cancel': () => stopRecording(false),
  'rec-send': () => stopRecording(true),
  'scroll-bottom': () => scrollBottom(),
  'select-cancel': exitSelect,
  'select-delete': () => {
    const ids = [...ui.selected]; const chatId = ui.chatId;
    confirmModal({ title: t('delete'), body: t('confirmDeleteMsg', { n: fmtNum(ids.length) }), okLabel: t('delete'), onOk: () => {
      const removed = store.deleteMessages(chatId, ids);
      exitSelect(); renderLeft(true);
      toast(t('deleted'), { icon: 'trash', action: { label: t('undo'), fn: () => { store.restoreMessages(chatId, removed); if (ui.chatId === chatId) updateMessagesView(); renderLeft(true); toast(t('restored')); } } });
    } });
  },
  'select-forward': () => openForwardModal({ chatId: ui.chatId, ids: [...ui.selected] }),
  'forward-to': el => {
    const p = ui.forwardPayload; if (!p) return;
    const n = store.forwardMessages(p.chatId, p.ids, el.dataset.chat);
    closeModal(); exitSelect();
    toast(t('forwarded') + ` · ${fmtNum(n)}`, { icon: 'forward' });
    renderLeft(true);
  },
  'modal-cancel': closeModal,
  'confirm-ok': () => { const fn = ui.confirmPayload; closeModal(); fn?.(); },
  'sheet-close': closeSheet,
  'ctx-chat-pin': el => { closeContext(); const on = store.toggleChatPin(el.dataset.chat); toast(on ? t('chatPinned') : t('chatUnpinned'), { icon: 'pin' }); renderLeft(true); },
  'ctx-chat-mute': el => { closeContext(); const m = store.toggleMute(el.dataset.chat); toast(m ? t('muted') : t('unmuted'), { icon: m ? 'mute' : 'sound' }); renderLeft(true); },
  'ctx-chat-archive': el => { closeContext(); const on = store.toggleArchive(el.dataset.chat); toast(on ? t('chatArchived') : t('chatUnarchived'), { icon: 'archive' }); if (ui.chatId === el.dataset.chat && on) { document.body.classList.remove('pane-chat'); } renderLeft(true); },
  'ctx-chat-read': el => { closeContext(); store.markRead(el.dataset.chat); renderLeft(true); },
  'ctx-chat-clear': el => { closeContext(); const c = store.chat(el.dataset.chat); confirmModal({ title: t('clearHistory'), body: t('confirmClear', { t: store.chatTitle(c) }), okLabel: t('delete'), onOk: () => { store.clearHistory(c.id); if (ui.chatId === c.id) renderRight(); renderLeft(true); toast(t('historyCleared')); } }); },
  'ctx-chat-delete': el => { closeContext(); const c = store.chat(el.dataset.chat); confirmModal({ title: t('deleteChat'), body: t('confirmDeleteChat', { t: store.chatTitle(c) }), okLabel: t('delete'), onOk: () => { store.deleteChat(c.id); if (ui.chatId === c.id) { ui.chatId = null; document.body.classList.remove('pane-chat'); renderRight(); } renderLeft(true); toast(t('deleted'), { icon: 'trash' }); } }); },
  'supabase-modal': openSupabaseModal,
  'supabase-connect': async () => {
    const url = $('#sb-url')?.value.trim(), key = $('#sb-key')?.value.trim();
    if (!url || !key) return;
    const ok = await cloud.connect(url, key);
    closeModal();
    toast(ok ? t('connected') : t('connectionFailed'), { icon: ok ? 'database' : 'info' });
    if (ui.leftView === 'settings') renderLeft();
  },
  'supabase-disconnect': () => { cloud.disconnect(); closeModal(); toast(t('localMode'), { icon: 'database' }); if (ui.leftView === 'settings') renderLeft(); },
  'reset-all': () => confirmModal({ title: t('clearCache'), body: t('confirmReset'), okLabel: t('delete'), onOk: () => { store.resetAll(); ui.chatId = null; ui.leftView = 'chats'; ui.leftStack = []; document.body.classList.remove('pane-chat'); applySettings(); renderAll(); toast(t('restored')); } }),
  'bale-phone': () => {
    const ok = Bale.requestContact((shared, phone) => {
      if (shared && phone) { store.updateProfile({ phone }); toast(t('saved'), { icon: 'phone' }); if (ui.leftView === 'settings') renderLeft(); }
    });
    if (!ok) toast(t('previewMode'), { icon: 'info' });
  },
  'bale-home': () => { if (!Bale.addToHomeScreen()) toast(t('previewMode'), { icon: 'info' }); },
  'bale-share': () => {
    confirmModal({ title: t('shareApp'), body: t('previewMode'), okLabel: t('send'), danger: false, onOk: () => {
      const ok = Bale.sendData({ app: 'balegram', user: store.state.me.name, ts: Date.now() });
      if (!ok) toast(t('previewMode'), { icon: 'info' });
    } });
  },
  'bale-docs': () => Bale.openLink(CONFIG.DOCS_URL),
  'link': el => { const url = el.dataset.url || el.getAttribute('href'); if (url) Bale.openLink(url); },
  'mention': el => {
    const u = Object.values(store.state.users).find(x => x.username === el.dataset.username);
    if (u) { const c = store.createPrivateChat(u.id); openChat(c.id); }
    else toast(t('noResults', { q: '@' + el.dataset.username }), { icon: 'at' });
  },
};

function copyText(text) {
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  else fallbackCopy(text);
}
function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch {}
  ta.remove();
}

// ================= events =================
function bindEvents() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.dataset.action;
    if (action === 'link' || action === 'mention') e.preventDefault();
    const fn = actions[action];
    if (fn) { e.stopPropagation(); fn(el, e); }
  });

  document.addEventListener('input', e => {
    const role = e.target.dataset?.role;
    if (role === 'list-search') {
      ui.listQuery = e.target.value;
      const sc = leftPane.querySelector('.list-scroll');
      const st = sc?.scrollTop || 0;
      let chats = store.sortedChats({ folder: ui.folder });
      const q = ui.listQuery.toLowerCase();
      if (q) chats = chats.filter(c => store.chatTitle(c).toLowerCase().includes(q) || (c.username || '').toLowerCase().includes(q));
      if (sc) { sc.innerHTML = (q ? `<div class="sr-section" style="cursor:pointer" data-action="search-everywhere">${t('searchEverywhere')} →</div>` : '') + chatListHTML(chats, chatVisible() ? ui.chatId : null); sc.scrollTop = st; }
    } else if (role === 'global-search') {
      ui.searchQuery = e.target.value;
      const res = store.searchAll(ui.searchQuery);
      const wrap = $('#search-results');
      if (wrap) {
        const q = ui.searchQuery.trim();
        if (!q) wrap.innerHTML = `<div class="empty-list">${icon('search')}<div class="e-title">${t('searchEverywhere')}</div></div>`;
        else if (!res.chats.length && !res.messages.length) wrap.innerHTML = `<div class="empty-list">${icon('search')}<div class="e-title">${t('noResults', { q: esc(q) })}</div></div>`;
        else {
          let html = '';
          if (res.chats.length) html += `<div class="sr-section">${t('chats')}</div>` + res.chats.map(c => chatItemHTML(c, null)).join('');
          if (res.messages.length) {
            html += `<div class="sr-section">${t('messagesFound')} · ${fmtNum(res.messages.length)}</div>`;
            const rx = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig');
            html += res.messages.map(({ msg, chat }) => `<div class="sr-msg" data-action="search-open" data-chat="${chat.id}" data-msg="${msg.id}">${chatAva(chat, 42)}<div class="s-body"><div class="s-top"><span class="s-name">${esc(store.chatTitle(chat))}</span><span class="s-time">${fmtDay(msg.ts)}</span></div><div class="s-text">${esc(previewOf(msg).text).replace(rx, '<mark>$1</mark>')}</div></div></div>`).join('');
          }
          wrap.innerHTML = html;
        }
      }
    } else if (role === 'group-title') { ui.groupDraft.title = e.target.value; const btn = leftPane.querySelector('[data-action="group-create"]'); if (btn) btn.disabled = !e.target.value.trim(); }
    else if (role === 'group-desc') ui.groupDraft.description = e.target.value;
    else if (role === 'channel-title') { ui.channelDraft.title = e.target.value; const btn = leftPane.querySelector('[data-action="channel-create"]'); if (btn) btn.disabled = !e.target.value.trim(); }
    else if (role === 'channel-desc') ui.channelDraft.description = e.target.value;
    else if (role === 'font-size') {
      store.updateSettings({ fontSize: +e.target.value });
      const val = leftPane.querySelector('.slider-row .val');
      if (val) val.textContent = fmtNum(+e.target.value);
    }
  });

  document.addEventListener('change', e => {
    const el = e.target;
    if (el.dataset.action === 'set-toggle') {
      const key = el.dataset.key;
      if (key === 'notifications' && el.checked && typeof Notification !== 'undefined' && Notification.permission === 'default') {
        Notification.requestPermission().then(p => { if (p !== 'granted') toast(t('notificationsDenied'), { icon: 'bell' }); });
      }
      store.updateSettings({ [key]: el.checked });
    } else if (el.id === 'file-photo') {
      if (el.files?.length) {
        if (ui.photoTarget === 'profile') {
          compressImage(el.files[0], 512).then(url => { store.updateProfile({ photo: url }); renderLeft(); toast(t('saved')); });
        } else handlePhotos(el.files);
      }
      el.value = '';
    } else if (el.id === 'file-any') {
      if (el.files?.length) handleFile(el.files[0]);
      el.value = '';
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.preventDefault(); goBack(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); ui.searchQuery = ''; nav('search'); setTimeout(() => $('#global-search')?.focus(), 60); }
  });

  document.addEventListener('contextmenu', e => {
    const msgEl = e.target.closest('.msg[data-msg]');
    if (msgEl && rightPane.contains(msgEl)) { e.preventDefault(); msgContextMenu(msgEl.dataset.msg, e.clientX, e.clientY); return; }
    const chatEl = e.target.closest('[data-context-chat]');
    if (chatEl) { e.preventDefault(); chatContextMenu(chatEl.dataset.contextChat, e.clientX, e.clientY); }
  });

  document.addEventListener('dblclick', e => {
    const msgEl = e.target.closest('.msg[data-msg]');
    if (msgEl && rightPane.contains(msgEl) && !ui.selecting) {
      store.toggleReaction(ui.chatId, msgEl.dataset.msg, '👍');
      Bale.haptic('light');
    }
  });

  // long-press on touch
  let lpTimer = null, lpTarget = null, lpXY = null;
  document.addEventListener('touchstart', e => {
    const msgEl = e.target.closest('.msg[data-msg]');
    const chatEl = e.target.closest('[data-context-chat]');
    lpTarget = msgEl || chatEl;
    if (!lpTarget) return;
    const touch = e.touches[0];
    lpXY = { x: touch.clientX, y: touch.clientY };
    ui.longPressFired = false;
    lpTimer = setTimeout(() => {
      ui.longPressFired = true;
      if (msgEl && rightPane.contains(msgEl)) msgContextMenu(msgEl.dataset.msg, lpXY.x - 100, lpXY.y - 220);
      else if (chatEl) chatContextMenu(chatEl.dataset.contextChat, lpXY.x - 100, lpXY.y - 160);
    }, 480);
  }, { passive: true });
  document.addEventListener('touchmove', e => {
    if (!lpTimer) return;
    const touch = e.touches[0];
    if (Math.abs(touch.clientX - lpXY.x) > 12 || Math.abs(touch.clientY - lpXY.y) > 12) { clearTimeout(lpTimer); lpTimer = null; }
  }, { passive: true });
  document.addEventListener('touchend', () => { clearTimeout(lpTimer); lpTimer = null; setTimeout(() => { ui.longPressFired = false; }, 350); });
  document.addEventListener('click', e => { if (ui.longPressFired) { e.stopPropagation(); e.preventDefault(); ui.longPressFired = false; } }, true);

  $('#composer-input')?.addEventListener('input', onComposerInput);
  $('#composer-input')?.addEventListener('keydown', onComposerKey);

  window.addEventListener('resize', () => { syncActive(); });
}

// ================= bus =================
function subscribeBus() {
  store.bus.on('message:new', ({ chatId, msg, incoming, remote }) => {
    if (chatId === ui.chatId && chatVisible()) {
      updateMessagesView({ toBottom: !incoming || atBottom() });
      if (incoming) { store.markRead(chatId); Bale.haptic('light'); }
    }
    if (ui.leftView === 'chats' || ui.leftView === 'archived') renderLeft(true);
    if (incoming && !remote && typeof Notification !== 'undefined' && Notification.permission === 'granted' && store.state.settings.notifications && document.hidden) {
      try { new Notification(store.chatTitle(store.chat(chatId)), { body: previewOf(msg).text, silent: true }); } catch {}
    }
  });
  store.bus.on('message:update', ({ chatId }) => {
    if (chatId === ui.chatId && chatVisible()) updateMessagesView();
    if (ui.leftView === 'chats' || ui.leftView === 'archived') renderLeft(true);
  });
  store.bus.on('messages:deleted', ({ chatId }) => {
    if (chatId === ui.chatId && chatVisible()) updateMessagesView();
    renderLeft(true);
  });
  store.bus.on('chat:update', ({ chatId }) => {
    if (ui.leftView === 'chats' || ui.leftView === 'archived') renderLeft(true);
    if (chatId === ui.chatId && chatVisible()) { updateHeader(); if (ui.drawer === chatId) { renderDrawer(); $('#drawer-root').classList.add('open'); } }
  });
  store.bus.on('chat:created', () => renderLeft(true));
  store.bus.on('chat:deleted', () => renderLeft(true));
  store.bus.on('contact:added', () => { if (ui.leftView === 'contacts' || ui.leftView === 'new-message') renderLeft(); });
  store.bus.on('profile', () => { if (ui.leftView === 'settings' || ui.leftView === 'profile') renderLeft(); });
  store.bus.on('typing', ({ chatId }) => {
    if (chatId !== ui.chatId || !chatVisible()) return;
    updateHeader();
    const el = $('#messages');
    if (el) {
      const wasBottom = atBottom();
      el.querySelector('.typing-row')?.remove();
      const ty = store.typing[chatId];
      if (ty && ty.until > Date.now()) { el.insertAdjacentHTML('beforeend', typingBubble()); if (wasBottom) scrollBottom(false); }
    }
  });
  store.bus.on('notify', ({ chat, msg }) => {
    if (!store.state.settings.notifications) return;
    toast(t('newMessageFrom', { name: store.chatTitle(chat) }), { icon: 'bell', duration: 4200, action: { label: t('open'), fn: () => openChat(chat.id) } });
  });
  store.bus.on('settings', () => { applySettings(); renderAll(); });
  store.bus.on('supabase', () => { if (ui.leftView === 'settings') renderLeft(); });
  store.bus.on('sync', () => { applySettings(); renderAll(); if (ui.drawer) { renderDrawer(); $('#drawer-root').classList.add('open'); } });
}

// typing indicator expiry
setInterval(() => {
  let changed = false;
  for (const [cid, ty] of Object.entries(store.typing)) {
    if (ty.until < Date.now()) { delete store.typing[cid]; changed = true; if (cid === ui.chatId) store.bus.emit('typing', { chatId: cid }); }
  }
}, 1500);

function renderAll() {
  renderLeft(true);
  renderRight();
  if (chatVisible()) scrollBottom(false);
}

// ================= boot =================
function boot() {
  Bale.init();
  const fresh = !localStorage.getItem(CONFIG.STORAGE_KEY);
  store.load();
  const bu = Bale.user;
  if (bu && store.state.me.baleId !== String(bu.id)) {
    store.updateProfile({
      name: [bu.first_name, bu.last_name].filter(Boolean).join(' ') || store.state.me.name,
      username: bu.username || store.state.me.username,
      photo: bu.photo_url || store.state.me.photo,
      baleId: String(bu.id),
    });
  }
  applySettings();
  Bale.setBackHandler(goBack);
  Bale.setSettingsHandler(() => nav('settings'));
  renderAll();
  bindEvents();
  subscribeBus();
  cloud.autoConnect();
  store.ambient();
  updateBack();
  if (fresh || !store.state.welcomed) {
    store.state.welcomed = true;
    store.persist(true);
    setTimeout(() => openModal(`
      <div class="modal-body padded" style="text-align:center;padding:28px 22px 10px">
        <div class="ph-logo" style="width:86px;height:86px;border-radius:26px;margin:0 auto 16px;background:var(--accent-grad);display:flex;align-items:center;justify-content:center;box-shadow:0 12px 36px var(--accent-glow)">${LOGO_SVG.replace('<svg', '<svg style="width:46px;height:46px;color:#fff"')}</div>
        <h2 style="font-size:21px;font-weight:800;margin-bottom:8px">${t('welcomeTitle')}</h2>
        <p class="text-muted" style="font-size:14px">${t('welcomeBody')}</p>
      </div>
      <div class="modal-foot" style="justify-content:center;border:0;padding-bottom:22px"><button class="btn" data-action="modal-cancel" style="min-width:160px">${t('startBot')} 🚀</button></div>`), 500);
  }
}

boot();