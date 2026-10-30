/**
 * React hook factory for the polish layer.
 *
 * dsh client bundles acquire React from the browser module table
 * (`require('react')` inside the loader factory), so every hook is created
 * through this factory instead of importing React statically. Unit tests
 * call the factory with their own React copy.
 *
 * The hooks port interaction techniques from open-claude-ui. Only the ones
 * that do not duplicate native dsh behavior are wired: scroll pinning stays a
 * tested library (dsh already ships ScrollFollow) and ambient glow backs the
 * composer aura. Edge fades live in the runtime scrollFade engine instead.
 */
export interface ReactLike {
  useState<T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  useEffect(effect: () => void | (() => void), deps: readonly unknown[]): void;
  useCallback<T extends (...args: never[]) => unknown>(callback: T, deps: readonly unknown[]): T;
  useRef<T>(initial: T): { current: T };
}

export interface PolishHooks {
  /**
   * Keep a scroll container glued to the bottom while content streams in.
   *
   * Library-only: dsh ships ScrollFollow plus a back-to-bottom control, so
   * wiring this would fight the native behavior. It stays here as a tested
   * reference for hosts that lack the native affordance.
   */
  useScrollPinning(
    containerRef: { current: HTMLElement | null },
    options?: { threshold?: number; contentRef?: { current: HTMLElement | null } },
  ): { pinned: boolean; showJumpToBottom: boolean; scrollToEnd: (behavior?: ScrollBehavior) => void };
  /** Map a semantic status onto data attributes consumed by the glow CSS. */
  useAmbientGlow(status: GlowStatus): { glowProps: { 'data-glow-status': GlowStatus; 'data-glow-active': 'true' | 'false' } };
}

export type GlowStatus = 'idle' | 'thinking' | 'streaming' | 'done' | 'error';

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

export function createPolishHooks(React: ReactLike): PolishHooks {
  const { useState, useEffect, useCallback, useRef } = React;

  function useScrollPinning(
    containerRef: { current: HTMLElement | null },
    options: { threshold?: number; contentRef?: { current: HTMLElement | null } } = {},
  ) {
    const threshold = options.threshold ?? 48;
    const [pinned, setPinned] = useState(true);
    const pinnedRef = useRef(true);
    const frameRef = useRef(0);

    const setPinnedState = useCallback((next: boolean) => {
      pinnedRef.current = next;
      setPinned(next);
    }, []);

    const reduced = () =>
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(REDUCED_QUERY).matches
        : false;

    // Scroll events carry user intent: moving up beyond the threshold breaks
    // the pin, returning to the bottom restores it. Content growth does not
    // flow through here.
    const onUserScroll = useCallback(() => {
      const el = containerRef.current;
      if (!el) return;
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distance <= threshold && !pinnedRef.current) setPinnedState(true);
      else if (distance > threshold * 2 && pinnedRef.current) setPinnedState(false);
    }, [containerRef, threshold, setPinnedState]);

    const scrollToEnd = useCallback(
      (behavior: ScrollBehavior = 'smooth') => {
        const el = containerRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: reduced() ? 'auto' : behavior });
        setPinnedState(true);
      },
      [containerRef, setPinnedState],
    );

    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const handler = () => {
        if (frameRef.current) return;
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = 0;
          onUserScroll();
        });
      };
      el.addEventListener('scroll', handler, { passive: true });
      return () => {
        el.removeEventListener('scroll', handler);
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
      };
    }, [containerRef, onUserScroll]);

    // Content growth while pinned keeps the view glued with an instant jump
    // (smooth scrolling every stream tick stutters). Growth while unpinned
    // only keeps the jump-to-bottom affordance shown.
    useEffect(() => {
      const target = options.contentRef?.current ?? containerRef.current;
      if (!target) return;
      const observer = new MutationObserver(() => {
        if (!pinnedRef.current) return;
        const el = containerRef.current;
        if (!el) return;
        el.scrollTo({ top: el.scrollHeight, behavior: 'auto' });
      });
      observer.observe(target, { childList: true, subtree: true, characterData: true });
      return () => observer.disconnect();
    }, [containerRef, options.contentRef]);

    return { pinned, showJumpToBottom: !pinned, scrollToEnd };
  }

  function useAmbientGlow(status: GlowStatus) {
    const active = status === 'thinking' || status === 'streaming';

    // Keep document-level status in sync so a single root-level CSS rule can
    // drive e.g. a subtle composer glow while a response is streaming.
    useEffect(() => {
      const root = document.documentElement;
      root.dataset.polishGlowStatus = status;
      root.dataset.polishGlowActive = active ? 'true' : 'false';
      return () => {
        delete root.dataset.polishGlowStatus;
        delete root.dataset.polishGlowActive;
      };
    }, [status, active]);

    const glowProps = {
      'data-glow-status': status,
      'data-glow-active': active ? ('true' as const) : ('false' as const),
    };
    return { glowProps };
  }

  return { useScrollPinning, useAmbientGlow };
}
