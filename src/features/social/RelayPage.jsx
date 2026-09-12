import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BadgeCheck,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Gift,
  Image as ImageIcon,
  Maximize2,
  Menu,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pin,
  Play,
  Search,
  Send,
  Smile,
  Sparkles,
  UserPlus,
  Users,
  Volume2,
  X
} from 'lucide-react';
import defaultLockerBg from '../../assets/backgrounds/locker-bg.png';
import './RelayPage.css';

const RELAY_STORAGE_KEY = 'noctra_relay_store_v3';

const headUrl = (nameOrUuid) => {
  if (!nameOrUuid) return 'https://mc-heads.net/avatar/MHF_Steve/64';
  if (nameOrUuid.length > 20) return `https://mc-heads.net/avatar/${nameOrUuid}/64`;
  return `https://mc-heads.net/avatar/${nameOrUuid}/64`;
};

const formatTime = (stamp) => {
  if (!stamp) return '';
  const date = new Date(stamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

// Initial mockup seed friends (matching media_1789234145962.png 1:1)
const SEED_FRIENDS = [
  { id: 'XerxerBro', name: 'XerxerBro', nickname: 'XerxerBro', status: 'offline', activity: 'Offline', lastSeen: '22:16', lastMessage: 'server is restarting in 5 mi...', lastTime: '22:16', unread: 0 },
  { id: '2fishbowl', name: '2fishbowl', nickname: '2fishbowl', status: 'in-launcher', activity: 'In Launcher', lastSeen: '17:13', lastMessage: 'You: did we register for t...', lastTime: '17:13, yesterday', isMine: true, unread: 0 },
  { id: 'meegreyone', name: 'meegreyone', nickname: 'meegreyone', status: 'offline', activity: 'Offline', lastSeen: '14:22', lastMessage: 'check discord', lastTime: '14:22', unread: 0 },
  { id: '3wafyy', name: '3wafyy', nickname: '3wafyy', status: 'in-launcher', activity: 'In Launcher', lastSeen: '12:19', lastMessage: 'latest_crash.log', lastTime: '12:19', isAttachment: true, unread: 0 },
  { id: 'masaya46', name: 'masaya46', nickname: 'masaya46', status: 'in-game', activity: 'In-game: Hypixel', lastSeen: '19:02', lastMessage: 'You: logging in now, inv me...', lastTime: '19:02, yesterday', isMine: true, unread: 0 },
  { id: 'daaaavidds', name: 'daaaavidds', nickname: 'daaaavidds', status: 'offline', activity: 'Offline', lastSeen: '17:13', lastMessage: 'yo, are we playing the tourna...', lastTime: '17:13, yesterday', unread: 0 },
  { id: 'cuvsa', name: 'cuvsa', nickname: 'cuvsa', status: 'in-game', activity: 'In-game: Donut SMP', lastSeen: '06:27', lastMessage: 'screenshot_f2_14.png', lastTime: '06:27, 19.04', isAttachment: true, unread: 0 },
  { id: 'KingOfHalo04', name: 'KingOfHalo04', nickname: 'KingOfHalo04', status: 'offline', activity: 'Offline', lastSeen: '23:56', lastMessage: 'You: nah, i dont really like pl...', lastTime: '23:56, 17.04', isMine: true, unread: 0 },
  { id: 'zakhbear', name: 'zakhbear', nickname: 'zakhbear', status: 'in-launcher', activity: 'In Launcher', lastSeen: '23:56', lastMessage: 'server is down ig, getting...', lastTime: '23:56, 17.04', unread: 0 }
];

const SEED_GROUPS = [
  { id: 'group-idk', name: 'idk what t...', kind: 'group', members: ['KingOfHalo04', 'masaya46', '3wafyy', 'daaaavidds'], lastMessage: 'KingOfHalo04: Voice..', lastTime: '23:49, yesterday' },
  { id: 'group-dsmp', name: 'DSMP', kind: 'group', members: ['cuvsa', '3wafyy', 'zakhbear', 'meegreyone'], lastMessage: '3wafyy: are we still buildi...', lastTime: '19:53, yesterday' }
];

const SEED_PINNED = ['XerxerBro', '2fishbowl'];

// Seed conversation history for cuvsa matching the mockup
const SEED_CUVSA_MESSAGES = [
  { id: 'c1', senderId: 'cuvsa', senderName: 'cuvsa', content: 'yo, you logging into DSMP tonight?', time: '21:15', date: '18 April' },
  { id: 'c2', senderId: 'cuvsa', senderName: 'cuvsa', content: 'we need to finish the mob farm', time: '21:15', date: '18 April' },
  { id: 'c3', senderId: 'me', senderName: 'You', content: 'nah, too tired today', time: '21:30', date: '18 April' },
  { id: 'c4', senderId: 'me', senderName: 'You', content: 'did you manage to link the storage system?', time: '21:30', date: '18 April' },
  { id: 'c5', senderId: 'cuvsa', senderName: 'cuvsa', content: "almost, just need to craft like 200 more hoppers... I'll send you a pic when the exterior is done", time: '21:32', date: '18 April', reaction: '😊' },
  { id: 'c6', senderId: 'me', senderName: 'You', content: 'bet, good luck', time: '18:48', date: '18 April', reaction: '😏' },
  { id: 'c7-divider', isDivider: true, date: '19 April' },
  { id: 'c8', senderId: 'cuvsa', senderName: 'cuvsa', content: 'bro. look at this.', time: '06:27', date: '19 April' },
  {
    id: 'c9',
    senderId: 'cuvsa',
    senderName: 'cuvsa',
    isMedia: true,
    mediaUrl: defaultLockerBg,
    mediaName: 'screenshot_f2_14.png',
    time: '06:27',
    date: '19 April'
  }
];

// Popular quick reaction stickers/GIFs
const QUICK_GIFS = [
  { label: 'GG', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { label: 'Hype', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
  { label: 'Diamond', url: 'https://media.giphy.com/media/26FfcbCyEGvpDaPS8/giphy.gif' },
  { label: 'Salute', url: 'https://media.giphy.com/media/3o7btXkbsV26U95Uly/giphy.gif' },
  { label: 'Clap', url: 'https://media.giphy.com/media/nbvFVPiEiJH6JOGIok/giphy.gif' },
  { label: 'Dance', url: 'https://media.giphy.com/media/13k4VSc3ngLPUY/giphy.gif' }
];

const EMOJIS = ['😀', '😂', '🔥', '⚔️', '💎', '💀', '⛏️', '🍎', '🛡️', '🍪', '🏹', '👍', '❤️', '🚀', '👀', '😎'];

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(RELAY_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export default function RelayPage({ account, social, onJoinServer, onNotify }) {
  const persisted = useMemo(() => loadPersistedState(), []);

  // Conversations & threads state
  const [pinnedIds, setPinnedIds] = useState(() => persisted?.pinnedIds || SEED_PINNED);
  const [groups, setGroups] = useState(() => persisted?.groups || SEED_GROUPS);
  const [localConversations, setLocalConversations] = useState(() => persisted?.conversations || { cuvsa: SEED_CUVSA_MESSAGES });
  const [selectedId, setSelectedId] = useState(() => persisted?.lastSelectedId || 'cuvsa');

  // Query & input states
  const [inboxQuery, setInboxQuery] = useState('');
  const [messageQuery, setMessageQuery] = useState('');
  const [composerText, setComposerText] = useState('');
  const [stagedFile, setStagedFile] = useState(null); // { name, size, dataUrl, isImage }
  const [collapsed, setCollapsed] = useState({ pinned: false, groups: false, direct: false });

  // UI popovers
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [previewMediaModal, setPreviewMediaModal] = useState(null); // url to view

  // Loading & skeleton simulation
  const [initialLoading, setInitialLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Group creation modal state
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

  const messageStreamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initial load delay to showcase skeleton smoothly
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 320);
    return () => clearTimeout(timer);
  }, []);

  // Synchronize with social.activeChatFriend if set by external click
  useEffect(() => {
    if (social?.activeChatFriend?.id) {
      setSelectedId(social.activeChatFriend.id);
    }
  }, [social?.activeChatFriend?.id]);

  // Persist state to local storage
  useEffect(() => {
    try {
      localStorage.setItem(
        RELAY_STORAGE_KEY,
        JSON.stringify({
          pinnedIds,
          groups,
          conversations: localConversations,
          lastSelectedId: selectedId
        })
      );
    } catch {}
  }, [pinnedIds, groups, localConversations, selectedId]);

  // Auto scroll message stream container to bottom without scrolling parent
  useEffect(() => {
    if (messageStreamRef.current) {
      messageStreamRef.current.scrollTop = messageStreamRef.current.scrollHeight;
    }
  }, [selectedId, localConversations]);

  // Unified Friends List: merges live backend friends from useSocial with seed friends
  const mergedFriends = useMemo(() => {
    const live = social?.friends || [];
    if (live.length === 0) return SEED_FRIENDS;

    // Create lookup map of live friends
    const map = new Map();
    live.forEach((f) => {
      map.set(f.id, {
        id: f.id,
        name: f.name,
        nickname: f.nickname || f.name,
        uuid: f.uuid,
        status: f.status,
        activity: f.activity || (f.status === 'in-game' ? `In-game: ${f.serverAddress || 'Server'}` : f.status === 'online' ? 'In Launcher' : 'Offline'),
        serverAddress: f.serverAddress,
        lastSeen: f.lastSeen ? formatTime(f.lastSeen) : 'Offline',
        lastMessage: f.lastMessageContent || 'No messages yet',
        lastTime: f.lastMessageTime ? formatTime(f.lastMessageTime) : '',
        unread: f.unreadCount || 0,
        isLive: true
      });
    });

    // Ensure seed friends (like cuvsa) are retained if not in live database
    SEED_FRIENDS.forEach((sf) => {
      if (!map.has(sf.id)) {
        map.set(sf.id, sf);
      }
    });

    return Array.from(map.values());
  }, [social?.friends]);

  // All conversational items: groups + friends
  const allThreads = useMemo(() => [...groups, ...mergedFriends], [groups, mergedFriends]);

  // Current active entity: derived dynamically so status/presence NEVER desynchronizes!
  const activeEntity = useMemo(() => {
    return allThreads.find((t) => t.id === selectedId) || allThreads[0] || null;
  }, [allThreads, selectedId]);

  // Unified presence helper: guarantees 100% synchronization between inbox & header
  const getPresence = useCallback((entity) => {
    if (!entity) return { status: 'offline', text: 'Offline', color: '#77717c', isVerified: false };
    if (entity.kind === 'group') {
      const count = entity.members?.length || 2;
      return { status: 'in-launcher', text: `${count} members`, color: '#b05acb', isVerified: false };
    }
    const st = String(entity.status || 'offline').toLowerCase();
    if (st === 'in-game') {
      return {
        status: 'in-game',
        text: entity.activity || (entity.serverAddress ? `In-game: ${entity.serverAddress}` : 'In-game: Donut SMP'),
        color: '#55db72',
        isVerified: true
      };
    }
    if (st === 'online' || st === 'in-launcher' || st === 'in-menus') {
      return {
        status: 'in-launcher',
        text: entity.activity || 'In Launcher',
        color: '#b05acb',
        isVerified: false
      };
    }
    return {
      status: 'offline',
      text: entity.lastSeen ? `Last seen ${entity.lastSeen}` : 'Offline',
      color: '#77717c',
      isVerified: false
    };
  }, []);

  // Filtered threads for inbox search
  const filterList = (list) => {
    if (!inboxQuery.trim()) return list;
    const q = inboxQuery.toLowerCase();
    return list.filter((item) => {
      const name = (item.nickname || item.name || '').toLowerCase();
      const lastMsg = (item.lastMessage || '').toLowerCase();
      return name.includes(q) || lastMsg.includes(q);
    });
  };

  const pinnedList = filterList(allThreads.filter((t) => pinnedIds.includes(t.id)));
  const groupList = filterList(groups.filter((g) => !pinnedIds.includes(g.id)));
  const directList = filterList(mergedFriends.filter((f) => !pinnedIds.includes(f.id)));

  // Current conversation messages
  const currentMessages = useMemo(() => {
    if (!activeEntity?.id) return [];
    // If live social messages exist for this friend, merge them
    if (social?.messages?.length > 0 && social?.activeChatFriend?.id === activeEntity.id) {
      return social.messages.map((m) => ({
        id: String(m.id),
        senderId: m.senderId === account?.id ? 'me' : m.senderId,
        senderName: m.senderId === account?.id ? 'You' : activeEntity.name,
        content: m.content,
        time: formatTime(m.createdAt),
        date: new Date(m.createdAt).toLocaleDateString([], { day: 'numeric', month: 'long' }),
        isMine: m.senderId === account?.id
      }));
    }
    return localConversations[activeEntity.id] || [];
  }, [activeEntity, localConversations, social?.messages, social?.activeChatFriend, account?.id]);

  // Messages filtered by in-conversation search
  const filteredMessages = useMemo(() => {
    if (!messageQuery.trim()) return currentMessages;
    const q = messageQuery.toLowerCase();
    return currentMessages.filter((m) => m.content && String(m.content).toLowerCase().includes(q));
  }, [currentMessages, messageQuery]);

  // Action: Select conversation thread
  const handleSelectThread = (thread) => {
    if (thread.id === selectedId) return;
    setChatLoading(true);
    setSelectedId(thread.id);
    setMessageQuery('');
    setStagedFile(null);
    setShowMenuDropdown(false);
    setShowEmojiPicker(false);
    setShowGifPicker(false);

    if (thread.kind !== 'group' && social?.setActiveChatFriend) {
      social.setActiveChatFriend(thread);
    }
    setTimeout(() => setChatLoading(false), 140);
  };

  // Action: Pin / Unpin conversation
  const handleTogglePin = (id) => {
    setPinnedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
    setShowMenuDropdown(false);
  };

  // Action: Send message / attachment
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = composerText.trim();
    if ((!text && !stagedFile) || sending || !activeEntity) return;

    setSending(true);
    const nowTime = formatTime(Date.now());
    const newMsgs = [];

    // Send text message
    if (text) {
      newMsgs.push({
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: 'me',
        senderName: 'You',
        content: text,
        time: nowTime,
        date: 'Today'
      });
    }

    // Send staged media attachment
    if (stagedFile) {
      newMsgs.push({
        id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: 'me',
        senderName: 'You',
        isMedia: stagedFile.isImage,
        mediaUrl: stagedFile.dataUrl,
        mediaName: stagedFile.name,
        content: stagedFile.isImage ? '' : `📎 ${stagedFile.name}`,
        time: nowTime,
        date: 'Today'
      });
    }

    // Update local conversations
    setLocalConversations((prev) => ({
      ...prev,
      [activeEntity.id]: [...(prev[activeEntity.id] || []), ...newMsgs]
    }));

    // Update lastMessage preview for thread
    const snippet = text || stagedFile?.name || 'Sent attachment';
    if (activeEntity.kind === 'group') {
      setGroups((prev) =>
        prev.map((g) => (g.id === activeEntity.id ? { ...g, lastMessage: `You: ${snippet}`, lastTime: nowTime } : g))
      );
    }

    // Send to live social server if friend is connected
    if (activeEntity.kind !== 'group' && social?.sendMessage && text) {
      try {
        await social.sendMessage(text);
      } catch {}
    }

    setComposerText('');
    setStagedFile(null);
    setSending(false);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
  };

  // Action: Handle file attachment
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      onNotify?.('Attachment too large', 'Files must be under 8MB.');
      return;
    }

    const reader = new FileReader();
    const isImage = file.type.startsWith('image/');
    reader.onload = (event) => {
      setStagedFile({
        name: file.name,
        size: `${Math.round(file.size / 1024)} KB`,
        dataUrl: event.target?.result,
        isImage
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Action: Send quick GIF
  const handleSendGif = (gif) => {
    const nowTime = formatTime(Date.now());
    const newMsg = {
      id: `gif-${Date.now()}`,
      senderId: 'me',
      senderName: 'You',
      isMedia: true,
      mediaUrl: gif.url,
      mediaName: `${gif.label}.gif`,
      time: nowTime,
      date: 'Today'
    };

    setLocalConversations((prev) => ({
      ...prev,
      [activeEntity.id]: [...(prev[activeEntity.id] || []), newMsg]
    }));

    setShowGifPicker(false);
  };

  // Action: Send simulated voice note
  const handleVoiceNote = () => {
    const nowTime = formatTime(Date.now());
    const newMsg = {
      id: `voice-${Date.now()}`,
      senderId: 'me',
      senderName: 'You',
      isVoice: true,
      duration: '0:14',
      time: nowTime,
      date: 'Today'
    };

    setLocalConversations((prev) => ({
      ...prev,
      [activeEntity.id]: [...(prev[activeEntity.id] || []), newMsg]
    }));
    onNotify?.('Voice Note Sent', 'Recorded 0:14 voice memo.');
  };

  // Action: Create new group
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const name = newGroupName.trim().slice(0, 24);
    const members = selectedGroupMembers.length > 0 ? selectedGroupMembers : ['cuvsa', '3wafyy'];
    const newGrp = {
      id: `group-${Date.now()}`,
      name,
      kind: 'group',
      members,
      lastMessage: 'Group created',
      lastTime: formatTime(Date.now())
    };

    setGroups((prev) => [newGrp, ...prev]);
    setSelectedId(newGrp.id);
    setShowNewGroupModal(false);
    setNewGroupName('');
    setSelectedGroupMembers([]);
    onNotify?.('Group Created', `Group "${name}" is ready.`);
  };

  // Component: Composite 2x2 avatars for Groups (matching mockup!)
  const CompositeGroupAvatar = ({ members = [] }) => {
    const displayMembers = members.slice(0, 4);
    return (
      <div className="relay-group-avatar-grid" aria-hidden="true">
        {displayMembers.map((m, idx) => (
          <img
            key={idx}
            src={headUrl(m)}
            alt=""
            className="relay-mini-head"
            onError={(e) => {
              e.currentTarget.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
            }}
          />
        ))}
      </div>
    );
  };

  const activePresence = getPresence(activeEntity);

  return (
    <div className="relay-page" role="main" aria-label="Noctra Relay">
      {/* ----------------- LEFT INBOX PANEL ----------------- */}
      <aside className="relay-inbox">
        {/* Inbox Header */}
        <div className="relay-inbox-header">
          <h1 className="relay-inbox-title">Noctra Relay</h1>
          <div className="relay-inbox-search-bar">
            <Search size={14} className="relay-search-icon" aria-hidden="true" />
            <input
              type="text"
              value={inboxQuery}
              onChange={(e) => setInboxQuery(e.target.value)}
              placeholder="Search inbox..."
              className="relay-inbox-input"
            />
            <button
              type="button"
              className="relay-inbox-btn"
              onClick={() => setShowNewGroupModal(true)}
              title="Create New Group"
              aria-label="Create New Group"
            >
              <Users size={15} />
            </button>
          </div>
        </div>

        {/* Inbox Sections Scroll */}
        <div className="relay-inbox-scroll">
          {initialLoading ? (
            /* Skeleton rows while loading */
            <div className="relay-skeleton-inbox">
              {[1, 2, 3, 4, 5, 6].map((k) => (
                <div key={k} className="relay-skeleton-row">
                  <div className="relay-skeleton-avatar shimmer" />
                  <div className="relay-skeleton-lines">
                    <div className="relay-skeleton-title shimmer" />
                    <div className="relay-skeleton-sub shimmer" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* PINNED SECTION */}
              <section className="relay-section">
                <button
                  type="button"
                  className="relay-section-header"
                  onClick={() => setCollapsed((p) => ({ ...p, pinned: !p.pinned }))}
                >
                  {collapsed.pinned ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  <span>PINNED</span>
                  <i className="relay-section-line" />
                </button>
                {!collapsed.pinned && (
                  <div className="relay-threads-list">
                    {pinnedList.length === 0 ? (
                      <div className="relay-section-empty">No pinned conversations</div>
                    ) : (
                      pinnedList.map((thread) => (
                        <ThreadItem
                          key={thread.id}
                          thread={thread}
                          active={thread.id === selectedId}
                          presence={getPresence(thread)}
                          onClick={() => handleSelectThread(thread)}
                          onTogglePin={() => handleTogglePin(thread.id)}
                        />
                      ))
                    )}
                  </div>
                )}
              </section>

              {/* GROUPS SECTION */}
              <section className="relay-section">
                <button
                  type="button"
                  className="relay-section-header"
                  onClick={() => setCollapsed((p) => ({ ...p, groups: !p.groups }))}
                >
                  {collapsed.groups ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  <span>GROUPS</span>
                  <i className="relay-section-line" />
                </button>
                {!collapsed.groups && (
                  <div className="relay-threads-list">
                    {groupList.length === 0 ? (
                      <div className="relay-section-empty">No groups created</div>
                    ) : (
                      groupList.map((thread) => (
                        <ThreadItem
                          key={thread.id}
                          thread={thread}
                          active={thread.id === selectedId}
                          presence={getPresence(thread)}
                          isGroup
                          onClick={() => handleSelectThread(thread)}
                          onTogglePin={() => handleTogglePin(thread.id)}
                        />
                      ))
                    )}
                  </div>
                )}
              </section>

              {/* DIRECT MESSAGES SECTION */}
              <section className="relay-section">
                <button
                  type="button"
                  className="relay-section-header"
                  onClick={() => setCollapsed((p) => ({ ...p, direct: !p.direct }))}
                >
                  {collapsed.direct ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                  <span>DIRECT MESSAGES</span>
                  <i className="relay-section-line" />
                </button>
                {!collapsed.direct && (
                  <div className="relay-threads-list">
                    {directList.length === 0 ? (
                      <div className="relay-section-empty">No direct messages</div>
                    ) : (
                      directList.map((thread) => (
                        <ThreadItem
                          key={thread.id}
                          thread={thread}
                          active={thread.id === selectedId}
                          presence={getPresence(thread)}
                          onClick={() => handleSelectThread(thread)}
                          onTogglePin={() => handleTogglePin(thread.id)}
                        />
                      ))
                    )}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </aside>

      {/* ----------------- MAIN CONVERSATION PANEL ----------------- */}
      <main className="relay-chat-main">
        {/* Conversation Header */}
        <header className="relay-chat-header">
          {/* Peer Avatar & Status Info */}
          <div className="relay-peer-info">
            <div className="relay-peer-avatar-wrapper">
              {activeEntity?.kind === 'group' ? (
                <div className="relay-peer-group-avatar">
                  <CompositeGroupAvatar members={activeEntity.members} />
                </div>
              ) : (
                <img
                  src={headUrl(activeEntity?.uuid || activeEntity?.name)}
                  alt=""
                  className="relay-peer-avatar"
                  onError={(e) => {
                    e.currentTarget.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
                  }}
                />
              )}
              <span
                className={`relay-peer-presence-dot ${activePresence.status}`}
                style={{ backgroundColor: activePresence.color }}
              />
            </div>

            <div className="relay-peer-meta">
              <div className="relay-peer-name-row">
                <span className="relay-peer-name">{activeEntity?.nickname || activeEntity?.name || 'Select Conversation'}</span>
              </div>
              <div className="relay-peer-status-row">
                <span className={`relay-peer-status-text ${activePresence.status}`}>
                  {activePresence.text}
                </span>
                {activePresence.isVerified && (
                  <BadgeCheck size={13} className="relay-verified-icon" title="Verified Minecraft Server" />
                )}
              </div>
            </div>
          </div>

          {/* In-conversation Search Bar */}
          <div className="relay-convo-search-bar">
            <Search size={14} className="relay-search-icon" aria-hidden="true" />
            <input
              type="text"
              value={messageQuery}
              onChange={(e) => setMessageQuery(e.target.value)}
              placeholder="Search in conversation..."
              className="relay-convo-search-input"
            />
            {messageQuery && (
              <button
                type="button"
                className="relay-search-clear"
                onClick={() => setMessageQuery('')}
                title="Clear filter"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Header Actions (All functional! Favourite/Heart removed) */}
          <div className="relay-header-actions">
            <button
              type="button"
              className={`relay-action-btn ${pinnedIds.includes(activeEntity?.id) ? 'is-active' : ''}`}
              onClick={() => activeEntity && handleTogglePin(activeEntity.id)}
              title={pinnedIds.includes(activeEntity?.id) ? 'Unpin conversation' : 'Pin conversation'}
            >
              <Pin size={16} />
            </button>
            <button
              type="button"
              className="relay-action-btn"
              onClick={() => setShowNewGroupModal(true)}
              title="Create group / Add members"
            >
              <Users size={16} />
            </button>
            <button
              type="button"
              className="relay-action-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Share image or file"
            >
              <ImageIcon size={16} />
            </button>
            <div className="relay-menu-wrapper">
              <button
                type="button"
                className={`relay-action-btn ${showMenuDropdown ? 'is-active' : ''}`}
                onClick={() => setShowMenuDropdown((v) => !v)}
                title="Conversation Options"
              >
                <MoreHorizontal size={17} />
              </button>
              {showMenuDropdown && (
                <div className="relay-dropdown-menu">
                  <button
                    type="button"
                    onClick={() => {
                      if (activeEntity) handleTogglePin(activeEntity.id);
                    }}
                  >
                    <Pin size={13} />
                    <span>{pinnedIds.includes(activeEntity?.id) ? 'Unpin conversation' : 'Pin conversation'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeEntity?.name) {
                        navigator.clipboard?.writeText(activeEntity.name);
                        onNotify?.('Copied', `Copied username ${activeEntity.name}`);
                      }
                      setShowMenuDropdown(false);
                    }}
                  >
                    <Users size={13} />
                    <span>Copy Username</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeEntity?.id) {
                        setLocalConversations((prev) => ({ ...prev, [activeEntity.id]: [] }));
                        onNotify?.('Chat Cleared', 'Conversation history cleared.');
                      }
                      setShowMenuDropdown(false);
                    }}
                  >
                    <X size={13} />
                    <span>Clear chat history</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Message Stream */}
        <div ref={messageStreamRef} className="relay-message-stream">
          {chatLoading ? (
            /* Skeleton chat bubbles */
            <div className="relay-skeleton-chat">
              <div className="relay-skeleton-bubble left shimmer" />
              <div className="relay-skeleton-bubble right shimmer" />
              <div className="relay-skeleton-bubble left shimmer" />
            </div>
          ) : (
            <>
              {filteredMessages.map((msg, index) => {
                if (msg.isDivider) {
                  return (
                    <div key={msg.id || index} className="relay-date-divider">
                      <span className="relay-date-pill">{msg.date}</span>
                    </div>
                  );
                }

                const isMine = msg.senderId === 'me' || msg.isMine;
                return (
                  <div key={msg.id || index} className={`relay-message-row ${isMine ? 'is-outgoing' : 'is-incoming'}`}>
                    {/* In group chats, show other member mini head */}
                    {!isMine && activeEntity?.kind === 'group' && (
                      <img
                        src={headUrl(msg.senderName || msg.senderId)}
                        alt=""
                        className="relay-msg-author-avatar"
                        title={msg.senderName}
                      />
                    )}

                    <div className="relay-message-content-col">
                      {!isMine && activeEntity?.kind === 'group' && (
                        <span className="relay-msg-author-name">{msg.senderName || msg.senderId}</span>
                      )}

                      {/* Text Bubble */}
                      {msg.content && (
                        <div className="relay-message-bubble">
                          <p className="relay-message-text">{msg.content}</p>
                          {msg.reaction && <span className="relay-bubble-reaction">{msg.reaction}</span>}
                        </div>
                      )}

                      {/* Rich Media Card (mockup screenshot card!) */}
                      {msg.isMedia && (
                        <div className="relay-media-card">
                          <div className="relay-media-card-img-wrap" onClick={() => setPreviewMediaModal(msg.mediaUrl)}>
                            <img src={msg.mediaUrl} alt={msg.mediaName} className="relay-media-img" />
                            <div className="relay-media-overlay">
                              <button
                                type="button"
                                className="relay-media-overlay-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewMediaModal(msg.mediaUrl);
                                }}
                                title="Zoom full screen"
                              >
                                <Maximize2 size={13} />
                              </button>
                              <a
                                href={msg.mediaUrl}
                                download={msg.mediaName || 'screenshot.png'}
                                className="relay-media-overlay-btn"
                                onClick={(e) => e.stopPropagation()}
                                title="Download image"
                              >
                                <Download size={13} />
                              </a>
                            </div>
                          </div>
                          <div className="relay-media-meta-row">
                            <span className="relay-media-meta-filename">
                              {msg.time} {msg.mediaName}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Voice Note Card */}
                      {msg.isVoice && (
                        <div className="relay-voice-card">
                          <button type="button" className="relay-voice-play-btn" title="Play Voice Memo">
                            <Play size={13} />
                          </button>
                          <div className="relay-voice-waveform">
                            {[12, 24, 18, 28, 14, 22, 30, 16, 20, 26, 12, 18, 24, 15, 20].map((h, i) => (
                              <span key={i} style={{ height: `${h}px` }} />
                            ))}
                          </div>
                          <span className="relay-voice-duration">{msg.duration}</span>
                        </div>
                      )}

                      {/* Timestamp & Read Receipt */}
                      <div className="relay-msg-meta-row">
                        <span className="relay-msg-time">{msg.time}</span>
                        {isMine && <CheckCheck size={13} className="relay-read-receipt" title="Delivered & read" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Live typing indicator (from mockup: "cuvsa is typing...") */}
              {activeEntity?.id === 'cuvsa' && (
                <div className="relay-typing-indicator">
                  <span>{activeEntity.nickname || activeEntity.name} is typing</span>
                  <span className="relay-typing-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* ----------------- BOTTOM COMPOSER ----------------- */}
        <form className="relay-composer-form" onSubmit={handleSendMessage}>
          {/* Staged file attachment preview bar */}
          {stagedFile && (
            <div className="relay-staged-preview">
              <div className="relay-staged-thumbnail">
                {stagedFile.isImage ? (
                  <img src={stagedFile.dataUrl} alt="preview" />
                ) : (
                  <FileText size={18} className="relay-staged-file-icon" />
                )}
              </div>
              <div className="relay-staged-details">
                <span className="relay-staged-name">{stagedFile.name}</span>
                <span className="relay-staged-size">{stagedFile.size}</span>
              </div>
              <button
                type="button"
                className="relay-staged-remove"
                onClick={() => setStagedFile(null)}
                title="Remove attachment"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Quick GIF popover */}
          {showGifPicker && (
            <div className="relay-quick-popover relay-gif-popover">
              <div className="relay-popover-header">
                <span>Reaction GIFs</span>
                <button type="button" onClick={() => setShowGifPicker(false)}>
                  <X size={13} />
                </button>
              </div>
              <div className="relay-gif-grid">
                {QUICK_GIFS.map((g, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="relay-gif-item"
                    onClick={() => handleSendGif(g)}
                    title={g.label}
                  >
                    <img src={g.url} alt={g.label} loading="lazy" />
                    <span>{g.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Emoji popover */}
          {showEmojiPicker && (
            <div className="relay-quick-popover relay-emoji-popover">
              <div className="relay-popover-header">
                <span>Emojis & Emotes</span>
                <button type="button" onClick={() => setShowEmojiPicker(false)}>
                  <X size={13} />
                </button>
              </div>
              <div className="relay-emoji-grid">
                {EMOJIS.map((em, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="relay-emoji-item"
                    onClick={() => setComposerText((prev) => prev + em)}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.txt,.log,.zip"
            hidden
            onChange={handleFileChange}
          />

          {/* Input container */}
          <div className="relay-composer-container">
            <input
              type="text"
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder={activeEntity ? `Type Message to ${activeEntity.nickname || activeEntity.name}...` : 'Type Message...'}
              className="relay-composer-input"
              maxLength={2500}
            />

            <div className="relay-composer-actions">
              <button
                type="button"
                className={`relay-composer-btn ${showGifPicker ? 'is-active' : ''}`}
                onClick={() => {
                  setShowGifPicker((v) => !v);
                  setShowEmojiPicker(false);
                }}
                title="Reaction GIFs"
              >
                <span className="relay-gif-label">GIF</span>
              </button>

              <button
                type="button"
                className={`relay-composer-btn ${showEmojiPicker ? 'is-active' : ''}`}
                onClick={() => {
                  setShowEmojiPicker((v) => !v);
                  setShowGifPicker(false);
                }}
                title="Add Emoji"
              >
                <Smile size={17} />
              </button>

              <button
                type="button"
                className="relay-composer-btn"
                onClick={handleVoiceNote}
                title="Send Voice Memo"
              >
                <Mic size={17} />
              </button>

              <button
                type="button"
                className="relay-composer-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Attach file or screenshot"
              >
                <Paperclip size={17} />
              </button>

              <button
                type="submit"
                className="relay-send-btn"
                disabled={(!composerText.trim() && !stagedFile) || sending}
                title="Send Message"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* ----------------- GROUP CREATION MODAL ----------------- */}
      {showNewGroupModal && (
        <div className="relay-modal-backdrop" onClick={() => setShowNewGroupModal(false)}>
          <div className="relay-modal" onClick={(e) => e.stopPropagation()}>
            <div className="relay-modal-head">
              <h2>Create Group Chat</h2>
              <button type="button" onClick={() => setShowNewGroupModal(false)}>
                <X size={15} />
              </button>
            </div>

            <div className="relay-modal-body">
              <label className="relay-modal-field">
                <span>Group Name</span>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Bedwars Squad"
                  maxLength={28}
                  autoFocus
                />
              </label>

              <div className="relay-modal-member-section">
                <span>Select Members</span>
                <div className="relay-modal-member-list">
                  {mergedFriends.map((f) => {
                    const isSelected = selectedGroupMembers.includes(f.name);
                    return (
                      <div
                        key={f.id}
                        className={`relay-modal-member-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() =>
                          setSelectedGroupMembers((prev) =>
                            prev.includes(f.name) ? prev.filter((x) => x !== f.name) : [...prev, f.name]
                          )
                        }
                      >
                        <img src={headUrl(f.uuid || f.name)} alt="" />
                        <span className="relay-modal-member-name">{f.nickname || f.name}</span>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="relay-modal-checkbox"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="relay-modal-actions">
              <button
                type="button"
                className="relay-btn-secondary"
                onClick={() => setShowNewGroupModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="relay-btn-primary"
                onClick={handleCreateGroup}
                disabled={!newGroupName.trim()}
              >
                Create Group
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- MEDIA ZOOM MODAL ----------------- */}
      {previewMediaModal && (
        <div className="relay-media-viewer-backdrop" onClick={() => setPreviewMediaModal(null)}>
          <div className="relay-media-viewer" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="relay-media-viewer-close"
              onClick={() => setPreviewMediaModal(null)}
            >
              <X size={20} />
            </button>
            <img src={previewMediaModal} alt="Preview" className="relay-media-viewer-img" />
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Individual Thread Item in Inbox
function ThreadItem({ thread, active, presence, isGroup = false, onClick }) {
  return (
    <button
      type="button"
      className={`relay-thread-item ${active ? 'is-active' : ''}`}
      onClick={onClick}
    >
      {/* Avatar with presence status dot */}
      <div className="relay-thread-avatar-wrapper">
        {isGroup ? (
          <div className="relay-thread-group-avatar">
            {(thread.members || []).slice(0, 4).map((m, i) => (
              <img
                key={i}
                src={headUrl(m)}
                alt=""
                className="relay-mini-head"
                onError={(e) => {
                  e.currentTarget.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
                }}
              />
            ))}
          </div>
        ) : (
          <img
            src={headUrl(thread.uuid || thread.name)}
            alt=""
            className="relay-thread-avatar"
            onError={(e) => {
              e.currentTarget.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
            }}
          />
        )}
        <span
          className={`relay-thread-dot ${presence.status}`}
          style={{ backgroundColor: presence.color }}
        />
        {thread.unread > 0 && (
          <span className="relay-unread-badge">{thread.unread > 9 ? '9+' : thread.unread}</span>
        )}
      </div>

      {/* Content meta */}
      <div className="relay-thread-info">
        <div className="relay-thread-top-row">
          <span className="relay-thread-name">{thread.nickname || thread.name}</span>
          <span className="relay-thread-time">{thread.lastTime || ''}</span>
        </div>
        <div className="relay-thread-bottom-row">
          {thread.isAttachment && <Paperclip size={11} className="relay-snippet-icon" />}
          <span className="relay-thread-snippet">{thread.lastMessage || 'No messages'}</span>
          {thread.isMine && <CheckCheck size={11} className="relay-snippet-checks" />}
        </div>
      </div>
    </button>
  );
}

