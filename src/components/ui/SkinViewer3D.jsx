import React, { useEffect, useRef, useState } from 'react';
import PlayerAvatar from './PlayerAvatar.jsx';
import { FALLBACK_SKIN, SKIN_SERVICE, skinIdentifier } from '../../lib/skins.js';

const SKIN_PATH = '/skin/';
const CAPE_PATH = '/cape/';

export function skinTextureUrl(account) {
  if (account?.skinUrl) return account.skinUrl;
  const id = skinIdentifier(account) || FALLBACK_SKIN;
  return SKIN_SERVICE + SKIN_PATH + encodeURIComponent(id);
}

export function capeTextureUrl(account) {
  if (account?.capeUrl) return account.capeUrl;
  const id = skinIdentifier(account) || FALLBACK_SKIN;
  return SKIN_SERVICE + CAPE_PATH + encodeURIComponent(id);
}

/**
 * Live 3D character built on skinview3d.
 *
 * The library is imported lazily so the launcher still runs (falling back to a
 * flat avatar) when node_modules have not been refreshed yet.
 */
export default function SkinViewer3D({
  account,
  width = 200,
  height = 300,
  animation = 'walk',
  paused = false,
  autoRotate = false,
  className = ''
}) {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const libRef = useRef(null);

  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const skinUrl = skinTextureUrl(account);

  /* ---- create the viewer once ---- */
  useEffect(() => {
    let disposed = false;

    import('skinview3d')
      .then((lib) => {
        if (disposed || !canvasRef.current) return;

        libRef.current = lib;
        const viewer = new lib.SkinViewer({
          canvas: canvasRef.current,
          width,
          height,
          skin: skinUrl,
          preserveDrawingBuffer: false
        });

        viewer.fov = 42;
        viewer.zoom = 0.82;
        viewer.autoRotate = autoRotate;
        viewer.autoRotateSpeed = 0.7;

        if (viewer.controls) {
          viewer.controls.enableZoom = false;
          viewer.controls.enablePan = false;
        }

        viewerRef.current = viewer;
        setReady(true);
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      try {
        viewerRef.current?.dispose?.();
      } catch {
        /* nothing to clean up */
      }
      viewerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- swap the skin when the account changes ---- */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ready) return;

    viewer.loadSkin(skinUrl).catch(() => {
      viewer.loadSkin(SKIN_SERVICE + SKIN_PATH + FALLBACK_SKIN).catch(() => {});
    });

    viewer.loadCape(capeTextureUrl(account)).catch(() => {
      try {
        viewer.loadCape(null);
      } catch {
        /* no cape is fine */
      }
    });
  }, [skinUrl, account, ready]);

  /* ---- animation selection ---- */
  useEffect(() => {
    const viewer = viewerRef.current;
    const lib = libRef.current;
    if (!viewer || !lib || !ready) return;

    const build = () => {
      if (animation === 'run' && lib.RunningAnimation) return new lib.RunningAnimation();
      if (animation === 'fly' && lib.FlyingAnimation) return new lib.FlyingAnimation();
      if (animation === 'idle' && lib.IdleAnimation) return new lib.IdleAnimation();
      if (lib.WalkingAnimation) return new lib.WalkingAnimation();
      return null;
    };

    const next = build();
    if (!next) return;

    next.speed = animation === 'run' ? 1.15 : 0.85;
    if ('headBobbing' in next) next.headBobbing = true;

    viewer.animation = next;
    viewer.animation.paused = paused;
  }, [animation, paused, ready]);

  /* ---- keep the canvas in sync with the layout ---- */
  useEffect(() => {
    if (!viewerRef.current || !ready) return;
    viewerRef.current.setSize?.(width, height);
  }, [width, height, ready]);

  if (failed) {
    return (
      <div className={'skin3d-fallback ' + className} style={{ width, height }}>
        <PlayerAvatar kind="avatar" size={Math.min(112, Math.round(width * 0.6))} account={account} />
        <span className="skin3d-fallback-note">Run npm install to enable the 3D view</span>
      </div>
    );
  }

  return (
    <div className={'skin3d-stage ' + className} style={{ width, height }}>
      <canvas ref={canvasRef} className={'skin3d-canvas ' + (ready ? 'is-ready' : '')} />
      {!ready && <span className="skin3d-loading" />}
    </div>
  );
}
