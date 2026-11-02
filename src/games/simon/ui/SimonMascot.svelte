<script lang="ts">
	import type { Mood, Pad } from '../logic/types';

	interface Props {
		mood?: Mood;
		/** Кнопка, на которую смотрит маскот. */
		lookAt?: Pad | null;
	}

	let { mood = 'normal', lookAt = null }: Props = $props();

	const LOOK: Readonly<Record<Pad, [number, number]>> = {
		0: [-4, -3],
		1: [4, -3],
		2: [-4, 4],
		3: [4, 4]
	};

	const look = $derived(lookAt === null ? [0, 0] : LOOK[lookAt]);
</script>

<div class="mascot" data-mood={mood}>
	<svg viewBox="0 0 200 210" aria-hidden="true">
		<g class="arm l">
			<rect x="-14" y="120" width="40" height="16" rx="8" />
		</g>
		<g class="arm r">
			<rect x="174" y="120" width="40" height="16" rx="8" />
		</g>

		<g class="body">
			<rect class="shell" x="20" y="20" width="160" height="170" rx="34" />
			<path class="shine" d="M38 42 q62 -18 124 0" />
			<text class="logo" x="100" y="80" text-anchor="middle">1С</text>

			<ellipse class="eye" cx="70" cy="115" rx="18" ry="21" />
			<ellipse class="eye" cx="130" cy="115" rx="18" ry="21" />
			<g class="pupils" style="transform: translate({look[0]}px, {look[1]}px)">
				<circle cx="72" cy="117" r="7" />
				<circle cx="128" cy="117" r="7" />
			</g>
			<rect class="lid" x="50" y="92" width="40" height="44" rx="18" />
			<rect class="lid" x="110" y="92" width="40" height="44" rx="18" />

			<g class="happy-eyes">
				<path d="M54 118 q16 -18 32 0" />
				<path d="M114 118 q16 -18 32 0" />
			</g>
			<g class="brows">
				<path d="M48 92 l40 12" />
				<path d="M152 92 l-40 12" />
			</g>

			<path class="m-smile" d="M76 158 q24 18 48 0" />
			<ellipse class="m-shout" cx="100" cy="164" rx="18" ry="13" />
			<g class="m-grit">
				<rect x="78" y="154" width="44" height="14" rx="5" />
				<path d="M78 161 h44 M92 154 v14 M106 154 v14" />
			</g>

			<g class="cup">
				<path class="cup-steam" d="M92 144 q4 -6 0 -12" />
				<path class="cup-steam s2" d="M108 144 q-4 -6 0 -12" />
				<rect x="82" y="150" width="38" height="28" rx="7" />
				<path d="M120 156 q13 3 0 15" />
			</g>

			<g class="fume">
				<path d="M40 20 q-8 -14 4 -26" />
				<path d="M160 20 q8 -14 -4 -26" />
			</g>
		</g>
	</svg>
</div>

<style>
	.mascot {
		--ink: #1a1130;
		flex: none;
		width: var(--mascot-size, 110px);
		filter: drop-shadow(5px 6px 0 rgba(0, 0, 0, 0.28));
		animation: bob 3.2s ease-in-out infinite;
	}

	svg {
		display: block;
		width: 100%;
		overflow: visible;
	}

	/* ----- Детали ----- */

	.arm rect {
		fill: #ffd21f;
		stroke: var(--ink);
		stroke-width: 6;
	}

	.arm {
		transform-box: fill-box;
	}
	.arm.l {
		transform-origin: 100% 50%;
	}
	.arm.r {
		transform-origin: 0% 50%;
	}

	.shell {
		fill: #ffd21f;
		stroke: var(--ink);
		stroke-width: 8;
		transition: fill 0.2s;
	}

	.shine {
		fill: none;
		stroke: rgba(255, 255, 255, 0.5);
		stroke-width: 8;
		stroke-linecap: round;
	}

	.logo {
		font:
			400 36px 'Russo One',
			sans-serif;
		fill: #e8352b;
		stroke: #fff;
		stroke-width: 1.2px;
		paint-order: stroke;
	}

	.eye {
		fill: #fff;
		stroke: var(--ink);
		stroke-width: 5;
	}

	.pupils {
		fill: var(--ink);
		transition: transform 0.15s;
	}

	.pupils circle {
		transform-box: fill-box;
		transform-origin: center;
		transition: transform 0.15s;
	}

	.lid {
		fill: #ffd21f;
		transform-box: fill-box;
		transform-origin: 50% 0;
		animation: blink 4.2s infinite;
	}

	.happy-eyes path,
	.brows path,
	.m-smile,
	.fume path,
	.cup-steam {
		fill: none;
		stroke: var(--ink);
		stroke-width: 6;
		stroke-linecap: round;
	}

	.brows path {
		stroke-width: 7;
	}

	.m-shout {
		fill: #7c1220;
		stroke: var(--ink);
		stroke-width: 5;
	}

	.m-grit rect,
	.cup rect {
		fill: #fff;
		stroke: var(--ink);
		stroke-width: 5;
	}

	.m-grit path {
		stroke: var(--ink);
		stroke-width: 3;
	}

	.cup > path:last-child {
		fill: none;
		stroke: var(--ink);
		stroke-width: 5;
	}

	.cup-steam {
		stroke: #fff;
		stroke-width: 3.5;
		animation: cup-steam 2.2s ease-in-out infinite;
	}

	.cup-steam.s2 {
		animation-delay: 1s;
	}

	.fume path {
		stroke: #fff;
		opacity: 0.8;
		animation: fume 0.6s ease-in-out infinite alternate;
	}

	/* ----- Настроения: по умолчанию всё лишнее скрыто ----- */

	.happy-eyes,
	.brows,
	.m-shout,
	.m-grit,
	.cup,
	.fume {
		display: none;
	}

	[data-mood='happy'] .happy-eyes,
	[data-mood='coffee'] .happy-eyes {
		display: block;
	}

	[data-mood='happy'] .eye,
	[data-mood='happy'] .pupils,
	[data-mood='happy'] .lid,
	[data-mood='coffee'] .eye,
	[data-mood='coffee'] .pupils,
	[data-mood='coffee'] .lid {
		display: none;
	}

	[data-mood='shout'] .m-smile,
	[data-mood='shock'] .m-smile,
	[data-mood='angry'] .m-smile,
	[data-mood='coffee'] .m-smile {
		display: none;
	}

	[data-mood='shout'] .m-shout,
	[data-mood='shock'] .m-shout,
	[data-mood='angry'] .m-grit,
	[data-mood='angry'] .brows,
	[data-mood='angry'] .fume,
	[data-mood='coffee'] .cup {
		display: block;
	}

	[data-mood='angry'] .shell {
		fill: #ff8a3d;
	}

	[data-mood='shock'] .pupils circle {
		transform: scale(0.55);
	}

	[data-mood='shout'] .arm.r {
		animation: wave-r 0.35s ease-in-out infinite alternate;
	}
	[data-mood='shout'] .arm.l {
		animation: wave-l 0.35s ease-in-out infinite alternate;
	}

	[data-mood='happy'] .arm.r {
		transform: rotate(-60deg);
	}
	[data-mood='happy'] .arm.l {
		transform: rotate(60deg);
	}

	[data-mood='happy'] .body {
		transform-box: fill-box;
		transform-origin: 50% 100%;
		animation: hop 0.5s cubic-bezier(0.3, 1.8, 0.4, 1);
	}

	[data-mood='angry'] {
		animation:
			quake 0.4s ease,
			bob 3.2s ease-in-out infinite 0.4s;
	}

	[data-mood='shock'] {
		animation:
			shock 0.4s ease,
			bob 3.2s ease-in-out infinite 0.4s;
	}

	@keyframes bob {
		0%,
		100% {
			transform: translateY(0) rotate(-2deg);
		}
		50% {
			transform: translateY(-6px) rotate(2deg);
		}
	}

	@keyframes blink {
		0%,
		93%,
		100% {
			transform: scaleY(0);
		}
		95.5% {
			transform: scaleY(1);
		}
	}

	@keyframes wave-r {
		from {
			transform: rotate(-35deg);
		}
		to {
			transform: rotate(-70deg);
		}
	}

	@keyframes wave-l {
		from {
			transform: rotate(35deg);
		}
		to {
			transform: rotate(70deg);
		}
	}

	@keyframes hop {
		40% {
			transform: translateY(-14px) scale(1.05, 0.95);
		}
	}

	@keyframes quake {
		25% {
			transform: translateX(-8px) rotate(-4deg);
		}
		50% {
			transform: translateX(8px) rotate(4deg);
		}
		75% {
			transform: translateX(-5px);
		}
	}

	@keyframes shock {
		35% {
			transform: scale(1.08);
		}
	}

	@keyframes cup-steam {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		30% {
			opacity: 0.85;
		}
		100% {
			transform: translateY(-12px);
			opacity: 0;
		}
	}

	@keyframes fume {
		to {
			transform: translateY(-5px);
			opacity: 0.3;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.mascot,
		.mascot * {
			animation: none !important;
		}
	}
</style>
