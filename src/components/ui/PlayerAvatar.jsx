import React, { useEffect, useMemo, useState } from 'react';
import { didAvatarFail, fallbackSkinFor, isAvatarReady, preloadAvatar, skinIdentifier, skinRenderUrl } from '../../lib/skins.js';

/**
 * Renders a player avatar. Uploaded wardrobe textures are cropped locally from
 * the canonical 64×64 skin atlas; otherwise mc-heads resolves the official skin.
 */
export default function PlayerAvatar({ account, uuid, name, kind = 'avatar', size = 32, radius, className = '', title, alt }) {
  const pixels = Math.max(16, Math.round(size));
  const renderSize = Math.min(256, pixels * 2);
  const directSkinUrl = account?.skinUrl || null;
  const [directFailed, setDirectFailed] = useState(false);

  const identifier = useMemo(() => skinIdentifier(account, uuid, name), [account, uuid, name]);
  const url = useMemo(() => skinRenderUrl(kind, identifier, renderSize), [kind, identifier, renderSize]);
  const [resolved, setResolved] = useState(() => (isAvatarReady(url) ? url : null));

  useEffect(() => setDirectFailed(false), [directSkinUrl]);

  useEffect(() => {
    let cancelled = false;
    if (isAvatarReady(url)) { setResolved(url); return undefined; }
    setResolved(null);
    preloadAvatar(url).then((ok) => {
      if (cancelled) return;
      if (ok) { setResolved(url); return; }
      const fallback = fallbackSkinFor(kind, renderSize);
      if (fallback === url || didAvatarFail(fallback)) return;
      preloadAvatar(fallback).then((fallbackOk) => { if (!cancelled && fallbackOk) setResolved(fallback); });
    });
    return () => { cancelled = true; };
  }, [url, kind, renderSize]);

  const label = account?.name || name || 'Player';
  const initial = label.slice(0, 1).toUpperCase();
  const cornerRadius = radius === undefined ? Math.round(pixels * 0.28) : radius;
  const boxStyle = {
    position: 'relative', width: pixels, height: pixels, flex: 'none', borderRadius: cornerRadius,
    overflow: 'hidden', background: 'var(--page-sunken, #12161d)', display: 'grid', placeItems: 'center'
  };

  const showDirect = Boolean(directSkinUrl && !directFailed);

  return (
    <span className={className} style={boxStyle} title={title || label}>
      {!showDirect && !resolved && <span aria-hidden="true" style={{ fontFamily: 'var(--font-sans)', fontSize: Math.max(10, Math.round(pixels * 0.42)), fontWeight: 700, color: 'var(--fg-muted, #5c6273)', userSelect: 'none' }}>{initial}</span>}

      {showDirect && (
        <span aria-label={alt || label} role="img" style={{ position: 'absolute', inset: 0, overflow: 'hidden', imageRendering: 'pixelated' }}>
          <SkinFaceLayer src={directSkinUrl} pixels={pixels} offset={1} onError={() => setDirectFailed(true)} />
          <SkinFaceLayer src={directSkinUrl} pixels={pixels} offset={5} />
        </span>
      )}

      {!showDirect && resolved && <img src={resolved} alt={alt || label} draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', imageRendering: 'pixelated', animation: 'fadeIn 0.18s ease both' }} />}
    </span>
  );
}

function SkinFaceLayer({ src, pixels, offset, onError }) {
  return <img src={src} alt="" aria-hidden="true" draggable={false} onError={onError} style={{ position: 'absolute', width: pixels * 8, height: pixels * 8, maxWidth: 'none', left: -pixels * offset, top: -pixels, imageRendering: 'pixelated', pointerEvents: 'none' }} />;
}
