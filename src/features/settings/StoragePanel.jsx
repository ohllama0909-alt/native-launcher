import React, { useCallback, useEffect, useMemo, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { formatDuration } from '../../data/versionsData.js';
import './SettingsPanels.css';

const CACHE_KEYS = [
  { key: 'native.versionManifest', label: 'Version manifest' },
  { key: 'native.patchNotes', label: 'Version artwork' },
  { key: 'native.instances', label: 'Instance library' },
  { key: 'native.preferences', label: 'Preferences' },
  { key: 'native.appearance', label: 'Appearance' }
];

function formatBytes(bytes) {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return (value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)) + ' ' + units[unit];
}

function localBytes(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Blob([raw]).size : 0;
  } catch {
    return 0;
  }
}

/** listDir may return strings or objects depending on platform; handle both. */
function countEntries(result) {
  if (!Array.isArray(result)) return { count: 0, bytes: 0 };
  let bytes = 0;
  result.forEach((entry) => {
    if (entry && typeof entry === 'object' && typeof entry.size === 'number') bytes += entry.size;
  });
  return { count: result.length, bytes };
}

export default function StoragePanel({ instances = [] }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [cacheTick, setCacheTick] = useState(0);

  const scan = useCallback(async () => {
    setLoading(true);

    const scanned = await Promise.all(
      instances.map(async (instance) => {
        const row = {
          id: instance.id,
          name: instance.name,
          version: instance.mc_version || instance.version || '',
          loader: instance.mc_loader || instance.loader || 'Vanilla',
          playtime: instance.playtimeSecs || 0,
          lastPlayed: instance.lastPlayed || null,
          installed: null,
          mods: 0,
          worlds: 0,
          resourcepacks: 0,
          shaderpacks: 0,
          bytes: 0
        };

        try {
          row.installed = await window.native?.instance?.isInstalled?.(instance.id);
        } catch {
          row.installed = null;
        }

        try {
          const mods = await window.native?.mods?.installed?.(instance.id);
          row.mods = mods ? Object.keys(mods).length : 0;
        } catch {
          row.mods = 0;
        }

        try {
          const worlds = await window.native?.instance?.worldList?.(instance.id);
          row.worlds = Array.isArray(worlds) ? worlds.length : 0;
        } catch {
          row.worlds = 0;
        }

        for (const folder of ['resourcepacks', 'shaderpacks']) {
          try {
            const listed = await window.native?.instance?.listDir?.(instance.id, folder);
            const info = countEntries(listed);
            row[folder] = info.count;
            row.bytes += info.bytes;
          } catch {
            /* folder may not exist yet */
          }
        }

        return row;
      })
    );

    setRows(scanned);
    setLoading(false);
  }, [instances]);

  useEffect(() => {
    scan();
  }, [scan]);

  const totals = useMemo(() => {
    const cacheBytes = CACHE_KEYS.reduce((sum, entry) => sum + localBytes(entry.key), 0);
    return {
      instances: rows.length,
      installed: rows.filter((row) => row.installed === true).length,
      mods: rows.reduce((sum, row) => sum + row.mods, 0),
      worlds: rows.reduce((sum, row) => sum + row.worlds, 0),
      packs: rows.reduce((sum, row) => sum + row.resourcepacks + row.shaderpacks, 0),
      playtime: rows.reduce((sum, row) => sum + row.playtime, 0),
      cacheBytes
    };
    // cacheTick forces a recount after clearing caches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cacheTick]);

  const clearCaches = () => {
    ['native.versionManifest', 'native.patchNotes'].forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    });
    setCacheTick((value) => value + 1);
  };

  const openFolder = (id, folder) => {
    window.native?.instance?.openFolder?.(id, folder || '');
  };

  return (
    <div className="sp-panel">
      <div className="sp-metric-grid">
        <div className="sp-metric">
          <span className="sp-metric-label">Instances</span>
          <span className="sp-metric-value">{totals.instances}</span>
          <span className="sp-metric-sub">{totals.installed} fully installed</span>
        </div>
        <div className="sp-metric">
          <span className="sp-metric-label">Mods</span>
          <span className="sp-metric-value">{totals.mods}</span>
          <span className="sp-metric-sub">tracked by Native</span>
        </div>
        <div className="sp-metric">
          <span className="sp-metric-label">Worlds</span>
          <span className="sp-metric-value">{totals.worlds}</span>
          <span className="sp-metric-sub">across every instance</span>
        </div>
        <div className="sp-metric">
          <span className="sp-metric-label">Packs</span>
          <span className="sp-metric-value">{totals.packs}</span>
          <span className="sp-metric-sub">resource and shader packs</span>
        </div>
        <div className="sp-metric">
          <span className="sp-metric-label">Playtime</span>
          <span className="sp-metric-value">{formatDuration(totals.playtime)}</span>
          <span className="sp-metric-sub">recorded by the launcher</span>
        </div>
        <div className="sp-metric">
          <span className="sp-metric-label">Local cache</span>
          <span className="sp-metric-value">{formatBytes(totals.cacheBytes)}</span>
          <span className="sp-metric-sub">manifest, artwork, settings</span>
        </div>
      </div>

      <div className="sp-section-head">
        <h3 className="sp-section-title">Per instance</h3>
        <button type="button" className="sp-ghost-btn" onClick={scan} disabled={loading}>
          <NativeIcon name="refresh" size={13} className={loading ? 'is-spinning' : ''} />
          <span>{loading ? 'Scanning' : 'Rescan'}</span>
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="sp-empty">No instances yet, so nothing is using disk space.</p>
      ) : (
        <div className="sp-rows">
          {rows.map((row) => {
            const open = expanded === row.id;
            return (
              <div key={row.id} className={'sp-row ' + (open ? 'open' : '')}>
                <button
                  type="button"
                  className="sp-row-head"
                  onClick={() => setExpanded(open ? null : row.id)}
                >
                  <NativeIcon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
                  <span className="sp-row-name">{row.name}</span>
                  <span className="sp-row-chip mono">{row.version}</span>
                  <span className="sp-row-chip">{row.loader}</span>
                  <span className="sp-row-spacer" />
                  {row.installed === false && <span className="sp-row-warn">Not downloaded</span>}
                  <span className="sp-row-count">{row.mods} mods</span>
                  <span className="sp-row-count">{row.worlds} worlds</span>
                </button>

                {open && (
                  <div className="sp-row-body">
                    <div className="sp-detail-grid">
                      <div className="sp-detail">
                        <span>Mods</span>
                        <strong>{row.mods}</strong>
                      </div>
                      <div className="sp-detail">
                        <span>Worlds</span>
                        <strong>{row.worlds}</strong>
                      </div>
                      <div className="sp-detail">
                        <span>Resource packs</span>
                        <strong>{row.resourcepacks}</strong>
                      </div>
                      <div className="sp-detail">
                        <span>Shader packs</span>
                        <strong>{row.shaderpacks}</strong>
                      </div>
                      <div className="sp-detail">
                        <span>Playtime</span>
                        <strong>{formatDuration(row.playtime)}</strong>
                      </div>
                      <div className="sp-detail">
                        <span>Last played</span>
                        <strong>
                          {row.lastPlayed ? new Date(row.lastPlayed).toLocaleDateString() : 'Never'}
                        </strong>
                      </div>
                    </div>

                    <div className="sp-row-actions">
                      <button type="button" className="sp-ghost-btn" onClick={() => openFolder(row.id, '')}>
                        <NativeIcon name="folder" size={13} />
                        <span>Instance folder</span>
                      </button>
                      <button
                        type="button"
                        className="sp-ghost-btn"
                        onClick={() => openFolder(row.id, 'mods')}
                      >
                        <NativeIcon name="package" size={13} />
                        <span>Mods</span>
                      </button>
                      <button
                        type="button"
                        className="sp-ghost-btn"
                        onClick={() => openFolder(row.id, 'saves')}
                      >
                        <NativeIcon name="globe" size={13} />
                        <span>Worlds</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="sp-section-head">
        <h3 className="sp-section-title">Cached data</h3>
        <button type="button" className="sp-ghost-btn danger" onClick={clearCaches}>
          <NativeIcon name="trash" size={13} />
          <span>Clear download caches</span>
        </button>
      </div>

      <div className="sp-cache-list">
        {CACHE_KEYS.map((entry) => {
          const bytes = localBytes(entry.key);
          return (
            <div key={entry.key} className="sp-cache-row">
              <span className="sp-cache-label">{entry.label}</span>
              <span className="sp-cache-key mono">{entry.key}</span>
              <span className="sp-cache-size">{bytes ? formatBytes(bytes) : 'empty'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
