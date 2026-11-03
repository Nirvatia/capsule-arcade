<script lang="ts">
	import { Action } from '../core/types';
	import type { GameMain } from '../GameMain';
	import PiecePreview from './PiecePreview.svelte';
	import { ui } from './store.svelte';

	interface Props {
		game: GameMain;
		compact: boolean;
		cell: number;
	}

	let { game, compact, cell }: Props = $props();
</script>

<button
	type="button"
	class="t-paper hold"
	class:t-paper--sm={compact}
	class:hold--compact={compact}
	aria-label="Склад: отложить фигуру"
	onclick={() => game.tap(Action.HOLD)}
>
	<span class="t-tab">СКЛАД</span>
	<span class="t-well hold__well">
		<PiecePreview type={ui.hold} {cell} dim={ui.holdUsed} />
	</span>
	{#if !compact}
		<span class="hold__foot">
			<span class="t-hand hold__note">на чёрный день</span>
			<kbd class="t-mono hold__key">C</kbd>
		</span>
		{#if ui.hold !== null}
			{#key ui.hold}
				<span class="t-stamp t-stamp--in hold__stamp">ОПРИХОДОВАНО</span>
			{/key}
		{/if}
	{/if}
</button>

<style>
	.hold {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		width: 100%;
		font: inherit;
		text-align: left;
		cursor: pointer;
		transform: rotate(-1deg);
		touch-action: manipulation;
	}

	.hold__well {
		display: grid;
		place-items: center;
		height: 96px;
	}

	.hold__foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 8px;
	}

	.hold__note {
		font-size: 21px;
	}

	.hold__key {
		padding: 1px 6px;
		font-size: 11px;
		border: 1.5px solid rgba(23, 18, 16, 0.5);
	}

	.hold__stamp {
		position: absolute;
		right: -16px;
		top: 30px;
		font-size: 11px;
		background: rgba(239, 229, 204, 0.6);
	}

	.hold--compact {
		transform: none;
	}

	.hold--compact .hold__well {
		height: auto;
		padding: 6px 0;
		border: 0;
	}

	.hold:active {
		filter: brightness(0.96);
	}
</style>
