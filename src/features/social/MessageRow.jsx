import React, { useState } from 'react';
import {
  Check,
  CheckCheck,
  CornerUpLeft,
  Download,
  FileText,
  Maximize2,
  Pencil,
  RotateCcw,
  Smile,
  Trash2,
  X
} from 'lucide-react';
import RelayAvatar from './RelayAvatar.jsx';
import { ReplyQuote } from './ReplyPreview.jsx';

const countReactions = (reactions = []) => reactions.reduce((acc, item) => {
  if (!item?.reaction) return acc;
  acc[item.reaction] = (acc[item.reaction] || 0) + 1;
  return acc;
}, {});

/** One message row: bubble, media, reactions, hover tools and inline editing. */
export function MessageRow({
  msg,
  isGroup,
  selfId,
  palette = [],
  canModerate = false,
  readAt = 0,
  onReply,
  onReact,
  onEdit,
  onDelete,
  onRetry,
  onOpenMedia,
  onJump
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draft, setDraft] = useState(null);

  const isMine = Boolean(msg.isMine);
  const isEditing = draft !== null;
  const groups = countReactions(msg.reactions);
  const canEdit = isMine && !msg.isDeleted && !msg.pending && Boolean(msg.content) && !msg.mediaUrl;
  const canDelete = (isMine || (isGroup && canModerate)) && !msg.isDeleted && !msg.pending && !msg.isUploading;
  const isRead = isGroup ? (readAt > 0 && (msg.createdAt || 0) <= readAt) : Boolean(msg.isRead);
  const groupedWithPrevious = Boolean(msg.groupedWithPrevious);
  const groupedWithNext = Boolean(msg.groupedWithNext);
  const showGroupAuthor = !isMine && isGroup && !groupedWithPrevious;
  const showMeta = !groupedWithNext || msg.pending || msg.failed || msg.uploadFailed || msg.editedAt;

  const submitEdit = () => {
    const next = String(draft || '').trim();
    setDraft(null);
    if (next && next !== msg.content) onEdit?.(msg.id, next);
  };

  return (
    <div
      id={`msg-${msg.id}`}
      data-testid={`relay-message-${msg.id}`}
      className={[
        'relay-message-row',
        isMine ? 'is-outgoing' : 'is-incoming',
        pickerOpen ? 'has-picker-open' : '',
        showGroupAuthor ? 'has-author' : '',
        msg.pending ? 'is-pending' : '',
        msg.failed || msg.uploadFailed ? 'is-failed' : '',
        msg.isDeleted ? 'is-deleted' : '',
        groupedWithPrevious ? 'is-grouped-prev' : '',
        groupedWithNext ? 'is-grouped-next' : ''
      ].filter(Boolean).join(' ')}
    >
      {showGroupAuthor && (
        <RelayAvatar name={msg.senderName || msg.senderId} size={28} className="relay-msg-author-avatar" />
      )}
      {!isMine && isGroup && groupedWithPrevious && <span className="relay-msg-author-spacer" aria-hidden="true" />}

      <div className="relay-message-content-col">
        {showGroupAuthor && <span className="relay-msg-author-name">{msg.senderName || msg.senderId}</span>}

        {!msg.isDeleted && !isEditing && (
          <div className="relay-msg-tools">
            <button
              type="button"
              className="relay-msg-tool"
              data-testid={`relay-message-react-${msg.id}`}
              onClick={() => setPickerOpen((open) => !open)}
              title="Add reaction"
            >
              <Smile size={14} />
            </button>
            <button
              type="button"
              className="relay-msg-tool"
              data-testid={`relay-message-reply-${msg.id}`}
              onClick={() => onReply?.(msg)}
              title="Reply"
            >
              <CornerUpLeft size={14} />
            </button>
            {canEdit && (
              <button
                type="button"
                className="relay-msg-tool"
                data-testid={`relay-message-edit-${msg.id}`}
                onClick={() => setDraft(msg.content || '')}
                title="Edit message"
              >
                <Pencil size={13} />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                className="relay-msg-tool is-danger"
                data-testid={`relay-message-delete-${msg.id}`}
                onClick={() => onDelete?.(msg.id)}
                title="Delete message"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}

        {pickerOpen && (
          <div className="relay-msg-reaction-picker" data-testid={`relay-reaction-picker-${msg.id}`}>
            {palette.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="relay-msg-reaction-btn"
                onClick={() => {
                  setPickerOpen(false);
                  onReact?.(msg.id, emoji);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {msg.reply && <ReplyQuote reply={msg.reply} selfId={selfId} onJump={onJump} />}

        {msg.isDeleted ? (
          <div className="relay-message-bubble is-tombstone">
            <p className="relay-message-text">This message was deleted</p>
          </div>
        ) : isEditing ? (
          <div className="relay-message-edit" data-testid={`relay-message-editor-${msg.id}`}>
            <textarea
              className="relay-message-edit-input"
              value={draft}
              autoFocus
              rows={2}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  submitEdit();
                }
                if (event.key === 'Escape') setDraft(null);
              }}
            />
            <div className="relay-message-edit-actions">
              <button type="button" className="relay-edit-cancel" onClick={() => setDraft(null)}>
                <X size={12} />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                className="relay-edit-save"
                data-testid={`relay-message-edit-save-${msg.id}`}
                onClick={submitEdit}
              >
                <Check size={12} />
                <span>Save</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {msg.content && !msg.isVoice && !msg.isMedia && (
              <div className="relay-message-bubble">
                <p className="relay-message-text">{msg.content}</p>
              </div>
            )}

            {msg.isMedia && msg.mediaUrl && (
              <div className={`relay-media-card ${msg.isUploading ? 'is-uploading' : ''}`}>
                <div className="relay-media-frame" onClick={() => !msg.isUploading && onOpenMedia?.(msg.mediaUrl)}>
                  <img src={msg.mediaUrl} alt={msg.mediaName || 'Attachment'} className="relay-media-img" />
                  {msg.isUploading ? (
                    <div className="relay-media-uploading">
                      <span className="relay-progress-track"><i className="relay-progress-indeterminate" /></span>
                      <span className="relay-media-uploading-text">Uploading full resolution…</span>
                    </div>
                  ) : (
                    <div className="relay-media-overlay">
                      <button
                        type="button"
                        className="relay-media-overlay-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenMedia?.(msg.mediaUrl);
                        }}
                        title="Open full screen"
                      >
                        <Maximize2 size={13} />
                      </button>
                      <a
                        href={msg.mediaUrl}
                        download={msg.mediaName || 'image.png'}
                        className="relay-media-overlay-btn"
                        onClick={(event) => event.stopPropagation()}
                        title="Download original"
                      >
                        <Download size={13} />
                      </a>
                    </div>
                  )}
                </div>
                {msg.content && (
                  <div className="relay-media-caption">
                    <p className="relay-message-text">{msg.content}</p>
                  </div>
                )}
                <div className="relay-media-meta">
                  <span className="relay-media-filename">{msg.mediaName || 'Image'}</span>
                  {msg.uploadFailed && <span className="relay-media-failed">Upload failed</span>}
                </div>
              </div>
            )}

            {!msg.isMedia && !msg.isVoice && msg.mediaUrl && (
              <a className="relay-file-card" href={msg.mediaUrl} download={msg.mediaName || 'attachment'}>
                <span className="relay-file-glyph"><FileText size={15} /></span>
                <span className="relay-file-name">{msg.mediaName || 'Attachment'}</span>
                <Download size={13} />
              </a>
            )}

            {msg.isVoice && msg.mediaUrl && (
              <div className="relay-voice-card">
                <audio className="relay-voice-audio" controls src={msg.mediaUrl} preload="none" />
                <span className="relay-voice-duration">{msg.duration || ''}</span>
              </div>
            )}
          </>
        )}

        {Object.keys(groups).length > 0 && (
          <div className="relay-msg-reactions-row">
            {Object.entries(groups).map(([emoji, count]) => {
              const mine = (msg.reactions || []).some(
                (item) => item.reaction === emoji && (item.userId === selfId || item.userId === 'me')
              );
              return (
                <button
                  key={emoji}
                  type="button"
                  className={`relay-msg-reaction-badge ${mine ? 'is-mine' : ''}`}
                  onClick={() => onReact?.(msg.id, emoji)}
                  title="Toggle reaction"
                >
                  <span>{emoji}</span>
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {showMeta && <div className="relay-msg-meta-row">
          <span className="relay-msg-time">{msg.time}</span>
          {msg.editedAt && !msg.isDeleted && <span className="relay-msg-edited">edited</span>}
          {isMine && !msg.pending && !msg.failed && !msg.isDeleted && (
            isRead
              ? <CheckCheck size={13} className="relay-read-receipt is-read" title="Read" />
              : <Check size={13} className="relay-read-receipt" title="Delivered" />
          )}
          {isMine && msg.pending && <span className="relay-msg-state">Sending…</span>}
          {isMine && (msg.failed || msg.uploadFailed) && (
            <button
              type="button"
              className="relay-msg-retry"
              data-testid={`relay-message-retry-${msg.id}`}
              onClick={() => onRetry?.(msg)}
            >
              <RotateCcw size={11} />
              <span>Retry</span>
            </button>
          )}
        </div>}
      </div>
    </div>
  );
}

export default MessageRow;
