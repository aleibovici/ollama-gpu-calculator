// Pure calculation module for the Ollama GPU Calculator.
//
// The three models in this file (VRAM, KV cache, tokens/sec) are derived from
// standard transformer math rather than curve-fits against arbitrary constants:
//
//  - Base model size = paramCount * bytes_per_param
//  - KV cache (MHA upper bound) = 2 * n_layers * d_model * ctx * 2 bytes
//      n_layers and d_model come from the scaling law params ≈ 12·L·d²
//      with aspect ratio d/L ≈ 128 (LLaMA family). KV is always FP16 because
//      Ollama / llama.cpp default cache-type-k/v to f16 regardless of weight
//      quantization.
//  - Decode tokens/sec = effective_bandwidth / (model_bytes + kv_cache_bytes)
//      Single-batch autoregressive decode is memory-bandwidth-bound: every
//      token requires reading the full model weights plus the KV cache.

import { gpuSpecs } from './data/gpuSpecs.js';

export { gpuSpecs } from './data/gpuSpecs.js';

// Standard transformer scaling approximation.
// params ≈ 12·L·d² with aspect ratio d/L ≈ 128 (LLaMA 7B: 4096/32, 13B: 5120/40,
// 70B: 8192/80). Solving for d: d = cbrt(32·params/3), L = d/128.
// This is a conservative MHA estimate; models using GQA will have smaller KV cache.
const TRANSFORMER_ASPECT_RATIO = 128;

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

// KV cache is kept at FP16 by default in Ollama/llama.cpp, regardless of how
// weights are quantized. That's why this doesn't scale with quantBits.
const KV_CACHE_BYTES_PER_ELEM = 2;

export function calculateKvCacheGB(paramCount, contextLength) {
    const { dModel, nLayers } = estimateTransformerShape(paramCount);
    const bytes = 2 * nLayers * dModel * contextLength * KV_CACHE_BYTES_PER_ELEM;
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
    4:  { systemRamMultiplier: 1.1, utilizationFactor: 0.60 },
};

const DEFAULT_QUANT_SETTINGS = QUANT_SETTINGS[16];

function getQuantSettings(quantBits) {
    return QUANT_SETTINGS[quantBits] ?? DEFAULT_QUANT_SETTINGS;
}

export function parseQuantBits(quantization) {
    return parseInt(quantization, 10);
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
function multiGpuScalingFactor(totalGpus) {
    if (totalGpus <= 1) return 1.0;
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

function buildModelMetrics(paramCount, quantBits, contextLength) {
    const baseModelSizeGB = calculateBaseModelSizeGB(paramCount, quantBits);
    const kvCacheSize = calculateKvCacheGB(paramCount, contextLength);
    const totalGPURAM = baseModelSizeGB + kvCacheSize + baseModelSizeGB * 0.1;
    return { baseModelSizeGB, kvCacheSize, totalGPURAM };
}

function summarizeGpuPool(active) {
    let totalAvailableVRAM = 0;
    let totalGpuCount = 0;
    let summedBandwidth = 0;
    let minBandwidth = Infinity;

    for (const { count, spec } of active) {
        totalAvailableVRAM += spec.vram * count;
        totalGpuCount += count;
        summedBandwidth += spec.bandwidth * count;
        if (spec.bandwidth < minBandwidth) minBandwidth = spec.bandwidth;
    }

    const modelKeys = new Set(active.map(({ modelKey }) => modelKey));

    return {
        totalAvailableVRAM,
        totalGpuCount,
        summedBandwidth,
        minBandwidth: active.length > 0 ? minBandwidth : 0,
        isHeterogeneous: modelKeys.size > 1,
    };
}

function isUnifiedMemorySetupFromActive(active) {
    return active.length > 0 && active.every(({ spec }) => spec.unifiedMemory);
}

function buildRamResult(model, pool, active, quantBits) {
    const unified = isUnifiedMemorySetupFromActive(active);
    const totalSystemRAM = unified
        ? model.totalGPURAM
        : model.totalGPURAM * getSystemRAMMultiplier(quantBits);

    const multiGpuEfficiency = pool.totalGpuCount > 1 ? 0.9 : 1;
    const effectiveVRAM = pool.totalAvailableVRAM * multiGpuEfficiency;
    const vramMargin = effectiveVRAM - model.totalGPURAM;

    return {
        baseModelSizeGB: model.baseModelSizeGB,
        kvCacheSize: model.kvCacheSize,
        totalGPURAM: model.totalGPURAM,
        totalSystemRAM,
        totalAvailableVRAM: pool.totalAvailableVRAM,
        effectiveVRAM,
        vramMargin,
        minimumSystemRAM: roundUpToRAMSize(totalSystemRAM),
        unifiedMemory: unified,
    };
}

function computeTokensPerSecondFromMetrics(model, pool) {
    if (pool.totalGpuCount === 0) return null;

    const bytesPerToken = model.baseModelSizeGB + model.kvCacheSize;
    if (bytesPerToken <= 0) return null;

    const scaling = multiGpuScalingFactor(pool.totalGpuCount);
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

export function calculateAll(paramCount, quantBits, contextLength, gpuConfigs) {
    const active = parseActiveGpuConfigs(gpuConfigs);
    const model = buildModelMetrics(paramCount, quantBits, contextLength);
    const pool = summarizeGpuPool(active);

    return {
        ram: buildRamResult(model, pool, active, quantBits),
        tokensPerSecond: computeTokensPerSecondFromMetrics(model, pool) ?? 0,
        power: computePowerFromActive(active, paramCount, quantBits),
        active,
    };
}

export function calculateRAMRequirements(paramCount, quantBits, contextLength, gpuConfigs) {
    const active = parseActiveGpuConfigs(gpuConfigs);
    const model = buildModelMetrics(paramCount, quantBits, contextLength);
    const pool = summarizeGpuPool(active);
    return buildRamResult(model, pool, active, quantBits);
}

export function calculateTokensPerSecond(paramCount, quantBits, contextLength, gpuConfigs) {
    const active = parseActiveGpuConfigs(gpuConfigs);
    if (active.length === 0) return null;

    const model = buildModelMetrics(paramCount, quantBits, contextLength);
    const pool = summarizeGpuPool(active);
    return computeTokensPerSecondFromMetrics(model, pool);
}

export function calculatePowerConsumption(gpuConfigs, paramCount, quantBits) {
    return computePowerFromActive(parseActiveGpuConfigs(gpuConfigs), paramCount, quantBits);
}
