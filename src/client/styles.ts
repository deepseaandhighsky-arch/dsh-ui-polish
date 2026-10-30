/**
 * The polish stylesheet, injected once by the client module.
 *
 * Every group is gated behind an `html[data-polish-<group>='on']` attribute
 * written by the apply layer from user preferences, so toggles need no
 * restyling — the gate simply flips. All colors reference native
 * `--dsw-*` tokens; no brand hues are introduced.
 *
 * Motion/easing constants are imported from `motion/spring.ts` so the token
 * layer and the CSS layer share one copy of the CDS physics values.
 */
import {
  CDS_DURATION,
  DEFAULT_SPRING_PROFILE,
  EASE_ENTER,
  EASE_OUT,
  EASE_SWEEP,
  SPRING_PROFILES,
} from '../motion/spring';

const springCss = (Object.keys(SPRING_PROFILES) as Array<keyof typeof SPRING_PROFILES>)
  .map((key) => {
    const spec = SPRING_PROFILES[key];
    return `html[data-polish-spring='${key}'] {
  --polish-spring: ${spec.curve};
  --polish-spring-dur: ${spec.duration};
}`;
  })
  .join('\n');
const defaultSpring = SPRING_PROFILES[DEFAULT_SPRING_PROFILE];

export const POLISH_CSS = /* css */ `
/* ---- polish constants ------------------------------------------------
   Private variables only; they never change native layout or palette. */
:root {
  --polish-fade-size: 28px;
  --polish-ease-swift: ${EASE_OUT};
  --polish-ease-enter: ${EASE_ENTER};
  --polish-ease-sweep: ${EASE_SWEEP};
  --polish-spring: ${defaultSpring.curve};
  --polish-spring-dur: ${defaultSpring.duration};
  --polish-dur-fast: ${CDS_DURATION.fast};
  --polish-dur-snap: ${CDS_DURATION.snap};
  --polish-dur-base: ${CDS_DURATION.base};
  --polish-dur-sheet: ${CDS_DURATION.sheet};
  --polish-dur-slow: ${CDS_DURATION.slow};
}
/* Spring hand-feel profile; the apply layer writes the html attribute. */
${springCss}

/* ---- scroll edge fades (groups: fades / plugins) ----------------------
   Same technique as native dsh (TurnNavigator, ChatGroupSeat, Trajectory):
   a mask-image on the scrollport itself. Masks take no part in layout, so
   flex/grid scrollports and plugin pseudo-elements are untouched. The mask
   uses the CDS 7-stop perceptual ramp (15/30/45/60/75/87/100%) over 28px
   instead of a two-stop cut, which removes banding on high-DPI panels.
   Registered custom properties keep the lengths typed and let the mask
   follow the data attributes without touching plugin transitions. */
@property --polish-fade-top {
  syntax: '<length>';
  inherits: false;
  initial-value: 0px;
}
@property --polish-fade-bottom {
  syntax: '<length>';
  inherits: false;
  initial-value: 0px;
}

:is(
  html[data-polish-fades='on'] [data-polish-fade-scope='native'],
  html[data-polish-plugins='on'] [data-polish-fade-scope='plugin']
) {
  --polish-fade-top: 0px;
  --polish-fade-bottom: 0px;
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #0000000d calc(var(--polish-fade-top) * 0.15),
    #00000026 calc(var(--polish-fade-top) * 0.3),
    #0000004d calc(var(--polish-fade-top) * 0.45),
    #00000080 calc(var(--polish-fade-top) * 0.6),
    #000000b3 calc(var(--polish-fade-top) * 0.75),
    #000000d9 calc(var(--polish-fade-top) * 0.87),
    #000 var(--polish-fade-top),
    #000 calc(100% - var(--polish-fade-bottom)),
    #000000d9 calc(100% - var(--polish-fade-bottom) * 0.87),
    #000000b3 calc(100% - var(--polish-fade-bottom) * 0.75),
    #00000080 calc(100% - var(--polish-fade-bottom) * 0.6),
    #0000004d calc(100% - var(--polish-fade-bottom) * 0.45),
    #00000026 calc(100% - var(--polish-fade-bottom) * 0.3),
    #0000000d calc(100% - var(--polish-fade-bottom) * 0.15),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #0000000d calc(var(--polish-fade-top) * 0.15),
    #00000026 calc(var(--polish-fade-top) * 0.3),
    #0000004d calc(var(--polish-fade-top) * 0.45),
    #00000080 calc(var(--polish-fade-top) * 0.6),
    #000000b3 calc(var(--polish-fade-top) * 0.75),
    #000000d9 calc(var(--polish-fade-top) * 0.87),
    #000 var(--polish-fade-top),
    #000 calc(100% - var(--polish-fade-bottom)),
    #000000d9 calc(100% - var(--polish-fade-bottom) * 0.87),
    #000000b3 calc(100% - var(--polish-fade-bottom) * 0.75),
    #00000080 calc(100% - var(--polish-fade-bottom) * 0.6),
    #0000004d calc(100% - var(--polish-fade-bottom) * 0.45),
    #00000026 calc(100% - var(--polish-fade-bottom) * 0.3),
    #0000000d calc(100% - var(--polish-fade-bottom) * 0.15),
    transparent 100%
  );
  scroll-padding-block: var(--polish-fade-top) var(--polish-fade-bottom);
}
:is(
  html[data-polish-fades='on'] [data-polish-fade-scope='native'],
  html[data-polish-plugins='on'] [data-polish-fade-scope='plugin']
)[data-polish-fade-top='true'] {
  --polish-fade-top: var(--polish-fade-size);
}
:is(
  html[data-polish-fades='on'] [data-polish-fade-scope='native'],
  html[data-polish-plugins='on'] [data-polish-fade-scope='plugin']
)[data-polish-fade-bottom='true'] {
  --polish-fade-bottom: var(--polish-fade-size);
}
/* Edge activation is intentionally instant: transitions on registered custom
   properties run on the main thread and were observed stalling at 0 while the
   host window was backgrounded, which silently dropped the mask. The mask
   therefore switches with the attribute instead of animating the length. */

/* ---- typographic optics (group: optics) ------------------------------
   Pure reading-quality rules: balanced headings, pretty paragraphs (no
   final-line runts), tabular figures on live counters, and a light variable
   weight compensation on dark canvases. No size, width or spacing changes. */
html[data-polish-optics='on'] :is(
  [data-chat-flow-kind='assistant-step'][data-chat-group-part='response'],
  [data-step-process-body]
) :where(p, li, dd, blockquote) {
  text-wrap: pretty;
}
html[data-polish-optics='on'] :is(
  [data-chat-flow-kind='assistant-step'][data-chat-group-part='response'],
  [data-step-process-body]
) :where(h1, h2, h3, h4, h5, h6) {
  text-wrap: balance;
}
html[data-polish-optics='on'] :is(
  [data-chat-flow-kind='assistant-step'][data-chat-group-part='response'],
  [data-step-process-body]
) a {
  text-underline-offset: 0.18em;
  text-decoration-thickness: 0.06em;
}
html[data-polish-optics='on'] :is(
  [data-clock],
  [data-turn-process],
  [data-turn-tail],
  [data-composer-stat],
  .dsh-polish-section
) {
  font-variant-numeric: tabular-nums;
}
html[data-polish-optics='on'] :where(pre, code, kbd, samp) {
  font-variant-numeric: tabular-nums;
}
/* dsh's markdown code rule sets the font shorthand, which resets the
   longhand at higher specificity; match its weight on the flow container. */
html[data-polish-optics='on'] [data-chat-flow] :is(pre, code, kbd, samp) {
  font-variant-numeric: tabular-nums;
}
html[data-polish-optics='on'] [data-conversation-scroll] {
  font-optical-sizing: auto;
}
/* Dark-canvas retinal irradiation: a 2.5% weight reduction where the host
   font is variable. font-weight (not font-variation-settings) keeps
   descendant strong/heading weights intact; static fonts round to 400. */
@supports (font-variation-settings: normal) {
  html[data-polish-optics='on'] body[data-ds-dark-theme] :is(
    [data-chat-flow-kind='assistant-step'][data-chat-group-part='response'],
    [data-step-process-body]
  ) :where(p, li, dd, blockquote) {
    font-weight: 390;
  }
}

/* ---- hit areas (group: targets) --------------------------------------
   Invisible ::after expansion on composer controls. Visual dimensions are
   unchanged; 5px vertical / 2px horizontal keeps neighbouring targets
   distinct while lifting the 22–34px rows toward a comfortable target. */
html[data-polish-targets='on'] [data-composer-seat] button {
  position: relative;
}
html[data-polish-targets='on'] [data-composer-seat] button::after {
  content: '';
  position: absolute;
  inset: -5px -2px;
  border-radius: inherit;
}

/* ---- message entrance (group: motion) --------------------------------
   CDS message-fade-up, limited to the tail of the flow so paging older
   turns into view does not replay the animation. */
@keyframes polish-message-enter {
  0% { opacity: 0; transform: translateY(6px); }
  100% { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: no-preference) {
  html[data-polish-motion='on'] :is(
    [data-chat-flow-kind='user'],
    [data-chat-flow-kind='assistant-step'][data-chat-group-part='response']
  ):nth-last-child(-n + 12) {
    animation: polish-message-enter var(--polish-spring-dur) var(--polish-spring) both;
  }
}

/* ---- status glow (group: glow) ----------------------------------------
   A hairline aura rendered below the composer card via the
   conversation.composer.dock seat. It breathes with the CDS dual-frequency
   feel and carries a 1.1s epitaxy sweep while a response is streaming.
   The same streaming gate lights the reasoning separator dot. */
.dsh-polish-glow {
  position: relative;
  height: 2px;
  width: 120px;
  margin: 6px auto 0;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 65%, transparent);
  opacity: 0;
  transform: scaleX(0.4);
  transition:
    opacity var(--ds-transition-duration-slow) var(--polish-ease-enter),
    transform var(--polish-spring-dur) var(--polish-spring);
  pointer-events: none;
}
.dsh-polish-glow::after {
  content: '';
  position: absolute;
  inset-block: 0;
  width: 42%;
  background: linear-gradient(90deg, transparent, #fff, transparent);
  opacity: 0;
  transform: translateX(-140%);
}
html[data-polish-glow='on'] .dsh-polish-glow[data-glow-active='true'] {
  opacity: 0.75;
  transform: scaleX(1);
  animation: polish-glow-breathe 1.8s ease-in-out infinite;
}
html[data-polish-glow='on'] .dsh-polish-glow[data-glow-active='true']::after {
  opacity: 0.55;
  animation: polish-glow-sweep 1.1s var(--polish-ease-sweep) infinite;
}
@keyframes polish-glow-breathe {
  0%, 100% {
    opacity: 0.45;
    box-shadow: 0 0 6px 0 color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 25%, transparent);
  }
  50% {
    opacity: 0.9;
    box-shadow: 0 0 12px 2px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 55%, transparent);
  }
}
@keyframes polish-glow-sweep {
  0% { transform: translateX(-140%); }
  100% { transform: translateX(340%); }
}
/* Reasoning separator: a 2px dot picking up the same ambient ring. */
html[data-polish-glow='on'][data-polish-glow-active='true'] [data-step-process] [data-shimmer-decoration] {
  animation: polish-reasoning-pulse 1.8s ease-in-out infinite;
}
@keyframes polish-reasoning-pulse {
  0%, 100% {
    box-shadow:
      0 0 0 1.5px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 30%, transparent),
      0 0 6px 1px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 30%, transparent);
  }
  50% {
    box-shadow:
      0 0 0 1.5px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 55%, transparent),
      0 0 10px 3px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 55%, transparent);
  }
}
@media (prefers-reduced-motion: reduce) {
  html[data-polish-glow='on'] .dsh-polish-glow[data-glow-active='true'] {
    animation: none;
    opacity: 0.6;
    box-shadow: 0 0 8px 1px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 35%, transparent);
  }
  html[data-polish-glow='on'] .dsh-polish-glow[data-glow-active='true']::after {
    animation: none;
    opacity: 0;
  }
  html[data-polish-glow='on'][data-polish-glow-active='true'] [data-step-process] [data-shimmer-decoration] {
    animation: none;
    box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--dsw-alias-state-business-primary, #4176e6) 40%, transparent);
  }
}
/* Failed turns render a static error tint instead of the breathing accent. */
html[data-polish-glow='on'] .dsh-polish-glow[data-glow-status='error'] {
  background: var(--dsw-alias-state-error-primary, #ef4444);
  opacity: 0.5;
  transform: scaleX(1);
  animation: none;
}
html[data-polish-glow='on'] .dsh-polish-glow[data-glow-status='error']::after {
  animation: none;
  opacity: 0;
}

/* ---- settings section (dedicated page, sibling of General) -----------
   Registered into settings.section; the shell only supplies the scrolling
   content column, so the page carries its own width policy and card. */
.dsh-polish-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 760px;
  padding-top: 8px;
}
.dsh-polish-intro {
  margin: 0 2px;
  font: var(--dsw-font-xs-13);
  color: var(--dsw-alias-label-secondary);
  text-wrap: pretty;
}
.dsh-polish-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: var(--dsw-radius-lg, 16px);
  background: var(--dsw-alias-bg-layer-3, var(--dsw-alias-bg-layer-2));
  box-shadow: var(--dsw-shadow-lv2);
}
.dsh-polish-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  transition: background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out);
}
.dsh-polish-card .dsh-polish-row + .dsh-polish-row {
  border-top: 1px solid var(--dsw-alias-border-l1);
}
@media (hover: hover) {
  .dsh-polish-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
}
.dsh-polish-spring-row {
  align-items: flex-start;
  flex-wrap: wrap;
}
.dsh-polish-segments {
  display: inline-flex;
  flex: none;
  gap: 2px;
  padding: 2px;
  border-radius: 999px;
  background: var(--dsw-alias-interactive-bg-hover);
}
.dsh-polish-segment {
  min-height: 24px;
  padding: 2px 10px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xs-13);
  cursor: pointer;
  transition:
    background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out),
    color var(--ds-transition-duration-fast) var(--ds-ease-in-out);
}
.dsh-polish-segment:hover {
  color: var(--dsw-alias-label-primary);
}
.dsh-polish-segment[aria-checked='true'] {
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-primary);
  box-shadow: var(--dsw-shadow-lv1);
}
.dsh-polish-segment:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 1px;
}
.dsh-polish-segments[aria-disabled='true'] {
  opacity: 0.55;
}
.dsh-polish-row-copy { display: grid; gap: 2px; min-width: 0; }
.dsh-polish-row-title {
  font: var(--dsw-font-s-strong-14);
  color: var(--dsw-alias-label-primary);
}
.dsh-polish-row-caption {
  font: var(--dsw-font-xs-13);
  color: var(--dsw-alias-label-secondary);
  text-wrap: pretty;
}
.dsh-polish-switch {
  position: relative;
  flex: none;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  border: none;
  padding: 0;
  cursor: pointer;
  background: var(--dsw-alias-border-l3);
  transition: background-color var(--ds-transition-duration-fast) var(--ds-ease-in-out);
}
/* Invisible hit-area expansion: WCAG-grade target without visual bulk. */
.dsh-polish-switch::before {
  content: '';
  position: absolute;
  inset: -10px -8px;
  border-radius: 999px;
}
.dsh-polish-switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: var(--dsw-alias-label-primary-foreground, #fff);
  box-shadow: var(--dsw-shadow-lv1);
  transition: transform var(--ds-transition-duration-fast) var(--ds-ease-in-out);
}
html[data-polish-motion='on'] .dsh-polish-switch::after {
  transition: transform var(--polish-spring-dur) var(--polish-spring);
}
html[data-polish-motion='on'] .dsh-polish-switch:active::after {
  transition-duration: var(--polish-dur-fast);
  transition-timing-function: ease-out;
}
.dsh-polish-switch[aria-checked='true'] {
  background: var(--dsw-alias-state-business-primary);
}
.dsh-polish-switch[aria-checked='true']::after {
  transform: translateX(16px);
}
.dsh-polish-switch:focus-visible {
  outline: var(--dsw-focus-ring-width) solid var(--dsw-focus-ring-color, var(--dsw-alias-state-business-primary));
  outline-offset: 2px;
}
`;
