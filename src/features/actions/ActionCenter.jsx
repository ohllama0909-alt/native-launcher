import React, { useEffect, useState } from 'react';
import NativeIcon from '../../components/ui/NativeIcon.jsx';
import { useI18n } from '../../i18n/I18nProvider.jsx';
import './ActionCenter.css';

const DESTINATIONS = [
  { id: 'instances', label: 'Instances', detail: 'Your installed games', icon: 'cube' },
  { id: 'versions', label: 'Versions', detail: 'Create a fresh instance', icon: 'layers' },
  { id: 'accounts', label: 'Wardrobe', detail: 'Skins, capes and accounts', icon: 'user' },
  { id: 'stats', label: 'Statistics', detail: 'Playtime and activity', icon: 'chart' }
];

const CONTENT = [
  { id: 'modpack', label: 'Modpacks', icon: 'layers' },
  { id: 'mod', label: 'Mods', icon: 'package' },
  { id: 'shader', label: 'Shaders', icon: 'sparkles' },
  { id: 'resourcepack', label: 'Resource packs', icon: 'image' }
];

export default function ActionCenter({ open, onClose, onNavigate, onBrowse }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const search = (contentType = 'mod') => onBrowse?.({ contentType, query: query.trim() });

  return (
    <div className="action-center-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="action-center" role="dialog" aria-modal="true" aria-label={t('action.title')}>
        <header className="action-center-head">
          <div>
            <span className="action-center-eyebrow">{t('action.quickAccess')}</span>
            <h2>{t('action.title')}</h2>
          </div>
          <button type="button" className="action-center-close" onClick={onClose}><NativeIcon name="close" size={17} /></button>
        </header>

        <form className="action-center-search" onSubmit={(event) => { event.preventDefault(); search('mod'); }}>
          <NativeIcon name="search" size={18} />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('action.search')} />
          <button type="submit">{t('common.search')}</button>
        </form>

        <div className="action-center-section-head">
          <span>{t('action.discover')}</span>
          <button type="button" onClick={() => onNavigate?.('browse')}>{t('action.openBrowse')}</button>
        </div>
        <div className="action-center-content-grid">
          {CONTENT.map((item) => (
            <button key={item.id} type="button" className="action-content-card" onClick={() => search(item.id)}>
              <span className="action-content-icon"><NativeIcon name={item.icon} size={21} /></span>
              <span>{item.label}</span>
              <NativeIcon name="arrow-right" size={14} />
            </button>
          ))}
        </div>

        <div className="action-center-section-head"><span>{t('action.goTo')}</span></div>
        <div className="action-center-destinations">
          {DESTINATIONS.map((item) => (
            <button key={item.id} type="button" onClick={() => onNavigate?.(item.id)}>
              <span className="action-destination-icon"><NativeIcon name={item.icon} size={18} /></span>
              <span><strong>{item.label}</strong><small>{item.detail}</small></span>
              <NativeIcon name="chevron-right" size={14} />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
