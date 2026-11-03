<div class="backdrop" aria-hidden="true">
	<svg class="backdrop__star" viewBox="0 0 100 100">
		<path d="M50 2 L61 38 L98 38 L68 60 L79 96 L50 74 L21 96 L32 60 L2 38 L39 38 Z" />
	</svg>
</div>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
		background:
			radial-gradient(1100px 600px at 78% -10%, rgba(227, 167, 47, 0.2), transparent 60%),
			radial-gradient(900px 700px at 10% 110%, rgba(0, 0, 0, 0.35), transparent 60%),
			repeating-conic-gradient(
				from 0deg at 50% 45%,
				rgba(0, 0, 0, 0.08) 0 5deg,
				transparent 5deg 11deg
			),
			var(--t-red);
	}

	.backdrop__star {
		position: absolute;
		right: -12vmin;
		top: 10vh;
		width: 60vmin;
		opacity: 0.1;
		transform: rotate(-12deg);
	}

	.backdrop__star path {
		fill: none;
		stroke: var(--t-paper);
		stroke-width: 2.4;
	}
</style>
