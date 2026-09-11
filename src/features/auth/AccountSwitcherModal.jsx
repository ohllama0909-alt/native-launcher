import React, { useEffect, useState } from 'react';
import { ArrowLeft, Github, Minus, Square, X } from 'lucide-react';
import Logo from '../../components/ui/Logo.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import BrandIcon from '../../components/ui/BrandIcon.jsx';
import PlayerAvatar from '../../components/ui/PlayerAvatar.jsx';
import { preloadAccountAvatars } from '../../lib/skins.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import packageInfo from '../../../package.json';
import loginSide from '../../assets/noctra-login-side.png';
import './AccountSwitcherModal.css';

const OFFLINE_NAME = /^[A-Za-z0-9_]{3,16}$/;

const COMMUNITY = {
  discord: 'https://discord.gg/noctra',
  x: 'https://x.com/noctraclient',
  instagram: 'https://instagram.com/noctraclient',
  youtube: 'https://youtube.com/@noctraclient',
  patreon: 'https://patreon.com/noctraclient'
};

const LEGAL = 'https://noctra.client';

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
  const [showAccounts, setShowAccounts] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (open) preloadAccountAvatars(accounts, 128);
  }, [open, accounts]);

  useEffect(() => {
    window.native?.onMaximizedChange?.(setIsMaximized);
  }, []);

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
      setShowAccounts(false);
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const openExternal = (url) => window.native?.openExternal?.(url);

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
      setShowOffline(false);
    } catch (err) {
      setError(err?.message || t('error.offlineAccount'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="account-login-screen" role="dialog" aria-modal="true" aria-label={t('account.accounts')}>
      <div className={`account-login-frame${isMaximized ? ' is-maximized' : ''}`}>
        <div className="account-login-drag-bar" />

        {/* Titlebar branding */}
        <div className="account-login-build">
          <Logo height={11} variant="mark" />
          <span>Noctra Client</span>
          <span className="account-login-dot">·</span>
          <small>Build {window.native?.version || packageInfo.version || '0.9.2'}</small>
        </div>

        {/* Window controls */}
        <div className="account-login-controls">
          <button type="button" onClick={() => window.native?.minimize()} aria-label={t('window.minimize')}>
            <Minus size={13} />
          </button>
          <button type="button" onClick={() => window.native?.maximize()} aria-label={t('window.maximize')}>
            <Square size={11} />
          </button>
          <button type="button" className="close" onClick={() => window.native?.close()} aria-label={t('common.close')}>
            <X size={14} />
          </button>
        </div>

        <div className="account-login-layout">
          {/* Left Hero Form Column */}
          <section className="account-login-panel">
            <div className="account-login-content">
              <Logo height={80} variant="mark" className="account-login-logo" />
              <h1 className="account-login-title">
                Noctra <strong>Client</strong>
              </h1>

              {/* Action buttons stack */}
              <div className="account-login-actions">
                <button
                  type="button"
                  className="account-login-microsoft"
                  onClick={handleAddMicrosoft}
                  disabled={busy}
                >
                  {busy ? (
                    <span className="account-login-btn-loading">
                      <NativeIcon name="refresh" size={18} className="is-spinning" />
                      <span>{t('account.securing') || 'Waiting for Microsoft...'}</span>
                    </span>
                  ) : (
                    <>
                      <span className="account-login-btn-lead">{t('account.logInWith')}</span>
                      <span className="account-login-ms-mark" aria-hidden="true">
                        <i /><i /><i /><i />
                      </span>
                      <strong className="account-login-btn-brand">Microsoft</strong>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="account-login-github"
                  onClick={() => openExternal('https://github.com/ohllama0909-alt/native-launch')}
                >
                  <span className="account-login-btn-lead">{t('account.viewCode')}</span>
                  <Github size={23} className="account-login-gh-mark" />
                  <strong className="account-login-btn-brand">GitHub</strong>
                </button>

                {/* Existing accounts switcher toggle / offline drawer */}
                <div className="account-login-secondary-actions">
                  {accounts.length > 0 && (
                    <button
                      type="button"
                      className="account-login-sec-btn"
                      onClick={() => setShowAccounts((v) => !v)}
                    >
                      <span>{showAccounts ? t('common.close') : `${t('account.switch')} (${accounts.length})`}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="account-login-sec-btn"
                    onClick={() => setShowOffline((v) => !v)}
                  >
                    <span>{showOffline ? t('common.close') : t('account.offline')}</span>
                  </button>
                </div>

                {/* Existing accounts drawer */}
                {showAccounts && accounts.length > 0 && (
                  <div className="account-login-existing">
                    <div className="account-login-list">
                      {accounts.map((acc) => {
                        const active = acc.id === activeId;
                        return (
                          <div
                            key={acc.id}
                            className={`account-login-item ${active ? 'active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              onSwitchAccount?.(acc.id);
                              setShowAccounts(false);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                onSwitchAccount?.(acc.id);
                                setShowAccounts(false);
                              }
                            }}
                          >
                            <PlayerAvatar account={acc} kind="avatar" size={28} />
                            <div className="account-login-item-text">
                              <strong>{acc.name}</strong>
                              <small>{acc.type === 'offline' ? 'Offline' : 'Microsoft'}</small>
                            </div>
                            {active && <NativeIcon name="check-circle" size={15} />}
                            <button
                              type="button"
                              className="account-login-item-remove"
                              title={t('account.remove')}
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveAccount?.(acc.id);
                              }}
                            >
                              <NativeIcon name="trash" size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Offline input form */}
                {showOffline && (
                  <div className="account-login-offline">
                    <input
                      value={offlineName}
                      maxLength={16}
                      autoFocus
                      placeholder={t('account.offlineUsername')}
                      onChange={(e) => {
                        setOfflineName(e.target.value);
                        setError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddOffline();
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddOffline}
                      disabled={busy || !offlineName.trim()}
                    >
                      {t('account.addButton')}
                    </button>
                  </div>
                )}

                {error && <div role="alert" className="account-login-error">{error}</div>}

                {accounts.length > 0 && !firstRun && (
                  <button type="button" className="account-login-home" onClick={onClose}>
                    <ArrowLeft size={16} />
                    <span>{t('account.backHome')}</span>
                  </button>
                )}
              </div>

              {/* Social links row */}
              <div className="account-login-social" role="group" aria-label={t('account.community') || 'Community'}>
                {['Discord', 'X', 'Instagram', 'YouTube', 'Patreon'].map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    title={brand}
                    aria-label={brand}
                    className="account-login-social-btn"
                    onClick={() => openExternal(COMMUNITY[brand.toLowerCase()])}
                  >
                    <BrandIcon name={brand.toLowerCase()} size={20} />
                  </button>
                ))}
              </div>

              {/* Legal navigation */}
              <footer>
                <button type="button" onClick={() => openExternal(`${LEGAL}/privacy`)}>
                  Privacy Policy
                </button>
                <span aria-hidden="true">·</span>
                <button type="button" onClick={() => openExternal(`${LEGAL}/terms`)}>
                  Terms of Service
                </button>
                <span aria-hidden="true">·</span>
                <button type="button" onClick={() => openExternal(`${LEGAL}/support`)}>
                  Support
                </button>
              </footer>
            </div>
          </section>

          {/* Right Artwork Panel */}
          <aside className="account-login-art" aria-hidden="true">
            <img src={loginSide} alt="A purple-lit Minecraft cavern with the Noctra mark" />
          </aside>
        </div>
      </div>
    </div>
  );
}
