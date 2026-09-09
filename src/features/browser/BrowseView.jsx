import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import './BrowseView.css';

const MODRINTH_API = 'https://api.modrinth.com/v2';
const PAGE_SIZE = 20;

function endpoint(path, params) {
  const base = MODRINTH_API + path;
  if (!params) return base;
  const search = new URLSearchParams(params).toString();
  return search ? base + '?' + search : base;
}

/**
 * Every content type Native can install, and where each one lands on disk.
 * `folder` maps to the allow-list in the main process; modpacks go through the
 * dedicated .mrpack installer instead of a plain file download.
 */
const CONTENT_TYPES = [
  { id: 'mod', label: 'Mods', projectType: 'mod', folder: 'mods', icon: 'package' },
  { id: 'modpack', label: 'Modpacks', projectType: 'modpack', folder: null, icon: 'layers' },
  { id: 'shader', label: 'Shaderpacks', projectType: 'shader', folder: 'shaderpacks', icon: 'sparkles' },
  {
    id: 'resourcepack',
    label: 'Resourcepacks',
    projectType: 'resourcepack',
    folder: 'resourcepacks',
    icon: 'image'
  },
  { id: 'datapack', label: 'Datapacks', projectType: 'datapack', folder: 'datapacks', icon: 'file' }
];

const SORTS = [
  { id: 'relevance', label: 'Relevance' },
  { id: 'downloads', label: 'Downloads' },
  { id: 'follows', label: 'Followers' },
  { id: 'newest', label: 'Newest' },
  { id: 'updated', label: 'Updated' }
];

const LOADER_FACETS = new Set(['fabric', 'forge', 'neoforge', 'quilt']);

function formatDownloads(count) {
  const value = Number(count) || 0;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function versionOf(instance) {
  return instance?.mc_version || instance?.version || '';
}

function loaderOf(instance) {
  return instance?.mc_loader || instance?.loader || 'Vanilla';
}

export default function BrowseView({
  instances = [],
  selectedCluster,
  onSelectCluster,
  onBack,
  onAddInstance,
  onOpenCluster,
  onNotify
}) {
  const [contentType, setContentType] = useState('mod');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState('relevance');
  const [page, setPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [filterToInstance, setFilterToInstance] = useState(true);

  const [categoryTags, setCategoryTags] = useState([]);
  const [results, setResults] = useState([]);
  const [totalHits, setTotalHits] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [installedKeys, setInstalledKeys] = useState(new Set());
  const [busyIds, setBusyIds] = useState(new Set());
  const [packProgress, setPackProgress] = useState(null);

  const [detail, setDetail] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailVersions, setDetailVersions] = useState([]);
  const [instancePickerOpen, setInstancePickerOpen] = useState(false);

  const resultsRef = useRef(null);

  const activeType = CONTENT_TYPES.find((entry) => entry.id === contentType) || CONTENT_TYPES[0];
  const target = selectedCluster || instances[0] || null;
  const targetVersion = versionOf(target);
  const targetLoader = loaderOf(target);
  const loaderFacet = LOADER_FACETS.has(targetLoader.toLowerCase())
    ? targetLoader.toLowerCase()
    : null;

  /* ---------------------------------------------------------- debounce */

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, contentType, selectedCategories, sort, filterToInstance]);

  useEffect(() => {
    setSelectedCategories([]);
  }, [contentType]);

  /* ------------------------------------------------------ category tags */

  useEffect(() => {
    let cancelled = false;
    fetch(endpoint('/tag/category'))
      .then((response) => (response.ok ? response.json() : []))
      .then((tags) => {
        if (!cancelled) setCategoryTags(Array.isArray(tags) ? tags : []);
      })
      .catch(() => {
        if (!cancelled) setCategoryTags([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () =>
      categoryTags
        .filter((tag) => tag.project_type === activeType.projectType)
        .map((tag) => tag.name),
    [categoryTags, activeType]
  );

  /* ---------------------------------------------------------- installed */

  const refreshInstalled = useCallback(async () => {
    if (!target?.id || !window.native?.mods?.installed) {
      setInstalledKeys(new Set());
      return;
    }
    try {
      const manifest = await window.native.mods.installed(target.id);
      setInstalledKeys(new Set(Object.keys(manifest || {})));
    } catch {
      setInstalledKeys(new Set());
    }
  }, [target?.id]);

  useEffect(() => {
    refreshInstalled();
  }, [refreshInstalled]);

  /* --------------------------------------------------- modpack progress */

  useEffect(() => {
    if (!window.native?.modpacks?.onProgress) return undefined;
    const unsubscribe = window.native.modpacks.onProgress((payload) => {
      setPackProgress(payload || null);
      if (payload && Number(payload.percent) >= 100) {
        setTimeout(() => setPackProgress(null), 1200);
      }
    });
    return typeof unsubscribe === 'function' ? unsubscribe : undefined;
  }, []);

  /* ------------------------------------------------------------- search */

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const facets = [[`project_type:${activeType.projectType}`]];
    if (selectedCategories.length) {
      facets.push(selectedCategories.map((name) => `categories:${name}`));
    }
    if (filterToInstance && targetVersion) {
      facets.push([`versions:${targetVersion}`]);
    }
    // Only mods are tagged by mod loader. Shaders use iris/optifine/canvas and
    // resourcepacks are not tagged at all, so applying it there returns zero.
    if (activeType.id === 'mod' && filterToInstance && loaderFacet) {
      facets.push([`categories:${loaderFacet}`]);
    }

    const params = {
      limit: String(PAGE_SIZE),
      offset: String((page - 1) * PAGE_SIZE),
      index: sort,
      facets: JSON.stringify(facets)
    };
    if (debouncedQuery.trim()) params.query = debouncedQuery.trim();

    setLoading(true);
    setError(null);

    fetch(endpoint('/search', params), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Search failed');
        return response.json();
      })
      .then((json) => {
        if (cancelled) return;
        setResults(Array.isArray(json?.hits) ? json.hits : []);
        setTotalHits(Number(json?.total_hits) || 0);
      })
      .catch((err) => {
        if (cancelled || err.name === 'AbortError') return;
        setResults([]);
        setTotalHits(0);
        setError('Could not reach Modrinth. Check your connection and try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [
    activeType,
    debouncedQuery,
    selectedCategories,
    sort,
    page,
    filterToInstance,
    targetVersion,
    loaderFacet
  ]);

  /* ------------------------------------------------------------ install */

  const markBusy = (id, busy) => {
    setBusyIds((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const installModpack = async (project) => {
    const id = project.project_id;
    markBusy(id, true);
    try {
      const created = await window.native.modpacks.install(id);
      if (created) {
        onAddInstance?.(created);
        onNotify?.('Modpack installed', `${project.title} is ready to play.`);
      }
    } catch (err) {
      onNotify?.('Install failed', err?.message || `Could not install ${project.title}.`);
    } finally {
      markBusy(id, false);
      setPackProgress(null);
    }
  };

  const installContent = async (project) => {
    if (!target?.id) {
      onNotify?.('No instance selected', 'Create an instance before installing content.');
      return;
    }

    const id = project.project_id;
    markBusy(id, true);

    try {
      /* Ask for versions that actually match the instance rather than
         blindly taking the newest build. */
      const params = {};
      if (targetVersion) params.game_versions = JSON.stringify([targetVersion]);
      if (activeType.id === 'mod' && loaderFacet) {
        params.loaders = JSON.stringify([loaderFacet]);
      }

      let response = await fetch(endpoint('/project/' + id + '/version', params));
      let versions = response.ok ? await response.json() : [];

      if (!Array.isArray(versions) || versions.length === 0) {
        // Nothing matched exactly, fall back to the full list so the user is
        // told what is available instead of silently installing a bad build.
        response = await fetch(endpoint('/project/' + id + '/version'));
        versions = response.ok ? await response.json() : [];
        if (!Array.isArray(versions) || versions.length === 0) {
          throw new Error('No downloadable versions were published for this project.');
        }
        const label = [targetVersion, activeType.id === 'mod' ? targetLoader : null]
          .filter(Boolean)
          .join(' ');
        onNotify?.(
          'No exact match',
          `${project.title} has no build for ${label || 'this instance'}. Installing the latest release instead.`
        );
      }

      const version = versions[0];
      const file = (version.files || []).find((entry) => entry.primary) || version.files?.[0];
      if (!file?.url) throw new Error('That version has no downloadable file.');

      await window.native.mods.install({
        instanceId: target.id,
        projectId: id,
        url: file.url,
        filename: file.filename,
        folder: activeType.folder || 'mods',
        metadata: {
          title: project.title,
          description: project.description,
          iconUrl: project.icon_url,
          author: project.author,
          source: 'modrinth',
          version: version.version_number
        }
      });

      await refreshInstalled();
      onNotify?.('Installed', `${project.title} was added to ${target.name}.`);
    } catch (err) {
      onNotify?.('Install failed', err?.message || `Could not install ${project.title}.`);
    } finally {
      markBusy(id, false);
    }
  };

  const handleInstall = (project) => {
    if (activeType.id === 'modpack') installModpack(project);
    else installContent(project);
  };

  const handleRemove = async (project) => {
    if (!target?.id) return;
    const id = project.project_id;
    markBusy(id, true);
    try {
      await window.native.mods.remove({ instanceId: target.id, projectId: id });
      await refreshInstalled();
    } catch (err) {
      onNotify?.('Could not remove', err?.message || 'Removing that content failed.');
    } finally {
      markBusy(id, false);
    }
  };

  /* ------------------------------------------------------------- detail */

  const openDetail = async (project) => {
    setDetail(project);
    setDetailData(null);
    setDetailVersions([]);

    try {
      const [projectResponse, versionsResponse] = await Promise.all([
        fetch(endpoint('/project/' + project.project_id)),
        fetch(endpoint('/project/' + project.project_id + '/version'))
      ]);
      if (projectResponse.ok) setDetailData(await projectResponse.json());
      if (versionsResponse.ok) {
        const list = await versionsResponse.json();
        setDetailVersions(Array.isArray(list) ? list.slice(0, 12) : []);
      }
    } catch {
      /* the modal falls back to the search hit data */
    }
  };

  useEffect(() => {
    if (!detail) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDetail(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [detail]);

  const totalPages = Math.max(1, Math.ceil(totalHits / PAGE_SIZE));
  const pageNumbers = useMemo(() => {
    const span = 2;
    const start = Math.max(1, page - span);
    const end = Math.min(totalPages, page + span);
    const list = [];
    for (let index = start; index <= end; index += 1) list.push(index);
    return list;
  }, [page, totalPages]);

  const goToPage = (next) => {
    setPage(Math.min(totalPages, Math.max(1, next)));
    resultsRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="browse-view">
      <header className="browse-header">
        <div className="browse-title-group">
          {onBack && (
            <button type="button" className="browse-back-link" onClick={onBack}>
              <NativeIcon name="arrow-left" size={15} />
              <span>Back</span>
            </button>
          )}
          <h1 className="browse-title">Browse</h1>
          <p className="browse-subtitle">Content from Modrinth, installed straight into an instance.</p>
        </div>

        <div className="browse-instance-picker">
          <span className="browse-picker-label">Installing to</span>
          <div className="browse-picker-wrap">
            <button
              type="button"
              className="browse-picker-btn"
              onClick={() => setInstancePickerOpen((value) => !value)}
              disabled={instances.length === 0}
            >
              <NativeIcon name="cube" size={15} />
              <span>{target ? target.name : 'No instances'}</span>
              <NativeIcon name="chevron-down" size={13} />
            </button>

            {instancePickerOpen && instances.length > 0 && (
              <div className="browse-picker-popup">
                {instances.map((instance) => (
                  <button
                    key={instance.id}
                    type="button"
                    className={`browse-picker-item ${target?.id === instance.id ? 'active' : ''}`}
                    onClick={() => {
                      onSelectCluster?.(instance.id);
                      setInstancePickerOpen(false);
                    }}
                  >
                    <span className="browse-picker-name">{instance.name}</span>
                    <span className="browse-picker-meta">
                      {`${versionOf(instance)} ${loaderOf(instance)}`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <nav className="browse-type-tabs">
        {CONTENT_TYPES.map((type) => (
          <button
            key={type.id}
            type="button"
            className={`browse-type-tab ${contentType === type.id ? 'active' : ''}`}
            onClick={() => setContentType(type.id)}
          >
            <NativeIcon name={type.icon} size={15} />
            <span>{type.label}</span>
          </button>
        ))}
      </nav>

      <div className="browse-controls-row">
        <label className="browse-search">
          <NativeIcon name="search" size={16} />
          <input
            type="text"
            value={query}
            placeholder={`Search ${activeType.label.toLowerCase()}`}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" className="browse-search-clear" onClick={() => setQuery('')}>
              <NativeIcon name="close" size={14} />
            </button>
          )}
        </label>

        <div className="browse-sort-group">
          {SORTS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={`browse-sort-btn ${sort === entry.id ? 'active' : ''}`}
              onClick={() => setSort(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {activeType.id !== 'modpack' && target && (
          <button
            type="button"
            className={`browse-compat-toggle ${filterToInstance ? 'active' : ''}`}
            onClick={() => setFilterToInstance((value) => !value)}
            title="Only show content compatible with the selected instance"
          >
            <NativeIcon name={filterToInstance ? 'check-circle' : 'circle'} size={15} />
            <span>
              {`Compatible with ${targetVersion}${
                activeType.id === 'mod' && loaderFacet ? ' ' + targetLoader : ''
              }`}
            </span>
          </button>
        )}
      </div>

      <div className="browse-body-row">
        <aside className="browse-categories">
          <h2 className="browse-categories-heading">Categories</h2>

          {categories.length === 0 ? (
            <p className="browse-categories-empty">No categories for this type.</p>
          ) : (
            <div className="browse-categories-list">
              {categories.map((name) => {
                const active = selectedCategories.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    className={`browse-category-btn ${active ? 'active' : ''}`}
                    onClick={() =>
                      setSelectedCategories((current) =>
                        current.includes(name)
                          ? current.filter((entry) => entry !== name)
                          : [...current, name]
                      )
                    }
                  >
                    <span className="browse-category-dot" />
                    <span className="browse-category-name">{name.replace(/-/g, ' ')}</span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedCategories.length > 0 && (
            <button
              type="button"
              className="browse-clear-categories"
              onClick={() => setSelectedCategories([])}
            >
              Clear filters
            </button>
          )}
        </aside>

        <div className="browse-results" ref={resultsRef}>
          <div className="browse-results-meta">
            {loading ? (
              <span className="browse-loading-text">
                <NativeIcon name="refresh" size={13} className="is-spinning" />
                Searching...
              </span>
            ) : (
              <span>{`${totalHits.toLocaleString()} results`}</span>
            )}
          </div>

          {packProgress && (
            <div className="browse-pack-progress">
              <div className="browse-pack-bar">
                <span style={{ width: `${Math.min(100, Number(packProgress.percent) || 0)}%` }} />
              </div>
              <span className="browse-pack-detail">
                {packProgress.detail || 'Installing modpack...'}
              </span>
            </div>
          )}

          {error && (
            <div className="browse-error">
              <NativeIcon name="alert" size={18} />
              <p>{error}</p>
            </div>
          )}

          {!error && !loading && results.length === 0 && (
            <div className="browse-error">
              <NativeIcon name="search" size={18} />
              <p>
                Nothing found. Try clearing the category filters or turning off the compatibility
                filter.
              </p>
            </div>
          )}

          <div className="browse-cards-grid">
            {results.map((project) => {
              const id = project.project_id;
              const isInstalled = installedKeys.has(id);
              const isBusy = busyIds.has(id);

              return (
                <article className="content-card" key={id}>
                  <button
                    type="button"
                    className="content-card-main"
                    onClick={() => openDetail(project)}
                  >
                    <span className="content-card-icon">
                      {project.icon_url ? (
                        <img src={project.icon_url} alt="" loading="lazy" />
                      ) : (
                        <NativeIcon name={activeType.icon} size={20} />
                      )}
                    </span>

                    <span className="content-card-text">
                      <span className="content-card-title-row">
                        <span className="content-card-title">{project.title}</span>
                        {isInstalled && (
                          <span className="content-card-badge">
                            <NativeIcon name="check" size={10} />
                            Installed
                          </span>
                        )}
                      </span>
                      <span className="content-card-desc">{project.description}</span>
                      <span className="content-card-stats">
                        <span>
                          <NativeIcon name="download" size={11} />
                          {formatDownloads(project.downloads)}
                        </span>
                        <span>
                          <NativeIcon name="star" size={11} />
                          {formatDownloads(project.follows)}
                        </span>
                        {project.author && <span>{project.author}</span>}
                      </span>
                    </span>
                  </button>

                  <div className="content-card-actions">
                    {isInstalled && activeType.id !== 'modpack' ? (
                      <button
                        type="button"
                        className="content-remove-btn"
                        onClick={() => handleRemove(project)}
                        disabled={isBusy}
                      >
                        {isBusy ? '...' : 'Remove'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="content-install-btn"
                        onClick={() => handleInstall(project)}
                        disabled={isBusy || (activeType.id !== 'modpack' && !target)}
                      >
                        {isBusy ? (
                          <NativeIcon name="refresh" size={14} className="is-spinning" />
                        ) : (
                          <NativeIcon name="download" size={14} />
                        )}
                        <span>{activeType.id === 'modpack' ? 'Install pack' : 'Install'}</span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="browse-pagination">
              <button
                type="button"
                className="browse-page-btn"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
              >
                <NativeIcon name="chevron-left" size={14} />
              </button>

              {pageNumbers[0] > 1 && <span className="browse-page-dots">...</span>}

              {pageNumbers.map((number) => (
                <button
                  key={number}
                  type="button"
                  className={`browse-page-btn ${number === page ? 'active' : ''}`}
                  onClick={() => goToPage(number)}
                >
                  {number}
                </button>
              ))}

              {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <span className="browse-page-dots">...</span>
              )}

              <button
                type="button"
                className="browse-page-btn"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages}
              >
                <NativeIcon name="chevron-right" size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {detail && (
        <div className="content-modal-backdrop" onClick={() => setDetail(null)}>
          <div className="content-modal" onClick={(event) => event.stopPropagation()}>
            <header className="content-modal-header">
              <span className="content-modal-icon">
                {detail.icon_url ? (
                  <img src={detail.icon_url} alt="" />
                ) : (
                  <NativeIcon name={activeType.icon} size={22} />
                )}
              </span>

              <div className="content-modal-heading">
                <h2>{detail.title}</h2>
                <p>{detail.description}</p>
              </div>

              <button
                type="button"
                className="content-modal-close"
                onClick={() => setDetail(null)}
                title="Close"
              >
                <NativeIcon name="close" size={16} />
              </button>
            </header>

            <div className="content-modal-body">
              <div className="content-modal-stats">
                <div>
                  <span>Downloads</span>
                  <strong>{formatDownloads(detail.downloads)}</strong>
                </div>
                <div>
                  <span>Followers</span>
                  <strong>{formatDownloads(detail.follows)}</strong>
                </div>
                <div>
                  <span>Licence</span>
                  <strong>{detailData?.license?.id || detail.license || 'Unknown'}</strong>
                </div>
                <div>
                  <span>Author</span>
                  <strong>{detail.author || 'Unknown'}</strong>
                </div>
              </div>

              {(detailData?.gallery || []).length > 0 && (
                <div className="content-modal-gallery">
                  {detailData.gallery.slice(0, 6).map((image) => (
                    <img key={image.url} src={image.url} alt={image.title || ''} loading="lazy" />
                  ))}
                </div>
              )}

              <section className="content-modal-section">
                <h3>Versions</h3>
                {detailVersions.length === 0 ? (
                  <p className="content-modal-muted">Loading version list...</p>
                ) : (
                  <div className="content-version-table">
                    {detailVersions.map((version) => (
                      <div className="content-version-row" key={version.id}>
                        <span className="content-version-name">{version.version_number}</span>
                        <span className="content-version-tag">{version.version_type}</span>
                        <span className="content-version-games">
                          {(version.game_versions || []).slice(0, 4).join(', ')}
                        </span>
                        <span className="content-version-loaders">
                          {(version.loaders || []).join(', ')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <footer className="content-modal-footer">
              <button
                type="button"
                className="content-modal-link"
                onClick={() =>
                  window.native?.openExternal?.(
                    'https://modrinth.com/project/' + (detail.slug || detail.project_id)
                  )
                }
              >
                <NativeIcon name="external-link" size={14} />
                <span>View on Modrinth</span>
              </button>

              <button
                type="button"
                className="content-install-btn"
                onClick={() => {
                  handleInstall(detail);
                  setDetail(null);
                }}
                disabled={activeType.id !== 'modpack' && !target}
              >
                <NativeIcon name="download" size={14} />
                <span>{activeType.id === 'modpack' ? 'Install pack' : 'Install'}</span>
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
