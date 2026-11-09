/**
 * Explicit modes shared across the calculator UI and output layer.
 * Keeps UX labels, DX contracts, and AX copy on one source of truth.
 */

/** @param {never} value */
export function assertNever(value) {
    throw new Error(`Unhandled mode: ${String(value)}`);
}

/** @typedef {'ok' | 'warn' | 'bad'} CompatibilityTier */

export const CompatibilityTier = Object.freeze({
    OK: /** @type {CompatibilityTier} */ ('ok'),
    WARN: /** @type {CompatibilityTier} */ ('warn'),
    BAD: /** @type {CompatibilityTier} */ ('bad'),
});

/**
 * Derive compatibility flags + tier from numeric margin.
 * Preserves historical semantics: margin === 0 is Compatible (ok), not bad.
 *
 * @param {number} vramMargin
 * @param {number} effectiveVRAM
 * @param {number} totalGPURAM
 */
export function deriveCompatibility(vramMargin, effectiveVRAM, totalGPURAM) {
    const isCompatible = effectiveVRAM >= totalGPURAM;
    const isBorderline = vramMargin > 0 && vramMargin < 2;
    const tier = compatibilityTierFromFlags(isCompatible, isBorderline);
    return { tier, isCompatible, isBorderline };
}

/**
 * @param {boolean} isCompatible
 * @param {boolean} isBorderline
 * @returns {CompatibilityTier}
 */
export function compatibilityTierFromFlags(isCompatible, isBorderline) {
    if (isCompatible && !isBorderline) return CompatibilityTier.OK;
    if (isBorderline) return CompatibilityTier.WARN;
    return CompatibilityTier.BAD;
}

/** Live readout status label (Compatible / Borderline / Insufficient). */
export function compatibilityStatusLabel(tier) {
    switch (tier) {
        case CompatibilityTier.OK:
            return 'Compatible';
        case CompatibilityTier.WARN:
            return 'Borderline';
        case CompatibilityTier.BAD:
            return 'Insufficient';
        default:
            return assertNever(tier);
    }
}

/** Fit-table short label (Fits / Tight / Won't fit). */
export function compatibilityFitLabel(tier) {
    switch (tier) {
        case CompatibilityTier.OK:
            return 'Fits';
        case CompatibilityTier.WARN:
            return 'Tight';
        case CompatibilityTier.BAD:
            return "Won't fit";
        default:
            return assertNever(tier);
    }
}

/** Sort order for fit-table rows: fits first, then tight, then won't. */
export const COMPATIBILITY_TIER_ORDER = Object.freeze({
    [CompatibilityTier.OK]: 0,
    [CompatibilityTier.WARN]: 1,
    [CompatibilityTier.BAD]: 2,
});

/** @typedef {'single' | 'split' | 'none'} ScheduleMode */

export const ScheduleMode = Object.freeze({
    SINGLE: /** @type {ScheduleMode} */ ('single'),
    SPLIT: /** @type {ScheduleMode} */ ('split'),
    NONE: /** @type {ScheduleMode} */ ('none'),
});

/** Throughput metric detail under the tok/s readout. */
export function scheduleThroughputDetail(mode) {
    switch (mode) {
        case ScheduleMode.SINGLE:
            return 'Single-GPU path';
        case ScheduleMode.SPLIT:
        case ScheduleMode.NONE:
            return 'Estimated decode rate';
        default:
            return assertNever(mode);
    }
}

/** Available-VRAM metric detail. */
export function scheduleAvailableVramDetail(mode) {
    switch (mode) {
        case ScheduleMode.SINGLE:
            return 'Best single GPU (fit-one-first)';
        case ScheduleMode.SPLIT:
            return 'After multi-GPU / driver haircut';
        case ScheduleMode.NONE:
            return 'Configured VRAM pool';
        default:
            return assertNever(mode);
    }
}

/** @typedef {'light' | 'dark'} ThemeMode */

export const ThemeMode = Object.freeze({
    LIGHT: /** @type {ThemeMode} */ ('light'),
    DARK: /** @type {ThemeMode} */ ('dark'),
});

export const THEME_STORAGE_KEY = 'ogc-theme';

/** @param {unknown} value @returns {value is ThemeMode} */
export function isThemeMode(value) {
    return value === ThemeMode.LIGHT || value === ThemeMode.DARK;
}

/** @param {ThemeMode} theme */
export function toggleTheme(theme) {
    switch (theme) {
        case ThemeMode.DARK:
            return ThemeMode.LIGHT;
        case ThemeMode.LIGHT:
            return ThemeMode.DARK;
        default:
            return assertNever(theme);
    }
}

/** @param {ThemeMode} theme */
export function themeToggleAriaLabel(theme) {
    switch (theme) {
        case ThemeMode.DARK:
            return 'Switch to light theme';
        case ThemeMode.LIGHT:
            return 'Switch to dark theme';
        default:
            return assertNever(theme);
    }
}

/** Resolve theme before React mounts (localStorage → system preference). */
export function resolveInitialTheme() {
    try {
        const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (isThemeMode(saved)) return saved;
    } catch {
        // Ignore storage read issues and fall through to system preference.
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
        ? ThemeMode.DARK
        : ThemeMode.LIGHT;
}

/** Read current document theme after boot (defaults to dark). */
export function readDocumentTheme() {
    return document.documentElement.getAttribute('data-theme') === ThemeMode.LIGHT
        ? ThemeMode.LIGHT
        : ThemeMode.DARK;
}

/** Persist + apply theme to <html data-theme>. */
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
        // Ignore storage write issues to avoid impacting calculator behavior.
    }
}

/** @typedef {'idle' | 'copied' | 'failed'} ShareStatus */

export const ShareStatus = Object.freeze({
    IDLE: /** @type {ShareStatus} */ ('idle'),
    COPIED: /** @type {ShareStatus} */ ('copied'),
    FAILED: /** @type {ShareStatus} */ ('failed'),
});

/** @param {ShareStatus} status */
export function shareButtonIcon(status) {
    switch (status) {
        case ShareStatus.COPIED:
            return '✓';
        case ShareStatus.IDLE:
        case ShareStatus.FAILED:
            return '⧉';
        default:
            return assertNever(status);
    }
}

/** @param {ShareStatus} status */
export function shareButtonLabel(status) {
    switch (status) {
        case ShareStatus.COPIED:
            return 'Link copied';
        case ShareStatus.FAILED:
            return 'Copy from address bar';
        case ShareStatus.IDLE:
            return 'Copy link';
        default:
            return assertNever(status);
    }
}

/** Live region text for screen readers after a copy attempt. */
export function shareStatusAnnouncement(status) {
    switch (status) {
        case ShareStatus.COPIED:
            return 'Link to this configuration copied';
        case ShareStatus.FAILED:
            return 'Could not copy. Copy the link from the address bar.';
        case ShareStatus.IDLE:
            return '';
        default:
            return assertNever(status);
    }
}

/** @typedef {'f16' | 'q8_0' | 'q4_0'} KvCacheType */

export const KvCacheType = Object.freeze({
    F16: /** @type {KvCacheType} */ ('f16'),
    Q8_0: /** @type {KvCacheType} */ ('q8_0'),
    Q4_0: /** @type {KvCacheType} */ ('q4_0'),
});

/** UI segmented-control options for OLLAMA_KV_CACHE_TYPE. */
export const KV_CACHE_OPTIONS = Object.freeze([
    { value: KvCacheType.F16, label: 'f16', hint: 'default' },
    { value: KvCacheType.Q8_0, label: 'q8_0', hint: '~½' },
    { value: KvCacheType.Q4_0, label: 'q4_0', hint: '~¼' },
]);

export const KV_CACHE_TYPE_IDS = Object.freeze(KV_CACHE_OPTIONS.map((o) => o.value));

/** @param {unknown} value @returns {value is KvCacheType} */
export function isKvCacheType(value) {
    return KV_CACHE_TYPE_IDS.includes(/** @type {KvCacheType} */ (value));
}
