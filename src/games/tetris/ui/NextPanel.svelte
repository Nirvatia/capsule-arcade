<script lang="ts">
	import PiecePreview from './PiecePreview.svelte';
	import { ui } from './store.svelte';

	interface Props {
		compact: boolean;
		cell: number;
	}

	let { compact, cell }: Props = $props();

	const shown = $derived(ui.next.slice(0, compact ? 4 : 5));
</script>

<section class="t-panel next" class:next--compact={compact}>
	<h3 class="t-panel__title">{compact ? 'ДАЛЕЕ' : 'ПОСТАВКА'}</h3>
	<ol class="next__list">
		{#each shown as type, i (i)}
			<li class="next__item" class:next__item--first={i === 0}>
				<PiecePreview {type} cell={i === 0 ? cell : Math.max(6, Math.round(cell * 0.72))} />
			</li>
		{/each}
	</ol>
	{#if !compact}
		<p class="next__hint">Что привезли — то и укладываем</p>
	{/if}
</section>

<style>
	.next {
		transform: rotate(1deg);
	}

	.next__list {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		margin: 0;
		padding: 14px 0;
		list-style: none;
		background: var(--t-well);
		border: 2px solid var(--t-ink);
	}

	.next__item {
		opacity: 0.8;
	}

	.next__item--first {
		opacity: 1;
		padding-bottom: 10px;
		margin-bottom: 2px;
		border-bottom: 1px dashed rgba(237, 227, 203, 0.2);
	}

	.next__hint {
		margin: 8px 0 0;
		font-family: var(--t-font-body);
		font-size: 11px;
		letter-spacing: 0.05em;
		opacity: 0.6;
	}

	.next--compact {
		padding: 16px 4px 4px;
		transform: none;
		border-width: 2px;
		box-shadow: 3px 3px 0 rgba(15, 8, 6, 0.55);
	}

	.next--compact :global(.t-panel__title) {
		top: -9px;
		left: 50%;
		padding: 1px 6px;
		font-size: 9px;
		letter-spacing: 0.08em;
		transform: translateX(-50%) skewX(-8deg);
		border-width: 1.5px;
	}

	.next--compact .next__list {
		gap: 8px;
		padding: 8px 0;
	}

	.next--compact .next__item--first {
		padding-bottom: 8px;
	}
</style>
