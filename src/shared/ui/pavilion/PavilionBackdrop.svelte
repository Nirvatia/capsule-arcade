<script lang="ts">
	const RAYS = Array.from({ length: 18 }, (_, k) => k * 20);
	const PYLONS = [
		{ x: 200, y: 620 },
		{ x: 500, y: 605 },
		{ x: 1100, y: 605 },
		{ x: 1400, y: 620 }
	];
	const WINDOWS = [
		[20, 690],
		[60, 710],
		[100, 690],
		[490, 720],
		[540, 740],
		[1020, 710],
		[1080, 730],
		[1180, 660],
		[1230, 690],
		[1200, 720],
		[1460, 680],
		[1520, 700],
		[1560, 680]
	];
</script>

<div class="backdrop" aria-hidden="true">
	<div class="stage">
		<svg class="layer" viewBox="0 0 1600 900">
			<rect width="1600" height="900" fill="#0a3034" />
			<rect y="170" width="1600" height="730" fill="#0d3a3f" />
			<rect y="300" width="1600" height="600" fill="#114650" />
			<rect y="410" width="1600" height="490" fill="#16545b" />
			<rect y="500" width="1600" height="400" fill="#1c6266" />
			<rect y="575" width="1600" height="325" fill="#256f70" />
		</svg>

		<div class="rays">
			<svg viewBox="-1000 -1000 2000 2000">
				{#each RAYS as angle (angle)}
					<path d="M0 0L-103 -1000H103Z" fill="#fff" transform="rotate({angle})" />
				{/each}
			</svg>
		</div>

		<svg class="layer" viewBox="0 0 1600 900">
			<circle cx="800" cy="560" r="420" fill="#ff6a3d" opacity=".07" />
			<circle cx="800" cy="560" r="355" fill="#ff6a3d" opacity=".12" />
			<circle cx="800" cy="560" r="295" fill="#e04e2c" />
			<circle cx="800" cy="560" r="240" fill="#ec6236" />
			<circle cx="800" cy="560" r="185" fill="#f47a44" />
		</svg>

		<svg class="cloud c1" viewBox="90 228 270 46">
			<rect x="90" y="250" width="270" height="24" rx="12" />
			<rect x="150" y="228" width="140" height="30" rx="15" />
		</svg>
		<svg class="cloud c2" viewBox="1150 310 300 42">
			<rect x="1150" y="330" width="300" height="22" rx="11" />
			<rect x="1230" y="310" width="120" height="28" rx="14" />
		</svg>
		<svg class="cloud c3" viewBox="520 140 210 18">
			<rect x="520" y="140" width="210" height="18" rx="9" />
		</svg>
		<svg class="cloud c4" viewBox="1080 120 150 16">
			<rect x="1080" y="120" width="150" height="16" rx="8" />
		</svg>

		<svg class="ship" viewBox="-430 -36 530 74">
			<path d="M-120 0H-96" stroke="#e6ddc4" stroke-width="2" />
			<path d="M-430 -14H-120V14H-430L-414 0Z" fill="#e6ddc4" />
			<text
				x="-272"
				y="5"
				text-anchor="middle"
				font-family="Tektur, sans-serif"
				font-weight="700"
				font-size="14"
				letter-spacing="2"
				fill="#ff3a1d">ДОСУГ — ДЕЛО КОЛЛЕКТИВА</text
			>
			<path d="M-86 -10L-118 -36H-98L-76 -8ZM-86 10L-118 36H-98L-76 8Z" fill="#ff3a1d" />
			<ellipse rx="100" ry="28" fill="#e6ddc4" />
			<path d="M-60 -22V22M-20 -27V27M20 -27V27M60 -22V22" stroke="#c9bf9f" stroke-width="3" />
			<path d="M-99 0H99" stroke="#ff3a1d" stroke-width="6" />
			<rect x="-24" y="26" width="48" height="12" rx="6" fill="#0e4a4f" />
		</svg>

		<svg class="layer" viewBox="0 0 1600 900">
			<g fill="#1a5d62">
				<rect x="170" y="500" width="120" height="270" />
				<rect x="190" y="440" width="80" height="60" />
				<rect x="205" y="390" width="50" height="50" />
				<rect x="222" y="330" width="16" height="60" />
				<path d="M225 330L230 262 235 330Z" />
				<rect x="0" y="580" width="130" height="190" />
				<rect x="310" y="600" width="90" height="170" />
				<rect x="410" y="555" width="70" height="215" />
				<rect x="490" y="620" width="120" height="150" />
				<rect x="1246" y="300" width="8" height="470" />
				<circle cx="1250" cy="420" r="18" />
				<circle cx="1250" cy="350" r="10" />
				<rect x="1249" y="240" width="2" height="70" />
				<rect x="1050" y="590" width="130" height="180" />
				<rect x="1290" y="560" width="100" height="210" />
				<rect x="1410" y="600" width="190" height="170" />
				<rect x="1190" y="630" width="50" height="140" />
				<rect x="620" y="610" width="360" height="160" />
			</g>
			<path
				d="M230 248l3.5 7.2 8 1.1-5.8 5.6 1.4 7.9-7.1-3.8-7.1 3.8 1.4-7.9-5.8-5.6 8-1.1z"
				fill="#ff3a1d"
			/>
			<g fill="#e6ddc4">
				{#each PYLONS as p (p.x)}
					<rect x={p.x - 4} y={p.y} width="8" height={770 - p.y} />
					<rect x={p.x - 14} y={p.y - 2} width="28" height="6" />
				{/each}
			</g>
			<path d="M-40 640Q800 560 1640 640" fill="none" stroke="#e6ddc4" stroke-width="7" />
		</svg>

		<div class="train-x">
			<div class="train-y">
				<div class="train-r">
					<svg viewBox="-80 -32 160 26">
						<rect x="-80" y="-32" width="160" height="26" rx="13" fill="#e6ddc4" />
						<rect x="-80" y="-14" width="160" height="5" fill="#ff3a1d" />
						<g fill="#0e4a4f">
							<rect x="-58" y="-27" width="18" height="9" rx="3" />
							<rect x="-32" y="-27" width="18" height="9" rx="3" />
							<rect x="-6" y="-27" width="18" height="9" rx="3" />
							<rect x="20" y="-27" width="18" height="9" rx="3" />
							<rect x="46" y="-27" width="18" height="9" rx="3" />
						</g>
					</svg>
				</div>
			</div>
		</div>

		<svg class="layer" viewBox="0 0 1600 900">
			<defs>
				<pattern id="pv-frieze" width="56" height="26" patternUnits="userSpaceOnUse">
					<rect width="56" height="26" fill="#e6ddc4" />
					<path d="M4 22L14 4 24 22Z" fill="#ff3a1d" />
					<path d="M42 4L52 13 42 22 32 13Z" fill="#0e4a4f" />
				</pattern>
				<filter id="pv-grain" x="0" y="0" width="100%" height="100%">
					<feTurbulence
						type="fractalNoise"
						baseFrequency=".9"
						numOctaves="2"
						stitchTiles="stitch"
					/>
					<feColorMatrix type="saturate" values="0" />
				</filter>
			</defs>
			<g fill="#0b3236">
				<rect x="0" y="660" width="160" height="110" />
				<path d="M260 770V690A90 90 0 0 1 440 690V770Z" />
				<rect x="470" y="700" width="130" height="70" />
				<rect x="1000" y="690" width="140" height="80" />
				<rect x="1160" y="640" width="110" height="130" />
				<rect x="1180" y="600" width="70" height="40" />
				<rect x="1300" y="680" width="120" height="90" />
				<rect x="1440" y="650" width="160" height="120" />
			</g>
			<ellipse cx="350" cy="660" rx="122" ry="15" fill="none" stroke="#0b3236" stroke-width="6" />
			<g fill="#ffd58a" opacity=".75">
				{#each WINDOWS as [x, y] (`${x}:${y}`)}
					<rect {x} {y} width="14" height="8" />
				{/each}
			</g>
			<rect y="766" width="1600" height="4" fill="#e6ddc4" />
			<rect y="770" width="1600" height="26" fill="url(#pv-frieze)" />
			<rect y="796" width="1600" height="4" fill="#e6ddc4" />
			<rect y="800" width="1600" height="100" fill="#061a1c" />
			<rect width="1600" height="900" filter="url(#pv-grain)" opacity=".07" />
		</svg>
	</div>
	<div class="mosaic"></div>
</div>

<style>
	.backdrop {
		position: absolute;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		pointer-events: none;
		container-type: size;
	}

	.backdrop::after {
		content: '';
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0, 0, 0, 0.55) 100%);
	}

	.mosaic {
		position: absolute;
		inset: 0;
		background:
			repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.11) 0 1px, transparent 1px 11px),
			repeating-linear-gradient(90deg, rgba(0, 0, 0, 0.11) 0 1px, transparent 1px 11px);
	}

	.stage {
		--u: calc(100cqw / 1600);
		position: absolute;
		left: 50%;
		bottom: 0;
		width: max(100cqw, 100cqh * 16 / 9);
		aspect-ratio: 16 / 9;
		translate: -50% 0;
		container-type: inline-size;
	}

	.layer {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.rays {
		position: absolute;
		left: calc(var(--u) * -200);
		top: calc(var(--u) * -440);
		width: calc(var(--u) * 2000);
		aspect-ratio: 1;
		opacity: 0.05;
		will-change: transform;
		animation: spin 360s linear infinite;
	}

	.rays svg {
		display: block;
		width: 100%;
		height: 100%;
	}

	.cloud {
		position: absolute;
		fill: #e6ddc4;
		opacity: 0.16;
		will-change: transform;
		animation: float 50s ease-in-out infinite alternate;
	}

	.c1 {
		left: calc(var(--u) * 90);
		top: calc(var(--u) * 228);
		width: calc(var(--u) * 270);
	}

	.c2 {
		left: calc(var(--u) * 1150);
		top: calc(var(--u) * 310);
		width: calc(var(--u) * 300);
		animation-duration: 70s;
		animation-direction: alternate-reverse;
	}

	.c3 {
		left: calc(var(--u) * 520);
		top: calc(var(--u) * 140);
		width: calc(var(--u) * 210);
		animation-duration: 40s;
	}

	.c4 {
		left: calc(var(--u) * 1080);
		top: calc(var(--u) * 120);
		width: calc(var(--u) * 150);
		animation-duration: 40s;
	}

	.ship {
		position: absolute;
		left: calc(var(--u) * -430);
		top: calc(var(--u) * 169);
		width: calc(var(--u) * 530);
		will-change: transform;
		animation: drift 150s linear infinite;
	}

	.train-x {
		position: absolute;
		left: calc(var(--u) * -40);
		top: calc(var(--u) * 640);
		will-change: transform;
		animation: train-x 48s linear infinite;
	}

	.train-y {
		will-change: transform;
		animation: train-y 48s infinite;
	}

	.train-r {
		transform-origin: 0 0;
		will-change: transform;
		animation: train-r 48s linear infinite;
	}

	.train-r svg {
		position: absolute;
		left: calc(var(--u) * -80);
		top: calc(var(--u) * -32);
		width: calc(var(--u) * 160);
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes float {
		to {
			transform: translateX(5.625cqw);
		}
	}

	@keyframes drift {
		from {
			transform: translateX(-7.5cqw);
		}
		to {
			transform: translateX(131.25cqw);
		}
	}

	@keyframes train-x {
		to {
			transform: translateX(105cqw);
		}
	}

	@keyframes train-y {
		0% {
			transform: translateY(0);
			animation-timing-function: cubic-bezier(0.333, 0.667, 0.667, 1);
		}
		50% {
			transform: translateY(-2.5cqw);
			animation-timing-function: cubic-bezier(0.333, 0, 0.667, 0.333);
		}
		100% {
			transform: translateY(0);
		}
	}

	@keyframes train-r {
		from {
			transform: rotate(-5.44deg);
		}
		to {
			transform: rotate(5.44deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.rays,
		.cloud,
		.ship,
		.train-x,
		.train-y,
		.train-r {
			animation: none;
		}
	}
</style>
