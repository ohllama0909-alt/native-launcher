import React from 'react';
import BrowsePage from './components/BrowsePage.jsx';
import './BrowseView.css';

/**
 * Public BrowseView entry point.
 * Wraps the modular BrowsePage while maintaining the exact public prop contract:
 * - initialIntent
 * - fixedContentType
 * - allowedTypes
 * - excludeTypes
 * - pageTitle
 * - instances
 * - selectedCluster
 * - onSelectCluster
 * - onBack
 * - onAddInstance
 * - onOpenCluster
 * - onNotify
 * - hideInstallToast = false
 * - initialResults
 *
 * Provides category search with .browse-category-search and .browse-search-clear.
 */
export default function BrowseView({
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
  return (
    <BrowsePage
      initialIntent={initialIntent}
      fixedContentType={fixedContentType}
      allowedTypes={allowedTypes}
      excludeTypes={excludeTypes}
      pageTitle={pageTitle}
      instances={instances}
      selectedCluster={selectedCluster}
      onSelectCluster={onSelectCluster}
      onBack={onBack}
      onAddInstance={onAddInstance}
      onOpenCluster={onOpenCluster}
      onNotify={onNotify}
      hideInstallToast={hideInstallToast}
      initialResults={initialResults}
    />
  );
}

export { BrowsePage };
