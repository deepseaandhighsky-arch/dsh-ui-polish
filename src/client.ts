/**
 * dsh-ui-polish client bundle entry.
 *
 * The dsh web client serves this file as a classic script and executes it to
 * register a lazy factory into the browser module table. React and all host
 * services are acquired inside the factory — no static imports.
 */
import { createPolishHooks, type ReactLike } from './motion/createHooks';
import { createComponents, type ReactApi } from './client/components';
import { createApply } from './client/apply';

window.__ModuleLoader__.load({
  id: 'dsh-ui-polish',
  factory(require) {
    const React = require('react') as ReactLike & ReactApi;
    const hooks = createPolishHooks(React);
    const components = createComponents(React, hooks);
    return {
      inject: ['slots', 'theme'],
      apply: createApply(components),
    };
  },
});
