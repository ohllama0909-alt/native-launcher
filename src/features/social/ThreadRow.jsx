import React, { useState } from 'react';
import { Bell, BellOff, Check, CheckCheck, Paperclip, Pin } from 'lucide-react';
import RelayAvatar from './RelayAvatar.jsx';

/** One inbox row: avatar, presence, name, snippet, delivery state and quick pin/mute actions. */
export function ThreadRow({
  thread,
  active,
  presence,
  isGroup = false,
  index = 0,
  onClick,
  onTogglePin,
  onToggleMute,
  children
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`relay-thread-item-wrapper ${active ? 'is-active' : ''}`}
      onContextMenu={(e) => {
        e.preventDefault();
        setMenuOpen((prev) => !prev);
      }}
    >
      <button
        type="button"
        data-testid={`relay-thread-${thread.id}`}
        className={`relay-thread-item ${active ? 'is-active' : ''}`}
        style={{ animationDelay: `${Math.min(index, 12) * 22}ms` }}
        onClick={onClick}
      >
        <div className="relay-thread-avatar-wrapper">
          {isGroup ? (
            thread.iconUrl ? (
              <span className="relay-thread-icon"><img src={thread.iconUrl} alt="" /></span>
            ) : (
              <div className="relay-thread-group-avatar">{children}</div>
            )
          ) : (
            <RelayAvatar name={thread.name} skinUrl={thread.skinUrl} size={36} className="relay-thread-avatar" />
          )}
          <span className={`relay-thread-dot ${presence.status}`} style={{ backgroundColor: presence.color }} />
        </div>

        <div className="relay-thread-info">
          <div className="relay-thread-top-row">
            <span className="relay-thread-name">{thread.nickname || thread.name}</span>
            {thread.pinned && <Pin size={10} className="relay-thread-flag is-pinned" title="Pinned" />}
            {thread.muted && <BellOff size={10} className="relay-thread-flag is-muted" title="Muted" />}
            <span className="relay-thread-time">{thread.lastTime || ''}</span>
          </div>
          <div className="relay-thread-bottom-row">
            {thread.isTyping ? (
              <span className="relay-thread-snippet is-typing">typing…</span>
            ) : (
              <>
                {thread.isAttachment && <Paperclip size={11} className="relay-snippet-icon" />}
                <span className="relay-thread-snippet">{thread.lastMessage || 'No messages'}</span>
                {thread.isMine && !thread.lastPending && !thread.lastFailed && (
                  thread.lastIsRead
                    ? <CheckCheck size={11} className="relay-snippet-checks is-read" title="Read" />
                    : <Check size={11} className="relay-snippet-checks" title="Delivered" />
                )}
              </>
            )}
            {thread.unread > 0 && (
              <span className="relay-unread-badge">{thread.unread > 9 ? '9+' : thread.unread}</span>
            )}
          </div>
        </div>

        {/* Hover quick action buttons */}
        <div className="relay-thread-hover-actions" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`relay-thread-action-btn ${thread.pinned ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin?.(e);
            }}
            title={thread.pinned ? 'Unpin conversation' : 'Pin conversation'}
          >
            <Pin size={12} />
          </button>
          <button
            type="button"
            className={`relay-thread-action-btn ${thread.muted ? 'is-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute?.(e);
            }}
            title={thread.muted ? 'Unmute notifications' : 'Mute notifications'}
          >
            {thread.muted ? <BellOff size={12} /> : <Bell size={12} />}
          </button>
        </div>
      </button>

      {/* Context menu on right click */}
      {menuOpen && (
        <>
          <div className="relay-thread-menu-backdrop" onClick={() => setMenuOpen(false)} />
          <div className="relay-thread-context-menu" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => {
                setMenuOpen(false);
                onTogglePin?.(e);
              }}
            >
              <Pin size={13} />
              <span>{thread.pinned ? 'Unpin conversation' : 'Pin conversation'}</span>
            </button>
            <button
              type="button"
              onClick={(e) => {
                setMenuOpen(false);
                onToggleMute?.(e);
              }}
            >
              {thread.muted ? <Bell size={13} /> : <BellOff size={13} />}
              <span>{thread.muted ? 'Unmute notifications' : 'Mute notifications'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ThreadRow;
