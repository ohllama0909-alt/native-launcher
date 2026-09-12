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

  const sendMessage = async (content) => {
    if (!activeChatFriend?.id || !window.native?.social || !content?.trim()) return;
    try {
      const res = await window.native.social.sendMessage(activeChatFriend.id, content.trim());
      if (res?.ok && res.message) {
        setMessages(prev => [...prev, res.message]);
        return { ok: true };
      }
      return { ok: false, error: res?.error || 'Failed to send message' };
    } catch (err) {
      return { ok: false, error: err.message };
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
    updateFriend,
    unfriend,
    block,
    searchPlayers
  };
}
export default useSocial;
