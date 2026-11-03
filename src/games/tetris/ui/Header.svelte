<script lang="ts">
	import { resolve } from '$app/paths';
	import { Phase } from '../core/types';
	import type { GameMain } from '../GameMain';
	import { STAR_PATH } from './icons';
	import { ui } from './store.svelte';

	interface Props {
		game: GameMain;
		compact: boolean;
	}

	let { game, compact }: Props = $props();

	const canPause = $derived(
		ui.phase === Phase.PLAYING ||
			ui.phase === Phase.CLEARING ||
			ui.phase === Phase.COUNTDOWN ||
			ui.phase === Phase.PAUSED
	);
	const score = $derived(
		String(ui.score)
			.padStart(6, '0')
			.replace(/(\d{3})$/, ' $1')
	);
	const date = new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(
		new Date()
	);
</script>

<header class="hdr" class:hdr--compact={compact}>
	{#if compact}
		<a href={resolve('/')} class="t-chip t-chip--icon hdr__square" aria-label="В аркаду">
			<svg viewBox="0 0 24 24" aria-hidden="true"
				><path
					d="M15 5l-7 7 7 7"
					fill="none"
					stroke="currentColor"
					stroke-width="3"
					stroke-linecap="round"
					stroke-linejoin="round"
				/></svg
			>
		</a>
	{/if}

	<span class="hdr__medal" aria-hidden="true">
		<svg viewBox="0 0 100 100"><path d={STAR_PATH} /></svg>
	</span>
	<span class="hdr__title">ТЕТРИС</span>

	{#if !compact}
		<span class="hdr__flag">«ПЯТИЛЕТКА»</span>
		<span class="hdr__meta t-mono">смена № {ui.shiftNo} · {date}</span>
	{/if}

	<div class="hdr__spacer"></div>

	{#if compact}
		<div class="hdr__score" aria-label="Очки труда">
			<span>ОЧКИ ТРУДА</span>
			<b class="t-mono">{score}</b>
		</div>
	{:else}
		<button
			type="button"
			class="t-chip t-chip--icon hdr__square"
			aria-label={ui.settings.sound ? 'Выключить звук' : 'Включить звук'}
			title="Звук [M]"
			onclick={() => game.toggleMute()}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
				{#if ui.settings.sound}
					<path
						d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				{:else}
					<path
						d="M16 9l6 6M22 9l-6 6"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				{/if}
			</svg>
		</button>
	{/if}

	<button
		type="button"
		class="t-chip"
		class:t-chip--icon={compact}
		class:hdr__square={compact}
		aria-label={ui.phase === Phase.PAUSED ? 'Продолжить' : 'Перерыв'}
		disabled={!canPause}
		onclick={() => game.togglePause()}
	>
		{#if compact}
			<svg viewBox="0 0 24 24" aria-hidden="true">
				{#if ui.phase === Phase.PAUSED}
					<path d="M7 4l13 8-13 8z" fill="currentColor" />
				{:else}
					<path
						d="M7 5v14M17 5v14"
						fill="none"
						stroke="currentColor"
						stroke-width="3.5"
						stroke-linecap="round"
					/>
				{/if}
			</svg>
		{:else}
			{ui.phase === Phase.PAUSED ? 'К СТАНКУ' : 'ПЕРЕРЫВ'} <kbd>P</kbd>
		{/if}
	</button>

	{#if !compact}
		<a href={resolve('/')} class="t-chip t-chip--red">◄ В АРКАДУ</a>
	{/if}
</header>

<style>
	.hdr {
		position: relative;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 14px;
		height: 64px;
		box-sizing: border-box;
		padding: 0 24px;
		color: var(--t-cream);
		background: var(--t-ink);
		border-bottom: 5px double var(--t-gold);
	}

	.hdr__medal {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		flex: none;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #d8443c, var(--t-red-deep) 75%);
		box-shadow:
			0 0 0 2px var(--t-gold),
			0 0 0 4px var(--t-ink),
			0 0 0 5px rgba(227, 167, 47, 0.5);
	}

	.hdr__medal svg {
		width: 20px;
		height: 20px;
		fill: var(--t-cream);
	}

	.hdr__title {
		font-family: var(--t-font-display);
		font-size: 22px;
		letter-spacing: 0.08em;
	}

	.hdr__flag {
		padding: 3px 14px 3px 10px;
		font-family: var(--t-font-display);
		font-size: 13px;
		letter-spacing: 0.1em;
		color: var(--t-ink);
		background: var(--t-gold);
		clip-path: polygon(0 0, 100% 0, 92% 50%, 100% 100%, 0 100%);
	}

	.hdr__meta {
		margin-left: 10px;
		font-size: 12px;
		color: rgba(237, 227, 203, 0.55);
	}

	.hdr__spacer {
		flex-grow: 1;
	}

	.hdr__square {
		width: 38px;
	}

	.hdr--compact {
		gap: 8px;
		height: calc(56px + env(safe-area-inset-top));
		padding: env(safe-area-inset-top) 10px 0;
	}

	.hdr--compact .hdr__medal {
		width: 26px;
		height: 26px;
		box-shadow: 0 0 0 2px var(--t-gold);
	}

	.hdr--compact .hdr__medal svg {
		width: 13px;
		height: 13px;
	}

	.hdr--compact .hdr__title {
		font-size: 16px;
		letter-spacing: 0.06em;
	}

	.hdr--compact .t-chip {
		height: 36px;
		box-shadow: 2px 2px 0 #000;
	}

	.hdr--compact .hdr__square {
		width: 36px;
	}

	.hdr__score {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		line-height: 1;
	}

	.hdr__score span {
		font-size: 9px;
		letter-spacing: 0.22em;
		color: rgba(237, 227, 203, 0.55);
	}

	.hdr__score b {
		font-size: 21px;
		color: var(--t-gold-hi);
		white-space: nowrap;
	}

	@media (max-width: 360px) {
		.hdr--compact .hdr__title {
			display: none;
		}
	}
</style>
