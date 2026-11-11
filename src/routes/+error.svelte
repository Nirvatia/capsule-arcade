<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Topbar from '$shared/ui/Topbar.svelte';
	import PavilionBackdrop from '$shared/ui/pavilion/PavilionBackdrop.svelte';
	import { t } from '$shared/i18n/i18n.svelte';

	const status = $derived(page.status || 404);
	const missing = $derived(status === 404);
	const digits = $derived(String(status).split(''));
	const message = $derived(
		missing ? t('error.missingMessage') : (page.error?.message ?? t('error.unknownFault'))
	);

	function goHome() {
		void goto(resolve('/'));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === 'Escape') {
			e.preventDefault();
			goHome();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<svelte:head>
	<title>{missing ? t('error.missingTitle') : t('error.faultTitle')} · Capsule Arcade</title>
</svelte:head>

<div class="pavilion">
	<Topbar place={t('top.place')} hall={t('top.error', { status })} backHref="/" />

	<div class="world">
		<PavilionBackdrop />

		<main class="scene" role="alert">
			<div class="hanger">
				<i class="chain l"></i><i class="chain r"></i>
				<section class="plate">
					<i class="bolt tl"></i><i class="bolt tr"></i><i class="bolt bl"></i><i class="bolt br"
					></i>
					<p class="kicker">{t('error.kicker')}</p>

					<div class="code" aria-label="{t('error.code')} {status}">
						{#each digits as d, k (k)}
							{#if missing && k === 1}
								<span class="capsule" aria-hidden="true"
									><i class="lid"></i><i class="cup"></i></span
								>
							{:else}
								<span aria-hidden="true">{d}</span>
							{/if}
						{/each}
					</div>

					<h1>{missing ? t('error.missingTitle') : t('error.faultTitle')}</h1>
					<p class="lead">
						{missing ? t('error.missingLead') : t('error.faultLead')}
					</p>

					<div class="screen">
						<div class="row"><small>{t('error.address')}</small><b>{page.url.pathname}</b></div>
						<div class="row"><small>{t('error.code')}</small><b>{status}</b></div>
						<div class="row"><small>{t('error.message')}</small><b>{message}</b></div>
					</div>

					<button type="button" class="home" onclick={goHome}>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="3"
							stroke-linecap="round"
							stroke-linejoin="round"
							aria-hidden="true"
						>
							<path d="M19 12H6M11 6l-6 6 6 6" />
						</svg>
						{t('error.home')}
					</button>
					<p class="hint">{t('error.hint')}</p>

					<div class="note">{missing ? t('error.noteMissing') : t('error.noteFault')}</div>
				</section>
			</div>
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

	.world {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		min-height: calc(100dvh - 64px);
	}

	.scene {
		position: relative;
		z-index: 1;
		display: flex;
		justify-content: center;
		padding: 0 16px 96px;
	}

	.hanger {
		position: relative;
		width: min(100%, 520px);
		padding-top: 72px;
		transform-origin: 50% 0;
		animation: swing 7s ease-in-out infinite alternate;
	}

	.chain {
		position: absolute;
		top: 0;
		width: 6px;
		height: 86px;
		border-radius: 3px;
		background: repeating-linear-gradient(180deg, #b6c6c1 0 7px, #6f8781 7px 10px);
		box-shadow: 0 0 0 1px rgba(14, 74, 79, 0.6);
	}

	.chain.l {
		left: 22%;
		transform: rotate(8deg);
		transform-origin: 50% 0;
	}

	.chain.r {
		right: 22%;
		transform: rotate(-8deg);
		transform-origin: 50% 0;
	}

	.plate {
		position: relative;
		padding: 26px 32px 30px;
		border-radius: 28px;
		text-align: center;
		background: linear-gradient(180deg, #fff, #eef3f0 55%, #dce7e3);
		box-shadow:
			inset 0 0 0 3px #b9c8c3,
			inset 0 -6px 0 rgba(14, 74, 79, 0.12),
			0 0 0 3px var(--pv-teal),
			0 34px 50px rgba(0, 0, 0, 0.6);
	}

	.bolt {
		position: absolute;
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: radial-gradient(circle at 35% 30%, #fff, #9fb2ac 60%, #6f8781);
		box-shadow: 0 0 0 2px var(--pv-teal);
	}

	.tl {
		top: 14px;
		left: 14px;
	}

	.tr {
		top: 14px;
		right: 14px;
	}

	.bl {
		bottom: 14px;
		left: 14px;
	}

	.br {
		bottom: 14px;
		right: 14px;
	}

	.kicker {
		margin: 0;
		font: 700 11px var(--f-hud);
		letter-spacing: 0.24em;
		text-transform: uppercase;
		color: #5b8b8a;
	}

	.code {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 6px;
		margin: 26px 0 6px;
		font: 900 clamp(84px, 24vw, 132px) / 1 var(--f-head);
		letter-spacing: -0.04em;
		color: var(--pv-red);
		text-shadow: 0 0 22px rgba(255, 58, 29, 0.3);
	}

	.capsule {
		position: relative;
		width: 0.78em;
		height: 0.78em;
		margin: 0 0.04em;
	}

	.capsule i {
		position: absolute;
		left: 0;
		right: 0;
		height: 50%;
	}

	.lid {
		top: 0;
		border-radius: 1em 1em 0 0;
		background: radial-gradient(circle at 50% 120%, #ff8a6a, #c4180a 70%);
		box-shadow: inset 4px 4px 10px rgba(255, 255, 255, 0.4);
		transform: translate(-0.04em, -0.05em) rotate(-16deg);
		transform-origin: 0 100%;
	}

	.cup {
		bottom: 0;
		border-radius: 0 0 1em 1em;
		background: linear-gradient(180deg, #2a3436 0 8%, #fff 9%, #cbd8d4);
		box-shadow:
			inset -6px -6px 10px rgba(0, 0, 0, 0.25),
			0 0 0 3px var(--pv-teal);
	}

	h1 {
		margin: 0;
		font: 900 clamp(22px, 6vw, 30px) / 1.05 var(--f-head);
		letter-spacing: -0.02em;
		text-transform: uppercase;
	}

	.lead {
		max-width: 36ch;
		margin: 10px auto 18px;
		font-size: 16px;
		line-height: 1.3;
	}

	.screen {
		display: grid;
		gap: 6px;
		padding: 12px 16px;
		border-radius: 14px;
		text-align: left;
		background: var(--pv-glass);
		color: #ff6b52;
		text-shadow: 0 0 8px rgba(255, 58, 29, 0.55);
		box-shadow:
			inset 0 0 22px rgba(255, 58, 29, 0.25),
			inset 0 3px 8px #000,
			0 0 0 3px #b9c8c3;
	}

	.row {
		display: grid;
		grid-template-columns: 96px minmax(0, 1fr);
		align-items: baseline;
		gap: 10px;
	}

	.row small {
		font: 500 10px var(--f-hud);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #b4503f;
	}

	.row b {
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		font: 700 15px var(--f-hud);
		letter-spacing: 0.04em;
		color: #ff5a40;
	}

	.home {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		height: 50px;
		margin-top: 22px;
		padding: 0 28px 0 20px;
		border: 0;
		border-radius: 25px;
		cursor: pointer;
		color: #fff;
		background: var(--pv-redgloss);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.55),
			0 0 0 3px #fff,
			0 0 0 5px var(--pv-teal),
			0 5px 0 5px #09353a;
		font: 700 16px var(--f-hud);
		letter-spacing: 0.12em;
		text-transform: uppercase;
		transition:
			transform 0.1s,
			box-shadow 0.1s;
	}

	.home svg {
		width: 20px;
		height: 20px;
	}

	.home:hover {
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.55),
			0 0 0 3px #fff,
			0 0 0 5px var(--pv-teal),
			0 5px 0 5px #09353a,
			0 0 24px 6px rgba(255, 58, 29, 0.6);
	}

	.home:active {
		transform: translateY(4px);
		box-shadow:
			inset 0 1px 0 rgba(255, 255, 255, 0.55),
			0 0 0 3px #fff,
			0 0 0 5px var(--pv-teal),
			0 1px 0 5px #09353a;
	}

	.home:focus-visible {
		outline: 3px solid var(--pv-red);
		outline-offset: 8px;
	}

	.hint {
		margin: 16px 0 0;
		font: 500 11px var(--f-hud);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: #5b8b8a;
	}

	.note {
		position: absolute;
		right: -10px;
		bottom: -22px;
		padding: 6px 14px 8px;
		transform: rotate(-5deg);
		background: #f4e9a6;
		color: #3a3320;
		font: 600 21px/1 var(--f-hand);
		box-shadow: 2px 4px 0 rgba(0, 0, 0, 0.2);
	}

	.note::before {
		content: '';
		position: absolute;
		top: -9px;
		left: 50%;
		width: 46px;
		height: 16px;
		margin-left: -23px;
		transform: rotate(3deg);
		background: rgba(255, 255, 255, 0.55);
	}

	@keyframes swing {
		from {
			transform: rotate(-1.2deg);
		}
		to {
			transform: rotate(1.2deg);
		}
	}

	@media (max-width: 640px) {
		.hanger {
			padding-top: 56px;
		}

		.chain {
			height: 70px;
		}

		.plate {
			padding: 22px 18px 26px;
		}

		.row {
			grid-template-columns: 78px minmax(0, 1fr);
		}

		.note {
			right: 6px;
			font-size: 19px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hanger {
			animation: none;
		}

		.home {
			transition: none;
		}
	}
</style>
