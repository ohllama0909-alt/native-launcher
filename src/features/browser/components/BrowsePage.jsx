import React, { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { CONTENT_TYPES, isVanilla } from '../api/modrinthApi.js';
import useBrowseSearch from '../hooks/useBrowseSearch.js';
import useInstaller from '../hooks/useInstaller.js';
import BrowseHeader from './BrowseHeader.jsx';
import FilterPanel from './FilterPanel.jsx';
import SortSelect from './SortSelect.jsx';
import ResultsGrid from './ResultsGrid.jsx';
import ProjectDetail from './ProjectDetail.jsx';
import DependencyPrompt from './DependencyPrompt.jsx';
import { useI18n } from '../../../i18n/I18nProvider.jsx';

export default function BrowsePage({
  initialIntent,
  fixedContentType = null,
  allowedTypes = null,
  excludeTypes = [],
  pageTitle = null,
  instances = [],
  selectedCluster,
  onSelectCluster,
  onBack,
  onAddInstance,
  onOpenCluster,
  onNotify,
  hideInstallToast = false,
  initialResults = []
}) {
  const { t } = useI18n();

  const availableContentTypes = useMemo(() => {
    let types = CONTENT_TYPES;
    if (Array.isArray(allowedTypes) && allowedTypes.length > 0) {
      types = types.filter((entry) => allowedTypes.includes(entry.id));
    }
    if (Array.isArray(excludeTypes) && excludeTypes.length > 0) {
      types = types.filter((entry) => !excludeTypes.includes(entry.id));
    }
    return types.length > 0 ? types : CONTENT_TYPES;
  }, [allowedTypes, excludeTypes]);

  const [contentType, setContentType] = useState(() => {
    if (fixedContentType) {
      const match = CONTENT_TYPES.find((c) => c.id === fixedContentType);
      return match || CONTENT_TYPES[0];
    }
    if (Array.isArray(allowedTypes) && allowedTypes.length > 0 && !allowedTypes.includes('mod')) {
      const match = CONTENT_TYPES.find((c) => c.id === allowedTypes[0]);
      return match || CONTENT_TYPES[0];
    }
    return CONTENT_TYPES[0];
  });

  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    if (fixedContentType) {
      const match = CONTENT_TYPES.find((c) => c.id === fixedContentType);
      if (match) setContentType(match);
    }
  }, [fixedContentType]);

  const target = useMemo(() => {
    if (selectedCluster) return selectedCluster;
    if (contentType?.id === 'mod') {
      const modded = instances.find((i) => !isVanilla(i));
      if (modded) return modded;
    }
    return instances[0] || null;
  }, [selectedCluster, instances, contentType]);

  const isTargetVanilla = isVanilla(target);

  /* ---------------------------------------------------- search hooks */
  const search = useBrowseSearch({
    contentType: contentType?.id,
    target,
    initialResults,
    errorMessage: t('browse.connectionError')
  });

  const {
    results,
    totalHits,
    loading,
    loadingMore,
    error,
    query,
    setQuery,
    setQueryImmediate,
    sort,
    setSort,
    filters,
    setFilters,
    resetToInstance,
    loadMore,
    hasMore
  } = search;

  /* ------------------------------------------------- installer hooks */
  const installer = useInstaller({
    target,
    activeType: contentType,
    onAddInstance,
    onNotify,
    hideInstallToast
  });

  const {
    installedKeys,
    busyIds,
    packProgress,
    depPrompt,
    install,
    installVersion,
    remove,
    toggleOptionalDep,
    confirmDeps,
    cancelDeps,
    versionMatchesTarget
  } = installer;

  /* Deep link intent */
  useEffect(() => {
    if (!initialIntent) return;
    if (initialIntent.contentType) {
      const match = availableContentTypes.find((c) => c.id === initialIntent.contentType);
      if (match) setContentType(match);
    }
    if (initialIntent.query) {
      setQueryImmediate(initialIntent.query);
    }
    setSelectedProject(null);
  }, [initialIntent?.nonce, availableContentTypes, setQueryImmediate]);

  const handleContentTypeChange = (type) => {
    setContentType(type);
    setSelectedProject(null);
  };

  return (
    <div className="browse-page-root">
      {/* Top Header */}
      <BrowseHeader
        pageTitle={pageTitle}
        availableContentTypes={availableContentTypes}
        contentType={contentType}
        onSelectContentType={handleContentTypeChange}
        instances={instances}
        selectedCluster={selectedCluster}
        target={target}
        onSelectCluster={onSelectCluster}
        onBack={onBack}
        fixedContentType={Boolean(fixedContentType)}
      />

      {/* Main Viewport: Swaps between Detail view and Grid view */}
      {selectedProject ? (
        <ProjectDetail
          project={selectedProject}
          activeType={contentType}
          target={target}
          isVanillaInstance={isTargetVanilla}
          isInstalled={installedKeys.has(selectedProject.project_id || selectedProject.id)}
          isBusy={busyIds.has(selectedProject.project_id || selectedProject.id)}
          onBack={() => setSelectedProject(null)}
          onInstall={install}
          onInstallVersion={installVersion}
          onRemove={remove}
          versionMatchesTarget={versionMatchesTarget}
        />
      ) : (
        <div className="browse-main-layout">
          {/* Filter Sidebar */}
          <FilterPanel
            contentType={contentType}
            target={target}
            filters={filters}
            onUpdateFilters={setFilters}
            onResetToInstance={resetToInstance}
          />

          {/* Results Area */}
          <main className="browse-results-main">
            {/* Search and Sort Toolbar */}
            <div className="browse-toolbar">
              <div className="browse-search-box">
                <Search size={15} className="browse-search-icon" />
                <input
                  type="text"
                  className="browse-search-input"
                  placeholder={`Search ${contentType?.id ? t(contentType.labelKey) || contentType.id : 'content'}…`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Search content"
                />
                {query && (
                  <button
                    type="button"
                    className="browse-search-clear"
                    onClick={() => setQuery('')}
                    aria-label="Clear search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="browse-toolbar-right">
                <div className="browse-results-count">
                  {loading && results.length === 0 ? (
                    'Searching…'
                  ) : (
                    <span>
                      <strong className="mono-count">{totalHits.toLocaleString()}</strong> results
                    </span>
                  )}
                </div>
                <SortSelect sort={sort} onChange={setSort} />
              </div>
            </div>

            {/* Results Grid */}
            <ResultsGrid
              results={results}
              loading={loading}
              loadingMore={loadingMore}
              error={error}
              hasMore={hasMore}
              onLoadMore={loadMore}
              contentType={contentType}
              isVanillaInstance={isTargetVanilla}
              installedKeys={installedKeys}
              busyIds={busyIds}
              packProgress={packProgress}
              onSelectProject={setSelectedProject}
              onInstall={install}
              onRemove={remove}
              onRetry={() => search.loadMore?.()}
            />
          </main>
        </div>
      )}

      {/* Dependency Confirmation Modal */}
      {depPrompt && (
        <DependencyPrompt
          prompt={depPrompt}
          onToggleOptional={toggleOptionalDep}
          onConfirm={confirmDeps}
          onCancel={cancelDeps}
        />
      )}
    </div>
  );
}
