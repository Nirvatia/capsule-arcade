<script lang="ts">
	import { PIECE_NAMES } from '../theme/texts';
	import PiecePreview from './PiecePreview.svelte';
	import { ui } from './store.svelte';

	interface Props {
		compact: boolean;
		cell: number;
	}

	let { compact, cell }: Props = $props();

	const shown = $derived(ui.next.slice(0, compact ? 4 : 5));
	const small = $derived(Math.max(6, Math.round(cell * (compact ? 0.82 : 0.78))));
</script>

{#if compact}
	<div class="t-paper t-paper--sm mini">
		<span class="t-tab">НАКЛ.</span>
		{#each shown as type, i (i)}
			<span class="mini__item" class:mini__item--next={i === 0}>
				<PiecePreview {type} cell={i === 0 ? cell : small} />
			</span>
		{/each}
		<span class="mini__otk">ОТК</span>
	</div>
{:else}
	<section class="t-paper invoice">
		<h3 class="t-tab">НАКЛАДНАЯ № {ui.shiftNo}</h3>
		<div class="invoice__head t-mono">
			<span>№</span><span>ЭСКИЗ</span><span>НАИМЕНОВАНИЕ</span><span>КОЛ.</span>
		</div>
		<ol class="invoice__list">
			{#each shown as type, i (i)}
				<li class="invoice__row" class:invoice__row--next={i === 0}>
					<span class="t-mono">{i + 1}</span>
					<span class="invoice__sketch">
						<PiecePreview
							{type}
							cell={i === 0 ? Math.round(cell * 0.64) : Math.round(cell * 0.5)}
						/>
					</span>
					<span class="t-mono invoice__name">{PIECE_NAMES[type]}</span>
					<span class="t-mono invoice__qty">1 шт.</span>
				</li>
			{/each}
		</ol>
		<div class="invoice__foot">
			<span class="t-mono">Принял <span class="t-hand">Игрок</span></span>
			<span class="invoice__otk">ОТК ✓</span>
		</div>
	</section>
{/if}

<style>
	.invoice {
		padding-bottom: 10px;
		transform: rotate(0.8deg);
	}

	.invoice__head,
	.invoice__row {
		display: grid;
		grid-template-columns: 18px 62px 1fr auto;
		align-items: center;
		gap: 8px;
	}

	.invoice__head {
		padding: 0 2px 4px;
		font-size: 10px;
		letter-spacing: 0.06em;
		opacity: 0.55;
		border-bottom: 2px solid var(--t-ink);
	}

	.invoice__list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.invoice__row {
		min-height: 34px;
		padding: 5px 2px;
		font-size: 12px;
		border-bottom: 1px solid rgba(23, 18, 16, 0.18);
		opacity: 0.85;
	}

	.invoice__row--next {
		opacity: 1;
		background: linear-gradient(
			100deg,
			transparent 2%,
			rgba(242, 196, 90, 0.55) 4%,
			rgba(242, 196, 90, 0.45) 94%,
			transparent 97%
		);
	}

	.invoice__sketch {
		display: grid;
		place-items: center;
	}

	.invoice__name {
		font-size: 13px;
		white-space: nowrap;
	}

	.invoice__qty {
		opacity: 0.65;
	}

	.invoice__foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 8px;
		font-size: 11px;
	}

	.invoice__foot .t-hand {
		font-size: 20px;
	}

	.invoice__otk {
		padding: 2px 9px;
		font-family: var(--t-font-display);
		font-size: 10px;
		color: var(--t-stamp);
		border: 2px solid var(--t-stamp);
		border-radius: 50%;
		opacity: 0.85;
		transform: rotate(10deg);
	}

	.mini {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		padding-bottom: 8px;
		background-color: #f3ecdb;
	}

	.mini__item {
		opacity: 0.8;
	}

	.mini__item--next {
		opacity: 1;
	}

	.mini__otk {
		padding: 1px 5px;
		font-family: var(--t-font-display);
		font-size: 8px;
		color: var(--t-stamp);
		border: 1.5px solid var(--t-stamp);
		border-radius: 50%;
		transform: rotate(10deg);
	}
</style>
