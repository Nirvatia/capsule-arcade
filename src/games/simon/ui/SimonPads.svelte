<script lang="ts">
	import type { Snippet } from 'svelte';
	import { PADS, PAD_LABELS, type Pad } from '../logic/types';

	interface Props {
		litPad: Pad | null;
		pressedPad: Pad | null;
		pressCount?: number;
		locked: boolean;
		dimmed?: boolean;
		onPress: (pad: Pad) => void;
		children?: Snippet;
	}

	let {
		litPad,
		pressedPad,
		pressCount = 0,
		locked,
		dimmed = false,
		onPress,
		children
	}: Props = $props();

	const ICONS: Readonly<Record<Pad, string>> = { 0: '✔', 1: '💾', 2: '✖', 3: '⚡' };

	function handleDown(event: PointerEvent, pad: Pad): void {
		// preventDefault не даёт кнопке забрать фокус: Пробел/Enter остаются за игрой.
		event.preventDefault();
		onPress(pad);
	}
</script>

<div class="simon" class:locked class:dimmed>
	{#each PADS as pad (pad)}
		<button
			type="button"
			class="pad"
			data-pad={pad}
			class:lit={litPad === pad}
			class:pressed={pressedPad === pad}
			tabindex="-1"
			aria-label="{pad + 1}: {PAD_LABELS[pad]}"
			onpointerdown={(event) => handleDown(event, pad)}
		>
			{#if pressedPad === pad}
				{#key pressCount}
					<span class="ring" aria-hidden="true"></span>
				{/key}
			{/if}
			<span class="face">
				<span class="ico" aria-hidden="true">{ICONS[pad]}</span>
				<span class="lbl">{PAD_LABELS[pad]}</span>
				<kbd>{pad + 1}</kbd>
			</span>
		</button>
	{/each}

	<div class="hub">
		{@render children?.()}
	</div>
</div>

<style>
	.simon {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 3.5%;
		padding: 4.5%;
		border-radius: 50%;
		background: radial-gradient(circle at 50% 35%, #2a1f55, #120b2b 70%);
		box-shadow:
			0 0 0 6px var(--s-line),
			0 14px 0 6px rgba(0, 0, 0, 0.35),
			0 0 60px rgba(255, 210, 31, 0.08);
	}

	.pad {
		--c: #2ed573;
		--c-dark: #12703a;
		position: relative;
		overflow: hidden;
		padding: 0;
		border: 0;
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
		color: #fff;
		background:
			radial-gradient(circle at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.18)),
			linear-gradient(160deg, var(--c), var(--c-dark));
		box-shadow:
			inset 0 -8px 0 rgba(0, 0, 0, 0.28),
			inset 0 6px 0 rgba(255, 255, 255, 0.22);
		filter: saturate(0.75) brightness(0.78);
		transition:
			filter 0.12s,
			transform 0.12s,
			box-shadow 0.12s;
	}

	.pad[data-pad='0'] {
		border-radius: 100% 0 0 0;
	}
	.pad[data-pad='1'] {
		--c: #3f8cff;
		--c-dark: #1a3f8f;
		border-radius: 0 100% 0 0;
	}
	.pad[data-pad='2'] {
		--c: #ff4757;
		--c-dark: #8c1724;
		border-radius: 0 0 0 100%;
	}
	.pad[data-pad='3'] {
		--c: #ffc61f;
		--c-dark: #a86d00;
		border-radius: 0 0 100% 0;
		color: #2a1600;
	}

	.pad:hover {
		filter: saturate(0.9) brightness(0.9);
	}

	.pad.lit,
	.pad.pressed {
		filter: saturate(1.15) brightness(1.25);
		box-shadow:
			inset 0 -4px 0 rgba(0, 0, 0, 0.2),
			inset 0 0 40px rgba(255, 255, 255, 0.45),
			0 0 34px var(--c);
		z-index: 1;
	}

	.pad.pressed {
		transform: scale(0.94);
		box-shadow:
			inset 0 6px 14px rgba(0, 0, 0, 0.35),
			0 0 30px var(--c);
	}

	.ring {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 20px;
		height: 20px;
		margin: -10px 0 0 -10px;
		border: 4px solid rgba(255, 255, 255, 0.9);
		border-radius: 50%;
		pointer-events: none;
		animation: ring 0.45s ease-out forwards;
	}

	@keyframes ring {
		to {
			transform: scale(14);
			opacity: 0;
			border-width: 1px;
		}
	}

	.locked .pad:not(.lit) {
		cursor: default;
		filter: saturate(0.55) brightness(0.6);
	}

	.dimmed .pad:not(.lit) {
		filter: saturate(0.35) brightness(0.45);
	}

	.face {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15em;
		translate: -50% -50%;
		font-size: clamp(10px, 3.4cqmin, 17px);
		pointer-events: none;
	}

	.pad[data-pad='0'] .face {
		left: 56%;
		top: 56%;
	}
	.pad[data-pad='1'] .face {
		left: 44%;
		top: 56%;
	}
	.pad[data-pad='2'] .face {
		left: 56%;
		top: 44%;
	}
	.pad[data-pad='3'] .face {
		left: 44%;
		top: 44%;
	}

	.ico {
		font-size: 1.9em;
		line-height: 1;
		filter: drop-shadow(0 2px 0 rgba(0, 0, 0, 0.3));
	}

	.lbl {
		font-family: var(--s-display);
		letter-spacing: 0.04em;
		text-transform: uppercase;
		text-shadow: 0 2px 0 rgba(0, 0, 0, 0.3);
		white-space: nowrap;
	}

	.pad[data-pad='3'] .lbl {
		text-shadow: 0 1px 0 rgba(255, 255, 255, 0.4);
	}

	kbd {
		font-family: var(--s-body);
		font-size: 0.75em;
		font-weight: 800;
		padding: 0.05em 0.5em;
		border-radius: 6px;
		background: rgba(0, 0, 0, 0.28);
		color: #fff;
	}

	.hub {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 34%;
		aspect-ratio: 1;
		translate: -50% -50%;
		z-index: 2;
		display: grid;
		place-items: center;
		border-radius: 50%;
		background: radial-gradient(circle at 50% 30%, #2d2160, #160e33);
		box-shadow:
			0 0 0 6px var(--s-line),
			0 6px 0 6px rgba(0, 0, 0, 0.35);
		container-type: inline-size;
	}

	@media (pointer: coarse) {
		kbd {
			display: none;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.pad {
			transition: none;
		}
	}
</style>
