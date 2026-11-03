<!-- Карниз храма над ареной: очки, печать, серия. Фон — тот же базальт, что стены. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { COLS } from '../config';
	import { OP_NAME, formatScore, lang, roman, tr } from '../i18n';
	import { drawBand } from '../view/arena';
	import { actionsStore, hudStore } from './stores';

	const hud = $derived($hudStore);
	const l = $derived($lang);
	const mult = $derived(Math.max(1, Math.min(hud.streak, 5)));
	const scoreText = $derived(formatScore(hud.score));
	const coarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

	let canvas = $state<HTMLCanvasElement | undefined>(undefined);

	function paint(width: number): void {
		if (!canvas || width <= 0) return;
		const h = Math.round(width * 0.105);
		const dpr = Math.min(2, window.devicePixelRatio || 1);
		canvas.width = Math.round(width * dpr);
		canvas.height = Math.round(h * dpr);
		const b = canvas.getContext('2d');
		if (!b) return;
		b.setTransform(dpr, 0, 0, dpr, 0, 0);
		drawBand(b, width, h, COLS);
	}

	$effect(() => {
		paint(hud.width);
	});

	onMount(() => paint(hud.width));
</script>

{#if hud.width > 0}
	<div class="band" class:hidden={!hud.visible} style:width="{hud.width}px">
		<canvas bind:this={canvas} aria-hidden="true"></canvas>
		<div class="row">
			<div class="col l">
				{#if coarse}
					<button
						type="button"
						class="pause"
						aria-label={tr('pause', l)}
						onclick={() => $actionsStore?.pause()}
					>
						<span></span><span></span>
					</button>
				{/if}
				<div class="col">
					<span class="lbl">{tr('score', l)}</span>
					<span class="num">{scoreText}</span>
				</div>
			</div>

			<div class="c">
				<svg class="seal" viewBox="0 0 48 48" aria-hidden="true">
					<defs>
						<linearGradient id="snake-bronze" x1="0" y1="0" x2="1" y2="1">
							<stop offset="0" stop-color="#e3bd70" />
							<stop offset="0.45" stop-color="#7a5528" />
							<stop offset="0.7" stop-color="#c99a52" />
							<stop offset="1" stop-color="#4a3218" />
						</linearGradient>
					</defs>
					<circle cx="24" cy="25.2" r="22" fill="rgba(0,0,0,0.6)" />
					<circle cx="24" cy="24" r="21" fill="url(#snake-bronze)" />
					<circle cx="24" cy="24" r="16" fill="#08090b" />
					<circle cx="24" cy="24" r="16" fill="none" stroke="rgba(0,0,0,0.7)" stroke-width="2" />
					<circle
						cx="24"
						cy="24"
						r="12.5"
						fill="none"
						stroke="rgba(240,199,102,0.3)"
						stroke-width="0.8"
					/>
					{#if hud.op === 'or'}
						<path d="M24 16 L24 32" class="glyph" class:bad={hud.touching > 0 && !hud.ok} />
					{:else if hud.op === 'xor'}
						<path
							d="M16 28.5 L24 17.5 L32 28.5"
							class="glyph"
							class:bad={hud.touching > 0 && !hud.ok}
						/>
					{:else if hud.op === 'and'}
						<text
							x="24"
							y="31"
							text-anchor="middle"
							class="amp"
							class:bad={hud.touching > 0 && !hud.ok}>&amp;</text
						>
					{/if}
				</svg>
				<div class="col">
					<span class="seal-name">
						{tr('act', l)}
						{roman(hud.act)}{#if hud.op}&nbsp;· {OP_NAME[hud.op]}{/if}
					</span>
					{#if hud.op && hud.touching > 0}
						<span class="status" class:ok={hud.ok} class:bad={!hud.ok}
							>{hud.ok ? tr('ok', l) : tr('fail', l)}</span
						>
					{:else if hud.op}
						<span class="status muted">{tr('encircle', l)}</span>
					{:else}
						<span class="status muted">{tr('hiding', l)}</span>
					{/if}
				</div>
			</div>

			<div class="col r">
				<span class="lbl">{tr('streak', l)}</span>
				<span class="num">×{mult}</span>
				{#if hud.op}
					<span class="ring-count">{tr('ring', l)} {hud.touching} / {hud.total}</span>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.band {
		position: relative;
		aspect-ratio: 1 / 0.105;
		container-type: inline-size;
		user-select: none;
		-webkit-user-select: none;
	}
	.band.hidden .row {
		visibility: hidden;
	}
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		display: block;
	}
	.row {
		position: absolute;
		left: 0;
		right: 0;
		top: 15%;
		bottom: 22%;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 1.6cqw;
		padding: 0 2.6cqw;
	}
	.col {
		display: flex;
		flex-direction: column;
		line-height: 1.05;
	}
	.l {
		flex-direction: row;
		align-items: center;
		gap: 1.4cqw;
		justify-self: start;
	}
	.r {
		align-items: flex-end;
		justify-self: end;
		text-align: right;
	}
	.c {
		display: flex;
		align-items: center;
		gap: 1.1cqw;
	}
	.lbl {
		font:
			700 1.3cqw 'Alegreya Sans SC',
			'Alegreya Sans',
			system-ui,
			sans-serif;
		letter-spacing: 0.16em;
		color: #d6d0bf;
		text-shadow: 0 0.12cqw 0 rgba(0, 0, 0, 0.75);
	}
	.num {
		font:
			400 3.5cqw 'Forum',
			'Times New Roman',
			Georgia,
			serif;
		color: #f0c766;
		text-shadow:
			0 -0.12cqw 0 rgba(0, 0, 0, 0.9),
			0 0.14cqw 0 rgba(255, 236, 190, 0.28);
		font-variant-numeric: tabular-nums;
	}
	.seal {
		width: 5.6cqw;
		height: 5.6cqw;
		flex: none;
	}
	.glyph {
		fill: none;
		stroke: #f0c766;
		stroke-width: 3.2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.glyph.bad {
		stroke: #e0384f;
	}
	.amp {
		font:
			20px 'Forum',
			Georgia,
			serif;
		fill: #f0c766;
	}
	.amp.bad {
		fill: #e0384f;
	}
	.seal-name {
		font:
			400 2.1cqw 'Forum',
			'Times New Roman',
			Georgia,
			serif;
		color: #e6e0cf;
		letter-spacing: 0.04em;
		text-shadow: 0 0.12cqw 0 rgba(0, 0, 0, 0.8);
	}
	.status {
		font:
			800 1.4cqw 'Alegreya Sans SC',
			'Alegreya Sans',
			system-ui,
			sans-serif;
		letter-spacing: 0.1em;
		margin-top: 0.3cqw;
		text-shadow:
			0 -0.1cqw 0 rgba(0, 0, 0, 0.9),
			0 0.12cqw 0 rgba(255, 236, 190, 0.2);
	}
	.status::before {
		content: '';
		display: inline-block;
		width: 0.8em;
		height: 0.8em;
		margin-right: 0.45em;
		vertical-align: -0.05em;
		background: currentColor;
		clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
	}
	.status.ok {
		color: #f0c766;
	}
	.status.bad {
		color: #e0384f;
	}
	.status.muted {
		color: #b9b29e;
	}
	.ring-count {
		font:
			700 1.3cqw 'Alegreya Sans SC',
			'Alegreya Sans',
			system-ui,
			sans-serif;
		letter-spacing: 0.12em;
		color: #5fe0cc;
		margin-top: 0.2cqw;
		text-shadow: 0 0.12cqw 0 rgba(0, 0, 0, 0.8);
	}
	.pause {
		width: 4.6cqw;
		height: 4.6cqw;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.8cqw;
		border: 0;
		background: rgba(10, 13, 13, 0.55);
		box-shadow:
			inset 0 0.2cqw 0 rgba(0, 0, 0, 0.6),
			0 0.15cqw 0 rgba(230, 240, 235, 0.15);
		cursor: pointer;
		touch-action: manipulation;
	}
	.pause span {
		width: 0.8cqw;
		height: 2.4cqw;
		background: #f0c766;
	}
</style>
