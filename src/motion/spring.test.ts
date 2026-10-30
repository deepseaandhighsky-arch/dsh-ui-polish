import { describe, expect, it } from 'vitest';
import {
  CDS_DURATION,
  DEFAULT_SPRING_PROFILE,
  DURATION,
  EASE_ENTER,
  EASE_OUT,
  EASE_SWEEP,
  SPRING_PROFILES,
  buildMotionOverrides,
  isSpringProfile,
  sampleSpring,
} from './spring';

describe('buildMotionOverrides', () => {
  it('maps native dsh motion tokens to paired light/dark overrides', () => {
    const overrides = buildMotionOverrides();
    expect(Object.keys(overrides).sort()).toEqual(
      ['--ds-ease-in-out', '--ds-transition-duration', '--ds-transition-duration-fast', '--ds-transition-duration-slow'],
    );
    for (const [token, value] of Object.entries(overrides)) {
      expect(value.light, token).toBeTruthy();
      expect(value.dark, token).toBe(value.light);
    }
  });

  it('lengthens durations and adopts the CDS easeSwift curve', () => {
    const overrides = buildMotionOverrides();
    expect(overrides['--ds-transition-duration']?.light).toBe(DURATION.base);
    expect(parseFloat(overrides['--ds-transition-duration']!.light)).toBeGreaterThan(0.2);
    expect(overrides['--ds-ease-in-out']?.light).toBe(EASE_OUT);
    expect(EASE_OUT).toBe('cubic-bezier(0.16, 1, 0.3, 1)');
  });
});

describe('CDS motion asset set', () => {
  it('carries the reverse-engineered enter/sweep curves and 5-step scale', () => {
    expect(EASE_ENTER).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(EASE_SWEEP).toBe('cubic-bezier(0.45, 0, 0.55, 1)');
    const steps = Object.values(CDS_DURATION).map((value) => parseFloat(value));
    expect(steps).toEqual([60, 120, 200, 300, 450]);
  });
});

describe('Framer spring presets translated to CSS', () => {
  it('samples a damped oscillator with pinned endpoints', () => {
    const curve = sampleSpring(600, 30, 1, 0.22);
    expect(curve).toMatch(/^linear\(0, /);
    expect(curve).toMatch(/, 1\)$/);
    expect(curve).toContain('1.0877');
    // Underdamped: peak must overshoot 1.
    const values = curve.slice(7, -1).split(', ').map(Number);
    expect(Math.max(...values)).toBeGreaterThan(1);
  });

  it('exposes the four documented profiles with physical parameters', () => {
    expect(Object.keys(SPRING_PROFILES)).toEqual(['snappy', 'gentle', 'bouncy', 'heavy']);
    expect(DEFAULT_SPRING_PROFILE).toBe('gentle');
    expect(isSpringProfile('bouncy')).toBe(true);
    expect(isSpringProfile('nope')).toBe(false);
    expect(SPRING_PROFILES.snappy).toMatchObject({ stiffness: 600, damping: 30, mass: 1, duration: '0.22s' });
    expect(SPRING_PROFILES.gentle).toMatchObject({ stiffness: 320, damping: 28, mass: 1, duration: '0.35s' });
    expect(SPRING_PROFILES.bouncy).toMatchObject({ stiffness: 380, damping: 18, mass: 1, duration: '0.58s' });
    expect(SPRING_PROFILES.heavy).toMatchObject({ stiffness: 1200, damping: 80, mass: 0.1, duration: '0.32s' });
  });

  it('produces overshoot for bouncy and none for heavy', () => {
    const bouncy = SPRING_PROFILES.bouncy.curve.slice(7, -1).split(', ').map(Number);
    const heavy = SPRING_PROFILES.heavy.curve.slice(7, -1).split(', ').map(Number);
    expect(Math.max(...bouncy)).toBeGreaterThan(1.19);
    expect(Math.max(...heavy)).toBeLessThanOrEqual(1);
  });
});
