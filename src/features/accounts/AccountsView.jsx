import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import OfficialCapes from './OfficialCapes.jsx';
import './AccountsView.css';

const EMPTY_SLOTS = Array.from({ length: 3 }, () => ({}));
const DEFAULT_SKINS = [
  { name: 'Steve', model: 'classic', tone: 'steve' },
  { name: 'Alex', model: 'slim', tone: 'alex' },
  { name: 'Sunny', model: 'slim', tone: 'sunny' },
  { name: 'Zuri', model: 'slim', tone: 'zuri' },
  { name: 'Noor', model: 'classic', tone: 'noor' },
  { name: 'Makena', model: 'slim', tone: 'makena' },
  { name: 'Ari', model: 'classic', tone: 'ari' },
  { name: 'Kai', model: 'classic', tone: 'kai' }
];

function SectionTitle({ children }) {
  return <div className="skin-section-title"><NativeIcon name="chevron-up" size={18} /><span>{children}</span></div>;
}

function MiniPlayer({ account, slot, model = 'classic', tone = 'steve', size = 'card' }) {
  const preview = { ...account, skinUrl: slot?.skinUrl || account?.skinUrl, capeUrl: slot?.capeUrl || account?.capeUrl };
  return <div className={`skin-mini skin-mini-${size} skin-tone-${tone}`}>
    <SkinViewer3D account={preview} width={size === 'large' ? 220 : 132} height={size === 'large' ? 330 : 184} animation="idle" autoRotate={false} />
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
    return <div className="skin-selector" data-testid="wardrobe-view">
      <aside className="skin-preview"><h1>Skin selector</h1><div className="player-name-tag">OhLLama</div><MiniPlayer account={{ name: 'Player' }} size="large" /><div className="rotate-hint"><NativeIcon name="move" size={16} /> Drag to rotate</div><button className="edit-skin-btn"><NativeIcon name="edit" size={16} /> Edit skin</button></aside>
      <main className="skin-library"><SectionTitle>Saved skins</SectionTitle><div className="skin-grid"><button className="skin-tile add-tile"><NativeIcon name="plus" size={30} /><strong>Add skin</strong><span>Drag and drop</span></button></div><div className="wardrobe-empty-state" data-testid="wardrobe-empty-state"><h2>No player selected</h2><p>Open the account switcher from the top-right avatar to start dressing up.</p></div></main>
    </div>;
  }

  const slots = wardrobe?.slots || EMPTY_SLOTS;
  const selected = wardrobe?.selected ?? 0;
  const current = focused ?? selected;
  const selectedSlot = slots[current] || {};
  const saved = useMemo(() => slots.map((slot, index) => ({ slot, index })).filter(({ slot }) => slot.hasSkin || slot.hasCape), [slots]);

  return <div className="skin-selector" data-testid="wardrobe-view">
    <aside className="skin-preview">
      <h1>Skin selector</h1>
      <div className="player-name-tag">{account.name}</div>
      <MiniPlayer account={account} slot={selectedSlot} size="large" />
      <div className="rotate-hint"><NativeIcon name="move" size={16} /> Drag to rotate</div>
      <button type="button" className="edit-skin-btn" onClick={() => choose('skin', current)} disabled={Boolean(busy)}><NativeIcon name={busy === `skin-${current}` ? 'loader' : 'edit'} size={16} className={busy === `skin-${current}` ? 'wardrobe-spin' : ''} /> Edit skin</button>
      <button type="button" className="sync-skin-btn" onClick={sync} disabled={Boolean(busy)}><NativeIcon name={busy === 'sync' ? 'loader' : 'refresh'} size={15} className={busy === 'sync' ? 'wardrobe-spin' : ''} /> Sync to Fabric</button>
    </aside>

    <main className="skin-library">
      <SectionTitle>Saved skins</SectionTitle>
      <div className="skin-grid saved-grid">
        <button type="button" className="skin-tile add-tile" onClick={() => choose('skin', current)} disabled={Boolean(busy)}>
          <NativeIcon name={busy?.startsWith('skin-') ? 'loader' : 'plus'} size={30} className={busy?.startsWith('skin-') ? 'wardrobe-spin' : ''} />
          <strong>Add skin</strong><span>Drag and drop</span>
        </button>
        {saved.map(({ slot, index }) => <button key={index} type="button" className={`skin-tile ${current === index ? 'selected' : ''}`} onClick={() => setFocused(index)} onDoubleClick={() => select(index)}>
          <MiniPlayer account={account} slot={slot} size="card" />
          {selected === index && <span className="selected-check"><NativeIcon name="check" size={15} /></span>}
          <span className="skin-card-name">Outfit {index + 1}</span>
        </button>)}
      </div>

      <SectionTitle>Default skins</SectionTitle>
      <div className="skin-grid default-grid">
        {DEFAULT_SKINS.map((skin, index) => <button key={skin.name} type="button" className={`skin-tile default-skin ${index === 0 && !selectedSlot.hasSkin ? 'selected' : ''}`} onClick={() => setFocused(selected)}>
          <MiniPlayer account={account} model={skin.model} tone={skin.tone} size="card" />
          <span className="skin-card-name">{skin.name}</span>
        </button>)}
      </div>

      <div className="skin-actions-strip">
        <button type="button" className="skin-action-btn" onClick={() => choose('cape', current)} disabled={Boolean(busy)}><NativeIcon name={busy === `cape-${current}` ? 'loader' : 'image'} size={15} className={busy === `cape-${current}` ? 'wardrobe-spin' : ''} /> {selectedSlot.hasCape ? 'Replace cape' : 'Add cape'}</button>
        <button type="button" className="skin-action-btn primary" onClick={() => select(current)} disabled={selected === current || Boolean(busy)}><NativeIcon name={busy === `select-${current}` ? 'loader' : 'check'} size={15} className={busy === `select-${current}` ? 'wardrobe-spin' : ''} /> {selected === current ? 'Selected' : 'Use skin'}</button>
        {account.isMicrosoft && selectedSlot.hasSkin && <button type="button" className="skin-action-btn" onClick={() => publishOfficial(current)} disabled={Boolean(busy)}><NativeIcon name={busy === `official-${current}` ? 'loader' : 'upload'} size={15} className={busy === `official-${current}` ? 'wardrobe-spin' : ''} /> Apply official</button>}
      </div>

      {account.isMicrosoft && <OfficialCapes official={official} error={profileError} busy={busy} onRefresh={refreshOfficial} onActivate={activateCape} />}
    </main>
  </div>;
}
