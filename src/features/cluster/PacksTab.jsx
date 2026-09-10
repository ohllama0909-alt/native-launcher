import React, { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';

export default function PacksTab({ cluster, type = 'shaders', onNavigateBrowse }) {
  const { t } = useI18n();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  const subDir = type === 'shaders' ? 'shaderpacks' : 'resourcepacks';
  const label = t(type === 'shaders' ? 'packs.shaders' : 'packs.resources');

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

  const browseLabel = type === 'shaders' ? (t('packs.browseShaders') || 'Browse shaders') : (t('packs.browsePacks') || 'Browse resource packs');

  return (
    <div className="cluster-tab-pane packs-tab">
      <div className="tab-pane-toolbar">
        <span className="toolbar-info">{packs.length} {label}</span>
        <div className="toolbar-actions" style={{ display: 'flex', gap: '8px' }}>
          {onNavigateBrowse && (
            <button className="sub-btn brand-btn" onClick={() => onNavigateBrowse(cluster)}>
              <Icon name="plus" size={14} />
              <span>{browseLabel}</span>
            </button>
          )}
          <button className="sub-btn" onClick={handleOpenFolder}>
            <Icon name="folder" size={14} />
            <span>{t('common.openFolder')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="tab-empty-placeholder">{t('packs.loading', { type: label.toLocaleLowerCase() })}</div>
      ) : packs.length === 0 ? (
        <div className="tab-empty-placeholder">
          <Icon name={type === 'shaders' ? 'paint-pour' : 'colors'} size={36} />
          <p>{t('packs.empty', { type: label.toLocaleLowerCase() })}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onNavigateBrowse && (
              <button className="sub-btn brand-btn" onClick={() => onNavigateBrowse(cluster)}>
                <Icon name="plus" size={14} />
                <span>{browseLabel}</span>
              </button>
            )}
            <button className="sub-btn" onClick={handleOpenFolder}>
              <Icon name="folder" size={14} />
              <span>{t('packs.openFolder', { folder: subDir })}</span>
            </button>
          </div>
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
