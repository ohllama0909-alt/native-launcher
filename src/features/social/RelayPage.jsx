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
import RelayAvatar from './RelayAvatar.jsx';
import defaultLockerBg from '../../assets/backgrounds/locker-bg.png';
import './RelayPage.css';

const RELAY_STORAGE_KEY = 'noctra_relay_store_v4';

const formatTime = (stamp) => {
  if (!stamp) return '';
  const date = new Date(stamp);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

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
const REACTION_PALETTE = ['❤️', '😂', '🔥', '👍', '😮', '😢', '🎉', '💀'];

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(RELAY_STORAGE_KEY) || localStorage.getItem('noctra_relay_store_v3');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Purge legacy seeded conversations & demo accounts
    if (parsed?.conversations?.cuvsa) delete parsed.conversations.cuvsa;
    if (parsed?.pinnedIds) {
      parsed.pinnedIds = parsed.pinnedIds.filter((id) => !['XerxerBro', '2fishbowl', 'cuvsa'].includes(id));
    }
    if (parsed?.groups) {
      parsed.groups = parsed.groups.filter((g) => !['group-idk', 'group-dsmp'].includes(g.id));
    }
    return parsed;
  } catch {
    return null;
  }
}

export default function RelayPage({ account, social, onJoinServer, onNotify }) {
  const persisted = useMemo(() => loadPersistedState(), []);

  // Conversations & threads state (Zero seed data: strictly real database & user records)
  const [pinnedIds, setPinnedIds] = useState(() => persisted?.pinnedIds || []);
  const [groups, setGroups] = useState(() => persisted?.groups || []);
  const [localConversations, setLocalConversations] = useState(() => persisted?.conversations || {});
  const [selectedId, setSelectedId] = useState(() => persisted?.lastSelectedId || null);

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
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState(null);
  const [previewMediaModal, setPreviewMediaModal] = useState(null); // url to view

  const [sending, setSending] = useState(false);

  // Group creation modal state
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState([]);

  const messageStreamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Synchronize with social.activeChatFriend if set by external action
  useEffect(() => {
    if (social?.activeChatFriend?.id && social.activeChatFriend.id !== selectedId) {
      setSelectedId(social.activeChatFriend.id);
    }
  }, [social?.activeChatFriend?.id, selectedId]);

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
  }, [selectedId, localConversations, social?.messages]);

  // Unified Friends List: uses live backend friends from useSocial
  const mergedFriends = useMemo(() => {
    const live = social?.friends || [];
    return live.map((f) => {
      // Find the most up-to-date message for snippet from localConversations or live messages
      const liveMsgs = (social?.activeChatFriend?.id === f.id && social?.messages?.length > 0)
        ? social.messages
        : (localConversations[f.id] || []);
      const lastMsg = liveMsgs.length > 0 ? liveMsgs[liveMsgs.length - 1] : null;

      let snippet = f.lastMessageContent || 'No messages yet';
      let isMine = f.lastMessageSenderId === account?.id || f.lastMessageSenderId === 'me';
      let time = f.lastMessageTime ? formatTime(f.lastMessageTime) : '';
      let isAttachment = false;

      if (lastMsg) {
        const isMsgMine = lastMsg.senderId === account?.id || lastMsg.senderId === 'me' || lastMsg.isMine;
        isMine = isMsgMine;
        if (lastMsg.isMedia || lastMsg.mediaUrl) {
          snippet = isMsgMine ? `You: 📷 ${lastMsg.mediaName || 'Photo'}` : `📷 ${lastMsg.mediaName || 'Photo'}`;
          isAttachment = true;
        } else if (lastMsg.mediaName) {
          snippet = isMsgMine ? `You: 📎 ${lastMsg.mediaName}` : `📎 ${lastMsg.mediaName}`;
          isAttachment = true;
        } else if (lastMsg.content) {
          snippet = isMsgMine ? `You: ${lastMsg.content}` : lastMsg.content;
        }
        time = lastMsg.time || formatTime(lastMsg.createdAt);
      } else if (f.lastMessageContent) {
        if (f.lastMessageContent.startsWith('📎 ') || f.lastMessageContent.startsWith('📷 ')) {
          isAttachment = true;
        }
        snippet = isMine ? `You: ${f.lastMessageContent}` : f.lastMessageContent;
      }

      return {
        id: f.id,
        name: f.name,
        nickname: f.nickname || f.name,
        uuid: f.uuid,
        skinUrl: f.skinUrl || null,
        model: f.model || 'classic',
        status: f.status,
        activity: f.activity || (f.status === 'in-game' ? `In-game: ${f.serverAddress || 'Server'}` : f.status === 'online' ? 'In Launcher' : 'Offline'),
        serverAddress: f.serverAddress,
        lastSeen: f.lastSeen ? formatTime(f.lastSeen) : 'Offline',
        lastMessage: snippet,
        lastTime: time,
        isAttachment,
        isMine,
        unread: f.unreadCount || 0,
        isLive: true
      };
    });
  }, [social?.friends, social?.activeChatFriend, social?.messages, localConversations, account?.id]);

  // All conversational items: groups + friends
  const allThreads = useMemo(() => [...groups, ...mergedFriends], [groups, mergedFriends]);

  // Current active entity: derived dynamically so status/presence NEVER desynchronizes!
  const activeEntity = useMemo(() => {
    if (!selectedId && allThreads.length > 0) return allThreads[0];
    return allThreads.find((t) => t.id === selectedId) || allThreads[0] || null;
  }, [allThreads, selectedId]);

  // Auto-select first thread if nothing selected or current selection is invalid
  useEffect(() => {
    if (!selectedId && allThreads.length > 0) {
      setSelectedId(allThreads[0].id);
    } else if (selectedId && !allThreads.some((t) => t.id === selectedId) && allThreads.length > 0) {
      setSelectedId(allThreads[0].id);
    }
  }, [selectedId, allThreads]);

  // Always keep social.activeChatFriend in sync with activeEntity
  useEffect(() => {
    if (activeEntity && activeEntity.kind !== 'group' && social?.setActiveChatFriend) {
      if (social.activeChatFriend?.id !== activeEntity.id) {
        social.setActiveChatFriend(activeEntity);
      }
    }
  }, [activeEntity, social]);

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
        text: entity.activity || (entity.serverAddress ? `In-game: ${entity.serverAddress}` : 'In-game'),
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
      text: entity.lastSeen && entity.lastSeen !== 'Offline' ? `Last seen ${entity.lastSeen}` : 'Offline',
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
    const local = localConversations[activeEntity.id] || [];
    // If live social messages exist for this friend from server:
    if (activeEntity.kind !== 'group' && social?.messages && social?.activeChatFriend?.id === activeEntity.id) {
      const serverList = social.messages.map((m) => {
        const isMine = m.senderId === account?.id || m.senderId === 'me';
        return {
          id: String(m.id),
          senderId: isMine ? 'me' : m.senderId,
          senderName: isMine ? 'You' : (activeEntity.nickname || activeEntity.name),
          content: m.content || '',
          mediaUrl: m.mediaUrl || null,
          mediaName: m.mediaName || null,
          isMedia: Boolean(m.isMedia || m.mediaUrl),
          reaction: m.reaction || null,
          time: formatTime(m.createdAt),
          date: new Date(m.createdAt).toLocaleDateString([], { day: 'numeric', month: 'long' }),
          isMine
        };
      });
      // Keep any optimistic uploading messages in the view
      const pendingUploads = local.filter((m) => m.isUploading);
      return [...serverList, ...pendingUploads];
    }
    return local;
  }, [activeEntity, localConversations, social?.messages, social?.activeChatFriend, account?.id]);

  // Messages filtered by in-conversation search
  const filteredMessages = useMemo(() => {
    if (!messageQuery.trim()) return currentMessages;
    const q = messageQuery.toLowerCase();
    return currentMessages.filter((m) => {
      const textMatch = m.content && String(m.content).toLowerCase().includes(q);
      const mediaMatch = m.mediaName && String(m.mediaName).toLowerCase().includes(q);
      return textMatch || mediaMatch;
    });
  }, [currentMessages, messageQuery]);

  // Action: Select conversation thread
  const handleSelectThread = (thread) => {
    if (thread.id === selectedId) return;
    setSelectedId(thread.id);
    setMessageQuery('');
    setStagedFile(null);
    setShowMenuDropdown(false);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setActiveReactionPickerMsgId(null);

    if (thread.kind !== 'group' && social?.setActiveChatFriend) {
      social.setActiveChatFriend(thread);
    }
  };

  // Action: Pin / Unpin conversation
  const handleTogglePin = (id) => {
    setPinnedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
    setShowMenuDropdown(false);
  };

  // Action: Toggle message reaction
  const handleToggleReaction = async (messageId, reactionEmoji) => {
    if (!messageId || !reactionEmoji) return;
    setActiveReactionPickerMsgId(null);

    // Optimistic update in local state
    setLocalConversations((prev) => {
      const list = prev[activeEntity.id] || [];
      return {
        ...prev,
        [activeEntity.id]: list.map((m) => {
          if (m.id === messageId) {
            return { ...m, reaction: m.reaction === reactionEmoji ? null : reactionEmoji };
          }
          return m;
        })
      };
    });

    if (social?.setMessageReaction) {
      try {
        await social.setMessageReaction(messageId, reactionEmoji);
      } catch {}
    }
  };

  // Action: Send message / high-res attachment with upload progress fill
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = composerText.trim();
    if ((!text && !stagedFile) || sending || !activeEntity) return;

    setSending(true);
    const nowTime = formatTime(Date.now());
    const fileToUpload = stagedFile;
    setComposerText('');
    setStagedFile(null);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setActiveReactionPickerMsgId(null);

    if (fileToUpload) {
      // 1. Staged High-Res Media: Create optimistic message with upload progress
      const tempId = `upload-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        senderId: 'me',
        senderName: 'You',
        content: text,
        mediaUrl: fileToUpload.dataUrl, // preview data URL immediately
        mediaName: fileToUpload.name,
        isMedia: fileToUpload.isImage,
        isUploading: true,
        uploadProgress: 15,
        time: nowTime,
        date: 'Today',
        isMine: true
      };

      setLocalConversations((prev) => ({
        ...prev,
        [activeEntity.id]: [...(prev[activeEntity.id] || []), optimisticMsg]
      }));

      // Simulate smooth progress steps while upload runs
      let prog = 15;
      const progressTimer = setInterval(() => {
        prog = Math.min(92, prog + Math.floor(Math.random() * 20 + 10));
        setLocalConversations((prev) => {
          const list = prev[activeEntity.id] || [];
          return {
            ...prev,
            [activeEntity.id]: list.map((m) => (m.id === tempId ? { ...m, uploadProgress: prog } : m))
          };
        });
      }, 140);

      try {
        let finalMediaUrl = fileToUpload.dataUrl;
        if (social?.uploadMedia) {
          const res = await social.uploadMedia(fileToUpload.dataUrl, fileToUpload.name);
          if (res?.ok && res.url) {
            finalMediaUrl = res.url;
          }
        }

        clearInterval(progressTimer);

        // Transition progress to 100% and update message
        setLocalConversations((prev) => {
          const list = prev[activeEntity.id] || [];
          return {
            ...prev,
            [activeEntity.id]: list.map((m) =>
              m.id === tempId
                ? { ...m, isUploading: false, uploadProgress: 100, mediaUrl: finalMediaUrl }
                : m
            )
          };
        });

        // Send to live social server if friend is connected
        if (activeEntity.kind !== 'group' && social?.sendMessage) {
          await social.sendMessage(text, {
            friendId: activeEntity.id,
            mediaUrl: finalMediaUrl,
            mediaName: fileToUpload.name,
            isMedia: fileToUpload.isImage
          });
        }
      } catch (err) {
        clearInterval(progressTimer);
        setLocalConversations((prev) => {
          const list = prev[activeEntity.id] || [];
          return {
            ...prev,
            [activeEntity.id]: list.map((m) =>
              m.id === tempId ? { ...m, isUploading: false, uploadFailed: true } : m
            )
          };
        });
        onNotify?.('Upload Failed', 'Could not upload attachment to server.');
      }
    } else if (text) {
      // 2. Pure Text Message
      const newMsg = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        senderId: 'me',
        senderName: 'You',
        content: text,
        time: nowTime,
        date: 'Today',
        isMine: true
      };

      setLocalConversations((prev) => ({
        ...prev,
        [activeEntity.id]: [...(prev[activeEntity.id] || []), newMsg]
      }));

      // Update thread snippet for groups
      if (activeEntity.kind === 'group') {
        setGroups((prev) =>
          prev.map((g) => (g.id === activeEntity.id ? { ...g, lastMessage: `You: ${text}`, lastTime: nowTime } : g))
        );
      }

      // Send to live social server
      if (activeEntity.kind !== 'group' && social?.sendMessage) {
        try {
          await social.sendMessage(text, { friendId: activeEntity.id });
        } catch {}
      }
    }

    setSending(false);
  };

  // Action: Handle file attachment selection without low-res downscaling
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      onNotify?.('Attachment too large', 'Files must be under 25MB.');
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
      content: '',
      isMedia: true,
      mediaUrl: gif.url,
      mediaName: `${gif.label}.gif`,
      time: nowTime,
      date: 'Today',
      isMine: true
    };

    setLocalConversations((prev) => ({
      ...prev,
      [activeEntity.id]: [...(prev[activeEntity.id] || []), newMsg]
    }));

    if (activeEntity.kind !== 'group' && social?.sendMessage) {
      social.sendMessage('', {
        friendId: activeEntity.id,
        mediaUrl: gif.url,
        mediaName: `${gif.label}.gif`,
        isMedia: true
      });
    }

    setShowGifPicker(false);
  };

  // Action: Simulated voice note
  const handleVoiceNote = () => {
    const nowTime = formatTime(Date.now());
    const newMsg = {
      id: `voice-${Date.now()}`,
      senderId: 'me',
      senderName: 'You',
      isVoice: true,
      duration: '0:07',
      time: nowTime,
      date: 'Today',
      isMine: true
    };

    setLocalConversations((prev) => ({
      ...prev,
      [activeEntity.id]: [...(prev[activeEntity.id] || []), newMsg]
    }));

    if (activeEntity.kind !== 'group' && social?.sendMessage) {
      social.sendMessage('🎤 Voice memo (0:07)', { friendId: activeEntity.id });
    }
  };

  // Action: Create new group
  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const newGroup = {
      id: `group-${Date.now()}`,
      name: newGroupName.trim(),
      kind: 'group',
      members: selectedGroupMembers.length > 0 ? selectedGroupMembers : [account?.name || 'Player'],
      lastMessage: 'Group created',
      lastTime: formatTime(Date.now())
    };

    setGroups((prev) => [newGroup, ...prev]);
    setSelectedId(newGroup.id);
    setNewGroupName('');
    setSelectedGroupMembers([]);
    setShowNewGroupModal(false);
    onNotify?.('Group Created', `Created "${newGroup.name}" with ${newGroup.members.length} members.`);
  };

  const activePresence = getPresence(activeEntity);

  return (
    <div className="relay-page">
      {/* ----------------- LEFT INBOX PANEL ----------------- */}
      <aside className="relay-inbox">
        {/* Inbox Header */}
        <div className="relay-inbox-header">
          <h2 className="relay-inbox-title">Noctra Relay</h2>
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
          {allThreads.length === 0 ? (
            <div className="relay-empty-inbox">
              <div className="relay-empty-icon">
                <MessageSquare size={22} />
              </div>
              <div className="relay-empty-title">No conversations yet</div>
              <div className="relay-empty-desc">
                Add friends using their Minecraft username or create a group to start chatting!
              </div>
              <button
                type="button"
                className="relay-empty-btn"
                onClick={() => setShowNewGroupModal(true)}
              >
                <Users size={13} />
                <span>Create Group</span>
              </button>
            </div>
          ) : (
            <>
              {/* PINNED SECTION */}
              {pinnedList.length > 0 && (
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
                      {pinnedList.map((thread) => (
                        <ThreadItem
                          key={thread.id}
                          thread={thread}
                          active={thread.id === selectedId}
                          presence={getPresence(thread)}
                          isGroup={thread.kind === 'group'}
                          onClick={() => handleSelectThread(thread)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* GROUPS SECTION */}
              {groups.length > 0 && (
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
                        <div className="relay-section-empty">No matching groups</div>
                      ) : (
                        groupList.map((thread) => (
                          <ThreadItem
                            key={thread.id}
                            thread={thread}
                            active={thread.id === selectedId}
                            presence={getPresence(thread)}
                            isGroup
                            onClick={() => handleSelectThread(thread)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </section>
              )}

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
        {activeEntity ? (
          <>
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
                    <RelayAvatar
                      name={activeEntity?.name}
                      uuid={activeEntity?.uuid}
                      skinUrl={activeEntity?.skinUrl}
                      size={38}
                      className="relay-peer-avatar"
                    />
                  )}
                  <span
                    className={`relay-peer-presence-dot ${activePresence.status}`}
                    style={{ backgroundColor: activePresence.color }}
                  />
                </div>

                <div className="relay-peer-meta">
                  <div className="relay-peer-name-row">
                    <span className="relay-peer-name">{activeEntity?.nickname || activeEntity?.name || 'Chat'}</span>
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

              {/* Header Actions */}
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
                  onClick={() => {
                    if (activeEntity?.kind === 'group') {
                      onNotify?.('Group Members', activeEntity.members?.join(', ') || 'No members listed');
                    } else {
                      onNotify?.('Conversation Details', `Chatting with ${activeEntity.name}`);
                    }
                  }}
                  title="Group & Chat Info"
                >
                  <Users size={16} />
                </button>
                <button
                  type="button"
                  className="relay-action-btn"
                  onClick={() => {
                    const mediaMsgs = currentMessages.filter((m) => m.mediaUrl);
                    if (mediaMsgs.length > 0) {
                      setPreviewMediaModal(mediaMsgs[mediaMsgs.length - 1].mediaUrl);
                    } else {
                      onNotify?.('No Media', 'No shared media files in this conversation yet.');
                    }
                  }}
                  title="Shared Media"
                >
                  <ImageIcon size={16} />
                </button>

                {/* More Menu Dropdown */}
                <div className="relay-menu-wrapper">
                  <button
                    type="button"
                    className={`relay-action-btn ${showMenuDropdown ? 'is-active' : ''}`}
                    onClick={() => setShowMenuDropdown((v) => !v)}
                    title="More actions"
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  {showMenuDropdown && (
                    <div className="relay-dropdown-menu">
                      <button
                        type="button"
                        onClick={() => {
                          if (activeEntity?.id) handleTogglePin(activeEntity.id);
                          setShowMenuDropdown(false);
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
                            onNotify?.('Chat Cleared', 'Local chat messages cleared.');
                          }
                          setShowMenuDropdown(false);
                        }}
                      >
                        <X size={13} />
                        <span>Clear local history</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* Message Stream */}
            <div ref={messageStreamRef} className="relay-message-stream">
              {filteredMessages.length === 0 ? (
                <div className="relay-empty-stream">
                  <div className="relay-empty-stream-avatar">
                    <RelayAvatar
                      name={activeEntity?.name}
                      uuid={activeEntity?.uuid}
                      skinUrl={activeEntity?.skinUrl}
                      size={52}
                    />
                  </div>
                  <h3 className="relay-empty-stream-name">{activeEntity?.nickname || activeEntity?.name}</h3>
                  <p className="relay-empty-stream-text">
                    This is the beginning of your direct conversation history.
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg, index) => {
                  if (msg.isDivider) {
                    return (
                      <div key={msg.id || index} className="relay-date-divider">
                        <span className="relay-date-pill">{msg.date}</span>
                      </div>
                    );
                  }

                  const isMine = msg.senderId === 'me' || msg.isMine;
                  const isPickerOpen = activeReactionPickerMsgId === msg.id;

                  return (
                    <div
                      key={msg.id || index}
                      className={`relay-message-row ${isMine ? 'is-outgoing' : 'is-incoming'}`}
                    >
                      {/* In group chats, show other member mini head */}
                      {!isMine && activeEntity?.kind === 'group' && (
                        <RelayAvatar
                          name={msg.senderName || msg.senderId}
                          size={26}
                          className="relay-msg-author-avatar"
                        />
                      )}

                      <div className="relay-message-content-col">
                        {!isMine && activeEntity?.kind === 'group' && (
                          <span className="relay-msg-author-name">{msg.senderName || msg.senderId}</span>
                        )}

                        {/* Hover Reaction Trigger */}
                        <button
                          type="button"
                          className="relay-msg-react-trigger"
                          onClick={() => setActiveReactionPickerMsgId(isPickerOpen ? null : msg.id)}
                          title="Add reaction"
                        >
                          <Smile size={13} />
                        </button>

                        {/* Reaction Emoji Bar Popover */}
                        {isPickerOpen && (
                          <div className="relay-msg-reaction-picker">
                            {REACTION_PALETTE.map((em, eIdx) => (
                              <button
                                key={eIdx}
                                type="button"
                                className="relay-msg-reaction-btn"
                                onClick={() => handleToggleReaction(msg.id, em)}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Text Bubble */}
                        {msg.content && (
                          <div className="relay-message-bubble">
                            <p className="relay-message-text">{msg.content}</p>
                          </div>
                        )}

                        {/* Rich Media Card (Full Resolution, no downscaling!) */}
                        {msg.isMedia && (
                          <div className={`relay-media-card ${msg.isUploading ? 'is-uploading' : ''}`}>
                            <div
                              className="relay-media-card-img-wrap"
                              onClick={() => !msg.isUploading && setPreviewMediaModal(msg.mediaUrl)}
                            >
                              <img
                                src={msg.mediaUrl}
                                alt={msg.mediaName || 'Attachment'}
                                className={`relay-media-img ${msg.isUploading ? 'blur-preview' : ''}`}
                              />

                              {/* Upload Loading Progress Fill Overlay */}
                              {msg.isUploading ? (
                                <div className="relay-upload-fill-overlay">
                                  <div
                                    className="relay-upload-spinner-ring"
                                    style={{
                                      background: `conic-gradient(var(--brand, #7c3aed) ${msg.uploadProgress || 15}%, rgba(255, 255, 255, 0.12) 0)`
                                    }}
                                  >
                                    <div className="relay-upload-spinner-inner">
                                      <span>{msg.uploadProgress || 15}%</span>
                                    </div>
                                  </div>
                                  <span className="relay-upload-status-text">Uploading high-res image...</span>
                                </div>
                              ) : (
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
                                    download={msg.mediaName || 'image.png'}
                                    className="relay-media-overlay-btn"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Download original image"
                                  >
                                    <Download size={13} />
                                  </a>
                                </div>
                              )}
                            </div>
                            <div className="relay-media-meta-row">
                              <span className="relay-media-meta-filename">
                                {msg.time} {msg.mediaName || 'Image'}
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

                        {/* Reaction Badge */}
                        {msg.reaction && (
                          <button
                            type="button"
                            className="relay-msg-reaction-badge"
                            onClick={() => handleToggleReaction(msg.id, msg.reaction)}
                            title="Click to remove or toggle reaction"
                          >
                            <span>{msg.reaction}</span>
                            <span>1</span>
                          </button>
                        )}

                        {/* Timestamp & Read Receipt */}
                        <div className="relay-msg-meta-row">
                          <span className="relay-msg-time">{msg.time}</span>
                          {isMine && <CheckCheck size={13} className="relay-read-receipt" title="Delivered & read" />}
                        </div>
                      </div>
                    </div>
                  );
                })
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

              {/* Hidden file input (full original resolution preserved) */}
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
                  placeholder={
                    activeEntity
                      ? `Type Message to ${activeEntity.nickname || activeEntity.name}...`
                      : 'Type Message...'
                  }
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
                    title="Attach full resolution file or image"
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
          </>
        ) : (
          <div className="relay-empty-chat">
            <div className="relay-empty-icon">
              <MessageSquare size={28} />
            </div>
            <h3 className="relay-empty-title">No conversation selected</h3>
            <p className="relay-empty-desc">
              Choose a friend from the left panel or create a new group to start messaging.
            </p>
          </div>
        )}
      </main>

      {/* ----------------- MODALS ----------------- */}

      {/* Create New Group Modal */}
      {showNewGroupModal && (
        <div className="relay-modal-backdrop" onClick={() => setShowNewGroupModal(false)}>
          <div className="relay-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="relay-modal-header">
              <h3>Create New Group</h3>
              <button type="button" onClick={() => setShowNewGroupModal(false)}>
                <X size={15} />
              </button>
            </div>
            <form onSubmit={handleCreateGroup} className="relay-modal-body">
              <label className="relay-modal-label">
                Group Name
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g. Bedwars Squad"
                  className="relay-modal-input"
                  required
                />
              </label>

              <div className="relay-modal-label">
                Select Members
                <div className="relay-members-checklist">
                  {mergedFriends.length === 0 ? (
                    <div className="relay-modal-empty-members">No friends available to add yet.</div>
                  ) : (
                    mergedFriends.map((f) => {
                      const isChecked = selectedGroupMembers.includes(f.name);
                      return (
                        <label key={f.id} className="relay-member-check-row">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              setSelectedGroupMembers((prev) =>
                                isChecked ? prev.filter((m) => m !== f.name) : [...prev, f.name]
                              );
                            }}
                          />
                          <RelayAvatar name={f.name} uuid={f.uuid} skinUrl={f.skinUrl} size={24} />
                          <span className="relay-check-name">{f.nickname || f.name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="relay-modal-footer">
                <button
                  type="button"
                  className="relay-modal-cancel"
                  onClick={() => setShowNewGroupModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="relay-modal-submit">
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full-Screen Media Lightbox Modal */}
      {previewMediaModal && (
        <div className="relay-lightbox-backdrop" onClick={() => setPreviewMediaModal(null)}>
          <div className="relay-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="relay-lightbox-close"
              onClick={() => setPreviewMediaModal(null)}
              title="Close (Esc)"
            >
              <X size={18} />
            </button>
            <img src={previewMediaModal} alt="Preview" className="relay-lightbox-img" />
            <div className="relay-lightbox-toolbar">
              <a
                href={previewMediaModal}
                download="screenshot.png"
                className="relay-lightbox-btn"
                title="Download original image"
              >
                <Download size={15} />
                <span>Download High-Res</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: 2x2 Composite Avatar for Groups
function CompositeGroupAvatar({ members = [] }) {
  const displayMembers = members.slice(0, 4);
  return (
    <div className="relay-composite-avatar">
      {displayMembers.map((m, i) => (
        <RelayAvatar key={i} name={m} size={18} className="relay-mini-head" />
      ))}
      {displayMembers.length < 4 && (
        <span className="relay-mini-placeholder" />
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
            <CompositeGroupAvatar members={thread.members} />
          </div>
        ) : (
          <RelayAvatar
            name={thread.name}
            uuid={thread.uuid}
            skinUrl={thread.skinUrl}
            size={38}
            className="relay-thread-avatar"
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
