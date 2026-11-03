<script lang="ts">
	import { pieceCells } from '../core/pieces';
	import type { PieceType } from '../core/types';
	import { colorOf, paintCell } from '../theme/palette';

	interface Props {
		type: PieceType | null;
		cell: number;
		dim?: boolean;
	}

	let { type, cell, dim = false }: Props = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);

	const width = $derived(cell * 4);
	const height = $derived(cell * 2);

	$effect(() => {
		if (!canvas) return;
		const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
		const size = Math.max(2, Math.floor(cell * dpr));
		canvas.width = size * 4;
		canvas.height = size * 2;
		const ctx = canvas.getContext('2d');
		if (!ctx) throw new Error('[Tetris/PiecePreview] Failed to get 2D context');
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		if (type === null) return;
		const cells = pieceCells(type, 0);
		const xs = cells.map(([x]) => x);
		const ys = cells.map(([, y]) => y);
		const minX = Math.min(...xs);
		const minY = Math.min(...ys);
		const w = Math.max(...xs) - minX + 1;
		const h = Math.max(...ys) - minY + 1;
		const ox = Math.round((canvas.width - w * size) / 2);
		const oy = Math.round((canvas.height - h * size) / 2);
		const color = colorOf(type);
		for (const [x, y] of cells) {
			paintCell(ctx, ox + (x - minX) * size, oy + (y - minY) * size, size, color);
		}
	});
</script>

<canvas
	bind:this={canvas}
	class="preview"
	class:preview--dim={dim}
	style:width="{width}px"
	style:height="{height}px"
	aria-hidden="true"
></canvas>

<style>
	.preview {
		display: block;
		transition:
			opacity 0.2s,
			filter 0.2s;
	}

	.preview--dim {
		opacity: 0.35;
		filter: grayscale(0.7);
	}
</style>
