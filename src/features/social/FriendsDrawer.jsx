import React, { useState, useMemo } from 'react';
import {
  Search,
  UserPlus,
  MessageSquare,
  Check,
  X,
  ShieldCheck,
  Star,
  Users,
  AlertCircle,
  LogIn,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import './FriendsDrawer.css';

function formatRelativeTime(timestamp, prefix = '') {
  if (!timestamp) return '';
  const diffMs = Date.now() - timestamp;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  let timeStr = '';
  if (diffDays > 30) {
    const d = new Date(timestamp);
    timeStr = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  } else if (diffDays > 0) {
    timeStr = diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;
  } else if (diffHours > 0) {
    timeStr = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffMin > 0) {
    timeStr = diffMin === 1 ? '1 minute ago' : `${diffMin} mins ago`;
  } else {
    timeStr = 'just now';
  }
  return prefix ? `${prefix} ${timeStr}` : timeStr;
}

export default function FriendsDrawer({
  open,
  onClose,
  isNoctra,
  friends = [],
  requests = { received: [], sent: [] },
  onOpenChat,
  onOpenContextMenu,
  onSendRequest,
  onRespondRequest,
  onOpenAccountSwitcher
}) {
  const [activeTab, setActiveTab] = useState('friends'); // 'friends' | 'requests'
  const [searchQuery, setSearchQuery] = useState('');
  const [addPlayerName, setAddPlayerName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFeedback, setAddFeedback] = useState(null);
  const [onlineCollapsed, setOnlineCollapsed] = useState(false);
  const [offlineCollapsed, setOfflineCollapsed] = useState(false);

  // Filter friends by search query
  const filteredFriends = useMemo(() => {
    if (!searchQuery.trim()) return friends;
    const q = searchQuery.toLowerCase().trim();
    return friends.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.nickname && f.nickname.toLowerCase().includes(q))
    );
  }, [friends, searchQuery]);

  // Separate online and offline friends
  const onlineFriends = useMemo(() => {
    return filteredFriends.filter((f) => f.status !== 'offline');
  }, [filteredFriends]);

  const offlineFriends = useMemo(() => {
    return filteredFriends.filter((f) => f.status === 'offline');
  }, [filteredFriends]);

  const pendingReceivedCount = requests.received?.length || 0;

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addPlayerName.trim()) return;
    setAddFeedback({ type: 'loading', message: 'Sending request…' });
    const res = await onSendRequest(addPlayerName.trim());
    if (res?.ok) {
      setAddFeedback({ type: 'success', message: `Friend request sent to ${addPlayerName.trim()}!` });
      setAddPlayerName('');
      setTimeout(() => {
        setShowAddModal(false);
        setAddFeedback(null);
      }, 1600);
    } else {
      setAddFeedback({ type: 'error', message: res?.error || 'Failed to send request' });
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="friends-drawer-backdrop" onClick={onClose} />
      <div className="friends-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="friends-drawer-header">
          <div className="friends-tab-group">
            <button
              type="button"
              className={`friends-tab-btn ${activeTab === 'friends' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('friends')}
            >
              <span>Friends</span>
            </button>
            <button
              type="button"
              className={`friends-tab-btn ${activeTab === 'requests' ? 'is-active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              <span>Requests</span>
              {pendingReceivedCount > 0 && <span className="tab-requests-dot" />}
            </button>
          </div>

          <button
            type="button"
            className="friends-close-btn"
            onClick={onClose}
            aria-label="Close Friends drawer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search & Add Friend Input Bar */}
        <div className="friends-drawer-search-bar">
          <div className="friends-search-input-wrap">
            <Search size={14} className="friends-search-icon" />
            <input
              type="text"
              className="friends-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find a player..."
            />
            {searchQuery && (
              <button
                type="button"
                className="friends-search-clear"
                onClick={() => setSearchQuery('')}
              >
                <X size={12} />
              </button>
            )}
          </div>
          <button
            type="button"
            className={`friends-add-trigger-btn ${showAddModal ? 'is-active' : ''}`}
            onClick={() => {
              setShowAddModal(!showAddModal);
              setAddFeedback(null);
            }}
            title="Add Friend by username"
          >
            <UserPlus size={16} />
          </button>
        </div>

        {/* Add Friend Dropdown Card */}
        {showAddModal && (
          <form onSubmit={handleAddSubmit} className="friends-add-form-card">
            <div className="friends-add-form-title">
              <UserPlus size={14} color="var(--brand)" />
              <span>Add Noctra Friend</span>
            </div>
            <div className="friends-add-input-row">
              <input
                type="text"
                className="friends-add-input"
                value={addPlayerName}
                onChange={(e) => setAddPlayerName(e.target.value)}
                placeholder="Enter Minecraft username…"
                maxLength={16}
                autoFocus
              />
              <button
                type="submit"
                className="friends-add-submit-btn"
                disabled={!addPlayerName.trim()}
              >
                Send
              </button>
            </div>
            {addFeedback && (
              <div className={`friends-add-feedback is-${addFeedback.type}`}>
                {addFeedback.message}
              </div>
            )}
          </form>
        )}

        {/* Non-Noctra Account Guard */}
        {!isNoctra ? (
          <div className="friends-non-noctra-guard">
            <div className="guard-icon-wrap">
              <Users size={32} color="var(--brand)" />
            </div>
            <h3>Noctra Social</h3>
            <p>
              Friends, direct messaging, and server join detection are exclusive to <b>Noctra accounts</b>.
            </p>
            <button
              type="button"
              className="guard-switch-btn"
              onClick={onOpenAccountSwitcher}
            >
              <LogIn size={15} />
              <span>Sign in with Noctra</span>
            </button>
          </div>
        ) : activeTab === 'friends' ? (
          /* Friends Tab View */
          <div className="friends-list-content">
            {/* Online Section */}
            <div className="friends-section">
              <button
                type="button"
                className="friends-section-header"
                onClick={() => setOnlineCollapsed(!onlineCollapsed)}
              >
                {onlineCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>{onlineFriends.length} Online</span>
              </button>

              {!onlineCollapsed && (
                <div className="friends-items-group">
                  {onlineFriends.length === 0 ? (
                    <div className="friends-empty-hint">No friends online right now</div>
                  ) : (
                    onlineFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="friend-row"
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onOpenContextMenu({ x: e.clientX, y: e.clientY, friend });
                        }}
                      >
                        <div className="friend-avatar-wrap">
                          <img
                            src={
                              friend.uuid
                                ? `https://mc-heads.net/avatar/${friend.uuid}/64`
                                : `https://mc-heads.net/avatar/${friend.name}/64`
                            }
                            alt={friend.name}
                            className="friend-avatar"
                            onError={(e) => {
                              e.currentTarget.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
                            }}
                          />
                          <span className={`friend-status-dot ${friend.status}`} />
                        </div>

                        <div className="friend-info">
                          <div className="friend-name-line">
                            <span className="friend-name">{friend.nickname || friend.name}</span>
                            {friend.isBestFriend && (
                              <Star size={12} fill="#fbbf24" color="#fbbf24" className="friend-badge-icon" />
                            )}
                            {friend.isVerified && (
                              <ShieldCheck size={12} className="friend-verified-icon" />
                            )}
                          </div>
                          <span className={`friend-activity-text status-${friend.status}`}>
                            {friend.activity || (friend.status === 'in-game' ? 'In-game' : 'Online')}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="friend-chat-btn"
                          onClick={() => onOpenChat(friend)}
                          title={`Chat with ${friend.nickname || friend.name}`}
                        >
                          <MessageSquare size={16} />
                          {friend.unreadCount > 0 && <span className="chat-unread-dot" />}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Offline Section */}
            <div className="friends-section">
              <button
                type="button"
                className="friends-section-header"
                onClick={() => setOfflineCollapsed(!offlineCollapsed)}
              >
                {offlineCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <span>{offlineFriends.length} Offline</span>
              </button>

              {!offlineCollapsed && (
                <div className="friends-items-group">
                  {offlineFriends.length === 0 ? (
                    <div className="friends-empty-hint">No offline friends</div>
                  ) : (
                    offlineFriends.map((friend) => (
                      <div
                        key={friend.id}
                        className="friend-row is-offline"
                        onContextMenu={(e) => {
                          e.preventDefault();
                          onOpenContextMenu({ x: e.clientX, y: e.clientY, friend });
                        }}
                      >
                        <div className="friend-avatar-wrap">
                          <img
                            src={
                              friend.uuid
                                ? `https://mc-heads.net/avatar/${friend.uuid}/64`
                                : `https://mc-heads.net/avatar/${friend.name}/64`
                            }
                            alt={friend.name}
                            className="friend-avatar"
                            onError={(e) => {
                              e.currentTarget.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
                            }}
                          />
                        </div>

                        <div className="friend-info">
                          <div className="friend-name-line">
                            <span className="friend-name">{friend.nickname || friend.name}</span>
                            {friend.isBestFriend && (
                              <Star size={12} fill="#fbbf24" color="#fbbf24" className="friend-badge-icon" />
                            )}
                          </div>
                          <span className="friend-activity-text status-offline">
                            {formatRelativeTime(friend.lastSeen, 'Offline for')}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="friend-chat-btn"
                          onClick={() => onOpenChat(friend)}
                          title={`View chat with ${friend.nickname || friend.name}`}
                        >
                          <MessageSquare size={16} />
                          {friend.unreadCount > 0 && <span className="chat-unread-dot" />}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Requests Tab View */
          <div className="friends-list-content">
            {/* Received Requests */}
            <div className="friends-section">
              <div className="requests-section-header">
                <span>{requests.received?.length || 0} Received</span>
              </div>

              <div className="friends-items-group">
                {!requests.received || requests.received.length === 0 ? (
                  <div className="friends-empty-hint">No incoming friend requests</div>
                ) : (
                  requests.received.map((req) => (
                    <div key={req.id} className="request-row">
                      <div className="friend-avatar-wrap">
                        <img
                          src={
                            req.uuid
                              ? `https://mc-heads.net/avatar/${req.uuid}/64`
                              : `https://mc-heads.net/avatar/${req.name}/64`
                          }
                          alt={req.name}
                          className="friend-avatar"
                          onError={(e) => {
                            e.currentTarget.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
                          }}
                        />
                      </div>

                      <div className="friend-info">
                        <span className="friend-name">{req.name}</span>
                        <span className="friend-activity-text">
                          {formatRelativeTime(req.createdAt, 'Received')}
                        </span>
                      </div>

                      <div className="request-actions">
                        <button
                          type="button"
                          className="request-btn-accept"
                          onClick={() => onRespondRequest(req.id, 'accept')}
                          title="Accept friend request"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          className="request-btn-decline"
                          onClick={() => onRespondRequest(req.id, 'decline')}
                          title="Decline request"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sent Requests */}
            <div className="friends-section">
              <div className="requests-section-header">
                <span>{requests.sent?.length || 0} Sent</span>
              </div>

              <div className="friends-items-group">
                {!requests.sent || requests.sent.length === 0 ? (
                  <div className="friends-empty-hint">No outgoing pending requests</div>
                ) : (
                  requests.sent.map((req) => (
                    <div key={req.id} className="request-row">
                      <div className="friend-avatar-wrap">
                        <img
                          src={
                            req.uuid
                              ? `https://mc-heads.net/avatar/${req.uuid}/64`
                              : `https://mc-heads.net/avatar/${req.name}/64`
                          }
                          alt={req.name}
                          className="friend-avatar"
                          onError={(e) => {
                            e.currentTarget.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
                          }}
                        />
                      </div>

                      <div className="friend-info">
                        <span className="friend-name">{req.name}</span>
                        <span className="friend-activity-text">
                          {formatRelativeTime(req.createdAt, 'Sent')}
                        </span>
                      </div>

                      <div className="request-actions">
                        <button
                          type="button"
                          className="request-btn-cancel"
                          onClick={() => onRespondRequest(req.id, 'cancel')}
                          title="Cancel request"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
