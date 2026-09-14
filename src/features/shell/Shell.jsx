import React, { useCallback, useState } from 'react';
import AppNavbar from './AppNavbar.jsx';
import HomeView from '../home/HomeView.jsx';
import InstancesView from '../instances/InstancesView.jsx';
import ClustersView from '../clusters/ClustersView.jsx';
import BrowseView from '../browser/BrowseView.jsx';
import ModpacksView from '../browser/ModpacksView.jsx';
import ClusterDetailView from '../cluster/ClusterDetailView.jsx';
import LockerView from '../skins/LockerView.jsx';
import NotificationDrawer from '../notifications/NotificationDrawer.jsx';
import FriendContextMenu from '../social/FriendContextMenu.jsx';
import NicknameModal from '../social/NicknameModal.jsx';
import useSocial from '../social/useSocial.js';
import SettingsModal from '../settings/SettingsModal.jsx';
import AccountSwitcherModal from '../auth/AccountSwitcherModal.jsx';
import CreateInstanceModal from '../instances/CreateInstanceModal.jsx';
import useLauncher from '../launcher/useLauncher.js';
import useInstances from '../instances/useInstances.js';
import usePlaytimeTracker from '../instances/usePlaytimeTracker.js';
import NoctraAccountGate from '../../components/ui/NoctraAccountGate.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './Shell.css';

export default function Shell({
  isMaximized,
  account,
  accounts = [],
  activeId,
  initialInstances = null,
  onAddMicrosoft,
  onAddOffline,
  onAddNative,
  onNoctraSendCode,
  onNoctraResendCode,
  onNoctraVerifyRegister,
  onNoctraLogin,
  onSwitchAccount,
  onRemoveAccount,
  onWardrobeChanged,
  onOpenUpdater,
  updateStatus,
  networkStatus
}) {
  const { locale, t } = useI18n();
  // Instance management is an overlay; opening it never replaces this page.
  const [currentTab, setCurrentTab] = useState('home');
  const [clusterDetailTab, setClusterDetailTab] = useState('overview');
  const [browseReturnTab, setBrowseReturnTab] = useState('instances');

  const [instanceManagerOpen, setInstanceManagerOpen] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [browseIntent, setBrowseIntent] = useState(null);
  const [createInstanceOpen, setCreateInstanceOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);

  const openUpdater = useCallback(() => {
    setSettingsOpen(false);
    setNotificationsOpen(false);
    onOpenUpdater?.();
  }, [onOpenUpdater]);

  const hasValidAccount = Boolean(
    account &&
    account.id &&
    account.id !== 'guest' &&
    accounts.length > 0
  );

  const isNoctra = Boolean(
    hasValidAccount &&
    (account.type === 'noctra' || account.type === 'native')
  );

  const instancesManager = useInstances(initialInstances);
  const launcher = useLauncher();
  usePlaytimeTracker(instancesManager.recordSession, { launcherState: launcher });
  const social = useSocial(isNoctra ? account : null);

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

  const handleLaunch = (cluster, options = {}) => {
    if (!cluster) return;
    if (!account || account.id === 'guest' || accounts.length === 0) {
      setAccountSwitcherOpen(true);
      return;
    }
    launcher.launch(cluster, account, options);
    notify(
      t('notify.launching'),
      options?.quickJoinServer
        ? `Connecting to ${options.quickJoinServer} with ${cluster.name || cluster.mc_version || cluster.version}\u2026`
        : t('notify.starting', {
            name: cluster.name || cluster.mc_version || cluster.version,
            version: `${cluster.mc_version || cluster.version} ${cluster.mc_loader || cluster.loader}`
          })
    );
  };

  /* Accepts a friend object or a raw server address. */
  const handleJoinServer = (target) => {
    const serverAddress = typeof target === 'string' ? target : target?.serverAddress;
    if (!serverAddress) return;
    const cluster = instancesManager.activeCluster || instancesManager.clusters?.[0] || instancesManager.instances?.[0];
    if (!cluster) {
      notify('No instance found', 'Please install or create a Minecraft instance first to join.');
      return;
    }
    handleLaunch(cluster, { quickJoinServer: serverAddress });
  };

  const handleOpenCluster = (cluster, tab = 'overview') => {
    if (!cluster?.id) return;
    instancesManager.select(cluster.id);
    setClusterDetailTab(tab);

    setInstanceManagerOpen(true);
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
    setInstanceManagerOpen(false);
  };

  const handleMinimize = () => window.native?.minimize();
  const handleMaximize = () => window.native?.maximize();
  const handleClose = () => window.native?.close();

  const navTab = currentTab;

  return (
    <div className="app-shell">
      <AppNavbar
        currentTab={navTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAccountSwitcher={() => setAccountSwitcherOpen(true)}
        isAccountOpen={!hasValidAccount || accountSwitcherOpen}
        account={account}
        isNoctra={isNoctra}
        notifications={notifications.length}
        onOpenNotifications={() => setNotificationsOpen(true)}
        isMaximized={isMaximized}
        onMinimize={handleMinimize}
        onMaximize={handleMaximize}
        onClose={handleClose}
        updateStatus={updateStatus}
        networkStatus={networkStatus}
        onOpenUpdater={openUpdater}
        friendsBadge={isNoctra ? social.badgeTotal : 0}
      />

      <div className="shell-content-layer">
        {currentTab === 'home' && (
          <HomeView
            instances={instancesManager.instances}
            selectedCluster={instancesManager.selected}
            onSelectCluster={instancesManager.select}
            onOpenCluster={handleOpenCluster}
            onOpenInstances={() => setCurrentTab('instances')}
            onOpenVersions={() => setCurrentTab('versions')}
            onOpenBrowse={() => setCurrentTab('browse')}
            onCreateInstance={() => setCreateInstanceOpen(true)}
            account={account}
            launcherState={launcher}
            onLaunch={handleLaunch}
            onKill={launcher.kill}
          />
        )}

        {currentTab === 'skins' && (
          isNoctra ? (
            <LockerView
              account={account}
              onWardrobeChanged={onWardrobeChanged}
              onNotify={notify}
            />
          ) : (
            <NoctraAccountGate
              feature="locker"
              onOpenAccountSwitcher={() => setAccountSwitcherOpen(true)}
              onBackHome={() => setCurrentTab('home')}
            />
          )
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
            onKill={launcher.kill}
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

        {currentTab === 'modpacks' && (
          <ModpacksView
            instances={instancesManager.instances}
            selectedCluster={instancesManager.selected}
            onSelectCluster={instancesManager.select}
            onAddInstance={handleAddInstance}
            onOpenCluster={handleOpenCluster}
            onNotify={notify}
          />
        )}


        {instanceManagerOpen && instancesManager.selected && (
          <ClusterDetailView
            key={instancesManager.selected.id}
            cluster={instancesManager.selected}
            instances={instancesManager.instances}
            onSelectCluster={instancesManager.select}
            initialTab={clusterDetailTab}
            onBack={() => setInstanceManagerOpen(false)}
            onLaunch={handleLaunch}
            onKill={launcher.kill}
            launcherState={launcher}
            onUpdateCluster={instancesManager.saveOverrides}
            onNavigateBrowse={handleNavigateBrowse}
          />
        )}
      </div>

      <NotificationDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={notifications}
        onClear={() => setNotifications([])}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        instances={instancesManager.instances}
        onOpenUpdater={openUpdater}
      />

      <AccountSwitcherModal
        open={!hasValidAccount || accountSwitcherOpen}
        firstRun={!hasValidAccount}
        onClose={() => {
          if (hasValidAccount) {
            setAccountSwitcherOpen(false);
          }
        }}
        accounts={accounts}
        activeId={activeId}
        onSwitchAccount={onSwitchAccount}
        onAddMicrosoft={onAddMicrosoft}
        onAddOffline={onAddOffline}
        onAddNative={onAddNative}
        onNoctraSendCode={onNoctraSendCode}
        onNoctraResendCode={onNoctraResendCode}
        onNoctraVerifyRegister={onNoctraVerifyRegister}
        onNoctraLogin={onNoctraLogin}
        onRemoveAccount={onRemoveAccount}
      />

      <CreateInstanceModal
        open={createInstanceOpen}
        instances={instancesManager.instances}
        onClose={() => setCreateInstanceOpen(false)}
        onCreate={(values) => handleCreateInstance(values)}
      />



      {isNoctra && social.contextMenu && (
        <FriendContextMenu
          context={social.contextMenu}
          onClose={() => social.setContextMenu(null)}
          onJoinServer={handleJoinServer}
          onOpenChat={undefined}
          onToggleBestFriend={(friend) =>
            social.updateFriend(friend.id, { isBestFriend: !friend.isBestFriend })
          }
          onSetNickname={(friend) => social.setNicknameModalFriend(friend)}
          onUnfriend={(friend) => social.unfriend(friend.id)}
          onBlock={(friend) => social.block(friend.id)}
        />
      )}

      {isNoctra && social.nicknameModalFriend && (
        <NicknameModal
          friend={social.nicknameModalFriend}
          onClose={() => social.setNicknameModalFriend(null)}
          onSave={(friendId, nickname) => social.updateFriend(friendId, { nickname })}
        />
      )}
    </div>
  );
}
