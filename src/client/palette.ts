import type { ThemeTokenOverrides } from './types';

/**
 * Token-level refinements, applied through the native
 * `ctx.theme.overrideTokens` presenter path (inline on <body>, both schemes).
 *
 * Geometry follows open-claude-ui's CDS 4-tier elevation model: every shadow
 * is a near ambient-occlusion layer plus a far diffusion layer, and dark
 * surfaces get an inset top-light chamfer instead of a bright outer stroke.
 * Values stay neutral (black/white alpha only), so dsh keeps its own hue.
 */

export const ELEVATION_OVERRIDES: ThemeTokenOverrides = {
  // Retina hairline, adapted to CDS's 10% light / 9% dark borderband.
  '--dsw-elevation-stroke-color': { light: '#00000012', dark: '#ffffff14' },
  // Level 1 — resting cards: contact shadow + short ambient diffusion.
  '--dsw-shadow-lv1': {
    light: '0 1px 2px 0 #0000000a, 0 2px 8px 0 #0000000d',
    dark: 'inset 0 0 0 1px #ffffff08, 0 1px 2px 0 #0000002e, 0 2px 8px 0 #0000002e',
  },
  // Level 2 — raised cards and popovers: contact + longer diffusion.
  '--dsw-shadow-lv2': {
    light: '0 2px 4px 0 #0000000a, 0 6px 16px 0 #0000000d',
    dark: 'inset 0 0 0 1px #ffffff0d, 0 2px 4px 0 #0000003d, 0 6px 16px 0 #0000003d',
  },
  // Level 3 — floating surfaces: wide, quiet diffusion under a hairline.
  '--dsw-shadow-lv3': {
    light: '0 4px 8px 0 #0000000d, 0 12px 28px -2px #00000012',
    dark: 'inset 0 0 0 1px #ffffff14, 0 4px 8px 0 #0000004d, 0 16px 36px -2px #00000042',
  },
};
