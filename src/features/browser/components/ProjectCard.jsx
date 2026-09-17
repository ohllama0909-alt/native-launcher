import React from 'react';
import { ArrowDownToLine, Check, Download, Heart, Loader2, Package, Trash2 } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nProvider.jsx';
import defaultBanner from '../../../assets/backgrounds/Tricky_Trials.jpg';

function formatDownloads(count) {
  const value = Number(count) || 0;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

export default function ProjectCard({
  project,
  contentType,
  isVanillaInstance,
  isInstalled,
  isBusy,
  packProgress,
  onSelect,
  onInstall,
  onRemove
}) {
  const { t } = useI18n();

  const projectId = project.project_id || project.id;
  const bannerUrl =
    project.featured_gallery ||
    project.gallery?.[0]?.url ||
    (Array.isArray(project.featured_gallery_images) && project.featured_gallery_images[0]) ||
    defaultBanner;

  const categories = (project.display_categories || project.categories || []).slice(0, 3);
  const isModOnVanilla = (contentType?.id === 'mod' || !contentType) && isVanillaInstance;

  const handleActionClick = (e) => {
    e.stopPropagation();
    if (isModOnVanilla) return;
    if (isInstalled) {
      onRemove?.(project);
    } else {
      onInstall?.(project);
    }
  };

  return (
    <div
      className={`browse-card ${isInstalled ? 'is-installed' : ''}`}
      onClick={() => onSelect?.(project)}
      tabIndex={0}
      role="article"
      aria-label={project.title}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect?.(project);
        }
      }}
    >
      {/* Banner / Card Header */}
      <div className="browse-card-banner-wrap">
        <img
          src={bannerUrl}
          alt=""
          className="browse-card-banner"
          loading="lazy"
          onError={(e) => {
            if (e.currentTarget.src !== defaultBanner) {
              e.currentTarget.src = defaultBanner;
            }
          }}
        />
        <div className="browse-card-banner-scrim" />

        {/* Project Icon */}
        <div className="browse-card-icon-wrap">
          {project.icon_url ? (
            <img
              src={project.icon_url}
              alt=""
              className="browse-card-icon"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="browse-card-icon-placeholder">
              <Package size={22} />
            </div>
          )}
        </div>

        {/* Installed Badge if already in instance */}
        {isInstalled && (
          <div className="browse-card-installed-badge">
            <Check size={11} />
            <span>Installed</span>
          </div>
        )}
      </div>

      {/* Card Body */}
      <div className="browse-card-body">
        <div className="browse-card-header-meta">
          <h3 className="browse-card-title" title={project.title}>
            {project.title}
          </h3>
          {project.author && (
            <span className="browse-card-author">by {project.author}</span>
          )}
        </div>

        <p className="browse-card-desc">
          {project.description || 'No description provided.'}
        </p>

        {/* Category tags */}
        {categories.length > 0 && (
          <div className="browse-card-chips">
            {categories.map((cat) => (
              <span key={cat} className="browse-card-chip">
                {cat.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {/* Card Footer: Mono Stats + Install Button */}
        <div className="browse-card-footer">
          <div className="browse-card-stats">
            <span className="browse-stat" title={`${project.downloads || 0} downloads`}>
              <Download size={12} className="browse-stat-icon" />
              <span className="browse-stat-mono">{formatDownloads(project.downloads)}</span>
            </span>
            <span className="browse-stat" title={`${project.follows || 0} followers`}>
              <Heart size={12} className="browse-stat-icon" />
              <span className="browse-stat-mono">{formatDownloads(project.follows)}</span>
            </span>
          </div>

          <div className="browse-card-actions">
            {isModOnVanilla ? (
              <button
                type="button"
                className="browse-btn browse-btn-install is-disabled-vanilla"
                disabled
                title="Minecraft Vanilla does not support mods"
              >
                Vanilla (No Mods)
              </button>
            ) : isBusy ? (
              <button type="button" className="browse-btn browse-btn-busy" disabled>
                <Loader2 size={13} className="browse-spin-icon" />
                <span>
                  {packProgress ? `${Math.round(packProgress.percent || 0)}%` : 'Installing…'}
                </span>
              </button>
            ) : isInstalled ? (
              <button
                type="button"
                className="browse-btn browse-btn-installed"
                onClick={handleActionClick}
                title="Remove from instance"
              >
                <span className="browse-btn-text-installed">
                  <Check size={13} /> Installed
                </span>
                <span className="browse-btn-text-remove">
                  <Trash2 size={13} /> Remove
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="browse-btn browse-btn-install"
                onClick={handleActionClick}
              >
                <ArrowDownToLine size={13} />
                <span>Install</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
