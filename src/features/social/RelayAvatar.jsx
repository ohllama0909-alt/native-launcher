import React, { useEffect, useState } from 'react';
import fallbackSkin from '../../assets/steve.png';

// Relay is a Noctra-only surface. Avatars resolve from the CustomSkinLoader API
// and deliberately never contact Mojang head-rendering proxy services.
const noctraSkinCache = new Map();
const inFlightRequests = new Map();
const NEGATIVE_CACHE_TTL = 30_000;

function cachedSkin(key) {
  const cached = noctraSkinCache.get(key);
  if (!cached) return undefined;
  if (cached.url || Date.now() - cached.checkedAt < NEGATIVE_CACHE_TTL) return cached.url;
  noctraSkinCache.delete(key);
  return undefined;
}

export function resolveNoctraSkin(name) {
  const key = String(name || '').toLowerCase().trim();
  if (!key || key === 'guest') return Promise.resolve(null);

  const cached = cachedSkin(key);
  if (cached !== undefined) return Promise.resolve(cached);
  if (inFlightRequests.has(key)) return inFlightRequests.get(key);

  const task = (async () => {
    const root = String(window.native?.wardrobeApi || 'http://127.0.0.1:3418').replace(/\/+$/, '');
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 3500);

    try {
      const res = await fetch(`${root}/csl/${encodeURIComponent(key)}.json`, {
        signal: ctrl.signal,
        cache: 'no-cache'
      });
      if (!res.ok) throw new Error(`Custom skin lookup failed (${res.status})`);

      const data = await res.json();
      const skin = data.skin || data.skins?.default || data.skins?.slim || null;
      noctraSkinCache.set(key, { url: skin, checkedAt: Date.now() });
      return skin;
    } catch {
      // Cache misses briefly so transient startup/network failures can self-heal.
      noctraSkinCache.set(key, { url: null, checkedAt: Date.now() });
      return null;
    } finally {
      window.clearTimeout(timer);
    }
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
  skinUrl: initialSkinUrl,
  size = 38,
  className = '',
  status = null,
  showStatus = false
}) {
  const pixels = Math.max(16, Math.round(size));
  const key = String(name || '').toLowerCase().trim();
  const [skinUrl, setSkinUrl] = useState(() => initialSkinUrl || cachedSkin(key) || null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    setHasError(false);

    if (initialSkinUrl) {
      setSkinUrl(initialSkinUrl);
      if (key) noctraSkinCache.set(key, { url: initialSkinUrl, checkedAt: Date.now() });
      return () => { active = false; };
    }

    setSkinUrl(cachedSkin(key) || null);
    if (key) {
      resolveNoctraSkin(key).then((url) => {
        if (active) setSkinUrl(url);
      });
    }

    return () => { active = false; };
  }, [initialSkinUrl, key]);

  const resolvedSkin = skinUrl && !hasError ? skinUrl : fallbackSkin;
  const statusColor = status === 'in-game'
    ? 'var(--success, #55db72)'
    : status === 'in-launcher' || status === 'online'
      ? 'var(--brand, #b05acb)'
      : 'var(--fg-muted, #6a6470)';

  return (
    <div
      className={`relay-avatar-container ${className}`}
      style={{
        position: 'relative',
        width: pixels,
        height: pixels,
        flex: 'none',
        borderRadius: 'var(--radius-sm, 6px)',
        overflow: 'hidden',
        background: 'var(--component-bg, #19171e)',
        display: 'grid',
        placeItems: 'center'
      }}
    >
      <span
        role="img"
        aria-label={name || 'Avatar'}
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', imageRendering: 'pixelated' }}
      >
        <SkinFaceLayer
          src={resolvedSkin}
          pixels={pixels}
          offset={1}
          onError={() => {
            if (resolvedSkin !== fallbackSkin) setHasError(true);
          }}
        />
        <SkinFaceLayer src={resolvedSkin} pixels={pixels} offset={5} />
      </span>

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
            border: '2px solid var(--page-elevated, #111013)',
            boxShadow: status === 'in-game' && 'var(--shadow-brand, 0 0 6px rgba(85, 219, 114, 0.7))',
            zIndex: 2
          }}
        />
      )}
    </div>
  );
}
