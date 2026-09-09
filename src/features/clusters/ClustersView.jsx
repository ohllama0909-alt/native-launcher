import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { RELEASE_LINES, getClusterArt, formatDuration } from '../../data/versionsData.js';
import {
  LOADERS,
  VERSION_TYPES,
  compareVersions,
  formatReleaseDate,
  getFabricGameVersions,
  getVersionManifest,
  loaderAvailability,
  versionLine
} from '../../lib/mojang.js';
import './ClustersView.css';

/** Keep the list responsive — the snapshot list alone is over a thousand entries. */
const MAX_ROWS = 300;

function lineFor(versionId) {
  const line = versionLine(versionId);
  const major = line.split('.')[1];
  return RELEASE_LINES.find((entry) => String(entry.major) === String(major)) || null;
}

function artFor(versionId) {
  const line = lineFor(versionId);
  const exact = line?.versions?.find((entry) => entry.version === versionId);
  return (
    exact?.art ||
    line?.art ||
    getClusterArt({ version: versionId, mc_version: versionId, artKey: line?.artKey })
  );
}

function versionOf(instance) {
  return instance?.mc_version || instance?.version || '';
}

function loaderOf(instance) {
  return instance?.mc_loader || instance?.loader || 'Vanilla';
}

function instanceMeta(instance) {
  const parts = [versionOf(instance), loaderOf(instance)].filter(Boolean);
  if (instance?.playtimeSecs) parts.push(formatDuration(instance.playtimeSecs));
  return parts.join('  \u2022  ');
}

export default function ClustersView({
  instances = [],
  selectedCluster,
  onSelectCluster,
  onOpenCluster,
  onLaunch,
  onOpenNewInstanceModal,
  onCreateInstance,
  onNotify
}) {
  const [manifest, setManifest] = useState(null);
  const [loadingManifest, setLoadingManifest] = useState(true);
  const [fabricSet, setFabricSet] = useState(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('release');
  const [installedOnly, setInstalledOnly] = useState(false);

  const [selection, setSelection] = useState(null); // { type: 'instance' | 'version', id }
  const [loader, setLoader] = useState('Fabric');

  const refresh = useCallback(async (force = false) => {
    setLoadingManifest(true);
    try {
      setManifest(await getVersionManifest({ force }));
    } finally {
      setLoadingManifest(false);
    }
  }, []);

  useEffect(() => {
    refresh(false);
    getFabricGameVersions()
      .then((result) => setFabricSet(result))
      .catch(() => setFabricSet(null));
  }, [refresh]);

  /* Default the selection to whatever the rest of the app has selected. */
  useEffect(() => {
    if (selection) return;
    if (selectedCluster?.id) {
      setSelection({ type: 'instance', id: selectedCluster.id });
    } else if (manifest?.latest?.release) {
      setSelection({ type: 'version', id: manifest.latest.release });
    }
  }, [selection, selectedCluster, manifest]);

  /* Keep the loader choice in step with the selection. */
  useEffect(() => {
    if (selection?.type !== 'instance') return;
    const instance = instances.find((item) => item.id === selection.id);
    if (instance) setLoader(loaderOf(instance));
  }, [selection, instances]);

  const installedVersions = useMemo(() => {
    const map = new Map();
    instances.forEach((instance) => {
      const key = versionOf(instance);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [instances]);

  const query = search.trim().toLowerCase();

  const filteredInstances = useMemo(() => {
    if (!query) return instances;
    return instances.filter((instance) =>
      `${instance.name} ${versionOf(instance)} ${loaderOf(instance)}`.toLowerCase().includes(query)
    );
  }, [instances, query]);

  const filteredVersions = useMemo(() => {
    const all = manifest?.versions || [];
    return all
      .filter((entry) => (typeFilter === 'all' ? true : entry.type === typeFilter))
      .filter((entry) => (query ? entry.id.toLowerCase().includes(query) : true))
      .filter((entry) => (installedOnly ? installedVersions.has(entry.id) : true));
  }, [manifest, typeFilter, query, installedOnly, installedVersions]);

  const groupedVersions = useMemo(() => {
    const groups = new Map();
    filteredVersions.slice(0, MAX_ROWS).forEach((entry) => {
      const key = versionLine(entry.id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(entry);
    });
    return Array.from(groups.entries()).sort((a, b) => compareVersions(b[0], a[0]));
  }, [filteredVersions]);

  const selectedInstance =
    selection?.type === 'instance'
      ? instances.find((item) => item.id === selection.id) || null
      : null;

  const selectedVersion =
    selection?.type === 'version'
      ? manifest?.versions.find((entry) => entry.id === selection.id) || {
          id: selection.id,
          type: 'release',
          releaseTime: null
        }
      : null;

  const detailVersionId = selectedInstance ? versionOf(selectedInstance) : selectedVersion?.id;
  const detailLine = detailVersionId ? lineFor(detailVersionId) : null;
  const availability = detailVersionId
    ? loaderAvailability(loader, detailVersionId, fabricSet)
    : { available: true };

  const matchingInstance = useMemo(() => {
    if (!selectedVersion) return null;
    return (
      instances.find(
        (item) => versionOf(item) === selectedVersion.id && loaderOf(item) === loader
      ) || null
    );
  }, [instances, selectedVersion, loader]);

  const handleSelectInstance = (instance) => {
    setSelection({ type: 'instance', id: instance.id });
    onSelectCluster?.(instance.id);
  };

  const createFromVersion = (open) => {
    if (!selectedVersion) return null;
    if (!availability.available) {
      onNotify?.('Loader unavailable', availability.reason || `${loader} cannot run this version`);
      return null;
    }
    return (
      onCreateInstance?.(
        {
          version: selectedVersion.id,
          loader,
          name: `${selectedVersion.id} ${loader}`,
          description: detailLine?.description || `Minecraft ${selectedVersion.id}`,
          tags: detailLine?.tags?.length ? detailLine.tags : [loader],
          art: artFor(selectedVersion.id)
        },
        { open }
      ) || null
    );
  };

  const handlePlay = () => {
    if (selectedInstance) {
      onLaunch?.(selectedInstance);
      return;
    }
    if (matchingInstance) {
      onSelectCluster?.(matchingInstance.id);
      onLaunch?.(matchingInstance);
      return;
    }
    const created = createFromVersion(false);
    if (created) onLaunch?.(created);
  };

  const detailTitle = selectedInstance
    ? selectedInstance.name
    : detailLine?.name
      ? `${selectedVersion?.id} \u2014 ${detailLine.name}`
      : selectedVersion?.id || 'Pick a version';

  return (
    <div className="versions-view">
      <header className="versions-header">
        <div className="versions-heading-group">
          <h1 className="versions-title">Versions</h1>
          <p className="versions-subtitle">
            Every Minecraft release, straight from Mojang. Pick one to spin up an instance, or jump
            back into something you already have.
          </p>
        </div>

        <div className="versions-header-actions">
          <button
            type="button"
            className="versions-ghost-btn"
            onClick={() => refresh(true)}
            disabled={loadingManifest}
            title="Refresh version list"
          >
            <NativeIcon name="refresh" size={16} className={loadingManifest ? 'is-spinning' : ''} />
            <span>Refresh</span>
          </button>
          <button type="button" className="versions-brand-btn" onClick={onOpenNewInstanceModal}>
            <NativeIcon name="plus" size={16} />
            <span>New instance</span>
          </button>
        </div>
      </header>

      {manifest?.offline && (
        <div className="versions-offline-banner">
          <NativeIcon name="alert" size={16} />
          <span>
            {manifest.versions.length
              ? 'Showing a cached version list \u2014 could not reach Mojang.'
              : 'Could not reach Mojang and there is no cached list yet. Check your connection and refresh.'}
          </span>
        </div>
      )}

      <div className="versions-toolbar">
        <label className="versions-search">
          <NativeIcon name="search" size={16} />
          <input
            type="text"
            value={search}
            placeholder="Search versions and instances"
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button type="button" className="versions-search-clear" onClick={() => setSearch('')}>
              <NativeIcon name="close" size={14} />
            </button>
          )}
        </label>

        <div className="versions-chips">
          {VERSION_TYPES.map((type) => (
            <button
              key={type.id}
              type="button"
              className={`versions-chip ${typeFilter === type.id ? 'active' : ''}`}
              onClick={() => setTypeFilter(type.id)}
            >
              {type.label}
            </button>
          ))}
          <button
            type="button"
            className={`versions-chip ${installedOnly ? 'active' : ''}`}
            onClick={() => setInstalledOnly((value) => !value)}
          >
            <NativeIcon name="check" size={13} />
            Installed
          </button>
        </div>
      </div>

      <div className="versions-body">
        <div className="versions-list-col">
          {filteredInstances.length > 0 && (
            <section className="versions-section">
              <h2 className="versions-section-title">
                Your instances <span>{filteredInstances.length}</span>
              </h2>

              <div className="instance-row-list">
                {filteredInstances.map((instance) => (
                  <div
                    key={instance.id}
                    role="button"
                    tabIndex={0}
                    className={`instance-row ${
                      selection?.type === 'instance' && selection.id === instance.id ? 'selected' : ''
                    }`}
                    onClick={() => handleSelectInstance(instance)}
                    onDoubleClick={() => onOpenCluster?.(instance, 'overview')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleSelectInstance(instance);
                      }
                    }}
                  >
                    <div
                      className="instance-row-art"
                      style={{
                        backgroundImage: `url(${instance.art || artFor(versionOf(instance))})`
                      }}
                    />
                    <div className="instance-row-main">
                      <span className="instance-row-name">{instance.name}</span>
                      <span className="instance-row-meta">{instanceMeta(instance)}</span>
                    </div>
                    <button
                      type="button"
                      className="instance-row-play"
                      title={`Play ${instance.name}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onSelectCluster?.(instance.id);
                        onLaunch?.(instance);
                      }}
                    >
                      <NativeIcon name="play" size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="versions-section">
            <h2 className="versions-section-title">
              Minecraft versions
              {filteredVersions.length > 0 && <span>{filteredVersions.length}</span>}
            </h2>

            {loadingManifest && !manifest && (
              <div className="versions-empty">
                <NativeIcon name="refresh" size={18} className="is-spinning" />
                <p>Fetching the version manifest...</p>
              </div>
            )}

            {!loadingManifest && filteredVersions.length === 0 && (
              <div className="versions-empty">
                <NativeIcon name="cube" size={20} />
                <p>No versions match those filters.</p>
              </div>
            )}

            {groupedVersions.map(([line, entries]) => (
              <div className="version-group" key={line}>
                <div className="version-group-header">
                  <span>{line === 'Other' ? 'Other' : `Minecraft ${line}`}</span>
                  {lineFor(entries[0].id)?.name && <em>{lineFor(entries[0].id).name}</em>}
                </div>

                {entries.map((entry) => {
                  const installedCount = installedVersions.get(entry.id) || 0;
                  const active = selection?.type === 'version' && selection.id === entry.id;
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={`version-row ${active ? 'selected' : ''}`}
                      onClick={() => setSelection({ type: 'version', id: entry.id })}
                    >
                      <span className="version-row-id">{entry.id}</span>
                      <span className="version-row-badges">
                        {entry.type !== 'release' && (
                          <span className="version-badge type">{entry.type.replace('old_', '')}</span>
                        )}
                        {installedCount > 0 && (
                          <span className="version-badge installed">
                            <NativeIcon name="check" size={11} />
                            {installedCount}
                          </span>
                        )}
                        <span className="version-row-date">
                          {formatReleaseDate(entry.releaseTime) || ''}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}

            {filteredVersions.length > MAX_ROWS && (
              <p className="versions-truncated">
                {`Showing the first ${MAX_ROWS} of ${filteredVersions.length}. Use search to narrow it down.`}
              </p>
            )}
          </section>
        </div>

        <aside className="versions-detail">
          {!detailVersionId ? (
            <div className="versions-empty tall">
              <NativeIcon name="cube" size={22} />
              <p>Select a version to see the details.</p>
            </div>
          ) : (
            <>
              <div className="detail-banner">
                <img
                  className="detail-banner-img"
                  src={selectedInstance?.art || artFor(detailVersionId)}
                  alt=""
                />
                <div className="detail-banner-fade" />
                <span className="detail-banner-version">{detailVersionId}</span>
              </div>

              <div className="detail-body">
                <h3 className="detail-title">{detailTitle}</h3>

                <div className="detail-tags">
                  {selectedInstance ? (
                    <>
                      <span className="detail-tag brand">{loaderOf(selectedInstance)}</span>
                      {(selectedInstance.tags || []).slice(0, 3).map((tag) => (
                        <span className="detail-tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </>
                  ) : (
                    <>
                      <span className="detail-tag brand">
                        {selectedVersion?.type === 'release' ? 'Release' : selectedVersion?.type}
                      </span>
                      {formatReleaseDate(selectedVersion?.releaseTime) && (
                        <span className="detail-tag">
                          {formatReleaseDate(selectedVersion.releaseTime)}
                        </span>
                      )}
                      {(detailLine?.tags || []).slice(0, 2).map((tag) => (
                        <span className="detail-tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </>
                  )}
                </div>

                <p className="detail-desc">
                  {selectedInstance?.description ||
                    detailLine?.description ||
                    `Minecraft ${detailVersionId}. Choose a mod loader and Native will set the instance up for you.`}
                </p>

                {selectedInstance ? (
                  <div className="detail-stat-grid">
                    <div className="detail-stat">
                      <span className="detail-stat-label">Playtime</span>
                      <span className="detail-stat-value">
                        {formatDuration(selectedInstance.playtimeSecs || 0)}
                      </span>
                    </div>
                    <div className="detail-stat">
                      <span className="detail-stat-label">Sessions</span>
                      <span className="detail-stat-value">{selectedInstance.sessionCount || 0}</span>
                    </div>
                    <div className="detail-stat">
                      <span className="detail-stat-label">Last played</span>
                      <span className="detail-stat-value">
                        {selectedInstance.lastPlayed
                          ? new Date(selectedInstance.lastPlayed).toLocaleDateString()
                          : 'Never'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="detail-field">
                    <span className="detail-field-label">Mod loader</span>
                    <div className="detail-loader-grid">
                      {LOADERS.map((option) => {
                        const state = loaderAvailability(option, detailVersionId, fabricSet);
                        return (
                          <button
                            key={option}
                            type="button"
                            className={`detail-loader-btn ${loader === option ? 'active' : ''} ${
                              state.available ? '' : 'unavailable'
                            }`}
                            onClick={() => setLoader(option)}
                            title={state.available ? option : state.reason}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>
                    {!availability.available && (
                      <p className="detail-note warn">
                        <NativeIcon name="alert" size={14} />
                        {availability.reason}
                      </p>
                    )}
                    {matchingInstance && (
                      <p className="detail-note">
                        <NativeIcon name="check-circle" size={14} />
                        {`Already set up as \u201c${matchingInstance.name}\u201d`}
                      </p>
                    )}
                  </div>
                )}

                <div className="detail-actions">
                  <button
                    type="button"
                    className="detail-play-btn"
                    onClick={handlePlay}
                    disabled={!selectedInstance && !availability.available}
                  >
                    <NativeIcon name="play" size={14} />
                    <span>{selectedInstance || matchingInstance ? 'Play' : 'Create & play'}</span>
                  </button>

                  {selectedInstance ? (
                    <button
                      type="button"
                      className="detail-ghost-btn"
                      onClick={() => onOpenCluster?.(selectedInstance, 'overview')}
                    >
                      Open instance
                    </button>
                  ) : matchingInstance ? (
                    <button
                      type="button"
                      className="detail-ghost-btn"
                      onClick={() => onOpenCluster?.(matchingInstance, 'overview')}
                    >
                      Open instance
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="detail-ghost-btn"
                      onClick={() => createFromVersion(true)}
                      disabled={!availability.available}
                    >
                      Create instance
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
