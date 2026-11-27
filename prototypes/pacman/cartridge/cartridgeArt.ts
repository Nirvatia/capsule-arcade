// Prototype `cartridge`: the art of the boss world "the cartridge" (the owner's pick of the ideas,
// 2026-11-27: a bad retro port in the manner of the AVGN's worst games). Native pixel art drawn in
// code over the game's own arcade board (`render/arcade`: 10 px a tile, the CRT pass), so the look
// is the secret level's, corrupted. Here: the boss itself (a giant grey cartridge in the lair, its
// label a bad drawing of a face that watches the hero), a 3x5 pixel font, and the rules' effects as
// passes over the finished board: tearing, pits, false walls, a tracking band, the continue screen.
export const CART_W = 52;
export const CART_H = 46;

type Ctx = CanvasRenderingContext2D;
const INK = '#0b0b16';

const rect = (c: Ctx, x: number, y: number, w: number, h: number, col: string) => {
	c.fillStyle = col;
	c.fillRect(x, y, w, h);
};

/** A seeded 0..1 per (a, b): stepped glitches repeat for as long as their tick does. */
export const hash = (a: number, b: number): number => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

// ------------------------------------------------------------------------------- pixel font

const GLYPHS: Record<string, readonly string[]> = {
	' ': ['...', '...', '...', '...', '...'],
	'?': ['###', '..#', '.##', '...', '.#.'],
	'0': ['###', '#.#', '#.#', '#.#', '###'],
	'1': ['.#.', '##.', '.#.', '.#.', '###'],
	'2': ['###', '..#', '###', '#..', '###'],
	'3': ['###', '..#', '###', '..#', '###'],
	'4': ['#.#', '#.#', '###', '..#', '..#'],
	'5': ['###', '#..', '###', '..#', '###'],
	'6': ['###', '#..', '###', '#.#', '###'],
	'7': ['###', '..#', '.#.', '.#.', '.#.'],
	'8': ['###', '#.#', '###', '#.#', '###'],
	'9': ['###', '#.#', '###', '..#', '###'],
	A: ['.#.', '#.#', '###', '#.#', '#.#'],
	C: ['###', '#..', '#..', '#..', '###'],
	E: ['###', '#..', '##.', '#..', '###'],
	G: ['###', '#..', '#.#', '#.#', '###'],
	I: ['###', '.#.', '.#.', '.#.', '###'],
	L: ['#..', '#..', '#..', '#..', '###'],
	N: ['##.', '#.#', '#.#', '#.#', '#.#'],
	O: ['###', '#.#', '#.#', '#.#', '###'],
	T: ['###', '.#.', '.#.', '.#.', '.#.'],
	U: ['#.#', '#.#', '#.#', '#.#', '###']
};

/** Width of a string in pixels at `scale`. */
export const textWidth = (s: string, scale = 1): number => (s.length * 4 - 1) * scale;

/** Draws `s` in the 3x5 font, its top-left at (x, y). */
export function text(c: Ctx, s: string, x: number, y: number, scale: number, col: string): void {
	c.fillStyle = col;
	[...s].forEach((ch, i) => {
		const g = GLYPHS[ch] ?? GLYPHS[' '];
		g.forEach((row, gy) => {
			for (let gx = 0; gx < 3; gx++)
				if (row[gx] === '#') c.fillRect(x + (i * 4 + gx) * scale, y + gy * scale, scale, scale);
		});
	});
}

// ----------------------------------------------------------------------------- the cartridge

export interface CartridgeLook {
	readonly mood: 'calm' | 'angry';
	readonly time: number;
	/** Where the hero is, relative to the cartridge, -1..1: the label's eyes follow. */
	readonly lookX: number;
	readonly lookY: number;
}

const cart = document.createElement('canvas');
cart.width = CART_W;
cart.height = CART_H;
const cc = cart.getContext('2d') as Ctx;

const inset = (y: number) => (y < 3 ? 3 - y : y >= 40 ? 4 : 0);

/** A thick pixel line. */
function line(c: Ctx, x0: number, y0: number, x1: number, y1: number, col: string, w = 2): void {
	const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
	c.fillStyle = col;
	for (let i = 0; i <= n; i++) {
		const x = Math.round(x0 + ((x1 - x0) * i) / n);
		const y = Math.round(y0 + ((y1 - y0) * i) / n);
		c.fillRect(x, y, 1, w);
	}
}

/** Paints the cartridge into its own small canvas and returns it. */
export function drawCartridge(o: CartridgeLook): HTMLCanvasElement {
	const c = cc;
	const angry = o.mood === 'angry';
	const tick = Math.floor(o.time * 30);
	const edge = angry && Math.floor(tick / 4) % 2 === 0 ? '#ff2a3a' : INK;
	c.clearRect(0, 0, CART_W, CART_H);
	// the shell: an outline, the grey plastic, a lit top-left and a dark bottom-right
	for (let y = 0; y < CART_H; y++) rect(c, inset(y), y, CART_W - 2 * inset(y), 1, edge);
	for (let y = 1; y < CART_H - 1; y++) {
		const l = inset(y) + 1;
		const r = CART_W - inset(y) - 1;
		rect(c, l, y, r - l, 1, '#8c8c9c');
		rect(c, l, y, 1, 1, '#c4c4d4');
		rect(c, r - 1, y, 1, 1, '#55556a');
	}
	rect(c, 4, 1, CART_W - 8, 1, '#c4c4d4');
	rect(c, 4, CART_H - 6, CART_W - 8, 1, '#55556a');
	// the grip ridges
	for (const y of [3, 5, 7]) {
		rect(c, 7, y, CART_W - 14, 1, '#55556a');
		rect(c, 7, y + 1, CART_W - 14, 1, '#c4c4d4');
	}
	// the label: a bad sunset behind a bad face
	rect(c, 5, 11, 42, 26, INK);
	['#2a1a6a', '#6a2a8a', '#d84a6a', '#ff9a3a'].forEach((col, i) =>
		rect(c, 6, 12 + i * 4, 40, 4, col)
	);
	for (let dy = 0; dy <= 6; dy++)
		for (let dx = -6; dx <= 6; dx++)
			if (dx * dx + dy * dy <= 36) rect(c, 26 + dx, 28 - dy, 1, 1, '#ffd84a');
	rect(c, 6, 28, 40, 8, '#1a0a2a');
	for (const [px, h] of [
		[12, 5],
		[26, 7],
		[40, 5]
	] as const)
		for (let r = 0; r < h; r++) rect(c, px - r, 28 + r, 2 * r + 1, 1, '#3a2a6a');
	// a gold seal of quality
	rect(c, 40, 29, 7, 7, INK);
	rect(c, 41, 30, 5, 5, '#ffd84a');
	rect(c, 43, 32, 1, 1, '#a86a10');
	// the eyes
	const blink = o.time % 3.4 < 0.12;
	const ox = Math.round(o.lookX * 2);
	const oy = Math.round(o.lookY * 1);
	for (const cx of [16, 36]) {
		const cy = 20;
		const h = blink ? 1 : 3;
		rect(c, cx - 5, cy - h - 1, 11, 2 * h + 3, INK);
		rect(c, cx - 4, cy - h, 9, 2 * h + 1, angry ? '#ffd8c8' : '#f4f4ff');
		if (!blink) {
			rect(c, cx - 1 + ox, cy - 1 + oy + 1, 3, 3, angry ? '#e01818' : '#14145a');
			rect(c, cx - 1 + ox, cy - 1 + oy + 1, 1, 1, '#ffffff');
		}
	}
	// the brows: a thick line each, the end by the nose lower, steeper when angry
	const drop = angry ? 6 : 1;
	line(c, 9, 14, 21, 14 + drop, INK);
	line(c, 43, 14, 31, 14 + drop, INK);
	// the mouth: a dark strip, two rows of pointed teeth
	const open = angry ? 9 : 7;
	rect(c, 13, 27, 26, open + 1, INK);
	rect(c, 14, 28, 24, open - 1, '#7a0a1a');
	for (let i = 0; i < 6; i++) {
		const x = 15 + i * 4;
		rect(c, x, 28, 3, 2, '#f4f0dc');
		rect(c, x + 1, 30, 1, angry ? 2 : 1, '#f4f0dc');
	}
	for (let i = 0; i < 5; i++) {
		const x = 17 + i * 4;
		const top = 28 + open - 1;
		rect(c, x, top - 2, 3, 2, '#f4f0dc');
		rect(c, x + 1, top - 3, 1, 1, '#f4f0dc');
	}
	// the edge connector: dark, with gold pins
	rect(c, 7, 41, 38, 4, '#23232e');
	for (let i = 0; i < 12; i++) {
		rect(c, 9 + i * 3, 42, 2, 3, '#e0b030');
		rect(c, 9 + i * 3, 42, 2, 1, '#fff0a0');
	}
	return cart;
}

// ------------------------------------------------------------------------------------ effects

const tmp = document.createElement('canvas');
const tmpCtx = tmp.getContext('2d') as Ctx;

function snapshot(src: HTMLCanvasElement): HTMLCanvasElement {
	if (tmp.width !== src.width || tmp.height !== src.height) {
		tmp.width = src.width;
		tmp.height = src.height;
	}
	tmpCtx.clearRect(0, 0, tmp.width, tmp.height);
	tmpCtx.drawImage(src, 0, 0);
	return tmp;
}

/** The picture tears: horizontal bands slide, a few invert their colours, blocks are copied from
 *  the wrong place. `strength` 0..1; the pattern holds for a tick (stepped, 10 a second). */
export function tear(c: Ctx, W: number, H: number, time: number, strength: number): void {
	const seed = Math.floor(time * 10);
	const src = snapshot(c.canvas);
	let y = 0;
	let k = 0;
	while (y < H) {
		const h = 3 + Math.floor(hash(seed, k * 3 + 1) * 11);
		const roll = hash(seed, k * 3 + 2);
		if (roll < 0.45 * strength) {
			const dx = Math.round((hash(seed, k * 3 + 3) - 0.5) * 14 * strength);
			c.fillStyle = '#04030c';
			c.fillRect(0, y, W, h);
			c.drawImage(src, 0, y, W, h, dx, y, W, h);
		}
		if (roll > 1 - 0.07 * strength) {
			c.globalCompositeOperation = 'difference';
			c.fillStyle = ['#2ee6d6', '#ff2a3a', '#ffd400'][k % 3];
			c.fillRect(0, y, W, h);
			c.globalCompositeOperation = 'source-over';
		}
		y += h;
		k++;
	}
	for (let b = 0; b < Math.round(5 * strength); b++) {
		const bw = 14 + Math.floor(hash(seed, b + 40) * 22);
		const bh = 6 + Math.floor(hash(seed, b + 50) * 10);
		const sx = Math.floor(hash(seed, b + 60) * (W - bw));
		const sy = Math.floor(hash(seed, b + 70) * (H - bh));
		const dx = Math.floor(hash(seed, b + 80) * (W - bw));
		const dy = Math.floor(hash(seed, b + 90) * (H - bh));
		c.drawImage(src, sx, sy, bw, bh, dx, dy, bw, bh);
	}
}

/** The E.T. pit: a brown rim round a black hole. */
const PIT = [
	'..........',
	'..........',
	'..bbbbbb..',
	'.bbhhhhbb.',
	'.bhkkkkhb.',
	'.bhkkkkhb.',
	'.bbhhhhbb.',
	'..bbbbbb..',
	'..........',
	'..........'
];
const PIT_COL: Record<string, string> = { b: '#a86a2a', h: '#5a3412', k: '#000000' };

export function drawPit(c: Ctx, tx: number, ty: number, T: number, time: number): void {
	const warn = Math.floor(time * 30 / 8) % 2 === 0;
	PIT.forEach((row, y) =>
		[...row].forEach((ch, x) => {
			if (ch === '.') return;
			rect(c, tx * T + x, ty * T + y, 1, 1, ch === 'b' && warn ? '#d8944a' : PIT_COL[ch]);
		})
	);
}

/** A wall that is not one: it flickers, and a question mark gives it away. */
export function drawFakeWall(c: Ctx, tx: number, ty: number, T: number, time: number): void {
	const tick = Math.floor(time * 30);
	const on = Math.floor(tick / 6 + tx * 3 + ty) % 3 !== 0;
	const x = tx * T;
	const y = ty * T;
	c.save();
	c.globalAlpha = on ? 1 : 0.4;
	rect(c, x, y, T, T, '#061a20');
	c.fillStyle = '#2ee6d6';
	c.fillRect(x + 1, y + 1, T - 2, 1);
	c.fillRect(x + 1, y + T - 2, T - 2, 1);
	c.fillRect(x + 1, y + 1, 1, T - 2);
	c.fillRect(x + T - 2, y + 1, 1, T - 2);
	c.restore();
	rect(c, x + 3, y + 3, 4, 6, '#061a20');
	text(c, '?', x + 3, y + 3, 1, on ? '#0f6f73' : '#2ee6d6');
}

/** A tracking band crawls down the picture: its lines slide, with static in it. */
export function trackingBand(c: Ctx, W: number, H: number, time: number): void {
	const src = snapshot(c.canvas);
	const top = Math.floor(((time * 38) % (H + 24)) - 12);
	for (let row = 0; row < 12; row++) {
		const y = top + row;
		if (y < 0 || y >= H) continue;
		const dx = Math.round(Math.sin(row * 0.9 + time * 25) * 5 * (1 - Math.abs(row - 6) / 7));
		c.drawImage(src, 0, y, W, 1, dx, y, W, 1);
	}
	const tick = Math.floor(time * 30);
	for (let i = 0; i < 60; i++) {
		const y = top + Math.floor(hash(tick, i) * 12);
		if (y < 0 || y >= H) continue;
		rect(c, Math.floor(hash(tick, i + 100) * W), y, 2 + Math.floor(hash(tick, i + 200) * 4), 1, i % 4 ? '#f0f0ff' : '#2ee6d6');
	}
	const blink = Math.floor(tick / 8) % 2 === 0;
	if (blink) text(c, 'LAG', 4, 4, 2, '#ff2a3a');
}

/** The continue screen of a bad game: dimmed board, a question, a countdown. */
export function continueScreen(c: Ctx, W: number, H: number, time: number): void {
	c.fillStyle = 'rgba(4, 3, 12, 0.78)';
	c.fillRect(0, 0, W, H);
	const s = 'CONTINUE?';
	text(c, s, Math.round((W - textWidth(s, 2)) / 2), Math.round(H / 2 - 34), 2, '#2ee6d6');
	const n = String(9 - (Math.floor(time) % 10));
	text(c, n, Math.round((W - textWidth(n, 7)) / 2), Math.round(H / 2 - 12), 7, '#ffd400');
}
