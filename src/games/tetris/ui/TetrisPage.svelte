<script lang="ts">
	import { resolve } from '$app/paths';
	import { onMount, tick } from 'svelte';
	import './tetris.css';
	import { COLS, VISIBLE_ROWS } from '../config';
	import { GameMain } from '../GameMain';
	import Backdrop from './Backdrop.svelte';
	import Header from './Header.svelte';
	import HoldPanel from './HoldPanel.svelte';
	import NextPanel from './NextPanel.svelte';
	import Overlay from './Overlay.svelte';
	import Playfield from './Playfield.svelte';
	import RecordsPanel from './RecordsPanel.svelte';
	import SloganBoard from './SloganBoard.svelte';
	import StatsPanel from './StatsPanel.svelte';
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
		sideCell = compact ? Math.max(7, Math.min(26, Math.floor((leftEl.clientWidth - 12) / 4))) : 22;
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
</svelte:head>

<div class="tp" class:tp--compact={compact} class:tp--touch={touch} class:tp--landscape={landscape}>
	<Backdrop />

	<div class="tp__header">
		<Header {game} {compact} />
	</div>

	<main class="tp__stage" bind:this={stageEl}>
		<aside class="tp__side tp__side--left" bind:this={leftEl}>
			<HoldPanel {game} {compact} cell={sideCell} />
			<StatsPanel {compact} />
		</aside>

		<Playfield {compact} bind:frame={frameEl} bind:host={hostEl} />

		<aside class="tp__side tp__side--right" bind:this={rightEl}>
			<NextPanel {compact} cell={sideCell} />
			{#if !compact}
				<RecordsPanel />
				<section class="t-panel tp__slogan">
					«Партия сказала: надо —<br />отвечаем: <b>будет построено!</b>»
					<span class="t-stamp">ГОСТ 1984</span>
				</section>
			{/if}
		</aside>
	</main>

	{#if touch}
		<div class="tp__pad tp__pad--left"><TouchPad {game} side="left" /></div>
		<div class="tp__pad tp__pad--right"><TouchPad {game} side="right" /></div>
	{/if}

	{#if !compact}
		<div class="tp__footer"><SloganBoard /></div>
	{/if}

	<Overlay {game} {touch} />

	{#if initError}
		<div class="tp__error" role="alert">
			<div class="t-panel">
				<h2>Стройка остановлена</h2>
				<p>{initError}</p>
				<a href={resolve('/')} class="t-btn">В аркаду</a>
			</div>
		</div>
	{/if}
</div>

<style>
	.tp {
		--gap: 32px;
		--side: 232px;
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

	.tp__footer {
		grid-area: footer;
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
		padding: 30px 24px;
		touch-action: none;
	}

	.tp__side {
		flex: none;
		display: flex;
		flex-direction: column;
		gap: 30px;
		width: var(--side);
		max-height: 100%;
	}

	.tp__slogan {
		font-size: 16px;
		font-weight: 500;
		line-height: 1.4;
		transform: rotate(1deg);
	}

	.tp__slogan b {
		font-size: 19px;
		color: var(--t-red);
	}

	.tp__slogan .t-stamp {
		display: table;
		margin-top: 10px;
	}

	@media (max-height: 860px) {
		.tp__slogan {
			display: none;
		}
	}

	@media (max-width: 1100px) {
		.tp {
			--gap: 22px;
			--side: 200px;
		}
	}

	.tp--compact {
		--gap: 6px;
		--side: clamp(56px, 16vw, 132px);
		grid-template-areas: 'header' 'stage' 'pads';
	}

	.tp--compact .tp__stage {
		align-items: stretch;
		padding: 14px 8px 8px;
	}

	.tp--compact .tp__stage > :global(.field) {
		align-self: center;
	}

	.tp--compact .tp__side {
		gap: 18px;
		padding-top: 10px;
		overflow: hidden;
	}

	.tp--touch:not(.tp--landscape) {
		grid-template-columns: 1fr 1fr;
		grid-template-areas: 'header header' 'stage stage' 'lpad rpad';
	}

	.tp__pad {
		position: relative;
		z-index: 3;
		display: flex;
		align-items: flex-end;
		padding: 6px 14px calc(12px + env(safe-area-inset-bottom));
		touch-action: none;
	}

	.tp__pad--left {
		grid-area: lpad;
		justify-content: flex-start;
	}

	.tp__pad--right {
		grid-area: rpad;
		justify-content: flex-end;
	}

	.tp--landscape {
		--side: 84px;
		--gap: 10px;
		grid-template-columns: auto minmax(0, 1fr) auto;
		grid-template-rows: auto minmax(0, 1fr);
		grid-template-areas: 'lpad header rpad' 'lpad stage rpad';
	}

	.tp--landscape .tp__stage {
		padding: 10px 4px 6px;
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
