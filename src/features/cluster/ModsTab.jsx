import React, { useEffect, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';

export default function ModsTab({ cluster, onNavigateBrowse }) {
  const { t } = useI18n();
  const [mods, setMods] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const refreshMods = () => {
    if (window.native?.mods?.installed && cluster?.id) {
      window.native.mods.installed(cluster.id).then((res) => {
        setMods(res || {});
        setLoading(false);
      }).catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshMods();
  }, [cluster?.id]);

  const handleOpenFolder = () => {
    if (window.native?.instance?.openFolder && cluster?.id) {
      window.native.instance.openFolder(cluster.id, 'mods');
    }
  };

  const handleRemove = async (projectId) => {
    if (window.native?.mods?.remove && cluster?.id) {
      const updated = await window.native.mods.remove({ instanceId: cluster.id, projectId });
      setMods(updated || {});
    }
  };

  const entries = Object.entries(mods);
  const filtered = entries.filter(([id, data]) => {
    const meta = data?.metadata || {};
    const text = `${meta.title || id} ${meta.author || ''} ${data?.filename || ''}`.toLowerCase();
    return text.includes(filter.toLowerCase());
  });

  return (
    <div className="cluster-tab-pane mods-tab">
      <div className="tab-pane-toolbar">
        <div className="tab-search-box">
          <Icon name="search-md" size={14} />
          <input
            type="text"
            placeholder={t('mods.search')}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="toolbar-actions">
          <button className="sub-btn" onClick={handleOpenFolder}>
            <Icon name="folder" size={14} />
            <span>{t('common.openFolder')}</span>
          </button>
          <button className="sub-btn brand-btn" onClick={() => onNavigateBrowse(cluster)}>
            <Icon name="plus" size={14} />
            <span>{t('mods.add')}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="tab-empty-placeholder">{t('mods.loading')}</div>
      ) : entries.length === 0 ? (
        <div className="tab-empty-placeholder">
          <Icon name="code-snippet-02" size={36} />
          <p>{t('mods.empty')}</p>
          <button className="sub-btn brand-btn" onClick={() => onNavigateBrowse(cluster)}>
            <Icon name="plus" size={14} />
            <span>{t('mods.browse')}</span>
          </button>
        </div>
      ) : (
        <div className="mods-list-container">
          {filtered.map(([id, data]) => {
            const meta = data?.metadata || {};
            const title = meta.title || data?.filename || id;
            const author = meta.author ? t('mods.byAuthor', { author: meta.author }) : '';
            const version = meta.version || '';
            const isCF = meta.source === 'cf';

            return (
              <div key={id} className="package-item-row">
                <div className="package-icon-wrap">
                  {meta.iconUrl ? (
                    <img src={meta.iconUrl} alt={title} className="package-icon-img" />
                  ) : (
                    <div className="package-icon-placeholder">
                      <Icon name="code-snippet-02" size={18} />
                    </div>
                  )}
                </div>

                <div className="package-info-col">
                  <div className="package-title-line">
                    <span className="package-title">{title}</span>
                    {version && <span className="package-version-tag">{version}</span>}
                    <span className={`package-source-badge ${isCF ? 'cf' : 'modrinth'}`}>
                      {isCF ? 'CurseForge' : 'Modrinth'}
                    </span>
                  </div>
                  <div className="package-sub-line">
                    {author && <span className="package-author">{author}</span>}
                    {data.filename && <span className="package-filename">{data.filename}</span>}
                  </div>
                </div>

                <div className="package-actions-col">
                  <button
                    className="icon-delete-btn"
                    onClick={() => handleRemove(id)}
                    title={t('mods.remove')}
                  >
                    <Icon name="trash-01" size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
