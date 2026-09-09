import React, { useEffect, useState } from 'react';
import SteveAvatar from '../../assets/steve.png';
import AlexAvatar from '../../assets/alex.png';
import './PlayerAvatar.css';

/**
 * Renders a player's head / bust / full body skin render.
 *
 * Resolution order:
 *   1. `window.native.accounts.getAvatar(identifier, kind)` — the main process
 *      downloads once and caches to disk, returning a data URI. This works
 *      offline after the first fetch and never gets rate limited.
 *   2. A direct mc-heads.net render (works for both UUIDs and usernames, so
 *      offline accounts — which have no UUID — still get their real skin).
 *   3. The bundled Steve / Alex textures.
 */

const RENDERERS = {
  avatar: (id) => `https://mc-heads.net/avatar/${encodeURIComponent(id)}/128`,
  head: (id) => `https://mc-heads.net/head/${encodeURIComponent(id)}/180`,
  bust: (id) => `https://mc-heads.net/bust/${encodeURIComponent(id)}/220`,
  body: (id) => `https://mc-heads.net/body/${encodeURIComponent(id)}/260`
};

/** Shared across mounts so switching screens doesn't re-flash the skeleton. */
const resolvedCache = new Map();

export function accountIdentifier(account, uuid, name) {
  const rawUuid = uuid ?? account?.uuid ?? null;
  if (rawUuid) {
    const cleaned = String(rawUuid).replace(/-/g, '');
    if (/^[0-9a-fA-F]{32}$/.test(cleaned)) return cleaned;
  }
  const rawName = name ?? account?.name ?? '';
  // mc-heads resolves usernames too, which is how offline accounts get a skin.
  if (/^[A-Za-z0-9_]{2,16}$/.test(rawName) && rawName.toLowerCase() !== 'guest') {
    return rawName;
  }
  return null;
}

export function fallbackSkinFor(seed) {
  const text = String(seed || 'steve');
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }
  return hash % 2 === 0 ? SteveAvatar : AlexAvatar;
}

export default function PlayerAvatar({
  account,
  uuid,
  name,
  kind = 'avatar',
  size = 32,
  radius,
  className = '',
  style,
  alt
}) {
  const identifier = accountIdentifier(account, uuid, name);
  const fallback = fallbackSkinFor(name ?? account?.name ?? uuid ?? account?.uuid);
  const cacheKey = `${kind}:${identifier ?? 'none'}`;

  const [src, setSrc] = useState(() => resolvedCache.get(cacheKey) || null);
  const [loading, setLoading] = useState(() => !resolvedCache.has(cacheKey) && Boolean(identifier));

  useEffect(() => {
    let cancelled = false;

    if (!identifier) {
      setSrc(fallback);
      setLoading(false);
      return undefined;
    }

    const cached = resolvedCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      setLoading(false);
      return undefined;
    }

    setLoading(true);

    (async () => {
      let resolved = null;
      try {
        if (window.native?.accounts?.getAvatar) {
          resolved = await window.native.accounts.getAvatar(identifier, kind);
        }
      } catch {
        resolved = null;
      }
      if (!resolved) {
        const render = RENDERERS[kind] || RENDERERS.avatar;
        resolved = render(identifier);
      }
      if (cancelled) return;
      resolvedCache.set(cacheKey, resolved);
      setSrc(resolved);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [identifier, kind, cacheKey, fallback]);

  const isBody = kind === 'body' || kind === 'bust';
  const dimensions = isBody
    ? { width: size, height: kind === 'body' ? Math.round(size * 2.1) : Math.round(size * 1.25) }
    : { width: size, height: size };

  return (
    <span
      className={`player-avatar ${isBody ? 'is-render' : 'is-head'} ${loading ? 'is-loading' : ''} ${className}`.trim()}
      data-kind={kind}
      style={{
        ...dimensions,
        borderRadius: radius ?? (isBody ? 0 : Math.max(4, Math.round(size * 0.22))),
        ...style
      }}
    >
      <img
        src={src || fallback}
        alt={alt ?? (name ?? account?.name ?? 'Player')}
        draggable="false"
        onError={(event) => {
          resolvedCache.delete(cacheKey);
          event.currentTarget.onerror = null;
          event.currentTarget.src = fallback;
        }}
      />
    </span>
  );
}
