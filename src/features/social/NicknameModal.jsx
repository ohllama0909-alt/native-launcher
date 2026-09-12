import React, { useState } from 'react';
import { Tag, X, Check } from 'lucide-react';
import './NicknameModal.css';

export default function NicknameModal({ friend, onClose, onSave }) {
  const [nickname, setNickname] = useState(friend?.nickname || '');

  if (!friend) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(friend.id, nickname.trim());
    onClose();
  };

  const handleClear = () => {
    onSave(friend.id, null);
    onClose();
  };

  return (
    <div className="nickname-modal-backdrop" onClick={onClose}>
      <div className="nickname-modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="nickname-modal-header">
          <div className="nickname-modal-title">
            <Tag size={16} color="var(--brand)" />
            <span>Set Nickname for <b>{friend.name}</b></span>
          </div>
          <button type="button" className="nickname-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="nickname-modal-body">
          <p className="nickname-modal-desc">
            Custom nicknames are only visible to you in your friends list and chat overlay.
          </p>

          <input
            type="text"
            className="nickname-input"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={`e.g. Best PvP partner (or blank to reset)`}
            maxLength={28}
            autoFocus
          />

          <div className="nickname-modal-actions">
            {friend.nickname && (
              <button
                type="button"
                className="nickname-clear-btn"
                onClick={handleClear}
              >
                Reset to IGN
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="nickname-cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="nickname-save-btn"
            >
              <Check size={14} />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
