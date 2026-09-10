import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import MotdRenderer from './MotdRenderer.jsx';
import './StatsView.css';

const DEFAULT_FEATURED_SERVERS = [
  { name: 'Hypixel Network', address: 'mc.hypixel.net', isCurated: true, defaultVersion: '1.8 - 1.21' },
  { name: 'Complex Gaming', address: 'hub.mc-complex.com', isCurated: true, defaultVersion: 'Pixelmon / 1.21' },
  { name: 'ManaCube', address: 'play.manacube.com', isCurated: true, defaultVersion: '1.8 - 1.21' },
  { name: '2b2t Anarchy', address: '2b2t.org', isCurated: true, defaultVersion: '1.20+' }
];

const playSeconds = (instance) =>
  Number(instance?.totalSecs ?? instance?.playtime ?? instance?.playTime ?? 0) || 0;

const sessionCount = (instance) =>
  Number(instance?.sessions ?? instance?.launches ?? 0) || 0;

const loaderOf = (instance) => instance?.mc_loader || instance?.loader || 'Vanilla';

function relativeDay(value, formatRelativeTime) {
  if (!value) return formatRelativeTime(0, 'day');
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return formatRelativeTime(0, 'day');

  const days = Math.floor((Date.now() - time) / 86400000);
  if (days < 30) return formatRelativeTime(-days, 'day');
  const months = Math.floor(days / 30);
  return formatRelativeTime(-months, 'month');
}

function pingQuality(latency) {
  if (typeof latency !== 'number' || latency <= 0) return 'unknown';
  if (latency < 80) return 'great';
  if (latency < 160) return 'good';
  if (latency < 280) return 'fair';
  return 'poor';
}

export default function StatsView({ instances = [] }) {
  const { t, formatDuration, formatNumber, formatRelativeTime } = useI18n();

  // Servers state
  const [recentServersList, setRecentServersList] = useState([]);
  const [customServersList, setCustomServersList] = useState(() => {
    try {
      const saved = localStorage.getItem('native.monitoredServers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [pings, setPings] = useState({});
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [newAddress, setNewAddress] = useState('');
  const [addError, setAddError] = useState('');
  const [copiedAddress, setCopiedAddress] = useState(null);
  const [serverFilter, setServerFilter] = useState('all'); // 'all' | 'recent' | 'featured' | 'custom'
  const [serversReady, setServersReady] = useState(false);
  const [iconErrors, setIconErrors] = useState({});

  // Save custom servers to localStorage
  const saveCustomServers = (list) => {
    setCustomServersList(list);
    try {
      localStorage.setItem('native.monitoredServers', JSON.stringify(list));
    } catch {}
  };

  // Ping a single server
  const pingSingleServer = useCallback(async (address) => {
    if (!address) return;
    const cleanAddr = address.trim();
    setPings((prev) => ({
      ...prev,
      [cleanAddr]: { ...(prev[cleanAddr] || {}), pinging: true }
    }));

    try {
      const res = await window.native?.server?.ping?.(cleanAddr);
      if (res) {
        setPings((prev) => ({
          ...prev,
          [cleanAddr]: {
            ...res,
            pinging: false,
            lastChecked: Date.now()
          }
        }));
        return res;
      }
    } catch {
      // Ignore
    }

    setPings((prev) => ({
      ...prev,
      [cleanAddr]: {
        online: false,
        pinging: false,
        lastChecked: Date.now()
      }
    }));
    return { online: false };
  }, []);

  // Ping all passed servers
  const pingAll = useCallback(
    async (targets) => {
      setRefreshingAll(true);
      try {
        await Promise.allSettled(targets.map((s) => pingSingleServer(s.address)));
      } finally {
        setRefreshingAll(false);
      }
    },
    [pingSingleServer]
  );

  // Load recent servers on mount
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const list = await window.native?.instance?.recentServers?.();
        if (!cancelled) {
          const arr = Array.isArray(list) ? list : [];
          setRecentServersList(arr);
        }
      } catch {
        if (!cancelled) setRecentServersList([]);
      } finally {
        if (!cancelled) setServersReady(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Combine servers uniquely
  const allServers = useMemo(() => {
    const map = new Map();

    // 1. Recent servers
    recentServersList.forEach((s) => {
      const addr = (s.address || s.ip || '').toLowerCase();
      if (addr && !map.has(addr)) {
        map.set(addr, {
          name: s.name || s.address,
          address: s.address,
          instance: s.instanceName || s.instance,
          isRecent: true
        });
      }
    });

    // 2. Custom monitored servers
    customServersList.forEach((s) => {
      const addr = (s.address || '').toLowerCase();
      if (addr && !map.has(addr)) {
        map.set(addr, {
          name: s.name || s.address,
          address: s.address,
          isCustom: true
        });
      } else if (addr && map.has(addr)) {
        map.get(addr).isCustom = true;
      }
    });

    // 3. Featured curated servers
    DEFAULT_FEATURED_SERVERS.forEach((s) => {
      const addr = s.address.toLowerCase();
      if (!map.has(addr)) {
        map.set(addr, s);
      } else {
        map.get(addr).isCurated = true;
      }
    });

    return Array.from(map.values());
  }, [recentServersList, customServersList]);

  // Initial ping all servers once loaded
  const hasInitialPinged = useRef(false);
  useEffect(() => {
    if (allServers.length > 0 && !hasInitialPinged.current) {
      hasInitialPinged.current = true;
      pingAll(allServers);
    }
  }, [allServers, pingAll]);

  // Filtered servers list
  const visibleServers = useMemo(() => {
    if (serverFilter === 'recent') return allServers.filter((s) => s.isRecent);
    if (serverFilter === 'featured') return allServers.filter((s) => s.isCurated);
    if (serverFilter === 'custom') return allServers.filter((s) => s.isCustom);
    return allServers;
  }, [allServers, serverFilter]);

  // Server stats summary
  const serverOverview = useMemo(() => {
    let onlineCount = 0;
    let totalPlayers = 0;
    let bestPing = Infinity;

    visibleServers.forEach((s) => {
      const p = pings[s.address];
      if (p?.online) {
        onlineCount++;
        totalPlayers += Number(p.players?.online || 0);
        if (typeof p.latency === 'number' && p.latency > 0 && p.latency < bestPing) {
          bestPing = p.latency;
        }
      }
    });

    return {
      monitored: visibleServers.length,
      onlineCount,
      totalPlayers,
      bestPing: bestPing === Infinity ? null : bestPing
    };
  }, [visibleServers, pings]);

  // Handle Add custom server
  const handleAddServer = async (e) => {
    e?.preventDefault?.();
    const target = newAddress.trim();
    if (!target) return;

    if (allServers.some((s) => s.address.toLowerCase() === target.toLowerCase())) {
      setAddError('Server is already monitored.');
      setTimeout(() => setAddError(''), 3000);
      return;
    }

    const newEntry = { name: target, address: target, isCustom: true };
    const nextList = [newEntry, ...customServersList];
    saveCustomServers(nextList);
    setNewAddress('');
    setAddError('');
    pingSingleServer(target);
  };

  const handleRemoveCustomServer = (address, event) => {
    event?.stopPropagation?.();
    const nextList = customServersList.filter(
      (s) => s.address.toLowerCase() !== address.toLowerCase()
    );
    saveCustomServers(nextList);
  };

  const copyIp = (address, event) => {
    event?.stopPropagation?.();
    if (!address) return;
    navigator.clipboard?.writeText?.(address).catch(() => {});
    setCopiedAddress(address);
    setTimeout(() => {
      setCopiedAddress((prev) => (prev === address ? null : prev));
    }, 2000);
  };

  // Playtime and Sessions metrics
  const summary = useMemo(() => {
    const totalSeconds = instances.reduce((sum, item) => sum + playSeconds(item), 0);
    const totalSessions = instances.reduce((sum, item) => sum + sessionCount(item), 0);
    const modded = instances.filter((item) => loaderOf(item) !== 'Vanilla').length;

    const ranked = [...instances].sort((a, b) => playSeconds(b) - playSeconds(a));
    const busiest = ranked[0] || null;

    const loaders = new Map();
    instances.forEach((item) => {
      const key = loaderOf(item);
      loaders.set(key, (loaders.get(key) || 0) + 1);
    });

    const lastPlayed = instances
      .map((item) => item.lastPlayed || item.last_played || item.lastLaunched)
      .filter(Boolean)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];

    return {
      totalSeconds,
      totalSessions,
      modded,
      busiest,
      ranked: ranked.slice(0, 6),
      loaders: Array.from(loaders.entries()).sort((a, b) => b[1] - a[1]),
      lastPlayed,
      averageSession: totalSessions ? Math.round(totalSeconds / totalSessions) : 0
    };
  }, [instances]);

  const maxPlay = summary.ranked.length ? playSeconds(summary.ranked[0]) : 0;

  const metrics = [
    {
      key: 'playtime',
      icon: 'clock',
      label: t('stats.playtime'),
      value: summary.totalSeconds ? formatDuration(summary.totalSeconds) : '0m',
      note: summary.lastPlayed
        ? t('stats.lastPlayed', { time: relativeDay(summary.lastPlayed, formatRelativeTime) })
        : t('stats.noSessions')
    },
    {
      key: 'sessions',
      icon: 'play',
      label: t('stats.sessions'),
      value: formatNumber(summary.totalSessions),
      note: summary.averageSession
        ? t('stats.average', { duration: formatDuration(summary.averageSession) })
        : t('stats.startTracking')
    },
    {
      key: 'instances',
      icon: 'cube',
      label: t('stats.instances'),
      value: formatNumber(instances.length),
      note: summary.busiest
        ? t('stats.mostPlayed', { name: summary.busiest.name || summary.busiest.version })
        : t('stats.nothingInstalled')
    },
    {
      key: 'modded',
      icon: 'package',
      label: t('stats.modded'),
      value: formatNumber(summary.modded),
      note: instances.length
        ? t('stats.percentModded', {
            percent: formatNumber(Math.round((summary.modded / instances.length) * 100))
          })
        : t('stats.noLoaders')
    }
  ];

  return (
    <div className="stats-view">
      <header className="stats-header">
        <div>
          <h1 className="stats-title">{t('stats.title')}</h1>
          <p className="stats-subtitle">{t('stats.subtitle')}</p>
        </div>
      </header>

      <div className="stats-scroll">
        <section className="stats-metric-row">
          {metrics.map((metric) => (
            <article key={metric.key} className="stats-metric">
              <span className="stats-metric-icon">
                <NativeIcon name={metric.icon} size={16} />
              </span>
              <span className="stats-metric-label">{metric.label}</span>
              <strong className="stats-metric-value">{metric.value}</strong>
              <span className="stats-metric-note">{metric.note}</span>
            </article>
          ))}
        </section>

        <section className="stats-panel-grid">
          <article className="stats-panel">
            <header className="stats-panel-head">
              <h2 className="stats-panel-title">{t('stats.byInstance')}</h2>
              <span className="stats-panel-hint">
                {t('stats.top', { count: formatNumber(summary.ranked.length || 0) })}
              </span>
            </header>

            {summary.ranked.length && maxPlay > 0 ? (
              <ul className="stats-bar-list">
                {summary.ranked.map((item) => {
                  const seconds = playSeconds(item);
                  const width = maxPlay ? Math.max(3, Math.round((seconds / maxPlay) * 100)) : 3;
                  return (
                    <li key={item.id} className="stats-bar-row">
                      <span className="stats-bar-name" title={item.name}>
                        {item.name || item.version}
                      </span>
                      <span className="stats-bar-track">
                        <span className="stats-bar-fill" style={{ width: width + '%' }} />
                      </span>
                      <span className="stats-bar-value">{formatDuration(seconds)}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="stats-empty">
                <NativeIcon name="clock" size={20} />
                <p>{t('stats.noPlaytime')}</p>
              </div>
            )}
          </article>

          <article className="stats-panel">
            <header className="stats-panel-head">
              <h2 className="stats-panel-title">{t('stats.loaders')}</h2>
              <span className="stats-panel-hint">
                {t('stats.total', { count: formatNumber(instances.length) })}
              </span>
            </header>

            {summary.loaders.length ? (
              <>
                <div className="stats-split-bar">
                  {summary.loaders.map(([loader, count], index) => (
                    <span
                      key={loader}
                      className={'stats-split-seg tone-' + (index % 4)}
                      style={{ flexGrow: count }}
                      title={loader + ': ' + count}
                    />
                  ))}
                </div>
                <ul className="stats-legend">
                  {summary.loaders.map(([loader, count], index) => (
                    <li key={loader} className="stats-legend-row">
                      <span className={'stats-legend-dot tone-' + (index % 4)} />
                      <span className="stats-legend-name">{loader}</span>
                      <span className="stats-legend-value">{count}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="stats-empty">
                <NativeIcon name="layers" size={20} />
                <p>{t('stats.noBreakdown')}</p>
              </div>
            )}
          </article>
        </section>

        {/* ─── Upgraded Server Stats & Live Monitor Section ─── */}
        <section className="stats-panel stats-server-panel">
          <header className="stats-panel-head server-panel-header">
            <div className="server-panel-title-area">
              <div className="server-title-row">
                <h2 className="stats-panel-title">Server Monitor & Live Stats</h2>
                <span className="server-live-indicator">
                  <span className="server-live-dot" /> LIVE
                </span>
              </div>
              <span className="stats-panel-hint">
                Real-time MOTD, server icons, live player count & latency ping
              </span>
            </div>

            <div className="server-panel-actions">
              <div className="server-filters-pills">
                <button
                  type="button"
                  className={`server-filter-btn ${serverFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setServerFilter('all')}
                >
                  All ({allServers.length})
                </button>
                <button
                  type="button"
                  className={`server-filter-btn ${serverFilter === 'recent' ? 'active' : ''}`}
                  onClick={() => setServerFilter('recent')}
                >
                  Recent
                </button>
                <button
                  type="button"
                  className={`server-filter-btn ${serverFilter === 'featured' ? 'active' : ''}`}
                  onClick={() => setServerFilter('featured')}
                >
                  Featured
                </button>
                <button
                  type="button"
                  className={`server-filter-btn ${serverFilter === 'custom' ? 'active' : ''}`}
                  onClick={() => setServerFilter('custom')}
                >
                  Custom
                </button>
              </div>

              <button
                type="button"
                className="server-refresh-all-btn"
                onClick={() => pingAll(visibleServers)}
                disabled={refreshingAll}
                title="Refresh all server pings"
              >
                <NativeIcon name="refresh" size={14} className={refreshingAll ? 'spin' : ''} />
                <span>{refreshingAll ? 'Pinging…' : 'Refresh Ping'}</span>
              </button>
            </div>
          </header>

          {/* Quick Add Server Bar */}
          <form className="server-add-bar" onSubmit={handleAddServer}>
            <div className="server-input-wrap">
              <NativeIcon name="server" size={15} className="server-input-icon" />
              <input
                type="text"
                className="server-add-input"
                placeholder="Monitor any server (e.g. play.hypixel.net or server.ip:25565)..."
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
              />
              {addError && <span className="server-add-error">{addError}</span>}
            </div>
            <button
              type="submit"
              className="server-add-submit-btn"
              disabled={!newAddress.trim()}
            >
              <NativeIcon name="plus" size={14} />
              <span>Monitor Server</span>
            </button>
          </form>

          {/* Mini Overview Metric Row */}
          <div className="server-stats-strip">
            <div className="server-strip-item">
              <span className="strip-item-label">Servers Monitored</span>
              <strong className="strip-item-val">{serverOverview.monitored}</strong>
            </div>
            <div className="server-strip-item">
              <span className="strip-item-label">Online</span>
              <strong className="strip-item-val online-val">
                {serverOverview.onlineCount} / {serverOverview.monitored}
              </strong>
            </div>
            <div className="server-strip-item">
              <span className="strip-item-label">Total Players Online</span>
              <strong className="strip-item-val">
                {formatNumber(serverOverview.totalPlayers)}
              </strong>
            </div>
            <div className="server-strip-item">
              <span className="strip-item-label">Lowest Ping</span>
              <strong className="strip-item-val ping-val">
                {serverOverview.bestPing !== null ? `${serverOverview.bestPing} ms` : '—'}
              </strong>
            </div>
          </div>

          {/* Server Cards List */}
          {visibleServers.length ? (
            <div className="server-cards-list">
              {visibleServers.map((server, index) => {
                const ping = pings[server.address] || {};
                const isPinging = Boolean(ping.pinging);
                const isOnline = Boolean(ping.online);
                const quality = pingQuality(ping.latency);
                const isCopied = copiedAddress === server.address;

                const playersOnline = ping.players?.online ?? 0;
                const playersMax = Math.max(1, ping.players?.max ?? 1);
                const capacityPct = Math.min(100, Math.round((playersOnline / playersMax) * 100));

                return (
                  <article
                    key={server.address + index}
                    className={`server-card ${isOnline ? 'is-online' : 'is-offline'} ${isPinging ? 'is-pinging' : ''}`}
                  >
                    {/* Server Favicon / Real Icon */}
                    <div className="server-icon-container">
                      {ping.favicon && !iconErrors[server.address] ? (
                        <img
                          src={ping.favicon}
                          alt=""
                          className="server-real-favicon"
                          onError={() => setIconErrors((prev) => ({ ...prev, [server.address]: true }))}
                          loading="lazy"
                        />
                      ) : (
                        <div className="server-fallback-icon">
                          <NativeIcon name="server" size={24} />
                        </div>
                      )}
                      <span
                        className={`server-status-dot ${isOnline ? 'online' : isPinging ? 'checking' : 'offline'}`}
                        title={isOnline ? 'Server Online' : isPinging ? 'Checking…' : 'Server Offline'}
                      />
                    </div>

                    {/* Server Details Column */}
                    <div className="server-details-col">
                      <div className="server-header-row">
                        <h3 className="server-display-name">
                          {server.name || ping.version || server.address}
                        </h3>

                        <button
                          type="button"
                          className={`server-copy-ip-btn ${isCopied ? 'copied' : ''}`}
                          onClick={(e) => copyIp(server.address, e)}
                          title="Click to copy server address"
                        >
                          <NativeIcon name={isCopied ? 'check' : 'copy'} size={12} />
                          <span>{isCopied ? 'Copied IP' : server.address}</span>
                        </button>

                        <span className="server-version-pill">
                          {ping.version || server.defaultVersion || 'Java Edition'}
                        </span>

                        {server.isCustom ? (
                          <span className="server-badge-tag custom">Custom</span>
                        ) : server.instance ? (
                          <span className="server-badge-tag instance">From {server.instance}</span>
                        ) : (
                          <span className="server-badge-tag featured">Featured</span>
                        )}
                      </div>

                      {/* Minecraft MOTD Renderer */}
                      <div className="server-motd-wrapper">
                        {isOnline ? (
                          <MotdRenderer
                            motd={ping.motd}
                            rawDescription={ping.rawDescription}
                          />
                        ) : isPinging ? (
                          <div className="server-motd-placeholder">
                            <span className="motd-shimmer">Pinging server for live MOTD…</span>
                          </div>
                        ) : (
                          <div className="server-motd-placeholder offline">
                            <span>Could not connect to server ({server.address})</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Server Metrics Column (Latency, Players, Actions) */}
                    <div className="server-metrics-col">
                      <div className="server-metrics-group">
                        {/* Ping Badge */}
                        {isOnline ? (
                          <div className={`server-ping-pill ping-${quality}`} title={`Ping: ${ping.latency} ms`}>
                            <NativeIcon name="wifi" size={13} />
                            <span>{ping.latency} ms</span>
                          </div>
                        ) : isPinging ? (
                          <div className="server-ping-pill checking">
                            <NativeIcon name="loader" size={12} className="spin" />
                            <span>Pinging…</span>
                          </div>
                        ) : (
                          <div className="server-ping-pill offline">
                            <NativeIcon name="alert" size={12} />
                            <span>Offline</span>
                          </div>
                        )}

                        {/* Player Count */}
                        {isOnline ? (
                          <div className="server-player-badge" title={`${formatNumber(playersOnline)} of ${formatNumber(playersMax)} players online`}>
                            <div className="server-player-count-row">
                              <NativeIcon name="users" size={13} />
                              <strong className="server-player-online-count">
                                {formatNumber(playersOnline)}
                              </strong>
                              <span className="server-player-max-count">
                                / {formatNumber(playersMax)}
                              </span>
                            </div>
                            <div className="server-capacity-track">
                              <div
                                className="server-capacity-bar"
                                style={{ width: `${capacityPct}%` }}
                              />
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Quick Actions */}
                      <div className="server-actions-group">
                        <button
                          type="button"
                          className="server-action-icon-btn"
                          onClick={() => pingSingleServer(server.address)}
                          disabled={isPinging}
                          title="Re-ping server"
                        >
                          <NativeIcon
                            name="refresh"
                            size={14}
                            className={isPinging ? 'spin' : ''}
                          />
                        </button>

                        {server.isCustom && (
                          <button
                            type="button"
                            className="server-action-icon-btn danger"
                            onClick={(e) => handleRemoveCustomServer(server.address, e)}
                            title="Remove from monitored list"
                          >
                            <NativeIcon name="trash" size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="stats-empty">
              <NativeIcon name="globe" size={24} />
              <p>
                {serversReady
                  ? 'No servers found for this filter. You can add any Minecraft server address above.'
                  : t('stats.readingServers')}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
