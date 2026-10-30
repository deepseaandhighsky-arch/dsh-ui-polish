/**
 * The cordis object plugin body: wires the polish layer into a running web
 * client. Resources are registered through `ctx.effect` so unloading the
 * plugin (uninstall, HMR reload) removes every stylesheet, override and slot
 * contribution.
 */
import { buildMotionOverrides } from '../motion/spring';
import { disposeAudio, syncSound } from '../audio/sfx';
import type { PolishComponents } from './components';
import {
  GROUPS,
  type Group,
  getSpringProfile,
  isEnabled,
  isMasterOn,
  subscribe,
} from './prefs';
import { ELEVATION_OVERRIDES } from './palette';
import { createRetimeEngine } from './retime';
import { createScrollFadeEngine } from './scrollFade';
import { POLISH_CSS } from './styles';
import type { DshContext, ThemeTokenOverrides } from './types';

const PKG = 'dsh-ui-polish';
const TOKEN_SOURCE = 'dsh-ui-polish';

const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function groupDatasetKey(group: Group): string {
  return `polish${cap(group)}`;
}

/** Applies every enabled group's token overrides into one override layer. */
function buildTokenOverrides(): ThemeTokenOverrides {
  const map: ThemeTokenOverrides = {};
  if (isEnabled('motion')) Object.assign(map, buildMotionOverrides());
  if (isEnabled('elevation')) Object.assign(map, ELEVATION_OVERRIDES);
  return map;
}

export function createApply(components: PolishComponents) {
  return function apply(ctx: DshContext): void {
    // Runtime adaptation engines. Both discover their own targets and are
    // fully reversible; neither mutates another plugin's source or CSSOM.
    const fadeEngine = createScrollFadeEngine();
    const retimeEngine = createRetimeEngine();

    // Stylesheet: one tag, owned by this plugin so the module system's
    // lifecycle removes it on unload/reload.
    ctx.effect(() => {
      const tag = document.createElement('style');
      tag.dataset.plugin = PKG;
      tag.dataset.pluginCss = `${PKG}/polish.css`;
      tag.textContent = POLISH_CSS;
      document.head.appendChild(tag);
      return () => tag.remove();
    }, 'ui-polish/styles');

    // Preference state → html data gates + native token override layer +
    // runtime engine sync.
    let disposeTokens: unknown;
    const disposeOverride = () => {
      if (typeof disposeTokens === 'function') (disposeTokens as () => void)();
      disposeTokens = undefined;
    };
    const applyGroups = () => {
      const root = document.documentElement;
      const master = isMasterOn();
      root.dataset.polish = master ? 'on' : 'off';
      root.dataset.polishSpring = getSpringProfile();
      for (const group of GROUPS) {
        root.dataset[groupDatasetKey(group)] = master && isEnabled(group) ? 'on' : 'off';
      }
      syncSound(master && isEnabled('sound'));
      fadeEngine.sync({
        native: master && isEnabled('fades'),
        plugin: master && isEnabled('plugins'),
      });
      // Retiming expresses the motion profile on plugin stylesheets: it
      // needs both the plugin-extension intent and a motion target.
      retimeEngine.sync(master && isEnabled('plugins') && isEnabled('motion'));
      disposeOverride();
      if (master) {
        const overrides = buildTokenOverrides();
        if (Object.keys(overrides).length > 0) {
          disposeTokens = ctx.theme.overrideTokens(TOKEN_SOURCE, overrides);
        }
      }
    };
    ctx.effect(() => {
      applyGroups();
      const unsubscribe = subscribe(applyGroups);
      return () => {
        unsubscribe();
        disposeOverride();
        fadeEngine.dispose();
        retimeEngine.dispose();
        syncSound(false);
        disposeAudio();
        // Retract the gates so an uninstall leaves the document untouched.
        const root = document.documentElement;
        delete root.dataset.polish;
        delete root.dataset.polishSpring;
        for (const group of GROUPS) delete root.dataset[groupDatasetKey(group)];
      };
    }, 'ui-polish/groups');

    // Slot contributions. The dock aura is additive and allocated-space;
    // the settings page is a first-class section beside General, so the
    // switches live in their own navigation entry instead of General's rows.
    ctx.slots.inject('conversation.composer.dock', () =>
      ctx.slots.register(
        { name: 'conversation.composer.dock', id: 'ui-polish-glow', order: 40 },
        components.ComposerGlow,
      ),
    );

    ctx.slots.inject('settings.section', () =>
      ctx.slots.register(
        { name: 'settings.section', id: 'ui-polish', order: 30, label: '界面打磨' },
        components.SettingsSection,
      ),
    );
  };
}