import React, { useEffect, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import PlayerAvatar from '../../components/ui/PlayerAvatar.jsx';
import './AccountSwitcherModal.css';

function accountKind(account) {
  if (account?.type === 'offline') return 'Offline';
  if (account?.type === 'guest') return 'Guest';
  return 'Microsoft';
}

export default function AccountSwitcherModal({
  open,
  onClose,
  accounts = [],
  activeId,
  onSwitchAccount,
  onAddMicrosoft,
  onAddOffline,
  onRemoveAccount
}) {
  const [offlineName, setOfflineName] = useState('');
  const [addingOffline, setAddingOffline] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) return;
    setOfflineName('');
    setAddingOffline(false);
    setBusy(false);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const active = accounts.find((account) => account.id === activeId) || accounts[0] || null;
  const others = accounts.filter((account) => account.id !== active?.id);
  const nameValid = /^[A-Za-z0-9_]{3,16}$/.test(offlineName.trim());

  const addMicrosoft = async () => {
    setBusy(true);
    try {
      await onAddMicrosoft?.();
    } finally {
      setBusy(false);
    }
  };

  const addOffline = async () => {
    if (!nameValid) return;
    setBusy(true);
    try {
      await onAddOffline?.(offlineName.trim());
      setOfflineName('');
      setAddingOffline(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-switcher-backdrop" onClick={onClose}>
      <div
        className="account-switcher-box"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="account-switcher-header">
          <h2 className="account-switcher-title">Accounts</h2>
          <button
            type="button"
            className="account-switcher-close"
            onClick={onClose}
            title="Close"
          >
            <NativeIcon name="close" size={16} />
          </button>
        </header>

        <div className="account-switcher-body">
          {active ? (
            <section className="account-hero">
              <div className="account-hero-skin">
                <PlayerAvatar
                  account={active}
                  uuid={active.uuid}
                  name={active.name}
                  kind="body"
                  size={78}
                  alt={`${active.name} skin`}
                />
              </div>

              <div className="account-hero-info">
                <span className="account-hero-label">Signed in as</span>
                <h3 className="account-hero-name">{active.name}</h3>
                <div className="account-hero-tags">
                  <span className={`account-type-tag ${active.type === 'offline' ? 'offline' : ''}`}>
                    {accountKind(active)}
                  </span>
                  {active.uuid ? (
                    <span className="account-hero-uuid" title={active.uuid}>
                      {String(active.uuid).slice(0, 8)}
                    </span>
                  ) : (
                    <span className="account-hero-uuid">No UUID</span>
                  )}
                </div>
              </div>
            </section>
          ) : (
            <div className="account-empty">
              <NativeIcon name="user" size={22} />
              <p>No accounts yet. Add one to start playing.</p>
            </div>
          )}

          {others.length > 0 && (
            <>
              <span className="account-section-label">Switch to</span>
              <div className="account-list">
                {others.map((account) => (
                  <div className="account-card-item" key={account.id}>
                    <button
                      type="button"
                      className="account-card-left"
                      onClick={() => {
                        onSwitchAccount?.(account.id);
                        onClose?.();
                      }}
                    >
                      <PlayerAvatar
                        account={account}
                        uuid={account.uuid}
                        name={account.name}
                        kind="avatar"
                        size={34}
                        className="account-avatar-head"
                      />
                      <span className="account-card-text">
                        <span className="account-name-text">{account.name}</span>
                        <span className={`account-type-tag ${account.type === 'offline' ? 'offline' : ''}`}>
                          {accountKind(account)}
                        </span>
                      </span>
                    </button>

                    <button
                      type="button"
                      className="account-remove-btn"
                      title={`Remove ${account.name}`}
                      onClick={() => onRemoveAccount?.(account.id)}
                    >
                      <NativeIcon name="trash" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="account-add-divider" />

          <div className="account-add-row">
            <button
              type="button"
              className="account-ms-btn"
              onClick={addMicrosoft}
              disabled={busy}
            >
              <NativeIcon name="shield" size={15} />
              <span>Add Microsoft account</span>
            </button>

            {addingOffline ? (
              <div className="offline-input-row">
                <input
                  className="offline-input"
                  type="text"
                  value={offlineName}
                  autoFocus
                  maxLength={16}
                  placeholder="Username"
                  onChange={(event) => setOfflineName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') addOffline();
                    if (event.key === 'Escape') setAddingOffline(false);
                  }}
                />
                <button
                  type="button"
                  className="account-add-btn"
                  onClick={addOffline}
                  disabled={!nameValid || busy}
                >
                  Add
                </button>
                <button
                  type="button"
                  className="account-remove-btn"
                  onClick={() => setAddingOffline(false)}
                  title="Cancel"
                >
                  <NativeIcon name="close" size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="account-offline-btn"
                onClick={() => setAddingOffline(true)}
              >
                <NativeIcon name="user" size={15} />
                <span>Add offline account</span>
              </button>
            )}
          </div>

          {addingOffline && offlineName && !nameValid && (
            <p className="account-hint">
              <NativeIcon name="alert" size={13} />
              3 to 16 characters, letters, numbers and underscores only.
            </p>
          )}

          <p className="account-hint muted">
            <NativeIcon name="info" size={13} />
            Skins are shown for any account with a matching Minecraft username.
          </p>
        </div>
      </div>
    </div>
  );
}
