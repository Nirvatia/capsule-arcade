<svelte:options namespace="svg" />

<!--
	The energizer's power on its own small dial beside the ability's: the season's energizer as
	it lies on the board, a ring draining with the power and the seconds left. Shown only while
	the power (her overdrive) runs; the ability's dial never carries it.
-->
<script lang="ts">
	import type { HudTimer } from '../hudSnapshot';
	import { t } from '../../i18n';
	import { clamp01 } from './seasonFormat';
	import { dialArt, ringLength, type Dial } from './seasonArt';
	import type { SeasonTheme } from './seasonThemes';
	import { energizerIcon } from './energizerIcon';

	let {
		power,
		world,
		theme,
		dial
	}: { power: HudTimer; world: string; theme: SeasonTheme; dial: Dial } = $props();

	const ring = $derived(ringLength(dial));
	const ratio = $derived(power.duration > 0 ? clamp01(power.remaining / power.duration) : 0);
	const icon = $derived(energizerIcon(world));
	const size = $derived(dial.r * 1.15);
</script>

<!-- The {@html} is the HUD's own static dial art (`dialArt`, built from constants): no text of
	the player or the network goes into it, so the XSS rule does not apply. -->
<!-- eslint-disable svelte/no-at-html-tags -->
<g class="badge">
	{@html dialArt(theme, dial)}
	<circle
		cx={dial.cx}
		cy={dial.cy}
		r={dial.r - 5}
		fill="none"
		stroke={theme.ring}
		stroke-width="4.5"
		stroke-linecap="round"
		stroke-dasharray={ring}
		stroke-dashoffset={ring * (1 - ratio)}
		transform="rotate(-90 {dial.cx} {dial.cy})"
	/>
	{#if icon}
		<image
			href={icon}
			x={dial.cx - size / 2}
			y={dial.cy - size / 2 - dial.r * 0.12}
			width={size}
			height={size}
		/>
	{/if}
	<text
		class="num"
		x={dial.cx}
		y={dial.cy + dial.r * 0.62}
		font-size={dial.r * 0.42}
		text-anchor="middle">{power.remaining.toFixed(1)}s</text
	>
	<text class="lab" x={dial.cx} y={dial.cy + dial.r + 15} font-size="8" text-anchor="middle"
		>{$t(power.kind)}</text
	>
</g>

<style>
	.badge {
		animation: pop 0.25s ease-out;
		transform-box: fill-box;
		transform-origin: 50% 50%;
	}
	@keyframes pop {
		from {
			transform: scale(0.6);
			opacity: 0;
		}
	}
	/* the HUD's own lettering (its variables and its #shud-num gradient come from the HUD) */
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
	@media (prefers-reduced-motion: reduce) {
		.badge {
			animation: none;
		}
	}
</style>
