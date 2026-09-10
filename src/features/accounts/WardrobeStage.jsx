import React from 'react';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';

function Spin({ active, name }) {
  return <NativeIcon name={active ? 'loader' : name} size={14} className={active ? 'wardrobe-spin' : ''} />;
}

export default function WardrobeStage({ account, slot = {}, index, isWearing, busy, onChoose, onSelect, onSetModel, onPublish }) {
  const occupied = slot.hasSkin || slot.hasCape;
  const preview = { ...account, skinUrl: slot.skinUrl || account.skinUrl, capeUrl: slot.capeUrl || account.capeUrl };
  const model = slot.model === 'slim' ? 'slim' : 'classic';
  const locked = Boolean(busy);

  return <section className={`wardrobe-stage ${isWearing ? 'is-wearing' : ''}`} data-testid="wardrobe-stage">
    <div className="wardrobe-stage-top">
      <div className="wardrobe-stage-title"><span className="wardrobe-kicker">Outfit {index + 1}</span><h2>{occupied ? (slot.hasSkin ? 'Custom skin' : 'Default skin') : 'Empty outfit'}</h2></div>
      {isWearing ? <span className="wardrobe-badge wearing" data-testid="wardrobe-stage-wearing"><NativeIcon name="check" size={11} /> Wearing</span> : <span className="wardrobe-badge" data-testid="wardrobe-stage-preview">Preview</span>}
    </div>

    <div className="wardrobe-stage-canvas">
      <SkinViewer3D account={preview} width={300} height={400} animation="walk" autoRotate />
      {!occupied && <div className="wardrobe-stage-hint"><NativeIcon name="sparkles" size={14} /> Showing your current profile skin</div>}
    </div>

    <div className="wardrobe-stage-details">
      <div className="wardrobe-detail">
        <span className="wardrobe-detail-label">Cape</span>
        <div className={`wardrobe-cape-thumb ${slot.hasCape ? '' : 'missing'}`}>{slot.hasCape ? <img src={slot.capeUrl} alt={`Cape for outfit ${index + 1}`} /> : <NativeIcon name="image" size={16} />}</div>
        <span className="wardrobe-detail-value">{slot.hasCape ? 'Custom PNG' : 'None'}</span>
      </div>
      <div className="wardrobe-detail">
        <span className="wardrobe-detail-label">Arms</span>
        <div className="wardrobe-segment" role="group" aria-label="Player model" data-testid="wardrobe-model-toggle">
          <button type="button" className={model === 'classic' ? 'active' : ''} data-testid="wardrobe-model-classic" onClick={() => model !== 'classic' && onSetModel(index, 'classic')} disabled={locked}>Classic</button>
          <button type="button" className={model === 'slim' ? 'active' : ''} data-testid="wardrobe-model-slim" onClick={() => model !== 'slim' && onSetModel(index, 'slim')} disabled={locked}>Slim</button>
        </div>
        <span className="wardrobe-detail-value">{model === 'slim' ? '3px wide' : '4px wide'}</span>
      </div>
    </div>

    <div className="wardrobe-stage-actions">
      <button type="button" className="wardrobe-btn" data-testid="wardrobe-choose-skin" onClick={() => onChoose('skin', index)} disabled={locked}><Spin active={busy === `skin-${index}`} name="user" /> {slot.hasSkin ? 'Replace skin' : 'Add skin PNG'}</button>
      <button type="button" className="wardrobe-btn" data-testid="wardrobe-choose-cape" onClick={() => onChoose('cape', index)} disabled={locked}><Spin active={busy === `cape-${index}`} name="image" /> {slot.hasCape ? 'Replace cape' : 'Add cape PNG'}</button>
      <button type="button" className="wardrobe-btn primary" data-testid="wardrobe-wear-btn" onClick={() => onSelect(index)} disabled={isWearing || locked}><Spin active={busy === `select-${index}`} name="check" /> {isWearing ? 'Currently worn' : 'Wear this outfit'}</button>
    </div>
    {account.isMicrosoft && slot.hasSkin && <button type="button" className="wardrobe-btn subtle wardrobe-publish" data-testid="wardrobe-publish-btn" onClick={() => onPublish(index)} disabled={locked}><Spin active={busy === `official-${index}`} name="upload" /> Apply skin to official Minecraft profile</button>}
  </section>;
}
