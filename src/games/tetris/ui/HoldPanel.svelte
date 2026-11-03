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
	class="t-panel hold"
	class:hold--compact={compact}
	class:hold--used={ui.holdUsed}
	aria-label="Склад: отложить фигуру"
	onclick={() => game.tap(Action.HOLD)}
>
	<span class="t-panel__title">СКЛАД</span>
	<span class="hold__well">
		<PiecePreview type={ui.hold} {cell} dim={ui.holdUsed} />
	</span>
	{#if !compact}
		<span class="hold__hint">[C] — отложить фигуру на чёрный день</span>
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
		padding: 12px 0;
		background: var(--t-well);
		border: 2px solid var(--t-ink);
	}

	.hold__hint {
		margin-top: 8px;
		font-family: var(--t-font-body);
		font-size: 11px;
		letter-spacing: 0.05em;
		opacity: 0.6;
	}

	.hold--compact {
		padding: 16px 4px 4px;
		transform: none;
		border-width: 2px;
		box-shadow: 3px 3px 0 rgba(15, 8, 6, 0.55);
	}

	.hold--compact :global(.t-panel__title) {
		top: -9px;
		left: 50%;
		padding: 1px 6px;
		font-size: 9px;
		letter-spacing: 0.08em;
		transform: translateX(-50%) skewX(-8deg);
		border-width: 1.5px;
	}

	.hold--compact .hold__well {
		padding: 6px 0;
	}

	.hold:active {
		filter: brightness(0.95);
	}
</style>
