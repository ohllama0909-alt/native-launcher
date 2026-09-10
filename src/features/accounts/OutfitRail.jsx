import React from 'react';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';

function OutfitCard({ slot, index, account, isWearing, isCurrent, busy, onFocus, onChoose, onSelect }) {
  const occupied = slot.hasSkin || slot.hasCape;
  const preview = { ...account, skinUrl: slot.skinUrl || account.skinUrl, capeUrl: slot.capeUrl || account.capeUrl };
  const locked = Boolean(busy);

  if (!occupied) {
    return <button type="button" className={`outfit-card empty ${isCurrent ? 'current' : ''}`} data-testid={`outfit-card-${index}`} onClick={() => { onFocus(index); onChoose('skin', index); }} disabled={locked}>
      <span className="outfit-card-plus"><NativeIcon name={busy === `skin-${index}` ? 'loader' : 'plus'} size={18} className={busy === `skin-${index}` ? 'wardrobe-spin' : ''} /></span>
      <span className="outfit-card-text"><strong>Outfit {index + 1}</strong><small>Add a skin PNG to begin</small></span>
    </button>;
  }

  return <div className={`outfit-card ${isCurrent ? 'current' : ''} ${isWearing ? 'wearing' : ''}`} data-testid={`outfit-card-${index}`} role="button" tabIndex={0} onClick={() => onFocus(index)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onFocus(index); } }}>
    <div className="outfit-card-figure"><SkinViewer3D account={preview} width={72} height={96} animation="idle" autoRotate={false} /></div>
    <div className="outfit-card-text">
      <strong>Outfit {index + 1}</strong>
      <small>{slot.hasSkin ? 'Custom skin' : 'Default skin'} · {slot.hasCape ? 'Cape' : 'No cape'} · {slot.model === 'slim' ? 'Slim' : 'Classic'}</small>
    </div>
    {isWearing ? <span className="wardrobe-badge wearing compact"><NativeIcon name="check" size={10} /></span>
      : <button type="button" className="outfit-card-wear" data-testid={`outfit-wear-${index}`} onClick={(event) => { event.stopPropagation(); onSelect(index); }} disabled={locked}>{busy === `select-${index}` ? <NativeIcon name="loader" size={12} className="wardrobe-spin" /> : 'Wear'}</button>}
  </div>;
}

export default function OutfitRail({ slots, account, selected, current, busy, onFocus, onChoose, onSelect }) {
  return <aside className="outfit-rail" data-testid="outfit-rail">
    <div className="outfit-rail-head"><span className="wardrobe-kicker">Outfits</span><span className="outfit-rail-count">{slots.length} slots</span></div>
    <div className="outfit-rail-list">
      {slots.map((slot, index) => <OutfitCard key={index} slot={slot} index={index} account={account} isWearing={selected === index} isCurrent={current === index} busy={busy} onFocus={onFocus} onChoose={onChoose} onSelect={onSelect} />)}
    </div>
    <p className="outfit-rail-tip"><NativeIcon name="info" size={12} /> Pick a card to preview it on stage, then press Wear.</p>
  </aside>;
}
