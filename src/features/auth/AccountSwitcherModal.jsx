import React, { useEffect, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import PlayerAvatar from '../../components/ui/PlayerAvatar.jsx';
import { preloadAccountAvatars } from '../../lib/skins.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './AccountSwitcherModal.css';

const OFFLINE_NAME = /^[A-Za-z0-9_]{3,16}$/;

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
  const { t } = useI18n();
  const [offlineName, setOfflineName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Warm the avatar cache so switching accounts paints instantly.
  useEffect(() => {
    if (open) preloadAccountAvatars(accounts, 128);
  }, [open, accounts]);

  useEffect(() => {
    if (!open) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setOfflineName('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const active = accounts.find((account) => account.id === activeId) || accounts[0] || null;

  const handleAddMicrosoft = async () => {
    setBusy(true);
    setError('');
    try {
      await onAddMicrosoft?.();
    } catch (err) {
      setError(err?.message || t('error.microsoftLogin'));
    } finally {
      setBusy(false);
    }
  };

  const handleAddOffline = async () => {
    const name = offlineName.trim();

    if (!OFFLINE_NAME.test(name)) {
      setError(t('error.offlineName'));
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onAddOffline?.(name);
      setOfflineName('');
    } catch (err) {
      setError(err?.message || t('error.offlineAccount'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="account-switcher-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="account-switcher-box" role="dialog" aria-label={t('account.accounts')}>
        <header className="account-switcher-header">
          <h2 className="account-switcher-title">{t('account.accounts')}</h2>
          <button type="button" className="account-switcher-close" onClick={onClose} title={t('common.close')}>
            <NativeIcon name="close" size={16} />
          </button>
        </header>

        <div className="account-switcher-body">
          {active ? (
            <div className="account-hero">
              <PlayerAvatar account={active} kind="avatar" size={64} className="account-hero-avatar" />
              <div className="account-hero-info">
                <span className="account-hero-label">{t('account.signedInAs')}</span>
                <span className="account-hero-name">{active.name}</span>
                <div className="account-hero-tags">
                  <span className={'account-type-tag ' + (active.type === 'offline' ? 'offline' : '')}>
                    {t(active.type === 'offline' ? 'account.offline' : 'account.microsoft')}
                  </span>
                  {active.uuid && <span className="account-hero-uuid">{String(active.uuid).slice(0, 8)}</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="account-empty">
              <NativeIcon name="user" size={22} />
              <p>{t('account.empty')}</p>
            </div>
          )}

          {accounts.length > 0 && (
            <>
              <span className="account-section-label">{t('account.switch')}</span>

              <div className="account-list">
                {accounts.map((account) => {
                  const isActive = account.id === activeId;
                  return (
                    <div
                      key={account.id}
                      className={'account-card-item ' + (isActive ? 'active' : '')}
                      onClick={() => {
                        if (!isActive) onSwitchAccount?.(account.id);
                      }}
                    >
                      <div className="account-card-left">
                        <PlayerAvatar
                          account={account}
                          kind="avatar"
                          size={34}
                          className="account-avatar-head"
                        />
                        <div className="account-card-text">
                          <span className="account-name-text">{account.name}</span>
                          <span className={'account-type-tag ' + (account.type === 'offline' ? 'offline' : '')}>
                            {t(account.type === 'offline' ? 'account.offline' : 'account.microsoft')}
                          </span>
                        </div>
                      </div>

                      <div className="account-card-right">
                        {isActive && <NativeIcon name="check-circle" size={16} />}
                        <button
                          type="button"
                          className="account-remove-btn"
                          title={t('account.remove')}
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemoveAccount?.(account.id);
                          }}
                        >
                          <NativeIcon name="trash" size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div className="account-add-divider" />

          <span className="account-section-label">{t('account.add')}</span>

          <div className="account-add-row">
            <button type="button" className="account-ms-btn" onClick={handleAddMicrosoft} disabled={busy}>
              <NativeIcon name="shield" size={15} />
              <span>{t('account.signInMicrosoft')}</span>
            </button>
          </div>

          <div className="offline-input-row">
            <input
              className="offline-input"
              placeholder={t('account.offlineUsername')}
              value={offlineName}
              maxLength={16}
              onChange={(event) => {
                setOfflineName(event.target.value);
                if (error) setError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleAddOffline();
              }}
            />
            <button
              type="button"
              className="account-offline-btn"
              onClick={handleAddOffline}
              disabled={busy || !offlineName.trim()}
            >
              <NativeIcon name="plus" size={15} />
              <span>{t('account.addButton')}</span>
            </button>
          </div>

          {error ? (
            <p className="account-hint danger">{error}</p>
          ) : (
            <p className="account-hint muted">
              {t('account.offlineHint')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
