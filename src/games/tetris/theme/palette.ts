import { CONCRETE, PieceType, type Cell } from '../core/types';

export interface CellColor {
	light: string;
	base: string;
	dark: string;
}

export const PALETTE: Readonly<Record<Exclude<Cell, 0>, CellColor>> = {
	[PieceType.I]: { light: '#9fd0ea', base: '#3f7fa6', dark: '#1f4660' },
	[PieceType.O]: { light: '#ffe08f', base: '#e3a72f', dark: '#8a5a10' },
	[PieceType.T]: { light: '#e7a0c4', base: '#a34f7c', dark: '#55203d' },
	[PieceType.S]: { light: '#c3e09a', base: '#6f9a4a', dark: '#35521e' },
	[PieceType.Z]: { light: '#ff9a86', base: '#d23a2e', dark: '#6e1410' },
	[PieceType.J]: { light: '#fffbf2', base: '#e4d8bc', dark: '#968a6c' },
	[PieceType.L]: { light: '#ffb27d', base: '#df6a2a', dark: '#76300e' },
	[CONCRETE]: { light: '#8a7d75', base: '#5d504a', dark: '#2e2622' }
};

export const WELL = {
	top: '#1b0d0a',
	bottom: '#26130f',
	stripe: 'rgba(255, 230, 190, 0.022)',
	dot: 'rgba(255, 230, 190, 0.13)',
	vignette: 'rgba(0, 0, 0, 0.5)',
	danger: '230, 30, 20',
	gold: '255, 215, 126'
} as const;

export function colorOf(cell: Exclude<Cell, 0>): CellColor {
	const color = PALETTE[cell];
	if (!color) {
		throw new Error(`[Tetris/theme] No color for cell value ${cell}`);
	}
	return color;
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	s: number,
	r: number
): void {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + s, y, x + s, y + s, r);
	ctx.arcTo(x + s, y + s, x, y + s, r);
	ctx.arcTo(x, y + s, x, y, r);
	ctx.arcTo(x, y, x + s, y, r);
	ctx.closePath();
}

export function paintCell(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	color: CellColor
): void {
	const seam = Math.max(1, Math.round(size * 0.035));
	const s = Math.max(2, Math.round(size) - seam);
	const ox = x + Math.floor(seam / 2);
	const oy = y + Math.floor(seam / 2);
	const r = Math.max(1, Math.round(s * 0.1));

	ctx.save();
	roundRect(ctx, ox, oy, s, r);
	ctx.clip();

	const face = ctx.createLinearGradient(ox, oy, ox + s, oy + s);
	face.addColorStop(0, color.light);
	face.addColorStop(0.55, color.base);
	face.addColorStop(1, color.dark);
	ctx.fillStyle = face;
	ctx.fillRect(ox, oy, s, s);

	ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
	ctx.fillRect(ox, oy, s, Math.round(s * 0.22));

	const edge = Math.max(1, Math.round(s * 0.1));
	ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
	ctx.fillRect(ox, oy + s - edge, s, edge);
	ctx.fillStyle = 'rgba(255, 255, 255, 0.16)';
	ctx.fillRect(ox, oy, Math.max(1, Math.round(s * 0.06)), s);

	if (s >= 20) {
		const rr = Math.max(1, s * 0.045);
		for (const rx of [0.22, 0.78]) {
			ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
			ctx.beginPath();
			ctx.arc(ox + s * rx, oy + s * 0.78, rr, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	ctx.restore();

	ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
	ctx.lineWidth = 1;
	roundRect(ctx, ox + 0.5, oy + 0.5, s - 1, r);
	ctx.stroke();
}
