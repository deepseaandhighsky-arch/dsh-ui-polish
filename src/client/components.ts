/**
 * Client components, created through a factory so React comes from the dsh
 * module table (`require('react')`) instead of a static import — the served
 * bundle executes as a classic script and must not contain import statements.
 */
import type { PolishHooks, GlowStatus } from '../motion/createHooks';
import { SPRING_PROFILES, type SpringProfile } from '../motion/spring';
import { playCue } from '../audio/sfx';
import {
  GROUPS,
  type Group,
  getSpringProfile,
  isEnabled,
  isMasterOn,
  setGroup,
  setMaster,
  setSpringProfile,
  subscribe,
} from './prefs';

export interface PolishComponents {
  /** Dedicated settings page, registered as a sibling of General. */
  SettingsSection: (props: Record<string, unknown>) => unknown;
  /** Hairline aura below the composer card, breathing while streaming. */
  ComposerGlow: (props: Record<string, unknown>) => unknown;
}

export interface ReactApi {
  useState<T>(initial: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void];
  useEffect(effect: () => void | (() => void), deps: readonly unknown[]): void;
  useRef<T>(initial: T): { current: T };
  createElement(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): unknown;
}

const GROUP_COPY: Record<Group, { title: string; caption: string }> = {
  motion: { title: '更顺滑的过渡动效', caption: '放慢基础过渡并使用缓出曲线，悬浮与展开更从容' },
  elevation: { title: '更柔和的阴影层次', caption: '减淡发丝描边并拉长阴影扩散，面板更有空气感' },
  fades: { title: '滚动边缘渐隐', caption: '对话流滚动到边界时上下边缘自然淡出' },
  glow: { title: '会话状态光晕', caption: '回复生成中，输入框下方出现呼吸状态的细线光晕' },
  plugins: {
    title: '插件界面适配',
    caption: '把滚动渐隐与过渡节奏延伸到第三方插件面板，无需插件配合',
  },
  optics: {
    title: '排版光学微调',
    caption: '标题换行更均衡、段落减少孤字，时间与用量数字不再左右抖动',
  },
  targets: {
    title: '输入区命中区',
    caption: '不改变视觉尺寸，给模型、权限、发送等小按钮增加隐形点击范围',
  },
  sound: {
    title: '轻量交互音效',
    caption: '发送、完成、出错时播放合成提示音；无外部音频文件，默认关闭',
  },
};

/** Derives the glow status from a Chat snapshot. Pure; used as the selector. */
function deriveStatusFromSnapshot(snapshot: unknown): GlowStatus {
  const cache = (snapshot as { nodes?: { valuesCache?: unknown[] } } | null)?.nodes?.valuesCache;
  if (!Array.isArray(cache)) return 'idle';
  let running = false;
  let error = false;
  for (const entry of cache) {
    const typed = entry as {
      location?: { turn?: { status?: string; end?: { data?: { reason?: { kind?: string } } } } };
      data?: { status?: string };
    };
    const turnStatus = typed?.location?.turn?.status;
    if (typeof turnStatus === 'string' && turnStatus !== 'closed') running = true;
    const dataStatus = typed?.data?.status;
    if (dataStatus === 'running' || dataStatus === 'streaming' || dataStatus === 'pending') running = true;
    const reasonKind = typed?.location?.turn?.end?.data?.reason?.kind;
    if (reasonKind === 'error' || dataStatus === 'error') error = true;
  }
  if (running) return 'streaming';
  if (error) return 'error';
  return 'idle';
}

export function createComponents(React: ReactApi, hooks: PolishHooks): PolishComponents {
  const { useState, useEffect, useRef, createElement: h } = React;

  function Switch(props: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
    return h('button', {
      type: 'button',
      role: 'switch',
      'aria-checked': props.checked ? 'true' : 'false',
      'aria-label': props.label,
      className: 'dsh-polish-switch',
      onClick: () => props.onChange(!props.checked),
    });
  }

  function usePrefsValue(get: () => boolean): [boolean, (next: boolean) => void] {
    const [value, setValue] = useState(get);
    useEffect(() => subscribe(() => setValue(get())), [get]);
    return [value, setValue];
  }

  function GroupRow(props: { group: Group }) {
    const copy = GROUP_COPY[props.group];
    const [on, setOn] = usePrefsValue(() => isEnabled(props.group));
    return h(
      'div',
      { className: 'dsh-polish-row' },
      h(
        'div',
        { className: 'dsh-polish-row-copy' },
        h('div', { className: 'dsh-polish-row-title' }, copy.title),
        h('div', { className: 'dsh-polish-row-caption' }, copy.caption),
      ),
      h(Switch, {
        checked: on,
        onChange: (next: boolean) => setGroup(props.group, next),
        label: copy.title,
      }),
    );
  }

  function MasterRow() {
    const [on, setOn] = usePrefsValue(isMasterOn);
    return h(
      'div',
      { className: 'dsh-polish-row' },
      h(
        'div',
        { className: 'dsh-polish-row-copy' },
        h('div', { className: 'dsh-polish-row-title' }, '界面打磨'),
        h('div', { className: 'dsh-polish-row-caption' }, '总开关：关闭后恢复 dsh 原生观感'),
      ),
      h(Switch, { checked: on, onChange: setMaster, label: '界面打磨总开关' }),
    );
  }

  function useSpringValue(): [SpringProfile, (next: SpringProfile) => void] {
    const [value, setValue] = useState<SpringProfile>(getSpringProfile);
    useEffect(() => subscribe(() => setValue(getSpringProfile())), []);
    const set = (next: SpringProfile) => {
      setSpringProfile(next);
      setValue(next);
    };
    return [value, set];
  }

  function SpringRow() {
    const [profile, setProfile] = useSpringValue();
    const [motionOn] = usePrefsValue(() => isEnabled('motion'));
    const spec = SPRING_PROFILES[profile];
    return h(
      'div',
      { className: 'dsh-polish-row dsh-polish-spring-row' },
      h(
        'div',
        { className: 'dsh-polish-row-copy' },
        h('div', { className: 'dsh-polish-row-title' }, '弹簧手感'),
        h(
          'div',
          { className: 'dsh-polish-row-caption' },
          `消息入场、开关与光晕的物理曲线：${spec.label} · ${spec.brief}`,
        ),
      ),
      h(
        'div',
        {
          className: 'dsh-polish-segments',
          role: 'radiogroup',
          'aria-label': '弹簧手感',
          'aria-disabled': motionOn ? 'false' : 'true',
        },
        ...(Object.keys(SPRING_PROFILES) as SpringProfile[]).map((key) =>
          h(
            'button',
            {
              key,
              type: 'button',
              role: 'radio',
              'aria-checked': profile === key ? 'true' : 'false',
              className: 'dsh-polish-segment',
              onClick: () => setProfile(key),
            },
            SPRING_PROFILES[key].label,
          ),
        ),
      ),
    );
  }

  function SettingsSection() {
    return h(
      'div',
      { className: 'dsh-polish-section' },
      h(
        'p',
        { className: 'dsh-polish-intro' },
        '这些开关只影响本机界面呈现，可随时关闭并恢复 dsh 原生观感。',
      ),
      h(
        'div',
        { className: 'dsh-polish-card' },
        h(MasterRow),
        ...GROUPS.map((group) => h(GroupRow, { group, key: group })),
        h(SpringRow),
      ),
    );
  }

  function ComposerGlow(props: Record<string, unknown>) {
    // The dock seat injects session standard props; `useChat` is a selector
    // hook over the Chat snapshot. Re-renders happen only when the derived
    // status changes. Without the hook (never seen in session scope) the
    // slot error boundary drops the aura — the safe degradation.
    const status = (props.useChat as (sel: (s: unknown) => GlowStatus) => GlowStatus)(deriveStatusFromSnapshot);
    const previous = useRef<GlowStatus>(status);
    const { glowProps } = hooks.useAmbientGlow(status);
    useEffect(() => {
      const prev = previous.current;
      previous.current = status;
      if (prev === status) return;
      if (status === 'streaming' && (prev === 'idle' || prev === 'done' || prev === 'error')) {
        playCue('send');
      } else if (status === 'done' && prev === 'streaming') {
        playCue('done');
      } else if (status === 'error' && (prev === 'streaming' || prev === 'thinking')) {
        playCue('error');
      } else if (status === 'idle' && prev === 'streaming') {
        playCue('done');
      }
    }, [status]);
    return h('div', { className: 'dsh-polish-glow', ...glowProps, 'aria-hidden': 'true' });
  }

  return { SettingsSection, ComposerGlow };
}

export { GROUPS };
