import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import OfficialCapes from './OfficialCapes.jsx';
import steveSkin from '../../assets/steve.png';
import alexSkin from '../../assets/alex.png';
import './AccountsView.css';

const EMPTY_SLOTS = Array.from({ length: 3 }, () => ({}));
const DEFAULT_SKINS = [
  { name: 'Steve', model: 'classic', tone: 'steve', skinUrl: steveSkin },
  { name: 'Alex', model: 'slim', tone: 'alex', skinUrl: alexSkin },
  { name: 'Sunny', model: 'slim', tone: 'sunny', skinUrl: alexSkin },
  { name: 'Zuri', model: 'slim', tone: 'zuri', skinUrl: alexSkin },
  { name: 'Noor', model: 'classic', tone: 'noor', skinUrl: steveSkin },
  { name: 'Makena', model: 'slim', tone: 'makena', skinUrl: alexSkin },
  { name: 'Ari', model: 'classic', tone: 'ari', skinUrl: steveSkin },
  { name: 'Kai', model: 'classic', tone: 'kai', skinUrl: steveSkin }
];

function SectionTitle({ children }) {
  return <h2 className="skin-section-title"><NativeIcon name="chevron-up" size={18} /><span>{children}</span></h2>;
}

function MiniPlayer({ account, slot, skin, size = 'card', interactive = false }) {
  const preview = {
    ...account,
    skinUrl: skin?.skinUrl || slot?.skinUrl || account?.skinUrl,
    capeUrl: slot?.capeUrl || account?.capeUrl,
    model: skin?.model || slot?.model || account?.model
  };
  return <div className={`skin-mini skin-mini-${size} ${skin ? `skin-tone-${skin.tone}` : ''}`}>
    <SkinViewer3D account={preview} width={size === 'large' ? 224 : 150} height={size === 'large' ? 340 : 210} animation="idle" autoRotate={false} className={interactive ? 'interactive-skin' : ''} />
  </div>;
}

function SkinSelectorShell({ account, selectedSlot, children, onEdit, busy }) {
  return <div className="skin-selector" data-testid="wardrobe-view">
    <aside className="skin-preview">
      <h1>Skin selector</h1>
      <div className="player-name-tag">{account?.name || 'OhLLama'}</div>
      <MiniPlayer account={account || { name: 'Player' }} slot={selectedSlot} size="large" interactive />
      <div className="rotate-hint"><NativeIcon name="move" size={16} /><span>Drag to rotate</span></div>
      <div className="preview-actions">
        <button type="button" className="edit-skin-btn" onClick={onEdit} disabled={!onEdit || Boolean(busy)}>
          <NativeIcon name={busy?.startsWith('skin-') ? 'loader' : 'edit'} size={16} className={busy?.startsWith('skin-') ? 'wardrobe-spin' : ''} /> Edit skin
        </button>
      </div>
    </aside>
    <main className="skin-library">{children}</main>
  </div>;
}

export default function AccountsView({ account, onNotify, onWardrobeChanged }) {
  const [wardrobe, setWardrobe] = useState(null);
  const [busy, setBusy] = useState('');
  const [official, setOfficial] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [focused, setFocused] = useState(null);

  const loadWardrobe = useCallback(async () => {
    if (!account?.id || account.id === 'guest') return setWardrobe(null);
    setWardrobe(await window.native?.wardrobe?.get(account));
  }, [account?.id]);

  const loadOfficial = useCallback(async () => {
    if (!account?.isMicrosoft) { setOfficial(null); setProfileError(''); return; }
    const result = await window.native?.wardrobe?.officialProfile(account);
    if (!result?.ok) throw new Error(result?.error || 'Could not load your Minecraft profile.');
    setOfficial(result.profile);
    setProfileError('');
  }, [account?.id, account?.isMicrosoft]);

  useEffect(() => { loadWardrobe().catch(() => setWardrobe(null)); }, [loadWardrobe]);
  useEffect(() => { loadOfficial().catch((error) => { setOfficial(null); setProfileError(error.message); }); }, [loadOfficial]);
  useEffect(() => { setFocused(null); }, [account?.id]);

  const run = async (key, task, title, fallback, onError) => {
    setBusy(key);
    try { await task(); }
    catch (error) { onError?.(error); onNotify?.(title, error?.message || fallback); }
    finally { setBusy(''); }
  };
  const captureProfileError = (error) => setProfileError(error?.message || '');
  const apply = (next) => { if (next) { setWardrobe(next); onWardrobeChanged?.(next); } };
  const choose = (kind, slot) => run(`${kind}-${slot}`, async () => {
    apply(await window.native?.wardrobe?.choose({ account, kind, slot, model: wardrobe?.slots?.[slot]?.model || 'classic' }));
  }, 'Wardrobe', 'Could not import that PNG.');
  const select = (slot) => run(`select-${slot}`, async () => apply(await window.native?.wardrobe?.select(account, slot)), 'Wardrobe', 'Could not select that outfit.');
  const sync = () => run('sync', async () => {
    await window.native?.wardrobe?.sync(account);
    onNotify?.('Wardrobe synced', 'Your selected outfit is available to connected Fabric instances.');
  }, 'Sync unavailable', 'The skin service could not be reached.');
  const publishOfficial = (slot) => run(`official-${slot}`, async () => {
    const result = await window.native?.wardrobe?.applyOfficialSkin(account, slot);
    if (!result?.ok) throw new Error(result?.error || 'Minecraft rejected the skin update.');
    if (result.profile) setOfficial(result.profile);
    setProfileError('');
    onNotify?.('Minecraft skin updated', 'The skin is now active on your official Minecraft profile.');
  }, 'Minecraft profile', 'Minecraft rejected the skin update.', captureProfileError);
  const activateCape = (capeId) => run(`cape-${capeId || 'none'}`, async () => {
    const result = await window.native?.wardrobe?.activateOfficialCape(account, capeId);
    if (!result?.ok) throw new Error(result?.error || 'Minecraft rejected the cape update.');
    const refreshed = result.profile ? result : await window.native.wardrobe.officialProfile(account);
    if (refreshed?.profile) setOfficial(refreshed.profile);
    setProfileError('');
    onNotify?.('Minecraft cape updated', capeId ? 'Your official cape is now active.' : 'Your official cape is hidden.');
  }, 'Minecraft profile', 'Minecraft rejected the cape update.', captureProfileError);
  const refreshOfficial = () => run('official-refresh', loadOfficial, 'Minecraft profile', 'Could not load your Minecraft profile.', captureProfileError);

  if (!account?.id || account.id === 'guest') {
    return <SkinSelectorShell account={{ name: 'OhLLama' }}>
      <SectionTitle>Saved skins</SectionTitle>
      <div className="skin-grid saved-grid"><button className="skin-tile add-tile" type="button" disabled><NativeIcon name="plus" size={30} /><strong>Add skin</strong><span>Drag and drop</span></button></div>
      <div className="wardrobe-empty-state" data-testid="wardrobe-empty-state"><h2>No player selected</h2><p>Open the account switcher from the top-right avatar to start dressing up.</p></div>
    </SkinSelectorShell>;
  }

  const slots = wardrobe?.slots || EMPTY_SLOTS;
  const selected = wardrobe?.selected ?? 0;
  const current = focused ?? selected;
  const selectedSlot = slots[current] || {};
  const saved = useMemo(() => slots.map((slot, index) => ({ slot, index })).filter(({ slot }) => slot.hasSkin || slot.hasCape), [slots]);

  return <SkinSelectorShell account={account} selectedSlot={selectedSlot} onEdit={() => choose('skin', current)} busy={busy}>
    <SectionTitle>Saved skins</SectionTitle>
    <div className="skin-grid saved-grid">
      <button type="button" className="skin-tile add-tile" onClick={() => choose('skin', current)} disabled={Boolean(busy)}>
        <NativeIcon name={busy?.startsWith('skin-') ? 'loader' : 'plus'} size={30} className={busy?.startsWith('skin-') ? 'wardrobe-spin' : ''} />
        <strong>Add skin</strong><span>Drag and drop</span>
      </button>
      {saved.map(({ slot, index }) => <button key={index} type="button" aria-label={`Preview outfit ${index + 1}`} className={`skin-tile saved-skin ${current === index ? 'selected' : ''}`} onClick={() => setFocused(index)} onDoubleClick={() => select(index)}>
        <MiniPlayer account={account} slot={slot} />
        {selected === index && <span className="selected-check"><NativeIcon name="check" size={15} /></span>}
        <span className="skin-card-name">Outfit {index + 1}</span>
      </button>)}
    </div>

    <SectionTitle>Default skins</SectionTitle>
    <div className="skin-grid default-grid">
      {DEFAULT_SKINS.map((skin, index) => <div key={skin.name} className={`skin-tile default-skin ${index === 0 && !selectedSlot.hasSkin ? 'selected' : ''}`} title={skin.name}>
        <MiniPlayer account={account} skin={skin} />
        <span className="skin-card-name">{skin.name}</span>
      </div>)}
    </div>

    <div className="skin-actions-strip" aria-label="Selected skin actions">
      <button type="button" className="skin-action-btn" onClick={() => choose('cape', current)} disabled={Boolean(busy)}><NativeIcon name={busy === `cape-${current}` ? 'loader' : 'image'} size={15} className={busy === `cape-${current}` ? 'wardrobe-spin' : ''} /> {selectedSlot.hasCape ? 'Replace cape' : 'Add cape'}</button>
      <button type="button" className="skin-action-btn" onClick={sync} disabled={Boolean(busy)}><NativeIcon name={busy === 'sync' ? 'loader' : 'refresh'} size={15} className={busy === 'sync' ? 'wardrobe-spin' : ''} /> Sync to Fabric</button>
      <button type="button" className="skin-action-btn primary" onClick={() => select(current)} disabled={selected === current || Boolean(busy)}><NativeIcon name={busy === `select-${current}` ? 'loader' : 'check'} size={15} className={busy === `select-${current}` ? 'wardrobe-spin' : ''} /> {selected === current ? 'Selected' : 'Use skin'}</button>
      {account.isMicrosoft && selectedSlot.hasSkin && <button type="button" className="skin-action-btn" onClick={() => publishOfficial(current)} disabled={Boolean(busy)}><NativeIcon name={busy === `official-${current}` ? 'loader' : 'upload'} size={15} className={busy === `official-${current}` ? 'wardrobe-spin' : ''} /> Apply official</button>}
    </div>

    {account.isMicrosoft && <OfficialCapes official={official} error={profileError} busy={busy} onRefresh={refreshOfficial} onActivate={activateCape} />}
  </SkinSelectorShell>;
}
