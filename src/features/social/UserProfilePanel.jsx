import React, { useState } from 'react';
import { Ban, Calendar, Check, Clock, Gamepad2, Sparkles, Trash2, UserMinus, X } from 'lucide-react';
import RelayAvatar from './RelayAvatar.jsx';
import Badges from './Badges.jsx';
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

  const isPlaying = presence?.status === 'in-game';
  const isOnline = presence?.status === 'in-launcher' || presence?.status === 'online';
  const statusLabel = isPlaying ? 'Playing a game' : (isOnline ? 'In Launcher' : 'Offline');

  return (
    <aside className="noctra-user-profile-panel" role="complementary" aria-label="User Profile">
      {/* Header Banner */}
      <div className="noctra-profile-banner">
        <button
          type="button"
          className="noctra-profile-close-btn"
          onClick={onClose}
          aria-label="Close Profile"
          title="Close Profile"
        >
          <X size={15} />
        </button>
      </div>

      {/* Avatar with Status */}
      <div className="noctra-profile-avatar-wrap">
        <RelayAvatar
          name={user.name}
          skinUrl={user.skinUrl}
          size={76}
          status={presence?.status || 'offline'}
          showStatus
          className="noctra-profile-avatar"
        />
      </div>

      {/* Profile Card Header */}
      <div className="noctra-profile-header-info">
        <div className="noctra-profile-names">
          <h3 className="noctra-profile-display-name">{user.nickname || user.name}</h3>
          <span className="noctra-profile-username">@{user.name}</span>
        </div>

        {/* Badges Strip */}
        <div className="noctra-profile-badges-row">
          <Badges user={user} size={20} />
        </div>
      </div>

      <div className="noctra-profile-divider" />

      {/* Activity / Game Presence Card */}
      <div className="noctra-profile-section">
        <span className="noctra-profile-section-title">ACTIVITY</span>
        <div className={`noctra-profile-activity-card ${isPlaying ? 'is-playing' : ''}`}>
          <div className="noctra-activity-icon-wrap">
            <Gamepad2 size={20} className={isPlaying ? 'text-red' : 'text-muted'} />
          </div>
          <div className="noctra-activity-info">
            <strong className="noctra-activity-heading">{statusLabel}</strong>
            <span className="noctra-activity-detail">
              {presence?.text || (isPlaying ? 'Minecraft' : 'No active game')}
            </span>
            {isPlaying && presence?.serverAddress && (
              <span className="noctra-activity-subdetail">{presence.serverAddress}</span>
            )}
          </div>
        </div>
      </div>

      {/* Member Details */}
      <div className="noctra-profile-section">
        <span className="noctra-profile-section-title">NOCTRA MEMBER SINCE</span>
        <div className="noctra-profile-meta-row">
          <Calendar size={14} className="text-muted" />
          <span>{formatMemberDate(user.memberSince || user.createdAt)}</span>
        </div>
        {user.friendsSince && (
          <div className="noctra-profile-meta-row" style={{ marginTop: '4px' }}>
            <Clock size={14} className="text-muted" />
            <span>Friends since {formatMemberDate(user.friendsSince)}</span>
          </div>
        )}
      </div>

      <div className="noctra-profile-divider" />

      {/* Action Buttons */}
      {!isGroup && (
        <div className="noctra-profile-actions-section">
          {confirmClear ? (
            <div className="noctra-profile-confirm-row">
              <span>Clear chat?</span>
              <button
                type="button"
                className="btn-confirm-yes"
                onClick={() => {
                  setConfirmClear(false);
                  onClearHistory?.(user.id);
                }}
              >
                Yes, clear
              </button>
              <button type="button" className="btn-confirm-no" onClick={() => setConfirmClear(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="noctra-profile-action-btn"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 size={14} />
              <span>Clear chat history</span>
            </button>
          )}

          {confirmUnfriend ? (
            <div className="noctra-profile-confirm-row">
              <span>Unfriend @{user.name}?</span>
              <button
                type="button"
                className="btn-confirm-yes is-danger"
                onClick={() => {
                  setConfirmUnfriend(false);
                  onUnfriend?.(user.id);
                }}
              >
                Unfriend
              </button>
              <button type="button" className="btn-confirm-no" onClick={() => setConfirmUnfriend(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="noctra-profile-action-btn"
              onClick={() => setConfirmUnfriend(true)}
            >
              <UserMinus size={14} />
              <span>Remove friend</span>
            </button>
          )}

          {confirmBlock ? (
            <div className="noctra-profile-confirm-row">
              <span>Block @{user.name}?</span>
              <button
                type="button"
                className="btn-confirm-yes is-danger"
                onClick={() => {
                  setConfirmBlock(false);
                  onBlock?.(user.id);
                }}
              >
                Block
              </button>
              <button type="button" className="btn-confirm-no" onClick={() => setConfirmBlock(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="noctra-profile-action-btn is-danger"
              onClick={() => setConfirmBlock(true)}
            >
              <Ban size={14} />
              <span>Block user</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
