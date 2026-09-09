import { useEffect, useRef, useState } from 'react';

/** How long to keep re-measuring every frame after something changes
 *  (covers the 0.24s `page-in` and `modal-pop` animations). */
const BURST_MS = 420;

function sameRect(a, b) {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

function resolve(selectors) {
  for (let i = 0; i < selectors.length; i++) {
    let el = null;
    try {
      el = document.querySelector(selectors[i]);
    } catch {
      // invalid selector — ignore
    }
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    return { el, index: i, rect: { top: r.top, left: r.left, width: r.width, height: r.height } };
  }
  return null;
}

/**
 * Tracks the bounding rect of the first DOM element matching one of
 * `selectors` (in priority order). Re-measures on layout changes, DOM
 * mutations, resize/scroll, and in a short rAF burst after `deps` change.
 *
 * @returns {{ rect: DOMRectLike|null, missing: boolean, matchIndex: number }}
 */
export default function useTargetRect(selectors, deps = []) {
  const [state, setState] = useState({ rect: null, missing: selectors.length > 0, matchIndex: -1 });
  const lastRef = useRef(state);
  const selectorsKey = selectors.join('\u0000');

  useEffect(() => {
    if (selectors.length === 0) {
      const next = { rect: null, missing: false, matchIndex: -1 };
      lastRef.current = next;
      setState(next);
      return undefined;
    }

    let raf = 0;
    let burstUntil = 0;
    let observedEl = null;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => burst()) : null;

    const measure = () => {
      const hit = resolve(selectors);
      const next = hit
        ? { rect: hit.rect, missing: false, matchIndex: hit.index }
        : { rect: null, missing: true, matchIndex: -1 };

      if (ro && hit && hit.el !== observedEl) {
        if (observedEl) ro.unobserve(observedEl);
        observedEl = hit.el;
        ro.observe(observedEl);
      }

      const prev = lastRef.current;
      if (prev.missing !== next.missing || prev.matchIndex !== next.matchIndex || !sameRect(prev.rect, next.rect)) {
        lastRef.current = next;
        setState(next);
      }
    };

    const tick = () => {
      measure();
      if (performance.now() < burstUntil) raf = requestAnimationFrame(tick);
      else raf = 0;
    };

    const burst = () => {
      burstUntil = performance.now() + BURST_MS;
      if (!raf) raf = requestAnimationFrame(tick);
    };

    const mo = new MutationObserver(() => burst());
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'placeholder', 'value', 'disabled'] });
    if (ro) ro.observe(document.body);

    window.addEventListener('resize', burst);
    document.addEventListener('scroll', burst, true);
    document.addEventListener('input', burst, true);

    burst();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      mo.disconnect();
      ro?.disconnect();
      window.removeEventListener('resize', burst);
      document.removeEventListener('scroll', burst, true);
      document.removeEventListener('input', burst, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectorsKey, ...deps]);

  return state;
}
