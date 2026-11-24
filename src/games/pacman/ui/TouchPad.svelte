<!-- The on-screen stick (a touch screen with the STICK control scheme; the owner's pick A,
	2026-11-24): a floating stick, no small arrows. A finger anywhere in the zone under the left
	thumb (the left of the lower HUD band on a tall screen, the left margin on a landscape one)
	sets the stick's base there; dragging steers toward the side the knob leans to and keeps
	steering while the finger stays; a drag past the rim pulls the base along; letting go stops.
	At rest a faint stick waits where the thumb usually lands. Never over the maze. -->
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
	let zone: HTMLDivElement | undefined = $state();
	/** The base and the knob, px inside the zone; null base: the resting hint. */
	let base: { x: number; y: number } | null = $state(null);
	let knob = $state({ x: 0, y: 0 });

	/** The lower HUD band of a tall screen (`hudLayout`): the zone stays inside it, off the maze. */
	const band = $derived(HUD_STACK_BAND * scale);
	/** The base's radius, px. */
	const R = $derived(
		mode === 'stack'
			? Math.round(Math.min(64, Math.max(44, band * 0.3)))
			: Math.round(Math.min(72, Math.max(52, 62 * scale)))
	);
	/** The zone: under the left thumb, px. */
	const zoneW = $derived(mode === 'stack' ? '58vw' : '30vw');
	const zoneH = $derived(mode === 'stack' ? `${Math.round(band * 0.78)}px` : '72vh');
	/** Where the resting hint stands inside the zone. */
	let size = $state({ w: 0, h: 0 });
	const rest = $derived({ x: Math.min(size.w / 2, R * 1.6 + 8), y: size.h - R - 10 });
	const at = $derived(base ?? rest);
	const lean = $derived(base ? knob : { x: 0, y: 0 });

	function set(direction: Direction | null): void {
		if (direction === active) return;
		active = direction;
		steer(direction);
	}

	function local(event: PointerEvent): { x: number; y: number } {
		const r = zone?.getBoundingClientRect();
		return r ? { x: event.clientX - r.left, y: event.clientY - r.top } : { x: 0, y: 0 };
	}

	/** Lean the knob toward the finger; a finger past the rim drags the base along. */
	function lead(p: { x: number; y: number }): void {
		if (!base) return;
		let dx = p.x - base.x;
		let dy = p.y - base.y;
		const d = Math.hypot(dx, dy);
		if (d > R) {
			base = { x: p.x - (dx / d) * R, y: p.y - (dy / d) * R };
			dx = (dx / d) * R;
			dy = (dy / d) * R;
		}
		knob = { x: dx, y: dy };
		// a small dead zone; inside it the last way holds (a thumb resting should not stop him)
		if (Math.hypot(dx, dy) < R * 0.28) return;
		if (Math.abs(dx) >= Math.abs(dy)) set(dx > 0 ? 'RIGHT' : 'LEFT');
		else set(dy > 0 ? 'DOWN' : 'UP');
	}

	function down(event: PointerEvent): void {
		if (pointer !== null) return;
		event.preventDefault();
		pointer = event.pointerId;
		zone?.setPointerCapture(event.pointerId);
		const p = local(event);
		// the base under the thumb, but whole inside the zone
		base = {
			x: Math.min(Math.max(p.x, R), Math.max(R, size.w - R)),
			y: Math.min(Math.max(p.y, R), Math.max(R, size.h - R))
		};
		knob = { x: 0, y: 0 };
		lead(p);
	}

	function move(event: PointerEvent): void {
		if (event.pointerId !== pointer) return;
		event.preventDefault();
		lead(local(event));
	}

	function up(event: PointerEvent): void {
		if (event.pointerId !== pointer) return;
		pointer = null;
		base = null;
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
	class="zone"
	class:stack={mode === 'stack'}
	bind:this={zone}
	bind:clientWidth={size.w}
	bind:clientHeight={size.h}
	data-no-swipe
	role="group"
	aria-label="stick"
	style:width={zoneW}
	style:height={zoneH}
	onpointerdown={down}
	onpointermove={move}
	onpointerup={up}
	onpointercancel={up}
	onlostpointercapture={up}
>
	<svg
		class="stick"
		class:resting={!base}
		width={R * 2 + 16}
		height={R * 2 + 16}
		viewBox="{-R - 8} {-R - 8} {R * 2 + 16} {R * 2 + 16}"
		style:left="{at.x - R - 8}px"
		style:top="{at.y - R - 8}px"
		aria-hidden="true"
	>
		<defs>
			<radialGradient id="stick-wood" cx="0.4" cy="0.35" r="0.75">
				<stop offset="0" stop-color="#f3cf95" />
				<stop offset="0.7" stop-color="#d49a5a" />
				<stop offset="1" stop-color="#a86a34" />
			</radialGradient>
		</defs>
		<circle r={R} fill="rgba(36,20,24,.32)" stroke="#241418" stroke-width="3" />
		<circle
			r={R * 0.72}
			fill="none"
			stroke="rgba(255,240,220,.4)"
			stroke-width="2"
			stroke-dasharray="4 6"
		/>
		{#each ARROWS as a (a.d)}
			<g transform="rotate({a.rot})">
				<path
					d="M0 {-R * 0.95} L{R * 0.16} {-R * 0.74} L{-R * 0.16} {-R * 0.74} Z"
					fill={active === a.d ? '#ffe08a' : 'rgba(255,244,224,.7)'}
					stroke="#241418"
					stroke-width="2"
					stroke-linejoin="round"
				/>
			</g>
		{/each}
		<circle cx={lean.x + 3} cy={lean.y + 5} r={R * 0.44} fill="rgba(0,0,0,.25)" />
		<circle
			cx={lean.x}
			cy={lean.y}
			r={R * 0.44}
			fill="url(#stick-wood)"
			stroke="#241418"
			stroke-width="4"
		/>
		<circle cx={lean.x - R * 0.12} cy={lean.y - R * 0.14} r={R * 0.16} fill="#f6dcae" />
	</svg>
</div>

<style>
	.zone {
		position: fixed;
		z-index: 30;
		left: env(safe-area-inset-left, 0px);
		bottom: calc(env(safe-area-inset-bottom, 0px) + 12vh);
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}
	.zone.stack {
		bottom: env(safe-area-inset-bottom, 0px);
	}
	.stick {
		position: absolute;
		display: block;
		overflow: visible;
		pointer-events: none;
	}
	.stick.resting {
		opacity: 0.55;
	}
</style>
