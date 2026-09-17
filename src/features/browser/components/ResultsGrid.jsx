import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Loader2, PackageSearch, RotateCcw } from 'lucide-react';
import ProjectCard from './ProjectCard.jsx';
import useInfiniteScroll from '../hooks/useInfiniteScroll.js';

export default function ResultsGrid({
  results = [],
  loading = false,
  loadingMore = false,
  error = null,
  hasMore = false,
  onLoadMore,
  contentType,
  isVanillaInstance,
  installedKeys,
  busyIds,
  packProgress,
  onSelectProject,
  onInstall,
  onRemove,
  onRetry
}) {
  const containerRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const sentinelRef = useInfiniteScroll({
    onLoadMore,
    disabled: loading || loadingMore || !hasMore
  });

  const handleScroll = () => {
    if (!containerRef.current) return;
    setShowBackToTop(containerRef.current.scrollTop > 500);
  };

  const scrollToTop = () => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      className="browse-results-scroll"
      ref={containerRef}
      onScroll={handleScroll}
    >
      {/* Error state */}
      {error && !loading && (
        <div className="browse-error-state" role="alert">
          <p className="browse-error-message">{error}</p>
          {onRetry && (
            <button type="button" className="browse-retry-btn" onClick={onRetry}>
              <RotateCcw size={14} />
              <span>Try again</span>
            </button>
          )}
        </div>
      )}

      {/* Initial Loading Skeletons */}
      {loading && results.length === 0 && (
        <div className="browse-cards-grid" aria-label="Loading results">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="browse-card-skeleton">
              <div className="skeleton-banner" />
              <div className="skeleton-body">
                <div className="skeleton-title" />
                <div className="skeleton-line" />
                <div className="skeleton-line short" />
                <div className="skeleton-footer" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Zero results empty state */}
      {!loading && !error && results.length === 0 && (
        <div className="browse-empty-state">
          <div className="browse-empty-icon-wrap">
            <PackageSearch size={36} />
          </div>
          <h3 className="browse-empty-title">No matching content found</h3>
          <p className="browse-empty-hint">
            Try adjusting your search query, or clear some category and version filters.
          </p>
        </div>
      )}

      {/* Results Card Grid */}
      {results.length > 0 && (
        <div className="browse-cards-grid" role="feed" aria-busy={loadingMore}>
          {results.map((project) => {
            const id = project.project_id || project.id;
            const isInstalled = installedKeys ? installedKeys.has(id) : false;
            const isBusy = busyIds ? busyIds.has(id) : false;
            const currentPackProgress =
              packProgress?.instanceId === id || isBusy ? packProgress : null;

            return (
              <ProjectCard
                key={id}
                project={project}
                contentType={contentType}
                isVanillaInstance={isVanillaInstance}
                isInstalled={isInstalled}
                isBusy={isBusy}
                packProgress={currentPackProgress}
                onSelect={onSelectProject}
                onInstall={onInstall}
                onRemove={onRemove}
              />
            );
          })}
        </div>
      )}

      {/* Infinite Scroll Sentinel */}
      {hasMore && !loading && (
        <div
          ref={sentinelRef}
          className="browse-sentinel"
          style={{ height: '40px', margin: '16px 0' }}
        >
          {loadingMore && (
            <div className="browse-loading-more">
              <Loader2 size={18} className="browse-spin-icon" />
              <span>Loading more…</span>
            </div>
          )}
        </div>
      )}

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          className="browse-back-to-top"
          onClick={scrollToTop}
          aria-label="Back to top"
        >
          <ArrowUp size={16} />
          <span>Top</span>
        </button>
      )}
    </div>
  );
}
