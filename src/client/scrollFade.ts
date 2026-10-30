/**
 * Generalized scroll-edge fade engine.
 *
 * Discovery is generic: any visible vertical scrollport that actually
 * overflows becomes a fade target. Nothing here knows about specific
 * plugins; an element (or any ancestor) can opt out with
 * `data-polish-fade="off"`. Editor and terminal surfaces are skipped as a
 * class, not per plugin, because fading them hurts caret and line
 * visibility.
 *
 * The conversation scrollport keeps its own `native` scope so the `fades`
 * group stays independent from the plugin-facing `plugins` group.
 */

const SCOPE_ATTR = 'polishFadeScope';
const TARGET_ATTR = 'polishFadeTarget';
const TOP_ATTR = 'polishFadeTop';
const BOTTOM_ATTR = 'polishFadeBottom';

const EDGE_EPSILON = 4;
const MIN_SCROLLER_SIZE = 96;
const SCAN_INTERVAL_MS = 1000;
const MUTATION_DEBOUNCE_MS = 400;

const SKIP_TAGS = new Set(['HTML', 'BODY', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION']);

/** Editor/terminal scroll areas keep their native edge treatment. */
const EDITOR_SELECTOR = [
  '.cm-editor',
  '.cm-scroller',
  '.monaco-editor',
  '.monaco-scrollable-element',
  '.xterm',
  '.xterm-viewport',
].join(', ');

const OPT_OUT_SELECTOR = '[data-polish-fade="off"]';
const TEXT_ENTRY_SELECTOR = '[contenteditable="true"], [contenteditable=""], [role="textbox"]';

export interface FadeSyncState {
  /** Conversation scrollport (the `fades` group). */
  native: boolean;
  /** Auto-discovered panel scrollports (the `plugins` group). */
  plugin: boolean;
}

export interface ScrollFadeEngine {
  sync(state: FadeSyncState): void;
  dispose(): void;
}

/** True when `el` is a visible, vertical, panel-sized scrollport. */
export function isFadeCandidate(el: HTMLElement): boolean {
  if (SKIP_TAGS.has(el.tagName)) return false;
  if (el.isContentEditable) return false;
  if (el.closest(OPT_OUT_SELECTOR) !== null) return false;
  if (el.closest(EDITOR_SELECTOR) !== null) return false;
  if (el.closest(TEXT_ENTRY_SELECTOR) !== null) return false;
  if (el.getClientRects().length === 0) return false;
  const style = getComputedStyle(el);
  if (style.overflowY !== 'auto' && style.overflowY !== 'scroll') return false;
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (el.clientHeight < MIN_SCROLLER_SIZE || el.clientWidth < MIN_SCROLLER_SIZE) return false;
  return el.scrollHeight - el.clientHeight > EDGE_EPSILON;
}

export function createScrollFadeEngine(): ScrollFadeEngine {
  const targets = new Set<HTMLElement>();
  let nativeOn = false;
  let pluginOn = false;
  let running = false;
  let scanTimer: number | undefined;
  let mutationTimer: number | undefined;
  let observer: MutationObserver | undefined;
  let resizeHandler: (() => void) | undefined;

  const measure = (el: HTMLElement): void => {
    const top = el.scrollTop > EDGE_EPSILON;
    const bottom = el.scrollHeight - el.scrollTop - el.clientHeight > EDGE_EPSILON;
    if (el.dataset[TOP_ATTR] !== String(top)) el.dataset[TOP_ATTR] = String(top);
    if (el.dataset[BOTTOM_ATTR] !== String(bottom)) el.dataset[BOTTOM_ATTR] = String(bottom);
  };

  const onScroll = (event: Event): void => {
    measure(event.currentTarget as HTMLElement);
  };

  const tag = (el: HTMLElement, scope: 'native' | 'plugin'): void => {
    if (!targets.has(el)) {
      targets.add(el);
      el.addEventListener('scroll', onScroll, { passive: true });
    }
    if (el.dataset[SCOPE_ATTR] !== scope) el.dataset[SCOPE_ATTR] = scope;
    if (el.dataset[TARGET_ATTR] === undefined) el.dataset[TARGET_ATTR] = '';
    measure(el);
  };

  const forget = (el: HTMLElement): void => {
    el.removeEventListener('scroll', onScroll);
    delete el.dataset[TARGET_ATTR];
    delete el.dataset[SCOPE_ATTR];
    delete el.dataset[TOP_ATTR];
    delete el.dataset[BOTTOM_ATTR];
    targets.delete(el);
  };

  const scan = (): void => {
    const conversation = document.querySelector<HTMLElement>('[data-conversation-scroll]');

    if (conversation !== null) {
      if (nativeOn) {
        tag(conversation, 'native');
      } else if (targets.has(conversation) || conversation.dataset[SCOPE_ATTR] !== undefined) {
        forget(conversation);
      }
    }

    if (!pluginOn) return;

    const seen = new Set<HTMLElement>();
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
      if (el === conversation) continue;
      // Cheap geometry gate before the computed-style read.
      if (el.scrollHeight - el.clientHeight <= EDGE_EPSILON) continue;
      if (el.clientHeight < MIN_SCROLLER_SIZE || el.clientWidth < MIN_SCROLLER_SIZE) continue;
      if (!isFadeCandidate(el)) continue;
      seen.add(el);
      tag(el, 'plugin');
    }

    for (const el of Array.from(targets)) {
      if (el !== conversation && !seen.has(el)) forget(el);
    }
  };

  const start = (): void => {
    if (running) return;
    running = true;
    scan();
    scanTimer = window.setInterval(scan, SCAN_INTERVAL_MS);
    resizeHandler = () => scan();
    window.addEventListener('resize', resizeHandler, { passive: true });
    observer = new MutationObserver(() => {
      if (mutationTimer !== undefined) return;
      mutationTimer = window.setTimeout(() => {
        mutationTimer = undefined;
        scan();
      }, MUTATION_DEBOUNCE_MS);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };

  const stop = (): void => {
    running = false;
    if (scanTimer !== undefined) {
      window.clearInterval(scanTimer);
      scanTimer = undefined;
    }
    if (mutationTimer !== undefined) {
      window.clearTimeout(mutationTimer);
      mutationTimer = undefined;
    }
    observer?.disconnect();
    observer = undefined;
    if (resizeHandler !== undefined) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = undefined;
    }
    for (const el of Array.from(targets)) forget(el);
  };

  const sync = (state: FadeSyncState): void => {
    nativeOn = state.native;
    pluginOn = state.plugin;
    if (!nativeOn && !pluginOn) {
      stop();
      return;
    }
    start();
    if (!pluginOn) {
      for (const el of Array.from(targets)) {
        if (el.dataset[SCOPE_ATTR] === 'plugin') forget(el);
      }
    }
    if (!nativeOn) {
      const conversation = document.querySelector<HTMLElement>('[data-conversation-scroll]');
      if (conversation !== null && targets.has(conversation)) forget(conversation);
    }
    scan();
  };

  return { sync, dispose: stop };
}