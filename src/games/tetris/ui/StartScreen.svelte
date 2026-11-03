<script lang="ts">
	import { MODE_LIST, type ModeId } from '../core/modes';
	import type { GameMain } from '../GameMain';
	import { loadRecords } from '../records';
	import ControlsMemo from './ControlsMemo.svelte';
	import { formatScore, formatTime } from './format';
	import { STAR_PATH } from './icons';
	import { ui } from './store.svelte';

	interface Props {
		game: GameMain;
		touch: boolean;
	}

	let { game, touch }: Props = $props();

	const modes = $derived(
		MODE_LIST.map((mode) => {
			const best = loadRecords(mode.id)[0];
			return {
				mode,
				best: best ? (mode.rankByTime ? formatTime(best.timeMs) : formatScore(best.score)) : null
			};
		})
	);

	function select(id: ModeId): void {
		ui.mode = id;
		ui.records = loadRecords(id);
	}
</script>

<div class="start">
	<svg class="start__star" viewBox="0 0 100 100" aria-hidden="true"><path d={STAR_PATH} /></svg>
	<div class="start__poster">
		<p class="start__kicker">Главстройпром представляет</p>
		<h1 class="start__title">
			<span class="start__main">ТЕТРИС</span>
			<span class="start__sub">«ПЯТИЛЕТКА»</span>
		</h1>
		<p class="start__lead">Строим коммунизм — ряд за рядом. Без перекуров и брака.</p>

		<div class="start__modes" role="radiogroup" aria-label="Выбор смены">
			{#each modes as { mode, best }, i (mode.id)}
				<button
					type="button"
					role="radio"
					aria-checked={ui.mode === mode.id}
					class="t-paper start__mode"
					class:start__mode--on={ui.mode === mode.id}
					style:--tilt="{(i - 1) * 1.2}deg"
					onclick={() => select(mode.id)}
				>
					<span class="t-tab">ПУТЁВКА №{i + 1}</span>
					<b>{mode.title}</b>
					<span>{mode.subtitle}</span>
					<span class="t-mono start__best">рекорд: {best ?? '—'}</span>
					{#if ui.mode === mode.id}<span class="t-stamp start__stamp">ВЫБРАНО</span>{/if}
				</button>
			{/each}
		</div>

		<button type="button" class="t-btn t-btn--accent t-btn--large" onclick={() => game.start()}>
			Взяться за работу ▸ {#if !touch}<kbd>Enter</kbd>{/if}
		</button>

		<div class="t-paper start__memo">
			<h2 class="t-tab">ПАМЯТКА СТРОИТЕЛЯ</h2>
			<ControlsMemo {touch} />
		</div>
	</div>
</div>

<style>
	.start {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		overflow: auto;
		padding: 28px 16px calc(28px + env(safe-area-inset-bottom));
		background:
			radial-gradient(900px 480px at 80% 8%, rgba(227, 167, 47, 0.26), transparent 62%),
			linear-gradient(108deg, var(--t-red) 0 57%, var(--t-red-deep) 57% 100%);
		animation: fade 0.25s ease both;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	.start__star {
		position: fixed;
		right: 3%;
		top: 6%;
		width: min(260px, 22vw);
		fill: var(--t-gold);
		stroke: var(--t-ink);
		stroke-width: 2.5;
		filter: drop-shadow(8px 8px 0 rgba(0, 0, 0, 0.35));
		transform: rotate(12deg);
		pointer-events: none;
	}

	.start__poster {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		margin: auto;
		max-width: 820px;
		text-align: center;
	}

	.start__kicker {
		display: flex;
		align-items: center;
		gap: 12px;
		margin: 0 0 14px;
		font-family: var(--t-font-display);
		font-size: 12px;
		letter-spacing: 0.36em;
		text-transform: uppercase;
		color: var(--t-cream);
	}

	.start__kicker::before,
	.start__kicker::after {
		content: '';
		width: 40px;
		height: 3px;
		background: var(--t-gold);
	}

	.start__title {
		margin: 0;
		font-weight: 400;
	}

	.start__main {
		display: block;
		font-family: var(--t-font-display);
		font-size: clamp(54px, 12vw, 140px);
		line-height: 0.9;
		color: var(--t-cream);
		text-shadow:
			6px 6px 0 var(--t-ink),
			13px 13px 0 rgba(0, 0, 0, 0.25);
	}

	.start__sub {
		display: inline-block;
		margin-top: 16px;
		padding: 4px 18px;
		font-family: var(--t-font-display);
		font-size: clamp(18px, 3.4vw, 36px);
		color: var(--t-ink);
		background: var(--t-gold);
		border: 3px solid var(--t-ink);
		box-shadow: 5px 5px 0 var(--t-ink);
		transform: rotate(-2.5deg);
	}

	.start__lead {
		margin: 20px 0 30px;
		font-size: clamp(12px, 1.8vw, 16px);
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--t-cream);
	}

	.start__modes {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 22px;
		width: 100%;
		margin-bottom: 30px;
	}

	.start__mode {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
		font: inherit;
		text-align: left;
		cursor: pointer;
		opacity: 0.86;
		transform: rotate(var(--tilt));
		transition:
			transform 0.15s,
			opacity 0.15s;
		touch-action: manipulation;
	}

	.start__mode b {
		font-family: var(--t-font-display);
		font-size: 20px;
		font-weight: 400;
		color: var(--t-red);
		text-transform: uppercase;
	}

	.start__mode span {
		font-size: 13px;
		line-height: 1.3;
	}

	.start__mode:hover,
	.start__mode--on {
		opacity: 1;
		transform: rotate(var(--tilt)) translateY(-4px);
	}

	.start__mode--on {
		box-shadow: 8px 8px 0 var(--t-ink);
	}

	.start__best {
		margin-top: 6px;
		font-size: 12px;
		opacity: 0.7;
	}

	.start__stamp {
		position: absolute;
		right: 8px;
		bottom: 10px;
		font-size: 11px;
	}

	.start__memo {
		max-width: 460px;
		margin-top: 36px;
		transform: rotate(-1deg);
	}

	@media (max-width: 640px) {
		.start__modes {
			grid-template-columns: minmax(0, 1fr);
			gap: 20px;
		}

		.start__mode {
			transform: none;
		}

		.start__mode:hover,
		.start__mode--on {
			transform: translateX(4px);
		}

		.start__star {
			width: 90px;
			top: 12px;
			right: 10px;
		}
	}
</style>
