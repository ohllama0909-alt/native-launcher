import React, { useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import {
  ACCENT_PRESETS,
  CONTRAST_PRESETS,
  DEFAULT_APPEARANCE,
  RADIUS_PRESETS,
  SURFACE_PRESETS,
  normalizeHex,
  resetAppearance,
  useAppearance
} from '../../lib/appearance.js';
import './AppearancePanel.css';

function Segmented({ options, value, onChange }) {
  return (
    <div className="ap-segmented">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={'ap-segment' + (value === option.id ? ' active' : '')}
          onClick={() => onChange(option.id)}
        >
          {option.name}
        </button>
      ))}
    </div>
  );
}

function Switch({ checked, onChange }) {
  return (
    <button
      type="button"
      className={'ap-switch' + (checked ? ' active' : '')}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span className="ap-switch-knob" />
    </button>
  );
}

export default function AppearancePanel() {
  const [appearance, setAppearance] = useAppearance();
  const [hexDraft, setHexDraft] = useState(appearance.accent);

  const isDefault =
    appearance.accent === DEFAULT_APPEARANCE.accent &&
    appearance.surface === DEFAULT_APPEARANCE.surface &&
    appearance.contrast === DEFAULT_APPEARANCE.contrast &&
    appearance.radius === DEFAULT_APPEARANCE.radius &&
    appearance.scale === DEFAULT_APPEARANCE.scale &&
    appearance.wallpaperDim === DEFAULT_APPEARANCE.wallpaperDim &&
    appearance.animations === DEFAULT_APPEARANCE.animations &&
    appearance.glow === DEFAULT_APPEARANCE.glow;

  const pickAccent = (hex) => {
    setHexDraft(hex);
    setAppearance({ accent: hex });
  };

  const commitHex = (raw) => {
    const parsed = normalizeHex(raw);
    if (parsed) setAppearance({ accent: parsed });
    else setHexDraft(appearance.accent);
  };

  const handleReset = () => {
    const next = resetAppearance();
    setHexDraft(next.accent);
  };

  return (
    <div className="ap-panel">
      {/* ---------- accent ---------- */}
      <section className="ap-section">
        <div className="ap-section-head">
          <div>
            <h4 className="ap-section-title">Accent colour</h4>
            <p className="ap-section-desc">Buttons, highlights and focus rings across the launcher.</p>
          </div>
          <span className="ap-current-hex">{appearance.accent}</span>
        </div>

        <div className="ap-swatches">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.name}
              className={'ap-swatch' + (appearance.accent === preset.hex ? ' active' : '')}
              style={{ background: preset.hex }}
              onClick={() => pickAccent(preset.hex)}
            >
              {appearance.accent === preset.hex && <NativeIcon name="check" size={14} />}
            </button>
          ))}
        </div>

        <div className="ap-custom-row">
          <label className="ap-color-input">
            <input
              type="color"
              value={appearance.accent}
              onChange={(event) => pickAccent(event.target.value)}
            />
            <span>Custom</span>
          </label>

          <input
            className="ap-hex-input"
            value={hexDraft}
            spellCheck={false}
            onChange={(event) => setHexDraft(event.target.value)}
            onBlur={(event) => commitHex(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitHex(event.currentTarget.value);
            }}
          />
        </div>
      </section>

      {/* ---------- darkness ---------- */}
      <section className="ap-section">
        <div className="ap-section-head">
          <div>
            <h4 className="ap-section-title">Background</h4>
            <p className="ap-section-desc">How dark every surface in the launcher sits.</p>
          </div>
        </div>

        <div className="ap-surface-grid">
          {SURFACE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={'ap-surface-card' + (appearance.surface === preset.id ? ' active' : '')}
              onClick={() => setAppearance({ surface: preset.id })}
            >
              <span className="ap-surface-preview" style={{ background: preset.swatch }}>
                <span className="ap-surface-bar" />
                <span className="ap-surface-dot" />
              </span>
              <span className="ap-surface-name">{preset.name}</span>
              <span className="ap-surface-desc">{preset.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ---------- text + shape ---------- */}
      <section className="ap-section">
        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Text contrast</span>
            <span className="ap-row-desc">Dim the copy down or push it to pure white.</span>
          </div>
          <Segmented
            options={CONTRAST_PRESETS}
            value={appearance.contrast}
            onChange={(id) => setAppearance({ contrast: id })}
          />
        </div>

        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Corner rounding</span>
            <span className="ap-row-desc">Applies to cards, inputs, buttons and dialogs.</span>
          </div>
          <Segmented
            options={RADIUS_PRESETS}
            value={appearance.radius}
            onChange={(id) => setAppearance({ radius: id })}
          />
        </div>
      </section>

      {/* ---------- sliders ---------- */}
      <section className="ap-section">
        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Interface scale</span>
            <span className="ap-row-desc">Zoom the whole launcher up or down.</span>
          </div>
          <div className="ap-slider-control">
            <input
              type="range"
              min={80}
              max={130}
              step={5}
              value={appearance.scale}
              onChange={(event) => setAppearance({ scale: Number(event.target.value) })}
              className="ap-range"
            />
            <span className="ap-slider-value">{appearance.scale}%</span>
          </div>
        </div>

        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Home wallpaper dimming</span>
            <span className="ap-row-desc">Darken the instance artwork behind the home screen.</span>
          </div>
          <div className="ap-slider-control">
            <input
              type="range"
              min={0}
              max={95}
              step={5}
              value={appearance.wallpaperDim}
              onChange={(event) => setAppearance({ wallpaperDim: Number(event.target.value) })}
              className="ap-range"
            />
            <span className="ap-slider-value">{appearance.wallpaperDim}%</span>
          </div>
        </div>
      </section>

      {/* ---------- switches ---------- */}
      <section className="ap-section">
        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Animations</span>
            <span className="ap-row-desc">Card lifts, page transitions and hover motion.</span>
          </div>
          <Switch
            checked={appearance.animations}
            onChange={(next) => setAppearance({ animations: next })}
          />
        </div>

        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Accent glow</span>
            <span className="ap-row-desc">Soft coloured bloom under accented buttons and cards.</span>
          </div>
          <Switch checked={appearance.glow} onChange={(next) => setAppearance({ glow: next })} />
        </div>
      </section>

      {/* ---------- preview + reset ---------- */}
      <section className="ap-section">
        <h4 className="ap-section-title">Preview</h4>
        <div className="ap-preview">
          <div className="ap-preview-card">
            <div className="ap-preview-head">
              <span className="ap-preview-dot" />
              <span className="ap-preview-name">1.21.4 Fabric</span>
            </div>
            <div className="ap-preview-chips">
              <span className="ap-preview-chip mono">1.21.4</span>
              <span className="ap-preview-chip brand">Fabric</span>
            </div>
            <div className="ap-preview-actions">
              <button type="button" className="ap-preview-brand-btn">Play</button>
              <button type="button" className="ap-preview-ghost-btn">Manage</button>
            </div>
          </div>

          <div className="ap-preview-side">
            <div className="ap-preview-line long" />
            <div className="ap-preview-line" />
            <div className="ap-preview-line short" />
            <div className="ap-preview-bar">
              <span />
            </div>
          </div>
        </div>

        <button
          type="button"
          className="ap-reset-btn"
          onClick={handleReset}
          disabled={isDefault}
        >
          <NativeIcon name="refresh" size={14} />
          <span>Reset to defaults</span>
        </button>
      </section>
    </div>
  );
}
