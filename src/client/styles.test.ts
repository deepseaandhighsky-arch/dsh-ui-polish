import { describe, expect, it } from 'vitest';
import { POLISH_CSS } from './styles';

/**
 * The stylesheet is the visual contract for every gate. These assertions keep
 * the open-claude-ui assets that were deliberately ported from regressing
 * back into a plain two-stop fade or losing their group gate.
 */
describe('POLISH_CSS', () => {
  it('uses the CDS 28px seven-stop nonlinear fade ramp', () => {
    expect(POLISH_CSS).toContain('--polish-fade-size: 28px');
    for (const alpha of ['#0000000d', '#00000026', '#0000004d', '#00000080', '#000000b3', '#000000d9']) {
      expect(POLISH_CSS, alpha).toContain(alpha);
    }
    for (const stop of ['0.15', '0.3', '0.45', '0.6', '0.75', '0.87']) {
      expect(POLISH_CSS, `stop ${stop}`).toContain(`* ${stop})`);
    }
    // The old three-state 24px mask is gone.
    expect(POLISH_CSS).not.toContain('#000 24px');
    expect(POLISH_CSS).not.toContain('100% - 24px');
  });

  it('registers typed fade lengths and switches the mask with the attribute', () => {
    expect(POLISH_CSS).toContain('@property --polish-fade-top');
    expect(POLISH_CSS).toContain('@property --polish-fade-bottom');
    expect(POLISH_CSS).toContain("[data-polish-fade-top='true'] {\n  --polish-fade-top: var(--polish-fade-size);");
    expect(POLISH_CSS).toContain("[data-polish-fade-bottom='true'] {\n  --polish-fade-bottom: var(--polish-fade-size);");
    expect(POLISH_CSS).toContain('scroll-padding-block: var(--polish-fade-top) var(--polish-fade-bottom)');
  });

  it('gates every reading-optics rule behind the optics group', () => {
    expect(POLISH_CSS).toContain("html[data-polish-optics='on']");
    expect(POLISH_CSS).toContain('text-wrap: pretty');
    expect(POLISH_CSS).toContain('text-wrap: balance');
    expect(POLISH_CSS).toContain('font-variant-numeric: tabular-nums');
    expect(POLISH_CSS).toContain(':where(pre, code, kbd, samp)');
    expect(POLISH_CSS).toContain("[data-chat-flow] :is(pre, code, kbd, samp)");
    expect(POLISH_CSS).toContain('font-optical-sizing: auto');
    expect(POLISH_CSS).toContain('font-weight: 390');
    expect(POLISH_CSS).toContain('text-underline-offset: 0.18em');
  });

  it('carries the CDS message entrance and press spring', () => {
    expect(POLISH_CSS).toContain('@keyframes polish-message-enter');
    expect(POLISH_CSS).toContain(':nth-last-child(-n + 12)');
    expect(POLISH_CSS).toContain('--polish-spring: linear(');
    expect(POLISH_CSS).toContain('html[data-polish-motion=\'on\'] .dsh-polish-switch::after');
    expect(POLISH_CSS).toContain('inset: -10px -8px');
  });

  it('exposes all four spring hand-feel profiles', () => {
    for (const profile of ['snappy', 'gentle', 'bouncy', 'heavy']) {
      expect(POLISH_CSS, profile).toContain(`html[data-polish-spring='${profile}']`);
    }
    expect(POLISH_CSS).toContain('--polish-spring-dur: 0.22s');
    expect(POLISH_CSS).toContain('--polish-spring-dur: 0.35s');
    expect(POLISH_CSS).toContain('--polish-spring-dur: 0.58s');
    expect(POLISH_CSS).toContain('--polish-spring-dur: 0.32s');
    expect(POLISH_CSS).toContain('animation: polish-message-enter var(--polish-spring-dur) var(--polish-spring) both');
  });

  it('expands composer hit areas without changing visual size', () => {
    expect(POLISH_CSS).toContain("html[data-polish-targets='on'] [data-composer-seat] button");
    expect(POLISH_CSS).toContain("[data-composer-seat] button::after");
    expect(POLISH_CSS).toContain('inset: -5px -2px');
    expect(POLISH_CSS).toContain('.dsh-polish-spring-row');
    expect(POLISH_CSS).toContain('.dsh-polish-segment[aria-checked=\'true\']');
  });

  it('upgrades the status glow with a 1.8s breathe, a 1.1s sweep and a reasoning ring', () => {
    expect(POLISH_CSS).toContain('@keyframes polish-glow-breathe');
    expect(POLISH_CSS).toContain('@keyframes polish-glow-sweep');
    expect(POLISH_CSS).toContain('@keyframes polish-reasoning-pulse');
    expect(POLISH_CSS).toContain('1.1s var(--polish-ease-sweep)');
    expect(POLISH_CSS).toContain('[data-shimmer-decoration]');
    expect(POLISH_CSS).toContain('prefers-reduced-motion: reduce');
  });

  it('keeps all color work in native dsh tokens', () => {
    expect(POLISH_CSS).toContain('var(--dsw-alias-state-business-primary');
    expect(POLISH_CSS).toContain('var(--dsw-alias-state-error-primary');
    expect(POLISH_CSS).not.toMatch(/#d97757|#c6613f|#fbf3ef/i);
  });
});
