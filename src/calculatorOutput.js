// Canonical assembly of calculator inputs → results and warnings.
// Extracted from OllamaGPUCalculator so refactors can be regression-tested
// against a stable output contract.

import {
    calculateAll,
    parseQuantBits,
    suggestedContextForVram,
} from './calculations';
import { getModelPreset } from './data/modelPresets';

export { parseQuantBits, suggestedContextForVram } from './calculations';
export { getModelPreset, MODEL_PRESETS } from './data/modelPresets';

export function formatGB(gb) {
    return gb.toFixed(2);
}

/** Shared ok | warn | bad tier for status readout and advisory banner. */
export function getCompatibilityTier(results) {
    if (!results) return null;
    if (results.cloudOnly) return 'ok';
    if (results.isCompatible && !results.isBorderline) return 'ok';
    if (results.isBorderline) return 'warn';
    return 'bad';
}

export function validateCalculatorInputs({ parameters, gpuConfigs, cloudOnly = false }) {
    if (cloudOnly) {
        return { valid: true, errors: {}, paramCount: 0, cloudOnly: true };
    }

    const paramCount = parseFloat(parameters);
    const paramsValid = parameters.trim() !== '' && !Number.isNaN(paramCount) && paramCount > 0;

    if (!paramsValid) {
        const errors = {};
        if (parameters.trim() !== '') {
            errors.parameters = 'Please enter a valid number greater than 0 (e.g. 7 for 7B)';
        }
        return { valid: false, errors, paramCount: null };
    }

    if (!gpuConfigs.some(config => config.gpuModel)) {
        return {
            valid: false,
            errors: { gpu: 'Please select at least one GPU model' },
            paramCount,
        };
    }

    const invalidGpuCount = gpuConfigs.some((config) => {
        const n = parseInt(config.count, 10);
        return config.gpuModel && (n <= 0 || Number.isNaN(n));
    });
    if (invalidGpuCount) {
        return {
            valid: false,
            errors: { gpuCount: 'Invalid GPU count. Please use 1 or more per slot.' },
            paramCount,
        };
    }

    return { valid: true, errors: {}, paramCount };
}

function buildCalculatorResults(ramCalc, tokensPerSecond, powerCalc, active, extras = {}) {
    const gpuConfigString = active
        .map(({ count, spec }) => `${count}x ${spec.name}`)
        .join(' + ');

    return {
        ...ramCalc,
        isCompatible: ramCalc.effectiveVRAM >= ramCalc.totalGPURAM,
        isBorderline: ramCalc.vramMargin > 0 && ramCalc.vramMargin < 2,
        gpuConfig: gpuConfigString,
        tokensPerSecond,
        powerConsumption: powerCalc,
        ...extras,
    };
}

export function computeCalculatorResults({
    paramCount,
    quantBits,
    contextLength,
    gpuConfigs,
    options = {},
}) {
    const { ram, tokensPerSecond, power, active } = calculateAll(
        paramCount,
        quantBits,
        contextLength,
        gpuConfigs,
        options
    );

    return buildCalculatorResults(ram, tokensPerSecond, power, active);
}

export function buildWarnings({
    paramCount,
    quantBits,
    contextLength,
    active,
    results,
    options = {},
    preset = null,
}) {
    const totalGpuCount = active.reduce((n, { count }) => n + count, 0);
    const generations = new Set(active.map(({ spec }) => spec.generation));
    const totalVram = active.reduce((n, { count, spec }) => n + spec.vram * count, 0);

    const warnings = [];

    if (results.cloudOnly) {
        warnings.push('This tag runs on Ollama Cloud — no local VRAM required');
        return warnings;
    }

    if (results.minimumSystemRAM) {
        const memKind = results.unifiedMemory ? 'unified memory' : 'RAM';
        warnings.push(`Recommended minimum ${results.minimumSystemRAM}GB ${memKind}`);
    }

    if (results.isMoE) {
        warnings.push(
            `MoE model: Required VRAM uses total weights (${results.totalParamsB}B); tok/s uses ~${results.activeParamsB}B active params`
        );
    }

    if (results.scheduleMode === 'single' && totalGpuCount > 1) {
        warnings.push(
            'Model fits on one GPU — Ollama prefers a single-GPU path (pooled multi-GPU split not required)'
        );
    } else if (results.scheduleMode === 'split') {
        warnings.push(
            'Model exceeds a single GPU — estimate assumes a split across GPUs with PCIe overhead (ballpark, not Ollama’s measured scheduler)'
        );
    }

    if (Number.isFinite(paramCount) && paramCount > 13 && !results.isMoE) {
        warnings.push('Models larger than 13B parameters may require multiple GPUs for optimal performance');
    }

    if (totalGpuCount > 2 && results.scheduleMode === 'split') {
        warnings.push('Multi-GPU scaling efficiency decreases with more than 2 GPUs');
    }

    if (generations.has('Pascal')) {
        warnings.push('Pascal architecture may have limited support for newer optimizations');
    }

    if (generations.size > 1) {
        warnings.push('Mixed GPU generations may result in reduced performance');
    }

    if (active.some(({ spec }) => spec.generation === 'RDNA3' || spec.generation === 'RDNA4' || spec.generation === 'RDNA2')) {
        warnings.push('AMD GPUs: Linux uses ROCm v7; some Windows/RDNA2 configs fall back to Vulkan');
    }

    if (active.some(({ spec }) => spec.generation === 'Ryzen AI')) {
        warnings.push('Ryzen AI APUs are listed in Ollama’s Linux ROCm table (unified memory)');
    }

    if (quantBits <= 4.5 && quantBits >= 4) {
        warnings.push('4-bit class quantization (Q4_K_M / NVFP4 / MXFP4) trades quality for memory and speed');
    } else if (quantBits === 8) {
        warnings.push('8-bit quantization offers good balance of speed and accuracy');
    }

    if (options.kvCacheType && options.kvCacheType !== 'f16') {
        warnings.push(
            `KV cache ${options.kvCacheType} reduces cache VRAM (requires Flash Attention / OLLAMA_FLASH_ATTENTION)`
        );
    }

    if (contextLength > 32768) {
        warnings.push('Extended context length requires significantly more VRAM and may impact performance');
        if (quantBits >= 16) {
            warnings.push('Long context with FP16 weights may require significant VRAM');
        }
    }

    if (contextLength >= 1048576) {
        warnings.push('1M context is beyond the primary calibrated range — treat numbers as rough upper bounds');
    }

    const suggested = suggestedContextForVram(results.maxSingleVram || totalVram);
    if (suggested && contextLength !== suggested) {
        warnings.push(
            `Suggested context for ~${Math.round(results.maxSingleVram || totalVram)}GB VRAM (Ollama VRAM tiers): ${(suggested / 1024)}k`
        );
    }

    if (preset?.modalities?.includes('vision') && (preset.multimodalOverheadGB ?? 0) > 0) {
        warnings.push(`Includes ~${preset.multimodalOverheadGB}GB multimodal encoder overhead stub`);
    }

    if (preset?.engineHint === 'mlx') {
        warnings.push('MLX engine preset — tok/s still uses the bandwidth model (no MTP/DFlash multiplier)');
    }

    return warnings;
}

export function runCalculator({
    parameters,
    quantization,
    contextLength,
    gpuConfigs,
    kvCacheType = 'f16',
    presetId = null,
    gqaRatio = null,
    multimodalOverheadGB = null,
    activeParamsB = null,
}) {
    const preset = getModelPreset(presetId);

    if (preset?.cloudOnly) {
        return {
            results: {
                cloudOnly: true,
                isCompatible: true,
                isBorderline: false,
                totalGPURAM: 0,
                baseModelSizeGB: 0,
                kvCacheSize: 0,
                multimodalOverheadGB: 0,
                totalSystemRAM: 0,
                totalAvailableVRAM: 0,
                effectiveVRAM: 0,
                vramMargin: 0,
                minimumSystemRAM: 0,
                unifiedMemory: false,
                gpuConfig: 'Ollama Cloud',
                tokensPerSecond: null,
                powerConsumption: { totalPower: 0, powerDetails: [], systemOverhead: 0, utilizationFactor: 0 },
                scheduleMode: 'cloud',
                isMoE: false,
            },
            errors: {},
            warnings: buildWarnings({
                paramCount: 0,
                quantBits: 16,
                contextLength,
                active: [],
                results: { cloudOnly: true },
                preset,
            }),
            preset,
        };
    }

    const validation = validateCalculatorInputs({ parameters, gpuConfigs });
    if (!validation.valid) {
        return { results: null, errors: validation.errors, warnings: [], preset };
    }

    const quantBits = parseQuantBits(quantization);
    const options = {
        kvCacheType,
        totalParamsB: validation.paramCount,
        activeParamsB: activeParamsB ?? preset?.activeParamsB ?? validation.paramCount,
        gqaRatio: gqaRatio ?? preset?.gqaRatio ?? 1,
        multimodalOverheadGB: multimodalOverheadGB ?? preset?.multimodalOverheadGB ?? 0,
    };

    const { ram, tokensPerSecond, power, active } = calculateAll(
        validation.paramCount,
        quantBits,
        contextLength,
        gpuConfigs,
        options
    );

    const results = buildCalculatorResults(ram, tokensPerSecond, power, active);
    const warnings = buildWarnings({
        paramCount: validation.paramCount,
        quantBits,
        contextLength,
        active,
        results,
        options,
        preset,
    });

    return { results, errors: {}, warnings, preset };
}
