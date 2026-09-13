# Real playtime and instance statistics

## What was wrong

The instance page showed numbers that were never measured. `INITIAL_CLUSTERS`
in `src/data/versionsData.js` shipped four demo clusters with hand-written
statistics, and `useInstances` used that array as its default state:

```js
playtimeSecs: 1620, // 27m
sessionCount: 2,
avgSessionSecs: 780, // 13m
activeDays: 2,
serverJoins: 2,
lastPlayed: Date.now() - 3600000 * 2
```

So a fresh install already claimed "27m" of play on Chaos Cubed. Nothing ever
called `recordSession`, so the figures could only ever be the seeded ones.

## What it does now

| Stat | Source |
| --- | --- |
| `playtimeSecs` | sum of seconds the Minecraft process was alive |
| `sessionCount` | number of sessions of at least 10s |
| `avgSessionSecs` | `playtimeSecs / sessionCount` |
| `longestSessionSecs`, `lastSessionSecs` | from the session log |
| `activeDays` | distinct local calendar days in `playedDays` |
| `crashCount` | sessions that ended without a clean exit |
| `firstPlayed`, `lastPlayed` | first and last session boundaries |
| `sessions` | the 60 most recent `{ startedAt, endedAt, secs, crashed }` |
| `serverJoins` | `0` until something actually counts joins |

The clock starts when the launcher reports the game process **running** and
stops when it reports it gone, so downloads, asset verification and failed
launches never count as playtime. Sessions under 10s are discarded as launch
failures; a single session is capped at 24h.

Three files carry this:

- `src/features/instances/playtimeStats.js` - pure stats engine:
  `normalizeStats`, `applySession`, `summarizeLibrary`, `formatPlaytime`.
- `src/features/instances/usePlaytimeTracker.js` - watches launcher state,
  times sessions, survives crashes.
- `src/features/instances/useInstances.js` - persistence, the migration, and
  `recordSession` / `resetStats` / `totals`.

## Crash safety

The open session is mirrored to `localStorage` under `native.playtime.pending`
and refreshed every 30s. If the client is killed, the machine loses power, or
the renderer reloads mid-session, the next start credits the time up to the
last heartbeat and marks the session `crashed: true, recovered: true`. Worst
case you lose 30 seconds, not the session. Quitting the client while the game
is still running flushes the session on `beforeunload`.

## Migration

Automatic, on first load, in `hydrate()`:

1. Instances are stamped with `statsVersion: 2`.
2. Anything below version 2 with **no** session log has its statistics reset to
   zero - this is what clears the fake 27m.
3. Anything below version 2 **with** a session log has its totals rebuilt from
   that log, so genuinely recorded time survives.
4. The four seeded demo ids (`cluster-26-2-fabric`, `cluster-26-1-2-fabric`,
   `cluster-1-21-11-fabric`, `cluster-1-21-1-fabric`) are always zeroed on
   first load, since their numbers were invented.
5. `DEFAULT_DATA` is now empty, so a new install shows the real empty state
   instead of four pre-played demo clusters.

No user action and no command are needed. `instances.json` is rewritten in
place the first time the app loads. To roll back, restore that file from a
backup; old builds ignore the new keys.

Stats are also now write-protected: `create`, `add`, `update` and `duplicate`
strip every stat key, so a rename, a settings change or an import can't inject
playtime. Duplicating an instance starts it at zero.

### Clearing history by hand

```js
const { resetStats } = useInstances();
resetStats(instanceId); // zeroes one instance, keeps the instance itself
```

Or delete `instances.json` (Noctra data dir) to start from nothing.

## Wiring

`useInstances` already exposes everything; the tracker needs one line where
the launcher and instances hooks already live together (`src/App.jsx`):

```jsx
import usePlaytimeTracker from './features/instances/usePlaytimeTracker.js';

const instances = useInstances(initialData);
const launcher = useLauncher();

// Records a real session every time the game process exits.
usePlaytimeTracker(instances.recordSession, { launcherState: launcher });
```

For the library summary line, prefer the measured totals:

```jsx
const { playtimeSecs, sessionCount, activeDays } = instances.totals;
```

`InstancesView` needs no change: it already renders `instance.playtimeSecs`
and `instance.lastPlayed`, which are now real. For accuracy on the seeded demo
clusters, `INITIAL_CLUSTERS` should keep only presentation fields (`id`,
`name`, `version`, `loader`, `artKey`, `art`, `description`, `tags`); its
`playtimeSecs`, `sessionCount`, `avgSessionSecs`, `activeDays`, `serverJoins`
and `lastPlayed` keys are now ignored at load time and can be deleted.
