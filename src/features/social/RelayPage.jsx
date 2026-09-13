import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Search, UserPlus, Bell, ShieldOff, Hash, Smile, Paperclip, SendHorizontal,
  Image as ImageIcon, Check, CheckCheck, ChevronDown, Star, Pin, MoreVertical,
  Gamepad2, Users, X, Loader2, AlertCircle, Wifi, WifiOff, ArrowDown, Clock
} from 'lucide-react';
import RelayAvatar from './RelayAvatar';
import './RelayPage.css';

/**
 * Noctra Relay - realtime friends & messaging surface.
 *
 * Layout is Discord-shaped: conversation rail on the left, message stream in
 * the middle, profile panel on the right. Every colour, radius, shadow and
 * easing comes from the appearance tokens in src/styles/theme.css, so the page
 * follows the user's surface / contrast / radius / glow / motion settings.
 */

const STORE_KEY = 'noctra_relay_store_v5';
const REACTION_PALETTE = ['\u2764\uFE0F', '\uD83D\uDE02', '\uD83D\uDD25', '\uD83D\uDC4D', '\uD83D\uDE2E', '\uD83D\uDE22', '\uD83C\uDF89', '\uD83D\uDC80'];
const EMOJI_PICKER = [
  '\uD83D\uDE00', '\uD83D\uDE02', '\uD83D\uDE05', '\uD83D\uDE0D', '\uD83D\uDE0E', '\uD83E\uDD29', '\uD83D\uDE14', '\uD83D\uDE2D',
  '\uD83D\uDE21', '\uD83D\uDC4D', '\uD83D\uDC4F', '\uD83D\uDE4C', '\uD83E\uDD1D', '\uD83D\uDD25', '\u2B50', '\u2728',
  '\uD83C\uDF89', '\uD83C\uDFAE', '\u26CF\uFE0F', '\uD83D\uDDE1\uFE0F', '\uD83D\uDEE1\uFE0F', '\uD83D\uDC80', '\uD83D\uDC7E', '\uD83E\uDD16'
];
const MESSAGE_MAX = 2000;
const GROUP_WINDOW = 5 * 60 * 1000;

function readStore() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeStore(patch) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ ...readStore(), ...patch }));
  } catch {}
}

function formatClock(timestamp) {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDayLabel(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
}

function formatRelative(timestamp) {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d`;
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function statusLabel(friend) {
  if (!friend) return '';
  if (friend.status === 'offline') return `Last seen ${formatRelative(friend.lastSeen)}`;
  if (friend.serverAddress) return `Playing on ${friend.serverAddress}`;
  return friend.activity || 'In Launcher';
}

function statusKind(friend) {
  if (!friend || friend.status === 'offline') return 'offline';
  if (friend.serverAddress || friend.status === 'in-game') return 'in-game';
  if (friend.status === 'idle' || friend.status === 'away') return 'idle';
  return 'online';
}

/** Collapse reaction rows into `{ emoji, count, mine }` chips. */
function groupReactions(reactions, selfId) {
  const map = new Map();
  for (const item of reactions || []) {
    if (!item?.reaction) continue;
    const entry = map.get(item.reaction) || { emoji: item.reaction, count: 0, mine: false };
    entry.count += 1;
    if (item.userId === selfId) entry.mine = true;
    map.set(item.reaction, entry);
  }
  return [...map.values()];
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RelayPage({ account, social, onJoinServer, onNotify }) {
  const {
    isNoctra, selfId, friends, requests, blocked, messages, typingBy, streamStatus,
    activeChatFriend, activeChatId, setActiveChatFriend, hasMoreMessages, loadingMessages,
    initialLoading, loadOlder, socialError, searchResults, searchLoading, searchPlayers,
    sendMessage, uploadMedia, setMessageReaction, notifyTyping, stopTyping,
    sendRequest, respondRequest, updateFriend, unfriend, block, unblock,
    setContextMenu, setNicknameModalFriend, pendingRequestsTotal, reconnect, conversations
  } = social;

  const [view, setView] = useState('chats');
  const [filter, setFilter] = useState('');
  const [addQuery, setAddQuery] = useState('');
  const [draft, setDraft] = useState('');
  const [picker, setPicker] = useState(null); // 'emoji' | 'attach' | null
  const [showProfile, setShowProfile] = useState(true);
  const [pinnedIds, setPinnedIds] = useState(() => readStore().pinnedIds || []);
  const [drafts, setDrafts] = useState({});
  const [atBottom, setAtBottom] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reactionFor, setReactionFor] = useState(null);

  const scrollRef = useRef(null);
  const bottomRef = useRef(null);
  const composerRef = useRef(null);
  const fileRef = useRef(null);

  // Restore the last open conversation once friends arrive.
  useEffect(() => {
    if (activeChatId || !friends.length) return;
    const last = readStore().lastSelectedId;
    const target = friends.find((friend) => friend.id === last) || null;
    if (target) setActiveChatFriend(target);
  }, [friends, activeChatId, setActiveChatFriend]);

  useEffect(() => {
    if (activeChatId) writeStore({ lastSelectedId: activeChatId });
  }, [activeChatId]);

  useEffect(() => { writeStore({ pinnedIds }); }, [pinnedIds]);

  // Keep per-conversation drafts so switching threads never loses text.
  useEffect(() => {
    setDraft(drafts[activeChatId] || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChatId]);

  const rememberDraft = useCallback((value) => {
    setDraft(value);
    setDrafts((previous) => ({ ...previous, [activeChatId]: value }));
  }, [activeChatId]);

  const conversationList = useMemo(() => {
    const term = filter.trim().toLowerCase();
    const decorated = friends.map((friend) => ({
      ...friend,
      pinned: pinnedIds.includes(friend.id),
      sortTime: friend.lastMessageTime || friend.friendsSince || 0
    }));
    const matched = term
      ? decorated.filter((friend) => (
        friend.name?.toLowerCase().includes(term) || friend.nickname?.toLowerCase().includes(term)
      ))
      : decorated;

    return matched.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      if (a.isBestFriend !== b.isBestFriend) return a.isBestFriend ? -1 : 1;
      if (a.sortTime !== b.sortTime) return b.sortTime - a.sortTime;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [friends, filter, pinnedIds]);

  const onlineCount = useMemo(
    () => friends.filter((friend) => friend.status !== 'offline').length,
    [friends]
  );

  // Build render rows: day dividers + grouped messages.
  const rows = useMemo(() => {
    const output = [];
    let lastDay = null;
    let previous = null;

    for (const message of messages || []) {
      const day = new Date(message.createdAt).toDateString();
      if (day !== lastDay) {
        output.push({ kind: 'divider', id: `divider-${day}`, label: formatDayLabel(message.createdAt) });
        lastDay = day;
        previous = null;
      }
      const grouped = Boolean(
        previous &&
        previous.senderId === message.senderId &&
        message.createdAt - previous.createdAt < GROUP_WINDOW
      );
      output.push({ kind: 'message', id: message.id, message, grouped });
      previous = message;
    }
    return output;
  }, [messages]);

  const isTyping = Boolean(activeChatId && typingBy?.[activeChatId]);

  // Scrolling ---------------------------------------------------------------

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    bottomRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  useLayoutEffect(() => {
    if (!activeChatId) return;
    requestAnimationFrame(() => scrollToBottom('auto'));
  }, [activeChatId, scrollToBottom]);

  useEffect(() => {
    if (atBottom) scrollToBottom('smooth');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages?.length, isTyping]);

  const handleScroll = useCallback((event) => {
    const el = event.currentTarget;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distance < 120);
    if (el.scrollTop < 80 && hasMoreMessages && !loadingMessages) {
      const previousHeight = el.scrollHeight;
      loadOlder(activeChatId).then(() => {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight - previousHeight + el.scrollTop;
        });
      });
    }
  }, [hasMoreMessages, loadingMessages, loadOlder, activeChatId]);

  // Actions -----------------------------------------------------------------

  const handleSend = useCallback(async () => {
    const content = draft.trim();
    if (!content || !activeChatId) return;
    rememberDraft('');
    stopTyping(activeChatId);
    const res = await sendMessage(activeChatId, content);
    if (res?.ok === false && res?.error) onNotify?.({ type: 'error', message: res.error });
    scrollToBottom('smooth');
  }, [draft, activeChatId, rememberDraft, stopTyping, sendMessage, onNotify, scrollToBottom]);

  const handleKeyDown = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
      return;
    }
    if (event.key === 'Escape') setPicker(null);
  }, [handleSend]);

  const handleDraftChange = useCallback((event) => {
    rememberDraft(event.target.value.slice(0, MESSAGE_MAX));
    if (activeChatId) notifyTyping(activeChatId);
  }, [rememberDraft, notifyTyping, activeChatId]);

  const handleFiles = useCallback(async (fileList) => {
    const file = fileList?.[0];
    if (!file || !activeChatId) return;
    if (file.size > 25 * 1024 * 1024) {
      onNotify?.({ type: 'error', message: 'Attachments must be 25MB or smaller.' });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await fileToDataUrl(file);
      const upload = await uploadMedia(dataUrl, file.name);
      if (!upload?.ok || !upload.url) {
        onNotify?.({ type: 'error', message: upload?.error || 'Upload failed.' });
        return;
      }
      await sendMessage(activeChatId, '', {
        mediaUrl: upload.url,
        mediaName: upload.name || file.name,
        mediaKind: file.type.startsWith('image/') ? 'image' : (file.type.startsWith('audio/') ? 'audio' : 'file'),
        isMedia: true
      });
      scrollToBottom('smooth');
    } finally {
      setUploading(false);
      setPicker(null);
    }
  }, [activeChatId, uploadMedia, sendMessage, onNotify, scrollToBottom]);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    handleFiles(event.dataTransfer?.files);
  }, [handleFiles]);

  const handleAddFriend = useCallback(async (username) => {
    const name = (username || addQuery).trim();
    if (!name) return;
    const res = await sendRequest(name);
    if (res?.ok) {
      setAddQuery('');
      searchPlayers('');
      onNotify?.({ type: 'success', message: `Friend request sent to ${name}.` });
    } else {
      onNotify?.({ type: 'error', message: res?.error || 'Could not send that friend request.' });
    }
  }, [addQuery, sendRequest, searchPlayers, onNotify]);

  const openContextMenu = useCallback((event, friend) => {
    event.preventDefault();
    setContextMenu({ friend, x: event.clientX, y: event.clientY });
  }, [setContextMenu]);

  const togglePin = useCallback((friendId) => {
    setPinnedIds((previous) => (
      previous.includes(friendId) ? previous.filter((id) => id !== friendId) : [...previous, friendId]
    ));
  }, []);

  // Gate ---------------------------------------------------------------------

  if (!isNoctra) {
    return (
      <div className="relay relay--gate">
        <div className="relay-gate-card">
          <div className="relay-gate-icon"><Users size={30} /></div>
          <h2>Relay needs a Noctra account</h2>
          <p>Sign in with a Noctra account to message friends, share presence and see who is in game.</p>
        </div>
      </div>
    );
  }

  const activeThread = conversations?.[activeChatId];

  return (
    <div className="relay" data-view={view}>
      {/* Conversation rail */}
      <aside className="relay-rail">
        <header className="relay-rail-head">
          <div className="relay-rail-title">
            <h1>Relay</h1>
            <span className={`relay-stream relay-stream--${streamStatus}`} title={`Realtime: ${streamStatus}`}>
              {streamStatus === 'connected' ? <Wifi size={13} /> : <WifiOff size={13} />}
              {streamStatus === 'connected' ? 'Live' : 'Reconnecting'}
            </span>
          </div>
          <div className="relay-search">
            <Search size={14} />
            <input
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Find a conversation"
              aria-label="Find a conversation"
            />
            {filter && (
              <button type="button" className="relay-search-clear" onClick={() => setFilter('')} aria-label="Clear">
                <X size={12} />
              </button>
            )}
          </div>
          <nav className="relay-tabs">
            <button type="button" className={view === 'chats' ? 'is-active' : ''} onClick={() => setView('chats')}>
              <Hash size={14} /> Chats
            </button>
            <button type="button" className={view === 'requests' ? 'is-active' : ''} onClick={() => setView('requests')}>
              <Bell size={14} /> Requests
              {pendingRequestsTotal > 0 && <span className="relay-pill">{pendingRequestsTotal}</span>}
            </button>
            <button type="button" className={view === 'blocked' ? 'is-active' : ''} onClick={() => setView('blocked')}>
              <ShieldOff size={14} /> Blocked
            </button>
          </nav>
        </header>

        <div className="relay-rail-body">
          {initialLoading && (
            <div className="relay-skeletons">
              {[0, 1, 2, 3, 4].map((index) => <div key={index} className="relay-skeleton" />)}
            </div>
          )}

          {!initialLoading && conversationList.length === 0 && (
            <p className="relay-empty-note">No conversations yet. Add a friend to get started.</p>
          )}

          <ul className="relay-conv-list">
            {conversationList.map((friend, index) => {
              const thread = conversations?.[friend.id];
              const preview = typingBy?.[friend.id]
                ? 'typing…'
                : (friend.lastMessageIsMedia
                  ? 'Attachment'
                  : friend.lastMessageContent || 'Say hello');
              const fromSelf = friend.lastMessageSenderId === selfId;
              return (
                <li key={friend.id} style={{ '--stagger': `${Math.min(index, 12) * 18}ms` }}>
                  <button
                    type="button"
                    className={`relay-conv ${activeChatId === friend.id ? 'is-active' : ''} ${friend.unreadCount ? 'is-unread' : ''}`}
                    onClick={() => { setActiveChatFriend(friend); setView('chats'); }}
                    onContextMenu={(event) => openContextMenu(event, friend)}
                  >
                    <RelayAvatar
                      name={friend.name}
                      skinUrl={friend.skinUrl}
                      size={40}
                      status={statusKind(friend)}
                      showStatus
                    />
                    <span className="relay-conv-text">
                      <span className="relay-conv-top">
                        <span className="relay-conv-name">
                          {friend.nickname || friend.name}
                          {friend.isBestFriend && <Star size={11} className="relay-best" />}
                          {friend.pinned && <Pin size={11} className="relay-pinned" />}
                        </span>
                        <span className="relay-conv-time">{formatRelative(friend.lastMessageTime)}</span>
                      </span>
                      <span className={`relay-conv-preview ${typingBy?.[friend.id] ? 'is-typing' : ''}`}>
                        {fromSelf && !typingBy?.[friend.id] && <span className="relay-conv-you">You: </span>}
                        {preview}
                      </span>
                    </span>
                    {friend.unreadCount > 0 && <span className="relay-unread">{friend.unreadCount > 99 ? '99+' : friend.unreadCount}</span>}
                    {!friend.unreadCount && thread?.messages?.length > 0 && <span className="relay-loaded-dot" title="Conversation loaded" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="relay-rail-foot">
          <RelayAvatar name={account?.name} size={32} status="online" showStatus />
          <div className="relay-self">
            <strong>{account?.name}</strong>
            <span>{onlineCount} of {friends.length} online</span>
          </div>
          <button type="button" className="relay-icon-btn" onClick={() => setView('requests')} title="Add friend">
            <UserPlus size={16} />
          </button>
        </footer>
      </aside>

      {/* Main surface */}
      <main className="relay-main">
        {socialError && (
          <div className="relay-banner">
            <AlertCircle size={14} /> {socialError}
            <button type="button" onClick={reconnect}>Retry</button>
          </div>
        )}

        {view === 'requests' && (
          <section className="relay-panel relay-panel--enter">
            <header className="relay-panel-head">
              <h2>Friend requests</h2>
              <p>Add players by their Noctra username.</p>
            </header>

            <div className="relay-add">
              <input
                value={addQuery}
                maxLength={16}
                placeholder="Username"
                onChange={(event) => { setAddQuery(event.target.value); searchPlayers(event.target.value); }}
                onKeyDown={(event) => { if (event.key === 'Enter') handleAddFriend(); }}
              />
              <button type="button" className="relay-primary" onClick={() => handleAddFriend()}>
                {searchLoading ? <Loader2 size={15} className="relay-spin" /> : <UserPlus size={15} />}
                Send request
              </button>
            </div>

            {searchResults.length > 0 && (
              <ul className="relay-cards">
                {searchResults.map((player) => (
                  <li key={player.id} className="relay-card">
                    <RelayAvatar name={player.name} skinUrl={player.skinUrl} size={38} />
                    <div className="relay-card-text"><strong>{player.name}</strong><span>Noctra player</span></div>
                    <button type="button" className="relay-primary relay-primary--sm" onClick={() => handleAddFriend(player.name)}>Add</button>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="relay-subhead">Incoming <span>{requests.received?.length || 0}</span></h3>
            {(requests.received || []).length === 0 && <p className="relay-empty-note">Nothing waiting for you.</p>}
            <ul className="relay-cards">
              {(requests.received || []).map((item) => (
                <li key={item.id} className="relay-card">
                  <RelayAvatar name={item.name} skinUrl={item.skinUrl} size={38} />
                  <div className="relay-card-text"><strong>{item.name}</strong><span>Sent {formatRelative(item.createdAt)} ago</span></div>
                  <button type="button" className="relay-primary relay-primary--sm" onClick={() => respondRequest(item.id, 'accept')}>Accept</button>
                  <button type="button" className="relay-ghost relay-ghost--sm" onClick={() => respondRequest(item.id, 'decline')}>Decline</button>
                </li>
              ))}
            </ul>

            <h3 className="relay-subhead">Sent <span>{requests.sent?.length || 0}</span></h3>
            {(requests.sent || []).length === 0 && <p className="relay-empty-note">No outgoing requests.</p>}
            <ul className="relay-cards">
              {(requests.sent || []).map((item) => (
                <li key={item.id} className="relay-card">
                  <RelayAvatar name={item.name} skinUrl={item.skinUrl} size={38} />
                  <div className="relay-card-text"><strong>{item.name}</strong><span><Clock size={11} /> Pending</span></div>
                  <button type="button" className="relay-ghost relay-ghost--sm" onClick={() => respondRequest(item.id, 'cancel')}>Cancel</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {view === 'blocked' && (
          <section className="relay-panel relay-panel--enter">
            <header className="relay-panel-head">
              <h2>Blocked players</h2>
              <p>Blocked players cannot message you or send requests.</p>
            </header>
            {(blocked || []).length === 0 && <p className="relay-empty-note">You have not blocked anyone.</p>}
            <ul className="relay-cards">
              {(blocked || []).map((item) => (
                <li key={item.id} className="relay-card">
                  <RelayAvatar name={item.name} skinUrl={item.skinUrl} size={38} />
                  <div className="relay-card-text"><strong>{item.name}</strong><span>Blocked {formatRelative(item.blockedAt)} ago</span></div>
                  <button type="button" className="relay-primary relay-primary--sm" onClick={() => unblock(item.id)}>Unblock</button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {view === 'chats' && !activeChatFriend && (
          <section className="relay-panel relay-panel--center relay-panel--enter">
            <div className="relay-gate-icon"><Hash size={28} /></div>
            <h2>Pick a conversation</h2>
            <p>Every thread is already loaded, so switching is instant.</p>
          </section>
        )}

        {view === 'chats' && activeChatFriend && (
          <section className="relay-chat" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
            <header className="relay-chat-head">
              <RelayAvatar
                name={activeChatFriend.name}
                skinUrl={activeChatFriend.skinUrl}
                size={36}
                status={statusKind(activeChatFriend)}
                showStatus
              />
              <div className="relay-chat-id">
                <strong>
                  {activeChatFriend.nickname || activeChatFriend.name}
                  {activeChatFriend.isVerified && <span className="relay-verified" title="Verified Noctra account">\u2713</span>}
                </strong>
                <span className={`relay-chat-status is-${statusKind(activeChatFriend)}`}>{statusLabel(activeChatFriend)}</span>
              </div>
              <div className="relay-chat-actions">
                {activeChatFriend.serverAddress && (
                  <button type="button" className="relay-ghost relay-ghost--sm" onClick={() => onJoinServer?.(activeChatFriend.serverAddress)}>
                    <Gamepad2 size={14} /> Join
                  </button>
                )}
                <button type="button" className="relay-icon-btn" onClick={() => togglePin(activeChatFriend.id)} title="Pin conversation">
                  <Pin size={16} />
                </button>
                <button
                  type="button"
                  className="relay-icon-btn"
                  onClick={() => updateFriend(activeChatFriend.id, { isBestFriend: !activeChatFriend.isBestFriend })}
                  title="Best friend"
                >
                  <Star size={16} className={activeChatFriend.isBestFriend ? 'is-on' : ''} />
                </button>
                <button type="button" className="relay-icon-btn" onClick={() => setShowProfile((value) => !value)} title="Profile">
                  <Users size={16} />
                </button>
                <button
                  type="button"
                  className="relay-icon-btn"
                  onClick={(event) => openContextMenu(event, activeChatFriend)}
                  title="More"
                >
                  <MoreVertical size={16} />
                </button>
              </div>
            </header>

            <div className="relay-stream-wrap">
              <div className="relay-messages" ref={scrollRef} onScroll={handleScroll}>
                {hasMoreMessages && (
                  <div className="relay-load-older">
                    <button type="button" onClick={() => loadOlder(activeChatId)} disabled={loadingMessages}>
                      {loadingMessages ? <Loader2 size={13} className="relay-spin" /> : null}
                      Load earlier messages
                    </button>
                  </div>
                )}

                {!hasMoreMessages && (
                  <div className="relay-thread-start">
                    <RelayAvatar name={activeChatFriend.name} skinUrl={activeChatFriend.skinUrl} size={64} />
                    <h3>{activeChatFriend.nickname || activeChatFriend.name}</h3>
                    <p>This is the beginning of your conversation.</p>
                  </div>
                )}

                {rows.map((row) => {
                  if (row.kind === 'divider') {
                    return (
                      <div key={row.id} className="relay-divider"><span>{row.label}</span></div>
                    );
                  }

                  const { message, grouped } = row;
                  const mine = message.senderId === selfId;
                  const chips = groupReactions(message.reactions, selfId);

                  return (
                    <article
                      key={row.id}
                      className={`relay-msg ${mine ? 'is-mine' : 'is-theirs'} ${grouped ? 'is-grouped' : ''} ${message.pending ? 'is-pending' : ''} ${message.failed ? 'is-failed' : ''}`}
                      onMouseLeave={() => setReactionFor((current) => (current === message.id ? null : current))}
                    >
                      <div className="relay-msg-gutter">
                        {!grouped && (
                          <RelayAvatar
                            name={mine ? account?.name : activeChatFriend.name}
                            skinUrl={mine ? null : activeChatFriend.skinUrl}
                            size={34}
                          />
                        )}
                      </div>

                      <div className="relay-msg-body">
                        {!grouped && (
                          <div className="relay-msg-meta">
                            <strong>{mine ? (account?.name || 'You') : (activeChatFriend.nickname || activeChatFriend.name)}</strong>
                            <time>{formatClock(message.createdAt)}</time>
                          </div>
                        )}

                        <div className="relay-bubble">
                          {message.content && <p className="relay-text">{message.content}</p>}

                          {message.isMedia && message.mediaUrl && (
                            (message.mediaKind === 'audio')
                              ? <audio className="relay-audio" controls src={message.mediaUrl} />
                              : (/\.(png|jpe?g|gif|webp)$/i.test(message.mediaUrl) || message.mediaKind === 'image')
                                ? (
                                  <a className="relay-media" href={message.mediaUrl} target="_blank" rel="noreferrer">
                                    <img src={message.mediaUrl} alt={message.mediaName || 'Attachment'} loading="lazy" />
                                  </a>
                                )
                                : (
                                  <a className="relay-file" href={message.mediaUrl} target="_blank" rel="noreferrer">
                                    <Paperclip size={14} /> {message.mediaName || 'Attachment'}
                                  </a>
                                )
                          )}

                          <span className="relay-msg-foot">
                            <time className="relay-inline-time">{formatClock(message.createdAt)}</time>
                            {mine && (
                              message.pending
                                ? <Loader2 size={12} className="relay-spin" />
                                : message.isRead
                                  ? <CheckCheck size={13} className="relay-read" />
                                  : <Check size={13} />
                            )}
                          </span>
                        </div>

                        {chips.length > 0 && (
                          <div className="relay-reactions">
                            {chips.map((chip) => (
                              <button
                                key={chip.emoji}
                                type="button"
                                className={`relay-reaction ${chip.mine ? 'is-mine' : ''}`}
                                onClick={() => setMessageReaction(message.id, chip.emoji)}
                              >
                                <span>{chip.emoji}</span>{chip.count}
                              </button>
                            ))}
                          </div>
                        )}

                        {message.failed && <span className="relay-failed-note">Not delivered</span>}
                      </div>

                      <div className="relay-msg-tools">
                        <button
                          type="button"
                          className="relay-icon-btn relay-icon-btn--tiny"
                          onClick={() => setReactionFor((current) => (current === message.id ? null : message.id))}
                          title="Add reaction"
                        >
                          <Smile size={14} />
                        </button>
                        {reactionFor === message.id && (
                          <div className="relay-reaction-palette">
                            {REACTION_PALETTE.map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => { setMessageReaction(message.id, emoji); setReactionFor(null); }}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}

                {isTyping && (
                  <div className="relay-typing">
                    <RelayAvatar name={activeChatFriend.name} skinUrl={activeChatFriend.skinUrl} size={26} />
                    <span className="relay-typing-dots"><i /><i /><i /></span>
                    <span>{activeChatFriend.nickname || activeChatFriend.name} is typing</span>
                  </div>
                )}

                <div ref={bottomRef} />
              </div>

              {!atBottom && (
                <button type="button" className="relay-jump" onClick={() => scrollToBottom('smooth')}>
                  <ArrowDown size={14} /> Jump to latest
                </button>
              )}
            </div>

            <footer className="relay-composer">
              {picker === 'emoji' && (
                <div className="relay-popover relay-popover--emoji">
                  {EMOJI_PICKER.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => rememberDraft(`${draft}${emoji}`)}>{emoji}</button>
                  ))}
                </div>
              )}

              <div className="relay-composer-box">
                <button
                  type="button"
                  className="relay-icon-btn"
                  onClick={() => fileRef.current?.click()}
                  title="Attach a file"
                  disabled={uploading}
                >
                  {uploading ? <Loader2 size={17} className="relay-spin" /> : <Paperclip size={17} />}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  onChange={(event) => handleFiles(event.target.files)}
                  accept="image/*,audio/*,.txt,.log,.zip,.json"
                />

                <textarea
                  ref={composerRef}
                  rows={1}
                  value={draft}
                  maxLength={MESSAGE_MAX}
                  onChange={handleDraftChange}
                  onKeyDown={handleKeyDown}
                  onBlur={() => stopTyping(activeChatId)}
                  placeholder={`Message ${activeChatFriend.nickname || activeChatFriend.name}`}
                />

                <button
                  type="button"
                  className="relay-icon-btn"
                  onClick={() => setPicker((current) => (current === 'emoji' ? null : 'emoji'))}
                  title="Emoji"
                >
                  <Smile size={17} />
                </button>
                <button
                  type="button"
                  className="relay-send"
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  title="Send"
                >
                  <SendHorizontal size={16} />
                </button>
              </div>

              <div className="relay-composer-foot">
                <span><b>Enter</b> to send · <b>Shift+Enter</b> for a new line</span>
                <span className={draft.length > MESSAGE_MAX - 100 ? 'is-warn' : ''}>{draft.length}/{MESSAGE_MAX}</span>
              </div>
            </footer>
          </section>
        )}
      </main>

      {/* Profile panel */}
      {view === 'chats' && activeChatFriend && showProfile && (
        <aside className="relay-profile">
          <div className="relay-profile-banner" />
          <RelayAvatar
            name={activeChatFriend.name}
            skinUrl={activeChatFriend.skinUrl}
            size={78}
            className="relay-profile-avatar"
            status={statusKind(activeChatFriend)}
            showStatus
          />
          <h2>{activeChatFriend.nickname || activeChatFriend.name}</h2>
          {activeChatFriend.nickname && <p className="relay-profile-real">{activeChatFriend.name}</p>}
          <p className={`relay-profile-status is-${statusKind(activeChatFriend)}`}>{statusLabel(activeChatFriend)}</p>

          <dl className="relay-profile-facts">
            <div><dt>Friends since</dt><dd>{activeChatFriend.friendsSince ? new Date(activeChatFriend.friendsSince).toLocaleDateString() : '—'}</dd></div>
            <div><dt>Messages loaded</dt><dd>{activeThread?.messages?.length || 0}</dd></div>
            <div><dt>Account</dt><dd>{activeChatFriend.isVerified ? 'Verified Noctra' : 'Unverified'}</dd></div>
          </dl>

          <div className="relay-profile-actions">
            {activeChatFriend.serverAddress && (
              <button type="button" className="relay-primary" onClick={() => onJoinServer?.(activeChatFriend.serverAddress)}>
                <Gamepad2 size={15} /> Join their server
              </button>
            )}
            <button type="button" className="relay-ghost" onClick={() => setNicknameModalFriend(activeChatFriend)}>Set nickname</button>
            <button type="button" className="relay-ghost" onClick={() => updateFriend(activeChatFriend.id, { isBestFriend: !activeChatFriend.isBestFriend })}>
              {activeChatFriend.isBestFriend ? 'Remove best friend' : 'Mark best friend'}
            </button>
            <button type="button" className="relay-ghost relay-ghost--danger" onClick={() => unfriend(activeChatFriend.id)}>Remove friend</button>
            <button type="button" className="relay-ghost relay-ghost--danger" onClick={() => block(activeChatFriend.id)}>Block</button>
          </div>
        </aside>
      )}
    </div>
  );
}
