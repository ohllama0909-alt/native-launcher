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
import { useI18n } from '../../i18n/I18nProvider.jsx';

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
  const { t } = useI18n();
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
          <h4 className="ap-section-title">{t('appearance.accent')}</h4>
          <button type="button" className="ap-reset" onClick={() => {
            resetAppearance();
            setHexDraft(DEFAULT_APPEARANCE.accent);
          }}>
            <NativeIcon name="refresh" size={13} />
            <span>{t('appearance.reset')}</span>
          </button>
        </div>

        <div className="ap-accent-row">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={t(`appearance.accent.${preset.id}`)}
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
          <h4 className="ap-section-title">{t('appearance.background')}</h4>
          <span className="ap-section-note">{t('appearance.backgroundDesc')}</span>
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
                <span className="ap-surface-name">{t(`appearance.surface.${preset.id}`)}</span>
                <span className="ap-surface-desc">{t(`appearance.surfaceDesc.${preset.id}`)}</span>
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
            <span className="ap-row-title">{t('appearance.contrast')}</span>
            <span className="ap-row-desc">{t('appearance.contrastDesc')}</span>
          </div>
          <div className="ap-segmented">
            {CONTRAST_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={appearance.contrast === preset.id ? 'active' : ''}
                onClick={() => update({ contrast: preset.id })}
              >
                {t(`appearance.contrast.${preset.id}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">{t('appearance.rounding')}</span>
            <span className="ap-row-desc">{t('appearance.roundingDesc')}</span>
          </div>
          <div className="ap-segmented">
            {RADIUS_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={appearance.radius === preset.id ? 'active' : ''}
                onClick={() => update({ radius: preset.id })}
              >
                {t(`appearance.radius.${preset.id}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">{t('appearance.scale')}</span>
            <span className="ap-row-desc">{t('appearance.scaleDesc')}</span>
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
            <span className="ap-row-title">{t('appearance.wallpaperDim')}</span>
            <span className="ap-row-desc">{t('appearance.wallpaperDimDesc')}</span>
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

        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">Home character</span>
            <span className="ap-row-desc">Choose how your 3D skin moves on the Home page</span>
          </div>
          <div className="ap-segmented">
            <button
              type="button"
              className={appearance.homeAvatarMode === 'fly' ? 'active' : ''}
              onClick={() => update({ homeAvatarMode: 'fly' })}
            >
              Fly around
            </button>
            <button
              type="button"
              className={appearance.homeAvatarMode === 'runner' ? 'active' : ''}
              onClick={() => update({ homeAvatarMode: 'runner' })}
            >
              Run by Play
            </button>
          </div>
        </div>

        <div className="ap-wallpaper-preview">
          <div className="ap-wallpaper-art" />
          <div
            className="ap-wallpaper-scrim"
            style={{ opacity: appearance.wallpaperDim / 100 }}
          />
          <div className="ap-wallpaper-text">
            <span className="ap-wallpaper-title">{t('appearance.homeWallpaper')}</span>
            <span className="ap-wallpaper-sub">{t('appearance.liveDim')}</span>
          </div>
        </div>

        <div className="ap-row">
          <div className="ap-row-info">
            <span className="ap-row-title">{t('appearance.animations')}</span>
            <span className="ap-row-desc">{t('appearance.animationsDesc')}</span>
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
            <span className="ap-row-title">{t('appearance.glow')}</span>
            <span className="ap-row-desc">{t('appearance.glowDesc')}</span>
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
          <h4 className="ap-section-title">{t('create.preview')}</h4>
          <span className="ap-section-note">{t('appearance.previewDesc')}</span>
        </div>

        <div className="ap-live">
          <div className="ap-live-card">
            <span className="ap-live-title">{t('appearance.sampleTitle')}</span>
            <span className="ap-live-sub">Fabric · 42 mods</span>
            <div className="ap-live-chips">
              <span className="ap-live-chip">Vanilla</span>
              <span className="ap-live-chip brand">{t('appearance.playing')}</span>
            </div>
          </div>

          <div className="ap-live-side">
            <button
              type="button"
              className="ap-live-play"
              style={{ color: accentText }}
            >
              <NativeIcon name="play" size={14} />
              <span>{t('instances.play')}</span>
            </button>
            <button type="button" className="ap-live-ghost">{t('appearance.secondary')}</button>
          </div>
        </div>
      </section>
    </div>
  );
}
