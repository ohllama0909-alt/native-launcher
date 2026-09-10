import React, { useEffect, useMemo, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './SettingsPanels.css';

const RELEASES_API =
  'https://api.github.com/repos/ohllama0909-alt/native-launcher/releases?per_page=12';
const RELEASES_PAGE = 'https://github.com/ohllama0909-alt/native-launcher/releases';

function cleanVersion(tag) {
  return String(tag || '').replace(/^v/i, '');
}

/** Very small markdown-ish renderer: headings, bullets, code and links. */
function renderBody(body) {
  const lines = String(body || '')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, index, all) => line || all[index - 1]);

  return lines.slice(0, 40).map((line, index) => {
    const key = index + '-' + line.slice(0, 12);

    if (/^#{1,6}\s/.test(line)) {
      return (
        <h5 key={key} className="cl-body-head">
          {line.replace(/^#{1,6}\s/, '')}
        </h5>
      );
    }

    if (/^[-*]\s/.test(line)) {
      return (
        <div key={key} className="cl-body-item">
          <span className="cl-bullet" />
          <span>{line.replace(/^[-*]\s/, '')}</span>
        </div>
      );
    }

    if (!line.trim()) return <div key={key} className="cl-body-gap" />;

    return (
      <p key={key} className="cl-body-text">
        {line}
      </p>
    );
  });
}

export default function ChangelogPanel({ onOpenUpdater }) {
  const { t, formatDate } = useI18n();
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null);

  const currentVersion = window.native?.version || '';

  useEffect(() => {
    let cancelled = false;

    fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
      .then((response) => {
        if (!response.ok) throw new Error('unavailable');
        return response.json();
      })
      .then((json) => {
        if (cancelled) return;
        const list = Array.isArray(json) ? json : [];
        const mapped = list
          .filter((entry) => !entry.draft)
          .map((entry) => ({
            id: entry.id,
            tag: entry.tag_name,
            version: cleanVersion(entry.tag_name),
            name: entry.name || entry.tag_name,
            date: entry.published_at || entry.created_at,
            prerelease: entry.prerelease,
            body: entry.body || '',
            url: entry.html_url
          }));
        setReleases(mapped);
        setOpenId(mapped[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setError(t('changelog.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const latest = releases[0] || null;
  const upToDate = useMemo(
    () => Boolean(latest && cleanVersion(latest.tag) === currentVersion),
    [latest, currentVersion]
  );

  const openExternal = (url) => {
    if (window.native?.openExternal) window.native.openExternal(url);
  };

  return (
    <div className="cl-panel">
      <div className={'cl-status ' + (upToDate ? 'ok' : 'update')}>
        <div className="cl-status-icon">
          <NativeIcon name={upToDate ? 'check-circle' : 'download'} size={18} />
        </div>

        <div className="cl-status-text">
          <span className="cl-status-title">
            {loading
              ? t('changelog.checking')
              : upToDate
                ? t('changelog.upToDate')
                : latest
                  ? t('changelog.available', { version: latest.version })
                  : t('changelog.notes')}
          </span>
          <span className="cl-status-sub">
            {currentVersion ? t('changelog.running', { version: currentVersion }) : t('changelog.localBuild')}
          </span>
        </div>

        <div className="cl-status-actions">
          {onOpenUpdater && (
            <button type="button" className="sp-ghost-btn" onClick={onOpenUpdater}>
              <NativeIcon name="refresh" size={13} />
              <span>{t('settings.checkUpdates')}</span>
            </button>
          )}
          <button
            type="button"
            className="sp-ghost-btn"
            onClick={() => openExternal(RELEASES_PAGE)}
          >
            <NativeIcon name="external-link" size={13} />
            <span>{t('changelog.allReleases')}</span>
          </button>
        </div>
      </div>

      {loading && <p className="sp-empty">{t('changelog.loading')}</p>}
      {!loading && error && <p className="sp-empty">{error}</p>}
      {!loading && !error && releases.length === 0 && (
        <p className="sp-empty">{t('changelog.noReleases')}</p>
      )}

      <div className="cl-timeline">
        {releases.map((release) => {
          const open = openId === release.id;
          const isCurrent = release.version === currentVersion;

          return (
            <article key={release.id} className={'cl-entry ' + (open ? 'open' : '')}>
              <button
                type="button"
                className="cl-entry-head"
                onClick={() => setOpenId(open ? null : release.id)}
              >
                <span className="cl-dot" />
                <span className="cl-entry-version">{release.version}</span>

                {release.prerelease && <span className="cl-tag beta">{t('changelog.beta')}</span>}
                {isCurrent && <span className="cl-tag current">{t('changelog.installed')}</span>}
                {release === latest && !isCurrent && <span className="cl-tag new">{t('changelog.latest')}</span>}

                <span className="cl-entry-title">{release.name}</span>
                <span className="sp-row-spacer" />
                <span className="cl-entry-date">
                  {release.date ? formatDate(new Date(release.date)) : ''}
                </span>
                <NativeIcon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
              </button>

              {open && (
                <div className="cl-entry-body">
                  {release.body ? renderBody(release.body) : (
                    <p className="cl-body-text">{t('changelog.noNotes')}</p>
                  )}

                  <button
                    type="button"
                    className="sp-ghost-btn"
                    onClick={() => openExternal(release.url)}
                  >
                    <NativeIcon name="external-link" size={13} />
                    <span>{t('changelog.openGitHub')}</span>
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
