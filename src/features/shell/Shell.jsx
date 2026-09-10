import React, { useCallback, useState } from 'react';
import AppNavbar from './AppNavbar.jsx';
import HomeView from '../home/HomeView.jsx';
import InstancesView from '../instances/InstancesView.jsx';
import ClustersView from '../clusters/ClustersView.jsx';
import BrowseView from '../browser/BrowseView.jsx';
import StatsView from '../stats/StatsView.jsx';
import ClusterDetailView from '../cluster/ClusterDetailView.jsx';
import SettingsModal from '../settings/SettingsModal.jsx';
import AccountsView from '../accounts/AccountsView.jsx';
import AccountSwitcherModal from '../auth/AccountSwitcherModal.jsx';
import CreateInstanceModal from '../instances/CreateInstanceModal.jsx';
import useLauncher from '../launcher/useLauncher.js';
import useInstances from '../instances/useInstances.js';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './Shell.css';

const BACK_LABELS = {
  home: 'back.home',
  instances: 'back.instances',
  versions: 'back.versions',
  stats: 'back.stats',
  browse: 'back.browse'
};

export default function Shell({
  isMaximized,
  account,
  accounts = [],
  activeId,
  onAddMicrosoft,
  onAddOffline,
  onSwitchAccount,
  onRemoveAccount,
  onWardrobeChanged,
  onOpenUpdater
}) {
  const { locale, t } = useI18n();
  // 'home' | 'instances' | 'versions' | 'browse' | 'stats' | 'accounts' | 'cluster-detail'
  const [currentTab, setCurrentTab] = useState('home');
  const [clusterDetailTab, setClusterDetailTab] = useState('overview');
  const [browseReturnTab, setBrowseReturnTab] = useState('instances');

  /* Where the open instance was opened from, so Back always goes there. */
  const [detailOrigin, setDetailOrigin] = useState('home');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [browseIntent, setBrowseIntent] = useState(null);
  const [createInstanceOpen, setCreateInstanceOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);

  const instancesManager = useInstances();
  const launcher = useLauncher();

  const notify = useCallback((title, body) => {
    setNotifications((prev) =>
      [
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title,
          body,
          time: new Date().toLocaleTimeString(locale)
        },
        ...prev
      ].slice(0, 60)
    );
  }, [locale]);

  const handleLaunch = (cluster) => {
    if (!cluster) return;
    launcher.launch(cluster, account);
    notify(
      t('notify.launching'),
      t('notify.starting', {
        name: cluster.name || cluster.mc_version || cluster.version,
        version: `${cluster.mc_version || cluster.version} ${cluster.mc_loader || cluster.loader}`
      })
    );
  };

  const handleOpenCluster = (cluster, tab = 'overview') => {
    if (!cluster?.id) return;
    instancesManager.select(cluster.id);
    setClusterDetailTab(tab);

    setDetailOrigin((previous) => {
      if (currentTab === 'cluster-detail') return previous;
      if (currentTab === 'browse') return browseReturnTab;
      return currentTab;
    });

    setCurrentTab('cluster-detail');
  };

  const handleNavigateBrowse = (cluster) => {
    if (cluster?.id) instancesManager.select(cluster.id);
    setBrowseReturnTab(currentTab === 'browse' ? browseReturnTab : currentTab);
    setCurrentTab('browse');
  };

  const handleCreateInstance = (values, { open = true } = {}) => {
    const created = instancesManager.create(values);
    notify(t('notify.created'), `${created.name} \u2014 ${created.version} ${created.loader}`);
    if (open) handleOpenCluster(created, 'overview');
    return created;
  };

  const handleAddInstance = (instance) => {
    if (!instance?.id) return;
    instancesManager.add(instance);
    notify(t('notify.modpackInstalled'), t('notify.ready', { name: instance.name }));
  };

  const handleDuplicate = (id) => {
    const copy = instancesManager.duplicate(id);
    if (copy) notify(t('notify.duplicated'), copy.name);
    return copy;
  };

  const handleRemoveInstance = (id) => {
    const target = instancesManager.instances.find((item) => item.id === id);
    instancesManager.remove(id);
    if (target) notify(t('instances.removed'), target.name);
    if (currentTab === 'cluster-detail') setCurrentTab(detailOrigin);
  };

  const handleMinimize = () => window.native?.minimize();
  const handleMaximize = () => window.native?.maximize();
  const handleClose = () => window.native?.close();

  const navTab = currentTab === 'cluster-detail' ? detailOrigin : currentTab;

  return (
    <div className="app-shell">
      <AppNavbar
        currentTab={navTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAccountSwitcher={() => setAccountSwitcherOpen(true)}
        account={account}
        isMaximized={isMaximized}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />

      <div className="shell-content-layer">
        {currentTab === 'home' && (
          <HomeView
            instances={instancesManager.instances}
            selectedCluster={instancesManager.selected}
            onSelectCluster={instancesManager.select}
            onOpenCluster={handleOpenCluster}
            onOpenInstances={() => setCurrentTab('instances')}
            account={account}
            launcherState={launcher}
            onLaunch={handleLaunch}
            onKill={launcher.kill}
          />
        )}

        {currentTab === 'instances' && (
          <InstancesView
            instances={instancesManager.instances}
            selectedId={instancesManager.selectedId}
            onSelect={instancesManager.select}
            onOpenCluster={handleOpenCluster}
            onLaunch={handleLaunch}
            onKill={launcher.kill}
            launcherState={launcher}
            onOpenCreateModal={() => setCreateInstanceOpen(true)}
            onUpdate={instancesManager.update}
            onDuplicate={handleDuplicate}
            onRemove={handleRemoveInstance}
            onNavigateBrowse={handleNavigateBrowse}
            onNotify={notify}
          />
        )}

        {currentTab === 'versions' && (
          <ClustersView
            instances={instancesManager.instances}
            selectedCluster={instancesManager.selected}
            onSelectCluster={instancesManager.select}
            onOpenCluster={handleOpenCluster}
            onLaunch={handleLaunch}
            onOpenNewInstanceModal={() => setCreateInstanceOpen(true)}
            onCreateInstance={handleCreateInstance}
            onNotify={notify}
            launcherState={launcher}
          />
        )}

        {currentTab === 'browse' && (
          <BrowseView
            initialIntent={browseIntent}
            instances={instancesManager.instances}
            selectedCluster={instancesManager.selected}
            onSelectCluster={instancesManager.select}
            onBack={() => setCurrentTab(browseReturnTab)}
            onAddInstance={handleAddInstance}
            onOpenCluster={handleOpenCluster}
            onNotify={notify}
          />
        )}

        {currentTab === 'stats' && <StatsView instances={instancesManager.instances} />}

        {currentTab === 'accounts' && (
          <AccountsView
            account={account}
            onNotify={notify}
            onWardrobeChanged={onWardrobeChanged}
          />
        )}

        {currentTab === 'cluster-detail' && (
          <ClusterDetailView
            cluster={instancesManager.selected}
            initialTab={clusterDetailTab}
            onBack={() => setCurrentTab(detailOrigin)}
            backLabel={BACK_LABELS[detailOrigin] ? t(BACK_LABELS[detailOrigin]) : t('common.back')}
            onLaunch={handleLaunch}
            onKill={launcher.kill}
            launcherState={launcher}
            onUpdateCluster={instancesManager.update}
            onNavigateBrowse={handleNavigateBrowse}
          />
        )}
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        instances={instancesManager.instances}
        onOpenUpdater={onOpenUpdater}
      />

      <AccountSwitcherModal
        open={accountSwitcherOpen}
        onClose={() => setAccountSwitcherOpen(false)}
        accounts={accounts}
        activeId={activeId}
        onSwitchAccount={onSwitchAccount}
        onAddMicrosoft={onAddMicrosoft}
        onAddOffline={onAddOffline}
        onRemoveAccount={onRemoveAccount}
      />

      <CreateInstanceModal
        open={createInstanceOpen}
        instances={instancesManager.instances}
        onClose={() => setCreateInstanceOpen(false)}
        onCreate={(values) => handleCreateInstance(values)}
      />
    </div>
  );
}
