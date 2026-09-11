import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CloudDownload,
  FileText,
  FlipHorizontal2,
  Loader,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Star,
  Upload,
  X
} from 'lucide-react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import PlayerAvatar from '../../components/ui/PlayerAvatar.jsx';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import ContextMenu from '../../components/ui/ContextMenu.jsx';
import { detectSkinModel, readFileAsDataUrl } from '../../lib/skins.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './LockerView.css';

const PAGE_SIZE = { capes: 6, favorites: 4, latest: 6 };

/* ── shared helpers ──────────────────────────────────────── */

function usePager(length, size) {
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(length / size));
  useEffect(() => setPage((p) => Math.min(p, pages - 1)), [pages]);
  return {
    page: Math.min(page, pages - 1),
    pages,
    canBack: page > 0,
    canForward: page < pages - 1,
    back: () => setPage((p) => Math.max(0, p - 1)),
    forward: () => setPage((p) => Math.min(pages - 1, p + 1)),
    slice: (items) => items.slice(page * size, page * size + size)
  };
}

function RowHead({ title, pager, right }) {
  return (
    <header className="locker-row-head">
      <h2>{title}</h2>
      <span className="locker-row-rule" aria-hidden="true" />
      <div className="locker-row-tools">
        {right}
        {pager && pager.pages > 1 ? (
          <span className="locker-pager">
            <button type="button" onClick={pager.back} disabled={!pager.canBack} aria-label="Previous">
              <ChevronLeft size={14} />
            </button>
            <button type="button" onClick={pager.forward} disabled={!pager.canForward} aria-label="Next">
              <ChevronRight size={14} />
            </button>
          </span>
        ) : null}
      </div>
    </header>
  );
}

/* ── component ──────────────────────────────────────────── */

export default function LockerView({
  account,
  onNotify,
  onWardrobeChanged,
  onOpenAccountSwitcher
}) {
  const { t } = useI18n();
  const [wardrobe, setWardrobe] = useState(null);
  const [official, setOfficial] = useState(null);
  const [officialState, setOfficialState] = useState({ loading: false, error: null });
  const [busy, setBusy] = useState('');
  const [dragging, setDragging] = useState(false);
  const [menu, setMenu] = useState(null);
  const [spin, setSpin] = useState(false);
  const [pending, setPending] = useState(null); // { file, dataUrl, model, name, kind }
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
    if (!signedIn) return setWardrobe(null);
    apply(await window.native?.wardrobe?.get(account));
  }, [account, signedIn, apply]);

  const loadOfficial = useCallback(
    async ({ force = false } = {}) => {
      if (!isMicrosoft) {
        setOfficial(null);
        setOfficialState({ loading: false, error: null });
        return;
      }
      setOfficialState({ loading: true, error: null });
      const call = force
        ? window.native?.wardrobe?.reauthOfficialProfile
        : window.native?.wardrobe?.officialProfile;
      const result = await call?.(account);
      if (result?.ok) {
        setOfficial(result.profile);
        setOfficialState({ loading: false, error: null });
      } else {
        setOfficial(null);
        setOfficialState({
          loading: false,
          error: {
            status: result?.status || null,
            code: result?.code || null,
            message: result?.error || t('locker.officialFailed')
          }
        });
      }
    },
    [account, isMicrosoft, t]
  );

  useEffect(() => { load().catch(() => setWardrobe(null)); }, [load]);
  useEffect(() => { loadOfficial().catch(() => {}); }, [loadOfficial]);

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

  /* ── derived state ─────────────────────────────────────── */

  const items = wardrobe?.items || [];
  const skins = useMemo(() => items.filter((i) => i.kind === 'skin'), [items]);
  const localCapes = useMemo(() => items.filter((i) => i.kind === 'cape'), [items]);
  const favorites = useMemo(() => items.filter((i) => i.favorite), [items]);
  const latest = useMemo(() => [...skins].sort((a, b) => b.createdAt - a.createdAt), [skins]);
  const activeSkin = wardrobe?.active?.skin || null;
  const activeCape = wardrobe?.active?.cape || null;
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

  /* ── upload flow with edit popup ───────────────────────── */

  const stageUpload = async (files, kind = 'skin') => {
    const file = files?.[0];
    if (!file) return;
    if (!/\.png$/i.test(file.name) && file.type !== 'image/png') {
      onNotify?.(t('locker.uploadTitle'), t('locker.uploadNotPng'));
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const model = kind === 'skin' ? await detectSkinModel(dataUrl) : 'classic';
      setPending({
        kind,
        dataUrl,
        fileName: file.name,
        name: file.name.replace(/\.png$/i, ''),
        model
      });
    } catch (error) {
      onNotify?.(t('locker.uploadTitle'), error?.message || t('locker.actionFailed'));
    }
  };

  const confirmUpload = () =>
    run(
      'upload',
      async () => {
        if (!pending) return null;
        const next = await window.native?.wardrobe?.upload(account, pending.kind, pending.dataUrl, {
          name: pending.name,
          model: pending.model
        });
        apply(next);
        setPending(null);
        return next;
      },
      { okMessage: t('locker.uploadDone', { name: pending?.name || 'skin' }), title: t('locker.uploadTitle') }
    );

  const browseFor = (kind) => {
    pendingKind.current = kind;
    fileInput.current?.click();
  };

  /* ── mutations ─────────────────────────────────────────── */

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
    run(
      `export-${item?.id || 'active'}`,
      async () => {
        const result = await window.native?.wardrobe?.export(account, item?.id || null);
        return result?.canceled ? null : result;
      },
      { okMessage: t('locker.exported'), title: t('locker.title'), fallback: t('locker.exportFailed') }
    );

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
        { label: t('common.remove') || 'Remove', icon: 'trash', action: () => removeItem(item) }
      ]
    });
  };

  /* ── drag & drop ───────────────────────────────────────── */

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
    stageUpload(event.dataTransfer?.files, 'skin');
  };

  /* ── signed-out state ──────────────────────────────────── */

  if (!signedIn) {
    return (
      <div className="locker-view">
        <header className="locker-head">
          <h1>{t('locker.title')}</h1>
        </header>
        <div className="locker-signed-out">
          <span className="locker-signed-out-icon"><NativeIcon name="user" size={26} /></span>
          <h2>{t('locker.noAccount')}</h2>
          <p>{t('locker.noAccountBody')}</p>
          <button type="button" className="locker-btn is-primary" onClick={onOpenAccountSwitcher}>
            <NativeIcon name="user" size={16} />
            <span>{t('account.accounts') || 'Accounts'}</span>
          </button>
        </div>
      </div>
    );
  }

  /* ── main render ───────────────────────────────────────── */

  return (
    <div
      className={`locker-view${dragging ? ' is-dropping' : ''}`}
      onDragEnter={onDragEnter}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="locker-head">
        <h1>{t('locker.title')}</h1>
        <div className="locker-head-actions">
          <button type="button" className="locker-account-chip" onClick={onOpenAccountSwitcher} title={t('account.switch') || 'Switch'}>
            <PlayerAvatar account={account} kind="avatar" size={26} />
            <span>{account?.name}</span>
            <NativeIcon name="chevron-down" size={13} />
          </button>
          <button
            type="button"
            className="locker-btn"
            onClick={syncToCloud}
            disabled={Boolean(busy)}
            title={t('locker.syncHint')}
          >
            <CloudDownload size={14} className={busy === 'sync' ? 'locker-spin' : ''} />
            <span>{t('locker.sync')}</span>
          </button>
        </div>
      </header>

      <div className="locker-top">
        {/* ─── Current skin ──────────────────────────────── */}
        <section className="locker-block locker-current">
          <h2 className="locker-block-title">{t('locker.currentSkin')}</h2>
          <div className="locker-stage-card locker-current-card">
            <div className="locker-current-viewer">
              <SkinViewer3D
                account={account}
                width={220}
                height={300}
                animation={null}
                autoRotate={spin}
                onViewer={(viewer) => { viewerRef.current = viewer; }}
                className="locker-canvas"
              />
            </div>
            <div className="locker-current-bar">
              <button
                type="button"
                className={spin ? 'is-on' : ''}
                onClick={() => setSpin((v) => !v)}
                title={t('locker.spin')}
                aria-label={t('locker.spin')}
              >
                <RotateCw size={13} strokeWidth={2.2} />
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
                <FlipHorizontal2 size={13} strokeWidth={2.2} />
              </button>
              <div className="locker-current-model">
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
              <button
                type="button"
                className="is-accent"
                onClick={() => (isMicrosoft ? publishSkin(activeSkin) : exportItem(activeSkin))}
                disabled={!activeSkin || Boolean(busy)}
                title={isMicrosoft ? t('locker.publish') : t('locker.export')}
                aria-label={isMicrosoft ? t('locker.publish') : t('locker.export')}
              >
                <Play size={13} strokeWidth={2.4} fill="currentColor" />
              </button>
            </div>
          </div>
        </section>

        {/* ─── Upload ───────────────────────────────────── */}
        <section className="locker-block locker-upload">
          <h2 className="locker-block-title">{t('locker.uploadSkin')}</h2>
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
            <span className="locker-dropzone-plus">
              {busy === 'upload' ? <Loader size={18} className="locker-spin" /> : <Plus size={18} strokeWidth={2.2} />}
            </span>
            <span className="locker-dropzone-caption">{t('locker.dropTitle')}</span>
            <span className="locker-dropzone-hint">{t('locker.dropHint')}</span>
          </div>
          <button
            type="button"
            className="locker-linkbtn"
            onClick={() => browseFor('cape')}
            disabled={Boolean(busy)}
          >
            {t('locker.uploadCape')}
          </button>
        </section>

        {/* ─── Capes ─────────────────────────────────────── */}
        <section className="locker-block locker-capes">
          <RowHead title={t('locker.capes')} pager={capePager} />

          <div className="locker-cape-row">
            {capePager.slice(capeTiles).map((tile) => {
              if (tile.kind === 'none') {
                const active = !activeCape && !officialCapes.some((c) => c.state === 'ACTIVE');
                return (
                  <button
                    key={tile.id}
                    type="button"
                    className={`locker-cape${active ? ' is-active' : ''}`}
                    onClick={() => activateCape('__none__')}
                    disabled={Boolean(busy)}
                    title={t('locker.noCapeOption')}
                  >
                    <X size={18} />
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
              const activeOfficialId = officialCapes.find((c) => c.state === 'ACTIVE')?.id;
              return (
                <button
                  key={tile.id}
                  type="button"
                  className={`locker-cape is-official${activeOfficialId === tile.cape.id ? ' is-active' : ''}`}
                  onClick={() => activateCape(tile.cape.id)}
                  disabled={Boolean(busy)}
                  title={tile.cape.alias || t('locker.officialCape')}
                >
                  <img src={tile.cape.url} alt="" />
                </button>
              );
            })}
            {busy?.startsWith('cape-') ? (
              <span className="locker-cape-loading"><Loader size={14} className="locker-spin" /></span>
            ) : null}
          </div>

          {officialState.error && isMicrosoft ? (
            <OfficialError error={officialState.error} onRetry={() => loadOfficial({ force: true })} t={t} />
          ) : (
            <p className="locker-cloud-note">
              <span>{t('locker.cloudNote')}</span>
              <CloudDownload size={12} strokeWidth={2} />
            </p>
          )}
        </section>
      </div>

      {/* ─── Favorites ─────────────────────────────────── */}
      <section className="locker-row">
        <RowHead title={t('locker.favorites')} pager={favoritePager} />
        <div className="locker-fav-grid">
          {favoritePager.slice(favorites).map((item) => (
            <SkinCard
              key={item.id}
              item={item}
              active={item.id === activeSkin?.id}
              onClick={() => applyItem(item.id)}
              onContextMenu={(event) => openMenu(event, item)}
              onFavorite={() => toggleFavorite(item)}
              t={t}
            />
          ))}
          {favorites.length === 0
            ? Array.from({ length: PAGE_SIZE.favorites }).map((_, index) => (
                <span key={`fav-empty-${index}`} className="locker-fav-card is-placeholder" aria-hidden="true">
                  {index === 0 ? <em>{t('locker.favoritesHint')}</em> : null}
                </span>
              ))
            : null}
        </div>
      </section>

      {/* ─── Latest ────────────────────────────────────── */}
      <section className="locker-row">
        <RowHead title={t('locker.latest')} pager={latestPager} />
        <div className="locker-latest-grid">
          {latestPager.slice(latest).map((item) => (
            <SkinCard
              key={item.id}
              compact
              item={item}
              active={item.id === activeSkin?.id}
              onClick={() => applyItem(item.id)}
              onContextMenu={(event) => openMenu(event, item)}
              onFavorite={() => toggleFavorite(item)}
              t={t}
            />
          ))}
          {latest.length === 0
            ? Array.from({ length: PAGE_SIZE.latest }).map((_, index) => (
                <span key={`latest-empty-${index}`} className="locker-fav-card is-compact is-placeholder" aria-hidden="true">
                  {index === 0 ? <em>{t('locker.latestHint')}</em> : null}
                </span>
              ))
            : null}
        </div>
      </section>

      <p className="locker-footer-note">{t('locker.footerNote')}</p>

      <input
        ref={fileInput}
        type="file"
        accept="image/png,.png"
        className="locker-file-input"
        onChange={(event) => {
          stageUpload(event.target.files, pendingKind.current);
          event.target.value = '';
        }}
      />

      {menu && (
        <ContextMenu x={menu.x} y={menu.y} title={menu.title} items={menu.items} onClose={() => setMenu(null)} />
      )}

      {pending && (
        <SkinEditor
          pending={pending}
          busy={busy === 'upload'}
          onChange={setPending}
          onClose={() => setPending(null)}
          onSave={confirmUpload}
          t={t}
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

/* ── skin card ─────────────────────────────────────────── */

function SkinCard({ item, active, compact, onClick, onContextMenu, onFavorite, t }) {
  return (
    <article
      className={`locker-fav-card${compact ? ' is-compact' : ''}${active ? ' is-active' : ''}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={item.name}
    >
      <button
        type="button"
        className={`locker-star${item.favorite ? ' is-on' : ''}`}
        onClick={(event) => {
          event.stopPropagation();
          onFavorite();
        }}
        aria-pressed={item.favorite}
        aria-label={item.favorite ? t('locker.unfavorite') : t('locker.favorite')}
      >
        <Star size={12} strokeWidth={2.2} fill={item.favorite ? 'currentColor' : 'none'} />
      </button>
      <div className="locker-fav-art">
        {item.url ? <img src={item.url} alt="" /> : <NativeIcon name="user" size={28} />}
      </div>
      {!compact && (
        <footer>
          <span className="locker-fav-name">{item.name}</span>
          <span className="locker-fav-age">{item.ageDays}d</span>
        </footer>
      )}
    </article>
  );
}

/* ── skin editor popup ─────────────────────────────────── */

function SkinEditor({ pending, busy, onChange, onClose, onSave, t }) {
  return (
    <div className="locker-modal-scrim" onClick={onClose}>
      <div className="locker-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="locker-modal-close" onClick={onClose} aria-label={t('common.clear') || 'Close'}>
          <X size={14} />
        </button>

        <div className="locker-modal-preview">
          <img src={pending.dataUrl} alt="" />
        </div>

        <div className="locker-modal-form">
          <label className="locker-field">
            <span>{t('locker.fieldName')}</span>
            <input
              type="text"
              value={pending.name}
              onChange={(event) => onChange({ ...pending, name: event.target.value })}
              maxLength={40}
              autoFocus
            />
          </label>

          <label className="locker-field">
            <span>{t('locker.fieldFile')}</span>
            <div className="locker-field-static">
              <FileText size={13} strokeWidth={2} />
              <span>{pending.fileName}</span>
            </div>
          </label>

          {pending.kind === 'skin' ? (
            <div className="locker-field">
              <span>{t('locker.model')}</span>
              <div className="locker-radio-group">
                <label className={`locker-radio${pending.model !== 'slim' ? ' is-checked' : ''}`}>
                  <input
                    type="radio"
                    name="skin-model"
                    checked={pending.model !== 'slim'}
                    onChange={() => onChange({ ...pending, model: 'classic' })}
                  />
                  <span className="locker-radio-dot" />
                  {t('locker.modelWide') || 'Wide'}
                </label>
                <label className={`locker-radio${pending.model === 'slim' ? ' is-checked' : ''}`}>
                  <input
                    type="radio"
                    name="skin-model"
                    checked={pending.model === 'slim'}
                    onChange={() => onChange({ ...pending, model: 'slim' })}
                  />
                  <span className="locker-radio-dot" />
                  {t('locker.modelSlim')}
                </label>
              </div>
            </div>
          ) : null}

          <div className="locker-modal-actions">
            <button
              type="button"
              className="locker-btn is-primary"
              onClick={onSave}
              disabled={busy || !pending.name.trim()}
            >
              {busy ? <Loader size={13} className="locker-spin" /> : <NativeIcon name="check" size={13} />}
              <span>{t('locker.save') || 'Save'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── official-profile error card ───────────────────────── */

function OfficialError({ error, onRetry, t }) {
  const is402 = error.status === 402 || error.code === 'NO_ENTITLEMENT';
  const isAuth = error.status === 401 || error.status === 403 || error.code === 'AUTH_EXPIRED';
  const title = is402
    ? t('locker.error402Title')
    : isAuth
    ? t('locker.error401Title')
    : t('locker.errorGenericTitle');
  const body = is402 ? t('locker.error402Body') : isAuth ? t('locker.error401Body') : error.message;

  return (
    <div className={`locker-error-card${is402 ? ' is-warn' : ' is-error'}`}>
      <span className="locker-error-icon"><AlertTriangle size={14} strokeWidth={2.1} /></span>
      <div className="locker-error-copy">
        <strong>{title}</strong>
        <p>{body}</p>
      </div>
      <button type="button" className="locker-linkbtn is-inline" onClick={onRetry}>
        <RefreshCw size={11} strokeWidth={2.2} />
        <span>{t('locker.retry')}</span>
      </button>
    </div>
  );
}
