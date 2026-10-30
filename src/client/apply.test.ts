import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The apply body wires preferences → dataset gates + token overrides + slot
 * registrations + runtime engines. Verified here against a mocked dsh
 * context so group toggling behavior is locked without a running web client.
 */

const engines = vi.hoisted(() => ({
  fadeSync: vi.fn(),
  fadeDispose: vi.fn(),
  retimeSync: vi.fn(),
  retimeDispose: vi.fn(),
}));

const audio = vi.hoisted(() => ({
  sync: vi.fn(),
  dispose: vi.fn(),
}));

vi.mock('../audio/sfx', () => ({
  syncSound: audio.sync,
  disposeAudio: audio.dispose,
}));

vi.mock('./scrollFade', () => ({
  createScrollFadeEngine: () => ({ sync: engines.fadeSync, dispose: engines.fadeDispose }),
}));

vi.mock('./retime', () => ({
  createRetimeEngine: () => ({ sync: engines.retimeSync, dispose: engines.retimeDispose }),
}));

vi.mock('./prefs', async () => {
  const actual = await vi.importActual<typeof import('./prefs')>('./prefs');
  const state = { enabled: true, groups: {} as Record<string, boolean> };
  return {
    ...actual,
    GROUPS: ['motion', 'elevation', 'fades', 'glow', 'plugins', 'optics', 'targets', 'sound'],
    // Wiring test: every group is treated as on unless overridden; the real
    // default for `sound` is off (covered by prefs.test.ts).
    isMasterOn: () => state.enabled,
    isEnabled: (g: string) => state.enabled && (state.groups[g] ?? true),
    getSpringProfile: () => 'gentle',
    subscribe: () => () => {},
    __setState: (next: Partial<typeof state>) => Object.assign(state, next),
  };
});

const { __setState } = (await import('./prefs')) as unknown as {
  __setState: (next: { enabled?: boolean; groups?: Record<string, boolean> }) => void;
};
const { createApply } = await import('./apply');
import type { DshContext } from './types';

function makeCtx() {
  const effects: Array<{ fn: () => void | (() => void); label?: string }> = [];
  const injectedKeys: string[] = [];
  const slots: Array<{ key: string; options: Record<string, unknown> }> = [];
  const overrideCalls: Array<{ source: string; tokens: Record<string, unknown> }> = [];
  const ctx: DshContext = {
    effect(fn, label) {
      effects.push({ fn, label });
    },
    slots: {
      inject(key, callback) {
        injectedKeys.push(key);
        callback();
        return () => {};
      },
      register(options) {
        slots.push({ key: options.name as string, options });
        return {};
      },
    },
    theme: {
      overrideTokens(source, tokens) {
        overrideCalls.push({ source, tokens });
        return () => {};
      },
    },
  };
  return { ctx, effects, injectedKeys, slots, overrideCalls };
}

const components = {
  SettingsSection: () => null,
  ComposerGlow: () => null,
};

beforeEach(() => {
  vi.clearAllMocks();
  __setState({ enabled: true, groups: {} });
});

describe('createApply', () => {
  it('registers stylesheet, group gates, engines and slot contributions', () => {
    const { ctx, effects, injectedKeys, slots, overrideCalls } = makeCtx();
    createApply(components)(ctx);

    const labels = effects.map((e) => e.label);
    expect(labels).toContain('ui-polish/styles');
    expect(labels).toContain('ui-polish/groups');
    expect(labels).not.toContain('ui-polish/fade-bridge');

    // Run the groups effect: master on, all groups default on.
    effects.find((e) => e.label === 'ui-polish/groups')!.fn();
    const root = document.documentElement;
    expect(root.dataset.polish).toBe('on');
    expect(root.dataset.polishSpring).toBe('gentle');
    for (const g of ['Motion', 'Elevation', 'Fades', 'Glow', 'Plugins', 'Optics', 'Targets', 'Sound']) {
      expect(root.dataset[`polish${g}` as keyof typeof root.dataset]).toBe('on');
    }
    // Both token groups enabled → one override layer with motion + elevation tokens.
    expect(overrideCalls).toHaveLength(1);
    expect(Object.keys(overrideCalls[0]!.tokens)).toContain('--ds-transition-duration');
    expect(Object.keys(overrideCalls[0]!.tokens)).toContain('--dsw-shadow-lv2');

    // Engines follow the gates; the mocked default has sound on.
    expect(engines.fadeSync).toHaveBeenLastCalledWith({ native: true, plugin: true });
    expect(engines.retimeSync).toHaveBeenLastCalledWith(true);
    expect(audio.sync).toHaveBeenLastCalledWith(true);

    // Dock aura + exactly one settings section, no General rows.
    expect(injectedKeys).toContain('conversation.composer.dock');
    expect(injectedKeys).toContain('settings.section');
    expect(slots.filter((s) => s.key === 'conversation.composer.dock')).toHaveLength(1);
    const sections = slots.filter((s) => s.key === 'settings.section');
    expect(sections).toHaveLength(1);
    expect(sections[0]!.options).toMatchObject({ id: 'ui-polish', order: 30, label: '界面打磨' });
    expect(slots.filter((s) => s.key === 'settings.general.item')).toHaveLength(0);
  });

  it('master off: gates flip to off, engines stop, and cleanup retracts attributes', () => {
    __setState({ enabled: false, groups: {} });
    const { ctx, effects, overrideCalls } = makeCtx();
    createApply(components)(ctx);

    const groupsEffect = effects.find((e) => e.label === 'ui-polish/groups')!;
    const cleanup = groupsEffect.fn() as () => void;
    const root = document.documentElement;
    expect(root.dataset.polish).toBe('off');
    expect(root.dataset.polishPlugins).toBe('off');
    expect(root.dataset.polishSound).toBe('off');
    expect(overrideCalls).toHaveLength(0);
    expect(engines.fadeSync).toHaveBeenLastCalledWith({ native: false, plugin: false });
    expect(engines.retimeSync).toHaveBeenLastCalledWith(false);
    expect(audio.sync).toHaveBeenLastCalledWith(false);

    cleanup();
    expect(root.dataset.polish).toBeUndefined();
    expect(root.dataset.polishMotion).toBeUndefined();
    expect(root.dataset.polishSpring).toBeUndefined();
    expect(engines.fadeDispose).toHaveBeenCalled();
    expect(engines.retimeDispose).toHaveBeenCalled();
    expect(audio.dispose).toHaveBeenCalled();
  });

  it('per-group off: only the remaining group\'s tokens are overridden', () => {
    __setState({ enabled: true, groups: { motion: false } });
    const { ctx, effects, overrideCalls } = makeCtx();
    createApply(components)(ctx);
    effects.find((e) => e.label === 'ui-polish/groups')!.fn();
    expect(overrideCalls).toHaveLength(1);
    const keys = Object.keys(overrideCalls[0]!.tokens);
    expect(keys).not.toContain('--ds-transition-duration');
    expect(keys).toContain('--dsw-shadow-lv2');
    // Retiming needs a motion target; fades stay independent.
    expect(engines.retimeSync).toHaveBeenLastCalledWith(false);
    expect(engines.fadeSync).toHaveBeenLastCalledWith({ native: true, plugin: true });
  });

  it('plugins off: plugin-scope fades and retiming stop, conversation fades stay', () => {
    __setState({ enabled: true, groups: { plugins: false } });
    const { ctx, effects } = makeCtx();
    createApply(components)(ctx);
    effects.find((e) => e.label === 'ui-polish/groups')!.fn();
    expect(engines.fadeSync).toHaveBeenLastCalledWith({ native: true, plugin: false });
    expect(engines.retimeSync).toHaveBeenLastCalledWith(false);
  });

  it('optics off: only the optics gate flips; tokens and engines stay untouched', () => {
    __setState({ enabled: true, groups: { optics: false } });
    const { ctx, effects, overrideCalls } = makeCtx();
    createApply(components)(ctx);
    effects.find((e) => e.label === 'ui-polish/groups')!.fn();
    const root = document.documentElement;
    expect(root.dataset.polishOptics).toBe('off');
    expect(root.dataset.polishMotion).toBe('on');
    expect(overrideCalls).toHaveLength(1);
    expect(engines.fadeSync).toHaveBeenLastCalledWith({ native: true, plugin: true });
    expect(engines.retimeSync).toHaveBeenLastCalledWith(true);
  });

  it('sound off: the cue engine is muted and the gate flips without touching the rest', () => {
    __setState({ enabled: true, groups: { sound: false } });
    const { ctx, effects, overrideCalls } = makeCtx();
    createApply(components)(ctx);
    effects.find((e) => e.label === 'ui-polish/groups')!.fn();
    const root = document.documentElement;
    expect(root.dataset.polishSound).toBe('off');
    expect(root.dataset.polishMotion).toBe('on');
    expect(audio.sync).toHaveBeenLastCalledWith(false);
    expect(overrideCalls).toHaveLength(1);
    expect(engines.fadeSync).toHaveBeenLastCalledWith({ native: true, plugin: true });
  });
});
