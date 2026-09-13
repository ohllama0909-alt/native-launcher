import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for managing Noctra Social (friends, requests, chat, presence).
 */
export function useSocial(activeAccount) {
  const isNoctra = Boolean(
    activeAccount?.type === 'noctra' && (activeAccount?.token || activeAccount?.sessionToken)
  );

  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [activeChatFriend, setActiveChatFriend] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [socialError, setSocialError] = useState(null);

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null); // { x, y, friend }
  // Nickname modal state
  const [nicknameModalFriend, setNicknameModalFriend] = useState(null);

  const pollTimerRef = useRef(null);

  const fetchFriendsAndRequests = useCallback(async () => {
    if (!window.native?.social || !isNoctra) {
      return;
    }
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        window.native.social.getFriends(),
        window.native.social.getRequests()
      ]);
      if (friendsRes?.friends) {
        setFriends(friendsRes.friends);
        setActiveChatFriend(prev => {
          if (!prev?.id) return prev;
          const fresh = friendsRes.friends.find(f => f.id === prev.id);
          return fresh ? { ...prev, ...fresh } : prev;
        });
      }
      if (requestsRes?.requests) {
        setRequests(requestsRes.requests);
      }
    } catch (err) {
      console.error('[Social] Failed to fetch social state:', err);
    }
  }, [isNoctra]);

  // Initial fetch and fast 3.5s periodic polling for real-time presence
  useEffect(() => {
    if (isNoctra) {
      fetchFriendsAndRequests();
      pollTimerRef.current = setInterval(fetchFriendsAndRequests, 3500);
    } else {
      setFriends([]);
      setRequests({ received: [], sent: [] });
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [isNoctra, fetchFriendsAndRequests]);

  // Message history for active chat
  const fetchMessages = useCallback(async (friendId) => {
    if (!window.native?.social || !friendId || !isNoctra) return;
    setLoadingMessages(true);
    try {
      const res = await window.native.social.getMessages(friendId);
      if (res?.ok && Array.isArray(res.messages)) {
        setMessages(res.messages);
      }
    } catch (err) {
      console.error('[Social] Failed to fetch messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [isNoctra]);

  // Poll messages when active chat friend is open
  useEffect(() => {
    if (!activeChatFriend?.id || !isNoctra) {
      setMessages([]);
      return;
    }
    fetchMessages(activeChatFriend.id);
    const msgTimer = setInterval(() => {
      fetchMessages(activeChatFriend.id);
    }, 4000);
    return () => clearInterval(msgTimer);
  }, [activeChatFriend?.id, isNoctra, fetchMessages]);

  // Actions
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
    if (!window.native?.social) return;
    try {
      const res = await window.native.social.respondRequest(requestId, action);
      if (res?.ok) {
        await fetchFriendsAndRequests();
      }
      return res;
    } catch (err) {
      console.error('[Social] Error responding to request:', err);
    }
  };

  const sendMessage = async (content, options = {}) => {
    const targetId = options.friendId || activeChatFriend?.id;
    if (!targetId || !window.native?.social) return { ok: false, error: 'No recipient selected' };
    const text = (content || '').trim();
    if (!text && !options.mediaUrl) return { ok: false, error: 'Empty message' };

    try {
      const res = await window.native.social.sendMessage(targetId, text, {
        mediaUrl: options.mediaUrl || null,
        mediaName: options.mediaName || null,
        isMedia: options.isMedia ?? Boolean(options.mediaUrl)
      });
      if (res?.ok && res.message) {
        setMessages(prev => [...prev, res.message]);
        // Update friends thread snippet immediately
        const snippet = text || options.mediaName || 'Sent attachment';
        setFriends(prev => prev.map(f => f.id === targetId ? {
          ...f,
          lastMessageContent: snippet,
          lastMessageTime: Date.now(),
          lastMessageSenderId: 'me'
        } : f));
        return { ok: true, message: res.message };
      }
      return { ok: false, error: res?.error || 'Failed to send message' };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const uploadMedia = async (dataUrl, filename) => {
    if (!window.native?.social?.uploadMedia) {
      return { ok: false, error: 'Upload not supported' };
    }
    try {
      return await window.native.social.uploadMedia(dataUrl, filename);
    } catch (err) {
      return { ok: false, error: err.message };
    }
  };

  const setMessageReaction = async (messageId, reaction) => {
    if (!window.native?.social?.setMessageReaction || !messageId) return;
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reaction: m.reaction === reaction ? null : reaction } : m));
    try {
      const res = await window.native.social.setMessageReaction(messageId, reaction);
      if (res?.ok) {
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, reaction: res.reaction } : m));
      }
      return res;
    } catch (err) {
      console.error('[Social] Error setting reaction:', err);
    }
  };

  const updateFriend = async (friendId, attributes) => {
    if (!window.native?.social) return;
    try {
      const res = await window.native.social.updateFriend(friendId, attributes);
      if (res?.ok) {
        await fetchFriendsAndRequests();
      }
      return res;
    } catch (err) {
      console.error('[Social] Error updating friend:', err);
    }
  };

  const unfriend = async (friendId) => {
    if (!window.native?.social) return;
    try {
      const res = await window.native.social.unfriend(friendId);
      if (res?.ok) {
        if (activeChatFriend?.id === friendId) setActiveChatFriend(null);
        await fetchFriendsAndRequests();
      }
      return res;
    } catch (err) {
      console.error('[Social] Error unfriending:', err);
    }
  };

  const block = async (targetId) => {
    if (!window.native?.social) return;
    try {
      const res = await window.native.social.block(targetId);
      if (res?.ok) {
        if (activeChatFriend?.id === targetId) setActiveChatFriend(null);
        await fetchFriendsAndRequests();
      }
      return res;
    } catch (err) {
      console.error('[Social] Error blocking:', err);
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
      if (res?.ok && Array.isArray(res.results)) {
        setSearchResults(res.results);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('[Social] Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const unreadTotal = friends.reduce((sum, f) => sum + (f.unreadCount || 0), 0);
  const pendingRequestsTotal = requests.received?.length || 0;
  const badgeTotal = unreadTotal + pendingRequestsTotal;

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
    badgeTotal,
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
