// Общие примитивы рисования и палитра Затерянного храма.

export const TAU = Math.PI * 2;

export const PAL = {
	gold: '#f2c14e',
	goldHi: '#ffe6a3',
	pat: '#3fd1bd',
	patHi: '#b9fff3',
	crim: '#e0384f',
	crimHi: '#ff9aa6',
	bronze: '#9a7442',
	stone: '#6f7774',
	stoneLight: '#8a928f',
	stoneDark: '#3d4442'
} as const;

export const FONT_DISPLAY = '"Forum", "Times New Roman", Georgia, serif';
export const FONT_LABEL = '"Alegreya Sans SC", "Alegreya Sans", system-ui, sans-serif';

/** Источник света: x, y, радиус, цвет #rrggbb, яркость. Рисуются одним проходом lighter. */
export type Light = [number, number, number, string, number];

/** Детерминированный шум 0..1 для декора. */
export function hs(n: number): number {
	const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
	return x - Math.floor(x);
}

export const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

export function circle(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
	c.beginPath();
	c.arc(x, y, Math.max(0.1, r), 0, TAU);
	c.fill();
}

export function ellipse(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	rx: number,
	ry: number,
	a = 0
): void {
	c.beginPath();
	c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), a, 0, TAU);
	c.fill();
}

const rgbCache = new Map<string, [number, number, number]>();
function rgb(hex: string): [number, number, number] {
	let v = rgbCache.get(hex);
	if (!v) {
		const n = parseInt(hex.slice(1), 16);
		v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
		rgbCache.set(hex, v);
	}
	return v;
}

/** Смешивание двух #rrggbb, t ∈ [0,1]. */
export function mix(a: string, b: string, t: number): string {
	if (t <= 0) return a;
	if (t >= 1) return b;
	const A = rgb(a);
	const B = rgb(b);
	return `rgb(${Math.round(A[0] + (B[0] - A[0]) * t)},${Math.round(A[1] + (B[1] - A[1]) * t)},${Math.round(A[2] + (B[2] - A[2]) * t)})`;
}

const spriteCache = new Map<string, HTMLCanvasElement>();
/** Мягкое пятно света, кэшируется по цвету. */
export function glowSprite(color: string): HTMLCanvasElement {
	let s = spriteCache.get(color);
	if (s) return s;
	s = document.createElement('canvas');
	s.width = s.height = 64;
	const g = s.getContext('2d')!;
	const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
	gr.addColorStop(0, color);
	gr.addColorStop(0.25, color + '88');
	gr.addColorStop(1, color + '00');
	g.fillStyle = gr;
	g.fillRect(0, 0, 64, 64);
	spriteCache.set(color, s);
	return s;
}

export function drawLights(c: CanvasRenderingContext2D, lights: readonly Light[]): void {
	if (lights.length === 0) return;
	c.save();
	c.globalCompositeOperation = 'lighter';
	for (const [x, y, r, col, a] of lights) {
		if (a <= 0.01) continue;
		c.globalAlpha = Math.min(1, a);
		c.drawImage(glowSprite(col), x - r, y - r, r * 2, r * 2);
	}
	c.restore();
}
