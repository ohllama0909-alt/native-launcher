import React, { useEffect, useMemo, useRef, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { getClusterArt, formatDuration } from '../../data/versionsData.js';
import './InstancesView.css';

const SORTS = [
  { id: 'recent', label: 'Recently played' },
  { id: 'name', label: 'Name' },
  { id: 'created', label: 'Newest' },
  { id: 'playtime', label: 'Most played' }
];

const LOADER_FILTERS = ['All', 'Vanilla', 'Fabric', 'Forge', 'NeoForge', 'Quilt'];

/* Approximate height of the card menu, used to decide whether it should
   open upwards so it never gets clipped by the bottom of the window. */
const CARD_MENU_HEIGHT = 292;

function versionOf(instance) {
  return instance?.mc_version || instance?.version || '';
}

function loaderOf(instance) {
  return instance?.mc_loader || instance?.loader || 'Vanilla';
}

function artOf(instance) {
  return instance?.art || getClusterArt(instance || {});
}

function relativeTime(value) {
  if (!value) return 'Never played';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return 'Never played';

  const seconds = Math.max(1, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return 'Just now';

  const steps = [
    { limit: 3600, div: 60, unit: 'minute' },
    { limit: 86400, div: 3600, unit: 'hour' },
    { limit: 2592000, div: 86400, unit: 'day' },
    { limit: 31536000, div: 2592000, unit: 'month' }
  ];

  for (const step of steps) {
    if (seconds < step.limit) {
      const amount = Math.floor(seconds / step.div);
      return `${amount} ${step.unit}${amount === 1 ? '' : 's'} ago`;
    }
  }

  const years = Math.floor(seconds / 31536000);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

/** Reads whichever shape the launcher hook reports without assuming one. */
function readLauncher(state) {
  const id = state?.instanceId || state?.instance?.id || state?.clusterId || null;
  const status = state?.status || (state?.running ? 'running' : 'idle');
  const active = Boolean(id) && status !== 'idle' && status !== 'stopped' && status !== 'error';
  return { id, status, active };
}

export default function InstancesView({
  instances = [],
  selectedId,
  onSelect,
  onOpenCluster,
  onLaunch,
  onKill,
  launcherState,
  onOpenCreateModal,
  onUpdate,
  onDuplicate,
  onRemove,
  onNavigateBrowse,
  onNotify
}) {
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [loaderFilter, setLoaderFilter] = useState('All');
  const [layout, setLayout] = useState('grid');

  const [sortOpen, setSortOpen] = useState(false);
  const [menuFor, setMenuFor] = useState(null);
  const [menuPlacement, setMenuPlacement] = useState('down');
  const [renaming, setRenaming] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const sortRef = useRef(null);
  const menuRef = useRef(null);

  const launcher = readLauncher(launcherState);

  /* Close the popovers on any outside click or Escape. */
  useEffect(() => {
    if (!sortOpen && !menuFor) return undefined;

    const onPointerDown = (event) => {
      if (sortRef.current?.contains(event.target)) return;
      if (menuRef.current?.contains(event.target)) return;
      setSortOpen(false);
      setMenuFor(null);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setSortOpen(false);
      setMenuFor(null);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [sortOpen, menuFor]);

  /* A scroll or resize while the menu is open would move it away from the
     button, so just close it instead of letting it float. */
  useEffect(() => {
    if (!menuFor) return undefined;
    const close = () => setMenuFor(null);
    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
  }, [menuFor]);

  const toggleCardMenu = (instance, event) => {
    event.stopPropagation();
    setSortOpen(false);

    if (menuFor === instance.id) {
      setMenuFor(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const flip = spaceBelow < CARD_MENU_HEIGHT + 18 && spaceAbove > spaceBelow;

    setMenuPlacement(flip ? 'up' : 'down');
    setMenuFor(instance.id);
  };

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = instances.filter((instance) => {
      if (loaderFilter !== 'All' && loaderOf(instance) !== loaderFilter) return false;
      if (!query) return true;
      const haystack = [instance.name, versionOf(instance), loaderOf(instance), ...(instance.tags || [])]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (sort === 'name') return String(a.name || '').localeCompare(String(b.name || ''));
      if (sort === 'playtime') return (b.playtimeSecs || 0) - (a.playtimeSecs || 0);
      if (sort === 'created') {
        return new Date(b.created || 0).getTime() - new Date(a.created || 0).getTime();
      }
      return new Date(b.lastPlayed || 0).getTime() - new Date(a.lastPlayed || 0).getTime();
    });

    return sorted;
  }, [instances, search, loaderFilter, sort]);

  const totalPlaytime = useMemo(
    () => instances.reduce((sum, instance) => sum + (instance.playtimeSecs || 0), 0),
    [instances]
  );

  const openFolder = async (instance) => {
    try {
      await window.native?.instance?.openFolder?.(instance.id);
    } catch {
      onNotify?.('Could not open folder', `Native could not open the folder for ${instance.name}.`);
    }
  };

  const submitRename = () => {
    const next = renameValue.trim();
    if (!renaming) return;
    if (next && next !== renaming.name) {
      onUpdate?.(renaming.id, { name: next });
    }
    setRenaming(null);
  };

  const doDelete = () => {
    if (!confirmDelete) return;
    onRemove?.(confirmDelete.id);
    onNotify?.('Instance removed', `${confirmDelete.name} was deleted from your library.`);
    setConfirmDelete(null);
  };

  const activeSort = SORTS.find((entry) => entry.id === sort) || SORTS[0];

  return (
    <div className="instances-view">
      <header className="instances-header">
        <div className="instances-heading-group">
          <h1 className="instances-title">Instances</h1>
          <p className="instances-subtitle">
            {instances.length === 0
              ? 'Create your first instance to get started.'
              : `${instances.length} instance${instances.length === 1 ? '' : 's'} \u2022 ${formatDuration(
                  totalPlaytime
                )} played`}
          </p>
        </div>

        <button type="button" className="instances-brand-btn" onClick={onOpenCreateModal}>
          <NativeIcon name="plus" size={16} />
          <span>New instance</span>
        </button>
      </header>

      {instances.length > 0 && (
        <div className="instances-toolbar">
          <label className="instances-search">
            <NativeIcon name="search" size={16} />
            <input
              type="text"
              value={search}
              placeholder="Search instances"
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                className="instances-search-clear"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                <NativeIcon name="close" size={14} />
              </button>
            )}
          </label>

          <div className="instances-chips">
            {LOADER_FILTERS.map((option) => (
              <button
                key={option}
                type="button"
                className={`instances-chip ${loaderFilter === option ? 'active' : ''}`}
                onClick={() => setLoaderFilter(option)}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="instances-toolbar-right">
            <div className="instances-sort" ref={sortRef}>
              <button
                type="button"
                className="instances-sort-btn"
                onClick={() => setSortOpen((value) => !value)}
              >
                <NativeIcon name="sort" size={15} />
                <span>{activeSort.label}</span>
                <NativeIcon name="chevron-down" size={13} />
              </button>

              {sortOpen && (
                <div className="instances-popover">
                  {SORTS.map((entry) => (
                    <button
                      key={entry.id}
                      type="button"
                      className={`instances-popover-item ${sort === entry.id ? 'active' : ''}`}
                      onClick={() => {
                        setSort(entry.id);
                        setSortOpen(false);
                      }}
                    >
                      <span>{entry.label}</span>
                      {sort === entry.id && <NativeIcon name="check" size={13} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="instances-layout-toggle">
              <button
                type="button"
                className={layout === 'grid' ? 'active' : ''}
                onClick={() => setLayout('grid')}
                title="Grid view"
              >
                <NativeIcon name="grid" size={15} />
              </button>
              <button
                type="button"
                className={layout === 'list' ? 'active' : ''}
                onClick={() => setLayout('list')}
                title="List view"
              >
                <NativeIcon name="list" size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="instances-body">
        {instances.length === 0 ? (
          <div className="instances-empty">
            <div className="instances-empty-icon">
              <NativeIcon name="cube" size={28} />
            </div>
            <h2>No instances yet</h2>
            <p>
              An instance is one isolated copy of Minecraft with its own version, mod loader, mods
              and worlds. Make as many as you like.
            </p>
            <button type="button" className="instances-brand-btn" onClick={onOpenCreateModal}>
              <NativeIcon name="plus" size={16} />
              <span>Create an instance</span>
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="instances-empty small">
            <NativeIcon name="search" size={22} />
            <h2>Nothing matches</h2>
            <p>Try a different search or clear the loader filter.</p>
          </div>
        ) : (
          <div className={`instances-grid is-${layout}`}>
            {visible.map((instance) => {
              const running = launcher.active && launcher.id === instance.id;
              const isSelected = selectedId === instance.id;
              const menuOpen = menuFor === instance.id;

              return (
                <article
                  key={instance.id}
                  className={`instance-card ${isSelected ? 'selected' : ''} ${
                    running ? 'running' : ''
                  } ${menuOpen ? 'menu-open' : ''}`}
                  onClick={() => onSelect?.(instance.id)}
                  onDoubleClick={() => onOpenCluster?.(instance, 'overview')}
                >
                  <div className="instance-card-art">
                    <img src={artOf(instance)} alt="" draggable="false" />
                    <div className="instance-card-art-fade" />

                    {running && (
                      <span className="instance-card-live">
                        <NativeIcon name="dot" size={10} />
                        {launcher.status === 'running' ? 'Running' : launcher.status}
                      </span>
                    )}

                    <div className="instance-card-hover">
                      <button
                        type="button"
                        className={`instance-card-play ${running ? 'stop' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          if (running) onKill?.();
                          else {
                            onSelect?.(instance.id);
                            onLaunch?.(instance);
                          }
                        }}
                        title={running ? 'Stop' : `Play ${instance.name}`}
                      >
                        <NativeIcon name={running ? 'stop' : 'play'} size={16} />
                        <span>{running ? 'Stop' : 'Play'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="instance-card-body">
                    <div className="instance-card-headline">
                      <h3 className="instance-card-name" title={instance.name}>
                        {instance.name}
                      </h3>

                      <div className="instance-card-menu-wrap" ref={menuOpen ? menuRef : null}>
                        <button
                          type="button"
                          className="instance-card-menu-btn"
                          onClick={(event) => toggleCardMenu(instance, event)}
                          title="More actions"
                        >
                          <NativeIcon name="more-vertical" size={16} />
                        </button>

                        {menuOpen && (
                          <div
                            className={`instances-popover align-right ${
                              menuPlacement === 'up' ? 'drop-up' : ''
                            }`}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="instances-popover-item"
                              onClick={() => {
                                setMenuFor(null);
                                onOpenCluster?.(instance, 'overview');
                              }}
                            >
                              <NativeIcon name="external-link" size={14} />
                              <span>Open instance</span>
                            </button>
                            <button
                              type="button"
                              className="instances-popover-item"
                              onClick={() => {
                                setMenuFor(null);
                                onNavigateBrowse?.(instance);
                              }}
                            >
                              <NativeIcon name="compass" size={14} />
                              <span>Add content</span>
                            </button>
                            <button
                              type="button"
                              className="instances-popover-item"
                              onClick={() => {
                                setMenuFor(null);
                                openFolder(instance);
                              }}
                            >
                              <NativeIcon name="folder" size={14} />
                              <span>Open folder</span>
                            </button>

                            <div className="instances-popover-divider" />

                            <button
                              type="button"
                              className="instances-popover-item"
                              onClick={() => {
                                setMenuFor(null);
                                setRenameValue(instance.name || '');
                                setRenaming(instance);
                              }}
                            >
                              <NativeIcon name="edit" size={14} />
                              <span>Rename</span>
                            </button>
                            <button
                              type="button"
                              className="instances-popover-item"
                              onClick={() => {
                                setMenuFor(null);
                                onDuplicate?.(instance.id);
                              }}
                            >
                              <NativeIcon name="copy" size={14} />
                              <span>Duplicate</span>
                            </button>
                            <button
                              type="button"
                              className="instances-popover-item danger"
                              onClick={() => {
                                setMenuFor(null);
                                setConfirmDelete(instance);
                              }}
                            >
                              <NativeIcon name="trash" size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="instance-card-chips">
                      <span className="instance-chip mono">{versionOf(instance)}</span>
                      <span className="instance-chip brand">{loaderOf(instance)}</span>
                    </div>

                    <div className="instance-card-stats">
                      <span>
                        <NativeIcon name="clock" size={12} />
                        {formatDuration(instance.playtimeSecs || 0)}
                      </span>
                      <span>{relativeTime(instance.lastPlayed)}</span>
                    </div>
                  </div>
                </article>
              );
            })}

            <button type="button" className="instance-add-card" onClick={onOpenCreateModal}>
              <NativeIcon name="plus" size={22} />
              <span>New instance</span>
            </button>
          </div>
        )}
      </div>

      {renaming && (
        <div className="instances-dialog-backdrop" onClick={() => setRenaming(null)}>
          <div className="instances-dialog" onClick={(event) => event.stopPropagation()}>
            <h3>Rename instance</h3>
            <input
              className="instances-dialog-input"
              type="text"
              value={renameValue}
              autoFocus
              maxLength={60}
              onChange={(event) => setRenameValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submitRename();
                if (event.key === 'Escape') setRenaming(null);
              }}
            />
            <div className="instances-dialog-actions">
              <button type="button" className="instances-ghost-btn" onClick={() => setRenaming(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="instances-brand-btn"
                onClick={submitRename}
                disabled={!renameValue.trim()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="instances-dialog-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="instances-dialog" onClick={(event) => event.stopPropagation()}>
            <h3>Delete instance</h3>
            <p className="instances-dialog-text">
              {`Remove \u201c${confirmDelete.name}\u201d from your library? Files already downloaded stay on disk.`}
            </p>
            <div className="instances-dialog-actions">
              <button
                type="button"
                className="instances-ghost-btn"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button type="button" className="instances-danger-btn" onClick={doDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
