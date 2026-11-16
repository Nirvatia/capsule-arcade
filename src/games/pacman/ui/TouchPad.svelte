<!-- The on-screen pad (a touch screen with the PAD control scheme): a round wooden pad with four
	arrows. A finger on it steers toward the side it is on and keeps steering while it stays;
	sliding round turns, letting go stops. It stands low on the left, under the left thumb: in the
	left margin on a landscape screen, inside the lower HUD band (right of the sound knob) on a
	tall one, never over the maze. -->
<script lang="ts">
	import { HUD_STACK_BAND, type HudMode } from '../config/hudLayout';

	type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

	let {
		steer,
		mode,
		scale
	}: { steer: (direction: Direction | null) => void; mode: HudMode; scale: number } = $props();

	let active: Direction | null = $state(null);
	let pointer: number | null = null;
	let pad: HTMLDivElement | undefined = $state();

	/** The lower HUD band of a tall screen (`hudLayout`): the pad stays inside it, off the maze. */
	const band = $derived(HUD_STACK_BAND * scale);
	const size = $derived(
		mode === 'stack'
			? Math.round(Math.min(120, Math.max(92, band * 0.64)))
			: Math.round(Math.min(150, Math.max(104, 128 * scale)))
	);
	const lift = $derived(mode === 'stack' ? Math.round(Math.max(8, band - size - 24)) : 96);

	/** The side of the pad the finger is on; none in the middle. */
	function directionAt(event: PointerEvent): Direction | null {
		if (!pad) return null;
		const r = pad.getBoundingClientRect();
		const dx = event.clientX - (r.left + r.width / 2);
		const dy = event.clientY - (r.top + r.height / 2);
		if (Math.hypot(dx, dy) < r.width * 0.12) return null;
		if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'RIGHT' : 'LEFT';
		return dy > 0 ? 'DOWN' : 'UP';
	}

	function set(direction: Direction | null): void {
		if (direction === active) return;
		active = direction;
		steer(direction);
	}

	function down(event: PointerEvent): void {
		if (pointer !== null) return;
		event.preventDefault();
		pointer = event.pointerId;
		pad?.setPointerCapture(event.pointerId);
		set(directionAt(event));
	}

	function move(event: PointerEvent): void {
		if (event.pointerId !== pointer) return;
		event.preventDefault();
		const direction = directionAt(event);
		// the middle keeps the last way: a thumb rolling over it should not stop the hero
		if (direction) set(direction);
	}

	function up(event: PointerEvent): void {
		if (event.pointerId !== pointer) return;
		pointer = null;
		set(null);
	}

	const ARROWS: ReadonlyArray<{ d: Direction; rot: number }> = [
		{ d: 'UP', rot: 0 },
		{ d: 'RIGHT', rot: 90 },
		{ d: 'DOWN', rot: 180 },
		{ d: 'LEFT', rot: 270 }
	];
</script>

<div
	class="pad"
	class:stack={mode === 'stack'}
	bind:this={pad}
	data-no-swipe
	role="group"
	aria-label="pad"
	style:width="{size}px"
	style:height="{size}px"
	style:--lift="{lift}px"
	onpointerdown={down}
	onpointermove={move}
	onpointerup={up}
	onpointercancel={up}
	onlostpointercapture={up}
>
	<svg viewBox="-60 -60 120 120" width={size} height={size} aria-hidden="true">
		<defs>
			<radialGradient id="pad-wood" cx="0.4" cy="0.35" r="0.75">
				<stop offset="0" stop-color="#f3cf95" />
				<stop offset="0.7" stop-color="#d49a5a" />
				<stop offset="1" stop-color="#a86a34" />
			</radialGradient>
		</defs>
		<circle r="56" fill="rgba(36,20,24,.35)" transform="translate(0 4)" />
		<circle r="55" fill="url(#pad-wood)" stroke="#241418" stroke-width="4" />
		<circle r="40" fill="none" stroke="rgba(120,70,30,.45)" stroke-width="2" />
		<circle r="13" fill="#b77a40" stroke="#241418" stroke-width="3" />
		{#each ARROWS as a (a.d)}
			<g transform="rotate({a.rot})">
				<path
					d="M0 -47 L15 -26 L6 -26 L6 -18 L-6 -18 L-6 -26 L-15 -26 Z"
					fill={active === a.d ? '#fff2a8' : '#fff8ea'}
					stroke="#241418"
					stroke-width="3.2"
					stroke-linejoin="round"
					class:on={active === a.d}
				/>
			</g>
		{/each}
	</svg>
</div>

<style>
	.pad {
		position: fixed;
		z-index: 30;
		left: calc(env(safe-area-inset-left, 0px) + 28px);
		bottom: calc(env(safe-area-inset-bottom, 0px) + var(--lift, 96px));
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		opacity: 0.92;
	}
	.pad.stack {
		/* right of the sound knob */
		left: calc(env(safe-area-inset-left, 0px) + 74px);
	}
	svg {
		display: block;
		overflow: visible;
	}
	path {
		transition: fill 0.08s;
	}
	path.on {
		filter: drop-shadow(0 0 6px rgba(255, 220, 120, 0.9));
	}
</style>
