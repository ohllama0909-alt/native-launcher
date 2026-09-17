import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownWideNarrow, Check, ChevronDown } from 'lucide-react';
import { SORTS } from '../api/modrinthApi.js';
import { useI18n } from '../../../i18n/I18nProvider.jsx';

export default function SortSelect({ sort, onChange, sorts = SORTS }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const currentSort = sorts.find((entry) => entry.id === sort) || sorts[0];

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('pointerdown', handleOutsideClick);
    }
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [open]);

  return (
    <div className="browse-sort-select" ref={containerRef}>
      <button
        type="button"
        className={`browse-sort-trigger ${open ? 'is-open' : ''}`}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Sort by"
      >
        <ArrowDownWideNarrow size={14} className="browse-sort-icon" />
        <span className="browse-sort-label">
          {t(currentSort.key) || currentSort.id}
        </span>
        <ChevronDown size={14} className="browse-sort-chevron" />
      </button>

      {open && (
        <ul className="browse-sort-menu" role="listbox" aria-label="Sort options">
          {sorts.map((option) => {
            const isSelected = option.id === sort;
            return (
              <li
                key={option.id}
                role="option"
                aria-selected={isSelected}
                className={`browse-sort-item ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  onChange(option.id);
                  setOpen(false);
                }}
              >
                <span>{t(option.key) || option.id}</span>
                {isSelected && <Check size={14} className="browse-sort-check" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
