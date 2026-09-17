import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import './BrowseView.css';

const MODRINTH_API = 'https://api.modrinth.com/v2';
const PAGE_SIZE = 20;

function endpoint(path, params) {
  const base = MODRINTH_API + path;
  if (!params) return base;
  const search = new URLSearchParams(params).toString();
  return search ? base + '?' + search : base;
}

async function fetchJson(url) {
  try {
    const response = await fetch(url);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

function primaryFile(version) {
  return (version?.files || []).find((entry) => entry.primary) || version?.files?.[0] || null;
}

/**
 * Every content type Native can install, and where each one lands on disk.
 * `folder` maps to the allow-list in the main process; modpacks go through the
 * dedicated .mrpack installer instead of a plain file download.
 */
const CONTENT_TYPES = [
  { id: 'mod', labelKey: 'browse.mods', projectType: 'mod', folder: 'mods', icon: 'package' },
  { id: 'modpack', labelKey: 'browse.modpacks', projectType: 'modpack', folder: null, icon: 'layers' },
  { id: 'shader', labelKey: 'browse.shaderpacks', projectType: 'shader', folder: 'shaderpacks', icon: 'sparkles' },
  {
    id: 'resourcepack',
    labelKey: 'browse.resourcepacks',
    projectType: 'resourcepack',
    folder: 'resourcepacks',
    icon: 'image'
  },
  { id: 'datapack', labelKey: 'browse.datapacks', projectType: 'datapack', folder: 'datapacks', icon: 'file' }
];

const SORTS = [
  { id: 'relevance', key: 'browse.relevance' },
  { id: 'downloads', key: 'browse.downloads' },
  { id: 'follows', key: 'browse.followers' },
  { id: 'newest', key: 'browse.newest' },
  { id: 'updated', key: 'browse.updated' }
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

function isVanilla(instance) {
  if (!instance) return false;
  const loader = (loaderOf(instance) || '').toLowerCase();
  return !loader || loader === 'vanilla';
}

export default function BrowseView({
  initialIntent,
  fixedContentType = null,
  allowedTypes = null,
  excludeTypes = [],
  pageTitle = null,
  instances = [],
  selectedCluster,
  onSelectCluster,
  onBack,
  onAddInstance,
  onOpenCluster,
  onNotify,
  initialResults = []
}) {
  const { t, formatNumber } = useI18n();

  const availableContentTypes = useMemo(() => {
    let types = CONTENT_TYPES;
    if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
      types = types.filter((entry) => allowedTypes.includes(entry.id));
    }
    if (Array.isArray(excludeTypes) && excludeTypes.length > 0) {
      types = types.filter((entry) => !excludeTypes.includes(entry.id));
    }
    return types.length > 0 ? types : CONTENT_TYPES;
  }, [allowedTypes, excludeTypes]);

  const [contentType, setContentType] = useState(() => {
    if (fixedContentType) return fixedContentType;
    if (Array.isArray(allowedTypes) && allowedTypes.length > 0 && !allowedTypes.includes('mod')) {
      return allowedTypes[0];
    }
    if (Array.isArray(excludeTypes) && excludeTypes.includes('mod')) {
      const fallback = CONTENT_TYPES.find((entry) => !excludeTypes.includes(entry.id));
      return fallback ? fallback.id : 'mod';
    }
    return 'mod';
  });
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [sort, setSort] = useState('relevance');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
  const [page, setPage] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [categoryQuery, setCategoryQuery] = useState('');

  const [categoryTags, setCategoryTags] = useState([]);
  const [results, setResults] = useState(initialResults);
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
  const [depPrompt, setDepPrompt] = useState(null);
  const [resolvingDeps, setResolvingDeps] = useState(false);

  const resultsRef = useRef(null);
  const browseContainerRef = useRef(null);

  useEffect(() => {
    if (fixedContentType) {
      setContentType(fixedContentType);
    } else if (!availableContentTypes.some((entry) => entry.id === contentType)) {
      setContentType(availableContentTypes[0]?.id || 'mod');
    }
  }, [fixedContentType, availableContentTypes, contentType]);

  useEffect(() => {
    if (!initialIntent) return;
    if (availableContentTypes.some((entry) => entry.id === initialIntent.contentType)) {
      setContentType(initialIntent.contentType);
    }
    setQuery(initialIntent.query || '');
    setDebouncedQuery(initialIntent.query || '');
    setDetail(null);
  }, [initialIntent?.nonce, availableContentTypes]);

  const activeType = availableContentTypes.find((entry) => entry.id === contentType) || availableContentTypes[0] || CONTENT_TYPES[0];
  const target = useMemo(() => {
    if (selectedCluster) return selectedCluster;
    if (contentType === 'mod') {
      const modded = instances.find((i) => !isVanilla(i));
      if (modded) return modded;
    }
    return instances[0] || null;
  }, [selectedCluster, instances, contentType]);
  const targetVersion = versionOf(target);
  const targetLoader = loaderOf(target);
  const isTargetVanilla = isVanilla(target);
  const isModOnVanilla = activeType.id === 'mod' && isTargetVanilla;
  const loaderFacet = LOADER_FACETS.has(targetLoader.toLowerCase())
    ? targetLoader.toLowerCase()
    : null;
  const currentSort = SORTS.find((entry) => entry.id === sort) || SORTS[0];

  /* ---------------------------------------------------------- debounce */

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, contentType, selectedCategories, sort]);

  useEffect(() => {
    setSelectedCategories([]);
    setCategoryQuery('');
    setSortOpen(false);
  }, [contentType]);

  useEffect(() => {
    if (!sortOpen) return undefined;
    const onPointerDown = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSortOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [sortOpen]);

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

  const visibleCategories = useMemo(() => {
    const term = categoryQuery.trim().toLowerCase();
    if (!term) return categories;
    return categories.filter((name) => name.replace(/-/g, ' ').toLowerCase().includes(term));
  }, [categories, categoryQuery]);

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
    if (activeType.id !== 'modpack' && targetVersion) {
      facets.push([`versions:${targetVersion}`]);
    }
    // Only mods are tagged by mod loader. Shaders use iris/optifine/canvas and
    // resourcepacks are not tagged at all, so applying it there returns zero.
    if (activeType.id === 'mod' && loaderFacet) {
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
        setError(t('browse.connectionError'));
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
    targetVersion,
    loaderFacet,
    t
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
        const title = t('browse.modpackInstalled');
        const body = t('browse.readyToPlay', { name: project.title });
        onNotify?.(title, body);
      }
    } catch (err) {
      onNotify?.(t('browse.installFailed'), err?.message || t('browse.couldNotInstall', { name: project.title }));
    } finally {
      markBusy(id, false);
      setPackProgress(null);
    }
  };

  const versionMatchesTarget = useCallback((version) => {
    if (!version) return false;
    const gameVersions = Array.isArray(version.game_versions) ? version.game_versions : [];
    const loaders = Array.isArray(version.loaders) ? version.loaders : [];
    if (targetVersion && !gameVersions.includes(targetVersion)) return false;
    if (activeType.id === 'mod' && loaderFacet && !loaders.includes(loaderFacet)) return false;
    return true;
  }, [activeType.id, targetVersion, loaderFacet]);

  /* Never substitute a newer, incompatible build for the selected instance. */
  const pickVersion = useCallback(async (projectId) => {
    const params = {};
    if (targetVersion) params.game_versions = JSON.stringify([targetVersion]);
    if (loaderFacet) params.loaders = JSON.stringify([loaderFacet]);

    const list = await fetchJson(endpoint('/project/' + projectId + '/version', params));
    return Array.isArray(list) ? list.find(versionMatchesTarget) || null : null;
  }, [targetVersion, loaderFacet, versionMatchesTarget]);

  /* Walk the dependency graph: required deps recursively, optional one level. */
  const resolveDependencies = useCallback(async (rootVersion) => {
    const required = [];
    const optional = [];
    const seen = new Set([rootVersion.project_id]);
    const queue = (rootVersion.dependencies || []).slice();
    let guard = 0;

    while (queue.length > 0 && guard < 40) {
      guard += 1;
      const entry = queue.shift();
      const kind = entry?.dependency_type;
      if (kind !== 'required' && kind !== 'optional') continue;
      if (entry.project_id && seen.has(entry.project_id)) continue;

      let version = entry.version_id
        ? await fetchJson(endpoint('/version/' + entry.version_id))
        : null;
      if (version && !versionMatchesTarget(version)) version = null;
      if (!version && entry.project_id) version = await pickVersion(entry.project_id);
      if (!version?.project_id) {
        if (kind === 'required') {
          throw new Error(`A required dependency has no build for ${targetVersion} ${targetLoader}.`);
        }
        continue;
      }
      if (seen.has(version.project_id)) continue;
      seen.add(version.project_id);

      const file = primaryFile(version);
      if (!file?.url) continue;
      const project = await fetchJson(endpoint('/project/' + version.project_id));

      const item = {
        projectId: version.project_id,
        title: project?.title || version.name || version.project_id,
        versionNumber: version.version_number,
        gameVersions: version.game_versions,
        loaders: version.loaders,
        file,
        kind
      };

      if (kind === 'required') {
        required.push(item);
        (version.dependencies || []).forEach((child) => queue.push(child));
      } else {
        optional.push(item);
      }
    }

    return { required, optional };
  }, [pickVersion, targetLoader, targetVersion, versionMatchesTarget]);

  const installBundle = async (project, mainVersion, extras) => {
    const id = project.project_id;
    markBusy(id, true);

    try {
      for (const extra of extras) {
        if (installedKeys.has(extra.projectId)) continue;
        await window.native.mods.install({
          instanceId: target.id,
          projectId: extra.projectId,
          url: extra.file.url,
          filename: extra.file.filename,
          folder: 'mods',
          metadata: {
            title: extra.title,
            description: '',
            iconUrl: '',
            author: '',
            source: 'modrinth',
            version: extra.versionNumber,
            gameVersions: extra.gameVersions,
            loaders: extra.loaders
          }
        });
      }

      const file = primaryFile(mainVersion);
      if (!file?.url) throw new Error(t('browse.noFile'));

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
          version: mainVersion.version_number,
          gameVersions: mainVersion.game_versions,
          loaders: mainVersion.loaders
        }
      });

      await refreshInstalled();
      const notifTitle = t('browse.installed');
      const notifBody = extras.length > 0
        ? `${project.title} and ${extras.length} ${extras.length === 1 ? 'dependency' : 'dependencies'} added to ${target.name}`
        : t('browse.addedTo', { name: project.title, instance: target.name });
      onNotify?.(notifTitle, notifBody);
    } catch (err) {
      onNotify?.(t('browse.installFailed'), err?.message || t('browse.couldNotInstall', { name: project.title }));
    } finally {
      markBusy(id, false);
    }
  };

  const installContent = async (project) => {
    if (!target?.id) {
      onNotify?.(t('browse.noInstanceSelected'), t('browse.createBeforeInstall'));
      return;
    }

    if (activeType.id === 'mod' && isTargetVanilla) {
      onNotify?.(
        'Cannot Install Mod',
        `Mods cannot be installed on Vanilla instances (${target?.name || 'Vanilla'}). Please select or create a Fabric, Forge, NeoForge, or Quilt instance.`
      );
      return;
    }

    const id = project.project_id;
    markBusy(id, true);
    setResolvingDeps(true);

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

      versions = Array.isArray(versions) ? versions.filter(versionMatchesTarget) : [];
      if (versions.length === 0) {
        const label = [targetVersion, activeType.id === 'mod' ? targetLoader : null]
          .filter(Boolean)
          .join(' ');
        throw new Error(`${project.title} has no compatible build for ${label || t('browse.thisInstance')}.`);
      }

      const version = versions[0];
      if (!primaryFile(version)?.url) throw new Error(t('browse.noFile'));

      const { required, optional } = activeType.id === 'mod'
        ? await resolveDependencies(version)
        : { required: [], optional: [] };

      const missingRequired = required.filter((item) => !installedKeys.has(item.projectId));
      const offeredOptional = optional.filter((item) => !installedKeys.has(item.projectId));

      if (missingRequired.length > 0 || offeredOptional.length > 0) {
        markBusy(id, false);
        setResolvingDeps(false);
        setDepPrompt({
          project,
          version,
          required: missingRequired,
          optional: offeredOptional,
          selected: {}
        });
        return;
      }

      markBusy(id, false);
      setResolvingDeps(false);
      await installBundle(project, version, []);
      return;
    } catch (err) {
      onNotify?.(t('browse.installFailed'), err?.message || t('browse.couldNotInstall', { name: project.title }));
    } finally {
      markBusy(id, false);
      setResolvingDeps(false);
    }
  };

  const toggleOptionalDep = (projectId) => {
    setDepPrompt((previous) => (previous
      ? { ...previous, selected: { ...previous.selected, [projectId]: !previous.selected[projectId] } }
      : previous));
  };

  const confirmDepPrompt = async () => {
    const prompt = depPrompt;
    if (!prompt) return;
    setDepPrompt(null);
    const extras = [
      ...prompt.required,
      ...prompt.optional.filter((item) => prompt.selected[item.projectId])
    ];
    await installBundle(prompt.project, prompt.version, extras);
  };

  const handleInstall = (project) => {
    if (activeType.id === 'mod' && isTargetVanilla) {
      onNotify?.(
        'Cannot Install Mod',
        `Mods cannot be installed on Vanilla instances (${target?.name || 'Vanilla'}). Please select or create a Fabric, Forge, NeoForge, or Quilt instance.`
      );
      return;
    }
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
      onNotify?.(t('browse.couldNotRemove'), err?.message || t('browse.removeFailed'));
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

  useEffect(() => {
    if (!depPrompt) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setDepPrompt(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [depPrompt]);

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
    browseContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    resultsRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };


  if (detail) {
    const project = detailData || detail;
    const body = project.body || project.description || detail.description || '';
    const safeBody = DOMPurify.sanitize(marked.parse(body));
    const installed = installedKeys.has(detail.project_id);
    const busy = busyIds.has(detail.project_id);

    return (
      <div className="content-detail-page">
        <header className="content-detail-nav">
          <button type="button" onClick={() => setDetail(null)}><NativeIcon name="arrow-left" size={15} /> Back to results</button>
          <span>{t(activeType.labelKey)}</span>
        </header>

        <div className="content-detail-scroll">
          <section className="content-detail-hero">
            <span className="content-detail-icon">
              {detail.icon_url ? <img src={detail.icon_url} alt="" /> : <NativeIcon name={activeType.icon} size={30} />}
            </span>
            <div className="content-detail-heading">
              <div className="content-detail-badges"><span>{activeType.projectType}</span>{project.status && <span>{project.status}</span>}</div>
              <h1>{project.title || detail.title}</h1>
              <p>{project.description || detail.description}</p>
              <div className="content-detail-byline">by <strong>{project.author || detail.author || t('browse.unknown')}</strong></div>
            </div>
            <div className="content-detail-primary-actions">
              <button type="button" className="content-modal-link" onClick={() => window.native?.openExternal?.(`https://modrinth.com/project/${detail.slug || detail.project_id}`)}><NativeIcon name="external-link" size={14} /> Modrinth</button>
              {installed && activeType.id !== 'modpack' ? (
                <button type="button" className="content-remove-btn" onClick={() => handleRemove(detail)} disabled={busy}>{t('common.remove')}</button>
              ) : (
                <button
                  type="button"
                  className={`content-install-btn content-detail-install ${isModOnVanilla ? 'is-disabled-vanilla' : ''}`}
                  onClick={() => handleInstall(detail)}
                  disabled={busy || (activeType.id !== 'modpack' && !target) || isModOnVanilla}
                  title={isModOnVanilla ? 'Mods cannot be installed on Vanilla instances' : undefined}
                >
                  {busy ? <NativeIcon name="refresh" size={14} className="is-spinning" /> : <NativeIcon name="download" size={14} />}
                  <span>
                    {isModOnVanilla
                      ? 'Vanilla (No Mods)'
                      : activeType.id === 'modpack'
                      ? t('browse.installPack')
                      : t('common.install')}
                  </span>
                </button>
              )}
            </div>
          </section>

          {isModOnVanilla && (
            <div className="browse-vanilla-warning" role="alert">
              <NativeIcon name="alert-triangle" size={16} />
              <span>
                <strong>{target?.name || 'Vanilla'}</strong> is a Vanilla instance. Minecraft Vanilla does not support mods. Switch to a Fabric, Forge, NeoForge, or Quilt instance to install mods.
              </span>
            </div>
          )}

          <div className="content-detail-layout">
            <main className="content-detail-main">
              {(project.gallery || []).length > 0 && (
                <div className="content-detail-gallery">{project.gallery.slice(0, 5).map((image) => <img key={image.url} src={image.url} alt={image.title || ''} loading="lazy" />)}</div>
              )}
              <article className="content-detail-description" dangerouslySetInnerHTML={{ __html: safeBody }} />
            </main>

            <aside className="content-detail-sidebar">
              <div className="content-detail-stat-grid">
                <div><NativeIcon name="download" size={15} /><span>Downloads</span><strong>{formatDownloads(project.downloads || detail.downloads)}</strong></div>
                <div><NativeIcon name="star" size={15} /><span>Followers</span><strong>{formatDownloads(project.followers || detail.follows)}</strong></div>
              </div>
              <section><h3>Information</h3><dl><div><dt>Licence</dt><dd>{project.license?.id || detail.license || t('browse.unknown')}</dd></div><div><dt>Updated</dt><dd>{project.updated ? new Date(project.updated).toLocaleDateString() : '—'}</dd></div><div><dt>Client</dt><dd>{project.client_side || '—'}</dd></div><div><dt>Server</dt><dd>{project.server_side || '—'}</dd></div></dl></section>
              <section><h3>Recent versions</h3><div className="content-detail-versions">{detailVersions.length ? detailVersions.map((version) => <div key={version.id}><strong>{version.version_number}</strong><span>{(version.game_versions || []).slice(-3).join(', ')}</span><small>{(version.loaders || []).join(' · ')}</small></div>) : <p>{t('browse.loadingVersions')}</p>}</div></section>
            </aside>
          </div>
        </div>

        <DependencyPrompt
          prompt={depPrompt}
          targetName={target?.name}
          onToggle={toggleOptionalDep}
          onCancel={() => setDepPrompt(null)}
          onConfirm={confirmDepPrompt}
        />
      </div>
    );
  }

  return (
    <div className="browse-view" ref={browseContainerRef}>
      <header className="browse-header">
        <div className="browse-title-group">
          {onBack && (
            <button type="button" className="browse-back-link" onClick={onBack}>
              <NativeIcon name="arrow-left" size={14} />
              <span>{fixedContentType ? 'Back to installed content' : 'Back to install page'}</span>
            </button>
          )}
          <h1 className="browse-title">{pageTitle || t('nav.browse')}</h1>
          <p className="browse-subtitle">{fixedContentType === 'modpack' ? 'Discover complete, ready-to-play Minecraft experiences.' : t('browse.subtitle')}</p>
        </div>

        {!fixedContentType && (
          <div className="browse-instance-picker">
            <span className="browse-picker-label">{t('browse.installingTo')}</span>
            <div className="browse-picker-wrap">
              <button
                type="button"
                className="browse-picker-btn"
                onClick={() => setInstancePickerOpen((value) => !value)}
                disabled={instances.length === 0}
              >
                <NativeIcon name="cube" size={15} />
                <span>{target ? target.name : t('browse.noInstances')}</span>
                <NativeIcon name="chevron-down" size={13} />
              </button>

              {instancePickerOpen && instances.length > 0 && (
                <div className="browse-picker-popup">
                  {instances.map((instance) => {
                    const instVanilla = isVanilla(instance);
                    return (
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
                          {`${versionOf(instance)} ${loaderOf(instance)}${activeType.id === 'mod' && instVanilla ? ' · No mods' : ''}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {!fixedContentType && availableContentTypes.length > 1 && (
        <nav className="browse-type-tabs">
          {availableContentTypes.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`browse-type-tab ${contentType === type.id ? 'active' : ''}`}
              onClick={() => setContentType(type.id)}
            >
              <span>{t(type.labelKey)}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="browse-controls-row">
        <label className="browse-search">
          <NativeIcon name="search" size={16} />
          <input
            type="text"
            value={query}
            placeholder={t('browse.searchType', { type: t(activeType.labelKey).toLocaleLowerCase() })}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button type="button" className="browse-search-clear" onClick={() => setQuery('')}>
              <NativeIcon name="close" size={14} />
            </button>
          )}
        </label>

        <div className={`browse-sort-select ${sortOpen ? 'is-open' : ''}`} ref={sortRef}>
          <button
            type="button"
            className="browse-sort-btn"
            onClick={() => setSortOpen((open) => !open)}
            aria-haspopup="listbox"
            aria-expanded={sortOpen}
          >
            <NativeIcon name="sort" size={15} />
            <span className="browse-sort-label">Sort by</span>
            <span className="browse-sort-value">{t(currentSort.key)}</span>
            <NativeIcon name="chevron-down" size={13} className={`browse-sort-chevron ${sortOpen ? 'open' : ''}`} />
          </button>

          {sortOpen && (
            <div className="browse-sort-popover" role="listbox" aria-label="Sort options">
              {SORTS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  role="option"
                  aria-selected={sort === entry.id}
                  className={`browse-sort-popover-item ${sort === entry.id ? 'active' : ''}`}
                  onClick={() => {
                    setSort(entry.id);
                    setSortOpen(false);
                  }}
                >
                  <span>{t(entry.key)}</span>
                  {sort === entry.id && <NativeIcon name="check" size={13} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedCategories.length > 0 && (
        <div className="browse-active-filters" aria-label="Active filters">
          <span className="browse-active-filters-label">Active filters</span>
          {selectedCategories.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => setSelectedCategories((current) => current.filter((entry) => entry !== name))}
              title={`Remove ${name.replace(/-/g, ' ')} filter`}
            >
              <span>{name.replace(/-/g, ' ')}</span>
              <NativeIcon name="close" size={11} />
            </button>
          ))}
          <button type="button" className="browse-clear-all" onClick={() => setSelectedCategories([])}>
            Clear all
          </button>
        </div>
      )}

      {isModOnVanilla && (
        <div className="browse-vanilla-warning" role="alert">
          <NativeIcon name="alert-triangle" size={16} />
          <span>
            <strong>{target?.name || 'Vanilla'}</strong> is a Vanilla instance. Minecraft Vanilla does not support mods. Switch to a Fabric, Forge, NeoForge, or Quilt instance to install mods.
          </span>
        </div>
      )}

      <div className="browse-body-row">
        <aside className="browse-categories">
          <div className="browse-filter-heading">
            <div>
              <h2 className="browse-categories-heading">Filters</h2>
              <p>{t('browse.categories')}</p>
            </div>
            {selectedCategories.length > 0 && <b>{selectedCategories.length}</b>}
          </div>

          {categories.length > 6 && (
            <label className="browse-category-search">
              <NativeIcon name="search" size={14} />
              <input
                value={categoryQuery}
                onChange={(event) => setCategoryQuery(event.target.value)}
                placeholder="Find a category"
              />
              {categoryQuery && (
                <button type="button" onClick={() => setCategoryQuery('')} aria-label="Clear category search">
                  <NativeIcon name="close" size={12} />
                </button>
              )}
            </label>
          )}

          {categories.length === 0 ? (
            <p className="browse-categories-empty">{t('browse.noCategories')}</p>
          ) : visibleCategories.length === 0 ? (
            <p className="browse-categories-empty">No matching categories</p>
          ) : (
            <div className="browse-categories-list">
              {visibleCategories.map((name) => {
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
                    <span className="browse-category-check">
                      {active && <NativeIcon name="check" size={11} />}
                    </span>
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
              <NativeIcon name="refresh" size={12} />
              {t('browse.clearFilters')}
            </button>
          )}
        </aside>

        <div className="browse-results" ref={resultsRef}>
          <div className="browse-results-meta">
            {loading ? (
              <span className="browse-loading-text">
                <NativeIcon name="refresh" size={13} className="is-spinning" />
                {t('browse.searching')}
              </span>
            ) : (
              <span>{t('browse.resultCount', { count: formatNumber(totalHits) })}</span>
            )}
            {resolvingDeps && <span className="browse-dep-checking">Checking dependencies…</span>}
          </div>

          {packProgress && (
            <div className="browse-pack-progress">
              <div className="browse-pack-bar">
                <span style={{ width: `${Math.min(100, Number(packProgress.percent) || 0)}%` }} />
              </div>
              <span className="browse-pack-detail">
                {packProgress.detail || t('browse.installingModpack')}
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
                {t('browse.nothingFound')}
              </p>
            </div>
          )}

          <div className="browse-cards-grid">
            {loading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <article className="content-card content-card-skeleton" key={`skeleton-${idx}`}>
                  <div className="content-card-main">
                    <span className="content-card-icon skeleton-box skeleton-icon" />
                    <span className="content-card-text">
                      <span className="content-card-title-row">
                        <span className="skeleton-box skeleton-title" />
                      </span>
                      <span className="skeleton-box skeleton-line" />
                      <span className="skeleton-box skeleton-line short" />
                      <span className="content-card-stats">
                        <span className="skeleton-box skeleton-pill" />
                        <span className="skeleton-box skeleton-pill" />
                      </span>
                    </span>
                  </div>
                  <div className="content-card-actions">
                    <span className="skeleton-box skeleton-btn" />
                  </div>
                </article>
              ))
            ) : (
              results.map((project) => {
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
                              {t('browse.installed')}
                            </span>
                          )}
                        </span>
                        <span className="content-card-desc">{project.description}</span>
                        <span className="content-card-stats">
                          <span>
                            <NativeIcon name="download" size={11} />
                            {formatNumber(project.downloads, { notation: 'compact', maximumFractionDigits: 1 })}
                          </span>
                          <span>
                            <NativeIcon name="star" size={11} />
                            {formatNumber(project.follows, { notation: 'compact', maximumFractionDigits: 1 })}
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
                          {isBusy ? '…' : t('common.remove')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`content-install-btn ${isModOnVanilla ? 'is-disabled-vanilla' : ''}`}
                          onClick={() => handleInstall(project)}
                          disabled={isBusy || (activeType.id !== 'modpack' && !target) || isModOnVanilla}
                          title={isModOnVanilla ? 'Mods cannot be installed on Vanilla instances' : undefined}
                        >
                          {isBusy ? (
                            <NativeIcon name="refresh" size={14} className="is-spinning" />
                          ) : (
                            <NativeIcon name="download" size={14} />
                          )}
                          <span>
                            {isModOnVanilla
                              ? 'Vanilla (No Mods)'
                              : activeType.id === 'modpack'
                              ? t('browse.installPack')
                              : t('common.install')}
                          </span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
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
                title={t('common.close')}
              >
                <NativeIcon name="close" size={16} />
              </button>
            </header>

            <div className="content-modal-body">
              <div className="content-modal-stats">
                <div>
                  <span>{t('browse.downloads')}</span>
                  <strong>{formatNumber(detail.downloads, { notation: 'compact', maximumFractionDigits: 1 })}</strong>
                </div>
                <div>
                  <span>{t('browse.followers')}</span>
                  <strong>{formatNumber(detail.follows, { notation: 'compact', maximumFractionDigits: 1 })}</strong>
                </div>
                <div>
                  <span>{t('browse.licence')}</span>
                  <strong>{detailData?.license?.id || detail.license || t('browse.unknown')}</strong>
                </div>
                <div>
                  <span>{t('browse.author')}</span>
                  <strong>{detail.author || t('browse.unknown')}</strong>
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
                <h3>{t('nav.versions')}</h3>
                {detailVersions.length === 0 ? (
                  <p className="content-modal-muted">{t('browse.loadingVersions')}</p>
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
                <span>{t('browse.viewOnModrinth')}</span>
              </button>

              <button
                type="button"
                className={`content-install-btn ${isModOnVanilla ? 'is-disabled-vanilla' : ''}`}
                onClick={() => {
                  handleInstall(detail);
                  setDetail(null);
                }}
                disabled={(activeType.id !== 'modpack' && !target) || isModOnVanilla}
                title={isModOnVanilla ? 'Mods cannot be installed on Vanilla instances' : undefined}
              >
                <NativeIcon name="download" size={14} />
                <span>
                  {isModOnVanilla
                    ? 'Vanilla (No Mods)'
                    : activeType.id === 'modpack'
                    ? t('browse.installPack')
                    : t('common.install')}
                </span>
              </button>
            </footer>
          </div>
        </div>
      )}
      <DependencyPrompt
        prompt={depPrompt}
        targetName={target?.name}
        onToggle={toggleOptionalDep}
        onCancel={() => setDepPrompt(null)}
        onConfirm={confirmDepPrompt}
      />
    </div>
  );
}

/** Plain confirmation sheet listing the extra files an install will pull in. */
function DependencyPrompt({ prompt, targetName, onToggle, onCancel, onConfirm }) {
  if (!prompt) return null;

  const chosenOptional = prompt.optional.filter((item) => prompt.selected[item.projectId]);
  const total = 1 + prompt.required.length + chosenOptional.length;

  return (
    <div className="dep-prompt-backdrop" onClick={onCancel} data-testid="dep-prompt-backdrop">
      <div className="dep-prompt" onClick={(event) => event.stopPropagation()} data-testid="dep-prompt">
        <h2 className="dep-prompt-title">Install {prompt.project.title}</h2>
        <p className="dep-prompt-text">
          {prompt.required.length > 0
            ? `This mod needs other files to run. They will be added to ${targetName || 'this instance'}.`
            : `Optional add-ons are available for this mod. Pick any you want in ${targetName || 'this instance'}.`}
        </p>

        {prompt.required.length > 0 && (
          <section className="dep-prompt-section">
            <h3 className="dep-prompt-heading">Required · {prompt.required.length}</h3>
            <ul className="dep-prompt-list">
              {prompt.required.map((item) => (
                <li className="dep-prompt-row" key={item.projectId}>
                  <span className="dep-prompt-name">{item.title}</span>
                  <span className="dep-prompt-version">{item.versionNumber}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {prompt.optional.length > 0 && (
          <section className="dep-prompt-section">
            <h3 className="dep-prompt-heading">Optional · {prompt.optional.length}</h3>
            <ul className="dep-prompt-list">
              {prompt.optional.map((item) => (
                <li className="dep-prompt-row" key={item.projectId}>
                  <label className="dep-prompt-check">
                    <input
                      type="checkbox"
                      data-testid={`dep-optional-${item.projectId}`}
                      checked={Boolean(prompt.selected[item.projectId])}
                      onChange={() => onToggle(item.projectId)}
                    />
                    <span className="dep-prompt-name">{item.title}</span>
                  </label>
                  <span className="dep-prompt-version">{item.versionNumber}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="dep-prompt-actions">
          <button type="button" className="dep-prompt-cancel" onClick={onCancel} data-testid="dep-prompt-cancel">
            Cancel
          </button>
          <button type="button" className="dep-prompt-confirm" onClick={onConfirm} data-testid="dep-prompt-confirm">
            Install {total} {total === 1 ? 'file' : 'files'}
          </button>
        </footer>
      </div>
    </div>
  );
}
