import { useMemo, useState } from 'react';
import './relay-groups.css';

const QUICK_REACTIONS = ['\u{1F44D}', '\u{1F602}', '\u{1F525}', '\u{1F480}', '\u2764\uFE0F', '\u{1F62D}', '\u{1F440}', '\u{1F389}'];

/**
 * Discord-style reaction pills: grouped by emoji, count on the right, the
 * viewer's own reactions highlighted with the accent token, and an inline
 * picker button that only appears on hover.
 */
export function MessageReactionBar({
  reactions = [],
  selfId,
  memberNames = {},
  onToggle,
  align = 'left',
  showPicker = true
}) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const grouped = useMemo(() => {
    const buckets = new Map();
    for (const item of reactions) {
      if (!item?.reaction) continue;
      const bucket = buckets.get(item.reaction) || { reaction: item.reaction, userIds: [] };
      bucket.userIds.push(item.userId);
      buckets.set(item.reaction, bucket);
    }
    return [...buckets.values()].sort((a, b) => b.userIds.length - a.userIds.length);
  }, [reactions]);

  if (!grouped.length && !showPicker) return null;

  return (
    <div className={`relay-reactions relay-reactions--${align}`}>
      {grouped.map((bucket) => {
        const mine = bucket.userIds.includes(selfId);
        const who = bucket.userIds.map((id) => (id === selfId ? 'You' : memberNames[id] || 'Someone'));
        return (
          <button
            key={bucket.reaction}
            type="button"
            className={`relay-reaction-pill${mine ? ' is-mine' : ''}`}
            title={`${who.join(', ')} reacted with ${bucket.reaction}`}
            onClick={() => onToggle?.(bucket.reaction)}
          >
            <span className="relay-reaction-pill__emoji">{bucket.reaction}</span>
            <span className="relay-reaction-pill__count">{bucket.userIds.length}</span>
          </button>
        );
      })}

      {showPicker && (
        <div className="relay-reaction-picker">
          <button
            type="button"
            className="relay-reaction-add"
            aria-label="Add reaction"
            onClick={() => setPickerOpen((open) => !open)}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="10" cy="10" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="7.4" cy="8.2" r="1" fill="currentColor" />
              <circle cx="12.6" cy="8.2" r="1" fill="currentColor" />
              <path d="M7 12.2c.8.9 1.8 1.4 3 1.4s2.2-.5 3-1.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>

          {pickerOpen && (
            <>
              <div className="relay-reaction-scrim" onClick={() => setPickerOpen(false)} />
              <div className="relay-reaction-tray" role="menu">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="relay-reaction-tray__item"
                    onClick={() => {
                      onToggle?.(emoji);
                      setPickerOpen(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default MessageReactionBar;
