import React, { useCallback, useEffect, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import WardrobeStage from './WardrobeStage.jsx';
import OutfitRail from './OutfitRail.jsx';
import OfficialCapes from './OfficialCapes.jsx';
import './AccountsView.css';

const EMPTY_SLOTS = Array.from({ length: 3 }, () => ({}));

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
  const setModel = (slot, model) => run(`model-${slot}`, async () => apply(await window.native?.wardrobe?.setModel(account, slot, model)), 'Wardrobe', 'Could not change the player model.');
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
    return <div className="wardrobe" data-testid="wardrobe-view">
      <header className="wardrobe-head"><div><span className="wardrobe-kicker">Player</span><h1>Wardrobe</h1><p>Sign in from your avatar in the title bar to create outfits.</p></div></header>
      <div className="wardrobe-empty-state" data-testid="wardrobe-empty-state"><span className="wardrobe-empty-state-icon"><NativeIcon name="user" size={26} /></span><h2>No player selected</h2><p>Open the account switcher from the top-right avatar to start dressing up.</p></div>
    </div>;
  }

  const slots = wardrobe?.slots || EMPTY_SLOTS;
  const selected = wardrobe?.selected ?? 0;
  const current = focused ?? selected;
  const filledCount = slots.filter((slot) => slot.hasSkin || slot.hasCape).length;

  return <div className="wardrobe" data-testid="wardrobe-view">
    <header className="wardrobe-head">
      <div><span className="wardrobe-kicker">Player · {account.name}</span><h1>Wardrobe</h1><p>Three looks, one click to switch. {filledCount}/{slots.length} outfits ready.</p></div>
      <button type="button" className="wardrobe-btn ghost" data-testid="wardrobe-sync-btn" onClick={sync} disabled={Boolean(busy)}>
        <NativeIcon name={busy === 'sync' ? 'loader' : 'refresh'} size={15} className={busy === 'sync' ? 'wardrobe-spin' : ''} /> Sync to Fabric
      </button>
    </header>
    <div className="wardrobe-body">
      <WardrobeStage account={account} slot={slots[current]} index={current} isWearing={current === selected} busy={busy} onChoose={choose} onSelect={select} onSetModel={setModel} onPublish={publishOfficial} />
      <OutfitRail slots={slots} account={account} selected={selected} current={current} busy={busy} onFocus={setFocused} onChoose={choose} onSelect={select} />
    </div>
    {account.isMicrosoft && <OfficialCapes official={official} error={profileError} busy={busy} onRefresh={refreshOfficial} onActivate={activateCape} />}
  </div>;
}
