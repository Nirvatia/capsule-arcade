<script lang="ts">
	import { gravityMs, LINES_PER_LEVEL } from '../config';
	import { ui } from './store.svelte';

	interface Props {
		compact: boolean;
	}

	let { compact }: Props = $props();

	const progress = $derived(ui.lines % LINES_PER_LEVEL);
	const tempo = $derived((gravityMs(1) / gravityMs(ui.level)).toFixed(1));
	const pad = (n: number, len: number): string => String(n).padStart(len, '0');
</script>

{#if compact}
	<div class="mini">
		<div class="mini__item">
			<span class="mini__label">ПЛАН</span>
			<span class="mini__value">{ui.level}</span>
		</div>
		<div class="mini__item">
			<span class="mini__label">РЯДЫ</span>
			<span class="mini__value">{ui.lines}</span>
		</div>
		<div class="mini__bar" aria-label="Прогресс пятилетки {progress} из {LINES_PER_LEVEL}">
			<i style:height="{(progress / LINES_PER_LEVEL) * 100}%"></i>
		</div>
		{#if ui.combo > 0}
			<span class="mini__badge">×{ui.combo}</span>
		{/if}
		{#if ui.backToBack}
			<span class="mini__badge mini__badge--gold">B2B</span>
		{/if}
	</div>
{:else}
	<section class="t-panel stats">
		<h3 class="t-panel__title">СВОДКА</h3>
		<dl class="stats__list">
			<div class="stats__row">
				<dt class="t-label">Очки труда</dt>
				<dd>{pad(ui.score, 6)}</dd>
			</div>
			<div class="stats__row">
				<dt class="t-label">Рядов уложено</dt>
				<dd>{ui.lines}</dd>
			</div>
			<div class="stats__row">
				<dt class="t-label">Пятилетка №</dt>
				<dd>{ui.level}</dd>
			</div>
			<div class="stats__row">
				<dt class="t-label">Рекорд бригады</dt>
				<dd class="stats__gold">{pad(Math.max(ui.best, ui.score), 6)}</dd>
			</div>
		</dl>
		<div class="stats__plan">
			<span class="t-label">План: <b>{progress}/{LINES_PER_LEVEL}</b></span>
			<span class="t-label">Темп <b>×{tempo}</b></span>
		</div>
		<div class="stats__bar"><i style:width="{(progress / LINES_PER_LEVEL) * 100}%"></i></div>
		<div class="stats__badges">
			<span class="stats__badge" class:stats__badge--on={ui.combo > 0}>Серия ×{ui.combo}</span>
			<span class="stats__badge" class:stats__badge--on={ui.backToBack}>Двойная норма</span>
		</div>
	</section>
{/if}

<style>
	.stats {
		transform: rotate(0.8deg);
	}

	.stats__list {
		margin: 0;
	}

	.stats__row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 8px;
		padding: 6px 0;
		border-bottom: 2px dashed rgba(23, 18, 16, 0.25);
	}

	.stats__row dd {
		margin: 0;
		font-family: var(--t-font-display);
		font-size: 22px;
		line-height: 1;
		font-variant-numeric: tabular-nums;
	}

	.stats__gold {
		color: #a87410;
	}

	.stats__plan {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		margin-top: 12px;
		white-space: nowrap;
	}

	.stats__plan b {
		font-family: var(--t-font-display);
		font-weight: 400;
		color: var(--t-red);
	}

	.stats__bar {
		height: 13px;
		margin-top: 6px;
		border: 2px solid var(--t-ink);
		background: repeating-linear-gradient(
			45deg,
			rgba(23, 18, 16, 0.14) 0 6px,
			transparent 6px 12px
		);
	}

	.stats__bar i {
		display: block;
		height: 100%;
		background: var(--t-red);
		transition: width 0.3s;
	}

	.stats__badges {
		display: flex;
		gap: 6px;
		margin-top: 12px;
	}

	.stats__badge {
		flex: 1;
		padding: 4px 6px;
		font-family: var(--t-font-display);
		font-size: 10px;
		letter-spacing: 0.06em;
		text-align: center;
		text-transform: uppercase;
		border: 2px solid rgba(23, 18, 16, 0.25);
		color: rgba(23, 18, 16, 0.35);
		transition: 0.2s;
	}

	.stats__badge--on {
		color: var(--t-paper);
		background: var(--t-red);
		border-color: var(--t-ink);
	}

	.mini {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 6px;
		color: var(--t-paper);
		text-align: center;
	}

	.mini__item {
		display: flex;
		flex-direction: column;
		padding: 4px 2px;
		background: rgba(23, 18, 16, 0.55);
		border: 1.5px solid rgba(237, 227, 203, 0.25);
	}

	.mini__label {
		font-family: var(--t-font-body);
		font-size: 9px;
		font-weight: 500;
		letter-spacing: 0.18em;
		color: rgba(237, 227, 203, 0.65);
	}

	.mini__value {
		font-family: var(--t-font-display);
		font-size: 18px;
		line-height: 1.1;
		color: var(--t-gold-hi);
	}

	.mini__bar {
		position: relative;
		align-self: center;
		width: 10px;
		height: 56px;
		background: rgba(23, 18, 16, 0.55);
		border: 1.5px solid rgba(237, 227, 203, 0.35);
	}

	.mini__bar i {
		position: absolute;
		inset: auto 0 0;
		background: var(--t-gold);
		transition: height 0.3s;
	}

	.mini__badge {
		padding: 2px 0;
		font-family: var(--t-font-display);
		font-size: 11px;
		color: var(--t-paper);
		background: var(--t-red-deep);
		border: 1.5px solid var(--t-ink);
	}

	.mini__badge--gold {
		color: var(--t-ink);
		background: var(--t-gold);
	}
</style>
