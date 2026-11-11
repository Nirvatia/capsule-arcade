<!-- The sound switch: a knob in the bottom-left corner, made of the same stuff as the season
	HUD (a wooden or icy disc, ink line, a glint) in the colours of the world on screen. It
	never takes focus, so Space and Enter keep driving the game after a click. -->
<script lang="ts">
	import { muted } from '../audio/audioSettings';
	import { t } from './i18n';
	import { hudFrame } from './hud/hudFrame';
	import { SEASON_THEMES, isSeasonKey } from './hud/season/seasonThemes';
	import { hudScaleFor } from '../config/hudLayout';

	let innerHeight = $state(720);
	const label = $derived($muted ? $t('unmute') : $t('mute'));
	// the other worlds (the hell, the arcade, the menu) use the autumn's dark wood
	const theme = $derived(
		SEASON_THEMES[$hudFrame && isSeasonKey($hudFrame.world) ? $hudFrame.world : 'autumn']
	);
	const size = $derived(Math.round(54 * hudScaleFor(innerHeight)));
</script>

<svelte:window bind:innerHeight />

<button
	type="button"
	class="mute"
	class:off={$muted}
	style:width="{size}px"
	style:height="{size}px"
	aria-pressed={$muted}
	aria-label={label}
	title={label}
	tabindex="-1"
	onmousedown={(event) => event.preventDefault()}
	onclick={() => muted.toggle()}
>
	<svg viewBox="-30 -30 60 60" aria-hidden="true">
		<ellipse cx="3" cy="25" rx="22" ry="5" fill="#000" opacity="0.3" />
		<circle r="24" fill={theme.mid} stroke={theme.ink} stroke-width="4" />
		<path
			d="M-18 -9 A21 21 0 0 1 9 -19"
			fill="none"
			stroke={theme.light}
			stroke-width="4"
			stroke-linecap="round"
			opacity="0.85"
		/>
		<path
			d="M-12 -14 A24 24 0 0 0 0 20"
			fill="none"
			stroke={theme.shade}
			stroke-width="5"
			opacity="0.5"
		/>
		<g stroke={theme.ink} stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
			<path d="M-13 -5 H-7 L1 -12 V12 L-7 5 H-13Z" fill={theme.num} />
			{#if $muted}
				<path d="M7 -6 L16 6 M16 -6 L7 6" fill="none" stroke={theme.ink} stroke-width="6" />
				<path d="M7 -6 L16 6 M16 -6 L7 6" fill="none" stroke="#ff5a4a" stroke-width="3" />
			{:else}
				<path d="M7 -6 A9 9 0 0 1 7 6" fill="none" stroke={theme.ink} stroke-width="6" />
				<path d="M7 -6 A9 9 0 0 1 7 6" fill="none" stroke={theme.num} stroke-width="3" />
				<path d="M12 -11 A15 15 0 0 1 12 11" fill="none" stroke={theme.ink} stroke-width="6" />
				<path d="M12 -11 A15 15 0 0 1 12 11" fill="none" stroke={theme.num} stroke-width="3" />
			{/if}
		</g>
	</svg>
</button>

<style>
	.mute {
		position: fixed;
		bottom: max(14px, env(safe-area-inset-bottom, 0px));
		left: max(14px, env(safe-area-inset-left, 0px));
		z-index: 100;
		display: block;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
		transition:
			transform 0.12s ease,
			filter 0.12s ease;
	}
	.mute svg {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
	}
	.mute:hover {
		transform: translateY(-2px) rotate(-3deg);
		filter: brightness(1.1);
	}
	.mute.off {
		filter: saturate(0.7);
	}
	@media (prefers-reduced-motion: reduce) {
		.mute {
			transition: none;
		}
	}
</style>
