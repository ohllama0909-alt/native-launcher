import React from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';

export default function OfficialCapes({ official, error, busy, onRefresh, onActivate }) {
  const capes = official?.capes || [];
  const noneActive = !capes.some((cape) => cape.state === 'ACTIVE');
  const locked = Boolean(busy);
  const refreshing = busy === 'official-refresh';

  return <section className="official-capes" data-testid="official-capes">
    <div className="official-capes-head">
      <div><span className="wardrobe-kicker">Premium profile</span><h2>Official Minecraft capes</h2><p>Pick an owned cape to activate it on your Minecraft profile. Custom cape PNGs from your outfits stay available in Fabric.</p></div>
      <button type="button" className="wardrobe-btn ghost" data-testid="official-capes-refresh" onClick={onRefresh} disabled={locked}><NativeIcon name={refreshing ? 'loader' : 'refresh'} size={14} className={refreshing ? 'wardrobe-spin' : ''} /> Refresh</button>
    </div>

    {error && <div className="official-profile-error" data-testid="official-profile-error"><NativeIcon name="alert" size={15} /><span>{error}</span></div>}

    <div className="official-cape-list">
      <button type="button" className={`official-cape ${noneActive ? 'active' : ''}`} data-testid="official-cape-none" onClick={() => onActivate(null)} disabled={locked}>
        <span className="official-cape-art none">{busy === 'cape-none' ? <NativeIcon name="loader" size={18} className="wardrobe-spin" /> : <NativeIcon name="close" size={18} />}</span>
        <strong>No cape</strong>
        {noneActive && <small>Active</small>}
      </button>
      {capes.map((cape) => <button type="button" key={cape.id} className={`official-cape ${cape.state === 'ACTIVE' ? 'active' : ''}`} data-testid={`official-cape-${cape.id}`} onClick={() => onActivate(cape.id)} disabled={locked}>
        <span className="official-cape-art">{busy === `cape-${cape.id}` ? <NativeIcon name="loader" size={18} className="wardrobe-spin" /> : <img src={cape.url} alt={cape.alias || 'Minecraft cape'} />}</span>
        <strong>{cape.alias || 'Minecraft cape'}</strong>
        {cape.state === 'ACTIVE' && <small>Active</small>}
      </button>)}
      {!official && !error && <span className="official-capes-loading"><NativeIcon name="loader" size={13} className="wardrobe-spin" /> Loading your owned capes…</span>}
      {official && capes.length === 0 && <span className="official-capes-loading">No owned capes on this profile yet.</span>}
    </div>
  </section>;
}
