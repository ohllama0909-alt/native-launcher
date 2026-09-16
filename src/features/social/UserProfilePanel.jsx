import React, { useState } from 'react';
import { Ban, CalendarDays, Gamepad2, Server, Trash2, UserMinus, X } from 'lucide-react';
import RelayAvatar from './RelayAvatar.jsx';
import Badges, { getUserBadges } from './Badges.jsx';
import './UserProfilePanel.css';

const formatMemberDate = (stamp) => {
  if (!stamp) return 'Early Member';
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return 'Early Member';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function UserProfilePanel({
  user,
  presence,
  isGroup = false,
  onClose,
  onUnfriend,
  onBlock,
  onClearHistory
}) {
  const [confirmUnfriend, setConfirmUnfriend] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  if (!user) return null;

  const status = presence?.status || 'offline';
  const isPlaying = status === 'in-game';
  const isOnline = status === 'in-launcher' || status === 'online';
  const statusColor = presence?.color || (isPlaying ? '#f23f43' : isOnline ? '#23a55a' : '#80848e');
  const bio = user.bio || user.about || user.status || '';
  const badgeCount = getUserBadges(user).length;

  return (
    <aside className="np-panel" role="complementary" aria-label="User Profile">
      {/* Appearance-color banner */}
      <div className="np-banner">
        <button
          type="button"
          className="np-close"
          onClick={onClose}
          aria-label="Close Profile"
          title="Close Profile"
        >
          <X size={15} />
        </button>
      </div>

      {/* Avatar overlapping the banner */}
      <div className="np-avatar-wrap" style={{ '--np-ring': statusColor }}>
        <RelayAvatar
          name={user.name}
          skinUrl={user.skinUrl}
          size={74}
          status={status}
          showStatus
          className="np-avatar"
        />
      </div>

      <div className="np-body">
        {/* Identity */}
        <div className="np-identity">
          <div className="np-name-row">
            <h3 className="np-name">{user.nickname || user.name}</h3>
          </div>
          <span className="np-handle">@{user.name}</span>

          {badgeCount > 0 && (
            <div className="np-profile-badges">
              <span>Badges</span>
              <Badges user={user} size={22} />
            </div>
          )}

          {bio ? <p className="np-bio">{bio}</p> : null}
        </div>

        <div className="np-divider" />

        {/* Launcher presence already appears in the thread header. Only show a
            second card when there is real game activity to describe. */}
        {isPlaying && (
          <div className="np-block">
            <span className="np-label">Playing</span>
            <div className="np-card np-activity is-playing">
            <span className="np-activity-icon">
              <Gamepad2 size={18} />
            </span>
            <div className="np-activity-text">
              <strong>{presence?.text || 'Minecraft'}</strong>
              {presence?.serverAddress ? (
                <span className="np-activity-sub">
                  <Server size={11} />
                  {presence.serverAddress}
                </span>
              ) : (
                <span className="np-activity-sub">Minecraft</span>
              )}
            </div>
          </div>
          </div>
        )}

        {/* Details */}
        <div className="np-block">
          <span className="np-label">Details</span>
          <div className="np-card np-details">
            <div className="np-detail-row">
              <CalendarDays size={15} />
              <div className="np-detail-copy">
                <span className="np-detail-key">Member since</span>
                <span className="np-detail-val">{formatMemberDate(user.memberSince || user.createdAt)}</span>
              </div>
            </div>
            {user.friendsSince && (
              <div className="np-detail-row">
                <UserMinus size={15} />
                <div className="np-detail-copy">
                  <span className="np-detail-key">Friends since</span>
                  <span className="np-detail-val">{formatMemberDate(user.friendsSince)}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {!isGroup && (
          <div className="np-actions">
            {confirmClear ? (
              <div className="np-confirm">
                <span>Clear chat history?</span>
                <div className="np-confirm-btns">
                  <button
                    type="button"
                    className="np-confirm-yes"
                    onClick={() => {
                      setConfirmClear(false);
                      onClearHistory?.(user.id);
                    }}
                  >
                    Clear
                  </button>
                  <button type="button" className="np-confirm-no" onClick={() => setConfirmClear(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="np-action" onClick={() => setConfirmClear(true)}>
                <Trash2 size={15} />
                <span>Clear chat history</span>
              </button>
            )}

            {confirmUnfriend ? (
              <div className="np-confirm">
                <span>Remove @{user.name}?</span>
                <div className="np-confirm-btns">
                  <button
                    type="button"
                    className="np-confirm-yes is-danger"
                    onClick={() => {
                      setConfirmUnfriend(false);
                      onUnfriend?.(user.id);
                    }}
                  >
                    Unfriend
                  </button>
                  <button type="button" className="np-confirm-no" onClick={() => setConfirmUnfriend(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="np-action" onClick={() => setConfirmUnfriend(true)}>
                <UserMinus size={15} />
                <span>Remove friend</span>
              </button>
            )}

            {confirmBlock ? (
              <div className="np-confirm">
                <span>Block @{user.name}?</span>
                <div className="np-confirm-btns">
                  <button
                    type="button"
                    className="np-confirm-yes is-danger"
                    onClick={() => {
                      setConfirmBlock(false);
                      onBlock?.(user.id);
                    }}
                  >
                    Block
                  </button>
                  <button type="button" className="np-confirm-no" onClick={() => setConfirmBlock(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" className="np-action is-danger" onClick={() => setConfirmBlock(true)}>
                <Ban size={15} />
                <span>Block user</span>
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
