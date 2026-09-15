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
import cavesArt from '../../assets/backgrounds/CavesAndCliffs.jpg';
import netherArt from '../../assets/backgrounds/Nether_Update.jpg';
import trialsArt from '../../assets/backgrounds/Tricky_Trials.jpg';
import wildArt from '../../assets/backgrounds/Wild_Update.jpg';

/* Real theme values, hardcoded on purpose: the previews used to read live
   CSS variables, so every card painted with the *active* theme and looked
   blank/identical. These paint the actual palette of each option. */
const SURFACE_SWATCHES = {
  dim: { page: '#12151a', card: '#1a1f26', sunken: '#0e1116', line: '#2a313b', art: cavesArt },
  dark: { page: '#0e1014', card: '#15191f', sunken: '#0a0c10', line: '#242a33', art: wildArt },
  midnight: { page: '#08090d', card: '#101319', sunken: '#050609', line: '#1d222b', art: trialsArt },
  black: { page: '#000000', card: '#08090c', sunken: '#000000', line: '#17191e', art: netherArt }
};

const RADIUS_PX = { sharp: 2, soft: 10, round: 18 };

function SurfacePreview({ surfaceId, accent, radius }) {
  const palette = SURFACE_SWATCHES[surfaceId] || SURFACE_SWATCHES.midnight;
  const corner = RADIUS_PX[radius] ?? 10;

  return (
    <div className="ap-mock" style={{ background: palette.page, borderColor: palette.line, '--preview-accent': accent, '--preview-corner': `${corner}px` }}>
      <div className="ap-mock-sidebar" style={{ background: palette.sunken, borderColor: palette.line }}>
        <span className="ap-mock-logo" style={{ background: accent }}>N</span>
        <span className="ap-mock-nav is-active"><i style={{ background: accent }} /><b style={{ background: palette.line }} /></span>
        <span className="ap-mock-nav"><i style={{ background: palette.line }} /><b style={{ background: palette.line }} /></span>
        <span className="ap-mock-nav"><i style={{ background: palette.line }} /><b style={{ background: palette.line }} /></span>
      </div>
      <div className="ap-mock-main">
        <div className="ap-mock-bar" style={{ background: palette.sunken, borderColor: palette.line }}>
          <span className="ap-mock-line" style={{ background: palette.line, width: 24 }} />
          <span className="ap-mock-line" style={{ background: palette.line, width: 14 }} />
        </div>
        <div className="ap-mock-content">
          <div className="ap-mock-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,0,0,.78), rgba(0,0,0,.12)), url(${palette.art})`, borderRadius: Math.max(3, corner - 2) }}>
            <span className="ap-mock-hero-title" />
            <span className="ap-mock-hero-copy" />
            <span className="ap-mock-pill" style={{ background: accent, borderRadius: Math.max(3, corner - 4) }} />
          </div>
          <div className="ap-mock-cards">
            {[0, 1, 2].map((item) => (
              <span key={item} className="ap-mock-card" style={{ background: palette.card, borderColor: palette.line, borderRadius: Math.max(3, corner - 3) }}>
                <i style={{ backgroundImage: `url(${palette.art})` }} />
                <b style={{ background: palette.line }} />
              </span>
            ))}
          </div>
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



        <div className="ap-wallpaper-preview">
          <img className="ap-wallpaper-art" src={trialsArt} alt="" />
          <div
            className="ap-wallpaper-scrim"
            style={{ opacity: appearance.wallpaperDim / 100 }}
          />
          <span className="ap-wallpaper-window"><i /><i /><i /></span>
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
