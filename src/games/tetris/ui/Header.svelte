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
	const score = $derived(String(ui.score).padStart(6, '0'));
</script>

<header class="hdr" class:hdr--compact={compact}>
	<a href={resolve('/')} class="hdr__back" aria-label="В аркаду">
		<span aria-hidden="true">◄</span>
		{#if !compact}<span>В АРКАДУ</span>{/if}
	</a>

	<div class="hdr__logo">
		<svg class="hdr__star" viewBox="0 0 100 100" aria-hidden="true"><path d={STAR_PATH} /></svg>
		<span
			>ТЕТРИС{#if !compact}&nbsp;<em>«ПЯТИЛЕТКА»</em>{/if}</span
		>
	</div>

	{#if compact}
		<div class="hdr__score" aria-label="Очки">
			<span class="hdr__score-label">ОЧКИ</span>
			<span class="hdr__score-value">{score}</span>
		</div>
	{/if}

	<div class="hdr__actions">
		<button
			type="button"
			class="t-icon-btn"
			aria-label={ui.muted ? 'Включить звук' : 'Выключить звук'}
			title="Звук [M]"
			onclick={() => game.toggleMute()}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
				{#if ui.muted}
					<path
						d="M16 9l6 6M22 9l-6 6"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				{:else}
					<path
						d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				{/if}
			</svg>
		</button>
		<button
			type="button"
			class="t-icon-btn"
			aria-label={ui.phase === Phase.PAUSED ? 'Продолжить' : 'Пауза'}
			title="Пауза [P]"
			disabled={!canPause}
			onclick={() => game.togglePause()}
		>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				{#if ui.phase === Phase.PAUSED}
					<path d="M7 4l13 8-13 8z" fill="currentColor" />
				{:else}
					<path d="M6 4h4v16H6zM14 4h4v16h-4z" fill="currentColor" />
				{/if}
			</svg>
		</button>
	</div>
</header>

<style>
	.hdr {
		position: relative;
		z-index: 5;
		display: flex;
		align-items: center;
		gap: 16px;
		padding: 10px 20px;
		color: var(--t-paper);
		background: var(--t-ink);
		border-bottom: 4px solid var(--t-gold);
	}

	.hdr__back {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		height: 38px;
		padding: 0 14px;
		font-family: var(--t-font-display);
		font-size: 12px;
		letter-spacing: 0.14em;
		color: var(--t-paper);
		text-decoration: none;
		border: 2px solid rgba(237, 227, 203, 0.55);
		transition:
			background 0.15s,
			color 0.15s;
	}

	.hdr__back:hover {
		color: var(--t-ink);
		background: var(--t-paper);
	}

	.hdr__logo {
		display: flex;
		align-items: center;
		gap: 10px;
		font-family: var(--t-font-display);
		font-size: 18px;
		letter-spacing: 0.08em;
		white-space: nowrap;
	}

	.hdr__logo em {
		font-style: normal;
		color: var(--t-gold);
	}

	.hdr__star {
		width: 26px;
		height: 26px;
		fill: var(--t-red);
		stroke: var(--t-paper);
		stroke-width: 4;
	}

	.hdr__actions {
		display: flex;
		gap: 8px;
		margin-left: auto;
	}

	.hdr--compact {
		gap: 10px;
		padding: 6px 10px;
		padding-top: calc(6px + env(safe-area-inset-top));
		border-bottom-width: 3px;
	}

	.hdr--compact .hdr__back {
		justify-content: center;
		width: 38px;
		padding: 0;
	}

	.hdr--compact .hdr__logo {
		font-size: 15px;
		gap: 6px;
	}

	.hdr--compact .hdr__star {
		width: 20px;
		height: 20px;
	}

	.hdr__score {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		margin-left: auto;
		line-height: 1;
	}

	.hdr__score-label {
		font-family: var(--t-font-body);
		font-size: 9px;
		font-weight: 500;
		letter-spacing: 0.24em;
		color: rgba(237, 227, 203, 0.6);
	}

	.hdr__score-value {
		font-family: var(--t-font-display);
		font-size: 20px;
		color: var(--t-gold-hi);
		font-variant-numeric: tabular-nums;
	}

	.hdr--compact .hdr__actions {
		margin-left: 0;
	}

	@media (max-width: 360px) {
		.hdr--compact .hdr__logo span {
			display: none;
		}
	}
</style>
