<!-- The night forest's strip (`DESIGN.md` §7b): the Presence's power and the torch's battery, over the
	board. Plain and quiet: two bars on a dark plate, the dawn's word when the Presence has fallen. -->
<script lang="ts">
	import type { HudNightwood } from '../hudSnapshot';
	import { t } from '../../i18n';

	let { night }: { night: HudNightwood } = $props();
	const pct = (v: number) => `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`;
</script>

<div class="bar" aria-hidden="true">
	<div class="cell">
		<span class="lab">{$t('darkness')}</span>
		<span class="track dark"><i style:width={pct(night.presence)}></i></span>
	</div>
	<div class="cell">
		<span class="lab">{$t('torch')}</span>
		<span class="track torch" class:flash={night.flash > 0}
			><i style:width={pct(night.battery)} class:low={night.battery < 0.2}></i></span
		>
	</div>
	{#if night.lampsOut > 0}
		<span class="lamps">{night.lampsTotal - night.lampsOut}/{night.lampsTotal}</span>
	{/if}
</div>

<style>
	.bar {
		position: fixed;
		z-index: 12;
		top: max(8px, env(safe-area-inset-top));
		left: 50%;
		transform: translateX(-50%);
		display: flex;
		gap: 16px;
		align-items: center;
		padding: 6px 12px;
		border-radius: 6px;
		background: rgba(6, 12, 18, 0.72);
		border: 1px solid rgba(120, 160, 190, 0.28);
		font:
			600 11px/1 ui-monospace,
			Menlo,
			monospace;
		letter-spacing: 0.08em;
		color: #b9ccd8;
		pointer-events: none;
	}
	.cell {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.track {
		display: block;
		width: clamp(90px, 14vw, 170px);
		height: 8px;
		border-radius: 2px;
		background: #0b1218;
		border: 1px solid #2a3b48;
		overflow: hidden;
	}
	.track i {
		display: block;
		height: 100%;
		background: linear-gradient(#e9f4ff, #9ec3e6);
	}
	.dark i {
		background: linear-gradient(#5a6b80, #1c2430);
	}
	.torch i {
		background: linear-gradient(#fff2c4, #f0b768);
	}
	.torch i.low {
		background: linear-gradient(#ff9a7a, #d8452c);
	}
	.torch.flash {
		box-shadow: 0 0 10px #fff6d8;
	}
	.lamps {
		color: #f0b768;
	}
</style>
