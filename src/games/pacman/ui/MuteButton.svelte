<!-- The sound switch: a knob in the bottom-left corner, made of the same stuff as the season
	HUD (a wooden or icy disc, ink line, a glint) in the colours of the world on screen, and the
	volume slider beside it (it slides out on hover; on a touch screen it stays out when there
	is room beside the board). Neither keeps focus, so Space, Enter and the arrows keep driving
	the game after a click or a drag. Moving the volume up from silence unmutes. -->
<script lang="ts">
	import { muted, volume } from '../audio/audioSettings';
	import { t } from './i18n';
	import { hudFrame } from './hud/hudFrame';
	import { HELL_THEME, SEASON_THEMES, isSeasonKey } from './hud/season/seasonThemes';
	import { hudLayoutFor } from '../config/hudLayout';

	let innerWidth = $state(1280);
	let innerHeight = $state(720);
	const label = $derived($muted ? $t('unmute') : $t('mute'));
	// the hell has its bone; the other worlds (the arcade, the menu) use the autumn's dark wood
	const theme = $derived(
		$hudFrame?.world === 'hell'
			? HELL_THEME
			: SEASON_THEMES[$hudFrame && isSeasonKey($hudFrame.world) ? $hudFrame.world : 'autumn']
	);
	const layout = $derived(hudLayoutFor(innerWidth, innerHeight));
	// stacked, the knob stands in the bottom band's row with the dial and the pause knob
	const size = $derived(Math.round((layout.mode === 'stack' ? 46 : 54) * layout.scale));
	const gap = $derived(Math.round(14 * layout.scale));
	const percent = $derived(Math.round($volume * 100));

	function onVolume(event: Event & { currentTarget: HTMLInputElement }): void {
		const value = Number(event.currentTarget.value) / 100;
		volume.set(value);
		if (value > 0 && $muted) {
			muted.set(false);
		}
	}
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<div
	class="sound"
	class:roomy={layout.mode === 'side'}
	style:left="max({gap}px, env(safe-area-inset-left, 0px))"
	style:bottom="max({gap}px, env(safe-area-inset-bottom, 0px))"
	style:height="{size}px"
	style:--ink={theme.ink}
	style:--mid={theme.mid}
	style:--light={theme.light}
	style:--shade={theme.shade}
	style:--num={theme.num}
	style:--p="{percent}%"
	style:--knob="{size}px"
>
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
	<input
		class="slider"
		type="range"
		min="0"
		max="100"
		step="1"
		value={percent}
		aria-label={$t('volume')}
		title="{$t('volume')}: {percent} %"
		tabindex="-1"
		oninput={onVolume}
		onpointerup={(event) => event.currentTarget.blur()}
		onchange={(event) => event.currentTarget.blur()}
	/>
</div>

<style>
	.sound {
		position: fixed;
		z-index: 100;
		display: flex;
		align-items: center;
		gap: calc(var(--knob) * 0.18);
	}
	.mute {
		flex: none;
		display: block;
		padding: 0;
		border: 0;
		background: none;
		cursor: pointer;
	}
	/* the volume: a groove in the HUD's material, the filled part in the numbers' colour, a knob */
	.slider {
		width: calc(var(--knob) * 2.6);
		height: calc(var(--knob) * 0.5);
		margin: 0;
		background: none;
		cursor: pointer;
		appearance: none;
		opacity: 0;
		transform: translateX(-8px);
		pointer-events: none;
		transition:
			opacity 0.15s ease,
			transform 0.15s ease;
	}
	.sound:hover .slider,
	.slider:active,
	.slider:focus {
		opacity: 1;
		transform: none;
		pointer-events: auto;
	}
	@media (hover: none) {
		.sound.roomy .slider {
			opacity: 1;
			transform: none;
			pointer-events: auto;
		}
	}
	.slider::-webkit-slider-runnable-track {
		height: calc(var(--knob) * 0.2);
		border: 2px solid var(--ink);
		border-radius: 999px;
		background: linear-gradient(90deg, var(--num) var(--p), var(--shade) var(--p));
	}
	.slider::-moz-range-track {
		height: calc(var(--knob) * 0.2);
		border: 2px solid var(--ink);
		border-radius: 999px;
		background: linear-gradient(90deg, var(--num) var(--p), var(--shade) var(--p));
	}
	.slider::-webkit-slider-thumb {
		appearance: none;
		width: calc(var(--knob) * 0.42);
		height: calc(var(--knob) * 0.42);
		margin-top: calc(var(--knob) * -0.11 - 2px);
		border: 2px solid var(--ink);
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, var(--light), var(--mid));
	}
	.slider::-moz-range-thumb {
		width: calc(var(--knob) * 0.42);
		height: calc(var(--knob) * 0.42);
		border: 2px solid var(--ink);
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, var(--light), var(--mid));
	}
	/* the button stays put under the cursor; only its art moves, or the hover would flicker */
	.mute svg {
		display: block;
		width: 100%;
		height: 100%;
		overflow: visible;
		transition:
			transform 0.12s ease,
			filter 0.12s ease;
	}
	.mute:hover svg {
		transform: translateY(-2px) rotate(-3deg);
		filter: brightness(1.1);
	}
	.mute.off svg {
		filter: saturate(0.7);
	}
	.mute.off:hover svg {
		filter: saturate(0.7) brightness(1.1);
	}
	@media (prefers-reduced-motion: reduce) {
		.mute svg,
		.slider {
			transition: none;
		}
	}
</style>
