// Pure calculation module for the Ollama GPU Calculator.
//
// The three models in this file (VRAM, KV cache, tokens/sec) are derived from
// standard transformer math rather than curve-fits against arbitrary constants:
//
//  - Base model size = totalParams * bytes_per_param  (MoE: total weights for fit)
//  - KV cache ≈ 2 * n_layers * d_model * ctx * bytes_per_elem * gqaRatio
//      n_layers and d_model come from the scaling law params ≈ 12·L·d²
//      with aspect ratio d/L ≈ 128 (LLaMA family). Default KV type is f16;
//      Ollama also supports q8_0 / q4_0 via OLLAMA_KV_CACHE_TYPE (+ Flash Attention).
//  - Decode tokens/sec = effective_bandwidth / (active_weight_bytes + kv_cache_bytes)
//      MoE uses active params for the weight term; VRAM still uses total weights.
//      Single-batch autoregressive decode is memory-bandwidth-bound.

import { gpuSpecs } from './data/gpuSpecs.js';

export { gpuSpecs } from './data/gpuSpecs.js';

// Standard transformer scaling approximation.
// params ≈ 12·L·d² with aspect ratio d/L ≈ 128 (LLaMA 7B: 4096/32, 13B: 5120/40,
// 70B: 8192/80). Solving for d: d = cbrt(32·params/3), L = d/128.
// This is a conservative MHA estimate; models using GQA will have smaller KV cache
// when gqaRatio = kv_heads / query_heads is provided.
const TRANSFORMER_ASPECT_RATIO = 128;

export const KV_CACHE_TYPES = {
    f16: { label: 'f16', bytesPerElem: 2 },
    q8_0: { label: 'q8_0', bytesPerElem: 1 },
    q4_0: { label: 'q4_0', bytesPerElem: 0.5 },
};

export function estimateTransformerShape(paramCount) {
    const paramsAbs = paramCount * 1e9;
    const dModel = Math.cbrt((TRANSFORMER_ASPECT_RATIO * paramsAbs) / 12);
    const nLayers = Math.max(1, Math.round(dModel / TRANSFORMER_ASPECT_RATIO));
    return { dModel, nLayers };
}

export function calculateBaseModelSizeGB(paramCount, quantBits) {
    const bytes = (paramCount * 1e9 * quantBits) / 8;
    return bytes / (1024 ** 3);
}

/**
 * @param {number} paramCount - billions of parameters (use total for MoE KV shape)
 * @param {number} contextLength
 * @param {{ kvCacheType?: string, gqaRatio?: number }} [options]
 */
export function calculateKvCacheGB(paramCount, contextLength, options = {}) {
    const kvCacheType = options.kvCacheType ?? 'f16';
    const gqaRatio = options.gqaRatio ?? 1;
    const bytesPerElem = KV_CACHE_TYPES[kvCacheType]?.bytesPerElem ?? 2;
    const { dModel, nLayers } = estimateTransformerShape(paramCount);
    const bytes = 2 * nLayers * dModel * contextLength * bytesPerElem * gqaRatio;
    return bytes / (1024 ** 3);
}

function getSystemRAMMultiplier(quantBits) {
    return getQuantSettings(quantBits).systemRamMultiplier;
}

function getUtilizationFactor(quantBits) {
    return getQuantSettings(quantBits).utilizationFactor;
}

const QUANT_SETTINGS = {
    32: { systemRamMultiplier: 2.0, utilizationFactor: 0.85 },
    16: { systemRamMultiplier: 1.5, utilizationFactor: 0.75 },
    8:  { systemRamMultiplier: 1.2, utilizationFactor: 0.65 },
    4.5: { systemRamMultiplier: 1.12, utilizationFactor: 0.62 },
    4.25: { systemRamMultiplier: 1.11, utilizationFactor: 0.61 },
    4:  { systemRamMultiplier: 1.1, utilizationFactor: 0.60 },
};

const DEFAULT_QUANT_SETTINGS = QUANT_SETTINGS[16];

function getQuantSettings(quantBits) {
    if (QUANT_SETTINGS[quantBits]) return QUANT_SETTINGS[quantBits];
    // Nearest known setting for custom / mapped bit widths.
    const keys = Object.keys(QUANT_SETTINGS).map(Number).sort((a, b) => a - b);
    let best = keys[0];
    let bestDist = Math.abs(quantBits - best);
    for (const k of keys) {
        const d = Math.abs(quantBits - k);
        if (d < bestDist) {
            best = k;
            bestDist = d;
        }
    }
    return QUANT_SETTINGS[best] ?? DEFAULT_QUANT_SETTINGS;
}

export function parseQuantBits(quantization) {
    const n = parseFloat(quantization);
    return Number.isFinite(n) ? n : NaN;
}

/** Ollama context-length.md VRAM-tier suggestion (not FAQ's fixed 4k default). */
export function suggestedContextForVram(vramGB) {
    if (!Number.isFinite(vramGB) || vramGB <= 0) return 4096;
    if (vramGB < 24) return 4096;
    if (vramGB < 48) return 32768;
    return 262144;
}

// Round up to the nearest power of 2 (typical RAM sizes: 8, 16, 32, 64, 128, 256).
// Floor at 8 GB — that's the practical minimum for any Ollama setup.
function roundUpToRAMSize(gb) {
    const floor = 8;
    if (gb <= floor) return floor;
    return Math.pow(2, Math.ceil(Math.log2(gb)));
}

// Realistic fraction of peak bandwidth reached by inference kernels. Empirically
// llama.cpp and similar stacks deliver ~80-90% of peak HBM/GDDR bandwidth.
const DECODE_BANDWIDTH_EFFICIENCY = 0.85;

// Multi-GPU tensor/pipeline-parallel scaling is sub-linear. These factors are
// applied to the summed bandwidth of a homogeneous config.
function multiGpuScalingFactor(totalGpus, scheduleMode = 'split') {
    if (totalGpus <= 1) return 1.0;
    // Stronger PCIe penalty when the model must be split across GPUs.
    if (scheduleMode === 'split') {
        if (totalGpus === 2) return 0.82;
        if (totalGpus === 3) return 0.72;
        if (totalGpus === 4) return 0.64;
        return 0.55;
    }
    if (totalGpus === 2) return 0.90;
    if (totalGpus === 3) return 0.82;
    if (totalGpus === 4) return 0.75;
    return 0.65;
}

export function parseActiveGpuConfigs(gpuConfigs) {
    const active = [];
    for (const config of gpuConfigs) {
        if (!config.gpuModel || !gpuSpecs[config.gpuModel]) continue;
        const count = parseInt(config.count, 10);
        if (!Number.isFinite(count) || count <= 0) continue;
        active.push({
            modelKey: config.gpuModel,
            count,
            spec: gpuSpecs[config.gpuModel],
        });
    }
    return active;
}

function normalizeModelOptions(paramCount, options = {}) {
    const totalParamsB = options.totalParamsB ?? paramCount;
    const activeParamsB = options.activeParamsB ?? totalParamsB;
    const kvCacheType = options.kvCacheType ?? 'f16';
    const gqaRatio = options.gqaRatio ?? 1;
    const multimodalOverheadGB = options.multimodalOverheadGB ?? 0;
    return {
        totalParamsB,
        activeParamsB,
        kvCacheType,
        gqaRatio,
        multimodalOverheadGB,
    };
}

function buildModelMetrics(paramCount, quantBits, contextLength, options = {}) {
    const opts = normalizeModelOptions(paramCount, options);
    const baseModelSizeGB = calculateBaseModelSizeGB(opts.totalParamsB, quantBits);
    const activeWeightSizeGB = calculateBaseModelSizeGB(opts.activeParamsB, quantBits);
    const kvCacheSize = calculateKvCacheGB(opts.totalParamsB, contextLength, {
        kvCacheType: opts.kvCacheType,
        gqaRatio: opts.gqaRatio,
    });
    const overheadGB = baseModelSizeGB * 0.1;
    const multimodalOverheadGB = opts.multimodalOverheadGB;
    const totalGPURAM = baseModelSizeGB + kvCacheSize + overheadGB + multimodalOverheadGB;
    return {
        baseModelSizeGB,
        activeWeightSizeGB,
        kvCacheSize,
        multimodalOverheadGB,
        totalGPURAM,
        totalParamsB: opts.totalParamsB,
        activeParamsB: opts.activeParamsB,
        isMoE: opts.activeParamsB < opts.totalParamsB - 0.01,
        kvCacheType: opts.kvCacheType,
        gqaRatio: opts.gqaRatio,
    };
}

function summarizeGpuPool(active) {
    let totalAvailableVRAM = 0;
    let totalGpuCount = 0;
    let summedBandwidth = 0;
    let minBandwidth = Infinity;
    let maxSingleVram = 0;
    let bestSingle = null;

    for (const entry of active) {
        const { count, spec } = entry;
        totalAvailableVRAM += spec.vram * count;
        totalGpuCount += count;
        summedBandwidth += spec.bandwidth * count;
        if (spec.bandwidth < minBandwidth) minBandwidth = spec.bandwidth;
        if (spec.vram > maxSingleVram) {
            maxSingleVram = spec.vram;
            bestSingle = entry;
        } else if (spec.vram === maxSingleVram && bestSingle) {
            // Prefer higher bandwidth when VRAM ties.
            if (spec.bandwidth > bestSingle.spec.bandwidth) bestSingle = entry;
        }
    }

    const modelKeys = new Set(active.map(({ modelKey }) => modelKey));

    return {
        totalAvailableVRAM,
        totalGpuCount,
        summedBandwidth,
        minBandwidth: active.length > 0 ? minBandwidth : 0,
        maxSingleVram,
        bestSingle,
        isHeterogeneous: modelKeys.size > 1,
    };
}

function isUnifiedMemorySetupFromActive(active) {
    return active.length > 0 && active.every(({ spec }) => spec.unifiedMemory);
}

/**
 * Ollama prefers fitting on one GPU; otherwise it splits.
 * Returns scheduleMode 'single' | 'split' | 'none'.
 */
function resolveSchedule(model, pool) {
    if (pool.totalGpuCount === 0) {
        return { scheduleMode: 'none', fittingGpu: null };
    }
    if (model.totalGPURAM <= pool.maxSingleVram) {
        return { scheduleMode: 'single', fittingGpu: pool.bestSingle };
    }
    return { scheduleMode: 'split', fittingGpu: null };
}

function buildRamResult(model, pool, active, quantBits, schedule) {
    const unified = isUnifiedMemorySetupFromActive(active);
    const totalSystemRAM = unified
        ? model.totalGPURAM
        : model.totalGPURAM * getSystemRAMMultiplier(quantBits);

    let effectiveVRAM;
    let multiGpuEfficiency = 1;

    if (schedule.scheduleMode === 'single') {
        // Prefer single-GPU path: use the largest GPU that can hold the model.
        effectiveVRAM = pool.maxSingleVram;
    } else if (pool.totalGpuCount > 1) {
        // Split path: pooled VRAM with a stronger multi-GPU efficiency haircut.
        multiGpuEfficiency = 0.85;
        effectiveVRAM = pool.totalAvailableVRAM * multiGpuEfficiency;
    } else {
        effectiveVRAM = pool.totalAvailableVRAM;
    }

    const vramMargin = effectiveVRAM - model.totalGPURAM;

    return {
        baseModelSizeGB: model.baseModelSizeGB,
        activeWeightSizeGB: model.activeWeightSizeGB,
        kvCacheSize: model.kvCacheSize,
        multimodalOverheadGB: model.multimodalOverheadGB,
        totalGPURAM: model.totalGPURAM,
        totalSystemRAM,
        totalAvailableVRAM: pool.totalAvailableVRAM,
        effectiveVRAM,
        vramMargin,
        minimumSystemRAM: roundUpToRAMSize(totalSystemRAM),
        unifiedMemory: unified,
        scheduleMode: schedule.scheduleMode,
        isMoE: model.isMoE,
        activeParamsB: model.activeParamsB,
        totalParamsB: model.totalParamsB,
        kvCacheType: model.kvCacheType,
        gqaRatio: model.gqaRatio,
        multiGpuEfficiency,
        maxSingleVram: pool.maxSingleVram,
    };
}

function computeTokensPerSecondFromMetrics(model, pool, schedule) {
    if (pool.totalGpuCount === 0) return null;

    // MoE: bandwidth cost dominated by active expert weights + KV.
    const bytesPerToken = model.activeWeightSizeGB + model.kvCacheSize;
    if (bytesPerToken <= 0) return null;

    if (schedule.scheduleMode === 'single' && schedule.fittingGpu) {
        const bw = schedule.fittingGpu.spec.bandwidth;
        return Math.round((bw * DECODE_BANDWIDTH_EFFICIENCY) / bytesPerToken);
    }

    const scaling = multiGpuScalingFactor(pool.totalGpuCount, schedule.scheduleMode);
    const effectiveBandwidth = pool.isHeterogeneous
        ? pool.minBandwidth * pool.totalGpuCount * scaling
        : pool.summedBandwidth * scaling;

    return Math.round((effectiveBandwidth * DECODE_BANDWIDTH_EFFICIENCY) / bytesPerToken);
}

function computePowerFromActive(active, paramCount, quantBits) {
    const getBaseSystemOverhead = (p) => {
        if (p <= 3) return 75;
        if (p <= 7) return 100;
        if (p <= 13) return 150;
        return 200;
    };

    const utilizationFactor = getUtilizationFactor(quantBits);
    const powerDetails = [];
    let basePower = 0;
    let totalGpuCount = 0;

    for (const { count, spec } of active) {
        const gpuPower = Math.round(spec.tdp * utilizationFactor);
        const rowPower = gpuPower * count;
        basePower += rowPower;
        totalGpuCount += count;
        powerDetails.push({
            name: spec.name,
            count,
            power: rowPower,
            baseWatts: gpuPower,
        });
    }

    const extraGpus = Math.max(0, totalGpuCount - 1);
    const multiGpuPowerOverhead = Math.round(
        basePower * 0.1 * (extraGpus / Math.max(1, totalGpuCount))
    );
    const systemOverhead = getBaseSystemOverhead(paramCount) + extraGpus * 25 + multiGpuPowerOverhead;

    return {
        totalPower: Math.round(basePower + systemOverhead),
        powerDetails,
        systemOverhead,
        utilizationFactor,
    };
}

/**
 * @param {number} paramCount
 * @param {number} quantBits
 * @param {number} contextLength
 * @param {Array} gpuConfigs
 * @param {{ totalParamsB?: number, activeParamsB?: number, kvCacheType?: string, gqaRatio?: number, multimodalOverheadGB?: number }} [options]
 */
export function calculateAll(paramCount, quantBits, contextLength, gpuConfigs, options = {}) {
    const active = parseActiveGpuConfigs(gpuConfigs);
    const model = buildModelMetrics(paramCount, quantBits, contextLength, options);
    const pool = summarizeGpuPool(active);
    const schedule = resolveSchedule(model, pool);

    return {
        ram: buildRamResult(model, pool, active, quantBits, schedule),
        tokensPerSecond: computeTokensPerSecondFromMetrics(model, pool, schedule) ?? 0,
        power: computePowerFromActive(active, paramCount, quantBits),
        active,
        schedule,
    };
}

export function calculateRAMRequirements(paramCount, quantBits, contextLength, gpuConfigs, options = {}) {
    return calculateAll(paramCount, quantBits, contextLength, gpuConfigs, options).ram;
}

export function calculateTokensPerSecond(paramCount, quantBits, contextLength, gpuConfigs, options = {}) {
    const { tokensPerSecond, active } = calculateAll(paramCount, quantBits, contextLength, gpuConfigs, options);
    return active.length === 0 ? null : tokensPerSecond;
}

export function calculatePowerConsumption(gpuConfigs, paramCount, quantBits) {
    return computePowerFromActive(parseActiveGpuConfigs(gpuConfigs), paramCount, quantBits);
}
