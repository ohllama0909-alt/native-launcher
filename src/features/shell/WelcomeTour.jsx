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
    eyebrow: 'Any time',
    title: 'Replay this quick tour',
    body: 'Use the Quick tour button in the title bar whenever you want a refresher. You are ready to play.'
  }
];

const CARD_WIDTH = 340;
const CARD_HEIGHT = 236;
const EDGE_GAP = 14;
const TARGET_GAP = 18;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function positionCard(rect, viewport) {
  const centeredTop = clamp(rect.top + rect.height / 2 - CARD_HEIGHT / 2, EDGE_GAP, viewport.height - CARD_HEIGHT - EDGE_GAP);

  if (rect.right + TARGET_GAP + CARD_WIDTH <= viewport.width - EDGE_GAP) {
    return { left: rect.right + TARGET_GAP, top: centeredTop, side: 'right' };
  }

  if (rect.left - TARGET_GAP - CARD_WIDTH >= EDGE_GAP) {
    return { left: rect.left - TARGET_GAP - CARD_WIDTH, top: centeredTop, side: 'left' };
  }

  const left = clamp(rect.left + rect.width / 2 - CARD_WIDTH / 2, EDGE_GAP, viewport.width - CARD_WIDTH - EDGE_GAP);
  if (rect.bottom + TARGET_GAP + CARD_HEIGHT <= viewport.height - EDGE_GAP) {
    return { left, top: rect.bottom + TARGET_GAP, side: 'bottom' };
  }

  return {
    left,
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
    const targetRect = {
      left: Math.max(6, rect.left - 5),
      top: Math.max(6, rect.top - 5),
      width: rect.width + 10,
      height: rect.height + 10,
      right: rect.right + 5,
      bottom: rect.bottom + 5
    };
    const card = positionCard(targetRect, { width: window.innerWidth, height: window.innerHeight });
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
          height: layout.target.height
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
