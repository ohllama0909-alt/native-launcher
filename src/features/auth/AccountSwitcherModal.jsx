import React, { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import SteveAvatar from '../../assets/steve.png';
import './AccountSwitcherModal.css';

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
  const [loadingMs, setLoadingMs] = useState(false);

  if (!open) return null;

  const handleAddMs = async () => {
    setLoadingMs(true);
    try {
      await onAddMicrosoft();
    } finally {
      setLoadingMs(false);
    }
  };

  const handleAddOfflineSubmit = (e) => {
    e.preventDefault();
    if (offlineName.trim()) {
      onAddOffline(offlineName.trim());
      setOfflineName('');
    }
  };

  return (
    <div className="account-switcher-backdrop" onClick={onClose}>
      <div className="account-switcher-box" onClick={(e) => e.stopPropagation()}>
        <div className="account-switcher-header">
          <span className="account-switcher-title">Accounts</span>
          <button className="icon-ctrl-btn" onClick={onClose}>
            <Icon name="x" size={15} />
          </button>
        </div>

        <div className="account-switcher-body">
          <div className="account-list">
            {accounts.map((acc) => {
              const isActive = acc.id === activeId;
              const avatarUrl = acc.uuid
                ? `https://crafatar.com/avatars/${acc.uuid}?size=64&overlay`
                : SteveAvatar;

              return (
                <div
                  key={acc.id}
                  className={`account-card-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    onSwitchAccount(acc.id);
                    onClose();
                  }}
                >
                  <div className="account-card-left">
                    <img
                      src={avatarUrl}
                      alt={acc.name}
                      className="account-avatar-head"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = SteveAvatar;
                      }}
                    />
                    <div>
                      <div className="account-name-text">{acc.name}</div>
                      <div className="account-type-tag">
                        {acc.type === 'microsoft' ? 'Microsoft Account' : 'Offline Account'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isActive && <span className="badge-installed">Active</span>}
                    <button
                      className="icon-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAccount(acc.id);
                      }}
                      title="Remove Account"
                    >
                      <Icon name="trash-01" size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="account-add-divider" />

          <div className="account-add-row">
            <button
              className="sub-btn brand-btn"
              onClick={handleAddMs}
              disabled={loadingMs}
              style={{ justifyContent: 'center' }}
            >
              <Icon name="plus" size={14} />
              <span>{loadingMs ? 'Opening Microsoft Login...' : 'Add Microsoft Account'}</span>
            </button>

            <form className="offline-input-row" onSubmit={handleAddOfflineSubmit}>
              <input
                type="text"
                className="text-input"
                style={{ flex: 1 }}
                placeholder="Offline Username"
                value={offlineName}
                onChange={(e) => setOfflineName(e.target.value)}
              />
              <button type="submit" className="sub-btn">
                Add Offline
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
