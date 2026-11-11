<script lang="ts">
	import { resolve } from '$app/paths';
	import { version } from '../../../package.json';
	import Topbar from '$shared/ui/Topbar.svelte';
	import PavilionBackdrop from '$shared/ui/pavilion/PavilionBackdrop.svelte';
	import { games } from '$shared/config/games';
	import { gameText, t } from '$shared/i18n/i18n.svelte';

	const REPO = 'https://github.com/nirvatia/neo-arcade';
</script>

<svelte:head>
	<title>{t('about.title')}</title>
</svelte:head>

<div class="pavilion">
	<Topbar place={t('top.place')} hall={t('top.hall')} backHref="/" />

	<div class="world">
		<PavilionBackdrop />

		<main class="scene">
			<section class="plate">
				<p class="kicker">{t('about.kicker')}</p>
				<h1>{t('about.heading')}</h1>
				<p class="lede">{t('about.lede')}</p>

				<ul class="exhibits">
					{#each games as game (game.id)}
						<li style:--p1={game.light} style:--p2={game.deep}>
							<a href={game.route ? resolve(game.route) : undefined}>
								<span class="dot"></span>
								<b>{gameText(game.id, 'title')}</b>
								<span class="desc">{gameText(game.id, 'description')}</span>
								{#if game.status === 'ready'}<em>{t('about.ready')}</em>{/if}
							</a>
						</li>
					{/each}
				</ul>

				<dl class="spec">
					<dt>{t('about.platform')}</dt>
					<dd>{t('about.platformValue')}</dd>
					<dt>{t('about.records')}</dt>
					<dd>{t('about.recordsValue')}</dd>
					<dt>{t('about.version')}</dt>
					<dd>{version}</dd>
					<dt>{t('about.license')}</dt>
					<dd>MIT</dd>
					<dt>{t('about.source')}</dt>
					<dd>
						<a href={REPO} target="_blank" rel="noopener noreferrer"
							>github.com/nirvatia/neo-arcade</a
						>
					</dd>
				</dl>

				<p class="foot">{t('about.foot')}</p>
			</section>
		</main>
	</div>
</div>

<style>
	.pavilion {
		min-height: 100dvh;
		background: #061a1c;
		color: var(--pv-teal);
		font: 500 17px/1.35 var(--f-hud);
		overflow-x: hidden;
	}

	.pavilion :global(:focus-visible) {
		outline-color: var(--pv-red);
	}

	.world {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		min-height: calc(100dvh - 64px);
	}

	.scene {
		position: relative;
		z-index: 1;
		padding: 40px 16px 120px;
		display: grid;
		justify-items: center;
	}

	.plate {
		position: relative;
		width: min(100%, 600px);
		padding: 30px 28px 24px;
		display: grid;
		gap: 18px;
		border-radius: 18px;
		background: var(--pv-enamel);
		box-shadow:
			0 0 0 4px var(--pv-teal),
			0 20px 30px rgba(0, 0, 0, 0.55);
	}

	.plate::before,
	.plate::after {
		content: '';
		position: absolute;
		top: 12px;
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: #9fb2ac;
		box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.4);
	}

	.plate::before {
		left: 12px;
	}

	.plate::after {
		right: 12px;
	}

	.kicker {
		margin: 0;
		text-align: center;
		font: 700 12px var(--f-hud);
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: #5b8b8a;
	}

	h1 {
		margin: 0;
		text-align: center;
		font: 900 clamp(30px, 8vw, 44px) / 1 var(--f-head);
		letter-spacing: -0.02em;
		text-transform: uppercase;
		color: var(--pv-red);
	}

	.lede {
		margin: 0;
		text-align: center;
		color: #1d4a4d;
	}

	.exhibits {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}

	.exhibits a {
		display: grid;
		grid-template-columns: 36px minmax(0, 1fr) auto;
		column-gap: 12px;
		align-items: center;
		padding: 8px 12px;
		border-radius: 10px;
		color: inherit;
		text-decoration: none;
		background: #dfe8e4;
		box-shadow: inset 0 2px 4px rgba(14, 74, 79, 0.2);
		transition: background 0.12s;
	}

	.exhibits a:hover {
		background: #fff;
	}

	.dot {
		grid-row: span 2;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		background: radial-gradient(circle at 50% 30%, var(--p1), var(--p2));
		box-shadow: 0 0 0 2px var(--pv-teal);
	}

	.exhibits b {
		grid-column: 2;
		font: 700 14px var(--f-head);
		text-transform: uppercase;
	}

	.desc {
		grid-column: 2;
		font-size: 14px;
		color: #35686a;
	}

	.exhibits em {
		grid-row: span 2;
		grid-column: 3;
		font: 700 11px var(--f-hud);
		font-style: normal;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--pv-red);
	}

	.spec {
		margin: 0;
		padding: 14px 16px;
		display: grid;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 6px 18px;
		border-radius: 10px;
		background: #0b2e31;
		color: #ff7a63;
		font: 500 14px/1.4 var(--f-hud);
	}

	.spec dt {
		align-self: center;
		font-size: 11px;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #a0625a;
	}

	.spec dd {
		margin: 0;
		letter-spacing: 0.04em;
		overflow-wrap: anywhere;
	}

	.spec a {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.foot {
		margin: 0;
		text-align: center;
		font: 600 24px var(--f-hand);
		color: var(--pv-teal);
	}

	@media (max-width: 520px) {
		.scene {
			padding: 22px 10px 100px;
		}

		.plate {
			padding: 28px 16px 20px;
		}

		.exhibits a {
			grid-template-columns: 32px minmax(0, 1fr);
		}

		.exhibits em {
			display: none;
		}

		.dot {
			width: 32px;
			height: 32px;
		}

		.spec {
			grid-template-columns: minmax(0, 1fr);
			gap: 2px;
		}

		.spec dd {
			margin-bottom: 8px;
		}
	}
</style>
