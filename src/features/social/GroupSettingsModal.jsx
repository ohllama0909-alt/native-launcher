import { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Check, Info, LogOut, Search, ShieldCheck, Trash2, UserMinus, UserPlus, Users, X } from 'lucide-react';
import RelayAvatar from './RelayAvatar';
import GroupAvatarBadge from './GroupAvatarBadge';
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
  const [confirmLeave, setConfirmLeave] = useState(false);

  useEffect(() => {
    setTab('overview');
    setName(group?.name || '');
    setDescription(group?.description || '');
    setQuery('');
    setError(null);
    setConfirmDelete(false);
    setConfirmLeave(false);
  }, [group?.id, group?.name, group?.description]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);

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
    try {
      const result = await action();
      setBusy(false);
      if (result?.ok === false) setError(result.error || 'That action failed.');
      return result;
    } catch (err) {
      setBusy(false);
      setError(err.message || 'An error occurred.');
      return { ok: false, error: err.message };
    }
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
  const sectionTitle = tab === 'members' ? 'Members' : tab === 'invite' ? 'Invite people' : 'Overview';
  const sectionDescription = tab === 'members'
    ? `${members.length} ${members.length === 1 ? 'person' : 'people'} in this group`
    : tab === 'invite'
      ? 'Add friends to this group conversation.'
      : 'Customize how this group appears to everyone.';

  return (
    <div className="relay-modal-scrim" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <div className="relay-modal relay-modal--settings" role="dialog" aria-label="Group settings">
        <div className="relay-settings-layout">
        <aside className="relay-settings-sidebar">
          <div className="relay-settings-group">
            <GroupAvatarBadge group={group} size={36} />
            <div>
              <strong>{group.name}</strong>
              <span>{group.memberCount || members.length} members</span>
            </div>
          </div>
          <span className="relay-settings-sidebar__label">Group settings</span>
          <nav className="relay-tabs" aria-label="Group settings sections">
          {['overview', 'members', canModerate ? 'invite' : null].filter(Boolean).map((key) => (
            <button
              key={key}
              type="button"
              className={`relay-tab${tab === key ? ' is-active' : ''}`}
              onClick={() => setTab(key)}
              aria-current={tab === key ? 'page' : undefined}
              data-testid={`group-settings-${key}-tab`}
            >
              {key === 'overview' ? <Info size={15} /> : key === 'members' ? <Users size={15} /> : <UserPlus size={15} />}
              <span>{key === 'overview' ? 'Overview' : key === 'members' ? 'Members' : 'Invites'}</span>
              {key === 'members' && <b>{members.length}</b>}
            </button>
          ))}
          </nav>
          <div className="relay-settings-role">
            <ShieldCheck size={14} />
            <span>Your role</span>
            <strong>{ROLE_LABEL[myRole] || 'Member'}</strong>
          </div>
        </aside>

        <section className="relay-settings-content">
        <header className="relay-settings-content__head">
          <div>
            <h2>{sectionTitle}</h2>
            <p>{sectionDescription}</p>
          </div>
          <div className="relay-settings-close">
            <button type="button" className="relay-modal__close-btn" onClick={onClose} aria-label="Close" title="Close">
              <X size={18} />
            </button>
            <span>ESC</span>
          </div>
        </header>

        {tab === 'overview' && (
          <div className="relay-modal__body">
            <div className="relay-settings-card relay-settings-card--profile">
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
                    rows={2}
                    disabled={!canModerate}
                    placeholder="What is this group for?"
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </label>
              </div>
              <div className="relay-settings-avatar-field">
                <span className="relay-field__label">Group icon</span>
                <button
                  type="button"
                  className={`relay-group-icon-picker${group.iconUrl ? ' has-image' : ''}`}
                  onClick={() => fileInput.current?.click()}
                  disabled={!canModerate || busy}
                  title={canModerate ? 'Change group icon' : undefined}
                  data-testid="group-settings-icon-picker"
                >
                  {group.iconUrl ? (
                    <img src={group.iconUrl} alt="" />
                  ) : (
                    <GroupAvatarBadge group={group} size={76} />
                  )}
                  {canModerate && <span className="relay-group-icon-picker__hint"><Camera size={13} /> Change</span>}
                </button>
                <input ref={fileInput} type="file" accept="image/*" hidden onChange={changeImage} />
                <span className="relay-settings-avatar-field__help">Recommended: square image, at least 128 × 128.</span>
              </div>
            </div>

            {canModerate && group.iconUrl && (
              <div className="relay-settings-inline-action">
                <div>
                  <strong>Remove group icon</strong>
                  <span>Return to the automatically generated group avatar.</span>
                </div>
                <button
                  type="button"
                  className="relay-btn relay-btn--ghost"
                  onClick={() => run(() => onUpdateGroup?.(group.id, { iconUrl: null }))}
                >
                  <X size={14} /> Remove icon
                </button>
              </div>
            )}

            {error && <div className="relay-error-banner">{error}</div>}

            <div className="relay-danger-zone" aria-label="Danger zone">
              <div className="relay-danger-zone__info">
                <span className="relay-field__label">Danger zone</span>
                <h4>Group management</h4>
                <p>{isOwner ? 'Delete this group permanently or transfer ownership.' : 'Leave this group conversation.'}</p>
              </div>
              <div className="relay-danger-zone__actions">
                {confirmLeave ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="relay-btn relay-btn--ghost"
                      onClick={() => setConfirmLeave(false)}
                      disabled={busy}
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      type="button"
                      className="relay-btn relay-btn--danger"
                      disabled={busy}
                      onClick={() => run(async () => {
                        const result = await onLeaveGroup?.(group.id);
                        onClose?.();
                        return result;
                      })}
                    >
                      <LogOut size={14} /> {busy ? 'Leaving…' : 'Confirm leave'}
                    </button>
                  </div>
                ) : confirmDelete ? (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      className="relay-btn relay-btn--ghost"
                      onClick={() => setConfirmDelete(false)}
                      disabled={busy}
                    >
                      <X size={14} /> Cancel
                    </button>
                    <button
                      type="button"
                      className="relay-btn relay-btn--danger"
                      disabled={busy}
                      onClick={() => run(async () => {
                        const result = await onDeleteGroup?.(group.id);
                        onClose?.();
                        return result;
                      })}
                    >
                      <Trash2 size={14} /> {busy ? 'Deleting…' : 'Delete forever'}
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="relay-btn relay-btn--danger-ghost"
                      onClick={() => setConfirmLeave(true)}
                    >
                      <LogOut size={14} />
                      Leave group
                    </button>
                    {isOwner && (
                      <button
                        type="button"
                        className="relay-btn relay-btn--danger"
                        onClick={() => setConfirmDelete(true)}
                      >
                        <Trash2 size={14} />
                        Delete group
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {canModerate && (
              <footer className="relay-modal__foot">
                <button
                  type="button"
                  className="relay-btn relay-btn--primary"
                  disabled={!dirty || busy}
                  onClick={() => run(() => onUpdateGroup?.(group.id, { name: name.trim(), description: description.trim() }))}
                >
                  <Check size={14} /> {busy ? 'Saving…' : 'Save changes'}
                </button>
              </footer>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div className="relay-modal__body">
            {error && <div className="relay-error-banner">{error}</div>}
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

                    <span className={`relay-role-badge relay-role-badge--${member.role}`}>{ROLE_LABEL[member.role] || member.role}</span>

                    {(canActOn || (isOwner && !isSelf)) && (
                      <div className="relay-member-row__actions">
                        {isOwner && member.role === 'member' && (
                          <button type="button" className="relay-chip-btn" disabled={busy}
                            onClick={() => run(() => onSetMemberRole?.(group.id, member.id, 'admin'))}>
                            <ShieldCheck size={13} /> Make admin
                          </button>
                        )}
                        {isOwner && member.role === 'admin' && (
                          <button type="button" className="relay-chip-btn" disabled={busy}
                            onClick={() => run(() => onSetMemberRole?.(group.id, member.id, 'member'))}>
                            <Users size={13} /> Demote
                          </button>
                        )}
                        {canActOn && (
                          <button type="button" className="relay-chip-btn relay-chip-btn--danger" disabled={busy}
                            onClick={() => run(() => onKickMember?.(group.id, member.id))}>
                            <UserMinus size={13} /> Remove
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

        {tab === 'invite' && canModerate && (
          <div className="relay-modal__body">
            {error && <div className="relay-error-banner">{error}</div>}
            <div className="relay-modal-search">
              <Search size={14} className="relay-modal-search__icon" />
              <input
                className="relay-input relay-input--search"
                value={query}
                placeholder="Search friends to add…"
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button type="button" className="relay-modal-search__clear" onClick={() => setQuery('')}>
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="relay-member-scroll relay-member-scroll--tall">
              {friends.length === 0 ? (
                <div className="relay-empty-friends">
                  <p>No friends available to add.</p>
                </div>
              ) : addableFriends.length === 0 ? (
                <p className="relay-empty">All eligible friends are already in this group.</p>
              ) : (
                addableFriends.map((friend) => (
                  <div key={friend.id} className="relay-member-row relay-member-row--static">
                    <RelayAvatar name={friend.name} skinUrl={friend.skinUrl} size={32} />
                    <div className="relay-member-row__meta">
                      <span className="relay-member-row__name">{friend.nickname || friend.name}</span>
                      <span className="relay-member-row__sub">
                        {friend.status === 'in-game' ? (friend.activity || 'In-game') : (friend.status === 'offline' ? 'Offline' : 'Online')}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="relay-btn relay-btn--primary"
                      style={{ padding: '4px 10px', fontSize: 11.5 }}
                      disabled={busy}
                      onClick={() => run(() => onAddMembers?.(group.id, [friend.id]))}
                    >
                      <UserPlus size={13} /> Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        </section>
        </div>
      </div>
    </div>
  );
}

export default GroupSettingsModal;
