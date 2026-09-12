import React, { useEffect, useRef, useState } from 'react';
import PlayerAvatar from './PlayerAvatar.jsx';
import { FALLBACK_SKIN, isLocalIdentity, SKIN_SERVICE, skinIdentifier } from '../../lib/skins.js';

const SKIN_PATH = '/skin/';
const CAPE_PATH = '/cape/';

export function skinTextureUrl(account) {
  if (account?.skinUrl) return account.skinUrl;
  // Local (Noctra or offline) accounts must never fall back to mc-heads by name,
  // as that queries a stranger's Mojang account with that username!
  if (isLocalIdentity(account)) {
    return SKIN_SERVICE + SKIN_PATH + FALLBACK_SKIN;
  }
  const id = skinIdentifier(account) || FALLBACK_SKIN;
  return SKIN_SERVICE + SKIN_PATH + encodeURIComponent(id);
}

export function capeTextureUrl(account) {
  if (!account || account?.capeUrl === null || account?.capeUrl === false || account?.hasCape === false) return null;
  if (account?.capeUrl) return account.capeUrl;
  return null;
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
  animation = null,
  paused = false,
  autoRotate = false,
  className = '',
  onViewer = null
}) {
  const canvasRef = useRef(null);
  const viewerRef = useRef(null);
  const libRef = useRef(null);

  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [selfHealed, setSelfHealed] = useState(null);

  // Self-heal local skins from wardrobe if account arrived without skinUrl
  useEffect(() => {
    if (account?.skinUrl || !isLocalIdentity(account) || !window.native?.wardrobe?.avatar) {
      setSelfHealed(null);
      return undefined;
    }
    let cancelled = false;
    window.native.wardrobe.avatar(account).then((res) => {
      if (!cancelled && res?.skinUrl) {
        setSelfHealed({ skinUrl: res.skinUrl, capeUrl: res.capeUrl, model: res.model });
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [account?.id, account?.skinUrl]);

  const effectiveAccount = selfHealed ? { ...account, ...selfHealed } : account;
  const skinUrl = effectiveAccount?.skinUrl || skinTextureUrl(effectiveAccount);
  const capeUrl = capeTextureUrl(effectiveAccount);
  const effectiveModel = effectiveAccount?.model;

  const loadedSkinRef = useRef(null);
  const loadedModelRef = useRef(null);
  const loadedCapeRef = useRef(null);
  const skinReqRef = useRef(0);
  const capeReqRef = useRef(0);

  const onViewerRef = useRef(onViewer);
  onViewerRef.current = onViewer;

  /* ---- create the viewer once ---- */
  useEffect(() => {
    let disposed = false;

    import('skinview3d')
      .then((lib) => {
        if (disposed || !canvasRef.current) return;

        libRef.current = lib;
        const initialModel = effectiveModel === 'slim' ? 'slim' : effectiveModel === 'classic' ? 'default' : 'auto-detect';
        const viewer = new lib.SkinViewer({
          canvas: canvasRef.current,
          width,
          height,
          model: initialModel,
          preserveDrawingBuffer: false
        });

        viewer.fov = 42;
        viewer.zoom = 0.82;
        viewer.autoRotate = autoRotate;
        viewer.autoRotateSpeed = 0.7;

        // Position cape at z = -2.5 so it rests cleanly behind the outer jacket layer (z = -2.25)
        // avoiding severe z-fighting and texture clipping on the character's back
        const applyCapeOffset = () => {
          if (viewer.playerObject?.cape) {
            viewer.playerObject.cape.position.z = -2.5;
          }
        };
        applyCapeOffset();

        if (viewer.playerObject?.resetJoints) {
          const origResetJoints = viewer.playerObject.resetJoints.bind(viewer.playerObject);
          viewer.playerObject.resetJoints = () => {
            origResetJoints();
            applyCapeOffset();
          };
        }

        if (viewer.controls) {
          viewer.controls.enableZoom = false;
          viewer.controls.enablePan = false;
          viewer.controls.addEventListener('change', () => {
            if (viewer.renderPaused) {
              viewer.render();
            }
          });
        }

        viewerRef.current = viewer;
        onViewerRef.current?.(viewer);
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

    // Arm width is explicit when the locker knows it, otherwise the library
    // infers it from the texture.
    const modelOption = effectiveModel === 'slim'
      ? 'slim'
      : effectiveModel === 'classic'
        ? 'default'
        : 'auto-detect';

    if (loadedSkinRef.current !== skinUrl || loadedModelRef.current !== modelOption) {
      loadedSkinRef.current = skinUrl;
      loadedModelRef.current = modelOption;
      const reqId = ++skinReqRef.current;
      viewer.loadSkin(skinUrl, { model: modelOption }).then(() => {
        if (reqId !== skinReqRef.current) return;
        if (viewer.renderPaused) viewer.render();
      }).catch(() => {
        if (reqId !== skinReqRef.current) return;
        viewer.loadSkin(SKIN_SERVICE + SKIN_PATH + FALLBACK_SKIN).then(() => {
          if (viewer.renderPaused) viewer.render();
        }).catch(() => {});
      });
    }

    if (loadedCapeRef.current !== capeUrl) {
      loadedCapeRef.current = capeUrl;
      const reqId = ++capeReqRef.current;
      if (capeUrl) {
        viewer.loadCape(capeUrl).then(() => {
          if (reqId !== capeReqRef.current) return;
          if (viewer.playerObject?.cape) {
            viewer.playerObject.cape.position.z = -2.5;
            viewer.playerObject.cape.visible = true;
          }
          if (viewer.renderPaused) viewer.render();
        }).catch(() => {
          if (reqId !== capeReqRef.current) return;
          try {
            viewer.loadCape(null);
            if (viewer.playerObject?.cape) {
              viewer.playerObject.cape.visible = false;
            }
            if (viewer.renderPaused) viewer.render();
          } catch {
            /* no cape is fine */
          }
        });
      } else {
        try {
          viewer.loadCape(null);
          if (viewer.playerObject?.cape) {
            viewer.playerObject.cape.visible = false;
          }
          if (viewer.renderPaused) viewer.render();
        } catch {}
      }
    }
  }, [skinUrl, capeUrl, effectiveModel, ready]);

  /* ---- live auto-rotate toggle ---- */
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !ready) return;
    viewer.autoRotate = autoRotate;
    if (autoRotate) viewer.render();
  }, [autoRotate, ready]);

  /* ---- animation selection ---- */
  useEffect(() => {
    const viewer = viewerRef.current;
    const lib = libRef.current;
    if (!viewer || !lib || !ready) return;

    if (!animation || animation === 'none') {
      viewer.animation = null;
      if (viewer.playerObject?.skin) {
        viewer.playerObject.skin.leftArm.rotation.set(0, 0, 0);
        viewer.playerObject.skin.rightArm.rotation.set(0, 0, 0);
        viewer.playerObject.skin.leftLeg.rotation.set(0, 0, 0);
        viewer.playerObject.skin.rightLeg.rotation.set(0, 0, 0);
        viewer.playerObject.skin.head.rotation.set(0, 0, 0);
      }
      if (!autoRotate) {
        viewer.renderPaused = true;
      }
      viewer.render();
      return;
    }

    const build = () => {
      if (animation === 'run' && lib.RunningAnimation) return new lib.RunningAnimation();
      if (animation === 'fly' && lib.FlyingAnimation) return new lib.FlyingAnimation();
      if (animation === 'idle' && lib.IdleAnimation) return new lib.IdleAnimation();
      if (animation === 'walk' && lib.WalkingAnimation) return new lib.WalkingAnimation();
      return null;
    };

    const next = build();
    if (!next) {
      viewer.animation = null;
      if (!autoRotate) viewer.renderPaused = true;
      viewer.render();
      return;
    }

    viewer.renderPaused = false;
    next.speed = animation === 'run' ? 1.15 : 0.85;
    if ('headBobbing' in next) next.headBobbing = true;

    viewer.animation = next;
    viewer.animation.paused = paused;
  }, [animation, paused, autoRotate, ready]);

  /* ---- keep the canvas in sync with the layout ---- */
  useEffect(() => {
    if (!viewerRef.current || !ready) return;
    viewerRef.current.setSize?.(width, height);
    if (viewerRef.current.renderPaused) {
      viewerRef.current.render();
    }
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
