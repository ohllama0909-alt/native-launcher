import React, { useState, useEffect } from 'react';

// In-memory cache for resolved Noctra skin URLs: username.toLowerCase() -> skinUrl
const noctraSkinCache = new Map();
const inFlightRequests = new Map();

export function resolveNoctraSkin(name) {
  if (!name || name === 'guest') return Promise.resolve(null);
  const key = name.toLowerCase().trim();
  if (noctraSkinCache.has(key)) return Promise.resolve(noctraSkinCache.get(key));
  if (inFlightRequests.has(key)) return inFlightRequests.get(key);

  const task = (async () => {
    try {
      const root = String(window.native?.wardrobeApi || 'http://127.0.0.1:3418').replace(/\/+$/, '');
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch(`${root}/csl/${encodeURIComponent(name)}.json`, { signal: ctrl.signal });
      clearTimeout(timer);

      if (res.ok) {
        const data = await res.json();
        const skin = data.skin || data.skins?.default || data.skins?.slim || null;
        if (skin) {
          noctraSkinCache.set(key, skin);
          return skin;
        }
      }
    } catch {}

    noctraSkinCache.set(key, null);
    return null;
  })().finally(() => inFlightRequests.delete(key));

  inFlightRequests.set(key, task);
  return task;
}

export function SkinFaceLayer({ src, pixels, offset, onError }) {
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={onError}
      style={{
        position: 'absolute',
        width: pixels * 8,
        height: pixels * 8,
        maxWidth: 'none',
        left: -pixels * offset,
        top: -pixels,
        imageRendering: 'pixelated',
        pointerEvents: 'none'
      }}
    />
  );
}

export default function RelayAvatar({
  name,
  uuid,
  skinUrl: initialSkinUrl,
  size = 38,
  className = '',
  status = null,
  showStatus = false
}) {
  const pixels = Math.max(16, Math.round(size));
  const key = (name || '').toLowerCase().trim();

  const [skinUrl, setSkinUrl] = useState(() => initialSkinUrl || noctraSkinCache.get(key) || null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (initialSkinUrl) {
      setSkinUrl(initialSkinUrl);
      if (key) noctraSkinCache.set(key, initialSkinUrl);
      return;
    }

    if (!skinUrl && key) {
      let active = true;
      resolveNoctraSkin(name).then((url) => {
        if (active && url) setSkinUrl(url);
      });
      return () => { active = false; };
    }
  }, [name, initialSkinUrl, key, skinUrl]);

  const statusColor = status === 'in-game' ? '#55db72' : status === 'in-launcher' || status === 'online' ? '#b05acb' : '#6a6470';

  return (
    <div
      className={`relay-avatar-container ${className}`}
      style={{
        position: 'relative',
        width: pixels,
        height: pixels,
        flex: 'none',
        borderRadius: Math.round(pixels * 0.22),
        overflow: 'hidden',
        background: '#19171e',
        display: 'grid',
        placeItems: 'center'
      }}
    >
      {skinUrl && !hasError ? (
        <span
          role="img"
          aria-label={name || 'Avatar'}
          style={{ position: 'absolute', inset: 0, overflow: 'hidden', imageRendering: 'pixelated' }}
        >
          {/* Base Face */}
          <SkinFaceLayer src={skinUrl} pixels={pixels} offset={1} onError={() => setHasError(true)} />
          {/* Outer Hat Layer */}
          <SkinFaceLayer src={skinUrl} pixels={pixels} offset={5} />
        </span>
      ) : (
        <img
          src={`https://mc-heads.net/avatar/${encodeURIComponent(uuid || name || 'MHF_Steve')}/64`}
          alt={name || 'Avatar'}
          draggable={false}
          onError={(e) => {
            e.currentTarget.src = 'https://mc-heads.net/avatar/MHF_Steve/64';
          }}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            imageRendering: 'pixelated'
          }}
        />
      )}

      {showStatus && status && (
        <span
          className={`relay-presence-badge ${status}`}
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: Math.max(8, Math.round(pixels * 0.25)),
            height: Math.max(8, Math.round(pixels * 0.25)),
            borderRadius: '50%',
            backgroundColor: statusColor,
            border: '2px solid #111013',
            boxShadow: status === 'in-game' ? '0 0 6px rgba(85, 219, 114, 0.7)' : 'none',
            zIndex: 2
          }}
        />
      )}
    </div>
  );
}
