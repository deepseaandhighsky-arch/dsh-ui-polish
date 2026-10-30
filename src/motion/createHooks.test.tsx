import { act, render } from '@testing-library/react';
import { StrictMode, createElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPolishHooks } from './createHooks';

const React = {
  useState: (await import('react')).useState,
  useEffect: (await import('react')).useEffect,
  useCallback: (await import('react')).useCallback,
  useRef: (await import('react')).useRef,
} as const;

const hooks = createPolishHooks(React);

/**
 * jsdom has no layout engine, so scrollHeight/scrollTop/clientHeight are
 * scripted per test. Content growth is exercised through scroll events,
 * which share the same measure() path as mutation ticks.
 */
function mockScroll(el: HTMLElement, values: { scrollTop: number; scrollHeight: number; clientHeight: number }) {
  Object.defineProperty(el, 'scrollTop', { configurable: true, value: values.scrollTop });
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: values.scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: values.clientHeight });
}

function makeContainer(values: { scrollTop: number; scrollHeight: number; clientHeight: number }) {
  const el = document.createElement('div');
  mockScroll(el, values);
  document.body.appendChild(el);
  return el;
}

describe('useScrollPinning', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(performance.now());
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('starts pinned', () => {
    const el = makeContainer({ scrollTop: 0, scrollHeight: 500, clientHeight: 500 });
    let state: ReturnType<typeof hooks.useScrollPinning>;
    function Probe() {
      state = hooks.useScrollPinning({ current: el });
      return null;
    }
    render(createElement(Probe));
    expect(state!.pinned).toBe(true);
    expect(state!.showJumpToBottom).toBe(false);
  });

  it('unpins when the user scrolls up and shows jump-to-bottom', () => {
    const el = makeContainer({ scrollTop: 400, scrollHeight: 1000, clientHeight: 500 });
    let state: ReturnType<typeof hooks.useScrollPinning>;
    function Probe() {
      state = hooks.useScrollPinning({ current: el });
      return null;
    }
    render(createElement(Probe));

    act(() => {
      mockScroll(el, { scrollTop: 120, scrollHeight: 1400, clientHeight: 500 });
      el.dispatchEvent(new Event('scroll'));
    });

    expect(state!.pinned).toBe(false);
    expect(state!.showJumpToBottom).toBe(true);
  });

  it('keeps the pin and scrolls to end when content grows at the bottom', async () => {
    const scrollTo = vi.fn();
    const el = makeContainer({ scrollTop: 500, scrollHeight: 1000, clientHeight: 500 });
    el.scrollTo = scrollTo as unknown as typeof el.scrollTo;
    let state: ReturnType<typeof hooks.useScrollPinning>;
    function Probe() {
      state = hooks.useScrollPinning({ current: el });
      return null;
    }
    render(createElement(Probe));

    // Content growth does not fire scroll events (scrollTop is unchanged);
    // it reaches the hook through the MutationObserver path.
    await act(async () => {
      el.appendChild(document.createElement('p'));
      mockScroll(el, { scrollTop: 500, scrollHeight: 1300, clientHeight: 500 });
    });

    expect(state!.pinned).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 1300, behavior: 'auto' }));
  });

  it('re-pins via scrollToEnd', () => {
    const scrollTo = vi.fn();
    const el = makeContainer({ scrollTop: 100, scrollHeight: 1200, clientHeight: 500 });
    el.scrollTo = scrollTo as unknown as typeof el.scrollTo;
    let state: ReturnType<typeof hooks.useScrollPinning>;
    function Probe() {
      state = hooks.useScrollPinning({ current: el });
      return null;
    }
    render(createElement(Probe));

    act(() => {
      state!.scrollToEnd('auto');
    });

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'auto' }));
    expect(state!.pinned).toBe(true);
  });
});

describe('useAmbientGlow', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-polish-glow-status');
    document.documentElement.removeAttribute('data-polish-glow-active');
  });

  it('publishes document-level status attributes', () => {
    let glow: ReturnType<typeof hooks.useAmbientGlow>;
    let rerender: (ui: React.ReactElement) => void;
    function Probe({ status }: { status: 'idle' | 'streaming' }) {
      glow = hooks.useAmbientGlow(status);
      return null;
    }
    const rendered = render(createElement(Probe, { status: 'idle' }));
    rerender = rendered.rerender;

    expect(document.documentElement.dataset.polishGlowStatus).toBe('idle');
    expect(document.documentElement.dataset.polishGlowActive).toBe('false');
    expect(glow!.glowProps['data-glow-active']).toBe('false');

    act(() => {
      rerender(createElement(Probe, { status: 'streaming' }));
    });
    expect(document.documentElement.dataset.polishGlowStatus).toBe('streaming');
    expect(document.documentElement.dataset.polishGlowActive).toBe('true');
  });
});
