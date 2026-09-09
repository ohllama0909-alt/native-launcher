import { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULTS, deepMerge } from '../settings/useSettings.js';
import { GUIDE_VERSION, MISSING_TARGET_GRACE_MS, STEPS, isImplicitlyComplete } from './guideSteps.js';

const LS_KEY = 'native.settings';
/** Let accounts/instances finish loading and the first page settle before deciding. */
const FIRST_RUN_DELAY_MS = 600;
/** Short "Nice!" beat after the user completes an interactive step. */
const CELEBRATE_MS = 900;

async function loadSettings() {
  if (window.native?.settings) {
    return deepMerge(DEFAULTS, (await window.native.settings.load()) ?? {});
  }
  let raw = null;
  try { raw = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); } catch { /* corrupt — ignore */ }
  return deepMerge(DEFAULTS, raw ?? {});
}

async function saveSettings(next) {
  if (window.native?.settings) return window.native.settings.save(next);
  localStorage.setItem(LS_KEY, JSON.stringify(next));
  return next;
}

/** Read-modify-write so a concurrent SettingsModal save is never clobbered. */
async function persistCompletion() {
  try {
    const fresh = await loadSettings();
    await saveSettings({
      ...fresh,
      onboarding: { ...(fresh.onboarding ?? {}), completedVersion: GUIDE_VERSION }
    });
  } catch (err) {
    console.error('Could not persist onboarding state:', err);
  }
}

const IDLE = { active: false, stepIndex: 0, mode: 'first-run', stepDone: false };

/**
 * Guided-tour state machine. `ctx` is the live launcher context from Shell —
 * it is stored in a ref so step callbacks always see the latest values.
 */
export default function useGuide(ctx) {
  const [state, setState] = useState(IDLE);
  const [decided, setDecided] = useState(false);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  const stateRef = useRef(state);
  stateRef.current = state;

  const { active, stepIndex, mode, stepDone } = state;
  const step = active ? STEPS[stepIndex] : null;
  const paused = active && !!ctx.sidebarLocked;

  // ── navigation ────────────────────────────────────────────────────────

  const finish = useCallback(() => {
    if (!stateRef.current.active) return;
    setState(IDLE);
    persistCompletion();
  }, []);

  const goTo = useCallback((index) => {
    const c = ctxRef.current;
    let i = index;
    // skip interactive steps that are already satisfied (e.g. replay with accounts present)
    while (i < STEPS.length && STEPS[i].type === 'interactive' && STEPS[i].isDone?.(c)) i += 1;
    if (i >= STEPS.length) {
      finish();
      return;
    }
    try { STEPS[i].onEnter?.(c); } catch (err) { console.error('guide onEnter failed:', err); }
    setState((s) => ({ ...s, active: true, stepIndex: i, stepDone: false }));
  }, [finish]);

  const start = useCallback((nextMode = 'first-run') => {
    setState({ active: true, stepIndex: 0, mode: nextMode, stepDone: false });
    try { STEPS[0].onEnter?.(ctxRef.current); } catch (err) { console.error('guide onEnter failed:', err); }
  }, []);

  const next = useCallback(() => {
    const s = stateRef.current;
    if (!s.active) return;
    goTo(s.stepIndex + 1);
  }, [goTo]);

  const back = useCallback(() => {
    const s = stateRef.current;
    if (!s.active) return;
    const c = ctxRef.current;
    let i = s.stepIndex - 1;
    while (i > 0 && STEPS[i].type === 'interactive' && STEPS[i].isDone?.(c)) i -= 1;
    if (i < 0) return;
    try { STEPS[i].onEnter?.(c); } catch (err) { console.error('guide onEnter failed:', err); }
    setState((st) => ({ ...st, stepIndex: i, stepDone: false }));
  }, []);

  const skip = finish;

  const doIt = useCallback(async () => {
    const s = stateRef.current;
    const cur = STEPS[s.stepIndex];
    if (!s.active || !cur?.doItForMe) return;
    try {
      await cur.doItForMe(ctxRef.current);
    } catch (err) {
      console.error('guide doItForMe failed:', err);
    }
  }, []);

  // ── first-run decision ─────────────────────────────────────────────────

  useEffect(() => {
    if (decided || !ctx.store?.loaded) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      const settings = await loadSettings();
      if (cancelled) return;
      const completed = settings?.onboarding?.completedVersion ?? 0;
      if (completed < GUIDE_VERSION) {
        if (isImplicitlyComplete(ctxRef.current)) {
          // existing user — never interrupt them, just mark it done
          persistCompletion();
        } else {
          start('first-run');
        }
      }
      setDecided(true);
    }, FIRST_RUN_DELAY_MS);
    return () => { cancelled = true; clearTimeout(t); };
  }, [decided, ctx.store?.loaded, start]);

  // ── auto-advance interactive steps ─────────────────────────────────────

  const isDoneNow = !!(active && step?.type === 'interactive' && step.isDone?.(ctx));

  useEffect(() => {
    if (!isDoneNow || stepDone) return undefined;
    setState((s) => ({ ...s, stepDone: true }));
    const t = setTimeout(() => {
      const c = ctxRef.current;
      // close anything the user opened while completing the step
      c.setProfileOpen?.(false);
      next();
    }, CELEBRATE_MS);
    return () => clearTimeout(t);
  }, [isDoneNow, stepDone, next]);

  // ── auto-skip narrated steps whose target never shows up ───────────────

  const missingRef = useRef(false);
  const missingTimer = useRef(0);

  const reportMissing = useCallback((missing) => {
    missingRef.current = missing;
    const s = stateRef.current;
    const cur = STEPS[s.stepIndex];
    const optional = cur?.optional ?? (cur?.type === 'narrated' && (cur?.targets?.length ?? 0) > 0);

    clearTimeout(missingTimer.current);
    if (!s.active || !missing || !optional || ctxRef.current.sidebarLocked) return;

    missingTimer.current = setTimeout(() => {
      if (missingRef.current && stateRef.current.active && stateRef.current.stepIndex === s.stepIndex) {
        next();
      }
    }, MISSING_TARGET_GRACE_MS);
  }, [next]);

  useEffect(() => () => clearTimeout(missingTimer.current), []);

  // ── Esc always exits ───────────────────────────────────────────────────

  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') skip();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active, skip]);

  return {
    active,
    paused,
    mode,
    stepIndex,
    step,
    stepDone,
    total: STEPS.length,
    steps: STEPS,
    start,
    next,
    back,
    skip,
    finish,
    doIt,
    reportMissing
  };
}
