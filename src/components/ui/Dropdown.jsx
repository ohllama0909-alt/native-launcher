import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import NativeIcon from './NativeIcon.jsx';
import './Dropdown.css';

/**
 * Clean custom select. Replaces the native <select> so the menu matches the
 * launcher theme, and flips upwards when there is no room below.
 */
export default function Dropdown({
  value,
  options = [],
  onChange,
  placeholder = 'Select',
  disabled = false,
  className = '',
  align = 'stretch',
  maxHeight = 260
}) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const rootRef = useRef(null);
  const listRef = useRef(null);

  const selected = options.find((option) => option.value === value) || null;

  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  // Decide which way the menu should open before it paints.
  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom;
    const wanted = Math.min(maxHeight, options.length * 34 + 12);
    setDropUp(below < wanted + 16 && rect.top > below);
  }, [open, options.length, maxHeight]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const active = listRef.current.querySelector('.dropdown-option.active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [open]);

  const pick = (option) => {
    setOpen(false);
    if (option.value !== value) onChange?.(option.value);
  };

  const moveSelection = (delta) => {
    if (!options.length) return;
    const current = options.findIndex((option) => option.value === value);
    const next = Math.min(options.length - 1, Math.max(0, (current < 0 ? 0 : current) + delta));
    onChange?.(options[next].value);
  };

  return (
    <div
      ref={rootRef}
      className={'dropdown ' + (open ? 'is-open ' : '') + className}
      data-align={align}
    >
      <button
        type="button"
        className="dropdown-trigger"
        disabled={disabled || !options.length}
        onClick={() => setOpen((state) => !state)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault();
            setOpen(true);
          } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveSelection(1);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveSelection(-1);
          }
        }}
      >
        <span className="dropdown-value">
          {selected ? selected.label : <span className="dropdown-placeholder">{placeholder}</span>}
        </span>
        {selected?.hint && <span className="dropdown-hint">{selected.hint}</span>}
        <NativeIcon name="chevron-down" size={14} className="dropdown-caret" />
      </button>

      {open && (
        <div
          ref={listRef}
          className={'dropdown-menu ' + (dropUp ? 'drop-up' : '')}
          style={{ maxHeight }}
          role="listbox"
        >
          {options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={'dropdown-option ' + (option.value === value ? 'active' : '')}
              onClick={() => pick(option)}
              disabled={option.disabled}
            >
              <span className="dropdown-option-label">{option.label}</span>
              {option.hint && <span className="dropdown-option-hint">{option.hint}</span>}
              {option.value === value && <NativeIcon name="check" size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
