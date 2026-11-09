import { describe, it, expect } from 'vitest';
import {
    CompatibilityTier,
    ScheduleMode,
    ShareStatus,
    ThemeMode,
    assertNever,
    compatibilityFitLabel,
    compatibilityStatusLabel,
    compatibilityTierFromFlags,
    deriveCompatibility,
    scheduleAvailableVramDetail,
    scheduleThroughputDetail,
    shareButtonLabel,
    shareStatusAnnouncement,
    toggleTheme,
} from './modes';

describe('compatibility tier derivation', () => {
    it('keeps margin === 0 as Compatible (historical contract)', () => {
        const c = deriveCompatibility(0, 24, 24);
        expect(c).toEqual({
            tier: CompatibilityTier.OK,
            isCompatible: true,
            isBorderline: false,
        });
    });

    it('marks 0 < margin < 2 as Borderline', () => {
        const c = deriveCompatibility(1.5, 25.5, 24);
        expect(c.tier).toBe(CompatibilityTier.WARN);
        expect(c.isCompatible).toBe(true);
        expect(c.isBorderline).toBe(true);
    });

    it('marks negative margin as Insufficient', () => {
        const c = deriveCompatibility(-3, 21, 24);
        expect(c.tier).toBe(CompatibilityTier.BAD);
        expect(c.isCompatible).toBe(false);
        expect(c.isBorderline).toBe(false);
    });

    it('flags and tier stay in sync', () => {
        expect(compatibilityTierFromFlags(true, false)).toBe(CompatibilityTier.OK);
        expect(compatibilityTierFromFlags(true, true)).toBe(CompatibilityTier.WARN);
        expect(compatibilityTierFromFlags(false, false)).toBe(CompatibilityTier.BAD);
    });
});

describe('exhaustive label helpers', () => {
    it('covers every compatibility tier', () => {
        expect(compatibilityStatusLabel(CompatibilityTier.OK)).toBe('Compatible');
        expect(compatibilityStatusLabel(CompatibilityTier.WARN)).toBe('Borderline');
        expect(compatibilityStatusLabel(CompatibilityTier.BAD)).toBe('Insufficient');
        expect(compatibilityFitLabel(CompatibilityTier.OK)).toBe('Fits');
        expect(compatibilityFitLabel(CompatibilityTier.WARN)).toBe('Tight');
        expect(compatibilityFitLabel(CompatibilityTier.BAD)).toBe("Won't fit");
    });

    it('covers every schedule mode', () => {
        expect(scheduleThroughputDetail(ScheduleMode.SINGLE)).toBe('Single-GPU path');
        expect(scheduleThroughputDetail(ScheduleMode.SPLIT)).toBe('Estimated decode rate');
        expect(scheduleThroughputDetail(ScheduleMode.NONE)).toBe('Estimated decode rate');
        expect(scheduleAvailableVramDetail(ScheduleMode.SINGLE)).toContain('single GPU');
        expect(scheduleAvailableVramDetail(ScheduleMode.SPLIT)).toContain('multi-GPU');
        expect(scheduleAvailableVramDetail(ScheduleMode.NONE)).toContain('Configured');
    });

    it('covers share status copy', () => {
        expect(shareButtonLabel(ShareStatus.IDLE)).toBe('Copy link');
        expect(shareButtonLabel(ShareStatus.COPIED)).toBe('Link copied');
        expect(shareButtonLabel(ShareStatus.FAILED)).toBe('Copy from address bar');
        expect(shareStatusAnnouncement(ShareStatus.IDLE)).toBe('');
        expect(shareStatusAnnouncement(ShareStatus.COPIED)).toMatch(/copied/i);
        expect(shareStatusAnnouncement(ShareStatus.FAILED)).toMatch(/address bar/i);
    });

    it('toggles theme exhaustively', () => {
        expect(toggleTheme(ThemeMode.DARK)).toBe(ThemeMode.LIGHT);
        expect(toggleTheme(ThemeMode.LIGHT)).toBe(ThemeMode.DARK);
    });

    it('assertNever throws', () => {
        expect(() => assertNever(/** @type {never} */ ('nope'))).toThrow(/Unhandled mode/);
    });
});
