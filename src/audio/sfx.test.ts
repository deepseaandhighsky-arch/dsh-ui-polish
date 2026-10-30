import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CUE_SPECS, disposeAudio, isSoundEnabled, playCue, syncSound } from './sfx';

class FakeParam {
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class FakeOscillator {
  type = 'sine';
  frequency = new FakeParam();
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  gain = new FakeParam();
  connect = vi.fn();
}

class FakeAudioContext {
  static last: FakeAudioContext | undefined;
  state: AudioContextState = 'running';
  currentTime = 0;
  destination = {};
  oscillator = new FakeOscillator();
  gainNode = new FakeGain();
  resume = vi.fn();
  suspend = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);

  constructor() {
    FakeAudioContext.last = this;
  }

  createOscillator() {
    return this.oscillator;
  }

  createGain() {
    return this.gainNode;
  }
}

const originalAudioContext = window.AudioContext;

function installFakeContext() {
  (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  return FakeAudioContext;
}

afterEach(() => {
  disposeAudio();
  (window as unknown as { AudioContext: unknown }).AudioContext = originalAudioContext;
  FakeAudioContext.last = undefined;
  vi.restoreAllMocks();
});

beforeEach(() => {
  installFakeContext();
});

describe('synthesized cues', () => {
  it('defines three short, quiet, musically gliding cues', () => {
    expect(Object.keys(CUE_SPECS)).toEqual(['send', 'done', 'error']);
    expect(CUE_SPECS.send.to).toBeGreaterThan(CUE_SPECS.send.from);
    expect(CUE_SPECS.done.to).toBeLessThan(CUE_SPECS.done.from);
    expect(CUE_SPECS.error.to).toBeLessThan(CUE_SPECS.error.from);
    for (const spec of Object.values(CUE_SPECS)) {
      expect(spec.duration).toBeLessThanOrEqual(0.24);
      expect(spec.gain).toBeLessThanOrEqual(0.12);
    }
  });

  it('schedules a send cue with frequency and gain envelopes', () => {
    syncSound(true);
    expect(isSoundEnabled()).toBe(true);
    expect(playCue('send')).toBe(true);

    const ctx = FakeAudioContext.last!;
    expect(ctx.oscillator.type).toBe('sine');
    expect(ctx.oscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 0.01);
    expect(ctx.oscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(660, 0.17);
    expect(ctx.gainNode.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.12, 0.022);
    expect(ctx.oscillator.start).toHaveBeenCalledWith(0.01);
    expect(ctx.oscillator.stop).toHaveBeenCalledWith(0.19);
  });

  it('is silent when muted, suspends the context, and releases it on dispose', () => {
    syncSound(true);
    const ctx = FakeAudioContext.last!;
    syncSound(false);
    expect(playCue('done')).toBe(false);
    expect(ctx.suspend).toHaveBeenCalled();
    disposeAudio();
    expect(ctx.close).toHaveBeenCalled();
    expect(isSoundEnabled()).toBe(false);
  });

  it('does not throw when the host has no AudioContext', () => {
    (window as unknown as { AudioContext: unknown }).AudioContext = undefined;
    expect(() => syncSound(true)).not.toThrow();
    expect(playCue('send')).toBe(false);
  });
});