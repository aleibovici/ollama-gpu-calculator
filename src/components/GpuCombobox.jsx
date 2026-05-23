import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { gpuSpecs } from '../data/gpuSpecs';

const gpuList = Object.entries(gpuSpecs).map(([key, gpu]) => ({
    key,
    name: gpu.name,
    vram: gpu.vram,
    generation: gpu.generation,
    haystack: `${gpu.name} ${gpu.generation} ${gpu.vram}gb`.toLowerCase(),
}));

const findGpu = (key) => gpuList.find((g) => g.key === key);

const GpuCombobox = ({ value, onChange, ariaLabel }) => {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [highlight, setHighlight] = useState(0);
    const wrapRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);
    const listboxId = useId();

    const selected = findGpu(value);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return gpuList;
        return gpuList.filter((g) => g.haystack.includes(q));
    }, [query]);

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
        el?.scrollIntoView({ block: 'nearest' });
    }, [highlight, open]);

    const openMenu = () => {
        setOpen(true);
        setHighlight(0);
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const closeMenu = () => {
        setOpen(false);
        setQuery('');
    };

    const pick = (gpu) => {
        onChange(gpu.key);
        closeMenu();
    };

    const onKey = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filtered[highlight]) pick(filtered[highlight]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            closeMenu();
        } else if (e.key === 'Tab') {
            closeMenu();
        }
    };

    return (
        <div
            ref={wrapRef}
            className={`iw-combobox ${open ? 'is-open' : ''}`}
        >
            {!open ? (
                <button
                    type="button"
                    className="iw-combobox-trigger"
                    onClick={openMenu}
                    aria-haspopup="listbox"
                    aria-expanded="false"
                    aria-label={ariaLabel}
                >
                    {selected ? (
                        <span className="iw-combobox-value">
                            <span>{selected.name}</span>
                            <span className="iw-combobox-vram">{selected.vram}GB</span>
                        </span>
                    ) : (
                        <span className="iw-combobox-placeholder">— select or search model —</span>
                    )}
                    <span className="iw-combobox-caret" aria-hidden="true">▾</span>
                </button>
            ) : (
                <>
                    <input
                        ref={inputRef}
                        type="text"
                        className="iw-combobox-input"
                        placeholder="Search GPU…"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setHighlight(0);
                        }}
                        onKeyDown={onKey}
                        role="combobox"
                        aria-expanded="true"
                        aria-controls={listboxId}
                        aria-activedescendant={
                            filtered[highlight] ? `${listboxId}-opt-${highlight}` : undefined
                        }
                        aria-label={ariaLabel}
                    />
                    <ul
                        ref={listRef}
                        id={listboxId}
                        role="listbox"
                        className="iw-combobox-menu"
                    >
                        {filtered.length === 0 && (
                            <li className="iw-combobox-empty">No GPU matches “{query}”</li>
                        )}
                        {filtered.map((g, idx) => (
                            <li
                                key={g.key}
                                id={`${listboxId}-opt-${idx}`}
                                data-idx={idx}
                                role="option"
                                aria-selected={idx === highlight}
                                className={`iw-combobox-option ${idx === highlight ? 'is-active' : ''} ${g.key === value ? 'is-selected' : ''}`}
                                onMouseEnter={() => setHighlight(idx)}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    pick(g);
                                }}
                            >
                                <span className="iw-combobox-option-name">{g.name}</span>
                                <span className="iw-combobox-option-gen">{g.generation}</span>
                                <span className="iw-combobox-option-vram">{g.vram}GB</span>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};

export default GpuCombobox;
