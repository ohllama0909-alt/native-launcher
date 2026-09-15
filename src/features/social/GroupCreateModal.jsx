import { useMemo, useRef, useState } from 'react';
import { Camera, Check, Search, Users, X } from 'lucide-react';
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

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const pickImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Group icon must be an image file.');
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
    const cleanName = name.trim();
    if (!cleanName) {
      setError('Please enter a group name.');
      return;
    }
    setBusy(true);
    setError(null);
    const result = await onCreate?.({
      name: cleanName,
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
    <div className="relay-modal-scrim" onMouseDown={(event) => event.target === event.currentTarget && handleClose()}>
      <div className="relay-modal relay-modal--create" role="dialog" aria-label="Create group">
        <header className="relay-modal__head relay-modal__head--row">
          <div className="relay-modal__title-group">
            <div className="relay-modal__badge">
              <Users size={16} />
            </div>
            <div>
              <h2>Create a group</h2>
              <p>Pick an icon, name it, and invite your friends.</p>
            </div>
          </div>
          <button type="button" className="relay-modal__close-btn" onClick={handleClose} title="Close">
            <X size={16} />
          </button>
        </header>

        <div className="relay-modal__identity">
          <button
            type="button"
            className={`relay-group-icon-picker${iconUrl ? ' has-image' : ''}`}
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
            title="Upload group icon"
          >
            {iconUrl ? (
              <>
                <img src={iconUrl} alt="Group icon" />
                <span className="relay-group-icon-picker__hint"><Camera size={13} /> Change</span>
              </>
            ) : (
              <div className="relay-group-icon-placeholder">
                <Camera size={22} />
                <span>{uploading ? 'Uploading…' : 'Add Icon'}</span>
              </div>
            )}
          </button>
          <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickImage} />

          <div className="relay-field-group-name">
            <div className="relay-field__header">
              <span className="relay-field__label">GROUP NAME</span>
              <span className="relay-field__count">{name.length}/{MAX_NAME}</span>
            </div>
            <input
              className="relay-input relay-input--prominent"
              value={name}
              maxLength={MAX_NAME}
              placeholder="e.g. Bedwars Squad"
              autoFocus
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
            />
          </div>
        </div>

        <div className="relay-modal__section">
          <div className="relay-modal__section-head">
            <span>INVITE FRIENDS</span>
            <span className="relay-count-chip">{selected.length} selected</span>
          </div>

          <div className="relay-modal-search">
            <Search size={14} className="relay-modal-search__icon" />
            <input
              className="relay-input relay-input--search"
              value={query}
              placeholder="Search friends..."
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button type="button" className="relay-modal-search__clear" onClick={() => setQuery('')}>
                <X size={12} />
              </button>
            )}
          </div>

          <div className="relay-member-scroll">
            {friends.length === 0 ? (
              <div className="relay-empty-friends">
                <p>No friends found on your friends list.</p>
                <span>Add friends first to invite them to groups.</span>
              </div>
            ) : visibleFriends.length === 0 ? (
              <p className="relay-empty">No friends match &ldquo;{query}&rdquo;</p>
            ) : (
              visibleFriends.map((friend) => {
                const isChecked = selected.includes(friend.id);
                return (
                  <button
                    key={friend.id}
                    type="button"
                    className={`relay-member-row${isChecked ? ' is-selected' : ''}`}
                    onClick={() => toggleFriend(friend.id)}
                  >
                    <div className={`relay-checkbox ${isChecked ? 'is-checked' : ''}`}>
                      {isChecked && <Check size={12} />}
                    </div>
                    <RelayAvatar name={friend.name} skinUrl={friend.skinUrl} size={32} />
                    <div className="relay-member-row__meta">
                      <span className="relay-member-row__name">{friend.nickname || friend.name}</span>
                      <span className="relay-member-row__sub">
                        {friend.status === 'in-game' ? (friend.activity || 'In-game') : (friend.status === 'offline' ? 'Offline' : 'Online')}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {error && <div className="relay-error-banner">{error}</div>}

        <footer className="relay-modal__foot">
          <button type="button" className="relay-btn relay-btn--ghost" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="button"
            className="relay-btn relay-btn--primary"
            onClick={submit}
            disabled={busy || uploading || !name.trim()}
          >
            {busy ? 'Creating…' : 'Create Group'}
          </button>
        </footer>
      </div>
    </div>
  );
}

export default GroupCreateModal;
