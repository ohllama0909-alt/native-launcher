import React, { useState, useRef, useEffect } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  FileCode,
  FolderOpen,
  Globe2,
  Image,
  Layers,
  Package,
  Plus,
  Sparkles
} from 'lucide-react';
import { CONTENT_TYPES, isVanilla } from '../api/modrinthApi.js';
import { useI18n } from '../../../i18n/I18nProvider.jsx';

const TYPE_ICONS = {
  mod: Package,
  modpack: Layers,
  shader: Sparkles,
  resourcepack: Image,
  datapack: FileCode
};

export default function BrowseHeader({
  pageTitle,
  availableContentTypes = CONTENT_TYPES,
  contentType,
  onSelectContentType,
  instances = [],
  selectedCluster,
  target,
  onSelectCluster,
  onBack,
  fixedContentType = false
}) {
  const { t } = useI18n();
  const [instanceMenuOpen, setInstanceMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setInstanceMenuOpen(false);
      }
    };
    if (instanceMenuOpen) {
      document.addEventListener('pointerdown', handlePointerDown);
    }
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [instanceMenuOpen]);

  const isTargetVanilla = isVanilla(target);
  const isModOnVanilla = contentType?.id === 'mod' && isTargetVanilla;

  return (
    <header className="browse-header-bar">
      <div className="browse-header-main-row">
        <div className="browse-header-left">
          {onBack && (
            <button
              type="button"
              className="browse-back-btn"
              onClick={onBack}
              aria-label="Go back"
            >
              <ArrowLeft size={18} />
            </button>
          )}

          <div className="browse-title-group">
            <h1 className="browse-title">{pageTitle || 'Browse'}</h1>
            <span className="browse-subtitle">Modrinth Marketplace</span>
          </div>

          {/* Instance Target Picker */}
          {target && (
            <div className="browse-target-picker" ref={menuRef}>
              <span className="browse-target-prefix">Target:</span>
              <button
                type="button"
                className={`browse-target-btn ${instanceMenuOpen ? 'is-open' : ''}`}
                onClick={() => setInstanceMenuOpen((prev) => !prev)}
                aria-haspopup="listbox"
                aria-expanded={instanceMenuOpen}
                aria-label={`Target instance: ${target.name}`}
              >
                <div className="browse-target-info">
                  <span className="browse-target-name">{target.name}</span>
                  <span className="browse-target-tag">
                    {target.mc_version || target.version} · {target.mc_loader || target.loader || 'Vanilla'}
                  </span>
                </div>
                {instances.length > 1 && <ChevronDown size={14} className="browse-target-chevron" />}
              </button>

              {instanceMenuOpen && instances.length > 1 && (
                <ul className="browse-target-menu" role="listbox">
                  {instances.map((inst) => {
                    const isSelected = inst.id === target.id;
                    const instVanilla = isVanilla(inst);
                    return (
                      <li
                        key={inst.id}
                        role="option"
                        aria-selected={isSelected}
                        className={`browse-target-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => {
                          onSelectCluster?.(inst.id);
                          setInstanceMenuOpen(false);
                        }}
                      >
                        <div className="browse-target-item-title">{inst.name}</div>
                        <div className="browse-target-item-meta">
                          <span>{inst.mc_version || inst.version}</span>
                          <span>·</span>
                          <span className={instVanilla ? 'is-vanilla' : 'is-modded'}>
                            {inst.mc_loader || inst.loader || 'Vanilla'}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Content Type Tabs */}
        {!fixedContentType && (
          <nav className="browse-type-tabs" role="tablist" aria-label="Content types">
            {availableContentTypes.map((type) => {
              const isSelected = type.id === contentType?.id;
              const Icon = TYPE_ICONS[type.id] || Package;
              return (
                <button
                  key={type.id}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  className={`browse-type-tab ${isSelected ? 'is-active' : ''}`}
                  onClick={() => onSelectContentType(type)}
                >
                  <Icon size={14} />
                  <span>{t(type.labelKey) || type.id}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Vanilla Warning Banner - exactly matches test/browse.vanilla.test.js requirement:
          browse-vanilla-warning
          "is a Vanilla instance. Minecraft Vanilla does not support mods" */}
      {isModOnVanilla && (
        <div className="browse-vanilla-warning" role="alert">
          <AlertTriangle size={16} className="browse-vanilla-warning-icon" />
          <div className="browse-vanilla-warning-text">
            <strong>{target.name}</strong> is a Vanilla instance. Minecraft Vanilla does not support mods.
            Switch to a Fabric, Forge, NeoForge, or Quilt instance to install and play mods.
          </div>
        </div>
      )}
    </header>
  );
}
