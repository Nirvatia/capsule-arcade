<!-- The sound switch, a speaker in the top-left corner. It never takes focus, so Space and
	Enter keep driving the game after a click. The place is temporary: the interface is
	redone in part III. -->
<script lang="ts">
	import { muted } from '../audio/audioSettings';
	import { t } from './i18n';

	const label = $derived($muted ? $t('unmute') : $t('mute'));
</script>

<button
	type="button"
	class="mute"
	aria-pressed={$muted}
	aria-label={label}
	title={label}
	tabindex="-1"
	onmousedown={(event) => event.preventDefault()}
	onclick={() => muted.toggle()}
>
	<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
		<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
		{#if $muted}
			<path
				d="M16 9l5 6M21 9l-5 6"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				fill="none"
			/>
		{:else}
			<path
				d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				fill="none"
			/>
		{/if}
	</svg>
</button>

<style>
	.mute {
		position: fixed;
		top: max(12px, env(safe-area-inset-top, 0px));
		left: max(12px, env(safe-area-inset-left, 0px));
		z-index: 100;
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		padding: 0;
		border: 2px solid #ffc84a;
		border-radius: 12px;
		background: rgba(6, 8, 14, 0.92);
		color: #ffc84a;
		cursor: pointer;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
	}
	/* on a narrow screen the HUD spans the top, so the button sits at the left edge, mid-height */
	@media (max-width: 720px) {
		.mute {
			top: 50%;
			transform: translateY(-50%);
		}
	}
	.mute[aria-pressed='true'] {
		border-color: #ff6a5a;
		color: #ff6a5a;
	}
	.mute:hover {
		background: rgba(30, 24, 8, 0.95);
	}
</style>
