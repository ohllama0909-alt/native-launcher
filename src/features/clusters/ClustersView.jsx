import React, { useEffect, useMemo, useRef, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import { ART_ASSETS, RELEASE_LINES, getClusterArt } from '../../data/versionsData.js';
import { bannerFor, getVersionBanners } from '../../lib/patchNotes.js';
import {
  LOADERS,
  formatReleaseDate,
  getFabricGameVersions,
  getVersionManifest,
  isReleaseId,
  loaderAvailability,
  versionLine
} from '../../lib/mojang.js';
import './ClustersView.css';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { formatLaunchProgress } from '../launcher/useLauncher.js';

const SNAPSHOT_LINE = 'snapshots';

function lineMeta(lineId) {
  if (!lineId) return null;
  return (
    RELEASE_LINES.find(
      (line) =>
        line.id === lineId ||
        String(line.major) === lineId ||
        '1.' + line.major === lineId
    ) || null
  );
}

function describeLine(lineId, count, t) {
  if (lineId === SNAPSHOT_LINE) {
    return t('versions.snapshotDescription');
  }
  const meta = lineMeta(lineId);
  if (meta?.description) return meta.description;
  return t('versions.lineDescription', { version: lineId, count });
}

function tagsForLine(lineId, t) {
  const known = lineMeta(lineId);
  if (known?.tags?.length) return known.tags;
  return lineId === SNAPSHOT_LINE ? [t('versions.snapshot'), t('versions.experimental')] : [t('versions.release')];
}

/** Image that handles pre-cached images gracefully and falls back to bundled art. */
function Art({ src, className = '' }) {
  const [state, setState] = useState({ url: src, ready: false });
  const imgRef = useRef(null);

  useEffect(() => {
    setState({ url: src, ready: false });
    if (imgRef.current?.complete && imgRef.current?.naturalWidth > 0) {
      setState({ url: src, ready: true });
    }
  }, [src]);

  const handleRef = (node) => {
    imgRef.current = node;
    if (node?.complete && node?.naturalWidth > 0) {
      setState((prev) => (prev.ready ? prev : { ...prev, ready: true }));
    }
  };

  return (
    <img
      ref={handleRef}
      className={className + (state.ready ? ' is-ready' : '')}
      src={state.url}
      alt=""
      draggable={false}
      loading="eager"
      decoding="async"
      onLoad={() => setState((prev) => ({ ...prev, ready: true }))}
      onError={() =>
        setState((prev) =>
          prev.url === ART_ASSETS.default
            ? { ...prev, ready: true }
            : { url: ART_ASSETS.default, ready: false }
        )
      }
    />
  );
}

export default function ClustersView({
  instances = [],
  onSelectCluster,
  onOpenCluster,
  onLaunch,
  onOpenNewInstanceModal,
  onCreateInstance,
  onNotify,
  launcherState
}) {
  const { locale, t } = useI18n();
  const [manifest, setManifest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fabricSet, setFabricSet] = useState(null);
  const [banners, setBanners] = useState(null);
  const [selectedLine, setSelectedLine] = useState(null);
  const [selectedVersion, setSelectedVersion] = useState('');
  const [loader, setLoader] = useState('Fabric');
  const [includeSnapshots, setIncludeSnapshots] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    getVersionManifest()
      .then((data) => {
        if (!cancelled) setManifest(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    getFabricGameVersions()
      .then((set) => {
        if (!cancelled) setFabricSet(set);
      })
      .catch(() => {});

    // Official Mojang artwork, one image per real version.
    getVersionBanners()
      .then((map) => {
        if (!cancelled) setBanners(map);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const lines = useMemo(() => {
    const versions = manifest?.versions || [];
    const buckets = new Map();

    versions.forEach((version) => {
      const release = isReleaseId(version.id);
      if (!release && !includeSnapshots) return;

      const key = release ? versionLine(version.id) : SNAPSHOT_LINE;
      if (!key) return;

      if (!buckets.has(key)) buckets.set(key, { id: key, versions: [], newest: version.releaseTime });
      const bucket = buckets.get(key);
      bucket.versions.push(version);
      if (version.releaseTime > bucket.newest) bucket.newest = version.releaseTime;
    });

    const list = Array.from(buckets.values());
    list.sort((a, b) => {
      if (a.id === SNAPSHOT_LINE) return -1;
      if (b.id === SNAPSHOT_LINE) return 1;
      return String(b.newest).localeCompare(String(a.newest));
    });

    return list.map((bucket) => {
      const ids = bucket.versions.map((version) => version.id);
      const banner = bannerFor(banners, ids[0], ids);
      const known = lineMeta(bucket.id);
      const highResArt =
        known?.art ||
        getClusterArt({ version: bucket.id, mc_version: ids[0] });

      let displayName;
      if (bucket.id === SNAPSHOT_LINE) {
        displayName = t('versions.snapshots');
      } else if (known?.name) {
        displayName =
          known.id === bucket.id && !known.name.includes(bucket.id)
            ? `${known.name} (${bucket.id})`
            : known.name;
      } else {
        displayName = 'Minecraft ' + bucket.id;
      }

      return {
        ...bucket,
        name: displayName,
        // Always prioritize crisp, high-resolution widescreen artwork over 540x540 square thumbnails!
        art: highResArt || banner?.image || ART_ASSETS.default,
        artKey: known?.artKey || null,
        tags: tagsForLine(bucket.id, t),
        description: known?.description || banner?.shortText || describeLine(bucket.id, bucket.versions.length, t)
      };
    });
  }, [manifest, includeSnapshots, banners, t]);

  useEffect(() => {
    if (!lines.length) return;
    if (!lines.some((line) => line.id === selectedLine)) setSelectedLine(lines[0].id);
  }, [lines, selectedLine]);

  const activeLine = lines.find((line) => line.id === selectedLine) || null;

  useEffect(() => {
    if (!activeLine) return;
    if (!activeLine.versions.some((version) => version.id === selectedVersion)) {
      setSelectedVersion(activeLine.versions[0]?.id || '');
    }
  }, [activeLine, selectedVersion]);

  const [isInstalledOnDisk, setIsInstalledOnDisk] = useState(false);
  const [installedDiskVersions, setInstalledDiskVersions] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!selectedVersion) {
        setIsInstalledOnDisk(false);
        return;
      }
      try {
        const [installed, list] = await Promise.all([
          window.native?.instance?.isInstalled?.(selectedVersion, loader),
          window.native?.instance?.installedVersions?.()
        ]);
        if (!cancelled) {
          setIsInstalledOnDisk(Boolean(installed));
          if (Array.isArray(list)) setInstalledDiskVersions(list);
        }
      } catch {
        if (!cancelled) setIsInstalledOnDisk(false);
      }
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [selectedVersion, loader, launcherState?.status]);

  const installedByLine = useMemo(() => {
    const map = new Map();
    const verifiedKeys = new Set(
      installedDiskVersions.map((item) => `${item.version}:${item.loader || 'Vanilla'}`)
    );
    instances.forEach((instance) => {
      const v = instance.version || instance.mc_version;
      const l = instance.loader || instance.mc_loader || 'Vanilla';
      if (verifiedKeys.has(`${v}:${l}`)) {
        const key = isReleaseId(v) ? versionLine(v) : SNAPSHOT_LINE;
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return map;
  }, [instances, installedDiskVersions]);

  const matchingInstance = useMemo(
    () =>
      instances.find(
        (instance) =>
          instance.version === selectedVersion && (instance.loader || 'Vanilla') === loader
      ) || null,
    [instances, selectedVersion, loader]
  );

  const isBusyThisVersion =
    Boolean(launcherState?.busy) &&
    (launcherState?.instanceId === matchingInstance?.id ||
      launcherState?.instance?.version === selectedVersion);

  const selectedMeta = activeLine?.versions.find((version) => version.id === selectedVersion);
  const availability = loaderAvailability(loader, selectedVersion, fabricSet);
  const loaderReady = availability?.available !== false;

  // Banner for the exact selected version or active line, prioritizing high-res art
  const versionBanner = bannerFor(
    banners,
    selectedVersion,
    activeLine?.versions.map((version) => version.id) || []
  );
  const specificArt = getClusterArt({ version: selectedVersion, mc_version: selectedVersion });
  const sidebarArt = specificArt || activeLine?.art || ART_ASSETS.default;

  const versionOptions = useMemo(
    () =>
      (activeLine?.versions || []).map((version) => ({
        value: version.id,
        label: version.id,
        hint: version.type === 'release' ? '' : version.type
      })),
    [activeLine]
  );

  const loaderOptions = useMemo(
    () =>
      LOADERS.map((option) => {
        const check = loaderAvailability(option, selectedVersion, fabricSet);
        return {
          value: option,
          label: option,
          hint: check?.available === false ? t('versions.unavailable') : ''
        };
      }),
    [selectedVersion, fabricSet, t]
  );

  const buildPayload = () => ({
    name: selectedVersion + ' ' + loader,
    version: selectedVersion,
    loader,
    description: activeLine?.description || '',
    tags: activeLine?.tags || [],
    art: sidebarArt
  });

  const handlePrimary = async () => {
    if (!selectedVersion || !loaderReady) return;

    if (matchingInstance) {
      onSelectCluster?.(matchingInstance.id);
      onLaunch?.(matchingInstance);
      return;
    }
    if (!onCreateInstance) return;

    setBusy(true);
    try {
      const created = await onCreateInstance(buildPayload(), { open: false });
      if (created?.id) {
        onSelectCluster?.(created.id);
        // Immediately start download & verification pipeline!
        onLaunch?.(created);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async () => {
    if (matchingInstance) {
      onSelectCluster?.(matchingInstance.id);
      onOpenCluster?.(matchingInstance);
      return;
    }
    if (!selectedVersion || !onCreateInstance) return;

    setBusy(true);
    try {
      await onCreateInstance(buildPayload(), { open: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="clusters-view">
      <header className="clusters-header">
        <div>
          <h1 className="clusters-title">{t('nav.versions')}</h1>
          <p className="clusters-subtitle">
            {loading
              ? t('versions.loadingManifest')
              : manifest?.offline
                ? t('versions.cachedManifest')
                : t('versions.subtitle')}
          </p>
        </div>

        <div className="clusters-header-actions">
          <button
            type="button"
            className={'clusters-chip ' + (includeSnapshots ? 'active' : '')}
            onClick={() => setIncludeSnapshots((value) => !value)}
          >
            <NativeIcon name="sparkles" size={14} />
            <span>{t('versions.snapshots')}</span>
          </button>

          <button type="button" className="sub-btn brand-btn" onClick={onOpenNewInstanceModal}>
            <NativeIcon name="plus" size={15} />
            <span>{t('instances.new')}</span>
          </button>
        </div>
      </header>

      {loading && !lines.length ? (
        <div className="clusters-loading">
          <NativeIcon name="refresh" size={22} className="is-spinning" />
          <span>{t('versions.fetching')}</span>
        </div>
      ) : (
        <div className="clusters-body-grid">
          <div className="clusters-cards-scroll">
            {lines.map((line) => {
              const installed = installedByLine.get(line.id) || 0;
              return (
                <button
                  key={line.id}
                  type="button"
                  className={'cluster-group-card ' + (line.id === selectedLine ? 'selected' : '')}
                  onClick={() => setSelectedLine(line.id)}
                >
                  <Art src={line.art} className="cluster-group-art" />
                  <span className="cluster-group-grad" />

                  {installed > 0 && (
                    <span className="cluster-group-badge">
                      <NativeIcon name="check" size={11} />
                      <span>{t('versions.installedCount', { count: installed })}</span>
                    </span>
                  )}

                  <span className="cluster-group-info">
                    <span className="cluster-group-name">{line.name}</span>
                    <span className="cluster-group-meta">
                      {t('versions.buildCount', { count: line.versions.length })}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {activeLine && (
            <aside className="cluster-detail-sidebar">
              <div className="sidebar-art-banner">
                <Art src={sidebarArt} className="sidebar-art-img" />
              </div>

              <div className="sidebar-content-col">
                <h2 className="sidebar-heading">{versionBanner?.title || activeLine.name}</h2>

                <div className="sidebar-tags-row">
                  {activeLine.tags.map((tag) => (
                    <span key={tag} className="sidebar-tag-pill">
                      {tag}
                    </span>
                  ))}
                  {selectedMeta?.releaseTime && (
                    <span className="sidebar-tag-pill subtle">
                      {formatReleaseDate(selectedMeta.releaseTime, locale)}
                    </span>
                  )}
                </div>

                <p className="sidebar-desc">
                  {versionBanner?.shortText || activeLine.description}
                </p>

                <div className="sidebar-selector-row">
                  <label className="sidebar-selector-label">{t('versions.version')}</label>
                  <Dropdown
                    value={selectedVersion}
                    options={versionOptions}
                    onChange={setSelectedVersion}
                    placeholder={t('versions.selectVersion')}
                  />
                </div>

                <div className="sidebar-selector-row">
                  <label className="sidebar-selector-label">{t('versions.modLoader')}</label>
                  <Dropdown value={loader} options={loaderOptions} onChange={setLoader} />
                </div>

                {!loaderReady && (
                  <p className="sidebar-note warn">
                    <NativeIcon name="alert" size={13} />
                    <span>
                      {availability?.reasonKey
                        ? t(availability.reasonKey, availability.reasonVars)
                        : t('versions.loaderNoBuildYet', { loader, version: selectedVersion })}
                    </span>
                  </p>
                )}

                {isInstalledOnDisk ? (
                  <p className="sidebar-note success">
                    <NativeIcon name="check-circle" size={13} />
                    <span>
                      {matchingInstance
                        ? t('versions.alreadyInstalled', { name: matchingInstance.name })
                        : `${selectedVersion} is installed`}
                    </span>
                  </p>
                ) : matchingInstance ? (
                  <p className="sidebar-note">
                    <NativeIcon name="info" size={13} />
                    <span>Configured as {matchingInstance.name} (Assets not installed)</span>
                  </p>
                ) : null}

                <div className="sidebar-actions-row">
                  <button
                    type="button"
                    className={`sidebar-play-btn ${!isInstalledOnDisk ? 'install-mode' : ''}`}
                    onClick={handlePrimary}
                    disabled={busy || isBusyThisVersion || !selectedVersion || !loaderReady}
                  >
                    <NativeIcon
                      name={
                        isBusyThisVersion
                          ? 'loader'
                          : isInstalledOnDisk
                            ? 'play'
                            : 'arrow-down'
                      }
                      size={15}
                      className={isBusyThisVersion ? 'spin' : ''}
                    />
                    <span>
                      {isBusyThisVersion
                        ? formatLaunchProgress(launcherState, t)
                        : isInstalledOnDisk
                          ? t('cluster.launch')
                          : matchingInstance
                            ? 'Install & Play'
                            : t('common.install')}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-view-btn"
                    onClick={handleOpen}
                    disabled={busy || isBusyThisVersion || !selectedVersion || !loaderReady}
                    title={matchingInstance ? t('versions.openInstance') : t('versions.createAndOpen')}
                  >
                    <NativeIcon name="arrow-right" size={16} />
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
