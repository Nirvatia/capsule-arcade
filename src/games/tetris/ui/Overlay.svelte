<script lang="ts">
	import { resolve } from '$app/paths';
	import { Phase } from '../core/types';
	import type { GameMain } from '../GameMain';
	import { STAR_PATH } from './icons';
	import { ui } from './store.svelte';

	interface Props {
		game: GameMain;
		touch: boolean;
	}

	let { game, touch }: Props = $props();

	const pad = (n: number): string => String(n).padStart(6, '0');
	const result = $derived(ui.result);
	const title = $derived(
		!result
			? ''
			: result.newBest
				? 'План перевыполнен!'
				: result.summary.lines >= 40
					? 'Ударная смена!'
					: 'Смена окончена'
	);
</script>

{#snippet controls()}
	{#if touch}
		<dl class="t-kbd-list">
			<dt>ТАП</dt>
			<dd>поворот фигуры</dd>
			<dt>ВЕДИ ПАЛЬЦЕМ</dt>
			<dd>двигать по участку и вниз</dd>
			<dt>СМАХНИ ВНИЗ</dt>
			<dd>жёсткий сброс</dd>
			<dt>СМАХНИ ВВЕРХ</dt>
			<dd>на склад (или тап по «Складу»)</dd>
			<dt>КНОПКИ</dt>
			<dd>то же самое, для точности</dd>
		</dl>
	{:else}
		<dl class="t-kbd-list">
			<dt>← →</dt>
			<dd>движение (зажми — побежит)</dd>
			<dt>↓</dt>
			<dd>мягкий сброс, +1 за клетку</dd>
			<dt>ПРОБЕЛ</dt>
			<dd>жёсткий сброс, +2 за клетку</dd>
			<dt>↑ · X / Z</dt>
			<dd>поворот вправо / влево</dd>
			<dt>C · SHIFT</dt>
			<dd>отложить на склад</dd>
			<dt>P · ESC</dt>
			<dd>перерыв</dd>
			<dt>M</dt>
			<dd>звук</dd>
		</dl>
	{/if}
{/snippet}

{#if ui.phase === Phase.IDLE}
	<div class="overlay overlay--start">
		<svg class="overlay__star" viewBox="0 0 100 100" aria-hidden="true"><path d={STAR_PATH} /></svg>
		<div class="poster">
			<p class="poster__kicker">Главстройпром представляет</p>
			<h1 class="poster__title">
				<span class="poster__main">ТЕТРИС</span>
				<span class="poster__sub">«ПЯТИЛЕТКА»</span>
			</h1>
			<p class="poster__lead">Строим коммунизм — ряд за рядом. Без перекуров и брака.</p>
			<button type="button" class="t-btn t-btn--accent t-btn--large" onclick={() => game.start()}>
				Взяться за работу ▸
			</button>
			<div class="poster__note t-panel">
				<h2 class="t-panel__title">ПАМЯТКА СТРОИТЕЛЯ</h2>
				{@render controls()}
			</div>
		</div>
	</div>
{:else if ui.phase === Phase.PAUSED}
	<div class="overlay">
		<div class="card t-panel">
			<h2 class="card__title">Перерыв</h2>
			<p class="card__text">Профсоюз велел отдохнуть. Чай, баранки, тишина. Кирпичи подождут.</p>
			<div class="card__actions">
				<button type="button" class="t-btn t-btn--accent" onclick={() => game.togglePause()}>
					Продолжить {#if !touch}<kbd>[P]</kbd>{/if}
				</button>
				<button type="button" class="t-btn" onclick={() => game.restart()}>
					Новая смена {#if !touch}<kbd>[R]</kbd>{/if}
				</button>
				<a href={resolve('/')} class="t-btn">В аркаду</a>
			</div>
			<details class="card__help">
				<summary class="t-label">Памятка</summary>
				{@render controls()}
			</details>
		</div>
	</div>
{:else if ui.phase === Phase.GAMEOVER && result}
	<div class="overlay overlay--late">
		<div class="card t-panel">
			{#if result.newBest}
				<span class="t-stamp card__stamp">Рекорд бригады!</span>
			{:else if result.rank >= 0}
				<span class="t-stamp card__stamp">Доска почёта №{result.rank + 1}</span>
			{/if}
			<p class="card__kicker">Сводка по смене</p>
			<h2 class="card__title">{title}</h2>
			<div class="card__stats">
				<div class="card__stat card__stat--main">
					<span class="t-label">Очки труда</span>
					<b>{pad(result.summary.score)}</b>
				</div>
				<div class="card__stat">
					<span class="t-label">Рядов</span>
					<b>{result.summary.lines}</b>
				</div>
				<div class="card__stat">
					<span class="t-label">Пятилетка</span>
					<b>{result.summary.level}</b>
				</div>
				<div class="card__stat">
					<span class="t-label">Фигур</span>
					<b>{result.summary.pieces}</b>
				</div>
				<div class="card__stat">
					<span class="t-label">Тетрисов</span>
					<b>{result.summary.tetrises}</b>
				</div>
				<div class="card__stat">
					<span class="t-label">Т-виражей</span>
					<b>{result.summary.spins}</b>
				</div>
				<div class="card__stat">
					<span class="t-label">Макс. серия</span>
					<b>{result.summary.maxCombo}</b>
				</div>
			</div>
			<div class="card__actions">
				<button type="button" class="t-btn t-btn--accent" onclick={() => game.start()}>
					Новая смена {#if !touch}<kbd>[Enter]</kbd>{/if}
				</button>
				<a href={resolve('/')} class="t-btn">В аркаду</a>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		overflow: auto;
		padding: 24px 16px;
		padding-bottom: calc(24px + env(safe-area-inset-bottom));
		background: rgba(22, 9, 7, 0.82);
		animation: fade 0.25s ease both;
	}

	.overlay--late {
		animation-delay: 0.15s;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	.overlay--start {
		background:
			radial-gradient(900px 480px at 80% 8%, rgba(227, 167, 47, 0.28), transparent 62%),
			linear-gradient(108deg, var(--t-red) 0 57%, var(--t-red-deep) 57% 100%);
	}

	.overlay__star {
		position: fixed;
		right: 3%;
		top: 6%;
		width: min(280px, 24vw);
		fill: var(--t-gold);
		stroke: var(--t-ink);
		stroke-width: 2.5;
		filter: drop-shadow(8px 8px 0 rgba(0, 0, 0, 0.35));
		transform: rotate(12deg);
		pointer-events: none;
	}

	.poster {
		position: relative;
		margin: auto;
		max-width: 760px;
		text-align: center;
	}

	.poster__kicker,
	.card__kicker {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		margin: 0 0 16px;
		font-family: var(--t-font-display);
		font-size: 12px;
		letter-spacing: 0.36em;
		text-transform: uppercase;
		color: var(--t-paper);
	}

	.poster__kicker::before,
	.poster__kicker::after {
		content: '';
		width: 40px;
		height: 3px;
		background: var(--t-gold);
	}

	.poster__title {
		margin: 0;
		font-weight: 400;
	}

	.poster__main {
		display: block;
		font-family: var(--t-font-display);
		font-size: clamp(56px, 13vw, 150px);
		line-height: 0.9;
		color: var(--t-paper);
		text-shadow:
			6px 6px 0 var(--t-ink),
			13px 13px 0 rgba(0, 0, 0, 0.25);
	}

	.poster__sub {
		display: inline-block;
		margin-top: 16px;
		padding: 4px 18px;
		font-family: var(--t-font-display);
		font-size: clamp(18px, 3.6vw, 38px);
		color: var(--t-ink);
		background: var(--t-gold);
		border: 3px solid var(--t-ink);
		box-shadow: 5px 5px 0 var(--t-ink);
		transform: rotate(-2.5deg);
	}

	.poster__lead {
		margin: 22px 0 26px;
		font-family: var(--t-font-body);
		font-size: clamp(12px, 1.8vw, 17px);
		font-weight: 500;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--t-paper);
	}

	.poster__note {
		max-width: 460px;
		margin: 34px auto 0;
		transform: rotate(-1deg);
	}

	.card {
		margin: auto;
		width: 100%;
		max-width: 520px;
		padding: 30px 30px 26px;
		border-width: 4px;
		box-shadow: 12px 12px 0 rgba(0, 0, 0, 0.5);
		animation: card-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
	}

	.overlay--late .card {
		animation-delay: 0.15s;
	}

	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(24px) rotate(-2deg) scale(0.96);
		}
	}

	.card__kicker {
		justify-content: flex-start;
		margin-bottom: 6px;
		color: var(--t-ink);
		opacity: 0.6;
	}

	.card__title {
		margin: 0;
		font-family: var(--t-font-display);
		font-size: clamp(28px, 6vw, 46px);
		font-weight: 400;
		line-height: 1;
		text-transform: uppercase;
		color: var(--t-red);
		text-shadow: 3px 3px 0 rgba(23, 18, 16, 0.14);
	}

	.card__text {
		margin: 10px 0 22px;
		font-family: var(--t-font-body);
		font-size: 15px;
		font-weight: 500;
		opacity: 0.8;
	}

	.card__stamp {
		position: absolute;
		top: -18px;
		right: -10px;
		font-size: 14px;
		background: var(--t-paper);
	}

	.card__stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 2px;
		margin: 18px 0 24px;
		background: var(--t-ink);
		border: 3px solid var(--t-ink);
	}

	.card__stat {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 10px 6px;
		text-align: center;
		background: var(--t-paper);
	}

	.card__stat .t-label {
		font-size: 10px;
		opacity: 0.7;
	}

	.card__stat b {
		font-family: var(--t-font-display);
		font-size: 22px;
		font-weight: 400;
		font-variant-numeric: tabular-nums;
	}

	.card__stat--main {
		grid-column: 1 / -1;
		color: var(--t-paper);
		background: var(--t-ink);
	}

	.card__stat--main b {
		font-size: 36px;
		color: var(--t-gold-hi);
	}

	.card__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
	}

	.card__help {
		margin-top: 22px;
	}

	.card__help summary {
		margin-bottom: 10px;
		cursor: pointer;
		opacity: 0.7;
	}

	@media (max-width: 560px) {
		.card {
			padding: 24px 16px 18px;
			border-width: 3px;
			box-shadow: 7px 7px 0 rgba(0, 0, 0, 0.45);
		}

		.card__actions {
			display: grid;
		}

		.card__actions .t-btn {
			width: 100%;
		}

		.overlay__star {
			width: 90px;
			top: 12px;
			right: 10px;
			opacity: 0.8;
		}

		.poster__note {
			margin-top: 26px;
		}
	}
</style>
