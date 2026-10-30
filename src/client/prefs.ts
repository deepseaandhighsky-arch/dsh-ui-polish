/**
 * Polish group preferences, persisted in localStorage.
 *
 * Groups are intentionally client-local: the polish layer is presentational,
 * so its switches need no profile-level persistence and survive theme or
 * account switches within the browser.
 */

import {
  DEFAULT_SPRING_PROFILE,
  isSpringProfile,
  type SpringProfile,
} from '../motion/spring';

export const GROUPS = [
  'motion',
  'elevation',
  'fades',
  'glow',
  'plugins',
  'optics',
  'targets',
  'sound',
] as const;
export type Group = (typeof GROUPS)[number];

/** Groups that are opt-in rather than part of the default polish baseline. */
const GROUP_DEFAULTS: Partial<Record<Group, boolean>> = { sound: false };

const STORAGE_KEY = 'dsh-ui-polish.v1';

interface StoredPrefs {
  enabled: boolean;
  groups: Partial<Record<Group, boolean>>;
  spring: SpringProfile;
}

const DEFAULTS: StoredPrefs = { enabled: true, groups: {}, spring: DEFAULT_SPRING_PROFILE };

let listeners = new Set<() => void>();

function read(): StoredPrefs {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<StoredPrefs>;
    return {
      enabled: parsed.enabled !== false,
      groups: parsed.groups ?? {},
      spring: isSpringProfile(parsed.spring) ? parsed.spring : DEFAULT_SPRING_PROFILE,
    };
  } catch {
    return DEFAULTS;
  }
}

function write(next: StoredPrefs): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be unavailable (private mode); preferences stay in-memory.
  }
  for (const listener of listeners) listener();
}

export function isMasterOn(): boolean {
  return read().enabled;
}

export function isEnabled(group: Group): boolean {
  const prefs = read();
  return prefs.enabled && (prefs.groups[group] ?? GROUP_DEFAULTS[group] ?? true);
}

export function getSpringProfile(): SpringProfile {
  return read().spring;
}

export function setSpringProfile(profile: SpringProfile): void {
  write({ ...read(), spring: profile });
}

export function setMaster(on: boolean): void {
  write({ ...read(), enabled: on });
}

export function setGroup(group: Group, on: boolean): void {
  write({ ...read(), groups: { ...read().groups, [group]: on } });
}

/** Subscribe to preference changes; also fires for cross-tab updates. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}
