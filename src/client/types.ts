/**
 * Structural types for the dsh client runtime surface used by this plugin.
 *
 * Kept minimal and structural on purpose: the authoritative generics live in
 * the `dsh-client-ui-*` packages, which are peers of the host app rather than
 * dependencies of this bundle.
 */

export interface ThemeTokenOverrides {
  [token: string]: { light: string; dark: string };
}

export interface ThemeService {
  /**
   * Register a named token override layer; the ThemePresenter writes the
   * values as inline custom properties on <body> for both color schemes and
   * retracts them when the returned disposer runs.
   */
  overrideTokens(source: string, tokens: ThemeTokenOverrides): unknown;
}

export interface SlotRegistrationOptions {
  /** SlotMap key to register into. */
  name: string;
  /** Unique entry id within the slot (list slots: additive). */
  id: string;
  /** Ascending list order. */
  order?: number;
  [extra: string]: unknown;
}

export interface SlotsService {
  /**
   * Contribute into a slot declared by another package. The callback runs
   * once the declaration exists and is re-run/disposed when it toggles.
   */
  inject(key: string, callback: () => unknown): () => void;
  register(options: SlotRegistrationOptions, component: unknown): unknown;
}

export interface DshContext {
  /** Register a resource with automatic cleanup on fiber unload. */
  effect(fn: () => void | (() => void), label?: string): void;
  slots: SlotsService;
  theme: ThemeService;
}

export interface ClientModuleExports {
  /** cordis service names this object plugin waits for. */
  inject: string[];
  apply(ctx: DshContext): void;
}

export interface NodeRequire {
  (id: string): unknown;
}

export interface ModuleLoader {
  load(definition: { id: string; factory: (require: NodeRequire) => ClientModuleExports }): void;
}

declare global {
  interface Window {
    __ModuleLoader__: ModuleLoader;
  }
}
