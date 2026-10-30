/**
 * Plugin transition retiming.
 *
 * Third-party plugins often hardcode transition durations instead of using
 * the `--ds-transition-duration*` tokens, so token overrides cannot reach
 * them. This engine reads their injected stylesheets and emits a shadow
 * stylesheet of its own: the same selectors, the same at-rule context, with
 * durations scaled by the polish motion profile (1.2x, the exact ratio of
 * today's base token to the native 0.2s).
 *
 * The plugin CSSOM is never mutated. The shadow sheet is our own style tag,
 * wrapped in `prefers-reduced-motion: no-preference`, and it is removed as a
 * whole when the group is off. Token-driven declarations (`var(...)`) are
 * skipped: they already follow the overridden tokens and must not scale
 * twice. Animations are left alone; only interaction transitions retime.
 */
import { DURATION } from '../motion/spring';

const NATIVE_BASE_SECONDS = 0.2;
const MAX_TRANSITION_SECONDS = 1.2;
const OWN_PLUGIN = 'dsh-ui-polish';
const CORE_PREFIX = '@deepseek-ai/';
const SHADOW_ID = 'dsh-ui-polish/plugin-motion.css';
const REBUILD_DEBOUNCE_MS = 200;

export interface RetimeEntry {
  /** Selector text copied verbatim from the plugin rule. */
  selector: string;
  /** Scaled `transition-duration` value. */
  duration: string;
  /** Enclosing at-rule preludes, outermost first. */
  at: string[];
}

export interface RetimeEngine {
  sync(enabled: boolean): void;
  dispose(): void;
}

export function motionScale(): number {
  const base = Number.parseFloat(DURATION.base);
  return Number.isFinite(base) && base > 0 ? base / NATIVE_BASE_SECONDS : 1.2;
}

/** Scales one time token, or returns null when the token must be left alone. */
export function scaleTimeToken(token: string, scale: number): string | null {
  const match = /^(\d*\.?\d+)(ms|s)$/.exec(token.trim());
  if (match === null) return null;
  const value = Number.parseFloat(match[1] ?? '');
  const unit = match[2];
  if (!Number.isFinite(value) || value <= 0) return null;
  const seconds = unit === 'ms' ? value / 1000 : value;
  if (seconds > MAX_TRANSITION_SECONDS) return null;
  const scaled = value * scale;
  if (unit === 'ms') {
    const rounded = Math.round(scaled);
    return rounded === Math.round(value) ? null : `${rounded}ms`;
  }
  const rounded = Number(scaled.toFixed(3));
  return rounded === Number(value.toFixed(3)) ? null : `${rounded}s`;
}

/** Scales a whole `transition-duration` longhand value. */
export function scaleTransitionDuration(value: string, scale: number): string | null {
  if (value.length === 0) return null;
  if (value.includes('var(') || value.includes('calc(') || value.includes('env(')) return null;
  let changed = false;
  const parts = value.split(',').map((part) => {
    const trimmed = part.trim();
    const scaled = scaleTimeToken(trimmed, scale);
    if (scaled === null) return trimmed;
    changed = true;
    return scaled;
  });
  return changed ? parts.join(', ') : null;
}

function isStyleRule(rule: CSSRule): rule is CSSStyleRule {
  return 'selectorText' in rule && 'style' in rule;
}

/**
 * Rebuilds the prelude of a grouping rule from its public properties.
 * Unknown grouping rules return null and their subtree is skipped: emitting
 * conditional rules unconditionally would change their meaning.
 */
function groupingPrelude(rule: CSSRule): string | null {
  const anyRule = rule as unknown as {
    media?: { mediaText?: unknown };
    containerName?: unknown;
    containerQuery?: unknown;
    conditionText?: unknown;
    name?: unknown;
  };

  if (typeof anyRule.media?.mediaText === 'string') {
    return anyRule.media.mediaText.length > 0 ? `@media ${anyRule.media.mediaText}` : null;
  }
  if (typeof anyRule.containerName === 'string') {
    const query = typeof anyRule.containerQuery === 'string' ? anyRule.containerQuery : '';
    return `@container ${anyRule.containerName} ${query}`.trim();
  }
  if (typeof anyRule.name === 'string' && 'cssRules' in rule) {
    return anyRule.name.length > 0 ? `@layer ${anyRule.name}` : '@layer';
  }
  if (typeof anyRule.conditionText === 'string') {
    return `@supports ${anyRule.conditionText}`;
  }
  return null;
}

function walkRules(rules: CSSRuleList, at: string[], scale: number, out: RetimeEntry[]): void {
  for (const rule of Array.from(rules)) {
    if (isStyleRule(rule)) {
      const duration = scaleTransitionDuration(rule.style.transitionDuration, scale);
      if (duration === null) continue;
      const selector = rule.selectorText.trim();
      if (selector.length === 0 || selector.includes('</style')) continue;
      out.push({ selector, duration, at });
      continue;
    }
    if (!('cssRules' in rule)) continue;
    const prelude = groupingPrelude(rule);
    if (prelude === null) continue;
    walkRules((rule as CSSGroupingRule).cssRules, [...at, prelude], scale, out);
  }
}

/** Collects retime entries from every third-party style tag in the document. */
export function collectRetimeEntries(scale = motionScale(), doc: Document = document): RetimeEntry[] {
  const entries: RetimeEntry[] = [];
  const seen = new Set<string>();

  for (const tag of Array.from(doc.querySelectorAll<HTMLStyleElement>('style[data-plugin-css]'))) {
    const plugin = tag.dataset.plugin ?? '';
    if (plugin.length === 0 || plugin === OWN_PLUGIN || plugin.startsWith(CORE_PREFIX)) continue;
    const sheet = tag.sheet;
    if (sheet === null) continue;
    let rules: CSSRuleList;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    const local: RetimeEntry[] = [];
    try {
      walkRules(rules, [], scale, local);
    } catch {
      continue;
    }
    for (const entry of local) {
      const key = `${entry.at.join('\u0001')}\u0002${entry.selector}\u0002${entry.duration}`;
      if (seen.has(key)) continue;
      seen.add(key);
      entries.push(entry);
    }
  }

  return entries;
}

function ruleText(entry: RetimeEntry): string {
  let css = `${entry.selector} { transition-duration: ${entry.duration}; }`;
  for (let index = entry.at.length - 1; index >= 0; index -= 1) {
    css = `${entry.at[index]} { ${css} }`;
  }
  return css;
}

/** Builds the shadow stylesheet; empty when there is nothing to retime. */
export function buildRetimeCss(entries: RetimeEntry[]): string {
  if (entries.length === 0) return '';
  const body = entries.map(ruleText).join('\n  ');
  return `@media (prefers-reduced-motion: no-preference) {\n  ${body}\n}\n`;
}

export function createRetimeEngine(doc: Document = document): RetimeEngine {
  let active = false;
  let tag: HTMLStyleElement | null = null;
  let observer: MutationObserver | undefined;
  let timer: number | undefined;

  const removeTag = (): void => {
    tag?.remove();
    tag = null;
  };

  const rebuild = (): void => {
    if (!active) return;
    const css = buildRetimeCss(collectRetimeEntries(motionScale(), doc));
    if (css.length === 0) {
      removeTag();
      return;
    }
    if (tag === null) {
      tag = doc.createElement('style');
      tag.dataset.plugin = OWN_PLUGIN;
      tag.dataset.pluginCss = SHADOW_ID;
    }
    if (tag.textContent !== css) tag.textContent = css;
    // Keep our shadow sheet after every plugin sheet so equal-specificity
    // declarations win by source order, and re-assert it after re-injection.
    if (doc.head.lastElementChild !== tag) doc.head.appendChild(tag);
  };

  const schedule = (): void => {
    if (timer !== undefined) return;
    timer = window.setTimeout(() => {
      timer = undefined;
      rebuild();
    }, REBUILD_DEBOUNCE_MS);
  };

  const start = (): void => {
    if (active) return;
    active = true;
    rebuild();
    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type !== 'childList') continue;
        const nodes = [...Array.from(record.addedNodes), ...Array.from(record.removedNodes)];
        const relevant = nodes.some((node) => {
          if (!(node instanceof HTMLElement)) return false;
          if (node.dataset.plugin === OWN_PLUGIN) return false;
          return node.matches('style[data-plugin-css]') || node.querySelector('style[data-plugin-css]') !== null;
        });
        if (relevant) {
          schedule();
          return;
        }
      }
    });
    observer.observe(doc.head, { childList: true, subtree: true });
  };

  const stop = (): void => {
    active = false;
    observer?.disconnect();
    observer = undefined;
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timer = undefined;
    }
    removeTag();
  };

  return {
    sync(enabled: boolean): void {
      if (enabled) start();
      else stop();
    },
    dispose: stop,
  };
}