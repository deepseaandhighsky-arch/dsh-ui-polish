import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createScrollFadeEngine, isFadeCandidate } from './scrollFade';

const rect = {
  x: 0,
  y: 0,
  top: 0,
  left: 0,
  right: 100,
  bottom: 100,
  width: 100,
  height: 100,
  toJSON: () => ({}),
} as DOMRect;

/** jsdom has no layout, so geometry and client rects are scripted. */
function geometry(
  el: HTMLElement,
  opts: { clientHeight?: number; clientWidth?: number; scrollHeight?: number } = {},
): void {
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: opts.clientHeight ?? 200 });
  Object.defineProperty(el, 'clientWidth', { configurable: true, value: opts.clientWidth ?? 300 });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: opts.scrollHeight ?? 600 });
  Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: 0 });
  el.getClientRects = () =>
    ({
      length: 1,
      item: () => rect,
      [Symbol.iterator]: function* () {
        yield rect;
      },
    }) as unknown as DOMRectList;
}

function stubStyle(style: { overflowY?: string; display?: string; visibility?: string } = {}): void {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    overflowY: style.overflowY ?? 'auto',
    display: style.display ?? 'block',
    visibility: style.visibility ?? 'visible',
  } as CSSStyleDeclaration);
}

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = '';
});

describe('isFadeCandidate', () => {
  it('accepts a visible, panel-sized, vertically overflowing scrollport', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    geometry(el);
    stubStyle();
    expect(isFadeCandidate(el)).toBe(true);
  });

  it('rejects text inputs, editors, terminals and contenteditable surfaces', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    geometry(textarea);

    const editor = document.createElement('div');
    editor.className = 'cm-scroller';
    document.body.appendChild(editor);
    geometry(editor);

    const terminal = document.createElement('div');
    terminal.className = 'xterm-viewport';
    document.body.appendChild(terminal);
    geometry(terminal);

    const editable = document.createElement('div');
    editable.setAttribute('contenteditable', 'true');
    document.body.appendChild(editable);
    geometry(editable);

    const textbox = document.createElement('div');
    textbox.setAttribute('role', 'textbox');
    document.body.appendChild(textbox);
    geometry(textbox);

    stubStyle();
    for (const el of [textarea, editor, terminal, editable, textbox]) {
      expect(isFadeCandidate(el)).toBe(false);
    }
  });

  it('honors the opt-out attribute on the element and its ancestors', () => {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('data-polish-fade', 'off');
    const el = document.createElement('div');
    wrapper.appendChild(el);
    document.body.appendChild(wrapper);
    geometry(el);
    stubStyle();
    expect(isFadeCandidate(el)).toBe(false);
  });

  it('rejects small, hidden and non-overflowing elements', () => {
    const small = document.createElement('div');
    document.body.appendChild(small);
    geometry(small, { clientHeight: 80 });
    stubStyle();
    expect(isFadeCandidate(small)).toBe(false);

    const fits = document.createElement('div');
    document.body.appendChild(fits);
    geometry(fits, { scrollHeight: 200 });
    expect(isFadeCandidate(fits)).toBe(false);

    const hidden = document.createElement('div');
    document.body.appendChild(hidden);
    geometry(hidden);
    stubStyle({ display: 'none' });
    expect(isFadeCandidate(hidden)).toBe(false);

    const horizontalOnly = document.createElement('div');
    document.body.appendChild(horizontalOnly);
    geometry(horizontalOnly, { scrollHeight: 200 });
    stubStyle({ overflowY: 'hidden' });
    expect(isFadeCandidate(horizontalOnly)).toBe(false);
  });
});

describe('createScrollFadeEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('tags discovered plugin scrollports and mirrors edge reachability', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    geometry(el);
    stubStyle();

    const engine = createScrollFadeEngine();
    engine.sync({ native: false, plugin: true });

    expect(el.dataset.polishFadeScope).toBe('plugin');
    expect(el.dataset.polishFadeTarget).toBe('');
    expect(el.dataset.polishFadeTop).toBe('false');
    expect(el.dataset.polishFadeBottom).toBe('true');

    el.scrollTop = 200;
    el.dispatchEvent(new Event('scroll'));
    expect(el.dataset.polishFadeTop).toBe('true');
    expect(el.dataset.polishFadeBottom).toBe('true');

    el.scrollTop = 400;
    el.dispatchEvent(new Event('scroll'));
    expect(el.dataset.polishFadeBottom).toBe('false');

    engine.dispose();
    expect(el.dataset.polishFadeScope).toBeUndefined();
    expect(el.dataset.polishFadeTop).toBeUndefined();
    expect(el.dataset.polishFadeBottom).toBeUndefined();
  });

  it('keeps the conversation scope separate from the plugin scope', () => {
    const conversation = document.createElement('div');
    conversation.setAttribute('data-conversation-scroll', '');
    document.body.appendChild(conversation);
    geometry(conversation);
    stubStyle();

    const engine = createScrollFadeEngine();
    engine.sync({ native: true, plugin: false });
    expect(conversation.dataset.polishFadeScope).toBe('native');

    engine.sync({ native: false, plugin: true });
    expect(conversation.dataset.polishFadeScope).toBeUndefined();

    engine.dispose();
  });

  it('re-discovers a replacement node and forgets the detached one', () => {
    const first = document.createElement('div');
    document.body.appendChild(first);
    geometry(first);
    stubStyle();

    const engine = createScrollFadeEngine();
    engine.sync({ native: false, plugin: true });
    expect(first.dataset.polishFadeScope).toBe('plugin');

    const replacement = document.createElement('div');
    geometry(replacement);
    document.body.appendChild(replacement);
    first.remove();

    vi.advanceTimersByTime(1000);
    expect(replacement.dataset.polishFadeScope).toBe('plugin');
    expect(first.dataset.polishFadeScope).toBeUndefined();

    engine.dispose();
  });
});