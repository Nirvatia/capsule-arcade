<!-- The HUD of the four season worlds, drawn as things that stand in the world: a score board
	and a record tag on stakes, a level board with a banner, a lives counter, a pellet trail for
	the food left, a dial with the world's energizer, a pause knob. It stands in the margins at
	both sides of the maze (landscape screens; narrower ones keep the bar, see `hudLayout`).
	The look is the owner's mock-up; the art is `seasonArt`, the materials `seasonThemes`. -->
<script lang="ts">
	import type { HudSnapshot } from '../hudSnapshot';
	import { t } from '../../i18n';
	import { hudScaleFor } from '../../../config/hudLayout';
	import {
		DIAL,
		ENERGIZER_ART,
		RING_LENGTH,
		boardArt,
		bannerArt,
		dialArt,
		emblemArt,
		heroArt,
		knobArt,
		ropesArt,
		trailArt
	} from './seasonArt';
	import { SEASON_THEMES } from './seasonThemes';
	import type { SeasonKey } from './seasonThemes';

	let { snap, onpause }: { snap: HudSnapshot; onpause: () => void } = $props();

	let innerHeight = $state(720);
	const theme = $derived(SEASON_THEMES[snap.world as SeasonKey]);
	const scale = $derived(hudScaleFor(innerHeight));

	/** The shapes that do not change while a world lasts. */
	const art = $derived({
		score: boardArt(theme, 'score', 28, 46, 210, 88, { seed: 5, drop: 40 }),
		ropes: ropesArt(theme),
		tag: boardArt(theme, 'tag', 52, 160, 162, 42, { seed: 11, posts: false, r: 10, j: 3 }),
		level: boardArt(theme, 'level', 1042, 46, 210, 88, { seed: 9, drop: 44 }),
		emblem: emblemArt(theme),
		banner: bannerArt(theme),
		lives: boardArt(theme, 'lives', 1076, 206, 142, 46, { seed: 17, drop: 22, r: 11, j: 3 }),
		dial: dialArt(theme),
		energizer: ENERGIZER_ART[theme.energizer],
		knob: knobArt(theme)
	});

	const PELLETS = 14;
	const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
	const fmt = (n: number) => Math.max(0, Math.floor(n)).toLocaleString('en-US').replace(/,/g, ' ');
	const eaten = $derived(Math.round(clamp01(snap.dots) * PELLETS));
	const trail = $derived(trailArt(theme, eaten, PELLETS));
	const ratio = $derived(
		snap.timer && snap.timer.duration > 0 ? clamp01(snap.timer.remaining / snap.timer.duration) : 0
	);
	const timerLabel = $derived(snap.timer ? $t(snap.timer.kind) : $t('power'));
	/** The world's own night starts at three quarters of the dots; the board dims with it. */
	const night = $derived(snap.dots >= 0.75);
	const ms = $derived(snap.profile === 'ms-pacman');
	const lives = $derived(Math.max(0, snap.lives));
</script>

<!-- The {@html} below is the HUD's own static art (`seasonArt`, built from constants): no text of
	the player or the network ever goes into it, so the XSS rule does not apply. -->
<!-- eslint-disable svelte/no-at-html-tags -->
<svelte:window bind:innerHeight />

<div
	class="shud"
	class:night
	style:--ink={theme.ink}
	style:--label={theme.label}
	style:--num-ink={theme.numInk}
	aria-label="HUD"
>
	<span class="sr">
		{$t('score')}
		{fmt(snap.score)}, {$t('high')}
		{fmt(snap.highScore)}, {$t('level')}
		{snap.level}
		{$t(`world_${snap.world}`)}, {$t('lives')}
		{lives}
	</span>

	<svg
		class="left"
		viewBox="0 0 250 200"
		width={250 * scale}
		height={200 * scale}
		aria-hidden="true"
	>
		<defs>
			<linearGradient id="shud-num" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color={theme.numTop} />
				<stop offset="1" stop-color={theme.num} />
			</linearGradient>
		</defs>
		<g transform="translate(-10 -30)">
			<g class="sway" style:--rot="-1.4deg">
				{@html art.score}
				<text class="lab" x="46" y="74" font-size="12">{$t('score')}</text>
				<text class="num" x="224" y="120" font-size="42" text-anchor="end">{fmt(snap.score)}</text>
			</g>
			<g class="sway hang b" style:--rot="1deg">
				{@html art.ropes}
				{@html art.tag}
				<text class="lab" x="66" y="177" font-size="10">{$t('high')}</text>
				<text class="num" x="200" y="193" font-size="22" text-anchor="end"
					>{fmt(snap.highScore)}</text
				>
			</g>
		</g>
	</svg>

	<svg
		class="right"
		viewBox="0 0 240 480"
		width={240 * scale}
		height={480 * scale}
		aria-hidden="true"
	>
		<g transform="translate(-1026 0)">
			<g class="sway b" style:--rot="1.3deg">
				{@html art.level}
				<g transform="translate(1076 90) scale(.78)">{@html art.emblem}</g>
				<text class="lab" x="1106" y="74" font-size="12">{$t('level')}</text>
				<text class="num" x="1232" y="118" font-size="46" text-anchor="end">{snap.level}</text>
			</g>
			<g class="sway hang" style:--rot="-1deg">
				{@html art.banner}
				<text class="lab" x="1147" y="165" font-size="13" text-anchor="middle"
					>{$t(`world_${snap.world}`).toUpperCase()}</text
				>
			</g>
			<g class="sway c" style:--rot=".8deg">
				{@html art.lives}
				<g transform="translate(1100 236)"><g class="bob">{@html heroArt(ms)}</g></g>
				<text class="lab" x="1124" y="223" font-size="9">{$t('lives')}</text>
				<text class="num" x="1214" y="248" font-size="28" text-anchor="end">×{lives}</text>
			</g>

			{@html trail}
			<text class="lab" x="1056" y="334" font-size="10">{$t('food')}</text>
			<text class="num" x="1244" y="340" font-size="20" text-anchor="end"
				>{Math.round(clamp01(snap.dots) * 100)}%</text
			>

			{@html art.dial}
			<circle
				class="ring"
				cx={DIAL.cx}
				cy={DIAL.cy}
				r={DIAL.r - 5}
				fill="none"
				stroke={theme.ring}
				stroke-width="6"
				stroke-linecap="round"
				stroke-dasharray={RING_LENGTH}
				stroke-dashoffset={RING_LENGTH * (1 - ratio)}
				transform="rotate(-90 {DIAL.cx} {DIAL.cy})"
			/>
			<g class:idle={!snap.timer} transform="translate({DIAL.cx} {DIAL.cy - 2}) scale(.5)">
				<g class="bob">{@html art.energizer}</g>
			</g>
			<text class="lab" x={DIAL.cx} y={DIAL.cy + DIAL.r + 28} font-size="9" text-anchor="middle"
				>{timerLabel}</text
			>
			{#if snap.timer}
				<text class="num" x={DIAL.cx} y={DIAL.cy + 22} font-size="16" text-anchor="middle"
					>{snap.timer.remaining.toFixed(1)}s</text
				>
			{/if}
		</g>
		<g
			class="knob"
			transform="translate(214 24) scale(.8)"
			role="button"
			tabindex="-1"
			aria-label={$t('pause')}
			onmousedown={(event) => event.preventDefault()}
			onclick={onpause}
			onkeydown={() => {}}
		>
			<circle r="30" fill="transparent" />
			{@html art.knob}
			<rect
				x="-8"
				y="-9"
				width="5"
				height="18"
				rx="2"
				fill={theme.num}
				stroke={theme.ink}
				stroke-width="2"
			/>
			<rect
				x="3"
				y="-9"
				width="5"
				height="18"
				rx="2"
				fill={theme.num}
				stroke={theme.ink}
				stroke-width="2"
			/>
		</g>
	</svg>
</div>

<style>
	.shud {
		position: fixed;
		inset: 0;
		z-index: 20;
		pointer-events: none;
		transition: filter 2s ease;
	}
	.shud.night {
		filter: brightness(0.72) saturate(0.9);
	}
	svg {
		position: absolute;
		top: 0;
		display: block;
		overflow: visible;
	}
	.left {
		left: env(safe-area-inset-left, 0px);
	}
	.right {
		right: env(safe-area-inset-right, 0px);
	}
	.lab {
		font-family: Fredoka, 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif;
		font-weight: 600;
		letter-spacing: 2.4px;
		fill: var(--label);
		stroke: var(--ink);
		stroke-width: 3.2px;
		paint-order: stroke;
		stroke-linejoin: round;
	}
	.num {
		font-family: 'Lilita One', 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif;
		font-weight: 800;
		fill: url(#shud-num);
		stroke: var(--num-ink);
		stroke-width: 0.17em;
		paint-order: stroke;
		stroke-linejoin: round;
		font-variant-numeric: tabular-nums;
	}
	.ring {
		transition: stroke-dashoffset 0.1s linear;
	}
	.idle {
		opacity: 0.35;
	}
	.knob {
		pointer-events: all;
		cursor: pointer;
	}
	.knob:hover {
		filter: brightness(1.12);
	}
	.sway {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation: sway 5.5s ease-in-out infinite;
	}
	.sway.hang {
		transform-origin: 50% 0%;
	}
	.sway.b {
		animation-duration: 6.8s;
		animation-delay: -2s;
	}
	.sway.c {
		animation-duration: 7.4s;
		animation-delay: -4s;
	}
	:global(.shud .bob) {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation: bob 2.4s ease-in-out infinite;
	}
	.idle :global(.bob) {
		animation: none;
	}
	@keyframes sway {
		0%,
		100% {
			transform: rotate(calc(var(--rot, 0deg) - 0.7deg));
		}
		50% {
			transform: rotate(calc(var(--rot, 0deg) + 0.7deg));
		}
	}
	@keyframes bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
	}
	.sr {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	@media (prefers-reduced-motion: reduce) {
		.sway,
		:global(.shud .bob) {
			animation: none;
		}
	}
</style>
