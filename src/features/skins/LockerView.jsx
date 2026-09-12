import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Cloud, Download, Eye, EyeOff, Folder, Layers, Pause, Play, Plus, RefreshCw, RotateCcw, Star, Trash2, X } from 'lucide-react';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import { CAPE_PRESETS } from './capePresets.js';
import { detectSkinModel, readFileAsDataUrl } from '../../lib/skins.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './LockerView.css';

const CAPES_PER_PAGE = 5;
const SKINS_PER_PAGE = 5;

export default function LockerView({ account, onWardrobeChanged, onNotify }) {
  const { t } = useI18n();
  const [wardrobe, setWardrobe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showCape, setShowCape] = useState(true);
  const [showLayers, setShowLayers] = useState(true);
  const [capePage, setCapePage] = useState(0);
  const [skinPage, setSkinPage] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importSaving, setImportSaving] = useState(false);
  const viewerRef = useRef(null);
  const fileInputRef = useRef(null);

  const publishState = (next) => {
    setWardrobe(next);
    onWardrobeChanged?.(next);
    return next;
  };

  const loadWardrobe = async () => {
    if (!account) return;
    setLoading(true);
    try {
      if (window.native?.wardrobe?.get) {
        const current = await window.native.wardrobe.get(account);
        publishState(current);
        // Automatically sync with cloud in background so any remote changes are pulled
        window.native.wardrobe.sync(account).then((res) => {
          if (res?.pulled && res?.state) {
            publishState(res.state);
          } else if (res?.ok) {
            window.native.wardrobe.get(account).then(publishState).catch(() => {});
          }
        }).catch(() => {});
      } else {
        const saved = localStorage.getItem(`native.wardrobe.${account.id || 'default'}`);
        publishState(saved ? JSON.parse(saved) : { model: account.model || 'classic', items: [], skins: [], capes: [], favorites: [], latest: [], active: { skinUrl: null, capeUrl: null, model: account.model || 'classic', hasSkin: false, hasCape: false } });
      }
    } catch (error) {
      console.warn('Could not load wardrobe:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadWardrobe(); }, [account?.id]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer?.playerObject) return;
    if (viewer.playerObject.skin?.outerLayer) viewer.playerObject.skin.outerLayer.visible = showLayers;
    if (viewer.playerObject.cape) viewer.playerObject.cape.visible = showCape;
    if (viewer.renderPaused) viewer.render();
  }, [showLayers, showCape]);

  const currentModel = wardrobe?.model || account?.model || 'classic';
  const viewerAccount = useMemo(() => ({ ...account, model: currentModel, skinUrl: wardrobe?.active?.skinUrl || null, capeUrl: showCape ? wardrobe?.active?.capeUrl || null : null }), [account, currentModel, wardrobe?.active?.skinUrl, wardrobe?.active?.capeUrl, showCape]);

  const skinItems = useMemo(() => {
    const byId = new Map();
    [...(wardrobe?.favorites || []), ...(wardrobe?.latest || []), ...(wardrobe?.skins || [])].filter((item) => item.kind === 'skin').forEach((item) => byId.set(item.id, item));
    return [...byId.values()];
  }, [wardrobe]);

  const activeCapeName = useMemo(() => {
    const activeId = wardrobe?.active?.capeId || wardrobe?.activeCape;
    return (wardrobe?.capes || wardrobe?.items || []).find((item) => item.kind === 'cape' && item.id === activeId)?.name || null;
  }, [wardrobe]);

  const capePages = Math.max(1, Math.ceil(CAPE_PRESETS.length / CAPES_PER_PAGE));
  const skinPages = Math.max(1, Math.ceil(skinItems.length / SKINS_PER_PAGE));
  const visibleCapes = CAPE_PRESETS.slice(capePage * CAPES_PER_PAGE, (capePage + 1) * CAPES_PER_PAGE);
  const visibleSkins = skinItems.slice(skinPage * SKINS_PER_PAGE, (skinPage + 1) * SKINS_PER_PAGE);

  useEffect(() => {
    setCapePage((page) => Math.min(page, capePages - 1));
    setSkinPage((page) => Math.min(page, skinPages - 1));
  }, [capePages, skinPages]);

  const handleResetView = () => {
    const viewer = viewerRef.current;
    if (!viewer?.playerObject) return;
    viewer.playerObject.rotation.set(0, 0, 0);
    viewer.playerObject.resetJoints?.();
    if (viewer.renderPaused) viewer.render();
  };

  const handleExport = async () => {
    const id = wardrobe?.active?.skinId || wardrobe?.activeSkin;
    if (!id || !window.native?.wardrobe?.export) return;
    try { await window.native.wardrobe.export(account, id); }
    catch (error) { onNotify?.(t('locker.title'), error?.message || 'Could not export texture.'); }
  };

  const handleCloudSync = async () => {
    if (!account) return;
    setSyncing(true);
    try {
      const res = await window.native?.wardrobe?.sync?.(account);
      if (res?.state) {
        publishState(res.state);
      } else {
        const updated = await window.native?.wardrobe?.get?.(account);
        if (updated) publishState(updated);
      }
      onNotify?.(t('locker.title'), 'All cosmetics synchronized with Noctra Cloud.');
    } catch (error) {
      onNotify?.(t('locker.title'), error?.message || 'Cloud sync completed locally.');
    } finally { setSyncing(false); }
  };

  const processFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.png') && file.type !== 'image/png') { onNotify?.('Invalid File', t('locker.uploadNotPng')); return; }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const model = await detectSkinModel(dataUrl);
      setImportData({ fileName: file.name, dataUrl, name: file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'unnamed', model: model || 'classic', detected: model || 'classic' });
      setImportOpen(true);
    } catch (error) { onNotify?.('Upload Error', error?.message || 'Could not read file.'); }
  };

  const saveImport = async () => {
    if (!importData || !account) return;
    setImportSaving(true);
    try {
      const next = await window.native?.wardrobe?.upload?.(account, 'skin', importData.dataUrl, { name: importData.name, model: importData.model });
      if (next) publishState(next);
      window.native?.wardrobe?.sync?.(account).catch(() => {});
      setImportOpen(false); setImportData(null);
      onNotify?.(t('locker.title'), t('locker.uploadDone', { name: importData.name }));
    } catch (error) { onNotify?.('Error', error?.message || 'Could not upload skin.'); }
    finally { setImportSaving(false); }
  };

  const applySkin = async (skin) => {
    if (!skin?.id || !account) return;
    try {
      const next = await window.native?.wardrobe?.apply?.(account, skin.id);
      if (next) publishState(next);
      window.native?.wardrobe?.sync?.(account).catch(() => {});
    } catch (error) { onNotify?.(t('locker.title'), error?.message || 'Could not equip skin.'); }
  };

  const toggleFavorite = async (item, event) => {
    event?.stopPropagation();
    if (!item?.id || !account) return;
    try { const next = await window.native?.wardrobe?.favorite?.(account, item.id, !item.favorite); if (next) publishState(next); }
    catch (error) { console.warn('Could not update favourite:', error); }
  };

  const removeItem = async (item, event) => {
    event?.stopPropagation();
    if (!item?.id || !account) return;
    try {
      const next = await window.native?.wardrobe?.remove?.(account, item.id);
      if (next) publishState(next);
      window.native?.wardrobe?.sync?.(account).catch(() => {});
    } catch (error) { onNotify?.(t('locker.title'), error?.message || 'Could not remove item.'); }
  };

  const applyCape = async (cape) => {
    if (!account) return;
    try {
      let next;
      if (!cape.textureUrl) {
        next = await window.native?.wardrobe?.clearActive?.(account, 'cape');
      } else {
        const response = await fetch(cape.textureUrl);
        if (!response.ok) throw new Error(`Could not load ${cape.name}`);
        const textureDataUrl = await readFileAsDataUrl(await response.blob());
        next = await window.native?.wardrobe?.upload?.(account, 'cape', textureDataUrl, { name: cape.name });
      }
      if (next) publishState(next);
      window.native?.wardrobe?.sync?.(account).catch(() => {});
    } catch (error) { onNotify?.(t('locker.title'), error?.message || 'Could not equip cape.'); }
  };

  return <div className="locker-view" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); processFile(event.dataTransfer?.files?.[0]); }}>
    <header className="locker-header"><div><h1 className="locker-title">{t('locker.title') || 'LOCKER'}</h1><p className="locker-subtitle">{t('locker.subtitle')}</p></div><button type="button" className="locker-sync-btn" onClick={handleCloudSync} disabled={syncing}><Cloud size={14}/><span>{t('locker.cloudNote')}</span><RefreshCw size={13} className={syncing ? 'is-spinning' : ''}/></button></header>
    <div className="locker-workspace">
      <section className="locker-stage" aria-label={t('locker.currentSkin')}><div className="locker-stage-heading"><h2>{t('locker.currentSkin')}</h2><div className="locker-stage-toggles"><button type="button" className={showCape ? 'active' : ''} onClick={() => setShowCape((value) => !value)} title={showCape ? 'Hide cape' : 'Show cape'}>{showCape ? <Eye size={15}/> : <EyeOff size={15}/>}</button><button type="button" className={showLayers ? 'active' : ''} onClick={() => setShowLayers((value) => !value)} title={showLayers ? 'Hide outer layer' : 'Show outer layer'}><Layers size={15}/></button></div></div>
        <div className="locker-stage-model">{loading ? <span className="locker-loading"/> : <SkinViewer3D account={viewerAccount} width={285} height={390} animation={paused ? null : 'idle'} paused={paused} onViewer={(viewer) => { viewerRef.current = viewer; }}/>}</div>
        <div className="locker-stage-actions"><button type="button" onClick={handleResetView} title="Reset view"><RotateCcw size={16}/></button><div><button type="button" onClick={handleExport} disabled={!(wardrobe?.active?.skinId || wardrobe?.activeSkin)} title="Download active texture"><Download size={16}/></button><button type="button" onClick={() => setPaused((value) => !value)} title={paused ? 'Play preview' : 'Pause preview'}>{paused ? <Play size={16}/> : <Pause size={16}/>}</button></div></div>
      </section>
      <main className="locker-library">
        <section className="locker-row locker-skins-row"><div className="locker-row-header"><div><span className="locker-kicker">{t('locker.favorites')}</span><h2>{t('locker.latest')}</h2></div><CarouselControls page={skinPage} pages={skinPages} setPage={setSkinPage}/></div><div className="locker-skin-strip">
          <button type="button" className="locker-upload-card" onClick={() => fileInputRef.current?.click()}><span className="locker-upload-plus"><Plus size={18}/></span><strong>{t('locker.uploadSkin')}</strong><small>{t('locker.dragDrop')}</small></button>
          {visibleSkins.map((skin) => <article key={skin.id} className={`locker-skin-card ${skin.active ? 'active' : ''}`} onClick={() => applySkin(skin)}><button type="button" className="locker-favourite" onClick={(event) => toggleFavorite(skin, event)} title={skin.favorite ? t('locker.unfavorite') : t('locker.favorite')}><Star size={13} fill={skin.favorite ? 'currentColor' : 'none'}/></button><div className="locker-skin-preview"><SkinViewer3D account={{...account, skinUrl:skin.url, model:skin.model}} width={104} height={142} paused/></div><div className="locker-card-meta"><strong>{skin.name}</strong><small>{skin.ageDays ? `${skin.ageDays}d` : 'new'}</small></div><button type="button" className="locker-remove" onClick={(event) => removeItem(skin,event)}><Trash2 size={13}/></button></article>)}
          {!visibleSkins.length && <div className="locker-empty-skins"><Star size={18}/><span>{t('locker.emptyFavorites')}</span></div>}
        </div></section>
        <section className="locker-row locker-capes-row"><div className="locker-row-header"><div><span className="locker-kicker">OFFICIAL MINECRAFT</span><h2>{t('locker.capes')}</h2></div><CarouselControls page={capePage} pages={capePages} setPage={setCapePage}/></div><div className="locker-cape-strip">{visibleCapes.map((cape) => { const active = cape.id === 'none' ? !wardrobe?.active?.hasCape : activeCapeName === cape.name; return <button key={cape.id} type="button" className={`locker-cape-card ${active?'active':''}`} onClick={() => applyCape(cape)}>{cape.textureUrl ? <span className="locker-cape-texture" style={{backgroundImage:`url(${cape.textureUrl})`}}/> : <span className="locker-no-cape"><X size={20}/></span>}<span>{cape.name}</span>{active && <Check size={13} className="locker-cape-check"/>}</button>;})}</div></section>
      </main>
    </div>
    <input ref={fileInputRef} type="file" accept="image/png,.png" hidden onChange={(event) => { processFile(event.target.files?.[0]); event.target.value=''; }}/>
    {importOpen && importData && <div className="locker-modal-overlay" onClick={() => setImportOpen(false)}><div className="locker-import-modal" onClick={(event) => event.stopPropagation()}><button type="button" className="import-modal-close" onClick={() => setImportOpen(false)}><X size={16}/></button><div className="import-modal-preview"><SkinViewer3D account={{...account,skinUrl:importData.dataUrl,model:importData.model}} width={170} height={230} animation="idle" autoRotate/></div><div className="import-modal-form"><div className="import-modal-head"><h3>{t('locker.importTitle')}</h3><p>{t('locker.importSubtitle')}</p></div><label className="import-form-field"><span>{t('locker.fieldName')}</span><input value={importData.name} onChange={(event) => setImportData({...importData,name:event.target.value})}/></label><div className="import-form-field"><span>{t('locker.fieldFile')}</span><button type="button" className="import-file-display" onClick={() => fileInputRef.current?.click()}><span>{importData.fileName}</span><Folder size={14}/></button></div><div className="import-form-field"><span>{t('locker.model')}</span><div className="import-model-grid">{['classic','slim'].map((model) => <button key={model} type="button" className={`import-model-card${importData.model===model?' active':''}`} onClick={() => setImportData({...importData,model})}><ModelArmGlyph model={model}/><strong>{model==='classic'?t('locker.modelClassic'):t('locker.modelSlim')}</strong><small>{model==='classic'?t('locker.modelClassicDesc'):t('locker.modelSlimDesc')}</small>{importData.detected===model && <em className="import-model-detected">{t('locker.modelDetected')}</em>}{importData.model===model && <span className="import-model-check"><Check size={12}/></span>}</button>)}</div></div><button type="button" className="import-save-btn" onClick={saveImport} disabled={importSaving}><Check size={15}/>{importSaving?t('common.loading'):t('common.save')}</button></div></div></div>}
  </div>;
}

function CarouselControls({ page, pages, setPage }) {
  return <div className="locker-carousel-controls"><button type="button" disabled={page<=0} onClick={() => setPage((value)=>Math.max(0,value-1))}><ChevronLeft size={16}/></button><span>{page+1} / {pages}</span><button type="button" disabled={page>=pages-1} onClick={() => setPage((value)=>Math.min(pages-1,value+1))}><ChevronRight size={16}/></button></div>;
}

/**
 * A tiny pixel-art figure whose arm width tracks the model: Classic wears the
 * standard 4px arms, Slim the narrower 3px arms. It makes the otherwise abstract
 * "Classic vs Slim" choice legible at a glance in the import picker.
 */
function ModelArmGlyph({ model }) {
  const slim = model === 'slim';
  const armW = slim ? 3 : 4;
  const leftX = slim ? 5 : 4;
  return (
    <svg className="import-model-glyph" viewBox="0 0 24 24" width="34" height="34" aria-hidden="true" shapeRendering="crispEdges">
      <rect className="glyph-body" x="9" y="2" width="6" height="6" />
      <rect className="glyph-body" x="9" y="9" width="6" height="9" />
      <rect className="glyph-arm" x={leftX} y="9" width={armW} height="9" />
      <rect className="glyph-arm" x="16" y="9" width={armW} height="9" />
    </svg>
  );
}
