<!-- Everything the player sees over the canvas: the HUD (the arcade one on the secret level),
	the screens, and the screen fade on top of both. -->
<script lang="ts">
	import { hudFrame, screenActions } from './hud/hudFrame';
	import GameHud from './hud/GameHud.svelte';
	import ArcadeHud from './hud/ArcadeHud.svelte';
	import GameScreens from './screens/GameScreens.svelte';
	import MuteButton from './MuteButton.svelte';
</script>

<MuteButton />

{#if $hudFrame}
	<!-- the arcade shift hides the HUD: either one would belong to the world it is leaving -->
	{#if $hudFrame.state !== 'menu' && $hudFrame.state !== 'world-shift'}
		{#if $hudFrame.world === 'secret'}
			<ArcadeHud snap={$hudFrame} />
		{:else}
			<GameHud snap={$hudFrame} />
		{/if}
	{/if}
	{#if $screenActions}
		<GameScreens snap={$hudFrame} actions={$screenActions} />
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
