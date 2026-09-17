import React, { useState } from 'react';
import { AlertTriangle, ArrowDownToLine, Check, Download, Loader2 } from 'lucide-react';
import { primaryFile } from '../api/modrinthApi.js';

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export default function VersionPicker({
  project,
  versions = [],
  loading = false,
  target,
  activeType,
  isVanillaInstance,
  isBusy,
  onInstallVersion,
  versionMatchesTarget
}) {
  const [confirmIncompatible, setConfirmIncompatible] = useState(null);

  const handleInstallClick = (version, isCompatible) => {
    if (!isCompatible) {
      setConfirmIncompatible(version);
    } else {
      onInstallVersion(project, version);
    }
  };

  const confirmAndInstall = () => {
    if (confirmIncompatible) {
      onInstallVersion(project, confirmIncompatible);
      setConfirmIncompatible(null);
    }
  };

  const isModOnVanilla = activeType?.id === 'mod' && isVanillaInstance;

  return (
    <div className="browse-version-picker">
      <div className="browse-version-header">
        <h3 className="browse-version-title">Available Versions</h3>
        <span className="browse-version-count">{versions.length} releases found</span>
      </div>

      {loading && versions.length === 0 ? (
        <div className="browse-version-loading">
          <Loader2 size={20} className="browse-spin-icon" />
          <span>Fetching versions from Modrinth…</span>
        </div>
      ) : versions.length === 0 ? (
        <div className="browse-version-empty">
          <p>No downloadable versions found for this project.</p>
        </div>
      ) : (
        <div className="browse-version-table-wrap">
          <table className="browse-version-table">
            <thead>
              <tr>
                <th>Version</th>
                <th>Game Versions</th>
                <th>Loaders</th>
                <th>Date</th>
                <th>Downloads</th>
                <th className="browse-version-action-col">Action</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((ver) => {
                const isCompatible = versionMatchesTarget ? versionMatchesTarget(ver) : true;
                const file = primaryFile(ver);
                const downloads = ver.downloads || file?.downloads || 0;
                const verType = ver.version_type || 'release';

                return (
                  <tr
                    key={ver.id}
                    className={`browse-version-row ${isCompatible ? 'is-compatible' : 'is-incompatible'}`}
                  >
                    <td>
                      <div className="browse-ver-name-cell">
                        <span className="browse-ver-name">
                          {ver.name || ver.version_number}
                        </span>
                        <div className="browse-ver-subtags">
                          <span className={`browse-ver-type-pill is-${verType}`}>
                            {verType}
                          </span>
                          {isCompatible ? (
                            <span className="browse-compat-pill is-match">
                              <Check size={11} />
                              <span>Compatible</span>
                            </span>
                          ) : (
                            <span className="browse-compat-pill is-mismatch" title="Differs from target version/loader">
                              <AlertTriangle size={11} />
                              <span>Mismatch</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="browse-ver-chips-cell">
                        {(ver.game_versions || []).slice(0, 4).map((gv) => (
                          <span key={gv} className="browse-ver-game-chip">
                            {gv}
                          </span>
                        ))}
                        {(ver.game_versions || []).length > 4 && (
                          <span className="browse-ver-game-chip-more">
                            +{ver.game_versions.length - 4}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className="browse-ver-chips-cell">
                        {(ver.loaders || []).map((ld) => (
                          <span key={ld} className="browse-ver-loader-chip">
                            {ld}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td>
                      <span className="browse-ver-date-cell">{formatDate(ver.date_published)}</span>
                    </td>

                    <td>
                      <span className="browse-ver-downloads-cell">
                        <Download size={11} />
                        <span>{downloads.toLocaleString()}</span>
                      </span>
                    </td>

                    <td className="browse-version-action-col">
                      {isModOnVanilla ? (
                        <button
                          type="button"
                          className="browse-ver-install-btn is-disabled-vanilla"
                          disabled
                        >
                          Vanilla (No Mods)
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`browse-ver-install-btn ${isCompatible ? 'is-primary' : 'is-warning'}`}
                          disabled={isBusy}
                          onClick={() => handleInstallClick(ver, isCompatible)}
                          title={isCompatible ? 'Install this version' : 'Warning: version mismatch'}
                        >
                          <ArrowDownToLine size={12} />
                          <span>Install</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Confirmation Modal for incompatible build */}
      {confirmIncompatible && (
        <div className="browse-confirm-backdrop" onClick={() => setConfirmIncompatible(null)}>
          <div
            className="browse-confirm-modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-incompat-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="browse-confirm-icon-wrap is-warning">
              <AlertTriangle size={24} />
            </div>
            <h4 id="confirm-incompat-title" className="browse-confirm-title">
              Version Compatibility Warning
            </h4>
            <p className="browse-confirm-body">
              This build (<strong>{confirmIncompatible.name || confirmIncompatible.version_number}</strong>)
              is designed for <strong>{(confirmIncompatible.game_versions || []).join(', ')}</strong> on{' '}
              <strong>{(confirmIncompatible.loaders || []).join(', ')}</strong>.
              Your target instance is running{' '}
              <strong>{target?.mc_version || target?.version} ({target?.mc_loader || target?.loader || 'Vanilla'})</strong>.
              Installing it may cause crashes or instability.
            </p>
            <div className="browse-confirm-actions">
              <button
                type="button"
                className="browse-btn browse-btn-secondary"
                onClick={() => setConfirmIncompatible(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="browse-btn browse-btn-danger"
                onClick={confirmAndInstall}
              >
                Install Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
