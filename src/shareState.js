// Shareable links: calculator inputs <-> URL query string.
//
//   ?model=qwen3.6-35b&quant=q4_k_m&kv=q8_0&ctx=32k&gpu=rtx4090*2&gpu=a100-80gb
//
// model   preset id (omitted for a custom size; then `params` is used)
// params  parameter count in billions (custom models only)
// quant   quantization label, lowercase (fp16, q8_0, q4_k_m, ...)
// kv      KV cache type, omitted when f16
// ctx     context length: 4k ... 256k, 1m (plain numbers are accepted too)
// gpu     one per GPU row: id, or id*count
//
// Parsing is forgiving: unknown or invalid values are ignored, so an old or
// hand-edited link never breaks the page.

import {
    QUANT_OPTIONS,
    CONTEXT_OPTIONS,
    snapContextLength,
    getModelPreset,
} from './calculatorOutput';
import { gpuSpecs } from './data/gpuSpecs';

export const GPU_COUNT_OPTIONS = [1, 2, 3, 4, 8];
const KV_TYPES = ['f16', 'q8_0', 'q4_0'];
const MAX_GPU_ROWS = 8;

function quantToParam(value) {
    return QUANT_OPTIONS.find((o) => o.value === value)?.label.toLowerCase() ?? null;
}

function quantFromParam(raw) {
    if (!raw) return null;
    const v = raw.toLowerCase();
    const opt = QUANT_OPTIONS.find((o) => o.label.toLowerCase() === v || o.value === v);
    return opt ? opt.value : null;
}

function contextToParam(len) {
    return len >= 1048576 ? `${len / 1048576}m` : `${len / 1024}k`;
}

function contextFromParam(raw) {
    if (!raw) return null;
    const m = /^(\d+(?:\.\d+)?)([km]?)$/i.exec(raw.trim());
    if (!m) return null;
    const unit = m[2].toLowerCase();
    const n = parseFloat(m[1]) * (unit === 'k' ? 1024 : unit === 'm' ? 1048576 : 1);
    if (!Number.isFinite(n) || n <= 0) return null;
    return snapContextLength(n, CONTEXT_OPTIONS);
}

function gpuFromParam(raw) {
    if (!raw) return null;
    const [id, countRaw] = raw.toLowerCase().split('*');
    if (!gpuSpecs[id]) return null;
    const count = countRaw === undefined ? 1 : parseInt(countRaw, 10);
    if (!GPU_COUNT_OPTIONS.includes(count)) return null;
    return { gpuModel: id, count: String(count) };
}

function nearestContextOption(len) {
    return CONTEXT_OPTIONS.reduce((best, n) => (Math.abs(n - len) < Math.abs(best - len) ? n : best));
}

/**
 * Read calculator inputs from a query string. Returns only the fields that
 * were present and valid; the caller fills in its own defaults.
 */
export function parseShareParams(search) {
    const params = new URLSearchParams(search);
    const state = {};

    const gpuConfigs = params.getAll('gpu').map(gpuFromParam).filter(Boolean).slice(0, MAX_GPU_ROWS);
    if (gpuConfigs.length) state.gpuConfigs = gpuConfigs;

    const kv = params.get('kv');
    if (KV_TYPES.includes(kv)) state.kvCacheType = kv;

    const quant = quantFromParam(params.get('quant'));
    const ctx = contextFromParam(params.get('ctx'));

    const preset = getModelPreset(params.get('model'));
    if (preset) {
        state.presetId = preset.id;
        state.parameters = String(preset.totalParamsB);
        state.quantization = quant ?? preset.defaultQuant;
        state.contextLength = ctx ?? nearestContextOption(preset.contextDefault);
        return state;
    }

    const paramCount = parseFloat(params.get('params'));
    if (Number.isFinite(paramCount) && paramCount > 0 && paramCount <= 2000) {
        state.parameters = String(paramCount);
    }
    if (quant) state.quantization = quant;
    if (ctx) state.contextLength = ctx;
    return state;
}

/** Build the query string (without "?") for the current inputs. */
export function buildShareQuery({ presetId, parameters, quantization, kvCacheType, contextLength, gpuConfigs }) {
    const parts = [];
    const preset = getModelPreset(presetId);
    const paramCount = parseFloat(parameters);
    const hasModel = !!preset || (Number.isFinite(paramCount) && paramCount > 0);

    if (preset) {
        parts.push(['model', preset.id]);
    } else if (hasModel) {
        parts.push(['params', String(paramCount)]);
    }

    const gpus = gpuConfigs
        .filter((cfg) => gpuSpecs[cfg.gpuModel])
        .map((cfg) => {
            const count = parseInt(cfg.count, 10);
            return count > 1 ? `${cfg.gpuModel}*${count}` : cfg.gpuModel;
        });

    // Context and KV cache also drive the "what fits" table, so keep them
    // whenever a GPU is chosen, even without a model.
    if (hasModel || gpus.length) {
        if (hasModel) {
            const q = quantToParam(quantization);
            if (q) parts.push(['quant', q]);
        }
        if (kvCacheType && kvCacheType !== 'f16') parts.push(['kv', kvCacheType]);
        parts.push(['ctx', contextToParam(contextLength)]);
    }

    for (const gpu of gpus) parts.push(['gpu', gpu]);

    // encodeURIComponent leaves [a-z0-9.-*] alone, so typical links stay readable.
    return parts.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
}
