import React, { useLayoutEffect, useRef, useState } from 'react';
import Logo from '../../components/ui/Logo.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import PlayerAvatar from '../../components/ui/PlayerAvatar.jsx';
import './AppNavbar.css';

export const NAV_TABS = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'instances', label: 'Instances', icon: 'layers' },
  { id: 'versions', label: 'Versions', icon: 'cube' },
  { id: 'browse', label: 'Browse', icon: 'compass' },
  { id: 'stats', label: 'Stats', icon: 'chart' }
];

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
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  // Slide the active pill under whichever tab is selected. Measured rather
  // than hard-coded so it stays correct once Poppins swaps in and at any
  // window width.
  useLayoutEffect(() => {
    const wrap = navRef.current;
    const element = itemRefs.current[currentTab];

    if (!wrap || !element) {
      setIndicator((current) => ({ ...current, ready: false }));
      return undefined;
    }

    const measure = () => {
      const item = element.getBoundingClientRect();
      const container = wrap.getBoundingClientRect();
      setIndicator({ left: item.left - container.left, width: item.width, ready: true });
    };

    measure();
    const frame = requestAnimationFrame(measure);

    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(measure);
      observer.observe(wrap);
      observer.observe(element);
    }
    window.addEventListener('resize', measure);
    if (document.fonts?.ready) document.fonts.ready.then(measure).catch(() => {});

    return () => {
      cancelAnimationFrame(frame);
      if (observer) observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [currentTab]);

  const accountLabel = account?.name || 'Sign in';
  const accountKind =
    account?.type === 'microsoft' ? 'Microsoft' : account?.type === 'guest' ? 'Guest' : 'Offline';

  return (
    <header className="app-navbar">
      {/* Brand */}
      <div className="navbar-left">
        <button
          type="button"
          className="navbar-logo-btn"
          onClick={() => onSelectTab('home')}
          title="Native — Home"
        >
          <Logo height={30} />
        </button>
      </div>

      {/* Primary navigation */}
      <nav className="navbar-center" ref={navRef} aria-label="Primary">
        <span
          className={`nav-indicator ${indicator.ready ? 'is-ready' : ''}`}
          style={{ transform: `translateX(${indicator.left}px)`, width: indicator.width }}
          aria-hidden="true"
        />
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            ref={(element) => {
              itemRefs.current[tab.id] = element;
            }}
            className={`nav-link ${currentTab === tab.id ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
            aria-current={currentTab === tab.id ? 'page' : undefined}
          >
            <NativeIcon name={tab.icon} size={16} strokeWidth={1.9} />
            <span className="nav-link-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* Actions + window controls */}
      <div className="navbar-right">
        <button
          type="button"
          className="nav-icon-btn"
          onClick={onOpenNotifications}
          title="Notifications"
          aria-label="Notifications"
        >
          <NativeIcon name="bell" size={18} />
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        <button
          type="button"
          className="nav-icon-btn"
          onClick={onOpenSettings}
          title="Settings"
          aria-label="Settings"
        >
          <NativeIcon name="settings" size={18} />
        </button>

        <button
          type="button"
          className="nav-account-chip"
          onClick={onOpenAccountSwitcher}
          title={account?.name ? `${account.name} — ${accountKind}` : 'Accounts'}
        >
          <PlayerAvatar account={account} size={28} kind="avatar" className="nav-account-avatar" />
          <span className="nav-account-meta">
            <span className="nav-account-name">{accountLabel}</span>
            <span className="nav-account-kind">{accountKind}</span>
          </span>
          <NativeIcon name="chevron-down" size={14} className="nav-account-caret" />
        </button>

        <div className="window-controls-group">
          <button
            type="button"
            className="window-ctrl-btn"
            onClick={onMinimize}
            title="Minimize"
            aria-label="Minimize"
          >
            <NativeIcon name="minimize" size={15} strokeWidth={1.6} />
          </button>

          <button
            type="button"
            className="window-ctrl-btn"
            onClick={onMaximize}
            title={isMaximized ? 'Restore down' : 'Maximize'}
            aria-label={isMaximized ? 'Restore down' : 'Maximize'}
          >
            <NativeIcon name={isMaximized ? 'restore' : 'maximize'} size={14} strokeWidth={1.6} />
          </button>

          <button
            type="button"
            className="window-ctrl-btn close"
            onClick={onClose}
            title="Close"
            aria-label="Close"
          >
            <NativeIcon name="close" size={15} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </header>
  );
}
