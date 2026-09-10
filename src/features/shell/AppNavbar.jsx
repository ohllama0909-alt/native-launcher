import React from 'react';
import { Boxes, CircleUserRound, Compass, Folder, Home, Layers3, MessageCircle, Minus, Settings, X } from 'lucide-react';
import Logo from '../../components/ui/Logo.jsx';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import packageInfo from '../../../package.json';
import './AppNavbar.css';

export const NAV_TABS = [
  { id: 'home', labelKey: 'nav.home', icon: Home },
  { id: 'accounts', labelKey: 'account.wardrobe', icon: CircleUserRound },
  { id: 'instances', labelKey: 'nav.instances', icon: Layers3 },
  { id: 'versions', labelKey: 'nav.versions', icon: Boxes },
  { id: 'browse', labelKey: 'nav.browse', icon: Compass },
  { id: 'stats', labelKey: 'nav.stats', icon: Folder }
];

function RailButton({ icon: Icon, active, onClick, title, badge, status }) {
  return <button className={active ? 'active' : ''} onClick={onClick} title={title}>
    <Icon size={20} strokeWidth={2.15}/>{badge ? <em>{badge}</em> : null}{status ? <i className={`rail-status ${status}`}/> : null}
  </button>;
}

export default function AppNavbar({ currentTab, onSelectTab, onOpenSettings, onOpenAccountSwitcher, account, isMaximized, onMinimize, onMaximize, onClose }) {
  const { t } = useI18n();
  const buildVersion = window.native?.version || packageInfo.version;
  return <>
    <header className="noctra-titlebar">
      <div className="noctra-build">
        <span className="noctra-wordmark"><Logo height={13} variant="mark"/> Noctra Client</span><i/><span>Build <b>{buildVersion}</b></span>
      </div>
      <div className="window-controls-group">
        <button className="window-ctrl-btn" onClick={onMinimize} aria-label={t('window.minimize')}><Minus size={14}/></button>
        <button className="window-ctrl-btn" onClick={onMaximize} aria-label={t(isMaximized ? 'window.restore' : 'window.maximize')}><NativeIcon name={isMaximized ? 'restore' : 'maximize'} size={12}/></button>
        <button className="window-ctrl-btn close" onClick={onClose} aria-label={t('common.close')}><X size={15}/></button>
      </div>
    </header>
    <aside className="noctra-rail" aria-label={t('nav.primary')}>
      <button className="noctra-logo" onClick={() => onSelectTab('home')} title="Noctra Client"><Logo height={35} variant="mark"/></button>
      <span className="rail-divider"/>
      <nav>
        <RailButton icon={Home} active={currentTab === 'home'} onClick={() => onSelectTab('home')} title={t('nav.home')}/>
        <span className="rail-divider"/>
        <RailButton icon={MessageCircle} title="Noctra Relay" onClick={() => onSelectTab('home')}/>
        <RailButton icon={Layers3} active={currentTab === 'instances'} onClick={() => onSelectTab('instances')} title={t('nav.instances')}/>
        <RailButton icon={Compass} active={currentTab === 'browse'} onClick={() => onSelectTab('browse')} title={t('nav.browse')}/>
        <RailButton icon={Boxes} active={currentTab === 'versions'} onClick={() => onSelectTab('versions')} title={t('nav.versions')}/>
        <RailButton icon={Folder} active={currentTab === 'stats'} onClick={() => onSelectTab('stats')} title={t('nav.stats')} status="red"/>
      </nav>
      <div className="rail-spacer"/>
      <RailButton icon={CircleUserRound} active={currentTab === 'accounts'} onClick={onOpenAccountSwitcher} title={account?.name || t('account.accounts')} status="gold"/>
      <RailButton icon={Settings} title={t('common.settings')} onClick={onOpenSettings}/>
    </aside>
  </>;
}
