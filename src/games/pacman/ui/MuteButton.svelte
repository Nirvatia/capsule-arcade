<!-- The sound switch, a speaker in the bottom-right corner. It never takes focus, so Space and
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
	<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
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
		bottom: 12px;
		right: 12px;
		z-index: 45;
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		padding: 0;
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 10px;
		background: rgba(6, 8, 14, 0.8);
		color: #dfe8f2;
		cursor: pointer;
	}
	.mute[aria-pressed='true'] {
		color: #ff7a6a;
	}
	.mute:hover {
		border-color: rgba(255, 255, 255, 0.6);
	}
</style>
