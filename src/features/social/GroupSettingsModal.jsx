import { useEffect, useMemo, useRef, useState } from 'react';
import RelayAvatar from './RelayAvatar';
import './relay-groups.css';

const ROLE_LABEL = { owner: 'Owner', admin: 'Admin', member: 'Member' };
const rank = (role) => (role === 'owner' ? 3 : role === 'admin' ? 2 : 1);

/**
 * Group settings: overview (image, name, about), members roster with roles and
 * moderation, and a danger zone. Admins can rename, change the image, add and
 * kick members; only the owner can promote, demote, transfer or delete.
 */
export function GroupSettingsModal({
  open,
  group,
  selfId,
  friends = [],
  onClose,
  onUpdateGroup,
  onAddMembers,
  onKickMember,
  onSetMemberRole,
  onLeaveGroup,
  onDeleteGroup,
  uploadMedia
}) {
  const fileInput = useRef(null);
  const [tab, setTab] = useState('overview');
  const [name, setName] = useState(group?.name || '');
  const [description, setDescription] = useState(group?.description || '');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setName(group?.name || '');
    setDescription(group?.description || '');
    setError(null);
    setConfirmDelete(false);
  }, [group?.id, group?.name, group?.description]);

  const members = group?.members || [];
  const myRole = members.find((member) => member.id === selfId)?.role || group?.role || 'member';
  const canModerate = rank(myRole) >= 2;
  const isOwner = myRole === 'owner';

  const addableFriends = useMemo(() => {
    const inGroup = new Set(members.map((member) => member.id));
    const term = query.trim().toLowerCase();
    return friends
      .filter((friend) => !inGroup.has(friend.id))
      .filter((friend) => !term || (friend.nickname || friend.name || '').toLowerCase().includes(term));
  }, [friends, members, query]);

  if (!open || !group) return null;

  const run = async (action) => {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result?.ok === false) setError(result.error || 'That action failed.');
    return result;
  };

  const changeImage = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    await run(async () => {
      const upload = await uploadMedia?.(file);
      const url = upload?.url || upload?.mediaUrl;
      if (!url) return { ok: false, error: upload?.error || 'Upload failed.' };
      return onUpdateGroup?.(group.id, { iconUrl: url });
    });
  };

  const dirty = name.trim() !== (group.name || '') || description.trim() !== (group.description || '');

  return (
    <div className="relay-modal-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="relay-modal relay-modal--settings" role="dialog" aria-label="Group settings">
        <header className="relay-modal__head relay-modal__head--row">
          <div className="relay-group-identity">
            <div className="relay-group-avatar relay-group-avatar--lg">
              {group.iconUrl
                ? <img src={group.iconUrl} alt="" />
                : <span>{(group.name || '?').slice(0, 2).toUpperCase()}</span>}
            </div>
            <div>
              <h2>{group.name}</h2>
              <p>{group.memberCount} members \u00b7 You are {ROLE_LABEL[myRole]}</p>
            </div>
          </div>
          <button type="button" className="relay-icon-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
            </svg>
          </button>
        </header>

        <nav className="relay-tabs">
          {['overview', 'members', canModerate ? 'invite' : null].filter(Boolean).map((key) => (
            <button
              key={key}
              type="button"
              className={`relay-tab${tab === key ? ' is-active' : ''}`}
              onClick={() => setTab(key)}
            >
              {key === 'overview' ? 'Overview' : key === 'members' ? `Members \u00b7 ${members.length}` : 'Add members'}
            </button>
          ))}
        </nav>

        {tab === 'overview' && (
          <div className="relay-modal__body">
            <div className="relay-modal__identity">
              <button
                type="button"
                className={`relay-group-icon-picker${group.iconUrl ? ' has-image' : ''}`}
                onClick={() => fileInput.current?.click()}
                disabled={!canModerate || busy}
              >
                {group.iconUrl
                  ? <img src={group.iconUrl} alt="" />
                  : <span className="relay-group-icon-picker__glyph">{(group.name || '?').slice(0, 2).toUpperCase()}</span>}
                {canModerate && <span className="relay-group-icon-picker__hint">Change</span>}
              </button>
              <input ref={fileInput} type="file" accept="image/*" hidden onChange={changeImage} />

              <div className="relay-field-stack">
                <label className="relay-field">
                  <span className="relay-field__label">Group name</span>
                  <input
                    className="relay-input"
                    value={name}
                    maxLength={32}
                    disabled={!canModerate}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
                <label className="relay-field">
                  <span className="relay-field__label">About</span>
                  <textarea
                    className="relay-input relay-input--area"
                    value={description}
                    maxLength={200}
                    rows={3}
                    disabled={!canModerate}
                    placeholder="What is this group for?"
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="relay-toggle-row">
              <div>
                <strong>Group image</strong>
                <span>Shown in the inbox, header and notifications.</span>
              </div>
              {canModerate && group.iconUrl && (
                <button
                  type="button"
                  className="relay-btn relay-btn--ghost"
                  onClick={() => run(() => onUpdateGroup?.(group.id, { iconUrl: null }))}
                >
                  Remove
                </button>
              )}
            </div>

            {error && <p className="relay-error">{error}</p>}

            <div className="relay-danger-zone">
              <button
                type="button"
                className="relay-btn relay-btn--danger-ghost"
                onClick={() => run(async () => {
                  const result = await onLeaveGroup?.(group.id);
                  if (result?.ok !== false) onClose?.();
                  return result;
                })}
              >
                Leave group
              </button>
              {isOwner && (
                confirmDelete ? (
                  <button
                    type="button"
                    className="relay-btn relay-btn--danger"
                    onClick={() => run(async () => {
                      const result = await onDeleteGroup?.(group.id);
                      if (result?.ok !== false) onClose?.();
                      return result;
                    })}
                  >
                    Tap again to delete forever
                  </button>
                ) : (
                  <button type="button" className="relay-btn relay-btn--danger" onClick={() => setConfirmDelete(true)}>
                    Delete group
                  </button>
                )
              )}
            </div>

            {canModerate && (
              <footer className="relay-modal__foot">
                <button
                  type="button"
                  className="relay-btn relay-btn--primary"
                  disabled={!dirty || busy}
                  onClick={() => run(() => onUpdateGroup?.(group.id, { name: name.trim(), description: description.trim() }))}
                >
                  {busy ? 'Saving...' : 'Save changes'}
                </button>
              </footer>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="relay-modal__body">
            {error && <p className="relay-error">{error}</p>}
            <div className="relay-member-scroll relay-member-scroll--tall">
              {members.map((member) => {
                const isSelf = member.id === selfId;
                const canActOn = canModerate && !isSelf && rank(member.role) < rank(myRole);
                return (
                  <div key={member.id} className="relay-member-row relay-member-row--static">
                    <RelayAvatar name={member.name} size={34} status={member.status} showStatus />
                    <div className="relay-member-row__meta">
                      <span className="relay-member-row__name">
                        {member.name}{isSelf ? ' (you)' : ''}
                      </span>
                      <span className="relay-member-row__sub">
                        {member.status === 'offline' ? 'Offline' : member.activity || 'Online'}
                      </span>
                    </div>

                    <span className={`relay-role-badge relay-role-badge--${member.role}`}>{ROLE_LABEL[member.role]}</span>

                    {(canActOn || (isOwner && !isSelf)) && (
                      <div className="relay-member-row__actions">
                        {isOwner && member.role === 'member' && (
                          <button type="button" className="relay-chip-btn" disabled={busy}
                            onClick={() => run(() => onSetMemberRole?.(group.id, member.id, 'admin'))}>
                            Make admin
                          </button>
                        )}
                        {isOwner && member.role === 'admin' && (
                          <button type="button" className="relay-chip-btn" disabled={busy}
                            onClick={() => run(() => onSetMemberRole?.(group.id, member.id, 'member'))}>
                            Remove admin
                          </button>
                        )}
                        {isOwner && member.role === 'admin' && (
                          <button type="button" className="relay-chip-btn" disabled={busy}
                            onClick={() => run(() => onSetMemberRole?.(group.id, member.id, 'owner'))}>
                            Transfer ownership
                          </button>
                        )}
                        {canActOn && (
                          <button type="button" className="relay-chip-btn relay-chip-btn--danger" disabled={busy}
                            onClick={() => run(() => onKickMember?.(group.id, member.id))}>
                            Kick
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'invite' && (
          <div className="relay-modal__body">
            <input
              className="relay-input"
              value={query}
              placeholder="Search friends..."
              onChange={(event) => setQuery(event.target.value)}
            />
            {error && <p className="relay-error">{error}</p>}
            <div className="relay-member-scroll relay-member-scroll--tall">
              {addableFriends.length === 0 && <p className="relay-empty">Everyone you can add is already here.</p>}
              {addableFriends.map((friend) => (
                <div key={friend.id} className="relay-member-row relay-member-row--static">
                  <RelayAvatar name={friend.name} size={34} status={friend.status} showStatus />
                  <div className="relay-member-row__meta">
                    <span className="relay-member-row__name">{friend.nickname || friend.name}</span>
                    <span className="relay-member-row__sub">{friend.status === 'offline' ? 'Offline' : 'Online'}</span>
                  </div>
                  <button
                    type="button"
                    className="relay-chip-btn relay-chip-btn--primary"
                    disabled={busy}
                    onClick={() => run(() => onAddMembers?.(group.id, [friend.id]))}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupSettingsModal;
