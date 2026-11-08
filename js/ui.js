import { store } from './store.js';
import { t, fmtTime, fmtDay, fmtListTime, fmtAgo, fmtNum, fmtSize, fmtDuration, isRTL } from './i18n.js';
import { icon, LOGO_SVG } from './icons.js';
import { AVATAR_GRADS } from './seed.js';
import { waveformFor } from './media.js';

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function linkify(text) {
  let s = esc(text);
  s = s.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?"')\]])/g, '<a href="$1" data-action="link" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/(^|\s)@([a-zA-Z0-9_]{3,})/g, '$1<a data-action="mention" data-username="$2">@$2</a>');
  return s;
}

export function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

export function avaHTML(entity, size = 50, { online = false, cls = '' } = {}) {
  if (!entity) return `<div class="ava ${cls}" style="--size:${size}px">?</div>`;
  const grad = AVATAR_GRADS[(entity.color || 0) % AVATAR_GRADS.length];
  let inner;
  if (entity.photo) inner = `<img src="${esc(entity.photo)}" alt="">`;
  else if (entity.type === 'saved' || entity.emoji === '🔖') inner = icon('bookmark');
  else if (entity.emoji) inner = `<span class="emoji">${entity.emoji}</span>`;
  else inner = esc(initials(entity.name || entity.title));
  return `<div class="ava ${online ? 'online' : ''} ${cls}" style="--size:${size}px;--ava-grad:${grad}">${inner}</div>`;
}

export function chatAva(chat, size = 50) {
  if (chat.type === 'saved') return avaHTML({ type: 'saved', color: 1, emoji: '🔖' }, size);
  if (chat.type === 'private') {
    const p = store.peerOf(chat);
    return avaHTML(p || { name: chat.title, color: chat.color }, size, { online: !!p?.online && store.state.settings.lastSeenPrivacy });
  }
  return avaHTML({ name: chat.title, title: chat.title, color: chat.color, emoji: chat.emoji }, size);
}

export function previewOf(m) {
  if (!m) return { text: '', icon: null };
  switch (m.kind) {
    case 'photo': return { text: m.media?.caption || t('servicePhoto'), icon: '📷' };
    case 'voice': return { text: `${t('serviceVoice')} (${fmtDuration(m.media?.duration || 0)})`, icon: '🎤' };
    case 'file': return { text: m.media?.name || t('serviceFile'), icon: '📎' };
    case 'sticker': return { text: m.text, icon: null };
    case 'service': return { text: serviceText(m), icon: null };
    default: return { text: m.text || '', icon: null };
  }
}

export function serviceText(m) {
  const s = m.media?.service;
  if (s === 'createdGroup') return t('serviceCreatedGroup', { name: m.media.name, title: m.media.title });
  if (s === 'createdChannel') return t('serviceCreatedChannel', { name: m.media.name, title: m.media.title });
  if (s === 'joined') return t('serviceJoined', { name: m.media.name });
  if (s === 'added') return t('serviceAdded', { name: m.media.name, other: m.media.other });
  return m.text || '';
}

function checksHTML(m) {
  if (!store.isOut(m)) return '';
  if (m.status === 'sending') return icon('clock');
  if (m.status === 'read') return icon('checks');
  return icon('check');
}

function metaHTML(m, overlay = false) {
  return `<span class="meta">${m.editedTs ? `<span class="edited">${t('edited')}</span>` : ''}<span>${fmtTime(m.ts)}</span>${checksHTML(m)}</span>`;
}

function replyBlockHTML(m, chat) {
  if (!m.replyTo) return '';
  const target = store.msgs(chat.id).find(x => x.id === m.replyTo);
  if (!target) return '';
  const p = previewOf(target);
  const name = target.from === store.state.me.id ? t('you') : store.displayName(target.from);
  return `<div class="reply-block" data-action="reply-jump" data-target="${target.id}"><div class="r-name">${esc(name)}</div><div class="r-text">${p.icon ? p.icon + ' ' : ''}${esc(p.text)}</div></div>`;
}

function fwdHTML(m) {
  if (!m.fwd) return '';
  return `<div class="fwd-head"><span class="f-label">${t('forwardedFrom')}</span><span class="f-name">${esc(m.fwd.name)}</span></div>`;
}

function voiceHTML(m) {
  const bars = waveformFor(m.id, 30).map(h => `<i style="height:${h}%"></i>`).join('');
  return `<div class="voice-card" data-voice="${m.id}">
    <button class="voice-play" data-action="voice-play" data-id="${m.id}" aria-label="${t('play')}">${icon('play')}</button>
    <div class="voice-body">
      <div class="waveform" data-action="voice-seek" data-id="${m.id}">${bars}</div>
      <div class="voice-meta"><span class="v-time">${fmtDuration(m.media?.duration || 0)}</span><button class="voice-rate" data-action="voice-rate" data-id="${m.id}">1×</button>${store.isOut(m) ? `<span class="v-status">${checksHTML(m)}</span>` : ''}</div>
    </div>
  </div>`;
}

function fileHTML(m) {
  const name = m.media?.name || 'file';
  const ext = name.split('.').pop().toUpperCase().slice(0, 4);
  return `<div class="file-card" data-action="file-download" data-id="${m.id}">
    <div class="file-ico">${icon('file')}</div>
    <div class="file-info"><div class="file-name">${esc(name)}</div><div class="file-size">${esc(ext)} · ${fmtSize(m.media?.size || 0)}</div></div>
  </div>`;
}

export function reactionsHTML(m) {
  const entries = Object.entries(m.reactions || {});
  if (!entries.length) return '';
  const me = store.state.me.id;
  return `<div class="reactions">${entries.map(([e, ids]) =>
    `<button class="react-chip ${ids.includes(me) ? 'mine' : ''}" data-action="react" data-id="${m.id}" data-emoji="${e}">${e} <span class="n">${fmtNum(ids.length)}</span></button>`
  ).join('')}</div>`;
}

export function messageHTML(m, chat, prev, next) {
  if (m.kind === 'service') return `<div class="service-chip">${esc(serviceText(m))}</div>`;
  const out = store.isOut(m);
  const groupChat = chat.type === 'group' || chat.type === 'channel';
  const grouped = prev && prev.kind !== 'service' && prev.from === m.from && (m.ts - prev.ts) < 180_000;
  const tail = !next || next.kind === 'service' || next.from !== m.from || (next.ts - m.ts) >= 180_000;
  const sender = !out && groupChat && !grouped
    ? `<div class="sender" style="color:${AVATAR_GRADS[(store.user(m.from)?.color || 0) % AVATAR_GRADS.length].match(/#[0-9a-f]{6}/i)?.[0] || 'var(--accent)'}">${esc(m.from === store.state.me.id ? t('you') : store.displayName(m.from))}</div>` : '';
  const ava = !out && groupChat
    ? `<div class="ava-slot" style="${grouped && !tail ? 'visibility:hidden' : ''}">${avaHTML(store.user(m.from) || { name: chat.title, color: chat.color, emoji: chat.emoji }, 32)}</div>` : '';

  let bubbleCls = 'bubble', content = '';
  if (m.kind === 'photo') {
    bubbleCls += ` photo-bubble ${m.media?.caption ? 'has-caption' : ''}`;
    content = `<img src="${esc(m.media?.url || '')}" data-action="photo" data-id="${m.id}" alt="" loading="lazy">${m.media?.caption ? `<div class="caption text">${linkify(m.media.caption)}</div>` : ''}${metaHTML(m)}`;
  } else if (m.kind === 'sticker') {
    bubbleCls += ' sticker-bubble';
    content = `${esc(m.text)}${metaHTML(m)}`;
  } else if (m.kind === 'voice') {
    content = fwdHTML(m) + replyBlockHTML(m, chat) + voiceHTML(m) + metaHTML(m);
  } else if (m.kind === 'file') {
    content = fwdHTML(m) + replyBlockHTML(m, chat) + fileHTML(m) + (m.text ? `<div class="text">${linkify(m.text)}</div>` : '') + metaHTML(m);
  } else {
    content = fwdHTML(m) + replyBlockHTML(m, chat) + `<span class="text">${linkify(m.text)}</span>` + metaHTML(m);
  }

  return `<div class="msg ${out ? 'out' : 'in'} ${grouped ? 'grouped' : ''} ${tail ? 'tail' : ''}" data-msg="${m.id}">
    ${ava}
    <div class="stack">
      ${sender}
      <div class="${bubbleCls}" data-action="msg-body" data-id="${m.id}">${content}</div>
      ${reactionsHTML(m)}
    </div>
    <button class="icon-btn hover-more" data-action="msg-more" data-id="${m.id}">${icon('more')}</button>
  </div>`;
}

export function messagesHTML(chat, anchorTs = 0) {
  const list = store.msgs(chat.id);
  if (!list.length) return emptyChatHTML(chat);
  let html = '', prev = null, unreadPlaced = false;
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (!prev || fmtDay(prev.ts) !== fmtDay(m.ts)) html += `<div class="date-chip">${esc(fmtDay(m.ts))}</div>`;
    if (!unreadPlaced && anchorTs && !store.isOut(m) && m.ts > anchorTs && m.kind !== 'service') {
      html += `<div class="unread-chip">${t('unreadMessages')}</div>`;
      unreadPlaced = true;
    }
    html += messageHTML(m, chat, prev, list[i + 1]);
    prev = m;
  }
  return html;
}

export function emptyChatHTML(chat) {
  const saved = chat.type === 'saved';
  return `<div class="placeholder" style="padding:40px 20px">
    <div class="ph-logo" style="width:84px;height:84px;border-radius:26px">${saved ? icon('bookmark') : LOGO_SVG}</div>
    <h2 style="font-size:18px">${saved ? t('emptySaved') : t('emptyChatTitle')}</h2>
    <p>${saved ? t('emptySavedBody') : t('emptyChatBody')}</p>
  </div>`;
}

export function typingBubbleHTML(chat) {
  const ty = store.typing[chat.id];
  if (!ty || ty.until < Date.now()) return '';
  const u = store.user(ty.userId);
  return `<div class="msg in typing-row"><div class="stack"><div class="bubble typing-bubble"><i></i><i></i><i></i></div></div></div>`;
}

export function chatSubHTML(chat) {
  const ty = store.typing[chat.id];
  if (ty && ty.until > Date.now()) {
    const name = chat.type === 'group' ? store.displayName(ty.userId).split(' ')[0] + ' ' : '';
    return `<div class="bar-sub typing">${esc(name)}${chat.type === 'group' ? t('typingDots') : t('typing')}</div>`;
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
  const onlineN = chat.members.filter(id => store.user(id)?.online).length;
  return `<div class="bar-sub">${t('members', { n: fmtNum(chat.memberCount || chat.members.length) })}${onlineN ? `, <span class="online">${t('membersOnline', { n: fmtNum(onlineN) })}</span>` : ''}</div>`;
}

export function chatHeaderHTML(chat, { selecting = false, selectedCount = 0 } = {}) {
  if (selecting) {
    return `<div class="select-bar">
      <button class="icon-btn" data-action="select-cancel">${icon('close')}</button>
      <span class="count">${t('selectMessages', { n: fmtNum(selectedCount) })}</span>
      <button class="icon-btn" data-action="select-forward" title="${t('forward')}">${icon('forward')}</button>
      <button class="icon-btn danger" data-action="select-delete" title="${t('delete')}">${icon('trash')}</button>
    </div>`;
  }
  const pinned = store.msgs(chat.id).filter(m => m.pinned).pop();
  return `<div class="bar chat-header" data-action="chat-info">
    <button class="icon-btn back-btn" data-action="back">${icon('back')}</button>
    ${chatAva(chat, 42)}
    <div class="titles"><div class="bar-title">${esc(store.chatTitle(chat))}</div>${chatSubHTML(chat)}</div>
    <button class="icon-btn" data-action="chat-search" title="${t('search')}">${icon('search')}</button>
    <button class="icon-btn" data-action="chat-menu" title="${t('settings')}">${icon('more')}</button>
  </div>
  ${pinned ? `<div class="pinned-bar" data-action="pinned-jump" data-target="${pinned.id}">
    <div class="stripe"></div>
    <div class="pb-body"><div class="pb-title">${t('pinnedMessage')}</div><div class="pb-text">${esc(previewOf(pinned).text)}</div></div>
    <button class="icon-btn" data-action="pinned-unpin" data-id="${pinned.id}">${icon('close')}</button>
  </div>` : ''}`;
}

export function composerHTML(chat, ui = {}) {
  if (chat.type === 'channel' && !chat.joined) {
    return `<div class="composer-zone"><div class="channel-join-bar"><button class="btn block" data-action="join-chat">${t('joinChannel')}</button></div></div>`;
  }
  if (chat.type === 'channel' && chat.joined && !chat.admins.includes(store.state.me.id)) {
    return `<div class="composer-zone"><div class="channel-join-bar"><span class="text-muted text-small">${t('onlyAdmins')}</span></div></div>`;
  }
  if (chat.blocked) {
    return `<div class="composer-zone"><div class="channel-join-bar"><button class="btn ghost block" data-action="unblock">${t('unblock')}</button></div></div>`;
  }
  let bar = '';
  if (ui.editing) {
    const m = store.msgs(chat.id).find(x => x.id === ui.editing);
    bar = `<div class="reply-edit-bar"><div class="stripe"></div>${icon('edit', '')}<div class="re-body"><div class="re-title">${t('editing')}</div><div class="re-text">${esc(previewOf(m).text)}</div></div><button class="icon-btn" data-action="reply-cancel">${icon('close')}</button></div>`;
  } else if (ui.replyTo) {
    const m = store.msgs(chat.id).find(x => x.id === ui.replyTo);
    if (m) bar = `<div class="reply-edit-bar"><div class="stripe"></div>${icon('reply', '')}<div class="re-body"><div class="re-title">${t('replyTitle', { name: esc(m.from === store.state.me.id ? t('you') : store.displayName(m.from)) })}</div><div class="re-text">${esc(previewOf(m).text)}</div></div><button class="icon-btn" data-action="reply-cancel">${icon('close')}</button></div>`;
  }
  const val = ui.editing ? (store.msgs(chat.id).find(x => x.id === ui.editing)?.text || '') : (chat.draft || '');
  const hasText = !!val.trim();
  return `<div class="composer-zone">
    ${bar}
    <div class="composer">
      <button class="icon-btn" data-action="attach" title="${t('attachTitle')}">${icon('attach')}</button>
      <div class="input-shell">
        <textarea id="composer-input" rows="1" placeholder="${t('writeMessage')}" dir="auto">${esc(val)}</textarea>
        <button class="icon-btn" data-action="emoji-panel" title="${t('emoji')}">${icon('smile')}</button>
      </div>
      <button class="send-btn ${hasText || ui.editing ? '' : 'mic'}" data-action="send" title="${hasText || ui.editing ? t('send') : t('voice')}">${hasText || ui.editing ? icon('send') : icon('mic')}</button>
    </div>
    <div id="emoji-panel-slot"></div>
    <div id="attach-slot"></div>
  </div>`;
}

export function chatItemHTML(chat, selectedId) {
  const last = store.lastMsg(chat.id);
  const p = previewOf(last);
  const out = last && store.isOut(last);
  const prefix = last && last.kind !== 'service' && (chat.type === 'group' || chat.type === 'channel')
    ? `<b>${out ? t('you') : esc(store.displayName(last.from).split(' ')[0])}: </b>` : (out && chat.type !== 'saved' ? `<b>${t('you')}: </b>` : '');
  const draft = chat.draft ? `<span class="draft">${t('draft')}: </span>${esc(chat.draft)}` : `${p.icon ? p.icon + ' ' : ''}${esc(p.text)}`;
  const time = last ? fmtListTime(last.ts) : '';
  const titleIcon = chat.muted ? icon('mute', 'mini-ico') : (chat.type === 'channel' ? icon('megaphone', 'mini-ico') : chat.type === 'bot' ? icon('bot', 'mini-ico') : '');
  const badge = chat.unread
    ? `<span class="badge ${chat.muted ? 'muted' : ''}">${fmtNum(chat.unread > 99 ? '99+' : chat.unread)}</span>`
    : (chat.pinned ? icon('pinned', 'ci-pin') : '');
  return `<div class="chat-item ${selectedId === chat.id ? 'selected' : ''}" data-action="open-chat" data-chat="${chat.id}" data-context-chat="${chat.id}">
    ${chatAva(chat, 50)}
    <div class="ci-body">
      <div class="ci-row"><span class="ci-name">${titleIcon}${esc(store.chatTitle(chat))}</span><span class="ci-time">${out && last && !chat.unread ? `<span class="ci-check">${checksHTML(last)}</span>` : ''}${esc(time)}</span></div>
      <div class="ci-preview"><span class="txt">${chat.draft ? draft : prefix + draft}</span>${badge}</div>
    </div>
  </div>`;
}

export function chatListHTML(chats, selectedId, { archived = false } = {}) {
  if (!chats.length) {
    return `<div class="empty-list">${icon(archived ? 'archive' : 'smile')}<div class="e-title">${archived ? t('emptyArchive') : t('noChats')}</div><div>${archived ? t('emptyArchiveBody') : t('noChatsBody')}</div></div>`;
  }
  return chats.map(c => chatItemHTML(c, selectedId)).join('');
}

export function placeholderHTML() {
  return `<div class="placeholder">
    <div class="ph-logo">${LOGO_SVG}</div>
    <h2>${t('appName')}</h2>
    <p>${t('selectChatBody')}</p>
    <div class="chip">${t('selectChat')}</div>
  </div>`;
}

// ---------- emoji & stickers ----------
export const EMOJI_CATS = [
  { icon: '🕒', key: 'recent', label: 'Recent' },
  { icon: '😀', key: 'smileys', label: 'Smileys', list: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 😉 😊 😇 🥰 😍 🤩 😘 😋 😛 🤪 🤨 🧐 🤓 😎 🥳 😏 😒 😞 😔 😟 😕 🙁 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😱 😨 😰 😥 😓 🤗 🤔 🤭 🤫 🤥 😶 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠'.split(' ') },
  { icon: '👋', key: 'gestures', label: 'Gestures', list: '👍 👎 👌 🤌 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐 🖖 👋 🤝 🙏 ✍️ 💪 🦾 👏 🙌 👐 🤲 🫶 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟'.split(' ') },
  { icon: '🐱', key: 'animals', label: 'Animals & nature', list: '🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🐦 🐤 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🐝 🐛 🦋 🐌 🐞 🐜 🕷 🦂 🐢 🐍 🦎 🐙 🦑 🦐 🦀 🐡 🐠 🐟 🐬 🐳 🐋 🦈 🐊 🐅 🐆 🦓 🦍 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🐐 🦌 🐕 🐈 🐓 🦃 🕊 🐇 🌸 🌹 🌺 🌻 🌼 🌷 🌱 🌲 🌳 🌴 🌵 🌾 🌿 ☘️ 🍀 🍁 🍂 🍃 🍄 🌍 🌙 ⭐ 🌟 ⚡ 🔥 🌈 ☀️ 🌤 ⛅ 🌧 ⛈ 🌩 ❄️ ☃️ ⛄ 🌊 💧'.split(' ') },
  { icon: '🍕', key: 'food', label: 'Food', list: '🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🫓 🥪 🌮 🌯 🥙 🧆 🥘 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 ☕ 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🍾'.split(' ') },
  { icon: '⚽', key: 'activity', label: 'Activity', list: '⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸ 🥌 🎿 🎯 🎮 🕹 🎰 🎲 🧩 ♟ 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🎷 🎺 🎸 🪕 🎻 🚴 🧗 🤸 🏊 🏄 🚣 🧘 🎪 🎭 🎫 🎟 🏆 🥇 🥈 🥉 🏅 🎖 🏵 🎗 🎁 🎀 🎊 🎉 🎈'.split(' ') },
  { icon: '🚗', key: 'travel', label: 'Travel & places', list: '🚗 🚕 🚙 🚌 🚎 🏎 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍 🚲 🛴 🚨 🚔 🚍 🚘 🚖 🚡 🚠 🚟 🚃 🚋 🚞 🚝 🚄 🚅 🚈 🚂 🚆 🚇 🚊 🚉 ✈️ 🛫 🛬 🛩 🚀 🛸 🚁 🛶 ⛵ 🚤 🛥 🛳 ⛴ 🚢 ⚓ 🚧 ⛽ 🚏 🚦 🚥 🗺 🗿 🗽 🗼 🏰 🏯 🏟 🎡 🎢 🎠 ⛲ ⛱ 🏖 🏝 🏜 🌋 ⛰ 🏔 🗻 🏕 ⛺ 🏠 🏡 🏘 🏚 🏗 🏭 🏢 🏬 🏣 🏤 🏥 🏦 🏨 🏪 🏫 🏩 💒 🏛 ⛪ 🕌 🕍 🛕 🕋 ⛩ 🌁 🌃 🏙 🌄 🌅 🌆 🌇 🌉 🌌 🌠 🎇 🎆'.split(' ') },
  { icon: '💡', key: 'objects', label: 'Objects & symbols', list: '⌚ 📱 💻 ⌨️ 🖥 🖨 🖱 🕹 🗜 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽 🎞 📞 ☎️ 📟 📠 📺 📻 🎙 🎚 🎛 🧭 ⏱ ⏲ ⏰ 🕰 ⌛ ⏳ 📡 🔋 🔌 💡 🔦 🕯 🧯 🛢 💸 💵 💴 💶 💷 🪙 💰 💳 💎 ⚖️ 🧰 🔧 🔨 ⚒ 🛠 ⛏ 🪓 🔩 ⚙️ ⛓ 🔫 💣 🧨 🪓 🔪 🗡 ⚔️ 🛡 🚬 ⚰️ 🏺 🔮 📿 🧿 💈 ⚗️ 🔭 🔬 🕳 🩹 🩺 💊 💉 🩸 🧬 🦠 🧫 🧪 🌡 🧹 🧺 🧻 🚽 🚰 🚿 🛁 🛀 🧼 🪥 🪒 🧽 🪣 🧴 🛎 🔑 🗝 🚪 🪑 🛋 🛏 🧸 🖼 🛍 🛒 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 ✉️ 📩 📨 📧 💌 📥 📤 📦 🏷 📪 📫 📬 📭 📮 📯 📜 📃 📄 📑 🧾 📊 📈 📉 🗒 🗓 📆 📅 📇 🗃 🗳 🗄 📋 📁 📂 🗂 🗞 📰 📓 📔 📒 📕 📗 📘 📙 📚 📖 🔖 🧷 🔗 📎 🖇 📐 📏 🧮 📌 📍 ✂️ 🖊 🖋 ✒️ 🖌 🖍 📝 ✏️ 🔍 🔎 🔏 🔐 🔒 🔓 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💯 💢 💥 💫 💦 💨 🕳 💬 👁‍🗨 🗨 🗯 💭 💤 ✅ ❌ ❓ ❗ ⭕ 🚫 💯 🔞 📵 🚭 ❇️ ✳️ ❎ 🌐 ♾️ 🆒 🆓 🆕 🆙 🆗 🆘 🆚 🈁 🔠 🔡 🔢 🔣 🔤 🅰️ 🆎 🅱️ 🆑 🆒 🆓 ℹ️ 🆔 Ⓜ️ 🆕 🆖 🅾️ 🆗 🅿️ 🆘 🆙 🆚 🈂️ 🈷️'.split(' ') },
];

export const STICKERS = ['😂','🥰','😎','🤩','🥳','😭','😤','🤯','🥺','😴','🤔','🫡','👍','👎','👏','🙏','💪','🤝','✌️','🫶','❤️','🔥','✨','🎉','🎁','🌿','🌸','☕','🍕','⚽','🚀','🌊','🦄','🐱','🤖','💡','🎧','📸','🏆','💎'];

export function emojiPanelHTML(tab = 'emoji', cat = 'recent') {
  const recent = store.state.recentEmoji || [];
  const catDef = EMOJI_CATS.find(c => c.key === cat) || EMOJI_CATS[1];
  const list = cat === 'recent' ? (recent.length ? recent : EMOJI_CATS[1].list.slice(0, 24)) : catDef.list;
  const grid = tab === 'stickers'
    ? `<div class="emoji-grid stickers">${STICKERS.map(s => `<button data-action="sticker-send" data-emoji="${s}">${s}</button>`).join('')}</div>`
    : `<div class="emoji-cats">${EMOJI_CATS.map(c => `<button data-action="emoji-cat" data-cat="${c.key}" class="${c.key === cat ? 'active' : ''}" title="${c.label}">${c.icon}</button>`).join('')}</div>
       <div class="emoji-grid">${cat !== 'recent' ? `<div class="emoji-label">${esc(catDef.label)}</div>` : ''}${list.map(e => `<button data-action="emoji-insert" data-emoji="${e}">${e}</button>`).join('')}</div>`;
  return `<div class="emoji-panel">
    <div class="panel-tabs">
      <button data-action="emoji-tab" data-tab="emoji" class="${tab === 'emoji' ? 'active' : ''}">${t('emoji')}</button>
      <button data-action="emoji-tab" data-tab="stickers" class="${tab === 'stickers' ? 'active' : ''}">${t('stickers')}</button>
    </div>
    ${grid}
  </div>`;
}

export function attachPopHTML() {
  return `<div class="attach-pop">
    <button class="menu-item" data-action="attach-photo">${icon('image')} ${t('photo')}</button>
    <button class="menu-item" data-action="attach-file">${icon('file')} ${t('file')}</button>
  </div>`;
}

// ---------- shared bits ----------
export function switchHTML(checked, action, extra = '') {
  return `<label class="switch"><input type="checkbox" data-action="${action}" ${extra} ${checked ? 'checked' : ''}><i></i></label>`;
}

export function rowHTML({ ico, color = 'var(--accent)', title, sub = '', value = '', action = '', chev = false, right = '' }) {
  return `<div class="row ${action ? '' : 'static'}" ${action ? `data-action="${action}"` : ''}>
    ${ico ? `<div class="r-ico" style="background:${color}">${icon(ico)}</div>` : ''}
    <div class="r-body"><div class="r-title">${title}</div>${sub ? `<div class="r-sub">${sub}</div>` : ''}</div>
    ${value ? `<span class="r-value">${value}</span>` : ''}
    ${right}
    ${chev ? icon('chevron', 'chev') : ''}
  </div>`;
}