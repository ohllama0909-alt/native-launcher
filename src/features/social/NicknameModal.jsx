import React, { useEffect, useState } from 'react';
import { Tag, X, Check } from 'lucide-react';
import './NicknameModal.css';

export default function NicknameModal({ friend, onClose, onSave }) {
  const [nickname, setNickname] = useState(friend?.nickname || '');

  useEffect(() => {
    setNickname(friend?.nickname || '');
    const onKeyDown = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [friend?.id, friend?.nickname, onClose]);

  if (!friend) return null;
  const save = async (value) => { await onSave(friend.id, value); onClose(); };

  return (
    <div className="nickname-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="nickname-modal-panel" role="dialog" aria-modal="true" aria-labelledby="nickname-modal-title">
        <div className="nickname-modal-header">
          <div className="nickname-modal-title" id="nickname-modal-title"><Tag size={16} color="var(--brand)" /><span>Set Nickname for <b>{friend.name}</b></span></div>
          <button type="button" className="nickname-close-btn" onClick={onClose} aria-label="Close nickname dialog"><X size={16} /></button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save(nickname.trim() || null); }} className="nickname-modal-body">
          <p className="nickname-modal-desc">Custom nicknames are only visible to you in your friends list and chat overlay.</p>
          <input type="text" className="nickname-input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Best PvP partner (or blank to reset)" maxLength={28} autoFocus />
          <div className="nickname-modal-actions">
            {friend.nickname && <button type="button" className="nickname-clear-btn" onClick={() => save(null)}>Reset to IGN</button>}
            <div style={{ flex: 1 }} />
            <button type="button" className="nickname-cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="nickname-save-btn"><Check size={14} /><span>Save</span></button>
          </div>
        </form>
      </div>
    </div>
  );
}
