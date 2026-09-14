import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, ChevronDown, FolderOpen, Globe2, Layers, Package, Search, Settings2, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import SettingsTab from './SettingsTab.jsx';
import LogsTab from './LogsTab.jsx';
import InstanceContentTab from './InstanceContentTab.jsx';
import BrowseView from '../browser/BrowseView.jsx';
import LaunchActionButton from '../launcher/LaunchActionButton.jsx';
import useIsInstalled from '../instances/useIsInstalled.js';
import './ClusterDetailView.css';
import './InstanceManager.css';

export default function ClusterDetailView({ cluster, instances = [], onSelectCluster, onBack, onLaunch, onKill, launcherState, onUpdateCluster, initialTab = 'overview' }) {
  const loader = cluster.mc_loader || cluster.loader || 'Vanilla';
  const vanilla = loader.toLowerCase() === 'vanilla';
  const [tab, setTab] = useState(initialTab === 'overview' ? (vanilla ? 'loader' : 'mods') : vanilla && ['mods', 'shaders'].includes(initialTab) ? 'loader' : initialTab);
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState(false);
  const [browser, setBrowser] = useState(null);
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const dialog = useRef(null);
  const closeRef = useRef(null);
  const isInstalled = useIsInstalled(cluster, launcherState?.status);
  const confirmDiscard = () => !dirty || window.confirm('Discard unsaved instance settings?');
  closeRef.current = () => { if (browser) setBrowser(null); else if (confirmDiscard()) onBack(); };

  useEffect(() => {
    const previous = document.activeElement;
    const root = document.getElementById('root');
    const wasInert = root?.inert;
    if (root) root.inert = true;
    dialog.current?.focus();
    const handleKey = (event) => {
      const nested = dialog.current.querySelector('.dep-prompt-backdrop, .content-modal-backdrop');
      if (event.key === 'Escape' && !nested) { event.preventDefault(); event.stopPropagation(); closeRef.current(); }
      if (event.key !== 'Tab') return;
      const focusable = [...(nested || dialog.current).querySelectorAll('button, input, select, textarea, [tabindex="0"], a[href]')].filter(el => !el.matches(':disabled') && el.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKey, true);
    return () => { document.removeEventListener('keydown', handleKey, true); if (root) root.inert = wasInert; if (previous?.isConnected) previous.focus(); };
  }, []);

  const tabs = [['loader', 'Loader', Layers], ...(!vanilla ? [['mods', 'Mods', Package], ['shaders', 'Shaders', Sparkles]] : []), ['worlds', 'Worlds', Globe2], ['textures', 'Resources', Package], ['settings', 'Advanced', Settings2]];
  const folder = { mods: 'mods', shaders: 'shaderpacks', textures: 'resourcepacks', worlds: 'saves', logs: 'logs', screenshots: 'screenshots' }[tab] || '';
  const browseType = { mods: 'mod', shaders: 'shader', textures: 'resourcepack' }[tab];
  const openFolder = async () => {
    try { await window.native.instance.openFolder(cluster.id, folder); }
    catch (error) { setNotice(error.message); }
  };
  const switchTab = (id) => { setTab(id); setQuery(''); setFiltered(false); setBrowser(null); setNotice(''); };
  return createPortal(
    <div className="instance-manager-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) closeRef.current(); }}>
      <section className={`instance-manager ${browser ? 'is-browsing' : ''}`} role="dialog" aria-modal="true" aria-label={`Manage ${cluster.name || cluster.version}`} tabIndex={-1} ref={dialog}>
        <button className="im-close" aria-label="Close instance settings" onClick={() => closeRef.current()}><X size={16}/></button>
        <aside className="im-sidebar">
          <label className="im-version"><span>VERSION</span><div><select aria-label="Select instance" value={cluster.id} onChange={event => { if (confirmDiscard()) onSelectCluster?.(event.target.value); }}>{(instances.length ? instances : [cluster]).map(item => <option key={item.id} value={item.id}>{item.mc_version || item.version}{instances.filter(i => (i.mc_version || i.version) === (item.mc_version || item.version)).length > 1 ? ` · ${item.name}` : ''}</option>)}</select><ChevronDown size={11}/></div></label>
          <nav aria-label="Instance sections">{tabs.map(([id, title, Glyph]) => <button key={id} className={`im-nav ${tab === id ? 'active' : ''} im-nav-${id}`} aria-current={tab === id ? 'page' : undefined} onClick={() => switchTab(id)}><Glyph size={12}/>{title}</button>)}</nav>
        </aside>
        <main className="im-main">
          {browser ? <div className="im-browser"><button className="im-browser-back" onClick={() => setBrowser(null)}><ArrowLeft size={14}/> Back to installed content</button><BrowseView key={browser} fixedContentType={browser} instances={[cluster]} selectedCluster={cluster} onSelectCluster={() => {}} onBack={() => setBrowser(null)} onNotify={(title, body) => setNotice(`${title}: ${body}`)} /></div> : <>
            <div className="im-toolbar"><label className="im-search"><Search size={17}/><input aria-label="Search instance content" placeholder={tab === 'settings' ? 'Search settings…' : tab === 'loader' ? 'Find loader information…' : `Find ${tab === 'worlds' ? 'a world' : tab === 'mods' ? 'a mod' : 'a pack'}…`} value={query} onChange={event => setQuery(event.target.value)}/></label><div className="im-toolbar-actions">{browseType && <button className="im-browse" title="Browse compatible content" aria-label="Browse compatible content" onClick={() => setBrowser(browseType)}><Globe2 size={19}/></button>}{tab !== 'loader' && <button title={tab === 'settings' ? 'Show enabled overrides only' : tab === 'mods' ? 'Show enabled mods only' : 'Sort alphabetically'} aria-label={tab === 'settings' ? 'Show enabled overrides only' : tab === 'mods' ? 'Show enabled mods only' : 'Sort alphabetically'} aria-pressed={filtered} onClick={() => setFiltered(!filtered)}><SlidersHorizontal size={18}/></button>}<button title="Open folder" aria-label="Open folder" onClick={openFolder}><FolderOpen size={18}/></button></div></div>
            {tab === 'loader' && <div className="im-panel im-loader"><header className="im-section-heading"><Layers size={24}/><div><h2>Mod loader</h2><p>The runtime used by this instance.</p></div></header>{`${loader} ${cluster.name} ${cluster.version}`.toLowerCase().includes(query.toLowerCase()) ? <><h3>{loader} · {cluster.mc_version || cluster.version}</h3><p>{cluster.name}</p><p>{vanilla ? 'Vanilla Minecraft does not load mods. Create a separate modded instance to use Fabric, Forge, NeoForge or Quilt.' : 'Only install mods made for this Minecraft version and loader. Loader files are installed automatically when you launch.'}</p><LaunchActionButton instance={cluster} launcherState={launcherState} isInstalled={isInstalled} onLaunch={onLaunch} onKill={onKill}/></> : <p>No matching loader information.</p>}</div>}
            {['loader', 'logs', 'screenshots'].includes(tab) && <div className="im-utilities"><button onClick={() => switchTab('loader')}>Loader</button><button onClick={() => switchTab('logs')}>Logs</button><button onClick={() => switchTab('screenshots')}>Screenshots</button></div>}
            {tab === 'logs' && <div className="im-legacy-pane"><LogsTab cluster={cluster}/></div>}
            {['mods', 'shaders', 'textures', 'worlds', 'screenshots'].includes(tab) && <InstanceContentTab key={tab} cluster={cluster} type={tab} query={query} filtered={filtered} onBrowse={() => setBrowser(browseType)} />}
          </>}
          <div className="im-settings-host" hidden={tab !== 'settings' || !!browser}><SettingsTab cluster={cluster} onUpdateCluster={onUpdateCluster} query={query} enabledOnly={filtered} onDirtyChange={setDirty}/></div>
          {notice && <div className="im-notice" role="status">{notice}<button aria-label="Dismiss message" onClick={() => setNotice('')}><X size={12}/></button></div>}
        </main>
      </section>
    </div>, document.body
  );
}
