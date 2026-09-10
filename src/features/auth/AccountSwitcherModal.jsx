import React, { useEffect, useState } from 'react';
import { ArrowLeft, Github, Minus, X } from 'lucide-react';
import Logo from '../../components/ui/Logo.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import PlayerAvatar from '../../components/ui/PlayerAvatar.jsx';
import { preloadAccountAvatars } from '../../lib/skins.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import packageInfo from '../../../package.json';
import loginSide from '../../assets/noctra-login-side.png';
import './AccountSwitcherModal.css';

const OFFLINE_NAME = /^[A-Za-z0-9_]{3,16}$/;

export default function AccountSwitcherModal({
  open,
  firstRun = false,
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
  const [showOffline, setShowOffline] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) preloadAccountAvatars(accounts, 128);
  }, [open, accounts]);

  useEffect(() => {
    if (!open || firstRun) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, firstRun, onClose]);

  useEffect(() => {
    if (!open) {
      setOfflineName('');
      setShowOffline(false);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleAddMicrosoft = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await onAddMicrosoft?.();
      if (result && !result.ok) throw new Error(result.error || t('error.microsoftLogin'));
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
      const result = await onAddOffline?.(name);
      if (result && !result.ok) throw new Error(result.error || t('error.offlineAccount'));
      setOfflineName('');
    } catch (err) {
      setError(err?.message || t('error.offlineAccount'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-login-screen" role="dialog" aria-modal="true" aria-label={t('account.accounts')}>
      <header className="account-login-titlebar">
        <div className="account-login-build">
          <Logo height={11} variant="mark" />
          <span>Noctra Client</span>
          <i />
          <small>Build {window.native?.version || packageInfo.version}</small>
        </div>
        <div className="account-login-controls">
          <button type="button" onClick={() => window.native?.minimize()} aria-label={t('window.minimize')}><Minus size={14} /></button>
          <button type="button" onClick={() => window.native?.maximize()} aria-label={t('window.maximize')}><NativeIcon name="maximize" size={12} /></button>
          <button type="button" className="close" onClick={() => window.native?.close()} aria-label={t('common.close')}><X size={15} /></button>
        </div>
      </header>

      <div className="account-login-layout">
        <section className="account-login-panel">
          <div className="account-login-content">
            <Logo height={62} variant="mark" className="account-login-logo" />
            <h1>Noctra <strong>Client</strong></h1>

            {accounts.length > 0 && (
              <div className="account-login-existing">
                <span>{t('account.switch')}</span>
                <div className="account-login-list">
                  {accounts.map((account) => {
                    const active = account.id === activeId;
                    return (
                      <div
                        key={account.id}
                        className={`account-login-item ${active ? 'active' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSwitchAccount?.(account.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') onSwitchAccount?.(account.id);
                        }}
                      >
                        <PlayerAvatar account={account} kind="avatar" size={34} />
                        <span>
                          <strong>{account.name}</strong>
                          <small>{t(account.type === 'offline' ? 'account.offline' : 'account.microsoft')}</small>
                        </span>
                        {active && <NativeIcon name="check-circle" size={17} />}
                        <button
                          type="button"
                          title={t('account.remove')}
                          onClick={(event) => {
                            event.stopPropagation();
                            onRemoveAccount?.(account.id);
                          }}
                        >
                          <NativeIcon name="trash" size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button type="button" className="account-login-microsoft" onClick={handleAddMicrosoft} disabled={busy}>
              <span>{busy ? t('account.securing') : 'Log in with'}</span>
              <span className="account-login-ms-mark" aria-hidden="true"><i /><i /><i /><i /></span>
              <strong>Microsoft</strong>
            </button>

            <button type="button" className="account-login-offline-toggle" onClick={() => setShowOffline((value) => !value)}>
              {showOffline ? t('common.close') : t('account.offline')}
            </button>

            {showOffline && (
              <div className="account-login-offline">
                <input
                  value={offlineName}
                  maxLength={16}
                  autoFocus
                  placeholder={t('account.offlineUsername')}
                  onChange={(event) => {
                    setOfflineName(event.target.value);
                    setError('');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleAddOffline();
                  }}
                />
                <button type="button" onClick={handleAddOffline} disabled={busy || !offlineName.trim()}>
                  {t('account.addButton')}
                </button>
              </div>
            )}

            {error && <p className="account-login-error">{error}</p>}

            {accounts.length > 0 && !firstRun && (
              <button type="button" className="account-login-home" onClick={onClose}>
                <ArrowLeft size={17} />
                <span>Back to Home</span>
              </button>
            )}

            <button
              type="button"
              className="account-login-github"
              onClick={() => window.native?.openExternal?.('https://github.com/ohllama0909-alt/native-launcher')}
            >
              <span>View code</span>
              <Github size={20} />
              <strong>GitHub</strong>
            </button>

            <footer>
              <span>Privacy Policy</span><i /> <span>Terms of Service</span><i /> <span>Support</span>
            </footer>
          </div>
        </section>

        <aside className="account-login-art" aria-hidden="true">
          <img src={loginSide} alt="" />
        </aside>
      </div>
    </div>
  );
}
