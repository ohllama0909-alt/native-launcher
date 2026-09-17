import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle2,
  Clock,
  FolderOpen,
  Globe2,
  Images,
  Layers,
  Package,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  X
} from 'lucide-react';
import Dropdown from '../../components/ui/Dropdown.jsx';
import SettingsTab from './SettingsTab.jsx';
import InstanceContentTab from './InstanceContentTab.jsx';
import ScreenshotManager from './ScreenshotManager.jsx';
import BrowseView from '../browser/BrowseView.jsx';
import { formatPlaytime } from '../instances/playtimeStats.js';
import './ClusterDetailView.css';
import './InstanceManager.css';

export default function ClusterDetailView({
  cluster,
  instances = [],
  onSelectCluster,
  onBack,
  onLaunch,
  onKill,
  launcherState,
  onUpdateCluster,
  social,
  account,
  initialTab = 'overview'
}) {
  const loader = cluster.mc_loader || cluster.loader || 'Vanilla';
  const vanilla = loader.toLowerCase() === 'vanilla';

  // Default tab: 'mods' for modded instances, 'worlds' for vanilla
  const [tab, setTab] = useState(() => {
    if (initialTab === 'overview') {
      if (!vanilla) return 'mods';
      return 'worlds';
    }
    return initialTab;
  });

  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState(false);
  const [browser, setBrowser] = useState(null);
  const [notice, setNotice] = useState(null);
  const noticeTimerRef = useRef(null);

  const showNotice = (title, body) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    const payload = body ? { title, body } : { title: '', body: title };
    setNotice(payload);
    noticeTimerRef.current = setTimeout(() => {
      setNotice(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const [dirty, setDirty] = useState(false);
  const dialog = useRef(null);
  const closeRef = useRef(null);

  const confirmDiscard = () => !dirty || window.confirm('Discard unsaved instance settings?');
  closeRef.current = () => {
    if (browser) setBrowser(null);
    else if (confirmDiscard()) onBack();
  };

  useEffect(() => {
    const previous = document.activeElement;
    const root = document.getElementById('root');
    const wasInert = root?.inert;
    if (root) root.inert = true;
    dialog.current?.focus();

    const handleKey = (event) => {
      const nested = dialog.current?.querySelector(
        '.dep-prompt-backdrop, .content-modal-backdrop, .sm-dialog-backdrop, .browse-lightbox-backdrop, .browse-confirm-backdrop'
      );
      if (event.key === 'Escape' && !nested) {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(nested || dialog.current).querySelectorAll(
        'button, input, select, textarea, [tabindex="0"], a[href]'
      )].filter((el) => !el.matches(':disabled') && el.getClientRects().length);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first) {
        event.preventDefault();
        return;
      }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKey, true);
    return () => {
      document.removeEventListener('keydown', handleKey, true);
      if (root) root.inert = wasInert;
      if (previous?.isConnected) previous.focus();
    };
  }, []);

  // Main navigation tabs
  const contentTabs = [
    ...(!vanilla ? [
      ['mods', 'Mods', Package],
      ['shaders', 'Shaders', Sparkles]
    ] : []),
    ['worlds', 'Worlds', Globe2],
    ['screenshots', 'Screenshots', Images],
    ['textures', 'Resources', Layers]
  ];

  const folder = {
    mods: 'mods',
    shaders: 'shaderpacks',
    textures: 'resourcepacks',
    worlds: 'saves',
    logs: 'logs',
    screenshots: 'screenshots'
  }[tab] || '';

  const browseType = {
    mods: 'mod',
    shaders: 'shader',
    textures: 'resourcepack'
  }[tab];

  const openFolder = async () => {
    try {
      await window.native.instance.openFolder(cluster.id, folder);
    } catch (error) {
      showNotice('Could not open folder', error.message);
    }
  };

  const switchTab = (id) => {
    setTab(id);
    setQuery('');
    setFiltered(false);
    setBrowser(null);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setNotice(null);
  };

  const searchPlaceholder = tab === 'settings'
    ? 'Search settings…'
    : tab === 'worlds'
      ? 'Find a world…'
      : tab === 'screenshots'
        ? 'Find a screenshot…'
      : tab === 'mods'
        ? 'Find a mod…'
        : tab === 'shaders'
          ? 'Find a shader…'
          : 'Find a resource pack…';

  const playtimeSeconds = cluster.totalPlaytime || cluster.playtime || 0;
  const playtimeLabel = formatPlaytime(playtimeSeconds);

  return createPortal(
    <div
      className="instance-manager-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <section
        className={`instance-manager ${browser ? 'is-browsing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Manage ${cluster.name || cluster.version}`}
        tabIndex={-1}
        ref={dialog}
      >
        <button
          className="im-close"
          aria-label="Close instance settings"
          onClick={() => closeRef.current()}
        >
          <X size={16} />
        </button>

        {/* Tactical Glass Sidebar */}
        <aside className="im-sidebar">
          {/* Identity Block */}
          <div className="im-identity-block">
            <div className="im-identity-icon-wrap">
              {cluster.icon ? (
                <img src={cluster.icon} alt="" className="im-identity-icon" />
              ) : (
                <Package size={22} className="im-identity-fallback-icon" />
              )}
            </div>

            <div className="im-identity-meta">
              <h2 className="im-identity-title" title={cluster.name}>
                {cluster.name}
              </h2>
              <div className="im-identity-badges">
                <span className="im-badge-version">
                  {cluster.mc_version || cluster.version}
                </span>
                <span className={`im-badge-loader is-${loader.toLowerCase()}`}>
                  {loader}
                </span>
              </div>
            </div>

            <div className="im-identity-stats">
              <Clock size={12} className="im-stat-icon" />
              <span>{playtimeLabel} played</span>
            </div>
          </div>

          {/* Instance Switcher if multiple instances */}
          {instances.length > 1 && (
            <div className="im-version">
              <span className="im-version-label">SWITCH INSTANCE</span>
              <div className="im-version-selector">
                <Dropdown
                  className="im-version-dropdown"
                  value={cluster.id}
                  options={instances.map((item) => ({
                    value: item.id,
                    label: `${item.mc_version || item.version}${
                      instances.filter((i) => (i.mc_version || i.version) === (item.mc_version || item.version)).length > 1
                        ? ` · ${item.name}`
                        : ''
                    }`
                  }))}
                  onChange={(val) => {
                    if (confirmDiscard()) onSelectCluster?.(val);
                  }}
                />
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="im-nav-list" aria-label="Instance sections">
            {contentTabs.map(([id, title, Glyph]) => (
              <button
                key={id}
                className={`im-nav ${tab === id && !browser ? 'active' : ''} im-nav-${id}`}
                aria-current={tab === id && !browser ? 'page' : undefined}
                onClick={() => switchTab(id)}
              >
                <Glyph size={16} className="im-nav-icon" />
                <span className="im-nav-text">{title}</span>
              </button>
            ))}
          </nav>

          {/* Sidebar Footer: Advanced */}
          <div className="im-sidebar-footer">
            <button
              className={`im-nav im-nav-settings ${tab === 'settings' && !browser ? 'active' : ''}`}
              aria-current={tab === 'settings' && !browser ? 'page' : undefined}
              onClick={() => switchTab('settings')}
            >
              <Settings2 size={16} className="im-nav-icon" />
              <span className="im-nav-text">Advanced</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="im-main">
          {browser ? (
            <div className="im-browser">
              <BrowseView
                key={browser}
                fixedContentType={browser}
                instances={[cluster]}
                selectedCluster={cluster}
                onSelectCluster={() => {}}
                onBack={() => setBrowser(null)}
                hideInstallToast={true}
                onNotify={(title, body) => {
                  if (/installed/i.test(title || '') || /added to/i.test(body || '')) return;
                  showNotice(title, body);
                }}
              />
            </div>
          ) : (
            <>
              {/* Tactical Glass Toolbar */}
              <div className="im-toolbar">
                <label className="im-search">
                  <Search size={14} className="im-search-icon" />
                  <input
                    aria-label="Search instance content"
                    placeholder={searchPlaceholder}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  {query && (
                    <button
                      type="button"
                      className="browse-search-clear"
                      onClick={() => setQuery('')}
                      aria-label="Clear search"
                    >
                      <X size={13} />
                    </button>
                  )}
                </label>

                <div className="im-toolbar-actions">
                  {browseType && (
                    <button
                      className="im-toolbar-btn im-browse"
                      title="Browse compatible content"
                      aria-label="Browse compatible content"
                      onClick={() => setBrowser(browseType)}
                    >
                      <Globe2 size={16} />
                    </button>
                  )}
                  <button
                    className={`im-toolbar-btn ${filtered ? 'is-active' : ''}`}
                    title={tab === 'settings' ? 'Show enabled overrides only' : tab === 'mods' ? 'Show enabled mods only' : 'Sort alphabetically'}
                    aria-label={tab === 'settings' ? 'Show enabled overrides only' : tab === 'mods' ? 'Show enabled mods only' : 'Sort alphabetically'}
                    aria-pressed={filtered}
                    onClick={() => setFiltered(!filtered)}
                  >
                    <SlidersHorizontal size={16} />
                  </button>
                  <button
                    className="im-toolbar-btn"
                    title="Open folder"
                    aria-label="Open folder"
                    onClick={openFolder}
                  >
                    <FolderOpen size={16} />
                  </button>
                </div>
              </div>

              {/* Tab Hosts */}
              {['mods', 'shaders', 'textures', 'worlds'].includes(tab) && (
                <InstanceContentTab
                  key={tab}
                  cluster={cluster}
                  type={tab}
                  query={query}
                  filtered={filtered}
                  onBrowse={() => setBrowser(browseType)}
                />
              )}

              {tab === 'screenshots' && (
                <ScreenshotManager
                  cluster={cluster}
                  query={query}
                  sortAlphabetically={filtered}
                  social={social}
                  account={account}
                  onNotify={showNotice}
                />
              )}
            </>
          )}

          <div className="im-settings-host" hidden={tab !== 'settings' || !!browser}>
            <SettingsTab
              cluster={cluster}
              onUpdateCluster={onUpdateCluster}
              query={query}
              enabledOnly={filtered}
              onDirtyChange={setDirty}
            />
          </div>

          {notice && (
            <div className="im-toast" role="status">
              <div className="im-toast-icon">
                <CheckCircle2 size={16} />
              </div>
              <div className="im-toast-content">
                {notice.title && <strong className="im-toast-title">{notice.title}</strong>}
                <span className="im-toast-body">{notice.body}</span>
              </div>
              <button
                type="button"
                className="im-toast-dismiss"
                aria-label="Dismiss message"
                onClick={() => {
                  if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
                  setNotice(null);
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </main>
      </section>
    </div>,
    document.body
  );
}
