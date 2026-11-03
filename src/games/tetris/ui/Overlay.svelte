<script lang="ts">
	import { Phase } from '../core/types';
	import type { GameMain } from '../GameMain';
	import PauseScreen from './PauseScreen.svelte';
	import ShiftReport from './ShiftReport.svelte';
	import StartScreen from './StartScreen.svelte';
	import { ui } from './store.svelte';

	interface Props {
		game: GameMain;
		touch: boolean;
	}

	let { game, touch }: Props = $props();
</script>

{#if ui.phase === Phase.IDLE}
	<StartScreen {game} {touch} />
{:else if ui.phase === Phase.PAUSED}
	<PauseScreen {game} {touch} />
{:else if ui.phase === Phase.GAMEOVER && ui.result}
	<ShiftReport {game} {touch} result={ui.result} />
{/if}
