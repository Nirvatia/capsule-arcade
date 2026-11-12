<!-- One weapon dial at a given size: the dial's own art, the ring and an icon. -->
<script lang="ts">
	import { dialArt, ringLength } from '../../../src/games/pacman/ui/hud/season/seasonArt';
	import type { Dial } from '../../../src/games/pacman/ui/hud/season/seasonArt';
	import { HELL_THEME } from '../../../src/games/pacman/ui/hud/season/seasonThemes';

	let {
		icon,
		ring,
		ratio,
		rage = false,
		big = false,
		size = 120,
		label = ''
	}: {
		icon: string;
		ring: string;
		ratio: number;
		rage?: boolean;
		big?: boolean;
		size?: number;
		label?: string;
	} = $props();

	const D: Dial = { cx: 50, cy: 50, r: 40 };
	const len = ringLength(D);
	const art = dialArt(HELL_THEME, D);
</script>

<!-- eslint-disable svelte/no-at-html-tags -->
<svg viewBox="-4 -4 108 118" width={size} height={size * (118 / 108)} aria-label={label}>
	{@html art}
	{#if rage}
		<circle class="rage" cx="50" cy="50" r="37" fill="rgba(190,22,16,.7)" />
	{/if}
	<circle
		cx="50"
		cy="50"
		r="35"
		fill="none"
		stroke={ring}
		stroke-width="6"
		stroke-linecap="round"
		stroke-dasharray={len}
		stroke-dashoffset={len * (1 - ratio)}
		transform="rotate(-90 50 50)"
	/>
	<g transform="translate(50 48) scale({big ? 0.76 : 0.62})">{@html icon}</g>
</svg>

<style>
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
</style>
