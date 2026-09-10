import React from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import { formatLaunchProgress } from './useLauncher.js';
import './LaunchActionButton.css';

export default function LaunchActionButton({
  instance,
  launcherState,
  isInstalled,
  onLaunch,
  onKill,
  className = ''
}) {
  const { t } = useI18n();
  const status = launcherState?.status || 'idle';
  const isRunning = status === 'running' || status === 'game-running';
  const isBusy = Boolean(launcherState?.busy) && !isRunning;
  const isDownloading = status === 'downloading' || launcherState?.phase === 'downloading';
  const mode = isRunning
    ? 'stop'
    : isBusy
      ? isDownloading ? 'download' : 'progress'
      : isInstalled
        ? 'launch'
        : 'install';
  const icon = mode === 'stop'
    ? 'stop'
    : mode === 'launch'
      ? 'play'
      : mode === 'install'
        ? 'arrow-down'
        : 'loader';
  const label = isRunning
    ? t('home.kill')
    : isBusy
      ? formatLaunchProgress(launcherState, t)
      : isInstalled
        ? t('home.launch')
        : t('common.install');
  const percent = Math.max(0, Math.min(100, Number(launcherState?.percent) || 0));

  return (
    <button
      type="button"
      className={`game-action-btn is-${mode} ${className}`.trim()}
      onClick={() => (isRunning ? onKill?.() : onLaunch?.(instance))}
      disabled={isBusy}
    >
      <span className="game-action-icon">
        <NativeIcon name={icon} size={18} className={isBusy ? 'spin' : ''} />
      </span>
      <span className="game-action-label">{label}</span>
      {isBusy && <span className="game-action-pulse" aria-hidden="true" />}
      {isDownloading && percent > 0 && (
        <span className="game-action-progress" style={{ width: `${percent}%` }} aria-hidden="true" />
      )}
    </button>
  );
}
