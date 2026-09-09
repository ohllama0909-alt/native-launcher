import React, { useCallback, useState } from 'react';
import AppNavbar from './AppNavbar.jsx';
import HomeView from '../home/HomeView.jsx';
import InstancesView from '../instances/InstancesView.jsx';
import ClustersView from '../clusters/ClustersView.jsx';
import BrowseView from '../browser/BrowseView.jsx';
import StatsView from '../stats/StatsView.jsx';
import ClusterDetailView from '../cluster/ClusterDetailView.jsx';
import SettingsModal from '../settings/SettingsModal.jsx';
import AccountSwitcherModal from '../auth/AccountSwitcherModal.jsx';
import NotificationDrawer from '../notifications/NotificationDrawer.jsx';
import CreateInstanceModal from '../instances/CreateInstanceModal.jsx';
import useLauncher from '../launcher/useLauncher.js';
import useInstances from '../instances/useInstances.js';
import './Shell.css';

export default function Shell({
  isMaximized,
  account,
  accounts = [],
  activeId,
  onAddMicrosoft,
  onAddOffline,
  onSwitchAccount,
  onRemoveAccount,
  onOpenUpdater
}) {
  // 'home' | 'instances' | 'versions' | 'browse' | 'stats' | 'cluster-detail'
  const [currentTab, setCurrentTab] = useState('home');
  const [clusterDetailTab, setClusterDetailTab] = useState('overview');
  const [browseReturnTab, setBrowseReturnTab] = useState('instances');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
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
          time: new Date().toLocaleTimeString()
        },
        ...prev
      ].slice(0, 60)
    );
  }, []);

  const handleLaunch = (cluster) => {
    if (!cluster) return;
    launcher.launch(cluster, account);
    notify(
      'Launching game',
      `Starting ${cluster.name || cluster.mc_version || cluster.version} \u2014 ${
        cluster.mc_version || cluster.version
      } ${cluster.mc_loader || cluster.loader}`
    );
  };

  const handleOpenCluster = (cluster, tab = 'overview') => {
    if (!cluster?.id) return;
    instancesManager.select(cluster.id);
    setClusterDetailTab(tab);
    setCurrentTab('cluster-detail');
  };

  const handleNavigateBrowse = (cluster) => {
    if (cluster?.id) instancesManager.select(cluster.id);
    setBrowseReturnTab(currentTab === 'browse' ? browseReturnTab : currentTab);
    setCurrentTab('browse');
  };

  const handleCreateInstance = (values, { open = true } = {}) => {
    const created = instancesManager.create(values);
    notify('Instance created', `${created.name} \u2014 ${created.version} ${created.loader}`);
    if (open) handleOpenCluster(created, 'overview');
    return created;
  };

  const handleAddInstance = (instance) => {
    if (!instance?.id) return;
    instancesManager.add(instance);
    notify('Modpack installed', `${instance.name} is ready to play`);
  };

  const handleDuplicate = (id) => {
    const copy = instancesManager.duplicate(id);
    if (copy) notify('Instance duplicated', copy.name);
    return copy;
  };

  const handleRemoveInstance = (id) => {
    const target = instancesManager.instances.find((item) => item.id === id);
    instancesManager.remove(id);
    if (target) notify('Instance removed', target.name);
    if (currentTab === 'cluster-detail') setCurrentTab('instances');
  };

  const handleMinimize = () => window.native?.minimize();
  const handleMaximize = () => window.native?.maximize();
  const handleClose = () => window.native?.close();

  return (
    <div className="app-shell">
      <AppNavbar
        currentTab={currentTab === 'cluster-detail' ? 'instances' : currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenNotifications={() => setNotificationsOpen(true)}
        onOpenAccountSwitcher={() => setAccountSwitcherOpen(true)}
        unreadCount={notifications.length}
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
            onOpenVersions={() => setCurrentTab('versions')}
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
          />
        )}

        {currentTab === 'browse' && (
          <BrowseView
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

        {currentTab === 'cluster-detail' && (
          <ClusterDetailView
            cluster={instancesManager.selected}
            initialTab={clusterDetailTab}
            onBack={() => setCurrentTab('instances')}
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
        accounts={accounts}
        activeId={activeId}
        onAddMicrosoft={onAddMicrosoft}
        onAddOffline={onAddOffline}
        onSwitchAccount={onSwitchAccount}
        onRemoveAccount={onRemoveAccount}
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

      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onClear={() => setNotifications([])}
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
