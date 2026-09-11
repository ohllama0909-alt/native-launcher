import React, { useEffect, useRef, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { ART_ASSETS, getClusterArt } from '../../data/versionsData.js';
import './InstancePickerModal.css';

function ArtThumbnail({ src }) {
  const [url, setUrl] = useState(src);

  useEffect(() => {
    setUrl(src);
  }, [src]);

  return (
    <img
      className="instance-picker-thumb"
      src={url || ART_ASSETS.default}
      alt=""
      loading="lazy"
      onError={() => {
        if (url !== ART_ASSETS.default) {
          setUrl(ART_ASSETS.default);
        }
      }}
    />
  );
}

export default function InstancePickerModal({
  open,
  mode = 'launch', // 'launch' | 'settings'
  version = '',
  loader = '',
  instances = [],
  onClose,
  onSelect,
  onCreateNew
}) {
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isSettings = mode === 'settings';

  return (
    <div
      className="instance-picker-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="instance-picker-box" ref={boxRef}>
        {/* Slim Header */}
        <div className="instance-picker-header">
          <div className="instance-picker-header-title">
            <span className="instance-picker-title">
              {isSettings ? 'Select Instance' : 'Launch Instance'}
            </span>
            <span className="instance-picker-sub">
              {version} • {loader}
            </span>
          </div>

          <button
            type="button"
            className="instance-picker-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <NativeIcon name="close" size={13} />
          </button>
        </div>

        {/* Clean, Slim List with Thumbnail Art */}
        <div className="instance-picker-list">
          {instances.map((inst) => {
            const art = inst.art || getClusterArt(inst);
            const ramText = inst.memoryMb
              ? `${Math.round(inst.memoryMb / 1024)} GB`
              : null;

            return (
              <button
                key={inst.id}
                type="button"
                className="instance-picker-item"
                onClick={() => onSelect?.(inst)}
              >
                <div className="instance-picker-item-left">
                  <div className="instance-picker-item-thumb-wrap">
                    <ArtThumbnail src={art} />
                  </div>
                  <span className="instance-picker-item-name" title={inst.name}>
                    {inst.name}
                  </span>
                </div>

                <div className="instance-picker-item-right">
                  {ramText && (
                    <span className="instance-picker-item-ram">{ramText}</span>
                  )}
                  <NativeIcon name="chevron-right" size={12} className="instance-picker-arrow" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Minimal Footer */}
        {onCreateNew && (
          <div className="instance-picker-footer">
            <button
              type="button"
              className="instance-picker-new-btn"
              onClick={onCreateNew}
            >
              <NativeIcon name="plus" size={12} />
              <span>New instance</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
