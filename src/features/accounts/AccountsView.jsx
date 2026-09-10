import React, { useCallback, useEffect, useState } from 'react';
import AccountsPanel from '../settings/AccountsPanel.jsx';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import './AccountsView.css';

export default function AccountsView({ account, accounts, activeId, onAddMicrosoft, onAddOffline, onSwitchAccount, onRemoveAccount, onNotify, onWardrobeChanged }) {
  const [wardrobe, setWardrobe] = useState(null);
  const [busy, setBusy] = useState('');
  const [official, setOfficial] = useState(null);

  const loadWardrobe = useCallback(async () => {
    if (!account?.id || account.id === 'guest') { setWardrobe(null); return; }
    const next = await window.native?.wardrobe?.get(account);
    if (next) setWardrobe(next);
  }, [account?.id]);

  useEffect(() => { loadWardrobe().catch(() => setWardrobe(null)); }, [loadWardrobe]);
  useEffect(() => {
    if (!account?.isMicrosoft) { setOfficial(null); return; }
    window.native?.wardrobe?.officialProfile(account).then(setOfficial).catch(() => setOfficial(null));
  }, [account?.id, account?.isMicrosoft]);

  const apply = (next) => {
    if (!next) return;
    setWardrobe(next);
    onWardrobeChanged?.(next);
  };

  const choose = async (kind, slot) => {
    setBusy(`${kind}-${slot}`);
    try {
      const next = await window.native?.wardrobe?.choose({ account, kind, slot, model: wardrobe?.slots?.[slot]?.model || 'classic' });
      apply(next);
    } catch (error) {
      onNotify?.('Wardrobe', error?.message || 'Could not import that texture.');
    } finally { setBusy(''); }
  };

  const select = async (slot) => {
    setBusy(`select-${slot}`);
    try { apply(await window.native?.wardrobe?.select(account, slot)); }
    catch (error) { onNotify?.('Wardrobe', error?.message || 'Could not select that outfit.'); }
    finally { setBusy(''); }
  };

  const sync = async () => {
    setBusy('sync');
    try {
      await window.native?.wardrobe?.sync(account);
      onNotify?.('Wardrobe synced', 'Your selected skin and cape are available to connected Fabric instances.');
    } catch (error) { onNotify?.('Sync unavailable', error?.message || 'The Native skin service could not be reached.'); }
    finally { setBusy(''); }
  };

  const setModel = async (slot, model) => {
    setBusy(`model-${slot}`);
    try { apply(await window.native?.wardrobe?.setModel(account, slot, model)); }
    finally { setBusy(''); }
  };

  const publishOfficial = async (slot) => {
    setBusy(`official-${slot}`);
    try {
      const profile = await window.native?.wardrobe?.applyOfficialSkin(account, slot);
      if (profile) setOfficial(profile);
      onNotify?.('Minecraft skin updated', 'This outfit is now your official Minecraft skin.');
    } catch (error) { onNotify?.('Minecraft profile', error?.message || 'Could not update your official skin.'); }
    finally { setBusy(''); }
  };

  const activateCape = async (capeId) => {
    setBusy(`cape-${capeId || 'none'}`);
    try {
      const profile = await window.native?.wardrobe?.activateOfficialCape(account, capeId);
      setOfficial(profile || await window.native?.wardrobe?.officialProfile(account));
      onNotify?.('Minecraft cape updated', capeId ? 'Your selected owned cape is active.' : 'Your official cape is hidden.');
    } catch (error) { onNotify?.('Minecraft profile', error?.message || 'Could not update your official cape.'); }
    finally { setBusy(''); }
  };

  return (
    <div className="accounts-view">
      <header className="accounts-view-head">
        <div><span className="accounts-kicker">PLAYER IDENTITY</span><h1>Accounts &amp; Wardrobe</h1><p>Switch profiles, preview your character, and keep three complete looks ready.</p></div>
        {account?.id !== 'guest' && <button type="button" className="wardrobe-sync-btn" onClick={sync} disabled={Boolean(busy)}><NativeIcon name="refresh" size={15} className={busy === 'sync' ? 'is-spinning' : ''} /> Sync wardrobe</button>}
      </header>

      {account?.id !== 'guest' && (
        <section className="wardrobe-section">
          <div className="wardrobe-section-head"><div><span className="accounts-kicker">YOUR CLOSET</span><h2>Outfit slots</h2></div><p>Each slot keeps a skin and cape together. Select one to use it in Native and Fabric.</p></div>
          <div className="wardrobe-grid">
            {(wardrobe?.slots || Array.from({ length: 3 }, () => ({}))).map((slot, index) => {
              const selected = wardrobe?.selected === index;
              const previewAccount = { ...account, skinUrl: slot.skinUrl || account.skinUrl, capeUrl: slot.capeUrl || account.capeUrl };
              return (
                <article key={index} className={`wardrobe-slot ${selected ? 'active' : ''}`}>
                  <div className="wardrobe-slot-badge">{selected ? 'Wearing' : `Slot ${index + 1}`}</div>
                  <SkinViewer3D account={previewAccount} width={150} height={205} animation={selected ? 'idle' : 'walk'} autoRotate={false} />
                  <div className="wardrobe-slot-status"><span><i className={slot.hasSkin ? 'ready' : ''} />{slot.hasSkin ? 'Custom skin' : 'Default skin'}</span><span><i className={slot.hasCape ? 'ready' : ''} />{slot.hasCape ? 'Custom cape' : 'No cape'}</span></div>
                  <button type="button" className="wardrobe-model-toggle" onClick={() => setModel(index, slot.model === 'slim' ? 'classic' : 'slim')} disabled={Boolean(busy)}>{slot.model === 'slim' ? 'Slim arms' : 'Classic arms'}</button>
                  <div className="wardrobe-slot-actions">
                    <button type="button" onClick={() => choose('skin', index)} disabled={Boolean(busy)}><NativeIcon name="user" size={13} /> Skin</button>
                    <button type="button" onClick={() => choose('cape', index)} disabled={Boolean(busy)}><NativeIcon name="image" size={13} /> Cape</button>
                    <button type="button" className="wear" onClick={() => select(index)} disabled={selected || Boolean(busy)}>{selected ? <NativeIcon name="check" size={13} /> : 'Wear'}</button>
                  </div>
                  {account.isMicrosoft && slot.hasSkin && <button type="button" className="wardrobe-publish-btn" onClick={() => publishOfficial(index)} disabled={Boolean(busy)}><NativeIcon name="upload" size={13} /> Use on Minecraft profile</button>}
                </article>
              );
            })}
          </div>
          {account.isMicrosoft && (
            <div className="official-capes">
              <div><span className="accounts-kicker">OFFICIAL MINECRAFT CAPES</span><h3>Owned capes</h3><p>Only capes already granted to your Microsoft account can be activated.</p></div>
              <div className="official-cape-list">
                <button type="button" className={!official?.capes?.some((cape) => cape.state === 'ACTIVE') ? 'active' : ''} onClick={() => activateCape(null)} disabled={Boolean(busy)}><span className="official-cape-none"><NativeIcon name="close" size={16} /></span><small>None</small></button>
                {(official?.capes || []).map((cape) => <button type="button" key={cape.id} className={cape.state === 'ACTIVE' ? 'active' : ''} onClick={() => activateCape(cape.id)} disabled={Boolean(busy)}><img src={cape.url} alt="" /><small>{cape.alias || 'Cape'}</small></button>)}
                {!official && <span className="official-capes-loading">Sign in again if owned capes do not appear.</span>}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="accounts-management-section">
        <div className="wardrobe-section-head"><div><span className="accounts-kicker">PROFILES</span><h2>Account manager</h2></div><p>Switch player profiles or securely add another account.</p></div>
        <AccountsPanel accounts={accounts} activeId={activeId} onAddMicrosoft={onAddMicrosoft} onAddOffline={onAddOffline} onSwitchAccount={onSwitchAccount} onRemoveAccount={onRemoveAccount} />
      </section>
    </div>
  );
}
