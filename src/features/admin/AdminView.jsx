import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Copy,
  Database,
  HardDrive,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCheck,
  UsersRound
} from 'lucide-react';
import { BADGE_DEFS } from '../social/Badges.jsx';
import './AdminView.css';

const formatNumber = (value) => Number(value || 0).toLocaleString();

function formatBytes(bytes = 0) {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(0, Math.round(bytes / 1024))} KB`;
}

function formatDate(value, empty = 'Never') {
  if (!value) return empty;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? empty : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function InitialAvatar({ name }) {
  const letters = String(name || '?').slice(0, 2).toUpperCase();
  const hue = [...String(name || '')].reduce((sum, character) => sum + character.charCodeAt(0), 0) % 360;
  return <span className="admin-user-avatar" style={{ '--avatar-hue': hue }}>{letters}</span>;
}

function StatCard({ icon: Icon, label, value, detail, tone = '' }) {
  return (
    <article className={`admin-stat ${tone ? `is-${tone}` : ''}`}>
      <span><Icon size={18}/></span>
      <div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div>
    </article>
  );
}

function BadgeControl({ badgeId, active, busy, onToggle }) {
  const badge = BADGE_DEFS[badgeId];
  if (!badge) return null;
  return (
    <button
      type="button"
      className={`admin-badge-toggle${active ? ' is-active' : ''}`}
      disabled={busy}
      onClick={() => onToggle(badgeId, !active)}
      aria-pressed={active}
      title={`${active ? 'Revoke' : 'Grant'} ${badge.name}`}
    >
      {badge.icon}
      <span>{badge.name}</span>
    </button>
  );
}

export default function AdminView({ onNotify, onAccessRevoked }) {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [busyBadge, setBusyBadge] = useState('');

  const loadOverview = useCallback(async () => {
    const result = await window.native?.admin?.overview?.();
    if (!result?.ok) {
      if (/administrator|session|required/i.test(result?.error || '')) onAccessRevoked?.();
      throw new Error(result?.error || 'Could not load database overview.');
    }
    setOverview(result.overview);
  }, [onAccessRevoked]);

  const loadUsers = useCallback(async (requestedPage = page, requestedQuery = query) => {
    const result = await window.native?.admin?.listUsers?.({
      query: requestedQuery,
      page: requestedPage,
      pageSize: 50
    });
    if (!result?.ok) {
      if (/administrator|session|required/i.test(result?.error || '')) onAccessRevoked?.();
      throw new Error(result?.error || 'Could not load users.');
    }
    setUsers(result.users || []);
    setPage(result.page || 1);
    setPagination({ total: result.total || 0, totalPages: result.totalPages || 1 });
  }, [onAccessRevoked, page, query]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const result = await window.native?.admin?.listUsers?.({ query, page: 1, pageSize: 50 });
        if (!result?.ok) throw new Error(result?.error || 'Could not load users.');
        if (!cancelled) {
          setUsers(result.users || []);
          setPage(result.page || 1);
          setPagination({ total: result.total || 0, totalPages: result.totalPages || 1 });
        }
      } catch (reason) {
        if (!cancelled) {
          setError(reason?.message || 'Could not load users.');
          if (/administrator|session|required/i.test(reason?.message || '')) onAccessRevoked?.();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, query ? 240 : 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, onAccessRevoked]);

  useEffect(() => {
    loadOverview().catch((reason) => setError(reason?.message || 'Could not load admin overview.'));
  }, [loadOverview]);

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setError('');
    try { await Promise.all([loadOverview(), loadUsers()]); }
    catch (reason) { setError(reason?.message || 'Could not refresh the control room.'); }
    finally { setRefreshing(false); }
  };

  const changePage = async (nextPage) => {
    if (loading || nextPage < 1 || nextPage > pagination.totalPages) return;
    setLoading(true);
    setError('');
    try { await loadUsers(nextPage, query); }
    catch (reason) { setError(reason?.message || 'Could not load that page.'); }
    finally { setLoading(false); }
  };

  const toggleBadge = async (user, badge, granted) => {
    const busyKey = `${user.id}:${badge}`;
    setBusyBadge(busyKey);
    setError('');
    try {
      const result = await window.native?.admin?.setBadge?.(user.id, badge, granted);
      if (!result?.ok) throw new Error(result?.error || 'Could not update badge.');
      setUsers((current) => current.map((entry) => entry.id === user.id ? { ...entry, badges: result.user.badges || [] } : entry));
      onNotify?.(granted ? 'Badge granted' : 'Badge revoked', `${BADGE_DEFS[badge].name} · ${user.username}`);
    } catch (reason) {
      setError(reason?.message || 'Could not update badge.');
    } finally {
      setBusyBadge('');
    }
  };

  const tableRows = useMemo(() => overview?.database?.tables || [], [overview]);

  return (
    <main className="admin-view">
      <header className="admin-header">
        <div className="admin-title-lockup">
          <span className="admin-mark"><ShieldCheck size={24}/></span>
          <div><span className="admin-eyebrow">ADMIN ONLY</span><h1>Control room</h1><p>Monitor Noctra and manage player access badges.</p></div>
        </div>
        <button className="admin-refresh" onClick={refresh} disabled={refreshing}>
          <RefreshCw size={15} className={refreshing ? 'is-spinning' : ''}/> Refresh data
        </button>
      </header>

      {error && <div className="admin-error" role="alert"><span>{error}</span><button onClick={refresh}>Try again</button></div>}

      <section className="admin-stats" aria-label="Database statistics">
        <StatCard icon={UsersRound} label="Registered users" value={formatNumber(overview?.users)} detail={`${formatNumber(overview?.activeSessions)} active sessions`} tone="purple"/>
        <StatCard icon={Activity} label="Online now" value={formatNumber(overview?.onlineUsers)} detail="Real authenticated presence" tone="green"/>
        <StatCard icon={MessageSquareText} label="Relay messages" value={formatNumber(overview?.messages)} detail={`${formatNumber(overview?.groups)} groups`} tone="blue"/>
        <StatCard icon={HardDrive} label="Database size" value={formatBytes(overview?.database?.sizeBytes)} detail={`${overview?.database?.engine || 'SQLite'} · ${overview?.database?.journalMode || '—'}`} tone="gold"/>
      </section>

      <div className="admin-workspace">
        <section className="admin-db-panel">
          <header><span><Database size={17}/></span><div><h2>Database</h2><p>Sanitized table overview</p></div></header>
          <div className="admin-db-health"><i/><span><strong>Healthy</strong><small>Checked {formatDate(overview?.database?.checkedAt, 'just now')}</small></span></div>
          <div className="admin-table-list">
            {tableRows.map((table) => <div key={table.name}><code>{table.name}</code><strong>{formatNumber(table.rows)}</strong></div>)}
          </div>
          <footer><ShieldCheck size={13}/><span>Secrets and password data are never exposed.</span></footer>
        </section>

        <section className="admin-users-panel">
          <header className="admin-users-heading">
            <div><span className="admin-section-icon"><UserRoundCheck size={18}/></span><span><h2>Users</h2><p>{formatNumber(pagination.total)} accounts · badge management</p></span></div>
            <label className="admin-search"><Search size={14}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search username, email, or ID…"/></label>
          </header>

          <div className="admin-user-columns" aria-hidden="true"><span>Player</span><span>Activity</span><span>Badges</span></div>
          <div className="admin-user-list" aria-busy={loading}>
            {loading && !users.length ? (
              <div className="admin-loading"><LoaderCircle size={22} className="is-spinning"/><span>Loading secure user records…</span></div>
            ) : users.length ? users.map((user) => (
              <article className="admin-user-row" key={user.id}>
                <div className="admin-user-identity">
                  <InitialAvatar name={user.username}/>
                  <span><strong>{user.username}{user.isAdmin && <em><ShieldCheck size={10}/> Admin</em>}</strong><small>{user.email}</small><button onClick={() => navigator.clipboard?.writeText(user.id)} title="Copy user ID"><code>{user.id}</code><Copy size={10}/></button></span>
                </div>
                <div className="admin-user-activity">
                  <span className={`admin-presence is-${user.status || 'offline'}`}><i/>{user.status || 'offline'}</span>
                  <small>Joined {formatDate(user.createdAt)}</small>
                  <small>{formatNumber(user.friendCount)} friends · {formatNumber(user.groupCount)} groups · {formatNumber(user.messageCount)} messages</small>
                </div>
                <div className="admin-user-badges">
                  {Object.keys(BADGE_DEFS).map((badgeId) => (
                    <BadgeControl
                      key={badgeId}
                      badgeId={badgeId}
                      active={(user.badges || []).includes(badgeId)}
                      busy={Boolean(busyBadge)}
                      onToggle={(badge, granted) => toggleBadge(user, badge, granted)}
                    />
                  ))}
                </div>
              </article>
            )) : <div className="admin-loading"><Search size={22}/><span>No users match “{query}”.</span></div>}
          </div>

          <footer className="admin-pagination">
            <span>Page {page} of {pagination.totalPages}</span>
            <div><button onClick={() => changePage(page - 1)} disabled={loading || page <= 1} aria-label="Previous page"><ChevronLeft size={15}/></button><button onClick={() => changePage(page + 1)} disabled={loading || page >= pagination.totalPages} aria-label="Next page"><ChevronRight size={15}/></button></div>
          </footer>
        </section>
      </div>
    </main>
  );
}
