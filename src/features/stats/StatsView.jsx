import React, { useEffect, useMemo, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './StatsView.css';

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

export default function StatsView({ instances = [] }) {
  const { t, formatDuration, formatNumber, formatRelativeTime } = useI18n();
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
        ? t('stats.percentModded', { percent: formatNumber(Math.round((summary.modded / instances.length) * 100)) })
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
              <span className="stats-panel-hint">{t('stats.top', { count: formatNumber(summary.ranked.length || 0) })}</span>
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
              <span className="stats-panel-hint">{t('stats.total', { count: formatNumber(instances.length) })}</span>
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

        <section className="stats-panel">
          <header className="stats-panel-head">
            <h2 className="stats-panel-title">{t('stats.recentServers')}</h2>
            <span className="stats-panel-hint">{t('stats.serverSource')}</span>
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
                    <span className="stats-server-addr">{server.address || server.ip || t('stats.unknownHost')}</span>
                  </span>
                  {server.instance && <span className="stats-server-tag">{server.instance}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <div className="stats-empty">
              <NativeIcon name="globe" size={20} />
              <p>{serversReady ? t('stats.noServers') : t('stats.readingServers')}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
