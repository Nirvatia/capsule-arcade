<!-- The secret level is our arcade, so it gets an arcade HUD: 1UP, HIGH SCORE, the round and the
	tries left in one row on top, blocky lettering, no sprites and nothing at the bottom. -->
<script lang="ts">
	import type { HudSnapshot } from './hudSnapshot';
	import { t } from '../i18n';

	let { snap }: { snap: HudSnapshot } = $props();
	const score = (n: number) => (n > 0 ? String(Math.floor(n)) : '00');
</script>

<div class="arcade">
	<div class="top">
		<div class="col">
			<span class="label blink">{$t('oneUp')}</span>
			<span class="num">{score(snap.score)}</span>
		</div>
		<div class="col">
			<span class="label">{$t('highScore')}</span>
			<span class="num">{score(snap.highScore)}</span>
		</div>
		<div class="col">
			<span class="label">{$t('round')}</span>
			<span class="num">{snap.level}</span>
		</div>
		<div class="col">
			<span class="label">{$t('lives')}</span>
			<span class="num">{Math.max(0, snap.lives)}</span>
		</div>
	</div>
</div>

<style>
	.arcade {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 20;
		color: #fff;
		font-family: 'Press Start 2P', 'Courier New', monospace;
		font-weight: 700;
		text-transform: uppercase;
		image-rendering: pixelated;
	}
	.top {
		position: absolute;
		top: 8px;
		left: 50%;
		transform: translateX(-50%);
		width: min(720px, calc(100vw - 24px));
		display: grid;
		grid-template-columns: repeat(4, auto);
		justify-content: space-between;
	}
	.col {
		display: grid;
		justify-items: center;
		gap: 4px;
	}
	.label {
		font-size: clamp(9px, 2.2vw, 15px);
		letter-spacing: 2px;
	}
	.num {
		font-size: clamp(9px, 2.2vw, 15px);
		letter-spacing: 2px;
		justify-self: end;
	}
	.blink {
		animation: blink 0.53s steps(1) infinite;
	}
	@keyframes blink {
		50% {
			opacity: 0;
		}
	}
</style>
