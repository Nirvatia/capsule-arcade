<!-- The HUD of a boss level (the hell's), in bone, flesh and ember (the owner's skeleton: the
	same things as the season HUD, and the boss's own). Above the maze: the boss's health bar (a
	riveted iron plate, `BossBar`) with three phase compartments that drain from the right; once he falls, the reward hint
	hangs there instead. Beside the maze, or in two bands on a tall screen: the score board and the
	record tag, the level board with its banner, the lives counter, the hero's hearts on a bone rail
	(the health on this level, apart from the lives) and a dial with the weapon in hand and its ring
	(the BFG's charge, or the berserk running down). The pause knob stands in the corner. -->
<script lang="ts">
	import type { HudSnapshot } from '../hudSnapshot';
	import { t } from '../../i18n';
	import {
		HUD_BOSS_BAR_SIDE,
		HUD_BOSS_BAR_STACK,
		HUD_STACK_BAND,
		HUD_STACK_WIDTH
	} from '../../../config/hudLayout';
	import type { HudMode } from '../../../config/hudLayout';
	import { clamp01, fmt } from './seasonFormat';
	import {
		bannerArt,
		boardArt,
		dialArt,
		emblemArt,
		heroArt,
		knobArt,
		ringLength,
		ropesArt
	} from './seasonArt';
	import type { Dial } from './seasonArt';
	import { HELL_THEME } from './seasonThemes';
	import { BERSERK_RING, WEAPON_ART, heartArt, railArt } from './hellArt';
	import BossBar from './BossBar.svelte';

	let {
		snap,
		scale,
		mode,
		onpause
	}: { snap: HudSnapshot; scale: number; mode: HudMode; onpause: () => void } = $props();

	const theme = HELL_THEME;
	const boss = $derived(snap.boss);
	const ms = $derived(snap.profile === 'ms-pacman');
	const lives = $derived(Math.max(0, snap.lives));

	/** The weapon's ring: the BFG's charge filling, or the berserk running down (10 s at most). */
	const ring = $derived.by(() => {
		if (!boss) return { ratio: 0, color: '#ff9a4a' };
		if (boss.weapon === 'berserk')
			return { ratio: clamp01(boss.berserk / 10), color: BERSERK_RING };
		if (boss.charge > 0) return { ratio: clamp01(boss.charge), color: '#7dff5a' };
		return { ratio: 0, color: '#7dff5a' };
	});
	const weaponKey = $derived(boss && boss.weapon ? boss.weapon : null);
	const weaponLabel = $derived(weaponKey ? $t(weaponKey) : $t('none'));
	const weaponValue = $derived(
		!boss
			? ''
			: boss.weapon === 'berserk'
				? `${boss.berserk.toFixed(1)}s`
				: boss.charge > 0
					? `${Math.round(boss.charge * 100)}%`
					: ''
	);
	const hearts = $derived(
		boss ? Array.from({ length: boss.playerHpMax }, (_, i) => i < boss.playerHp) : []
	);
	const reward = $derived(Boolean(boss && boss.defeated && boss.rewardOffered));

	/** The dial: round and a little bigger beside the maze, where the food trail is not needed. */
	const SIDE_DIAL: Dial = { cx: 121, cy: 330, r: 40 };
	const STACK_DIAL: Dial = { cx: 200, cy: 116, r: 30 };
	const dial = $derived(mode === 'side' ? SIDE_DIAL : STACK_DIAL);
	const RING_SIDE = ringLength(SIDE_DIAL);
	const RING_STACK = ringLength(STACK_DIAL);
	const ringLen = $derived(mode === 'side' ? RING_SIDE : RING_STACK);

	const art = $derived({
		banner:
			mode === 'side'
				? bannerArt(theme, { x: 60, y: 20, w: 480, h: 36 })
				: bannerArt(theme, { x: 30, y: 14, w: 340, h: 30 }),
		dial: dialArt(theme, dial),
		knob: knobArt(theme),
		emblem: emblemArt(theme),
		weapon: weaponKey ? WEAPON_ART[weaponKey] : '',
		// the side layout, in the coordinates of the season HUD (the groups are translated)
		sScore: boardArt(theme, 'score', 28, 46, 210, 88, { seed: 5, drop: 40 }),
		sRopes: ropesArt(theme),
		sTag: boardArt(theme, 'tag', 52, 160, 162, 42, { seed: 11, posts: false, r: 10, j: 3 }),
		sRail: railArt(theme, 40, 250, 198),
		sLevel: boardArt(theme, 'level', 1042, 46, 210, 88, { seed: 9, drop: 44 }),
		sBanner: bannerArt(theme),
		sLives: boardArt(theme, 'lives', 1076, 206, 142, 46, { seed: 17, drop: 22, r: 11, j: 3 }),
		// the stacked layout
		kScore: boardArt(theme, 'kscore', 10, 12, 178, 66, { seed: 5, drop: 12 }),
		kRopes: ropesArt(theme, 'M44 76 L50 96 M154 76 L148 96'),
		kTag: boardArt(theme, 'ktag', 28, 96, 140, 34, { seed: 11, posts: false, r: 9, j: 3 }),
		kLevel: boardArt(theme, 'klevel', 206, 12, 184, 66, { seed: 9, drop: 12 }),
		kBanner: bannerArt(theme, { x: 230, y: 90, w: 136, h: 24 }),
		kLives: boardArt(theme, 'klives', 236, 124, 118, 38, { seed: 17, drop: 8, r: 9, j: 2 }),
		kRail: railArt(theme, 110, 66, 180)
	});
</script>

<!-- The {@html} below is the HUD's own static art (`seasonArt`, `hellArt`, built from constants):
	no text of the player or the network ever goes into it, so the XSS rule does not apply. -->
<!-- eslint-disable svelte/no-at-html-tags -->

{#snippet bar(w: number)}
	{#if boss && !boss.defeated}
		<BossBar
			{w}
			hp={boss.hp}
			hpMax={boss.hpMax}
			marks={boss.marks}
			phase={boss.phase}
			name={mode === 'side' ? `BLINKY · ${$t('boss_hell')}` : 'BLINKY'}
			phaseLabel={$t('phase')}
			uid="boss-bar-{mode}"
		/>
	{:else if reward}
		<g class="sway hang" style:--rot="0deg">
			{@html art.banner}
			<text
				class="lab"
				x={w / 2}
				y={mode === 'side' ? 44 : 34}
				font-size={mode === 'side' ? 15 : 11}
				text-anchor="middle">{$t('rewardHint')}</text
			>
		</g>
	{/if}
{/snippet}

{#snippet pauseKnob(x: number, y: number, k: number)}
	<g
		class="knob"
		transform="translate({x} {y}) scale({k})"
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
{/snippet}

{#snippet weaponDial(fs: number, k: number)}
	{@html art.dial}
	{#if weaponKey === 'berserk'}
		<circle class="rage" cx={dial.cx} cy={dial.cy} r={dial.r - 3} fill="rgba(190,22,16,.7)" />
	{/if}
	<circle
		class="ring"
		cx={dial.cx}
		cy={dial.cy}
		r={dial.r - 5}
		fill="none"
		stroke={ring.color}
		stroke-width="6"
		stroke-linecap="round"
		stroke-dasharray={ringLen}
		stroke-dashoffset={ringLen * (1 - ring.ratio)}
		transform="rotate(-90 {dial.cx} {dial.cy})"
	/>
	<g
		class:idle={!weaponKey}
		transform="translate({dial.cx} {dial.cy - 2}) scale({weaponKey === 'berserk' ? k * 1.22 : k})"
	>
		<g class="bob">{@html art.weapon}</g>
	</g>
	<text
		class="lab"
		x={dial.cx}
		y={dial.cy + dial.r + (mode === 'side' ? 28 : 24)}
		font-size={fs}
		text-anchor="middle">{weaponLabel}</text
	>
	{#if weaponValue}
		<text
			class="num"
			x={dial.cx}
			y={dial.cy + dial.r * 0.62}
			font-size={mode === 'side' ? 17 : 13}
			text-anchor="middle">{weaponValue}</text
		>
	{/if}
{/snippet}

<div
	class="shud hell"
	style:--ink={theme.ink}
	style:--label={theme.label}
	style:--num-ink={theme.numInk}
	aria-label="HUD"
>
	<span class="sr">
		{$t('score')}
		{fmt(snap.score)}, {$t('level')}
		{snap.level}
		{$t('world_hell')}, {$t('lives')}
		{lives}{boss ? `, ${$t('hp')} ${boss.playerHp}/${boss.playerHpMax}` : ''}
	</span>

	{#if mode === 'side'}
		<svg
			class="boss"
			viewBox="0 0 600 {HUD_BOSS_BAR_SIDE}"
			width={600 * scale}
			height={HUD_BOSS_BAR_SIDE * scale}
			aria-hidden="true"
		>
			{@render bar(600)}
		</svg>

		<svg
			class="left"
			viewBox="0 0 250 262"
			width={250 * scale}
			height={262 * scale}
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
					{@html art.sScore}
					<text class="lab" x="46" y="74" font-size="12">{$t('score')}</text>
					<text class="num" x="224" y="120" font-size="42" text-anchor="end">{fmt(snap.score)}</text
					>
				</g>
				<g class="sway hang b" style:--rot="1deg">
					{@html art.sRopes}
					{@html art.sTag}
					<text class="lab" x="66" y="177" font-size="10">{$t('high')}</text>
					<text class="num" x="200" y="193" font-size="22" text-anchor="end"
						>{fmt(snap.highScore)}</text
					>
				</g>
				<g>
					{@html art.sRail}
					<text class="lab" x="52" y="280" font-size="9">{$t('hp')}</text>
					{#each hearts as full, i (i)}
						<g transform="translate({92 + i * 46} 238)">
							<g class:beat={full}>{@html heartArt(full)}</g>
						</g>
					{/each}
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
					{@html art.sLevel}
					<g transform="translate(1076 90) scale(.78)">{@html art.emblem}</g>
					<text class="lab" x="1106" y="74" font-size="12">{$t('level')}</text>
					<text class="num" x="1232" y="118" font-size="46" text-anchor="end">{snap.level}</text>
				</g>
				<g class="sway hang" style:--rot="-1deg">
					{@html art.sBanner}
					<text class="lab" x="1147" y="165" font-size="13" text-anchor="middle"
						>{$t('world_hell').toUpperCase()}</text
					>
				</g>
				<g class="sway c" style:--rot=".8deg">
					{@html art.sLives}
					<g transform="translate(1100 236)"><g class="bob">{@html heroArt(ms)}</g></g>
					<text class="lab" x="1124" y="223" font-size="9">{$t('lives')}</text>
					<text class="num" x="1214" y="248" font-size="28" text-anchor="end">×{lives}</text>
				</g>
				<g transform="translate(1026 0)">{@render weaponDial(10, 0.62)}</g>
			</g>
			{@render pauseKnob(214, 24, 0.8)}
		</svg>
	{:else}
		<svg
			class="top"
			viewBox="0 0 {HUD_STACK_WIDTH} {HUD_STACK_BAND + HUD_BOSS_BAR_STACK}"
			width={HUD_STACK_WIDTH * scale}
			height={(HUD_STACK_BAND + HUD_BOSS_BAR_STACK) * scale}
			aria-hidden="true"
		>
			<defs>
				<linearGradient id="shud-num" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stop-color={theme.numTop} />
					<stop offset="1" stop-color={theme.num} />
				</linearGradient>
			</defs>
			{@render bar(400)}
			<g transform="translate(0 {HUD_BOSS_BAR_STACK})">
				<g class="sway" style:--rot="-1.4deg">
					{@html art.kScore}
					<text class="lab" x="26" y="34" font-size="10">{$t('score')}</text>
					<text class="num" x="176" y="68" font-size="36" text-anchor="end">{fmt(snap.score)}</text>
				</g>
				<g class="sway hang b" style:--rot="1deg">
					{@html art.kRopes}
					{@html art.kTag}
					<text class="lab" x="42" y="111" font-size="8">{$t('high')}</text>
					<text class="num" x="156" y="124" font-size="18" text-anchor="end"
						>{fmt(snap.highScore)}</text
					>
				</g>
				<g class="sway b" style:--rot="1.3deg">
					{@html art.kLevel}
					<g transform="translate(232 46) scale(.56)">{@html art.emblem}</g>
					<text class="lab" x="260" y="34" font-size="10">{$t('level')}</text>
					<text class="num" x="378" y="68" font-size="38" text-anchor="end">{snap.level}</text>
				</g>
				<g class="sway hang" style:--rot="-1deg">
					{@html art.kBanner}
					<text class="lab" x="298" y="106" font-size="11" text-anchor="middle"
						>{$t('world_hell').toUpperCase()}</text
					>
				</g>
				<g class="sway c" style:--rot=".8deg">
					{@html art.kLives}
					<g transform="translate(257 143) scale(.7)"><g class="bob">{@html heroArt(ms)}</g></g>
					<text class="lab" x="278" y="136" font-size="8">{$t('lives')}</text>
					<text class="num" x="346" y="154" font-size="22" text-anchor="end">×{lives}</text>
				</g>
			</g>
		</svg>

		<svg
			class="bottom"
			viewBox="0 0 {HUD_STACK_WIDTH} {HUD_STACK_BAND}"
			width={HUD_STACK_WIDTH * scale}
			height={HUD_STACK_BAND * scale}
			aria-hidden="true"
		>
			{@html art.kRail}
			<text class="lab" x="24" y="46" font-size="10">{$t('hp')}</text>
			{#each hearts as full, i (i)}
				<g transform="translate({152 + i * 48} 44) scale(.9)">
					<g class:beat={full}>{@html heartArt(full)}</g>
				</g>
			{/each}
			{@render weaponDial(9, 0.44)}
			{@render pauseKnob(352, 132, 0.9)}
		</svg>
	{/if}
</div>

<style>
	.shud {
		position: fixed;
		inset: 0;
		z-index: 20;
		pointer-events: none;
	}
	svg {
		position: absolute;
		display: block;
		overflow: visible;
	}
	.boss,
	.top,
	.bottom {
		left: 50%;
		translate: -50% 0;
	}
	.boss,
	.top {
		top: 0;
	}
	.bottom {
		bottom: 0;
	}
	.left {
		top: 0;
		left: env(safe-area-inset-left, 0px);
	}
	.right {
		top: 0;
		right: env(safe-area-inset-right, 0px);
	}
	.lab {
		font-family: Fredoka, 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif;
		font-weight: 600;
		letter-spacing: 2.2px;
		fill: var(--label);
		stroke: var(--ink);
		stroke-width: 3px;
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
		filter: drop-shadow(0 0 3px rgba(255, 90, 42, 0.55));
		animation: ember 2.5s ease-in-out infinite;
	}
	.ring {
		transition: stroke-dashoffset 0.1s linear;
	}
	.rage {
		animation: rage 0.9s ease-in-out infinite alternate;
	}
	@keyframes rage {
		from {
			opacity: 0.55;
		}
		to {
			opacity: 1;
		}
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
	.beat {
		transform-box: fill-box;
		transform-origin: 50% 55%;
		animation: beat 2.5s ease-in-out infinite;
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
	/* the hell's heartbeat: a strong beat and a weaker one, every 2.5 s */
	@keyframes beat {
		0%,
		30%,
		100% {
			transform: scale(1);
		}
		8% {
			transform: scale(1.14);
		}
		18% {
			transform: scale(1.06);
		}
	}
	@keyframes ember {
		0%,
		100% {
			opacity: 0.88;
		}
		8% {
			opacity: 1;
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
		.beat,
		.rage,
		.num,
		:global(.shud .bob) {
			animation: none;
		}
	}
</style>
