import React, { useLayoutEffect, useRef, useState } from 'react';
import Logo from '../../components/ui/Logo.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import PlayerAvatar from '../../components/ui/PlayerAvatar.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './AppNavbar.css';

export const NAV_TABS = [
  { id: 'home', labelKey: 'nav.home' },
  { id: 'instances', labelKey: 'nav.instances' },
  { id: 'versions', labelKey: 'nav.versions' },
  { id: 'browse', labelKey: 'nav.browse' },
  { id: 'stats', labelKey: 'nav.stats' },
  { id: 'accounts', labelKey: 'account.wardrobe' }
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
  const { t } = useI18n();
  const navRef = useRef(null);
  const itemRefs = useRef({});
  const [underline, setUnderline] = useState({ left: 0, width: 0, ready: false });

  // Measure the active tab so the underline slides to exactly the right
  // place at any window width and after Poppins swaps in.
  useLayoutEffect(() => {
    const wrap = navRef.current;
    const element = itemRefs.current[currentTab];

    if (!wrap || !element) {
      setUnderline((current) => ({ ...current, ready: false }));
      return undefined;
    }

    const measure = () => {
      const item = element.getBoundingClientRect();
      const container = wrap.getBoundingClientRect();
      setUnderline({ left: item.left - container.left, width: item.width, ready: true });
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

  const accountTitle = account?.name
    ? t('account.named', { name: account.name })
    : t('account.accounts');

  return (
    <header className="app-navbar">
      {/* Brand */}
      <div className="navbar-left">
        <button
          type="button"
          className="navbar-logo-btn"
          onClick={() => onSelectTab('home')}
          title="Native"
        >
          <Logo height={32} />
        </button>
      </div>

      {/* Primary navigation */}
      <nav className="navbar-center" ref={navRef} aria-label={t('nav.primary')}>
        {NAV_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            ref={(element) => {
              itemRefs.current[tab.id] = element;
            }}
            className={'nav-link ' + (currentTab === tab.id ? 'active' : '')}
            onClick={() => onSelectTab(tab.id)}
            aria-current={currentTab === tab.id ? 'page' : undefined}
          >
            <span className="nav-link-label">{t(tab.labelKey)}</span>
          </button>
        ))}
        <span
          className={'nav-underline ' + (underline.ready ? 'is-ready' : '')}
          style={{ transform: 'translateX(' + underline.left + 'px)', width: underline.width }}
          aria-hidden="true"
        />
      </nav>

      {/* Actions + window controls */}
      <div className="navbar-right">
        <button
          type="button"
          className="nav-icon-btn"
          onClick={onOpenNotifications}
          title={t('window.notifications')}
          aria-label={t('window.notifications')}
        >
          <NativeIcon name="bell" size={17} strokeWidth={1.7} />
          {unreadCount > 0 && (
            <span className="unread-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>

        <button
          type="button"
          className="nav-icon-btn"
          onClick={onOpenSettings}
          title={t('common.settings')}
          aria-label={t('common.settings')}
        >
          <NativeIcon name="settings" size={17} strokeWidth={1.7} />
        </button>

        <button
          type="button"
          className="nav-avatar-btn"
          onClick={onOpenAccountSwitcher}
          title={accountTitle}
          aria-label={accountTitle}
        >
          <PlayerAvatar account={account} size={26} kind="avatar" className="nav-avatar-img" />
        </button>

        <div className="window-controls-group">
          <button
            type="button"
            className="window-ctrl-btn"
            onClick={onMinimize}
            title={t('window.minimize')}
            aria-label={t('window.minimize')}
          >
            <NativeIcon name="minimize" size={14} strokeWidth={1.6} />
          </button>

          <button
            type="button"
            className="window-ctrl-btn"
            onClick={onMaximize}
            title={t(isMaximized ? 'window.restore' : 'window.maximize')}
            aria-label={t(isMaximized ? 'window.restore' : 'window.maximize')}
          >
            <NativeIcon name={isMaximized ? 'restore' : 'maximize'} size={13} strokeWidth={1.6} />
          </button>

          <button
            type="button"
            className="window-ctrl-btn close"
            onClick={onClose}
            title={t('common.close')}
            aria-label={t('common.close')}
          >
            <NativeIcon name="close" size={14} strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </header>
  );
}
