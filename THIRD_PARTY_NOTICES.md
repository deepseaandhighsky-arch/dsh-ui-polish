# Third-Party Notices & Acknowledgments

`dsh-ui-polish` is an independent community plugin. It is **not** affiliated with or endorsed by Anthropic, DeepSeek, or the authors of the projects below.

The plugin does not vendor source code, fonts, audio files, icons, or other proprietary assets from these projects. Where a technique or parameter was referenced, it was re-implemented against dsh's public DOM/token contracts.

## Referenced projects

| Project | License | What was referenced | Link |
|---|---|---|---|
| **open-claude-ui** (Caho1) | MIT | Community reverse-engineering study of Claude Desktop's design system. Used as a **reference for interaction physics and optical parameters** (7-stop scroll fade, spring constants, glow/sweep timing, typography/optical rules). No Claude brand assets, fonts, audio files, or source code are included. | https://github.com/Caho1/open-claude-ui |
| **DeepSeek Harness** (`@deepseek-ai/dsh`) | MIT | Host application: plugin manifest/Slot contracts, `--dsw-*` design tokens, stable DOM markers, and the isolated `DSH_HOME` test setup. | https://github.com/deepseek-ai/deepseek-harness |
| **dsh-context** (bowenliang123) | Apache-2.0 | Reference for third-party dsh plugin structure, token consumption, and coexistence testing. No code copied. | https://github.com/bowenliang123/dsh-context |
| **DSH-better-sidebar** (omdsh-dev) | MIT | Reference for a high-coverage third-party dsh plugin surface; used as the A/B target for transition retiming and scroll-fade adaptation. No code copied. | https://github.com/omdsh-dev/DSH-better-sidebar |

## Development toolchain

| Package | License | Role |
|---|---|---|
| React / React DOM | MIT | Runtime peer consumed from the dsh module table |
| tsdown | MIT | Client bundle build |
| TypeScript | Apache-2.0 | Type checking |
| Vitest | MIT | Unit tests |
| Testing Library (`@testing-library/react`) | MIT | Component tests |
| jsdom | MIT | Test DOM environment |

## Notes on open-claude-ui

`open-claude-ui` is a community reverse-engineering project, not an Anthropic product or an official specification. This plugin borrows **ideas and numeric parameters** (e.g. the 15/30/45/60/75/87/100% fade ramp, the damped-oscillator spring presets, the 1.8s/1.1s glow timing) and rewrites them to dsh's own tokens, colors, and DOM. The Clay palette, Anthropic fonts, serif greeting, component layouts, and other brand-specific assets are deliberately **not** used.

If you believe a credit is missing or inaccurate, please open an issue.