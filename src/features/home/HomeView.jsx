import React, { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import ContextMenu from '../../components/ui/ContextMenu.jsx';
import { getClusterArt } from '../../data/versionsData.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { formatLaunchProgress } from '../launcher/useLauncher.js';
import useIsInstalled from '../instances/useIsInstalled.js';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import './HomeView.css';

export default function HomeView({
  instances = [],
  selectedCluster,
  onSelectCluster,
  onOpenCluster,
  onOpenVersions,
  onOpenActionCenter,
  account,
  launcherState,
  onLaunch,
  onKill
}) {
  const { t } = useI18n();
  const [contextMenu, setContextMenu] = useState(null);
  const railRef = useRef(null);
  const cardRefs = useRef({});

  const cluster = selectedCluster || instances[0] || null;
  const backgroundArt = getClusterArt(cluster);

  const isRunning = launcherState?.status === 'running' || launcherState?.status === 'game-running';
  const isDownloading = launcherState?.status === 'downloading';
  const isBusy = launcherState?.busy;

  const isInstalled = useIsInstalled(cluster, launcherState?.status);

  const activeIndex = useMemo(
    () => instances.findIndex((item) => item.id === cluster?.id),
    [instances, cluster]
  );

  const getLaunchButtonLabel = () => {
    return formatLaunchProgress(launcherState, t);
  };

  // ---- switching -------------------------------------------------

  const selectByOffset = (delta) => {
    if (!instances.length) return;
    const base = activeIndex < 0 ? 0 : activeIndex;
    const next = Math.min(instances.length - 1, Math.max(0, base + delta));
    const target = instances[next];
    if (target && target.id !== cluster?.id) onSelectCluster(target.id);
  };

  // Vertical wheel over the rail scrolls it sideways. Registered
  // manually because React attaches wheel listeners passively.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return undefined;

    const onWheel = (event) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (rail.scrollWidth <= rail.clientWidth) return;
      event.preventDefault();
      rail.scrollLeft += event.deltaY * 1.15;
    };

    rail.addEventListener('wheel', onWheel, { passive: false });
    return () => rail.removeEventListener('wheel', onWheel);
  }, []);

  // Arrow keys switch the active instance from anywhere on the page.
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        selectByOffset(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        selectByOffset(-1);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [instances, activeIndex, cluster]);

  // Keep the active card in view when it changes.
  useEffect(() => {
    const card = cardRefs.current[cluster?.id];
    if (card?.scrollIntoView) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }, [cluster?.id]);

  const handleCardContextMenu = (e, targetCluster) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      title: `${targetCluster.mc_version || targetCluster.version} ${targetCluster.mc_loader || targetCluster.loader}`,
      items: [
        { label: t('detail.overview'), icon: 'info-circle', action: () => onOpenCluster(targetCluster, 'overview') },
        { label: t('detail.logs'), icon: 'terminal', action: () => onOpenCluster(targetCluster, 'logs') },
        { label: t('detail.screenshots'), icon: 'eye', action: () => onOpenCluster(targetCluster, 'screenshots') },
        { label: t('detail.mods'), icon: 'code-snippet-02', action: () => onOpenCluster(targetCluster, 'mods') },
        { label: t('detail.shaders'), icon: 'paint-pour', action: () => onOpenCluster(targetCluster, 'shaders') },
        { label: t('detail.textures'), icon: 'colors', action: () => onOpenCluster(targetCluster, 'textures') },
        { label: t('common.settings'), icon: 'settings-02', action: () => onOpenCluster(targetCluster, 'settings') }
      ]
    });
  };

  return (
    <div className="home-view">
      {/* Wallpaper */}
      <div className="home-bg-layer">
        <img src={backgroundArt} alt={cluster?.name || 'Minecraft'} className="home-bg-img" />
        <div className="home-bg-overlay" />
        <div className="home-bg-fade" />
      </div>

      <div className="home-avatar-companion" title={account?.name || 'Player'}>
        <span className="home-avatar-name">{account?.name || 'Player'}</span>
        <SkinViewer3D
          account={account}
          width={230}
          height={315}
          animation="idle"
          autoRotate={false}
          className="home-avatar-viewer"
        />
      </div>

      {/* Active instance + launch */}
      <div className="home-hero-content">
        {cluster ? (
          <>
            <h1 className="home-cluster-title">
              {cluster.mc_version || cluster.version} {cluster.mc_loader || cluster.loader}
            </h1>
            <p className="home-cluster-subtitle">{cluster.name || 'Minecraft'}</p>

            <div className="home-actions-row">
              <button
                className={`launch-btn ${isRunning ? 'kill' : ''} ${!isInstalled && !isBusy ? 'install' : ''}`}
                onClick={() => {
                  if (isRunning) onKill();
                  else onLaunch(cluster);
                }}
                disabled={isBusy && !isRunning}
              >
                {isRunning ? (
                  <Icon name="square" size={14} />
                ) : !isInstalled && !isBusy ? (
                  <NativeIcon name="arrow-down" size={16} />
                ) : null}
                <span>
                  {isBusy || isRunning
                    ? getLaunchButtonLabel()
                    : !isInstalled
                      ? t('common.install')
                      : t('home.launch')}
                </span>
              </button>

              <button
                className="cluster-settings-btn"
                onClick={() => onOpenCluster(cluster, 'overview')}
                title={t('home.options')}
              >
                <Icon name="settings-04" size={20} />
              </button>
            </div>
          </>
        ) : (
          <h2 className="home-cluster-title" style={{ fontSize: 32 }}>{t('home.empty')}</h2>
        )}
      </div>

      {/* Instance switcher rail */}
      <div className="home-recents-container">
        {instances.length > 0 && (
          <div className="recents-head">
            <span className="recents-title">{t('home.yours')}</span>
            <span className="recents-hint">{t('home.switchHint')}</span>
            {activeIndex >= 0 && (
              <span className="recents-counter">
                {activeIndex + 1} / {instances.length}
              </span>
            )}
          </div>
        )}

        <div className="recents-rail-row">
          {instances.length > 1 && (
            <button
              type="button"
              className="recents-rail-btn"
              onClick={() => selectByOffset(-1)}
              disabled={activeIndex <= 0}
              title={t('home.previous')}
            >
              <NativeIcon name="chevron-left" size={18} />
            </button>
          )}

          <div className="recents-scroll-track" ref={railRef}>
            {instances.map((item) => {
              const isSelected = cluster?.id === item.id;
              const itemArt = getClusterArt(item);
              const title = `${item.mc_version || item.version} ${item.mc_loader || item.loader}`;

              return (
                <div
                  key={item.id}
                  ref={(element) => {
                    cardRefs.current[item.id] = element;
                  }}
                  className={`version-card ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectCluster(item.id)}
                  onDoubleClick={() => onOpenCluster(item, 'overview')}
                  onContextMenu={(e) => handleCardContextMenu(e, item)}
                >
                  <img src={itemArt} alt={title} className="version-card-bg" />
                  <div className="version-card-gradient" />
                  <div className="version-card-label" title={title}>
                    <span className="version-card-name">{item.name || title}</span>
                    <span className="version-card-sub">{title}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {instances.length > 1 && (
            <button
              type="button"
              className="recents-rail-btn"
              onClick={() => selectByOffset(1)}
              disabled={activeIndex >= instances.length - 1}
              title={t('home.next')}
            >
              <NativeIcon name="chevron-right" size={18} />
            </button>
          )}

          <button className="other-versions-tile" onClick={onOpenActionCenter || onOpenVersions} title={t('action.title')}>
            <Icon name="dots-grid" size={40} />
          </button>
        </div>
      </div>

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
