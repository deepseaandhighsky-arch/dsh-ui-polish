/**
 * Synthesized interaction cues — no external audio assets.
 *
 * The open-claude-ui research found four short SFX (enter/exit voice,
 * approval needed, disconnected) played at 30% volume. dsh has no voice mode
 * and the plugin has no approval event, so this layer uses three cues that
 * map to states the plugin can actually observe: send, done, error.
 *
 * AudioWorklet is intentionally not used: it exists for continuous PCM
 * streams at audio-thread priority, while these cues are 160–240ms
 * oscillator envelopes scheduled once from the main thread. The context is
 * created lazily and resumed on the first user gesture (autoplay policy).
 */

export type SoundCue = 'send' | 'done' | 'error';

export interface CueSpec {
  /** Start/end frequency in Hz; exponential glides stay musical. */
  from: number;
  to: number;
  /** Seconds. */
  duration: number;
  /** Peak linear gain (well below the 30% asset reference). */
  gain: number;
  type: OscillatorType;
}

export const CUE_SPECS: Record<SoundCue, CueSpec> = {
  send: { from: 440, to: 660, duration: 0.16, gain: 0.12, type: 'sine' },
  done: { from: 660, to: 440, duration: 0.2, gain: 0.1, type: 'sine' },
  error: { from: 320, to: 240, duration: 0.24, gain: 0.1, type: 'triangle' },
};

type AudioContextCtor = typeof AudioContext;

let enabled = false;
let context: AudioContext | null = null;
let unlockHandler: (() => void) | null = null;

function audioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

function ensureContext(): AudioContext | null {
  if (context) return context;
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  try {
    context = new Ctor();
  } catch {
    context = null;
  }
  return context;
}

function resume(): void {
  const ctx = ensureContext();
  if (ctx && ctx.state === 'suspended') void ctx.resume();
}

function unlock(): void {
  resume();
  if (context?.state !== 'running' || unlockHandler === null) return;
  window.removeEventListener('pointerdown', unlockHandler, true);
  window.removeEventListener('keydown', unlockHandler, true);
  unlockHandler = null;
}

function installGestureUnlock(): void {
  if (unlockHandler !== null || typeof window === 'undefined') return;
  unlockHandler = unlock;
  window.addEventListener('pointerdown', unlockHandler, true);
  window.addEventListener('keydown', unlockHandler, true);
}

/** Gate the cue layer; enabling it also tries to unlock the audio context. */
export function syncSound(on: boolean): void {
  enabled = on;
  if (!on) {
    if (context && context.state === 'running') void context.suspend();
    return;
  }
  resume();
  installGestureUnlock();
}

/** Play one cue; returns false when muted, unavailable, or still locked. */
export function playCue(cue: SoundCue): boolean {
  if (!enabled) return false;
  const ctx = ensureContext();
  if (!ctx || ctx.state !== 'running') return false;

  const spec = CUE_SPECS[cue];
  const start = ctx.currentTime + 0.01;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = spec.type;
  osc.frequency.setValueAtTime(spec.from, start);
  osc.frequency.exponentialRampToValueAtTime(spec.to, start + spec.duration);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(spec.gain, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + spec.duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + spec.duration + 0.02);
  return true;
}

/** Release the context and gesture listeners on plugin unload. */
export function disposeAudio(): void {
  enabled = false;
  if (unlockHandler !== null) {
    window.removeEventListener('pointerdown', unlockHandler, true);
    window.removeEventListener('keydown', unlockHandler, true);
    unlockHandler = null;
  }
  if (context) {
    const ctx = context;
    context = null;
    void ctx.close().catch(() => undefined);
  }
}

export function isSoundEnabled(): boolean {
  return enabled;
}