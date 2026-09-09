import React, { useState } from 'react';
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
  onLaunch,
  onKill,
  launcherState,
  onUpdateCluster,
  onNavigateBrowse,
  initialTab = 'overview'
}) {
  const [activeTab, setActiveTab] = useState(initialTab);

  if (!cluster) {
    return (
      <div className="cluster-detail-view">
        <button className="cluster-back-link" onClick={onBack}>
          <Icon name="arrow-left" size={14} />
          <span>Back to Home</span>
        </button>
        <div className="tab-empty-placeholder">No cluster selected.</div>
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

  const title = `${cluster.mc_loader || cluster.loader} ${cluster.mc_version || cluster.version}`;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'logs', label: 'Logs' },
    { id: 'screenshots', label: 'Screenshots' },
    { id: 'mods', label: 'Mods' },
    { id: 'shaders', label: 'Shaders' },
    { id: 'textures', label: 'Textures' },
    { id: 'settings', label: 'Settings' }
  ];

  return (
    <div className="cluster-detail-view">
      {/* Back to Home Link */}
      <button className="cluster-back-link" onClick={onBack}>
        <Icon name="arrow-left" size={14} />
        <span>Back to Home</span>
      </button>

      {/* Cluster Header matching launcher4.webp */}
      <div className="cluster-header-row">
        <div className="cluster-header-text">
          <h1 className="cluster-detail-title">{title}</h1>
          <p className="cluster-detail-desc">
            {cluster.description || 'Minecraft custom installation with OneClient optimizations and mod support.'}
          </p>
        </div>

        <div className="cluster-header-actions">
          <button
            className="cluster-icon-btn"
            onClick={handleOpenFolder}
            title="Open Game Folder"
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

      {/* Tab Navigation Bar */}
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

      {/* Tab Content */}
      <div className="cluster-tab-content-area">
        {activeTab === 'overview' && <OverviewTab cluster={cluster} />}
        {activeTab === 'logs' && <LogsTab cluster={cluster} />}
        {activeTab === 'screenshots' && <ScreenshotsTab cluster={cluster} />}
        {activeTab === 'mods' && <ModsTab cluster={cluster} onNavigateBrowse={onNavigateBrowse} />}
        {activeTab === 'shaders' && <PacksTab cluster={cluster} type="shaders" />}
        {activeTab === 'textures' && <PacksTab cluster={cluster} type="textures" />}
        {activeTab === 'settings' && (
          <SettingsTab cluster={cluster} onUpdateCluster={onUpdateCluster} />
        )}
      </div>
    </div>
  );
}
