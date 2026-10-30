import { describe, expect, it } from 'vitest';
import { ELEVATION_OVERRIDES } from './palette';
import { buildMotionOverrides } from '../motion/spring';

describe('token override palette', () => {
  it('provides both light and dark values for every override (ThemePresenter contract)', () => {
    for (const [token, pair] of Object.entries(ELEVATION_OVERRIDES)) {
      expect(token, 'token name').toMatch(/^--dsw-/);
      expect(pair.light, `${token} light`).toBeTruthy();
      expect(pair.dark, `${token} dark`).toBeTruthy();
    }
    for (const [token, pair] of Object.entries(buildMotionOverrides())) {
      expect(pair.light, `${token} light`).toBeTruthy();
      expect(pair.dark, `${token} dark`).toBeTruthy();
    }
  });

  it('softens elevation without introducing new hues (all alpha-black/white overlays)', () => {
    const hexRe = /^[0-9a-f]{6}$/;
    const colorInValue = /#([0-9a-f]{6})(?:[0-9a-f]{2})?/g;
    for (const [token, pair] of Object.entries(ELEVATION_OVERRIDES)) {
      for (const mode of ['light', 'dark'] as const) {
        const value = pair[mode];
        if (token.endsWith('stroke-color') || token.startsWith('--dsw-shadow')) {
          const colors = value.match(colorInValue) ?? [];
          expect(colors.length > 0, `${token} ${mode} contains a color`).toBe(true);
          for (const color of colors) {
            const hex = color.slice(1, 7);
            expect(hexRe.test(hex), `${token} ${mode} hex: ${color}`).toBe(true);
            // neutrality: r === g === b for the first six digits (no hue introduced)
            expect(hex[0], `${token} ${mode} neutral: ${color}`).toBe(hex[2]);
            expect(hex[2], `${token} ${mode} neutral: ${color}`).toBe(hex[4]);
          }
        }
      }
    }
  });
});
