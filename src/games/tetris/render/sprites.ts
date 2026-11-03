import type { Cell } from '../core/types';
import { colorOf, paintCell, PALETTE } from '../theme/palette';

export class SpriteSheet {
	private readonly sprites = new Map<Exclude<Cell, 0>, HTMLCanvasElement>();
	private size = 0;

	get cellSize(): number {
		return this.size;
	}

	build(size: number): void {
		if (size === this.size) return;
		this.size = size;
		this.sprites.clear();
		for (const key of Object.keys(PALETTE)) {
			const cell = Number(key) as Exclude<Cell, 0>;
			const canvas = document.createElement('canvas');
			canvas.width = size;
			canvas.height = size;
			const ctx = canvas.getContext('2d');
			if (!ctx) throw new Error('[Tetris/sprites] Failed to create sprite context');
			paintCell(ctx, 0, 0, size, colorOf(cell));
			this.sprites.set(cell, canvas);
		}
	}

	get(cell: Exclude<Cell, 0>): HTMLCanvasElement {
		const sprite = this.sprites.get(cell);
		if (!sprite) throw new Error(`[Tetris/sprites] Sprite ${cell} is not built`);
		return sprite;
	}
}
