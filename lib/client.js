(function() {

// src/motion/createHooks.ts
	const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
	function createPolishHooks(React) {
		const { useState, useEffect, useCallback, useRef } = React;
		function useScrollPinning(containerRef, options = {}) {
			const threshold = options.threshold ?? 48;
			const [pinned, setPinned] = useState(true);
			const pinnedRef = useRef(true);
			const frameRef = useRef(0);
			const setPinnedState = useCallback((next) => {
				pinnedRef.current = next;
				setPinned(next);
			}, []);
			const reduced = () => typeof window !== "undefined" && typeof window.matchMedia === "function" ? window.matchMedia(REDUCED_QUERY).matches : false;
			const onUserScroll = useCallback(() => {
				const el = containerRef.current;
				if (!el) return;
				const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
				if (distance <= threshold && !pinnedRef.current) setPinnedState(true);
				else if (distance > threshold * 2 && pinnedRef.current) setPinnedState(false);
			}, [
				containerRef,
				threshold,
				setPinnedState
			]);
			const scrollToEnd = useCallback((behavior = "smooth") => {
				const el = containerRef.current;
				if (!el) return;
				el.scrollTo({
					top: el.scrollHeight,
					behavior: reduced() ? "auto" : behavior
				});
				setPinnedState(true);
			}, [containerRef, setPinnedState]);
			useEffect(() => {
				const el = containerRef.current;
				if (!el) return;
				const handler = () => {
					if (frameRef.current) return;
					frameRef.current = requestAnimationFrame(() => {
						frameRef.current = 0;
						onUserScroll();
					});
				};
				el.addEventListener("scroll", handler, { passive: true });
				return () => {
					el.removeEventListener("scroll", handler);
					if (frameRef.current) cancelAnimationFrame(frameRef.current);
				};
			}, [containerRef, onUserScroll]);
			useEffect(() => {
				const target = options.contentRef?.current ?? containerRef.current;
				if (!target) return;
				const observer = new MutationObserver(() => {
					if (!pinnedRef.current) return;
					const el = containerRef.current;
					if (!el) return;
					el.scrollTo({
						top: el.scrollHeight,
						behavior: "auto"
					});
				});
				observer.observe(target, {
					childList: true,
					subtree: true,
					characterData: true
				});
				return () => observer.disconnect();
			}, [containerRef, options.contentRef]);
			return {
				pinned,
				showJumpToBottom: !pinned,
				scrollToEnd
			};
		}
		function useAmbientGlow(status) {
			const active = status === "thinking" || status === "streaming";
			useEffect(() => {
				const root = document.documentElement;
				root.dataset.polishGlowStatus = status;
				root.dataset.polishGlowActive = active ? "true" : "false";
				return () => {
					delete root.dataset.polishGlowStatus;
					delete root.dataset.polishGlowActive;
				};
			}, [status, active]);
			return { glowProps: {
				"data-glow-status": status,
				"data-glow-active": active ? "true" : "false"
			} };
		}
		return {
			useScrollPinning,
			useAmbientGlow
		};
	}

// src/motion/spring.ts
/**
	* Motion presets — timing and easing curves for the polish layer.
	*
	* Values ported from open-claude-ui's reverse-engineered CDS physics:
	* the `easeSwift` settle curve, the 5-step response scale, and the 15-sample
	* `linear()` press spring. dsh's own durations stay in place (slightly
	* lengthened) so the host's rhythm is preserved rather than replaced.
	*/
	/** easeSwift (CDS `--cds-ease-swift`): the polish default; hard settle, no overshoot. */
	const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
	/** CDS `--cds-ease-enter`: message/blocks dissolve in without stealing focus. */
	const EASE_ENTER = "cubic-bezier(0.22, 1, 0.36, 1)";
	/** CDS `epitaxy-linear-sweep`: symmetric S-curve for the status sweep. */
	const EASE_SWEEP = "cubic-bezier(0.45, 0, 0.55, 1)";
	/**
	* Sample a damped harmonic oscillator into a CSS `linear()` easing.
	*
	* m x'' + c x' + k (x - 1) = 0, with zeta = c / (2 sqrt(m k)).
	* The last sample is pinned to 1 so the CSS transition never leaves a
	* residual offset (springs truncated before they settle can still be at
	* 1.02–1.05 at the documented duration).
	*/
	function sampleSpring(stiffness, damping, mass, duration, samples = 30) {
		const w0 = Math.sqrt(stiffness / mass);
		const zeta = damping / (2 * Math.sqrt(stiffness * mass));
		const values = [];
		for (let i = 0; i <= samples; i += 1) {
			const t = duration * i / samples;
			let x;
			if (zeta < 1) {
				const wd = w0 * Math.sqrt(1 - zeta * zeta);
				x = 1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + zeta / Math.sqrt(1 - zeta * zeta) * Math.sin(wd * t));
			} else if (Math.abs(zeta - 1) < 1e-4) x = 1 - Math.exp(-w0 * t) * (1 + w0 * t);
			else {
				const s1 = -w0 * (zeta - Math.sqrt(zeta * zeta - 1));
				const s2 = -w0 * (zeta + Math.sqrt(zeta * zeta - 1));
				x = 1 - (s2 * Math.exp(s1 * t) - s1 * Math.exp(s2 * t)) / (s2 - s1);
			}
			values.push(i === 0 ? 0 : i === samples ? 1 : Number(x.toFixed(4)));
		}
		return `linear(${values.join(", ")})`;
	}
	/**
	* The four reverse-engineered Framer Motion presets, translated to CSS.
	*
	* - snappy: button/small controls, 600/30/1, +8.8% overshoot.
	* - gentle: card/popover reveal, 320/28/1, +1.8%.
	* - bouncy: light feedback, 380/18/1, +19.4% (the docs note this preset is a
	*   design-side addition, not observed verbatim in the client).
	* - heavy: panel drag, 1200/80/0.1, overdamped zero-overshoot. Sampled over
	*   320ms rather than the 140ms perceptual snap so the curve reaches 1.
	*/
	const SPRING_PROFILES = {
		snappy: {
			label: "轻快",
			brief: "按钮 / 微交互 · 过冲 8.8%",
			stiffness: 600,
			damping: 30,
			mass: 1,
			duration: "0.22s",
			curve: sampleSpring(600, 30, 1, .22)
		},
		gentle: {
			label: "从容",
			brief: "卡片 / 浮层 · 过冲 1.8%",
			stiffness: 320,
			damping: 28,
			mass: 1,
			duration: "0.35s",
			curve: sampleSpring(320, 28, 1, .35)
		},
		bouncy: {
			label: "弹性",
			brief: "轻反馈 · 过冲 19.4%",
			stiffness: 380,
			damping: 18,
			mass: 1,
			duration: "0.58s",
			curve: sampleSpring(380, 18, 1, .58)
		},
		heavy: {
			label: "咬合",
			brief: "面板 / 拖拽 · 零过冲",
			stiffness: 1200,
			damping: 80,
			mass: .1,
			duration: "0.32s",
			curve: sampleSpring(1200, 80, .1, .32)
		}
	};
	const DEFAULT_SPRING_PROFILE = "gentle";
	function isSpringProfile(value) {
		return typeof value === "string" && value in SPRING_PROFILES;
	}
	const DURATION = {
		fast: "0.12s",
		base: "0.24s",
		slow: "0.36s"
	};
	/** CDS 5-step response scale (60/120/200/300/450ms) for plugin-owned motion. */
	const CDS_DURATION = {
		fast: "60ms",
		snap: "120ms",
		base: "200ms",
		sheet: "300ms",
		slow: "450ms"
	};
	/** Token overrides for the `motion` polish group (both schemes mandatory). */
	function buildMotionOverrides() {
		const pair = (value) => ({
			light: value,
			dark: value
		});
		return {
			"--ds-transition-duration-fast": pair(DURATION.fast),
			"--ds-transition-duration": pair(DURATION.base),
			"--ds-transition-duration-slow": pair(DURATION.slow),
			"--ds-ease-in-out": pair(EASE_OUT)
		};
	}

// src/audio/sfx.ts
	const CUE_SPECS = {
		send: {
			from: 440,
			to: 660,
			duration: .16,
			gain: .12,
			type: "sine"
		},
		done: {
			from: 660,
			to: 440,
			duration: .2,
			gain: .1,
			type: "sine"
		},
		error: {
			from: 320,
			to: 240,
			duration: .24,
			gain: .1,
			type: "triangle"
		}
	};
	let enabled = false;
	let context = null;
	let unlockHandler = null;
	function audioContextCtor() {
		if (typeof window === "undefined") return void 0;
		const w = window;
		return w.AudioContext ?? w.webkitAudioContext;
	}
	function ensureContext() {
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
	function resume() {
		const ctx = ensureContext();
		if (ctx && ctx.state === "suspended") ctx.resume();
	}
	function unlock() {
		resume();
		if (context?.state !== "running" || unlockHandler === null) return;
		window.removeEventListener("pointerdown", unlockHandler, true);
		window.removeEventListener("keydown", unlockHandler, true);
		unlockHandler = null;
	}
	function installGestureUnlock() {
		if (unlockHandler !== null || typeof window === "undefined") return;
		unlockHandler = unlock;
		window.addEventListener("pointerdown", unlockHandler, true);
		window.addEventListener("keydown", unlockHandler, true);
	}
	/** Gate the cue layer; enabling it also tries to unlock the audio context. */
	function syncSound(on) {
		enabled = on;
		if (!on) {
			if (context && context.state === "running") context.suspend();
			return;
		}
		resume();
		installGestureUnlock();
	}
	/** Play one cue; returns false when muted, unavailable, or still locked. */
	function playCue(cue) {
		if (!enabled) return false;
		const ctx = ensureContext();
		if (!ctx || ctx.state !== "running") return false;
		const spec = CUE_SPECS[cue];
		const start = ctx.currentTime + .01;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = spec.type;
		osc.frequency.setValueAtTime(spec.from, start);
		osc.frequency.exponentialRampToValueAtTime(spec.to, start + spec.duration);
		gain.gain.setValueAtTime(1e-4, start);
		gain.gain.exponentialRampToValueAtTime(spec.gain, start + .012);
		gain.gain.exponentialRampToValueAtTime(1e-4, start + spec.duration);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(start);
		osc.stop(start + spec.duration + .02);
		return true;
	}
	/** Release the context and gesture listeners on plugin unload. */
	function disposeAudio() {
		enabled = false;
		if (unlockHandler !== null) {
			window.removeEventListener("pointerdown", unlockHandler, true);
			window.removeEventListener("keydown", unlockHandler, true);
			unlockHandler = null;
		}
		if (context) {
			const ctx = context;
			context = null;
			ctx.close().catch(() => void 0);
		}
	}

// src/client/prefs.ts
/**
	* Polish group preferences, persisted in localStorage.
	*
	* Groups are intentionally client-local: the polish layer is presentational,
	* so its switches need no profile-level persistence and survive theme or
	* account switches within the browser.
	*/
	const GROUPS = [
		"motion",
		"elevation",
		"fades",
		"glow",
		"plugins",
		"optics",
		"targets",
		"sound"
	];
	/** Groups that are opt-in rather than part of the default polish baseline. */
	const GROUP_DEFAULTS = { sound: false };
	const STORAGE_KEY = "dsh-ui-polish.v1";
	const DEFAULTS = {
		enabled: true,
		groups: {},
		spring: DEFAULT_SPRING_PROFILE
	};
	let listeners = /* @__PURE__ */ new Set();
	function read() {
		if (typeof localStorage === "undefined") return DEFAULTS;
		try {
			const raw = localStorage.getItem(STORAGE_KEY);
			if (!raw) return DEFAULTS;
			const parsed = JSON.parse(raw);
			return {
				enabled: parsed.enabled !== false,
				groups: parsed.groups ?? {},
				spring: isSpringProfile(parsed.spring) ? parsed.spring : DEFAULT_SPRING_PROFILE
			};
		} catch {
			return DEFAULTS;
		}
	}
	function write(next) {
		if (typeof localStorage === "undefined") return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		} catch {}
		for (const listener of listeners) listener();
	}
	function isMasterOn() {
		return read().enabled;
	}
	function isEnabled(group) {
		const prefs = read();
		return prefs.enabled && (prefs.groups[group] ?? GROUP_DEFAULTS[group] ?? true);
	}
	function getSpringProfile() {
		return read().spring;
	}
	function setSpringProfile(profile) {
		write({
			...read(),
			spring: profile
		});
	}
	function setMaster(on) {
		write({
			...read(),
			enabled: on
		});
	}
	function setGroup(group, on) {
		write({
			...read(),
			groups: {
				...read().groups,
				[group]: on
			}
		});
	}
	/** Subscribe to preference changes; also fires for cross-tab updates. */
	function subscribe(listener) {
		listeners.add(listener);
		const onStorage = (event) => {
			if (event.key === STORAGE_KEY) listener();
		};
		window.addEventListener("storage", onStorage);
		return () => {
			listeners.delete(listener);
			window.removeEventListener("storage", onStorage);
		};
	}

// src/client/components.ts
	const GROUP_COPY = {
		motion: {
			title: "更顺滑的过渡动效",
			caption: "放慢基础过渡并使用缓出曲线，悬浮与展开更从容"
		},
		elevation: {
			title: "更柔和的阴影层次",
			caption: "减淡发丝描边并拉长阴影扩散，面板更有空气感"
		},
		fades: {
			title: "滚动边缘渐隐",
			caption: "对话流滚动到边界时上下边缘自然淡出"
		},
		glow: {
			title: "会话状态光晕",
			caption: "回复生成中，输入框下方出现呼吸状态的细线光晕"
		},
		plugins: {
			title: "插件界面适配",
			caption: "把滚动渐隐与过渡节奏延伸到第三方插件面板，无需插件配合"
		},
		optics: {
			title: "排版光学微调",
			caption: "标题换行更均衡、段落减少孤字，时间与用量数字不再左右抖动"
		},
		targets: {
			title: "输入区命中区",
			caption: "不改变视觉尺寸，给模型、权限、发送等小按钮增加隐形点击范围"
		},
		sound: {
			title: "轻量交互音效",
			caption: "发送、完成、出错时播放合成提示音；无外部音频文件，默认关闭"
		}
	};
	/** Derives the glow status from a Chat snapshot. Pure; used as the selector. */
	function deriveStatusFromSnapshot(snapshot) {
		const cache = snapshot?.nodes?.valuesCache;
		if (!Array.isArray(cache)) return "idle";
		let running = false;
		let error = false;
		for (const entry of cache) {
			const typed = entry;
			const turnStatus = typed?.location?.turn?.status;
			if (typeof turnStatus === "string" && turnStatus !== "closed") running = true;
			const dataStatus = typed?.data?.status;
			if (dataStatus === "running" || dataStatus === "streaming" || dataStatus === "pending") running = true;
			if (typed?.location?.turn?.end?.data?.reason?.kind === "error" || dataStatus === "error") error = true;
		}
		if (running) return "streaming";
		if (error) return "error";
		return "idle";
	}
	function createComponents(React, hooks) {
		const { useState, useEffect, useRef, createElement: h } = React;
		function Switch(props) {
			return h("button", {
				type: "button",
				role: "switch",
				"aria-checked": props.checked ? "true" : "false",
				"aria-label": props.label,
				className: "dsh-polish-switch",
				onClick: () => props.onChange(!props.checked)
			});
		}
		function usePrefsValue(get) {
			const [value, setValue] = useState(get);
			useEffect(() => subscribe(() => setValue(get())), [get]);
			return [value, setValue];
		}
		function GroupRow(props) {
			const copy = GROUP_COPY[props.group];
			const [on, setOn] = usePrefsValue(() => isEnabled(props.group));
			return h("div", { className: "dsh-polish-row" }, h("div", { className: "dsh-polish-row-copy" }, h("div", { className: "dsh-polish-row-title" }, copy.title), h("div", { className: "dsh-polish-row-caption" }, copy.caption)), h(Switch, {
				checked: on,
				onChange: (next) => setGroup(props.group, next),
				label: copy.title
			}));
		}
		function MasterRow() {
			const [on, setOn] = usePrefsValue(isMasterOn);
			return h("div", { className: "dsh-polish-row" }, h("div", { className: "dsh-polish-row-copy" }, h("div", { className: "dsh-polish-row-title" }, "界面打磨"), h("div", { className: "dsh-polish-row-caption" }, "总开关：关闭后恢复 dsh 原生观感")), h(Switch, {
				checked: on,
				onChange: setMaster,
				label: "界面打磨总开关"
			}));
		}
		function useSpringValue() {
			const [value, setValue] = useState(getSpringProfile);
			useEffect(() => subscribe(() => setValue(getSpringProfile())), []);
			const set = (next) => {
				setSpringProfile(next);
				setValue(next);
			};
			return [value, set];
		}
		function SpringRow() {
			const [profile, setProfile] = useSpringValue();
			const [motionOn] = usePrefsValue(() => isEnabled("motion"));
			const spec = SPRING_PROFILES[profile];
			return h("div", { className: "dsh-polish-row dsh-polish-spring-row" }, h("div", { className: "dsh-polish-row-copy" }, h("div", { className: "dsh-polish-row-title" }, "弹簧手感"), h("div", { className: "dsh-polish-row-caption" }, `消息入场、开关与光晕的物理曲线：${spec.label} · ${spec.brief}`)), h("div", {
				className: "dsh-polish-segments",
				role: "radiogroup",
				"aria-label": "弹簧手感",
				"aria-disabled": motionOn ? "false" : "true"
			}, ...Object.keys(SPRING_PROFILES).map((key) => h("button", {
				key,
				type: "button",
				role: "radio",
				"aria-checked": profile === key ? "true" : "false",
				className: "dsh-polish-segment",
				onClick: () => setProfile(key)
			}, SPRING_PROFILES[key].label))));
		}
		function SettingsSection() {
			return h("div", { className: "dsh-polish-section" }, h("p", { className: "dsh-polish-intro" }, "这些开关只影响本机界面呈现，可随时关闭并恢复 dsh 原生观感。"), h("div", { className: "dsh-polish-card" }, h(MasterRow), ...GROUPS.map((group) => h(GroupRow, {
				group,
				key: group
			})), h(SpringRow)));
		}
		function ComposerGlow(props) {
			const status = props.useChat(deriveStatusFromSnapshot);
			const previous = useRef(status);
			const { glowProps } = hooks.useAmbientGlow(status);
			useEffect(() => {
				const prev = previous.current;
				previous.current = status;
				if (prev === status) return;
				if (status === "streaming" && (prev === "idle" || prev === "done" || prev === "error")) playCue("send");
				else if (status === "done" && prev === "streaming") playCue("done");
				else if (status === "error" && (prev === "streaming" || prev === "thinking")) playCue("error");
				else if (status === "idle" && prev === "streaming") playCue("done");
			}, [status]);
			return h("div", {
				className: "dsh-polish-glow",
				...glowProps,
				"aria-hidden": "true"
			});
		}
		return {
			SettingsSection,
			ComposerGlow
		};
	}

// src/client/palette.ts
/**
	* Token-level refinements, applied through the native
	* `ctx.theme.overrideTokens` presenter path (inline on <body>, both schemes).
	*
	* Geometry follows open-claude-ui's CDS 4-tier elevation model: every shadow
	* is a near ambient-occlusion layer plus a far diffusion layer, and dark
	* surfaces get an inset top-light chamfer instead of a bright outer stroke.
	* Values stay neutral (black/white alpha only), so dsh keeps its own hue.
	*/
	const ELEVATION_OVERRIDES = {
		"--dsw-elevation-stroke-color": {
			light: "#00000012",
			dark: "#ffffff14"
		},
		"--dsw-shadow-lv1": {
			light: "0 1px 2px 0 #0000000a, 0 2px 8px 0 #0000000d",
			dark: "inset 0 0 0 1px #ffffff08, 0 1px 2px 0 #0000002e, 0 2px 8px 0 #0000002e"
		},
		"--dsw-shadow-lv2": {
			light: "0 2px 4px 0 #0000000a, 0 6px 16px 0 #0000000d",
			dark: "inset 0 0 0 1px #ffffff0d, 0 2px 4px 0 #0000003d, 0 6px 16px 0 #0000003d"
		},
		"--dsw-shadow-lv3": {
			light: "0 4px 8px 0 #0000000d, 0 12px 28px -2px #00000012",
			dark: "inset 0 0 0 1px #ffffff14, 0 4px 8px 0 #0000004d, 0 16px 36px -2px #00000042"
		}
	};

// src/client/retime.ts
/**
	* Plugin transition retiming.
	*
	* Third-party plugins often hardcode transition durations instead of using
	* the `--ds-transition-duration*` tokens, so token overrides cannot reach
	* them. This engine reads their injected stylesheets and emits a shadow
	* stylesheet of its own: the same selectors, the same at-rule context, with
	* durations scaled by the polish motion profile (1.2x, the exact ratio of
	* today's base token to the native 0.2s).
	*
	* The plugin CSSOM is never mutated. The shadow sheet is our own style tag,
	* wrapped in `prefers-reduced-motion: no-preference`, and it is removed as a
	* whole when the group is off. Token-driven declarations (`var(...)`) are
	* skipped: they already follow the overridden tokens and must not scale
	* twice. Animations are left alone; only interaction transitions retime.
	*/
	const NATIVE_BASE_SECONDS = .2;
	const MAX_TRANSITION_SECONDS = 1.2;
	const OWN_PLUGIN = "dsh-ui-polish";
	const CORE_PREFIX = "@deepseek-ai/";
	const SHADOW_ID = "dsh-ui-polish/plugin-motion.css";
	const REBUILD_DEBOUNCE_MS = 200;
	function motionScale() {
		const base = Number.parseFloat(DURATION.base);
		return Number.isFinite(base) && base > 0 ? base / NATIVE_BASE_SECONDS : 1.2;
	}
	/** Scales one time token, or returns null when the token must be left alone. */
	function scaleTimeToken(token, scale) {
		const match = /^(\d*\.?\d+)(ms|s)$/.exec(token.trim());
		if (match === null) return null;
		const value = Number.parseFloat(match[1] ?? "");
		const unit = match[2];
		if (!Number.isFinite(value) || value <= 0) return null;
		if ((unit === "ms" ? value / 1e3 : value) > MAX_TRANSITION_SECONDS) return null;
		const scaled = value * scale;
		if (unit === "ms") {
			const rounded = Math.round(scaled);
			return rounded === Math.round(value) ? null : `${rounded}ms`;
		}
		const rounded = Number(scaled.toFixed(3));
		return rounded === Number(value.toFixed(3)) ? null : `${rounded}s`;
	}
	/** Scales a whole `transition-duration` longhand value. */
	function scaleTransitionDuration(value, scale) {
		if (value.length === 0) return null;
		if (value.includes("var(") || value.includes("calc(") || value.includes("env(")) return null;
		let changed = false;
		const parts = value.split(",").map((part) => {
			const trimmed = part.trim();
			const scaled = scaleTimeToken(trimmed, scale);
			if (scaled === null) return trimmed;
			changed = true;
			return scaled;
		});
		return changed ? parts.join(", ") : null;
	}
	function isStyleRule(rule) {
		return "selectorText" in rule && "style" in rule;
	}
	/**
	* Rebuilds the prelude of a grouping rule from its public properties.
	* Unknown grouping rules return null and their subtree is skipped: emitting
	* conditional rules unconditionally would change their meaning.
	*/
	function groupingPrelude(rule) {
		const anyRule = rule;
		if (typeof anyRule.media?.mediaText === "string") return anyRule.media.mediaText.length > 0 ? `@media ${anyRule.media.mediaText}` : null;
		if (typeof anyRule.containerName === "string") {
			const query = typeof anyRule.containerQuery === "string" ? anyRule.containerQuery : "";
			return `@container ${anyRule.containerName} ${query}`.trim();
		}
		if (typeof anyRule.name === "string" && "cssRules" in rule) return anyRule.name.length > 0 ? `@layer ${anyRule.name}` : "@layer";
		if (typeof anyRule.conditionText === "string") return `@supports ${anyRule.conditionText}`;
		return null;
	}
	function walkRules(rules, at, scale, out) {
		for (const rule of Array.from(rules)) {
			if (isStyleRule(rule)) {
				const duration = scaleTransitionDuration(rule.style.transitionDuration, scale);
				if (duration === null) continue;
				const selector = rule.selectorText.trim();
				if (selector.length === 0 || selector.includes("</style")) continue;
				out.push({
					selector,
					duration,
					at
				});
				continue;
			}
			if (!("cssRules" in rule)) continue;
			const prelude = groupingPrelude(rule);
			if (prelude === null) continue;
			walkRules(rule.cssRules, [...at, prelude], scale, out);
		}
	}
	/** Collects retime entries from every third-party style tag in the document. */
	function collectRetimeEntries(scale = motionScale(), doc = document) {
		const entries = [];
		const seen = /* @__PURE__ */ new Set();
		for (const tag of Array.from(doc.querySelectorAll("style[data-plugin-css]"))) {
			const plugin = tag.dataset.plugin ?? "";
			if (plugin.length === 0 || plugin === OWN_PLUGIN || plugin.startsWith(CORE_PREFIX)) continue;
			const sheet = tag.sheet;
			if (sheet === null) continue;
			let rules;
			try {
				rules = sheet.cssRules;
			} catch {
				continue;
			}
			const local = [];
			try {
				walkRules(rules, [], scale, local);
			} catch {
				continue;
			}
			for (const entry of local) {
				const key = `${entry.at.join("")}\u0002${entry.selector}\u0002${entry.duration}`;
				if (seen.has(key)) continue;
				seen.add(key);
				entries.push(entry);
			}
		}
		return entries;
	}
	function ruleText(entry) {
		let css = `${entry.selector} { transition-duration: ${entry.duration}; }`;
		for (let index = entry.at.length - 1; index >= 0; index -= 1) css = `${entry.at[index]} { ${css} }`;
		return css;
	}
	/** Builds the shadow stylesheet; empty when there is nothing to retime. */
	function buildRetimeCss(entries) {
		if (entries.length === 0) return "";
		return `@media (prefers-reduced-motion: no-preference) {\n  ${entries.map(ruleText).join("\n  ")}\n}\n`;
	}
	function createRetimeEngine(doc = document) {
		let active = false;
		let tag = null;
		let observer;
		let timer;
		const removeTag = () => {
			tag?.remove();
			tag = null;
		};
		const rebuild = () => {
			if (!active) return;
			const css = buildRetimeCss(collectRetimeEntries(motionScale(), doc));
			if (css.length === 0) {
				removeTag();
				return;
			}
			if (tag === null) {
				tag = doc.createElement("style");
				tag.dataset.plugin = OWN_PLUGIN;
				tag.dataset.pluginCss = SHADOW_ID;
			}
			if (tag.textContent !== css) tag.textContent = css;
			if (doc.head.lastElementChild !== tag) doc.head.appendChild(tag);
		};
		const schedule = () => {
			if (timer !== void 0) return;
			timer = window.setTimeout(() => {
				timer = void 0;
				rebuild();
			}, REBUILD_DEBOUNCE_MS);
		};
		const start = () => {
			if (active) return;
			active = true;
			rebuild();
			observer = new MutationObserver((records) => {
				for (const record of records) {
					if (record.type !== "childList") continue;
					if ([...Array.from(record.addedNodes), ...Array.from(record.removedNodes)].some((node) => {
						if (!(node instanceof HTMLElement)) return false;
						if (node.dataset.plugin === OWN_PLUGIN) return false;
						return node.matches("style[data-plugin-css]") || node.querySelector("style[data-plugin-css]") !== null;
					})) {
						schedule();
						return;
					}
				}
			});
			observer.observe(doc.head, {
				childList: true,
				subtree: true
			});
		};
		const stop = () => {
			active = false;
			observer?.disconnect();
			observer = void 0;
			if (timer !== void 0) {
				window.clearTimeout(timer);
				timer = void 0;
			}
			removeTag();
		};
		return {
			sync(enabled) {
				if (enabled) start();
				else stop();
			},
			dispose: stop
		};
	}

// src/client/scrollFade.ts
/**
	* Generalized scroll-edge fade engine.
	*
	* Discovery is generic: any visible vertical scrollport that actually
	* overflows becomes a fade target. Nothing here knows about specific
	* plugins; an element (or any ancestor) can opt out with
	* `data-polish-fade="off"`. Editor and terminal surfaces are skipped as a
	* class, not per plugin, because fading them hurts caret and line
	* visibility.
	*
	* The conversation scrollport keeps its own `native` scope so the `fades`
	* group stays independent from the plugin-facing `plugins` group.
	*/
	const SCOPE_ATTR = "polishFadeScope";
	const TARGET_ATTR = "polishFadeTarget";
	const TOP_ATTR = "polishFadeTop";
	const BOTTOM_ATTR = "polishFadeBottom";
	const EDGE_EPSILON = 4;
	const MIN_SCROLLER_SIZE = 96;
	const SCAN_INTERVAL_MS = 1e3;
	const MUTATION_DEBOUNCE_MS = 400;
	const SKIP_TAGS = /* @__PURE__ */ new Set([
		"HTML",
		"BODY",
		"TEXTAREA",
		"INPUT",
		"SELECT",
		"OPTION"
	]);
	/** Editor/terminal scroll areas keep their native edge treatment. */
	const EDITOR_SELECTOR = [
		".cm-editor",
		".cm-scroller",
		".monaco-editor",
		".monaco-scrollable-element",
		".xterm",
		".xterm-viewport"
	].join(", ");
	const OPT_OUT_SELECTOR = "[data-polish-fade=\"off\"]";
	const TEXT_ENTRY_SELECTOR = "[contenteditable=\"true\"], [contenteditable=\"\"], [role=\"textbox\"]";
	/** True when `el` is a visible, vertical, panel-sized scrollport. */
	function isFadeCandidate(el) {
		if (SKIP_TAGS.has(el.tagName)) return false;
		if (el.isContentEditable) return false;
		if (el.closest(OPT_OUT_SELECTOR) !== null) return false;
		if (el.closest(EDITOR_SELECTOR) !== null) return false;
		if (el.closest(TEXT_ENTRY_SELECTOR) !== null) return false;
		if (el.getClientRects().length === 0) return false;
		const style = getComputedStyle(el);
		if (style.overflowY !== "auto" && style.overflowY !== "scroll") return false;
		if (style.display === "none" || style.visibility === "hidden") return false;
		if (el.clientHeight < MIN_SCROLLER_SIZE || el.clientWidth < MIN_SCROLLER_SIZE) return false;
		return el.scrollHeight - el.clientHeight > EDGE_EPSILON;
	}
	function createScrollFadeEngine() {
		const targets = /* @__PURE__ */ new Set();
		let nativeOn = false;
		let pluginOn = false;
		let running = false;
		let scanTimer;
		let mutationTimer;
		let observer;
		let resizeHandler;
		const measure = (el) => {
			const top = el.scrollTop > EDGE_EPSILON;
			const bottom = el.scrollHeight - el.scrollTop - el.clientHeight > EDGE_EPSILON;
			if (el.dataset[TOP_ATTR] !== String(top)) el.dataset[TOP_ATTR] = String(top);
			if (el.dataset[BOTTOM_ATTR] !== String(bottom)) el.dataset[BOTTOM_ATTR] = String(bottom);
		};
		const onScroll = (event) => {
			measure(event.currentTarget);
		};
		const tag = (el, scope) => {
			if (!targets.has(el)) {
				targets.add(el);
				el.addEventListener("scroll", onScroll, { passive: true });
			}
			if (el.dataset[SCOPE_ATTR] !== scope) el.dataset[SCOPE_ATTR] = scope;
			if (el.dataset[TARGET_ATTR] === void 0) el.dataset[TARGET_ATTR] = "";
			measure(el);
		};
		const forget = (el) => {
			el.removeEventListener("scroll", onScroll);
			delete el.dataset[TARGET_ATTR];
			delete el.dataset[SCOPE_ATTR];
			delete el.dataset[TOP_ATTR];
			delete el.dataset[BOTTOM_ATTR];
			targets.delete(el);
		};
		const scan = () => {
			const conversation = document.querySelector("[data-conversation-scroll]");
			if (conversation !== null) {
				if (nativeOn) tag(conversation, "native");
				else if (targets.has(conversation) || conversation.dataset[SCOPE_ATTR] !== void 0) forget(conversation);
			}
			if (!pluginOn) return;
			const seen = /* @__PURE__ */ new Set();
			for (const el of Array.from(document.querySelectorAll("*"))) {
				if (el === conversation) continue;
				if (el.scrollHeight - el.clientHeight <= EDGE_EPSILON) continue;
				if (el.clientHeight < MIN_SCROLLER_SIZE || el.clientWidth < MIN_SCROLLER_SIZE) continue;
				if (!isFadeCandidate(el)) continue;
				seen.add(el);
				tag(el, "plugin");
			}
			for (const el of Array.from(targets)) if (el !== conversation && !seen.has(el)) forget(el);
		};
		const start = () => {
			if (running) return;
			running = true;
			scan();
			scanTimer = window.setInterval(scan, SCAN_INTERVAL_MS);
			resizeHandler = () => scan();
			window.addEventListener("resize", resizeHandler, { passive: true });
			observer = new MutationObserver(() => {
				if (mutationTimer !== void 0) return;
				mutationTimer = window.setTimeout(() => {
					mutationTimer = void 0;
					scan();
				}, MUTATION_DEBOUNCE_MS);
			});
			observer.observe(document.body, {
				childList: true,
				subtree: true
			});
		};
		const stop = () => {
			running = false;
			if (scanTimer !== void 0) {
				window.clearInterval(scanTimer);
				scanTimer = void 0;
			}
			if (mutationTimer !== void 0) {
				window.clearTimeout(mutationTimer);
				mutationTimer = void 0;
			}
			observer?.disconnect();
			observer = void 0;
			if (resizeHandler !== void 0) {
				window.removeEventListener("resize", resizeHandler);
				resizeHandler = void 0;
			}
			for (const el of Array.from(targets)) forget(el);
		};
		const sync = (state) => {
			nativeOn = state.native;
			pluginOn = state.plugin;
			if (!nativeOn && !pluginOn) {
				stop();
				return;
			}
			start();
			if (!pluginOn) {
				for (const el of Array.from(targets)) if (el.dataset[SCOPE_ATTR] === "plugin") forget(el);
			}
			if (!nativeOn) {
				const conversation = document.querySelector("[data-conversation-scroll]");
				if (conversation !== null && targets.has(conversation)) forget(conversation);
			}
			scan();
		};
		return {
			sync,
			dispose: stop
		};
	}

// src/client/styles.ts
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
	const springCss = Object.keys(SPRING_PROFILES).map((key) => {
		const spec = SPRING_PROFILES[key];
		return `html[data-polish-spring='${key}'] {
  --polish-spring: ${spec.curve};
  --polish-spring-dur: ${spec.duration};
}`;
	}).join("\n");
	const defaultSpring = SPRING_PROFILES[DEFAULT_SPRING_PROFILE];
	const POLISH_CSS = `
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

// src/client/apply.ts
/**
	* The cordis object plugin body: wires the polish layer into a running web
	* client. Resources are registered through `ctx.effect` so unloading the
	* plugin (uninstall, HMR reload) removes every stylesheet, override and slot
	* contribution.
	*/
	const PKG = "dsh-ui-polish";
	const TOKEN_SOURCE = "dsh-ui-polish";
	const cap = (value) => value.charAt(0).toUpperCase() + value.slice(1);
	function groupDatasetKey(group) {
		return `polish${cap(group)}`;
	}
	/** Applies every enabled group's token overrides into one override layer. */
	function buildTokenOverrides() {
		const map = {};
		if (isEnabled("motion")) Object.assign(map, buildMotionOverrides());
		if (isEnabled("elevation")) Object.assign(map, ELEVATION_OVERRIDES);
		return map;
	}
	function createApply(components) {
		return function apply(ctx) {
			const fadeEngine = createScrollFadeEngine();
			const retimeEngine = createRetimeEngine();
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = PKG;
				tag.dataset.pluginCss = `${PKG}/polish.css`;
				tag.textContent = POLISH_CSS;
				document.head.appendChild(tag);
				return () => tag.remove();
			}, "ui-polish/styles");
			let disposeTokens;
			const disposeOverride = () => {
				if (typeof disposeTokens === "function") disposeTokens();
				disposeTokens = void 0;
			};
			const applyGroups = () => {
				const root = document.documentElement;
				const master = isMasterOn();
				root.dataset.polish = master ? "on" : "off";
				root.dataset.polishSpring = getSpringProfile();
				for (const group of GROUPS) root.dataset[groupDatasetKey(group)] = master && isEnabled(group) ? "on" : "off";
				syncSound(master && isEnabled("sound"));
				fadeEngine.sync({
					native: master && isEnabled("fades"),
					plugin: master && isEnabled("plugins")
				});
				retimeEngine.sync(master && isEnabled("plugins") && isEnabled("motion"));
				disposeOverride();
				if (master) {
					const overrides = buildTokenOverrides();
					if (Object.keys(overrides).length > 0) disposeTokens = ctx.theme.overrideTokens(TOKEN_SOURCE, overrides);
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
					const root = document.documentElement;
					delete root.dataset.polish;
					delete root.dataset.polishSpring;
					for (const group of GROUPS) delete root.dataset[groupDatasetKey(group)];
				};
			}, "ui-polish/groups");
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "ui-polish-glow",
				order: 40
			}, components.ComposerGlow));
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "ui-polish",
				order: 30,
				label: "界面打磨"
			}, components.SettingsSection));
		};
	}

// src/client.ts
/**
	* dsh-ui-polish client bundle entry.
	*
	* The dsh web client serves this file as a classic script and executes it to
	* register a lazy factory into the browser module table. React and all host
	* services are acquired inside the factory — no static imports.
	*/
	window.__ModuleLoader__.load({
		id: "dsh-ui-polish",
		factory(require) {
			const React = require("react");
			const hooks = createPolishHooks(React);
			const components = createComponents(React, hooks);
			return {
				inject: ["slots", "theme"],
				apply: createApply(components)
			};
		}
	});

})();