// Prototype for stage 4: the winter wall material. The real winter maze and the game's day
// atmosphere; three wall candidates drawn in code on top of the real bake: the current walls
// (control), snowy stone (the recommended one), snow-covered wood (the alternative). Top-down
// only: horizontal walls are slabs along the wall, vertical ones along the vertical, corners and
// ends are square stones. Snow and frost are part of the material, not an overlay. The corridor
// floor is not touched. A zoomed fragment panel sits bottom-right.
import { seasonForLevel } from '../../../src/games/pacman/logic/level/SeasonCatalog';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import { bakeMeadow, LAIR, MEADOW_TILE } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import { winterPellet, snowman } from '../../../src/games/pacman/render/seasons/meadow/seasonFood';
import type { GridLayout } from '../../../src/games/pacman/render/maze/GridView';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';

type Variant = 'control' | 'stone' | 'wood';

const winter = seasonForLevel(3);
const theme = meadowThemeFor(winter.name);
if (!theme) {
	throw new Error('winter theme is missing');
}
const S = winter.grid;
const R = S.length;
const C = S[0].length;
const T = MEADOW_TILE;

const world = new MeadowWorld(S, theme);
world.setQuality('high');
const hero = new PacmanHero();
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);

function hash(x: number, y: number, salt: number): number {
	let n = (x * 374761393 + y * 668265263 + salt * 974634) | 0;
	n = Math.imul(n ^ (n >>> 13), 1274126177);
	return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

const isW = (r: number, c: number) => !!S[r] && S[r][c] === 'WL';

/** Rounded rect path (tile units). */
function rr(
	b: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	[a, c, d, e]: readonly [number, number, number, number]
): void {
	b.beginPath();
	b.moveTo(x + a, y);
	b.lineTo(x + w - c, y);
	b.arcTo(x + w, y, x + w, y + c, c);
	b.lineTo(x + w, y + h - d);
	b.arcTo(x + w, y + h, x + w - d, y + h, d);
	b.lineTo(x + e, y + h);
	b.arcTo(x, y + h, x, y + h - e, e);
	b.lineTo(x, y + a);
	b.arcTo(x, y, x + a, y, a);
}

/** The cap shape of a wall cell by its orientation (tile units). */
function capPath(
	b: CanvasRenderingContext2D,
	r: number,
	c: number,
	orient: 'h' | 'v' | 'sq'
): void {
	const x = c;
	const y = r;
	if (orient === 'h') {
		rr(b, x - 0.05, y + 0.1, 1.1, 0.8, [0.16, 0.16, 0.16, 0.16]);
	} else if (orient === 'v') {
		rr(b, x + 0.1, y - 0.05, 0.8, 1.1, [0.16, 0.16, 0.16, 0.16]);
	} else {
		rr(b, x + 0.07, y + 0.07, 0.86, 0.86, [0.2, 0.2, 0.2, 0.2]);
	}
}

function cellOrient(r: number, c: number): 'h' | 'v' | 'sq' {
	const L = isW(r, c - 1);
	const Rr = isW(r, c + 1);
	const U = isW(r - 1, c);
	const D = isW(r + 1, c);
	if ((L || Rr) && !(U || D)) return 'h';
	if ((U || D) && !(L || Rr)) return 'v';
	return 'sq';
}

const PAL = {
	stone: {
		bed: '#4e5c6e',
		shadow: 'rgba(30,42,66,.4)',
		light: 'rgba(255,255,255,.38)',
		dark: 'rgba(22,32,52,.32)',
		joint: 'rgba(48,62,84,.42)',
		snow: ['#f6fafd', '#e6f0f9'],
		ice: ['#d7e7f4', '#b9d2e6'],
		speck: ['rgba(255,255,255,.5)', 'rgba(70,90,118,.35)']
	},
	wood: {
		bed: '#3f3226',
		shadow: 'rgba(35,26,18,.42)',
		light: 'rgba(255,244,230,.22)',
		dark: 'rgba(28,18,10,.36)',
		joint: 'rgba(46,32,20,.55)',
		snow: ['#eef5fb', '#dce9f4'],
		ice: ['#cdd9e4', '#aebfcf'],
		speck: ['rgba(255,250,240,.4)', 'rgba(40,26,14,.4)']
	}
} as const;

/**
 * Repaints the walls with the candidate material. `b` is in tile units (one maze tile = 1).
 * First the old walls and their shadow spill are erased (wall cells get the material bed,
 * corridor cells touching a wall get their floor back), then the material caps are drawn.
 */
export function paintWallMaterial(b: CanvasRenderingContext2D, variant: Variant): void {
	if (variant === 'control') {
		return;
	}
	const P = theme.bake;
	const W = PAL[variant];
	// erase: wall cells -> bed, corridor cells touching a wall -> floor
	for (let r = 1; r < R - 1; r++) {
		for (let c = 1; c < C - 1; c++) {
			const x = c;
			const y = r;
			if (isW(r, c)) {
				b.fillStyle = W.bed;
				b.fillRect(x - 0.06, y - 0.06, 1.12, 1.12);
				continue;
			}
			const near =
				isW(r, c - 1) || isW(r, c + 1) || isW(r - 1, c) || isW(r + 1, c) ||
				isW(r - 1, c - 1) || isW(r - 1, c + 1) || isW(r + 1, c - 1) || isW(r + 1, c + 1);
			if (!near) {
				continue;
			}
			const t = S[r][c];
			const k = hash(r, c, 5);
			if (LAIR.has(t)) {
				b.fillStyle = P.lair.base;
				b.fillRect(x - 0.1, y - 0.1, 1.2, 1.2);
				b.fillStyle = P.lair.tiles[(k * 3) | 0];
				b.fillRect(x + 0.06, y + 0.06, 0.88, 0.88);
			} else {
				b.fillStyle = P.floor.tiles[(k * 3) | 0];
				b.fillRect(x - 0.1, y - 0.1, 1.2, 1.2);
				for (let i = 0; i < 3; i++) {
					b.fillStyle = P.floor.specks[(hash(r, c, i + 21) * 3) | 0];
					b.beginPath();
					b.ellipse(
						x + 0.15 + hash(r, c, i + 31) * 0.7,
						y + 0.15 + hash(r, c, i + 41) * 0.7,
						0.05 + hash(r, c, i + 51) * 0.05,
						0.04 + hash(r, c, i + 61) * 0.04,
						hash(r, c, i + 71) * 3,
						0,
						7
					);
					b.fill();
				}
			}
		}
	}
	// shadow pass: all caps at once
	b.save();
	b.shadowColor = W.shadow;
	b.shadowBlur = 0.4;
	b.shadowOffsetX = 0.06;
	b.shadowOffsetY = 0.1;
	b.fillStyle = W.bed;
	for (let r = 1; r < R - 1; r++) {
		for (let c = 1; c < C - 1; c++) {
			if (!isW(r, c)) continue;
			capPath(b, r, c, cellOrient(r, c));
			b.fill();
		}
	}
	b.restore();
	// material caps
	for (let r = 1; r < R - 1; r++) {
		for (let c = 1; c < C - 1; c++) {
			if (!isW(r, c)) continue;
			const o = cellOrient(r, c);
			const x = c;
			const y = r;
			const k = (salt: number) => hash(r, c, salt);
			const g =
				o === 'h'
					? b.createLinearGradient(0, y + 0.1, 0, y + 0.9)
					: b.createLinearGradient(x + 0.1, 0, x + 0.9, 0);
			if (variant === 'stone') {
				g.addColorStop(0, '#aebdcf');
				g.addColorStop(1, '#7e8fa4');
			} else {
				g.addColorStop(0, '#8a6a48');
				g.addColorStop(1, '#5c422c');
			}
			capPath(b, r, c, o);
			b.fillStyle = g;
			b.fill();
			b.save();
			capPath(b, r, c, o);
			b.clip();

			if (variant === 'stone') {
				// joints across the slab
				b.strokeStyle = W.joint;
				b.lineWidth = 0.045;
				const n = 1 + ((k(1) * 2) | 0);
				for (let i = 0; i < n; i++) {
					const j = 0.25 + k(2 + i) * 0.5;
					b.beginPath();
					if (o === 'h') {
						b.moveTo(x + j, y + 0.14);
						b.lineTo(x + j, y + 0.86);
					} else if (o === 'v') {
						b.moveTo(x + 0.14, y + j);
						b.lineTo(x + 0.86, y + j);
					} else {
						// corner stone: a diagonal seam from the outer corner
						const L = isW(r, c - 1);
						const Rr = isW(r, c + 1);
						const U = isW(r - 1, c);
						const dx = Rr ? 1 : L ? -1 : k(3) > 0.5 ? 1 : -1;
						const dy = isW(r + 1, c) ? 1 : U ? -1 : k(4) > 0.5 ? 1 : -1;
						b.moveTo(x + 0.5 - dx * 0.45, y + 0.5 - dy * 0.45);
						b.lineTo(x + 0.5 + dx * 0.45, y + 0.5 + dy * 0.45);
					}
					b.stroke();
				}
				// frost specks
				for (let i = 0; i < 5; i++) {
					b.fillStyle = W.speck[k(10 + i) < 0.5 ? 0 : 1];
					b.beginPath();
					b.ellipse(
						x + 0.15 + k(20 + i) * 0.7,
						y + 0.15 + k(30 + i) * 0.7,
						0.03 + k(40 + i) * 0.035,
						0.025 + k(50 + i) * 0.03,
						k(60 + i) * 3,
						0,
						7
					);
					b.fill();
				}
				// snow drift along the axis — part of the material
				const drift = k(70) < 0.3;
				for (let i = 0; i < (drift ? 3 : 2); i++) {
					const t = 0.2 + k(80 + i) * 0.6;
					const wob = (k(90 + i) - 0.5) * 0.16;
					b.fillStyle = W.snow[i % 2];
					b.beginPath();
					if (o === 'h') {
						b.ellipse(x + t, y + 0.5 + wob, 0.24 + k(100 + i) * 0.12, 0.11 + k(110 + i) * 0.05, 0, 0, 7);
					} else if (o === 'v') {
						b.ellipse(x + 0.5 + wob, y + t, 0.11 + k(100 + i) * 0.05, 0.24 + k(110 + i) * 0.12, 0, 0, 7);
					} else {
						b.ellipse(x + 0.5 + wob, y + 0.5 - wob, 0.2 + k(100 + i) * 0.1, 0.16 + k(110 + i) * 0.08, 0, 0, 7);
					}
					b.fill();
				}
			} else {
				// wood: two planks along the axis, end joint, grain, snow patches
				const horiz = o !== 'v';
				b.strokeStyle = W.joint;
				b.lineWidth = 0.04;
				b.beginPath();
				if (o === 'h') {
					b.moveTo(x - 0.05, y + 0.5);
					b.lineTo(x + 1.05, y + 0.5);
				} else if (o === 'v') {
					b.moveTo(x + 0.5, y - 0.05);
					b.lineTo(x + 0.5, y + 1.05);
				}
				b.stroke();
				const j = 0.3 + k(2) * 0.4;
				b.beginPath();
				if (o === 'h') {
					b.moveTo(x + j, y + 0.12);
					b.lineTo(x + j, y + 0.88);
				} else if (o === 'v') {
					b.moveTo(x + 0.12, y + j);
					b.lineTo(x + 0.88, y + j);
				}
				b.stroke();
				// grain
				b.strokeStyle = 'rgba(58,40,24,.4)';
				b.lineWidth = 0.03;
				for (let i = 0; i < 3; i++) {
					const off = 0.2 + k(12 + i) * 0.6;
					const sag = (k(22 + i) - 0.5) * 0.12;
					b.beginPath();
					if (horiz) {
						b.moveTo(x, y + off);
						b.quadraticCurveTo(x + 0.5, y + off + sag, x + 1, y + off);
					} else {
						b.moveTo(x + off, y);
						b.quadraticCurveTo(x + off + sag, y + 0.5, x + off, y + 1);
					}
					b.stroke();
				}
				if (k(32) < 0.25) {
					b.fillStyle = 'rgba(50,34,20,.5)';
					b.beginPath();
					b.ellipse(x + 0.25 + k(33) * 0.5, y + 0.25 + k(34) * 0.5, 0.05, 0.035, 0, 0, 7);
					b.fill();
				}
				// snow lying on the planks and in the seams
				for (let i = 0; i < 3; i++) {
					const t = 0.18 + k(80 + i) * 0.64;
					b.fillStyle = W.snow[i % 2];
					b.beginPath();
					if (o === 'h') {
						b.ellipse(x + t, y + 0.24 + k(90 + i) * 0.52, 0.2 + k(100 + i) * 0.1, 0.1 + k(110 + i) * 0.05, 0, 0, 7);
					} else if (o === 'v') {
						b.ellipse(x + 0.24 + k(90 + i) * 0.52, y + t, 0.1 + k(100 + i) * 0.05, 0.2 + k(110 + i) * 0.1, 0, 0, 7);
					} else {
						b.ellipse(x + 0.3 + k(90 + i) * 0.4, y + 0.3 + k(91 + i) * 0.4, 0.18, 0.14, 0, 0, 7);
					}
					b.fill();
				}
			}
			b.restore();
			// light top-left / dark bottom-right rim
			b.strokeStyle = W.light;
			b.lineWidth = 0.05;
			b.save();
			b.translate(-0.035, -0.035);
			capPath(b, r, c, o);
			b.stroke();
			b.restore();
			b.strokeStyle = W.dark;
			b.save();
			b.translate(0.035, 0.035);
			capPath(b, r, c, o);
			b.stroke();
			b.restore();
		}
	}
}

// ---- fragment (zoomed) panel ----
const FR = 3; // device px per world unit in the fragment bake
const fc0 = 1;
const fr0 = 2;
const fw = 14; // tiles
const fh = 10;
let frag: HTMLCanvasElement = bakeMeadow(S, theme.bake, fc0 * T, fr0 * T, fw * T, fh * T, FR);

function bakeFragment(v: Variant): void {
	frag = bakeMeadow(S, theme.bake, fc0 * T, fr0 * T, fw * T, fh * T, FR);
	if (v === 'control') {
		return;
	}
	const fb = frag.getContext('2d') as CanvasRenderingContext2D;
	fb.save();
	// the bake's context is already scale(FR)·translate(-x0,-y0): tile units need only ×T
	fb.scale(T, T);
	paintWallMaterial(fb, v);
	fb.restore();
}

let variant: Variant =
	(new URLSearchParams(location.search).get('v') as Variant | null) ?? 'control';
bakeFragment(variant);

function setVariant(next: Variant): void {
	variant = next;
	bakeFragment(next);
	for (const btn of document.querySelectorAll<HTMLButtonElement>('#bar button')) {
		btn.setAttribute('aria-pressed', String(btn.dataset.v === next));
	}
}
for (const btn of document.querySelectorAll<HTMLButtonElement>('#bar button')) {
	btn.addEventListener('click', () => setVariant(btn.dataset.v as Variant));
}

function layout(): void {
	const w = view.clientWidth;
	const h = view.clientHeight;
	view.width = Math.max(1, Math.round(w * D));
	view.height = Math.max(1, Math.round(h * D));
	world.resize(w, h, D);
}
window.addEventListener('resize', layout);
layout();

/** The hero walks the clear top corridor so the scale can be judged. */
function walker(time: number): { x: number; dir: 1 | -1 } {
	const span = 18;
	const u = (time * 4.2) % (2 * span);
	return u < span ? { x: 3.5 + u, dir: 1 } : { x: 3.5 + 2 * span - u, dir: -1 };
}

function drawFragment(layoutNow: GridLayout): void {
	const vw = view.clientWidth;
	const vh = view.clientHeight;
	const zoom = Math.min((vw * 0.46) / (fw * T), (vh * 0.6) / (fh * T));
	const pw = fw * T * zoom;
	const ph = fh * T * zoom;
	const px = vw - pw - 18;
	const py = vh - ph - 42;
	ctx.save();
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.clearRect(px - 4, py - 4, pw + 8, ph + 8);
	ctx.drawImage(frag, 0, 0, fw * T * FR, fh * T * FR, px, py, pw, ph);
	ctx.strokeStyle = 'rgba(255,255,255,.85)';
	ctx.lineWidth = 2;
	ctx.strokeRect(px - 1.5, py - 1.5, pw + 3, ph + 3);
	// food so the readability can be judged at zoom
	ctx.translate(px, py);
	ctx.scale((T * pw) / (fw * T), (T * ph) / (fh * T));
	ctx.translate(-fc0, -fr0);
	const pel = winterPellet();
	const en = snowman();
	for (let r = fr0; r < fr0 + fh; r++) {
		for (let c = fc0; c < fc0 + fw; c++) {
			const t = S[r]?.[c];
			const cx = c + 0.5;
			const cy = r + 0.5;
			if (t === 'DT') {
				ctx.fillStyle = '#e8f4ff';
				ctx.beginPath();
				ctx.arc(cx, cy, 0.085, 0, 7);
				ctx.fill();
			} else if (t === 'EU') {
				ctx.drawImage(en, cx - 0.45, cy - 0.45, 0.9, 0.9);
			} else if (t === 'PM') {
				ctx.drawImage(pel, cx - 0.28, cy - 0.28, 0.56, 0.56);
			}
		}
	}
	ctx.restore();
	const cap = document.getElementById('cap') as HTMLDivElement;
	cap.style.right = `${vw - px - pw + 18}px`;
	cap.style.bottom = `${vh - py - ph + 18}px`;
	void layoutNow;
}

let last = performance.now();
function frame(nowMs: number): void {
	const dt = Math.min(0.1, Math.max(0, (nowMs - last) / 1000));
	last = nowMs;
	const time = nowMs / 1000;
	const w = view.clientWidth;
	const h = view.clientHeight;
	world.update(dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	ctx.clearRect(0, 0, w, h);

	world.drawWorld(ctx);
	const layoutNow = world.layout;
	if (variant !== 'control') {
		ctx.save();
		ctx.translate(layoutNow.offsetX, layoutNow.offsetY);
		ctx.scale(layoutNow.tileSize, layoutNow.tileSize);
		paintWallMaterial(ctx, variant);
		ctx.restore();
	}
	world.drawFood(ctx, () => false);

	const walk = walker(time);
	const Sz = layoutNow.tileSize;
	hero.setRadius(Sz * 0.39);
	hero.update(dt, {
		x: layoutNow.offsetX + walk.x * Sz,
		y: layoutNow.offsetY + 2.5 * Sz,
		angle: walk.dir > 0 ? 0 : Math.PI,
		moving: true,
		power: false,
		ending: false,
		season: 'winter'
	});
	hero.draw(ctx);
	world.drawOverlay(ctx);
	drawFragment(layoutNow);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
