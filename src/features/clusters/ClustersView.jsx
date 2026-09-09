import React, { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { RELEASE_LINES, getClusterArt } from '../../data/versionsData.js';
import './ClustersView.css';

export default function ClustersView({
  instances = [],
  selectedCluster,
  onSelectCluster,
  onOpenCluster,
  onLaunch,
  onOpenNewInstanceModal
}) {
  const [selectedLineIdx, setSelectedLineIdx] = useState(0);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [selectedLoader, setSelectedLoader] = useState('Fabric');

  const line = RELEASE_LINES[selectedLineIdx] || RELEASE_LINES[0];

  // Resolve active version within line
  const activeVerObj = selectedVersion
    ? line.versions.find((v) => v.version === selectedVersion) || line.versions[0]
    : line.versions[0];

  const currentVerStr = activeVerObj.version;

  // Find matching instance in user's instances, or generate on-the-fly
  const matchingInstance = instances.find(
    (i) => (i.mc_version === currentVerStr || i.version === currentVerStr) &&
           (i.mc_loader === selectedLoader || i.loader === selectedLoader)
  ) || {
    id: `cluster-${currentVerStr.replace(/\./g, '-')}-${selectedLoader.toLowerCase()}`,
    name: activeVerObj.name,
    mc_version: currentVerStr,
    version: currentVerStr,
    mc_loader: selectedLoader,
    loader: selectedLoader,
    art: activeVerObj.art || line.art,
    description: line.description,
    tags: line.tags
  };

  const handlePlay = () => {
    onSelectCluster(matchingInstance.id);
    onLaunch(matchingInstance);
  };

  const handleView = () => {
    onSelectCluster(matchingInstance.id);
    onOpenCluster(matchingInstance, 'overview');
  };

  return (
    <div className="clusters-view">
      {/* Header */}
      <div className="clusters-header">
        <div>
          <h1 className="clusters-title">Versions</h1>
          <p className="clusters-subtitle">
            Pick your preferred gamemodes and versions so oneclient can pick something for you
          </p>
        </div>

        <button className="sub-btn brand-btn" onClick={onOpenNewInstanceModal}>
          <Icon name="plus" size={14} />
          <span>New Version</span>
        </button>
      </div>

      {/* Two Column Layout: Cards Grid & Detail Sidebar */}
      <div className="clusters-body-grid">
        {/* Left: Release Line Cards */}
        <div className="clusters-cards-scroll">
          {RELEASE_LINES.map((item, idx) => {
            const isSelected = selectedLineIdx === idx;
            return (
              <div
                key={item.major}
                className={`cluster-group-card ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedLineIdx(idx);
                  setSelectedVersion(null);
                }}
              >
                <img src={item.art} alt={item.name} className="cluster-group-art" />
                <div className="cluster-group-grad" />
                <div className="cluster-group-info">
                  <span className="cluster-group-name">{item.name}</span>
                  <div className="cluster-group-meta">
                    <span>{item.versions.length} versions</span>
                    <span>•</span>
                    <span>{item.tags.join(', ')}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* User's custom instances if any */}
          {instances.filter(i => !i.id.startsWith('cluster-26') && !i.id.startsWith('cluster-1-21')).map((inst) => {
            const isSelected = selectedCluster?.id === inst.id;
            return (
              <div
                key={inst.id}
                className={`cluster-group-card ${isSelected ? 'selected' : ''}`}
                onClick={() => {
                  onSelectCluster(inst.id);
                }}
              >
                <img src={getClusterArt(inst)} alt={inst.name} className="cluster-group-art" />
                <div className="cluster-group-grad" />
                <div className="cluster-group-info">
                  <span className="cluster-group-name">{inst.name}</span>
                  <div className="cluster-group-meta">
                    <span>{inst.mc_version || inst.version}</span>
                    <span>•</span>
                    <span>{inst.mc_loader || inst.loader}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Detail Sidebar */}
        <div className="cluster-detail-sidebar">
          <div className="sidebar-art-banner">
            <img
              src={activeVerObj.art || line.art}
              alt={activeVerObj.name}
              className="sidebar-art-img"
            />
          </div>

          <div className="sidebar-content-col">
            <h2 className="sidebar-heading">{activeVerObj.name}</h2>

            <div className="sidebar-tags-row">
              {line.tags.map((tag) => (
                <span key={tag} className="sidebar-tag-pill">{tag}</span>
              ))}
            </div>

            <p className="sidebar-desc">{line.description}</p>

            {/* Version Picker Row */}
            <div className="sidebar-selector-row">
              <span className="sidebar-selector-label">Version</span>
              <select
                className="sidebar-dropdown"
                value={currentVerStr}
                onChange={(e) => setSelectedVersion(e.target.value)}
              >
                {line.versions.map((v) => (
                  <option key={v.version} value={v.version}>
                    {v.version} ({v.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Loader Picker Row */}
            <div className="sidebar-selector-row">
              <span className="sidebar-selector-label">Mod Loader</span>
              <select
                className="sidebar-dropdown"
                value={selectedLoader}
                onChange={(e) => setSelectedLoader(e.target.value)}
              >
                <option value="Fabric">Fabric</option>
                <option value="Forge">Forge</option>
                <option value="NeoForge">NeoForge</option>
                <option value="Vanilla">Vanilla</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="sidebar-actions-row">
              <button className="sidebar-play-btn" onClick={handlePlay}>
                <Icon name="play" size={14} />
                <span>Play</span>
              </button>

              <button className="sidebar-view-btn" onClick={handleView}>
                <span>View</span>
                <Icon name="arrow-right" size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
