import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Blocks, Compass, Plus } from 'lucide-react';
import Icon from '../../components/ui/Icon.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import ContextMenu from '../../components/ui/ContextMenu.jsx';
import { getClusterArt } from '../../data/versionsData.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import LaunchActionButton from '../launcher/LaunchActionButton.jsx';
import useIsInstalled from '../instances/useIsInstalled.js';
import SkinViewer3D from '../../components/ui/SkinViewer3D.jsx';
import './HomeView.css';

const loadersOf = (instance) => instance?.mc_loader || instance?.loader || 'Vanilla';
const versionOf = (instance) => instance?.mc_version || instance?.version || '';

function greetingKey() {
  const hour = new Date().getHours();
  if (hour < 5) return 'home.greetingNight';
  if (hour < 12) return 'home.greetingMorning';
  if (hour < 18) return 'home.greetingAfternoon';
  return 'home.greetingEvening';
}

export default function HomeView({
  instances = [],
  selectedCluster,
  onSelectCluster,
  onOpenCluster,
  onOpenInstances,
  onOpenVersions,
  onOpenBrowse,
  onCreateInstance,
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

  const isInstalled = useIsInstalled(cluster, launcherState?.status);

  const activeIndex = useMemo(
    () => instances.findIndex((item) => item.id === cluster?.id),
    [instances, cluster]
  );

  /* ---- switching -------------------------------------------------- */

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
      title: `${versionOf(targetCluster)} ${loadersOf(targetCluster)}`,
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

      <div className="home-avatar-companion" title={account?.name || t('home.guest')}>
        <div className="home-avatar-nametag">
          <span className="home-avatar-name">{account?.name || t('home.guest')}</span>
        </div>
        <SkinViewer3D
          account={account}
          width={230}
          height={315}
          animation="idle"
          autoRotate={false}
          className="home-avatar-viewer"
        />
      </div>

      {/* Greeting + shortcuts */}
      <div className="home-topbar">
        <div className="home-greeting">
          <span className="home-greeting-text">{t(greetingKey())}</span>
          <span className="home-greeting-name">{account?.name || t('home.guest')}</span>
        </div>

        <div className="home-quick-actions">
          <button type="button" className="home-quick-btn" onClick={onCreateInstance}>
            <Plus size={15} strokeWidth={2.1} />
            <span>{t('home.newInstance')}</span>
          </button>
          <button type="button" className="home-quick-btn" onClick={onOpenBrowse}>
            <Compass size={15} strokeWidth={2.1} />
            <span>{t('home.browseMods')}</span>
          </button>
          <button type="button" className="home-quick-btn" onClick={onOpenVersions}>
            <Blocks size={15} strokeWidth={2.1} />
            <span>{t('home.allVersions')}</span>
          </button>
        </div>
      </div>

      {/* Active instance + launch */}
      <div className="home-hero-content">
        {cluster ? (
          <>
            <h1 className="home-cluster-title">
              {versionOf(cluster)} {loadersOf(cluster)}
            </h1>
            <p className="home-cluster-subtitle">{cluster.name || 'Minecraft'}</p>

            <div className="home-actions-row">
              <LaunchActionButton
                instance={cluster}
                launcherState={launcherState}
                isInstalled={isInstalled}
                onLaunch={onLaunch}
                onKill={onKill}
              />

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
          <div className="home-empty-state">
            <h2 className="home-cluster-title">{t('home.empty')}</h2>
            <p className="home-cluster-subtitle">{t('home.emptyBody')}</p>
            <div className="home-actions-row">
              <button type="button" className="home-quick-btn is-primary" onClick={onCreateInstance}>
                <Plus size={16} strokeWidth={2.2} />
                <span>{t('home.newInstance')}</span>
              </button>
              <button type="button" className="home-quick-btn" onClick={onOpenVersions}>
                <NativeIcon name="download" size={15} />
                <span>{t('home.allVersions')}</span>
              </button>
            </div>
          </div>
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
              const title = `${versionOf(item)} ${loadersOf(item)}`;

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

          <button className="other-versions-tile" onClick={onOpenInstances} title={t('nav.instances')}>
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
