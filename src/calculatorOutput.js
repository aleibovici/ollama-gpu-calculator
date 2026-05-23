// Canonical assembly of calculator inputs → results and warnings.
// Extracted from OllamaGPUCalculator so refactors can be regression-tested
// against a stable output contract.

import {
    calculateAll,
    parseActiveGpuConfigs,
    parseQuantBits,
} from './calculations';

export { parseQuantBits } from './calculations';

export function formatGB(gb) {
    return gb.toFixed(2);
}

export function validateCalculatorInputs({ parameters, gpuConfigs }) {
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

function buildCalculatorResults(ramCalc, tokensPerSecond, powerCalc, active) {
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
    };
}

export function computeCalculatorResults({ paramCount, quantBits, contextLength, gpuConfigs }) {
    const { ram, tokensPerSecond, power, active } = calculateAll(
        paramCount,
        quantBits,
        contextLength,
        gpuConfigs
    );

    return buildCalculatorResults(ram, tokensPerSecond, power, active);
}

export function buildWarnings({ paramCount, quantBits, contextLength, gpuConfigs, results }) {
    const active = parseActiveGpuConfigs(gpuConfigs);
    const totalGpuCount = active.reduce((n, { count }) => n + count, 0);
    const generations = new Set(active.map(({ spec }) => spec.generation));

    const warnings = [];

    if (results.minimumSystemRAM) {
        const memKind = results.unifiedMemory ? 'unified memory' : 'RAM';
        warnings.push(`Recommended minimum ${results.minimumSystemRAM}GB ${memKind}`);
    }

    if (Number.isFinite(paramCount) && paramCount > 13) {
        warnings.push('Models larger than 13B parameters may require multiple GPUs for optimal performance');
    }

    if (totalGpuCount > 2) {
        warnings.push('Multi-GPU scaling efficiency decreases with more than 2 GPUs');
    }

    if (generations.has('Pascal')) {
        warnings.push('Pascal architecture may have limited support for newer optimizations');
    }

    if (generations.size > 1) {
        warnings.push('Mixed GPU generations may result in reduced performance');
    }

    if (active.some(({ spec }) => spec.generation === 'RDNA3' || spec.generation === 'RDNA4')) {
        warnings.push('AMD GPUs are supported on Windows and Linux with ROCm');
    }

    if (quantBits === 4) {
        warnings.push('4-bit quantization provides fastest inference but may impact model accuracy');
    } else if (quantBits === 8) {
        warnings.push('8-bit quantization offers good balance of speed and accuracy');
    }

    if (contextLength > 32768) {
        warnings.push('Extended context length requires significantly more VRAM and may impact performance');
        if (quantBits === 16) {
            warnings.push('Long context with FP16 may require significant VRAM');
        }
    }

    return warnings;
}

export function runCalculator({ parameters, quantization, contextLength, gpuConfigs }) {
    const validation = validateCalculatorInputs({ parameters, gpuConfigs });
    if (!validation.valid) {
        return { results: null, errors: validation.errors, warnings: [] };
    }

    const quantBits = parseQuantBits(quantization);

    const results = computeCalculatorResults({
        paramCount: validation.paramCount,
        quantBits,
        contextLength,
        gpuConfigs,
    });

    const warnings = buildWarnings({
        paramCount: validation.paramCount,
        quantBits,
        contextLength,
        gpuConfigs,
        results,
    });

    return { results, errors: {}, warnings };
}
