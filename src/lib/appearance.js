/* ============================================================
   Native — appearance store

   Single source of truth for the launcher's look. Persists to
   localStorage, applies itself to <html> as data-attributes +
   accent variables, and notifies subscribers so the Settings
   panel and the rest of the UI stay in sync.
   ============================================================ */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'native.appearance';

export const ACCENT_PRESETS = [
  { id: 'ice', name: 'Ice', hex: '#4c9aff' },
  { id: 'mint', name: 'Mint', hex: '#3ddc84' },
  { id: 'aurora', name: 'Aurora', hex: '#22d3ee' },
  { id: 'ember', name: 'Ember', hex: '#ff7849' },
  { id: 'amber', name: 'Amber', hex: '#f0b429' },
  { id: 'rose', name: 'Rose', hex: '#f4679b' },
  { id: 'violet', name: 'Violet', hex: '#7c5cff' },
  { id: 'lime', name: 'Lime', hex: '#a3e635' },
  { id: 'steel', name: 'Steel', hex: '#94a3b8' }
];

export const SURFACE_PRESETS = [
  { id: 'dim', name: 'Dim', desc: 'Soft charcoal', swatch: '#1a1f26' },
  { id: 'dark', name: 'Dark', desc: 'Balanced', swatch: '#15191f' },
  { id: 'midnight', name: 'Midnight', desc: 'Deep black-blue', swatch: '#101319' },
  { id: 'black', name: 'Black', desc: 'True black, OLED', swatch: '#000000' }
];

export const CONTRAST_PRESETS = [
  { id: 'soft', name: 'Soft' },
  { id: 'normal', name: 'Normal' },
  { id: 'high', name: 'High' }
];

export const RADIUS_PRESETS = [
  { id: 'sharp', name: 'Sharp' },
  { id: 'soft', name: 'Soft' },
  { id: 'round', name: 'Round' }
];

export const DEFAULT_APPEARANCE = {
  accent: '#4c9aff',
  surface: 'midnight',
  contrast: 'normal',
  radius: 'soft',
  scale: 100,
  wallpaperDim: 72,
  animations: true,
  glow: true
};

/* ---------------- colour helpers ---------------- */

function clamp(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function normalizeHex(input) {
  if (typeof input !== 'string') return null;
  let hex = input.trim().replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return '#' + hex.toLowerCase();
}

function toRgb(hex) {
  const normalized = normalizeHex(hex) || DEFAULT_APPEARANCE.accent;
  const int = parseInt(normalized.slice(1), 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function toHex(r, g, b) {
  const part = (n) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, '0');
  return '#' + part(r) + part(g) + part(b);
}

function mix(hex, targetHex, amount) {
  const a = toRgb(hex);
  const b = toRgb(targetHex);
  const t = clamp(amount, 0, 1);
  return toHex(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t);
}

function rgba(hex, alpha) {
  const { r, g, b } = toRgb(hex);
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
}

export function luminance(hex) {
  const { r, g, b } = toRgb(hex);
  const channel = (value) => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Text colour that stays readable on top of the accent. */
export function onAccentText(hex) {
  return luminance(hex) > 0.42 ? '#080d14' : '#ffffff';
}

/* ---------------- store ---------------- */

const listeners = new Set();
let current = { ...DEFAULT_APPEARANCE };

function sanitize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const surfaceIds = SURFACE_PRESETS.map((s) => s.id);
  const contrastIds = CONTRAST_PRESETS.map((c) => c.id);
  const radiusIds = RADIUS_PRESETS.map((r) => r.id);

  return {
    accent: normalizeHex(source.accent) || DEFAULT_APPEARANCE.accent,
    surface: surfaceIds.includes(source.surface) ? source.surface : DEFAULT_APPEARANCE.surface,
    contrast: contrastIds.includes(source.contrast) ? source.contrast : DEFAULT_APPEARANCE.contrast,
    radius: radiusIds.includes(source.radius) ? source.radius : DEFAULT_APPEARANCE.radius,
    scale: Math.round(clamp(source.scale ?? DEFAULT_APPEARANCE.scale, 80, 130)),
    wallpaperDim: Math.round(clamp(source.wallpaperDim ?? DEFAULT_APPEARANCE.wallpaperDim, 0, 95)),
    animations: source.animations !== false,
    glow: source.glow !== false
  };
}

function readStorage() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : { ...DEFAULT_APPEARANCE };
  } catch {
    return { ...DEFAULT_APPEARANCE };
  }
}

function writeStorage(value) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* storage disabled — the theme still applies for this session */
  }
}

export function applyAppearance(appearance) {
  if (typeof document === 'undefined') return;
  const value = sanitize(appearance);
  const root = document.documentElement;

  root.dataset.surface = value.surface;
  root.dataset.contrast = value.contrast;
  root.dataset.radius = value.radius;
  root.dataset.motion = value.animations ? 'full' : 'reduced';
  root.dataset.glow = value.glow ? 'on' : 'off';

  const accent = value.accent;
  const style = root.style;

  style.setProperty('--brand', accent);
  style.setProperty('--brand-hover', mix(accent, '#ffffff', 0.14));
  style.setProperty('--brand-pressed', mix(accent, '#000000', 0.2));
  style.setProperty('--brand-2', mix(accent, '#ffffff', 0.3));
  style.setProperty('--brand-disabled', mix(accent, '#0a0c10', 0.62));
  style.setProperty('--brand-subtle', rgba(accent, 0.14));
  style.setProperty('--brand-subtle-hover', rgba(accent, 0.22));
  style.setProperty('--brand-border', rgba(accent, 0.38));
  style.setProperty('--brand-glow', rgba(accent, value.glow ? 0.42 : 0.16));
  style.setProperty('--brand-soft', mix(accent, '#ffffff', 0.55));
  style.setProperty('--fg-on-brand', onAccentText(accent));
  style.setProperty(
    '--brand-gradient',
    'linear-gradient(135deg, ' +
      mix(accent, '#000000', 0.12) +
      ' 0%, ' +
      accent +
      ' 55%, ' +
      mix(accent, '#ffffff', 0.24) +
      ' 100%)'
  );
  style.setProperty('--shadow-brand', value.glow ? '0 0 24px ' + rgba(accent, 0.32) : 'none');
  style.setProperty('--home-scrim', String(value.wallpaperDim / 100));

  const zoom = value.scale / 100;
  style.setProperty('--ui-scale', String(zoom));
  if (document.body) {
    document.body.style.zoom = zoom === 1 ? '' : String(zoom);
  }
}

export function getAppearance() {
  return { ...current };
}

export function setAppearance(patch) {
  current = sanitize({ ...current, ...patch });
  writeStorage(current);
  applyAppearance(current);
  listeners.forEach((listener) => listener(current));
  return current;
}

export function resetAppearance() {
  return setAppearance({ ...DEFAULT_APPEARANCE });
}

export function subscribeAppearance(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React binding — returns the live appearance plus a setter. */
export function useAppearance() {
  const [value, setValue] = useState(current);

  useEffect(() => subscribeAppearance(setValue), []);

  return [value, setAppearance];
}

/* Applied as soon as the module is imported so the saved theme
   is on screen before the first paint of the shell. */
if (typeof window !== 'undefined') {
  current = readStorage();
  applyAppearance(current);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyAppearance(current), { once: true });
  }
}
