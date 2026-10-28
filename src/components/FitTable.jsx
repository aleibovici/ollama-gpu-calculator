import React, { useState } from 'react';
import { formatGB, quantLabel } from '../calculatorOutput';

const FIT_LABEL = {
    ok: 'Fits',
    warn: 'Tight',
    bad: "Won't fit",
};

function formatContext(len) {
    return len >= 1048576 ? `${len / 1048576}M` : `${len / 1024}k`;
}

function FitRow({ row, isCurrent, onLoad }) {
    const { preset, results, tier } = row;
    const fits = tier !== 'bad';
    const tags = [];
    if (preset.moe && !preset.label.includes('MoE')) tags.push(`MoE · ${preset.activeParamsB}B active`);
    if (preset.modalities?.includes('vision')) tags.push('vision');
    if (row.contextCapped) tags.push(`max ${formatContext(row.contextLength)} context`);

    return (
        <tr data-state={tier} aria-current={isCurrent ? 'true' : undefined} className={isCurrent ? 'is-current' : ''}>
            <td className="iw-fit-status">
                <span className="iw-fit-dot" aria-hidden="true" />
                <span className="iw-fit-status-text">{FIT_LABEL[tier]}</span>
            </td>
            <th scope="row" className="iw-fit-model">
                {preset.label}
                {isCurrent && <span className="iw-fit-current"> · loaded</span>}
                {tags.length > 0 && <small>{tags.join(' · ')}</small>}
            </th>
            <td className="iw-fit-num iw-fit-params">{preset.totalParamsB}B</td>
            <td className="iw-fit-quant">{quantLabel(row.quantization)}</td>
            <td className="iw-fit-num">{formatGB(results.totalGPURAM)} GB</td>
            <td className="iw-fit-num" title={fits ? undefined : 'Spills to system RAM; much slower than shown by GPU math'}>
                {fits && results.tokensPerSecond != null ? results.tokensPerSecond : '—'}
            </td>
            <td className="iw-fit-action">
                <button
                    type="button"
                    className="iw-fit-load"
                    onClick={() => onLoad(row)}
                    aria-label={`Load ${preset.label} into the calculator`}
                    disabled={isCurrent}
                >
                    {isCurrent ? 'Loaded' : 'Load'}
                </button>
            </td>
        </tr>
    );
}

/**
 * "What can my GPU run?" — every local model preset checked against the
 * current GPU setup. Rows come from buildFitTable (calculatorOutput.js).
 */
const FitTable = ({ rows, current, gpuLabel, contextLength, kvCacheType, onLoad }) => {
    const [showAll, setShowAll] = useState(false);
    const fitCount = rows.filter((r) => r.tier !== 'bad').length;
    const hiddenCount = rows.length - fitCount;
    const visibleRows = showAll || fitCount === 0 ? rows : rows.filter((r) => r.tier !== 'bad');

    return (
        <section className="iw-panel iw-fit" aria-labelledby="fit-heading">
            <div className="iw-panel-header">
                <h2 id="fit-heading" className="iw-panel-title">03 · What Can This Setup Run?</h2>
                <span className="iw-panel-id">MODEL_SWEEP</span>
            </div>
            <div className="iw-panel-body">
                <p className="iw-fit-summary" role="status">
                    <b>{fitCount}</b> of {rows.length} models fit on <b>{gpuLabel}</b>
                    <span className="iw-fit-summary-meta">
                        {' '}· each at its default quantization · {formatContext(contextLength)} context · KV {kvCacheType}
                    </span>
                </p>
                {fitCount === 0 && (
                    <p className="iw-field-note">
                        Nothing fits at this context. Try a shorter context window or a q8_0 / q4_0 KV cache.
                    </p>
                )}

                <div className="iw-fit-scroll">
                    <table className="iw-fit-table">
                        <caption className="iw-visually-hidden">
                            Ollama model presets checked against {gpuLabel}, sorted by fit and size
                        </caption>
                        <thead>
                            <tr>
                                <th scope="col">Fit</th>
                                <th scope="col">Model</th>
                                <th scope="col" className="iw-fit-num iw-fit-params">Params</th>
                                <th scope="col" className="iw-fit-quant">Quant</th>
                                <th scope="col" className="iw-fit-num">VRAM</th>
                                <th scope="col" className="iw-fit-num">tok/s</th>
                                <th scope="col"><span className="iw-visually-hidden">Action</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {visibleRows.map((row) => (
                                <FitRow
                                    key={row.preset.id}
                                    row={row}
                                    isCurrent={
                                        row.preset.id === current.presetId
                                        && row.quantization === current.quantization
                                        && row.contextLength === current.contextLength
                                    }
                                    onLoad={onLoad}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>

                {fitCount > 0 && hiddenCount > 0 && (
                    <button
                        type="button"
                        className="iw-add-btn iw-fit-toggle"
                        aria-expanded={showAll}
                        onClick={() => setShowAll((v) => !v)}
                    >
                        {showAll ? 'Hide models that don’t fit' : `Show ${hiddenCount} model${hiddenCount > 1 ? 's' : ''} that don’t fit`}
                    </button>
                )}
            </div>
        </section>
    );
};

export default FitTable;
