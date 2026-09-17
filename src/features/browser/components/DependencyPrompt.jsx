import React from 'react';
import { AlertCircle, Check, Layers, Package, X } from 'lucide-react';

export default function DependencyPrompt({
  prompt,
  onToggleOptional,
  onConfirm,
  onCancel
}) {
  if (!prompt) return null;

  const { project, version, required = [], optional = [], selected = {} } = prompt;

  return (
    <div className="dep-prompt-backdrop" onClick={onCancel}>
      <div
        className="dep-prompt-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dep-prompt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="dep-prompt-close"
          onClick={onCancel}
          aria-label="Close dialog"
        >
          <X size={16} />
        </button>

        <div className="dep-prompt-header">
          <div className="dep-prompt-icon">
            <Layers size={22} />
          </div>
          <div>
            <h3 id="dep-prompt-title" className="dep-prompt-title">
              Dependencies Required
            </h3>
            <p className="dep-prompt-subtitle">
              <strong>{project.title}</strong> needs additional libraries to function properly.
            </p>
          </div>
        </div>

        <div className="dep-prompt-body">
          {required.length > 0 && (
            <div className="dep-prompt-section">
              <h4 className="dep-section-heading">
                Required ({required.length})
              </h4>
              <div className="dep-list">
                {required.map((dep) => (
                  <div key={dep.projectId} className="dep-item is-required">
                    <div className="dep-item-info">
                      <Package size={16} className="dep-item-icon" />
                      <div>
                        <strong className="dep-item-title">{dep.title}</strong>
                        <span className="dep-item-version">{dep.versionNumber}</span>
                      </div>
                    </div>
                    <span className="dep-badge is-required">
                      <Check size={11} /> Required
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {optional.length > 0 && (
            <div className="dep-prompt-section">
              <h4 className="dep-section-heading">
                Optional Enhancements ({optional.length})
              </h4>
              <div className="dep-list">
                {optional.map((dep) => {
                  const isChecked = !!selected[dep.projectId];
                  return (
                    <label
                      key={dep.projectId}
                      className={`dep-item is-optional ${isChecked ? 'is-selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleOptional(dep.projectId)}
                      />
                      <div className="dep-item-info">
                        <Package size={16} className="dep-item-icon" />
                        <div>
                          <strong className="dep-item-title">{dep.title}</strong>
                          <span className="dep-item-version">{dep.versionNumber}</span>
                        </div>
                      </div>
                      <span className="dep-badge is-optional">Optional</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="dep-prompt-footer">
          <button
            type="button"
            className="browse-btn browse-btn-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="browse-btn browse-btn-install"
            onClick={onConfirm}
          >
            Confirm & Install
          </button>
        </div>
      </div>
    </div>
  );
}
