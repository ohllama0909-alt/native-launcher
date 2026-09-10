import React, { useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import {
  ACCENT_PRESETS,
  CONTRAST_PRESETS,
  DEFAULT_APPEARANCE,
  RADIUS_PRESETS,
  SURFACE_PRESETS,
  normalizeHex,
  onAccentText,
  resetAppearance,
  useAppearance
} from '../../lib/appearance.js';
import './AppearancePanel.css';

/* Real theme values, hardcoded on purpose: the previews used to read live
   CSS variables, so every card painted with the *active* theme and looked
   blank/identical. These paint the actual palette of each option. */
const SURFACE_SWATCHES = {
  dim: { page: '#12151a', card: '#1a1f26', sunken: '#0e1116', line: '#242b34' },
  dark: { page: '#0e1014', card: '#15191f', sunken: '#0a0c10', line: '#1f242c' },
  midnight: { page: '#08090d', card: '#101319', sunken: '#050609', line: '#1a1f27' },
  black: { page: '#000000', card: '#08090c', sunken: '#000000', line: '#131519' }
};

const RADIUS_PX = { sharp: 2, soft: 10, round: 18 };

function SurfacePreview({ surfaceId, accent, radius }) {
  const palette = SURFACE_SWATCHES[surfaceId] || SURFACE_SWATCHES.midnight;
  const corner = RADIUS_PX[radius] ?? 10;

  return (
    <div className="ap-mock" style={{ background: palette.page, borderColor: palette.line }}>
      <div className="ap-mock-bar" style={{ background: palette.sunken, borderColor: palette.line }}>
        <span className="ap-mock-dot" style={{ background: accent }} />
        <span className="ap-mock-line" style={{ background: palette.line, width: 26 }} />
        <span className="ap-mock-line" style={{ background: palette.line, width: 16 }} />
      </div>

      <div className="ap-mock-body">
        <div
          className="ap-mock-card"
          style={{ background: palette.card, borderColor: palette.line, borderRadius: corner }}
        >
          <span className="ap-mock-line" style={{ background: palette.line, width: 34 }} />
          <span className="ap-mock-line" style={{ background: palette.line, width: 20 }} />
        </div>

        <div
          className="ap-mock-card"
          style={{ background: palette.card, borderColor: palette.line, borderRadius: corner }}
        >
          <span
            className="ap-mock-pill"
            style={{ background: accent, borderRadius: Math.max(3, corner - 3) }}
          />
          <span className="ap-mock-line" style={{ background: palette.line, width: 22 }} />
        </div>
      </div>
    </div>
  );
}

export default function AppearancePanel() {
  const [appearance, update] = useAppearance();
  const [hexDraft, setHexDraft] = useState(appearance.accent);

  const applyHex = (value) => {
    setHexDraft(value);
    const normalized = normalizeHex(value);
    if (normalized) update({ accent: normalized });
  };

  const accentText = onAccentText(appearance.accent);

  return (
    <div className="ap-panel">
      {/* ---------------- accent ---------------- */}
      <section className="ap-section">
        <div className="ap-section-head">
          <h4 className="ap-section-title">Accent colour</h4>
          <button type="button" className="ap-reset" onClick={() => {
            resetAppearance();
            setHexDraft(DEFAULT_APPEARANCE.accent);
          }}>
            <NativeIcon name="refresh" size={13} />
            <span>Reset all</span>
          </button>
        </div>

        <div className="ap-accent-row">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.name}
              className={'ap-accent-dot ' + (appearance.accent === preset.hex ? 'active' : '')}
              style={{ background: preset.hex }}
              onClick={() => {
                update({ accent: preset.hex });
                setHexDraft(preset.hex);
              }}
            >
              {appearance.accent === preset.hex && (
                <NativeIcon name="check" size={13} style={{ color: onAccentText(preset.hex) }} />
              )}
            </button>
          ))}

          <label className="ap-hex-field">
            <input
              type="color"
              value={normalizeHex(hexDraft) || appearance.accent}
              onChange={(event) => applyHex(event.target.value)}
              className="ap-hex-picker"
            />
            <input
              type="text"
              className="ap-hex-input"
              value={hexDraft}
              maxLength={7}
              spellCheck={false}
              onChange={(event) => applyHex(event.target.value)}
            />
          </label>
        </div>
      </section>

      {/* ---------------- surfaces ---------------- */}
      <section className="ap-section">
        <div className="ap-section-head">
          <h4 className="ap-section-title">Background</h4>
          <span className="ap-section-note">How dark the launcher chrome gets</span>
        </div>

        <div className="ap-surface-grid">
          {SURFACE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={'ap-surface-card ' + (appearance.surface === preset.id ? 'active' : '')}
              onClick={() => update({ surface: preset.id })}
            >
              <SurfacePreview
                surfaceId={preset.id}
                accent={appearance.accent}
                radius={appearance.radius}
              />

              <div className="ap-surface-meta">
                <span className="ap-surface-name">{preset.name}</span>
                <span className="ap-surface-desc">{preset.desc}</span>
              </div>

              {appearance.surface === preset.id && (
                <span className="ap-surface-check">
                  <NativeIcon name="check" size={12} />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* ---------------- shape and contrast ---------------- */}
      <section className="ap-section">
        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Contrast</span>
            <span className="ap-row-desc">Strength of borders and secondary text</span>
          </div>
          <div className="ap-segmented">
            {CONTRAST_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={appearance.contrast === preset.id ? 'active' : ''}
                onClick={() => update({ contrast: preset.id })}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Corner rounding</span>
            <span className="ap-row-desc">Applies to cards, buttons and menus</span>
          </div>
          <div className="ap-segmented">
            {RADIUS_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={appearance.radius === preset.id ? 'active' : ''}
                onClick={() => update({ radius: preset.id })}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Interface scale</span>
            <span className="ap-row-desc">Zoom the whole launcher</span>
          </div>
          <div className="ap-slider-wrap">
            <input
              type="range"
              min="80"
              max="130"
              step="5"
              value={appearance.scale}
              onChange={(event) => update({ scale: Number(event.target.value) })}
            />
            <span className="ap-slider-value">{appearance.scale}%</span>
          </div>
        </div>

        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Home wallpaper dim</span>
            <span className="ap-row-desc">Darkens the artwork behind the home page</span>
          </div>
          <div className="ap-slider-wrap">
            <input
              type="range"
              min="0"
              max="95"
              step="5"
              value={appearance.wallpaperDim}
              onChange={(event) => update({ wallpaperDim: Number(event.target.value) })}
            />
            <span className="ap-slider-value">{appearance.wallpaperDim}%</span>
          </div>
        </div>

        <div className="ap-wallpaper-preview">
          <div className="ap-wallpaper-art" />
          <div
            className="ap-wallpaper-scrim"
            style={{ opacity: appearance.wallpaperDim / 100 }}
          />
          <div className="ap-wallpaper-text">
            <span className="ap-wallpaper-title">Home wallpaper</span>
            <span className="ap-wallpaper-sub">Live preview of the dim level</span>
          </div>
        </div>

        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Animations</span>
            <span className="ap-row-desc">Transitions, hover lifts and page fades</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={appearance.animations}
              onChange={(event) => update({ animations: event.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>

        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Accent glow</span>
            <span className="ap-row-desc">Soft light around active and playing elements</span>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={appearance.glow}
              onChange={(event) => update({ glow: event.target.checked })}
            />
            <span className="slider" />
          </label>
        </div>
      </section>

      {/* ---------------- live sample ---------------- */}
      <section className="ap-section">
        <div className="ap-section-head">
          <h4 className="ap-section-title">Preview</h4>
          <span className="ap-section-note">Uses your current theme</span>
        </div>

        <div className="ap-live">
          <div className="ap-live-card">
            <span className="ap-live-title">Survival 1.21</span>
            <span className="ap-live-sub">Fabric - 42 mods</span>
            <div className="ap-live-chips">
              <span className="ap-live-chip">Vanilla</span>
              <span className="ap-live-chip brand">Playing</span>
            </div>
          </div>

          <div className="ap-live-side">
            <button
              type="button"
              className="ap-live-play"
              style={{ color: accentText }}
            >
              <NativeIcon name="play" size={14} />
              <span>Play</span>
            </button>
            <button type="button" className="ap-live-ghost">Secondary</button>
          </div>
        </div>
      </section>
    </div>
  );
}
