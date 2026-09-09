import { useEffect, useState } from 'react';
import {
  Coffee,
  Gamepad2,
  SlidersHorizontal,
  HardDrive,
  Palette,
  Search,
  Loader2,
  FolderOpen,
  Download,
  CheckCircle2,
  XCircle,
  Sparkles,
  RefreshCw,
  Monitor,
  Rocket,
} from 'lucide-react';
import appIcon from '../../../icon.png';
import Dropdown from '../../components/ui/Dropdown.jsx';
import Toggle from '../../components/ui/Toggle.jsx';
import useSettings from './useSettings.js';
import './SettingsModal.css';

const NAV = [
  {
    group: 'Launcher',
    items: [
      { id: 'behavior',   label: 'Behavior',    icon: SlidersHorizontal },
      { id: 'updates',    label: 'Updates',     icon: RefreshCw },
      { id: 'storage',    label: 'Storage',     icon: HardDrive },
      { id: 'appearance', label: 'Appearance',  icon: Palette },
    ]
  },
  {
    group: 'Instances',
    items: [
      { id: 'game', label: 'Game Options',       icon: Gamepad2 },
      { id: 'java', label: 'Java Installations', icon: Coffee }
    ]
  }
];

const LAUNCHER_ACTIONS = [
  { value: 'keep', label: 'Keep launcher open' },
  { value: 'minimize', label: 'Minimize launcher' },
  { value: 'hide', label: 'Hide launcher' }
];

const START_PAGES = [
  { value: 'play', label: 'Home' },
  { value: 'instances', label: 'Instances' },
  { value: 'mods', label: 'Browse Mods' },
  { value: 'modpacks', label: 'Modpacks' },
  { value: 'news', label: 'News' }
];

const RESOLUTION_PRESETS = [
  { width: 854, height: 480, label: '480p' },
  { width: 1280, height: 720, label: '720p' },
  { width: 1600, height: 900, label: '900p' },
  { width: 1920, height: 1080, label: '1080p' }
];

const JAVA_SLOTS = [25, 21, 17, 8];

function SettingRow({ title, desc, children }) {
  return (
    <div className="sm-row">
      <div className="sm-row-text">
        <strong>{title}</strong>
        {desc && <small>{desc}</small>}
      </div>
      <div className="sm-row-control">{children}</div>
    </div>
  );
}

function MemorySlider({ value, onChange }) {
  return (
    <div className="sm-memory">
      <input
        type="range"
        min="1"
        max="32"
        step="1"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="sm-memory-value">{value} GB</span>
    </div>
  );
}

function JavaSlot({ major, value, onChange }) {
  const [status, setStatus] = useState(null); // null | {version} | false
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!value) {
      setStatus(null);
      return undefined;
    }
    let alive = true;
    window.native?.java?.test(value).then((res) => {
      if (alive) setStatus(res ?? false);
    });
    return () => {
      alive = false;
    };
  }, [value]);

  useEffect(() => {
    const off = window.native?.java?.onProgress((p) => {
      if (p.major === major) setPercent(p.percent);
    });
    return off;
  }, [major]);

  const installRecommended = async () => {
    setBusy(true);
    setError('');
    setPercent(0);
    try {
      const path = await window.native.java.install(major);
      onChange(path);
    } catch (err) {
      setError(String(err.message ?? err).replace(/^.*Error invoking remote method '[^']+': (Error: )?/, ''));
    }
    setBusy(false);
  };

  const detect = async () => {
    setError('');
    const path = await window.native?.java?.detectFor(major);
    if (path) onChange(path);
    else setError(`No Java ${major} found on this computer.`);
  };

  const browse = async () => {
    const path = await window.native?.java?.browse();
    if (path) onChange(path);
  };

  return (
    <div className="java-slot">
      <div className="java-slot-head">
        <span className="java-slot-title">
          <Coffee size={15} /> Java {major}
        </span>
        {status && (
          <span className="java-chip ok">
            <CheckCircle2 size={12} /> {status.version}
          </span>
        )}
        {status === false && (
          <span className="java-chip bad">
            <XCircle size={12} /> Invalid path
          </span>
        )}
      </div>
      <input
        className="java-slot-path"
        type="text"
        placeholder="/path/to/java — resolved automatically when empty"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
      />
      <div className="java-slot-actions">
        <button className="sm-btn" disabled={busy} onClick={installRecommended}>
          {busy ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
          {busy ? `Downloading ${percent}%` : 'Install recommended'}
        </button>
        <button className="sm-btn" disabled={busy} onClick={detect}>
          <Search size={13} /> Detect
        </button>
        <button className="sm-btn" disabled={busy} onClick={browse}>
          <FolderOpen size={13} /> Browse
        </button>
      </div>
      {busy && (
        <div className="java-slot-progress">
          <div style={{ width: `${percent}%` }} />
        </div>
      )}
      {error && <p className="java-slot-error">{error}</p>}
    </div>
  );
}

// ---------- appearance themes ----------

const THEMES = [
  {
    id: 'redstone', name: 'Midnight', desc: 'One-inspired cobalt',
    accent: '#2b4bff', deep: '#1f36bd', bg: '#11171c', bgRaise: '#1a2228', border: '#2a333d',
    swatches: ['#2b4bff', '#1f36bd', '#1a2228', '#2a333d'],
  },
  {
    id: 'diamond', name: 'Diamond', desc: 'Cool ice blue',
    accent: '#4dd9f3', deep: '#1a8fa3', bg: '#0b1318', bgRaise: '#131e24', border: '#1a3040',
    swatches: ['#4dd9f3', '#1a8fa3', '#131e24', '#1a3040'],
  },
  {
    id: 'emerald', name: 'Emerald', desc: 'Bright green',
    accent: '#00d46a', deep: '#00803f', bg: '#0a150c', bgRaise: '#111f14', border: '#183322',
    swatches: ['#00d46a', '#00803f', '#111f14', '#183322'],
  },
  {
    id: 'gold', name: 'Gold', desc: 'Warm amber',
    accent: '#ffc233', deep: '#a37200', bg: '#161108', bgRaise: '#22190d', border: '#352908',
    swatches: ['#ffc233', '#a37200', '#22190d', '#352908'],
  },
  {
    id: 'amethyst', name: 'Amethyst', desc: 'Deep purple',
    accent: '#bf88ff', deep: '#7a3db0', bg: '#110c16', bgRaise: '#1a1222', border: '#2d1f40',
    swatches: ['#bf88ff', '#7a3db0', '#1a1222', '#2d1f40'],
  },
];

function AppearanceSection({ current, onChange }) {
  return (
    <div className="sm-theme-list">
      {THEMES.map((t) => {
        const active = current === t.id;
        return (
          <button
            key={t.id}
            className={`sm-theme-card${active ? ' active' : ''}`}
            onClick={() => onChange(t.id)}
            style={{
              '--t-accent': t.accent,
              '--t-deep':   t.deep,
              '--t-bg':     t.bg,
              '--t-raise':  t.bgRaise,
              '--t-border': t.border,
            }}
          >
            {/* preview zone */}
            <div className="sm-theme-preview">
              <div className="sm-theme-pill" />
            </div>

            {/* body */}
            <div className="sm-theme-body">
              <span className="sm-theme-name">{t.name}</span>
              <span className="sm-theme-desc">{t.desc}</span>
              <div className="sm-theme-swatches">
                {t.swatches.map((c) => (
                  <span key={c} className="sm-theme-dot" style={{ background: c }} />
                ))}
              </div>
            </div>

            {/* selector */}
            <div className="sm-theme-sel">
              {active
                ? <CheckCircle2 size={20} className="sm-theme-sel-icon" />
                : <span className="sm-theme-sel-empty" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------- storage helpers ----------

function fmtBytes(b) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  return `${(b / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

const STORAGE_COLORS = {
  instances: 'var(--accent)',
  runtimes:  '#35d07f',
  assets:    '#6b8cff',
  libraries: '#f59e0b',
  versions:  '#a78bfa',
};

function StorageSection() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    window.native?.settings?.storageInfo()
      .then((res) => { setData(res); setBusy(false); })
      .catch(() => setBusy(false));
  }, []);

  if (busy) {
    return (
      <div className="sm-storage-loading">
        <Loader2 size={16} className="spin" /> Calculating…
      </div>
    );
  }

  if (!data) {
    return <p className="java-slot-error">Could not read storage info.</p>;
  }

  const total = data.reduce((s, c) => s + c.bytes, 0);

  return (
    <div className="sm-storage-list">
      {data.map((cat) => {
        const pct = total > 0 ? (cat.bytes / total) * 100 : 0;
        const color = STORAGE_COLORS[cat.key] ?? 'var(--text-dim)';
        return (
          <div key={cat.key} className="sm-storage-item">
            <div className="sm-storage-row">
              <span className="sm-storage-dot" style={{ background: color }} />
              <span className="sm-storage-label">{cat.label}</span>
              <span className="sm-storage-size">{fmtBytes(cat.bytes)}</span>
            </div>
            <div className="sm-storage-track">
              <div
                className="sm-storage-fill"
                style={{ width: `${Math.max(pct, cat.bytes > 0 ? 1.5 : 0)}%`, background: color }}
              />
            </div>
          </div>
        );
      })}
      <div className="sm-storage-total">
        <HardDrive size={13} />
        Total <strong>{fmtBytes(total)}</strong>
      </div>
    </div>
  );
}

export default function SettingsPage({ onOpenUpdater = () => {} }) {
  const { settings, update, updateSection } = useSettings();
  const [section, setSection] = useState('behavior');
  const [dataDir, setDataDir] = useState('');

  useEffect(() => {
    window.native?.settings?.dataDir().then(setDataDir);
  }, []);

  if (!settings) {
    return <div className="settings-loading"><Loader2 size={18} className="spin" /> Loading preferences…</div>;
  }

  const setJavaPath = (major, path) =>
    update('java', 'paths', { ...settings.java.paths, [major]: path });

  const setResolution = ({ width, height }) => {
    updateSection('resolution', { width, height });
  };

  return (
    <div className="settings-page">
      <header className="settings-page-head">
        <div>
          <span className="settings-eyebrow"><SlidersHorizontal size={12} /> Personalize Native</span>
          <h1>Launcher settings</h1>
          <p>Everything is saved automatically on this computer.</p>
        </div>
        <span className="settings-saved"><CheckCircle2 size={13} /> Changes save instantly</span>
      </header>

      <div className="settings-modal settings-workbench">
        <div className="sm-layout">
          {/* -------- left nav -------- */}
          <nav className="sm-nav">
            {NAV.map(({ group, items }) => (
              <div className="sm-nav-group" key={group}>
                <span className="sm-nav-label">{group}</span>
                {items.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    className={`sm-nav-item${section === id ? ' active' : ''}`}
                    onClick={() => setSection(id)}
                  >
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>
            ))}

            <div className="sm-nav-footer">
              <img src={appIcon} alt="Native" className="sm-nav-logo" />
              <span>
                Native {window.native?.version ?? ''}
                <small>{navigator.platform}</small>
              </span>
            </div>
          </nav>

          {/* -------- content -------- */}
          <div className="sm-content">
            {section === 'java' && (
              <>
                <p className="sm-hint">
                  <Sparkles size={14} />
                  Java is selected automatically for each Minecraft version and downloaded
                  if missing. Only change these if you need specific runtimes.
                </p>
                {JAVA_SLOTS.map((major) => (
                  <JavaSlot
                    key={major}
                    major={major}
                    value={settings.java.paths[major] ?? ''}
                    onChange={(path) => setJavaPath(major, path)}
                  />
                ))}

                <h3 className="sm-section-title">Memory</h3>
                <SettingRow title="Minimum memory" desc="Initial RAM given to the game">
                  <MemorySlider
                    value={settings.memory.min}
                    onChange={(v) => update('memory', 'min', Math.min(v, settings.memory.max))}
                  />
                </SettingRow>
                <SettingRow title="Maximum memory" desc="RAM ceiling — 4 GB is plenty for vanilla">
                  <MemorySlider
                    value={settings.memory.max}
                    onChange={(v) => update('memory', 'max', Math.max(v, settings.memory.min))}
                  />
                </SettingRow>
              </>
            )}

            {section === 'game' && (
              <>
                <h3 className="sm-section-title">Game Window</h3>
                <div className="sm-preset-grid">
                  {RESOLUTION_PRESETS.map((preset) => {
                    const active = settings.resolution.width === preset.width && settings.resolution.height === preset.height;
                    return (
                      <button
                        key={preset.label}
                        className={`sm-preset${active ? ' active' : ''}`}
                        onClick={() => setResolution(preset)}
                      >
                        <Monitor size={15} />
                        <strong>{preset.label}</strong>
                        <small>{preset.width} × {preset.height}</small>
                      </button>
                    );
                  })}
                </div>
                <SettingRow title="Resolution" desc="Window size when the game starts">
                  <div className="sm-resolution">
                    <input
                      type="number"
                      min="640"
                      value={settings.resolution.width}
                      onChange={(e) => update('resolution', 'width', Number(e.target.value))}
                    />
                    <span>×</span>
                    <input
                      type="number"
                      min="480"
                      value={settings.resolution.height}
                      onChange={(e) => update('resolution', 'height', Number(e.target.value))}
                    />
                  </div>
                </SettingRow>
                <SettingRow title="Fullscreen" desc="Start the game in fullscreen mode">
                  <Toggle
                    checked={settings.resolution.fullscreen}
                    onChange={(v) => update('resolution', 'fullscreen', v)}
                  />
                </SettingRow>
              </>
            )}

            {section === 'appearance' && (
              <>
                <h3 className="sm-section-title">Theme</h3>
                <p className="sm-hint">
                  <Palette size={14} />
                  Choose a color theme for the launcher.
                </p>
                <AppearanceSection
                  current={settings.appearance?.theme ?? 'redstone'}
                  onChange={(id) => {
                    document.documentElement.dataset.theme = id;
                    update('appearance', 'theme', id);
                  }}
                />

                <h3 className="sm-section-title">Interface</h3>
                <SettingRow title="Ambient background motion" desc="Animate the artwork when pages appear">
                  <Toggle
                    checked={settings.appearance.backgroundMotion}
                    onChange={(v) => update('appearance', 'backgroundMotion', v)}
                  />
                </SettingRow>
                <SettingRow title="Compact density" desc="Fit more controls and content on screen">
                  <Toggle
                    checked={settings.appearance.compactDensity}
                    onChange={(v) => update('appearance', 'compactDensity', v)}
                  />
                </SettingRow>
                <SettingRow title="Reduce motion" desc="Minimize transitions and animated effects">
                  <Toggle
                    checked={settings.appearance.reducedMotion}
                    onChange={(v) => update('appearance', 'reducedMotion', v)}
                  />
                </SettingRow>
              </>
            )}

            {section === 'storage' && (
              <>
                <h3 className="sm-section-title">Data Directory</h3>
                <SettingRow title="Data directory" desc="Instances, runtimes, and settings live here">
                  <div className="sm-datadir">
                    <code>{dataDir || '(desktop app only)'}</code>
                    <button
                      className="sm-btn"
                      onClick={() => window.native?.settings?.openDataDir()}
                    >
                      <FolderOpen size={14} /> Open
                    </button>
                  </div>
                </SettingRow>

                <h3 className="sm-section-title">Disk Usage</h3>
                <StorageSection />
              </>
            )}

            {section === 'behavior' && (
              <>
                <h3 className="sm-section-title">Launch Behavior</h3>
                <SettingRow title="Start page" desc="The first workspace shown when Native opens">
                  <div className="sm-dd">
                    <Dropdown
                      value={settings.behavior.startPage}
                      options={START_PAGES}
                      onChange={(v) => update('behavior', 'startPage', v)}
                    />
                  </div>
                </SettingRow>
                <SettingRow title="When the game launches" desc="What the launcher window does">
                  <div className="sm-dd">
                    <Dropdown
                      value={settings.behavior.launcherAction}
                      options={LAUNCHER_ACTIONS}
                      onChange={(v) => update('behavior', 'launcherAction', v)}
                    />
                  </div>
                </SettingRow>
                <SettingRow
                  title="Reopen when the game exits"
                  desc="Bring the launcher back after closing Minecraft"
                >
                  <Toggle
                    checked={settings.behavior.reopenOnExit}
                    onChange={(v) => update('behavior', 'reopenOnExit', v)}
                  />
                </SettingRow>

                <h3 className="sm-section-title">Safety</h3>
                <SettingRow
                  title="Confirm before deleting instances"
                  desc="Ask before an instance is removed"
                >
                  <Toggle
                    checked={settings.behavior.confirmInstanceDelete}
                    onChange={(v) => update('behavior', 'confirmInstanceDelete', v)}
                  />
                </SettingRow>
              </>
            )}

            {section === 'updates' && (
              <>
                <div className="sm-update-hero">
                  <span><Rocket size={22} /></span>
                  <div>
                    <strong>Stay current, without surprises</strong>
                    <p>Native uses differential downloads when available, so updates only transfer changed app blocks.</p>
                  </div>
                </div>
                <h3 className="sm-section-title">Update checks</h3>
                <SettingRow title="Check when Native starts" desc="Look for a newer stable release after startup">
                  <Toggle
                    checked={settings.updates.checkOnStartup}
                    onChange={(v) => update('updates', 'checkOnStartup', v)}
                  />
                </SettingRow>
                <SettingRow title="Background checks" desc="Check periodically and after the computer resumes">
                  <Toggle
                    checked={settings.updates.backgroundChecks}
                    onChange={(v) => update('updates', 'backgroundChecks', v)}
                  />
                </SettingRow>
                <SettingRow title="Download automatically" desc="Prepare updates quietly, then ask before restarting">
                  <Toggle
                    checked={settings.updates.autoDownload}
                    onChange={(v) => update('updates', 'autoDownload', v)}
                  />
                </SettingRow>

                <h3 className="sm-section-title">Update center</h3>
                <SettingRow title="Native stable channel" desc={`Currently running version ${window.native?.version ?? 'development'}`}>
                  <button className="sm-btn sm-btn-primary" onClick={onOpenUpdater}>
                    <RefreshCw size={13} /> Open update center
                  </button>
                </SettingRow>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
