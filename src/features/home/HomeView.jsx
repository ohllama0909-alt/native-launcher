import React, { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import ContextMenu from '../../components/ui/ContextMenu.jsx';
import { getClusterArt } from '../../data/versionsData.js';
import './HomeView.css';

export default function HomeView({
  instances = [],
  selectedCluster,
  onSelectCluster,
  onOpenCluster,
  onOpenVersions,
  launcherState,
  onLaunch,
  onKill
}) {
  const [contextMenu, setContextMenu] = useState(null);

  const cluster = selectedCluster || instances[0] || null;
  const backgroundArt = getClusterArt(cluster);

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

  const handleCardContextMenu = (e, targetCluster) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      title: `${targetCluster.mc_version || targetCluster.version} ${targetCluster.mc_loader || targetCluster.loader}`,
      items: [
        {
          label: 'Overview',
          icon: 'info-circle',
          action: () => onOpenCluster(targetCluster, 'overview')
        },
        {
          label: 'Logs',
          icon: 'terminal',
          action: () => onOpenCluster(targetCluster, 'logs')
        },
        {
          label: 'Screenshots',
          icon: 'eye',
          action: () => onOpenCluster(targetCluster, 'screenshots')
        },
        {
          label: 'Mods',
          icon: 'code-snippet-02',
          action: () => onOpenCluster(targetCluster, 'mods')
        },
        {
          label: 'Shaders',
          icon: 'paint-pour',
          action: () => onOpenCluster(targetCluster, 'shaders')
        },
        {
          label: 'Textures',
          icon: 'colors',
          action: () => onOpenCluster(targetCluster, 'textures')
        },
        {
          label: 'Settings',
          icon: 'settings-02',
          action: () => onOpenCluster(targetCluster, 'settings')
        }
      ]
    });
  };

  return (
    <div className="home-view">
      {/* Dynamic Hero Wallpaper Background */}
      <div className="home-bg-layer">
        <img
          src={backgroundArt}
          alt={cluster?.name || 'Minecraft'}
          className="home-bg-img"
        />
        <div className="home-bg-overlay" />
      </div>

      {/* Middle Left: Active Cluster Info & Launch Button */}
      <div className="home-hero-content">
        {cluster ? (
          <>
            <h1 className="home-cluster-title">
              {cluster.mc_version || cluster.version} {cluster.mc_loader || cluster.loader}
            </h1>
            <p className="home-cluster-subtitle">
              {cluster.name || 'Minecraft'}
            </p>

            <div className="home-actions-row">
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

              <button
                className="cluster-settings-btn"
                onClick={() => onOpenCluster(cluster, 'overview')}
                title="Instance options"
              >
                <Icon name="settings-04" size={20} />
              </button>
            </div>
          </>
        ) : (
          <h2 className="home-cluster-title" style={{ fontSize: 32 }}>No versions yet</h2>
        )}
      </div>

      {/* Bottom: Version Cards Carousel + Other Versions Button */}
      <div className="home-recents-container">
        <div className="recents-scroll-track">
          {instances.slice(0, 6).map((item) => {
            const isSelected = cluster?.id === item.id;
            const itemArt = getClusterArt(item);
            const title = `${item.mc_version || item.version} ${item.mc_loader || item.loader}`;

            return (
              <div
                key={item.id}
                className={`version-card ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectCluster(item.id)}
                onDoubleClick={() => onOpenCluster(item, 'overview')}
                onContextMenu={(e) => handleCardContextMenu(e, item)}
              >
                <img
                  src={itemArt}
                  alt={title}
                  className="version-card-bg"
                />
                <div className="version-card-gradient" />
                <div className="version-card-label" title={title}>
                  {title}
                </div>
              </div>
            );
          })}
        </div>

        {/* 3x3 Dots Grid Tile: Other Versions */}
        <button
          className="other-versions-tile"
          onClick={onOpenVersions}
          title="All Versions"
        >
          <Icon name="dots-grid" size={48} />
        </button>
      </div>

      {/* Context Menu Popup */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          title={contextMenu.title}
          items={contextMenu.items}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
