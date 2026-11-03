<script lang="ts">
	import { STAR_PATH } from './icons';
</script>

<div class="backdrop" aria-hidden="true">
	<div class="backdrop__rays"></div>
	<div class="backdrop__dots"></div>
	<svg class="backdrop__star" viewBox="0 0 100 100"><path d={STAR_PATH} /></svg>
</div>

<style>
	.backdrop {
		position: absolute;
		inset: 0;
		z-index: 0;
		overflow: hidden;
		pointer-events: none;
		background: radial-gradient(
			ellipse 70% 75% at 50% 50%,
			var(--t-red-hi) 0%,
			#a2212a 45%,
			var(--t-red-dark) 100%
		);
	}

	.backdrop__rays {
		position: absolute;
		inset: 0;
		background: repeating-conic-gradient(
			from 3deg at 50% 52%,
			rgba(255, 214, 150, 0.075) 0 5deg,
			transparent 5deg 12deg
		);
	}

	.backdrop__dots {
		position: absolute;
		inset: 0;
		background: radial-gradient(rgba(20, 4, 6, 0.22) 1.3px, transparent 1.8px) 0 0 / 7px 7px;
		-webkit-mask-image: linear-gradient(
			140deg,
			#000 0%,
			transparent 32%,
			transparent 68%,
			#000 100%
		);
		mask-image: linear-gradient(140deg, #000 0%, transparent 32%, transparent 68%, #000 100%);
	}

	.backdrop__star {
		position: absolute;
		left: 50%;
		top: 52%;
		width: min(118vmin, 1000px);
		transform: translate(-50%, -50%) rotate(-8deg);
	}

	.backdrop__star path {
		fill: var(--t-red-deep);
		stroke: rgba(242, 196, 90, 0.18);
		stroke-width: 0.4;
	}
</style>
