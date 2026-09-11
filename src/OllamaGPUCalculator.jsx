import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactGA from 'react-ga4';
import {
    runCalculator,
    formatGB,
    getCompatibilityTier,
    suggestedContextForVram,
    MODEL_PRESETS,
    getModelPreset,
} from './calculatorOutput';
import CompatibilityBanner from './components/CompatibilityBanner';
import GpuCombobox from './components/GpuCombobox';
import { gpuSpecs } from './data/gpuSpecs';

const QUANT_OPTIONS = [
    { value: '32', label: 'FP32', hint: '32-bit' },
    { value: '16', label: 'FP16', hint: 'BF16' },
    { value: '8', label: 'Q8_0', hint: '8-bit' },
    { value: '4.5', label: 'Q4_K_M', hint: '~4.5b' },
    { value: '4', label: 'NVFP4', hint: 'MLX' },
    { value: '4.25', label: 'MXFP4', hint: 'gpt-oss' },
];

const KV_CACHE_OPTIONS = [
    { value: 'f16', label: 'f16', hint: 'default' },
    { value: 'q8_0', label: 'q8_0', hint: '~½' },
    { value: 'q4_0', label: 'q4_0', hint: '~¼' },
];

const CONTEXT_OPTIONS = [4096, 8192, 16384, 32768, 65536, 131072, 262144, 1048576];

const NOTES = [
    'Estimates are ballpark — Ollama’s scheduler measures exact memory at load time; this tool does not.',
    'Multi-GPU on consumer PCIe scales sub-linearly. Ollama prefers fitting on one GPU; split path is used only when needed.',
    'Leave roughly 1–2 GB of VRAM margin for stable inference under load.',
    'Data-center GPUs (H100, H200, B200) are enterprise / cloud-rentable; DGX Spark (GB10) is a 128 GB unified-memory workstation SKU.',
    'Tokens/sec use a bandwidth-bound model. On Apple Silicon, Ollama’s MLX engine (NVFP4 / MTP / DFlash) can be faster — this calculator does not apply an MLX speedup multiplier.',
    'KV cache defaults to f16; q8_0 / q4_0 via OLLAMA_KV_CACHE_TYPE require Flash Attention.',
    'MoE presets: Required VRAM uses total weights; tok/s uses active parameters.',
    'AMD: Linux ROCm v7 for listed Radeon / Instinct / Ryzen AI; older or unsupported AMD on Windows often uses the Vulkan backend. Intel Arc is Vulkan-oriented — enter VRAM via a close discrete SKU if needed.',
    'NVIDIA driver floor is typically 550+ (570+ for older compute capabilities).',
    'Cloud tags (e.g. *:cloud) run on Ollama Cloud — no local VRAM.',
    'Power figures account for utilization during LLM inference, not peak TDP.',
];

const statusLabel = {
    ok: 'Compatible',
    warn: 'Borderline',
    bad: 'Insufficient',
};

const THEME_STORAGE_KEY = 'ogc-theme';

function formatContextLabel(len) {
    if (len >= 1048576) return `${len / 1048576}M tokens · ${len.toLocaleString()}`;
    return `${len / 1024}k tokens · ${len.toLocaleString()}`;
}

function poolMaxVram(gpuConfigs) {
    let max = 0;
    for (const cfg of gpuConfigs) {
        const spec = gpuSpecs[cfg.gpuModel];
        if (spec && spec.vram > max) max = spec.vram;
    }
    return max;
}

const OllamaGPUCalculator = () => {
    const nextGpuRowId = useRef(2);
    const [presetId, setPresetId] = useState('');
    const [parameters, setParameters] = useState('');
    const [quantization, setQuantization] = useState('16');
    const [kvCacheType, setKvCacheType] = useState('f16');
    const [contextLength, setContextLength] = useState(4096);
    const [gpuConfigs, setGpuConfigs] = useState([{ id: 1, gpuModel: '', count: '1' }]);
    const [theme, setTheme] = useState(
        () => (document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark')
    );

    const selectedPreset = useMemo(() => getModelPreset(presetId), [presetId]);
    const suggestedCtx = useMemo(() => {
        const vram = poolMaxVram(gpuConfigs);
        return vram > 0 ? suggestedContextForVram(vram) : null;
    }, [gpuConfigs]);

    const { results, validationErrors, warnings } = useMemo(() => {
        if (selectedPreset?.cloudOnly) {
            const output = runCalculator({
                parameters,
                quantization,
                contextLength,
                gpuConfigs,
                kvCacheType,
                presetId,
            });
            return {
                results: output.results,
                validationErrors: output.errors,
                warnings: output.warnings,
            };
        }

        if (!parameters.trim() && !gpuConfigs.some(c => c.gpuModel)) {
            return { results: null, validationErrors: {}, warnings: [] };
        }
        try {
            const output = runCalculator({
                parameters,
                quantization,
                contextLength,
                gpuConfigs,
                kvCacheType,
                presetId: presetId || null,
            });
            return {
                results: output.results,
                validationErrors: output.errors,
                warnings: output.warnings,
            };
        } catch (error) {
            console.error('Calculation error:', error);
            return {
                results: null,
                validationErrors: { calculation: 'An error occurred during calculations. Please check your inputs and try again.' },
                warnings: [],
            };
        }
    }, [parameters, quantization, contextLength, gpuConfigs, kvCacheType, presetId, selectedPreset]);

    useEffect(() => {
        if (!results || results.cloudOnly) return;
        const paramCount = parseFloat(parameters);
        if (Number.isNaN(paramCount) || paramCount <= 0) return;
        ReactGA.event({
            category: 'Calculator',
            action: 'Calculate',
            label: 'Mixed GPU Configuration',
            value: Math.round(paramCount),
        });
    }, [results, parameters]);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            // Ignore storage write issues to avoid impacting calculator behavior.
        }
    }, [theme]);

    const handlePresetChange = (id) => {
        setPresetId(id);
        if (!id) return;
        const preset = getModelPreset(id);
        if (!preset || preset.cloudOnly) {
            ReactGA.event({ category: 'Settings', action: 'Select Preset', label: id });
            return;
        }
        setParameters(String(preset.totalParamsB));
        setQuantization(preset.defaultQuant);
        const ctxOptions = CONTEXT_OPTIONS;
        const nearest = ctxOptions.includes(preset.contextDefault)
            ? preset.contextDefault
            : ctxOptions.reduce((best, n) =>
                Math.abs(n - preset.contextDefault) < Math.abs(best - preset.contextDefault) ? n : best
            );
        setContextLength(nearest);
        ReactGA.event({ category: 'Settings', action: 'Select Preset', label: id });
    };

    const handleQuantizationChange = (value) => {
        setQuantization(value);
        ReactGA.event({ category: 'Settings', action: 'Change Quantization', label: value });
    };

    const handleKvCacheChange = (value) => {
        setKvCacheType(value);
        ReactGA.event({ category: 'Settings', action: 'Change KV Cache', label: value });
    };

    const handleContextLengthChange = (value) => {
        setContextLength(parseInt(value, 10));
        ReactGA.event({ category: 'Settings', action: 'Change Context Length', label: `${value} tokens` });
    };

    const handleThemeToggle = () => {
        setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
    };

    const addGpuConfig = () => {
        setGpuConfigs([...gpuConfigs, { id: nextGpuRowId.current++, gpuModel: '', count: '1' }]);
    };
    const removeGpuConfig = (index) => setGpuConfigs(gpuConfigs.filter((_, i) => i !== index));
    const updateGpuConfig = (index, field, value) => {
        const next = [...gpuConfigs];
        next[index] = { ...next[index], [field]: value };
        setGpuConfigs(next);
    };

    const statusState = getCompatibilityTier(results);
    const utilizationPct = results && !results.cloudOnly
        ? Math.min(100, Math.max(0, (results.totalGPURAM / Math.max(results.effectiveVRAM, 0.001)) * 100))
        : 0;

    return (
        <main className="iw-shell">
            <header className="iw-header">
                <div>
                    <div className="iw-eyebrow">Ollama · GPU Compatibility Instrument</div>
                    <h1 className="iw-title">
                        Ollama GPU Compatibility Calculator
                    </h1>
                    <p className="iw-tagline">
                        Check if your GPU can run Ollama models and see estimated VRAM,
                        performance, and power.
                    </p>
                </div>

                <div className="iw-theme-toggle-wrap">
                    <button
                        type="button"
                        className={`iw-theme-toggle ${theme === 'light' ? 'is-light' : 'is-dark'}`}
                        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                        aria-pressed={theme === 'light'}
                        onClick={handleThemeToggle}
                    >
                        <span className="iw-theme-toggle-track">
                            <span className="iw-theme-toggle-icon iw-theme-toggle-icon--sun" aria-hidden="true">
                                <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                                    <circle cx="10" cy="10" r="3.3" />
                                    <path d="M10 2.3v2.1M10 15.6v2.1M2.3 10h2.1M15.6 10h2.1M4.6 4.6l1.5 1.5M13.9 13.9l1.5 1.5M15.4 4.6l-1.5 1.5M6.1 13.9l-1.5 1.5" />
                                </svg>
                            </span>
                            <span className="iw-theme-toggle-icon iw-theme-toggle-icon--moon" aria-hidden="true">
                                <svg viewBox="0 0 20 20" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M13.8 13.5a5.8 5.8 0 1 1-5.3-10 6.5 6.5 0 1 0 5.3 10z" />
                                </svg>
                            </span>
                            <span className="iw-theme-toggle-thumb" aria-hidden="true" />
                        </span>
                    </button>
                </div>

                <div className="iw-header-side">
                    <div className="iw-meta">
                        REV <span>v2</span> · CALIB <span>2026.09</span><br />
                        STATIC BUILD · GITHUB PAGES
                    </div>
                    <div className="iw-link-row">
                        <a className="iw-chip" href="https://github.com/aleibovici/ollama-gpu-calculator" target="_blank" rel="noopener noreferrer">★ GitHub</a>
                        <a className="iw-chip" href="https://www.reddit.com/r/ollama/comments/1gdux20/ollama_gpu_compatibility_calculator/" target="_blank" rel="noopener noreferrer">↳ Reddit</a>
                    </div>
                </div>
            </header>

            <div className="iw-bench">
                <section className="iw-panel" aria-labelledby="inputs-heading">
                    <div className="iw-panel-header">
                        <h2 id="inputs-heading" className="iw-panel-title">01 · Configuration</h2>
                        <span className="iw-panel-id">INPUT_BUS</span>
                    </div>
                    <div className="iw-panel-body">
                        {validationErrors.calculation && (
                            <div className="iw-advisory is-bad is-compact" role="alert">
                                <ul><li>{validationErrors.calculation}</li></ul>
                            </div>
                        )}

                        <div className="iw-field">
                            <label htmlFor="model-preset" className="iw-label">
                                <span>Model Preset</span>
                                <span className="iw-label-hint">optional</span>
                            </label>
                            <select
                                id="model-preset"
                                className="iw-select"
                                value={presetId}
                                onChange={(e) => handlePresetChange(e.target.value)}
                            >
                                <option value="">— custom / enter params —</option>
                                {MODEL_PRESETS.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.cloudOnly ? `${p.label} · Ollama Cloud` : p.label}
                                    </option>
                                ))}
                            </select>
                            {selectedPreset?.cloudOnly && (
                                <p className="iw-field-note" role="status">
                                    Use Ollama Cloud — no local VRAM. Local math is disabled for this tag.
                                </p>
                            )}
                            {selectedPreset && !selectedPreset.cloudOnly && selectedPreset.moe && (
                                <p className="iw-field-note">
                                    MoE: VRAM from {selectedPreset.totalParamsB}B total weights · tok/s from ~{selectedPreset.activeParamsB}B active
                                </p>
                            )}
                        </div>

                        <div className="iw-field">
                            <label htmlFor="parameters" className="iw-label">
                                <span>Model Parameters</span>
                                <span className="iw-label-hint">billions</span>
                            </label>
                            <input
                                type="number"
                                id="parameters"
                                className="iw-input"
                                value={parameters}
                                onChange={(e) => {
                                    setParameters(e.target.value);
                                    if (presetId && !selectedPreset?.cloudOnly) setPresetId('');
                                }}
                                placeholder="e.g. 7 for a 7B model"
                                min="0.1"
                                max="2000"
                                step="0.1"
                                disabled={!!selectedPreset?.cloudOnly}
                            />
                            {validationErrors.parameters && (
                                <p className="iw-field-error" role="alert">
                                    {validationErrors.parameters}
                                </p>
                            )}
                        </div>

                        <div className="iw-field">
                            <label htmlFor="gpu-model-0" className="iw-label">
                                <span>GPU Configuration</span>
                                <span className="iw-label-hint">{gpuConfigs.length} unit{gpuConfigs.length > 1 ? 's' : ''}</span>
                            </label>
                            {(validationErrors.gpu || validationErrors.gpuCount) && (
                                <p className="iw-field-error iw-field-error--leading" role="alert">
                                    {validationErrors.gpu || validationErrors.gpuCount}
                                </p>
                            )}

                            {gpuConfigs.map((config, index) => (
                                <div key={config.id} className="iw-gpu-row">
                                    <GpuCombobox
                                        value={config.gpuModel}
                                        onChange={(v) => updateGpuConfig(index, 'gpuModel', v)}
                                        ariaLabel={`GPU Model ${index + 1}`}
                                    />
                                    <select
                                        id={`gpu-count-${index}`}
                                        aria-label={`GPU Count ${index + 1}`}
                                        className="iw-select"
                                        value={config.count}
                                        onChange={(e) => updateGpuConfig(index, 'count', e.target.value)}
                                    >
                                        {[1, 2, 3, 4, 8].map((n) => (
                                            <option key={n} value={n.toString()}>×{n}</option>
                                        ))}
                                    </select>
                                    {index > 0 ? (
                                        <button
                                            type="button"
                                            className="iw-icon-btn"
                                            onClick={() => removeGpuConfig(index)}
                                            aria-label={`Remove GPU ${index + 1}`}
                                            title="Remove"
                                        >
                                            ×
                                        </button>
                                    ) : (
                                        <span className="iw-gpu-row-spacer" aria-hidden="true" />
                                    )}
                                </div>
                            ))}

                            <button type="button" className="iw-add-btn" onClick={addGpuConfig}>
                                + Add GPU
                            </button>
                        </div>

                        <div className="iw-field">
                            <label className="iw-label">
                                <span>Quantization</span>
                                <span className="iw-label-hint">weight format</span>
                            </label>
                            <div className="iw-segmented iw-segmented--6" role="radiogroup" aria-label="Quantization">
                                {QUANT_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={quantization === opt.value}
                                        className={quantization === opt.value ? 'is-active' : ''}
                                        onClick={() => handleQuantizationChange(opt.value)}
                                        disabled={!!selectedPreset?.cloudOnly}
                                    >
                                        {opt.label}
                                        <small>{opt.hint}</small>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="iw-field">
                            <label className="iw-label">
                                <span>KV Cache Type</span>
                                <span className="iw-label-hint">OLLAMA_KV_CACHE_TYPE</span>
                            </label>
                            <div className="iw-segmented iw-segmented--3" role="radiogroup" aria-label="KV Cache Type">
                                {KV_CACHE_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={kvCacheType === opt.value}
                                        className={kvCacheType === opt.value ? 'is-active' : ''}
                                        onClick={() => handleKvCacheChange(opt.value)}
                                        disabled={!!selectedPreset?.cloudOnly}
                                    >
                                        {opt.label}
                                        <small>{opt.hint}</small>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="iw-field">
                            <label htmlFor="context-length" className="iw-label">
                                <span>Context Window</span>
                                <span className="iw-label-hint">
                                    {contextLength >= 1048576 ? `${contextLength / 1048576}M` : `${contextLength / 1024}k`} tokens
                                </span>
                            </label>
                            <select
                                id="context-length"
                                className="iw-select"
                                value={contextLength}
                                onChange={(e) => handleContextLengthChange(e.target.value)}
                                disabled={!!selectedPreset?.cloudOnly}
                            >
                                {CONTEXT_OPTIONS.map(len => (
                                    <option key={len} value={len}>{formatContextLabel(len)}</option>
                                ))}
                            </select>
                            {suggestedCtx && !selectedPreset?.cloudOnly && (
                                <p className="iw-field-note">
                                    Suggested for VRAM (~{poolMaxVram(gpuConfigs)}GB tier):{' '}
                                    <button
                                        type="button"
                                        className="iw-inline-link"
                                        onClick={() => handleContextLengthChange(String(suggestedCtx))}
                                    >
                                        {formatContextLabel(suggestedCtx)}
                                    </button>
                                    {' '}(Ollama context-length.md; FAQ default remains 4k)
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="iw-panel iw-readout" aria-labelledby="readout-heading">
                    <div className="iw-panel-header">
                        <h2 id="readout-heading" className="iw-panel-title">02 · Live Readout</h2>
                        <span className="iw-panel-id">{results ? 'SIGNAL · LOCKED' : 'AWAITING · INPUT'}</span>
                    </div>

                    {!results ? (
                        <div className="iw-readout-empty">
                            <div className="iw-readout-empty-icon">~</div>
                            <div className="iw-readout-empty-text">
                                Enter model size and pick a GPU to begin
                            </div>
                        </div>
                    ) : results.cloudOnly ? (
                        <div className="iw-fade-in">
                            <div className="iw-status" data-state="ok">
                                <div>
                                    <span className="iw-status-dot" />
                                    <span className="iw-status-label">Ollama Cloud</span>
                                </div>
                                <span className="iw-status-meta">no local VRAM</span>
                            </div>
                            <div className="iw-hero">
                                <div className="iw-hero-inner">
                                    <div className="iw-hero-label">Local VRAM</div>
                                    <div className="iw-hero-value">
                                        0
                                        <span className="iw-hero-unit">gigabytes</span>
                                    </div>
                                    <div className="iw-hero-sub">
                                        <div>Use Ollama Cloud — this tag does not run locally</div>
                                    </div>
                                </div>
                            </div>
                            <CompatibilityBanner results={results} warnings={warnings} />
                        </div>
                    ) : (
                        <div className="iw-fade-in">
                            <div className="iw-status" data-state={statusState}>
                                <div>
                                    <span className="iw-status-dot" />
                                    <span className="iw-status-label">{statusLabel[statusState]}</span>
                                </div>
                                <span className="iw-status-meta">{results.gpuConfig || '—'}</span>
                            </div>

                            <div className="iw-hero">
                                <div className="iw-hero-inner">
                                    <div className="iw-hero-label">Required VRAM</div>
                                    <div className="iw-hero-value">
                                        {formatGB(results.totalGPURAM)}
                                        <span className="iw-hero-unit">gigabytes</span>
                                    </div>
                                    <div className="iw-hero-sub">
                                        <div><span>Model</span> <b>{formatGB(results.baseModelSizeGB)} GB</b></div>
                                        <div><span>KV cache</span> <b>{formatGB(results.kvCacheSize)} GB</b></div>
                                        {results.multimodalOverheadGB > 0 && (
                                            <div><span>Multimodal</span> <b>{formatGB(results.multimodalOverheadGB)} GB</b></div>
                                        )}
                                        <div><span>Margin</span> <b className="iw-signal-value" data-state={statusState}>
                                            {results.vramMargin >= 0 ? '+' : ''}{formatGB(results.vramMargin)} GB
                                        </b></div>
                                    </div>
                                    {results.isMoE && (
                                        <p className="iw-hero-moe">
                                            MoE fit uses total weights · decode tok/s uses ~{results.activeParamsB}B active
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="iw-gauge" data-state={statusState}>
                                <div className="iw-gauge-head">
                                    <span>VRAM Utilization</span>
                                    <b>{Math.round(utilizationPct)}%</b>
                                </div>
                                <div className="iw-gauge-track">
                                    <div
                                        className="iw-gauge-fill"
                                        style={{ '--iw-gauge-pct': `${Math.min(utilizationPct, 100)}%` }}
                                    />
                                    <div className="iw-gauge-ticks" />
                                </div>
                                <div className="iw-gauge-foot">
                                    <span>0 GB</span>
                                    <span>{formatGB(results.effectiveVRAM)} GB available</span>
                                </div>
                            </div>

                            <div className="iw-metrics">
                                <div className="iw-metric">
                                    <div className="iw-metric-label">
                                        {results.unifiedMemory ? 'Unified Memory' : 'System RAM'}
                                    </div>
                                    <div className="iw-metric-value">
                                        {formatGB(results.totalSystemRAM)}<span className="iw-metric-unit">GB</span>
                                    </div>
                                    <div className="iw-metric-detail">
                                        {results.unifiedMemory ? 'Shared GPU/CPU pool' : 'Recommended minimum'}
                                    </div>
                                </div>

                                <div className="iw-metric">
                                    <div className="iw-metric-label">Throughput</div>
                                    <div className="iw-metric-value">
                                        {results.tokensPerSecond ?? '—'}<span className="iw-metric-unit">tok/s</span>
                                    </div>
                                    <div className="iw-metric-detail">
                                        {results.scheduleMode === 'single' ? 'Single-GPU path' : 'Estimated decode rate'}
                                    </div>
                                </div>

                                <div className="iw-metric">
                                    <div className="iw-metric-label">Power Draw</div>
                                    <div className="iw-metric-value">
                                        {results.powerConsumption.totalPower}<span className="iw-metric-unit">W</span>
                                    </div>
                                    <div className="iw-metric-detail">
                                        {results.powerConsumption.powerDetails.map((d, i) => (
                                            <div key={i}>{d.count}× {d.name} · {d.power}W</div>
                                        ))}
                                        <div className="iw-metric-detail-note">
                                            +{results.powerConsumption.systemOverhead}W system · {Math.round(results.powerConsumption.utilizationFactor * 100)}% util
                                        </div>
                                    </div>
                                </div>

                                <div className="iw-metric">
                                    <div className="iw-metric-label">Available VRAM</div>
                                    <div className="iw-metric-value">
                                        {formatGB(results.effectiveVRAM)}<span className="iw-metric-unit">GB</span>
                                    </div>
                                    <div className="iw-metric-detail">
                                        {results.scheduleMode === 'single'
                                            ? 'Best single GPU (fit-one-first)'
                                            : results.scheduleMode === 'split'
                                              ? 'After multi-GPU / driver haircut'
                                              : 'Configured VRAM pool'}
                                    </div>
                                </div>
                            </div>

                            <CompatibilityBanner results={results} warnings={warnings} />
                        </div>
                    )}
                </section>
            </div>

            <section className="iw-notes" aria-label="Operating notes">
                <div className="iw-notes-title">Operating Notes</div>
                <div className="iw-notes-grid">
                    {NOTES.map((note, i) => <p key={i}>{note}</p>)}
                </div>
            </section>
        </main>
    );
};

export default OllamaGPUCalculator;
