import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Code2, Cpu, Maximize2, Monitor, RotateCcw, Save, Settings2 } from 'lucide-react';

const presets = [['1080p', 1920, 1080], ['1440p', 2560, 1440], ['4K', 3840, 2160]];

function Toggle({ label = 'Enabled', checked, onChange, disabled = false }) {
  return (
    <label className="im-toggle">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
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
  const [draft, setDraft] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [systemRam, setSystemRam] = useState(null);
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
      .catch(err => {
        if (!cancelled) setError(err.message || 'Could not read settings.');
      });
    return () => { cancelled = true; };
  }, [cluster.id, retry]);

  const dirty = !!draft && JSON.stringify(draft) !== baseline;
  useEffect(() => {
    onDirtyChange?.(dirty || saving);
  }, [dirty, saving, onDirtyChange]);

  const change = (key, value) => {
    setSaved(false);
    setDraft(current => ({ ...current, [key]: value }));
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

  const save = async event => {
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
            <button onClick={() => setRetry(value => value + 1)}>Retry</button>
          </>
        ) : (
          'Loading settings…'
        )}
      </div>
    );
  }

  const show = (text, enabled) => text.toLowerCase().includes(query.toLowerCase()) && (!enabledOnly || enabled);
  const r = draft.resolution;
  const m = draft.memory;

  return (
    <form className="im-settings" onSubmit={save} noValidate>
      <div className="im-panel im-settings-scroll">
        <header className="im-section-heading">
          <span className="im-heading-icon"><Settings2 size={24}/></span>
          <div className="im-heading-text">
            <h2>Advanced Settings</h2>
            <p className="im-caution">
              <AlertCircle size={13}/> Proceed with caution. Modifying these settings may cause game instability.
            </p>
          </div>
          <small className="im-heading-badge">Overrides active profile only<br/>{cluster.name || cluster.version}</small>
        </header>

        <div className="im-settings-summary" aria-label="Override summary">
          <span className={r.enabled ? 'is-active' : ''}><Maximize2 size={14}/><b>Display</b><small>{r.enabled ? `${r.width} × ${r.height}` : 'Global default'}</small></span>
          <span className={m.enabled ? 'is-active' : ''}><Cpu size={14}/><b>Memory</b><small>{m.enabled ? `${m.max} GB` : 'Global default'}</small></span>
          <span className={draft.jvmEnabled ? 'is-active' : ''}><Code2 size={14}/><b>Java</b><small>{draft.jvmEnabled ? 'Custom runtime' : 'Automatic'}</small></span>
        </div>

        {show('Game resolution fullscreen display aspect ratio', r.enabled) && (
          <section className="im-setting">
            <span className={`im-setting-icon ${r.enabled ? 'is-active' : ''}`}><Maximize2 size={20}/></span>
            <div>
              <header>
                <div>
                  <h3>Game Resolution</h3>
                  <p>Define custom launch resolution and fullscreen preferences.</p>
                </div>
                <Toggle checked={r.enabled} onChange={enabled => resolution({ enabled })}/>
              </header>
              <fieldset disabled={!r.enabled || saving}>
                <div className="im-resolution">
                  <label>
                    W
                    <input
                      aria-label="Window width"
                      type="number"
                      min="320"
                      max="7680"
                      required
                      value={r.width}
                      onChange={event => changeDimension('width', event.target.value)}
                    />
                  </label>
                  <label>
                    H
                    <input
                      aria-label="Window height"
                      type="number"
                      min="240"
                      max="4320"
                      required
                      value={r.height}
                      onChange={event => changeDimension('height', event.target.value)}
                    />
                  </label>
                  <Toggle
                    label="Fullscreen mode"
                    checked={!!r.fullscreen}
                    onChange={fullscreen => resolution({ fullscreen })}
                  />
                  <Toggle
                    label="Lock aspect ratio"
                    checked={r.lockAspect}
                    onChange={lockAspect => {
                      ratio.current = Number(r.width) / Number(r.height) || 16 / 9;
                      resolution({ lockAspect });
                    }}
                  />
                  <button
                    type="button"
                    title="Reset to global resolution"
                    aria-label="Reset to global resolution"
                    onClick={() => applySize(globals.resolution.width, globals.resolution.height)}
                  >
                    <RotateCcw size={14}/>
                  </button>
                </div>

                <div className="im-presets">
                  {presets.map(([label, width, height]) => (
                    <button
                      type="button"
                      key={label}
                      className={Number(r.width) === width && Number(r.height) === height ? 'is-active' : ''}
                      onClick={() => applySize(width, height)}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => applySize(Math.round(screen.width * devicePixelRatio), Math.round(screen.height * devicePixelRatio))}
                  >
                    <Monitor size={12}/> Match native display
                  </button>
                  <span title="Borderless mode requires a compatible Minecraft mod.">
                    Borderless: requires a mod
                  </span>
                </div>
              </fieldset>
            </div>
          </section>
        )}

        {show('Allocated memory RAM', m.enabled) && (
          <section className="im-setting">
            <span className={`im-setting-icon ${m.enabled ? 'is-active' : ''}`}><Cpu size={20}/></span>
            <div>
              <header>
                <div>
                  <h3>Allocated Memory</h3>
                  <p>Overrides global RAM settings for this specific profile.</p>
                </div>
                <Toggle checked={m.enabled} onChange={enabled => change('memory', { ...m, enabled })}/>
              </header>
              <fieldset disabled={!m.enabled || saving}>
                <div className="im-memory">
                  <strong>{m.max} GB <small>/ {systemRam} GB</small></strong>
                  <input
                    aria-label="Allocated memory"
                    type="range"
                    min="1"
                    max={systemRam}
                    step="1"
                    value={m.max}
                    onChange={event => change('memory', { ...m, max: Number(event.target.value) })}
                  />
                  <button
                    type="button"
                    title="Reset to global memory"
                    aria-label="Reset to global memory"
                    onClick={() => change('memory', { ...m, max: Math.min(globals.memory?.max || 4, systemRam) })}
                  >
                    <RotateCcw size={14}/>
                  </button>
                </div>
                <div className="im-memory-ticks">
                  <span>1 GB</span>
                  <span>{Math.round(systemRam / 4)} GB</span>
                  <span>{Math.round(systemRam / 2)} GB</span>
                  <span>{Math.round(systemRam * 0.75)} GB</span>
                  <span>{systemRam} GB</span>
                </div>
                {m.max > systemRam && (
                  <p className="im-caution">This allocation exceeds available system memory.</p>
                )}
              </fieldset>
            </div>
          </section>
        )}

        {show('JVM arguments Java executable performance', draft.jvmEnabled) && (
          <section className="im-setting">
            <span className={`im-setting-icon ${draft.jvmEnabled ? 'is-active' : ''}`}><Code2 size={20}/></span>
            <div>
              <header>
                <div>
                  <h3>JVM Arguments</h3>
                  <p>Custom Java execution flags for advanced performance tweaking.</p>
                </div>
                <Toggle checked={draft.jvmEnabled} onChange={value => change('jvmEnabled', value)}/>
              </header>
              <fieldset disabled={!draft.jvmEnabled || saving}>
                <label className="im-java-field">
                  <span>Java executable</span>
                  <input
                    value={draft.javaPath}
                    onChange={event => change('javaPath', event.target.value)}
                    placeholder="Automatically detected"
                  />
                </label>
                <label className="im-java-field">
                  <span>Launch arguments</span>
                  <textarea
                    rows={2}
                    value={draft.jvmArgs}
                    onChange={event => change('jvmArgs', event.target.value)}
                    placeholder="-XX:+UseG1GC"
                  />
                </label>
              </fieldset>
            </div>
          </section>
        )}

        {!['Game resolution fullscreen display aspect ratio', 'Allocated memory RAM', 'JVM arguments Java executable performance'].some(
          (text, i) => show(text, [r.enabled, m.enabled, draft.jvmEnabled][i])
        ) && (
          <div className="im-empty">No matching settings found.</div>
        )}
      </div>

      <footer className="im-settings-footer">
        <span role={error ? 'alert' : 'status'}>
          {error || (saved ? 'Changes saved. Apply on next launch.' : dirty ? 'Unsaved changes' : 'Disabled overrides use global settings.')}
        </span>
        <button
          type="submit"
          disabled={saving || !dirty || (m.enabled && m.max > systemRam)}
        >
          {saved ? <Check size={14}/> : <Save size={14}/>} {saving ? 'Saving…' : saved ? 'Saved' : 'Save changes'}
        </button>
      </footer>
    </form>
  );
}
