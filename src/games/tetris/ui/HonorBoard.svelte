<script lang="ts">
	import { MODES } from '../core/modes';
	import { EndReason } from '../core/types';
	import { rankFor } from '../theme/texts';
	import { formatScore, formatTime } from './format';
	import { ui } from './store.svelte';

	interface Props {
		limit?: number;
		highlight?: number;
		note?: boolean;
	}

	let { limit = 3, highlight = -1, note = false }: Props = $props();

	const byTime = $derived(MODES[ui.mode].rankByTime);
	const fmt = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' });
	const entries = $derived(
		ui.records.slice(0, limit).map((r, i) => ({
			key: `${r.date}-${i}`,
			value: byTime ? formatTime(r.timeMs) : formatScore(r.score),
			rank: rankFor({
				mode: ui.mode,
				reason: byTime ? EndReason.GOAL : EndReason.TOPOUT,
				score: r.score,
				timeMs: r.timeMs
			}).rank.short,
			date: fmt.format(r.date),
			me: i === highlight
		}))
	);
</script>

<section class="t-paper board">
	<h3 class="t-tab">ДОСКА ПОЧЁТА</h3>
	{#if entries.length === 0}
		<p class="t-label board__empty">Пока пусто — стань первым</p>
	{:else}
		<ol class="board__list">
			{#each entries as e, i (e.key)}
				<li class="board__row" class:board__row--me={e.me}>
					<span class="board__place">№{i + 1}</span>
					<span class="board__photo" aria-hidden="true">
						<svg viewBox="0 0 24 28"
							><circle cx="12" cy="10" r="6" /><path d="M1 28c1-8 6-11 11-11s10 3 11 11z" /></svg
						>
						{#if i === 0}<i></i>{/if}
					</span>
					<span class="board__text">
						<b>{e.value}</b>
						<small>{e.me ? `${e.rank} · это вы` : e.rank}</small>
					</span>
					<span class="t-mono board__date">{e.date}</span>
				</li>
			{/each}
		</ol>
	{/if}
	{#if note}
		<p class="t-hand board__note">Фото на доску — после трёх рекордов подряд. Таков порядок.</p>
	{/if}
</section>

<style>
	.board {
		padding-bottom: 10px;
		transform: rotate(0.5deg);
	}

	.board__empty {
		margin: 4px 0;
		opacity: 0.6;
	}

	.board__list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.board__row {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 6px 4px;
		border-bottom: 2px dotted rgba(23, 18, 16, 0.28);
	}

	.board__row--me {
		background: linear-gradient(
			100deg,
			transparent 1%,
			rgba(242, 196, 90, 0.6) 3%,
			rgba(242, 196, 90, 0.5) 96%,
			transparent 99%
		);
	}

	.board__place {
		width: 24px;
		font-family: var(--t-font-display);
		font-size: 12px;
	}

	.board__photo {
		position: relative;
		display: grid;
		place-items: end center;
		width: 32px;
		height: 40px;
		flex: none;
		overflow: hidden;
		background: linear-gradient(180deg, #d8ccb0, #b9ab8c);
		border: 2px solid var(--t-ink);
		box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.25);
	}

	.board__photo svg {
		width: 26px;
		height: 30px;
		fill: #5e5346;
	}

	.board__photo i {
		position: absolute;
		right: -6px;
		top: 3px;
		width: 22px;
		height: 6px;
		background: var(--t-red);
		transform: rotate(40deg);
	}

	.board__text {
		display: flex;
		flex-direction: column;
		flex-grow: 1;
		line-height: 1.15;
	}

	.board__text b {
		font-family: var(--t-font-display);
		font-size: 17px;
		font-weight: 400;
	}

	.board__text small {
		font-size: 11px;
		letter-spacing: 0.06em;
		opacity: 0.7;
	}

	.board__date {
		font-size: 11px;
		opacity: 0.55;
	}

	.board__note {
		margin: 12px 0 0;
		font-size: 20px;
		line-height: 1.1;
		transform: rotate(-2deg);
	}
</style>
