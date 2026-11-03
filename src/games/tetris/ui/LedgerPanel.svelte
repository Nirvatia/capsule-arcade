<script lang="ts">
	import { ModeId, MODES } from '../core/modes';
	import { levelName } from '../theme/texts';
	import { formatScore, formatTime } from './format';
	import { ui } from './store.svelte';

	interface Props {
		compact: boolean;
	}

	let { compact }: Props = $props();

	interface Row {
		label: string;
		value: string;
		tone?: 'red' | 'gold';
	}

	const mode = $derived(MODES[ui.mode]);
	const best = $derived(ui.records[0]);
	const remaining = $derived(
		mode.timeLimitMs !== null ? Math.max(0, mode.timeLimitMs - ui.elapsedMs) : 0
	);

	const rows = $derived.by((): Row[] => {
		if (ui.mode === ModeId.SPRINT) {
			return [
				{ label: 'Время', value: formatTime(ui.elapsedMs), tone: 'red' },
				{ label: 'Рядов уложено', value: `${ui.lines} / ${mode.goalLines ?? 0}` },
				{ label: 'Очки труда', value: formatScore(ui.score) },
				{ label: 'Рекорд', value: best ? formatTime(best.timeMs) : '—', tone: 'gold' }
			];
		}
		const list: Row[] = [
			{ label: 'Очки труда', value: formatScore(ui.score) },
			{ label: 'Рядов уложено', value: String(ui.lines) },
			{ label: 'Пятилетка', value: `№ ${ui.level}`, tone: 'red' },
			{ label: 'Объект', value: `«${levelName(ui.level)}»` },
			{ label: 'Рекорд', value: formatScore(Math.max(best?.score ?? 0, ui.score)), tone: 'gold' }
		];
		if (ui.mode === ModeId.ULTRA) {
			list.unshift({ label: 'До гудка', value: formatTime(remaining, false), tone: 'red' });
			list.splice(3, 1);
		}
		return list;
	});
</script>

{#if compact}
	<div class="t-paper t-paper--sm mini">
		<span class="t-tab">ТАБЕЛЬ</span>
		{#if ui.mode === ModeId.SPRINT}
			<span class="mini__label">ВРЕМЯ</span>
			<span class="mini__big mini__big--sm t-mono">{formatTime(ui.elapsedMs)}</span>
			<span class="mini__label mini__gap">РЯДОВ</span>
			<span class="mini__value t-mono">{ui.lines}/{mode.goalLines}</span>
		{:else}
			{#if ui.mode === ModeId.ULTRA}
				<span class="mini__label">ДО ГУДКА</span>
				<span class="mini__big mini__big--sm t-mono">{formatTime(remaining, false)}</span>
				<span class="mini__label mini__gap">ПЯТИЛЕТКА</span>
			{:else}
				<span class="mini__label">ПЯТИЛЕТКА</span>
			{/if}
			<span class="mini__big">№{ui.level}</span>
			<span class="mini__name">«{levelName(ui.level)}»</span>
			<span class="mini__label mini__gap">РЯДОВ</span>
			<span class="mini__value t-mono">{ui.lines}</span>
		{/if}
		<span class="t-hand mini__sign">тов. Игрок</span>
	</div>
	{#if ui.combo > 0}
		<span class="badge">СЕРИЯ ×{ui.combo}</span>
	{/if}
	{#if ui.backToBack}
		<span class="badge badge--gold">НОРМА ×2</span>
	{/if}
{:else}
	<section class="t-paper t-ruled ledger">
		<h3 class="t-tab">ТАБЕЛЬ УЧЁТА ТРУДА</h3>
		<dl class="ledger__rows">
			{#each rows as row (row.label)}
				<div class="ledger__row">
					<dt class="t-label">{row.label}</dt>
					<span class="ledger__dots"></span>
					<dd class="t-mono ledger__value ledger__value--{row.tone ?? 'ink'}">{row.value}</dd>
				</div>
			{/each}
		</dl>
		<div class="ledger__sign">
			<span class="t-label">Бригадир</span>
			<span class="t-hand">тов. Игрок</span>
		</div>
		<div class="ledger__badges">
			<span class="ledger__badge" class:ledger__badge--on={ui.combo > 0}>СЕРИЯ ×{ui.combo}</span>
			<span class="ledger__badge" class:ledger__badge--on={ui.backToBack}>ДВОЙНАЯ НОРМА</span>
		</div>
	</section>
{/if}

<style>
	.ledger {
		transform: rotate(0.6deg);
	}

	.ledger__rows {
		margin: 0;
	}

	.ledger__row {
		display: flex;
		align-items: baseline;
		gap: 6px;
		height: 28px;
		padding-left: 10px;
	}

	.ledger__row dt {
		white-space: nowrap;
	}

	.ledger__dots {
		flex-grow: 1;
		border-bottom: 2px dotted rgba(23, 18, 16, 0.32);
		transform: translateY(-4px);
	}

	.ledger__value {
		margin: 0;
		font-size: 16px;
		font-weight: 700;
		white-space: nowrap;
	}

	.ledger__value--red {
		color: var(--t-red);
	}

	.ledger__value--gold {
		color: #9a6a0c;
	}

	.ledger__sign {
		display: flex;
		align-items: flex-end;
		gap: 8px;
		margin-top: 10px;
		padding-left: 10px;
	}

	.ledger__sign .t-label {
		font-size: 11px;
		opacity: 0.65;
	}

	.ledger__sign .t-hand {
		font-size: 25px;
		transform: rotate(-3deg);
	}

	.ledger__badges {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
		margin-top: 14px;
	}

	.ledger__badge {
		padding: 6px 0;
		font-family: var(--t-font-display);
		font-size: 11px;
		letter-spacing: 0.06em;
		text-align: center;
		color: rgba(23, 18, 16, 0.32);
		border: 2px dashed rgba(23, 18, 16, 0.25);
		transition:
			background 0.2s,
			color 0.2s;
	}

	.ledger__badge--on {
		color: var(--t-cream);
		background: var(--t-red);
		border: 2px solid var(--t-ink);
		box-shadow: 2px 2px 0 var(--t-ink);
	}

	.mini {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		background-image: repeating-linear-gradient(
			0deg,
			transparent 0 15px,
			rgba(36, 65, 143, 0.14) 15px 16px
		);
	}

	.mini__label {
		font-size: 9px;
		letter-spacing: 0.14em;
		opacity: 0.6;
	}

	.mini__gap {
		margin-top: 8px;
	}

	.mini__big {
		font-family: var(--t-font-display);
		font-size: 22px;
		line-height: 1;
		color: var(--t-red);
	}

	.mini__big--sm {
		font-family: var(--t-font-mono);
		font-size: 15px;
		font-weight: 700;
	}

	.mini__name {
		margin-top: 2px;
		font-size: 10px;
		line-height: 1.1;
	}

	.mini__value {
		font-size: 17px;
		font-weight: 700;
		line-height: 1;
	}

	.mini__sign {
		margin-top: 8px;
		font-size: 15px;
		transform: rotate(-5deg);
	}

	.badge {
		padding: 4px 0;
		font-family: var(--t-font-display);
		font-size: 11px;
		text-align: center;
		color: var(--t-cream);
		background: var(--t-red);
		border: 2px solid var(--t-ink);
		box-shadow: 2px 2px 0 var(--t-ink);
	}

	.badge--gold {
		color: var(--t-ink);
		background: var(--t-gold);
	}
</style>
