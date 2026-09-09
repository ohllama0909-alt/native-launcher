import React, { useEffect, useState } from 'react';
import SteveAvatar from '../../assets/steve.png';
import AlexAvatar from '../../assets/alex.png';
import { skinIdentifier, skinRenderUrl } from '../../lib/skins.js';
import './PlayerAvatar.css';

/**
 * Renders a player's head / bust / full-body skin render.
 *
 * Resolution order:
 *   1. `window.native.accounts.getAvatar(identifier)` for head shots — the main
 *      process downloads once and caches to disk, so this keeps working while
 *      offline and never re-downloads on remount.
 *   2. The skin render service directly (needed for bust/body renders).
 *   3. The bundled Steve / Alex textures.
 *
 * The identifier is a UUID when we have one, otherwise the username, which is
 * how offline accounts finally get their real skin instead of always Steve.
 */

/** Shared across mounts so navigating between screens doesn't re-flash. */
const resolvedCache = new Map();

export { skinIdentifier as accountIdentifier };

/** Deterministic Steve-or-Alex so a given player always gets the same one. */
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
  const identifier = skinIdentifier(account, uuid, name);
  const fallback = fallbackSkinFor(name ?? account?.name ?? uuid ?? account?.uuid);
  const cacheKey = `${kind}:${identifier ?? 'none'}`;

  const [src, setSrc] = useState(() => resolvedCache.get(cacheKey) || null);
  const [loading, setLoading] = useState(
    () => Boolean(identifier) && !resolvedCache.has(cacheKey)
  );

  useEffect(() => {
    let cancelled = false;

    if (!identifier) {
      setSrc(null);
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

      // Head shots go through the cached bridge; larger renders are fetched
      // directly since the bridge only caches avatars.
      if (kind === 'avatar' || kind === 'head') {
        try {
          if (window.native?.accounts?.getAvatar) {
            resolved = await window.native.accounts.getAvatar(identifier);
          }
        } catch {
          resolved = null;
        }
      }

      if (!resolved) resolved = skinRenderUrl(kind, identifier);
      if (cancelled) return;

      resolvedCache.set(cacheKey, resolved);
      setSrc(resolved);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [identifier, kind, cacheKey]);

  const isRender = kind === 'body' || kind === 'bust';
  const height =
    kind === 'body'
      ? Math.round(size * 2.1)
      : kind === 'bust'
        ? Math.round(size * 1.25)
        : size;

  return (
    <span
      className={['player-avatar', isRender ? 'is-render' : 'is-head', loading ? 'is-loading' : '', className]
        .filter(Boolean)
        .join(' ')}
      data-kind={kind}
      style={{
        width: size,
        height,
        borderRadius: radius ?? (isRender ? 0 : Math.max(4, Math.round(size * 0.22))),
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
