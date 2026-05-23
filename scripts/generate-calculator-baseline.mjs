#!/usr/bin/env bun
/**
 * Regenerate src/fixtures/calculatorBaseline.json from the current calculatorOutput
 * implementation. Run only when intentionally changing calculator behavior.
 */
import { writeFileSync } from 'fs';
import { runCalculator, validateCalculatorInputs } from '../src/calculatorOutput.js';

const scenarios = [
    { id: '7b-fp16-rtx4090', parameters: '7', quantization: '16', contextLength: 4096, gpuConfigs: [{ gpuModel: 'rtx4090', count: '1' }] },
    { id: '7b-q4-rtx4090', parameters: '7', quantization: '4', contextLength: 4096, gpuConfigs: [{ gpuModel: 'rtx4090', count: '1' }] },
    { id: '70b-fp16-h100x2', parameters: '70', quantization: '16', contextLength: 4096, gpuConfigs: [{ gpuModel: 'h100', count: '2' }] },
    { id: '7b-fp16-m3-max', parameters: '7', quantization: '16', contextLength: 4096, gpuConfigs: [{ gpuModel: 'm3-max', count: '1' }] },
    { id: '13b-q8-a100', parameters: '13', quantization: '8', contextLength: 8192, gpuConfigs: [{ gpuModel: 'a100-80gb', count: '1' }] },
    { id: '7b-fp16-hetero', parameters: '7', quantization: '16', contextLength: 4096, gpuConfigs: [{ gpuModel: 'h100', count: '1' }, { gpuModel: 'a2', count: '1' }] },
    { id: '7b-fp16-multi-row', parameters: '7', quantization: '16', contextLength: 4096, gpuConfigs: [{ gpuModel: 'rtx4090', count: '1' }, { gpuModel: 'rtx4090', count: '1' }] },
    { id: '7b-fp16-long-ctx', parameters: '7', quantization: '16', contextLength: 65536, gpuConfigs: [{ gpuModel: 'rtx4090', count: '1' }] },
    { id: '7b-fp16-amd', parameters: '7', quantization: '16', contextLength: 4096, gpuConfigs: [{ gpuModel: 'rx7900xtx', count: '1' }] },
    { id: '7b-fp16-pascal', parameters: '7', quantization: '16', contextLength: 4096, gpuConfigs: [{ gpuModel: 'gtx1080ti', count: '1' }] },
    { id: '70b-q4-insufficient', parameters: '70', quantization: '4', contextLength: 4096, gpuConfigs: [{ gpuModel: 'rtx4090', count: '1' }] },
    { id: '3b-fp16-borderline', parameters: '3', quantization: '16', contextLength: 4096, gpuConfigs: [{ gpuModel: 'rtx4060ti', count: '1' }] },
    { id: '3gpu-scaling-warning', parameters: '7', quantization: '16', contextLength: 4096, gpuConfigs: [{ gpuModel: 'rtx4090', count: '3' }] },
    { id: 'mixed-unified-discrete', parameters: '7', quantization: '16', contextLength: 4096, gpuConfigs: [{ gpuModel: 'm3-max', count: '1' }, { gpuModel: 'rtx4090', count: '1' }] },
    { id: 'empty-slot-ignored', parameters: '7', quantization: '16', contextLength: 4096, gpuConfigs: [{ gpuModel: '', count: '1' }, { gpuModel: 'rtx4090', count: '1' }] },
];

const validationCases = [
    { id: 'empty-params', parameters: '', gpuConfigs: [{ gpuModel: '', count: '1' }] },
    { id: 'invalid-params', parameters: 'abc', gpuConfigs: [{ gpuModel: 'rtx4090', count: '1' }] },
    { id: 'no-gpu', parameters: '7', gpuConfigs: [{ gpuModel: '', count: '1' }] },
    { id: 'zero-gpu-count', parameters: '7', gpuConfigs: [{ gpuModel: 'rtx4090', count: '0' }] },
];

const out = { scenarios: {}, validation: {} };

for (const s of scenarios) {
    const { results, warnings, errors } = runCalculator(s);
    out.scenarios[s.id] = {
        input: {
            parameters: s.parameters,
            quantization: s.quantization,
            contextLength: s.contextLength,
            gpuConfigs: s.gpuConfigs,
        },
        results,
        warnings,
        errors,
    };
}

for (const v of validationCases) {
    const r = validateCalculatorInputs({ parameters: v.parameters, gpuConfigs: v.gpuConfigs });
    out.validation[v.id] = {
        input: { parameters: v.parameters, gpuConfigs: v.gpuConfigs },
        valid: r.valid,
        errors: r.errors,
    };
}

const target = new URL('../src/fixtures/calculatorBaseline.json', import.meta.url);
writeFileSync(target, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${Object.keys(out.scenarios).length} scenarios to ${target.pathname}`);
