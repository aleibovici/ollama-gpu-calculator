import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { matchesQuery } from './searchMatch';

/**
 * Searchable single-select (used for GPUs and model presets).
 *
 * items: [{ key, name, detail?, badge?, haystack? }]
 *   name    main text; detail and badge are shown on the right
 *   haystack extra search text (lowercase), on top of name/detail/badge
 * clearItem: optional { key, name } shown first when nothing is typed
 *   (e.g. "custom / enter params").
 *
 * Typing on the closed box opens it and starts a search (see searchMatch.js).
 */
const SearchCombobox = ({
    items,
    value,
    onChange,
    id,
    ariaLabel,
    placeholder = '— select —',
    searchPlaceholder = 'Search…',
    clearItem = null,
    emptyText = (q) => `No match for “${q}”`,
}) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlight, setHighlight] = useState(0);
    const wrapRef = useRef(null);
    const inputRef = useRef(null);
    const triggerRef = useRef(null);
    const listRef = useRef(null);
    const returnFocus = useRef(false);
    const listboxId = useId();

    const selected = items.find((item) => item.key === value) ?? null;

    const options = useMemo(() => {
        const filtered = items.filter((item) => matchesQuery(item, query));
        return clearItem && !query.trim() ? [clearItem, ...filtered] : filtered;
    }, [items, query, clearItem]);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e) => {
            if (!wrapRef.current?.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const el = listRef.current?.querySelector(`[data-idx="${highlight}"]`);
        el?.scrollIntoView?.({ block: 'nearest' });
    }, [highlight, open]);

    useEffect(() => {
        if (open) {
            inputRef.current?.focus();
        } else if (returnFocus.current) {
            returnFocus.current = false;
            triggerRef.current?.focus();
        }
    }, [open]);

    const openMenu = (initialQuery = '') => {
        setQuery(initialQuery);
        // Start on the current selection when browsing; on the first match when searching.
        const startIdx = initialQuery
            ? 0
            : Math.max(0, (clearItem ? [clearItem, ...items] : items).findIndex((item) => item.key === value));
        setHighlight(startIdx);
        setOpen(true);
    };

    const closeMenu = (refocus = true) => {
        returnFocus.current = refocus;
        setOpen(false);
        setQuery('');
    };

    const pick = (item) => {
        onChange(item.key);
        closeMenu();
    };

    const onTriggerKey = (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            openMenu();
        } else if (e.key.length === 1 && e.key !== ' ' && !e.metaKey && !e.ctrlKey && !e.altKey) {
            // Start typing on the closed box to search.
            e.preventDefault();
            openMenu(e.key);
        }
    };

    const onInputKey = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, options.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (options[highlight]) pick(options[highlight]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeMenu();
        } else if (e.key === 'Tab') {
            closeMenu(false);
        }
    };

    return (
        <div ref={wrapRef} className={`iw-combobox ${open ? 'is-open' : ''}`}>
            {!open ? (
                <button
                    ref={triggerRef}
                    id={id}
                    type="button"
                    className="iw-combobox-trigger"
                    onClick={() => openMenu()}
                    onKeyDown={onTriggerKey}
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-label={ariaLabel}
                >
                    {selected ? (
                        <span className="iw-combobox-value">
                            <span>{selected.name}</span>
                            {selected.badge && <span className="iw-combobox-vram">{selected.badge}</span>}
                        </span>
                    ) : (
                        <span className="iw-combobox-placeholder">{placeholder}</span>
                    )}
                    <span className="iw-combobox-caret" aria-hidden="true">▾</span>
                </button>
            ) : (
                <>
                    <input
                        ref={inputRef}
                        id={id}
                        type="text"
                        className="iw-combobox-input"
                        placeholder={searchPlaceholder}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setHighlight(0);
                        }}
                        onKeyDown={onInputKey}
                        role="combobox"
                        aria-expanded="true"
                        aria-autocomplete="list"
                        aria-controls={listboxId}
                        aria-activedescendant={options[highlight] ? `${listboxId}-opt-${highlight}` : undefined}
                        aria-label={ariaLabel}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    <ul ref={listRef} id={listboxId} role="listbox" className="iw-combobox-menu" aria-label={ariaLabel}>
                        {options.length === 0 && <li className="iw-combobox-empty">{emptyText(query)}</li>}
                        {options.map((item, idx) => (
                            <li
                                key={item.key || '__clear'}
                                id={`${listboxId}-opt-${idx}`}
                                data-idx={idx}
                                role="option"
                                aria-selected={idx === highlight}
                                className={`iw-combobox-option ${idx === highlight ? 'is-active' : ''} ${item.key === value && item !== clearItem ? 'is-selected' : ''}`}
                                onMouseEnter={() => setHighlight(idx)}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    pick(item);
                                }}
                            >
                                <span className="iw-combobox-option-name">{item.name}</span>
                                <span className="iw-combobox-option-gen">{item.detail ?? ''}</span>
                                <span className="iw-combobox-option-vram">{item.badge ?? ''}</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};

export default SearchCombobox;
