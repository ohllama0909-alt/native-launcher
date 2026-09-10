import React, { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';

export default function OverviewTab({ cluster }) {
  const { t, formatDuration } = useI18n();
  const [whenMode, setWhenMode] = useState('day'); // 'day' | 'hour'
  const [dailyRange, setDailyRange] = useState('2W'); // '2W' | '1M' | '3M'

  const totalPlaytime = cluster?.playtimeSecs || 1620; // default 27m
  const sessions = cluster?.sessionCount || 2;
  const avgSession = cluster?.avgSessionSecs || Math.round(totalPlaytime / Math.max(1, sessions));
  const activeDays = cluster?.activeDays || 2;
  const serverJoins = cluster?.serverJoins || 2;

  // Day data for "When you play"
  const dayData = [
    { label: t('day.mon'), minutes: 0 },
    { label: t('day.tue'), minutes: 2 },
    { label: t('day.wed'), minutes: 2 },
    { label: t('day.thu'), minutes: 23, peak: true },
    { label: t('day.fri'), minutes: 0 },
    { label: t('day.sat'), minutes: 0 },
    { label: t('day.sun'), minutes: 0 }
  ];

  // Hour data for "When you play"
  const hourData = [
    { label: '00', minutes: 0 },
    { label: '04', minutes: 0 },
    { label: '08', minutes: 0 },
    { label: '12', minutes: 4 },
    { label: '16', minutes: 18, peak: true },
    { label: '20', minutes: 5 }
  ];

  const currentWhenData = whenMode === 'day' ? dayData : hourData;
  const maxWhenMinutes = 24;

  // Daily playtime data
  const dailyData = [
    { date: 'Jul 23', minutes: 0 },
    { date: 'Jul 24', minutes: 0 },
    { date: 'Jul 25', minutes: 0 },
    { date: 'Jul 26', minutes: 0 },
    { date: 'Jul 27', minutes: 4 },
    { date: 'Jul 28', minutes: 0 },
    { date: 'Jul 29', minutes: 23, peak: true }
  ];
  const maxDailyMinutes = 24;

  return (
    <div className="overview-tab-content">
      <div className="overview-section-header">
        <h2 className="overview-section-title">{t('cluster.overview')}</h2>
        <p className="overview-section-sub">
          {t('overview.subtitle', { version: cluster?.mc_version || cluster?.version, loader: cluster?.mc_loader || cluster?.loader })}
        </p>
      </div>

      {/* 5 Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-card-header">
            <Icon name="clock-rewind" size={16} />
            <span>{t('overview.totalPlaytime')}</span>
          </div>
          <div className="metric-card-value">{formatDuration(totalPlaytime)}</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <Icon name="play" size={16} />
            <span>{t('overview.sessions')}</span>
          </div>
          <div className="metric-card-value">{sessions}</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <Icon name="calendar" size={16} />
            <span>{t('overview.average')}</span>
          </div>
          <div className="metric-card-value">{formatDuration(avgSession)}</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <Icon name="rocket-02" size={16} />
            <span>{t('overview.activeDays')}</span>
          </div>
          <div className="metric-card-value">{activeDays}</div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <Icon name="globe-01" size={16} />
            <span>{t('overview.serverJoins')}</span>
          </div>
          <div className="metric-card-value">{serverJoins}</div>
        </div>
      </div>

      {/* 2 Charts matching launcher4.webp */}
      <div className="charts-grid">
        {/* Left Chart: When you play */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title-group">
              <h3 className="chart-title">{t('overview.whenYouPlay')}</h3>
              <p className="chart-subtitle">
                {whenMode === 'day' ? t('overview.mostActive', { day: t('day.thu') }) : t('overview.peakTime')}
              </p>
            </div>

            <div className="pill-toggle-group">
              <button
                className={`pill-btn ${whenMode === 'day' ? 'active' : ''}`}
                onClick={() => setWhenMode('day')}
              >
                {t('overview.day')}
              </button>
              <button
                className={`pill-btn ${whenMode === 'hour' ? 'active' : ''}`}
                onClick={() => setWhenMode('hour')}
              >
                {t('overview.hour')}
              </button>
            </div>
          </div>

          <div className="chart-legend-row">
            <span className="legend-indicator peak" />
            <span className="legend-text">{t('day.thu')} <strong>23{t('unit.minuteShort')}</strong></span>
          </div>

          <div className="chart-canvas">
            {/* Gridlines */}
            <div className="grid-line" style={{ bottom: '90%' }}>
              <span className="grid-label">23{t('unit.minuteShort')}</span>
            </div>
            <div className="grid-line" style={{ bottom: '48%' }}>
              <span className="grid-label">11{t('unit.minuteShort')}</span>
            </div>
            <div className="grid-line" style={{ bottom: '4%' }}>
              <span className="grid-label">0{t('unit.minuteShort')}</span>
            </div>

            {/* Bars */}
            <div className="bars-container">
              {currentWhenData.map((d, i) => {
                const heightPercent = Math.max(3, (d.minutes / maxWhenMinutes) * 90);
                return (
                  <div key={i} className="bar-column">
                    <div
                      className={`bar-fill ${d.peak ? 'highlight' : ''}`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${d.label}: ${d.minutes}${t('unit.minuteShort')}`}
                    />
                    <span className="bar-axis-label">{d.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Chart: Daily playtime */}
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title-group">
              <h3 className="chart-title">{t('overview.dailyPlaytime')}</h3>
              <p className="chart-subtitle">{t('overview.samplePeriod')}</p>
            </div>

            <div className="pill-controls-row">
              <button className="pill-nav-btn" title={t('common.previous')}>
                <Icon name="chevrons-left" size={14} />
              </button>
              <button className="pill-nav-btn" title={t('common.next')}>
                <Icon name="chevrons-right" size={14} />
              </button>
              <div className="pill-toggle-group">
                <button
                  className={`pill-btn ${dailyRange === '2W' ? 'active' : ''}`}
                  onClick={() => setDailyRange('2W')}
                >
                  2W
                </button>
                <button
                  className={`pill-btn ${dailyRange === '1M' ? 'active' : ''}`}
                  onClick={() => setDailyRange('1M')}
                >
                  1M
                </button>
                <button
                  className={`pill-btn ${dailyRange === '3M' ? 'active' : ''}`}
                  onClick={() => setDailyRange('3M')}
                >
                  3M
                </button>
              </div>
            </div>
          </div>

          <div className="chart-legend-row">
            <span className="legend-indicator peak" />
            <span className="legend-text">{t('overview.total')} <strong>27{t('unit.minuteShort')}</strong></span>
          </div>

          <div className="chart-canvas">
            {/* Gridlines */}
            <div className="grid-line" style={{ bottom: '90%' }}>
              <span className="grid-label">23{t('unit.minuteShort')}</span>
            </div>
            <div className="grid-line" style={{ bottom: '48%' }}>
              <span className="grid-label">11{t('unit.minuteShort')}</span>
            </div>
            <div className="grid-line" style={{ bottom: '4%' }}>
              <span className="grid-label">0{t('unit.minuteShort')}</span>
            </div>

            {/* Bars */}
            <div className="bars-container">
              {dailyData.map((d, i) => {
                const heightPercent = Math.max(3, (d.minutes / maxDailyMinutes) * 90);
                return (
                  <div key={i} className="bar-column">
                    <div
                      className={`bar-fill ${d.peak ? 'highlight' : ''}`}
                      style={{ height: `${heightPercent}%` }}
                      title={`${d.date}: ${d.minutes}${t('unit.minuteShort')}`}
                    />
                    <span className="bar-axis-label">{d.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
