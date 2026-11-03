<script lang="ts">
	import { Phase } from '../core/types';
	import { STAR_PATH } from './icons';
	import { ui } from './store.svelte';

	interface Props {
		compact: boolean;
		frame?: HTMLDivElement | null;
		host?: HTMLDivElement | null;
	}

	let { compact, frame = $bindable(null), host = $bindable(null) }: Props = $props();

	const countdownText = $derived(
		ui.countdown ? (ui.countdown.step > 0 ? String(ui.countdown.step) : 'ПУСК!') : ''
	);
	const showCountdown = $derived(
		ui.countdown !== null && (ui.phase === Phase.COUNTDOWN || ui.countdown.step === 0)
	);
</script>

<div class="field" class:field--compact={compact} bind:this={frame}>
	{#if !compact}
		{#each ['tl', 'tr', 'bl', 'br'] as corner (corner)}
			<svg class="field__corner field__corner--{corner}" viewBox="0 0 100 100" aria-hidden="true">
				<path d={STAR_PATH} />
			</svg>
		{/each}
		<div class="field__head">
			<span>УЧАСТОК 10 × 20</span>
			<span class="field__head-level">ПЯТИЛЕТКА №{ui.level}</span>
		</div>
	{/if}

	<div class="field__well">
		<div class="field__host" bind:this={host}></div>

		<div class="field__fx">
			{#if showCountdown && ui.countdown}
				{#key ui.countdown.key}
					<div class="field__countdown" class:field__countdown--go={ui.countdown.step === 0}>
						{countdownText}
					</div>
				{/key}
			{/if}

			{#if ui.callout}
				{#key ui.callout.key}
					<div class="callout callout--{ui.callout.tone}">
						<span class="callout__title">{ui.callout.title}</span>
						{#if ui.callout.sub}<span class="callout__sub">{ui.callout.sub}</span>{/if}
						<span class="callout__points">+{ui.callout.points}</span>
					</div>
				{/key}
			{/if}

			{#if ui.levelUp}
				{#key ui.levelUp.key}
					<div class="ribbon">
						<span>ПЯТИЛЕТКА №{ui.levelUp.level} — ДОСРОЧНО!</span>
					</div>
				{/key}
			{/if}
		</div>
	</div>
</div>

<style>
	.field {
		position: relative;
		padding: 10px 10px 12px;
		background: var(--t-ink);
		border: 4px solid var(--t-paper);
		box-shadow:
			0 0 0 4px var(--t-ink),
			14px 14px 0 rgba(15, 8, 6, 0.45);
	}

	.field--compact {
		padding: 3px;
		border-width: 2px;
		box-shadow:
			0 0 0 2px var(--t-ink),
			5px 5px 0 rgba(15, 8, 6, 0.45);
	}

	.field__head {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		padding: 0 2px 8px;
		font-family: var(--t-font-display);
		font-size: 11px;
		letter-spacing: 0.16em;
		color: var(--t-paper);
		white-space: nowrap;
	}

	.field__head-level {
		color: var(--t-gold);
	}

	.field__corner {
		position: absolute;
		width: 22px;
		height: 22px;
		fill: var(--t-gold);
		filter: drop-shadow(2px 2px 0 rgba(0, 0, 0, 0.6));
	}

	.field__corner--tl {
		top: -13px;
		left: -13px;
	}

	.field__corner--tr {
		top: -13px;
		right: -13px;
	}

	.field__corner--bl {
		bottom: -13px;
		left: -13px;
	}

	.field__corner--br {
		bottom: -13px;
		right: -13px;
	}

	.field__well {
		position: relative;
		overflow: hidden;
		line-height: 0;
	}

	.field__host {
		line-height: 0;
	}

	.field__countdown {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		font-family: var(--t-font-display);
		font-size: clamp(48px, 18cqw, 120px);
		line-height: 1;
		color: var(--t-paper);
		text-shadow:
			5px 5px 0 var(--t-red),
			9px 9px 0 rgba(0, 0, 0, 0.5);
		pointer-events: none;
		animation: count 0.5s cubic-bezier(0.2, 0.8, 0.3, 1) forwards;
	}

	.field__countdown--go {
		font-size: clamp(30px, 11cqw, 64px);
		color: var(--t-gold-hi);
		animation-duration: 0.7s;
	}

	.field__fx {
		position: absolute;
		inset: 0;
		container-type: size;
		pointer-events: none;
	}

	@keyframes count {
		0% {
			opacity: 0;
			transform: scale(1.8);
		}
		25% {
			opacity: 1;
			transform: scale(1);
		}
		75% {
			opacity: 1;
		}
		100% {
			opacity: 0;
			transform: scale(0.9);
		}
	}

	.callout {
		position: absolute;
		top: 34%;
		left: 50%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		line-height: 1;
		white-space: nowrap;
		pointer-events: none;
		transform: translate(-50%, -50%);
		animation: callout 1.15s ease forwards;
	}

	.callout__title {
		padding: 0.3em 0.7em;
		font-family: var(--t-font-display);
		font-size: clamp(14px, 8cqw, 24px);
		color: var(--t-paper);
		background: var(--t-red);
		border: 3px solid var(--t-ink);
		box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.5);
		transform: rotate(-5deg);
	}

	.callout__sub {
		padding: 0.25em 0.6em;
		font-family: var(--t-font-display);
		font-size: clamp(9px, 4.5cqw, 13px);
		letter-spacing: 0.08em;
		color: var(--t-ink);
		background: var(--t-gold);
		border: 2px solid var(--t-ink);
		transform: rotate(-3deg);
	}

	.callout__points {
		font-family: var(--t-font-display);
		font-size: clamp(12px, 6cqw, 18px);
		color: var(--t-gold-hi);
		text-shadow: 2px 2px 0 var(--t-ink);
	}

	.callout--small .callout__title {
		font-size: clamp(11px, 5.5cqw, 16px);
		background: var(--t-ink);
		border-color: var(--t-paper);
	}

	.callout--great .callout__title {
		font-size: clamp(18px, 11cqw, 34px);
		color: var(--t-ink);
		background: var(--t-gold);
	}

	.callout--great {
		animation-duration: 1.6s;
	}

	@keyframes callout {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.4);
		}
		14% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1.1);
		}
		24%,
		72% {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -75%) scale(1);
		}
	}

	.ribbon {
		position: absolute;
		top: 16%;
		left: 0;
		right: 0;
		display: flex;
		justify-content: center;
		pointer-events: none;
	}

	.ribbon span {
		padding: 0.45em 1.2em;
		font-family: var(--t-font-display);
		font-size: clamp(10px, 5cqw, 17px);
		line-height: 1;
		white-space: nowrap;
		color: var(--t-ink);
		background: var(--t-gold);
		border: 3px solid var(--t-ink);
		box-shadow: 5px 5px 0 rgba(0, 0, 0, 0.45);
		opacity: 0;
		animation: ribbon 2.2s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
	}

	@keyframes ribbon {
		0% {
			opacity: 0;
			transform: translateX(-120%) skewX(-8deg);
		}
		14%,
		78% {
			opacity: 1;
			transform: translateX(0) skewX(-8deg);
		}
		100% {
			opacity: 0;
			transform: translateX(120%) skewX(-8deg);
		}
	}
</style>
