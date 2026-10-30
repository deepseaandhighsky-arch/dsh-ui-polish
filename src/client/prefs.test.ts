import { beforeEach, describe, expect, it } from 'vitest';
import { getSpringProfile, isEnabled, setGroup, setMaster, setSpringProfile } from './prefs';

describe('polish preferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to the baseline groups on, sound off, and the gentle spring', () => {
    expect(isEnabled('motion')).toBe(true);
    expect(isEnabled('optics')).toBe(true);
    expect(isEnabled('targets')).toBe(true);
    expect(isEnabled('sound')).toBe(false);
    expect(getSpringProfile()).toBe('gentle');
  });

  it('persists the sound opt-in and a selected spring profile', () => {
    setGroup('sound', true);
    setSpringProfile('bouncy');
    expect(isEnabled('sound')).toBe(true);
    expect(getSpringProfile()).toBe('bouncy');
    const raw = JSON.parse(localStorage.getItem('dsh-ui-polish.v1')!) as {
      groups: Record<string, boolean>;
      spring: string;
    };
    expect(raw.groups.sound).toBe(true);
    expect(raw.spring).toBe('bouncy');
  });

  it('falls back to the default profile for unknown stored values', () => {
    localStorage.setItem(
      'dsh-ui-polish.v1',
      JSON.stringify({ enabled: true, groups: {}, spring: 'warp' }),
    );
    expect(getSpringProfile()).toBe('gentle');
  });

  it('master off suppresses a sound opt-in', () => {
    setGroup('sound', true);
    setMaster(false);
    expect(isEnabled('sound')).toBe(false);
    setMaster(true);
    expect(isEnabled('sound')).toBe(true);
  });
});