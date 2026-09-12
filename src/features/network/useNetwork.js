import { useEffect, useRef, useState } from 'react';

// A tiny, no-cors reachability probe. Google's generate_204 endpoint returns an
// empty 204 and is one of the most reliable connectivity checks on the web; in
// no-cors mode we can't read the response, but the fetch *resolving* means the
// request reached a server, which is all we need. The renderer already performs
// external fetches directly (Modrinth, GitHub, mclo.gs…), so there is no CSP in
// the way of this probe.
const PROBE_URL = 'https://www.gstatic.com/generate_204';
const PROBE_TIMEOUT = 5000;
// Poll gently while healthy, and more eagerly while we're trying to recover so
// the indicator clears quickly once the connection comes back.
const STEADY_INTERVAL = 30000;
const RETRY_INTERVAL = 6000;

function readNavigatorOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false;
}

async function probeReachable() {
  try {
    await fetch(PROBE_URL, {
      mode: 'no-cors',
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT)
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Launcher-wide connectivity signal.
 *
 * Combines the browser's own `navigator.onLine` flag (and its online/offline
 * events) with an active reachability probe, because `navigator.onLine` alone
 * only knows whether an interface is up — not whether the internet is actually
 * reachable. Returns `{ status }` where status is:
 *   - `online`   — interface up and the probe succeeded
 *   - `degraded` — interface reports up but the probe failed (DNS / captive
 *                  portal / dead link)
 *   - `offline`  — the browser reports no connection
 */
export default function useNetwork() {
  const [status, setStatus] = useState(() => ({
    online: readNavigatorOnline(),
    reachable: true,
    state: readNavigatorOnline() ? 'online' : 'offline',
    checkedAt: 0
  }));
  const forceRef = useRef(() => {});

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    let running = false;

    const evaluate = async () => {
      if (running) return;
      running = true;
      const online = readNavigatorOnline();
      const reachable = online ? await probeReachable() : false;
      running = false;
      if (cancelled) return;
      const state = !online ? 'offline' : reachable ? 'online' : 'degraded';
      setStatus({ online, reachable, state, checkedAt: Date.now() });
      if (timer) clearTimeout(timer);
      timer = setTimeout(evaluate, state === 'online' ? STEADY_INTERVAL : RETRY_INTERVAL);
    };

    forceRef.current = evaluate;
    evaluate();

    const handleOnline = () => evaluate();
    const handleOffline = () => {
      if (cancelled) return;
      setStatus({ online: false, reachable: false, state: 'offline', checkedAt: Date.now() });
      if (timer) clearTimeout(timer);
      timer = setTimeout(evaluate, RETRY_INTERVAL);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { status, refresh: () => forceRef.current?.() };
}
