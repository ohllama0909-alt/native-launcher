import React, { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';

export default function SettingsTab({ cluster, onUpdateCluster }) {
  const { t } = useI18n();
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
        <h4 className="settings-section-heading">{t('clusterSettings.display')}</h4>
        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">{t('clusterSettings.fullscreen')}</span>
            <span className="settings-row-desc">{t('clusterSettings.fullscreenDesc')}</span>
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
            <span className="settings-row-title">{t('clusterSettings.resolution')}</span>
            <span className="settings-row-desc">{t('clusterSettings.resolutionDesc')}</span>
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
        <h4 className="settings-section-heading">{t('clusterSettings.memory')}</h4>
        <div className="settings-row">
          <div className="settings-row-info">
            <span className="settings-row-title">{t('clusterSettings.allocatedRam')}</span>
            <span className="settings-row-desc">{t('clusterSettings.allocatedRamDesc')}</span>
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
        <h4 className="settings-section-heading">{t('clusterSettings.javaArgs')}</h4>
        <div className="settings-row vertical">
          <div className="settings-row-info">
            <span className="settings-row-title">{t('clusterSettings.javaPath')}</span>
            <span className="settings-row-desc">{t('clusterSettings.javaPathDesc')}</span>
          </div>
          <input
            type="text"
            className="text-input full-width"
            placeholder={t('clusterSettings.autoDetected')}
            value={javaPath}
            onChange={(e) => setJavaPath(e.target.value)}
          />
        </div>

        <div className="settings-row vertical">
          <div className="settings-row-info">
            <span className="settings-row-title">{t('clusterSettings.jvmArgs')}</span>
            <span className="settings-row-desc">{t('clusterSettings.jvmArgsDesc')}</span>
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
            <span className="settings-row-title">{t('clusterSettings.directory')}</span>
            <span className="settings-row-desc">{t('clusterSettings.directoryDesc')}</span>
          </div>
          <button className="sub-btn" onClick={handleOpenFolder}>
            <Icon name="folder" size={14} />
            <span>{t('clusterSettings.openDirectory')}</span>
          </button>
        </div>
      </div>

      <div className="settings-bottom-bar">
        <button className="sub-btn brand-btn" onClick={handleSave}>
          <Icon name="check" size={14} />
          <span>{saved ? t('clusterSettings.saved') : t('clusterSettings.save')}</span>
        </button>
      </div>
    </div>
  );
}
