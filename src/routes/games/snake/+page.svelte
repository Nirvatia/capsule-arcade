<!-- src/routes/games/snake/+page.svelte — «Дрейф», спокойная змейка. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import DriftHud from '$games/snake/ui/DriftHud.svelte';
	import DriftOverlay from '$games/snake/ui/DriftOverlay.svelte';
	import { DriftGame } from '$games/snake/DriftGame';
	import { tr } from '$games/snake/i18n';

	let stage = $state<HTMLDivElement | undefined>(undefined);

	onMount(() => {
		if (!stage) return;
		const game = new DriftGame();
		void game.init(stage).catch((e) => console.error('[Drift] init failed', e));
		if (new URLSearchParams(location.search).has('debug'))
			(window as unknown as { __drift?: DriftGame }).__drift = game;
		return () => game.destroy();
	});
</script>

<svelte:head>
	<title>{tr('name')} · Capsule Arcade</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&display=swap"
	/>
</svelte:head>

<main class="drift">
	<div class="stage" bind:this={stage}></div>
	<DriftHud />
	<DriftOverlay />
</main>

<style>
	.drift {
		--d-ink: #262c36;
		--d-dim: rgba(38, 44, 54, 0.6);
		--d-line: rgba(38, 44, 54, 0.2);
		--d-paper: rgba(244, 240, 232, 0.82);
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #e4e5e3;
		color: var(--d-ink);
		font-family: 'Cormorant Garamond', 'EB Garamond', Georgia, serif;
		font-weight: 400;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.stage {
		position: absolute;
		inset: 0;
	}
</style>
