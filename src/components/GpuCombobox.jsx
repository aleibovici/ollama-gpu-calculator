import React from 'react';
import SearchCombobox from './SearchCombobox';
import { gpuSpecs } from '../data/gpuSpecs';

const GPU_ITEMS = Object.entries(gpuSpecs).map(([key, gpu]) => ({
    key,
    name: gpu.name,
    detail: gpu.generation,
    badge: `${gpu.vram}GB`,
    haystack: gpu.unifiedMemory ? 'unified memory' : '',
}));

const GpuCombobox = ({ value, onChange, ariaLabel }) => (
    <SearchCombobox
        items={GPU_ITEMS}
        value={value}
        onChange={onChange}
        ariaLabel={ariaLabel}
        placeholder="— select or search model —"
        searchPlaceholder="Search GPU…"
        emptyText={(q) => `No GPU matches “${q}”`}
    />
);

export default GpuCombobox;
