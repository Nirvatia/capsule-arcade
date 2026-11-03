<!-- Экраны поверх арены: титульный, пауза, конец охоты. Каменные плиты с золотой инкрустацией. -->
<script lang="ts">
	import { formatScore, lang, roman, tr, type TextKey } from '../i18n';
	import { actionsStore, screenStore, type MenuItem } from './stores';

	const st = $derived($screenStore);
	const l = $derived($lang);
	const fmt = formatScore;

	function label(item: MenuItem): string {
		if (item === 'sound') return tr(st.muted ? 'soundOff' : 'soundOn', l);
		return tr(item as TextKey, l);
	}
</script>

{#if st.screen}
	<div class="screen" class:title={st.screen === 'title'}>
		{#if st.screen === 'title'}
			<div class="title-wrap">
				<div class="name">{tr('name', l)}</div>
				<div class="sub">{tr('sub', l)}</div>
				{@render menu()}
				{#if st.best > 0}
					<div class="best">{tr('best', l)} · {fmt(st.best)}</div>
				{/if}
				<div class="hint">{tr('hint', l)}</div>
				<div class="press">{tr('press', l)}</div>
			</div>
		{:else}
			<div class="panel">
				<div class="in">
					{#if st.screen === 'pause'}
						<h3>{tr('paused', l)}</h3>
						{@render menu()}
						<div class="hint">{tr('spacehint', l)}</div>
					{:else}
						<h3>{tr('over', l)}</h3>
						<div class="big">{fmt(st.score)}</div>
						{#if st.isRecord}
							<div class="rec">{tr('record', l)}</div>
						{/if}
						<div class="stats">
							{tr('alphas', l)}: {st.alphas} · {tr('length', l)}: {st.maxLen} · {tr('act', l)}
							{roman(st.act)}
						</div>
						{@render menu()}
					{/if}
				</div>
			</div>
		{/if}
	</div>
{/if}

{#snippet menu()}
	<ul class="menu">
		{#each st.items as item, i (item)}
			<li>
				<button
					type="button"
					class:sel={i === st.sel}
					onmouseenter={() => $actionsStore?.hover(i)}
					onfocus={() => $actionsStore?.hover(i)}
					onclick={() => $actionsStore?.select(i)}
				>
					{label(item)}
				</button>
			</li>
		{/each}
	</ul>
{/snippet}

<style>
	.screen {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		container-type: inline-size;
		pointer-events: auto;
		user-select: none;
		-webkit-user-select: none;
	}
	.panel {
		--cut: 2.4cqw;
		padding: 0.4cqw;
		background: #161a19;
		clip-path: polygon(
			var(--cut) 0,
			calc(100% - var(--cut)) 0,
			100% var(--cut),
			100% calc(100% - var(--cut)),
			calc(100% - var(--cut)) 100%,
			var(--cut) 100%,
			0 calc(100% - var(--cut)),
			0 var(--cut)
		);
		max-width: 70%;
	}
	.in {
		position: relative;
		clip-path: inherit;
		background: radial-gradient(120% 90% at 50% 0%, #56605d, #3a4240 55%, #2b3231);
		box-shadow:
			inset 0 0.25cqw 0 rgba(235, 245, 240, 0.14),
			inset 0 -0.4cqw 0 rgba(0, 0, 0, 0.35);
		padding: 2.8cqw 5.4cqw 3cqw;
		text-align: center;
		display: grid;
		gap: 1.2cqw;
		justify-items: center;
	}
	.in::before {
		content: '';
		position: absolute;
		inset: 1.1cqw;
		border: 0.25cqw solid rgba(8, 11, 11, 0.6);
		box-shadow:
			0 0.15cqw 0 rgba(230, 240, 235, 0.1),
			inset 0 0.15cqw 0 rgba(230, 240, 235, 0.08);
		pointer-events: none;
	}
	h3 {
		margin: 0;
		font:
			400 5.4cqw/1 'Forum',
			'Times New Roman',
			Georgia,
			serif;
		color: #f0c766;
		text-shadow:
			0 -0.18cqw 0 rgba(0, 0, 0, 0.85),
			0 0.2cqw 0 rgba(255, 236, 190, 0.25);
	}
	.menu {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5cqw;
		text-align: left;
		position: relative;
	}
	.menu button {
		position: relative;
		display: block;
		padding: 0.2cqw 0 0.2cqw 3cqw;
		border: 0;
		background: none;
		font:
			700 2.9cqw/1.15 'Alegreya Sans SC',
			'Alegreya Sans',
			system-ui,
			sans-serif;
		letter-spacing: 0.08em;
		color: #e2dccb;
		text-shadow: 0 0.18cqw 0 rgba(0, 0, 0, 0.7);
		cursor: pointer;
		touch-action: manipulation;
	}
	.menu button.sel {
		color: #f0c766;
	}
	.menu button.sel::before {
		content: '';
		position: absolute;
		left: 0.3cqw;
		top: 50%;
		width: 1.5cqw;
		height: 1.8cqw;
		margin-top: -0.9cqw;
		background: #3fd1bd;
		clip-path: polygon(0 0, 100% 50%, 0 100%);
		filter: drop-shadow(0 0 0.8cqw #3fd1bd);
	}
	.menu button:focus-visible {
		outline: 0.2cqw solid #3fd1bd;
		outline-offset: 0.3cqw;
	}
	.hint {
		font:
			500 1.7cqw 'Alegreya Sans',
			system-ui,
			sans-serif;
		letter-spacing: 0.04em;
		color: #c9c3b2;
		text-shadow: 0 0.15cqw 0 rgba(0, 0, 0, 0.7);
		max-width: 46cqw;
	}
	.title-wrap {
		text-align: center;
		display: grid;
		gap: 1cqw;
		justify-items: center;
	}
	.name {
		font:
			400 12cqw/0.9 'Forum',
			'Times New Roman',
			Georgia,
			serif;
		color: #f0c766;
		letter-spacing: 0.06em;
		text-shadow:
			0 0.5cqw 0 #120c05,
			0 0 4cqw rgba(240, 199, 102, 0.35);
	}
	.sub {
		font:
			700 2.2cqw 'Alegreya Sans SC',
			'Alegreya Sans',
			system-ui,
			sans-serif;
		letter-spacing: 0.22em;
		color: #c9b48a;
		margin-bottom: 1cqw;
	}
	.best {
		font:
			700 1.9cqw 'Alegreya Sans SC',
			'Alegreya Sans',
			system-ui,
			sans-serif;
		letter-spacing: 0.14em;
		color: #5fe0cc;
		text-shadow: 0 0.15cqw 0 rgba(0, 0, 0, 0.7);
	}
	.press {
		font:
			700 1.8cqw 'Alegreya Sans SC',
			'Alegreya Sans',
			system-ui,
			sans-serif;
		letter-spacing: 0.2em;
		color: #a99878;
		animation: breathe 3.2s ease-in-out infinite;
	}
	@keyframes breathe {
		50% {
			opacity: 0.45;
		}
	}
	.big {
		font:
			400 8cqw/0.9 'Forum',
			'Times New Roman',
			Georgia,
			serif;
		color: #f0c766;
		text-shadow:
			0 -0.22cqw 0 rgba(0, 0, 0, 0.85),
			0 0.25cqw 0 rgba(255, 236, 190, 0.25);
		font-variant-numeric: tabular-nums;
	}
	.rec {
		font:
			800 2cqw 'Alegreya Sans SC',
			'Alegreya Sans',
			system-ui,
			sans-serif;
		letter-spacing: 0.18em;
		color: #5fe0cc;
		text-shadow: 0 0.15cqw 0 rgba(0, 0, 0, 0.7);
	}
	.stats {
		font:
			500 2cqw 'Alegreya Sans SC',
			'Alegreya Sans',
			system-ui,
			sans-serif;
		letter-spacing: 0.06em;
		color: #d6d0bf;
		text-shadow: 0 0.15cqw 0 rgba(0, 0, 0, 0.7);
	}
	@media (prefers-reduced-motion: reduce) {
		.press {
			animation: none;
		}
	}
</style>
