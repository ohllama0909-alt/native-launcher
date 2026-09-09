import React, { useEffect, useState } from 'react';
import SteveAvatar from '../../assets/steve.png';
import AlexAvatar from '../../assets/alex.png';
import './PlayerAvatar.css';

/**
 * Renders a player's head / bust / full-body skin render.
 *
 * The main process owns the skin service URL and the on-disk cache
 * (see `accounts:getAvatar` in electron/auth.js), so the renderer never makes
 * a network request itself. That keeps one source of truth, survives being
 * offline after the first fetch, and avoids re-downloading a render on every
 * mount.
 *
 * Resolution order:
 *   1. `window.native.accounts.getAvatar(identifier, kind)` -> data URI
 *   2. The bundled Steve / Alex textures
 *
 * `identifier` is a UUID when we have one, otherwise the username, which is
 * what lets offline accounts (they have no UUID) still show their real skin.
 */

/** Shared across mounts so navigating between screens doesn't re-flash. */
const resolvedCache = new Map();

export function accountIdentifier(account, uuid, name) {
  const rawUuid = uuid ?? account?.uuid ?? null;
  if (rawUuid) {
    const cleaned = String(rawUuid).replace(/-/g, '');
    if (/^[0-9a-fA-F]{32}$/.test(cleaned)) return cleaned;
  }

  const rawName = name ?? account?.name ?? '';
  if (/^[A-Za-z0-9_]{2,16}$/.test(rawName) && rawName.toLowerCase() !== 'guest') {
    return rawName;
  }

  return null;
}

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
  const identifier = accountIdentifier(account, uuid, name);
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
      try {
        if (window.native?.accounts?.getAvatar) {
          resolved = await window.native.accounts.getAvatar(identifier, kind);
        }
      } catch {
        resolved = null;
      }

      if (cancelled) return;

      if (resolved) resolvedCache.set(cacheKey, resolved);
      setSrc(resolved || null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [identifier, kind, cacheKey]);

  const isRender = kind === 'body' || kind === 'bust';
  const height = kind === 'body'
    ? Math.round(size * 2.1)
    : kind === 'bust'
      ? Math.round(size * 1.25)
      : size;

  return (
    <span
      className={[
        'player-avatar',
        isRender ? 'is-render' : 'is-head',
        loading ? 'is-loading' : '',
        className
      ]
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
