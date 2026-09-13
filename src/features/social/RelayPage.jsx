import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  CheckCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  Maximize2,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Paperclip,
  Pin,
  Plus,
  Search,
  Send,
  Smile,
  Users,
  X
} from 'lucide-react';
import RelayAvatar from './RelayAvatar.jsx';
import useRelayGroups from './useRelayGroups.js';
import GroupCreateModal from './GroupCreateModal.jsx';
import GroupSettingsModal from './GroupSettingsModal.jsx';
import ReplyQuote, { ReplyComposerBar } from './ReplyPreview.jsx';
import './RelayPage.css';
import './relay-groups.css';

const RELAY_STORAGE_KEY = 'noctra_relay_store_v4';
const MESSAGE_MAX = 2000;

const formatTime = (stamp) => {
  if (!stamp) return '';
  const date = new Date(stamp);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
};

const dayKeyOf = (stamp) => {
  const date = new Date(stamp || Date.now());
  if (isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const dayLabelOf = (stamp) => {
  const date = new Date(stamp || Date.now());
  if (isNaN(date.getTime())) return '';
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKeyOf(date.getTime()) === dayKeyOf(today.getTime())) return 'Today';
  if (dayKeyOf(date.getTime()) === dayKeyOf(yesterday.getTime())) return 'Yesterday';
  return date.toLocaleDateString([], { day: 'numeric', month: 'long' });
};

// Popular quick reaction GIFs
const QUICK_GIFS = [
  { label: 'GG', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { label: 'Hype', url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif' },
  { label: 'Diamond', url: 'https://media.giphy.com/media/26FfcbCyEGvpDaPS8/giphy.gif' },
  { label: 'Salute', url: 'https://media.giphy.com/media/3o7btXkbsV26U95Uly/giphy.gif' },
  { label: 'Clap', url: 'https://media.giphy.com/media/nbvFVPiEiJH6JOGIok/giphy.gif' },
  { label: 'Dance', url: 'https://media.giphy.com/media/13k4VSc3ngLPUY/giphy.gif' }
];

const EMOJIS = ['\u{1F600}', '\u{1F602}', '\u{1F525}', '\u2694\uFE0F', '\u{1F48E}', '\u{1F480}', '\u26CF\uFE0F', '\u{1F34E}', '\u{1F6E1}\uFE0F', '\u{1F36A}', '\u{1F3F9}', '\u{1F44D}', '\u2764\uFE0F', '\u{1F680}', '\u{1F440}', '\u{1F60E}'];
const REACTION_PALETTE = ['\u2764\uFE0F', '\u{1F602}', '\u{1F525}', '\u{1F44D}', '\u{1F62E}', '\u{1F622}', '\u{1F389}', '\u{1F480}'];

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
  const selfId = social?.selfId || account?.id || null;

  const relayGroups = useRelayGroups({ selfId, selfName: account?.name || 'You' });
  const [createOpen, setCreateOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Conversations & threads state (no seed data: strictly real database & user records)
  const [pinnedIds, setPinnedIds] = useState(() => persisted?.pinnedIds || []);
  const [localConversations, setLocalConversations] = useState(() => persisted?.conversations || {});
  const [selectedId, setSelectedId] = useState(() => persisted?.lastSelectedId || null);

  // Query & input states
  const [inboxQuery, setInboxQuery] = useState('');
  const [messageQuery, setMessageQuery] = useState('');
  const [composerText, setComposerText] = useState('');
  const [stagedFile, setStagedFile] = useState(null);
  const [collapsed, setCollapsed] = useState({ pinned: false, groups: false, direct: false });

  // UI popovers
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [activeReactionPickerMsgId, setActiveReactionPickerMsgId] = useState(null);
  const [previewMediaModal, setPreviewMediaModal] = useState(null);

  const [sending, setSending] = useState(false);
  const [recordingVoice, setRecordingVoice] = useState(false);

  const messageStreamRef = useRef(null);
  const fileInputRef = useRef(null);
  const atBottomRef = useRef(true);

  // Synchronize social SSE events to relay groups
  useEffect(() => {
    return social?.subscribe?.((event) => relayGroups.handleSocialEvent(event));
  }, [social, relayGroups]);

  // Synchronize with social.activeChatFriend if set by an external action
  useEffect(() => {
    if (social?.activeChatFriend?.id && social.activeChatFriend.id !== selectedId) {
      setSelectedId(social.activeChatFriend.id);
    }
  }, [social?.activeChatFriend?.id, selectedId]);

  // Persist pins and local drafts (the server owns real messages)
  useEffect(() => {
    try {
      localStorage.setItem(
        RELAY_STORAGE_KEY,
        JSON.stringify({
          pinnedIds,
          conversations: localConversations,
          lastSelectedId: selectedId
        })
      );
    } catch {}
  }, [pinnedIds, localConversations, selectedId]);

  // Escape closes the lightbox
  useEffect(() => {
    if (!previewMediaModal) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setPreviewMediaModal(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewMediaModal]);

  // Unified friends list: live backend friends + live conversation previews
  const mergedFriends = useMemo(() => {
    const live = social?.friends || [];
    const conversations = social?.conversations || {};

    return live.map((f) => {
      const thread = conversations[f.id];
      const lastMsg = thread?.messages?.length ? thread.messages[thread.messages.length - 1] : null;

      let snippet = 'No messages yet';
      let isMine = f.lastMessageSenderId === selfId;
      let time = f.lastMessageTime ? formatTime(f.lastMessageTime) : '';
      let isAttachment = Boolean(f.lastMessageIsMedia);
      let lastIsRead = false;
      let lastPending = false;
      let lastFailed = false;

      if (lastMsg) {
        isMine = lastMsg.senderId === selfId;
        const label = lastMsg.mediaName || 'Attachment';
        if (lastMsg.isMedia || lastMsg.mediaUrl) {
          snippet = isMine ? `You: ${label}` : label;
          isAttachment = true;
        } else {
          snippet = isMine ? `You: ${lastMsg.content || ''}` : (lastMsg.content || '');
        }
        time = formatTime(lastMsg.createdAt);
        lastIsRead = Boolean(lastMsg.isRead);
        lastPending = Boolean(lastMsg.pending);
        lastFailed = Boolean(lastMsg.failed);
      } else if (f.lastMessageContent) {
        snippet = isMine ? `You: ${f.lastMessageContent}` : f.lastMessageContent;
      }

      const status = String(f.status || 'offline').toLowerCase();

      return {
        id: f.id,
        name: f.name,
        nickname: f.nickname || f.name,
        uuid: f.uuid,
        skinUrl: f.skinUrl || null,
        model: f.model || 'classic',
        status,
        isVerified: false,
        activity:
          f.activity ||
          (status === 'in-game'
            ? `In-game: ${f.serverAddress || 'Server'}`
            : status === 'offline'
              ? 'Offline'
              : 'In Launcher'),
        serverAddress: f.serverAddress,
        lastSeen: f.lastSeen ? formatTime(f.lastSeen) : 'Offline',
        lastMessage: snippet,
        lastTime: time,
        lastStamp: lastMsg?.createdAt || f.lastMessageTime || 0,
        isAttachment,
        isMine,
        lastIsRead,
        lastPending,
        lastFailed,
        isTyping: Boolean(social?.typingBy?.[f.id]),
        unread: f.unreadCount || 0
      };
    });
  }, [social?.friends, social?.conversations, social?.typingBy, selfId]);

  // Formatted groups from useRelayGroups
  const formattedGroups = useMemo(() => {
    return (relayGroups.groups || []).map((g) => {
      let snippet = 'No messages yet';
      if (g.lastMessage) {
        if (g.lastMessage.isSystem) {
          snippet = g.lastMessage.content;
        } else {
          const isMine = g.lastMessage.senderId === selfId;
          snippet = isMine
            ? `You: ${g.lastMessage.content || 'Sent attachment'}`
            : `${g.lastMessage.senderName || 'Member'}: ${g.lastMessage.content || 'Sent attachment'}`;
        }
      } else {
        const count = g.memberCount || g.members?.length || 0;
        snippet = `${count} members`;
      }

      return {
        ...g,
        kind: 'group',
        isGroup: true,
        nickname: g.name,
        lastStamp: g.lastMessage?.createdAt || g.createdAt || 0,
        lastTime: formatTime(g.lastMessage?.createdAt || g.createdAt),
        lastMessage: snippet,
        unread: g.muted ? 0 : (g.unreadCount || 0)
      };
    });
  }, [relayGroups.groups, selfId]);

  // All conversational items: groups + friends, most recent first
  const allThreads = useMemo(() => {
    const dms = [...mergedFriends].sort((a, b) => (b.lastStamp || 0) - (a.lastStamp || 0));
    return [...formattedGroups, ...dms];
  }, [formattedGroups, mergedFriends]);

  // Active entity derived dynamically so presence never desynchronizes
  const activeEntity = useMemo(() => {
    if (!selectedId && allThreads.length > 0) return allThreads[0];
    return allThreads.find((t) => t.id === selectedId) || allThreads[0] || null;
  }, [allThreads, selectedId]);

  const isGroupThread = activeEntity?.kind === 'group';

  // Auto-select the first thread if nothing valid is selected
  useEffect(() => {
    if (!selectedId && allThreads.length > 0) {
      setSelectedId(allThreads[0].id);
    } else if (selectedId && !allThreads.some((t) => t.id === selectedId) && allThreads.length > 0) {
      setSelectedId(allThreads[0].id);
    }
  }, [selectedId, allThreads]);

  // Sync open group with activeEntity
  useEffect(() => {
    if (activeEntity?.kind === 'group') {
      if (relayGroups.activeGroupId !== activeEntity.id) {
        relayGroups.openGroup(activeEntity.id);
      }
    }
  }, [activeEntity?.id, activeEntity?.kind, relayGroups]);

  // Keep the hook's active conversation in sync (drives read receipts & unread reset)
  const setActiveChatFriend = social?.setActiveChatFriend;
  useEffect(() => {
    if (!setActiveChatFriend) return;
    if (activeEntity && activeEntity.kind !== 'group') {
      if (social?.activeChatId !== activeEntity.id) setActiveChatFriend(activeEntity);
    } else if (social?.activeChatId) {
      setActiveChatFriend(null);
    }
  }, [activeEntity, social?.activeChatId, setActiveChatFriend]);

  // Always make sure the open conversation has its history fetched.
  const loadThread = social?.loadThread;
  useEffect(() => {
    if (!loadThread || !activeEntity || activeEntity.kind === 'group') return;
    loadThread(activeEntity.id);
  }, [loadThread, activeEntity?.id]);

  // Unified presence helper: guarantees inbox & header stay in sync
  const getPresence = useCallback((entity) => {
    if (!entity) return { status: 'offline', text: 'Offline', color: 'var(--fg-muted, #77717c)', isVerified: false };
    if (entity.kind === 'group') {
      const count = entity.memberCount || entity.members?.length || 0;
      return { status: 'in-launcher', text: `${count} members`, color: 'var(--brand, #b05acb)', isVerified: false };
    }
    if (entity.isTyping) {
      return { status: 'in-launcher', text: 'typing...', color: 'var(--brand, #b05acb)', isVerified: false };
    }
    const st = String(entity.status || 'offline').toLowerCase();
    if (st === 'in-game') {
      return {
        status: 'in-game',
        text: entity.activity || (entity.serverAddress ? `In-game: ${entity.serverAddress}` : 'In-game'),
        color: 'var(--online, #55db72)',
        isVerified: false
      };
    }
    if (st === 'online' || st === 'in-launcher' || st === 'in-menus') {
      return {
        status: 'in-launcher',
        text: entity.activity || 'In Launcher',
        color: 'var(--brand, #b05acb)',
        isVerified: false
      };
    }
    return {
      status: 'offline',
      text: entity.lastSeen && entity.lastSeen !== 'Offline' ? `Last seen ${entity.lastSeen}` : 'Offline',
      color: 'var(--fg-muted, #77717c)',
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

  const isPinned = useCallback((t) => Boolean(t?.pinned || (t?.id && pinnedIds.includes(t.id))), [pinnedIds]);
  const pinnedList = filterList(allThreads.filter(isPinned));
  const groupList = filterList(formattedGroups.filter((g) => !isPinned(g)));
  const directList = filterList(allThreads.filter((t) => t.kind !== 'group' && !isPinned(t)));

  // Current conversation messages, straight from the per-thread server cache.
  const currentMessages = useMemo(() => {
    if (!activeEntity?.id) return [];
    if (isGroupThread) {
      return (relayGroups.messages || []).map((m) => {
        const isMine = m.senderId === selfId || m.senderId === 'me';
        return {
          ...m,
          id: String(m.id),
          senderId: isMine ? 'me' : m.senderId,
          senderName: isMine ? 'You' : (m.senderName || 'Member'),
          time: formatTime(m.createdAt),
          isMine
        };
      });
    }

    const local = localConversations[activeEntity.id] || [];
    const thread = social?.conversations?.[activeEntity.id];
    const serverList = (thread?.messages || []).map((m) => {
      const isMine = m.senderId === selfId;
      return {
        id: String(m.id),
        senderId: isMine ? 'me' : m.senderId,
        senderName: isMine ? 'You' : (activeEntity.nickname || activeEntity.name),
        content: m.content || '',
        mediaUrl: m.mediaUrl || null,
        mediaName: m.mediaName || null,
        isMedia: Boolean((m.isMedia || m.mediaUrl) && m.mediaKind !== 'audio'),
        isVoice: m.mediaKind === 'audio',
        duration: m.mediaKind === 'audio' ? (m.content || '') : null,
        reactions: Array.isArray(m.reactions) ? m.reactions : [],
        reply: m.reply || null,
        isRead: Boolean(m.isRead),
        pending: Boolean(m.pending),
        failed: Boolean(m.failed),
        createdAt: m.createdAt,
        time: formatTime(m.createdAt),
        isMine
      };
    });

    // Keep optimistic uploads visible until the server echo arrives
    const pendingUploads = local.filter((m) => m.isUploading || m.uploadFailed);
    return [...serverList, ...pendingUploads];
  }, [activeEntity, isGroupThread, localConversations, social?.conversations, selfId, relayGroups.messages]);

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

  // Insert day dividers between messages
  const renderedItems = useMemo(() => {
    const items = [];
    let lastKey = null;
    filteredMessages.forEach((msg, index) => {
      const key = dayKeyOf(msg.createdAt);
      if (key !== lastKey) {
        items.push({ isDivider: true, id: `divider-${key}-${index}`, date: dayLabelOf(msg.createdAt) });
        lastKey = key;
      }
      items.push(msg);
    });
    return items;
  }, [filteredMessages]);

  const isTypingHere = Boolean(!isGroupThread && activeEntity && social?.typingBy?.[activeEntity.id]);

  // Auto scroll to the newest message when already pinned to the bottom
  useEffect(() => {
    const node = messageStreamRef.current;
    if (!node) return;
    if (atBottomRef.current) node.scrollTop = node.scrollHeight;
  }, [renderedItems.length, isTypingHere]);

  // Jump to the bottom whenever the conversation changes
  useEffect(() => {
    atBottomRef.current = true;
    const node = messageStreamRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [activeEntity?.id]);

  // Track scroll position; load older history when scrolled to the top
  const handleStreamScroll = (e) => {
    const node = e.currentTarget;
    atBottomRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 60;
    if (node.scrollTop < 48 && activeEntity?.id) {
      if (isGroupThread) {
        if (!relayGroups.loadingThread && relayGroups.hasMoreMessages) {
          relayGroups.loadOlder(activeEntity.id);
        }
      } else {
        const thread = social?.conversations?.[activeEntity.id];
        if (!thread?.loading && (thread?.hasMore || !thread?.loaded)) social?.loadOlder?.(activeEntity.id);
      }
    }
  };

  // Action: select conversation thread
  const handleSelectThread = (thread) => {
    if (thread.id === selectedId) return;
    setSelectedId(thread.id);
    setMessageQuery('');
    setStagedFile(null);
    setShowMenuDropdown(false);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setActiveReactionPickerMsgId(null);
    relayGroups.clearReply();

    if (thread.kind === 'group') {
      social?.setActiveChatFriend?.(null);
      relayGroups.openGroup(thread.id);
    } else {
      social?.setActiveChatFriend?.(thread);
      relayGroups.closeGroup();
    }
  };

  // Action: pin / unpin conversation
  const handleTogglePin = async (id) => {
    if (activeEntity?.kind === 'group' && activeEntity?.id === id) {
      const isCurrentlyPinned = Boolean(activeEntity.pinned);
      await relayGroups.setGroupPrefs(id, { pinned: !isCurrentlyPinned });
    } else {
      setPinnedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]));
    }
    setShowMenuDropdown(false);
  };

  // Action: toggle message reaction (server-backed for DMs & groups)
  const handleToggleReaction = async (messageId, reactionEmoji) => {
    if (!messageId || !reactionEmoji || !activeEntity) return;
    setActiveReactionPickerMsgId(null);

    if (isGroupThread) {
      await relayGroups.toggleReaction(activeEntity.id, messageId, reactionEmoji);
      return;
    }

    if (String(messageId).startsWith('upload-')) return;

    try {
      await social?.setMessageReaction?.(messageId, reactionEmoji);
    } catch {}
  };

  // Composer typing -> realtime typing indicator for the peer
  const handleComposerChange = (e) => {
    setComposerText(e.target.value);
    if (isGroupThread && activeEntity?.id) {
      relayGroups.notifyGroupTyping(activeEntity.id);
    } else if (!isGroupThread && activeEntity?.id && e.target.value) {
      social?.notifyTyping?.(activeEntity.id);
    }
  };

  // Action: send message / full-resolution attachment
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = composerText.trim().slice(0, MESSAGE_MAX);
    if ((!text && !stagedFile) || sending || !activeEntity) return;

    setSending(true);
    const nowTime = formatTime(Date.now());
    const fileToUpload = stagedFile;
    const replyTarget = relayGroups.replyTarget;
    setComposerText('');
    setStagedFile(null);
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    setActiveReactionPickerMsgId(null);
    relayGroups.clearReply();
    atBottomRef.current = true;

    if (isGroupThread && activeEntity.id) {
      relayGroups.stopGroupTyping(activeEntity.id);
    } else if (!isGroupThread && activeEntity.id) {
      social?.stopTyping?.(activeEntity.id);
    }

    if (fileToUpload) {
      const tempId = `upload-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        senderId: 'me',
        senderName: 'You',
        content: text,
        mediaUrl: fileToUpload.dataUrl,
        mediaName: fileToUpload.name,
        isMedia: fileToUpload.isImage,
        isUploading: true,
        createdAt: Date.now(),
        time: nowTime,
        isMine: true
      };

      setLocalConversations((prev) => ({
        ...prev,
        [activeEntity.id]: [...(prev[activeEntity.id] || []), optimisticMsg]
      }));

      try {
        const res = await social?.uploadMedia?.(fileToUpload.dataUrl, fileToUpload.name);
        if (!res?.ok || !res.url) throw new Error(res?.error || 'Upload failed');
        const finalMediaUrl = res.url;

        if (isGroupThread) {
          await relayGroups.sendGroupMessage(activeEntity.id, text, {
            mediaUrl: finalMediaUrl,
            mediaName: fileToUpload.name,
            mediaKind: fileToUpload.isImage ? 'image' : 'file',
            isMedia: fileToUpload.isImage,
            replyTo: replyTarget?.id || null
          });
          setLocalConversations((prev) => ({
            ...prev,
            [activeEntity.id]: (prev[activeEntity.id] || []).filter((m) => m.id !== tempId)
          }));
        } else {
          if (replyTarget?.id && window.native?.relay?.sendDirectMessage) {
            await window.native.relay.sendDirectMessage(activeEntity.id, {
              content: text,
              mediaUrl: finalMediaUrl,
              mediaName: fileToUpload.name,
              mediaKind: fileToUpload.isImage ? 'image' : 'file',
              isMedia: fileToUpload.isImage,
              replyTo: replyTarget.id
            });
          } else {
            await social?.sendMessage?.(activeEntity.id, text, {
              mediaUrl: finalMediaUrl,
              mediaName: fileToUpload.name,
              mediaKind: fileToUpload.isImage ? 'image' : 'file',
              isMedia: fileToUpload.isImage,
              replyTo: replyTarget?.id || null
            });
          }
          setLocalConversations((prev) => ({
            ...prev,
            [activeEntity.id]: (prev[activeEntity.id] || []).filter((m) => m.id !== tempId)
          }));
        }
      } catch {
        setLocalConversations((prev) => ({
          ...prev,
          [activeEntity.id]: (prev[activeEntity.id] || []).map((m) =>
            m.id === tempId ? { ...m, isUploading: false, uploadFailed: true } : m
          )
        }));
        onNotify?.('Upload failed', 'Could not upload the attachment to the server.');
      }
    } else if (text) {
      if (isGroupThread) {
        const res = await relayGroups.sendGroupMessage(activeEntity.id, text, {
          replyTo: replyTarget?.id || null
        });
        if (res && res.ok === false && res.error) onNotify?.('Message failed', res.error);
      } else {
        if (replyTarget?.id && window.native?.relay?.sendDirectMessage) {
          const res = await window.native.relay.sendDirectMessage(activeEntity.id, {
            content: text,
            replyTo: replyTarget.id
          });
          if (res && res.ok === false && res.error) onNotify?.('Message failed', res.error);
        } else {
          const res = await social?.sendMessage?.(activeEntity.id, text, {
            replyTo: replyTarget?.id || null
          });
          if (res && res.ok === false && res.error) onNotify?.('Message failed', res.error);
        }
      }
    }

    setSending(false);
  };

  // Action: stage an attachment without downscaling it
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      onNotify?.('Attachment too large', 'Files must be under 25MB.');
      e.target.value = '';
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

  // Action: send quick GIF
  const handleSendGif = async (gif) => {
    setShowGifPicker(false);
    if (!activeEntity) return;
    atBottomRef.current = true;
    const replyTarget = relayGroups.replyTarget;
    relayGroups.clearReply();

    if (isGroupThread) {
      await relayGroups.sendGroupMessage(activeEntity.id, '', {
        mediaUrl: gif.url,
        mediaName: `${gif.label}.gif`,
        mediaKind: 'image',
        isMedia: true,
        replyTo: replyTarget?.id || null
      });
      return;
    }

    if (replyTarget?.id && window.native?.relay?.sendDirectMessage) {
      await window.native.relay.sendDirectMessage(activeEntity.id, {
        content: '',
        mediaUrl: gif.url,
        mediaName: `${gif.label}.gif`,
        mediaKind: 'image',
        isMedia: true,
        replyTo: replyTarget.id
      });
    } else {
      await social?.sendMessage?.(activeEntity.id, '', {
        mediaUrl: gif.url,
        mediaName: `${gif.label}.gif`,
        mediaKind: 'image',
        isMedia: true,
        replyTo: replyTarget?.id || null
      });
    }
  };

  // Action: record a short voice note and send it as real audio media
  const handleVoiceNote = async () => {
    if (!activeEntity) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      onNotify?.('Microphone unavailable', 'No recording device is available on this system.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      const startedAt = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        const upload = await social?.uploadMedia?.(dataUrl, `voice-${startedAt}.webm`);
        if (!upload?.ok || !upload.url) {
          onNotify?.('Voice note failed', 'Could not upload the recording.');
          setRecordingVoice(false);
          return;
        }

        if (isGroupThread) {
          await relayGroups.sendGroupMessage(activeEntity.id, `0:${String(seconds).padStart(2, '0')}`, {
            mediaUrl: upload.url,
            mediaName: `voice-${startedAt}.webm`,
            mediaKind: 'audio',
            isMedia: true
          });
        } else {
          await social?.sendMessage?.(activeEntity.id, `0:${String(seconds).padStart(2, '0')}`, {
            mediaUrl: upload.url,
            mediaName: `voice-${startedAt}.webm`,
            mediaKind: 'audio',
            isMedia: true
          });
        }
        setRecordingVoice(false);
      };

      setRecordingVoice(true);
      recorder.start();
      setTimeout(() => {
        if (recorder.state !== 'inactive') recorder.stop();
      }, 7000);
    } catch {
      setRecordingVoice(false);
      onNotify?.('Microphone blocked', 'Allow microphone access to send voice notes.');
    }
  };

  const scrollToMessage = useCallback((targetId) => {
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('relay-msg-highlight');
      setTimeout(() => el.classList.remove('relay-msg-highlight'), 2000);
    }
  }, []);

  const activePresence = getPresence(activeEntity);
  const activeThreadState = !isGroupThread && activeEntity ? social?.conversations?.[activeEntity.id] : null;
  const isLoadingThread = isGroupThread
    ? Boolean(relayGroups.loadingThread)
    : Boolean(activeThreadState?.loading) || Boolean(activeEntity && !activeThreadState?.loaded);

  if (social && social.isNoctra === false) {
    return (
      <div className="relay-page relay-page-gate">
        <div className="relay-empty-chat">
          <div className="relay-empty-icon">
            <MessageSquare size={28} />
          </div>
          <h3 className="relay-empty-title">Noctra account required</h3>
          <p className="relay-empty-desc">
            Sign in with your Noctra account to use Relay messaging, friends and presence.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relay-page">
      {/* ----------------- LEFT INBOX PANEL ----------------- */}
      <aside className="relay-inbox">
        <div className="relay-inbox-header">
          <div className="relay-inbox-title-row">
            <h2 className="relay-inbox-title">Noctra Relay</h2>
            <span
              className={`relay-live-dot ${social?.isRealtime ? 'is-live' : ''}`}
              title={social?.isRealtime ? 'Realtime connected' : `Realtime ${social?.streamStatus || 'offline'}`}
            />
          </div>
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
              onClick={() => setCreateOpen(true)}
              title="Create New Group"
              aria-label="Create New Group"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        <div className="relay-inbox-scroll">
          {allThreads.length === 0 ? (
            <div className="relay-empty-inbox">
              <div className="relay-empty-icon">
                <MessageSquare size={22} />
              </div>
              <div className="relay-empty-title">No conversations yet</div>
              <div className="relay-empty-desc">
                Add friends using their Minecraft username or create a group to start chatting.
              </div>
              <button type="button" className="relay-empty-btn" onClick={() => setCreateOpen(true)}>
                <Plus size={13} />
                <span>Create Group</span>
              </button>
            </div>
          ) : (
            <>
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
                          active={thread.id === activeEntity?.id}
                          presence={getPresence(thread)}
                          isGroup={thread.kind === 'group'}
                          onClick={() => handleSelectThread(thread)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {formattedGroups.length > 0 && (
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
                            active={thread.id === activeEntity?.id}
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
                          active={thread.id === activeEntity?.id}
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
            <header className="relay-chat-header">
              <div
                className="relay-peer-info"
                onClick={() => isGroupThread && setSettingsOpen(true)}
                style={isGroupThread ? { cursor: 'pointer' } : undefined}
                title={isGroupThread ? 'Group settings & members' : undefined}
              >
                <div className="relay-peer-avatar-wrapper">
                  {isGroupThread ? (
                    activeEntity.iconUrl ? (
                      <span className="relay-group-avatar" style={{ width: 38, height: 38, borderRadius: 8 }}>
                        <img src={activeEntity.iconUrl} alt="" />
                      </span>
                    ) : (
                      <div className="relay-peer-group-avatar">
                        <CompositeGroupAvatar members={activeEntity.members} />
                      </div>
                    )
                  ) : (
                    <RelayAvatar
                      name={activeEntity?.name}
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
                    <span className={`relay-peer-status-text ${activePresence.status}`}>{activePresence.text}</span>
                    {activeEntity?.serverAddress && !isGroupThread && (
                      <button
                        type="button"
                        className="relay-join-inline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onJoinServer?.(activeEntity);
                        }}
                        title={`Join ${activeEntity.serverAddress}`}
                      >
                        Join
                      </button>
                    )}
                  </div>
                </div>
              </div>

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
                  <button type="button" className="relay-search-clear" onClick={() => setMessageQuery('')} title="Clear filter">
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="relay-header-actions">
                {isGroupThread && (
                  <button
                    type="button"
                    className="relay-action-btn"
                    onClick={() => setSettingsOpen(true)}
                    title="Group settings & members"
                  >
                    <Users size={16} />
                  </button>
                )}

                <button
                  type="button"
                  className={`relay-action-btn ${isPinned(activeEntity) ? 'is-active' : ''}`}
                  onClick={() => activeEntity && handleTogglePin(activeEntity.id)}
                  title={isPinned(activeEntity) ? 'Unpin conversation' : 'Pin conversation'}
                >
                  <Pin size={16} />
                </button>

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
                        <span>{isPinned(activeEntity) ? 'Unpin conversation' : 'Pin conversation'}</span>
                      </button>
                      {isGroupThread && (
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsOpen(true);
                            setShowMenuDropdown(false);
                          }}
                        >
                          <Users size={13} />
                          <span>Group settings</span>
                        </button>
                      )}
                      {!isGroupThread && (
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
                      )}
                      {!isGroupThread && (
                        <button
                          type="button"
                          onClick={() => {
                            social?.setNicknameModalFriend?.(activeEntity);
                            setShowMenuDropdown(false);
                          }}
                        >
                          <FileText size={13} />
                          <span>Set nickname</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (activeEntity?.id) {
                            setLocalConversations((prev) => ({ ...prev, [activeEntity.id]: [] }));
                            onNotify?.('Chat cleared', 'Local drafts and uploads cleared for this chat.');
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

            <div ref={messageStreamRef} className="relay-message-stream" onScroll={handleStreamScroll}>
              {isLoadingThread && <div className="relay-stream-loader">Loading messages...</div>}

              {renderedItems.length === 0 ? (
                isLoadingThread ? null : (
                  <div className="relay-empty-stream">
                    <div className="relay-empty-stream-avatar">
                      <RelayAvatar name={activeEntity?.name} skinUrl={activeEntity?.skinUrl} size={52} />
                    </div>
                    <h3 className="relay-empty-stream-name">{activeEntity?.nickname || activeEntity?.name}</h3>
                    <p className="relay-empty-stream-text">
                      This is the beginning of your conversation history.
                    </p>
                  </div>
                )
              ) : (
                renderedItems.map((msg, index) => {
                  if (msg.isDivider) {
                    return (
                      <div key={msg.id} className="relay-date-divider">
                        <span className="relay-date-pill">{msg.date}</span>
                      </div>
                    );
                  }

                  if (msg.isSystem) {
                    return (
                      <div key={msg.id || index} id={`msg-${msg.id}`} className="relay-system-message">
                        {msg.content}
                      </div>
                    );
                  }

                  const isMine = msg.senderId === 'me' || msg.isMine;
                  const isPickerOpen = activeReactionPickerMsgId === msg.id;
                  const reactionGroups = Array.isArray(msg.reactions)
                    ? msg.reactions.reduce((acc, r) => {
                      acc[r.reaction] = (acc[r.reaction] || 0) + 1;
                      return acc;
                    }, {})
                    : {};

                  return (
                    <div
                      key={msg.id || index}
                      id={`msg-${msg.id}`}
                      className={`relay-message-row ${isMine ? 'is-outgoing' : 'is-incoming'} ${msg.pending ? 'is-pending' : ''} ${msg.failed || msg.uploadFailed ? 'is-failed' : ''}`}
                    >
                      {!isMine && isGroupThread && (
                        <RelayAvatar name={msg.senderName || msg.senderId} size={26} className="relay-msg-author-avatar" />
                      )}

                      <div className="relay-message-content-col">
                        {!isMine && isGroupThread && (
                          <span className="relay-msg-author-name">{msg.senderName || msg.senderId}</span>
                        )}

                        <div className="relay-msg-actions-hover">
                          <button
                            type="button"
                            className="relay-msg-react-trigger"
                            onClick={() => setActiveReactionPickerMsgId(isPickerOpen ? null : msg.id)}
                            title="Add reaction"
                          >
                            <Smile size={14} />
                          </button>
                          <button
                            type="button"
                            className="relay-msg-react-trigger relay-msg-reply-trigger"
                            onClick={() => relayGroups.setReplyTarget(msg)}
                            title="Reply to message"
                          >
                            <MessageSquare size={13} />
                          </button>
                        </div>

                        {isPickerOpen && (
                          <div className="relay-msg-reaction-picker">
                            {REACTION_PALETTE.map((em) => (
                              <button
                                key={em}
                                type="button"
                                className="relay-msg-reaction-btn"
                                onClick={() => {
                                  handleToggleReaction(msg.id, em);
                                  setActiveReactionPickerMsgId(null);
                                }}
                              >
                                {em}
                              </button>
                            ))}
                          </div>
                        )}

                        {msg.reply && (
                          <ReplyQuote reply={msg.reply} selfId={selfId} onJump={scrollToMessage} />
                        )}

                        {msg.content && !msg.isVoice && !msg.isMedia && (
                          <div className="relay-message-bubble">
                            <p className="relay-message-text">{msg.content}</p>
                          </div>
                        )}

                        {msg.isMedia && msg.mediaUrl && (
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

                              {msg.isUploading ? (
                                <div className="relay-upload-fill-overlay">
                                  <div className="relay-upload-spinner-ring">
                                    <div className="relay-upload-spinner-inner" />
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
                            {msg.content && (
                              <div className="relay-media-caption">
                                <p className="relay-message-text">{msg.content}</p>
                              </div>
                            )}
                            <div className="relay-media-meta-row">
                              <span className="relay-media-meta-filename">
                                {msg.time} {msg.mediaName || 'Image'}
                              </span>
                              {msg.uploadFailed && <span className="relay-media-failed">Upload failed</span>}
                            </div>
                          </div>
                        )}

                        {!msg.isMedia && !msg.isVoice && msg.mediaUrl && (
                          <a className="relay-file-card" href={msg.mediaUrl} download={msg.mediaName || 'attachment'}>
                            <FileText size={16} />
                            <span className="relay-file-name">{msg.mediaName || 'Attachment'}</span>
                            <Download size={13} />
                          </a>
                        )}

                        {msg.isVoice && msg.mediaUrl && (
                          <div className="relay-voice-card">
                            <audio className="relay-voice-audio" controls src={msg.mediaUrl} preload="none" />
                            <span className="relay-voice-duration">{msg.duration || ''}</span>
                          </div>
                        )}

                        {Object.keys(reactionGroups).length > 0 && (
                          <div className="relay-msg-reactions-row">
                            {Object.entries(reactionGroups).map(([emoji, count]) => {
                              const mine = msg.reactions.some(
                                (r) => r.reaction === emoji && (r.userId === selfId || r.userId === 'me')
                              );
                              return (
                                <button
                                  key={emoji}
                                  type="button"
                                  className={`relay-msg-reaction-badge ${mine ? 'is-mine' : ''}`}
                                  onClick={() => handleToggleReaction(msg.id, emoji)}
                                  title="Click to toggle reaction"
                                >
                                  <span>{emoji}</span>
                                  <span>{count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <div className="relay-msg-meta-row">
                          <span className="relay-msg-time">{msg.time}</span>
                          {isMine && !msg.pending && !msg.failed && (
                            msg.isRead ? (
                              <CheckCheck size={13} className="relay-read-receipt is-read" title="Read" />
                            ) : (
                              <Check size={13} className="relay-read-receipt" title="Delivered" />
                            )
                          )}
                          {isMine && msg.pending && <span className="relay-msg-state">Sending...</span>}
                          {isMine && msg.failed && <span className="relay-msg-state is-failed">Failed</span>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {isTypingHere && (
                <div className="relay-typing-indicator">
                  <span className="relay-typing-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>{activeEntity.nickname || activeEntity.name} is typing</span>
                </div>
              )}
              {isGroupThread && relayGroups.typingNames?.length > 0 && (
                <div className="relay-typing-indicator">
                  <span className="relay-typing-dots">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>
                    {relayGroups.typingNames.length === 1
                      ? `${relayGroups.typingNames[0]} is typing`
                      : `${relayGroups.typingNames.slice(0, 2).join(', ')} are typing`}
                  </span>
                </div>
              )}
            </div>

            {/* ----------------- BOTTOM COMPOSER ----------------- */}
            <form className="relay-composer-form" onSubmit={handleSendMessage}>
              <ReplyComposerBar target={relayGroups.replyTarget} selfId={selfId} onCancel={relayGroups.clearReply} />
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

              {showGifPicker && (
                <div className="relay-quick-popover relay-gif-popover">
                  <div className="relay-popover-header">
                    <span>Reaction GIFs</span>
                    <button type="button" onClick={() => setShowGifPicker(false)}>
                      <X size={13} />
                    </button>
                  </div>
                  <div className="relay-gif-grid">
                    {QUICK_GIFS.map((g) => (
                      <button key={g.label} type="button" className="relay-gif-item" onClick={() => handleSendGif(g)} title={g.label}>
                        <img src={g.url} alt={g.label} loading="lazy" />
                        <span>{g.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {showEmojiPicker && (
                <div className="relay-quick-popover relay-emoji-popover">
                  <div className="relay-popover-header">
                    <span>Emojis & Emotes</span>
                    <button type="button" onClick={() => setShowEmojiPicker(false)}>
                      <X size={13} />
                    </button>
                  </div>
                  <div className="relay-emoji-grid">
                    {EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        className="relay-emoji-item"
                        onClick={() => setComposerText((prev) => (prev + em).slice(0, MESSAGE_MAX))}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <input ref={fileInputRef} type="file" accept="image/*,.txt,.log,.zip" hidden onChange={handleFileChange} />

              <div className="relay-composer-container">
                <input
                  type="text"
                  value={composerText}
                  onChange={handleComposerChange}
                  onBlur={() => {
                    if (isGroupThread && activeEntity?.id) relayGroups.stopGroupTyping(activeEntity.id);
                    else if (!isGroupThread && activeEntity?.id) social?.stopTyping?.(activeEntity.id);
                  }}
                  placeholder={
                    activeEntity
                      ? `Type Message to ${activeEntity.nickname || activeEntity.name}...`
                      : 'Type Message...'
                  }
                  className="relay-composer-input"
                  maxLength={MESSAGE_MAX}
                />

                {composerText.length > MESSAGE_MAX - 200 && (
                  <span className="relay-composer-counter">{MESSAGE_MAX - composerText.length}</span>
                )}

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
                    className={`relay-composer-btn ${recordingVoice ? 'is-recording' : ''}`}
                    onClick={handleVoiceNote}
                    disabled={recordingVoice}
                    title={recordingVoice ? 'Recording voice note...' : 'Send Voice Memo'}
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
      <GroupCreateModal
        open={createOpen}
        friends={social?.friends || []}
        uploadMedia={social?.uploadMedia}
        onClose={() => setCreateOpen(false)}
        onCreate={async (payload) => {
          const res = await relayGroups.createGroup(payload);
          if (res?.ok && res.group?.id) {
            setSelectedId(res.group.id);
            relayGroups.openGroup(res.group.id);
            setCreateOpen(false);
          }
          return res;
        }}
      />

      <GroupSettingsModal
        open={settingsOpen}
        group={relayGroups.activeGroup}
        selfId={selfId}
        friends={social?.friends || []}
        uploadMedia={social?.uploadMedia}
        onClose={() => setSettingsOpen(false)}
        onUpdateGroup={relayGroups.updateGroup}
        onAddMembers={relayGroups.addMembers}
        onKickMember={relayGroups.kickMember}
        onSetMemberRole={relayGroups.setMemberRole}
        onLeaveGroup={async (id) => {
          const res = await relayGroups.leaveGroup(id);
          if (res?.ok) setSettingsOpen(false);
          return res;
        }}
        onDeleteGroup={async (id) => {
          const res = await relayGroups.deleteGroup(id);
          if (res?.ok) setSettingsOpen(false);
          return res;
        }}
      />

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
      {displayMembers.map((m, i) => {
        const name = typeof m === 'string' ? m : (m?.name || m?.nickname || 'Player');
        return <RelayAvatar key={`${name}-${i}`} name={name} size={15} className="relay-mini-head" />;
      })}
      {displayMembers.length < 4 && <span className="relay-mini-placeholder" />}
    </div>
  );
}

// Subcomponent: Individual Thread Item in Inbox
function ThreadItem({ thread, active, presence, isGroup = false, onClick }) {
  return (
    <button type="button" className={`relay-thread-item ${active ? 'is-active' : ''}`} onClick={onClick}>
      <div className="relay-thread-avatar-wrapper">
        {isGroup ? (
          thread.iconUrl ? (
            <span className="relay-group-avatar" style={{ width: 34, height: 34, borderRadius: 8 }}>
              <img src={thread.iconUrl} alt="" />
            </span>
          ) : (
            <div className="relay-thread-group-avatar">
              <CompositeGroupAvatar members={thread.members} />
            </div>
          )
        ) : (
          <RelayAvatar name={thread.name} skinUrl={thread.skinUrl} size={34} className="relay-thread-avatar" />
        )}
        <span className={`relay-thread-dot ${presence.status}`} style={{ backgroundColor: presence.color }} />
        {thread.unread > 0 && (
          <span className="relay-unread-badge">{thread.unread > 9 ? '9+' : thread.unread}</span>
        )}
      </div>

      <div className="relay-thread-info">
        <div className="relay-thread-top-row">
          <span className="relay-thread-name">{thread.nickname || thread.name}</span>
          <span className="relay-thread-time">{thread.lastTime || ''}</span>
        </div>
        <div className="relay-thread-bottom-row">
          {thread.isTyping ? (
            <span className="relay-thread-snippet is-typing">typing...</span>
          ) : (
            <>
              {thread.isAttachment && <Paperclip size={11} className="relay-snippet-icon" />}
              <span className="relay-thread-snippet">{thread.lastMessage || 'No messages'}</span>
              {/* Same receipt states as the chat stream: one tick delivered, two ticks read. */}
              {thread.isMine && !thread.lastPending && !thread.lastFailed && (
                thread.lastIsRead ? (
                  <CheckCheck size={11} className="relay-snippet-checks is-read" title="Read" />
                ) : (
                  <Check size={11} className="relay-snippet-checks" title="Delivered" />
                )
              )}
            </>
          )}
        </div>
      </div>
    </button>
  );
}
