<!-- The station's strip above the maze (the boss bar's place): a slim riveted steel plate with two
	gauges side by side, the hatch's charge (cool green) and the infection (amber to red), each with
	its name and number; in the escape the hatch's line turns to the alarm, pulsing slowly. Strict and small:
	it must read at a glance and hide little of the station. -->
<script lang="ts">
	let {
		w = 600,
		charge,
		infection,
		escape,
		hatchLabel,
		infectionLabel,
		alarmLabel,
		uid = 'sb'
	}: {
		w?: number;
		charge: number;
		infection: number;
		escape: boolean;
		hatchLabel: string;
		infectionLabel: string;
		alarmLabel: string;
		uid?: string;
	} = $props();

	const clamp = (v: number) => Math.max(0, Math.min(1, v));
	const compact = $derived(w < 500);
	const x0 = $derived(compact ? 16 : 30);
	const y0 = $derived(compact ? 22 : 30);
	const bh = $derived(compact ? 12 : 16);
	const gap = $derived(compact ? 18 : 28);
	const gw = $derived((w - 2 * x0 - gap) / 2);
	const fs = $derived(compact ? 9 : 11);
	const gauges = $derived([
		{ x: x0, label: hatchLabel, k: clamp(charge), from: '#3fae8e', to: '#c8ffe8' },
		{ x: x0 + gw + gap, label: infectionLabel, k: clamp(infection), from: '#d0903a', to: '#ff4a36' }
	]);
</script>

<svg viewBox="0 0 {w} {compact ? 56 : 72}" width="100%" aria-hidden="true">
	<defs>
		{#each gauges as g, i (i)}
			<linearGradient id="{uid}-g{i}" x1="0" y1="0" x2="1" y2="0">
				<stop offset="0" stop-color={g.from} />
				<stop offset="1" stop-color={g.to} />
			</linearGradient>
		{/each}
	</defs>
	<!-- the plate -->
	<rect
		x={x0 - 10}
		y={y0 - (compact ? 16 : 20)}
		width={w - 2 * x0 + 20}
		height={bh + (compact ? 24 : 30)}
		rx="4"
		fill="#1a2120"
		stroke="#0b1110"
		stroke-width="2.4"
	/>
	<rect
		x={x0 - 7}
		y={y0 - (compact ? 13 : 17)}
		width={w - 2 * x0 + 14}
		height="2"
		fill="#fff"
		opacity=".12"
	/>
	{#each [x0 - 4, w - x0 + 4] as rx (rx)}
		<circle cx={rx} cy={y0 + bh / 2} r="2.4" fill="#3a4643" stroke="#0b1110" stroke-width="1" />
	{/each}
	{#each gauges as g, i (i)}
		{#if escape && i === 0}
			<!-- the hatch is charged: its gauge's line turns to the alarm -->
			<text class="alarm" x={g.x} y={y0 - (compact ? 4 : 6)} font-size={fs}>{alarmLabel}</text>
		{:else}
			<text class="name" x={g.x} y={y0 - (compact ? 4 : 6)} font-size={fs}>{g.label}</text>
			<text class="val" x={g.x + gw} y={y0 - (compact ? 4 : 6)} font-size={fs} text-anchor="end"
				>{Math.round(g.k * 100)}%</text
			>
		{/if}
		<rect
			x={g.x}
			y={y0}
			width={gw}
			height={bh}
			rx="2"
			fill="#070a0a"
			stroke="#0b1110"
			stroke-width="2"
		/>
		<rect
			x={g.x + 2}
			y={y0 + 2}
			width={Math.max(0, (gw - 4) * g.k)}
			height={bh - 4}
			rx="1"
			fill="url(#{uid}-g{i})"
		/>
		<!-- the notches every tenth -->
		{#each Array.from({ length: 9 }, (_, j) => j + 1) as j (j)}
			<rect
				x={g.x + (gw * j) / 10 - 0.5}
				y={y0 + 2}
				width="1"
				height={bh - 4}
				fill="#070a0a"
				opacity=".55"
			/>
		{/each}
	{/each}
</svg>

<style>
	.name,
	.val {
		font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
		font-weight: 700;
		fill: #d6e6df;
		letter-spacing: 0.06em;
	}
	.alarm {
		font-family: ui-monospace, 'JetBrains Mono', Menlo, monospace;
		font-weight: 800;
		fill: #ff5a46;
		letter-spacing: 0.12em;
		animation: alarm 1.25s ease-in-out infinite;
	}
	@keyframes alarm {
		50% {
			opacity: 0.35;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.alarm {
			animation: none;
		}
	}
</style>
