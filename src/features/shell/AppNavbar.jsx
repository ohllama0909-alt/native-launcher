import React from 'react';
import Logo from '../../components/ui/Logo.jsx';
import Icon from '../../components/ui/Icon.jsx';
import SteveAvatar from '../../assets/steve.png';
import './AppNavbar.css';

export default function AppNavbar({
  currentTab,
  onSelectTab,
  unreadCount = 0,
  onOpenNotifications,
  onOpenSettings,
  onOpenAccountSwitcher,
  account,
  isMaximized,
  onMinimize,
  onMaximize,
  onClose
}) {
  const avatarUrl = account?.uuid
    ? `https://crafatar.com/avatars/${account.uuid}?size=64&overlay`
    : SteveAvatar;

  return (
    <header className="app-navbar" data-tauri-drag-region>
      {/* Left: OneClient Logo */}
      <div className="navbar-left">
        <button
          className="navbar-logo-btn"
          onClick={() => onSelectTab('home')}
          title="Home"
        >
          <Logo height={28} />
        </button>
      </div>

      {/* Center Navigation Tabs: Home, Versions, Browse, Stats */}
      <nav className="navbar-center">
        <button
          className={`nav-link ${currentTab === 'home' ? 'active' : ''}`}
          onClick={() => onSelectTab('home')}
        >
          <span className="nav-link-label">Home</span>
          <div className="nav-link-underline" />
        </button>

        <button
          className={`nav-link ${currentTab === 'versions' ? 'active' : ''}`}
          onClick={() => onSelectTab('versions')}
        >
          <span className="nav-link-label">Versions</span>
          <div className="nav-link-underline" />
        </button>

        <button
          className={`nav-link ${currentTab === 'browse' ? 'active' : ''}`}
          onClick={() => onSelectTab('browse')}
        >
          <span className="nav-link-label">Browse</span>
          <div className="nav-link-underline" />
        </button>

        <button
          className={`nav-link ${currentTab === 'stats' ? 'active' : ''}`}
          onClick={() => onSelectTab('stats')}
        >
          <span className="nav-link-label">Stats</span>
          <div className="nav-link-underline" />
        </button>
      </nav>

      {/* Right Controls: Notifications, Settings, User Avatar, Window Controls */}
      <div className="navbar-right">
        <button
          className="nav-icon-btn"
          onClick={onOpenNotifications}
          title="Notifications"
        >
          <Icon name="bell-01" size={20} />
          {unreadCount > 0 && (
            <span className="unread-badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          className="nav-icon-btn"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Icon name="settings-02" size={20} />
        </button>

        <button
          className="nav-icon-btn avatar-nav-btn"
          onClick={onOpenAccountSwitcher}
          title={account?.name ? `Account: ${account.name}` : 'Accounts'}
        >
          <img
            src={avatarUrl}
            alt="Account"
            className="nav-avatar-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = SteveAvatar;
            }}
          />
        </button>

        <div className="window-controls-group">
          <button
            className="window-ctrl-btn"
            onClick={onMinimize}
            title="Minimize"
          >
            <Icon name="minus" size={16} />
          </button>

          <button
            className="window-ctrl-btn"
            onClick={onMaximize}
            title={isMaximized ? 'Restore' : 'Maximize'}
          >
            <Icon name="maximize-01" size={16} />
          </button>

          <button
            className="window-ctrl-btn close"
            onClick={onClose}
            title="Close"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
