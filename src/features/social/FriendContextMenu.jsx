import React, { useEffect, useRef } from 'react';
import { Play, MessageSquare, Layers, Star, Tag, Copy, UserMinus, Ban } from 'lucide-react';
import './FriendContextMenu.css';

export default function FriendContextMenu({
  context, // { x, y, friend }
  onClose,
  onJoinServer,
  onOpenChat,
  onToggleBestFriend,
  onSetNickname,
  onUnfriend,
  onBlock
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  if (!context?.friend) return null;
  const { friend, x, y } = context;

  const handleCopyIgn = (e) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(friend.name);
    onClose();
  };

  // Adjust menu position so it doesn't overflow screen bounds
  const menuWidth = 200;
  const menuHeight = 310;
  const adjustedX = Math.min(x, window.innerWidth - menuWidth - 12);
  const adjustedY = Math.min(y, window.innerHeight - menuHeight - 12);

  const isServerJoinable = Boolean(friend.status === 'in-game' && friend.serverAddress);

  return (
    <div
      ref={menuRef}
      className="friend-context-menu"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      {isServerJoinable ? (
        <button
          type="button"
          className="context-menu-item item-join-server"
          onClick={() => {
            onJoinServer(friend);
            onClose();
          }}
        >
          <Play size={14} className="icon-join" fill="currentColor" />
          <span>Join Server</span>
        </button>
      ) : (
        <div className="context-menu-item is-disabled">
          <Play size={14} className="icon-join" />
          <span>Join Server</span>
        </div>
      )}

      <div className="context-menu-divider" />

      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onOpenChat(friend);
          onClose();
        }}
      >
        <MessageSquare size={14} />
        <span>Send Message</span>
      </button>

      <button
        type="button"
        className="context-menu-item is-disabled"
        title="Groups coming soon"
      >
        <Layers size={14} />
        <span>Add to Group</span>
      </button>

      <div className="context-menu-divider" />

      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onToggleBestFriend(friend);
          onClose();
        }}
      >
        <Star size={14} fill={friend.isBestFriend ? 'currentColor' : 'none'} color={friend.isBestFriend ? '#fbbf24' : 'currentColor'} />
        <span>{friend.isBestFriend ? 'Remove Best Friend' : 'Add Best Friend'}</span>
      </button>

      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onSetNickname(friend);
          onClose();
        }}
      >
        <Tag size={14} />
        <span>Set Nickname</span>
      </button>

      <button
        type="button"
        className="context-menu-item"
        onClick={handleCopyIgn}
      >
        <Copy size={14} />
        <span>Copy IGN</span>
      </button>

      <div className="context-menu-divider" />

      <button
        type="button"
        className="context-menu-item item-danger"
        onClick={() => {
          onUnfriend(friend);
          onClose();
        }}
      >
        <UserMinus size={14} />
        <span>Unfriend</span>
      </button>

      <button
        type="button"
        className="context-menu-item item-danger"
        onClick={() => {
          onBlock(friend);
          onClose();
        }}
      >
        <Ban size={14} />
        <span>Block</span>
      </button>
    </div>
  );
}
