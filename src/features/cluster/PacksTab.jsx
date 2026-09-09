import React, { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';

export default function PacksTab({ cluster, type = 'shaders' }) {
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const subDir = type === 'shaders' ? 'shaderpacks' : 'resourcepacks';
  const label = type === 'shaders' ? 'Shader Packs' : 'Resource Packs';

  useEffect(() => {
    let cancelled = false;
    if (window.native?.instance?.listDir && cluster?.id) {
      window.native.instance.listDir(cluster.id, subDir).then((res) => {
        if (!cancelled) {
          setPacks(res || []);
          setLoading(false);
        }
      }).catch(() => {
        if (!cancelled) setLoading(false);
      });
    } else {
      setLoading(false);
    }
    return () => { cancelled = true; };
  }, [cluster?.id, subDir]);

  const handleOpenFolder = () => {
    if (window.native?.instance?.openFolder && cluster?.id) {
      window.native.instance.openFolder(cluster.id, subDir);
    }
  };

  return (
    <div className="cluster-tab-pane packs-tab">
      <div className="tab-pane-toolbar">
        <span className="toolbar-info">{packs.length} {label}</span>
        <button className="sub-btn" onClick={handleOpenFolder}>
          <Icon name="folder" size={14} />
          <span>Open Folder</span>
        </button>
      </div>

      {loading ? (
        <div className="tab-empty-placeholder">Loading {label.toLowerCase()}...</div>
      ) : packs.length === 0 ? (
        <div className="tab-empty-placeholder">
          <Icon name={type === 'shaders' ? 'paint-pour' : 'colors'} size={36} />
          <p>No {label.toLowerCase()} installed yet.</p>
          <button className="sub-btn brand-btn" onClick={handleOpenFolder}>
            <Icon name="folder" size={14} />
            <span>Open {subDir} Folder</span>
          </button>
        </div>
      ) : (
        <div className="packs-list">
          {packs.map((pack, idx) => {
            const name = pack.name || pack;
            return (
              <div key={idx} className="package-item-row">
                <div className="package-icon-wrap">
                  <Icon name={type === 'shaders' ? 'paint-pour' : 'colors'} size={20} />
                </div>
                <div className="package-info-col">
                  <span className="package-title">{name}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
