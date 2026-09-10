import React from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { formatDownloadSize, formatLaunchProgress } from './useLauncher.js';
import './LaunchActionButton.css';

/**
 * The one action button for a game install: Install, Download, Verify, Launch
 * and Stop are the same control in different states, so the shape, spacing and
 * colour language stay identical everywhere it appears (home hero, instance
 * cards, version picker).
 *
 * `size` — 'lg' hero · 'md' cards · 'sm' sidebars and dense rows.
 */
export default function LaunchActionButton({
  instance,
  launcherState,
  isInstalled,
  onLaunch,
  onKill,
  size = 'lg',
  installLabel = null,
  className = ''
}) {
  const { t } = useI18n();

  const status = launcherState?.status || 'idle';
  const phase = launcherState?.phase || null;
  const isRunning = status === 'running' || status === 'game-running';
  const isBusy = Boolean(launcherState?.busy) && !isRunning;
  const isVerifying = status === 'verifying' || phase === 'verifying';
  const isDownloading = !isVerifying && (status === 'downloading' || phase === 'downloading');

  const mode = isRunning
    ? 'stop'
    : isBusy
      ? isVerifying
        ? 'verify'
        : isDownloading
          ? 'download'
          : 'progress'
      : isInstalled
        ? 'launch'
        : 'install';

  const icon = {
    stop: 'stop',
    launch: 'play',
    install: 'arrow-down',
    download: 'download',
    verify: 'shield',
    progress: 'loader'
  }[mode];

  const label = isRunning
    ? t('home.kill')
    : isBusy
      ? formatLaunchProgress(launcherState, t)
      : isInstalled
        ? t('home.launch')
        : installLabel || t('common.install');

  const percent = Math.max(0, Math.min(100, Number(launcherState?.percent) || 0));
  const busyDetail = isBusy ? (launcherState?.detail || launcherState?.task || '') : '';
  const sublabel = isDownloading
    ? formatDownloadSize(launcherState?.bytes)
    : isBusy && busyDetail && busyDetail !== label
      ? busyDetail
      : null;

  return (
    <button
      type="button"
      className={`launch-action size-${size} is-${mode}${sublabel ? ' has-sub' : ''} ${className}`.trim()}
      style={{ '--progress': `${percent}%` }}
      onClick={() => (isRunning ? onKill?.() : onLaunch?.(instance))}
      disabled={isBusy}
      aria-busy={isBusy}
      aria-label={label}
      title={label}
    >
      <span className="launch-action-icon">
        <NativeIcon name={icon} size={size === 'sm' ? 15 : size === 'md' ? 17 : 19} className={isBusy ? 'spin' : ''} />
      </span>

      <span className="launch-action-text">
        <span className="launch-action-label">{label}</span>
        {sublabel ? <span className="launch-action-sub">{sublabel}</span> : null}
      </span>

      {(mode === 'download' || mode === 'verify') && (
        <span className="launch-action-track" aria-hidden="true">
          <span className="launch-action-fill" />
        </span>
      )}
    </button>
  );
}
