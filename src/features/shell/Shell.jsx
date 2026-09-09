import { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Boxes,
  ChevronDown,
  Gamepad2,
  Globe,
  Loader2,
  Newspaper,
  Package,
  Puzzle,
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
  { id: 'play', label: 'Home', icon: Gamepad2 },
  { id: 'instances', label: 'Versions', icon: Boxes },
  { id: 'mods', label: 'Browse', icon: Puzzle },
  { id: 'modpacks', label: 'Modpacks', icon: Package },
  { id: 'servers', label: 'Servers', icon: Globe },
  { id: 'news', label: 'News', icon: Newspaper }
];

function ComingSoon({ label, icon: Icon }) {
  return (
    <div className="coming-soon">
      <span className="coming-soon-icon"><Icon size={28} /></span>
      <h1>{label}</h1>
      <p>This space is being prepared for a future Native release.</p>
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
  const navigationLocked = useLauncherInstallLock();
  const { status, percent, detail, busy } = useLauncher();
  const { settings } = useSettings();

  useEffect(() => {
    if (startPageApplied.current || !settings) return;
    startPageApplied.current = true;
    const startPage = settings.behavior?.startPage;
    if (!window.location.hash && ['play', 'instances', 'mods', 'modpacks', 'news'].includes(startPage)) {
      setNav({ page: startPage });
    }
  }, [settings]);

  const page = nav.page;
  const activePage = page === 'instance' ? 'instances'
    : page === 'mod' ? (nav.from === 'modpacks' ? 'modpacks' : 'mods')
      : page;
  const updateBusy = ['checking', 'preparing', 'downloading', 'installing'].includes(updateStatus.type);
  const updateAttention = ['available', 'downloaded', 'error'].includes(updateStatus.type);

  const navigate = (next) => {
    if (navigationLocked && next.page !== 'settings') return;
    setProfileOpen(false);
    setNav(next);
  };

  return (
    <div className={`shell shell--${page}`}>
      <header className="app-navbar">
        <button className="navbar-brand" onClick={() => navigate({ page: 'play' })} aria-label="Native home">
          <img src={appIcon} alt="" />
          <span>NATIVE</span>
        </button>

        <nav className="navbar-links" aria-label="Primary navigation">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              data-testid={`nav-${id}`}
              className={activePage === id ? 'active' : ''}
              disabled={navigationLocked}
              title={navigationLocked ? 'Navigation is locked while Minecraft installs' : undefined}
              onClick={() => navigate({ page: id })}
            >
              <Icon size={15} />
              <span>{label}</span>
              <i />
            </button>
          ))}
        </nav>

        <div className="navbar-actions">
          {busy && (
            <div className="launcher-progress-chip" title={detail}>
              <Loader2 size={13} className="spin" />
              <span>{status === 'downloading' ? `${percent}%` : 'Launching'}</span>
            </div>
          )}
          <DownloadRing />
          <button
            className={`navbar-icon-button navbar-update${updateAttention ? ' has-attention' : ''}`}
            data-testid="nav-updater"
            onClick={onOpenUpdater}
            title={updateStatus.type === 'downloaded' ? 'Restart to update Native' : 'Update center'}
          >
            <Bell size={19} className={updateBusy ? 'soft-pulse' : ''} />
            {updateAttention && <i />}
          </button>
          <button
            className={`navbar-icon-button${page === 'settings' ? ' active' : ''}`}
            data-testid="nav-settings"
            onClick={() => navigate({ page: 'settings' })}
            title="Settings"
          >
            <Settings size={19} />
          </button>

          <div className="account-wrap" ref={profileRef}>
            <button className="navbar-avatar" data-testid="account-chip" onClick={() => setProfileOpen((value) => !value)} title={account.name}>
              <Avatar uuid={account.uuid} />
              <ChevronDown size={11} />
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

          <span className="navbar-divider" />
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
          ) : page === 'servers' ? (
            <ComingSoon label="Servers" icon={Globe} />
          ) : (
            <ComingSoon label="News" icon={Newspaper} />
          )}
        </div>
      </main>
    </div>
  );
}
