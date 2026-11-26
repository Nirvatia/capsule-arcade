<script lang="ts">
	/** A pixel sprite of the arcade level shown in the HUD: drawn once, no smoothing, `scale`× whole pixels. */
	let { sprite, scale = 2 }: { sprite: HTMLCanvasElement; scale?: number } = $props();
	let canvas: HTMLCanvasElement | undefined = $state();

	$effect(() => {
		if (!canvas) return;
		canvas.width = sprite.width;
		canvas.height = sprite.height;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.clearRect(0, 0, sprite.width, sprite.height);
		ctx.drawImage(sprite, 0, 0);
	});
</script>

<canvas
	bind:this={canvas}
	style:width="{sprite.width * scale}px"
	style:height="{sprite.height * scale}px"
	aria-hidden="true"
></canvas>

<style>
	canvas {
		display: block;
		image-rendering: pixelated;
	}
</style>
