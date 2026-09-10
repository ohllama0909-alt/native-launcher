import React, { useCallback, useEffect, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import OfficialCapes from './OfficialCapes.jsx';
import './AccountsView.css';

const EMPTY_SLOTS = Array.from({ length: 3 }, () => ({}));

function MiniPlayer({ account, slot, size = 'card', interactive = false }) {
  const preview = {
    ...account,
    skinUrl: slot?.skinUrl || account?.skinUrl,
    capeUrl: slot?.capeUrl || account?.capeUrl,
    model: slot?.model || account?.model
  };
  return (
    <div className={`skin-mini skin-mini-${size}`}>
      <SkinViewer3D
        account={preview}
        width={size === 'large' ? 220 : 130}
        height={size === 'large' ? 320 : 170}
        animation={null}
        autoRotate={false}
        className={interactive ? 'interactive-skin' : ''}
      />
    </div>
  );
}

export default function AccountsView({ account, onNotify, onWardrobeChanged }) {
  const [wardrobe, setWardrobe] = useState(null);
  const [busy, setBusy] = useState('');
  const [official, setOfficial] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [focused, setFocused] = useState(null);
  const [savedFolded, setSavedFolded] = useState(false);

  const loadWardrobe = useCallback(async () => {
    if (!account?.id || account.id === 'guest') return setWardrobe(null);
    setWardrobe(await window.native?.wardrobe?.get(account));
  }, [account?.id]);

  const loadOfficial = useCallback(async () => {
    if (!account?.isMicrosoft) {
      setOfficial(null);
      setProfileError('');
      return;
    }
    const result = await window.native?.wardrobe?.officialProfile(account);
    if (!result?.ok) throw new Error(result?.error || 'Could not load your Minecraft profile.');
    setOfficial(result.profile);
    setProfileError('');
  }, [account?.id, account?.isMicrosoft]);

  useEffect(() => {
    loadWardrobe().catch(() => setWardrobe(null));
  }, [loadWardrobe]);

  useEffect(() => {
    loadOfficial().catch((error) => {
      setOfficial(null);
      setProfileError(error.message);
    });
  }, [loadOfficial]);

  useEffect(() => {
    setFocused(null);
  }, [account?.id]);

  const run = async (key, task, title, fallback, onError) => {
    setBusy(key);
    try {
      await task();
    } catch (error) {
      onError?.(error);
      onNotify?.(title, error?.message || fallback);
    } finally {
      setBusy('');
    }
  };

  const captureProfileError = (error) => setProfileError(error?.message || '');
  const apply = (next) => {
    if (next) {
      setWardrobe(next);
      onWardrobeChanged?.(next);
    }
  };

  const choose = (kind, slot) =>
    run(
      `${kind}-${slot}`,
      async () => {
        apply(
          await window.native?.wardrobe?.choose({
            account,
            kind,
            slot,
            model: wardrobe?.slots?.[slot]?.model || 'classic'
          })
        );
      },
      'Wardrobe',
      'Could not import that PNG.'
    );

  const select = (slot) =>
    run(
      `select-${slot}`,
      async () => apply(await window.native?.wardrobe?.select(account, slot)),
      'Wardrobe',
      'Could not select that outfit.'
    );

  const setModel = (slot, model) =>
    run(
      `model-${slot}`,
      async () => {
        apply(await window.native?.wardrobe?.setModel(account, slot, model));
      },
      'Wardrobe',
      'Could not change player model.'
    );

  const sync = () =>
    run(
      'sync',
      async () => {
        await window.native?.wardrobe?.sync(account);
        onNotify?.('Wardrobe synced', 'Your selected outfit is available to connected Fabric instances.');
      },
      'Sync unavailable',
      'The skin service could not be reached.'
    );

  const publishOfficial = (slot) =>
    run(
      `official-${slot}`,
      async () => {
        const result = await window.native?.wardrobe?.applyOfficialSkin(account, slot);
        if (!result?.ok) throw new Error(result?.error || 'Minecraft rejected the skin update.');
        if (result.profile) setOfficial(result.profile);
        setProfileError('');
        onNotify?.('Minecraft skin updated', 'The skin is now active on your official Minecraft profile.');
      },
      'Minecraft profile',
      'Minecraft rejected the skin update.',
      captureProfileError
    );

  const activateCape = (capeId) =>
    run(
      `cape-${capeId || 'none'}`,
      async () => {
        const result = await window.native?.wardrobe?.activateOfficialCape(account, capeId);
        if (!result?.ok) throw new Error(result?.error || 'Minecraft rejected the cape update.');
        const refreshed = result.profile ? result : await window.native.wardrobe.officialProfile(account);
        if (refreshed?.profile) setOfficial(refreshed.profile);
        setProfileError('');
        onNotify?.('Minecraft cape updated', capeId ? 'Your official cape is now active.' : 'Your official cape is hidden.');
      },
      'Minecraft profile',
      'Minecraft rejected the cape update.',
      captureProfileError
    );

  const refreshOfficial = () =>
    run('official-refresh', loadOfficial, 'Minecraft profile', 'Could not load your Minecraft profile.', captureProfileError);

  if (!account?.id || account.id === 'guest') {
    return (
      <div className="wardrobe-view" data-testid="wardrobe-view">
        <header className="wardrobe-header">
          <div>
            <h1 className="wardrobe-title">Wardrobe</h1>
            <p className="wardrobe-subtitle">Sign in to customize outfits, skins, and capes.</p>
          </div>
        </header>
        <div className="wardrobe-empty-state" data-testid="wardrobe-empty-state">
          <div className="wardrobe-empty-icon">
            <NativeIcon name="user" size={28} />
          </div>
          <h2>No player selected</h2>
          <p>Open the account switcher from the top-right avatar in the title bar to start dressing up.</p>
        </div>
      </div>
    );
  }

  const slots = wardrobe?.slots || EMPTY_SLOTS;
  const selected = wardrobe?.selected ?? 0;
  const current = focused ?? selected;
  const selectedSlot = slots[current] || {};
  const currentModel = selectedSlot.model === 'slim' ? 'slim' : 'classic';
  const nextEmptySlot = slots.findIndex((slot) => !slot.hasSkin && !slot.hasCape);
  const filledCount = slots.filter((slot) => slot.hasSkin || slot.hasCape).length;

  return (
    <div className="wardrobe-view" data-testid="wardrobe-view">
      {/* Page Header matching other Native views */}
      <header className="wardrobe-header">
        <div>
          <h1 className="wardrobe-title">Wardrobe</h1>
          <p className="wardrobe-subtitle">
            Custom skins and capes for <strong>{account?.name || 'Player'}</strong>. Click an outfit to preview, double-click to wear.
          </p>
        </div>
        <div className="wardrobe-header-actions">
          <button
            type="button"
            className="wardrobe-sync-chip"
            data-testid="wardrobe-sync-btn"
            onClick={sync}
            disabled={Boolean(busy)}
            title="Sync active outfit to Fabric instances"
          >
            <NativeIcon
              name={busy === 'sync' ? 'loader' : 'refresh'}
              size={14}
              className={busy === 'sync' ? 'wardrobe-spin' : ''}
            />
            <span>Sync to Fabric</span>
          </button>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div className="wardrobe-layout">
        {/* Left Column: 3D Stage Card */}
        <aside className="wardrobe-stage-card">
          <div className="wardrobe-stage-glow" />

          <div className="wardrobe-nametag">
            <span className="nametag-dot" />
            <span>{account?.name || 'Player'}</span>
          </div>

          <div className="wardrobe-viewer-wrap">
            <MiniPlayer
              account={account}
              slot={selectedSlot}
              size="large"
              interactive
            />
          </div>

          <div className="wardrobe-rotate-hint">
            <NativeIcon name="move" size={13} />
            <span>Drag to rotate</span>
          </div>

          <div className="wardrobe-model-toggle" role="group" aria-label="Player arm model">
            <button
              type="button"
              className={`wardrobe-model-btn ${currentModel === 'classic' ? 'active' : ''}`}
              onClick={() => setModel(current, 'classic')}
              disabled={Boolean(busy)}
            >
              Classic (4px)
            </button>
            <button
              type="button"
              className={`wardrobe-model-btn ${currentModel === 'slim' ? 'active' : ''}`}
              onClick={() => setModel(current, 'slim')}
              disabled={Boolean(busy)}
            >
              Slim (3px)
            </button>
          </div>

          <div className="wardrobe-stage-actions">
            <button
              type="button"
              className={`wardrobe-btn ${selected === current ? 'is-active' : 'primary'}`}
              onClick={() => select(current)}
              disabled={selected === current || Boolean(busy)}
            >
              <NativeIcon
                name={busy === `select-${current}` ? 'loader' : 'check'}
                size={15}
                className={busy === `select-${current}` ? 'wardrobe-spin' : ''}
              />
              <span>{selected === current ? 'Currently wearing' : 'Wear this outfit'}</span>
            </button>

            <div className="wardrobe-dual-row">
              <button
                type="button"
                className="wardrobe-btn ghost"
                onClick={() => choose('skin', current)}
                disabled={Boolean(busy)}
              >
                <NativeIcon
                  name={busy?.startsWith('skin-') ? 'loader' : 'user'}
                  size={14}
                  className={busy?.startsWith('skin-') ? 'wardrobe-spin' : ''}
                />
                <span>{selectedSlot.hasSkin ? 'Change skin' : 'Add skin'}</span>
              </button>

              <button
                type="button"
                className="wardrobe-btn ghost"
                onClick={() => choose('cape', current)}
                disabled={Boolean(busy)}
              >
                <NativeIcon
                  name={busy?.startsWith('cape-') ? 'loader' : 'image'}
                  size={14}
                  className={busy?.startsWith('cape-') ? 'wardrobe-spin' : ''}
                />
                <span>{selectedSlot.hasCape ? 'Change cape' : 'Add cape'}</span>
              </button>
            </div>

            {account?.isMicrosoft && selectedSlot.hasSkin && (
              <button
                type="button"
                className="wardrobe-btn subtle"
                onClick={() => publishOfficial(current)}
                disabled={Boolean(busy)}
              >
                <NativeIcon
                  name={busy === `official-${current}` ? 'loader' : 'upload'}
                  size={13}
                  className={busy === `official-${current}` ? 'wardrobe-spin' : ''}
                />
                <span>Apply to official Minecraft profile</span>
              </button>
            )}
          </div>
        </aside>

        {/* Right Column: Library & Management */}
        <main className="wardrobe-library">
          {/* Foldable Saved skins Section */}
          <section className="skin-section-card" aria-labelledby="saved-skins-heading">
            <div className="skin-section-bar">
              <button
                type="button"
                id="saved-skins-heading"
                className="skin-section-toggle"
                onClick={() => setSavedFolded((prev) => !prev)}
                aria-expanded={!savedFolded}
              >
                <NativeIcon
                  name={savedFolded ? 'chevron-down' : 'chevron-up'}
                  size={18}
                  className={`section-chevron ${savedFolded ? 'is-folded' : ''}`}
                />
                <span className="skin-section-heading">Saved skins</span>
                <span className="skin-section-badge">
                  {filledCount} / {slots.length} outfits
                </span>
              </button>

              <button
                type="button"
                className="skin-fold-btn"
                onClick={() => setSavedFolded((prev) => !prev)}
                aria-label={savedFolded ? 'Unfold saved skins' : 'Fold saved skins'}
              >
                {savedFolded ? 'Unfold' : 'Fold'}
              </button>
            </div>

            {!savedFolded ? (
              <div className="skin-grid saved-grid">
                {/* Add skin tile */}
                <button
                  type="button"
                  className="skin-tile add-tile"
                  onClick={() => {
                    const target = nextEmptySlot !== -1 ? nextEmptySlot : current;
                    setFocused(target);
                    choose('skin', target);
                  }}
                  disabled={Boolean(busy)}
                >
                  <div className="add-tile-icon">
                    <NativeIcon
                      name={busy?.startsWith('skin-') ? 'loader' : 'plus'}
                      size={22}
                      className={busy?.startsWith('skin-') ? 'wardrobe-spin' : ''}
                    />
                  </div>
                  <strong>Add skin</strong>
                  <span>Import PNG file</span>
                </button>

                {/* Outfit slot tiles */}
                {slots.map((slot, index) => {
                  const occupied = slot.hasSkin || slot.hasCape;
                  const isFocused = current === index;
                  const isWearing = selected === index;

                  return (
                    <button
                      key={index}
                      type="button"
                      aria-label={`Outfit ${index + 1}${isWearing ? ' (Wearing)' : ''}`}
                      className={`skin-tile saved-skin ${isFocused ? 'selected' : ''} ${occupied ? 'has-skin' : 'empty-slot'}`}
                      onClick={() => setFocused(index)}
                      onDoubleClick={() => select(index)}
                    >
                      {occupied ? (
                        <div className="skin-tile-preview">
                          <MiniPlayer account={account} slot={slot} size="card" />
                        </div>
                      ) : (
                        <div className="skin-tile-empty-placeholder">
                          <NativeIcon name="user" size={32} />
                          <span>Empty slot</span>
                        </div>
                      )}

                      {isWearing && (
                        <span className="selected-check" title="Currently wearing">
                          <NativeIcon name="check" size={13} />
                        </span>
                      )}

                      <div className="skin-card-info">
                        <span className="skin-card-name">Outfit {index + 1}</span>
                        <span className="skin-card-tag">
                          {slot.hasSkin ? (slot.model === 'slim' ? 'Slim model' : 'Classic model') : 'Ready for skin'}
                          {slot.hasCape ? ' · Cape' : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div
                className="skin-folded-summary"
                role="button"
                tabIndex={0}
                onClick={() => setSavedFolded(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSavedFolded(false);
                  }
                }}
              >
                <NativeIcon name="info" size={14} />
                <span>Saved skins folded ({filledCount} ready). Click to unfold.</span>
              </div>
            )}
          </section>

          {/* Official Minecraft capes for Microsoft accounts */}
          {account?.isMicrosoft && (
            <OfficialCapes
              official={official}
              error={profileError}
              busy={busy}
              onRefresh={refreshOfficial}
              onActivate={activateCape}
            />
          )}
        </main>
      </div>
    </div>
  );
}
