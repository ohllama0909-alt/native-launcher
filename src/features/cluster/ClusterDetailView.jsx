import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, FolderOpen, Globe2, Images, Layers, Package, Search, Settings2, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import Dropdown from '../../components/ui/Dropdown.jsx';
import SettingsTab from './SettingsTab.jsx';
import InstanceContentTab from './InstanceContentTab.jsx';
import ScreenshotManager from './ScreenshotManager.jsx';
import BrowseView from '../browser/BrowseView.jsx';
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

  // Default tab: 'mods' for modded instances, 'worlds' for vanilla (no loader tab!)
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
      const nested = dialog.current?.querySelector('.dep-prompt-backdrop, .content-modal-backdrop, .sm-dialog-backdrop');
      if (event.key === 'Escape' && !nested) {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(nested || dialog.current).querySelectorAll(
        'button, input, select, textarea, [tabindex="0"], a[href]'
      )].filter(el => !el.matches(':disabled') && el.getClientRects().length);
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

  // Main navigation tabs (Loader tab removed per user request)
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

  return createPortal(
    <div
      className="instance-manager-backdrop"
      onMouseDown={event => {
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
          <X size={18}/>
        </button>

        <aside className="im-sidebar">
          <div className="im-version">
            <span className="im-version-label">VERSION</span>
            <div className="im-version-selector">
              <Dropdown
                className="im-version-dropdown"
                value={cluster.id}
                options={(instances.length ? instances : [cluster]).map(item => ({
                  value: item.id,
                  label: `${item.mc_version || item.version}${
                    instances.filter(i => (i.mc_version || i.version) === (item.mc_version || item.version)).length > 1
                      ? ` · ${item.name}`
                      : ''
                  }`
                }))}
                onChange={val => {
                  if (confirmDiscard()) onSelectCluster?.(val);
                }}
              />
            </div>
          </div>

          <nav className="im-nav-list" aria-label="Instance sections">
            {contentTabs.map(([id, title, Glyph]) => (
              <button
                key={id}
                className={`im-nav ${tab === id ? 'active' : ''} im-nav-${id}`}
                aria-current={tab === id ? 'page' : undefined}
                onClick={() => switchTab(id)}
              >
                <Glyph size={16} />
                <span>{title}</span>
              </button>
            ))}
          </nav>

          <div className="im-sidebar-footer">
            <button
              className={`im-nav im-nav-settings ${tab === 'settings' ? 'active' : ''}`}
              aria-current={tab === 'settings' ? 'page' : undefined}
              onClick={() => switchTab('settings')}
            >
              <Settings2 size={16} />
              <span>Advanced</span>
            </button>
          </div>
        </aside>

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
              <div className="im-toolbar">
                <label className="im-search">
                  <Search size={15}/>
                  <input
                    aria-label="Search instance content"
                    placeholder={searchPlaceholder}
                    value={query}
                    onChange={event => setQuery(event.target.value)}
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
                      className="im-browse"
                      title="Browse compatible content"
                      aria-label="Browse compatible content"
                      onClick={() => setBrowser(browseType)}
                    >
                      <Globe2 size={18}/>
                    </button>
                  )}
                  <button
                    title={tab === 'settings' ? 'Show enabled overrides only' : tab === 'mods' ? 'Show enabled mods only' : 'Sort alphabetically'}
                    aria-label={tab === 'settings' ? 'Show enabled overrides only' : tab === 'mods' ? 'Show enabled mods only' : 'Sort alphabetically'}
                    aria-pressed={filtered}
                    onClick={() => setFiltered(!filtered)}
                  >
                    <SlidersHorizontal size={17}/>
                  </button>
                  <button
                    title="Open folder"
                    aria-label="Open folder"
                    onClick={openFolder}
                  >
                    <FolderOpen size={17}/>
                  </button>
                </div>
              </div>

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
                <CheckCircle2 size={16}/>
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
                <X size={14}/>
              </button>
            </div>
          )}
        </main>
      </section>
    </div>,
    document.body
  );
}
