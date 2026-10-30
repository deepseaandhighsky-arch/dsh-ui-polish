import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildRetimeCss,
  collectRetimeEntries,
  createRetimeEngine,
  motionScale,
  scaleTimeToken,
  scaleTransitionDuration,
  type RetimeEntry,
} from './retime';

function styleRule(selectorText: string, transitionDuration: string): CSSStyleRule {
  return { selectorText, style: { transitionDuration } } as unknown as CSSStyleRule;
}

function fakeTag(plugin: string, rules: unknown[]): unknown {
  return {
    dataset: { plugin, pluginCss: `${plugin}/base.css` },
    sheet: { cssRules: rules },
  };
}

function fakeDocument(tags: unknown[]): Document {
  return { querySelectorAll: () => tags } as unknown as Document;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.head.querySelectorAll('style[data-plugin-css="dsh-ui-polish/plugin-motion.css"]').forEach((tag) => tag.remove());
});

describe('motionScale', () => {
  it('derives the 1.2x factor from the base token', () => {
    expect(motionScale()).toBeCloseTo(1.2, 5);
  });
});

describe('scaleTimeToken', () => {
  it('scales seconds and milliseconds while preserving the unit', () => {
    expect(scaleTimeToken('.1s', 1.2)).toBe('0.12s');
    expect(scaleTimeToken('0.15s', 1.2)).toBe('0.18s');
    expect(scaleTimeToken('150ms', 1.2)).toBe('180ms');
  });

  it('leaves zero, long and non-time tokens alone', () => {
    expect(scaleTimeToken('0s', 1.2)).toBeNull();
    expect(scaleTimeToken('0ms', 1.2)).toBeNull();
    expect(scaleTimeToken('2.6s', 1.2)).toBeNull();
    expect(scaleTimeToken('ease', 1.2)).toBeNull();
  });
});

describe('scaleTransitionDuration', () => {
  it('scales every token in a multi-value longhand', () => {
    expect(scaleTransitionDuration('0.1s, 0.15s', 1.2)).toBe('0.12s, 0.18s');
    expect(scaleTransitionDuration('0.1s, 0s', 1.2)).toBe('0.12s, 0s');
  });

  it('skips token-driven and computed values entirely', () => {
    expect(scaleTransitionDuration('var(--ds-transition-duration, 0.2s)', 1.2)).toBeNull();
    expect(scaleTransitionDuration('calc(0.1s + 20ms)', 1.2)).toBeNull();
    expect(scaleTransitionDuration('', 1.2)).toBeNull();
  });
});

describe('buildRetimeCss', () => {
  it('mirrors at-rule context and wraps the sheet in a no-preference guard', () => {
    const entries: RetimeEntry[] = [
      { selector: '.a', duration: '0.12s', at: [] },
      {
        selector: '.b',
        duration: '0.18s',
        at: ['@media (min-width: 600px)', '@layer base'],
      },
    ];
    expect(buildRetimeCss(entries)).toBe(
      '@media (prefers-reduced-motion: no-preference) {\n' +
        '  .a { transition-duration: 0.12s; }\n' +
        '  @media (min-width: 600px) { @layer base { .b { transition-duration: 0.18s; } } }\n' +
        '}\n',
    );
    expect(buildRetimeCss([])).toBe('');
  });
});

describe('collectRetimeEntries', () => {
  it('collects third-party rules and skips own and core stylesheets', () => {
    const doc = fakeDocument([
      fakeTag('dsh-ui-polish', [styleRule('.own', '0.1s')]),
      fakeTag('@deepseek-ai/dsh-client-ui-chat', [styleRule('.core', '0.1s')]),
      fakeTag('dsh-better-sidebar', [
        styleRule('.row', '0.1s'),
        {
          media: { mediaText: '(min-width: 600px)' },
          cssRules: [styleRule('.wide', '0.15s')],
        },
        {
          cssRules: [styleRule('.unknown-group', '0.1s')],
        },
      ]),
    ]);

    expect(collectRetimeEntries(1.2, doc)).toEqual([
      { selector: '.row', duration: '0.12s', at: [] },
      {
        selector: '.wide',
        duration: '0.18s',
        at: ['@media (min-width: 600px)'],
      },
    ]);
  });

  it('mirrors supports, container and layer preludes', () => {
    const doc = fakeDocument([
      fakeTag('dsh-context', [
        { conditionText: '(display: grid)', cssRules: [styleRule('.grid', '0.1s')] },
        {
          containerName: 'card',
          containerQuery: '(width > 400px)',
          conditionText: 'card (width > 400px)',
          cssRules: [styleRule('.card', '0.1s')],
        },
        { name: 'base', cssRules: [styleRule('.layer', '0.1s')] },
      ]),
    ]);
    expect(collectRetimeEntries(1.2, doc)).toEqual([
      { selector: '.grid', duration: '0.12s', at: ['@supports (display: grid)'] },
      { selector: '.card', duration: '0.12s', at: ['@container card (width > 400px)'] },
      { selector: '.layer', duration: '0.12s', at: ['@layer base'] },
    ]);
  });
});

describe('createRetimeEngine', () => {
  it('injects a shadow stylesheet and removes it when disabled', () => {
    const pluginTag = document.createElement('style');
    pluginTag.dataset.plugin = 'dsh-context';
    pluginTag.dataset.pluginCss = 'dsh-context/jump.css';
    Object.defineProperty(pluginTag, 'sheet', {
      configurable: true,
      value: { cssRules: [styleRule('.lc-jump', '0.1s, 0.15s')] },
    });
    document.head.appendChild(pluginTag);

    const engine = createRetimeEngine(document);
    engine.sync(true);

    const shadow = document.head.querySelector<HTMLStyleElement>(
      'style[data-plugin-css="dsh-ui-polish/plugin-motion.css"]',
    );
    expect(shadow).not.toBeNull();
    expect(shadow!.textContent).toContain('@media (prefers-reduced-motion: no-preference)');
    expect(shadow!.textContent).toContain('.lc-jump { transition-duration: 0.12s, 0.18s; }');

    engine.sync(false);
    expect(
      document.head.querySelector('style[data-plugin-css="dsh-ui-polish/plugin-motion.css"]'),
    ).toBeNull();
    pluginTag.remove();
  });

  it('removes the shadow sheet when no third-party rules remain', () => {
    const pluginTag = document.createElement('style');
    pluginTag.dataset.plugin = 'dsh-context';
    pluginTag.dataset.pluginCss = 'dsh-context/empty.css';
    Object.defineProperty(pluginTag, 'sheet', { configurable: true, value: { cssRules: [] } });
    document.head.appendChild(pluginTag);

    const engine = createRetimeEngine(document);
    engine.sync(true);
    expect(
      document.head.querySelector('style[data-plugin-css="dsh-ui-polish/plugin-motion.css"]'),
    ).toBeNull();

    engine.dispose();
    pluginTag.remove();
  });
});