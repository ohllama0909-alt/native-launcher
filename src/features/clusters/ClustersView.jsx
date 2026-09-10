import React, { useEffect, useMemo, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import Dropdown from '../../components/ui/Dropdown.jsx';
import { ART_ASSETS, RELEASE_LINES } from '../../data/versionsData.js';
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

const SNAPSHOT_LINE = 'snapshots';

function lineMeta(lineId) {
  return RELEASE_LINES.find((line) => '1.' + line.major === lineId) || null;
}

function describeLine(lineId, count) {
  const known = lineMeta(lineId);
  if (known?.description) return known.description;
  if (lineId === SNAPSHOT_LINE) {
    return 'Development builds straight from Mojang. Great for testing what is coming next, but expect things to break.';
  }
  return (
    'Every Minecraft ' +
    lineId +
    ' release, pulled live from the official version manifest. ' +
    count +
    ' builds available to install.'
  );
}

function tagsForLine(lineId) {
  const known = lineMeta(lineId);
  if (known?.tags?.length) return known.tags;
  return lineId === SNAPSHOT_LINE ? ['Snapshot', 'Experimental'] : ['Release'];
}

/** Image that fades in once decoded and quietly falls back to bundled art. */
function Art({ src, className = '' }) {
  const [state, setState] = useState({ url: src, ready: false });

  useEffect(() => {
    setState({ url: src, ready: false });
  }, [src]);

  return (
    <img
      className={className + (state.ready ? ' is-ready' : '')}
      src={state.url}
      alt=""
      draggable={false}
      loading="lazy"
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
  onNotify
}) {
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

      return {
        ...bucket,
        name: bucket.id === SNAPSHOT_LINE ? 'Snapshots' : 'Minecraft ' + bucket.id,
        art: banner?.image || known?.art || ART_ASSETS.default,
        tags: tagsForLine(bucket.id),
        description: banner?.shortText || describeLine(bucket.id, bucket.versions.length)
      };
    });
  }, [manifest, includeSnapshots, banners]);

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

  const installedByLine = useMemo(() => {
    const map = new Map();
    instances.forEach((instance) => {
      const key = isReleaseId(instance.version) ? versionLine(instance.version) : SNAPSHOT_LINE;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [instances]);

  const matchingInstance = useMemo(
    () =>
      instances.find(
        (instance) =>
          instance.version === selectedVersion && (instance.loader || 'Vanilla') === loader
      ) || null,
    [instances, selectedVersion, loader]
  );

  const selectedMeta = activeLine?.versions.find((version) => version.id === selectedVersion);
  const availability = loaderAvailability(loader, selectedVersion, fabricSet);
  const loaderReady = availability?.available !== false;

  // Banner for the exact selected version, then the line, then bundled art.
  const versionBanner = bannerFor(
    banners,
    selectedVersion,
    activeLine?.versions.map((version) => version.id) || []
  );
  const sidebarArt = versionBanner?.image || activeLine?.art || ART_ASSETS.default;

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
          hint: check?.available === false ? 'unavailable' : ''
        };
      }),
    [selectedVersion, fabricSet]
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
    if (matchingInstance) {
      onSelectCluster?.(matchingInstance.id);
      onLaunch?.(matchingInstance);
      return;
    }
    if (!selectedVersion || !onCreateInstance) return;

    setBusy(true);
    try {
      const created = await onCreateInstance(buildPayload(), { open: false });
      if (created?.id) onSelectCluster?.(created.id);
      onNotify?.('Instance created', selectedVersion + ' ' + loader + ' is ready to play.');
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
          <h1 className="clusters-title">Versions</h1>
          <p className="clusters-subtitle">
            {loading
              ? 'Loading the Minecraft version manifest...'
              : manifest?.offline
                ? 'Showing the last cached manifest. Reconnect to refresh.'
                : 'Pick a release line, choose a build and a mod loader.'}
          </p>
        </div>

        <div className="clusters-header-actions">
          <button
            type="button"
            className={'clusters-chip ' + (includeSnapshots ? 'active' : '')}
            onClick={() => setIncludeSnapshots((value) => !value)}
          >
            <NativeIcon name="sparkles" size={14} />
            <span>Snapshots</span>
          </button>

          <button type="button" className="sub-btn brand-btn" onClick={onOpenNewInstanceModal}>
            <NativeIcon name="plus" size={15} />
            <span>New instance</span>
          </button>
        </div>
      </header>

      {loading && !lines.length ? (
        <div className="clusters-loading">
          <NativeIcon name="refresh" size={22} className="is-spinning" />
          <span>Fetching versions from Mojang</span>
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
                      <span>{installed} installed</span>
                    </span>
                  )}

                  <span className="cluster-group-info">
                    <span className="cluster-group-name">{line.name}</span>
                    <span className="cluster-group-meta">
                      {line.versions.length} {line.versions.length === 1 ? 'build' : 'builds'}
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
                      {formatReleaseDate(selectedMeta.releaseTime)}
                    </span>
                  )}
                </div>

                <p className="sidebar-desc">
                  {versionBanner?.shortText || activeLine.description}
                </p>

                <div className="sidebar-selector-row">
                  <label className="sidebar-selector-label">Version</label>
                  <Dropdown
                    value={selectedVersion}
                    options={versionOptions}
                    onChange={setSelectedVersion}
                    placeholder="Select a version"
                  />
                </div>

                <div className="sidebar-selector-row">
                  <label className="sidebar-selector-label">Mod loader</label>
                  <Dropdown value={loader} options={loaderOptions} onChange={setLoader} />
                </div>

                {!loaderReady && (
                  <p className="sidebar-note warn">
                    <NativeIcon name="alert" size={13} />
                    <span>
                      {availability?.reason ||
                        loader + ' has no build for ' + selectedVersion + ' yet.'}
                    </span>
                  </p>
                )}

                {matchingInstance && (
                  <p className="sidebar-note">
                    <NativeIcon name="check-circle" size={13} />
                    <span>Already installed as {matchingInstance.name}</span>
                  </p>
                )}

                <div className="sidebar-actions-row">
                  <button
                    type="button"
                    className="sidebar-play-btn"
                    onClick={handlePrimary}
                    disabled={busy || !selectedVersion || !loaderReady}
                  >
                    <NativeIcon name={matchingInstance ? 'play' : 'plus'} size={15} />
                    <span>{matchingInstance ? 'Play' : 'Create instance'}</span>
                  </button>

                  <button
                    type="button"
                    className="sidebar-view-btn"
                    onClick={handleOpen}
                    disabled={busy || !selectedVersion || !loaderReady}
                    title={matchingInstance ? 'Open instance' : 'Create and open'}
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
