import React, { useEffect, useMemo, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { ART_ASSETS, RELEASE_LINES } from '../../data/versionsData.js';
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

const ART_POOL = Object.keys(ART_ASSETS)
  .filter((key) => key !== 'default')
  .map((key) => ART_ASSETS[key]);

const SNAPSHOT_LINE = 'snapshots';

function lineMeta(lineId) {
  const known = RELEASE_LINES.find((line) => '1.' + line.major === lineId);
  return known || null;
}

function artForLine(lineId, index) {
  const known = lineMeta(lineId);
  if (known?.art) return known.art;
  if (!ART_POOL.length) return ART_ASSETS.default;
  return ART_POOL[index % ART_POOL.length] || ART_ASSETS.default;
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

    return () => {
      cancelled = true;
    };
  }, []);

  // Group the manifest into release lines (1.21, 1.20, ...) plus one
  // snapshot bucket, newest first.
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

    return list.map((bucket, index) => ({
      ...bucket,
      name: bucket.id === SNAPSHOT_LINE ? 'Snapshots' : 'Minecraft ' + bucket.id,
      art: artForLine(bucket.id, index),
      tags: tagsForLine(bucket.id),
      description: describeLine(bucket.id, bucket.versions.length)
    }));
  }, [manifest, includeSnapshots]);

  // Keep a valid selection as data arrives or filters change.
  useEffect(() => {
    if (!lines.length) return;
    const exists = lines.some((line) => line.id === selectedLine);
    if (!exists) setSelectedLine(lines[0].id);
  }, [lines, selectedLine]);

  const activeLine = lines.find((line) => line.id === selectedLine) || null;

  useEffect(() => {
    if (!activeLine) return;
    const inLine = activeLine.versions.some((version) => version.id === selectedVersion);
    if (!inLine) setSelectedVersion(activeLine.versions[0]?.id || '');
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
          instance.version === selectedVersion &&
          (instance.loader || 'Vanilla') === loader
      ) || null,
    [instances, selectedVersion, loader]
  );

  const selectedMeta = activeLine?.versions.find((version) => version.id === selectedVersion);
  const availability = loaderAvailability(loader, selectedVersion, fabricSet);
  const loaderReady = availability?.available !== false;

  const buildPayload = () => ({
    name: selectedVersion + ' ' + loader,
    version: selectedVersion,
    loader,
    description: activeLine?.description || '',
    tags: activeLine?.tags || [],
    art: activeLine?.art
  });

  const handlePrimary = async () => {
    if (matchingInstance) {
      onSelectCluster?.(matchingInstance);
      onLaunch?.(matchingInstance);
      return;
    }

    if (!selectedVersion || !onCreateInstance) return;

    setBusy(true);
    try {
      const created = await onCreateInstance(buildPayload(), { open: false });
      if (created) onSelectCluster?.(created);
      onNotify?.({
        title: 'Instance created',
        body: selectedVersion + ' ' + loader + ' is ready to play.'
      });
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async () => {
    if (matchingInstance) {
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
          {/* ---------- left: release line artwork cards ---------- */}
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
                  <img className="cluster-group-art" src={line.art} alt="" draggable={false} />
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

          {/* ---------- right: detail sidebar ---------- */}
          {activeLine && (
            <aside className="cluster-detail-sidebar">
              <div className="sidebar-art-banner">
                <img className="sidebar-art-img" src={activeLine.art} alt="" draggable={false} />
              </div>

              <div className="sidebar-content-col">
                <h2 className="sidebar-heading">{activeLine.name}</h2>

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

                <p className="sidebar-desc">{activeLine.description}</p>

                <div className="sidebar-selector-row">
                  <label className="sidebar-selector-label">Version</label>
                  <select
                    className="sidebar-dropdown"
                    value={selectedVersion}
                    onChange={(event) => setSelectedVersion(event.target.value)}
                  >
                    {activeLine.versions.map((version) => (
                      <option key={version.id} value={version.id}>
                        {version.id}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sidebar-selector-row">
                  <label className="sidebar-selector-label">Mod loader</label>
                  <select
                    className="sidebar-dropdown"
                    value={loader}
                    onChange={(event) => setLoader(event.target.value)}
                  >
                    {LOADERS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                {!loaderReady && (
                  <p className="sidebar-note warn">
                    <NativeIcon name="alert" size={13} />
                    <span>
                      {availability?.reason || loader + ' has no build for ' + selectedVersion + ' yet.'}
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
                  >
                    <NativeIcon name="arrow-right" size={15} />
                    <span>{matchingInstance ? 'Open' : 'Create and open'}</span>
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
