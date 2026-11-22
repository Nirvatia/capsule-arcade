// Prototype: the station boss level's look (DESIGN.md §7a) on the real `grid_station`. The baked
// deck (`stationScene`), the actors (`stationActors`), the real Pac-Man, and the dark: a light map
// multiplied over the scene (the phase's ambient, the lamps, the flashlight's cone cast against
// the walls, the hero's halo, a lit flare), then what glows by itself over it. Three phases, a
// full scene, a magnified one, and a gallery of the actors large.
import { GRID_STATION } from '../../../src/games/pacman/config/mazes/grid_station';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { makeCanvas, context, tint } from '../../../src/games/pacman/render/doom/fleshNoise';
import type { Phase } from './stationScene';
import { bakeStation, FRAME, MX, MY, T } from './stationScene';
import { bakeStationB, VIEWPORT } from './stationSceneB';
import type { GhostId } from './stationActors';
import * as ActA from './stationActors';
import * as ActB from './stationActorsB';

const GHOSTS = ActA.GHOSTS;

const grid = GRID_STATION;
const GW = 25;
const GH = 27;
const solid = (x: number, y: number): boolean => {
	const t = grid[y]?.[x];
	return t === undefined || t === 'WL' || t === 'ES';
};

const params = new URLSearchParams(location.search);
let phase = (Number(params.get('phase')) || 1) as Phase;
let mode = (params.get('mode') ?? 'scene') as 'scene' | 'zoom' | 'gallery';
const frozen = params.has('t') ? Number(params.get('t')) : null;
/** A: the first look; B: the brutal alternative. */
let style: 'a' | 'b' = params.get('style') === 'a' ? 'a' : 'b';
const actors = () => (style === 'b' ? ActB : ActA);
const bakeFor = (ph: Phase) => (style === 'b' ? bakeStationB(grid, ph) : bakeStation(grid, ph));

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = context(view);
const D = Math.min(window.devicePixelRatio || 1, 2);
let vw = 0;
let vh = 0;

// ---------------------------------------------------------------------------------------------
// The scenario of each phase (tile coordinates, centres)

interface Pt {
	x: number;
	y: number;
}
const HERO_LOOP: Pt[] = [
	{ x: 8.5, y: 8.5 },
	{ x: 16.5, y: 8.5 },
	{ x: 16.5, y: 10.5 },
	{ x: 8.5, y: 10.5 }
];
const HERO_SPEED = 2.4;

function onLoop(loop: readonly Pt[], s: number): { p: Pt; a: number } {
	const lens = loop.map((p, i) => {
		const q = loop[(i + 1) % loop.length];
		return Math.hypot(q.x - p.x, q.y - p.y);
	});
	const total = lens.reduce((a, b) => a + b, 0);
	let d = ((s % total) + total) % total;
	for (let i = 0; i < loop.length; i += 1) {
		if (d <= lens[i]) {
			const p = loop[i];
			const q = loop[(i + 1) % loop.length];
			const u = d / lens[i];
			return { p: { x: p.x + (q.x - p.x) * u, y: p.y + (q.y - p.y) * u }, a: Math.atan2(q.y - p.y, q.x - p.x) };
		}
		d -= lens[i];
	}
	return { p: loop[0], a: 0 };
}

/** Back and forth between two points. */
function patrol(a: Pt, b: Pt, speed: number, t: number, off = 0): { p: Pt; a: number } {
	const l = Math.hypot(b.x - a.x, b.y - a.y);
	const u = ((t * speed) / l + off) % 2;
	const f = u < 1;
	const k = f ? u : 2 - u;
	const ang = Math.atan2(b.y - a.y, b.x - a.x) + (f ? 0 : Math.PI);
	return { p: { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }, a: ang };
}

interface Cast {
	ghosts: Array<{ id: GhostId; p: Pt; a: number }>;
	hunters: Array<{ id: GhostId; p: Pt; a: number; bite?: number }>;
	cocoons: Array<{ id: GhostId; p: Pt }>;
	flares: Pt[];
	litFlare: Pt | null;
	hatch: Pt | null;
	pod: Pt | null;
	eaten: number;
}

const FLARES: Pt[] = [];
for (let y = 0; y < GH; y += 1)
	for (let x = 0; x < GW; x += 1) if (grid[y]?.[x] === 'EU') FLARES.push({ x: x + 0.5, y: y + 0.5 });

function cast(ph: Phase, t: number, hero: { p: Pt; a: number }): Cast {
	// the hunter that meets the hero: always ahead of him, in his cone, coming at him
	const ahead = (d: number): { p: Pt; a: number } => {
		let { x, y } = hero.p;
		const dx = Math.round(Math.cos(hero.a));
		const dy = Math.round(Math.sin(hero.a));
		let k = 0;
		while (k < d * 10 && !solid(Math.floor(x + dx * 0.55), Math.floor(y + dy * 0.55))) {
			x += dx * 0.1;
			y += dy * 0.1;
			k += 1;
		}
		return { p: { x, y }, a: hero.a + Math.PI };
	};
	if (ph === 1) {
		return {
			ghosts: [
				{ id: 'blinky', ...patrol({ x: 5.5, y: 4.5 }, { x: 9.5, y: 4.5 }, 1.6, t) },
				{ id: 'pinky', ...patrol({ x: 2.5, y: 16.5 }, { x: 6.5, y: 16.5 }, 1.4, t, 0.5) },
				{ id: 'inky', ...patrol({ x: 20.5, y: 18.5 }, { x: 20.5, y: 21.5 }, 1.2, t, 0.2) }
			],
			hunters: [],
			cocoons: [{ id: 'clyde', p: { x: 8.5, y: 13.5 } }],
			flares: FLARES,
			litFlare: null,
			hatch: null,
			pod: null,
			eaten: 0.22
		};
	}
	if (ph === 2) {
		const met = ahead(3.6);
		return {
			ghosts: [{ id: 'clyde', ...patrol({ x: 3.5, y: 24.5 }, { x: 9.5, y: 24.5 }, 1.5, t) }],
			hunters: [
				{ id: 'blinky', ...met },
				{ id: 'pinky', ...patrol({ x: 11.5, y: 4.5 }, { x: 13.5, y: 4.5 }, 0.6, t) }
			],
			cocoons: [{ id: 'inky', p: { x: 16.5, y: 13.5 } }],
			flares: FLARES.slice(1),
			litFlare: null,
			hatch: null,
			pod: null,
			eaten: 0.55
		};
	}
	const met = ahead(4.2);
	return {
		ghosts: [],
		hunters: [
			{ id: 'blinky', ...met, bite: 0.6 },
			{ id: 'pinky', ...patrol({ x: 18.5, y: 16.5 }, { x: 22.5, y: 16.5 }, 1.1, t) },
			{ id: 'inky', ...patrol({ x: 2.5, y: 18.5 }, { x: 2.5, y: 22.5 }, 1.3, t, 0.4) },
			{ id: 'clyde', ...patrol({ x: 6.5, y: 2.5 }, { x: 10.5, y: 2.5 }, 1.2, t, 0.7) }
		],
		cocoons: [],
		flares: FLARES.slice(2),
		litFlare: { x: 10.5, y: 10.5 },
		hatch: { x: 12.5, y: 24.5 },
		pod: { x: 12.5, y: 2.5 },
		eaten: 0.92
	};
}

// the dots, eaten from the hero's start outwards (a played board, not random holes)
const DOTS: Array<Pt & { order: number; seed: number }> = (() => {
	const out: Array<Pt & { order: number; seed: number }> = [];
	let sx = 12;
	let sy = 20;
	for (let y = 0; y < GH; y += 1) for (let x = 0; x < GW; x += 1) if (grid[y]?.[x] === 'PM') [sx, sy] = [x, y];
	const seen = new Map<number, number>([[sy * GW + sx, 0]]);
	const q: Array<[number, number]> = [[sx, sy]];
	let n = 0;
	while (q.length) {
		const [x, y] = q.shift() as [number, number];
		if (grid[y]?.[x] === 'DT') out.push({ x: x + 0.5, y: y + 0.5, order: n++, seed: ((x * 31 + y * 17) % 13) / 13 });
		for (const [dx, dy] of [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		]) {
			const nx = x + dx;
			const ny = y + dy;
			const tk = grid[ny]?.[nx];
			if (!tk || tk === 'WL' || tk === 'ES' || seen.has(ny * GW + nx)) continue;
			seen.set(ny * GW + nx, 1);
			q.push([nx, ny]);
		}
	}
	return out;
})();

// ---------------------------------------------------------------------------------------------
// Light

interface View {
	x: number;
	y: number;
	w: number;
	h: number;
	/** Tile size, css px, and the screen position of tile (0, 0). */
	S: number;
	ox: number;
	oy: number;
}

const AMBIENT: Readonly<Record<'a' | 'b', Readonly<Record<Phase, string>>>> = {
	a: { 1: 'rgb(40,48,60)', 2: 'rgb(26,24,34)', 3: 'rgb(19,17,27)' },
	b: { 1: 'rgb(38,44,41)', 2: 'rgb(28,18,18)', 3: 'rgb(15,12,13)' }
};

/** Lightning in the storm below the deck's window: rare double flashes. */
function lightning(t: number): number {
	const k = t % 7.3;
	return k < 0.08 ? 1 : k > 0.16 && k < 0.22 ? 0.6 : 0;
}

/** The flashlight's lit area: rays from the hero across the cone, stopped by the walls. */
function conePolygon(hx: number, hy: number, a: number, half: number, reach: number): Pt[] {
	const pts: Pt[] = [{ x: hx, y: hy }];
	const n = 90;
	for (let i = 0; i <= n; i += 1) {
		const ang = a - half + (i / n) * half * 2;
		const dx = Math.cos(ang);
		const dy = Math.sin(ang);
		let d = 0;
		let hit = -1;
		while (d < reach) {
			const x = hx + dx * d;
			const y = hy + dy * d;
			if (solid(Math.floor(x), Math.floor(y))) {
				hit = d;
				break;
			}
			d += 0.04;
		}
		// let the light bite a little into the wall it hits, so the face it meets is lit
		const end = hit < 0 ? reach : Math.min(reach, hit + 0.12);
		pts.push({ x: hx + dx * end, y: hy + dy * end });
	}
	return pts;
}

let lm: HTMLCanvasElement | null = null;
let lmSoft: HTMLCanvasElement | null = null;
let lmBloom: HTMLCanvasElement | null = null;
const LM_SCALE = 0.25;

/** The light map softened in its own small size (a blur over the full screen costs too much). */
function softened(src: HTMLCanvasElement, into: HTMLCanvasElement | null, px: number): HTMLCanvasElement {
	const out = into && into.width === src.width && into.height === src.height ? into : makeCanvas(src.width, src.height);
	const c = context(out);
	c.setTransform(1, 0, 0, 1, 0, 0);
	c.globalCompositeOperation = 'copy';
	c.filter = `blur(${px}px)`;
	c.drawImage(src, 0, 0);
	c.filter = 'none';
	return out;
}

function flicker(seed: number, t: number): number {
	// mostly on, now and then a stutter
	const k = Math.sin(t * 13 + seed * 50) * Math.sin(t * 7.3 + seed * 20) * Math.sin(t * 2.1 + seed * 9);
	return k > 0.55 ? 0.15 : 1;
}

function addLight(c: CanvasRenderingContext2D, x: number, y: number, r: number, rgb: string, a: number): void {
	if (a <= 0) return;
	const g = c.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},${a})`);
	g.addColorStop(0.45, `rgba(${rgb},${a * 0.45})`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	c.fillStyle = g;
	c.fillRect(x - r, y - r, r * 2, r * 2);
}

function lightMap(v: View, ph: Phase, t: number, hero: { p: Pt; a: number }, sc: Cast): HTMLCanvasElement {
	const w = Math.max(1, Math.ceil(v.w * D * LM_SCALE));
	const h = Math.max(1, Math.ceil(v.h * D * LM_SCALE));
	if (!lm || lm.width !== w || lm.height !== h) lm = makeCanvas(w, h);
	const c = context(lm);
	c.setTransform(1, 0, 0, 1, 0, 0);
	c.globalCompositeOperation = 'source-over';
	c.fillStyle = AMBIENT[style][ph];
	c.fillRect(0, 0, w, h);
	const f = D * LM_SCALE;
	c.setTransform(f, 0, 0, f, -v.x * f, -v.y * f);
	c.globalCompositeOperation = 'lighter';
	const sx = (x: number) => v.ox + x * v.S;
	const sy = (y: number) => v.oy + y * v.S;
	const S = v.S;
	const bake = bakeFor(ph);
	const B = style === 'b';
	// the lamps
	for (const l of bake.lamps) {
		const x = sx(l.x);
		const y = sy(l.y);
		if (l.kind === 'ceiling' && ph === 1) {
			if (B && l.seed < 0.45) continue; // most of them are dead
			addLight(c, x, y, S * 3.1, B ? '200,215,190' : '170,205,225', (B ? 0.75 : 0.9) * flicker(l.seed, B ? t * 1.7 : t));
		} else if (l.kind === 'emergency' && ph >= 2) {
			const strobe = ph === 3 ? ((t + l.seed) % 1.3 < 0.18 ? 1 : 0.08) : 0.55 + 0.25 * Math.sin(t * 3 + l.seed * 6);
			addLight(c, x, y, S * 2.4, '255,40,28', 0.6 * strobe);
			if (ph === 2) {
				// the rotating beacon's beam
				const a = t * 2.6 + l.seed * 6;
				const g = c.createRadialGradient(x, y, 0, x, y, S * 3.4);
				g.addColorStop(0, 'rgba(255,50,30,.5)');
				g.addColorStop(1, 'rgba(255,50,30,0)');
				c.fillStyle = g;
				c.beginPath();
				c.moveTo(x, y);
				c.arc(x, y, S * 3.4, a - 0.3, a + 0.3);
				c.closePath();
				c.fill();
			}
		} else if (l.kind === 'wall') {
			const on = ph === 1 ? 1 : ph === 2 ? 0.45 * flicker(l.seed + 3, t) : l.seed < 0.3 ? 0.3 * flicker(l.seed, t * 2) : 0;
			addLight(c, x, y, S * 4.2, '255,190,120', 0.6 * on * (B && l.seed >= 0.5 ? 0.15 : 1));
		}
	}
	// the storm below the window
	if (B) {
		const f = lightning(t);
		if (f > 0) addLight(c, sx((VIEWPORT.x - MX) / T), sy((VIEWPORT.y - MY) / T), S * 11, '220,200,255', 0.9 * f);
		addLight(c, sx((VIEWPORT.x - MX) / T), sy((VIEWPORT.y - MY) / T), S * 7.5, '200,120,60', ph === 3 ? 0.3 : 0.45);
		// the surround's story keeps a little light of its own: the tanks, the breach, the dead
		const dim = ph === 1 ? 1 : ph === 2 ? 0.7 : 0.45;
		for (const [x, y] of [
			[-9.3, 2.9],
			[-13.3, 5.1]
		])
			addLight(c, sx(x), sy(y), S * 4.2, '90,200,110', 0.42 * dim * (0.85 + 0.15 * Math.sin(t * 1.3 + x)));
		addLight(c, sx(-9.3), sy(23.2), S * 4.5, '150,175,80', 0.32 * dim);
		addLight(c, sx(31.6), sy(25.6), S * 3.6, '255,205,150', 0.55 * dim * flicker(0.21, t * 2.6));
		addLight(c, sx(-6), sy(16.4), S * 3.2, '255,60,40', 0.4 * dim * (0.6 + 0.4 * Math.sin(t * 2.2)));
	}
	// the nest's sickly breath
	if (ph >= 2) addLight(c, sx(12.5), sy(13), S * (ph === 3 ? 4.5 : 3), '120,190,60', ph === 3 ? 0.35 : 0.22);
	// cocoons glow a little
	for (const k of sc.cocoons) addLight(c, sx(k.p.x), sy(k.p.y), S * 1.2, '200,220,160', 0.25);
	// a lit flare
	if (sc.litFlare) {
		const fl = 0.85 + 0.15 * Math.sin(t * 31) * Math.sin(t * 17);
		addLight(c, sx(sc.litFlare.x), sy(sc.litFlare.y), S * 3.4 * fl, '255,96,110', 0.95);
		addLight(c, sx(sc.litFlare.x), sy(sc.litFlare.y), S * 1.2, '255,220,225', 0.6);
	}
	// the hero: a halo, and the flashlight's cone cast against the walls
	const hx = sx(hero.p.x);
	const hy = sy(hero.p.y);
	addLight(c, hx, hy, S * (B ? 1.3 : 1.7), B ? '230,236,240' : '255,226,190', B ? 0.5 : 0.65);
	const cone = conePolygon(hero.p.x, hero.p.y, hero.a, 0.46, 6.5);
	for (const [half, a] of [
		[1, 1],
		[0.75, 0.35]
	] as const) {
		const poly = half === 1 ? cone : conePolygon(hero.p.x, hero.p.y, hero.a, 0.46 * half, 6.5);
		const g = c.createRadialGradient(hx, hy, S * 0.2, hx, hy, S * 6.5);
		const lc = B ? '238,244,255' : '255,240,215';
		g.addColorStop(0, `rgba(${lc},${a})`);
		g.addColorStop(B ? 0.5 : 0.35, `rgba(${lc},${a * 0.85})`);
		g.addColorStop(1, `rgba(${lc},0)`);
		c.fillStyle = g;
		c.beginPath();
		poly.forEach((p, i) => (i ? c.lineTo(sx(p.x), sy(p.y)) : c.moveTo(sx(p.x), sy(p.y))));
		c.closePath();
		c.fill();
	}
	lmSoft = softened(lm, lmSoft, B ? 0.8 : 1.6);
	lmBloom = softened(lm, lmBloom, 6);
	return lm;
}

// ---------------------------------------------------------------------------------------------
// Drawing a view

const hero = new PacmanHero();
const tintCache = new Map<string, HTMLCanvasElement>();

/** The vignette (and in style B a cold grade and faint scanlines) as one multiply layer. */
const postCache = new Map<string, HTMLCanvasElement>();
function postLayer(v: View, B: boolean): HTMLCanvasElement {
	const k = `${v.w}x${v.h}|${B}|${D}`;
	const hit = postCache.get(k);
	if (hit) return hit;
	const out = makeCanvas(v.w * D, v.h * D);
	const c = context(out);
	c.scale(D, D);
	c.fillStyle = B ? 'rgb(214,228,218)' : '#fff';
	c.fillRect(0, 0, v.w, v.h);
	const vg = c.createRadialGradient(v.w / 2, v.h / 2, Math.min(v.w, v.h) * 0.35, v.w / 2, v.h / 2, Math.max(v.w, v.h) * 0.75);
	vg.addColorStop(0, 'rgba(0,0,0,0)');
	vg.addColorStop(1, B ? 'rgba(0,0,0,.88)' : 'rgba(0,0,0,.65)');
	c.fillStyle = vg;
	c.fillRect(0, 0, v.w, v.h);
	if (B) {
		c.fillStyle = 'rgba(0,0,0,.12)';
		for (let y = 0; y < v.h; y += 3) c.fillRect(0, y, v.w, 1);
	}
	postCache.set(k, out);
	return out;
}

/** A baked layer already scaled to this view (the scene view holds still: scale it once). */
const viewCache = new Map<string, HTMLCanvasElement>();
function atViewScale(key: string, src: HTMLCanvasElement, v: View, bx: number, by: number, w: number, h: number): HTMLCanvasElement {
	const k = `${key}|${v.w}x${v.h}|${bx.toFixed(1)},${by.toFixed(1)}|${w.toFixed(1)}|${D}`;
	const hit = viewCache.get(k);
	if (hit) return hit;
	if (viewCache.size > 24) viewCache.clear();
	const out = makeCanvas(v.w * D, v.h * D);
	const c = context(out);
	c.imageSmoothingQuality = 'high';
	c.setTransform(D, 0, 0, D, -v.x * D, -v.y * D);
	c.drawImage(src, bx, by, w, h);
	viewCache.set(k, out);
	return out;
}
let grainTex: HTMLCanvasElement | null = null;

function grain(): HTMLCanvasElement {
	if (grainTex) return grainTex;
	const g = makeCanvas(256, 256);
	const c = context(g);
	const im = c.createImageData(256, 256);
	for (let i = 0; i < im.data.length; i += 4) {
		const v = Math.random() * 255;
		im.data[i] = v;
		im.data[i + 1] = v;
		im.data[i + 2] = v;
		im.data[i + 3] = 34;
	}
	c.putImageData(im, 0, 0);
	grainTex = g;
	return g;
}

function inCone(hero: { p: Pt; a: number }, p: Pt): number {
	const dx = p.x - hero.p.x;
	const dy = p.y - hero.p.y;
	const d = Math.hypot(dx, dy);
	if (d < 1.5) return 1;
	if (d > 6.5) return 0;
	let da = Math.atan2(dy, dx) - hero.a;
	while (da > Math.PI) da -= Math.PI * 2;
	while (da < -Math.PI) da += Math.PI * 2;
	return Math.abs(da) < 0.46 ? 1 - d / 7 : 0;
}

function drawView(v: View, ph: Phase, t: number, dt: number): void {
	const bake = bakeFor(ph);
	const B = style === 'b';
	const { drawCell, drawCocoon, drawFlare, drawGhost, drawHatch, drawHunter, drawHunterGlints, drawMedPod, drawTracker } = actors();
	const heroAt = onLoop(HERO_LOOP, 2.6 + t * HERO_SPEED);
	const sc = cast(ph, t, heroAt);
	const S = v.S;
	const sx = (x: number) => v.ox + x * S;
	const sy = (y: number) => v.oy + y * S;
	const scale = S / T;

	ctx.save();
	ctx.beginPath();
	ctx.rect(v.x, v.y, v.w, v.h);
	ctx.clip();
	ctx.fillStyle = '#05070a';
	ctx.fillRect(v.x, v.y, v.w, v.h);
	// the baked deck
	const bx = v.ox - MX * scale;
	const by = v.oy - MY * scale;
	ctx.imageSmoothingQuality = 'high';
	const still = mode === 'scene';
	const layerAt = (key: string, src: HTMLCanvasElement) => {
		if (still) ctx.drawImage(atViewScale(`${style}${ph}${key}`, src, v, bx, by, FRAME.w * scale, FRAME.h * scale), v.x, v.y, v.w, v.h);
		else ctx.drawImage(src, bx, by, FRAME.w * scale, FRAME.h * scale);
	};
	layerAt('base', bake.base);
	// what lives in the dark (lit only by the light map)
	for (const k of sc.cocoons) drawCocoon(ctx, sx(k.p.x), sy(k.p.y), S, k.id, t);
	for (const h of sc.hunters) {
		drawHunter(ctx, sx(h.p.x), sy(h.p.y), S, h.id, h.a, t, { bite: h.bite ?? 0, lit: inCone(heroAt, h.p) });
	}
	// the dark
	lightMap(v, ph, t, heroAt, sc);
	ctx.globalCompositeOperation = 'multiply';
	ctx.imageSmoothingEnabled = true;
	if (lmSoft) ctx.drawImage(lmSoft, v.x, v.y, v.w, v.h);
	ctx.globalCompositeOperation = 'lighter';
	// the light's own glow: the same map, soft, added back a little (a lit place looks lit)
	ctx.globalAlpha = B ? 0.14 : 0.2;
	if (lmBloom) ctx.drawImage(lmBloom, v.x, v.y, v.w, v.h);
	ctx.globalAlpha = 1;
	// what glows by itself: the light strips (cold in power, red in failure, strobing in the nest)
	const red = tintCache.get(style) ?? tint(bake.glow, '#ff2a1f');
	tintCache.set(style, red);
	if (ph === 1) {
		ctx.globalAlpha = B ? 0.6 * flicker(0.7, t * 2.3) : 0.55 + 0.1 * Math.sin(t * 1.7);
		layerAt('glow', bake.glow);
	} else if (ph === 2) {
		ctx.globalAlpha = 0.08 * flicker(0.4, t * 3);
		layerAt('glow', bake.glow);
		ctx.globalAlpha = 0.28 + 0.12 * Math.sin(t * 3);
		layerAt('red', red);
	} else {
		ctx.globalAlpha = t % 1.3 < 0.18 ? 0.55 : 0.16;
		layerAt('red', red);
	}
	ctx.globalAlpha = 1;
	// dust turning in the beam
	const hx = sx(heroAt.p.x);
	const hy = sy(heroAt.p.y);
	for (let i = 0; i < 60; i += 1) {
		const d = ((i * 0.618 + t * 0.05) % 1) * 6.2 + 0.4;
		const a = heroAt.a + Math.sin(i * 12.9 + t * 0.3) * 0.4;
		const tx = heroAt.p.x + Math.cos(a) * d;
		const ty = heroAt.p.y + Math.sin(a) * d;
		if (solid(Math.floor(tx), Math.floor(ty))) continue;
		let clear = true;
		for (let k = 0.2; k < d && clear; k += 0.2) {
			if (solid(Math.floor(heroAt.p.x + Math.cos(a) * k), Math.floor(heroAt.p.y + Math.sin(a) * k))) clear = false;
		}
		if (!clear) continue;
		const px = sx(tx) + Math.sin(t * 0.7 + i) * S * 0.1;
		const py = sy(ty) + Math.cos(t * 0.5 + i * 2) * S * 0.1;
		ctx.fillStyle = B ? `rgba(235,242,250,${0.5 * (1 - d / 6.6)})` : `rgba(255,240,220,${0.4 * (1 - d / 6.6)})`;
		ctx.beginPath();
		ctx.arc(px, py, Math.max(0.6, S * 0.016), 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.globalCompositeOperation = 'source-over';
	// food over the dark: the cells keep the maze readable without light
	const left = Math.round(DOTS.length * (1 - sc.eaten));
	for (const d of DOTS) if (d.order >= DOTS.length - left) drawCell(ctx, sx(d.x), sy(d.y), S, t, d.seed);
	// the way out and the reward glow through the dark: they are what the player runs for
	if (sc.hatch) drawHatch(ctx, sx(sc.hatch.x), sy(sc.hatch.y), S, t, true);
	if (sc.pod) drawMedPod(ctx, sx(sc.pod.x), sy(sc.pod.y), S, t);
	for (const f of sc.flares) drawFlare(ctx, sx(f.x), sy(f.y), S, t, false);
	if (sc.litFlare) drawFlare(ctx, sx(sc.litFlare.x), sy(sc.litFlare.y), S, t, true);
	// the hunters in the dark: only their colour pits
	for (const h of sc.hunters) {
		const l = inCone(heroAt, h.p);
		if (l < 0.3) drawHunterGlints(ctx, sx(h.p.x), sy(h.p.y), S, h.id, h.a, 0.55);
	}
	// the ghosts: spectres, they glow in the dark
	for (const g of sc.ghosts) drawGhost(ctx, sx(g.p.x), sy(g.p.y), S, g.id, g.a, t, 0.9);
	// the hero
	hero.setRadius(S * 0.33);
	hero.update(dt, {
		x: hx,
		y: hy,
		angle: heroAt.a,
		moving: true,
		power: false,
		ending: false,
		season: 'winter'
	});
	hero.draw(ctx);
	// the tracker
	const blips = [...sc.hunters.map((h) => h.p), ...sc.cocoons.map((k) => k.p), ...sc.ghosts.map((g) => g.p)].map((p) => ({
		x: p.x - heroAt.p.x,
		y: p.y - heroAt.p.y
	}));
	drawTracker(ctx, hx, hy, S, t + 0.9, blips);
	// vignette, grade and scanlines: one cached layer, multiplied
	ctx.globalCompositeOperation = 'multiply';
	ctx.drawImage(postLayer(v, B), v.x, v.y, v.w, v.h);
	ctx.globalCompositeOperation = 'overlay';
	const gp = ctx.createPattern(grain(), 'repeat');
	if (gp) {
		// the grain crawls: a new offset every frame
		gp.setTransform(new DOMMatrix().translate((t * 977) % 256, (t * 631) % 256));
		ctx.globalAlpha = B ? 1 : 0.7;
		ctx.fillStyle = gp;
		ctx.fillRect(v.x, v.y, v.w, v.h);
		ctx.globalAlpha = 1;
	}
	ctx.restore();
}

// ---------------------------------------------------------------------------------------------
// The gallery: every actor large on a dark plate, lit evenly

function label(text: string, x: number, y: number): void {
	ctx.fillStyle = 'rgba(216,226,234,.75)';
	ctx.font = '600 12px "Courier New", monospace';
	ctx.textAlign = 'center';
	ctx.fillText(text, x, y);
}

function drawGallery(t: number): void {
	const { drawCell, drawCocoon, drawFlare, drawGhost, drawHatch, drawHunter, drawMedPod } = actors();
	ctx.fillStyle = '#080b0f';
	ctx.fillRect(0, 0, vw, vh);
	const items: Array<{ name: string; draw: (x: number, y: number, s: number) => void }> = [];
	for (const id of Object.keys(GHOSTS) as GhostId[]) {
		items.push({ name: `ghost ${id}`, draw: (x, y, s) => drawGhost(ctx, x, y, s, id, 0, t) });
	}
	items.push({ name: 'cocoon', draw: (x, y, s) => drawCocoon(ctx, x, y, s, 'inky', t) });
	items.push({ name: 'cell ×4', draw: (x, y, s) => [0.1, 0.4, 0.6, 0.9].forEach((k, i) => drawCell(ctx, x + ((i % 2) - 0.5) * s * 0.5, y + (Math.floor(i / 2) - 0.5) * s * 0.5, s, t, k)) });
	items.push({ name: 'flare', draw: (x, y, s) => drawFlare(ctx, x, y, s, t, false) });
	items.push({ name: 'flare lit', draw: (x, y, s) => drawFlare(ctx, x, y, s, t, true) });
	for (const [i, id] of (Object.keys(GHOSTS) as GhostId[]).entries()) {
		items.push({ name: `hunter ${id}`, draw: (x, y, s) => drawHunter(ctx, x, y, s, id, [0, -Math.PI / 2, Math.PI, Math.PI / 2][i], t, { lit: 1, bite: i === 0 ? 0.7 : 0 }) });
	}
	items.push({ name: 'hatch', draw: (x, y, s) => drawHatch(ctx, x, y, s, t, false) });
	items.push({ name: 'hatch open', draw: (x, y, s) => drawHatch(ctx, x, y, s, t, true) });
	items.push({ name: 'med pod', draw: (x, y, s) => drawMedPod(ctx, x, y, s, t) });
	items.push({
		name: 'hero',
		draw: (x, y, s) => {
			hero.setRadius(s * 0.33);
			hero.update(1 / 60, { x, y, angle: 0, moving: true, power: false, ending: false, season: 'winter' });
			hero.draw(ctx);
		}
	});
	const cols = 6;
	const rows = Math.ceil(items.length / cols);
	const cell = Math.min((vw - 40) / cols, (vh - 90) / rows);
	const x0 = (vw - cell * cols) / 2;
	const y0 = 20;
	items.forEach((it, i) => {
		const cx = x0 + (i % cols) * cell + cell / 2;
		const cy = y0 + Math.floor(i / cols) * cell + cell / 2 - 8;
		ctx.fillStyle = '#10151b';
		ctx.beginPath();
		ctx.roundRect(cx - cell / 2 + 5, cy - cell / 2 + 5, cell - 10, cell - 10, 8);
		ctx.fill();
		it.draw(cx, cy - 6, cell * 0.42);
		label(it.name, cx, cy + cell / 2 - 14);
	});
	// the same at game scale, in a strip under the plates
	const s = (vh * 0.8) / 25;
	const sy0 = y0 + rows * cell + 10;
	items.forEach((it, i) => {
		const cx = x0 + 20 + i * (s * 1.6);
		if (cx < vw - 20 && sy0 + s < vh - 50) it.draw(cx, sy0 + s * 0.6, s);
	});
}

// ---------------------------------------------------------------------------------------------

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
}

let last = -1;
function frame(now: number): void {
	const t = frozen ?? now / 1000;
	const dt = last < 0 ? 1 / 60 : Math.min(0.1, (now - last) / 1000);
	last = now;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalCompositeOperation = 'source-over';
	ctx.globalAlpha = 1;
	if (mode === 'gallery') {
		drawGallery(t);
	} else {
		const S0 = (vh * 0.8) / 25;
		if (mode === 'scene') {
			drawView({ x: 0, y: 0, w: vw, h: vh, S: S0, ox: vw / 2 - 12.5 * S0, oy: vh / 2 - 13.5 * S0 }, phase, t, dt);
		} else {
			const S = S0 * 3;
			const at = onLoop(HERO_LOOP, 2.6 + t * HERO_SPEED).p;
			const fx = at.x + 2.2;
			drawView({ x: 0, y: 0, w: vw, h: vh, S, ox: vw / 2 - fx * S, oy: vh / 2 - (at.y + 0.6) * S }, phase, t, dt);
		}
	}
	requestAnimationFrame(frame);
}

function syncButtons(): void {
	document.querySelectorAll<HTMLButtonElement>('button[data-phase]').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.phase) === phase)));
	document.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));
	document.querySelectorAll<HTMLButtonElement>('button[data-style]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.style === style)));
}
document.querySelectorAll<HTMLButtonElement>('button[data-phase]').forEach((b) =>
	b.addEventListener('click', () => {
		phase = Number(b.dataset.phase) as Phase;
		syncButtons();
	})
);
document.querySelectorAll<HTMLButtonElement>('button[data-mode]').forEach((b) =>
	b.addEventListener('click', () => {
		mode = b.dataset.mode as typeof mode;
		syncButtons();
	})
);
document.querySelectorAll<HTMLButtonElement>('button[data-style]').forEach((b) =>
	b.addEventListener('click', () => {
		style = b.dataset.style as 'a' | 'b';
		syncButtons();
	})
);
window.addEventListener('resize', layout);
layout();
syncButtons();
requestAnimationFrame(frame);
