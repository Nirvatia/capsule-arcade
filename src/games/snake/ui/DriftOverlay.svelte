<!-- Экраны поверх воды: титул, пауза, альбом; подсказки и баннеры. Тихо и тускло. -->
<script lang="ts">
	import { COLS, ROWS } from '../config';
	import { picName, roman, tr, type TextKey } from '../i18n';
	import { actions, ui, type MenuItem } from './stores';

	const st = $derived($ui);

	function label(item: MenuItem): string {
		if (item === 'sound') return tr(st.muted ? 'soundOff' : 'soundOn');
		return tr(item as TextKey);
	}

	const keys: [string[], TextKey][] = [
		[['←', '↑', '↓', '→'], 'keySwim'],
		[['→', '+', '↓'], 'keyStairs'],
		[['Space'], 'keyCall'],
		[['Esc'], 'keyPause']
	];
</script>

{#if st.screen === 'title'}
	<div class="screen title" data-drift-ui>
		<h1>{tr('name')}</h1>
		<p class="sub">{tr('sub')}</p>
		{@render menu()}
		{#if !st.touch}
			<dl class="keys">
				{#each keys as [ks, k] (k)}
					<dt>
						{#each ks as key, i (i)}
							{#if key === '+'}<span class="plus">+</span>{:else}<kbd>{key}</kbd>{/if}
						{/each}
					</dt>
					<dd>{tr(k)}</dd>
				{/each}
			</dl>
		{/if}
	</div>
{:else if st.screen === 'pause'}
	<div class="screen" data-drift-ui>
		<h2>{tr('paused')}</h2>
		{@render menu()}
	</div>
{:else if st.screen === 'album'}
	<div class="screen album" data-drift-ui>
		<h2>{tr('album')}</h2>
		<ul class="cards">
			{#each st.album as card (card.id)}
				<li class={card.state} style:--h={card.hue}>
					<svg viewBox="0 0 {COLS} {ROWS}" aria-hidden="true">
						{#each card.paths as d, i (i)}
							<path {d} />
						{/each}
						{#each card.dots as p, i (i)}
							<circle cx={p.x} cy={p.y} r="0.22" />
						{/each}
					</svg>
					<b>{card.state === 'done' ? picName(card.id) : '?'}</b>
					<span>
						{#if card.state === 'done'}
							{card.tides.map((t) => `${tr('tide')} ${roman(t + 1)}`).join(' · ')}
						{:else if card.state === 'progress'}
							{tr('inProgress')}
						{:else}
							{tr('unknown')}
						{/if}
					</span>
				</li>
			{/each}
		</ul>
		{#if !st.album.some((c) => c.state !== 'unknown')}
			<p class="empty">{tr('albumEmpty')}</p>
		{/if}
		{@render menu()}
	</div>
{/if}

{#if st.banner}
	{#key st.banner.id}
		<div class="banner" aria-live="polite">
			<b>{st.banner.title}</b>
			<i>{st.banner.sub}</i>
		</div>
	{/key}
{/if}

{#if st.hint.key && !st.screen}
	{#key st.hint.id}
		<div class="hint" role="status">{tr(st.hint.key)}</div>
	{/key}
{/if}

{#snippet menu()}
	<ul class="menu">
		{#each st.items as item, i (item)}
			<li>
				<button
					type="button"
					class:sel={i === st.sel}
					onmouseenter={() => $actions?.hover(i)}
					onfocus={() => $actions?.hover(i)}
					onclick={() => $actions?.select(i)}
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
		z-index: 10;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 24px 16px;
		text-align: center;
		color: var(--d-ink);
		overflow-y: auto;
	}

	h1 {
		margin: 0;
		font-weight: 200;
		font-size: clamp(42px, 9vw, 104px);
		letter-spacing: 0.4em;
		text-indent: 0.4em;
		text-transform: uppercase;
		color: var(--d-ink);
	}

	h2 {
		margin: 0 0 18px;
		font-weight: 300;
		font-size: clamp(22px, 4vw, 34px);
		letter-spacing: 0.3em;
		text-indent: 0.3em;
		text-transform: uppercase;
	}

	.sub {
		margin: 14px 0 36px;
		font-size: clamp(12px, 1.6vw, 15px);
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: var(--d-dim);
	}

	.menu {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 4px;
		justify-items: center;
	}

	.menu button {
		min-width: 220px;
		padding: 9px 22px;
		border: 1px solid transparent;
		border-radius: 999px;
		background: none;
		color: var(--d-dim);
		font: inherit;
		font-size: 16px;
		letter-spacing: 0.14em;
		cursor: pointer;
		transition:
			color 0.3s,
			border-color 0.3s,
			background 0.3s;
	}

	.menu button.sel,
	.menu button:hover {
		color: var(--d-ink);
		border-color: rgba(120, 200, 210, 0.28);
		background: rgba(10, 34, 48, 0.5);
	}

	.menu button:focus-visible {
		outline: 1px solid var(--d-ink);
	}

	.keys {
		margin: 40px 0 0;
		display: grid;
		grid-template-columns: auto auto;
		gap: 8px 18px;
		text-align: left;
		font-size: 13px;
		color: var(--d-dim);
	}

	.keys dt {
		justify-self: end;
		display: flex;
		gap: 3px;
		align-items: center;
	}

	.keys dd {
		margin: 0;
		align-self: center;
	}

	kbd {
		font: inherit;
		font-size: 11px;
		padding: 2px 7px;
		border-radius: 5px;
		border: 1px solid rgba(120, 190, 200, 0.3);
		color: var(--d-ink);
	}

	.plus {
		font-size: 11px;
	}

	.cards {
		list-style: none;
		margin: 0 0 18px;
		padding: 0;
		width: min(920px, 100%);
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 12px;
	}

	.cards li {
		padding: 10px 10px 12px;
		border-radius: 14px;
		background: rgba(6, 20, 32, 0.66);
		border: 1px solid rgba(110, 170, 190, 0.14);
		display: grid;
		gap: 4px;
	}

	.cards svg {
		width: 100%;
		aspect-ratio: 24 / 14;
		display: block;
		fill: none;
		stroke: hsl(var(--h) 55% 62%);
		stroke-width: 0.13;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.cards circle {
		fill: hsl(var(--h) 55% 66%);
		stroke: none;
	}

	.cards .unknown svg {
		opacity: 0;
	}

	.cards .progress svg {
		opacity: 0.6;
	}

	.cards b {
		font-weight: 400;
		font-size: 15px;
		letter-spacing: 0.08em;
	}

	.cards span {
		font-size: 12px;
		color: var(--d-dim);
	}

	.empty {
		margin: 0 0 16px;
		color: var(--d-dim);
		font-size: 14px;
	}

	.banner {
		position: absolute;
		left: 0;
		right: 0;
		top: 18%;
		z-index: 5;
		text-align: center;
		pointer-events: none;
		color: var(--d-ink);
		animation: fade 0.9s ease both;
	}

	.banner b {
		display: block;
		font-weight: 200;
		font-size: clamp(26px, 5vw, 54px);
		letter-spacing: 0.3em;
		text-indent: 0.3em;
		text-transform: uppercase;
	}

	.banner i {
		display: block;
		margin-top: 10px;
		font-style: normal;
		font-size: 14px;
		letter-spacing: 0.18em;
		color: var(--d-dim);
	}

	.hint {
		position: absolute;
		left: 50%;
		bottom: max(24px, env(safe-area-inset-bottom));
		z-index: 5;
		transform: translateX(-50%);
		max-width: calc(100% - 32px);
		width: max-content;
		padding: 8px 18px;
		border-radius: 999px;
		background: rgba(3, 14, 26, 0.7);
		border: 1px solid rgba(110, 180, 200, 0.2);
		color: var(--d-ink);
		font-size: 14px;
		letter-spacing: 0.04em;
		text-align: center;
		pointer-events: none;
		animation: fade 0.8s ease both;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.banner,
		.hint {
			animation: none;
		}
	}
</style>
