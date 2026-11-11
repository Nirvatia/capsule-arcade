<script lang="ts">
	import { resolve } from '$app/paths';
	import type { Pathname } from '$app/types';
	import { LANGS, i18n, setLang, t } from '$shared/i18n/i18n.svelte';

	interface Props {
		place: string;
		hall?: string;
		backHref?: Pathname;
		aboutHref?: Pathname;
		sound?: boolean;
		onSoundToggle?: () => void;
	}

	let { place, hall, backHref, aboutHref, sound = false, onSoundToggle }: Props = $props();
</script>

<header class="topbar">
	{#if backHref}
		<a class="pill back" href={resolve(backHref)} aria-label={t('top.back')}>
			<span class="knob">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="3.2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M19 12H6M11 6l-6 6 6 6" />
				</svg>
			</span>
			<b>{t('top.back')}</b>
		</a>
	{:else if aboutHref}
		<a class="pill back about" href={resolve(aboutHref)}>
			<span class="knob">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="3.2"
					stroke-linecap="round"
				>
					<path d="M12 11v6M12 7v.5" />
				</svg>
			</span>
			<b>{t('top.about')}</b>
		</a>
	{/if}

	<div class="where">
		<i></i>{place}
		{#if hall}<small>{hall}</small>{/if}
	</div>

	<div class="tools">
		<div class="lang" role="group" aria-label={t('top.language')}>
			{#each LANGS as l (l.id)}
				<button type="button" aria-pressed={i18n.lang === l.id} onclick={() => setLang(l.id)}>
					{l.label}
				</button>
			{/each}
		</div>

		{#if onSoundToggle}
			<button
				class="pill snd"
				aria-pressed={sound}
				aria-label={t('top.sound')}
				onclick={onSoundToggle}
			>
				<b>{t('top.sound')}</b><span class="sw"><i></i></span>
			</button>
		{/if}
	</div>
</header>

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 30;
		height: 64px;
		padding: 0 12px;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 12px;
		color: var(--pv-teal);
		background: linear-gradient(180deg, #fbfdfb, #e2ebe7);
		border-bottom: 3px solid var(--pv-teal);
		box-shadow:
			0 3px 0 #b9c8c3,
			0 10px 22px rgba(0, 0, 0, 0.45);
	}

	.pill {
		height: 44px;
		display: flex;
		align-items: center;
		gap: 10px;
		border: 0;
		border-radius: 22px;
		cursor: pointer;
		text-decoration: none;
		color: var(--pv-teal);
		background: linear-gradient(180deg, #fff, #e3ece8);
		box-shadow:
			0 0 0 2px var(--pv-teal),
			inset 0 -3px 0 rgba(14, 74, 79, 0.12),
			0 3px 0 2px rgba(14, 74, 79, 0.25);
		transition:
			transform 0.1s,
			box-shadow 0.1s;
	}

	.pill:active {
		transform: translateY(2px);
		box-shadow:
			0 0 0 2px var(--pv-teal),
			inset 0 -1px 0 rgba(14, 74, 79, 0.12),
			0 1px 0 2px rgba(14, 74, 79, 0.25);
	}

	.pill:focus-visible {
		outline: 3px solid var(--pv-red);
		outline-offset: 3px;
	}

	.back {
		grid-column: 1;
		justify-self: start;
		padding: 0 20px 0 4px;
	}

	.knob {
		width: 36px;
		height: 36px;
		flex: none;
		border-radius: 50%;
		display: grid;
		place-items: center;
		background: radial-gradient(circle at 35% 28%, #ff9a82, var(--pv-red) 55%, #b81d08);
		box-shadow:
			inset 0 -2px 0 rgba(0, 0, 0, 0.2),
			0 0 0 2px #fff;
		transition: box-shadow 0.15s;
	}

	.knob svg {
		width: 20px;
		height: 20px;
		color: #fff;
		transition: transform 0.15s;
	}

	.back:hover .knob {
		box-shadow:
			inset 0 -2px 0 rgba(0, 0, 0, 0.2),
			0 0 0 2px #fff,
			0 0 16px 3px rgba(255, 58, 29, 0.7);
	}

	.back:hover .knob svg {
		transform: translateX(-3px);
	}

	b {
		white-space: nowrap;
		font: 700 14px var(--f-head);
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.where {
		grid-column: 2;
		height: 40px;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 0 18px;
		border-radius: 10px;
		background: #dfe8e4;
		box-shadow:
			inset 0 2px 5px rgba(14, 74, 79, 0.28),
			0 1px 0 #fff;
		font: 700 14px var(--f-hud);
		letter-spacing: 0.16em;
		text-transform: uppercase;
		white-space: nowrap;
	}

	.where i {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		background: var(--pv-red);
		box-shadow: 0 0 8px 2px rgba(255, 58, 29, 0.7);
	}

	.where small {
		padding-left: 12px;
		border-left: 2px solid #b4c4bf;
		font: 500 12px var(--f-hud);
		letter-spacing: 0.14em;
		color: #5b8b8a;
	}

	.tools {
		grid-column: 3;
		justify-self: end;
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.lang {
		display: flex;
		gap: 2px;
		padding: 3px;
		border-radius: 20px;
		background: #0c2326;
		box-shadow:
			0 0 0 2px var(--pv-teal),
			inset 0 3px 6px #000;
	}

	.lang button {
		all: unset;
		cursor: pointer;
		padding: 7px 11px;
		border-radius: 17px;
		font: 700 12px var(--f-hud);
		letter-spacing: 0.1em;
		color: #9fc3c0;
	}

	.lang button[aria-pressed='true'] {
		background: var(--pv-redgloss);
		color: #fff;
	}

	.lang button:focus-visible {
		outline: 2px solid var(--pv-red);
		outline-offset: 2px;
	}

	.snd {
		padding: 0 5px 0 16px;
	}

	.sw {
		position: relative;
		width: 50px;
		height: 34px;
		border-radius: 17px;
		background: #0c2326;
		box-shadow: inset 0 3px 6px #000;
		transition: background 0.15s;
	}

	.sw i {
		position: absolute;
		top: 4px;
		left: 4px;
		width: 26px;
		height: 26px;
		border-radius: 50%;
		background: linear-gradient(180deg, #fff, #9fb2ac);
		box-shadow: 0 2px 3px rgba(0, 0, 0, 0.5);
		transition: transform 0.15s;
	}

	.snd[aria-pressed='true'] .sw {
		background: var(--pv-redgloss);
	}

	.snd[aria-pressed='true'] .sw i {
		transform: translateX(16px);
	}

	@media (max-width: 760px) {
		.where {
			display: none;
		}
	}

	@media (max-width: 640px) {
		.topbar {
			padding: 0 10px;
			gap: 8px;
		}

		.tools {
			gap: 6px;
		}
	}

	@media (max-width: 480px) {
		.snd {
			padding: 0 5px;
		}

		.snd b {
			display: none;
		}

		.about {
			padding-right: 12px;
		}

		.about b {
			font-size: 12px;
		}

		.lang button {
			padding: 7px 8px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.sw i {
			transition: none;
		}
	}
</style>
