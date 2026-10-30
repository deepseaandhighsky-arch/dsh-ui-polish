import { fireEvent, render, screen } from '@testing-library/react';
import { createElement, type ComponentType } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PolishHooks, GlowStatus } from '../motion/createHooks';
import type { ReactApi } from './components';

const cues = vi.hoisted(() => ({ playCue: vi.fn() }));

vi.mock('../audio/sfx', () => ({
  playCue: cues.playCue,
}));

const React = {
  useState: (await import('react')).useState,
  useEffect: (await import('react')).useEffect,
  useRef: (await import('react')).useRef,
  createElement,
} as unknown as ReactApi;

const hooks = {
  useScrollPinning: () => ({ pinned: true, showJumpToBottom: false, scrollToEnd: () => {} }),
  useAmbientGlow: () => ({
    glowProps: { 'data-glow-status': 'idle' as GlowStatus, 'data-glow-active': 'false' as const },
  }),
} as unknown as PolishHooks;

const { createComponents } = await import('./components');
const { ComposerGlow, SettingsSection } = createComponents(React, hooks);
const Glow = ComposerGlow as unknown as ComponentType<Record<string, unknown>>;
const Section = SettingsSection as unknown as ComponentType<Record<string, unknown>>;

function renderWithStatus(status: GlowStatus) {
  return render(
    createElement(Glow, {
      useChat: () => status,
    }),
  );
}

describe('ComposerGlow cues', () => {
  beforeEach(() => {
    cues.playCue.mockClear();
  });

  it('plays send on idle→streaming and done on streaming→idle', () => {
    const view = renderWithStatus('idle');
    expect(cues.playCue).not.toHaveBeenCalled();

    view.rerender(createElement(Glow, { useChat: () => 'streaming' as const }));
    expect(cues.playCue).toHaveBeenLastCalledWith('send');

    view.rerender(createElement(Glow, { useChat: () => 'idle' as const }));
    expect(cues.playCue).toHaveBeenLastCalledWith('done');
  });

  it('plays the error cue instead of done when the turn fails', () => {
    const view = renderWithStatus('idle');
    view.rerender(createElement(Glow, { useChat: () => 'streaming' as const }));
    cues.playCue.mockClear();

    view.rerender(createElement(Glow, { useChat: () => 'error' as const }));
    expect(cues.playCue).toHaveBeenCalledTimes(1);
    expect(cues.playCue).toHaveBeenLastCalledWith('error');
  });
});

describe('settings section', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists a spring profile selection through the preference store', () => {
    render(createElement(Section));
    const bouncy = screen.getByRole('radio', { name: '弹性' });
    fireEvent.click(bouncy);
    expect(bouncy.getAttribute('aria-checked')).toBe('true');
    const raw = JSON.parse(localStorage.getItem('dsh-ui-polish.v1')!) as { spring: string };
    expect(raw.spring).toBe('bouncy');
  });
});