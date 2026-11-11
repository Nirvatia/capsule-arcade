<!-- Everything the player sees over the canvas: the HUD (the season worlds' own one on a
	landscape screen, two bands on a taller one; the boss levels' own one; the arcade one on the secret level), the screens, and the
	screen fade on top of both. -->
<script lang="ts">
	import { hudFrame, screenActions } from './hud/hudFrame';
	import ArcadeHud from './hud/ArcadeHud.svelte';
	import SeasonHud from './hud/season/SeasonHud.svelte';
	import SeasonHudStack from './hud/season/SeasonHudStack.svelte';
	import BossHud from './hud/season/BossHud.svelte';
	import { isSeasonKey } from './hud/season/seasonThemes';
	import GameScreens from './screens/GameScreens.svelte';
	import WorldScreens from './screens/WorldScreens.svelte';
	import MuteButton from './MuteButton.svelte';
	import { bossHudLayoutFor, hudLayoutFor } from '../config/hudLayout';

	let innerWidth = $state(1280);
	let innerHeight = $state(720);
	const layout = $derived(hudLayoutFor(innerWidth, innerHeight));
	const bossLayout = $derived(bossHudLayoutFor(innerWidth, innerHeight));
</script>

<svelte:window bind:innerWidth bind:innerHeight />

<svelte:head>
	<link
		rel="stylesheet"
		href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Fredoka:wght@500;600&family=Caveat:wght@600&display=swap"
	/>
</svelte:head>

<MuteButton />

{#if $hudFrame}
	<!-- the arcade shift hides the HUD: either one would belong to the world it is leaving -->
	{#if $hudFrame.state !== 'menu' && $hudFrame.state !== 'world-shift'}
		{#if $hudFrame.world === 'secret'}
			<ArcadeHud snap={$hudFrame} />
		{:else if isSeasonKey($hudFrame.world) && layout.mode === 'side'}
			<SeasonHud snap={$hudFrame} scale={layout.scale} onpause={() => $screenActions?.pause()} />
		{:else if isSeasonKey($hudFrame.world)}
			<SeasonHudStack
				snap={$hudFrame}
				scale={layout.scale}
				onpause={() => $screenActions?.pause()}
			/>
		{:else}
			<BossHud
				snap={$hudFrame}
				scale={bossLayout.scale}
				mode={bossLayout.mode}
				onpause={() => $screenActions?.pause()}
			/>
		{/if}
	{/if}
	{#if $screenActions}
		{#if $hudFrame.world === 'secret'}
			<GameScreens snap={$hudFrame} actions={$screenActions} />
		{:else}
			<WorldScreens snap={$hudFrame} actions={$screenActions} />
		{/if}
	{/if}
	{#if $hudFrame.fade > 0}
		<div class="fade" style:opacity={$hudFrame.fade}></div>
	{/if}
{/if}

<style>
	.fade {
		position: fixed;
		inset: 0;
		z-index: 40;
		background: #030509;
		pointer-events: none;
	}
</style>
