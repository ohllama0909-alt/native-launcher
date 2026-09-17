import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import './WelcomeTour.css';

const TOUR_STEPS = [
  {
    target: '[data-tour="brand"]',
    eyebrow: 'Welcome to Noctra',
    title: 'Everything starts here',
    body: 'The sidebar keeps every launcher tool one click away. Your current page is always marked with the accent colour.'
  },
  {
    target: '[data-tour="home"]',
    eyebrow: 'Play',
    title: 'Home',
    body: 'Launch the selected instance, switch between recent games, or jump straight into creating a new setup.'
  },
  {
    target: '[data-tour="instances"]',
    eyebrow: 'Library',
    title: 'Instances',
    body: 'Manage every Minecraft installation, open its settings, view logs, and add compatible mods.'
  },
  {
    target: '[data-tour="versions"]',
    eyebrow: 'Discover',
    title: 'Minecraft versions',
    body: 'Browse releases and snapshots, choose a loader, then create or launch an instance from a version card.'
  },
  {
    target: '[data-tour="modpacks"]',
    eyebrow: 'Discover',
    title: 'Modpacks',
    body: 'Find curated packs and install them as isolated instances without disturbing your other games.'
  },
  {
    target: '[data-tour="skins"]',
    eyebrow: 'Personalize',
    title: 'Locker',
    body: 'Preview, upload, equip, and sync your skins and capes. Cloud features require a Noctra account.'
  },
  {
    target: '[data-tour="relay"]',
    eyebrow: 'Connect',
    title: 'Relay',
    body: 'Chat with friends, see who is online, and join their Minecraft server from the launcher.'
  },
  {
    target: '[data-tour="account"]',
    eyebrow: 'Identity',
    title: 'Your accounts',
    body: 'Switch profiles, add Microsoft or Noctra accounts, and choose which player identity launches the game.'
  },
  {
    target: '[data-tour="settings"]',
    eyebrow: 'Customize',
    title: 'Settings',
    body: 'Control appearance, Java, memory, storage, launcher behavior, and updates from one place.'
  },
  {
    target: '[data-tour="tutorial"]',
    preferredSide: 'bottom',
    eyebrow: 'Any time',
    title: 'Replay this quick tour',
    body: 'Use the Quick tour button in the title bar whenever you want a refresher. You are ready to play.'
  }
];

const CARD_WIDTH = 340;
const CARD_HEIGHT = 236;
const EDGE_GAP = 14;
const TARGET_GAP = 14;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function positionCard(rect, viewport, preferredSide) {
  const centeredTop = clamp(rect.top + rect.height / 2 - CARD_HEIGHT / 2, EDGE_GAP, viewport.height - CARD_HEIGHT - EDGE_GAP);
  const centeredLeft = clamp(rect.left + rect.width / 2 - CARD_WIDTH / 2, EDGE_GAP, viewport.width - CARD_WIDTH - EDGE_GAP);

  const canFitBottom = rect.bottom + TARGET_GAP + CARD_HEIGHT <= viewport.height - EDGE_GAP;
  const canFitRight = rect.right + TARGET_GAP + CARD_WIDTH <= viewport.width - EDGE_GAP;
  const canFitLeft = rect.left - TARGET_GAP - CARD_WIDTH >= EDGE_GAP;
  const canFitTop = rect.top - TARGET_GAP - CARD_HEIGHT >= EDGE_GAP;

  if (preferredSide === 'bottom' && canFitBottom) {
    return { left: centeredLeft, top: rect.bottom + TARGET_GAP, side: 'bottom' };
  }
  if (preferredSide === 'left' && canFitLeft) {
    return { left: rect.left - TARGET_GAP - CARD_WIDTH, top: centeredTop, side: 'left' };
  }
  if (preferredSide === 'right' && canFitRight) {
    return { left: rect.right + TARGET_GAP, top: centeredTop, side: 'right' };
  }
  if (preferredSide === 'top' && canFitTop) {
    return { left: centeredLeft, top: rect.top - TARGET_GAP - CARD_HEIGHT, side: 'top' };
  }

  if (canFitRight) {
    return { left: rect.right + TARGET_GAP, top: centeredTop, side: 'right' };
  }
  if (canFitBottom) {
    return { left: centeredLeft, top: rect.bottom + TARGET_GAP, side: 'bottom' };
  }
  if (canFitLeft) {
    return { left: rect.left - TARGET_GAP - CARD_WIDTH, top: centeredTop, side: 'left' };
  }
  return {
    left: centeredLeft,
    top: clamp(rect.top - TARGET_GAP - CARD_HEIGHT, EDGE_GAP, viewport.height - CARD_HEIGHT - EDGE_GAP),
    side: 'top'
  };
}

export default function WelcomeTour({ open, onClose }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [layout, setLayout] = useState(null);
  const nextRef = useRef(null);
  const step = TOUR_STEPS[stepIndex];
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  const measure = useCallback(() => {
    if (!open || !step) return;
    const target = document.querySelector(step.target);
    if (!target) {
      setLayout(null);
      return;
    }

    const rect = target.getBoundingClientRect();
    const computed = window.getComputedStyle(target);
    const rawRadius = parseFloat(computed.borderRadius) || 0;

    const isPill =
      step.target === '[data-tour="tutorial"]' ||
      target.classList.contains('quick-tutorial-btn') ||
      rawRadius >= Math.min(rect.width, rect.height) / 2 - 2 ||
      computed.borderRadius.includes('9999') ||
      computed.borderRadius.includes('100%');

    let padX = 5;
    let padY = 5;

    if (isPill) {
      padX = 6;
      padY = rect.top <= 8 ? Math.max(2.5, Math.min(3.5, rect.top - 2)) : 4;
    }

    const top = Math.max(2, Math.round((rect.top - padY) * 2) / 2);
    const verticalPad = rect.top - top;
    const height = Math.round((rect.height + verticalPad * 2) * 2) / 2;

    const left = Math.max(2, Math.round((rect.left - padX) * 2) / 2);
    const horizontalPad = rect.left - left;
    const width = Math.round((rect.width + horizontalPad * 2) * 2) / 2;

    const borderRadius = isPill
      ? 9999
      : Math.min(Math.round((rawRadius || 10) + 4), height / 2);

    const targetRect = {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      borderRadius
    };
    const card = positionCard(targetRect, { width: window.innerWidth, height: window.innerHeight }, step.preferredSide);
    setLayout({ target: targetRect, card });
  }, [open, step]);

  useLayoutEffect(() => {
    if (!open) return undefined;
    measure();
    const frame = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
    };
  }, [open, stepIndex, measure]);

  useEffect(() => {
    if (!open) return undefined;
    const focusFrame = requestAnimationFrame(() => nextRef.current?.focus());
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.('skip');
      if (event.key === 'ArrowLeft' && stepIndex > 0) setStepIndex((value) => value - 1);
      if ((event.key === 'ArrowRight' || event.key === 'Enter') && event.target?.tagName !== 'BUTTON') {
        if (isLast) onClose?.('complete');
        else setStepIndex((value) => value + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isLast, onClose, open, stepIndex]);

  useEffect(() => {
    if (!open) setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !step) return undefined;
    const target = document.querySelector(step.target);
    if (!target) return undefined;
    target.setAttribute('data-tour-target-active', 'true');
    return () => {
      target.removeAttribute('data-tour-target-active');
    };
  }, [open, stepIndex, step]);

  if (!open || !layout) return null;

  const progress = ((stepIndex + 1) / TOUR_STEPS.length) * 100;
  return (
    <div className="welcome-tour" role="presentation">
      <div
        className="welcome-tour-spotlight"
        aria-hidden="true"
        style={{
          left: layout.target.left,
          top: layout.target.top,
          width: layout.target.width,
          height: layout.target.height,
          borderRadius: `${layout.target.borderRadius}px`
        }}
      />

      <section
        className={`welcome-tour-card is-${layout.card.side}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-tour-title"
        style={{ left: layout.card.left, top: layout.card.top }}
      >
        <div className="welcome-tour-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>

        <button type="button" className="welcome-tour-close" onClick={() => onClose?.('skip')} aria-label="Close tutorial">
          <X size={15} />
        </button>

        <span className="welcome-tour-step">{step.eyebrow} · {stepIndex + 1} of {TOUR_STEPS.length}</span>
        <h2 id="welcome-tour-title">{step.title}</h2>
        <p>{step.body}</p>

        <footer className="welcome-tour-actions">
          <button type="button" className="welcome-tour-skip" onClick={() => onClose?.('skip')}>Skip tour</button>
          <div>
            <button
              type="button"
              className="welcome-tour-back"
              onClick={() => setStepIndex((value) => Math.max(0, value - 1))}
              disabled={stepIndex === 0}
              aria-label="Previous tutorial step"
            >
              <ArrowLeft size={14} />
            </button>
            <button
              ref={nextRef}
              type="button"
              className="welcome-tour-next"
              onClick={() => {
                if (isLast) onClose?.('complete');
                else setStepIndex((value) => value + 1);
              }}
            >
              <span>{isLast ? 'Finish' : 'Next'}</span>
              {isLast ? <Check size={15} /> : <ArrowRight size={15} />}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
