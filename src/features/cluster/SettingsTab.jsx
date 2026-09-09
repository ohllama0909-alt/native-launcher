import React, { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';

export default function SettingsTab({ cluster, onUpdateCluster }) {
  const [fullscreen, setFullscreen] = useState(cluster?.fullscreen || false);
  const [width, setWidth] = useState(cluster?.width || 854);
  const [height, setHeight] = useState(cluster?.height || 480);
  const [ram, setRam] = useState(cluster?.ram || 4); // GB
  const [javaPath, setJavaPath] = useState(cluster?.javaPath || '');
  const [jvmArgs, setJvmArgs] = useState(cluster?.jvmArgs || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onUpdateCluster(cluster.id, {
      fullscreen,
      width: Number(width) || 854,
      height: Number(height) || 480,
      ram: Number(ram) || 4,
      javaPath: javaPath.trim() || undefined,
      jvmArgs: jvmArgs.trim() || undefined
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleOpenFolder = () => {
    if (window.native?.instance?.openFolder && cluster?.id) {
      window.native.instance.openFolder(cluster.id, '');
    }
  };

  return (
    <div className="cluster-tab-pane settings-tab">
      <div className="settings-section">
        <h4 className="settings-section-heading">GAME DISPLAY</h4>
        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Force Fullscreen</span>
            <span className="settings-row-desc">Launch the game directly in fullscreen mode</span>
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
            <span className="settings-row-title">Window Resolution</span>
            <span className="settings-row-desc">Default window dimensions</span>
          </div>
          <div className="resolution-inputs">
            <input
              type="number"
              className="text-input num-input"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              placeholder="854"
            />
            <span className="times-sign">×</span>
            <input
              type="number"
              className="text-input num-input"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="480"
            />
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h4 className="settings-section-heading">MEMORY ALLOCATION</h4>
        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Allocated RAM</span>
            <span className="settings-row-desc">Memory allocated to the Minecraft JVM</span>
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

      <div className="settings-section">
        <h4 className="settings-section-heading">JAVA & LAUNCH ARGS</h4>
        <div className="settings-row vertical">
          <div className="settings-row-info">
            <span className="settings-row-title">Custom Java Runtime Path</span>
            <span className="settings-row-desc">Leave blank to use recommended bundled Java</span>
          </div>
          <input
            type="text"
            className="text-input full-width"
            placeholder="Default (Auto-detected)"
            value={javaPath}
            onChange={(e) => setJavaPath(e.target.value)}
          />
        </div>

        <div className="settings-row vertical">
          <div className="settings-row-info">
            <span className="settings-row-title">JVM Arguments</span>
            <span className="settings-row-desc">Additional command line arguments passed to the JVM</span>
          </div>
          <input
            type="text"
            className="text-input full-width font-mono"
            placeholder="-XX:+UseG1GC"
            value={jvmArgs}
            onChange={(e) => setJvmArgs(e.target.value)}
          />
        </div>

        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">Instance Directory</span>
            <span className="settings-row-desc">Local files for this version</span>
          </div>
          <button className="sub-btn" onClick={handleOpenFolder}>
            <Icon name="folder" size={14} />
            <span>Open Directory</span>
          </button>
        </div>
      </div>

      <div className="settings-bottom-bar">
        <button className="sub-btn brand-btn" onClick={handleSave}>
          <Icon name="check" size={14} />
          <span>{saved ? 'Saved Changes!' : 'Save Settings'}</span>
        </button>
      </div>
    </div>
  );
}
