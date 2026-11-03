<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount, tick } from 'svelte';
	import './tetris.css';
	import { COLS, VISIBLE_ROWS } from '../config';
	import { GameMain } from '../GameMain';
	import Backdrop from './Backdrop.svelte';
	import Header from './Header.svelte';
	import HoldPanel from './HoldPanel.svelte';
	import HonorBoard from './HonorBoard.svelte';
	import InvoicePanel from './InvoicePanel.svelte';
	import LedgerPanel from './LedgerPanel.svelte';
	import Overlay from './Overlay.svelte';
	import Playfield from './Playfield.svelte';
	import RadioPanel from './RadioPanel.svelte';
	import SloganBoard from './SloganBoard.svelte';
	import { ui } from './store.svelte';
	import TouchPad from './TouchPad.svelte';

	const game = new GameMain();

	let stageEl = $state<HTMLElement | null>(null);
	let leftEl = $state<HTMLElement | null>(null);
	let rightEl = $state<HTMLElement | null>(null);
	let frameEl = $state<HTMLDivElement | null>(null);
	let hostEl = $state<HTMLDivElement | null>(null);

	let touch = $state(false);
	let width = $state(1280);
	let height = $state(800);
	let sideCell = $state(22);
	let initError = $state<string | null>(null);

	const compact = $derived(touch || width < 900 || height < 560);
	const landscape = $derived(touch && width > height);
	const gestures = $derived(touch && ui.settings.gestures);

	let fitFrame = 0;

	function px(value: string): number {
		const n = Number.parseFloat(value);
		return Number.isFinite(n) ? n : 0;
	}

	function fit(): void {
		if (!stageEl || !leftEl || !rightEl || !frameEl || !hostEl) return;
		const cs = getComputedStyle(stageEl);
		const gap = px(cs.columnGap);
		const availW =
			stageEl.clientWidth -
			px(cs.paddingLeft) -
			px(cs.paddingRight) -
			leftEl.offsetWidth -
			rightEl.offsetWidth -
			gap * 2;
		const availH = stageEl.clientHeight - px(cs.paddingTop) - px(cs.paddingBottom);
		const chromeW = frameEl.offsetWidth - hostEl.offsetWidth;
		const chromeH = frameEl.offsetHeight - hostEl.offsetHeight;
		const cell = Math.min((availW - chromeW) / COLS, (availH - chromeH) / VISIBLE_ROWS);
		if (!Number.isFinite(cell) || cell <= 0) return;
		game.resize(Math.max(8, Math.min(compact ? 52 : 40, cell)));
		sideCell = compact ? Math.max(7, Math.min(26, Math.floor((leftEl.clientWidth - 14) / 4))) : 22;
	}

	function scheduleFit(): void {
		cancelAnimationFrame(fitFrame);
		fitFrame = requestAnimationFrame(fit);
	}

	function readViewport(): void {
		touch = window.matchMedia('(pointer: coarse)').matches;
		width = window.innerWidth;
		height = window.innerHeight;
	}

	$effect(() => {
		void compact;
		void landscape;
		void gestures;
		void tick().then(scheduleFit);
	});

	onMount(() => {
		readViewport();
		const abort = new AbortController();
		const onViewport = (): void => {
			readViewport();
			scheduleFit();
		};
		window.addEventListener('resize', onViewport, { signal: abort.signal });
		window.addEventListener('orientationchange', onViewport, { signal: abort.signal });
		window.visualViewport?.addEventListener('resize', onViewport, { signal: abort.signal });
		window
			.matchMedia('(pointer: coarse)')
			.addEventListener('change', onViewport, { signal: abort.signal });

		const observer = new ResizeObserver(scheduleFit);
		for (const el of [stageEl, leftEl, rightEl]) if (el) observer.observe(el);

		if (!hostEl) {
			initError = 'Не найден контейнер игрового поля';
		} else {
			game
				.init(hostEl)
				.then(() => tick())
				.then(fit)
				.catch((error: unknown) => {
					console.error('[Tetris/TetrisPage] Game init failed', error);
					initError = error instanceof Error ? error.message : String(error);
					game.destroy();
				});
		}

		return () => {
			abort.abort();
			observer.disconnect();
			cancelAnimationFrame(fitFrame);
			game.destroy();
		};
	});
</script>

<svelte:head>
	<title>ТЕТРИС «ПЯТИЛЕТКА» · NEO ARCADE</title>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=PT+Mono&family=Caveat:wght@600;700&display=swap"
	/>
</svelte:head>

<div
	class="tp"
	class:tp--compact={compact}
	class:tp--touch={touch}
	class:tp--landscape={landscape}
	class:tp--gestures={gestures}
>
	<Backdrop />

	<div class="tp__header">
		<Header {game} {compact} />
	</div>

	{#if compact}
		<div class="tp__radio"><RadioPanel strip /></div>
	{/if}

	<main class="tp__stage" bind:this={stageEl}>
		<aside class="tp__side tp__side--left" bind:this={leftEl}>
			<HoldPanel {game} {compact} cell={sideCell} />
			<LedgerPanel {compact} />
		</aside>

		<Playfield {compact} bind:frame={frameEl} bind:host={hostEl} />

		<aside class="tp__side tp__side--right" bind:this={rightEl}>
			<InvoicePanel {compact} cell={sideCell} />
			{#if !compact}
				<RadioPanel strip={false} />
				<HonorBoard />
			{/if}
		</aside>
	</main>

	{#if touch}
		{#if !landscape || gestures}
			<div class="tp__padbar" aria-hidden="true"></div>
		{/if}
		{#if !gestures}
			<div class="tp__pad tp__pad--left"><TouchPad {game} side="left" /></div>
			<div class="tp__pad tp__pad--right"><TouchPad {game} side="right" /></div>
		{/if}
		{#if !landscape || gestures}
			<div class="tp__gestures">
				{#if gestures}
					<span class="t-mono tp__hint">тап — поворот · веди — двигай · смахни вниз — сброс</span>
				{/if}
				<button
					type="button"
					class="tp__toggle"
					class:tp__toggle--on={gestures}
					aria-pressed={gestures}
					onclick={() => game.updateSettings({ gestures: !ui.settings.gestures })}
				>
					<svg viewBox="0 0 24 24" aria-hidden="true"
						><path
							d="M9 11V5a2 2 0 0 1 4 0v6m0-1a2 2 0 0 1 4 0v3a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2-4a2 2 0 0 1 3-2l2 2V9"
							fill="none"
							stroke="currentColor"
							stroke-width="1.8"
							stroke-linecap="round"
							stroke-linejoin="round"
						/></svg
					>
					{gestures ? 'КНОПКИ' : 'ЖЕСТЫ'}
				</button>
			</div>
		{/if}
	{/if}

	{#if !compact}
		<div class="tp__footer"><SloganBoard /></div>
	{/if}

	<Overlay {game} {touch} />

	{#if initError}
		<div class="tp__error" role="alert">
			<div class="t-paper">
				<h2>Стройка остановлена</h2>
				<p>{initError}</p>
				<a href={resolve('/')} class="t-btn">В аркаду</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.tp {
		--gap: 72px;
		--side: 290px;
		position: fixed;
		inset: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto minmax(0, 1fr) auto;
		grid-template-areas: 'header' 'stage' 'footer';
		overflow: hidden;
		font-family: var(--t-font-body);
		color: var(--t-ink);
		background: var(--t-red);
		user-select: none;
		-webkit-user-select: none;
		overscroll-behavior: none;
	}

	.tp__header {
		grid-area: header;
		position: relative;
		z-index: 5;
	}

	.tp__radio {
		grid-area: radio;
		position: relative;
		z-index: 4;
	}

	.tp__footer {
		grid-area: footer;
		position: relative;
		z-index: 5;
	}

	.tp__stage {
		grid-area: stage;
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--gap);
		min-width: 0;
		min-height: 0;
		padding: 40px 24px 30px;
		touch-action: none;
	}

	.tp__side {
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 34px;
		width: var(--side);
		max-height: 100%;
	}

	@media (max-width: 1360px) {
		.tp {
			--gap: 44px;
			--side: 260px;
		}
	}

	@media (max-width: 1120px) {
		.tp {
			--gap: 28px;
			--side: 230px;
		}
	}

	.tp--compact {
		--gap: 7px;
		--side: clamp(60px, 16vw, 132px);
		grid-template-rows: auto auto minmax(0, 1fr) auto;
		grid-template-areas: 'header' 'radio' 'stage' 'pads';
	}

	.tp--compact .tp__stage {
		align-items: flex-start;
		padding: 20px 5px 10px;
	}

	.tp--compact .tp__side {
		gap: 20px;
		overflow: visible;
	}

	.tp--touch:not(.tp--landscape),
	.tp--touch.tp--gestures {
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-areas:
			'header header header'
			'radio radio radio'
			'stage stage stage'
			'lpad gtog rpad';
	}

	.tp__padbar {
		position: relative;
		z-index: 1;
		grid-row: 4;
		grid-column: 1 / -1;
		background: var(--t-ink);
		border-top: 5px double var(--t-gold);
	}

	.tp__pad {
		position: relative;
		z-index: 3;
		display: flex;
		align-items: flex-end;
		padding: 18px 14px calc(16px + env(safe-area-inset-bottom));
		touch-action: none;
	}

	.tp__pad--left {
		grid-area: lpad;
	}

	.tp__pad--right {
		grid-area: rpad;
	}

	.tp__gestures {
		grid-area: gtog;
		position: relative;
		z-index: 3;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 10px 8px calc(10px + env(safe-area-inset-bottom));
	}

	.tp--gestures .tp__gestures {
		grid-column: 1 / -1;
		justify-content: space-between;
		padding-left: 14px;
		padding-right: 14px;
	}

	.tp__hint {
		font-size: 11px;
		line-height: 1.3;
		color: rgba(237, 227, 203, 0.7);
	}

	.tp__toggle {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		padding: 6px 8px;
		font-family: var(--t-font-body);
		font-size: 10px;
		letter-spacing: 0.14em;
		color: rgba(237, 227, 203, 0.75);
		background: transparent;
		border: 1.5px dashed rgba(237, 227, 203, 0.4);
		cursor: pointer;
		touch-action: manipulation;
	}

	.tp__toggle svg {
		width: 20px;
		height: 20px;
	}

	.tp__toggle--on {
		color: var(--t-ink);
		background: var(--t-gold);
		border: 2px solid var(--t-cream);
	}

	.tp--landscape {
		--side: 84px;
		--gap: 10px;
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-rows: auto auto minmax(0, 1fr);
		grid-template-areas: 'lpad header rpad' 'lpad radio rpad' 'lpad stage rpad';
	}

	.tp--landscape.tp--gestures {
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: auto auto minmax(0, 1fr) auto;
		grid-template-areas: 'header' 'radio' 'stage' 'gtog';
	}

	.tp--landscape .tp__stage {
		padding: 18px 4px 6px;
	}

	.tp--landscape .tp__pad {
		align-items: center;
		padding: 10px max(12px, env(safe-area-inset-left)) calc(10px + env(safe-area-inset-bottom));
	}

	.tp--landscape .tp__pad--right {
		padding-right: max(12px, env(safe-area-inset-right));
	}

	.tp__error {
		position: fixed;
		inset: 0;
		z-index: 60;
		display: grid;
		place-items: center;
		padding: 16px;
		background: rgba(22, 9, 7, 0.9);
	}

	.tp__error h2 {
		margin: 0 0 8px;
		font-family: var(--t-font-display);
		font-weight: 400;
		color: var(--t-red);
	}

	.tp__error p {
		margin: 0 0 16px;
	}
</style>
