import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, CloudDownload, FlipHorizontal2, GripVertical, Loader, Play, RotateCw, Star, Upload } from 'lucide-react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import PlayerAvatar from '../../components/ui/PlayerAvatar.jsx';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import ContextMenu from '../../components/ui/ContextMenu.jsx';
import { detectSkinModel, readFileAsDataUrl } from '../../lib/skins.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './LockerView.css';

const PAGE_SIZE = { capes: 6, favorites: 4, latest: 6 };

/** One page of a horizontally paged row. */
function usePager(length, size) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(length / size));

  useEffect(() => {
    setPage((current) => Math.min(current, pages - 1));
  }, [pages]);

  return {
    page: Math.min(page, pages - 1),
    pages,
    canBack: page > 0,
    canForward: page < pages - 1,
    back: () => setPage((current) => Math.max(0, current - 1)),
    forward: () => setPage((current) => Math.min(pages - 1, current + 1)),
    slice: (items) => items.slice(page * size, page * size + size)
  };
}

function RowHeading({ title, hint, pager, children }) {
  return (
    <header className="locker-row-head">
      <h2>{title}</h2>
      {hint ? <span className="locker-row-hint">{hint}</span> : null}
      <div className="locker-row-tools">
        {children}
        {pager && pager.pages > 1 ? (
          <span className="locker-pager">
            <button type="button" onClick={pager.back} disabled={!pager.canBack} aria-label="Previous">
              <ChevronLeft size={16} />
            </button>
            <button type="button" onClick={pager.forward} disabled={!pager.canForward} aria-label="Next">
              <ChevronRight size={16} />
            </button>
          </span>
        ) : null}
      </div>
    </header>
  );
}

/** Star toggle used by the favourite and latest cards. */
function StarButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      className={`locker-star${active ? ' is-on' : ''}`}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      aria-pressed={active}
      aria-label={label}
      title={label}
    >
      <Star size={13} strokeWidth={2.2} fill={active ? 'currentColor' : 'none'} />
    </button>
  );
}

export default function LockerView({
  account,
  onNotify,
  onWardrobeChanged,
  onOpenAccountSwitcher
}) {
  const { t } = useI18n();
  const [wardrobe, setWardrobe] = useState(null);
  const [official, setOfficial] = useState(null);
  const [officialError, setOfficialError] = useState('');
  const [busy, setBusy] = useState('');
  const [dragging, setDragging] = useState(false);
  const [menu, setMenu] = useState(null);
  const [spin, setSpin] = useState(false);
  const viewerRef = useRef(null);
  const dragDepth = useRef(0);
  const fileInput = useRef(null);
  const pendingKind = useRef('skin');

  const signedIn = Boolean(account?.id) && account.id !== 'guest';
  const isMicrosoft = Boolean(account?.isMicrosoft);

  const apply = useCallback(
    (next) => {
      if (!next) return;
      setWardrobe(next);
      onWardrobeChanged?.(next);
    },
    [onWardrobeChanged]
  );

  const load = useCallback(async () => {
    if (!signedIn) {
      setWardrobe(null);
      return;
    }
    apply(await window.native?.wardrobe?.get(account));
  }, [account, signedIn, apply]);

  const loadOfficial = useCallback(async () => {
    if (!isMicrosoft) {
      setOfficial(null);
      setOfficialError('');
      return;
    }
    const result = await window.native?.wardrobe?.officialProfile(account);
    if (!result?.ok) throw new Error(result?.error || t('locker.officialFailed'));
    setOfficial(result.profile);
    setOfficialError('');
  }, [account, isMicrosoft, t]);

  useEffect(() => {
    load().catch(() => setWardrobe(null));
  }, [load]);

  useEffect(() => {
    loadOfficial().catch((error) => {
      setOfficial(null);
      setOfficialError(error.message);
    });
  }, [loadOfficial]);

  const run = async (key, task, { okMessage, title, fallback } = {}) => {
    setBusy(key);
    try {
      const result = await task();
      if (okMessage) onNotify?.(title || t('locker.title'), okMessage);
      return result;
    } catch (error) {
      onNotify?.(title || t('locker.title'), error?.message || fallback || t('locker.actionFailed'));
      return null;
    } finally {
      setBusy('');
    }
  };

  const items = wardrobe?.items || [];
  const skins = useMemo(() => items.filter((item) => item.kind === 'skin'), [items]);
  const localCapes = useMemo(() => items.filter((item) => item.kind === 'cape'), [items]);
  const favorites = useMemo(() => items.filter((item) => item.favorite), [items]);
  const latest = useMemo(
    () => [...skins].sort((a, b) => b.createdAt - a.createdAt),
    [skins]
  );
  const activeSkin = wardrobe?.active?.skin || null;
  const activeCape = wardrobe?.active?.cape || null;

  // One "none" tile plus the local capes, then the player's official capes.
  const officialCapes = isMicrosoft ? official?.capes || [] : [];
  const capeTiles = useMemo(
    () => [
      { id: '__none__', kind: 'none' },
      ...localCapes.map((item) => ({ id: item.id, kind: 'local', item })),
      ...officialCapes.map((cape) => ({ id: cape.id, kind: 'official', cape }))
    ],
    [localCapes, officialCapes]
  );

  const capePager = usePager(capeTiles.length, PAGE_SIZE.capes);
  const favoritePager = usePager(favorites.length, PAGE_SIZE.favorites);
  const latestPager = usePager(latest.length, PAGE_SIZE.latest);

  /* ---- actions ---- */

  const uploadFiles = async (files, kind = 'skin') => {
    const file = files?.[0];
    if (!file) return;
    if (!/\.png$/i.test(file.name) && file.type !== 'image/png') {
      onNotify?.(t('locker.uploadTitle'), t('locker.uploadNotPng'));
      return;
    }
    await run(
      'upload',
      async () => {
        const dataUrl = await readFileAsDataUrl(file);
        const model = kind === 'skin' ? await detectSkinModel(dataUrl) : 'classic';
        const next = await window.native?.wardrobe?.upload(account, kind, dataUrl, {
          name: file.name.replace(/\.png$/i, ''),
          model
        });
        apply(next);
        return next;
      },
      { okMessage: t('locker.uploadDone', { name: file.name.replace(/\.png$/i, '') }), title: t('locker.uploadTitle') }
    );
  };

  const browseFor = (kind) => {
    pendingKind.current = kind;
    fileInput.current?.click();
  };

  const applyItem = (id) =>
    run(`apply-${id}`, async () => apply(await window.native?.wardrobe?.apply(account, id)), {
      title: t('locker.title')
    });

  const toggleFavorite = (item) =>
    run(`fav-${item.id}`, async () => apply(await window.native?.wardrobe?.favorite(account, item.id, !item.favorite)), {
      title: t('locker.title')
    });

  const removeItem = (item) =>
    run(`remove-${item.id}`, async () => apply(await window.native?.wardrobe?.remove(account, item.id)), {
      okMessage: t('locker.removed', { name: item.name }),
      title: t('locker.title')
    });

  const exportItem = (item) =>
    run(`export-${item.id || 'active'}`, async () => {
      const result = await window.native?.wardrobe?.export(account, item?.id || null);
      if (result?.canceled) return null;
      return result;
    }, {
      okMessage: t('locker.exported'),
      title: t('locker.title'),
      fallback: t('locker.exportFailed')
    });

  const setModel = (model) =>
    run('model', async () => apply(await window.native?.wardrobe?.setModel(account, model)), {
      title: t('locker.title')
    });

  const activateCape = (id) =>
    run(`cape-${id || 'none'}`, async () => {
      if (id === '__none__' || id === null) {
        apply(await window.native?.wardrobe?.clearActive(account, 'cape'));
        return;
      }
      const local = localCapes.find((item) => item.id === id);
      if (local) {
        apply(await window.native?.wardrobe?.apply(account, id));
        return;
      }
      const result = await window.native?.wardrobe?.activateOfficialCape(account, id);
      if (!result?.ok) throw new Error(result?.error || t('locker.officialFailed'));
      if (result.profile) setOfficial(result.profile);
    }, { title: t('locker.capes'), fallback: t('locker.officialFailed') });

  const publishSkin = (item) =>
    run(`publish-${item?.id || 'active'}`, async () => {
      const result = await window.native?.wardrobe?.applyOfficialSkin(account, item?.id || null);
      if (!result?.ok) throw new Error(result?.error || t('locker.officialFailed'));
      if (result.profile) setOfficial(result.profile);
      return result;
    }, {
      okMessage: t('locker.published'),
      title: t('locker.currentSkin'),
      fallback: t('locker.officialFailed')
    });

  const syncToCloud = () =>
    run('sync', async () => window.native?.wardrobe?.sync(account), {
      okMessage: t('locker.synced'),
      title: t('locker.title'),
      fallback: t('locker.syncFailed')
    });

  const openMenu = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    setMenu({
      x: event.clientX,
      y: event.clientY,
      title: item.name,
      items: [
        { label: t('locker.apply'), icon: 'check', action: () => applyItem(item.id) },
        {
          label: item.favorite ? t('locker.unfavorite') : t('locker.favorite'),
          icon: item.favorite ? 'x' : 'check-circle',
          action: () => toggleFavorite(item)
        },
        ...(item.kind === 'skin' && isMicrosoft
          ? [{ label: t('locker.publish'), icon: 'rocket', action: () => publishSkin(item) }]
          : []),
        { label: t('locker.export'), icon: 'download', action: () => exportItem(item) },
        { label: t('common.remove'), icon: 'trash', action: () => removeItem(item) }
      ]
    });
  };

  /* ---- drag & drop ---- */

  const onDragEnter = (event) => {
    event.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragLeave = (event) => {
    event.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (event) => {
    event.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    uploadFiles(event.dataTransfer?.files, 'skin');
  };

  /* ---- signed-out state ---- */

  if (!signedIn) {
    return (
      <div className="locker-view">
        <header className="locker-head">
          <div>
            <h1>{t('locker.title')}</h1>
            <p>{t('locker.subtitle')}</p>
          </div>
        </header>
        <div className="locker-signed-out">
          <span className="locker-signed-out-icon"><NativeIcon name="user" size={26} /></span>
          <h2>{t('locker.noAccount')}</h2>
          <p>{t('locker.noAccountBody')}</p>
          <button type="button" className="locker-btn is-primary" onClick={onOpenAccountSwitcher}>
            <NativeIcon name="user" size={16} />
            <span>{t('account.accounts')}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`locker-view${dragging ? ' is-dropping' : ''}`}
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="locker-head">
        <div>
          <h1>{t('locker.title')}</h1>
          <p>{t('locker.subtitle')}</p>
        </div>

        <div className="locker-head-actions">
          <button type="button" className="locker-account-chip" onClick={onOpenAccountSwitcher} title={t('account.switch')}>
            <PlayerAvatar account={account} kind="avatar" size={28} />
            <span>{account?.name}</span>
            <NativeIcon name="chevron-down" size={14} />
          </button>
          <button
            type="button"
            className="locker-btn"
            onClick={syncToCloud}
            disabled={Boolean(busy)}
            title={t('locker.syncHint')}
          >
            <CloudDownload size={16} strokeWidth={2.1} className={busy === 'sync' ? 'locker-spin' : ''} />
            <span>{t('locker.sync')}</span>
          </button>
        </div>
      </header>

      <div className="locker-grid">
        {/* ---------------- current skin ---------------- */}
        <section className="locker-stage">
          <h2 className="locker-section-title">{t('locker.currentSkin')}</h2>

          <div className="locker-stage-card">
            <span className="locker-grip" aria-hidden="true"><GripVertical size={14} /></span>

            <div className="locker-stage-viewer">
              <SkinViewer3D
                account={account}
                width={264}
                height={352}
                animation={null}
                autoRotate={spin}
                onViewer={(viewer) => { viewerRef.current = viewer; }}
                className="locker-canvas"
              />
            </div>

            <div className="locker-stage-bar">
              <div className="locker-model-toggle" role="group" aria-label={t('locker.model')}>
                <button
                  type="button"
                  className={wardrobe?.model !== 'slim' ? 'active' : ''}
                  onClick={() => setModel('classic')}
                  disabled={Boolean(busy)}
                >
                  {t('locker.modelClassic')}
                </button>
                <button
                  type="button"
                  className={wardrobe?.model === 'slim' ? 'active' : ''}
                  onClick={() => setModel('slim')}
                  disabled={Boolean(busy)}
                >
                  {t('locker.modelSlim')}
                </button>
              </div>

              <div className="locker-stage-tools">
                <button
                  type="button"
                  className={spin ? 'is-on' : ''}
                  onClick={() => setSpin((value) => !value)}
                  title={t('locker.spin')}
                  aria-label={t('locker.spin')}
                  aria-pressed={spin}
                >
                  <RotateCw size={16} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const viewer = viewerRef.current;
                    if (!viewer?.playerWrapper) return;
                    viewer.playerWrapper.rotation.y += Math.PI;
                    viewer.render();
                  }}
                  title={t('locker.flip')}
                  aria-label={t('locker.flip')}
                >
                  <FlipHorizontal2 size={16} strokeWidth={2.2} />
                </button>
                <button
                  type="button"
                  onClick={() => exportItem(activeSkin)}
                  disabled={!activeSkin || Boolean(busy)}
                  title={t('locker.export')}
                  aria-label={t('locker.export')}
                >
                  <NativeIcon name="download" size={17} />
                </button>
                <button
                  type="button"
                  className="is-accent"
                  onClick={() => (isMicrosoft ? publishSkin(activeSkin) : exportItem(activeSkin))}
                  disabled={!activeSkin || Boolean(busy)}
                  title={isMicrosoft ? t('locker.publish') : t('locker.export')}
                  aria-label={isMicrosoft ? t('locker.publish') : t('locker.export')}
                >
                  <Play size={16} strokeWidth={2.4} />
                </button>
              </div>
            </div>

            {officialError && isMicrosoft ? (
              <p className="locker-note is-error">
                <NativeIcon name="alert" size={13} />
                <span>{officialError}</span>
              </p>
            ) : (
              <p className="locker-note">
                <NativeIcon name="info" size={13} />
                <span>
                  {activeSkin
                    ? t('locker.activeSkinNote', { name: activeSkin.name })
                    : t('locker.noSkinNote')}
                </span>
              </p>
            )}
          </div>
        </section>

        {/* ---------------- upload ---------------- */}
        <section className="locker-upload">
          <h2 className="locker-section-title">{t('locker.uploadSkin')}</h2>

          <div
            className="locker-dropzone"
            role="button"
            tabIndex={0}
            onClick={() => (busy ? null : browseFor('skin'))}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                browseFor('skin');
              }
            }}
          >
            {busy === 'upload' ? (
              <Loader size={24} strokeWidth={2} className="locker-spin" />
            ) : (
              <Upload size={24} strokeWidth={1.9} />
            )}
            <strong>{t('locker.dropTitle')}</strong>
            <span>{t('locker.dropHint')}</span>
          </div>

          <button
            type="button"
            className="locker-btn is-ghost"
            onClick={() => browseFor('cape')}
            disabled={Boolean(busy)}
          >
            <NativeIcon name="image" size={15} />
            <span>{t('locker.uploadCape')}</span>
          </button>
        </section>

        {/* ---------------- capes ---------------- */}
        <section className="locker-capes">
          <RowHeading title={t('locker.capes')} pager={capePager} />

          <div className="locker-cape-row">
            {capeTiles.length === 1 && !isMicrosoft ? (
              <p className="locker-empty-inline">{t('locker.noCapes')}</p>
            ) : null}

            {capePager.slice(capeTiles).map((tile) => {
              if (tile.kind === 'none') {
                const active = !activeCape && !officialCapes.some((cape) => cape.state === 'ACTIVE');
                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={`locker-cape${active ? ' is-active' : ''}`}
                    onClick={() => activateCape('__none__')}
                    disabled={Boolean(busy)}
                    title={t('locker.noCapeOption')}
                  >
                    <NativeIcon name="close" size={18} />
                  </button>
                );
              }

              if (tile.kind === 'local') {
                const active = activeCape?.id === tile.item.id;
                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={`locker-cape${active ? ' is-active' : ''}`}
                    onClick={() => activateCape(tile.item.id)}
                    onContextMenu={(event) => openMenu(event, tile.item)}
                    disabled={Boolean(busy)}
                    title={tile.item.name}
                  >
                    {tile.item.url ? <img src={tile.item.url} alt="" /> : <NativeIcon name="image" size={18} />}
                  </button>
                );
              }

              const activeCapeId = officialCapes.find((cape) => cape.state === 'ACTIVE')?.id;
              return (
                <button
                  key={tile.id}
                  type="button"
                  className={`locker-cape is-official${activeCapeId === tile.cape.id ? ' is-active' : ''}`}
                  onClick={() => activateCape(tile.cape.id)}
                  disabled={Boolean(busy)}
                  title={tile.cape.alias || t('locker.officialCape')}
                >
                  <img src={tile.cape.url} alt="" />
                </button>
              );
            })}

            {busy?.startsWith('cape-') ? <span className="locker-cape-loading"><NativeIcon name="loader" size={16} className="locker-spin" /></span> : null}
          </div>

          <p className="locker-cloud-note">
            <span>{t('locker.cloudNote')}</span>
            <CloudDownload size={14} strokeWidth={2} />
          </p>
        </section>
      </div>

      {/* ---------------- favourites ---------------- */}
      <section className="locker-row">
        <RowHeading title={t('locker.favorites')} pager={favoritePager} />
        <div className="locker-favorite-grid">
          {favoritePager.slice(favorites).map((item) => (
            <article
              key={item.id}
              className={`locker-card${item.active ? ' is-active' : ''}`}
              onClick={() => applyItem(item.id)}
              onContextMenu={(event) => openMenu(event, item)}
            >
              <StarButton active onClick={() => toggleFavorite(item)} label={t('locker.unfavorite')} />
              <div className="locker-card-art">
                {item.url ? <img src={item.url} alt="" /> : <NativeIcon name="user" size={30} />}
              </div>
              <footer>
                <span className="locker-card-name" title={item.name}>{item.name}</span>
                <span className="locker-card-age">{item.ageDays}d</span>
              </footer>
            </article>
          ))}

          {favorites.length === 0
            ? Array.from({ length: PAGE_SIZE.favorites }).map((_, index) => (
                <span key={`empty-${index}`} className="locker-card is-placeholder" aria-hidden="true">
                  {index === 0 ? <em>{t('locker.favoritesHint')}</em> : null}
                </span>
              ))
            : null}
        </div>
      </section>

      {/* ---------------- latest ---------------- */}
      <section className="locker-row">
        <RowHeading title={t('locker.latest')} pager={latestPager} />
        <div className="locker-latest-grid">
          {latestPager.slice(latest).map((item) => (
            <article
              key={item.id}
              className={`locker-card is-compact${item.active ? ' is-active' : ''}`}
              onClick={() => applyItem(item.id)}
              onContextMenu={(event) => openMenu(event, item)}
            >
              <StarButton
                active={item.favorite}
                onClick={() => toggleFavorite(item)}
                label={item.favorite ? t('locker.unfavorite') : t('locker.favorite')}
              />
              <div className="locker-card-art">
                {item.url ? <img src={item.url} alt="" /> : <NativeIcon name="user" size={26} />}
              </div>
            </article>
          ))}

          {latest.length === 0
            ? Array.from({ length: PAGE_SIZE.latest }).map((_, index) => (
                <span key={`empty-${index}`} className="locker-card is-compact is-placeholder" aria-hidden="true">
                  {index === 0 ? <em>{t('locker.latestHint')}</em> : null}
                </span>
              ))
            : null}
        </div>
      </section>

      <input
        ref={fileInput}
        type="file"
        accept="image/png,.png"
        className="locker-file-input"
        onChange={(event) => {
          uploadFiles(event.target.files, pendingKind.current);
          event.target.value = '';
        }}
      />

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          title={menu.title}
          items={menu.items}
          onClose={() => setMenu(null)}
        />
      )}

      {dragging ? (
        <div className="locker-drop-overlay">
          <Upload size={30} strokeWidth={1.8} />
          <strong>{t('locker.dropTitle')}</strong>
        </div>
      ) : null}
    </div>
  );
}
