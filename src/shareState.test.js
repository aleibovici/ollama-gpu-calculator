import { describe, it, expect } from 'vitest';
import { parseShareParams, buildShareQuery } from './shareState';
import { getModelPreset } from './calculatorOutput';

const base = {
    presetId: '',
    parameters: '',
    quantization: '16',
    kvCacheType: 'f16',
    contextLength: 4096,
    gpuConfigs: [{ id: 1, gpuModel: '', count: '1' }],
};

describe('buildShareQuery', () => {
    it('is empty for a blank calculator', () => {
        expect(buildShareQuery(base)).toBe('');
    });

    it('writes a readable preset link', () => {
        const q = buildShareQuery({
            ...base,
            presetId: 'qwen3.6-35b',
            parameters: String(getModelPreset('qwen3.6-35b').totalParamsB),
            quantization: '4.5',
            kvCacheType: 'q8_0',
            contextLength: 32768,
            gpuConfigs: [{ id: 1, gpuModel: 'rtx4090', count: '2' }, { id: 2, gpuModel: 'a100-80gb', count: '1' }],
        });
        expect(q).toBe('model=qwen3.6-35b&quant=q4_k_m&kv=q8_0&ctx=32k&gpu=rtx4090*2&gpu=a100-80gb');
    });

    it('writes params for a custom model and skips empty GPU rows', () => {
        const q = buildShareQuery({
            ...base,
            parameters: '7',
            contextLength: 1048576,
            gpuConfigs: [{ id: 1, gpuModel: '', count: '1' }, { id: 2, gpuModel: 'rtx3090', count: '1' }],
        });
        expect(q).toBe('params=7&quant=fp16&ctx=1m&gpu=rtx3090');
    });

    it('keeps context and KV for a GPU-only link (what-fits table)', () => {
        const q = buildShareQuery({ ...base, kvCacheType: 'q4_0', gpuConfigs: [{ id: 1, gpuModel: 'rtx4090', count: '1' }] });
        expect(q).toBe('kv=q4_0&ctx=4k&gpu=rtx4090');
    });

    it('ignores an invalid parameter value', () => {
        expect(buildShareQuery({ ...base, parameters: 'abc' })).toBe('');
    });
});

describe('parseShareParams', () => {
    it('reads a full preset link', () => {
        expect(parseShareParams('?model=qwen3.6-35b&quant=q4_k_m&kv=q8_0&ctx=32k&gpu=rtx4090*2&gpu=a100-80gb')).toEqual({
            presetId: 'qwen3.6-35b',
            parameters: String(getModelPreset('qwen3.6-35b').totalParamsB),
            quantization: '4.5',
            kvCacheType: 'q8_0',
            contextLength: 32768,
            gpuConfigs: [{ gpuModel: 'rtx4090', count: '2' }, { gpuModel: 'a100-80gb', count: '1' }],
        });
    });

    it('fills preset defaults when quant and ctx are missing', () => {
        const preset = getModelPreset('llama3.1-8b');
        const s = parseShareParams('?model=llama3.1-8b');
        expect(s.presetId).toBe('llama3.1-8b');
        expect(s.parameters).toBe(String(preset.totalParamsB));
        expect(s.quantization).toBe(preset.defaultQuant);
        expect(s.contextLength).toBe(131072);
    });

    it('reads a custom model and accepts plain numbers and any case', () => {
        expect(parseShareParams('?params=13&quant=Q8_0&ctx=8192&gpu=RTX3090')).toEqual({
            parameters: '13',
            quantization: '8',
            contextLength: 8192,
            gpuConfigs: [{ gpuModel: 'rtx3090', count: '1' }],
        });
    });

    it('ignores unknown and invalid values', () => {
        expect(parseShareParams('?model=nope&params=-3&quant=fp99&kv=q2&ctx=lots&gpu=gtx9999&gpu=rtx4090*5')).toEqual({});
    });

    it('ignores links to removed presets (e.g. old Ollama Cloud tags)', () => {
        expect(parseShareParams('?model=qwen3.5-cloud&gpu=rtx4090')).toEqual({
            gpuConfigs: [{ gpuModel: 'rtx4090', count: '1' }],
        });
    });

    it('snaps an odd context down to a dropdown option', () => {
        expect(parseShareParams('?params=7&ctx=40000').contextLength).toBe(32768);
    });

    it('limits the number of GPU rows', () => {
        const many = Array.from({ length: 20 }, () => 'gpu=rtx4090').join('&');
        expect(parseShareParams(`?${many}`).gpuConfigs).toHaveLength(8);
    });

    it('round-trips through buildShareQuery', () => {
        const links = [
            'model=gemma4-31b&quant=fp16&kv=q4_0&ctx=128k&gpu=h100*4',
            'params=70&quant=q4_k_m&ctx=8k&gpu=rtx4090*2&gpu=rtx3090',
            'kv=q8_0&ctx=256k&gpu=m3-max',
        ];
        for (const q of links) {
            const parsed = parseShareParams(`?${q}`);
            const rebuilt = buildShareQuery({
                ...base,
                ...parsed,
                gpuConfigs: parsed.gpuConfigs.map((c, i) => ({ id: i + 1, ...c })),
            });
            expect(rebuilt).toBe(q);
        }
    });
});
