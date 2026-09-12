import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Folder,
  Layers,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Star,
  Trash2,
  X
} from 'lucide-react';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import { CAPE_PRESETS } from './capePresets.js';
import {
  FALLBACK_SKIN,
  detectSkinModel,
  readFileAsDataUrl,
  skinIdentifier
} from '../../lib/skins.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './LockerView.css';

const POSES = [
  { id: 'idle', label: 'Idle' },
  { id: 'walk', label: 'Walk' },
  { id: 'run', label: 'Run' },
  { id: 'fly', label: 'Fly' }
];

export default function LockerView({
  account,
  onWardrobeChanged,
  onNotify
}) {
  const { t } = useI18n();

  // Local wardrobe state
  const [wardrobe, setWardrobe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // 3D Player controls
  const [autoRotate, setAutoRotate] = useState(false);
  const [animation, setAnimation] = useState('idle');
  const [paused, setPaused] = useState(false);
  const [showCape, setShowCape] = useState(true);
  const [showLayers, setShowLayers] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);

  const viewerInstanceRef = useRef(null);
  const fileInputRef = useRef(null);

  // Import modal state
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState(null); // { file, dataUrl, name, model }
  const [importSaving, setImportSaving] = useState(false);

  // Carousel page state
  const [capePage, setCapePage] = useState(0);
  const [favPage, setFavPage] = useState(0);

  // Load wardrobe on mount or account change
  const loadWardrobe = async () => {
    if (!account) return;
    setLoading(true);
    try {
      if (window.native?.wardrobe?.get) {
        const state = await window.native.wardrobe.get(account);
        setWardrobe(state);
        onWardrobeChanged?.(state);
      } else {
        // Fallback for browser/mock
        const saved = localStorage.getItem(`native.wardrobe.${account.id || 'default'}`);
        if (saved) {
          setWardrobe(JSON.parse(saved));
        } else {
          setWardrobe({
            model: account.model || 'classic',
            items: [],
            skins: [],
            capes: [],
            favorites: [],
            latest: [],
            active: {
              skinUrl: null,
              capeUrl: null,
              model: account.model || 'classic',
              hasSkin: false,
              hasCape: false
            }
          });
        }
      }
    } catch (err) {
      console.warn('Could not load wardrobe:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWardrobe();
  }, [account?.id]);

  // Handle layer and flip changes on viewerInstanceRef
  useEffect(() => {
    const viewer = viewerInstanceRef.current;
    if (!viewer?.playerObject) return;

    // Toggle outer jacket/hat layer
    if (viewer.playerObject.skin?.outerLayer) {
      viewer.playerObject.skin.outerLayer.visible = showLayers;
    }
    // Toggle cape visibility
    if (viewer.playerObject.cape) {
      viewer.playerObject.cape.visible = showCape;
    }

    if (viewer.renderPaused) viewer.render();
  }, [showLayers, showCape]);

  // Active outfit computation
  const activeSkin = wardrobe?.active?.skinUrl || null;
  const activeCape = wardrobe?.active?.capeUrl || null;
  const currentModel = wardrobe?.model || account?.model || 'classic';

  const viewerAccount = useMemo(() => {
    return {
      ...account,
      model: currentModel,
      skinUrl: activeSkin,
      capeUrl: showCape ? activeCape : null
    };
  }, [account, currentModel, activeSkin, activeCape, showCape]);

  // Flip 180 degrees
  const handleFlip = () => {
    const viewer = viewerInstanceRef.current;
    const nextFlipped = !isFlipped;
    setIsFlipped(nextFlipped);
    if (viewer?.playerObject) {
      viewer.playerObject.rotation.y = nextFlipped ? Math.PI : 0;
      if (viewer.renderPaused) viewer.render();
    }
  };

  // Reset view rotation
  const handleResetRotation = () => {
    setIsFlipped(false);
    setAutoRotate(false);
    const viewer = viewerInstanceRef.current;
    if (viewer?.playerObject) {
      viewer.playerObject.rotation.set(0, 0, 0);
      if (viewer.resetJoints) viewer.resetJoints();
      if (viewer.renderPaused) viewer.render();
    }
  };

  // Model flip (classic <-> slim)
  const handleToggleModel = async () => {
    const nextModel = currentModel === 'classic' ? 'slim' : 'classic';
    try {
      if (window.native?.wardrobe?.setModel && account) {
        const next = await window.native.wardrobe.setModel(account, nextModel);
        setWardrobe(next);
        onWardrobeChanged?.(next);
      } else {
        setWardrobe((prev) => ({ ...prev, model: nextModel }));
      }
      onNotify?.(t('locker.model'), `${t('locker.model')}: ${nextModel === 'classic' ? t('locker.modelClassic') : t('locker.modelSlim')}`);
    } catch (err) {
      console.warn('Failed to switch model:', err);
    }
  };

  // Real-time Cloud Sync
  const handleCloudSync = async () => {
    if (!account) return;
    setSyncing(true);
    try {
      if (window.native?.wardrobe?.sync) {
        await window.native.wardrobe.sync(account);
      }
      await loadWardrobe();
      onNotify?.(t('locker.title'), 'All cosmetics synchronized with Noctra Cloud.');
    } catch (err) {
      console.warn('Sync failed:', err);
      onNotify?.(t('locker.title'), 'Cloud sync completed locally.');
    } finally {
      setSyncing(false);
    }
  };

  // Drag & drop / File input handling
  const handleProcessFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.png') && file.type !== 'image/png') {
      onNotify?.('Invalid File', t('locker.uploadNotPng'));
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const detected = await detectSkinModel(dataUrl);
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

      setImportData({
        file,
        fileName: file.name,
        dataUrl,
        name: cleanName || 'unnamed',
        model: detected || 'classic'
      });
      setImportOpen(true);
    } catch (err) {
      onNotify?.('Upload Error', err.message || 'Could not read file.');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleFileSelect = (e) => {
    const file = e.target?.files?.[0];
    if (file) handleProcessFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Save imported skin
  const handleSaveImport = async () => {
    if (!importData || !account) return;
    setImportSaving(true);
    try {
      let nextState;
      if (window.native?.wardrobe?.upload) {
        nextState = await window.native.wardrobe.upload(
          account,
          'skin',
          importData.dataUrl,
          { name: importData.name, model: importData.model }
        );
        // Background sync to cloud
        window.native?.wardrobe?.sync?.(account).catch(() => {});
      } else {
        // Fallback
        const newItem = {
          id: `skin-${Date.now()}`,
          kind: 'skin',
          name: importData.name,
          model: importData.model,
          createdAt: Date.now(),
          favorite: false,
          active: true,
          url: importData.dataUrl
        };
        nextState = {
          ...wardrobe,
          model: importData.model,
          items: [newItem, ...(wardrobe?.items || [])],
          skins: [newItem, ...(wardrobe?.skins || [])],
          latest: [newItem, ...(wardrobe?.latest || [])],
          active: {
            ...wardrobe?.active,
            skinId: newItem.id,
            model: importData.model,
            skinUrl: importData.dataUrl,
            hasSkin: true
          }
        };
        localStorage.setItem(`native.wardrobe.${account.id || 'default'}`, JSON.stringify(nextState));
      }

      setWardrobe(nextState);
      onWardrobeChanged?.(nextState);
      setImportOpen(false);
      setImportData(null);
      onNotify?.(t('locker.title'), t('locker.uploadDone', { name: importData.name }));
    } catch (err) {
      onNotify?.('Error', err.message || 'Could not upload skin.');
    } finally {
      setImportSaving(false);
    }
  };

  // Apply an existing skin
  const handleApplySkin = async (skin) => {
    if (!skin?.id || !account) return;
    try {
      let nextState;
      if (window.native?.wardrobe?.apply) {
        nextState = await window.native.wardrobe.apply(account, skin.id);
        window.native?.wardrobe?.sync?.(account).catch(() => {});
      } else {
        nextState = {
          ...wardrobe,
          model: skin.model || wardrobe.model,
          active: {
            ...wardrobe.active,
            skinId: skin.id,
            skinUrl: skin.url,
            model: skin.model || wardrobe.model,
            hasSkin: true
          }
        };
        localStorage.setItem(`native.wardrobe.${account.id || 'default'}`, JSON.stringify(nextState));
      }
      setWardrobe(nextState);
      onWardrobeChanged?.(nextState);
      onNotify?.(t('locker.title'), `Equipped ${skin.name}`);
    } catch (err) {
      console.warn('Failed to apply skin:', err);
    }
  };

  // Apply a cape
  const handleApplyCape = async (preset) => {
    if (!account) return;
    try {
      let nextState;
      if (preset.id === 'none' || !preset.textureUrl) {
        // Clear active cape
        if (window.native?.wardrobe?.clearActive) {
          nextState = await window.native.wardrobe.clearActive(account, 'cape');
          window.native?.wardrobe?.sync?.(account).catch(() => {});
        } else {
          nextState = {
            ...wardrobe,
            active: { ...wardrobe?.active, capeUrl: null, hasCape: false }
          };
          localStorage.setItem(`native.wardrobe.${account.id || 'default'}`, JSON.stringify(nextState));
        }
        onNotify?.(t('locker.title'), 'Cape unequipped.');
      } else {
        // Equip preset cape
        if (window.native?.wardrobe?.upload) {
          nextState = await window.native.wardrobe.upload(account, 'cape', preset.textureUrl, {
            name: preset.name
          });
          window.native?.wardrobe?.sync?.(account).catch(() => {});
        } else {
          nextState = {
            ...wardrobe,
            active: { ...wardrobe?.active, capeUrl: preset.textureUrl, hasCape: true }
          };
          localStorage.setItem(`native.wardrobe.${account.id || 'default'}`, JSON.stringify(nextState));
        }
        onNotify?.(t('locker.title'), `Equipped ${preset.name}`);
      }

      setWardrobe(nextState);
      onWardrobeChanged?.(nextState);
    } catch (err) {
      console.warn('Failed to apply cape:', err);
    }
  };

  // Toggle favorite
  const handleToggleFavorite = async (item, e) => {
    e?.stopPropagation();
    if (!account || !item?.id) return;
    const nextFav = !item.favorite;
    try {
      let nextState;
      if (window.native?.wardrobe?.favorite) {
        nextState = await window.native.wardrobe.favorite(account, item.id, nextFav);
      } else {
        const items = (wardrobe?.items || []).map((it) => (it.id === item.id ? { ...it, favorite: nextFav } : it));
        nextState = {
          ...wardrobe,
          items,
          favorites: items.filter((it) => it.favorite)
        };
        localStorage.setItem(`native.wardrobe.${account.id || 'default'}`, JSON.stringify(nextState));
      }
      setWardrobe(nextState);
      onWardrobeChanged?.(nextState);
    } catch (err) {
      console.warn('Failed to toggle favorite:', err);
    }
  };

  // Remove skin item
  const handleRemoveItem = async (item, e) => {
    e?.stopPropagation();
    if (!account || !item?.id) return;
    try {
      let nextState;
      if (window.native?.wardrobe?.remove) {
        nextState = await window.native.wardrobe.remove(account, item.id);
        window.native?.wardrobe?.sync?.(account).catch(() => {});
      } else {
        const items = (wardrobe?.items || []).filter((it) => it.id !== item.id);
        nextState = {
          ...wardrobe,
          items,
          skins: items.filter((it) => it.kind === 'skin'),
          favorites: items.filter((it) => it.favorite),
          latest: items.slice(0, 12)
        };
        localStorage.setItem(`native.wardrobe.${account.id || 'default'}`, JSON.stringify(nextState));
      }
      setWardrobe(nextState);
      onWardrobeChanged?.(nextState);
      onNotify?.(t('locker.title'), t('locker.removed', { name: item.name }));
    } catch (err) {
      console.warn('Failed to remove item:', err);
    }
  };

  // Carousel slicing
  const CAPE_PAGE_SIZE = 6;
  const totalCapePages = Math.ceil(CAPE_PRESETS.length / CAPE_PAGE_SIZE);
  const visibleCapes = CAPE_PRESETS.slice(capePage * CAPE_PAGE_SIZE, (capePage + 1) * CAPE_PAGE_SIZE);

  const favoritesList = wardrobe?.favorites || [];
  const FAV_PAGE_SIZE = 4;
  const totalFavPages = Math.max(1, Math.ceil(favoritesList.length / FAV_PAGE_SIZE));
  const visibleFavorites = favoritesList.slice(favPage * FAV_PAGE_SIZE, (favPage + 1) * FAV_PAGE_SIZE);

  const latestList = wardrobe?.latest || wardrobe?.skins || [];

  return (
    <div className="locker-view">
      {/* ---------- Header ---------- */}
      <header className="locker-header">
        <div className="locker-title-block">
          <h1 className="locker-title">{t('locker.title') || 'LOCKER'}</h1>
          <p className="locker-subtitle">
            {t('locker.subtitle') ||
              'Your personal wardrobe, built right in. The Locker allows you to instantly swap, preview, and manage your Minecraft skins without ever opening a browser. Mark your go-to outfits as favorites for quick access before joining a server.'}
          </p>
        </div>

        <div className="locker-cloud-status">
          <button
            type="button"
            className="locker-sync-btn"
            onClick={handleCloudSync}
            disabled={syncing}
            title="Synchronize cosmetics with Noctra Cloud"
          >
            <Cloud size={14} className={syncing ? 'is-pulsing' : ''} />
            <span>{t('locker.cloudNote') || 'All cosmetics synced to Noctra Cloud'}</span>
            <RefreshCw size={12} className={syncing ? 'is-spinning' : ''} />
          </button>
        </div>
      </header>

      {/* ---------- Main Layout ---------- */}
      <div className="locker-content-grid">
        {/* Left Stage: CURRENT SKIN */}
        <section className="locker-stage-card">
          <div className="locker-stage-header">
            <h2 className="locker-section-title">{t('locker.currentSkin') || 'CURRENT SKIN'}</h2>
            <div className="locker-stage-toggles">
              <button
                type="button"
                className={`stage-toggle-btn ${showCape ? 'active' : ''}`}
                onClick={() => setShowCape(!showCape)}
                title={showCape ? 'Hide Cape' : 'Show Cape'}
              >
                <Sparkles size={15} />
              </button>
              <button
                type="button"
                className={`stage-toggle-btn ${showLayers ? 'active' : ''}`}
                onClick={() => setShowLayers(!showLayers)}
                title={showLayers ? 'Hide Jacket/Hat Layer' : 'Show Jacket/Hat Layer'}
              >
                <Layers size={15} />
              </button>
            </div>
          </div>

          <div className="locker-3d-canvas-wrap">
            <SkinViewer3D
              account={viewerAccount}
              width={270}
              height={360}
              animation={paused ? null : animation}
              autoRotate={autoRotate}
              onViewer={(v) => { viewerInstanceRef.current = v; }}
            />
          </div>

          {/* Controls below canvas */}
          <div className="locker-stage-controls">
            <div className="stage-controls-left">
              <button
                type="button"
                className={`stage-action-btn ${autoRotate ? 'active' : ''}`}
                onClick={() => setAutoRotate(!autoRotate)}
                title={t('locker.spin') || 'Auto-rotate'}
              >
                <RotateCcw size={14} />
              </button>
              <button
                type="button"
                className={`stage-action-btn ${isFlipped ? 'active' : ''}`}
                onClick={handleFlip}
                title={t('locker.flip') || 'Turn around'}
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                className={`stage-action-btn ${paused ? 'active' : ''}`}
                onClick={() => setPaused(!paused)}
                title={paused ? 'Resume pose animation' : 'Pause animation'}
              >
                {paused ? <Play size={14} /> : <Pause size={14} />}
              </button>

              <div className="stage-pose-pills">
                {POSES.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`pose-pill ${animation === p.id && !paused ? 'active' : ''}`}
                    onClick={() => {
                      setAnimation(p.id);
                      setPaused(false);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="stage-controls-right">
              <button
                type="button"
                className="stage-model-badge"
                onClick={handleToggleModel}
                title="Click to toggle Classic / Slim arm model"
              >
                {currentModel === 'classic' ? 'Wide (4px)' : 'Slim (3px)'}
              </button>
            </div>
          </div>
        </section>

        {/* Right Columns: UPLOAD, CAPES, FAVORITES, LATEST */}
        <div className="locker-manage-column">
          {/* Top Row: Upload Card & Capes */}
          <div className="locker-top-row">
            {/* Upload Dropzone */}
            <div className="locker-upload-section">
              <h3 className="locker-sub-title">{t('locker.uploadSkin') || 'UPLOAD SKIN'}</h3>
              <div
                className="locker-dropzone"
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <div className="dropzone-icon-box">
                  <Plus size={20} />
                </div>
                <span className="dropzone-text">
                  {t('locker.dropTitle') || 'Drag & drop file or browse'}
                </span>
              </div>
            </div>

            {/* Capes Carousel */}
            <div className="locker-capes-section">
              <div className="capes-header-row">
                <h3 className="locker-sub-title">{t('locker.capes') || 'CAPES'}</h3>
                {totalCapePages > 1 && (
                  <div className="carousel-arrows">
                    <button
                      type="button"
                      disabled={capePage <= 0}
                      onClick={() => setCapePage(capePage - 1)}
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={capePage >= totalCapePages - 1}
                      onClick={() => setCapePage(capePage + 1)}
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div className="capes-carousel-grid">
                {visibleCapes.map((preset) => {
                  const isCurrent = (preset.id === 'none' && !activeCape) || activeCape === preset.textureUrl;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      className={`cape-card ${isCurrent ? 'active' : ''}`}
                      onClick={() => handleApplyCape(preset)}
                      title={preset.name}
                    >
                      <div className="cape-swatch" style={{ background: preset.swatch }}>
                        {preset.id === 'none' ? (
                          <X size={14} className="no-cape-icon" />
                        ) : preset.id === 'noctra' ? (
                          <span className="cape-mark">N</span>
                        ) : null}
                      </div>
                      <span className="cape-label">{preset.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Middle Row: FAVORITES */}
          <div className="locker-favorites-section">
            <div className="favorites-header-row">
              <h3 className="locker-sub-title">{t('locker.favorites') || 'FAVORITES'}</h3>
              {totalFavPages > 1 && (
                <div className="carousel-arrows">
                  <button
                    type="button"
                    disabled={favPage <= 0}
                    onClick={() => setFavPage(favPage - 1)}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    type="button"
                    disabled={favPage >= totalFavPages - 1}
                    onClick={() => setFavPage(favPage + 1)}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>

            <div className="favorites-cards-grid">
              {visibleFavorites.length === 0 ? (
                <div className="locker-empty-hint">
                  <Star size={18} />
                  <span>{t('locker.favoritesHint') || 'Star a skin to pin it here.'}</span>
                </div>
              ) : (
                visibleFavorites.map((item) => (
                  <div
                    key={item.id}
                    className={`outfit-card ${item.active ? 'active' : ''}`}
                    onClick={() => handleApplySkin(item)}
                  >
                    <button
                      type="button"
                      className="outfit-fav-btn is-favorited"
                      onClick={(e) => handleToggleFavorite(item, e)}
                      title={t('locker.unfavorite')}
                    >
                      <Star size={12} fill="#f59e0b" color="#f59e0b" />
                    </button>

                    <div className="outfit-preview-stage">
                      <SkinViewer3D
                        account={{ ...account, skinUrl: item.url, model: item.model || 'classic' }}
                        width={90}
                        height={130}
                        paused={true}
                      />
                    </div>

                    <div className="outfit-info-row">
                      <span className="outfit-name">{item.name}</span>
                      <span className="outfit-age">{item.ageDays ? `${item.ageDays}d` : 'new'}</span>
                    </div>

                    <div className="outfit-hover-overlay">
                      <button type="button" className="outfit-wear-btn" onClick={() => handleApplySkin(item)}>
                        {item.active ? 'Worn' : (t('locker.apply') || 'Wear')}
                      </button>
                      <button
                        type="button"
                        className="outfit-delete-btn"
                        onClick={(e) => handleRemoveItem(item, e)}
                        title="Remove from locker"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Row: LATEST */}
          <div className="locker-latest-section">
            <h3 className="locker-sub-title">{t('locker.latest') || 'LATEST'}</h3>
            <div className="latest-cards-grid">
              {latestList.length === 0 ? (
                <div className="locker-empty-hint">
                  <span>{t('locker.latestHint') || 'Uploads show up here.'}</span>
                </div>
              ) : (
                latestList.map((item) => (
                  <div
                    key={item.id}
                    className={`outfit-card ${item.active ? 'active' : ''}`}
                    onClick={() => handleApplySkin(item)}
                  >
                    <button
                      type="button"
                      className={`outfit-fav-btn ${item.favorite ? 'is-favorited' : ''}`}
                      onClick={(e) => handleToggleFavorite(item, e)}
                      title={item.favorite ? t('locker.unfavorite') : t('locker.favorite')}
                    >
                      <Star size={12} fill={item.favorite ? '#f59e0b' : 'none'} color={item.favorite ? '#f59e0b' : 'rgba(255,255,255,0.4)'} />
                    </button>

                    <div className="outfit-preview-stage">
                      <SkinViewer3D
                        account={{ ...account, skinUrl: item.url, model: item.model || 'classic' }}
                        width={90}
                        height={130}
                        paused={true}
                      />
                    </div>

                    <div className="outfit-info-row">
                      <span className="outfit-name">{item.name}</span>
                      <span className="outfit-age">{item.ageDays ? `${item.ageDays}d` : 'new'}</span>
                    </div>

                    <div className="outfit-hover-overlay">
                      <button type="button" className="outfit-wear-btn" onClick={() => handleApplySkin(item)}>
                        {item.active ? 'Worn' : (t('locker.apply') || 'Wear')}
                      </button>
                      <button
                        type="button"
                        className="outfit-delete-btn"
                        onClick={(e) => handleRemoveItem(item, e)}
                        title="Remove from locker"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---------- Import Skin Modal (matching mockup popup) ---------- */}
      {importOpen && importData && (
        <div className="locker-modal-overlay" onClick={() => setImportOpen(false)}>
          <div className="locker-import-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="import-modal-close"
              onClick={() => setImportOpen(false)}
            >
              <X size={16} />
            </button>

            {/* Left 3D Preview */}
            <div className="import-modal-preview">
              <SkinViewer3D
                account={{
                  ...account,
                  skinUrl: importData.dataUrl,
                  model: importData.model
                }}
                width={170}
                height={230}
                animation="idle"
                autoRotate={true}
              />
            </div>

            {/* Right Form */}
            <div className="import-modal-form">
              <div className="import-form-field">
                <label className="import-field-label">Name</label>
                <input
                  type="text"
                  className="import-text-input"
                  value={importData.name}
                  onChange={(e) => setImportData({ ...importData, name: e.target.value })}
                  placeholder="Skin name..."
                />
              </div>

              <div className="import-form-field">
                <label className="import-field-label">File</label>
                <div className="import-file-display">
                  <span className="import-file-name">{importData.fileName || 'texture.png'}</span>
                  <button
                    type="button"
                    className="import-browse-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Change file"
                  >
                    <Folder size={14} />
                  </button>
                </div>
              </div>

              <div className="import-form-field">
                <label className="import-field-label">Player Model</label>
                <div className="import-radio-group">
                  <label className={`import-radio-label ${importData.model === 'classic' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="import-model"
                      value="classic"
                      checked={importData.model === 'classic'}
                      onChange={() => setImportData({ ...importData, model: 'classic' })}
                    />
                    <span>Wide (Classic 4px)</span>
                  </label>
                  <label className={`import-radio-label ${importData.model === 'slim' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="import-model"
                      value="slim"
                      checked={importData.model === 'slim'}
                      onChange={() => setImportData({ ...importData, model: 'slim' })}
                    />
                    <span>Slim (Alex 3px)</span>
                  </label>
                </div>
              </div>

              <div className="import-modal-actions">
                <button
                  type="button"
                  className="import-save-btn"
                  onClick={handleSaveImport}
                  disabled={importSaving}
                >
                  <Check size={16} />
                  <span>{importSaving ? 'Saving…' : 'Save'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
