import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook for managing Noctra Social (friends, requests, chat, presence).
 */
export function useSocial(activeAccount) {
  const isNoctra = Boolean(
    activeAccount?.type === 'noctra' && (activeAccount?.token || activeAccount?.sessionToken)
  );

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [activeChatFriend, setActiveChatFriendState] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [socialError, setSocialError] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [nicknameModalFriend, setNicknameModalFriend] = useState(null);

  const pollTimerRef = useRef(null);
  const activeFriendIdRef = useRef(null);
  const messageRequestRef = useRef(0);

  const setActiveChatFriend = useCallback((friend) => {
    const nextId = friend?.id || null;
    activeFriendIdRef.current = nextId;
    messageRequestRef.current += 1;
    setMessages([]);
    setLoadingMessages(Boolean(nextId));
    setActiveChatFriendState(friend || null);
  }, []);

  const fetchFriendsAndRequests = useCallback(async () => {
    if (!window.native?.social || !isNoctra) return;
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        window.native.social.getFriends(),
        window.native.social.getRequests()
      ]);
      if (friendsRes?.friends) {
        setFriends(friendsRes.friends);
        setActiveChatFriendState((prev) => {
          if (!prev?.id) return prev;
          const fresh = friendsRes.friends.find((friend) => friend.id === prev.id);
          return fresh ? { ...prev, ...fresh } : prev;
        });
      }
      if (requestsRes?.requests) setRequests(requestsRes.requests);
      setSocialError(null);
    } catch (err) {
      setSocialError(err.message || 'Failed to refresh social state.');
      console.error('[Social] Failed to fetch social state:', err);
    }
  }, [isNoctra]);

  useEffect(() => {
    if (isNoctra) {
      fetchFriendsAndRequests();
      pollTimerRef.current = setInterval(fetchFriendsAndRequests, 3500);
    } else {
      setFriends([]);
      setRequests({ received: [], sent: [] });
      setActiveChatFriend(null);
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isNoctra, fetchFriendsAndRequests, setActiveChatFriend]);

  const fetchMessages = useCallback(async (friendId, showLoading = false) => {
    if (!window.native?.social || !friendId || !isNoctra) return;
    const requestId = ++messageRequestRef.current;
    if (showLoading) setLoadingMessages(true);
    try {
      const res = await window.native.social.getMessages(friendId);
      if (
        requestId === messageRequestRef.current &&
        activeFriendIdRef.current === friendId &&
        res?.ok &&
        Array.isArray(res.messages)
      ) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.error('[Social] Failed to fetch messages:', err);
    } finally {
      if (requestId === messageRequestRef.current) setLoadingMessages(false);
    }
  }, [isNoctra]);

  useEffect(() => {
    const friendId = activeChatFriend?.id;
    activeFriendIdRef.current = friendId || null;
    if (!friendId || !isNoctra) {
      setMessages([]);
      setLoadingMessages(false);
      return undefined;
    }

    fetchMessages(friendId, true);
    const msgTimer = setInterval(() => fetchMessages(friendId, false), 4000);
    return () => clearInterval(msgTimer);
  }, [activeChatFriend?.id, isNoctra, fetchMessages]);

  const sendRequest = async (targetUsername) => {
    if (!window.native?.social) return { ok: false, error: 'Social not available' };
    try {
      const res = await window.native.social.sendRequest(targetUsername);
      if (res?.ok) {
        await fetchFriendsAndRequests();
        return { ok: true, target: res.target };
      }
      return { ok: false, error: res?.error || 'Failed to send request' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const respondRequest = async (requestId, action) => {
    if (!window.native?.social) return undefined;
    try {
      const res = await window.native.social.respondRequest(requestId, action);
      if (res?.ok) await fetchFriendsAndRequests();
      return res;
    } catch (err) {
      console.error('[Social] Error responding to request:', err);
      return { ok: false, error: err.message };
    }
  };

  const sendMessage = async (content, options = {}) => {
    const targetId = options.friendId || activeFriendIdRef.current;
    if (!targetId || !window.native?.social) return { ok: false, error: 'No recipient selected' };

    const text = String(content || '').trim();
    if (!text && !options.mediaUrl) return { ok: false, error: 'Empty message' };

    const createdAt = Date.now();
    const tempId = `optimistic-${createdAt}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic = {
      id: tempId,
      senderId: activeAccount?.id || 'me',
      receiverId: targetId,
      content: text,
      mediaUrl: options.mediaUrl || null,
      mediaName: options.mediaName || null,
      isMedia: options.isMedia ?? Boolean(options.mediaUrl),
      reaction: null,
      isRead: 0,
      createdAt,
      optimistic: true
    };

    if (activeFriendIdRef.current === targetId) {
      setMessages((prev) => [...prev, optimistic]);
    }

    const snippet = text || options.mediaName || 'Sent attachment';
    setFriends((prev) => prev.map((friend) => friend.id === targetId ? {
      ...friend,
      lastMessageContent: snippet,
      lastMessageTime: createdAt,
      lastMessageSenderId: activeAccount?.id || 'me'
    } : friend));

    try {
      const res = await window.native.social.sendMessage(targetId, text, {
        mediaUrl: options.mediaUrl || null,
        mediaName: options.mediaName || null,
        isMedia: options.isMedia ?? Boolean(options.mediaUrl)
      });
      if (res?.ok && res.message) {
        if (activeFriendIdRef.current === targetId) {
          setMessages((prev) => prev.map((message) => message.id === tempId ? res.message : message));
        }
        return { ok: true, message: res.message };
      }
      throw new Error(res?.error || 'Failed to send message');
    } catch (err) {
      setMessages((prev) => prev.filter((message) => message.id !== tempId));
      await fetchFriendsAndRequests();
      return { ok: false, error: err.message };
    }
  };

  const uploadMedia = async (dataUrl, filename) => {
    if (!window.native?.social?.uploadMedia) return { ok: false, error: 'Upload not supported' };
    try {
      return await window.native.social.uploadMedia(dataUrl, filename);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const setMessageReaction = async (messageId, reaction) => {
    if (!window.native?.social?.setMessageReaction || !messageId) {
      return { ok: false, error: 'Reactions are unavailable' };
    }

    let previousReactions = null;
    setMessages((prev) => prev.map((message) => {
      if (message.id !== messageId) return message;
      previousReactions = message.reactions || [];
      // Optimistically we just don't do complex logic here since we don't have our own userId easily accessible
      // We rely on RelayPage local state or the server response for the exact new state.
      return message; 
    }));

    try {
      const res = await window.native.social.setMessageReaction(messageId, reaction);
      if (!res?.ok) throw new Error(res?.error || 'Failed to save reaction');
      setMessages((prev) => prev.map((message) =>
        message.id === messageId ? { ...message, reactions: res.reactions || [] } : message
      ));
      return res;
    } catch (err) {
      setMessages((prev) => prev.map((message) =>
        message.id === messageId ? { ...message, reactions: previousReactions } : message
      ));
      return { ok: false, error: err.message };
    }
  };

  const updateFriend = async (friendId, attributes) => {
    if (!window.native?.social) return undefined;
    try {
      const res = await window.native.social.updateFriend(friendId, attributes);
      if (res?.ok) await fetchFriendsAndRequests();
      return res;
    } catch (err) {
      console.error('[Social] Error updating friend:', err);
      return { ok: false, error: err.message };
    }
  };

  const unfriend = async (friendId) => {
    if (!window.native?.social) return undefined;
    try {
      const res = await window.native.social.unfriend(friendId);
      if (res?.ok) {
        if (activeFriendIdRef.current === friendId) setActiveChatFriend(null);
        await fetchFriendsAndRequests();
      }
      return res;
    } catch (err) {
      console.error('[Social] Error unfriending:', err);
      return { ok: false, error: err.message };
    }
  };

  const block = async (targetId) => {
    if (!window.native?.social) return undefined;
    try {
      const res = await window.native.social.block(targetId);
      if (res?.ok) {
        if (activeFriendIdRef.current === targetId) setActiveChatFriend(null);
        await fetchFriendsAndRequests();
      }
      return res;
    } catch (err) {
      console.error('[Social] Error blocking:', err);
      return { ok: false, error: err.message };
    }
  };

  const searchPlayers = async (query) => {
    setSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearchLoading(true);
    try {
      const res = await window.native.social.searchUsers(query.trim());
      setSearchResults(res?.ok && Array.isArray(res.results) ? res.results : []);
    } catch (err) {
      console.error('[Social] Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const unreadTotal = friends.reduce((sum, friend) => sum + (friend.unreadCount || 0), 0);
  const pendingRequestsTotal = requests.received?.length || 0;

  return {
    isNoctra,
    friends,
    requests,
    activeChatFriend,
    setActiveChatFriend,
    messages,
    loadingMessages,
    searchQuery,
    searchResults,
    searchLoading,
    socialError,
    contextMenu,
    setContextMenu,
    nicknameModalFriend,
    setNicknameModalFriend,
    badgeTotal: unreadTotal + pendingRequestsTotal,
    pendingRequestsTotal,
    unreadTotal,
    refresh: fetchFriendsAndRequests,
    sendRequest,
    respondRequest,
    sendMessage,
    uploadMedia,
    setMessageReaction,
    updateFriend,
    unfriend,
    block,
    searchPlayers
  };
}

export default useSocial;
