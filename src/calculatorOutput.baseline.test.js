/**
 * Golden-master regression tests for the full calculator output contract.
 *
 * Fixtures in ./fixtures/calculatorBaseline.json were captured from the current
 * implementation. After refactors (unified orchestrator, useMemo, etc.), every
 * scenario here must still produce identical results, warnings, and validation.
 *
 * To regenerate fixtures after an intentional behavior change:
 *   bun run scripts/generate-calculator-baseline.mjs
 */
import { describe, it, expect } from 'vitest';
import baseline from './fixtures/calculatorBaseline.json';
import {
    runCalculator,
    computeCalculatorResults,
    buildWarnings,
    validateCalculatorInputs,
    parseQuantBits,
} from './calculatorOutput';

describe('calculator baseline — validation', () => {
    for (const [id, fixture] of Object.entries(baseline.validation)) {
        it(id, () => {
            const result = validateCalculatorInputs(fixture.input);
            expect(result.valid).toBe(fixture.valid);
            expect(result.errors).toEqual(fixture.errors);
        });
    }
});

describe('calculator baseline — full runCalculator output', () => {
    for (const [id, fixture] of Object.entries(baseline.scenarios)) {
        it(id, () => {
            const { results, warnings, errors } = runCalculator(fixture.input);
            expect(errors).toEqual(fixture.errors);
            expect(warnings).toEqual(fixture.warnings);
            expect(results).toEqual(fixture.results);
        });
    }
});

describe('calculator baseline — decomposed API matches runCalculator', () => {
    for (const [id, fixture] of Object.entries(baseline.scenarios)) {
        it(`${id} (compute + warnings)`, () => {
            const validation = validateCalculatorInputs({
                parameters: fixture.input.parameters,
                gpuConfigs: fixture.input.gpuConfigs,
            });
            expect(validation.valid).toBe(true);

            const results = computeCalculatorResults({
                paramCount: validation.paramCount,
                quantBits: parseQuantBits(fixture.input.quantization),
                contextLength: fixture.input.contextLength,
                gpuConfigs: fixture.input.gpuConfigs,
            });

            const warnings = buildWarnings({
                paramCount: validation.paramCount,
                quantBits: parseQuantBits(fixture.input.quantization),
                contextLength: fixture.input.contextLength,
                gpuConfigs: fixture.input.gpuConfigs,
                results,
            });

            expect(results).toEqual(fixture.results);
            expect(warnings).toEqual(fixture.warnings);
        });
    }
});

describe('calculator baseline — output shape invariants', () => {
    const sample = baseline.scenarios['7b-fp16-rtx4090'].results;

    it('memory fields are numbers, not pre-formatted strings', () => {
        for (const key of [
            'baseModelSizeGB',
            'kvCacheSize',
            'totalGPURAM',
            'totalSystemRAM',
            'effectiveVRAM',
            'vramMargin',
        ]) {
            expect(typeof sample[key], key).toBe('number');
        }
    });

    it('compatibility flags agree with numeric margin', () => {
        for (const fixture of Object.values(baseline.scenarios)) {
            const { results } = fixture;
            expect(results.isCompatible).toBe(results.effectiveVRAM >= results.totalGPURAM);
            expect(results.isBorderline).toBe(results.vramMargin > 0 && results.vramMargin < 2);
        }
    });
});
