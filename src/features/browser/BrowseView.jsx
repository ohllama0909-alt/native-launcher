import React, { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import FabricApiIcon from '../../assets/mod-icons/fabric-api.png';
import SodiumIcon from '../../assets/mod-icons/sodium.png';
import IrisIcon from '../../assets/mod-icons/iris.png';
import ClothConfigIcon from '../../assets/mod-icons/cloth-config.webp';
import EntityCullingIcon from '../../assets/mod-icons/entityculling.webp';
import FerriteCoreIcon from '../../assets/mod-icons/ferrite-core.webp';
import './BrowseView.css';

const CATEGORIES = [
  'Adventure', 'Cursed', 'Decoration', 'Economy', 'Equipment',
  'Food', 'Game-mechanics', 'Library', 'Magic', 'Management',
  'Minigame', 'Mobs', 'Optimization', 'Social', 'Storage',
  'Technology', 'Transportation'
];

// Curated default mods matching launcher3.webp exactly
const CURATED_MODS = [
  {
    id: 'fabric-api',
    project_id: 'fabric-api',
    title: 'Fabric API',
    author: 'modmuss50',
    summary: 'Lightweight and modular API providing common hooks and intercompatibility',
    downloads: 218600000,
    icon_url: FabricApiIcon,
    bundled: true,
    categories: ['Library']
  },
  {
    id: 'sodium',
    project_id: 'sodium',
    title: 'Sodium',
    author: 'jellysquid3',
    summary: 'A high-performance rendering engine replacement for Minecraft, which greatly improves frame rates',
    downloads: 195700000,
    icon_url: SodiumIcon,
    bundled: true,
    categories: ['Optimization']
  },
  {
    id: 'iris',
    project_id: 'iris',
    title: 'Iris Shaders',
    author: 'coderbot',
    summary: 'A modern shader pack loader for Minecraft intended to be compatible with existing OptiFine shaders',
    downloads: 152600000,
    icon_url: IrisIcon,
    bundled: true,
    categories: ['Optimization']
  },
  {
    id: 'cloth-config',
    project_id: 'cloth-config',
    title: 'Cloth Config API',
    author: 'shedaniel',
    summary: 'Configuration Library for Minecraft Mods with a clean GUI interface',
    downloads: 142000000,
    icon_url: ClothConfigIcon,
    bundled: false,
    categories: ['Library']
  },
  {
    id: 'entityculling',
    project_id: 'entityculling',
    title: 'Entity Culling',
    author: 'tr7zw',
    summary: 'Using async path-tracing to hide Block-/Entities that are not visible to boost framerates',
    downloads: 89400000,
    icon_url: EntityCullingIcon,
    bundled: false,
    categories: ['Optimization']
  },
  {
    id: 'ferrite-core',
    project_id: 'ferrite-core',
    title: 'FerriteCore',
    author: 'malte0811',
    summary: 'Memory usage optimizations for Minecraft reduce RAM usage by up to 50%',
    downloads: 78200000,
    icon_url: FerriteCoreIcon,
    bundled: false,
    categories: ['Optimization']
  },
  {
    id: 'indium',
    project_id: 'indium',
    title: 'Indium',
    author: 'comp500',
    summary: 'Sodium addon providing support for the Fabric Rendering API',
    downloads: 65100000,
    icon_url: 'https://cdn.modrinth.com/data/Orvt0mRa/icon.png',
    bundled: false,
    categories: ['Optimization']
  },
  {
    id: 'lithium',
    project_id: 'lithium',
    title: 'Lithium',
    author: 'jellysquid3',
    summary: 'General-purpose optimization mod for Minecraft physics, mob AI, and world ticking',
    downloads: 98000000,
    icon_url: 'https://cdn.modrinth.com/data/gvQqBUqZ/icon.png',
    bundled: false,
    categories: ['Optimization']
  },
  {
    id: 'modmenu',
    project_id: 'modmenu',
    title: 'Mod Menu',
    author: 'TerraformersMC',
    summary: 'Adds a screen for viewing a list of installed mods with configs',
    downloads: 160000000,
    icon_url: 'https://cdn.modrinth.com/data/mOgUt4GM/icon.png',
    bundled: true,
    categories: ['Library']
  }
];

function formatDownloads(count) {
  if (!count) return '0';
  if (count >= 1000000000) return `${(count / 1000000000).toFixed(1)}B`;
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

export default function BrowseView({
  instances = [],
  selectedCluster,
  onSelectCluster,
  onBack
}) {
  const [provider, setProvider] = useState('modrinth'); // 'modrinth' | 'curseforge'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState(CURATED_MODS);
  const [loading, setLoading] = useState(false);
  const [installedMap, setInstalledMap] = useState({});
  const [installingId, setInstallingId] = useState(null);
  const [activeModalMod, setActiveModalMod] = useState(null);
  const [clusterDropdownOpen, setClusterDropdownOpen] = useState(false);

  const currentCluster = selectedCluster || instances[0] || null;

  // Fetch installed mods for current cluster
  useEffect(() => {
    if (window.native?.mods?.installed && currentCluster?.id) {
      window.native.mods.installed(currentCluster.id).then((map) => {
        setInstalledMap(map || {});
      });
    }
  }, [currentCluster?.id]);

  // Search Modrinth API when query or category changes
  useEffect(() => {
    if (!searchQuery && !selectedCategory && provider === 'modrinth') {
      setItems(CURATED_MODS);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const facets = [['project_type:mod']];
        if (selectedCategory) {
          facets.push([`categories:${selectedCategory.toLowerCase()}`]);
        }
        if (currentCluster?.mc_version) {
          facets.push([`versions:${currentCluster.mc_version}`]);
        }
        if (currentCluster?.mc_loader) {
          facets.push([`categories:${currentCluster.mc_loader.toLowerCase()}`]);
        }

        const url = new URL('https://api.modrinth.com/v2/search');
        if (searchQuery) url.searchParams.set('query', searchQuery);
        url.searchParams.set('limit', '24');
        url.searchParams.set('offset', String((page - 1) * 24));
        url.searchParams.set('facets', JSON.stringify(facets));

        const res = await fetch(url.toString());
        if (!res.ok) throw new Error('API error');
        const data = await res.json();

        if (!cancelled) {
          const hits = (data.hits || []).map((hit) => ({
            id: hit.project_id || hit.slug,
            project_id: hit.project_id || hit.slug,
            title: hit.title,
            author: hit.author,
            summary: hit.description,
            downloads: hit.downloads,
            icon_url: hit.icon_url,
            categories: hit.categories || []
          }));
          setItems(hits.length ? hits : CURATED_MODS);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          // Fallback to local filter
          let filtered = CURATED_MODS;
          if (searchQuery) {
            filtered = filtered.filter((m) =>
              m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              m.summary.toLowerCase().includes(searchQuery.toLowerCase())
            );
          }
          if (selectedCategory) {
            filtered = filtered.filter((m) =>
              m.categories.some((c) => c.toLowerCase() === selectedCategory.toLowerCase())
            );
          }
          setItems(filtered);
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, selectedCategory, provider, currentCluster?.mc_version, currentCluster?.mc_loader, page]);

  const handleInstall = async (mod, e) => {
    e.stopPropagation();
    if (!currentCluster?.id || !window.native?.mods?.install) return;

    setInstallingId(mod.id);
    try {
      // Find download URL via Modrinth
      const versionsRes = await fetch(`https://api.modrinth.com/v2/project/${mod.project_id || mod.id}/version`);
      const versions = await versionsRes.json();
      if (Array.isArray(versions) && versions.length > 0) {
        const file = versions[0].files?.[0];
        if (file?.url) {
          const updated = await window.native.mods.install({
            instanceId: currentCluster.id,
            projectId: mod.id,
            url: file.url,
            filename: file.filename,
            folder: 'mods',
            metadata: {
              title: mod.title,
              description: mod.summary,
              iconUrl: mod.icon_url,
              author: mod.author,
              source: 'modrinth',
              version: versions[0].version_number
            }
          });
          setInstalledMap(updated || {});
        }
      }
    } catch (err) {
      console.error('Install failed:', err);
    } finally {
      setInstallingId(null);
    }
  };

  return (
    <div className="browse-view">
      {/* Top Header matching launcher3.webp */}
      <div className="browse-header">
        <div className="browse-title-group">
          <button className="cluster-back-link" onClick={onBack}>
            <Icon name="arrow-left" size={14} />
            <span>Back to Versions</span>
          </button>
          <h1 className="browse-title">Browse Mods</h1>
          <div className="browse-cluster-picker">
            <span>for</span>
            <div style={{ position: 'relative' }}>
              <button
                className="cluster-dropdown-btn"
                onClick={() => setClusterDropdownOpen(!clusterDropdownOpen)}
              >
                <span>
                  {currentCluster
                    ? `${currentCluster.mc_version || currentCluster.version} ${currentCluster.mc_loader || currentCluster.loader} · ${currentCluster.name}`
                    : 'Select a version'}
                </span>
                <Icon name="chevron-down" size={14} />
              </button>

              {clusterDropdownOpen && (
                <div className="context-menu-popup" style={{ top: '100%', left: 0, marginTop: 4 }}>
                  {instances.map((inst) => (
                    <button
                      key={inst.id}
                      className="context-menu-item"
                      onClick={() => {
                        onSelectCluster(inst.id);
                        setClusterDropdownOpen(false);
                      }}
                    >
                      {inst.mc_version || inst.version} {inst.mc_loader || inst.loader} · {inst.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls Row */}
        <div className="browse-controls-row">
          {/* Grid / List Mode */}
          <div className="browse-view-toggle">
            <button
              className={`view-mode-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Icon name="dots-grid" size={15} />
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <Icon name="layout-top" size={15} />
            </button>
          </div>

          {/* Provider Pills: Modrinth & CurseForge */}
          <div className="source-toggle-group">
            <button
              className={`source-btn ${provider === 'modrinth' ? 'active' : ''}`}
              onClick={() => setProvider('modrinth')}
            >
              <Icon name="modrinth" size={16} />
              <span>Modrinth</span>
            </button>

            <button
              className={`source-btn ${provider === 'curseforge' ? 'active' : ''}`}
              onClick={() => setProvider('curseforge')}
            >
              <Icon name="curseforge" size={16} />
              <span>CurseForge</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="browse-search-input-wrap">
            <Icon name="search-md" size={14} />
            <input
              type="text"
              placeholder="Search for content"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="browse-body-row">
        {/* Left: Categories Sidebar */}
        <aside className="categories-sidebar">
          <span className="categories-heading">CATEGORIES</span>
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                className={`category-nav-btn ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedCategory(isSelected ? null : cat)}
              >
                <span>{cat}</span>
              </button>
            );
          })}
        </aside>

        {/* Right: Mod Cards Grid / List */}
        <main className="browse-results-area">
          <div className="browse-cards-grid">
            {items.map((item) => {
              const isInstalled = Boolean(installedMap[item.id] || installedMap[item.project_id]);
              const isBundled = item.bundled || false;
              const isInstalling = installingId === item.id;

              return (
                <div
                  key={item.id}
                  className="mod-card"
                  onClick={() => setActiveModalMod(item)}
                >
                  {/* Banner with blurred background and centered icon */}
                  <div className="mod-card-banner">
                    {item.icon_url && (
                      <img
                        src={item.icon_url}
                        alt=""
                        className="mod-card-blur-bg"
                        aria-hidden="true"
                      />
                    )}
                    {item.icon_url ? (
                      <img
                        src={item.icon_url}
                        alt={item.title}
                        className="mod-card-icon-centered"
                      />
                    ) : (
                      <div className="mod-card-icon-centered" style={{ background: '#1a2228', display: 'grid', placeItems: 'center' }}>
                        <Icon name="code-snippet-02" size={28} />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="mod-card-body">
                    <div className="mod-card-text">
                      <h3 className="mod-card-title">{item.title}</h3>
                      <div className="mod-card-author-row">
                        <span>by {item.author || 'Author'}</span>
                        <Icon name={provider === 'curseforge' ? 'curseforge' : 'modrinth'} size={12} />
                      </div>
                      <p className="mod-card-summary">{item.summary}</p>
                    </div>

                    <div className="mod-card-footer">
                      <span className="mod-downloads-count">
                        <Icon name="download-01" size={12} />
                        {formatDownloads(item.downloads)}
                      </span>

                      {isBundled ? (
                        <span className="badge-bundled">
                          <Icon name="check-circle" size={11} />
                          Bundled
                        </span>
                      ) : isInstalled ? (
                        <span className="badge-installed">
                          <Icon name="check-circle" size={11} />
                          Installed
                        </span>
                      ) : (
                        <button
                          className="mod-card-action-btn"
                          onClick={(e) => handleInstall(item, e)}
                          disabled={isInstalling}
                        >
                          <Icon name="download-01" size={11} />
                          <span>{isInstalling ? 'Installing...' : 'Get'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <div className="browse-pagination-bar">
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage(1)}>
              «
            </button>
            <button className="page-btn" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              ‹
            </button>
            <button className={`page-btn ${page === 1 ? 'active' : ''}`} onClick={() => setPage(1)}>
              1
            </button>
            <button className={`page-btn ${page === 2 ? 'active' : ''}`} onClick={() => setPage(2)}>
              2
            </button>
            <button className={`page-btn ${page === 3 ? 'active' : ''}`} onClick={() => setPage(3)}>
              3
            </button>
            <span className="page-dots">...</span>
            <button className="page-btn" onClick={() => setPage(340)}>
              340
            </button>
            <button className="page-btn" onClick={() => setPage((p) => p + 1)}>
              ›
            </button>
            <button className="page-btn" onClick={() => setPage(340)}>
              »
            </button>
          </div>
        </main>
      </div>

      {/* Mod Details Modal */}
      {activeModalMod && (
        <div className="mod-modal-backdrop" onClick={() => setActiveModalMod(null)}>
          <div className="mod-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="mod-modal-header">
              <div className="mod-modal-header-left">
                {activeModalMod.icon_url && (
                  <img src={activeModalMod.icon_url} alt="" className="mod-modal-icon" />
                )}
                <div className="mod-modal-title-group">
                  <h2>{activeModalMod.title}</h2>
                  <p>by {activeModalMod.author} · {formatDownloads(activeModalMod.downloads)} downloads</p>
                </div>
              </div>
              <button className="icon-ctrl-btn" onClick={() => setActiveModalMod(null)}>
                <Icon name="x" size={16} />
              </button>
            </div>

            <div className="mod-modal-body">
              <div className="mod-modal-desc">
                {activeModalMod.summary}
              </div>

              <span className="mod-modal-versions-heading">TARGET VERSION</span>
              <div className="mod-versions-table">
                <div className="mod-version-row">
                  <span className="mod-version-name">
                    {currentCluster?.mc_version || '26.2'} ({currentCluster?.mc_loader || 'Fabric'})
                  </span>
                  <button
                    className="sub-btn brand-btn"
                    onClick={(e) => handleInstall(activeModalMod, e)}
                  >
                    <Icon name="download-01" size={13} />
                    <span>Install to {currentCluster?.name || 'Cluster'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
