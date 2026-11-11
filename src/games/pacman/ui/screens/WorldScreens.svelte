<!-- Menu, ready, pause, death and game over for the season worlds and the hell, drawn as things in
	the world (the owner's mock-up): a signboard on stakes with the plank buttons hung under it on
	ropes, a chalk board for the hints, coins for the heroes, a banner for READY, round knobs. The
	material is the world's on screen, like the HUD's. The planks are buttons that never keep the
	focus, so the arrows keep steering; the keys work as before. The secret level keeps the
	older `GameScreens`. -->
<script lang="ts">
	import type { HudSnapshot } from '../hud/hudSnapshot';
	import { t, toggleLang } from '../i18n';
	import type { ScreenActions } from './screenActions';
	import { boardArt, heroArt, trailArt } from '../hud/season/seasonArt';
	import { HELL_THEME, SEASON_THEMES, isSeasonKey } from '../hud/season/seasonThemes';
	import {
		bannerSpanArt,
		chalkArt,
		coinArt,
		cracksArt,
		knobFaceArt,
		plankArt,
		ribbonArt,
		ropesArt
	} from './screenArt';
	import { clamp01, fmt } from '../hud/season/seasonFormat';

	let { snap, actions }: { snap: HudSnapshot; actions: ScreenActions } = $props();

	let innerWidth = $state(1280);
	let innerHeight = $state(720);

	const theme = $derived(
		snap.world === 'hell'
			? HELL_THEME
			: isSeasonKey(snap.world)
				? SEASON_THEMES[snap.world]
				: SEASON_THEMES.autumn
	);
	const ms = $derived(snap.profile === 'ms-pacman');
	const record = $derived(snap.score > 0 && snap.score >= snap.highScore);
	const screen = $derived<'pause' | 'menu' | 'ready' | 'over' | null>(
		snap.paused
			? 'pause'
			: snap.state === 'menu'
				? 'menu'
				: snap.state === 'ready'
					? 'ready'
					: snap.state === 'game-over'
						? 'over'
						: null
	);

	const SIZE = {
		menu: { w: 520, h: 612 },
		ready: { w: 540, h: 356 },
		pause: { w: 460, h: 408 },
		over: { w: 480, h: 552 }
	} as const;
	const VEIL = { menu: 0.4, ready: 0.18, pause: 0.5, over: 0.55 } as const;

	/** After a death the READY screen is taller: the lives left sit under it, once the
	    transition is over (the black hole is never covered by a banner). */
	const RETRY_LIFT = 27;
	const READY_RETRY = { w: 540, h: 356 + 2 * RETRY_LIFT } as const;
	const retry = $derived(screen === 'ready' && snap.afterDeath && snap.lives > 0);
	const dims = $derived(screen ? (retry ? READY_RETRY : SIZE[screen]) : null);

	const portrait = $derived(innerWidth / innerHeight < 1.25);
	/** How large the screen is drawn: as the window allows, not beyond a cap. */
	const k = $derived.by(() => {
		if (!screen || !dims) return 1;
		const { w, h } = dims;
		const cap = screen === 'ready' ? 1.5 : 2.2;
		return Math.min((innerWidth * (portrait ? 0.94 : 0.8)) / w, (innerHeight * 0.9) / h, cap);
	});

	function act(action: () => void): (event: MouseEvent) => void {
		return (event) => {
			(event.currentTarget as SVGElement | null)?.blur();
			action();
		};
	}
	const noFocus = (event: MouseEvent) => event.preventDefault();
	const noop = () => {};

	const chooseHero = (wantMs: boolean) => {
		if (ms !== wantMs) actions.profile();
	};

	/** The help lines on the chalk board: the keys, split at their separators. */
	const help = $derived.by(() => {
		const parts = $t('pressEnter').split(' · ');
		return [parts.slice(0, 2).join(' · '), parts.slice(2).join(' · '), $t('fire')].filter(Boolean);
	});

	const eaten = $derived(
		snap.duration > 0 ? Math.round(clamp01(1 - snap.remaining / snap.duration) * 24) : 0
	);
	const lives = $derived(Math.max(0, snap.lives));
	/** The language knob names the language it switches to. */
	const langLabel = $derived($t('language').slice(0, 2));
	const worldName = $derived($t(`world_${snap.world}`).toUpperCase());
</script>

<!-- The {@html} below is the screens' own static art (`seasonArt`, `screenArt`, built from
	constants): no text of the player or the network ever goes into it, so the XSS rule does not
	apply. -->
<!-- eslint-disable svelte/no-at-html-tags -->

{#snippet ropes(l1: number, r1: number, y1: number, l2: number, r2: number, y2: number)}
	{@html ropesArt(theme, { left: l1, right: r1, y: y1 }, { left: l2, right: r2, y: y2 })}
{/snippet}

{#snippet livesChip(x: number, y: number)}
	<!-- the board of the old death banner (320 x 104 art, board at 20,8), drawn at 0.65 -->
	<g transform="translate({x - 160 * 0.65} {y - 8 * 0.65}) scale(.65)">
		<g class="sway" style:--rot="-.8deg">
			{@html boardArt(theme, 'scr-death', 20, 8, 280, 62, { seed: 5, drop: 14 })}
		</g>
		<g transform="translate({lives === 1 ? 54 : 56} 40) scale(.85)">{@html heroArt(ms)}</g>
		{#if lives === 1}
			<text class="num red" x="188" y="56" font-size="34" text-anchor="middle"
				>{$t('lastLife').toUpperCase()}</text
			>
		{:else}
			<text class="num" x="112" y="58" font-size="38" text-anchor="middle">{lives}</text>
			<text class="lab" x="134" y="54" font-size="15">{$t('livesLeft').toUpperCase()}</text>
		{/if}
	</g>
{/snippet}

{#snippet defs()}
	<defs>
		<linearGradient id="scr-num" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color={theme.numTop} />
			<stop offset="1" stop-color={theme.num} />
		</linearGradient>
		<linearGradient id="scr-red" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#ffc7a0" />
			<stop offset="1" stop-color="#ff6a3a" />
		</linearGradient>
	</defs>
{/snippet}

{#snippet knob(
	x: number,
	y: number,
	label: string,
	size: number,
	name: string,
	onclick: () => void
)}
	<g
		class="hit"
		transform="translate({x} {y})"
		role="button"
		tabindex="-1"
		aria-label={name}
		onmousedown={noFocus}
		onclick={act(onclick)}
		onkeydown={noop}
	>
		<circle r="32" fill="transparent" />
		<g class="lift">
			{@html knobFaceArt(theme)}
			<text class="num" y={size * 0.36} font-size={size} text-anchor="middle">{label}</text>
		</g>
	</g>
{/snippet}

{#snippet plank(
	id: string,
	x: number,
	y: number,
	w: number,
	h: number,
	label: string,
	size: number,
	onclick: () => void,
	primary: boolean,
	seed: number,
	cls: string
)}
	<g
		class="hit"
		role="button"
		tabindex="-1"
		aria-label={label}
		onmousedown={noFocus}
		onclick={act(onclick)}
		onkeydown={noop}
	>
		<rect x={x - 8} y={y - 8} width={w + 16} height={h + 16} fill="transparent" />
		<g class="lift">
			<g class="sway {cls}" style:--rot="{seed % 2 ? 0.4 : -0.4}deg">
				{@html plankArt(theme, id, x, y, w, h, { primary, seed })}
				<text class="num" x={x + w / 2} y={y + h * 0.68} font-size={size} text-anchor="middle"
					>{label}</text
				>
			</g>
		</g>
	</g>
{/snippet}

<div
	class="screens"
	style:--label={theme.label}
	style:--ink-line={theme.ink}
	style:--num-ink={theme.numInk}
>
	{#if screen}
		<div class="veil" style:background="rgba(6,8,14,{VEIL[screen]})"></div>
		<svg
			class="screen"
			viewBox="0 0 {dims?.w} {dims?.h}"
			width={(dims?.w ?? 0) * k}
			height={(dims?.h ?? 0) * k}
			aria-label={screen}
		>
			{@render defs()}

			{#if screen === 'menu'}
				<g class="sway" style:--rot="-1deg">
					{@html boardArt(theme, 'scr-title', 30, 16, 460, 148, { seed: 5, drop: 44 })}
					<g transform="translate({ms ? 84 : 80} 96) scale(2)">{@html heroArt(ms)}</g>
					<text class="num" x={ms ? 296 : 290} y="118" font-size={ms ? 62 : 78} text-anchor="middle"
						>{ms ? 'MS. PAC-MAN' : 'PAC-MAN'}</text
					>
				</g>
				<g class="sway hang b" style:--rot="1deg">
					{@render ropes(190, 330, 160, 196, 324, 196)}
					{@html boardArt(theme, 'scr-high', 150, 196, 220, 44, {
						seed: 11,
						posts: false,
						r: 10,
						j: 3
					})}
					<text class="lab" x="168" y="224" font-size="12">{$t('high')}</text>
					<text class="num" x="352" y="230" font-size="26" text-anchor="end"
						>{fmt(snap.highScore)}</text
					>
				</g>
				{@render ropes(62, 458, 168, 118, 402, 392)}
				<rect
					x="140"
					y="326"
					width="240"
					height="26"
					rx="13"
					fill={theme.mid}
					stroke={theme.ink}
					stroke-width="4"
				/>
				<rect x="148" y="330" width="224" height="8" rx="4" fill={theme.light} opacity=".8" />
				<rect x="148" y="342" width="224" height="6" rx="3" fill={theme.shade} opacity=".8" />
				<ellipse cx="260" cy="356" rx="130" ry="6" fill="#000" opacity=".2" />
				{#each [false, true] as isMs (isMs)}
					{@const sel = ms === isMs}
					<g
						class="coin"
						transform="translate({isMs ? 315 : 205} {sel ? 282 : 292})"
						role="button"
						tabindex="-1"
						aria-label={isMs ? 'Ms. Pac-Man' : 'Pac-Man'}
						aria-pressed={sel}
						onmousedown={noFocus}
						onclick={act(() => chooseHero(isMs))}
						onkeydown={noop}
					>
						<circle r="44" fill="transparent" />
						<g class="lift">{@html coinArt(theme, isMs, sel)}</g>
					</g>
					<text class="lab" x={isMs ? 315 : 205} y="380" font-size="11" text-anchor="middle"
						>{isMs ? 'MS. PAC-MAN' : 'PAC-MAN'}</text
					>
				{/each}
				{@render plank(
					'scr-start',
					110,
					396,
					300,
					76,
					$t('start'),
					46,
					actions.confirm,
					true,
					4,
					'b'
				)}
				{@render knob(468, 434, langLabel, 18, $t('language'), toggleLang)}
				{@render ropes(140, 380, 474, 140, 380, 500)}
				{@html chalkArt(theme, 70, 500, 380, 110)}
				{#each help as line, i (i)}
					<text class="chalk" x="92" y={536 + i * 30} font-size="22">{line}</text>
				{/each}
			{:else if screen === 'ready'}
				<g transform="translate(0 {retry ? RETRY_LIFT : 0})">
					<g class="sway" style:--rot="0deg">
						{@html bannerSpanArt(theme, 30, 56, 480, 110)}
						<text class="num" x="270" y="140" font-size="90" text-anchor="middle"
							>{$t('ready')}</text
						>
					</g>
					{@render ropes(200, 340, 176, 206, 334, 204)}
					<g class="sway hang b" style:--rot=".8deg">
						{@html boardArt(theme, 'scr-where', 150, 204, 240, 50, {
							seed: 11,
							posts: false,
							r: 11,
							j: 3
						})}
						<text class="lab" x="270" y="236" font-size="16" text-anchor="middle"
							>{$t('level')} {snap.level} · {worldName}</text
						>
					</g>
					{@html trailArt(theme, eaten, 24, { x0: 60, x1: 430, y: 300, amp: 6 })}
				</g>
				{#if retry}
					{@render livesChip(270, 352)}
				{/if}
			{:else if screen === 'pause'}
				<g class="sway" style:--rot="-1deg">
					{@html boardArt(theme, 'scr-paused', 30, 16, 400, 100, { seed: 5, drop: 36 })}
					<text class="num" x="230" y="92" font-size="58" text-anchor="middle">{$t('paused')}</text>
				</g>
				{@render ropes(76, 384, 114, 106, 354, 164)}
				{@render plank(
					'scr-resume',
					80,
					164,
					300,
					64,
					$t('resume'),
					40,
					actions.pause,
					true,
					4,
					'b'
				)}
				{@render ropes(124, 336, 228, 130, 330, 250)}
				{@render plank(
					'scr-restart',
					100,
					250,
					260,
					56,
					$t('restart'),
					32,
					actions.restart,
					false,
					8,
					'hang'
				)}
				{@render ropes(130, 330, 306, 130, 330, 328)}
				{@render plank(
					'scr-menu',
					100,
					328,
					260,
					56,
					$t('menu'),
					32,
					actions.menu,
					false,
					9,
					'hang b'
				)}
				{@render knob(408, 362, langLabel, 18, $t('language'), toggleLang)}
			{:else}
				<g style="filter:grayscale(.5) brightness(.82)">
					<g class="sway" style:--rot="-1deg">
						{@html boardArt(theme, 'scr-over', 30, 16, 420, 112, { seed: 6, drop: 36 })}
						{@html cracksArt(theme, 30, 16, 420, 112)}
					</g>
				</g>
				<text class="num red" x="240" y="96" font-size="56" text-anchor="middle"
					>{$t('gameOver')}</text
				>
				{@render ropes(150, 330, 126, 156, 324, 158)}
				<g class="sway hang b" style:--rot=".7deg">
					{@html boardArt(theme, 'scr-score', 110, 158, 260, 104, {
						seed: 12,
						posts: false,
						r: 12,
						j: 3
					})}
					<text class="lab" x="132" y="188" font-size="14">{$t('score')}</text>
					<text class="num" x="350" y="246" font-size="60" text-anchor="end">{fmt(snap.score)}</text
					>
				</g>
				{#if record}
					<g transform="rotate(-7 400 160)">
						{@html ribbonArt(300, 138, 164, 30)}
						<text class="lab gold" x="382" y="159" font-size="12" text-anchor="middle"
							>{$t('newRecord')}</text
						>
					</g>
				{/if}
				{@render ropes(146, 334, 262, 136, 344, 306)}
				{@render plank(
					'scr-again',
					90,
					306,
					300,
					66,
					$t('playAgain'),
					38,
					actions.confirm,
					true,
					4,
					'b'
				)}
				{@render ropes(136, 344, 372, 140, 340, 394)}
				<g
					class="hit"
					role="button"
					tabindex="-1"
					aria-label={ms ? 'Pac-Man' : 'Ms. Pac-Man'}
					onmousedown={noFocus}
					onclick={act(actions.profile)}
					onkeydown={noop}
				>
					<g class="lift">
						<g class="sway hang" style:--rot="-.4deg">
							{@html plankArt(theme, 'scr-swap', 100, 394, 280, 58, { seed: 8 })}
							<g transform="translate(138 423) scale(.7)">{@html heroArt(!ms)}</g>
							<text class="num" x="262" y="434" font-size="26" text-anchor="middle"
								>{ms ? 'PAC-MAN' : 'MS. PAC-MAN'}</text
							>
						</g>
					</g>
				</g>
				{@render ropes(140, 340, 452, 140, 340, 474)}
				{@render plank(
					'scr-menu2',
					100,
					474,
					280,
					56,
					$t('menu'),
					32,
					actions.menu,
					false,
					9,
					'hang b'
				)}
			{/if}
		</svg>
	{/if}
</div>

<svelte:window bind:innerWidth bind:innerHeight />

<style>
	.screens {
		position: fixed;
		inset: 0;
		z-index: 30;
		pointer-events: none;
		display: grid;
		place-items: center;
	}
	.veil {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.screen {
		position: relative;
		display: block;
		overflow: visible;
		pointer-events: none;
	}
	.lab {
		font-family: Fredoka, 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif;
		font-weight: 600;
		letter-spacing: 2.4px;
		fill: var(--label);
		stroke: var(--ink-line);
		stroke-width: 3.2px;
		paint-order: stroke;
		stroke-linejoin: round;
	}
	.lab.gold {
		fill: #fff6d8;
	}
	.num {
		font-family: 'Lilita One', 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif;
		fill: url(#scr-num);
		stroke: var(--num-ink);
		stroke-width: 0.17em;
		paint-order: stroke;
		stroke-linejoin: round;
		font-variant-numeric: tabular-nums;
	}
	.num.red {
		fill: url(#scr-red);
	}
	.chalk {
		font-family: Caveat, 'Comic Sans MS', cursive;
		font-weight: 600;
		fill: #f3f0e0;
		opacity: 0.92;
	}
	.sway {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation: sway 6s ease-in-out infinite;
	}
	.sway.hang {
		transform-origin: 50% 0%;
	}
	.sway.b {
		animation-duration: 7.2s;
		animation-delay: -2s;
	}
	@keyframes sway {
		0%,
		100% {
			transform: rotate(calc(var(--rot, 0deg) - 0.6deg));
		}
		50% {
			transform: rotate(calc(var(--rot, 0deg) + 0.6deg));
		}
	}
	/* The hit target itself never moves: it carries the position (a `transform` attribute) and
	   the pointer, and a CSS transform on it would replace that attribute and, as the art slid
	   out from under the cursor, make the hover flicker. The art inside (`.lift`) moves. */
	.hit,
	.coin {
		pointer-events: all;
		cursor: pointer;
	}
	.lift {
		transition:
			transform 0.12s ease,
			filter 0.12s ease;
		transform-box: fill-box;
		transform-origin: 50% 50%;
	}
	.hit:hover > .lift,
	.coin:hover > .lift {
		transform: translateY(-3px);
		filter: brightness(1.1);
	}
	.hit:active > .lift {
		transform: translateY(1px) scale(0.98);
	}
	@media (prefers-reduced-motion: reduce) {
		.sway {
			animation: none;
		}
		.lift {
			transition: none;
		}
	}
</style>
