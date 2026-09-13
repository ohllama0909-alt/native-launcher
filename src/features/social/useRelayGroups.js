import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Relay group chats: list, live updates, replies, reactions and moderation.
 *
 * Forward every social SSE frame into `handleSocialEvent` (RelayPage already
 * receives them for DMs) and this hook keeps groups, threads, typing and
 * unread counts in sync without extra polling.
 */

const EMPTY_THREAD = Object.freeze({ messages: [], hasMore: false, oldestTime: null });
const THREAD_PAGE_SIZE = 50;
const TYPING_TTL = 6_000;

const relay = () => (typeof window !== 'undefined' ? window.native?.relay : null);
const optimisticId = () => `optimistic-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/** Optimistic twins are replaced by the server row with the same author + body. */
function mergeMessages(existing = [], incoming = []) {
  const byId = new Map();
  for (const message of [...existing, ...incoming]) {
    if (!message?.id) continue;
    if (String(message.id).startsWith('optimistic-')) {
      const confirmed = incoming.find(
        (candidate) =>
          !String(candidate.id).startsWith('optimistic-') &&
          candidate.senderId === message.senderId &&
          (candidate.content || '') === (message.content || '') &&
          Math.abs((candidate.createdAt || 0) - (message.createdAt || 0)) < 60_000
      );
      if (confirmed) continue;
    }
    byId.set(message.id, { ...(byId.get(message.id) || {}), ...message });
  }
  return [...byId.values()].sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
}

export function useRelayGroups({ selfId, selfName } = {}) {
  const [groups, setGroups] = useState([]);
  const [threads, setThreads] = useState({});
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [typingByGroup, setTypingByGroup] = useState({});
  const [readByGroup, setReadByGroup] = useState({});
  const [replyTarget, setReplyTarget] = useState(null);
  const [groupError, setGroupError] = useState(null);

  const activeGroupRef = useRef(null);
  const typingSentAt = useRef(0);
  activeGroupRef.current = activeGroupId;

  const fail = useCallback((result, fallback) => {
    const message = result?.error || fallback;
    setGroupError(message);
    return { ok: false, error: message };
  }, []);

  const refreshGroups = useCallback(async () => {
    const api = relay();
    if (!api) { setLoadingGroups(false); return; }
    const result = await api.getGroups();
    if (result?.ok) {
      setGroups(result.groups || []);
      setGroupError(null);
    } else if (result?.error) {
      setGroupError(result.error);
    }
    setLoadingGroups(false);
  }, []);

  useEffect(() => { refreshGroups(); }, [refreshGroups]);

  const patchGroup = useCallback((group) => {
    if (!group?.id) return;
    setGroups((previous) => {
      const index = previous.findIndex((item) => item.id === group.id);
      if (index === -1) return [group, ...previous];
      const next = [...previous];
      next[index] = { ...next[index], ...group };
      return next;
    });
  }, []);

  const dropGroup = useCallback((groupId) => {
    setGroups((previous) => previous.filter((item) => item.id !== groupId));
    setThreads((previous) => {
      const next = { ...previous };
      delete next[groupId];
      return next;
    });
    setActiveGroupId((current) => (current === groupId ? null : current));
  }, []);

  // ── Threads ────────────────────────────────────────────────────────

  const loadThread = useCallback(async (groupId) => {
    const api = relay();
    if (!api || !groupId) return;
    setLoadingThread(true);
    const result = await api.getGroupMessages(groupId, { limit: THREAD_PAGE_SIZE });
    if (result?.ok) {
      setThreads((previous) => ({
        ...previous,
        [groupId]: {
          messages: mergeMessages(previous[groupId]?.messages, result.messages),
          hasMore: Boolean(result.hasMore),
          oldestTime: result.oldestTime
        }
      }));
      setGroups((previous) => previous.map((item) => (item.id === groupId ? { ...item, unreadCount: 0 } : item)));
    } else if (result?.error) {
      setGroupError(result.error);
    }
    setLoadingThread(false);
  }, []);

  const loadOlder = useCallback(async (groupId) => {
    const api = relay();
    const thread = threads[groupId];
    if (!api || !groupId || !thread?.hasMore || !thread.oldestTime) return;
    const result = await api.getGroupMessages(groupId, {
      limit: THREAD_PAGE_SIZE,
      before: thread.oldestTime,
      markRead: 0
    });
    if (result?.ok) {
      setThreads((previous) => ({
        ...previous,
        [groupId]: {
          messages: mergeMessages(result.messages, previous[groupId]?.messages),
          hasMore: Boolean(result.hasMore),
          oldestTime: result.oldestTime || previous[groupId]?.oldestTime
        }
      }));
    }
  }, [threads]);

  const openGroup = useCallback((groupId) => {
    setActiveGroupId(groupId);
    setReplyTarget(null);
    if (groupId) loadThread(groupId);
  }, [loadThread]);

  // ── Live events ────────────────────────────────────────────────────

  const handleSocialEvent = useCallback((event) => {
    const type = event?.type;
    const data = event?.data ?? event?.payload ?? event ?? {};
    if (!type || !String(type).startsWith('group')) return;

    switch (type) {
      case 'group:created':
      case 'group:updated': {
        patchGroup(data.group);
        break;
      }
      case 'group:deleted':
      case 'group:removed': {
        dropGroup(data.groupId);
        break;
      }
      case 'group:message': {
        const { groupId, message } = data;
        if (!groupId || !message) break;
        setThreads((previous) => {
          if (!previous[groupId] && groupId !== activeGroupRef.current) return previous;
          const thread = previous[groupId] || EMPTY_THREAD;
          return { ...previous, [groupId]: { ...thread, messages: mergeMessages(thread.messages, [message]) } };
        });
        setGroups((previous) => previous.map((item) => {
          if (item.id !== groupId) return item;
          const isActive = groupId === activeGroupRef.current;
          const mine = message.senderId === selfId;
          return {
            ...item,
            lastMessage: {
              id: message.id,
              senderId: message.senderId,
              senderName: message.senderName,
              content: message.content || message.mediaName || 'Sent attachment',
              isMedia: Boolean(message.isMedia),
              isSystem: Boolean(message.isSystem),
              createdAt: message.createdAt
            },
            unreadCount: isActive || mine || message.isSystem ? item.unreadCount : (item.unreadCount || 0) + 1
          };
        }));
        if (groupId === activeGroupRef.current && message.senderId !== selfId) {
          relay()?.markGroupRead(groupId);
        }
        break;
      }
      case 'group:message:updated': {
        const { groupId, message } = data;
        if (!groupId || !message) break;
        setThreads((previous) => {
          const thread = previous[groupId];
          if (!thread) return previous;
          return {
            ...previous,
            [groupId]: { ...thread, messages: thread.messages.map((item) => (item.id === message.id ? message : item)) }
          };
        });
        break;
      }
      case 'group:message:reaction': {
        const { groupId, messageId, reactions } = data;
        setThreads((previous) => {
          const thread = previous[groupId];
          if (!thread) return previous;
          return {
            ...previous,
            [groupId]: {
              ...thread,
              messages: thread.messages.map((item) => (item.id === messageId ? { ...item, reactions: reactions || [] } : item))
            }
          };
        });
        break;
      }
      case 'group:read': {
        const { groupId, readerId, at } = data;
        if (!groupId || !readerId) break;
        if (readerId === selfId) {
          setGroups((previous) => previous.map((item) => (
            item.id === groupId ? { ...item, unreadCount: 0, lastReadAt: at || Date.now() } : item
          )));
          break;
        }
        setReadByGroup((previous) => ({
          ...previous,
          [groupId]: { ...(previous[groupId] || {}), [readerId]: at || Date.now() }
        }));
        break;
      }
      case 'group:typing': {
        const { groupId, userId, isTyping } = data;
        setTypingByGroup((previous) => {
          const room = { ...(previous[groupId] || {}) };
          if (isTyping) room[userId] = Date.now() + TYPING_TTL;
          else delete room[userId];
          return { ...previous, [groupId]: room };
        });
        break;
      }
      default:
        break;
    }
  }, [dropGroup, patchGroup, selfId]);

  // Auto-subscribe when the preload bridge exposes the social event channel.
  useEffect(() => {
    const social = typeof window !== 'undefined' ? window.native?.social : null;
    const subscribe = social?.onEvent || social?.onSocialEvent;
    if (typeof subscribe !== 'function') return undefined;
    return subscribe(handleSocialEvent);
  }, [handleSocialEvent]);

  // Expire stale typing indicators.
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setTypingByGroup((previous) => {
        let changed = false;
        const next = {};
        for (const [groupId, room] of Object.entries(previous)) {
          const fresh = Object.fromEntries(Object.entries(room).filter(([, expiry]) => expiry > now));
          if (Object.keys(fresh).length !== Object.keys(room).length) changed = true;
          next[groupId] = fresh;
        }
        return changed ? next : previous;
      });
    }, 2_000);
    return () => clearInterval(timer);
  }, []);

  // ── Mutations ──────────────────────────────────────────────────────

  const createGroup = useCallback(async ({ name, iconUrl, description, memberIds }) => {
    const api = relay();
    if (!api) return { ok: false, error: 'Relay is unavailable.' };
    const result = await api.createGroup({ name, iconUrl, description, memberIds });
    if (!result?.ok) return fail(result, 'Could not create the group.');
    patchGroup(result.group);
    openGroup(result.group.id);
    return result;
  }, [fail, openGroup, patchGroup]);

  const updateGroup = useCallback(async (groupId, payload) => {
    const result = await relay()?.updateGroup(groupId, payload);
    if (!result?.ok) return fail(result, 'Could not update the group.');
    patchGroup(result.group);
    return result;
  }, [fail, patchGroup]);

  const addMembers = useCallback(async (groupId, userIds) => {
    const result = await relay()?.addMembers(groupId, userIds);
    if (!result?.ok) return fail(result, 'Could not add those members.');
    patchGroup(result.group);
    return result;
  }, [fail, patchGroup]);

  const kickMember = useCallback(async (groupId, userId) => {
    const result = await relay()?.removeMember(groupId, userId);
    if (!result?.ok) return fail(result, 'Could not remove that member.');
    patchGroup(result.group);
    return result;
  }, [fail, patchGroup]);

  const setMemberRole = useCallback(async (groupId, userId, role) => {
    const result = await relay()?.setMemberRole(groupId, userId, role);
    if (!result?.ok) return fail(result, 'Could not change that role.');
    patchGroup(result.group);
    return result;
  }, [fail, patchGroup]);

  const leaveGroup = useCallback(async (groupId) => {
    const result = await relay()?.leaveGroup(groupId);
    if (!result?.ok) return fail(result, 'Could not leave the group.');
    dropGroup(groupId);
    return result;
  }, [dropGroup, fail]);

  const deleteGroup = useCallback(async (groupId) => {
    const result = await relay()?.deleteGroup(groupId);
    if (!result?.ok) return fail(result, 'Could not delete the group.');
    dropGroup(groupId);
    return result;
  }, [dropGroup, fail]);

  const setGroupPrefs = useCallback(async (groupId, prefs) => {
    const result = await relay()?.setGroupPrefs(groupId, prefs);
    if (!result?.ok) return fail(result, 'Could not save your preference.');
    patchGroup(result.group);
    return result;
  }, [fail, patchGroup]);

  const sendGroupMessage = useCallback(async (groupId, content, options = {}) => {
    const api = relay();
    if (!api || !groupId) return { ok: false, error: 'Relay is unavailable.' };

    const reply = options.replyTo ?? replyTarget?.id ?? null;
    const pending = {
      id: optimisticId(),
      groupId,
      senderId: selfId,
      senderName: selfName,
      content: String(content || '').trim(),
      mediaUrl: options.mediaUrl || null,
      mediaName: options.mediaName || null,
      mediaKind: options.mediaKind || null,
      isMedia: Boolean(options.mediaUrl),
      replyTo: reply,
      reply: reply && replyTarget
        ? {
          id: replyTarget.id,
          senderId: replyTarget.senderId,
          senderName: replyTarget.senderName,
          content: replyTarget.content,
          mediaName: replyTarget.mediaName
        }
        : null,
      reactions: [],
      createdAt: Date.now(),
      pending: true
    };

    setThreads((previous) => {
      const thread = previous[groupId] || EMPTY_THREAD;
      return { ...previous, [groupId]: { ...thread, messages: mergeMessages(thread.messages, [pending]) } };
    });
    setReplyTarget(null);

    const result = await api.sendGroupMessage(groupId, { ...options, content, replyTo: reply });
    if (!result?.ok) {
      setThreads((previous) => {
        const thread = previous[groupId];
        if (!thread) return previous;
        return { ...previous, [groupId]: { ...thread, messages: thread.messages.filter((item) => item.id !== pending.id) } };
      });
      return fail(result, 'Message could not be sent.');
    }

    setThreads((previous) => {
      const thread = previous[groupId] || EMPTY_THREAD;
      return {
        ...previous,
        [groupId]: {
          ...thread,
          messages: mergeMessages(thread.messages.filter((item) => item.id !== pending.id), [result.message])
        }
      };
    });
    return result;
  }, [fail, replyTarget, selfId, selfName]);

  /** Same emoji twice removes it, exactly like Discord. */
  const toggleReaction = useCallback(async (groupId, messageId, reaction) => {
    setThreads((previous) => {
      const thread = previous[groupId];
      if (!thread) return previous;
      return {
        ...previous,
        [groupId]: {
          ...thread,
          messages: thread.messages.map((message) => {
            if (message.id !== messageId) return message;
            const existing = message.reactions || [];
            const mine = existing.some((item) => item.userId === selfId && item.reaction === reaction);
            return {
              ...message,
              reactions: mine
                ? existing.filter((item) => !(item.userId === selfId && item.reaction === reaction))
                : [...existing, { userId: selfId, reaction }]
            };
          })
        }
      };
    });

    const result = await relay()?.reactToGroupMessage(messageId, reaction);
    if (!result?.ok) {
      loadThread(groupId);
      return fail(result, 'Could not save that reaction.');
    }
    return result;
  }, [fail, loadThread, selfId]);

  const editGroupMessage = useCallback(async (messageId, content) => {
    const result = await relay()?.editGroupMessage(messageId, content);
    if (!result?.ok) return fail(result, 'Could not edit that message.');
    return result;
  }, [fail]);

  const deleteGroupMessage = useCallback(async (messageId) => {
    const result = await relay()?.deleteGroupMessage(messageId);
    if (!result?.ok) return fail(result, 'Could not delete that message.');
    return result;
  }, [fail]);

  const notifyGroupTyping = useCallback((groupId) => {
    const now = Date.now();
    if (now - typingSentAt.current < 2_500) return;
    typingSentAt.current = now;
    relay()?.setGroupTyping(groupId, true);
  }, []);

  const stopGroupTyping = useCallback((groupId) => {
    typingSentAt.current = 0;
    relay()?.setGroupTyping(groupId, false);
  }, []);

  const activeGroup = useMemo(
    () => groups.find((group) => group.id === activeGroupId) || null,
    [groups, activeGroupId]
  );

  const activeThread = threads[activeGroupId] || EMPTY_THREAD;
  const myRole = activeGroup?.members?.find((member) => member.id === selfId)?.role || activeGroup?.role || 'member';

  const activeReadAt = useMemo(() => {
    const room = readByGroup[activeGroupId] || {};
    return Object.values(room).reduce((latest, at) => (at > latest ? at : latest), 0);
  }, [readByGroup, activeGroupId]);

  const typingNames = useMemo(() => {
    const room = typingByGroup[activeGroupId] || {};
    const now = Date.now();
    return Object.keys(room)
      .filter((userId) => room[userId] > now && userId !== selfId)
      .map((userId) => activeGroup?.members?.find((member) => member.id === userId)?.name)
      .filter(Boolean);
  }, [activeGroup, activeGroupId, selfId, typingByGroup]);

  return {
    groups,
    pinnedGroups: groups.filter((group) => group.pinned),
    loadingGroups,
    groupError,
    clearGroupError: () => setGroupError(null),
    refreshGroups,

    activeGroupId,
    activeGroup,
    openGroup,
    closeGroup: () => setActiveGroupId(null),

    messages: activeThread.messages,
    hasMoreMessages: activeThread.hasMore,
    activeReadAt,
    loadingThread,
    loadThread,
    loadOlder,

    myRole,
    canModerate: myRole === 'owner' || myRole === 'admin',
    isOwner: myRole === 'owner',

    replyTarget,
    setReplyTarget,
    clearReply: () => setReplyTarget(null),

    typingNames,
    notifyGroupTyping,
    stopGroupTyping,

    groupUnreadTotal: groups.reduce((total, group) => total + (group.muted ? 0 : group.unreadCount || 0), 0),

    createGroup,
    updateGroup,
    addMembers,
    kickMember,
    setMemberRole,
    leaveGroup,
    deleteGroup,
    setGroupPrefs,
    sendGroupMessage,
    toggleReaction,
    editGroupMessage,
    deleteGroupMessage,

    handleSocialEvent
  };
}

export default useRelayGroups;
