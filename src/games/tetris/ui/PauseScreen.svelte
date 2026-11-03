<script lang="ts">
	import { resolve } from '$app/paths';
	import type { GameMain } from '../GameMain';
	import { ARR_RANGE, DAS_RANGE } from '../settings';
	import ControlsMemo from './ControlsMemo.svelte';
	import { formatTime } from './format';
	import { ui } from './store.svelte';

	interface Props {
		game: GameMain;
		touch: boolean;
	}

	let { game, touch }: Props = $props();

	const toggles = $derived([
		{ key: 'gestures', title: 'Режим жестов', hint: 'кнопки убрать, поле увеличить', show: touch },
		{ key: 'sound', title: 'Звук', hint: 'гудок, лязг, фанфары', show: true },
		{ key: 'vibration', title: 'Вибрация', hint: 'при тетрисе трясёт руку', show: touch },
		{ key: 'ghost', title: 'Тень фигуры', hint: 'для тех, кто не уверен', show: true }
	] as const);

	function numberFrom(e: Event): number {
		return e.currentTarget instanceof HTMLInputElement ? Number(e.currentTarget.value) : 0;
	}
</script>

<div class="pause">
	<article class="t-paper card">
		<header class="card__head">
			<svg class="card__tea" viewBox="0 0 74 96" aria-hidden="true">
				<path d="M20 14c6-6 12 2 8-8M34 12c6-6 12 2 8-8" class="steam" />
				<path d="M14 20h46l-5 54H19z" class="glass" />
				<path d="M17 34h40l-3 40H20z" class="tea" />
				<path d="M10 46h54l-3 34H13z" class="holder" />
				<path d="M14 52h46M15 60h44M16 68h42" class="ribs" />
				<path d="M64 50c10 0 10 22 0 22" class="handle" />
				<rect x="8" y="80" width="58" height="8" class="holder" />
			</svg>
			<div>
				<h2 class="card__title">ПЕРЕРЫВ</h2>
				<p class="card__text">Профсоюз велел отдохнуть. Чай, баранки, тишина. Кирпичи подождут.</p>
			</div>
		</header>

		<div class="card__timer">
			<span class="t-mono">ПЕРЕРЫВ ИДЁТ</span>
			<b class="t-mono">{formatTime(ui.pausedMs, false)}</b>
		</div>
		<span class="t-hand card__law">
			{ui.pausedMs > 15 * 60000 ? 'Товарищ, это уже прогул!' : 'по КЗоТ — не более 15 минут!'}
		</span>

		<div class="card__actions">
			<button type="button" class="t-btn t-btn--accent" onclick={() => game.togglePause()}>
				Вернуться к станку {#if !touch}<kbd>P</kbd>{/if}
			</button>
			<button type="button" class="t-btn" onclick={() => game.restart()}>
				Новая смена {#if !touch}<kbd>R</kbd>{/if}
			</button>
		</div>

		<section class="card__section">
			<h3 class="card__section-title">ЗАЯВЛЕНИЕ В ПРОФКОМ</h3>
			{#each toggles.filter((t) => t.show) as t (t.key)}
				<label class="setting">
					<span>
						<b>{t.title}</b>
						<small class="t-mono">{t.hint}</small>
					</span>
					<input
						type="checkbox"
						checked={ui.settings[t.key]}
						onchange={() => game.updateSettings({ [t.key]: !ui.settings[t.key] })}
					/>
				</label>
			{/each}
			{#if !touch}
				<label class="setting setting--range">
					<span>
						<b>Задержка автоповтора</b>
						<small class="t-mono">{ui.settings.dasMs} мс — сколько ждать, прежде чем побежит</small>
					</span>
					<input
						type="range"
						min={DAS_RANGE.min}
						max={DAS_RANGE.max}
						step={DAS_RANGE.step}
						value={ui.settings.dasMs}
						oninput={(e) => game.updateSettings({ dasMs: numberFrom(e) })}
					/>
				</label>
				<label class="setting setting--range">
					<span>
						<b>Скорость автоповтора</b>
						<small class="t-mono">
							{ui.settings.arrMs === 0
								? 'мгновенно — для стахановцев'
								: `${ui.settings.arrMs} мс на клетку`}
						</small>
					</span>
					<input
						type="range"
						min={ARR_RANGE.min}
						max={ARR_RANGE.max}
						step={ARR_RANGE.step}
						value={ui.settings.arrMs}
						oninput={(e) => game.updateSettings({ arrMs: numberFrom(e) })}
					/>
				</label>
			{/if}
		</section>

		<details class="card__memo">
			<summary class="t-label">Памятка строителя</summary>
			<ControlsMemo {touch} />
		</details>

		<nav class="card__links">
			<button type="button" class="card__link" onclick={() => game.menu()}>◄ СМЕНИТЬ РЕЖИМ</button>
			<a href={resolve('/')} class="card__link">УЙТИ В АРКАДУ</a>
		</nav>
	</article>
</div>

<style>
	.pause {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		overflow: auto;
		padding: 24px 16px calc(24px + env(safe-area-inset-bottom));
		background: rgba(28, 6, 8, 0.78);
		animation: fade 0.2s ease both;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	.card {
		margin: auto;
		width: 100%;
		max-width: 480px;
		padding: 26px 22px 20px;
		border-width: 3px;
		box-shadow: 10px 10px 0 rgba(0, 0, 0, 0.5);
		transform: rotate(-0.6deg);
		animation: card-in 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.2) both;
	}

	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(20px) rotate(-2deg);
		}
	}

	.card__head {
		display: flex;
		gap: 14px;
		align-items: flex-start;
	}

	.card__tea {
		width: 70px;
		flex: none;
	}

	.steam {
		fill: none;
		stroke: rgba(23, 18, 16, 0.35);
		stroke-width: 2;
		stroke-linecap: round;
	}

	.glass {
		fill: rgba(200, 120, 40, 0.3);
		stroke: var(--t-ink);
		stroke-width: 2;
	}

	.tea {
		fill: #a0521b;
	}

	.holder {
		fill: #b8b4a8;
		stroke: var(--t-ink);
		stroke-width: 2;
	}

	.ribs {
		stroke: #8d897e;
		stroke-width: 2;
	}

	.handle {
		fill: none;
		stroke: var(--t-ink);
		stroke-width: 3;
	}

	.card__title {
		margin: 0;
		font-family: var(--t-font-display);
		font-size: 36px;
		font-weight: 400;
		line-height: 1;
		color: var(--t-red);
	}

	.card__text {
		margin: 8px 0 0;
		font-size: 15px;
		font-weight: 500;
		line-height: 1.35;
	}

	.card__timer {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		margin-top: 16px;
		padding: 8px 12px;
		color: var(--t-cream);
		background: var(--t-ink);
	}

	.card__timer span {
		font-size: 12px;
	}

	.card__timer b {
		font-size: 22px;
		color: var(--t-gold-hi);
	}

	.card__law {
		display: block;
		margin-top: 4px;
		font-size: 18px;
		text-align: right;
	}

	.card__actions {
		display: grid;
		gap: 12px;
		margin-top: 16px;
	}

	.card__section {
		margin-top: 20px;
		padding-top: 10px;
		border-top: 2px dashed rgba(23, 18, 16, 0.35);
	}

	.card__section-title {
		margin: 0 0 4px;
		font-family: var(--t-font-display);
		font-size: 12px;
		font-weight: 400;
		letter-spacing: 0.16em;
		color: var(--t-red);
	}

	.setting {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		padding: 8px 0;
		border-bottom: 1px dotted rgba(23, 18, 16, 0.35);
		cursor: pointer;
	}

	.setting span {
		display: flex;
		flex-direction: column;
	}

	.setting b {
		font-size: 15px;
		font-weight: 500;
	}

	.setting small {
		font-size: 11px;
		opacity: 0.65;
	}

	.setting input[type='checkbox'] {
		width: 22px;
		height: 22px;
		flex: none;
		accent-color: var(--t-red);
	}

	.setting--range {
		flex-direction: column;
		align-items: stretch;
		gap: 6px;
	}

	.setting--range input {
		width: 100%;
		accent-color: var(--t-red);
	}

	.card__memo {
		margin-top: 16px;
	}

	.card__memo summary {
		margin-bottom: 10px;
		cursor: pointer;
		opacity: 0.75;
	}

	.card__links {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin-top: 16px;
	}

	.card__link {
		padding: 6px 0;
		font-family: var(--t-font-display);
		font-size: 12px;
		letter-spacing: 0.12em;
		color: var(--t-ink);
		text-decoration: none;
		background: none;
		border: 0;
		border-bottom: 2px solid transparent;
		cursor: pointer;
	}

	.card__link:hover {
		border-bottom-color: var(--t-red);
	}
</style>
