import { useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  DownloadCloud,
  Gauge,
  Loader2,
  RefreshCw,
  Rocket,
  ShieldCheck,
  Sparkles,
  X
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import './UpdateCenter.css';

const BUSY_TYPES = new Set(['checking', 'preparing', 'downloading', 'installing']);

export default function UpdateCenter({ open, onClose, status, onCheck, onDownload, onCancel, onInstall }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const notesHtml = useMemo(() => renderReleaseNotes(status.releaseNotes), [status.releaseNotes]);
  if (!open) return null;

  const percent = Math.round(status.percent ?? 0);
  const eta = getEta(status.total, status.transferred, status.bytesPerSecond);
  const checking = status.type === 'checking';
  const busy = BUSY_TYPES.has(status.type);

  const openExternalLink = (event) => {
    const anchor = event.target.closest('a');
    if (!anchor?.href) return;
    event.preventDefault();
    window.native?.openExternal(anchor.href);
  };

  return (
    <div className="uc-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="update-center" role="dialog" aria-modal="true" aria-labelledby="uc-title">
        <header className="uc-head">
          <div className="uc-brand">
            <span className="uc-brand-icon"><Rocket size={19} /></span>
            <span>
              <small>Native</small>
              <strong id="uc-title">Update Center</strong>
            </span>
          </div>
          <button className="uc-close" onClick={onClose} aria-label="Close update center">
            <X size={17} />
          </button>
        </header>

        <div className="uc-body">
          <StatusHero status={status} percent={percent} />

          {status.type === 'downloading' && (
            <div className="uc-download-card">
              <div className="uc-progress-labels">
                <span>{status.optimized ? 'Optimized patch' : 'Update package'}</span>
                <strong>{percent}%</strong>
              </div>
              <div className="uc-progress" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
                <div className="uc-progress-fill" style={{ width: `${percent}%` }} />
              </div>
              <div className="uc-transfer-grid">
                <span>{formatBytes(status.transferred)} / {formatBytes(status.total)}</span>
                <span>{formatSpeed(status.bytesPerSecond)}</span>
                <span>{eta}</span>
              </div>
              {status.optimized && (
                <p className="uc-smart-note">
                  <Sparkles size={13} /> Reusing files already on this PC—only changed blocks are downloading.
                </p>
              )}
            </div>
          )}

          {status.type === 'available' && (
            <>
              <div className="uc-version-row">
                <VersionBadge label="Installed" version={status.currentVersion} />
                <span className="uc-version-arrow">→</span>
                <VersionBadge label="Available" version={status.version} accent />
              </div>
              <div className="uc-benefits">
                <span><Gauge size={14} /> Differential downloads</span>
                <span><ShieldCheck size={14} /> Verified before install</span>
                {status.fullSize > 0 && <span><DownloadCloud size={14} /> {formatBytes(status.fullSize)} full package</span>}
              </div>
              <div className="uc-notes">
                <h3>What’s new</h3>
                {notesHtml ? (
                  <div className="uc-notes-content" onClick={openExternalLink} dangerouslySetInnerHTML={{ __html: notesHtml }} />
                ) : (
                  <p className="uc-notes-empty">Performance improvements and launcher updates.</p>
                )}
              </div>
            </>
          )}

          {status.type === 'error' && (
            <div className="uc-error-box">
              <AlertTriangle size={16} />
              <span>{status.message || 'The update could not be completed.'}</span>
            </div>
          )}
        </div>

        <footer className="uc-footer">
          <span className="uc-footer-version">Current version {status.currentVersion ?? window.native?.version ?? '—'}</span>
          <div className="uc-actions">
            {status.type === 'available' && (
              <>
                <button className="uc-btn uc-btn--ghost" onClick={onClose}>Later</button>
                <button className="uc-btn uc-btn--primary" onClick={onDownload}>
                  <DownloadCloud size={15} /> Download update
                </button>
              </>
            )}
            {status.type === 'downloaded' && (
              <>
                <button className="uc-btn uc-btn--ghost" onClick={onClose}>Restart later</button>
                <button className="uc-btn uc-btn--primary" onClick={onInstall}>
                  <RefreshCw size={15} /> Restart &amp; install
                </button>
              </>
            )}
            {status.type === 'error' && (
              <>
                <button className="uc-btn uc-btn--ghost" onClick={onClose}>Close</button>
                <button className="uc-btn uc-btn--primary" onClick={status.operation === 'download' ? onDownload : onCheck}>
                  <RefreshCw size={15} /> Retry
                </button>
              </>
            )}
            {['preparing', 'downloading'].includes(status.type) && (
              <button className="uc-btn uc-btn--ghost" onClick={onCancel}>
                <X size={15} /> Cancel download
              </button>
            )}
            {status.type === 'installing' && (
              <button className="uc-btn uc-btn--primary" disabled>
                <Loader2 size={15} className="spin" /> Applying update…
              </button>
            )}
            {['idle', 'checking', 'not-available', 'disabled'].includes(status.type) && (
              <button className="uc-btn uc-btn--primary" onClick={onCheck} disabled={busy || status.type === 'disabled'}>
                {checking ? <Loader2 size={15} className="spin" /> : <RefreshCw size={15} />}
                {checking ? 'Checking…' : 'Check for updates'}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}

function StatusHero({ status, percent }) {
  const states = {
    idle: { icon: <ShieldCheck />, title: 'Updates handled automatically', text: 'Native checks quietly and lets you choose when to install.' },
    disabled: { icon: <ShieldCheck />, title: 'Desktop updates', text: status.message || 'Update checks are available in packaged builds.' },
    checking: { icon: <Loader2 className="spin" />, title: 'Checking for updates', text: 'Looking for the newest stable release…' },
    'not-available': { icon: <CheckCircle2 />, title: 'You’re up to date', text: `Native ${status.currentVersion ?? ''} is the newest version.` },
    available: { icon: <Sparkles />, title: `Native ${status.version} is ready`, text: 'Review what changed, then update when you’re ready.' },
    preparing: { icon: <Loader2 className="spin" />, title: 'Preparing smart download', text: 'Comparing this release with the files already installed…' },
    downloading: { icon: <DownloadCloud />, title: `Downloading ${percent}%`, text: status.optimized ? 'Only changed parts are being downloaded.' : 'Downloading and verifying the update package.' },
    downloaded: { icon: <CheckCircle2 />, title: 'Update ready to install', text: `Native ${status.version} is verified. Restart to apply it.` },
    installing: { icon: <Loader2 className="spin" />, title: 'Restarting Native', text: 'The update will be applied in a moment…' },
    error: { icon: <AlertTriangle />, title: 'Update interrupted', text: 'Nothing was installed. Check your connection and try again.' }
  };
  const content = states[status.type] ?? states.idle;
  return (
    <div className={`uc-hero uc-hero--${status.type}`}>
      <span className="uc-hero-icon">{content.icon}</span>
      <div><h2>{content.title}</h2><p>{content.text}</p></div>
    </div>
  );
}

function VersionBadge({ label, version, accent = false }) {
  return (
    <div className={`uc-version${accent ? ' uc-version--accent' : ''}`}>
      <small>{label}</small><strong>v{version ?? '—'}</strong>
    </div>
  );
}

function renderReleaseNotes(notes) {
  let raw = '';
  if (Array.isArray(notes)) {
    raw = notes.map((entry) => entry?.note ?? entry?.notes ?? '').filter(Boolean).join('\n\n');
  } else {
    raw = String(notes ?? '');
  }
  raw = raw.replace(/\\n/g, '\n').trim();
  if (!raw) return '';
  return DOMPurify.sanitize(marked.parse(raw));
}

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes <= 0) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const unit = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const amount = bytes / (1024 ** unit);
  return `${amount.toFixed(unit >= 2 ? 1 : 0)} ${units[unit]}`;
}

function formatSpeed(value) {
  return value > 0 ? `${formatBytes(value)}/s` : 'Calculating speed…';
}

function getEta(total, transferred, speed) {
  if (!total || !speed) return 'Estimating time…';
  const seconds = Math.max(0, Math.ceil((total - transferred) / speed));
  if (seconds < 60) return `${seconds}s remaining`;
  return `${Math.ceil(seconds / 60)}m remaining`;
}
