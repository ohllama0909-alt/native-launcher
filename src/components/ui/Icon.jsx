import React from 'react';
import { ONE_ICONS, ICON_ALIASES } from './iconsData.js';

export default function Icon({
  name,
  size = 20,
  color = 'currentColor',
  className = '',
  style = {}
}) {
  const resolvedName = ICON_ALIASES[name] || name;
  const iconData = ONE_ICONS[resolvedName];

  if (!iconData) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`icon icon-${name} ${className}`}
        style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      >
        <circle cx="12" cy="12" r="10" />
      </svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={iconData.viewBox}
      fill="none"
      className={`icon icon-${name} ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        color,
        ...style
      }}
      dangerouslySetInnerHTML={{ __html: iconData.inner }}
    />
  );
}
