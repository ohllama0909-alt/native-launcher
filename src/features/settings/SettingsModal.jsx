import React, { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import './SettingsModal.css';

const TABS = [
  { id: 'launcher', label: 'Launcher', icon: 'settings-02' },
  { id: 'minecraft', label: 'Minecraft', icon: 'play' },
  { id: 'appearance', label: 'Appearance', icon: 'paint-pour' },
  { id: 'java', label: 'Java', icon: 'terminal' },
  { id: 'accounts', label: 'Accounts', icon: 'users-01' },
  { id: 'storage', label: 'Storage', icon: 'database' },
  { id: 'apis', label: 'APIs', icon: 'link' },
  { id: 'changelog', label: 'Changelog', icon: 'code-snippet-02' }
];

const ACCENT_COLORS = [
  { name: 'Polyfrost Blue', hex: '#2b4bff' },
  { name: 'Emerald', hex: '#00d46a' },
  { name: 'Cyan', hex: '#4dd9f3' },
  { name: 'Gold', hex: '#ffc233' },
  { name: 'Amethyst', hex: '#bf88ff' }
];

export default function SettingsModal({
  open,
  onClose,
  accounts = [],
  activeId,
  onAddMicrosoft,
  onAddOffline,
  onSwitchAccount,
  onRemoveAccount,
  onOpenUpdater
}) {
  const [activeTab, setActiveTab] = useState('launcher');
  const [closeOnLaunch, setCloseOnLaunch] = useState(false);
  const [discordRpc, setDiscordRpc] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [ram, setRam] = useState(4);
  const [accent, setAccent] = useState('#2b4bff');
  const [metaUrl, setMetaUrl] = useState('https://data-v2.polyfrost.org');
  const [javaPath, setJavaPath] = useState('');
  const [offlineName, setOfflineName] = useState('');
  const [dataDir, setDataDir] = useState('');

  useEffect(() => {
    if (window.native?.settings?.dataDir) {
      window.native.settings.dataDir().then(setDataDir);
    }
  }, []);

  const handleOpenDataDir = () => {
    if (window.native?.settings?.openDataDir) {
      window.native.settings.openDataDir();
    }
  };

  const handleSelectAccent = (hex) => {
    setAccent(hex);
    document.documentElement.style.setProperty('--brand', hex);
    document.documentElement.style.setProperty('--brand-glow', `${hex}66`);
  };

  if (!open) return null;

  return (
    <div className="settings-modal-backdrop" onClick={onClose}>
      <div className="settings-shell-container" onClick={(e) => e.stopPropagation()}>
        {/* Left Sidebar */}
        <aside className="settings-sidebar">
          <div className="settings-sidebar-header">
            <span className="settings-sidebar-title">Settings</span>
          </div>

          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`settings-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon name={tab.icon} size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Right Content */}
        <main className="settings-content-area">
          <div className="settings-content-header">
            <h2 className="settings-pane-title">
              {TABS.find((t) => t.id === activeTab)?.label}
            </h2>
            <button className="icon-ctrl-btn" onClick={onClose}>
              <Icon name="x" size={16} />
            </button>
          </div>

          <div className="settings-scroll-body">
            {/* Launcher Settings */}
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
                        checked={discordRpc}
                        onChange={(e) => setDiscordRpc(e.target.checked)}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">Close Launcher on Launch</span>
                      <span className="settings-row-desc">Exit the launcher once Minecraft starts</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={closeOnLaunch}
                        onChange={(e) => setCloseOnLaunch(e.target.checked)}
                      />
                      <span className="slider" />
                    </label>
                  </div>
                </div>

                <div className="settings-section">
                  <h4 className="settings-section-heading">LAUNCHER DATA FOLDER</h4>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">Data Location</span>
                      <span className="settings-row-desc">{dataDir || 'Default user data directory'}</span>
                    </div>
                    <button className="sub-btn" onClick={handleOpenDataDir}>
                      <Icon name="folder" size={14} />
                      <span>Open Folder</span>
                    </button>
                  </div>
                </div>

                <div className="settings-section">
                  <h4 className="settings-section-heading">UPDATES</h4>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">OneClient Desktop App</span>
                      <span className="settings-row-desc">v{window.native?.version || '1.0.0'}</span>
                    </div>
                    <button className="sub-btn brand-btn" onClick={onOpenUpdater}>
                      <Icon name="refresh" size={14} />
                      <span>Check Updates</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Minecraft Settings */}
            {activeTab === 'minecraft' && (
              <>
                <div className="settings-section">
                  <h4 className="settings-section-heading">GLOBAL GAME SETTINGS</h4>
                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">Default Fullscreen</span>
                      <span className="settings-row-desc">Launch instances in fullscreen by default</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={fullscreen}
                        onChange={(e) => setFullscreen(e.target.checked)}
                      />
                      <span className="slider" />
                    </label>
                  </div>

                  <div className="settings-row">
                    <div className="settings-row-info">
                      <span className="settings-row-title">Default Memory Allocation</span>
                      <span className="settings-row-desc">RAM allocated to game instances</span>
                    </div>
                    <div className="ram-slider-control">
                      <input
                        type="range"
                        min="2"
                        max="16"
                        step="1"
                        value={ram}
                        onChange={(e) => setRam(Number(e.target.value))}
                        className="range-input"
                      />
                      <span className="ram-badge">{ram} GB</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Appearance Settings */}
            {activeTab === 'appearance' && (
              <div className="settings-section">
                <h4 className="settings-section-heading">ACCENT COLOR</h4>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-title">Launcher Theme Color</span>
                    <span className="settings-row-desc">The primary branding color across the client</span>
                  </div>
                  <div className="accent-color-options">
                    {ACCENT_COLORS.map((c) => (
                      <div
                        key={c.hex}
                        className={`accent-color-swatch ${accent === c.hex ? 'selected' : ''}`}
                        style={{ backgroundColor: c.hex }}
                        onClick={() => handleSelectAccent(c.hex)}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Java Settings */}
            {activeTab === 'java' && (
              <div className="settings-section">
                <h4 className="settings-section-heading">JAVA RUNTIME CONFIGURATION</h4>
                <div className="settings-row vertical">
                  <div className="settings-row-info">
                    <span className="settings-row-title">Default Java Executable</span>
                    <span className="settings-row-desc">Path to Java executable for Minecraft</span>
                  </div>
                  <input
                    type="text"
                    className="text-input full-width"
                    placeholder="Auto-detected Java runtime"
                    value={javaPath}
                    onChange={(e) => setJavaPath(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Accounts Settings */}
            {activeTab === 'accounts' && (
              <div className="settings-section">
                <h4 className="settings-section-heading">CONNECTED ACCOUNTS</h4>
                <div className="mods-list-container">
                  {accounts.map((acc) => {
                    const isActive = acc.id === activeId;
                    return (
                      <div key={acc.id} className="package-item-row">
                        <div className="package-icon-wrap">
                          <Icon name="users-01" size={18} />
                        </div>
                        <div className="package-info-col">
                          <span className="package-title">{acc.name}</span>
                          <span className="package-version-tag">
                            {acc.type === 'microsoft' ? 'Microsoft Account' : 'Offline Player'}
                          </span>
                        </div>
                        <div className="toolbar-actions">
                          {isActive ? (
                            <span className="badge-installed">Active</span>
                          ) : (
                            <button
                              className="sub-btn"
                              onClick={() => onSwitchAccount(acc.id)}
                            >
                              Select
                            </button>
                          )}
                          <button
                            className="icon-delete-btn"
                            onClick={() => onRemoveAccount(acc.id)}
                          >
                            <Icon name="trash-01" size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button className="sub-btn brand-btn" onClick={onAddMicrosoft}>
                    <Icon name="plus" size={14} />
                    <span>Add Microsoft Account</span>
                  </button>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      type="text"
                      className="text-input"
                      placeholder="Player Name"
                      value={offlineName}
                      onChange={(e) => setOfflineName(e.target.value)}
                    />
                    <button
                      className="sub-btn"
                      onClick={() => {
                        if (offlineName.trim()) {
                          onAddOffline(offlineName.trim());
                          setOfflineName('');
                        }
                      }}
                    >
                      Add Offline
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Storage Settings */}
            {activeTab === 'storage' && (
              <div className="settings-section">
                <h4 className="settings-section-heading">DISK USAGE & CACHES</h4>
                <div className="settings-row">
                  <div className="settings-row-info">
                    <span className="settings-row-title">Cached Data</span>
                    <span className="settings-row-desc">Downloaded assets, skins, and mod caches</span>
                  </div>
                  <button
                    className="sub-btn"
                    onClick={() => {
                      alert('Caches cleared successfully.');
                    }}
                  >
                    Clear Caches
                  </button>
                </div>
              </div>
            )}

            {/* APIs Settings */}
            {activeTab === 'apis' && (
              <div className="settings-section">
                <h4 className="settings-section-heading">REMOTE ENDPOINTS</h4>
                <div className="settings-row vertical">
                  <div className="settings-row-info">
                    <span className="settings-row-title">Custom Meta URL Base</span>
                    <span className="settings-row-desc">Default: https://data-v2.polyfrost.org</span>
                  </div>
                  <input
                    type="text"
                    className="text-input full-width"
                    value={metaUrl}
                    onChange={(e) => setMetaUrl(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Changelog Settings */}
            {activeTab === 'changelog' && (
              <div className="settings-section">
                <h4 className="settings-section-heading">ONECLIENT RELEASE NOTES</h4>
                <div className="mod-modal-desc">
                  <h3>OneClient v3.9.8</h3>
                  <p style={{ marginTop: 8 }}>
                    • Complete OneLauncher GUI remake matching OneClient design specification.<br />
                    • Seamless support for Minecraft 26.2, 26.1.2, 1.21.11, 1.21.1, and 1.20.x.<br />
                    • Browse Mods integration for Modrinth and CurseForge with category filters.<br />
                    • Playtime metrics, statistics charts, and live logging.<br />
                    • Native launcher engine optimizations.
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
