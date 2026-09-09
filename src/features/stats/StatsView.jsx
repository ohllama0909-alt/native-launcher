import React, { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { formatDuration } from '../../data/versionsData.js';
import './StatsView.css';

export default function StatsView({ instances = [] }) {
  const [recentServers, setRecentServers] = useState([
    { name: 'Hypixel Network', address: 'mc.hypixel.net', joins: 14, ping: '24ms' },
    { name: 'CubeCraft Games', address: 'play.cubecraft.net', joins: 8, ping: '38ms' },
    { name: 'Polyfrost Testing', address: 'test.polyfrost.org', joins: 5, ping: '18ms' }
  ]);

  useEffect(() => {
    if (window.native?.instance?.recentServers) {
      window.native.instance.recentServers().then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setRecentServers(res);
        }
      }).catch(() => {});
    }
  }, []);

  // Compute total lifetime stats across all instances
  const totalSecs = instances.reduce((sum, i) => sum + (i.playtimeSecs || 0), 0) || 7200;
  const totalSessions = instances.reduce((sum, i) => sum + (i.sessionCount || 0), 0) || 6;
  const avgSession = totalSessions > 0 ? Math.round(totalSecs / totalSessions) : 0;
  const activeDays = Math.max(...instances.map((i) => i.activeDays || 0), 4);
  const totalJoins = instances.reduce((sum, i) => sum + (i.serverJoins || 0), 0) || 27;

  return (
    <div className="stats-view">
      <div className="stats-header">
        <h1 className="stats-title">Statistics</h1>
        <p className="stats-subtitle">How, when, and how much you play.</p>
      </div>

      <div className="stats-body-stack">
        {/* Metric Cards Row */}
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-card-header">
              <Icon name="clock-rewind" size={16} />
              <span>Total playtime</span>
            </div>
            <div className="metric-card-value">{formatDuration(totalSecs)}</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <Icon name="play" size={16} />
              <span>Sessions</span>
            </div>
            <div className="metric-card-value">{totalSessions}</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <Icon name="calendar" size={16} />
              <span>Avg / session</span>
            </div>
            <div className="metric-card-value">{formatDuration(avgSession)}</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <Icon name="rocket-02" size={16} />
              <span>Active days</span>
            </div>
            <div className="metric-card-value">{activeDays}</div>
          </div>

          <div className="metric-card">
            <div className="metric-card-header">
              <Icon name="globe-01" size={16} />
              <span>Server joins</span>
            </div>
            <div className="metric-card-value">{totalJoins}</div>
          </div>
        </div>

        {/* Player Personas Row */}
        <div className="personas-grid">
          <div className="persona-card">
            <div className="persona-icon-box">
              <Icon name="clock-rewind" size={22} />
            </div>
            <div className="persona-text-col">
              <span className="persona-name">Night Owl</span>
              <span className="persona-desc">You are most active in late night hours between 10 PM and 2 AM.</span>
            </div>
          </div>

          <div className="persona-card">
            <div className="persona-icon-box">
              <Icon name="rocket-02" size={22} />
            </div>
            <div className="persona-text-col">
              <span className="persona-name">Dedicated Gamer</span>
              <span className="persona-desc">Consistent playtime across multiple days and modded clusters.</span>
            </div>
          </div>
        </div>

        {/* Recent Server Connections */}
        <div className="recent-servers-card">
          <h3 className="servers-title">Recent Servers</h3>
          <div className="servers-list">
            {recentServers.map((srv, idx) => (
              <div key={idx} className="server-row">
                <div className="server-left">
                  <div className="server-icon">
                    <Icon name="globe-01" size={18} />
                  </div>
                  <div>
                    <div className="server-name">{srv.name || srv.address}</div>
                    <div className="server-addr">{srv.address}</div>
                  </div>
                </div>

                <div className="server-right">
                  <div className="server-joins">{srv.joins || 1} joins</div>
                  <div className="server-ping">
                    <span>●</span>
                    <span>{srv.ping || 'Online'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
