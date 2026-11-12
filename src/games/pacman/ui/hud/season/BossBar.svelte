<!-- The boss's health bar, redone: a riveted iron plate (the maze's own material) with a dark
	trough in three compartments, one per phase, separated by bulkheads; the fill is hot metal with
	a white-hot leading edge, the compartments already burned out are scorched, and the phase
	reached is lit. Above it: the name, the phase pips and the number. -->
<script lang="ts">
	let {
		w = 600,
		hp,
		hpMax,
		marks,
		phase,
		name,
		phaseLabel,
		flash = false,
		uid = 'bb'
	}: {
		w?: number;
		hp: number;
		hpMax: number;
		marks: readonly number[];
		phase: number;
		name: string;
		phaseLabel: string;
		flash?: boolean;
		uid?: string;
	} = $props();

	const compact = $derived(w < 500);
	const x0 = 26;
	const bw = $derived(w - 2 * x0);
	const bh = $derived(compact ? 18 : 28);
	const y0 = $derived(compact ? 28 : 34);
	const gap = $derived(compact ? 8 : 10);
	const clamp = (v: number) => Math.max(0, Math.min(1, v));

	/** Each compartment's fill 0..1, left = the last phase (it drains from the right). */
	const segments = $derived.by(() => {
		const edges = [1, ...marks, 0].map((m) => m * hpMax);
		const out: number[] = [];
		for (let i = 0; i < edges.length - 1; i++) {
			out.push(clamp((hp - edges[i + 1]) / (edges[i] - edges[i + 1])));
		}
		return out.reverse();
	});
	const cw = $derived((bw - gap * 2) / 3);
	const slots = $derived([0, 1, 2].map((i) => ({ x: x0 + i * (cw + gap), w: cw })));
	/** The phase of each compartment, left to right: III, II, I. */
	const slotPhase = [3, 2, 1];
	const numerals = ['', 'I', 'II', 'III'];
	const enraged = $derived(phase >= 3);
	const crack = 'M0 0 L7 -5 L11 3 L19 -4 L24 4 L33 -3';
</script>

<svg viewBox="0 0 {w} {compact ? 56 : 72}" width="100%" aria-hidden="true">
	<defs>
		<linearGradient id="{uid}-fill" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color={enraged ? '#fff0c0' : '#ffd08a'} />
			<stop offset="0.45" stop-color={enraged ? '#ffb040' : '#ff7a2a'} />
			<stop offset="1" stop-color={enraged ? '#e0521a' : '#c8310c'} />
		</linearGradient>
		<linearGradient id="{uid}-plate" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#6a5f62" />
			<stop offset="1" stop-color="#3f363a" />
		</linearGradient>
		<filter id="{uid}-glow" x="-30%" y="-60%" width="160%" height="220%">
			<feGaussianBlur stdDeviation="3" />
		</filter>
	</defs>

	<!-- title row -->
	<text class="name" x={x0} y={compact ? 17 : 21} font-size={compact ? 12 : 17}>{name}</text>
	<g transform="translate({w - x0} {compact ? 11 : 14})">
		{#each [3, 2, 1] as p, i (p)}
			<g transform="translate({-i * (compact ? 15 : 20) - (compact ? 5 : 7)} 0)">
				<path
					d="M0 {-(compact ? 6 : 8)} L{compact ? 6 : 8} 0 L0 {compact ? 6 : 8} L{-(compact
						? 6
						: 8)} 0Z"
					fill={phase >= p ? (p === 3 ? '#fff0c0' : '#ff8a2a') : '#4a2a2e'}
					stroke="#16060a"
					stroke-width="2.4"
					stroke-linejoin="round"
				/>
			</g>
		{/each}
		<text
			class="lab"
			x={-(compact ? 54 : 70)}
			y={compact ? 4 : 5}
			font-size={compact ? 10 : 12}
			text-anchor="end">{phaseLabel} {numerals[phase]}</text
		>
	</g>

	<!-- the plate -->
	<rect x={x0 - 8} y={y0 - 8} width={bw + 16} height={bh + 16} rx="4" fill="#16060a" />
	<rect
		x={x0 - 5}
		y={y0 - 5}
		width={bw + 10}
		height={bh + 10}
		rx="2.5"
		fill="url(#{uid}-plate)"
		stroke="#16060a"
		stroke-width="2"
	/>
	<rect x={x0 - 4} y={y0 - 4} width={bw + 8} height="2" fill="rgba(255,236,214,.28)" />
	<rect x={x0 - 4} y={y0 + bh + 2} width={bw + 8} height="2" fill="rgba(0,0,0,.4)" />
	{#each [x0 - 1, x0 + bw + 1] as rx (rx)}
		{#each [y0 - 1.5, y0 + bh + 1.5] as ry (ry)}
			<circle cx={rx} cy={ry} r="1.9" fill="#16060a" />
			<circle cx={rx - 0.5} cy={ry - 0.5} r="0.9" fill="rgba(255,230,200,.55)" />
		{/each}
	{/each}

	<!-- compartments -->
	{#each slots as slot, i (i)}
		<rect x={slot.x} y={y0} width={slot.w} height={bh} rx="1.5" fill="#14070a" />
		{#if segments[i] <= 0}
			<path
				d={crack}
				transform="translate({slot.x + slot.w * 0.18} {y0 + bh * 0.55}) scale({slot.w / 70})"
				fill="none"
				stroke="#8a2e16"
				stroke-width="1.6"
				stroke-linejoin="round"
				opacity=".5"
			/>
			<path
				d={crack}
				transform="translate({slot.x + slot.w * 0.52} {y0 + bh * 0.4}) scale({slot.w / 80})"
				fill="none"
				stroke="#8a2e16"
				stroke-width="1.6"
				stroke-linejoin="round"
				opacity=".6"
			/>
		{/if}
		{#if segments[i] > 0}
			<rect
				class="trail"
				x={slot.x}
				y={y0}
				width={slot.w * Math.min(1, segments[i] + (flash ? 0.06 : 0))}
				height={bh}
				rx="1.5"
				fill="#ffe8c8"
				opacity=".8"
			/>
			<rect
				class="fill"
				x={slot.x}
				y={y0}
				width={slot.w * segments[i]}
				height={bh}
				rx="1.5"
				fill="url(#{uid}-fill)"
			/>
			<rect
				x={slot.x}
				y={y0}
				width={slot.w * segments[i]}
				height="2.5"
				fill="rgba(255,255,255,.4)"
			/>
			{#if segments[i] < 1}
				<rect
					x={slot.x + slot.w * segments[i] - 6}
					y={y0 - 1}
					width="8"
					height={bh + 2}
					fill="#fff3d0"
					opacity=".9"
					filter="url(#{uid}-glow)"
				/>
				<rect x={slot.x + slot.w * segments[i] - 2} y={y0} width="2.4" height={bh} fill="#fffbe8" />
			{/if}
			{#if flash}
				<rect
					x={slot.x}
					y={y0}
					width={slot.w * segments[i]}
					height={bh}
					fill="#fff"
					opacity=".55"
				/>
			{/if}
		{/if}
		<!-- the phase this compartment holds -->
		<text
			class="num-roman"
			x={slot.x + 7}
			y={y0 + bh / 2 + (compact ? 3.5 : 4.2)}
			font-size={compact ? 9 : 11}
			opacity={phase === slotPhase[i] ? 1 : 0.55}>{numerals[slotPhase[i]]}</text
		>
		{#if phase === slotPhase[i] && segments[i] > 0}
			<rect
				x={slot.x - 1.5}
				y={y0 - 1.5}
				width={slot.w + 3}
				height={bh + 3}
				rx="2.5"
				fill="none"
				stroke={enraged ? '#fff0c0' : '#ffb06a'}
				stroke-width="1.8"
			/>
		{/if}
	{/each}

	<!-- bulkheads -->
	{#each [0, 1] as b (b)}
		{@const bx = slots[b].x + cw + gap / 2}
		<rect
			x={bx - gap / 2 - 1}
			y={y0 - 6}
			width={gap + 2}
			height={bh + 12}
			rx="1.5"
			fill="url(#{uid}-plate)"
			stroke="#16060a"
			stroke-width="2"
		/>
		<circle cx={bx} cy={y0 - 1.5} r="1.7" fill="#16060a" />
		<circle cx={bx} cy={y0 + bh + 1.5} r="1.7" fill="#16060a" />
	{/each}

	<!-- the plate cracks and glows in the last phase -->
	{#if enraged}
		<path
			d={crack}
			transform="translate({x0 + 6} {y0 - 5}) scale(.45)"
			fill="none"
			stroke="#ff7a2a"
			stroke-width="3"
			opacity=".9"
		/>
		<path
			d={crack}
			transform="translate({x0 + bw - 40} {y0 + bh + 5}) scale(.45)"
			fill="none"
			stroke="#ff7a2a"
			stroke-width="3"
			opacity=".9"
		/>
	{/if}

	<text
		class="lab"
		x={w / 2}
		y={compact ? 16 : 20}
		font-size={compact ? 10 : 12}
		text-anchor="middle">{Math.ceil(hp)}</text
	>
</svg>

<style>
	.name {
		font-family: 'Lilita One', 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif;
		fill: #ffd9a0;
		stroke: #2a0608;
		stroke-width: 0.2em;
		paint-order: stroke;
		stroke-linejoin: round;
		letter-spacing: 0.08em;
	}
	.lab {
		font-family: Fredoka, 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif;
		font-weight: 600;
		letter-spacing: 2px;
		fill: #e8d9bd;
		stroke: #16060a;
		stroke-width: 3px;
		paint-order: stroke;
		stroke-linejoin: round;
	}
	.num-roman {
		font-family: Fredoka, 'Arial Rounded MT Bold', 'Trebuchet MS', system-ui, sans-serif;
		font-weight: 600;
		fill: #e8d9bd;
		stroke: #16060a;
		stroke-width: 2.6px;
		paint-order: stroke;
	}
	.fill {
		transition: width 0.08s;
	}
	.trail {
		transition: width 0.5s ease-in 0.3s;
	}
</style>
