import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import OverviewTab from './OverviewTab.jsx';
import LogsTab from './LogsTab.jsx';
import ScreenshotsTab from './ScreenshotsTab.jsx';
import ModsTab from './ModsTab.jsx';
import PacksTab from './PacksTab.jsx';
import SettingsTab from './SettingsTab.jsx';
import './ClusterDetailView.css';

export default function ClusterDetailView({
  cluster,
  onBack,
  backLabel = 'Back to Home',
  onLaunch,
  onKill,
  launcherState,
  onUpdateCluster,
  onNavigateBrowse,
  initialTab = 'overview'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const loaderName = String(cluster?.mc_loader || cluster?.loader || 'Vanilla');
  const isVanilla = loaderName.toLowerCase() === 'vanilla';

  /* Vanilla instances have no mod loader, so mods and shaders simply cannot
     be installed. Resource packs still work, so Textures stays. */
  const tabs = useMemo(() => {
    const list = [
      { id: 'overview', label: 'Overview' },
      { id: 'logs', label: 'Logs' },
      { id: 'screenshots', label: 'Screenshots' }
    ];

    if (!isVanilla) {
      list.push({ id: 'mods', label: 'Mods' });
      list.push({ id: 'shaders', label: 'Shaders' });
    }

    list.push({ id: 'textures', label: 'Textures' });
    list.push({ id: 'settings', label: 'Settings' });
    return list;
  }, [isVanilla]);

  /* Never leave the page on a tab that is not on screen. */
  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) setActiveTab('overview');
  }, [tabs, activeTab]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, cluster?.id]);

  if (!cluster) {
    return (
      <div className="cluster-detail-view">
        <button className="cluster-back-link" onClick={onBack}>
          <Icon name="arrow-left" size={14} />
          <span>{backLabel}</span>
        </button>
        <div className="tab-empty-placeholder">No instance selected.</div>
      </div>
    );
  }

  const isRunning = launcherState?.status === 'running' || launcherState?.status === 'game-running';
  const isDownloading = launcherState?.status === 'downloading';
  const isBusy = launcherState?.busy;

  const getLaunchButtonLabel = () => {
    if (isRunning) return 'Kill';
    if (isDownloading) {
      return launcherState?.percent
        ? `Downloading ${Math.round(launcherState.percent)}%`
        : 'Downloading...';
    }
    if (launcherState?.status === 'preparing') return 'Preparing...';
    return 'Launch';
  };

  const handleOpenFolder = () => {
    if (window.native?.instance?.openFolder) {
      window.native.instance.openFolder(cluster.id, '');
    }
  };

  const version = cluster.mc_version || cluster.version || '';
  const title = cluster.name || `${loaderName} ${version}`;

  const fallbackDesc = isVanilla
    ? `Pure Minecraft ${version} with its own worlds, saves and settings.`
    : `Minecraft ${version} on ${loaderName}, with its own mods, worlds and settings.`;

  return (
    <div className="cluster-detail-view">
      <button className="cluster-back-link" onClick={onBack}>
        <Icon name="arrow-left" size={14} />
        <span>{backLabel}</span>
      </button>

      <div className="cluster-header-row">
        <div className="cluster-header-text">
          <h1 className="cluster-detail-title">{title}</h1>
          <p className="cluster-detail-desc">{cluster.description || fallbackDesc}</p>
        </div>

        <div className="cluster-header-actions">
          <button
            className="cluster-icon-btn"
            onClick={handleOpenFolder}
            title="Open game folder"
          >
            <Icon name="folder" size={18} />
          </button>

          <button
            className={`launch-btn ${isRunning ? 'kill' : ''}`}
            onClick={() => {
              if (isRunning) onKill();
              else onLaunch(cluster);
            }}
            disabled={isBusy && !isRunning}
          >
            {isRunning && <Icon name="square" size={14} />}
            <span>{getLaunchButtonLabel()}</span>
          </button>
        </div>
      </div>

      <div className="cluster-tabs-bar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              className={`cluster-tab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              {isActive && <div className="cluster-tab-underline" />}
            </button>
          );
        })}
      </div>

      <div className="cluster-tab-content-area">
        {activeTab === 'overview' && <OverviewTab cluster={cluster} />}
        {activeTab === 'logs' && <LogsTab cluster={cluster} />}
        {activeTab === 'screenshots' && <ScreenshotsTab cluster={cluster} />}
        {activeTab === 'mods' && !isVanilla && (
          <ModsTab cluster={cluster} onNavigateBrowse={onNavigateBrowse} />
        )}
        {activeTab === 'shaders' && !isVanilla && <PacksTab cluster={cluster} type="shaders" />}
        {activeTab === 'textures' && <PacksTab cluster={cluster} type="textures" />}
        {activeTab === 'settings' && (
          <SettingsTab cluster={cluster} onUpdateCluster={onUpdateCluster} />
        )}
      </div>
    </div>
  );
}
