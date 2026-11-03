<script lang="ts">
	import { ui } from './store.svelte';

	const fmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' });
</script>

<section class="t-panel records">
	<h3 class="t-panel__title">ДОСКА ПОЧЁТА</h3>
	{#if ui.records.length === 0}
		<p class="records__empty t-label">Пока пусто — стань первым</p>
	{:else}
		<ol class="records__list">
			{#each ui.records as record, i (record.date)}
				<li class="records__item">
					<span class="records__rank">{i + 1}</span>
					<span class="records__score">{String(record.score).padStart(6, '0')}</span>
					<span class="records__meta">{record.lines} р · {fmt.format(record.date)}</span>
				</li>
			{/each}
		</ol>
	{/if}
</section>

<style>
	.records {
		transform: rotate(-0.8deg);
	}

	.records__empty {
		margin: 4px 0;
		opacity: 0.6;
	}

	.records__list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.records__item {
		display: grid;
		grid-template-columns: 22px 1fr auto;
		align-items: baseline;
		gap: 6px;
		padding: 5px 0;
		border-bottom: 2px dotted rgba(23, 18, 16, 0.3);
	}

	.records__item:first-child .records__rank {
		color: var(--t-paper);
		background: var(--t-red);
	}

	.records__rank {
		display: grid;
		place-items: center;
		height: 20px;
		font-family: var(--t-font-display);
		font-size: 11px;
		border: 2px solid var(--t-ink);
	}

	.records__score {
		font-family: var(--t-font-display);
		font-size: 17px;
		font-variant-numeric: tabular-nums;
	}

	.records__meta {
		font-family: var(--t-font-body);
		font-size: 11px;
		opacity: 0.6;
	}
</style>
