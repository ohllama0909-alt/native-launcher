import React, { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import AppearancePanel from './AppearancePanel.jsx';
import AccountsPanel from './AccountsPanel.jsx';
import StoragePanel from './StoragePanel.jsx';
import ChangelogPanel from './ChangelogPanel.jsx';
import './SettingsModal.css';

const TABS = [
  { id: 'launcher', label: 'Launcher', icon: 'settings-02' },
  { id: 'minecraft', label: 'Minecraft', icon: 'play' },
  { id: 'appearance', label: 'Appearance', icon: 'paint-pour' },
  { id: 'java', label: 'Java', icon: 'terminal' },
  { id: 'accounts', label: 'Accounts', icon: 'users-01' },
  { id: 'storage', label: 'Storage', icon: 'database' },
  { id: 'changelog', label: 'Changelog', icon: 'clock-rewind' }
];

const PREFS_KEY = 'native.preferences';

const DEFAULT_PREFS = {
  discordRpc: true,
  closeOnLaunch: false,
  keepLogs: true,
  fullscreen: false,
  ram: 4,
  javaPath: '',
  javaArgs: ''
};

function readPrefs() {
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    return raw ? { ...DEFAULT_PREFS, ...JSON.parse(raw) } : { ...DEFAULT_PREFS };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export default function SettingsModal({
  open,
  onClose,
  accounts = [],
  activeId,
  instances = [],
  onAddMicrosoft,
  onAddOffline,
  onSwitchAccount,
  onRemoveAccount,
  onOpenUpdater
}) {
  const [activeTab, setActiveTab] = useState('launcher');
  const [prefs, setPrefs] = useState(readPrefs);
  const [dataDir, setDataDir] = useState('');

  useEffect(() => {
    if (window.native?.settings?.dataDir) {
      window.native.settings.dataDir().then(setDataDir).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const updatePref = (patch) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        /* ignore storage failures */
      }
      return next;
    });
  };

  const handleOpenDataDir = () => {
    if (window.native?.settings?.openDataDir) window.native.settings.openDataDir();
  };

  if (!open) return null;

  const wide = activeTab === 'accounts' || activeTab === 'storage' || activeTab === 'changelog';

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div
        className={'settings-shell-container ' + (wide ? 'is-wide' : '')}
        onClick={(event) => event.stopPropagation()}
      >
        <aside className="settings-sidebar">
          <div className="settings-sidebar-header">
            <span className="settings-sidebar-title">Settings</span>
          </div>

          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon name={tab.icon} size={16} />
              <span>{tab.label}</span>
            </button>
          ))}
        </aside>

        <main className="settings-content-area">
          <div className="settings-content-header">
            <h2 className="settings-pane-title">{TABS.find((t) => t.id === activeTab)?.label}</h2>
            <button className="icon-ctrl-btn" onClick={onClose}>
              <Icon name="x" size={16} />
            </button>
          </div>

          <div className="settings-scroll-body">
            {activeTab === 'launcher' && (
              <>
                <div className="settings-section">
                  <h4 className="settings-section-heading">BEHAVIOR</h4>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">Discord Rich Presence</span>
                      <span className="settings-row-desc">Show your Minecraft activity in Discord</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={prefs.discordRpc}
                        onChange={(event) => updatePref({ discordRpc: event.target.checked })}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">Close launcher on launch</span>
                      <span className="settings-row-desc">Exit Native once Minecraft starts</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={prefs.closeOnLaunch}
                        onChange={(event) => updatePref({ closeOnLaunch: event.target.checked })}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">Keep game logs</span>
                      <span className="settings-row-desc">Store the last session log for every instance</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={prefs.keepLogs}
                        onChange={(event) => updatePref({ keepLogs: event.target.checked })}
                      />
                      <span className="slider" />
                    </label>
                  </div>
                </div>

                <div className="settings-section">
                  <h4 className="settings-section-heading">LAUNCHER DATA FOLDER</h4>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">Data location</span>
                      <span className="settings-row-desc">{dataDir || 'Default user data directory'}</span>
                    </div>
                    <button className="sub-btn" onClick={handleOpenDataDir}>
                      <Icon name="folder" size={14} />
                      <span>Open folder</span>
                    </button>
                  </div>
                </div>

                <div className="settings-section">
                  <h4 className="settings-section-heading">UPDATES</h4>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">Native</span>
                      <span className="settings-row-desc">v{window.native?.version || '1.0.0'}</span>
                    </div>
                    <button className="sub-btn brand-btn" onClick={onOpenUpdater}>
                      <Icon name="refresh" size={14} />
                      <span>Check updates</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'minecraft' && (
              <div className="settings-section">
                <h4 className="settings-section-heading">GLOBAL GAME SETTINGS</h4>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-title">Default fullscreen</span>
                    <span className="settings-row-desc">Launch instances in fullscreen by default</span>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={prefs.fullscreen}
                      onChange={(event) => updatePref({ fullscreen: event.target.checked })}
                    />
                    <span className="slider" />
                  </label>
                </div>

                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-title">Default memory allocation</span>
                    <span className="settings-row-desc">Used for new instances you create</span>
                  </div>
                  <div className="ram-slider-control">
                    <input
                      type="range"
                      min="2"
                      max="16"
                      step="1"
                      value={prefs.ram}
                      onChange={(event) => updatePref({ ram: Number(event.target.value) })}
                      className="range-input"
                    />
                    <span className="ram-badge">{prefs.ram} GB</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && <AppearancePanel />}

            {activeTab === 'java' && (
              <div className="settings-section">
                <h4 className="settings-section-heading">JAVA RUNTIME</h4>

                <div className="settings-row vertical">
                  <div className="settings-row-info">
                    <span className="settings-row-title">Java executable</span>
                    <span className="settings-row-desc">Leave empty to use the runtime Native downloads</span>
                  </div>
                  <input
                    type="text"
                    className="text-input full-width"
                    placeholder="Auto-detected Java runtime"
                    value={prefs.javaPath}
                    onChange={(event) => updatePref({ javaPath: event.target.value })}
                  />
                </div>

                <div className="settings-row vertical">
                  <div className="settings-row-info">
                    <span className="settings-row-title">Extra JVM arguments</span>
                    <span className="settings-row-desc">Applied on top of the launcher defaults</span>
                  </div>
                  <input
                    type="text"
                    className="text-input full-width"
                    placeholder="-XX:+UseG1GC"
                    value={prefs.javaArgs}
                    onChange={(event) => updatePref({ javaArgs: event.target.value })}
                  />
                </div>
              </div>
            )}

            {activeTab === 'accounts' && (
              <AccountsPanel
                accounts={accounts}
                activeId={activeId}
                onSwitchAccount={onSwitchAccount}
                onAddMicrosoft={onAddMicrosoft}
                onAddOffline={onAddOffline}
                onRemoveAccount={onRemoveAccount}
              />
            )}

            {activeTab === 'storage' && <StoragePanel instances={instances} />}

            {activeTab === 'changelog' && <ChangelogPanel onOpenUpdater={onOpenUpdater} />}
          </div>
        </main>
      </div>
    </div>
  );
}
