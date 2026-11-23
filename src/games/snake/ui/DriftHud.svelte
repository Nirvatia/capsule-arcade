<!-- Тихий HUD: номер рисунка, штрихи (горят / ждут / впереди), искры на Течении, пауза. -->
<script lang="ts">
	import { roman, tr } from '../i18n';
	import { actions, ui } from './stores';

	const hud = $derived($ui.hud);
</script>

{#if hud.visible}
	<div class="hud">
		<div class="left">
			<span class="pic">
				{tr('picture')}
				{roman(hud.pic)}{#if hud.tide > 0}<small> · {tr('tide')} {roman(hud.tide + 1)}</small>{/if}
			</span>
			<span class="strokes" aria-hidden="true">
				{#each hud.strokes as s, i (i)}
					<i class={s}></i>
				{/each}
			</span>
		</div>
		{#if hud.mode === 'current'}
			<div class="sparks" class:open={hud.got >= hud.need}>
				<span>{tr('sparks')}</span>
				<b>{Math.min(hud.got, hud.need)} / {hud.need}</b>
			</div>
		{/if}
		<button
			type="button"
			class="pause"
			data-drift-ui
			aria-label={tr('paused')}
			onclick={() => $actions?.pause()}
		>
			<span></span><span></span>
		</button>
	</div>
{/if}

<style>
	.hud {
		position: absolute;
		inset: 0 0 auto;
		z-index: 4;
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		padding: 18px 20px 0;
		color: var(--d-dim);
		pointer-events: none;
		font-size: 16px;
		letter-spacing: 0.16em;
	}

	.left {
		display: grid;
		gap: 8px;
	}

	.pic {
		text-transform: uppercase;
	}

	.pic small {
		font-size: 11px;
		letter-spacing: 0.1em;
	}

	.strokes {
		display: flex;
		gap: 7px;
		flex-wrap: wrap;
	}

	.strokes i {
		width: 8px;
		height: 8px;
		border-radius: 2px;
		transform: rotate(45deg);
		border: 1px solid rgba(38, 44, 54, 0.35);
		transition:
			background 0.8s,
			border-color 0.8s;
	}

	.strokes i.now {
		border-color: rgba(38, 44, 54, 0.85);
	}

	.strokes i.lit {
		background: rgba(38, 44, 54, 0.8);
		border-color: rgba(38, 44, 54, 0.85);
	}

	.sparks {
		position: absolute;
		left: 50%;
		top: 18px;
		transform: translateX(-50%);
		display: flex;
		gap: 10px;
		align-items: baseline;
		transition: color 0.8s;
	}

	.sparks b {
		font-weight: 400;
		color: var(--d-ink);
	}

	.sparks.open b {
		color: #a2503f;
	}

	.pause {
		pointer-events: auto;
		width: 36px;
		height: 36px;
		margin: -6px -6px 0 0;
		border: 1px solid var(--d-line);
		border-radius: 50%;
		background: var(--d-paper);
		display: flex;
		gap: 4px;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}

	.pause span {
		width: 3px;
		height: 11px;
		border-radius: 1px;
		background: var(--d-dim);
	}

	.pause:focus-visible {
		outline: 1px solid var(--d-ink);
	}

	@media (max-width: 560px) {
		.sparks {
			top: 50px;
		}
	}
</style>
