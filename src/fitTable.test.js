import { describe, it, expect } from 'vitest';
import {
    buildFitTable,
    runCalculator,
    getCompatibilityTier,
    snapContextLength,
    quantLabel,
    CONTEXT_OPTIONS,
    MODEL_PRESETS,
} from './calculatorOutput';

const rtx4090 = [{ gpuModel: 'rtx4090', count: '1' }];
const TIER_ORDER = { ok: 0, warn: 1, bad: 2 };

describe('buildFitTable', () => {
    it('returns nothing when no GPU is selected', () => {
        expect(buildFitTable({ gpuConfigs: [{ gpuModel: '', count: '1' }], contextLength: 4096 })).toEqual([]);
    });

    it('returns nothing for an invalid GPU count', () => {
        expect(buildFitTable({ gpuConfigs: [{ gpuModel: 'rtx4090', count: '0' }], contextLength: 4096 })).toEqual([]);
    });

    it('includes every local preset and skips cloud-only ones', () => {
        const rows = buildFitTable({ gpuConfigs: rtx4090, contextLength: 4096 });
        const localIds = MODEL_PRESETS.filter((p) => !p.cloudOnly).map((p) => p.id).sort();
        expect(rows.map((r) => r.preset.id).sort()).toEqual(localIds);
        expect(rows.some((r) => r.preset.cloudOnly)).toBe(false);
    });

    it('sorts by tier, then by required VRAM descending', () => {
        const rows = buildFitTable({ gpuConfigs: rtx4090, contextLength: 32768 });
        for (let i = 1; i < rows.length; i++) {
            const a = rows[i - 1];
            const b = rows[i];
            const tierDiff = TIER_ORDER[a.tier] - TIER_ORDER[b.tier];
            expect(tierDiff).toBeLessThanOrEqual(0);
            if (tierDiff === 0) {
                expect(a.results.totalGPURAM).toBeGreaterThanOrEqual(b.results.totalGPURAM);
            }
        }
        // A 24 GB card should fit some models and not others.
        expect(rows.some((r) => r.tier === 'ok')).toBe(true);
        expect(rows.some((r) => r.tier === 'bad')).toBe(true);
    });

    it('caps context at each preset\'s max and snaps to a dropdown option', () => {
        const rows = buildFitTable({ gpuConfigs: rtx4090, contextLength: 1048576 });
        for (const row of rows) {
            expect(row.contextLength).toBeLessThanOrEqual(row.preset.contextMax);
            expect(CONTEXT_OPTIONS).toContain(row.contextLength);
            expect(row.contextCapped).toBe(row.contextLength < 1048576);
        }
        expect(rows.some((r) => r.contextCapped)).toBe(true);
    });

    it('matches a direct runCalculator call for every row (what Load shows)', () => {
        const gpuConfigs = [{ gpuModel: 'rtx3090', count: '2' }];
        const rows = buildFitTable({ gpuConfigs, contextLength: 16384, kvCacheType: 'q8_0' });
        for (const row of rows) {
            const direct = runCalculator({
                parameters: String(row.preset.totalParamsB),
                quantization: row.quantization,
                contextLength: row.contextLength,
                gpuConfigs,
                kvCacheType: 'q8_0',
                presetId: row.preset.id,
            });
            expect(row.results.totalGPURAM).toBe(direct.results.totalGPURAM);
            expect(row.results.tokensPerSecond).toBe(direct.results.tokensPerSecond);
            expect(row.tier).toBe(getCompatibilityTier(direct.results));
        }
    });

    it('uses each preset\'s default quantization', () => {
        const rows = buildFitTable({ gpuConfigs: rtx4090, contextLength: 4096 });
        for (const row of rows) expect(row.quantization).toBe(row.preset.defaultQuant);
    });
});

describe('snapContextLength', () => {
    it('snaps down to the nearest option', () => {
        expect(snapContextLength(40960)).toBe(32768);
        expect(snapContextLength(131072)).toBe(131072);
        expect(snapContextLength(1000)).toBe(4096);
    });
});

describe('quantLabel', () => {
    it('maps quant values to display labels', () => {
        expect(quantLabel('4.5')).toBe('Q4_K_M');
        expect(quantLabel('16')).toBe('FP16');
        expect(quantLabel('4.25')).toBe('MXFP4');
    });
});

describe('MODEL_PRESETS data', () => {
    it('has unique ids and a source link for every preset', () => {
        const ids = MODEL_PRESETS.map((p) => p.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const p of MODEL_PRESETS) expect(p.sourceUrl).toMatch(/^https:\/\//);
    });

    it('gives every local preset real parameter counts', () => {
        for (const p of MODEL_PRESETS.filter((x) => !x.cloudOnly)) {
            expect(p.totalParamsB).toBeGreaterThan(0);
            expect(p.activeParamsB).toBeGreaterThan(0);
            expect(p.activeParamsB).toBeLessThanOrEqual(p.totalParamsB);
        }
    });
});
