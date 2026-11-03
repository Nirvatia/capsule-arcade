<script lang="ts">
	import { resolve } from '$app/paths';
	import { MODES } from '../core/modes';
	import { EndReason } from '../core/types';
	import type { GameMain } from '../GameMain';
	import { END_REASON_TEXT, levelName, rankFor } from '../theme/texts';
	import { formatScore, formatTime } from './format';
	import HonorBoard from './HonorBoard.svelte';
	import { STAR_PATH } from './icons';
	import type { GameResult } from './store.svelte';
	import { ui } from './store.svelte';

	interface Props {
		game: GameMain;
		touch: boolean;
		result: GameResult;
	}

	let { game, touch, result }: Props = $props();

	const s = $derived(result.summary);
	const mode = $derived(MODES[s.mode]);
	const progress = $derived(rankFor(s));
	const date = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(
		new Date()
	);

	const rows = $derived([
		{ label: 'Бригадир', value: 'тов. Игрок' },
		{ label: 'Смена', value: `«${mode.title}»` },
		{ label: 'Объект', value: `«${levelName(s.level)}»` },
		{ label: 'Пятилетка', value: `№ ${s.level}` },
		{ label: 'Рядов', value: String(s.lines) },
		{ label: 'Тетрисов', value: String(s.tetrises) },
		{ label: 'Т-виражей', value: String(s.spins) },
		{ label: 'Макс. серия', value: `×${s.maxCombo}` },
		{ label: 'Фигур', value: `${s.pieces} шт.` },
		{ label: 'Время', value: formatTime(s.timeMs) }
	]);

	const title = $derived(
		s.reason === EndReason.GOAL
			? 'о досрочной сдаче объекта'
			: s.reason === EndReason.TIME
				? 'об окончании ударной смены'
				: 'о закрытии рабочей смены'
	);

	const remark = $derived(
		s.holes === 0
			? 'Замечаний нет. Подозрительно.'
			: `${s.holes} ${plural(s.holes, 'дыра', 'дыры', 'дыр')} в перекрытиях —`
	);

	const totalLabel = $derived(mode.rankByTime ? 'ВРЕМЯ СДАЧИ' : 'ИТОГО ОЧКОВ ТРУДА');
	const totalValue = $derived(
		mode.rankByTime
			? s.reason === EndReason.GOAL
				? formatTime(s.timeMs)
				: 'НЕ СДАНО'
			: formatScore(s.score)
	);

	const stampText = $derived(
		s.reason === EndReason.GOAL
			? 'ПЛАН\nВЫПОЛНЕН'
			: s.reason === EndReason.TIME
				? 'ГУДОК\nДАН'
				: 'СМЕНА\nЗАКРЫТА'
	);

	function plural(n: number, one: string, few: string, many: string): string {
		const m10 = n % 10;
		const m100 = n % 100;
		if (m10 === 1 && m100 !== 11) return one;
		if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
		return many;
	}
</script>

<div class="report">
	<article class="act">
		<header class="act__letterhead">
			<span class="act__emblem" aria-hidden="true"
				><svg viewBox="0 0 100 100"><path d={STAR_PATH} /></svg></span
			>
			<span class="act__org">
				<b>ГЛАВСТРОЙПРОМ · ТРЕСТ «ТЕТРИССТРОЙ»</b>
				<small class="t-mono">Форма Т-1984 · г. Тетрисград · {date}</small>
			</span>
			<span class="act__approve t-mono"
				>УТВЕРЖДАЮ<br />Нач. участка <span class="t-hand">Петров</span></span
			>
		</header>

		<h2 class="act__title">АКТ № {ui.shiftNo}</h2>
		<p class="act__subtitle t-mono">{title}</p>

		<dl class="act__rows">
			{#each rows as row (row.label)}
				<div class="act__row t-mono">
					<dt>{row.label}</dt>
					<span class="act__dots"></span>
					<dd>{row.value}</dd>
				</div>
			{/each}
		</dl>
		<p class="act__notes t-mono">
			Причина остановки: <b>{END_REASON_TEXT[s.reason]}</b>.<br />
			Замечания: {remark}
			{#if s.holes > 0}<span class="t-hand">замазать к понедельнику!</span>{/if}
		</p>

		<div class="act__total">
			<span>{totalLabel}</span>
			<b class="t-mono">{totalValue}</b>
			{#if result.newBest}
				<span class="t-stamp t-stamp--in act__record">РЕКОРД БРИГАДЫ!</span>
			{:else if result.rank >= 0}
				<span class="t-stamp t-stamp--gold t-stamp--in act__record"
					>ДОСКА ПОЧЁТА №{result.rank + 1}</span
				>
			{/if}
		</div>

		<div class="act__award">
			<svg class="act__medal" viewBox="0 0 74 100" aria-hidden="true">
				<path d="M18 0h38l-8 40H26z" fill="#a6232b" />
				<path d="M30 0h14l-3 40h-8z" fill="#e3a72f" />
				<circle cx="37" cy="66" r="30" fill="#e3a72f" stroke="#8a5a10" stroke-width="3" />
				<circle cx="37" cy="66" r="23" fill="none" stroke="#8a5a10" stroke-width="1.5" />
				<path
					d="M37 48 L42 61 L56 61 L45 69 L49 83 L37 75 L25 83 L29 69 L18 61 L32 61 Z"
					fill="#a6232b"
				/>
			</svg>
			<div class="act__rank">
				<span class="t-mono">РЕШИЛИ: присвоить бригадиру звание</span>
				<b>«{progress.rank.title.toUpperCase()}»</b>
				{#if progress.next}
					<span class="act__progress t-mono">
						до «{progress.next.short}»
						<i><i style:width="{progress.fraction * 100}%"></i></i>
						{formatScore(progress.toNext, 1)}
					</span>
				{/if}
			</div>
		</div>

		<div class="act__signs t-mono">
			<span><span class="t-hand">Сидоров</span>Мастер участка</span>
			<span><span class="t-hand">Кузьмина</span>Профорг</span>
			<span class="t-stamp t-stamp--round t-stamp--in act__seal">★<br />{stampText}<br />★</span>
		</div>

		<div class="act__actions">
			<button type="button" class="t-btn t-btn--accent" onclick={() => game.start()}>
				Новая смена {#if !touch}<kbd>Enter</kbd>{/if}
			</button>
			<button type="button" class="t-btn" onclick={() => game.menu()}>Сменить режим</button>
			<a href={resolve('/')} class="t-btn">В аркаду</a>
		</div>
	</article>

	<aside class="report__board">
		<HonorBoard limit={5} highlight={result.rank} note />
	</aside>
</div>

<style>
	.report {
		position: fixed;
		inset: 0;
		z-index: 40;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		align-content: center;
		gap: 48px;
		overflow: auto;
		padding: 30px 16px calc(30px + env(safe-area-inset-bottom));
		background: rgba(28, 6, 8, 0.66);
		animation: fade 0.3s ease 0.1s both;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	.act {
		position: relative;
		width: 100%;
		max-width: 640px;
		box-sizing: border-box;
		padding: 24px 40px 24px 50px;
		color: var(--t-ink);
		background-color: #f1e8d0;
		background-image:
			radial-gradient(ellipse at 30% 15%, rgba(255, 255, 255, 0.4), transparent 60%),
			linear-gradient(90deg, transparent 30px, rgba(179, 36, 45, 0.3) 30px 31px, transparent 31px);
		border: 3px solid var(--t-ink);
		box-shadow: 14px 14px 0 rgba(0, 0, 0, 0.5);
		transform: rotate(-0.8deg);
		animation: act-in 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.1) 0.15s both;
	}

	@keyframes act-in {
		from {
			opacity: 0;
			transform: translateY(40px) rotate(-3deg);
		}
	}

	.act__letterhead {
		display: flex;
		align-items: center;
		gap: 14px;
		padding-bottom: 10px;
		border-bottom: 5px double var(--t-ink);
	}

	.act__emblem {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		flex: none;
		border-radius: 50%;
		background: var(--t-red);
		box-shadow: 0 0 0 2px var(--t-ink);
	}

	.act__emblem svg {
		width: 22px;
		fill: var(--t-cream);
	}

	.act__org {
		display: flex;
		flex-direction: column;
		line-height: 1.25;
	}

	.act__org b {
		font-family: var(--t-font-display);
		font-size: 13px;
		font-weight: 400;
		letter-spacing: 0.1em;
	}

	.act__org small {
		font-size: 11px;
		opacity: 0.65;
	}

	.act__approve {
		margin-left: auto;
		font-size: 11px;
		line-height: 1.4;
		text-align: right;
	}

	.act__approve .t-hand {
		font-size: 19px;
	}

	.act__title {
		margin: 16px 0 0;
		font-family: var(--t-font-display);
		font-size: clamp(30px, 6vw, 42px);
		font-weight: 400;
		letter-spacing: 0.08em;
		text-align: center;
		color: var(--t-red);
	}

	.act__subtitle {
		margin: 0 0 16px;
		font-size: 14px;
		text-align: center;
	}

	.act__rows {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 7px 26px;
		margin: 0;
	}

	.act__row {
		display: flex;
		align-items: baseline;
		gap: 8px;
		font-size: 14px;
	}

	.act__row dt {
		white-space: nowrap;
	}

	.act__row dd {
		margin: 0;
		font-weight: 700;
		white-space: nowrap;
	}

	.act__dots {
		flex-grow: 1;
		border-bottom: 1.5px dotted rgba(23, 18, 16, 0.45);
		transform: translateY(-4px);
	}

	.act__notes {
		margin: 10px 0 0;
		font-size: 13px;
		line-height: 1.5;
	}

	.act__notes .t-hand {
		font-size: 19px;
	}

	.act__total {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: 14px;
		padding: 10px 18px;
		color: var(--t-cream);
		background: var(--t-ink);
		box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.25);
	}

	.act__total span {
		font-family: var(--t-font-display);
		font-size: 14px;
		letter-spacing: 0.14em;
	}

	.act__total b {
		font-size: clamp(26px, 5vw, 38px);
		color: var(--t-gold-hi);
		white-space: nowrap;
	}

	.act__award {
		display: flex;
		align-items: center;
		gap: 18px;
		margin-top: 16px;
	}

	.act__medal {
		width: 64px;
		flex: none;
		filter: drop-shadow(2px 3px 0 rgba(0, 0, 0, 0.3));
		animation: medal 0.6s cubic-bezier(0.2, 0.9, 0.3, 1.4) 0.7s both;
	}

	@keyframes medal {
		from {
			opacity: 0;
			transform: scale(0.3) rotate(-30deg);
		}
	}

	.act__rank {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.act__rank > span:first-child {
		font-size: 13px;
	}

	.act__rank b {
		font-family: var(--t-font-display);
		font-size: clamp(16px, 3.4vw, 21px);
		font-weight: 400;
		line-height: 1.15;
		color: var(--t-red);
	}

	.act__progress {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
		margin-top: 4px;
		font-size: 11px;
		opacity: 0.8;
	}

	.act__progress > i {
		width: 140px;
		height: 8px;
		border: 1.5px solid var(--t-ink);
	}

	.act__progress > i > i {
		display: block;
		height: 100%;
		background: var(--t-red);
	}

	.act__signs {
		position: relative;
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 26px;
		margin-top: 22px;
		font-size: 12px;
	}

	.act__signs > span:not(.t-stamp) {
		display: flex;
		flex-direction: column;
		border-bottom: 0;
	}

	.act__signs .t-hand {
		padding-bottom: 2px;
		font-size: 26px;
		border-bottom: 1px solid var(--t-ink);
	}

	.act__seal {
		position: absolute;
		right: -30px;
		top: -64px;
		font-size: 12px;
		white-space: pre-line;
		transform: rotate(-18deg);
		animation-delay: 0.9s;
	}

	.act__record {
		position: absolute;
		right: -14px;
		top: -24px;
		font-size: 15px;
		background: rgba(241, 232, 208, 0.9);
		transform: rotate(9deg);
		animation-delay: 1.1s;
	}

	.act__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 22px;
	}

	.act__actions :global(.t-btn) {
		font-size: 13px;
		padding: 0.75em 1.1em;
	}

	.report__board {
		width: 310px;
		transform: rotate(1.2deg);
		animation: act-in 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.1) 0.35s both;
	}

	@media (max-width: 640px) {
		.report {
			gap: 32px;
		}

		.act {
			padding: 18px 16px 18px 26px;
			background-image:
				radial-gradient(ellipse at 30% 15%, rgba(255, 255, 255, 0.4), transparent 60%),
				linear-gradient(90deg, transparent 12px, rgba(179, 36, 45, 0.3) 12px 13px, transparent 13px);
			transform: none;
		}

		.act__approve {
			display: none;
		}

		.act__rows {
			grid-template-columns: minmax(0, 1fr);
		}

		.act__actions {
			display: grid;
		}

		.act__record {
			right: -6px;
			font-size: 12px;
		}

		.act__progress > i {
			width: 90px;
		}

		.act__seal {
			right: -12px;
			top: -86px;
			width: 96px;
			height: 96px;
			font-size: 10px;
		}

		.report__board {
			width: 100%;
			max-width: 420px;
		}
	}
</style>
