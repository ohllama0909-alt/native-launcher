import React from 'react';
import { Bell, Blocks, CircleUserRound, Compass, Home, Layers3, Minus, Settings, X } from 'lucide-react';
import Logo from '../../components/ui/Logo.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import packageInfo from '../../../package.json';
import './AppNavbar.css';

/** Primary destinations, in the order they appear in the rail. */
export const NAV_ITEMS = [
  { id: 'home', labelKey: 'nav.home', icon: Home },
  { id: 'instances', labelKey: 'nav.instances', icon: Layers3 },
  { id: 'versions', labelKey: 'nav.versions', icon: Blocks },
  { id: 'browse', labelKey: 'nav.browse', icon: Compass }
];

function RailButton({ icon: Icon, active, onClick, label, badge = 0, status = null, tone = null }) {
  return (
    <button
      type="button"
      className={`rail-btn${active ? ' is-active' : ''}${tone ? ` tone-${tone}` : ''}`}
      onClick={onClick}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      data-tooltip={label}
    >
      <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
      {badge > 0 && <em className="rail-badge">{badge > 99 ? '99+' : badge}</em>}
      {status ? <i className={`rail-status ${status}`} aria-hidden="true" /> : null}
    </button>
  );
}

export default function AppNavbar({
  currentTab,
  onSelectTab,
  onOpenSettings,
  onOpenAccountSwitcher,
  onOpenNotifications,
  account,
  notifications = 0,
  isMaximized,
  onMinimize,
  onMaximize,
  onClose
}) {
  const { t } = useI18n();
  const buildVersion = window.native?.version || packageInfo.version;
  const accountLabel = account?.name ? `${t('account.named', { name: account.name })}` : t('account.accounts');

  return (
    <>
      <header className="noctra-titlebar">
        <div className="noctra-build">
          <span className="noctra-wordmark"><Logo height={13} variant="mark" /> Noctra Client</span>
          <i />
          <span>Build <b>{buildVersion}</b></span>
        </div>
        <div className="window-controls-group">
          <button className="window-ctrl-btn" onClick={onMinimize} aria-label={t('window.minimize')}><Minus size={14} /></button>
          <button className="window-ctrl-btn" onClick={onMaximize} aria-label={t(isMaximized ? 'window.restore' : 'window.maximize')}><NativeIcon name={isMaximized ? 'restore' : 'maximize'} size={12} /></button>
          <button className="window-ctrl-btn close" onClick={onClose} aria-label={t('common.close')}><X size={15} /></button>
        </div>
      </header>

      <aside className="noctra-rail" aria-label={t('nav.primary')}>
        <button
          type="button"
          className="noctra-logo"
          onClick={() => onSelectTab('home')}
          aria-label="Noctra Client"
          data-tooltip="Noctra Client"
        >
          <Logo height={30} variant="mark" />
        </button>

        <nav className="rail-group" aria-label={t('nav.primary')}>
          {NAV_ITEMS.map(({ id, labelKey, icon }) => (
            <RailButton
              key={id}
              icon={icon}
              active={currentTab === id}
              onClick={() => onSelectTab(id)}
              label={t(labelKey)}
            />
          ))}
        </nav>

        <span className="rail-divider" aria-hidden="true" />

        <div className="rail-group">
          <RailButton
            icon={Bell}
            badge={notifications}
            onClick={onOpenNotifications}
            label={t('window.notifications')}
            tone={notifications > 0 ? 'alert' : null}
          />
        </div>

        <div className="rail-spacer" />

        <div className="rail-group">
          <RailButton
            icon={CircleUserRound}
            active={currentTab === 'accounts'}
            onClick={onOpenAccountSwitcher}
            label={accountLabel}
            status={account?.isMicrosoft ? 'gold' : 'muted'}
          />
          <RailButton icon={Settings} onClick={onOpenSettings} label={t('common.settings')} />
        </div>
      </aside>
    </>
  );
}
