<!-- The season HUD for tall and squarish screens: the same things as `SeasonHud`, smaller and
	in two bands, one above the maze and one below it (the board leaves them free, see
	`hudLayout`). Top: the score board and the record tag, the level board with its banner,
	and the lives. Bottom: the food trail, the energizer's dial in the middle, the pause knob
	at the right; the sound knob (`MuteButton`) stands at the left. -->
<script lang="ts">
	import type { HudSnapshot } from '../hudSnapshot';
	import { t } from '../../i18n';
	import { HUD_STACK_BAND, HUD_STACK_WIDTH } from '../../../config/hudLayout';
	import { clamp01, fmt } from './seasonFormat';
	import {
		ENERGIZER_ART,
		bannerArt,
		boardArt,
		dialArt,
		emblemArt,
		heroArt,
		knobArt,
		ringLength,
		ropesArt,
		trailArt
	} from './seasonArt';
	import type { Dial, TrailBox } from './seasonArt';
	import { SEASON_THEMES } from './seasonThemes';
	import type { SeasonKey } from './seasonThemes';

	let { snap, scale, onpause }: { snap: HudSnapshot; scale: number; onpause: () => void } =
		$props();

	const theme = $derived(SEASON_THEMES[snap.world as SeasonKey]);

	const DIAL: Dial = { cx: 200, cy: 116, r: 30 };
	const TRAIL: TrailBox = { x0: 24, x1: 376, y: 34, amp: 6 };
	const RING = ringLength(DIAL);
	const PELLETS = 20;

	/** The shapes that do not change while a world lasts. */
	const art = $derived({
		score: boardArt(theme, 'score', 10, 12, 178, 66, { seed: 5, drop: 12 }),
		ropes: ropesArt(theme, 'M44 76 L50 96 M154 76 L148 96'),
		tag: boardArt(theme, 'tag', 28, 96, 140, 34, { seed: 11, posts: false, r: 9, j: 3 }),
		level: boardArt(theme, 'level', 206, 12, 184, 66, { seed: 9, drop: 12 }),
		emblem: emblemArt(theme),
		banner: bannerArt(theme, { x: 230, y: 90, w: 136, h: 24 }),
		lives: boardArt(theme, 'lives', 236, 124, 118, 38, { seed: 17, drop: 8, r: 9, j: 2 }),
		dial: dialArt(theme, DIAL),
		energizer: ENERGIZER_ART[theme.energizer],
		knob: knobArt(theme)
	});

	const eaten = $derived(Math.round(clamp01(snap.dots) * PELLETS));
	const trail = $derived(trailArt(theme, eaten, PELLETS, TRAIL));
	const ratio = $derived(
		snap.timer && snap.timer.duration > 0 ? clamp01(snap.timer.remaining / snap.timer.duration) : 0
	);
	const timerLabel = $derived(snap.timer ? $t(snap.timer.kind) : $t('power'));
	const night = $derived(snap.dots >= 0.75);
	const ms = $derived(snap.profile === 'ms-pacman');
	const lives = $derived(Math.max(0, snap.lives));
</script>

<!-- The {@html} below is the HUD's own static art (`seasonArt`, built from constants): no text of
	the player or the network ever goes into it, so the XSS rule does not apply. -->
<!-- eslint-disable svelte/no-at-html-tags -->

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
		class="top"
		viewBox="0 0 {HUD_STACK_WIDTH} {HUD_STACK_BAND}"
		width={HUD_STACK_WIDTH * scale}
		height={HUD_STACK_BAND * scale}
		aria-hidden="true"
	>
		<defs>
			<linearGradient id="shud-num" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stop-color={theme.numTop} />
				<stop offset="1" stop-color={theme.num} />
			</linearGradient>
		</defs>
		<g class="sway" style:--rot="-1.4deg">
			{@html art.score}
			<text class="lab" x="26" y="34" font-size="10">{$t('score')}</text>
			<text class="num" x="176" y="68" font-size="36" text-anchor="end">{fmt(snap.score)}</text>
		</g>
		<g class="sway hang b" style:--rot="1deg">
			{@html art.ropes}
			{@html art.tag}
			<text class="lab" x="42" y="111" font-size="8">{$t('high')}</text>
			<text class="num" x="156" y="124" font-size="18" text-anchor="end">{fmt(snap.highScore)}</text
			>
		</g>
		<g class="sway b" style:--rot="1.3deg">
			{@html art.level}
			<g transform="translate(232 46) scale(.56)">{@html art.emblem}</g>
			<text class="lab" x="260" y="34" font-size="10">{$t('level')}</text>
			<text class="num" x="378" y="68" font-size="38" text-anchor="end">{snap.level}</text>
		</g>
		<g class="sway hang" style:--rot="-1deg">
			{@html art.banner}
			<text class="lab" x="298" y="106" font-size="11" text-anchor="middle"
				>{$t(`world_${snap.world}`).toUpperCase()}</text
			>
		</g>
		<g class="sway c" style:--rot=".8deg">
			{@html art.lives}
			<g transform="translate(257 143) scale(.7)"><g class="bob">{@html heroArt(ms)}</g></g>
			<text class="lab" x="278" y="136" font-size="8">{$t('lives')}</text>
			<text class="num" x="346" y="154" font-size="22" text-anchor="end">×{lives}</text>
		</g>
	</svg>

	<svg
		class="bottom"
		viewBox="0 0 {HUD_STACK_WIDTH} {HUD_STACK_BAND}"
		width={HUD_STACK_WIDTH * scale}
		height={HUD_STACK_BAND * scale}
		aria-hidden="true"
	>
		{@html trail}
		<text class="lab" x="24" y="60" font-size="10">{$t('food')}</text>
		<text class="num" x="376" y="64" font-size="18" text-anchor="end"
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
			stroke-dasharray={RING}
			stroke-dashoffset={RING * (1 - ratio)}
			transform="rotate(-90 {DIAL.cx} {DIAL.cy})"
		/>
		<g class:idle={!snap.timer} transform="translate({DIAL.cx} {DIAL.cy - 2}) scale(.44)">
			<g class="bob">{@html art.energizer}</g>
		</g>
		<text class="lab" x={DIAL.cx} y={DIAL.cy + DIAL.r + 24} font-size="9" text-anchor="middle"
			>{timerLabel}</text
		>
		{#if snap.timer}
			<text class="num" x={DIAL.cx} y={DIAL.cy + 19} font-size="13" text-anchor="middle"
				>{snap.timer.remaining.toFixed(1)}s</text
			>
		{/if}

		<g
			class="knob"
			transform="translate(352 132) scale(.9)"
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
		left: 50%;
		translate: -50% 0;
		display: block;
		overflow: visible;
	}
	.top {
		top: 0;
	}
	.bottom {
		bottom: 0;
	}
	.lab {
		font-family: Fredoka, 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif;
		font-weight: 600;
		letter-spacing: 1.8px;
		fill: var(--label);
		stroke: var(--ink);
		stroke-width: 2.6px;
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
