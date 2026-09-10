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
  const [installed, setInstalled] = useState(false);
  const version = instance?.mc_version || instance?.version;
  const loader = instance?.mc_loader || instance?.loader || 'Vanilla';

  useEffect(() => {
    if (!version) {
      setInstalled(false);
      return undefined;
    }
    const api = window.native?.instance;
    if (!api) {
      // In web browser mock mode, assume uninstalled unless specifically in web preview
      setInstalled(false);
      return undefined;
    }

    let cancelled = false;
    api
      .isInstalled(version, loader)
      .then((result) => {
        if (!cancelled) setInstalled(Boolean(result));
      })
      .catch(() => {
        if (!cancelled) setInstalled(false);
      });

    return () => {
      cancelled = true;
    };
  }, [version, loader, settleKey]);

  return installed;
}
