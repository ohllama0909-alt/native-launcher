import React, { useEffect, useMemo, useState } from 'react';
import {
  didAvatarFail,
  fallbackSkinFor,
  isAvatarReady,
  preloadAvatar,
  skinIdentifier,
  skinRenderUrl
} from '../../lib/skins.js';

/**
 * Renders a player avatar (flat head render). Body/bust renders are gone on
 * purpose: they were slow and showed the flat skin texture first.
 *
 * The image is decoded off-screen before it is painted, so the element goes
 * straight from a neutral placeholder to the finished avatar.
 */
export default function PlayerAvatar({
  account,
  uuid,
  name,
  kind = 'avatar',
  size = 32,
  radius,
  className = '',
  title,
  alt
}) {
  const pixels = Math.max(16, Math.round(size));
  const renderSize = Math.min(256, pixels * 2);

  const identifier = useMemo(
    () => skinIdentifier(account, uuid, name),
    [account, uuid, name]
  );

  const url = useMemo(
    () => skinRenderUrl(kind, identifier, renderSize),
    [kind, identifier, renderSize]
  );

  const [resolved, setResolved] = useState(() => (isAvatarReady(url) ? url : null));

  useEffect(() => {
    let cancelled = false;

    if (isAvatarReady(url)) {
      setResolved(url);
      return undefined;
    }

    setResolved(null);

    preloadAvatar(url).then((ok) => {
      if (cancelled) return;

      if (ok) {
        setResolved(url);
        return;
      }

      const fallback = fallbackSkinFor(kind, renderSize);
      if (fallback === url || didAvatarFail(fallback)) return;

      preloadAvatar(fallback).then((fallbackOk) => {
        if (!cancelled && fallbackOk) setResolved(fallback);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [url, kind, renderSize]);

  const label = account?.name || name || 'Player';
  const initial = label.slice(0, 1).toUpperCase();
  const cornerRadius = radius === undefined ? Math.round(pixels * 0.28) : radius;

  const boxStyle = {
    position: 'relative',
    width: pixels,
    height: pixels,
    flex: 'none',
    borderRadius: cornerRadius,
    overflow: 'hidden',
    background: 'var(--page-sunken, #12161d)',
    display: 'grid',
    placeItems: 'center'
  };

  return (
    <span className={className} style={boxStyle} title={title || label}>
      {!resolved && (
        <span
          aria-hidden="true"
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: Math.max(10, Math.round(pixels * 0.42)),
            fontWeight: 700,
            color: 'var(--fg-muted, #5c6273)',
            userSelect: 'none'
          }}
        >
          {initial}
        </span>
      )}

      {resolved && (
        <img
          src={resolved}
          alt={alt || label}
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            imageRendering: 'pixelated',
            animation: 'fadeIn 0.18s ease both'
          }}
        />
      )}
    </span>
  );
}
