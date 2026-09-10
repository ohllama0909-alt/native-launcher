import { useEffect, useRef, useState } from 'react';

const IDLE = {
  status: 'idle',
  detail: '',
  percent: 0,
  phase: null,
  task: null,
  total: null,
  bytes: 0,
  size: 0,
  instanceId: null
};
const INSTALLING = new Set(['preparing', 'downloading', 'verifying', 'launching']);

export function useLauncherInstallLock() {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const api = window.native?.launcher;
    if (!api) return undefined;
    return api.onState(({ status }) => {
      const next = INSTALLING.has(status);
      setLocked((current) => (current === next ? current : next));
    });
  }, []);

  return locked;
}

export default function useLauncher() {
  const [state, setState] = useState(IDLE);
  const errorTimer = useRef(null);

  useEffect(() => {
    const api = window.native?.launcher;
    if (!api) return undefined;

    const offState = api.onState(({ status, detail }) => {
      clearTimeout(errorTimer.current);
      const settled = status === 'idle' || status === 'error';
      setState((prev) => ({
        ...(settled ? IDLE : prev),
        status,
        detail,
        percent: settled ? 0 : prev.percent,
        bytes: settled ? 0 : prev.bytes
      }));
      if (status === 'error') {
        errorTimer.current = setTimeout(() => setState(IDLE), 7000);
      }
    });

    const offProgress = api.onProgress(({ percent, detail, phase, task, total, bytes, size }) => {
      setState((prev) => {
        let nextStatus = prev.status;
        if (phase === 'verifying') nextStatus = 'verifying';
        else if (phase === 'launching') nextStatus = 'launching';
        else if (phase === 'downloading') nextStatus = 'downloading';
        else if (prev.status === 'idle' || prev.status === 'preparing') nextStatus = 'downloading';

        return {
          ...prev,
          status: nextStatus,
          percent: typeof percent === 'number' ? percent : prev.percent,
          detail: detail || prev.detail,
          phase: phase ?? prev.phase,
          task: task ?? prev.task,
          total: total ?? prev.total,
          bytes: typeof bytes === 'number' ? bytes : prev.bytes,
          size: typeof size === 'number' ? size : prev.size
        };
      });
    });

    return () => {
      offState();
      offProgress();
      clearTimeout(errorTimer.current);
    };
  }, []);

  const launch = (instance, account) => {
    const api = window.native?.launcher;
    if (!api) {
      setState({ status: 'error', detail: 'Launching only works in the desktop app.', percent: 0 });
      errorTimer.current = setTimeout(() => setState(IDLE), 5000);
      return;
    }
    setState({
      ...IDLE,
      status: 'preparing',
      detail: 'Preparing…',
      instanceId: instance?.id || null
    });
    api.launch(instance, {
      username: account?.name ?? 'Player',
      useMicrosoft: Boolean(account?.isMicrosoft)
    });
  };

  const kill = () => window.native?.launcher?.kill();

  const busy = !['idle', 'error'].includes(state.status);

  return { ...state, launch, kill, busy };
}

/** 1.2 GB / 480 MB / 12.4 KB — sized for a one-line progress readout. */
export function formatBytes(bytes) {
  if (!bytes || bytes < 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

export function formatDownloadSize(bytes) {
  if (!bytes || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function formatLaunchProgress(state, t = (k) => k) {
  if (!state) return t('home.launch');
  const { status, phase, percent, bytes, detail } = state;

  if (status === 'running' || status === 'game-running') {
    return t('home.kill');
  }

  if (status === 'launching' || phase === 'launching') {
    return detail || 'Starting Minecraft…';
  }

  if (status === 'verifying' || phase === 'verifying') {
    const pct = Math.round(percent || 0);
    if (pct > 0 && pct < 100) {
      return `Verifying assets (${pct}%)`;
    }
    return detail || 'Verifying assets…';
  }

  if (status === 'downloading' || phase === 'downloading') {
    const mbText = formatDownloadSize(bytes);
    const pct = Math.round(percent || 0);

    if (mbText) {
      if (pct > 0 && pct < 100) {
        return `Downloading ${pct}% (${mbText})`;
      }
      return `Downloading (${mbText})`;
    }

    if (pct > 0 && pct < 100) {
      return t('home.downloading', { percent: pct });
    }
    return t('home.downloadingPlain');
  }

  if (status === 'preparing') {
    return detail || t('home.preparing');
  }

  return t('home.launch');
}

