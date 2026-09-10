import React, { useEffect, useMemo, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import PlayerAvatar from '../../components/ui/PlayerAvatar.jsx';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import { preloadAccountAvatars } from '../../lib/skins.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './AccountsPanel.css';

const OFFLINE_NAME = /^[A-Za-z0-9_]{3,16}$/;

const POSES = [
  { id: 'walk', key: 'account.pose.walk' },
  { id: 'run', key: 'account.pose.run' },
  { id: 'idle', key: 'account.pose.idle' },
  { id: 'fly', key: 'account.pose.fly' }
];

export default function AccountsPanel({
  accounts = [],
  activeId,
  onSwitchAccount,
  onAddMicrosoft,
  onAddOffline,
  onRemoveAccount
}) {
  const { t, formatNumber } = useI18n();
  const [pose, setPose] = useState('walk');
  const [paused, setPaused] = useState(false);
  const [spin, setSpin] = useState(true);
  const [offlineName, setOfflineName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const active = useMemo(
    () => accounts.find((account) => account.id === activeId) || accounts[0] || null,
    [accounts, activeId]
  );

  useEffect(() => {
    preloadAccountAvatars(accounts, 64);
  }, [accounts]);

  const addOffline = async () => {
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
    } catch {
      setError(t('error.offlineAccount'));
    } finally {
      setBusy(false);
    }
  };

  const addMicrosoft = async () => {
    setBusy(true);
    setError('');
    try {
      await onAddMicrosoft?.();
    } catch {
      setError(t('error.microsoftLogin'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="acc-panel">
      {/* ---------------- character stage ---------------- */}
      <section className="acc-stage-card">
        <div className="acc-stage-glow" />

        {active ? (
          <SkinViewer3D
            account={active}
            width={230}
            height={330}
            animation={pose}
            paused={paused}
            autoRotate={spin}
            className="acc-stage-viewer"
          />
        ) : (
          <div className="acc-stage-empty">
            <NativeIcon name="user" size={30} />
            <span>{t('account.noAccount')}</span>
          </div>
        )}

        <div className="acc-stage-name">{active?.name || t('account.signedOut')}</div>
        <div className="acc-stage-sub">
          {active ? t(active.type === 'offline' ? 'account.offlineLong' : 'account.microsoftLong') : t('account.addToPlay')}
        </div>

        <div className="acc-pose-row">
          {POSES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={'acc-pose-btn ' + (pose === entry.id ? 'active' : '')}
              onClick={() => setPose(entry.id)}
            >
              {t(entry.key)}
            </button>
          ))}
        </div>

        <div className="acc-stage-toggles">
          <button
            type="button"
            className={'acc-mini-toggle ' + (paused ? '' : 'active')}
            onClick={() => setPaused((value) => !value)}
          >
            <NativeIcon name={paused ? 'play' : 'stop'} size={13} />
            <span>{paused ? t('instances.play') : t('account.pause')}</span>
          </button>
          <button
            type="button"
            className={'acc-mini-toggle ' + (spin ? 'active' : '')}
            onClick={() => setSpin((value) => !value)}
          >
            <NativeIcon name="refresh" size={13} />
            <span>{t('account.rotate')}</span>
          </button>
        </div>
      </section>

      {/* ---------------- account list ---------------- */}
      <section className="acc-list-col">
        <div className="acc-list-head">
          <h3 className="acc-list-title">{t('account.yours')}</h3>
          <span className="acc-list-count">
            {t('account.count', { count: formatNumber(accounts.length) })}
          </span>
        </div>

        <div className="acc-list">
          {accounts.length === 0 && (
            <p className="acc-empty-text">
              {t('account.emptyLong')}
            </p>
          )}

          {accounts.map((account) => {
            const isActive = account.id === activeId;
            return (
              <div
                key={account.id}
                className={'acc-row ' + (isActive ? 'active' : '')}
                onClick={() => !isActive && onSwitchAccount?.(account.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !isActive) onSwitchAccount?.(account.id);
                }}
              >
                <PlayerAvatar kind="avatar" size={38} account={account} className="acc-row-avatar" />

                <div className="acc-row-text">
                  <span className="acc-row-name">{account.name}</span>
                  <span className="acc-row-meta">
                    {t(account.type === 'offline' ? 'account.offline' : 'account.microsoft')}
                    {isActive ? ` · ${t('account.active')}` : ''}
                  </span>
                </div>

                {isActive && <span className="acc-row-badge">{t('account.active')}</span>}

                <button
                  type="button"
                  className="acc-row-remove"
                  title={t('account.removeNamed', { name: account.name })}
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemoveAccount?.(account.id);
                  }}
                >
                  <NativeIcon name="trash" size={15} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="acc-add-block">
          <button type="button" className="acc-ms-btn" onClick={addMicrosoft} disabled={busy}>
            <NativeIcon name="shield" size={15} />
            <span>{t('account.signInMicrosoft')}</span>
          </button>

          <div className="acc-offline-row">
            <input
              className="acc-offline-input"
              type="text"
              value={offlineName}
              maxLength={16}
              placeholder={t('account.offlineUsername')}
              onChange={(event) => {
                setOfflineName(event.target.value);
                if (error) setError('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') addOffline();
              }}
            />
            <button
              type="button"
              className="acc-offline-btn"
              onClick={addOffline}
              disabled={busy || !offlineName.trim()}
            >
              <NativeIcon name="plus" size={15} />
              <span>{t('account.addButton')}</span>
            </button>
          </div>

          {error ? (
            <p className="acc-hint danger">{error}</p>
          ) : (
            <p className="acc-hint">{t('account.offlineHint')}</p>
          )}
        </div>
      </section>
    </div>
  );
}
