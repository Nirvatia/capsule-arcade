<script lang="ts">
	import { onMount } from 'svelte';
	import Topbar from '$shared/ui/Topbar.svelte';
	import GameIcon from '$shared/ui/GameIcon.svelte';
	import PavilionBackdrop from '$shared/ui/pavilion/PavilionBackdrop.svelte';
	import CapsuleMachine from '$shared/ui/pavilion/CapsuleMachine.svelte';
	import { menuSound } from '$shared/ui/pavilion/menuSound';
	import { games, getGameRecord, isPlayable } from '$shared/config/games';

	const SOUND_KEY = 'neo_arcade_menu_sound';

	let records = $state<Record<string, number>>({});
	let sound = $state(true);
	let toast = $state({ id: 0, text: '' });

	const honor = $derived(
		games
			.filter(isPlayable)
			.map((game) => ({ game, record: records[game.id] ?? 0 }))
			.sort((a, b) => b.record - a.record)
			.slice(0, 3)
	);

	const fmt = (n: number) => (n > 0 ? n.toLocaleString('ru-RU') : 'нет рекорда');

	function showToast(text: string) {
		toast = { id: toast.id + 1, text };
	}

	function toggleSound() {
		sound = !sound;
		menuSound.enabled = sound;
		try {
			localStorage.setItem(SOUND_KEY, sound ? '1' : '0');
		} catch (e) {
			console.warn('[Menu] Failed to save sound setting', e);
		}
		menuSound.tick();
	}

	onMount(() => {
		records = Object.fromEntries(games.map((game) => [game.id, getGameRecord(game)]));
		try {
			sound = localStorage.getItem(SOUND_KEY) !== '0';
		} catch (e) {
			console.warn('[Menu] Failed to read sound setting', e);
		}
		menuSound.enabled = sound;
	});
</script>

<svelte:head>
	<title>Павильон досуга · NEO ARCADE</title>
</svelte:head>

<div class="pavilion">
	<Topbar place="Павильон досуга" hall="Зал 5" {sound} onSoundToggle={toggleSound} />

	<div class="world">
		<PavilionBackdrop />

		<main class="scene">
			<aside class="poster" aria-hidden="true">
				<svg viewBox="0 0 150 150">
					<circle cx="75" cy="75" r="70" fill="#ff3a1d" />
					<g fill="none" stroke="#efe9d6" stroke-width="5">
						<ellipse cx="75" cy="75" rx="58" ry="22" />
						<ellipse cx="75" cy="75" rx="58" ry="22" transform="rotate(60 75 75)" />
						<ellipse cx="75" cy="75" rx="58" ry="22" transform="rotate(120 75 75)" />
					</g>
					<circle cx="75" cy="75" r="11" fill="#efe9d6" />
				</svg>
				<b>Отдых — это тоже труд</b>
				<span>Досуг коллектива</span>
			</aside>

			<CapsuleMachine {games} {records} onToast={showToast} />

			<aside class="honor" aria-label="Доска почёта">
				<h2>Доска почёта</h2>
				<ol>
					{#each honor as { game, record } (game.id)}
						<li style:--p1={game.light} style:--p2={game.deep}>
							<span class="medal"><GameIcon name={game.icon} /></span>
							<b>{game.title}</b>
							<span>{fmt(record)}</span>
						</li>
					{/each}
				</ol>
			</aside>
		</main>
	</div>

	{#key toast.id}
		{#if toast.text}
			<div class="toast" role="status">{toast.text}</div>
		{/if}
	{/key}
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
		outline-color: #fff;
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
		max-width: 1400px;
		margin: 0 auto;
		padding: 40px 20px 110px;
		display: grid;
		grid-template-columns: 1fr minmax(0, 560px) 1fr;
		gap: 40px;
		align-items: start;
	}

	.poster,
	.honor {
		display: none;
	}

	.poster {
		justify-self: end;
		width: 200px;
		margin-top: 190px;
		padding: 12px;
		transform: rotate(-2deg);
		background: #efe9d6;
		border: 6px solid var(--pv-red);
		border-radius: 4px;
		text-align: center;
		box-shadow: 0 14px 26px rgba(0, 0, 0, 0.55);
	}

	.poster svg {
		width: 100%;
		display: block;
		margin-bottom: 8px;
	}

	.poster b {
		display: block;
		font: 900 19px/1.1 var(--f-head);
		text-transform: uppercase;
		letter-spacing: -0.02em;
	}

	.poster span {
		display: block;
		margin: 10px -12px -12px;
		padding: 7px;
		background: var(--pv-red);
		color: #fff;
		font: 700 12px var(--f-hud);
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}

	.honor {
		position: relative;
		justify-self: start;
		width: 230px;
		margin-top: 260px;
		padding: 16px 14px 12px;
		transform: rotate(1.5deg);
		border-radius: 10px;
		background: linear-gradient(180deg, #fff, #e3ece8);
		box-shadow:
			0 0 0 3px var(--pv-teal),
			0 14px 26px rgba(0, 0, 0, 0.55);
	}

	.honor::before,
	.honor::after {
		content: '';
		position: absolute;
		top: 8px;
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: #9fb2ac;
		box-shadow: inset 0 1px 1px rgba(0, 0, 0, 0.4);
	}

	.honor::before {
		left: 8px;
	}

	.honor::after {
		right: 8px;
	}

	.honor h2 {
		margin: 0 0 10px;
		text-align: center;
		font: 900 15px var(--f-head);
		text-transform: uppercase;
		color: var(--pv-red);
	}

	.honor ol {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 8px;
	}

	.honor li {
		display: grid;
		grid-template-columns: 34px 1fr;
		column-gap: 10px;
		align-items: center;
	}

	.medal {
		grid-row: span 2;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		color: #fff;
		background: radial-gradient(circle at 50% 30%, var(--p1), var(--p2));
		box-shadow: 0 0 0 2px var(--pv-teal);
	}

	.medal :global(svg) {
		width: 20px;
		height: 20px;
	}

	.honor li b {
		font: 700 13px var(--f-head);
		text-transform: uppercase;
	}

	.honor li > span:last-child {
		font: 700 13px var(--f-hud);
		letter-spacing: 0.1em;
		color: #5b8b8a;
	}

	.toast {
		position: fixed;
		left: 50%;
		bottom: 22px;
		z-index: 50;
		max-width: calc(100% - 32px);
		padding: 10px 20px;
		border-radius: 999px;
		background: var(--pv-glass);
		color: #ff7a63;
		border: 2px solid #1d3a3d;
		font: 700 15px var(--f-hud);
		letter-spacing: 0.05em;
		text-align: center;
		transform: translate(-50%, 160%);
		animation: toast 2.8s ease forwards;
	}

	@keyframes toast {
		8%,
		90% {
			transform: translate(-50%, 0);
		}
		100% {
			transform: translate(-50%, 160%);
			visibility: hidden;
		}
	}

	@media (min-width: 1180px) {
		.poster,
		.honor {
			display: block;
		}
	}

	@media (max-width: 1099px) {
		.scene {
			grid-template-columns: minmax(0, 560px);
			justify-content: center;
		}
	}

	@media (max-width: 640px) {
		.scene {
			padding: 22px 10px 100px;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.toast {
			animation-duration: 2.8s;
			animation-timing-function: steps(1, end);
		}
	}
</style>
