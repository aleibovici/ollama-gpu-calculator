import React from 'react';
import SearchCombobox from './SearchCombobox';
import { MODEL_PRESETS } from '../data/modelPresets';

function formatParams(b) {
    if (b >= 1) return `${Number.isInteger(b) ? b : b.toFixed(1).replace(/\.0$/, '')}B`;
    return `${Math.round(b * 1000)}M`;
}

const MODEL_ITEMS = MODEL_PRESETS.map((p) => ({
    key: p.id,
    name: p.label,
    detail: p.vendor,
    badge: formatParams(p.totalParamsB),
    // Extra words people search by: id, family, capabilities.
    haystack: [
        p.id,
        p.family,
        p.moe ? 'moe mixture-of-experts' : 'dense',
        ...p.modalities,
        p.id.includes('coder') || p.id.includes('devstral') ? 'code coding' : '',
        p.id.includes('embed') ? 'embedding' : '',
    ].join(' '),
}));

const CUSTOM_ITEM = { key: '', name: '— custom / enter params —' };

const ModelCombobox = ({ value, onChange, id }) => (
    <SearchCombobox
        id={id}
        items={MODEL_ITEMS}
        value={value}
        onChange={onChange}
        clearItem={CUSTOM_ITEM}
        placeholder="— custom / enter params —"
        searchPlaceholder="Search… e.g. qwen 27b, moe"
        emptyText={(q) => `No model matches “${q}”. Enter the parameter count below instead.`}
    />
);

export default ModelCombobox;
