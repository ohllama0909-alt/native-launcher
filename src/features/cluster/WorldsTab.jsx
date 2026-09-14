import React, { useEffect, useMemo, useState } from 'react';
import { FolderOpen, Globe2, Search, Trash2, Upload } from 'lucide-react';

const sizeOf = (bytes = 0) => bytes > 1024 * 1024 * 1024 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : bytes > 1024 * 1024 ? `${(bytes / 1024 ** 2).toFixed(1)} MB` : `${Math.max(0, Math.round(bytes / 1024))} KB`;

export default function WorldsTab({ cluster }) {
  const [worlds, setWorlds] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const load = () => { setLoading(true); Promise.resolve(window.native?.instance?.worldList?.(cluster.id) || []).then((rows) => setWorlds(rows || [])).finally(() => setLoading(false)); };
  useEffect(load, [cluster?.id]);
  const visible = useMemo(() => worlds.filter((world) => world.name.toLowerCase().includes(query.toLowerCase())), [worlds, query]);
  const remove = async (name) => { if (!window.confirm(`Delete “${name}”? This cannot be undone.`)) return; await window.native?.instance?.deleteWorld?.(cluster.id, name); load(); };
  return <div className="manager-pane worlds-manager">
    <div className="manager-pane-toolbar"><label><Search size={14}/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a world…"/></label><button onClick={() => window.native?.instance?.openFolder?.(cluster.id, 'saves')}><FolderOpen size={15}/></button></div>
    <div className="manager-drop-row"><span><Upload size={17}/></span><div><strong>Worlds</strong><small>Drag and drop world folders here, or browse your local saves.</small></div><em>{worlds.length} local worlds</em></div>
    {loading ? <div className="manager-loading-rows">{[1,2,3,4,5].map((x)=><i key={x}/>)}</div> : visible.length ? <div className="manager-file-list">{visible.map((world) => <div className="manager-file-row" key={world.name}><span className="manager-file-icon"><Globe2 size={18}/></span><div><strong>{world.name}</strong><small>{world.modified ? `Played ${new Date(world.modified).toLocaleDateString()}` : 'Local world'}</small></div><em>{sizeOf(world.sizeBytes)}</em><button onClick={() => remove(world.name)} title="Delete world"><Trash2 size={14}/></button></div>)}</div> : <div className="manager-empty">No worlds found for this instance.</div>}
  </div>;
}
