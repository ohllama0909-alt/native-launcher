import React, { useEffect, useMemo, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { formatDuration } from '../../data/versionsData.js';
import './StatsView.css';

const playSeconds = (instance) =>
  Number(instance?.totalSecs ?? instance?.playtime ?? instance?.playTime ?? 0) || 0;

const sessionCount = (instance) =>
  Number(instance?.sessions ?? instance?.launches ?? 0) || 0;

const loaderOf = (instance) => instance?.mc_loader || instance?.loader || 'Vanilla';

function relativeDay(value) {
  if (!value) return 'never';
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return 'never';

  const days = Math.floor((Date.now() - time) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return days + ' days ago';
  const months = Math.floor(days / 30);
  return months === 1 ? 'a month ago' : months + ' months ago';
}

export default function StatsView({ instances = [] }) {
  const [servers, setServers] = useState([]);
  const [serversReady, setServersReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const list = await window.native?.instance?.recentServers?.();
        if (!cancelled) setServers(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setServers([]);
      } finally {
        if (!cancelled) setServersReady(true);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

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
      label: 'Total playtime',
      value: summary.totalSeconds ? formatDuration(summary.totalSeconds) : '0m',
      note: summary.lastPlayed ? 'Last played ' + relativeDay(summary.lastPlayed) : 'No sessions recorded yet'
    },
    {
      key: 'sessions',
      icon: 'play',
      label: 'Sessions',
      value: String(summary.totalSessions),
      note: summary.averageSession
        ? formatDuration(summary.averageSession) + ' average'
        : 'Launch an instance to start tracking'
    },
    {
      key: 'instances',
      icon: 'cube',
      label: 'Instances',
      value: String(instances.length),
      note: summary.busiest ? 'Most played: ' + (summary.busiest.name || summary.busiest.version) : 'Nothing installed yet'
    },
    {
      key: 'modded',
      icon: 'package',
      label: 'Modded',
      value: String(summary.modded),
      note: instances.length
        ? Math.round((summary.modded / instances.length) * 100) + '% of your instances'
        : 'No loaders configured'
    }
  ];

  return (
    <div className="stats-view">
      <header className="stats-header">
        <div>
          <h1 className="stats-title">Statistics</h1>
          <p className="stats-subtitle">Everything here is measured from your own instances.</p>
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
              <h2 className="stats-panel-title">Playtime by instance</h2>
              <span className="stats-panel-hint">Top {summary.ranked.length || 0}</span>
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
                <p>No playtime recorded yet. Launch an instance and it will show up here.</p>
              </div>
            )}
          </article>

          <article className="stats-panel">
            <header className="stats-panel-head">
              <h2 className="stats-panel-title">Loaders</h2>
              <span className="stats-panel-hint">{instances.length} total</span>
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
                <p>Create an instance to see how your loaders break down.</p>
              </div>
            )}
          </article>
        </section>

        <section className="stats-panel">
          <header className="stats-panel-head">
            <h2 className="stats-panel-title">Recent servers</h2>
            <span className="stats-panel-hint">From your instance server lists</span>
          </header>

          {servers.length ? (
            <ul className="stats-server-list">
              {servers.slice(0, 8).map((server, index) => (
                <li key={(server.address || server.ip || 'server') + index} className="stats-server-row">
                  <span className="stats-server-badge">
                    <NativeIcon name="globe" size={14} />
                  </span>
                  <span className="stats-server-text">
                    <span className="stats-server-name">{server.name || server.address || server.ip}</span>
                    <span className="stats-server-addr">{server.address || server.ip || 'unknown host'}</span>
                  </span>
                  {server.instance && <span className="stats-server-tag">{server.instance}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="stats-empty">
              <NativeIcon name="globe" size={20} />
              <p>{serversReady ? 'No servers found in your instances yet.' : 'Reading your server lists...'}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
