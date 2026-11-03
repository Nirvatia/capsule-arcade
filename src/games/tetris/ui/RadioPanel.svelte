<script lang="ts">
	import { ui } from './store.svelte';

	interface Props {
		strip: boolean;
	}

	let { strip }: Props = $props();
</script>

{#if strip}
	<div class="strip" role="status" aria-live="polite">
		<span class="speaker speaker--sm" aria-hidden="true"></span>
		<span class="lamp" aria-hidden="true"></span>
		{#key ui.radio.key}
			<span class="strip__text t-mono"><b>МАЯК:</b> «{ui.radio.text}»</span>
		{/key}
	</div>
{:else}
	<section class="radio" role="status" aria-live="polite">
		<span class="speaker" aria-hidden="true"><i></i></span>
		<div class="radio__body">
			<span class="radio__label"
				><span class="lamp" aria-hidden="true"></span>РАДИОТОЧКА · МАЯК</span
			>
			{#key ui.radio.key}
				<span class="radio__text t-mono">«{ui.radio.text}»</span>
			{/key}
		</div>
	</section>
{/if}

<style>
	.radio {
		position: relative;
		display: flex;
		align-items: center;
		gap: 14px;
		min-height: 92px;
		box-sizing: border-box;
		padding: 14px 16px;
		color: var(--t-cream);
		background: var(--t-ink);
		border: 3px solid var(--t-ink);
		box-shadow:
			inset 0 0 0 2px var(--t-gold),
			6px 6px 0 rgba(20, 4, 6, 0.55);
		transform: rotate(-0.6deg);
	}

	.speaker {
		position: relative;
		width: 58px;
		height: 58px;
		flex: none;
		border-radius: 50%;
		background: repeating-radial-gradient(circle, #2b221d 0 3px, var(--t-gold) 3px 4px);
		box-shadow:
			0 0 0 3px var(--t-gold),
			0 0 0 6px #3a2d26;
	}

	.speaker i {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: var(--t-gold);
		transform: translate(-50%, -50%);
	}

	.speaker--sm {
		width: 18px;
		height: 18px;
		background: repeating-radial-gradient(circle, #2b221d 0 2px, var(--t-gold) 2px 3px);
		box-shadow: 0 0 0 2px var(--t-gold);
	}

	.lamp {
		display: inline-block;
		width: 7px;
		height: 7px;
		flex: none;
		border-radius: 50%;
		background: #6fdc6f;
		box-shadow: 0 0 6px #6fdc6f;
	}

	.radio__body {
		display: flex;
		flex-direction: column;
		gap: 5px;
		min-width: 0;
	}

	.radio__label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--t-font-display);
		font-size: 10px;
		letter-spacing: 0.2em;
		color: var(--t-gold);
	}

	.radio__text {
		font-size: 13px;
		line-height: 1.45;
		animation: type-in 0.45s steps(18) both;
	}

	.strip {
		display: flex;
		align-items: center;
		gap: 8px;
		height: 30px;
		box-sizing: border-box;
		padding: 0 10px;
		overflow: hidden;
		color: var(--t-cream);
		background: var(--t-ink-soft);
		border-bottom: 2px solid rgba(227, 167, 47, 0.6);
	}

	.strip__text {
		min-width: 0;
		overflow: hidden;
		font-size: 11px;
		white-space: nowrap;
		text-overflow: ellipsis;
		animation: type-in 0.45s steps(18) both;
	}

	.strip__text b {
		color: var(--t-gold);
	}

	@keyframes type-in {
		from {
			clip-path: inset(0 100% 0 0);
		}
		to {
			clip-path: inset(0 0 0 0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.radio__text,
		.strip__text {
			animation: none;
		}
	}
</style>
