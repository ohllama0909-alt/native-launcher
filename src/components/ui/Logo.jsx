import React, { useRef } from 'react';
import './Logo.css';

/**
 * The Native brand mark.
 *
 * A rounded badge carrying the gradient "N", optionally followed by the
 * wordmark. Gradient ids are made unique per instance so several logos can
 * live on the same screen without one clobbering the other's <defs>.
 */

let instanceCounter = 0;

function useInstanceId(prefix) {
  const ref = useRef(null);
  if (ref.current === null) {
    instanceCounter += 1;
    ref.current = `${prefix}-${instanceCounter}`;
  }
  return ref.current;
}

export function NativeMark({ size = 30, className = '', style }) {
  const gradientId = useInstanceId('native-mark-grad');
  const shineId = useInstanceId('native-mark-shine');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={`native-mark ${className}`.trim()}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6d4aff" />
          <stop offset="0.55" stopColor="#8b5cff" />
          <stop offset="1" stopColor="#b06bff" />
        </linearGradient>
        <linearGradient id={shineId} x1="0" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.32" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="32" height="32" rx="9.5" fill={`url(#${gradientId})`} />
      <rect x="0" y="0" width="32" height="32" rx="9.5" fill={`url(#${shineId})`} />
      <rect
        x="0.6"
        y="0.6"
        width="30.8"
        height="30.8"
        rx="9"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.22"
        strokeWidth="1.2"
      />
      <path
        d="M9 23V9h3.8l6.4 9.1V9H23v14h-3.8l-6.4-9.1V23z"
        fill="#ffffff"
      />
    </svg>
  );
}

export default function Logo({
  height = 30,
  variant = 'full',
  className = '',
  style,
  wordmark = 'Native'
}) {
  return (
    <span
      className={`native-logo native-logo-${variant} ${className}`.trim()}
      style={style}
    >
      <NativeMark size={height} />
      {variant === 'full' && (
        <span className="native-logo-text" style={{ fontSize: Math.round(height * 0.53) }}>
          {wordmark}
        </span>
      )}
    </span>
  );
}
