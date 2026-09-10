import React, { useEffect, useMemo, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import PlayerAvatar from '../../components/ui/PlayerAvatar.jsx';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import { preloadAccountAvatars } from '../../lib/skins.js';
import './AccountsPanel.css';

const OFFLINE_NAME = /^[A-Za-z0-9_]{3,16}$/;

const POSES = [
  { id: 'walk', label: 'Walk' },
  { id: 'run', label: 'Run' },
  { id: 'idle', label: 'Idle' },
  { id: 'fly', label: 'Fly' }
];

export default function AccountsPanel({
  accounts = [],
  activeId,
  onSwitchAccount,
  onAddMicrosoft,
  onAddOffline,
  onRemoveAccount
}) {
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
      setError('Use 3 to 16 letters, numbers or underscores.');
      return;
    }

    setBusy(true);
    setError('');
    try {
      await onAddOffline?.(name);
      setOfflineName('');
    } catch {
      setError('Could not add that account.');
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
      setError('Microsoft sign-in was cancelled.');
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
            <span>No account yet</span>
          </div>
        )}

        <div className="acc-stage-name">{active?.name || 'Signed out'}</div>
        <div className="acc-stage-sub">
          {active ? (active.type === 'offline' ? 'Offline account' : 'Microsoft account') : 'Add an account to play'}
        </div>

        <div className="acc-pose-row">
          {POSES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={'acc-pose-btn ' + (pose === entry.id ? 'active' : '')}
              onClick={() => setPose(entry.id)}
            >
              {entry.label}
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
            <span>{paused ? 'Play' : 'Pause'}</span>
          </button>
          <button
            type="button"
            className={'acc-mini-toggle ' + (spin ? 'active' : '')}
            onClick={() => setSpin((value) => !value)}
          >
            <NativeIcon name="refresh" size={13} />
            <span>Rotate</span>
          </button>
        </div>
      </section>

      {/* ---------------- account list ---------------- */}
      <section className="acc-list-col">
        <div className="acc-list-head">
          <h3 className="acc-list-title">Your accounts</h3>
          <span className="acc-list-count">
            {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
          </span>
        </div>

        <div className="acc-list">
          {accounts.length === 0 && (
            <p className="acc-empty-text">
              Sign in with Microsoft to play online, or create an offline profile for singleplayer
              and LAN worlds.
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
                    {account.type === 'offline' ? 'Offline' : 'Microsoft'}
                    {isActive ? ' - active' : ''}
                  </span>
                </div>

                {isActive && <span className="acc-row-badge">Active</span>}

                <button
                  type="button"
                  className="acc-row-remove"
                  title={'Remove ' + account.name}
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
            <span>Sign in with Microsoft</span>
          </button>

          <div className="acc-offline-row">
            <input
              className="acc-offline-input"
              type="text"
              value={offlineName}
              maxLength={16}
              placeholder="Offline username"
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
              <span>Add</span>
            </button>
          </div>

          {error ? (
            <p className="acc-hint danger">{error}</p>
          ) : (
            <p className="acc-hint">Offline profiles cannot join servers that require authentication.</p>
          )}
        </div>
      </section>
    </div>
  );
}
