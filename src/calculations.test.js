import { describe, it, expect } from 'vitest';
import {
    gpuSpecs,
    estimateTransformerShape,
    calculateBaseModelSizeGB,
    calculateKvCacheGB,
    calculateRAMRequirements,
    calculateTokensPerSecond,
    calculatePowerConsumption,
} from './calculations';

// Ground truth values below come from actual model configs (LLaMA 7B/13B/70B
// architecture) and published GPU specs. The approximations in the calculator
// shouldn't deviate by more than ~15% from these.

const within = (actual, expected, relTol = 0.15) => {
    const delta = Math.abs(actual - expected) / expected;
    return delta <= relTol;
};

describe('estimateTransformerShape', () => {
    it('approximates LLaMA 7B (d=4096, L=32)', () => {
        const { dModel, nLayers } = estimateTransformerShape(7);
        expect(within(dModel, 4096, 0.05)).toBe(true);
        expect(within(nLayers, 32, 0.1)).toBe(true);
    });

    it('approximates LLaMA 13B (d=5120, L=40)', () => {
        const { dModel, nLayers } = estimateTransformerShape(13);
        expect(within(dModel, 5120, 0.05)).toBe(true);
        expect(within(nLayers, 40, 0.1)).toBe(true);
    });

    it('approximates LLaMA 70B (d=8192, L=80) within 15%', () => {
        const { dModel, nLayers } = estimateTransformerShape(70);
        expect(within(dModel, 8192, 0.15)).toBe(true);
        expect(within(nLayers, 80, 0.15)).toBe(true);
    });

    it('never returns < 1 layer, even for tiny models', () => {
        const { nLayers } = estimateTransformerShape(0.1);
        expect(nLayers).toBeGreaterThanOrEqual(1);
    });

    it('regression: does NOT use the old sqrt(P/6) formula (was ~34k for 7B)', () => {
        const { dModel } = estimateTransformerShape(7);
        expect(dModel).toBeLessThan(10000);
    });
});

describe('calculateBaseModelSizeGB', () => {
    it('7B at FP16 ≈ 13.04 GB', () => {
        expect(calculateBaseModelSizeGB(7, 16)).toBeCloseTo(13.04, 1);
    });

    it('13B at FP16 ≈ 24.21 GB', () => {
        expect(calculateBaseModelSizeGB(13, 16)).toBeCloseTo(24.21, 1);
    });

    it('70B at Q4 ≈ 32.6 GB', () => {
        expect(calculateBaseModelSizeGB(70, 4)).toBeCloseTo(32.6, 1);
    });

    it('Q4 is exactly 1/4 of FP16', () => {
        const fp16 = calculateBaseModelSizeGB(7, 16);
        const q4 = calculateBaseModelSizeGB(7, 4);
        expect(fp16 / q4).toBeCloseTo(4, 5);
    });
});

describe('calculateKvCacheGB', () => {
    // Ground truth: LLaMA 7B full-MHA KV cache at 4k ctx, FP16 = 2 GiB exactly
    //   2 (K+V) * 32 layers * 4096 d_model * 4096 ctx * 2 bytes = 2 GiB
    it('LLaMA 7B @ 4k ctx ≈ 2 GB (FP16 KV)', () => {
        const kv = calculateKvCacheGB(7, 4096);
        expect(within(kv, 2.0, 0.15)).toBe(true);
    });

    // Ground truth: LLaMA 13B full-MHA @ 4k ≈ 2 * 40 * 5120 * 4096 * 2 = 3.125 GiB
    it('LLaMA 13B @ 4k ctx ≈ 3.1 GB', () => {
        const kv = calculateKvCacheGB(13, 4096);
        expect(within(kv, 3.125, 0.15)).toBe(true);
    });

    it('doubles when context doubles', () => {
        const kv4k = calculateKvCacheGB(7, 4096);
        const kv8k = calculateKvCacheGB(7, 8192);
        expect(kv8k / kv4k).toBeCloseTo(2, 2);
    });

    it('regression: KV cache does NOT scale with weight quantization', () => {
        // calculateKvCacheGB doesn't take quantBits — it's always FP16.
        // Confirm the function signature / behavior hasn't regressed.
        expect(calculateKvCacheGB.length).toBe(2);
    });

    it('regression: KV cache for 7B @ 4k is NOT the old buggy ~1.04 GB', () => {
        // Old (wrong) formula with sqrt(P/6) hidden_size and no layer count
        // gave 1.04 GB for 7B @ 4k FP16. The correct value is ~2 GB.
        const kv = calculateKvCacheGB(7, 4096);
        expect(kv).toBeGreaterThan(1.5);
    });
});

describe('calculateRAMRequirements', () => {
    const rtx4090 = [{ gpuModel: 'rtx4090', count: '1' }];

    it('7B FP16 on RTX 4090: totals add up and VRAM is close to 16 GB', () => {
        const r = calculateRAMRequirements(7, 16, 4096, rtx4090);
        expect(r.baseModelSizeGB).toBeCloseTo(13.04, 1);
        expect(r.totalGPURAM).toBeCloseTo(r.baseModelSizeGB + r.kvCacheSize + r.baseModelSizeGB * 0.1, 4);
        // RTX 4090 has 24 GB VRAM; 7B FP16 + ~2 GB KV + 10% = ~17 GB, well under 24.
        expect(r.totalGPURAM).toBeLessThan(24);
    });

    it('vramMargin is consistent with isCompatible (both use effective VRAM)', () => {
        // Mixed multi-GPU setup: 2x RTX 4090.
        const r = calculateRAMRequirements(7, 16, 4096, [{ gpuModel: 'rtx4090', count: '2' }]);
        // effectiveVRAM = 48 * 0.9 = 43.2. vramMargin = effective - totalGPURAM.
        expect(r.vramMargin).toBeCloseTo(r.effectiveVRAM - r.totalGPURAM, 6);
        // vramMargin sign should match the compatibility verdict.
        const compatible = r.effectiveVRAM >= r.totalGPURAM;
        expect(compatible).toBe(r.vramMargin >= 0);
    });

    it('multi-GPU efficiency kicks in at 2+ GPUs', () => {
        const one = calculateRAMRequirements(7, 16, 4096, [{ gpuModel: 'rtx4090', count: '1' }]);
        const two = calculateRAMRequirements(7, 16, 4096, [{ gpuModel: 'rtx4090', count: '2' }]);
        // Single GPU: no penalty.
        expect(one.effectiveVRAM).toBeCloseTo(one.totalAvailableVRAM, 5);
        // Multi GPU: 0.9x penalty.
        expect(two.effectiveVRAM).toBeCloseTo(two.totalAvailableVRAM * 0.9, 5);
    });

    it('ignores empty GPU slots', () => {
        const r = calculateRAMRequirements(7, 16, 4096, [
            { gpuModel: '', count: '1' },
            { gpuModel: 'rtx4090', count: '1' },
        ]);
        // Empty slot shouldn't be counted.
        expect(r.totalAvailableVRAM).toBe(24);
        // And there's only one effective GPU, so no 0.9 penalty.
        expect(r.effectiveVRAM).toBeCloseTo(24, 5);
    });

    it('70B FP16 needs >100 GB VRAM (exceeds a single 80 GB H100)', () => {
        const r = calculateRAMRequirements(70, 16, 4096, [{ gpuModel: 'h100', count: '1' }]);
        expect(r.totalGPURAM).toBeGreaterThan(100);
        expect(r.vramMargin).toBeLessThan(0);
    });
});

describe('calculateTokensPerSecond', () => {
    // Ground-truth references (single-stream decode, batch=1, ctx≈4k) from
    // llama.cpp / Ollama benchmarks as of 2025:
    //   RTX 4090 + 7B FP16 ≈ 50-65 tok/s
    //   RTX 4090 + 7B Q4   ≈ 120-160 tok/s
    //   H100 SXM + 7B FP16 ≈ 150-220 tok/s
    //   2x H100  + 70B FP16 ≈ 25-40 tok/s

    const singleRtx4090 = [{ gpuModel: 'rtx4090', count: '1' }];

    it('returns null when no GPU is selected', () => {
        expect(calculateTokensPerSecond(7, 16, 4096, [])).toBeNull();
        expect(calculateTokensPerSecond(7, 16, 4096, [{ gpuModel: '', count: '1' }])).toBeNull();
    });

    it('RTX 4090 + 7B FP16 is in the 40-80 tok/s ballpark', () => {
        const tps = calculateTokensPerSecond(7, 16, 4096, singleRtx4090);
        expect(tps).toBeGreaterThan(40);
        expect(tps).toBeLessThan(80);
    });

    it('RTX 4090 + 7B Q4 is in the 100-220 tok/s ballpark', () => {
        const tps = calculateTokensPerSecond(7, 4, 4096, singleRtx4090);
        expect(tps).toBeGreaterThan(100);
        expect(tps).toBeLessThan(220);
    });

    it('H100 + 7B FP16 is in the 120-240 tok/s ballpark', () => {
        const tps = calculateTokensPerSecond(7, 16, 4096, [{ gpuModel: 'h100', count: '1' }]);
        expect(tps).toBeGreaterThan(120);
        expect(tps).toBeLessThan(240);
    });

    it('2x H100 + 70B FP16 is in the 20-50 tok/s ballpark', () => {
        const tps = calculateTokensPerSecond(70, 16, 4096, [{ gpuModel: 'h100', count: '2' }]);
        expect(tps).toBeGreaterThan(20);
        expect(tps).toBeLessThan(50);
    });

    it('multi-GPU scales sub-linearly (2 GPUs give < 2× TPS)', () => {
        const one = calculateTokensPerSecond(7, 16, 4096, [{ gpuModel: 'rtx4090', count: '1' }]);
        const two = calculateTokensPerSecond(7, 16, 4096, [{ gpuModel: 'rtx4090', count: '2' }]);
        expect(two).toBeGreaterThan(one);
        expect(two).toBeLessThan(2 * one);
        // But it should be better than no scaling.
        expect(two).toBeGreaterThan(one * 1.5);
    });

    it('heterogeneous setup bottlenecks on the slowest GPU', () => {
        // H100 (3350 GB/s) + A2 (200 GB/s) should be dramatically slower than
        // 2x H100, despite H100 appearing in both configs.
        const twoH100 = calculateTokensPerSecond(7, 16, 4096, [{ gpuModel: 'h100', count: '2' }]);
        const hetero = calculateTokensPerSecond(7, 16, 4096, [
            { gpuModel: 'h100', count: '1' },
            { gpuModel: 'a2', count: '1' },
        ]);
        expect(hetero).toBeLessThan(twoH100 / 2);
    });

    it('regression: TPS is memory-bandwidth-bound, not compute-bound', () => {
        // Two GPUs with very different TFLOPS but similar bandwidth should give
        // similar TPS. A40 has 149.8 TFLOPS, 696 GB/s; A6000 has 77.4 TFLOPS,
        // 768 GB/s. If we were compute-bound, A40 would be 2× faster. Since
        // we're bandwidth-bound, A6000 should actually be slightly faster.
        const a40 = calculateTokensPerSecond(7, 16, 4096, [{ gpuModel: 'a40', count: '1' }]);
        const a6000 = calculateTokensPerSecond(7, 16, 4096, [{ gpuModel: 'a6000', count: '1' }]);
        expect(a6000).toBeGreaterThanOrEqual(a40);
    });

    it('regression: Q4 is faster than FP16 purely because weights are smaller', () => {
        // On the same GPU, smaller weights = fewer bytes to read = more TPS.
        const fp16 = calculateTokensPerSecond(7, 16, 4096, singleRtx4090);
        const q4 = calculateTokensPerSecond(7, 4, 4096, singleRtx4090);
        expect(q4).toBeGreaterThan(fp16);
        // Q4 weights are 4x smaller, but KV cache stays FP16 so the speedup
        // is less than 4x. We expect roughly 2-3.5x.
        expect(q4 / fp16).toBeGreaterThan(1.8);
        expect(q4 / fp16).toBeLessThan(3.5);
    });

    it('longer context slows TPS (KV cache reads grow)', () => {
        const short = calculateTokensPerSecond(7, 16, 4096, singleRtx4090);
        const long = calculateTokensPerSecond(7, 16, 32768, singleRtx4090);
        expect(long).toBeLessThan(short);
    });

    it('ignores zero/invalid GPU counts', () => {
        // Empty-but-selected config shouldn't crash or contribute.
        const tps = calculateTokensPerSecond(7, 16, 4096, [
            { gpuModel: 'rtx4090', count: '1' },
            { gpuModel: 'rtx4090', count: '0' }, // invalid, skipped
        ]);
        const single = calculateTokensPerSecond(7, 16, 4096, [{ gpuModel: 'rtx4090', count: '1' }]);
        expect(tps).toBe(single);
    });
});

describe('calculatePowerConsumption', () => {
    it('scales with number of GPUs', () => {
        const one = calculatePowerConsumption([{ gpuModel: 'rtx4090', count: '1' }], 7, 16);
        const two = calculatePowerConsumption([{ gpuModel: 'rtx4090', count: '2' }], 7, 16);
        expect(two.totalPower).toBeGreaterThan(one.totalPower);
    });

    it('lower utilization at Q4 than FP32', () => {
        const q4 = calculatePowerConsumption([{ gpuModel: 'rtx4090', count: '1' }], 7, 4);
        const fp32 = calculatePowerConsumption([{ gpuModel: 'rtx4090', count: '1' }], 7, 32);
        expect(q4.totalPower).toBeLessThan(fp32.totalPower);
    });

    it('skips empty GPU slots', () => {
        const withEmpty = calculatePowerConsumption([
            { gpuModel: '', count: '1' },
            { gpuModel: 'rtx4090', count: '1' },
        ], 7, 16);
        const single = calculatePowerConsumption([{ gpuModel: 'rtx4090', count: '1' }], 7, 16);
        expect(withEmpty.totalPower).toBe(single.totalPower);
    });
});

describe('Apple Silicon unified memory', () => {
    it('does not double-count memory: systemRAM equals totalGPURAM', () => {
        const r = calculateRAMRequirements(7, 16, 4096, [{ gpuModel: 'm3-max', count: '1' }]);
        expect(r.unifiedMemory).toBe(true);
        expect(r.totalSystemRAM).toBeCloseTo(r.totalGPURAM, 5);
    });

    it('discrete GPU still gets the 1.5× FP16 multiplier', () => {
        const r = calculateRAMRequirements(7, 16, 4096, [{ gpuModel: 'rtx4090', count: '1' }]);
        expect(r.unifiedMemory).toBe(false);
        expect(r.totalSystemRAM).toBeCloseTo(r.totalGPURAM * 1.5, 5);
    });

    it('mixed unified + discrete falls back to discrete (safe default)', () => {
        const r = calculateRAMRequirements(7, 16, 4096, [
            { gpuModel: 'm3-max', count: '1' },
            { gpuModel: 'rtx4090', count: '1' },
        ]);
        expect(r.unifiedMemory).toBe(false);
    });

    it('empty gpuConfigs is not unified (unified flag requires at least one active unified GPU)', () => {
        const r = calculateRAMRequirements(7, 16, 4096, []);
        expect(r.unifiedMemory).toBe(false);
    });

    it('every Apple Silicon GPU spec is flagged unifiedMemory', () => {
        for (const [key, gpu] of Object.entries(gpuSpecs)) {
            if (gpu.generation === 'Apple Silicon') {
                expect(gpu.unifiedMemory, `${key} should be unifiedMemory`).toBe(true);
            }
        }
    });

    it('no discrete GPU is flagged unifiedMemory', () => {
        for (const [key, gpu] of Object.entries(gpuSpecs)) {
            if (gpu.generation !== 'Apple Silicon') {
                expect(gpu.unifiedMemory, `${key} should NOT be unifiedMemory`).toBeFalsy();
            }
        }
    });
});

describe('quantization-aware minimumSystemRAM', () => {
    it('FP16 7B rounds up to 32 GB', () => {
        // 7B FP16 totalSystemRAM ≈ 15 * 1.5 = ~22 GB → rounds to 32.
        const r = calculateRAMRequirements(7, 16, 4096, [{ gpuModel: 'rtx4090', count: '1' }]);
        expect(r.minimumSystemRAM).toBe(32);
    });

    it('Q4 7B rounds down to a lower tier than FP16 7B', () => {
        const fp16 = calculateRAMRequirements(7, 16, 4096, [{ gpuModel: 'rtx4090', count: '1' }]);
        const q4 = calculateRAMRequirements(7, 4, 4096, [{ gpuModel: 'rtx4090', count: '1' }]);
        // Q4 weights are 1/4 of FP16, so minimum should drop by at least one power-of-2 tier.
        expect(q4.minimumSystemRAM).toBeLessThan(fp16.minimumSystemRAM);
    });

    it('tiny models floor at 8 GB', () => {
        const r = calculateRAMRequirements(0.5, 4, 2048, [{ gpuModel: 'rtx4090', count: '1' }]);
        expect(r.minimumSystemRAM).toBe(8);
    });

    it('always returns a power of 2', () => {
        const samples = [
            [1, 16], [3, 16], [7, 16], [7, 4], [13, 16], [13, 4], [70, 16], [70, 4],
        ];
        for (const [p, q] of samples) {
            const r = calculateRAMRequirements(p, q, 4096, [{ gpuModel: 'rtx4090', count: '1' }]);
            const log2 = Math.log2(r.minimumSystemRAM);
            expect(log2, `param=${p} quant=${q} min=${r.minimumSystemRAM}`).toBe(Math.floor(log2));
        }
    });
});

describe('symmetric multi-GPU power overhead', () => {
    // Same physical setup (2x RTX 4090), two different ways of configuring it.
    const oneRowTwoGpus = [{ gpuModel: 'rtx4090', count: '2' }];
    const twoRowsOneGpuEach = [
        { gpuModel: 'rtx4090', count: '1' },
        { gpuModel: 'rtx4090', count: '1' },
    ];

    it('produces the same total power for equivalent setups', () => {
        const a = calculatePowerConsumption(oneRowTwoGpus, 7, 16);
        const b = calculatePowerConsumption(twoRowsOneGpuEach, 7, 16);
        expect(a.totalPower).toBe(b.totalPower);
    });

    it('produces the same systemOverhead for equivalent setups', () => {
        const a = calculatePowerConsumption(oneRowTwoGpus, 7, 16);
        const b = calculatePowerConsumption(twoRowsOneGpuEach, 7, 16);
        expect(a.systemOverhead).toBe(b.systemOverhead);
    });

    it('single GPU has no multi-GPU overhead', () => {
        const one = calculatePowerConsumption([{ gpuModel: 'rtx4090', count: '1' }], 7, 16);
        // systemOverhead for 7B is 100 W base + 0 extra GPUs + 0 inter-GPU overhead.
        expect(one.systemOverhead).toBe(100);
    });

    it('2 GPUs add exactly one increment of inter-GPU overhead', () => {
        const one = calculatePowerConsumption([{ gpuModel: 'rtx4090', count: '1' }], 7, 16);
        const two = calculatePowerConsumption([{ gpuModel: 'rtx4090', count: '2' }], 7, 16);
        // Difference = rowPower (extra GPU) + 25 (per-extra) + inter-GPU power share.
        // Just assert the structure: 2-GPU overhead > 1-GPU overhead by at least +25.
        expect(two.systemOverhead).toBeGreaterThanOrEqual(one.systemOverhead + 25);
    });
});

describe('gpuSpecs', () => {
    it('every GPU has a bandwidth field', () => {
        for (const [key, gpu] of Object.entries(gpuSpecs)) {
            expect(typeof gpu.bandwidth, `gpu "${key}" missing bandwidth`).toBe('number');
            expect(gpu.bandwidth).toBeGreaterThan(0);
        }
    });

    it('every GPU has the core fields (name, vram, tflops, tdp, generation)', () => {
        for (const [key, gpu] of Object.entries(gpuSpecs)) {
            expect(typeof gpu.name, `gpu "${key}"`).toBe('string');
            expect(typeof gpu.vram, `gpu "${key}"`).toBe('number');
            expect(typeof gpu.tflops, `gpu "${key}"`).toBe('number');
            expect(typeof gpu.tdp, `gpu "${key}"`).toBe('number');
            expect(typeof gpu.generation, `gpu "${key}"`).toBe('string');
        }
    });
});
