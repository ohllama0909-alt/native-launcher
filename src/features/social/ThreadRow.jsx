import React from 'react';
import { BellOff, Check, CheckCheck, Paperclip, Pin } from 'lucide-react';
import RelayAvatar from './RelayAvatar.jsx';

/** One inbox row: avatar, presence, name, snippet and delivery state. */
export function ThreadRow({ thread, active, presence, isGroup = false, index = 0, onClick, children }) {
  return (
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
          {thread.pinned && <Pin size={10} className="relay-thread-flag" />}
          {thread.muted && <BellOff size={10} className="relay-thread-flag" />}
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
    </button>
  );
}

export default ThreadRow;
