const en = {
  appName: 'Balegram',
  tagline: 'The Telegram experience, at home on Bale',
  chats: 'Chats', search: 'Search', searchPh: 'Search messages, people…',
  settings: 'Settings', contacts: 'Contacts', newMessage: 'New Message',
  newGroup: 'New Group', newChannel: 'New Channel', savedMessages: 'Saved Messages',
  archived: 'Archived chats', archive: 'Archive', unarchive: 'Unarchive',
  all: 'All', personal: 'Personal', groups: 'Groups', channels: 'Channels', bots: 'Bots',
  online: 'online', lastSeen: 'last seen {t}', typing: 'typing…', recordingVoice: 'recording voice…',
  draft: 'Draft', you: 'You', message: 'Message', messages: 'messages',
  writeMessage: 'Message', send: 'Send', cancel: 'Cancel', save: 'Save', done: 'Done', close: 'Close',
  delete: 'Delete', edit: 'Edit', reply: 'Reply', forward: 'Forward', copy: 'Copy text',
  pin: 'Pin', unpin: 'Unpin', select: 'Select', mute: 'Mute', unmute: 'Unmute',
  block: 'Block user', unblock: 'Unblock user', clearHistory: 'Clear history',
  deleteChat: 'Delete chat', leaveGroup: 'Leave group', leaveChannel: 'Leave channel',
  joinChannel: 'Join channel', subscribe: 'Subscribe', members: '{n} members',
  subscribers: '{n} subscribers', member: 'member', admin: 'admin', owner: 'owner',
  media: 'Media', files: 'Files', links: 'Links', about: 'About',
  addContact: 'Add contact', newContact: 'New contact', firstName: 'First name',
  lastName: 'Last name', username: 'Username', bio: 'Bio', phone: 'Phone',
  name: 'Name', groupName: 'Group name', channelName: 'Channel name',
  description: 'Description', descPh: 'What is this about?', next: 'Next', create: 'Create',
  addMembers: 'Add members', selected: '{n} selected', emoji: 'Emoji', stickers: 'Stickers',
  photo: 'Photo or video', file: 'File', voice: 'Voice message',
  recording: 'Recording', recHint: 'Tap stop to send', stopSend: 'Stop & send',
  forwardedFrom: 'Forwarded from', replyTo: 'Reply', edited: 'edited',
  today: 'Today', yesterday: 'Yesterday', pinnedMessage: 'Pinned message',
  unreadMessages: 'Unread messages', emptyChatTitle: 'No messages yet',
  emptyChatBody: 'Say hello — every great conversation starts with one word.',
  noChats: 'Nothing here yet', noChatsBody: 'Start a new conversation with the pencil button.',
  noResults: 'No results for “{q}”', results: 'Results', messagesFound: 'Messages',
  theme: 'Theme', light: 'Light', dark: 'Dark', system: 'System',
  accentColor: 'Accent color', wallpaper: 'Chat wallpaper', fontSize: 'Message text size',
  language: 'Language', notifications: 'Notifications', notifSub: 'In-app alerts for new messages',
  sounds: 'Sounds', soundsSub: 'Send & receive tones', privacy: 'Privacy',
  readReceipts: 'Read receipts', readReceiptsSub: 'Let others see when you’ve read their messages',
  lastSeenPrivacy: 'Show my last seen', lastSeenPrivacySub: 'Contacts can see when you were online',
  storage: 'Data & storage', storageUsed: '{s} used locally', clearCache: 'Clear cache & reset',
  clearCacheSub: 'Restore the demo workspace', version: 'Version',
  baleConnection: 'Bale connection', insideBale: 'Running inside Bale',
  previewMode: 'Browser preview — open this page as a Bale miniapp for the full integration.',
  requestPhone: 'Share my phone number', addToHome: 'Add to home screen',
  shareApp: 'Send app data to bot', openDocs: 'Bale miniapp docs',
  profile: 'Profile', editProfile: 'Edit profile', bioPh: 'A few words about you',
  usernamePh: 'username', phonePh: '+98 …',
  confirmDeleteMsg: 'Delete {n} message(s)?', confirmDeleteChat: 'Delete “{t}” and all its messages?',
  confirmClear: 'Clear all messages in “{t}”? This cannot be undone.',
  confirmLeave: 'Leave “{t}”?', confirmReset: 'Reset everything to the original demo data?',
  deleted: 'Deleted', copied: 'Copied to clipboard', forwarded: 'Forwarded',
  pinned: 'Message pinned', unpinned: 'Message unpinned', saved: 'Saved',
  contactAdded: 'Contact added', groupCreated: 'Group created', channelCreated: 'Channel created',
  chatArchived: 'Chat archived', chatUnarchived: 'Chat unarchived',
  historyCleared: 'History cleared', blocked: 'User blocked', unblocked: 'User unblocked',
  muted: 'Notifications muted', unmuted: 'Notifications on',
  forwardTo: 'Forward to…', chooseChat: 'Choose a chat', replyTitle: 'Reply to {name}',
  editing: 'Editing message', attachTitle: 'Attach', micDenied: 'Microphone access is needed for voice messages',
  voiceTooShort: 'Voice message is too short', fileTooBig: 'File is larger than 2 MB in preview mode',
  welcomeTitle: 'Welcome to Balegram',
  welcomeBody: 'A complete messenger, running as a Bale miniapp. Chats, groups, channels, voice, reactions — all here.',
  selectChat: 'Select a chat to start messaging',
  selectChatBody: 'Or create a new conversation — everything stays on this device until you connect Supabase.',
  supabase: 'Supabase sync', supabaseSub: 'Connect your project for cloud backup & multi-device realtime',
  supabaseUrl: 'Project URL', supabaseKey: 'Anon public key', connect: 'Connect', disconnect: 'Disconnect',
  connected: 'Connected to Supabase', localMode: 'Local mode — data lives in this browser',
  supabaseHint: 'Run supabase/schema.sql in your project’s SQL editor, then paste the URL and anon key.',
  connectionFailed: 'Could not reach Supabase — staying in local mode',
  justNow: 'just now', minutesAgo: '{n}m ago', hoursAgo: '{n}h ago',
  seen: 'seen', sent: 'sent', delivered: 'delivered',
  serviceCreatedGroup: '{name} created the group “{title}”',
  serviceCreatedChannel: '{name} created the channel “{title}”',
  serviceJoined: '{name} joined', serviceAdded: '{name} added {other}',
  servicePhoto: 'Photo', serviceFile: 'File', serviceVoice: 'Voice message', serviceSticker: 'Sticker',
  serviceContact: 'Contact', serviceLocation: 'Location',
  wpDoodles: 'Doodles', wpMesh: 'Mesh', wpSunset: 'Sunset', wpOcean: 'Ocean', wpPlain: 'Plain',
  acCaspian: 'Caspian', acLapis: 'Lapis', acViolet: 'Violet', acRose: 'Rose', acSaffron: 'Saffron', acMint: 'Mint',
  english: 'English', persian: 'فارسی',
  openChat: 'Open chat', messageAction: 'Message', viewProfile: 'View profile',
  removeMember: 'Remove from group', makeAdmin: 'Make admin', dismissAdmin: 'Dismiss admin',
  memberRemoved: 'Member removed', promoted: 'Now an admin', demoted: 'Admin rights removed',
  inviteLink: 'Invite link', linkCopied: 'Invite link copied',
  notificationsEnabled: 'Browser notifications enabled', notificationsDenied: 'Notifications permission denied',
  download: 'Download', play: 'Play', pause: 'Pause',
  bot: 'bot', channel: 'channel', group: 'group',
  startBot: 'Start', botStarted: 'Bot started — say hi!',
  onlyAdmins: 'Only admins can post in this channel',
  reactionsTitle: 'Reactions', selectMessages: '{n} selected',
  deleteForMe: 'Delete', undo: 'Undo', restored: 'Restored',
  general: 'General', appearance: 'Appearance', chatSettings: 'Chat settings',
  baleSection: 'Bale', dangerZone: 'Danger zone',
  previewBadge: 'Preview', connectedBadge: 'Synced',
  typingDots: 'typing', membersOnline: '{n} online',
  searchEverywhere: 'Search everywhere', recent: 'Recent', clearRecent: 'Clear',
  photoCount: '{n} photos', fileCount: '{n} files',
  setProfilePhoto: 'Set profile photo', removePhoto: 'Remove photo',
  avatarColor: 'Avatar color', emojiAvatar: 'Emoji avatar',
  messageSentSound: 'Message sent', newMessageFrom: 'New message from {name}',
  open: 'Open', markAllRead: 'Mark all as read', allRead: 'All chats marked as read',
  emptySaved: 'Your personal cloud', emptySavedBody: 'Forward messages here or write notes — only you can see them.',
  emptyArchive: 'Archive is empty', emptyArchiveBody: 'Swipe a chat into the archive to keep your list tidy.',
  archivedChats: 'Archived', pinChat: 'Pin chat', unpinChat: 'Unpin chat',
  chatPinned: 'Chat pinned', chatUnpinned: 'Chat unpinned',
  copyLink: 'Copy message link', linkCopiedMsg: 'Message link copied',
  report: 'Report', reported: 'Thanks — report noted',
  loading: 'Loading…', error: 'Something went wrong', retry: 'Retry',
};

const fa = {
  appName: 'بله‌گرام',
  tagline: 'تجربهٔ تلگرام، این‌بار در بله',
  chats: 'گفتگوها', search: 'جستجو', searchPh: 'جستجوی پیام‌ها و افراد…',
  settings: 'تنظیمات', contacts: 'مخاطبین', newMessage: 'پیام جدید',
  newGroup: 'گروه جدید', newChannel: 'کانال جدید', savedMessages: 'پیام‌های ذخیره‌شده',
  archived: 'گفتگوهای بایگانی', archive: 'بایگانی', unarchive: 'خروج از بایگانی',
  all: 'همه', personal: 'شخصی', groups: 'گروه‌ها', channels: 'کانال‌ها', bots: 'بازوها',
  online: 'آنلاین', lastSeen: 'آخرین بازدید {t}', typing: 'در حال نوشتن…', recordingVoice: 'در حال ضبط صدا…',
  draft: 'پیش‌نویس', you: 'شما', message: 'پیام', messages: 'پیام',
  writeMessage: 'پیام', send: 'ارسال', cancel: 'لغو', save: 'ذخیره', done: 'تمام', close: 'بستن',
  delete: 'حذف', edit: 'ویرایش', reply: 'پاسخ', forward: 'بازارسال', copy: 'رونوشت متن',
  pin: 'سنجاق', unpin: 'برداشتن سنجاق', select: 'انتخاب', mute: 'بی‌صدا', unmute: 'صدادار',
  block: 'مسدود کردن', unblock: 'رفع مسدودی', clearHistory: 'پاک کردن تاریخچه',
  deleteChat: 'حذف گفتگو', leaveGroup: 'ترک گروه', leaveChannel: 'ترک کانال',
  joinChannel: 'عضویت در کانال', subscribe: 'دنبال کردن', members: '{n} عضو',
  subscribers: '{n} دنبال‌کننده', member: 'عضو', admin: 'مدیر', owner: 'مالک',
  media: 'رسانه', files: 'فایل‌ها', links: 'پیوندها', about: 'درباره',
  addContact: 'افزودن مخاطب', newContact: 'مخاطب جدید', firstName: 'نام',
  lastName: 'نام خانوادگی', username: 'نام کاربری', bio: 'بیوگرافی', phone: 'تلفن',
  name: 'نام', groupName: 'نام گروه', channelName: 'نام کانال',
  description: 'توضیحات', descPh: 'این گفتگو دربارهٔ چیست؟', next: 'بعدی', create: 'ایجاد',
  addMembers: 'افزودن اعضا', selected: '{n} انتخاب‌شده', emoji: 'ایموجی', stickers: 'استیکر',
  photo: 'عکس یا ویدیو', file: 'فایل', voice: 'پیام صوتی',
  recording: 'در حال ضبط', recHint: 'برای ارسال، توقف را بزنید', stopSend: 'توقف و ارسال',
  forwardedFrom: 'بازارسال‌شده از', replyTo: 'پاسخ به', edited: 'ویرایش‌شده',
  today: 'امروز', yesterday: 'دیروز', pinnedMessage: 'پیام سنجاق‌شده',
  unreadMessages: 'پیام‌های خوانده‌نشده', emptyChatTitle: 'هنوز پیامی نیست',
  emptyChatBody: 'سلام کنید — هر گفتگوی عالی با یک کلمه شروع می‌شود.',
  noChats: 'اینجا هنوز خالی است', noChatsBody: 'با دکمهٔ مداد، گفتگوی جدیدی بسازید.',
  noResults: 'نتیجه‌ای برای «{q}» نیست', results: 'نتایج', messagesFound: 'پیام‌ها',
  theme: 'پوسته', light: 'روشن', dark: 'تاریک', system: 'سیستم',
  accentColor: 'رنگ تأکیدی', wallpaper: 'پس‌زمینهٔ گفتگو', fontSize: 'اندازهٔ متن پیام',
  language: 'زبان', notifications: 'اعلان‌ها', notifSub: 'هشدار درون‌برنامه‌ای برای پیام جدید',
  sounds: 'صداها', soundsSub: 'صدای ارسال و دریافت', privacy: 'حریم خصوصی',
  readReceipts: 'رسید خواندن', readReceiptsSub: 'دیگران ببینند پیامشان را خوانده‌اید',
  lastSeenPrivacy: 'نمایش آخرین بازدید', lastSeenPrivacySub: 'مخاطبین آنلاین‌بودن شما را ببینند',
  storage: 'داده و حافظه', storageUsed: '{s} استفادهٔ محلی', clearCache: 'پاک‌سازی و بازنشانی',
  clearCacheSub: 'بازگردانی فضای نمونهٔ اولیه', version: 'نسخه',
  baleConnection: 'اتصال بله', insideBale: 'در حال اجرا داخل بله',
  previewMode: 'پیش‌نمایش مرورگر — برای یکپارچگی کامل، این صفحه را به‌صورت مینی‌اپ بله باز کنید.',
  requestPhone: 'اشتراک شمارهٔ من', addToHome: 'افزودن به صفحهٔ اصلی',
  shareApp: 'ارسال داده به بازو', openDocs: 'مستندات مینی‌اپ بله',
  profile: 'پروفایل', editProfile: 'ویرایش پروفایل', bioPh: 'چند کلمه دربارهٔ شما',
  usernamePh: 'نام کاربری', phonePh: '…۹۸+',
  confirmDeleteMsg: '{n} پیام حذف شود؟', confirmDeleteChat: '«{t}» و همهٔ پیام‌هایش حذف شود؟',
  confirmClear: 'همهٔ پیام‌های «{t}» پاک شود؟ این کار برگشت‌پذیر نیست.',
  confirmLeave: '«{t}» ترک شود؟', confirmReset: 'همه‌چیز به دادهٔ نمونهٔ اولیه بازگردد؟',
  deleted: 'حذف شد', copied: 'رونوشت شد', forwarded: 'بازارسال شد',
  pinned: 'پیام سنجاق شد', unpinned: 'سنجاق برداشته شد', saved: 'ذخیره شد',
  contactAdded: 'مخاطب اضافه شد', groupCreated: 'گروه ساخته شد', channelCreated: 'کانال ساخته شد',
  chatArchived: 'گفتگو بایگانی شد', chatUnarchived: 'گفتگو از بایگانی خارج شد',
  historyCleared: 'تاریخچه پاک شد', blocked: 'کاربر مسدود شد', unblocked: 'رفع مسدودی شد',
  muted: 'اعلان‌ها بی‌صدا شد', unmuted: 'اعلان‌ها روشن شد',
  forwardTo: 'بازارسال به…', chooseChat: 'یک گفتگو انتخاب کنید', replyTitle: 'پاسخ به {name}',
  editing: 'ویرایش پیام', attachTitle: 'پیوست', micDenied: 'برای پیام صوتی، دسترسی میکروفون لازم است',
  voiceTooShort: 'پیام صوتی خیلی کوتاه است', fileTooBig: 'در حالت پیش‌نمایش، فایل بزرگ‌تر از ۲ مگابایت ممکن نیست',
  welcomeTitle: 'به بله‌گرام خوش آمدید',
  welcomeBody: 'یک پیام‌رسان کامل که به‌صورت مینی‌اپ بله اجرا می‌شود. گفتگو، گروه، کانال، صدا و واکنش‌ها — همه اینجاست.',
  selectChat: 'برای شروع، یک گفتگو انتخاب کنید',
  selectChatBody: 'یا گفتگوی جدیدی بسازید — همه‌چیز روی همین دستگاه می‌ماند تا سوپابیس را وصل کنید.',
  supabase: 'همگام‌سازی سوپابیس', supabaseSub: 'برای پشتیبان ابری و بلادرنگ چنددستگاهی، پروژه‌تان را وصل کنید',
  supabaseUrl: 'آدرس پروژه', supabaseKey: 'کلید عمومی anon', connect: 'اتصال', disconnect: 'قطع اتصال',
  connected: 'به سوپابیس متصل شد', localMode: 'حالت محلی — داده‌ها در همین مرورگر است',
  supabaseHint: 'فایل supabase/schema.sql را در ویرایشگر SQL پروژه اجرا کنید، سپس آدرس و کلید anon را وارد کنید.',
  connectionFailed: 'اتصال به سوپابیس ممکن نشد — حالت محلی ادامه دارد',
  justNow: 'همین حالا', minutesAgo: '{n} دقیقه پیش', hoursAgo: '{n} ساعت پیش',
  seen: 'دیده‌شده', sent: 'ارسال‌شده', delivered: 'تحویل‌شده',
  serviceCreatedGroup: '{name} گروه «{title}» را ساخت',
  serviceCreatedChannel: '{name} کانال «{title}» را ساخت',
  serviceJoined: '{name} عضو شد', serviceAdded: '{name}، {other} را افزود',
  servicePhoto: 'عکس', serviceFile: 'فایل', serviceVoice: 'پیام صوتی', serviceSticker: 'استیکر',
  serviceContact: 'مخاطب', serviceLocation: 'موقعیت',
  wpDoodles: 'نقش‌ها', wpMesh: 'مش', wpSunset: 'غروب', wpOcean: 'اقیانوس', wpPlain: 'ساده',
  acCaspian: 'خزر', acLapis: 'لاجورد', acViolet: 'بنفش', acRose: 'رز', acSaffron: 'زعفران', acMint: 'نعنا',
  english: 'English', persian: 'فارسی',
  openChat: 'باز کردن گفتگو', messageAction: 'پیام', viewProfile: 'دیدن پروفایل',
  removeMember: 'حذف از گروه', makeAdmin: 'مدیر کردن', dismissAdmin: 'برکناری مدیریت',
  memberRemoved: 'عضو حذف شد', promoted: 'اکنون مدیر است', demoted: 'دسترسی مدیریت برداشته شد',
  inviteLink: 'پیوند دعوت', linkCopied: 'پیوند دعوت رونوشت شد',
  notificationsEnabled: 'اعلان مرورگر فعال شد', notificationsDenied: 'دسترسی اعلان رد شد',
  download: 'دانلود', play: 'پخش', pause: 'توقف',
  bot: 'بازو', channel: 'کانال', group: 'گروه',
  startBot: 'شروع', botStarted: 'بازو شروع شد — سلام کنید!',
  onlyAdmins: 'فقط مدیران می‌توانند در این کانال پیام بگذارند',
  reactionsTitle: 'واکنش‌ها', selectMessages: '{n} انتخاب‌شده',
  deleteForMe: 'حذف', undo: 'برگردان', restored: 'بازگردانده شد',
  general: 'عمومی', appearance: 'ظاهر', chatSettings: 'تنظیمات گفتگو',
  baleSection: 'بله', dangerZone: 'منطقهٔ خطر',
  previewBadge: 'پیش‌نمایش', connectedBadge: 'همگام',
  typingDots: 'در حال نوشتن', membersOnline: '{n} آنلاین',
  searchEverywhere: 'جستجو در همه‌جا', recent: 'اخیر', clearRecent: 'پاک کردن',
  photoCount: '{n} عکس', fileCount: '{n} فایل',
  setProfilePhoto: 'تعیین عکس پروفایل', removePhoto: 'حذف عکس',
  avatarColor: 'رنگ آواتار', emojiAvatar: 'آواتار ایموجی',
  messageSentSound: 'پیام ارسال شد', newMessageFrom: 'پیام جدید از {name}',
  open: 'باز کردن', markAllRead: 'خواندن همه', allRead: 'همهٔ گفتگوها خوانده شد',
  emptySaved: 'ابر شخصی شما', emptySavedBody: 'پیام‌ها را اینجا بازارسال کنید یا یادداشت بنویسید — فقط خودتان می‌بینید.',
  emptyArchive: 'بایگانی خالی است', emptyArchiveBody: 'گفتگوها را بایگانی کنید تا فهرستتان مرتب بماند.',
  archivedChats: 'بایگانی', pinChat: 'سنجاق گفتگو', unpinChat: 'برداشتن سنجاق گفتگو',
  chatPinned: 'گفتگو سنجاق شد', chatUnpinned: 'سنجاق گفتگو برداشته شد',
  copyLink: 'رونوشت پیوند پیام', linkCopiedMsg: 'پیوند پیام رونوشت شد',
  report: 'گزارش', reported: 'سپاس — گزارش ثبت شد',
  loading: 'در حال بارگذاری…', error: 'مشکلی پیش آمد', retry: 'تلاش دوباره',
};

const DICTS = { en, fa };
let lang = 'en';

export function setLang(l) {
  lang = DICTS[l] ? l : 'en';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
}
export function getLang() { return lang; }
export function isRTL() { return lang === 'fa'; }

export function t(key, vars) {
  let s = (DICTS[lang] && DICTS[lang][key]) ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

export function fmtNum(n) {
  return new Intl.NumberFormat(lang === 'fa' ? 'fa-IR' : 'en-US').format(n);
}

export function fmtTime(ts) {
  const d = new Date(ts);
  if (lang === 'fa') return d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function fmtDay(ts) {
  const d = new Date(ts), now = new Date();
  const startOf = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 864e5);
  if (diff === 0) return t('today');
  if (diff === 1) return t('yesterday');
  return d.toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', { month: 'long', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
}

export function fmtListTime(ts) {
  const d = new Date(ts), now = new Date();
  const startOf = x => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 864e5);
  if (diff === 0) return fmtTime(ts);
  if (diff === 1) return t('yesterday');
  if (diff < 7) return d.toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', { weekday: 'short' });
  return d.toLocaleDateString(lang === 'fa' ? 'fa-IR' : 'en-US', { month: 'short', day: 'numeric' });
}

export function fmtAgo(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 60) return t('justNow');
  if (s < 3600) return t('minutesAgo', { n: fmtNum(Math.floor(s / 60)) });
  if (s < 86400) return t('hoursAgo', { n: fmtNum(Math.floor(s / 3600)) });
  return fmtDay(ts);
}

export function fmtSize(bytes) {
  if (bytes < 1024) return `${fmtNum(bytes)} B`;
  if (bytes < 1048576) return `${fmtNum((bytes / 1024).toFixed(1))} KB`;
  return `${fmtNum((bytes / 1048576).toFixed(1))} MB`;
}

export function fmtDuration(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  const str = `${m}:${String(s).padStart(2, '0')}`;
  return lang === 'fa' ? str.replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]) : str;
}