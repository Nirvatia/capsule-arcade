import { CONCRETE, PieceType, type Cell } from '../core/types';

export interface CellColor {
	base: string;
	light: string;
	dark: string;
}

export const PALETTE: Readonly<Record<Exclude<Cell, 0>, CellColor>> = {
	[PieceType.I]: { base: '#4e86a6', light: '#8fc0da', dark: '#264a60' },
	[PieceType.O]: { base: '#e3a72f', light: '#ffd77e', dark: '#8a5a10' },
	[PieceType.T]: { base: '#a8517c', light: '#dc8db3', dark: '#5c2340' },
	[PieceType.S]: { base: '#7d9c55', light: '#b5d38a', dark: '#405a24' },
	[PieceType.Z]: { base: '#d0362e', light: '#ff7f6e', dark: '#701410' },
	[PieceType.J]: { base: '#e6dbc0', light: '#fffaf0', dark: '#9b8f72' },
	[PieceType.L]: { base: '#db6a2b', light: '#ffa86e', dark: '#7a3210' },
	[CONCRETE]: { base: '#5d504a', light: '#857770', dark: '#2e2622' }
};

export function colorOf(cell: Exclude<Cell, 0>): CellColor {
	const color = PALETTE[cell];
	if (!color) {
		throw new Error(`[Tetris/sprites] No color for cell value ${cell}`);
	}
	return color;
}

export function paintCell(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	color: CellColor
): void {
	const s = Math.max(2, Math.round(size));
	const bevel = Math.max(1, Math.round(s * 0.14));
	const outline = Math.max(1, Math.round(s * 0.05));

	ctx.fillStyle = color.dark;
	ctx.fillRect(x, y, s, s);

	const face = ctx.createLinearGradient(x, y, x + s, y + s);
	face.addColorStop(0, color.light);
	face.addColorStop(0.45, color.base);
	face.addColorStop(1, color.base);
	ctx.fillStyle = face;
	ctx.fillRect(x + outline, y + outline, s - outline * 2, s - outline * 2);

	ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
	ctx.beginPath();
	ctx.moveTo(x + outline, y + outline);
	ctx.lineTo(x + s - outline, y + outline);
	ctx.lineTo(x + s - outline - bevel, y + outline + bevel);
	ctx.lineTo(x + outline + bevel, y + outline + bevel);
	ctx.lineTo(x + outline + bevel, y + s - outline - bevel);
	ctx.lineTo(x + outline, y + s - outline);
	ctx.closePath();
	ctx.fill();

	ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
	ctx.beginPath();
	ctx.moveTo(x + s - outline, y + outline);
	ctx.lineTo(x + s - outline, y + s - outline);
	ctx.lineTo(x + outline, y + s - outline);
	ctx.lineTo(x + outline + bevel, y + s - outline - bevel);
	ctx.lineTo(x + s - outline - bevel, y + s - outline - bevel);
	ctx.lineTo(x + s - outline - bevel, y + outline + bevel);
	ctx.closePath();
	ctx.fill();

	if (s >= 22) {
		const r = Math.max(1, s * 0.045);
		const o = outline + bevel + r * 1.6;
		for (const [rx, ry] of [
			[o, o],
			[s - o, o],
			[o, s - o],
			[s - o, s - o]
		]) {
			ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
			ctx.beginPath();
			ctx.arc(x + rx, y + ry, r, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
			ctx.beginPath();
			ctx.arc(x + rx - r * 0.35, y + ry - r * 0.35, r * 0.45, 0, Math.PI * 2);
			ctx.fill();
		}
	}
}

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
