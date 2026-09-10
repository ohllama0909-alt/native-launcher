import { useEffect, useState } from 'react';

/**
 * True when the instance's client jar is on disk.
 *
 * Optimistic: assumes installed in a plain browser and when the check fails, so
 * a working Launch button is never replaced by Install on a bad reading.
 *
 * Pass the launcher status as `settleKey`. The check re-runs whenever it
 * changes, so finishing an install flips the button from Install to Launch
 * without needing an app restart.
 */
export default function useIsInstalled(instance, settleKey) {
  const [installed, setInstalled] = useState(true);
  const version = instance?.mc_version || instance?.version;
  const loader = instance?.mc_loader || instance?.loader || 'Vanilla';

  useEffect(() => {
    if (!version) {
      setInstalled(false);
      return undefined;
    }
    // Do not flash an Install action while the main process checks the disk.
    // A negative result will replace this optimistic state immediately.
    setInstalled(true);
    const api = window.native?.instance;
    if (!api) {
      // Browser previews cannot inspect the desktop installation.
      return undefined;
    }

    let cancelled = false;
    api
      .isInstalled(version, loader)
      .then((result) => {
        if (!cancelled) setInstalled(Boolean(result));
      })
      .catch(() => {
        // A transient IPC failure should not tell an existing user to reinstall.
        if (!cancelled) setInstalled(true);
      });

    return () => {
      cancelled = true;
    };
  }, [version, loader, settleKey]);

  return installed;
}
