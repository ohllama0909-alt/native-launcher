import React, { useCallback, useEffect, useState } from 'react';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import './AccountsView.css';

const EMPTY_SLOTS = Array.from({ length: 3 }, () => ({}));

export default function AccountsView({ account, onNotify, onWardrobeChanged }) {
  const [wardrobe, setWardrobe] = useState(null);
  const [busy, setBusy] = useState('');
  const [official, setOfficial] = useState(null);
  const [profileError, setProfileError] = useState('');

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

  const apply = (next) => { if (next) { setWardrobe(next); onWardrobeChanged?.(next); } };
  const choose = async (kind, slot) => {
    setBusy(`${kind}-${slot}`);
    try { apply(await window.native?.wardrobe?.choose({ account, kind, slot, model: wardrobe?.slots?.[slot]?.model || 'classic' })); }
    catch (error) { onNotify?.('Wardrobe', error?.message || 'Could not import that PNG.'); }
    finally { setBusy(''); }
  };
  const select = async (slot) => {
    setBusy(`select-${slot}`);
    try { apply(await window.native?.wardrobe?.select(account, slot)); }
    catch (error) { onNotify?.('Wardrobe', error?.message || 'Could not select that outfit.'); }
    finally { setBusy(''); }
  };
  const setModel = async (slot, model) => {
    setBusy(`model-${slot}`);
    try { apply(await window.native?.wardrobe?.setModel(account, slot, model)); }
    catch (error) { onNotify?.('Wardrobe', error?.message || 'Could not change the player model.'); }
    finally { setBusy(''); }
  };
  const sync = async () => {
    setBusy('sync');
    try { await window.native?.wardrobe?.sync(account); onNotify?.('Wardrobe synced', 'Your selected outfit is available to connected Fabric instances.'); }
    catch (error) { onNotify?.('Sync unavailable', error?.message || 'The skin service could not be reached.'); }
    finally { setBusy(''); }
  };
  const publishOfficial = async (slot) => {
    setBusy(`official-${slot}`);
    try {
      const result = await window.native?.wardrobe?.applyOfficialSkin(account, slot);
      if (!result?.ok) throw new Error(result?.error || 'Minecraft rejected the skin update.');
      if (result.profile) setOfficial(result.profile);
      setProfileError('');
      onNotify?.('Minecraft skin updated', 'The skin is now active on your official Minecraft profile.');
    } catch (error) { setProfileError(error.message); onNotify?.('Minecraft profile', error.message); }
    finally { setBusy(''); }
  };
  const activateCape = async (capeId) => {
    setBusy(`cape-${capeId || 'none'}`);
    try {
      const result = await window.native?.wardrobe?.activateOfficialCape(account, capeId);
      if (!result?.ok) throw new Error(result?.error || 'Minecraft rejected the cape update.');
      const refreshed = result.profile ? result : await window.native.wardrobe.officialProfile(account);
      if (refreshed?.profile) setOfficial(refreshed.profile);
      setProfileError('');
      onNotify?.('Minecraft cape updated', capeId ? 'Your official cape is now active.' : 'Your official cape is hidden.');
    } catch (error) { setProfileError(error.message); onNotify?.('Minecraft profile', error.message); }
    finally { setBusy(''); }
  };

  if (!account?.id || account.id === 'guest') return <div className="accounts-view"><header className="accounts-view-head"><div><h1>Wardrobe</h1><p>Sign in from your avatar in the title bar to create outfits.</p></div></header><div className="wardrobe-page-empty"><NativeIcon name="user" size={28} /><h2>No player selected</h2><p>Open the account switcher from the top-right avatar.</p></div></div>;

  return <div className="accounts-view">
    <header className="accounts-view-head"><div><h1>Wardrobe</h1><p>Build three complete looks for {account.name}. Empty slots are ready for a skin PNG.</p></div><button type="button" className="wardrobe-sync-btn" onClick={sync} disabled={Boolean(busy)}><NativeIcon name="refresh" size={15} className={busy === 'sync' ? 'is-spinning' : ''} /> Sync</button></header>
    <div className="wardrobe-grid">
      {(wardrobe?.slots || EMPTY_SLOTS).map((slot, index) => {
        const selected = wardrobe?.selected === index;
        const occupied = slot.hasSkin || slot.hasCape;
        const previewAccount = { ...account, skinUrl: slot.skinUrl || account.skinUrl, capeUrl: slot.capeUrl || account.capeUrl };
        return <article key={index} className={`wardrobe-slot ${selected ? 'active' : ''} ${occupied ? 'filled' : 'empty'}`}>
          <div className="wardrobe-slot-top"><span>Outfit {index + 1}</span>{selected && <em><NativeIcon name="check" size={11} /> Wearing</em>}</div>
          {occupied ? <div className="wardrobe-preview"><SkinViewer3D account={previewAccount} width={178} height={238} animation="idle" autoRotate={false} /><div className={`wardrobe-cape-card ${slot.hasCape ? '' : 'missing'}`}>{slot.hasCape ? <img src={slot.capeUrl} alt={`Cape for outfit ${index + 1}`} /> : <NativeIcon name="image" size={18} />}<span>{slot.hasCape ? 'Cape PNG' : 'No cape'}</span></div></div> : <button type="button" className="wardrobe-empty-add" onClick={() => choose('skin', index)} disabled={Boolean(busy)}><span><NativeIcon name="plus" size={24} /></span><strong>Empty outfit</strong><small>Add a skin PNG to begin</small></button>}
          <div className="wardrobe-slot-meta"><button type="button" onClick={() => setModel(index, slot.model === 'slim' ? 'classic' : 'slim')} disabled={Boolean(busy)}>{slot.model === 'slim' ? 'Slim model' : 'Classic model'}</button><span>{slot.hasSkin ? 'Custom skin' : 'Default skin'}</span></div>
          <div className="wardrobe-slot-actions"><button type="button" onClick={() => choose('skin', index)} disabled={Boolean(busy)}><NativeIcon name="user" size={13} /> Skin PNG</button><button type="button" onClick={() => choose('cape', index)} disabled={Boolean(busy)}><NativeIcon name="image" size={13} /> Cape PNG</button><button type="button" className="wear" onClick={() => select(index)} disabled={selected || Boolean(busy)}>{selected ? <NativeIcon name="check" size={13} /> : 'Wear'}</button></div>
          {account.isMicrosoft && slot.hasSkin && <button type="button" className="wardrobe-publish-btn" onClick={() => publishOfficial(index)} disabled={Boolean(busy)}><NativeIcon name="upload" size={13} /> Apply skin to official Minecraft</button>}
        </article>;
      })}
    </div>
    {account.isMicrosoft && <section className="official-capes"><div className="official-capes-head"><div><span className="accounts-kicker">PREMIUM PROFILE</span><h2>Official Minecraft capes</h2><p>Select an owned cape to activate it on Minecraft. Custom cape PNGs remain available in Fabric.</p></div><button type="button" onClick={() => loadOfficial().catch((error) => setProfileError(error.message))} disabled={Boolean(busy)}><NativeIcon name="refresh" size={14} /> Refresh</button></div>{profileError && <div className="official-profile-error"><NativeIcon name="alert" size={15} /><span>{profileError}</span></div>}<div className="official-cape-list"><button type="button" className={!official?.capes?.some((cape) => cape.state === 'ACTIVE') ? 'active' : ''} onClick={() => activateCape(null)} disabled={Boolean(busy)}><span className="official-cape-none"><NativeIcon name="close" size={18} /></span><strong>No cape</strong></button>{(official?.capes || []).map((cape) => <button type="button" key={cape.id} className={cape.state === 'ACTIVE' ? 'active' : ''} onClick={() => activateCape(cape.id)} disabled={Boolean(busy)}><span className="official-cape-image"><img src={cape.url} alt={cape.alias || 'Minecraft cape'} /></span><strong>{cape.alias || 'Minecraft cape'}</strong>{cape.state === 'ACTIVE' && <small>Active</small>}</button>)}{!official && !profileError && <span className="official-capes-loading">Loading your owned capes…</span>}</div></section>}
  </div>;
}
