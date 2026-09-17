import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Cloud,
  Code2,
  Cpu,
  Maximize2,
  Monitor,
  RotateCcw,
  Save,
  Settings2
} from 'lucide-react';

const presets = [
  ['1080p', 1920, 1080],
  ['1440p', 2560, 1440],
  ['4K', 3840, 2160]
];

function Toggle({ label = 'Enabled', checked, onChange, disabled = false }) {
  return (
    <label className="im-toggle">
      <span className="im-toggle-label">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function initialDraft(cluster, global) {
  const ov = cluster.overrides || {};
  return {
    resolution: {
      ...(global.resolution || { width: 854, height: 480, fullscreen: false }),
      ...ov.resolution,
      enabled: !!ov.resolution?.enabled,
      lockAspect: ov.resolution?.lockAspect ?? true,
      borderless: ov.resolution?.borderless ?? false
    },
    memory: {
      ...(global.memory || { min: 1, max: 4 }),
      ...ov.memory,
      enabled: !!ov.memory?.enabled
    },
    jvmEnabled: ov.jvmEnabled ?? !!(ov.jvmArgs || ov.java?.enabled),
    javaPath: ov.java?.path || '',
    jvmArgs: ov.jvmArgs || ''
  };
}

export default function SettingsTab({ cluster, onUpdateCluster, query = '', enabledOnly = false, onDirtyChange }) {
  const [draft, setDraft] = useState(() => initialDraft(cluster, {}));
  const [baseline, setBaseline] = useState(() => JSON.stringify(initialDraft(cluster, {})));
  const [systemRam, setSystemRam] = useState(32);
  const [globals, setGlobals] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const ratio = useRef(16 / 9);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setError('');
    Promise.all([window.native.settings.load(), window.native.settings.systemMemory()])
      .then(([global, memory]) => {
        if (cancelled) return;
        const next = initialDraft(cluster, global);
        setGlobals(global);
        setSystemRam(Math.max(1, Math.floor(memory.totalGb)));
        setDraft(next);
        setBaseline(JSON.stringify(next));
        ratio.current = next.resolution.width / next.resolution.height;
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Could not read settings.');
      });
    return () => {
      cancelled = true;
    };
  }, [cluster.id, retry]);

  const dirty = !!draft && JSON.stringify(draft) !== baseline;
  useEffect(() => {
    onDirtyChange?.(dirty || saving);
  }, [dirty, saving, onDirtyChange]);

  const change = (key, value) => {
    setSaved(false);
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const resolution = (values) => change('resolution', { ...draft.resolution, ...values });

  const applySize = (width, height) => {
    resolution({ width, height });
    ratio.current = width / height;
  };

  const changeDimension = (key, value) => {
    const next = { [key]: value };
    if (draft.resolution.lockAspect && Number(value) > 0) {
      next[key === 'width' ? 'height' : 'width'] = Math.round(
        key === 'width' ? Number(value) / ratio.current : Number(value) * ratio.current
      );
    }
    resolution(next);
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const next = {
        ...draft,
        resolution: {
          ...draft.resolution,
          width: Number(draft.resolution.width),
          height: Number(draft.resolution.height)
        }
      };
      if (
        next.resolution.enabled &&
        (!Number.isInteger(next.resolution.width) ||
          !Number.isInteger(next.resolution.height) ||
          next.resolution.width < 320 ||
          next.resolution.width > 7680 ||
          next.resolution.height < 240 ||
          next.resolution.height > 4320)
      ) {
        throw new Error('Resolution must be 320–7680 pixels wide and 240–4320 pixels high.');
      }
      await onUpdateCluster(cluster.id, {
        overrides: {
          ...cluster.overrides,
          resolution: next.resolution,
          memory: { ...next.memory, min: Math.min(next.memory.min || 1, next.memory.max) },
          jvmEnabled: next.jvmEnabled,
          java: { enabled: next.jvmEnabled && !!next.javaPath.trim(), path: next.javaPath.trim() },
          jvmArgs: next.jvmArgs.trim()
        }
      });
      setDraft(next);
      setBaseline(JSON.stringify(next));
      setSaved(true);
    } catch (err) {
      setError(err.message || 'Settings could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (!draft) {
    return (
      <div className="im-empty">
        {error ? (
          <>
            <span role="alert">{error}</span>
            <button type="button" onClick={() => setRetry((value) => value + 1)}>
              Retry
            </button>
          </>
        ) : (
          'Loading settings…'
        )}
      </div>
    );
  }

  const show = (text, enabled) =>
    text.toLowerCase().includes(query.toLowerCase()) && (!enabledOnly || enabled);
  const r = draft.resolution;
  const m = draft.memory;

  return (
    <form className="im-settings" onSubmit={save} noValidate>
      <div className="im-panel im-settings-scroll">
        {/* Warning Banner per Screen 6 */}
        <div className="im-settings-alert-banner">
          <div className="im-settings-alert-left">
            <AlertTriangle size={18} className="im-settings-alert-icon" />
            <span className="im-settings-alert-text">
              Proceed with caution. Modifying these settings may cause game instability.
            </span>
          </div>
          <div className="im-settings-sync-status">
            <Cloud size={12} />
            <span>Overrides: {cluster.name || cluster.version}</span>
          </div>
        </div>

        {/* Override Summary Chips */}
        <div className="im-settings-summary" aria-label="Override summary">
          <div className={`im-summary-chip ${r.enabled ? 'is-active' : ''}`}>
            <Maximize2 size={14} className="im-summary-icon" />
            <div className="im-summary-details">
              <span className="im-summary-name">Display</span>
              <span className="im-summary-value">
                {r.enabled ? `${r.width} × ${r.height}` : 'Global default'}
              </span>
            </div>
          </div>

          <div className={`im-summary-chip ${m.enabled ? 'is-active' : ''}`}>
            <Cpu size={14} className="im-summary-icon" />
            <div className="im-summary-details">
              <span className="im-summary-name">Memory</span>
              <span className="im-summary-value">
                {m.enabled ? `${m.max} GB / ${systemRam} GB` : 'Global default'}
              </span>
            </div>
          </div>

          <div className={`im-summary-chip ${draft.jvmEnabled ? 'is-active' : ''}`}>
            <Code2 size={14} className="im-summary-icon" />
            <div className="im-summary-details">
              <span className="im-summary-name">Java</span>
              <span className="im-summary-value">
                {draft.jvmEnabled ? 'Custom runtime' : 'Automatic'}
              </span>
            </div>
          </div>
        </div>

        {/* Section 1: Game Resolution */}
        {show('Game resolution fullscreen display aspect ratio', r.enabled) && (
          <section className="im-setting-card">
            <header className="im-setting-card-header">
              <div className="im-setting-card-icon-title">
                <div className={`im-setting-card-icon ${r.enabled ? 'is-active' : ''}`}>
                  <Maximize2 size={18} />
                </div>
                <div>
                  <h3 className="im-setting-card-title">Game Resolution</h3>
                  <p className="im-setting-card-desc">
                    Define custom launch resolution and display mode for this profile.
                  </p>
                </div>
              </div>
              <Toggle checked={r.enabled} onChange={(enabled) => resolution({ enabled })} />
            </header>

            <fieldset className="im-setting-card-body" disabled={!r.enabled || saving}>
              <div className="im-resolution-row">
                <label className="im-dimension-field">
                  <span className="im-dimension-label">W</span>
                  <input
                    aria-label="Window width"
                    type="number"
                    min="320"
                    max="7680"
                    required
                    value={r.width}
                    onChange={(event) => changeDimension('width', event.target.value)}
                  />
                </label>

                <span className="im-dimension-multiply">×</span>

                <label className="im-dimension-field">
                  <span className="im-dimension-label">H</span>
                  <input
                    aria-label="Window height"
                    type="number"
                    min="240"
                    max="4320"
                    required
                    value={r.height}
                    onChange={(event) => changeDimension('height', event.target.value)}
                  />
                </label>

                <div className="im-resolution-toggles">
                  <Toggle
                    label="Fullscreen mode"
                    checked={!!r.fullscreen}
                    onChange={(fullscreen) => resolution({ fullscreen })}
                  />
                  <Toggle
                    label="Lock aspect ratio"
                    checked={r.lockAspect}
                    onChange={(lockAspect) => {
                      ratio.current = Number(r.width) / Number(r.height) || 16 / 9;
                      resolution({ lockAspect });
                    }}
                  />
                </div>

                <button
                  type="button"
                  className="im-reset-btn"
                  title="Reset to global resolution"
                  aria-label="Reset to global resolution"
                  onClick={() => applySize(globals.resolution?.width || 854, globals.resolution?.height || 480)}
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Presets */}
              <div className="im-resolution-presets">
                <span className="im-presets-label">Presets:</span>
                {presets.map(([label, width, height]) => (
                  <button
                    type="button"
                    key={label}
                    className={`im-preset-pill ${Number(r.width) === width && Number(r.height) === height ? 'is-active' : ''}`}
                    onClick={() => applySize(width, height)}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  className="im-preset-pill is-native"
                  onClick={() =>
                    applySize(
                      Math.round(screen.width * (window.devicePixelRatio || 1)),
                      Math.round(screen.height * (window.devicePixelRatio || 1))
                    )
                  }
                >
                  <Monitor size={12} /> Match native display
                </button>
              </div>
            </fieldset>
          </section>
        )}

        {/* Section 2: Allocated Memory (RAM) */}
        {show('Allocated memory RAM', m.enabled) && (
          <section className="im-setting-card">
            <header className="im-setting-card-header">
              <div className="im-setting-card-icon-title">
                <div className={`im-setting-card-icon ${m.enabled ? 'is-active' : ''}`}>
                  <Cpu size={18} />
                </div>
                <div>
                  <h3 className="im-setting-card-title">Allocated Memory (RAM)</h3>
                  <p className="im-setting-card-desc">
                    Overrides global RAM allocation for this specific Minecraft instance.
                  </p>
                </div>
              </div>
              <Toggle checked={m.enabled} onChange={(enabled) => change('memory', { ...m, enabled })} />
            </header>

            <fieldset className="im-setting-card-body" disabled={!m.enabled || saving}>
              <div className="im-memory-header">
                <div className="im-memory-badge">
                  <strong>{m.max} GB</strong>
                  <span>/ {systemRam} GB Total</span>
                </div>
                <button
                  type="button"
                  className="im-reset-btn"
                  title="Reset to recommended memory"
                  aria-label="Reset to recommended memory"
                  onClick={() => change('memory', { ...m, max: Math.min(globals.memory?.max || 4, systemRam) })}
                >
                  <RotateCcw size={14} />
                  <span>Recommended</span>
                </button>
              </div>

              <div className="im-memory-slider-wrap">
                <input
                  aria-label="Allocated memory"
                  type="range"
                  min="1"
                  max={systemRam}
                  step="1"
                  value={m.max}
                  onChange={(event) => change('memory', { ...m, max: Number(event.target.value) })}
                  className="im-slider"
                />
                <div className="im-memory-ticks">
                  <span>1 GB</span>
                  <span>{Math.max(2, Math.round(systemRam * 0.25))} GB</span>
                  <span>{Math.max(4, Math.round(systemRam * 0.5))} GB</span>
                  <span>{Math.max(6, Math.round(systemRam * 0.75))} GB</span>
                  <span>{systemRam} GB</span>
                </div>
              </div>

              {m.max > systemRam && (
                <p className="im-caution-note">
                  <AlertCircle size={13} /> This allocation exceeds available physical system memory.
                </p>
              )}
            </fieldset>
          </section>
        )}

        {/* Section 3: JVM Arguments */}
        {show('JVM arguments Java executable performance', draft.jvmEnabled) && (
          <section className="im-setting-card">
            <header className="im-setting-card-header">
              <div className="im-setting-card-icon-title">
                <div className={`im-setting-card-icon ${draft.jvmEnabled ? 'is-active' : ''}`}>
                  <Code2 size={18} />
                </div>
                <div>
                  <h3 className="im-setting-card-title">JVM Arguments & Runtime</h3>
                  <p className="im-setting-card-desc">
                    Custom Java runtime path and execution flags for garbage collection and performance tuning.
                  </p>
                </div>
              </div>
              <Toggle checked={draft.jvmEnabled} onChange={(value) => change('jvmEnabled', value)} />
            </header>

            <fieldset className="im-setting-card-body" disabled={!draft.jvmEnabled || saving}>
              <label className="im-field-group">
                <span className="im-field-label">Java executable path</span>
                <input
                  className="im-field-input"
                  value={draft.javaPath}
                  onChange={(event) => change('javaPath', event.target.value)}
                  placeholder="Automatically detected bundled Java"
                />
              </label>

              <label className="im-field-group">
                <span className="im-field-label">Launch arguments</span>
                <textarea
                  className="im-field-textarea"
                  rows={2}
                  value={draft.jvmArgs}
                  onChange={(event) => change('jvmArgs', event.target.value)}
                  placeholder="-XX:+UseG1GC -XX:+ParallelRefProcEnabled"
                />
              </label>
            </fieldset>
          </section>
        )}

        {!['Game resolution fullscreen display aspect ratio', 'Allocated memory RAM', 'JVM arguments Java executable performance'].some(
          (text, i) => show(text, [r.enabled, m.enabled, draft.jvmEnabled][i])
        ) && (
          <div className="im-empty">No matching settings found.</div>
        )}
      </div>

      {/* Sticky Save Footer */}
      <footer className="im-settings-footer">
        <span className={`im-status-text ${error ? 'is-error' : saved ? 'is-saved' : dirty ? 'is-dirty' : ''}`} role={error ? 'alert' : 'status'}>
          {error || (saved ? 'Changes saved. Applies on next launch.' : dirty ? 'Unsaved changes' : 'Disabled overrides inherit global defaults.')}
        </span>
        <button
          type="submit"
          className="im-save-btn"
          disabled={saving || !dirty || (m.enabled && m.max > systemRam)}
        >
          {saved ? <Check size={14} /> : <Save size={14} />}
          <span>{saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}</span>
        </button>
      </footer>
    </form>
  );
}
