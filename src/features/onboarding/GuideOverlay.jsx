import { useEffect, useMemo } from 'react';
import { ArrowLeft, ArrowRight, Check, FastForward, Sparkles, X } from 'lucide-react';
import GuideNpc from './GuideNpc.jsx';
import useTargetRect from './useTargetRect.js';
import './GuideOverlay.css';

const CARD_WIDTH = 360;
const CARD_HEIGHT = 250;
const GAP = 20;
const EDGE = 18;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function cardPosition(rect, preferred) {
  if (!rect) return null;

  const maxLeft = Math.max(EDGE, window.innerWidth - CARD_WIDTH - EDGE);
  const maxTop = Math.max(EDGE, window.innerHeight - CARD_HEIGHT - EDGE);
  const fits = {
    top: rect.top >= CARD_HEIGHT + GAP + EDGE,
    bottom: window.innerHeight - (rect.top + rect.height) >= CARD_HEIGHT + GAP + EDGE,
    left: rect.left >= CARD_WIDTH + GAP + EDGE,
    right: window.innerWidth - (rect.left + rect.width) >= CARD_WIDTH + GAP + EDGE
  };
  const side = fits[preferred]
    ? preferred
    : ['bottom', 'top', 'right', 'left'].find((candidate) => fits[candidate]) ?? preferred;

  if (side === 'top' || side === 'bottom') {
    return {
      left: clamp(rect.left + rect.width / 2 - CARD_WIDTH / 2, EDGE, maxLeft),
      top: side === 'top'
        ? clamp(rect.top - CARD_HEIGHT - GAP, EDGE, maxTop)
        : clamp(rect.top + rect.height + GAP, EDGE, maxTop)
    };
  }

  return {
    left: side === 'left'
      ? clamp(rect.left - CARD_WIDTH - GAP, EDGE, maxLeft)
      : clamp(rect.left + rect.width + GAP, EDGE, maxLeft),
    top: clamp(rect.top + rect.height / 2 - CARD_HEIGHT / 2, EDGE, maxTop)
  };
}

export default function GuideOverlay({ guide }) {
  const { active, step, stepIndex, stepDone, total, paused } = guide;
  const targets = useMemo(() => {
    const list = Array.isArray(step?.targets) ? step.targets : [];
    return list.map((target) => target.selector);
  }, [step]);
  const { rect, missing, matchIndex } = useTargetRect(targets, [stepIndex, active]);

  useEffect(() => {
    if (active) guide.reportMissing(missing);
  }, [active, missing, guide.reportMissing]);

  if (!active || !step) return null;

  const matchedTarget = matchIndex >= 0 ? step.targets[matchIndex] : null;
  const lines = matchedTarget?.text ?? (typeof step.text === 'function' ? step.text() : step.text) ?? [];
  const placement = matchedTarget?.placement ?? step.placement ?? 'bottom';
  const position = cardPosition(rect, placement);
  const last = stepIndex === total - 1;

  return (
    <div className="guide-layer" role="dialog" aria-modal="true" aria-labelledby="guide-title">
      {rect ? (
        <div
          className="guide-spotlight"
          style={{
            top: rect.top - 7,
            left: rect.left - 7,
            width: rect.width + 14,
            height: rect.height + 14
          }}
        />
      ) : <div className="guide-dimmer" />}

      <section
        className={`guide-card${position ? '' : ' guide-card--center'}`}
        style={position ?? undefined}
        data-testid="guide-card"
      >
        <button className="guide-close" onClick={guide.skip} title="Skip tour" aria-label="Skip tour">
          <X size={16} />
        </button>

        <div className="guide-card-main">
          <GuideNpc talking={!paused && !stepDone} size={68} />
          <div className="guide-copy">
            <span className="guide-kicker">
              <Sparkles size={12} /> Vill's launcher tour
            </span>
            <h2 id="guide-title">{stepDone ? 'Nice!' : step.title}</h2>
            {paused ? (
              <p>Installation is in progress. The tour will continue when navigation unlocks.</p>
            ) : stepDone ? (
              <p>That’s done. Let’s keep going.</p>
            ) : (
              lines.map((line) => <p key={line}>{line}</p>)
            )}
          </div>
        </div>

        <div className="guide-footer">
          <span className="guide-progress">{stepIndex + 1} / {total}</span>
          <div className="guide-actions">
            {step.type === 'narrated' ? (
              <>
                {stepIndex > 0 && (
                  <button className="guide-btn guide-btn--ghost" onClick={guide.back} disabled={paused}>
                    <ArrowLeft size={14} /> Back
                  </button>
                )}
                <button className="guide-btn guide-btn--accent" onClick={guide.next} disabled={paused}>
                  {last ? <Check size={14} /> : null}
                  {step.nextLabel ?? (last ? 'Finish' : 'Next')}
                  {!last && <ArrowRight size={14} />}
                </button>
              </>
            ) : stepDone ? (
              <span className="guide-success"><Check size={14} /> Complete</span>
            ) : (
              <>
                <button className="guide-btn guide-btn--ghost" onClick={guide.next} disabled={paused}>
                  Skip for now <FastForward size={13} />
                </button>
                {step.doItForMe && (
                  <button className="guide-btn guide-btn--accent" onClick={guide.doIt} disabled={paused}>
                    {step.doItLabel ?? 'Do it for me'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
