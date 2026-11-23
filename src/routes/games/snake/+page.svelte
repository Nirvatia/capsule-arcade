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
		href="https://fonts.googleapis.com/css2?family=Raleway:wght@200;300;400&display=swap"
	/>
</svelte:head>

<main class="drift">
	<div class="stage" bind:this={stage}></div>
	<DriftHud />
	<DriftOverlay />
</main>

<style>
	.drift {
		--d-ink: #cfe6ea;
		--d-dim: #7f9fab;
		position: fixed;
		inset: 0;
		overflow: hidden;
		background: #02070d;
		color: var(--d-ink);
		font-family: 'Raleway', 'Avenir Next', 'Segoe UI', system-ui, sans-serif;
		font-weight: 300;
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
	}

	.stage {
		position: absolute;
		inset: 0;
	}
</style>
