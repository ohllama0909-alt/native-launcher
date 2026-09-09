import { useEffect, useRef, useState } from 'react';
import {
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Globe,
  Hammer,
  LayoutDashboard,
  Loader2,
  Newspaper,
  Package,
  Puzzle,
  RefreshCw,
  Settings
} from 'lucide-react';
import WindowControls from '../../components/WindowControls.jsx';
import DownloadRing from '../../components/DownloadRing.jsx';
import { useClickOutside } from '../../components/ui/Dropdown.jsx';
import appIcon from '../../../icon.png';
import ProfilePanel from './ProfilePanel.jsx';
import HomePage from '../home/HomePage.jsx';
import InstancesPage from '../instances/InstancesPage.jsx';
import InstanceDetailPage from '../instances/InstanceDetailPage.jsx';
import ModsPage from '../mods/ModsPage.jsx';
import ModpacksPage from '../mods/ModpacksPage.jsx';
import ModDetailPage from '../mods/ModDetailPage.jsx';
import SettingsPage from '../settings/SettingsModal.jsx';
import useSettings from '../settings/useSettings.js';
import useInstances from '../instances/useInstances.js';
import useLauncher, { useLauncherInstallLock } from '../launcher/useLauncher.js';
import Avatar from '../../components/ui/Avatar.jsx';
import './Shell.css';

const NAV = [
  { id: 'play', icon: LayoutDashboard, label: 'Home' },
  { id: 'instances', icon: Boxes, label: 'Instances' },
  { id: 'mods', icon: Puzzle, label: 'Browse Mods' },
  { id: 'modpacks', icon: Package, label: 'Modpacks' },
  { id: 'servers', icon: Globe, label: 'Servers' },
  { id: 'news', icon: Newspaper, label: 'News' }
];

const PAGE_META = {
  play: { title: 'Home', description: 'Ready when you are', icon: Gamepad2 },
  instances: { title: 'Instances', description: 'Your Minecraft library', icon: Boxes },
  instance: { title: 'Instance', description: 'Manage game content and worlds', icon: Boxes },
  mods: { title: 'Browse Mods', description: 'Discover something new', icon: Puzzle },
  modpacks: { title: 'Modpacks', description: 'Complete adventures, one click away', icon: Package },
  mod: { title: 'Project Details', description: 'Review and install content', icon: Puzzle },
  servers: { title: 'Servers', description: 'Multiplayer destinations', icon: Globe },
  news: { title: 'News', description: 'The latest from Minecraft', icon: Newspaper },
  settings: { title: 'Settings', description: 'Make Native work your way', icon: Settings }
};

function ComingSoon({ label }) {
  return (
    <div className="coming-soon">
      <span className="coming-soon-icon"><Hammer size={30} /></span>
      <h2>{label}</h2>
      <p>This space is being built for a future Native update.</p>
    </div>
  );
}

function initialNav() {
  const hash = window.location.hash;
  if (hash.startsWith('#instance=')) return { page: 'instance', id: decodeURIComponent(hash.slice('#instance='.length)) };
  if (hash.startsWith('#instances')) return { page: 'instances' };
  if (hash.startsWith('#modpack=')) return { page: 'mod', id: decodeURIComponent(hash.slice('#modpack='.length)), from: 'modpacks' };
  if (hash.startsWith('#mod=')) return { page: 'mod', id: decodeURIComponent(hash.slice('#mod='.length)) };
  if (hash.startsWith('#modpacks')) return { page: 'modpacks' };
  if (hash.startsWith('#mods')) return { page: 'mods' };
  if (hash.startsWith('#settings')) return { page: 'settings' };
  return { page: 'play' };
}

export default function Shell({
  isMaximized = false,
  account = { name: 'Guest', uuid: null, type: 'guest', isMicrosoft: false },
  accounts = [],
  activeId = null,
  onAddMicrosoft = () => {},
  onAddOffline = () => {},
  onSwitchAccount = () => {},
  onRemoveAccount = () => {},
  updateStatus = { type: 'idle' },
  onOpenUpdater = () => {}
}) {
  const [nav, setNav] = useState(initialNav);
  const [pendingLaunch, setPendingLaunch] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useClickOutside(() => setProfileOpen(false));
  const startPageApplied = useRef(false);
  const store = useInstances();
  const sidebarLocked = useLauncherInstallLock();
  const { status, percent, detail, busy } = useLauncher();
  const { settings, update: updateSettings } = useSettings();

  useEffect(() => {
    if (startPageApplied.current || !settings) return;
    startPageApplied.current = true;
    const startPage = settings.behavior?.startPage;
    if (!window.location.hash && ['play', 'instances', 'mods', 'modpacks', 'news'].includes(startPage)) {
      setNav({ page: startPage });
    }
  }, [settings]);

  const page = nav.page;
  const sidebarActive = page === 'instance' ? 'instances'
    : page === 'mod' ? (nav.from === 'modpacks' ? 'modpacks' : 'mods')
      : page;
  const collapsed = settings?.appearance?.sidebarCollapsed ?? false;
  const updateBusy = ['checking', 'preparing', 'downloading', 'installing'].includes(updateStatus.type);
  const updateReady = updateStatus.type === 'downloaded';
  const updateAttention = ['available', 'downloaded', 'error'].includes(updateStatus.type);
  const meta = PAGE_META[page] ?? { title: page, description: '', icon: Gamepad2 };
  const PageIcon = meta.icon;

  const navigate = (next) => {
    if (sidebarLocked && next.page !== 'settings') return;
    setProfileOpen(false);
    setNav(next);
  };

  const toggleSidebar = () => {
    if (!settings) return;
    updateSettings('appearance', 'sidebarCollapsed', !collapsed);
  };

  return (
    <div className={`shell${collapsed ? ' shell--collapsed' : ''}`}>
      <aside className="shell-sidebar">
        <div className="sidebar-brand-row">
          <button className="sidebar-brand" onClick={() => navigate({ page: 'play' })} title="Native home">
            <span className="sidebar-logo-wrap"><img src={appIcon} alt="" /></span>
            <span className="sidebar-brand-copy">
              <strong>Native</strong>
              <small>Launcher</small>
            </span>
          </button>
          <button className="sidebar-collapse" onClick={toggleSidebar} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          <span className="sidebar-section-label">Library</span>
          {NAV.map(({ id, icon: Icon, label }) => {
            const active = sidebarActive === id;
            return (
              <button
                key={id}
                data-testid={`nav-${id}`}
                className={`sidebar-nav-item${active ? ' active' : ''}`}
                title={sidebarLocked ? 'Navigation locked while installing' : collapsed ? label : undefined}
                disabled={sidebarLocked}
                onClick={() => navigate({ page: id })}
              >
                <span className="sidebar-nav-icon"><Icon size={17} strokeWidth={2.2} /></span>
                <span className="sidebar-nav-label">{label}</span>
                {active && <span className="sidebar-active-mark" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            className={`sidebar-utility${updateAttention ? ' has-attention' : ''}`}
            data-testid="nav-updater"
            title={collapsed ? 'Update center' : undefined}
            onClick={onOpenUpdater}
          >
            <span className="sidebar-nav-icon">
              <RefreshCw size={17} className={updateBusy && updateStatus.type !== 'downloading' ? 'spin' : ''} />
              {updateAttention && <i className={`sidebar-status-dot${updateReady ? ' ready' : ''}`} />}
            </span>
            <span className="sidebar-utility-copy">
              <strong>{updateReady ? 'Restart to update' : updateStatus.type === 'available' ? `Update ${updateStatus.version}` : updateBusy ? 'Updating Native' : 'Updates'}</strong>
              <small>{updateStatus.type === 'downloading' ? `${Math.round(updateStatus.percent ?? 0)}% downloaded` : 'Stable channel'}</small>
            </span>
          </button>
          <button
            className={`sidebar-utility${page === 'settings' ? ' active' : ''}`}
            data-testid="nav-settings"
            title={collapsed ? 'Settings' : undefined}
            onClick={() => navigate({ page: 'settings' })}
          >
            <span className="sidebar-nav-icon"><Settings size={17} /></span>
            <span className="sidebar-utility-copy"><strong>Settings</strong><small>Preferences</small></span>
          </button>
          <div className="sidebar-version">v{window.native?.version ?? 'dev'}</div>
        </div>
      </aside>

      <div className="shell-workspace">
        <header className="shell-top">
          <div className="shell-page-context">
            <span className="shell-page-icon"><PageIcon size={17} /></span>
            <span><strong>{meta.title}</strong><small>{meta.description}</small></span>
          </div>

          <div className="shell-top-right">
            {busy && (
              <div className="launcher-progress-chip" title={`${status}: ${detail}`}>
                <Loader2 size={13} className="spin launcher-progress-spin" />
                <span>{status === 'downloading' ? `${percent}%` : 'Launching'}</span>
              </div>
            )}
            <DownloadRing />
            <div className="account-wrap" ref={profileRef}>
              <button className="account-chip" data-testid="account-chip" onClick={() => setProfileOpen((value) => !value)}>
                <Avatar className="account-avatar account-avatar-img" uuid={account.uuid} />
                <span className="account-text"><small>Playing as</small><strong>{account.name.toUpperCase()}</strong></span>
                <ChevronDown size={13} className="account-caret" />
              </button>
              {profileOpen && (
                <ProfilePanel
                  account={account}
                  accounts={accounts}
                  activeId={activeId}
                  onSwitchAccount={onSwitchAccount}
                  onRemoveAccount={onRemoveAccount}
                  onAddOffline={onAddOffline}
                  onAddMicrosoft={onAddMicrosoft}
                  onClose={() => setProfileOpen(false)}
                />
              )}
            </div>
            <span className="top-divider" />
            <WindowControls isMaximized={isMaximized} />
          </div>
        </header>

        <main className="shell-main">
          <div className="shell-page" key={`${page}-${nav.id ?? ''}`}>
            {page === 'play' ? (
              <HomePage
                store={store}
                account={account}
                onManageInstances={() => navigate({ page: 'instances' })}
                autoLaunch={pendingLaunch}
                onAutoLaunchDone={() => setPendingLaunch(false)}
              />
            ) : page === 'instances' ? (
              <InstancesPage store={store} onOpen={(id) => navigate({ page: 'instance', id })} />
            ) : page === 'instance' ? (
              <InstanceDetailPage
                store={store}
                account={account}
                instanceId={nav.id}
                onBack={() => navigate({ page: 'instances' })}
                onBrowseMods={() => navigate({ page: 'mods' })}
                onInstall={() => { navigate({ page: 'play' }); setPendingLaunch(true); }}
              />
            ) : page === 'mods' ? (
              <ModsPage
                store={store}
                onOpenMod={(id) => navigate({ page: 'mod', id, from: 'mods' })}
                onPackInstalled={(id) => navigate({ page: 'instance', id })}
              />
            ) : page === 'modpacks' ? (
              <ModpacksPage
                store={store}
                onOpenMod={(id) => navigate({ page: 'mod', id, from: 'modpacks' })}
                onPackInstalled={(id) => navigate({ page: 'instance', id })}
              />
            ) : page === 'mod' ? (
              <ModDetailPage
                store={store}
                projectId={nav.id}
                onBack={() => navigate({ page: nav.from || 'mods' })}
                onPackInstalled={(id) => navigate({ page: 'instance', id })}
                onLoaded={(project) => {
                  if (project?.project_type === 'modpack' && nav.from !== 'modpacks') {
                    setNav((previous) => ({ ...previous, from: 'modpacks' }));
                  }
                }}
              />
            ) : page === 'settings' ? (
              <SettingsPage onOpenUpdater={onOpenUpdater} />
            ) : (
              <ComingSoon label={meta.title} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
