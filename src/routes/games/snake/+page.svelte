<!-- src/routes/games/snake/+page.svelte -->
<script lang="ts">
	import GameStage from '$shared/ui/GameStage.svelte';
	import SnakeOverlay from '$games/snake/ui/SnakeOverlay.svelte';
	import SnakeHud from '$games/snake/ui/SnakeHud.svelte';
	import { SnakeGame } from '$games/snake/SnakeGame';

	let game: SnakeGame | null = $state(null);
</script>

<svelte:head>
	<title>SNAKE · NEO ARCADE</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@500&family=Alegreya+Sans+SC:wght@500;700;800&family=Forum&display=swap"
	/>
</svelte:head>

{#snippet hudTop()}
	<SnakeHud />
{/snippet}

{#snippet overlay()}
	<SnakeOverlay />
{/snippet}

<GameStage
	init={(el) => {
		const g = new SnakeGame();
		game = g;

		void g.init(el).catch((e) => console.error('[Snake] init failed', e));

		return () => {
			game = null;
			g.destroy();
		};
	}}
	touch={{
		direction: (dir) => game?.touchDirection(dir),
		pause: () => game?.touchPause(),
		mute: () => game?.touchMute()
	}}
	{hudTop}
	{overlay}
/>
