import { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Boxes,
  Check,
  Clock3,
  Gamepad2,
  Grid2X2,
  Layers3,
  List,
  Plus,
  Search
} from 'lucide-react';
import Dropdown from '../../components/ui/Dropdown.jsx';
import InstanceModal from './InstanceModal.jsx';
import { LOADER_ICONS } from '../../lib/cfApi.js';
import './InstancesPage.css';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'Vanilla', label: 'Vanilla' },
  { id: 'Fabric', label: 'Fabric' },
  { id: 'Forge', label: 'Forge' }
];

const SORTS = [
  { value: 'name', label: 'Name' },
  { value: 'lastPlayed', label: 'Recently played' },
  { value: 'created', label: 'Recently created' }
];

function timeAgo(value) {
  if (!value) return 'Never played';
  const elapsed = Math.max(0, Date.now() - Number(value));
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 1) return 'Played just now';
  if (minutes < 60) return `Played ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Played ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Played ${days}d ago`;
  return `Played ${new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function InstanceArtwork({ instance }) {
  if (instance.icon) {
    return <img className="library-card-icon is-cover" src={instance.icon} alt="" loading="lazy" />;
  }
  if (LOADER_ICONS[instance.loader]) {
    return <img className="library-card-icon is-loader" src={LOADER_ICONS[instance.loader]} alt="" />;
  }
  return (
    <span className="library-card-icon is-fallback" style={{ '--instance-color': instance.color }}>
      <Boxes size={30} />
    </span>
  );
}

export default function InstancesPage({ store, onOpen = () => {} }) {
  const { instances, selected, select, create } = store;
  const [tab, setTab] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('lastPlayed');
  const [layout, setLayout] = useState('grid');
  const [creating, setCreating] = useState(false);

  const loaders = new Set(instances.map((instance) => instance.loader).filter(Boolean));
  const moddedCount = instances.filter((instance) => instance.loader && instance.loader !== 'Vanilla').length;
  const playedCount = instances.filter((instance) => instance.lastPlayed).length;

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = instances.filter((instance) =>
      (tab === 'all' || instance.loader === tab) &&
      (!needle || instance.name.toLowerCase().includes(needle) || instance.version?.toLowerCase().includes(needle))
    );
    return [...filtered].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'lastPlayed') return (b.lastPlayed ?? 0) - (a.lastPlayed ?? 0) || a.name.localeCompare(b.name);
      return (b.created ?? 0) - (a.created ?? 0);
    });
  }, [instances, tab, query, sort]);

  return (
    <div className="instances library-page">
      <section className="library-hero">
        <div className="library-hero-copy">
          <span className="library-eyebrow"><Layers3 size={12} /> Instance library</span>
          <h1>Your worlds, organized.</h1>
          <p>Keep vanilla profiles, modpacks, and experiments separate and ready to launch.</p>
        </div>
        <button className="accent-btn library-create" data-testid="instances-new-btn" onClick={() => setCreating(true)}>
          <Plus size={16} /> Create instance
        </button>
      </section>

      <section className="library-stats" aria-label="Instance overview">
        <div><span className="library-stat-icon"><Boxes size={15} /></span><strong>{instances.length}</strong><small>Total instances</small></div>
        <div><span className="library-stat-icon"><Gamepad2 size={15} /></span><strong>{playedCount}</strong><small>Played profiles</small></div>
        <div><span className="library-stat-icon"><Layers3 size={15} /></span><strong>{moddedCount}</strong><small>Modded setups</small></div>
        <div><span className="library-stat-icon"><Check size={15} /></span><strong>{loaders.size}</strong><small>Loader types</small></div>
      </section>

      <section className="library-toolbar">
        <div className="library-tabs" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={tab === item.id}
              className={tab === item.id ? 'active' : ''}
              onClick={() => setTab(item.id)}
            >
              {item.label}
              <small>{item.id === 'all' ? instances.length : instances.filter((i) => i.loader === item.id).length}</small>
            </button>
          ))}
        </div>
        <div className="library-tools">
          <label className="library-search">
            <Search size={15} />
            <input
              type="search"
              placeholder="Search name or version…"
              aria-label="Search instances"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <div className="library-sort"><Dropdown value={sort} options={SORTS} onChange={setSort} /></div>
          <div className="library-layout" aria-label="Layout">
            <button className={layout === 'grid' ? 'active' : ''} onClick={() => setLayout('grid')} title="Grid view"><Grid2X2 size={15} /></button>
            <button className={layout === 'list' ? 'active' : ''} onClick={() => setLayout('list')} title="List view"><List size={16} /></button>
          </div>
        </div>
      </section>

      <div className="library-scroll">
        {shown.length === 0 ? (
          <div className="instances-empty library-empty">
            <span><Boxes size={34} /></span>
            <h2>{instances.length === 0 ? 'Build your first profile' : 'Nothing matches that search'}</h2>
            <p>{instances.length === 0 ? 'Create a clean Minecraft setup in a few clicks.' : 'Try another name, version, or loader filter.'}</p>
            {instances.length === 0 && (
              <button className="accent-btn" data-testid="instances-empty-cta" onClick={() => setCreating(true)}>
                <Plus size={15} /> Create first instance
              </button>
            )}
          </div>
        ) : (
          <div className={`library-grid ${layout === 'list' ? 'is-list' : ''}`}>
            {shown.map((instance) => {
              const isActive = selected?.id === instance.id;
              return (
                <article
                  className={`library-card${isActive ? ' is-active' : ''}`}
                  key={instance.id}
                  onClick={() => onOpen(instance.id)}
                >
                  <div className="library-card-visual" style={{ '--instance-color': instance.color }}>
                    <InstanceArtwork instance={instance} />
                    <span className="library-loader-badge">{instance.loader || 'Vanilla'}</span>
                    {isActive && <span className="library-active-badge"><Check size={11} /> Active</span>}
                  </div>
                  <div className="library-card-body">
                    <div className="library-card-title">
                      <div>
                        <h2>{instance.name}</h2>
                        <p><Gamepad2 size={12} /> Minecraft {instance.version}</p>
                      </div>
                      <ArrowUpRight size={17} />
                    </div>
                    <div className="library-card-footer">
                      <span><Clock3 size={12} /> {timeAgo(instance.lastPlayed)}</span>
                      {isActive ? (
                        <span className="library-current">Launch default</span>
                      ) : (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            select(instance.id);
                          }}
                        >
                          <Check size={12} /> Set active
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {creating && (
        <InstanceModal
          initial={null}
          onClose={() => setCreating(false)}
          onSave={(values) => {
            create(values);
            setCreating(false);
          }}
        />
      )}
    </div>
  );
}
