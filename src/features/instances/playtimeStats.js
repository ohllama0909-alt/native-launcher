/**
 * Real playtime bookkeeping for instances.
 *
 * Every number the instance page shows is derived from sessions that actually
 * happened: the launcher reports when the game process starts and exits, and
 * each completed session is appended here. Nothing is seeded, estimated or
 * back-filled.
 *
 * Stored shape (per instance):
 *   statsVersion      2
 *   playtimeSecs      total seconds the game process was alive
 *   sessionCount      number of counted sessions
 *   avgSessionSecs    playtimeSecs / sessionCount, rounded
 *   longestSessionSecs
 *   lastSessionSecs
 *   firstPlayed       epoch ms of the first counted session
 *   lastPlayed        epoch ms the last session ended
 *   playedDays        sorted array of 'YYYY-MM-DD' local dates (capped)
 *   activeDays        playedDays.length
 *   crashCount        sessions that ended without a clean exit
 *   sessions          the most recent SESSION_LOG_LIMIT entries
 */

export const STATS_VERSION = 2;

/** Sessions shorter than this are launch failures, not playtime. */
export const MIN_SESSION_SECS = 10;

/** A single session longer than this means the clock or the process lied. */
export const MAX_SESSION_SECS = 24 * 60 * 60;

export const SESSION_LOG_LIMIT = 60;
const PLAYED_DAYS_LIMIT = 3650;

/** Ids of the demo clusters that used to ship with invented statistics. */
export const SEEDED_INSTANCE_IDS = new Set([
  'cluster-26-2-fabric',
  'cluster-26-1-2-fabric',
  'cluster-1-21-11-fabric',
  'cluster-1-21-1-fabric'
]);

export const EMPTY_STATS = {
  statsVersion: STATS_VERSION,
  playtimeSecs: 0,
  sessionCount: 0,
  avgSessionSecs: 0,
  longestSessionSecs: 0,
  lastSessionSecs: 0,
  crashCount: 0,
  activeDays: 0,
  playedDays: [],
  sessions: [],
  firstPlayed: null,
  lastPlayed: null
};

const toInt = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.floor(number) : 0;
};

/** Local calendar day, so 'active days' matches what the user actually saw. */
export function localDayKey(epochMs) {
  const date = new Date(epochMs);
  if (Number.isNaN(date.getTime())) return null;
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Every day touched by a session, so an overnight session counts for both
 * days rather than only the day it ended.
 */
function daysSpanned(startedAt, endedAt) {
  const keys = [];
  const oneDay = 86400000;
  const startDay = new Date(startedAt);
  startDay.setHours(0, 0, 0, 0);
  for (let cursor = startDay.getTime(); cursor <= endedAt; cursor += oneDay) {
    const key = localDayKey(Math.max(cursor, startedAt));
    if (key && !keys.includes(key)) keys.push(key);
  }
  const endKey = localDayKey(endedAt);
  if (endKey && !keys.includes(endKey)) keys.push(endKey);
  return keys;
}

/**
 * Normalises whatever is on disk into the current stats shape.
 *
 * Instances written by older builds carry invented seed numbers, so anything
 * below STATS_VERSION is reset unless it has a real session log to rebuild
 * from. That keeps genuinely recorded time while dropping the fake figures.
 */
export function normalizeStats(instance) {
  if (!instance) return { ...EMPTY_STATS };

  const sessions = Array.isArray(instance.sessions)
    ? instance.sessions
        .map((session) => ({
          startedAt: toInt(session?.startedAt),
          endedAt: toInt(session?.endedAt),
          secs: toInt(session?.secs),
          crashed: Boolean(session?.crashed),
          recovered: Boolean(session?.recovered)
        }))
        .filter((session) => session.secs >= MIN_SESSION_SECS && session.startedAt > 0)
        .slice(-SESSION_LOG_LIMIT)
    : [];

  const trusted = Number(instance.statsVersion) >= STATS_VERSION;

  // No trustworthy totals, but a real log: rebuild the totals from the log.
  if (!trusted && sessions.length > 0) {
    return sessions.reduce(
      (stats, session) => applySession(stats, session),
      { ...EMPTY_STATS, sessions: [] }
    );
  }

  if (!trusted) {
    return { ...EMPTY_STATS };
  }

  const playtimeSecs = toInt(instance.playtimeSecs);
  const sessionCount = toInt(instance.sessionCount);
  const playedDays = Array.isArray(instance.playedDays)
    ? [...new Set(instance.playedDays.filter((day) => typeof day === 'string'))].sort()
    : [];

  return {
    statsVersion: STATS_VERSION,
    playtimeSecs,
    sessionCount,
    avgSessionSecs: sessionCount > 0 ? Math.round(playtimeSecs / sessionCount) : 0,
    longestSessionSecs: toInt(instance.longestSessionSecs),
    lastSessionSecs: toInt(instance.lastSessionSecs),
    crashCount: toInt(instance.crashCount),
    playedDays: playedDays.slice(-PLAYED_DAYS_LIMIT),
    activeDays: playedDays.length,
    sessions,
    firstPlayed: toInt(instance.firstPlayed) || null,
    lastPlayed: toInt(instance.lastPlayed) || null
  };
}

/** Folds one finished session into a stats object. Pure; returns new stats. */
export function applySession(stats, session) {
  const base = stats?.statsVersion === STATS_VERSION ? stats : { ...EMPTY_STATS };
  const secs = Math.min(toInt(session?.secs), MAX_SESSION_SECS);
  if (secs < MIN_SESSION_SECS) return base;

  const endedAt = toInt(session?.endedAt) || Date.now();
  const startedAt = toInt(session?.startedAt) || endedAt - secs * 1000;

  const playtimeSecs = base.playtimeSecs + secs;
  const sessionCount = base.sessionCount + 1;
  const playedDays = [...new Set([...base.playedDays, ...daysSpanned(startedAt, endedAt)])]
    .sort()
    .slice(-PLAYED_DAYS_LIMIT);

  const entry = {
    startedAt,
    endedAt,
    secs,
    crashed: Boolean(session?.crashed),
    recovered: Boolean(session?.recovered)
  };

  return {
    statsVersion: STATS_VERSION,
    playtimeSecs,
    sessionCount,
    avgSessionSecs: Math.round(playtimeSecs / sessionCount),
    longestSessionSecs: Math.max(base.longestSessionSecs, secs),
    lastSessionSecs: secs,
    crashCount: base.crashCount + (entry.crashed ? 1 : 0),
    playedDays,
    activeDays: playedDays.length,
    sessions: [...base.sessions, entry].slice(-SESSION_LOG_LIMIT),
    firstPlayed: base.firstPlayed || startedAt,
    lastPlayed: endedAt
  };
}

/** Playtime across all instances, plus a rolled-up session total. */
export function summarizeLibrary(instances = []) {
  return instances.reduce(
    (totals, instance) => {
      const stats = normalizeStats(instance);
      const days = new Set([...totals.days, ...stats.playedDays]);
      return {
        playtimeSecs: totals.playtimeSecs + stats.playtimeSecs,
        sessionCount: totals.sessionCount + stats.sessionCount,
        playedInstances: totals.playedInstances + (stats.sessionCount > 0 ? 1 : 0),
        lastPlayed: Math.max(totals.lastPlayed, stats.lastPlayed || 0) || null,
        days,
        activeDays: days.size
      };
    },
    { playtimeSecs: 0, sessionCount: 0, playedInstances: 0, lastPlayed: null, days: new Set(), activeDays: 0 }
  );
}

/** '0m' for untouched instances, so the UI never implies play that never happened. */
export function formatPlaytime(seconds) {
  const total = toInt(seconds);
  if (total < 60) return total > 0 ? `${total}s` : '0m';
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours === 0) return `${minutes}m`;
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
