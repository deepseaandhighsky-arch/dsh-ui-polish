/**
 * Motion presets — timing and easing curves for the polish layer.
 *
 * Values ported from open-claude-ui's reverse-engineered CDS physics:
 * the `easeSwift` settle curve, the 5-step response scale, and the 15-sample
 * `linear()` press spring. dsh's own durations stay in place (slightly
 * lengthened) so the host's rhythm is preserved rather than replaced.
 */

/** easeSwift (CDS `--cds-ease-swift`): the polish default; hard settle, no overshoot. */
export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';

/** CDS `--cds-ease-enter`: message/blocks dissolve in without stealing focus. */
export const EASE_ENTER = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** CDS `epitaxy-linear-sweep`: symmetric S-curve for the status sweep. */
export const EASE_SWEEP = 'cubic-bezier(0.45, 0, 0.55, 1)';

/**
 * Sample a damped harmonic oscillator into a CSS `linear()` easing.
 *
 * m x'' + c x' + k (x - 1) = 0, with zeta = c / (2 sqrt(m k)).
 * The last sample is pinned to 1 so the CSS transition never leaves a
 * residual offset (springs truncated before they settle can still be at
 * 1.02–1.05 at the documented duration).
 */
export function sampleSpring(
  stiffness: number,
  damping: number,
  mass: number,
  duration: number,
  samples = 30,
): string {
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const values: number[] = [];
  for (let i = 0; i <= samples; i += 1) {
    const t = (duration * i) / samples;
    let x: number;
    if (zeta < 1) {
      const wd = w0 * Math.sqrt(1 - zeta * zeta);
      x =
        1 -
        Math.exp(-zeta * w0 * t) *
          (Math.cos(wd * t) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(wd * t));
    } else if (Math.abs(zeta - 1) < 1e-4) {
      x = 1 - Math.exp(-w0 * t) * (1 + w0 * t);
    } else {
      const s1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
      const s2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
      x = 1 - (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s2 - s1);
    }
    values.push(i === 0 ? 0 : i === samples ? 1 : Number(x.toFixed(4)));
  }
  return `linear(${values.join(', ')})`;
}

/**
 * The four reverse-engineered Framer Motion presets, translated to CSS.
 *
 * - snappy: button/small controls, 600/30/1, +8.8% overshoot.
 * - gentle: card/popover reveal, 320/28/1, +1.8%.
 * - bouncy: light feedback, 380/18/1, +19.4% (the docs note this preset is a
 *   design-side addition, not observed verbatim in the client).
 * - heavy: panel drag, 1200/80/0.1, overdamped zero-overshoot. Sampled over
 *   320ms rather than the 140ms perceptual snap so the curve reaches 1.
 */
export const SPRING_PROFILES = {
  snappy: {
    label: '轻快',
    brief: '按钮 / 微交互 · 过冲 8.8%',
    stiffness: 600,
    damping: 30,
    mass: 1,
    duration: '0.22s',
    curve: sampleSpring(600, 30, 1, 0.22),
  },
  gentle: {
    label: '从容',
    brief: '卡片 / 浮层 · 过冲 1.8%',
    stiffness: 320,
    damping: 28,
    mass: 1,
    duration: '0.35s',
    curve: sampleSpring(320, 28, 1, 0.35),
  },
  bouncy: {
    label: '弹性',
    brief: '轻反馈 · 过冲 19.4%',
    stiffness: 380,
    damping: 18,
    mass: 1,
    duration: '0.58s',
    curve: sampleSpring(380, 18, 1, 0.58),
  },
  heavy: {
    label: '咬合',
    brief: '面板 / 拖拽 · 零过冲',
    stiffness: 1200,
    damping: 80,
    mass: 0.1,
    duration: '0.32s',
    curve: sampleSpring(1200, 80, 0.1, 0.32),
  },
} as const;

export type SpringProfile = keyof typeof SPRING_PROFILES;
export const DEFAULT_SPRING_PROFILE: SpringProfile = 'gentle';

export function isSpringProfile(value: unknown): value is SpringProfile {
  return typeof value === 'string' && value in SPRING_PROFILES;
}

export const DURATION = {
  fast: '0.12s',
  base: '0.24s',
  slow: '0.36s',
} as const;

/** CDS 5-step response scale (60/120/200/300/450ms) for plugin-owned motion. */
export const CDS_DURATION = {
  fast: '60ms',
  snap: '120ms',
  base: '200ms',
  sheet: '300ms',
  slow: '450ms',
} as const;

/** Token overrides for the `motion` polish group (both schemes mandatory). */
export function buildMotionOverrides(): Record<string, { light: string; dark: string }> {
  const pair = (value: string) => ({ light: value, dark: value });
  return {
    '--ds-transition-duration-fast': pair(DURATION.fast),
    '--ds-transition-duration': pair(DURATION.base),
    '--ds-transition-duration-slow': pair(DURATION.slow),
    '--ds-ease-in-out': pair(EASE_OUT),
  };
}
