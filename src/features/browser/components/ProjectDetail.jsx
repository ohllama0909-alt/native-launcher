import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeft,
  Check,
  Code2,
  Download,
  ExternalLink,
  FolderGit2,
  Heart,
  Layers,
  Loader2,
  Package,
  Shield,
  Trash2,
  X
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import useProjectDetail from '../hooks/useProjectDetail.js';
import VersionPicker from './VersionPicker.jsx';
import { useI18n } from '../../../i18n/I18nProvider.jsx';

function formatDownloads(count) {
  const value = Number(count) || 0;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

export default function ProjectDetail({
  project,
  activeType,
  target,
  isVanillaInstance,
  isInstalled,
  isBusy,
  onBack,
  onInstall,
  onInstallVersion,
  onRemove,
  versionMatchesTarget
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'versions'
  const [lightboxImg, setLightboxImg] = useState(null);

  const { data: detailData, versions, loading } = useProjectDetail(project, { versionLimit: 30 });

  const record = detailData || project;
  const projectId = project.project_id || project.id;
  const isModOnVanilla = activeType?.id === 'mod' && isVanillaInstance;

  const bannerUrl =
    record.featured_gallery ||
    record.gallery?.[0]?.url ||
    project.featured_gallery ||
    null;

  const renderedMarkdown = useMemo(() => {
    const raw = record.body || record.description || '';
    if (!raw) return '';
    try {
      const dirty = marked.parse(raw);
      return DOMPurify.sanitize(dirty);
    } catch {
      return raw;
    }
  }, [record.body, record.description]);

  const galleryImages = record.gallery || [];

  const openExternal = (url) => {
    if (!url) return;
    if (window.native?.openExternal) {
      window.native.openExternal(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="browse-detail-view" role="region" aria-label={record.title}>
      {/* Detail Top Navigation */}
      <div className="browse-detail-topbar">
        <button
          type="button"
          className="browse-detail-back-btn"
          onClick={onBack}
          aria-label="Back to results"
        >
          <ArrowLeft size={16} />
          <span>Back to results</span>
        </button>

        <div className="browse-detail-tabs">
          <button
            type="button"
            className={`browse-detail-tab-btn ${activeTab === 'overview' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            type="button"
            className={`browse-detail-tab-btn ${activeTab === 'versions' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('versions')}
          >
            Versions ({versions.length})
          </button>
        </div>
      </div>

      {/* Hero Header Banner */}
      <div className="browse-detail-hero">
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="browse-detail-hero-banner" />
        ) : (
          <div className="browse-detail-hero-fallback" />
        )}
        <div className="browse-detail-hero-scrim" />

        <div className="browse-detail-hero-content">
          <div className="browse-detail-icon-wrap">
            {record.icon_url ? (
              <img src={record.icon_url} alt="" className="browse-detail-icon" />
            ) : (
              <div className="browse-detail-icon-placeholder">
                <Package size={36} />
              </div>
            )}
          </div>

          <div className="browse-detail-title-block">
            <div className="browse-detail-title-row">
              <h1 className="browse-detail-title">{record.title}</h1>
              {isInstalled && (
                <span className="browse-detail-installed-pill">
                  <Check size={12} /> Installed
                </span>
              )}
            </div>

            {record.author && (
              <span className="browse-detail-author">by {record.author}</span>
            )}

            <p className="browse-detail-summary">{record.description}</p>

            <div className="browse-detail-meta-pills">
              <span className="browse-meta-pill">
                <Download size={12} />
                <span>{formatDownloads(record.downloads)} downloads</span>
              </span>
              <span className="browse-meta-pill">
                <Heart size={12} />
                <span>{formatDownloads(record.followers || record.follows)} stars</span>
              </span>
              {record.license?.id && (
                <span className="browse-meta-pill">
                  <Shield size={12} />
                  <span>{record.license.id}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="browse-detail-actionbar">
        <div className="browse-detail-actionbar-left">
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
              <Loader2 size={14} className="browse-spin-icon" />
              <span>Installing…</span>
            </button>
          ) : isInstalled ? (
            <button
              type="button"
              className="browse-btn browse-btn-danger"
              onClick={() => onRemove?.(project)}
            >
              <Trash2 size={14} />
              <span>Remove from instance</span>
            </button>
          ) : (
            <button
              type="button"
              className="browse-btn browse-btn-install is-large"
              onClick={() => onInstall?.(project)}
            >
              <ArrowDownToLine size={15} />
              <span>Install to {target?.name || 'Instance'}</span>
            </button>
          )}

          <button
            type="button"
            className="browse-btn browse-btn-secondary"
            onClick={() => setActiveTab('versions')}
          >
            <Layers size={14} />
            <span>Choose Version</span>
          </button>
        </div>

        <div className="browse-detail-actionbar-right">
          {record.source_url && (
            <button
              type="button"
              className="browse-btn browse-btn-ghost"
              onClick={() => openExternal(record.source_url)}
              title="View source code"
            >
              <FolderGit2 size={14} />
              <span>Source</span>
            </button>
          )}

          {record.issues_url && (
            <button
              type="button"
              className="browse-btn browse-btn-ghost"
              onClick={() => openExternal(record.issues_url)}
              title="Issue tracker"
            >
              <Code2 size={14} />
              <span>Issues</span>
            </button>
          )}

          <button
            type="button"
            className="browse-btn browse-btn-ghost"
            onClick={() =>
              openExternal(
                `https://modrinth.com/${record.project_type || 'mod'}/${record.slug || projectId}`
              )
            }
            title="Open project on Modrinth"
          >
            <ExternalLink size={14} />
            <span>Modrinth</span>
          </button>
        </div>
      </div>

      {/* Detail Content Area */}
      <div className="browse-detail-body">
        {activeTab === 'overview' ? (
          <div className="browse-detail-layout">
            <div className="browse-detail-main-col">
              {/* Gallery Strip */}
              {galleryImages.length > 0 && (
                <div className="browse-gallery-strip">
                  <h3 className="browse-section-label">Screenshots</h3>
                  <div className="browse-gallery-scroll">
                    {galleryImages.map((img, idx) => (
                      <div
                        key={img.url || idx}
                        className="browse-gallery-item"
                        onClick={() => setLightboxImg(img.url)}
                      >
                        <img src={img.url} alt={img.title || ''} loading="lazy" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Readme / Markdown Body */}
              <div className="browse-markdown-wrap">
                <h3 className="browse-section-label">About</h3>
                {renderedMarkdown ? (
                  <div
                    className="browse-markdown-content"
                    dangerouslySetInnerHTML={{ __html: renderedMarkdown }}
                  />
                ) : (
                  <p className="browse-no-readme">No detailed readme available.</p>
                )}
              </div>
            </div>

            {/* Sidebar Info */}
            <aside className="browse-detail-sidebar">
              <div className="browse-sidebar-card">
                <h4 className="browse-sidebar-heading">Project Info</h4>

                <div className="browse-sidebar-row">
                  <span className="browse-sidebar-label">Type</span>
                  <span className="browse-sidebar-value">
                    {record.project_type || activeType?.id}
                  </span>
                </div>

                <div className="browse-sidebar-row">
                  <span className="browse-sidebar-label">Client Side</span>
                  <span className="browse-sidebar-value">
                    {record.client_side || 'Unknown'}
                  </span>
                </div>

                <div className="browse-sidebar-row">
                  <span className="browse-sidebar-label">Server Side</span>
                  <span className="browse-sidebar-value">
                    {record.server_side || 'Unknown'}
                  </span>
                </div>

                {record.loaders && record.loaders.length > 0 && (
                  <div className="browse-sidebar-row-stacked">
                    <span className="browse-sidebar-label">Supported Loaders</span>
                    <div className="browse-sidebar-chips">
                      {record.loaders.map((ld) => (
                        <span key={ld} className="browse-sidebar-chip">
                          {ld}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {record.game_versions && record.game_versions.length > 0 && (
                  <div className="browse-sidebar-row-stacked">
                    <span className="browse-sidebar-label">Compatible Versions</span>
                    <div className="browse-sidebar-chips">
                      {record.game_versions.slice(0, 10).map((gv) => (
                        <span key={gv} className="browse-sidebar-chip">
                          {gv}
                        </span>
                      ))}
                      {record.game_versions.length > 10 && (
                        <span className="browse-sidebar-chip is-more">
                          +{record.game_versions.length - 10} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        ) : (
          <div className="browse-detail-versions-tab">
            <VersionPicker
              project={project}
              versions={versions}
              loading={loading}
              target={target}
              activeType={activeType}
              isVanillaInstance={isVanillaInstance}
              isBusy={isBusy}
              onInstallVersion={onInstallVersion}
              versionMatchesTarget={versionMatchesTarget}
            />
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div className="browse-lightbox-backdrop" onClick={() => setLightboxImg(null)}>
          <button
            type="button"
            className="browse-lightbox-close"
            onClick={() => setLightboxImg(null)}
            aria-label="Close image preview"
          >
            <X size={20} />
          </button>
          <img
            src={lightboxImg}
            alt=""
            className="browse-lightbox-img"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
