import React, { useEffect, useMemo, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import OverviewTab from './OverviewTab.jsx';
import LogsTab from './LogsTab.jsx';
import ScreenshotsTab from './ScreenshotsTab.jsx';
import ModsTab from './ModsTab.jsx';
import PacksTab from './PacksTab.jsx';
import SettingsTab from './SettingsTab.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { formatLaunchProgress } from '../launcher/useLauncher.js';
import useIsInstalled from '../instances/useIsInstalled.js';
import { getClusterArt } from '../../data/versionsData.js';
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
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(initialTab);

  const loaderName = String(cluster?.mc_loader || cluster?.loader || 'Vanilla');
  const isVanilla = loaderName.toLowerCase() === 'vanilla';

  /* Vanilla instances have no mod loader, so mods and shaders simply cannot
     be installed. Resource packs still work, so Textures stays. */
  const tabs = useMemo(() => {
    const list = [
      { id: 'overview', key: 'cluster.overview' },
      { id: 'logs', key: 'cluster.logs' },
      { id: 'screenshots', key: 'cluster.screenshots' }
    ];

    if (!isVanilla) {
      list.push({ id: 'mods', key: 'cluster.mods' });
      list.push({ id: 'shaders', key: 'cluster.shaders' });
    }

    list.push({ id: 'textures', key: 'cluster.textures' });
    list.push({ id: 'settings', key: 'common.settings' });
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
        <div className="tab-empty-placeholder">{t('cluster.noneSelected')}</div>
      </div>
    );
  }

  const isRunning = launcherState?.status === 'running' || launcherState?.status === 'game-running';
  const isDownloading = launcherState?.status === 'downloading';
  const isBusy = launcherState?.busy;
  const isInstalled = useIsInstalled(cluster, launcherState?.status);

  const getLaunchButtonLabel = () => {
    return formatLaunchProgress(launcherState, t);
  };

  const handleOpenFolder = () => {
    if (window.native?.instance?.openFolder) {
      window.native.instance.openFolder(cluster.id, '');
    }
  };

  const version = cluster.mc_version || cluster.version || '';
  const title = cluster.name || `${loaderName} ${version}`;

  const fallbackDesc = isVanilla
    ? t('cluster.vanillaDescription', { version })
    : t('cluster.loaderDescription', { version, loader: loaderName });

  const backgroundArt = getClusterArt(cluster);

  return (
    <div className="cluster-detail-view">
      <div className="cluster-detail-bg-layer" aria-hidden="true">
        <img className="cluster-detail-bg-img" src={backgroundArt} alt="" />
        <div className="cluster-detail-bg-overlay" />
        <div className="cluster-detail-bg-fade" />
      </div>

      <div className="cluster-detail-content-wrapper">
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
              title={t('cluster.openGameFolder')}
            >
              <Icon name="folder" size={18} />
            </button>

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
                <span>{t(tab.key)}</span>
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
          {activeTab === 'shaders' && !isVanilla && <PacksTab cluster={cluster} type="shaders" onNavigateBrowse={onNavigateBrowse} />}
          {activeTab === 'textures' && <PacksTab cluster={cluster} type="textures" onNavigateBrowse={onNavigateBrowse} />}
          {activeTab === 'settings' && (
            <SettingsTab cluster={cluster} onUpdateCluster={onUpdateCluster} />
          )}
        </div>
      </div>
    </div>
  );
}
