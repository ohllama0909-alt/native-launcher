import React, { useState } from 'react';
import AppNavbar from './AppNavbar.jsx';
import HomeView from '../home/HomeView.jsx';
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
  const [currentTab, setCurrentTab] = useState('home'); // 'home' | 'versions' | 'browse' | 'stats' | 'cluster-detail'
  const [clusterDetailTab, setClusterDetailTab] = useState('overview');

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [createInstanceOpen, setCreateInstanceOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);

  const instancesManager = useInstances();
  const launcher = useLauncher();

  const handleLaunch = (cluster) => {
    if (!cluster) return;
    launcher.launch(cluster, account);
    setNotifications((prev) => [
      {
        id: Date.now(),
        title: 'Launching Game',
        body: `Starting ${cluster.mc_version || cluster.version} ${cluster.mc_loader || cluster.loader}...`,
        time: new Date().toLocaleTimeString()
      },
      ...prev
    ]);
  };

  const handleOpenCluster = (cluster, tab = 'overview') => {
    instancesManager.select(cluster.id);
    setClusterDetailTab(tab);
    setCurrentTab('cluster-detail');
  };

  const handleNavigateBrowse = (cluster) => {
    if (cluster?.id) {
      instancesManager.select(cluster.id);
    }
    setCurrentTab('browse');
  };

  const handleMinimize = () => window.native?.minimize();
  const handleMaximize = () => window.native?.maximize();
  const handleClose = () => window.native?.close();

  return (
    <div className="app-shell">
      {/* Top Navbar matching OneLauncher */}
      <AppNavbar
        currentTab={currentTab === 'cluster-detail' ? 'versions' : currentTab}
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

      {/* Main Content Area */}
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

        {currentTab === 'versions' && (
          <ClustersView
            instances={instancesManager.instances}
            selectedCluster={instancesManager.selected}
            onSelectCluster={instancesManager.select}
            onOpenCluster={handleOpenCluster}
            onLaunch={handleLaunch}
            onOpenNewInstanceModal={() => setCreateInstanceOpen(true)}
          />
        )}

        {currentTab === 'browse' && (
          <BrowseView
            instances={instancesManager.instances}
            selectedCluster={instancesManager.selected}
            onSelectCluster={instancesManager.select}
            onBack={() => setCurrentTab('versions')}
          />
        )}

        {currentTab === 'stats' && (
          <StatsView instances={instancesManager.instances} />
        )}

        {currentTab === 'cluster-detail' && (
          <ClusterDetailView
            cluster={instancesManager.selected}
            initialTab={clusterDetailTab}
            onBack={() => setCurrentTab('home')}
            onLaunch={handleLaunch}
            onKill={launcher.kill}
            launcherState={launcher}
            onUpdateCluster={instancesManager.update}
            onNavigateBrowse={handleNavigateBrowse}
          />
        )}
      </div>

      {/* Settings Modal */}
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

      {/* Account Switcher Modal */}
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

      {/* Notifications Drawer */}
      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onClear={() => setNotifications([])}
      />

      {/* Create Instance Modal */}
      <CreateInstanceModal
        open={createInstanceOpen}
        onClose={() => setCreateInstanceOpen(false)}
        onCreate={(values) => {
          const created = instancesManager.create(values);
          handleOpenCluster(created, 'overview');
        }}
      />
    </div>
  );
}
