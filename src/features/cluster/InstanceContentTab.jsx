import React, { useCallback, useEffect, useState } from 'react';
import { FolderOpen, Package, Plus, RotateCcw, Trash2 } from 'lucide-react';

const formatSize = bytes => {
  if (!Number.isFinite(bytes)) return '';
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
};

const config = {
  mods: { folder: 'mods', title: '3rd Party Mods', noun: 'mods' },
  worlds: { folder: 'saves', title: 'Worlds', noun: 'worlds' },
  shaders: { folder: 'shaderpacks', title: 'Shaders', noun: 'shader packs' },
  textures: { folder: 'resourcepacks', title: 'Resources', noun: 'resource packs' },
  screenshots: { folder: 'screenshots', title: 'Screenshots', noun: 'screenshots' }
};

function WorldArtwork({ world }) {
  const hue = Number(world.artSeed || 0) % 360;
  return (
    <span className="im-world-art" style={{ '--world-hue': hue }} aria-hidden="true">
      <span className="im-world-sky"/>
      <span className="im-world-sun"/>
      <span className="im-world-hill is-back"/>
      <span className="im-world-hill is-front"/>
      {world.iconUrl && (
        <img src={world.iconUrl} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }}/>
      )}
    </span>
  );
}

export default function InstanceContentTab({ cluster, type, query, filtered, onBrowse }) {
  const { folder, title, noun } = config[type] || config.mods;
  const localOnly = type === 'worlds' || type === 'screenshots';
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  const load = useCallback(async () => {
    if (type === 'worlds') {
      return (await window.native.instance.worldList(cluster.id)).map(world => ({
        ...world,
        id: world.name,
        title: world.name,
        size: world.sizeBytes
      }));
    }
    const [manifest, files] = await Promise.all([
      window.native.mods.installed(cluster.id),
      window.native.instance.listDir(cluster.id, folder)
    ]);
    const tracked = Object.entries(manifest || {})
      .map(([id, value]) => ({ id, ...(typeof value === 'string' ? { filename: value } : value) }))
      .filter(entry => (entry.folder || 'mods') === folder);

    return [
      ...tracked.map(entry => ({
        ...entry,
        title: entry.metadata?.title || entry.filename,
        size: files.find(file => file.name === entry.filename)?.size,
        enabled: !entry.filename.endsWith('.disabled'),
        managed: true
      })),
      ...files
        .filter(file => !file.name.startsWith('.') && !tracked.some(entry => entry.filename === file.name))
        .map(file => ({
          id: file.name,
          filename: file.name,
          title: file.name,
          size: file.size,
          enabled: !file.name.endsWith('.disabled')
        }))
    ];
  }, [cluster.id, folder, type]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    load()
      .then(result => {
        if (!cancelled) setRows(result);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Could not load content.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [load, revision]);

  const action = async operation => {
    setBusy(true);
    setError('');
    try {
      await operation();
      setRevision(value => value + 1);
    } catch (err) {
      setError(err.message || 'The operation failed. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const openFolder = () => action(() => window.native.instance.openFolder(cluster.id, folder));

  const toggleContent = row => {
    const nextEnabled = !row.enabled;
    action(async () => {
      if (type === 'mods' && row.managed) {
        await window.native.mods.toggle({
          instanceId: cluster.id,
          projectId: row.id,
          enabled: nextEnabled
        });
      } else if (window.native?.instance?.toggleFile) {
        await window.native.instance.toggleFile(
          cluster.id,
          folder,
          row.filename,
          nextEnabled
        );
      } else {
        await window.native.mods.toggle({
          instanceId: cluster.id,
          projectId: row.id,
          enabled: nextEnabled
        });
      }
    });
  };

  const remove = row => {
    if (
      !window.confirm(
        `Delete “${row.title}”? ${
          type === 'worlds'
            ? 'This world will be permanently deleted. Back it up first.'
            : 'You can reinstall it from the browser.'
        }`
      )
    ) return;
    action(() =>
      type === 'worlds'
        ? window.native.instance.deleteWorld(cluster.id, row.name)
        : window.native.mods.remove({ instanceId: cluster.id, projectId: row.id })
    );
  };

  const visible = rows.filter(
    row =>
      `${row.title} ${row.metadata?.author || ''} ${row.filename || ''}`
        .toLowerCase()
        .includes(query.toLowerCase()) && !(filtered && !row.enabled)
  );

  if (filtered && type !== 'mods') {
    visible.sort((a, b) => a.title.localeCompare(b.title));
  }

  return (
    <div className="im-content">
      <div className="im-count" aria-live="polite">
        {loading ? `Fetching ${noun}…` : `${rows.length} ${noun} loaded`}
      </div>
      <div className="im-panel">
        <header className="im-section-heading">
          <button
            className="im-add"
            aria-label={localOnly ? `Open ${folder} folder` : `Browse ${noun}`}
            onClick={localOnly ? openFolder : onBrowse}
          >
            <Plus size={20}/>
          </button>
          <div className="im-heading-text">
            <h2>{title}</h2>
            <p>
              {localOnly
                ? `Local ${noun} for this Minecraft instance.`
                : `Drag & drop files here, or browse to add ${noun}.`}
            </p>
          </div>
          <small className="im-heading-badge">
            Stored locally<br/>
            {cluster.mc_version || cluster.version} · {cluster.mc_loader || cluster.loader}
          </small>
        </header>

        {error && (
          <div className="im-error" role="alert">
            <span>{error}</span>
            <button onClick={() => setRevision(value => value + 1)}>
              <RotateCcw size={13}/> Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="im-skeleton" aria-label="Loading content">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i}>
                <i/>
                <span><i/><i/></span>
                <i/>
              </div>
            ))}
          </div>
        ) : visible.length ? (
          visible.map(row => (
            <div
              className={`im-file-row ${row.enabled === false ? 'is-disabled' : ''}`}
              key={row.id}
            >
              <span className="im-file-icon">
                {row.metadata?.iconUrl ? (
                  <img
                    src={row.metadata.iconUrl}
                    alt=""
                    onError={event => { event.currentTarget.style.display = 'none'; }}
                  />
                ) : type === 'worlds' ? (
                  <WorldArtwork world={row}/>
                ) : (
                  <Package size={22}/>
                )}
              </span>

              <div className="im-file-name">
                <strong title={row.title}>{row.title}</strong>
                <small>
                  {row.metadata?.author
                    ? `By ${row.metadata.author}`
                    : type === 'worlds'
                      ? `Modified ${new Date(row.modified).toLocaleDateString()}`
                      : row.managed
                        ? 'Installed content'
                        : 'Local file · manage in folder'}
                </small>
              </div>

              <span className="im-file-meta">
                {row.metadata?.version}
                {row.metadata?.version && formatSize(row.size) ? ' • ' : ''}
                {formatSize(row.size)}
              </span>

              <div className="im-file-actions">
                {['mods', 'shaders', 'textures'].includes(type) && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={row.enabled}
                    aria-label={`Enable ${row.title}`}
                    className={`im-toggle-switch ${row.enabled ? 'is-enabled' : 'is-disabled'}`}
                    disabled={busy}
                    onClick={() => toggleContent(row)}
                    title={row.enabled ? `Disable ${row.title}` : `Enable ${row.title}`}
                  >
                    <span className="im-toggle-track">
                      <span className="im-toggle-thumb" />
                    </span>
                    <span className="im-toggle-text">{row.enabled ? 'Enabled' : 'Disabled'}</span>
                  </button>
                )}
                {row.managed || type === 'worlds' ? (
                  <button
                    className="im-delete"
                    aria-label={`Delete ${row.title}`}
                    disabled={busy}
                    onClick={() => remove(row)}
                  >
                    <Trash2 size={14}/>
                  </button>
                ) : (
                  <button
                    aria-label={`Open folder for ${row.title}`}
                    onClick={openFolder}
                  >
                    <FolderOpen size={14}/>
                  </button>
                )}
              </div>
            </div>
          ))
        ) : !error && (
          <div className="im-empty">
            {rows.length
              ? 'No matches. Try another search or clear the filter.'
              : `No ${noun} found yet.`}
            {!rows.length && (
              <button onClick={localOnly ? openFolder : onBrowse}>
                {localOnly ? `Open ${folder} folder` : `Browse ${noun}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
