import React, { useState, useMemo, useEffect, useRef } from 'react';
import ReactGA from 'react-ga4';
import { runCalculator, formatGB, getCompatibilityTier } from './calculatorOutput';
import CompatibilityBanner from './components/CompatibilityBanner';
import GpuCombobox from './components/GpuCombobox';

const QUANT_OPTIONS = [
    { value: '32', label: 'FP32', hint: '32-bit' },
    { value: '16', label: 'FP16', hint: '16-bit' },
    { value: '8',  label: 'INT8', hint: '8-bit'  },
    { value: '4',  label: 'INT4', hint: '4-bit'  },
];

const CONTEXT_OPTIONS = [4096, 8192, 16384, 32768, 65536, 131072];

const NOTES = [
    'Multi-GPU on consumer PCIe scales sub-linearly — expect roughly 0.7–0.75× per added GPU as cross-device traffic eats into throughput.',
    'A small portion of VRAM is reserved for system operations and driver overhead.',
    'Real-world performance depends on concurrent workloads and thermal headroom.',
    'Leave roughly 1–2 GB of VRAM margin for stable inference under load.',
    'Data-center GPUs (H100, A100, B200) are sold to enterprises, not consumers, but are widely available to rent by the hour from cloud providers.',
    'Tokens/sec are approximate; actual numbers depend on model architecture and runtime.',
    'On Apple Silicon, Ollama now runs on MLX (preview from 0.19) and uses the M5 GPU Neural Accelerators where present; the separate Neural Engine block is still not used for LLM inference.',
    'Lower quantization (INT4/INT8) trades quality for memory and speed on limited hardware.',
    'AMD GPUs run via ROCm on Linux and on recent Radeon RX / PRO cards on Windows; older or APU-class AMD GPUs on Windows fall back to the Vulkan backend.',
    'Power figures account for utilization patterns during LLM inference, not peak TDP.',
];

const statusLabel = {
    ok:   'Compatible',
    warn: 'Borderline',
    bad:  'Insufficient',
};

const OllamaGPUCalculator = () => {
    const nextGpuRowId = useRef(2);
    const [parameters, setParameters] = useState('');
    const [quantization, setQuantization] = useState('16');
    const [contextLength, setContextLength] = useState(4096);
    const [gpuConfigs, setGpuConfigs] = useState([{ id: 1, gpuModel: '', count: '1' }]);

    const { results, validationErrors, warnings } = useMemo(() => {
        if (!parameters.trim() && !gpuConfigs.some(c => c.gpuModel)) {
            return { results: null, validationErrors: {}, warnings: [] };
        }
        try {
            const output = runCalculator({ parameters, quantization, contextLength, gpuConfigs });
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
    }, [parameters, quantization, contextLength, gpuConfigs]);

    useEffect(() => {
        if (!results) return;
        const paramCount = parseFloat(parameters);
        if (Number.isNaN(paramCount) || paramCount <= 0) return;
        ReactGA.event({
            category: 'Calculator',
            action: 'Calculate',
            label: 'Mixed GPU Configuration',
            value: Math.round(paramCount),
        });
    }, [results, parameters]);

    const handleQuantizationChange = (value) => {
        setQuantization(value);
        ReactGA.event({ category: 'Settings', action: 'Change Quantization', label: `${value}-bit` });
    };

    const handleContextLengthChange = (value) => {
        setContextLength(parseInt(value));
        ReactGA.event({ category: 'Settings', action: 'Change Context Length', label: `${value} tokens` });
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
    const utilizationPct = results
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
                <div className="iw-header-side">
                    <div className="iw-meta">
                        REV <span>v2</span> · CALIB <span>2026.05</span><br />
                        STATIC BUILD · GITHUB PAGES
                    </div>
                    <div className="iw-link-row">
                        <a className="iw-chip" href="https://github.com/aleibovici/ollama-gpu-calculator" target="_blank" rel="noopener noreferrer">★ GitHub</a>
                        <a className="iw-chip" href="https://www.reddit.com/r/ollama/comments/1gdux20/ollama_gpu_compatibility_calculator/" target="_blank" rel="noopener noreferrer">↳ Reddit</a>
                    </div>
                </div>
            </header>

            <div className="iw-bench">
                {/* ----------- INPUT PANEL ----------- */}
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
                            <label htmlFor="parameters" className="iw-label">
                                <span>Model Parameters</span>
                                <span className="iw-label-hint">billions</span>
                            </label>
                            <input
                                type="number"
                                id="parameters"
                                className="iw-input"
                                value={parameters}
                                onChange={(e) => setParameters(e.target.value)}
                                placeholder="e.g. 7 for a 7B model"
                                min="0.1" max="200" step="0.1"
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
                                <span className="iw-label-hint">precision</span>
                            </label>
                            <div className="iw-segmented" role="radiogroup" aria-label="Quantization">
                                {QUANT_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        role="radio"
                                        aria-checked={quantization === opt.value}
                                        className={quantization === opt.value ? 'is-active' : ''}
                                        onClick={() => handleQuantizationChange(opt.value)}
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
                                <span className="iw-label-hint">{(contextLength / 1024)}k tokens</span>
                            </label>
                            <select
                                id="context-length"
                                className="iw-select"
                                value={contextLength}
                                onChange={(e) => handleContextLengthChange(e.target.value)}
                            >
                                {CONTEXT_OPTIONS.map(len => (
                                    <option key={len} value={len}>{len / 1024}k tokens · {len.toLocaleString()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* ----------- READOUT PANEL ----------- */}
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
                                        <div><span>Margin</span> <b className="iw-signal-value" data-state={statusState}>
                                            {results.vramMargin >= 0 ? '+' : ''}{formatGB(results.vramMargin)} GB
                                        </b></div>
                                    </div>
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
                                    <div className="iw-metric-detail">Estimated decode rate</div>
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
                                    <div className="iw-metric-detail">After driver/OS reservation</div>
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
