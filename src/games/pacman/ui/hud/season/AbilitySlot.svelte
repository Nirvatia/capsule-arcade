<!-- The ability in the hero's slot (or running), drawn with the game's own art (`abilityArt`,
	the echo's wisp token) on a small canvas that sits in the HUD's dial. -->
<script lang="ts">
	import { onMount } from 'svelte';
	import type { AbilityKind } from '../../../config/abilityConfig';
	import { drawAbilityIcon } from '../../../render/actors/abilityArt';
	import { EchoCloneView } from '../../../render/actors/EchoCloneView';

	let { kind, size, scale = 1 }: { kind: AbilityKind; size: number; scale?: number } = $props();

	let canvas: HTMLCanvasElement | undefined = $state();
	const echo = new EchoCloneView();

	onMount(() => {
		let raf = 0;
		const start = performance.now();
		const loop = (now: number) => {
			const c = canvas?.getContext('2d');
			if (c && canvas) {
				const dpr = Math.min(4, (window.devicePixelRatio || 1) * Math.max(0.5, scale));
				const side = Math.max(8, Math.round(size * dpr));
				if (canvas.width !== side) {
					canvas.width = canvas.height = side;
				}
				c.setTransform(dpr, 0, 0, dpr, 0, 0);
				c.clearRect(0, 0, size, size);
				const t = (now - start) / 1000;
				const S = size * 0.75;
				if (kind === 'echo') {
					echo.drawToken(
						c,
						{ x: 0, y: 0 },
						8,
						{ tileSize: S, offsetX: size / 2, offsetY: size / 2 },
						t
					);
				} else {
					drawAbilityIcon(c, kind, size / 2, size / 2, S, t);
				}
			}
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	});
</script>

<canvas bind:this={canvas} style:width="{size}px" style:height="{size}px"></canvas>

<style>
	canvas {
		display: block;
	}
</style>
