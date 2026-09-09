import React, { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';

export default function ScreenshotsTab({ cluster }) {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShot, setSelectedShot] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (window.native?.instance?.listDir && cluster?.id) {
      window.native.instance.listDir(cluster.id, 'screenshots').then((files) => {
        if (!cancelled) {
          const imageFiles = (files || []).filter((f) => /\.(png|jpe?g|webp)$/i.test(f.name || f));
          setScreenshots(imageFiles);
          setLoading(false);
        }
      }).catch(() => {
        if (!cancelled) setLoading(false);
      });
    } else {
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [cluster?.id]);

  const handleOpenFolder = () => {
    if (window.native?.instance?.openFolder && cluster?.id) {
      window.native.instance.openFolder(cluster.id, 'screenshots');
    }
  };

  return (
    <div className="cluster-tab-pane screenshots-tab">
      <div className="tab-pane-toolbar">
        <span className="toolbar-info">
          {screenshots.length} {screenshots.length === 1 ? 'screenshot' : 'screenshots'}
        </span>
        <button className="sub-btn" onClick={handleOpenFolder}>
          <Icon name="folder" size={14} />
          <span>Open Folder</span>
        </button>
      </div>

      {loading ? (
        <div className="tab-empty-placeholder">Loading screenshots...</div>
      ) : screenshots.length === 0 ? (
        <div className="tab-empty-placeholder">
          <Icon name="eye" size={32} />
          <p>No screenshots taken in this version yet.</p>
          <span>Press F2 while playing Minecraft to take a screenshot!</span>
        </div>
      ) : (
        <div className="screenshots-grid">
          {screenshots.map((shot, idx) => {
            const fileName = shot.name || shot;
            const fileUrl = shot.url || `file://${shot.path || ''}`;
            return (
              <div
                key={idx}
                className="screenshot-tile"
                onClick={() => setSelectedShot({ name: fileName, url: fileUrl })}
              >
                <img src={fileUrl} alt={fileName} className="screenshot-img" />
                <div className="screenshot-overlay">
                  <span className="screenshot-name">{fileName}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedShot && (
        <div className="screenshot-modal-backdrop" onClick={() => setSelectedShot(null)}>
          <div className="screenshot-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="screenshot-modal-header">
              <span>{selectedShot.name}</span>
              <button className="icon-close-btn" onClick={() => setSelectedShot(null)}>
                <Icon name="x" size={16} />
              </button>
            </div>
            <img src={selectedShot.url} alt={selectedShot.name} className="screenshot-modal-img" />
          </div>
        </div>
      )}
    </div>
  );
}
