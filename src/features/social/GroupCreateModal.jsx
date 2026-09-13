import { useMemo, useRef, useState } from 'react';
import RelayAvatar from './RelayAvatar';
import './relay-groups.css';

const MAX_NAME = 32;

/**
 * Create-group flow: pick an image, name the room, then pick friends.
 * The image is uploaded through the existing social upload pipeline so the
 * server only ever stores a URL.
 */
export function GroupCreateModal({ open, friends = [], onClose, onCreate, uploadMedia }) {
  const fileInput = useRef(null);
  const [name, setName] = useState('');
  const [iconUrl, setIconUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const visibleFriends = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = term
      ? friends.filter((friend) => (friend.nickname || friend.name || '').toLowerCase().includes(term))
      : friends;
    return [...list].sort((a, b) => (a.nickname || a.name || '').localeCompare(b.nickname || b.name || ''));
  }, [friends, query]);

  if (!open) return null;

  const reset = () => {
    setName('');
    setIconUrl(null);
    setSelected([]);
    setQuery('');
    setError(null);
  };

  const pickImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Group images must be an image file.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const result = await uploadMedia?.(file);
      const url = result?.url || result?.mediaUrl;
      if (!url) throw new Error(result?.error || 'Upload failed.');
      setIconUrl(url);
    } catch (uploadError) {
      setError(uploadError.message || 'Could not upload that image.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!name.trim()) {
      setError('Give your group a name.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await onCreate?.({
      name: name.trim(),
      iconUrl,
      memberIds: selected
    });
    setBusy(false);
    if (result?.ok === false) {
      setError(result.error || 'Could not create the group.');
      return;
    }
    reset();
    onClose?.();
  };

  const toggleFriend = (friendId) => {
    setSelected((previous) =>
      previous.includes(friendId) ? previous.filter((id) => id !== friendId) : [...previous, friendId]
    );
  };

  return (
    <div className="relay-modal-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="relay-modal relay-modal--create" role="dialog" aria-label="Create group">
        <header className="relay-modal__head">
          <h2>Create a group</h2>
          <p>Pick an image, name it, then invite friends.</p>
        </header>

        <div className="relay-modal__identity">
          <button
            type="button"
            className={`relay-group-icon-picker${iconUrl ? ' has-image' : ''}`}
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {iconUrl ? <img src={iconUrl} alt="" /> : <span className="relay-group-icon-picker__glyph">{name.trim().slice(0, 2).toUpperCase() || '\u002B'}</span>}
            <span className="relay-group-icon-picker__hint">{uploading ? 'Uploading' : 'Change'}</span>
          </button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickImage} />

          <label className="relay-field">
            <span className="relay-field__label">Group name</span>
            <input
              className="relay-input"
              value={name}
              maxLength={MAX_NAME}
              placeholder="Late night crew"
              onChange={(event) => setName(event.target.value)}
            />
            <span className="relay-field__count">{name.length}/{MAX_NAME}</span>
          </label>
        </div>

        <div className="relay-modal__section">
          <div className="relay-modal__section-head">
            <span>Invite friends</span>
            <span className="relay-count-chip">{selected.length} selected</span>
          </div>
          <input
            className="relay-input"
            value={query}
            placeholder="Search friends..."
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="relay-member-scroll">
            {visibleFriends.length === 0 && <p className="relay-empty">No friends match that search.</p>}
            {visibleFriends.map((friend) => (
              <button
                key={friend.id}
                type="button"
                className={`relay-member-row${selected.includes(friend.id) ? ' is-selected' : ''}`}
                onClick={() => toggleFriend(friend.id)}
              >
                <RelayAvatar name={friend.name} size={32} status={friend.status} showStatus />
                <span className="relay-member-row__name">{friend.nickname || friend.name}</span>
                <span className="relay-member-row__check" aria-hidden="true">
                  {selected.includes(friend.id) ? '\u2713' : ''}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="relay-error">{error}</p>}

        <footer className="relay-modal__foot">
          <button type="button" className="relay-btn relay-btn--ghost" onClick={onClose}>Cancel</button>
          <button type="button" className="relay-btn relay-btn--primary" onClick={submit} disabled={busy || uploading}>
            {busy ? 'Creating...' : 'Create group'}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default GroupCreateModal;
