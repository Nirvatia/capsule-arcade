// The flesh hell, baked once (the owner's accepted scene,
// `prototypes/pacman/art/hell-flesh-scene.html`, ported from its canvas code). The world is one
// flesh with no void: a ground of fibres, pores, veins, half-buried ribs and pools of blood; the
// maze is cut into it, its corridors the same flesh a little darker and wetter; its walls are
// flat muscle ridges with a dark outline, an inner light and shade edge and a ragged flesh band at
// their foot, no height; the tunnels are vertical rifts of torn flesh.
//
// Everything is painted in the scene's own units (a tile is 32, the maze's top-left corner is at
// (MX, MY)) and `FleshWorld` draws the result scaled to the game's world. Only what moves is not
// here: the blood in the veins, the pools' ripples, the cysts, the heartbeat glow (`fleshLive`).
import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';
import { isTeleportToken } from '../../../src/games/pacman/config/gridConfig';
import type { Rng, Vein } from '../../../src/games/pacman/render/doom/fleshNoise';
import {
	blur,
	clipTo,
	context,
	edgeOf,
	fbm,
	fibres,
	growVein,
	makeCanvas,
	mixHex,
	mixN,
	rgbaOf,
	rng,
	threshold,
	tint
} from '../../../src/games/pacman/render/doom/fleshNoise';

/** One tile of the scene. */
export const SCENE_TILE = 32;
/** The maze's top-left corner in the scene's frame. */
export const MX = 400;
export const MY = 84;
/** The frame the veins and the ribs live in (the scene's own stage). */
const BOX = { w: 1600, h: 1000 } as const;
/** The baked ground: the stage and a wide margin, so any screen shape stays inside flesh. */
export const FRAME = { x0: -700, y0: -300, w: 3000, h: 1700 } as const;
/** Margin round the maze in the maze-sized layers. */
const MARGIN = 96;

const PAL = {
	pit: '#12030a',
	bloodMid: '#6b0b10',
	vein: '#34122a',
	fat: '#e3b49a',
	glow: '#ff4a32',
	glowHot: '#ffb06a',
	boneDark: '#8d7a66',
	bone: '#d9c9ae'
} as const;

/**
 * The wall material, the owner's "cord": islands of dark flesh with a fine quiet texture, each
 * edged by a glowing cord (the classic mazes' outline, in the hell's own matter). The maze must
 * stand out from the background without the walls floating over a pit, so the corridor floor
 * stays close to the walls in tone, a shadow lies at the foot of every wall, the tone wanders
 * over a big island and the ground outside the maze recedes.
 */
const WALL = {
	grad: ['#34161a', '#2c1215', '#220d10'],
	rim: 'rgba(255,120,90,.3)',
	shade: 'rgba(8,1,3,.7)',
	/** Rim light offset in px. */
	lip: 2,
	/** The cord's hot line (rgb). */
	cord: '255,96,64',
	/** Darkening of the corridor floor over the bare flesh. */
	floorShade: 0.3,
	/** Opacity of the shadow the walls cast on the floor. */
	ao: 0.5,
	/** Darkening of the ground outside the maze. */
	bgDim: 0.3,
	/** Strength of the large-scale light and dark patches on the walls. */
	mottle: 0.35
} as const;

/** The wall candidates of the comparison page (a throwaway fork of the game's bake). */
export type Variant = 'now' | 'plates' | 'obsidian' | 'blocks';

interface BlockCfg {
	readonly vary: number;
	readonly hi: string;
	readonly lo: string;
	readonly seam: string;
	readonly rivets: boolean;
	readonly gloss: boolean;
	readonly stitches: boolean;
	readonly heat: boolean;
}

const VARIANTS: Record<
	Variant,
	{ wall: Partial<typeof WALL> & { ring?: string }; floorShade: number; blocks: BlockCfg | null }
> = {
	now: { wall: {}, floorShade: WALL.floorShade, blocks: null },
	// charred iron plates: neutral, lighter than the floor, riveted, hot seams
	plates: {
		wall: {
			grad: ['#5a4f52', '#4d4346', '#40373a'],
			rim: 'rgba(255,214,180,.34)',
			shade: 'rgba(6,2,3,.75)',
			cord: '255,120,60',
			ring: 'rgba(14,8,10,.97)',
			mottle: 0.12
		} as never,
		floorShade: 0.62,
		blocks: {
			vary: 0.07,
			hi: 'rgba(255,236,214,.2)',
			lo: 'rgba(0,0,0,.42)',
			seam: 'rgba(8,3,4,.62)',
			rivets: true,
			gloss: false,
			stitches: false,
			heat: true
		}
	},
	// black glass: darker than the floor, a glossy edge, a red light inside the seams
	obsidian: {
		wall: {
			grad: ['#1f1014', '#180b0f', '#110709'],
			rim: 'rgba(255,150,130,.5)',
			shade: 'rgba(3,0,1,.85)',
			cord: '255,64,72',
			ring: 'rgba(4,1,2,.99)',
			mottle: 0.05
		} as never,
		floorShade: 0.05,
		blocks: {
			vary: 0.05,
			hi: 'rgba(255,255,255,.14)',
			lo: 'rgba(0,0,0,.5)',
			seam: 'rgba(255,70,80,.16)',
			rivets: false,
			gloss: true,
			stitches: false,
			heat: false
		}
	},
	// the cord's own flesh, as lighter blocks sewn together over a darker floor
	blocks: {
		wall: {
			grad: ['#7a4044', '#6d3840', '#5d2f36'],
			rim: 'rgba(255,214,190,.36)',
			shade: 'rgba(14,2,5,.75)',
			cord: '255,110,80',
			ring: 'rgba(40,8,12,.97)',
			mottle: 0.15
		} as never,
		floorShade: 0.55,
		blocks: {
			vary: 0.06,
			hi: 'rgba(255,220,200,.2)',
			lo: 'rgba(20,2,6,.45)',
			seam: 'rgba(28,4,8,.6)',
			rivets: false,
			gloss: false,
			stitches: true,
			heat: false
		}
	}
};

/** One wall tile as a block: bevel, seam, and what the candidate adds. */
function paintBlock(tp: CanvasRenderingContext2D, X: number, Y: number, cfg: BlockCfg, rw: Rng): void {
	const T = SCENE_TILE;
	const v = rw();
	tp.fillStyle = v < 0.5 ? `rgba(255,255,255,${cfg.vary * v * 2})` : `rgba(0,0,0,${cfg.vary * (v - 0.5) * 2})`;
	tp.fillRect(X, Y, T, T);
	if (cfg.gloss) {
		const g = tp.createLinearGradient(X, Y, X + T, Y + T);
		g.addColorStop(0, 'rgba(255,255,255,.12)');
		g.addColorStop(0.45, 'rgba(255,255,255,.02)');
		g.addColorStop(1, 'rgba(255,120,150,.06)');
		tp.fillStyle = g;
		tp.fillRect(X, Y, T, T);
	}
	tp.fillStyle = cfg.hi;
	tp.fillRect(X + 1, Y + 1, T - 2, 2);
	tp.fillRect(X + 1, Y + 1, 2, T - 2);
	tp.fillStyle = cfg.lo;
	tp.fillRect(X + 1, Y + T - 3, T - 2, 2);
	tp.fillRect(X + T - 3, Y + 1, 2, T - 2);
	tp.strokeStyle = cfg.seam;
	tp.lineWidth = 1.6;
	tp.strokeRect(X + 0.8, Y + 0.8, T - 1.6, T - 1.6);
	if (cfg.rivets) {
		for (const [dx, dy] of [
			[6, 6],
			[T - 6, 6],
			[6, T - 6],
			[T - 6, T - 6]
		]) {
			tp.fillStyle = 'rgba(0,0,0,.55)';
			tp.beginPath();
			tp.arc(X + dx + 0.6, Y + dy + 0.8, 2.1, 0, 6.3);
			tp.fill();
			tp.fillStyle = 'rgba(255,230,200,.45)';
			tp.beginPath();
			tp.arc(X + dx - 0.4, Y + dy - 0.5, 1.1, 0, 6.3);
			tp.fill();
		}
	}
	if (cfg.stitches) {
		tp.strokeStyle = 'rgba(24,3,6,.65)';
		tp.lineWidth = 1.4;
		for (let i = 0; i < 3; i += 1) {
			const o = 6 + i * 9;
			tp.beginPath();
			tp.moveTo(X + T - 4, Y + o);
			tp.lineTo(X + T + 3, Y + o + 2);
			tp.moveTo(X + o, Y + T - 4);
			tp.lineTo(X + o + 2, Y + T + 3);
			tp.stroke();
		}
	}
}

/** The maze's walkable tiles, for the stand-in dots. */
export function floorTiles(S: GridMatrix): Array<readonly [number, number]> {
	const out: Array<readonly [number, number]> = [];
	for (let r = 0; r < S.length; r += 1) {
		for (let c = 0; c < S[0].length; c += 1) {
			if (kindOf(S, c, r) === 'floor') {
				out.push([c, r]);
			}
		}
	}
	return out;
}

type Kind = 'none' | 'wall' | 'floor' | 'lair' | 'tele';
const LAIR_TOKENS: ReadonlySet<string> = new Set(['LT', 'BY', 'IY', 'PY', 'CE', 'DB', 'LE']);

export interface Pool {
	readonly x: number;
	readonly y: number;
	readonly r: number;
	readonly ph: number;
}

export interface Cyst {
	readonly x: number;
	readonly y: number;
	readonly r: number;
	readonly sprite: HTMLCanvasElement;
	readonly ph: number;
}

/** A tunnel: the tall torn seam and its inner polygon (a light pours out of it). */
export interface Rift {
	readonly cx: number;
	readonly cy: number;
	readonly h: number;
	readonly inner: ReadonlyArray<readonly [number, number]>;
}

/** A round pad under the spawn or the fruit: where its glow breathes. */
export interface Pad {
	readonly cx: number;
	readonly cy: number;
	readonly k: number;
}

export interface FleshBake {
	/** The ground, FRAME-sized. */
	readonly ground: HTMLCanvasElement;
	/** Corridors, blood, rifts, walls: maze-sized, origin (local.x, local.y). */
	readonly maze: HTMLCanvasElement;
	/** What glows in the walls (additive), and its blur. */
	readonly emis: HTMLCanvasElement;
	readonly glow: HTMLCanvasElement;
	readonly local: { readonly x: number; readonly y: number };
	readonly veins: readonly Vein[];
	readonly pools: readonly Pool[];
	readonly cysts: readonly Cyst[];
	readonly rifts: readonly Rift[];
	readonly pads: readonly Pad[];
	/** The lair's centre, scene units. */
	readonly lair: { readonly x: number; readonly y: number };
	/** Scene units per tile row and column. */
	readonly cols: number;
	readonly rows: number;
}

function kindOf(S: GridMatrix, c: number, r: number): Kind {
	const t = S[r]?.[c];
	if (t === undefined || t === 'ES') {
		return 'none';
	}
	if (t === 'WL') {
		return 'wall';
	}
	if (isTeleportToken(t)) {
		return 'tele';
	}
	return LAIR_TOKENS.has(t) ? 'lair' : 'floor';
}

const tx = (c: number): number => MX + c * SCENE_TILE;
const ty = (r: number): number => MY + r * SCENE_TILE;

export function bakeFlesh(S: GridMatrix, variant: Variant = 'now', calm = false): FleshBake {
	const V = VARIANTS[variant];
	const st = { ...WALL, ...V.wall, floorShade: V.floorShade, bgDim: calm ? 0.66 : WALL.bgDim };
	const ringBody = (V.wall as { ring?: string }).ring ?? 'rgba(58,10,14,.95)';
	const rows = S.length;
	const cols = S[0].length;
	const isWall = (c: number, r: number): boolean => kindOf(S, c, r) === 'wall';
	const isDeck = (c: number, r: number): boolean => kindOf(S, c, r) !== 'none';
	const T = SCENE_TILE;

	// the maze-sized layers: the maze and a margin, painted in scene coordinates
	const LX = MX - MARGIN;
	const LY = MY - MARGIN;
	const LW = cols * T + 2 * MARGIN;
	const LH = rows * T + 2 * MARGIN;

	// ---- the ground of the whole world ----
	const ground = makeCanvas(FRAME.w, FRAME.h);
	const g = context(ground);
	g.translate(-FRAME.x0, -FRAME.y0);
	const area = (FRAME.w * FRAME.h) / (BOX.w * BOX.h);
	const r = rng(5);
	const gg = g.createLinearGradient(0, FRAME.y0, 0, FRAME.y0 + FRAME.h);
	gg.addColorStop(0, '#3d1216');
	gg.addColorStop(0.5, '#34100f');
	gg.addColorStop(1, '#3b1216');
	g.fillStyle = gg;
	g.fillRect(FRAME.x0, FRAME.y0, FRAME.w, FRAME.h);
	for (let i = 0; i < 110 * area; i += 1) {
		const bx = FRAME.x0 + r() * FRAME.w;
		const by = FRAME.y0 + r() * FRAME.h;
		const br = 60 + r() * 190;
		const kind = r();
		const col = kind < 0.45 ? '#1a0406' : kind < 0.8 ? '#6a2a28' : '#b98a6a';
		const bg = g.createRadialGradient(bx, by, 0, bx, by, br);
		bg.addColorStop(0, rgbaOf(col, kind < 0.45 ? 0.3 : kind < 0.8 ? 0.2 : 0.1));
		bg.addColorStop(1, rgbaOf(col, 0));
		g.fillStyle = bg;
		g.fillRect(bx - br, by - br, br * 2, br * 2);
	}
	fibres(
		g,
		16000 * area,
		r,
		FRAME.x0,
		FRAME.y0,
		FRAME.w,
		FRAME.h,
		'rgba(14,3,8,.26)',
		'rgba(150,60,56,.12)'
	);
	// pores and bumps
	for (let i = 0; i < 520 * area; i += 1) {
		const qx = FRAME.x0 + r() * FRAME.w;
		const qy = FRAME.y0 + r() * FRAME.h;
		const qr = 2 + r() * 5;
		g.fillStyle = 'rgba(0,0,0,.28)';
		g.beginPath();
		g.arc(qx + 1.2, qy + 1.4, qr, 0, 7);
		g.fill();
		g.fillStyle = 'rgba(210,120,110,.16)';
		g.beginPath();
		g.arc(qx - 0.8, qy - 1, qr * 0.8, 0, 7);
		g.fill();
	}
	g.lineCap = 'round';
	// the corridors and the walls' foot are painted from the bare flesh, before the veins, the
	// ribs and the pools lie on it (as in the scene): a copy of the maze's part of the ground
	const baseLocal = makeCanvas(LW, LH);
	context(baseLocal).drawImage(ground, FRAME.x0 - LX, FRAME.y0 - LY);

	// veins: dark under the skin; a few thick ones come in from the edges of the stage
	const veins: Vein[] = [];
	const rv = rng(9);
	for (let i = 0; i < 7; i += 1) {
		const edge = i % 4;
		const sx = edge === 0 ? -10 : edge === 1 ? BOX.w + 10 : rv() * BOX.w;
		let sy = edge === 2 ? -10 : edge === 3 ? BOX.h + 10 : rv() * BOX.h;
		if (edge < 2) {
			sy = rv() * BOX.h;
		}
		const ang = edge === 0 ? 0 : edge === 1 ? Math.PI : edge === 2 ? Math.PI / 2 : -Math.PI / 2;
		growVein(sx, sy, ang + (rv() - 0.5) * 0.8, 6, 90, 0, rv, veins, BOX);
	}
	for (const v of veins) {
		g.lineJoin = 'round';
		const passes: ReadonlyArray<readonly [number, string]> = [
			[v.w + 3.5, 'rgba(10,2,8,.8)'],
			[v.w + 0.5, '#3b1630'],
			[v.w * 0.35, 'rgba(150,70,100,.45)']
		];
		passes.forEach(([width, color], k) => {
			g.strokeStyle = color;
			g.lineWidth = width;
			g.beginPath();
			v.pts.forEach((p, ii) => {
				const o = k === 2 ? -0.8 : 0;
				if (ii) {
					g.lineTo(p[0] + o, p[1] + o);
				} else {
					g.moveTo(p[0] + o, p[1] + o);
				}
			});
			g.stroke();
		});
	}

	// ribs: the chest of the beast closes in on both sides, bones half buried in flesh
	const rrb = rng(3);
	const ribPts: Array<readonly [number, number]> = [];
	const cx0 = MX + (cols * T) / 2;
	const cy0 = MY + (rows * T) / 2;
	const ribArc = (rx: number, ry: number, a0: number, a1: number, lw: number): void => {
		const segs = 2 + Math.floor(rrb() * 2);
		const span = (a1 - a0) / segs;
		for (let sg = 0; sg < segs; sg += 1) {
			const s0 = a0 + sg * span + rrb() * 0.04;
			const s1 = a0 + (sg + 1) * span - rrb() * 0.07;
			g.save();
			g.lineCap = 'round';
			const arc = (w2: number, col: string, ox: number, oy: number): void => {
				g.strokeStyle = col;
				g.lineWidth = w2;
				g.beginPath();
				g.ellipse(cx0 + ox, cy0 + oy, rx, ry, 0, s0, s1, false);
				g.stroke();
			};
			g.shadowColor = 'rgba(0,0,0,.75)';
			g.shadowBlur = 14;
			g.shadowOffsetY = 5;
			arc(lw + 8, '#12030a', 0, 0);
			g.shadowBlur = 0;
			g.shadowOffsetY = 0;
			arc(lw + 5, '#12030a', 0, 0);
			arc(lw, '#6e5e4e', 0, 0);
			arc(lw * 0.72, '#9c8a72', -1.2, -1.2);
			arc(lw * 0.36, '#c8b898', -2.6, -2.6);
			arc(2.4, 'rgba(255,240,215,.5)', -4, -4);
			g.restore();
			for (let q = 0; q < 14; q += 1) {
				const aa = mixN(s0, s1, rrb());
				ribPts.push([cx0 + Math.cos(aa) * rx, cy0 + Math.sin(aa) * ry]);
			}
		}
	};
	const ribsLeft: ReadonlyArray<readonly [number, number, number, number, number]> = [
		[480, 600, Math.PI - 0.6, Math.PI + 0.85, 26],
		[610, 690, Math.PI - 0.45, Math.PI + 0.55, 30],
		[740, 780, Math.PI - 0.85, Math.PI + 0.3, 24]
	];
	const ribsRight: ReadonlyArray<readonly [number, number, number, number, number]> = [
		[500, 590, -0.8, 0.55, 28],
		[630, 700, -0.5, 0.7, 24],
		[760, 770, -0.35, 0.9, 30]
	];
	for (const p of [...ribsLeft, ...ribsRight]) {
		ribArc(p[0], p[1], p[2], p[3], p[4]);
	}
	// flesh grows over the bones: patches and fibres drawn back on top
	for (const q of ribPts) {
		const bg2 = g.createRadialGradient(q[0], q[1], 0, q[0], q[1], 26);
		bg2.addColorStop(0, 'rgba(72,22,24,.75)');
		bg2.addColorStop(1, 'rgba(72,22,24,0)');
		g.fillStyle = bg2;
		g.fillRect(q[0] - 26, q[1] - 26, 52, 52);
	}
	for (const q of ribPts) {
		fibres(g, 14, rrb, q[0] - 22, q[1] - 22, 44, 44, 'rgba(14,3,8,.3)', 'rgba(170,70,62,.2)');
	}
	// blood on the bones, pools in the corners
	const rbn = rng(13);
	for (let i = 0; i < 70; i += 1) {
		const sx2 = rbn() < 0.5 ? rbn() * 380 : BOX.w - rbn() * 380;
		const sy2 = rbn() * BOX.h;
		g.fillStyle = rgbaOf(PAL.bloodMid, 0.5 + rbn() * 0.3);
		g.beginPath();
		g.arc(sx2, sy2, 2 + rbn() * 9, 0, 7);
		g.fill();
	}
	const pools: Pool[] = [];
	const poolSpots: ReadonlyArray<readonly [number, number, number]> = [
		[190, 240, 100],
		[130, 770, 120],
		[1450, 280, 110],
		[1500, 740, 100]
	];
	poolSpots.forEach((p, pi) => {
		const pts: Array<[number, number]> = [];
		const n = 64;
		const f1 = pi * 1.3;
		const f2 = pi * 2.1 + 1;
		const f3 = pi * 0.7 + 2;
		for (let k = 0; k < n; k += 1) {
			const a = (k / n) * 6.2832;
			const rr2 =
				p[2] *
				(1 +
					0.14 * Math.sin(a * 2 + f1) +
					0.09 * Math.sin(a * 3 + f2) +
					0.05 * Math.sin(a * 5 + f3));
			pts.push([p[0] + Math.cos(a) * rr2 * 1.35, p[1] + Math.sin(a) * rr2]);
		}
		const path = (sc: number): void => {
			g.beginPath();
			pts.forEach((q, ii) => {
				const x1 = p[0] + (q[0] - p[0]) * sc;
				const y1 = p[1] + (q[1] - p[1]) * sc;
				if (ii) {
					g.lineTo(x1, y1);
				} else {
					g.moveTo(x1, y1);
				}
			});
			g.closePath();
		};
		g.save();
		g.shadowColor = 'rgba(0,0,0,.6)';
		g.shadowBlur = 12;
		path(1.06);
		g.fillStyle = '#12030a';
		g.fill();
		g.restore();
		path(1);
		g.fillStyle = '#4c0a10';
		g.fill();
		const pg = g.createRadialGradient(
			p[0] - p[2] * 0.2,
			p[1] - p[2] * 0.2,
			0,
			p[0],
			p[1],
			p[2] * 1.45
		);
		pg.addColorStop(0, '#2a0409');
		pg.addColorStop(0.6, '#3d060c');
		pg.addColorStop(1, '#5c0b12');
		path(0.93);
		g.fillStyle = pg;
		g.fill();
		g.strokeStyle = 'rgba(210,90,90,.5)';
		g.lineWidth = 2;
		path(1);
		g.stroke();
		g.strokeStyle = 'rgba(255,225,215,.32)';
		g.lineWidth = 3.2;
		g.lineCap = 'round';
		g.beginPath();
		g.ellipse(p[0] - p[2] * 0.32, p[1] - p[2] * 0.28, p[2] * 0.5, p[2] * 0.2, -0.25, 3.5, 4.5);
		g.stroke();
		g.strokeStyle = 'rgba(255,225,215,.18)';
		g.lineWidth = 2;
		g.beginPath();
		g.ellipse(p[0] + p[2] * 0.3, p[1] + p[2] * 0.3, p[2] * 0.25, p[2] * 0.1, -0.2, 0.2, 1.4);
		g.stroke();
		pools.push({ x: p[0], y: p[1], r: p[2], ph: pi * 1.7 });
	});
	// the ground outside the maze recedes: the corridors are painted from the bare flesh copied
	// above, so they keep their tone while the background sinks
	if (st.bgDim > 0) {
		g.fillStyle = `rgba(8,2,4,${st.bgDim})`;
		g.fillRect(FRAME.x0, FRAME.y0, FRAME.w, FRAME.h);
	}

	// ---- the maze: layers the size of the maze and a margin, painted in scene coordinates ----
	const layer = (): { cv: HTMLCanvasElement; x: CanvasRenderingContext2D } => {
		const cv = makeCanvas(LW, LH);
		const x = context(cv);
		x.translate(-LX, -LY);
		return { cv, x };
	};
	const maskOf = (pred: (c: number, rr: number) => boolean, grow: number): HTMLCanvasElement => {
		const m = layer();
		m.x.fillStyle = '#fff';
		for (let rr = 0; rr < rows; rr += 1) {
			for (let c = 0; c < cols; c += 1) {
				if (pred(c, rr)) {
					m.x.fillRect(tx(c) - grow, ty(rr) - grow, T + 2 * grow, T + 2 * grow);
				}
			}
		}
		return threshold(blur(m.cv, 3, true), 5);
	};
	const wallM = maskOf(isWall, 0);
	const deckM = maskOf(isDeck, 0);

	// the corridor floor: the same flesh as outside, a little darker and wetter
	const ra = rng(17);
	const arena = layer();
	{
		const a = arena.x;
		a.drawImage(baseLocal, LX, LY);
		a.fillStyle = `rgba(16,3,7,${st.floorShade})`;
		a.fillRect(MX - 8, MY - 8, cols * T + 16, rows * T + 16);
		const sh = a.createLinearGradient(MX, MY, MX + cols * T, MY + rows * T);
		sh.addColorStop(0, 'rgba(255,170,160,.05)');
		sh.addColorStop(0.5, 'rgba(255,170,160,0)');
		sh.addColorStop(1, 'rgba(255,170,160,.04)');
		a.fillStyle = sh;
		a.fillRect(MX, MY, cols * T, rows * T);
		for (let rr = 0; rr < rows; rr += 1) {
			for (let c = 0; c < cols; c += 1) {
				const k = kindOf(S, c, rr);
				if (k === 'none' || k === 'wall') {
					continue;
				}
				const X = tx(c);
				const Y = ty(rr);
				if (k === 'lair') {
					a.fillStyle = mixHex('#4a0e14', '#5e1519', ra());
					a.fillRect(X, Y, T, T);
				} else {
					// a path worn lighter along the middle of the corridor
					const horiz = !isWall(c - 1, rr) && !isWall(c + 1, rr);
					const vert = !isWall(c, rr - 1) && !isWall(c, rr + 1);
					a.fillStyle = 'rgba(60,18,20,.35)';
					if (horiz && !vert) {
						a.fillRect(X, Y + T * 0.3, T, T * 0.4);
					} else if (vert && !horiz) {
						a.fillRect(X + T * 0.3, Y, T * 0.4, T);
					} else {
						a.fillRect(X + T * 0.2, Y + T * 0.2, T * 0.6, T * 0.6);
					}
				}
			}
		}
	}
	{
		// the lair's veins run across its whole floor in common coordinates (not tile by tile, so
		// no line breaks at a tile's edge) and are cut to the lair's shape
		const lairM = maskOf((c, rr) => kindOf(S, c, rr) === 'lair', 0);
		const veinsL = layer();
		let n = 0;
		let c0 = cols;
		let c1 = -1;
		let r0 = rows;
		let r1 = -1;
		for (let rr = 0; rr < rows; rr += 1) {
			for (let c = 0; c < cols; c += 1) {
				if (kindOf(S, c, rr) === 'lair') {
					n += 1;
					c0 = Math.min(c0, c);
					c1 = Math.max(c1, c);
					r0 = Math.min(r0, rr);
					r1 = Math.max(r1, rr);
				}
			}
		}
		const x = veinsL.x;
		x.strokeStyle = 'rgba(20,3,8,.7)';
		x.lineWidth = 1.2;
		x.lineCap = 'round';
		const rl = rng(19);
		for (let q = 0; q < n * 3; q += 1) {
			const px0 = tx(c0) + rl() * (c1 - c0 + 1) * T;
			const py0 = ty(r0) + rl() * (r1 - r0 + 1) * T;
			const a0 = rl() * 6.28;
			const len = 30 + rl() * 60;
			x.beginPath();
			x.moveTo(px0, py0);
			x.quadraticCurveTo(
				px0 + Math.cos(a0 + 0.8) * len * 0.5,
				py0 + Math.sin(a0 + 0.8) * len * 0.5,
				px0 + Math.cos(a0) * len,
				py0 + Math.sin(a0) * len
			);
			x.stroke();
		}
		arena.x.drawImage(clipTo(veinsL.cv, lairM), LX, LY);
	}
	const arenaFlesh = clipTo(arena.cv, deckM);

	// blood on the corridor floor
	const bf = layer();
	{
		const rb = rng(21);
		const spots: Array<readonly [number, number]> = [];
		for (let rr = 2; rr < rows - 1; rr += 1) {
			for (let c = 1; c < cols - 1; c += 1) {
				if (kindOf(S, c, rr) === 'floor' && rb() < 0.08) {
					spots.push([c, rr]);
				}
			}
		}
		for (const s0 of spots) {
			const X = tx(s0[0]) + T / 2 + (rb() - 0.5) * 6;
			const Y = ty(s0[1]) + T / 2 + (rb() - 0.5) * 6;
			const n = 3 + Math.floor(rb() * 3);
			bf.x.fillStyle = '#4a070b';
			for (let q = 0; q < n; q += 1) {
				bf.x.beginPath();
				bf.x.arc(X + (rb() - 0.5) * 10, Y + (rb() - 0.5) * 10, 4 + rb() * 6, 0, 7);
				bf.x.fill();
			}
			bf.x.fillStyle = 'rgba(220,100,100,.4)';
			bf.x.beginPath();
			bf.x.arc(X - 2, Y - 2, 2, 0, 7);
			bf.x.fill();
		}
	}
	const bloodFloor = clipTo(bf.cv, deckM);

	// blood on the walls
	const bw = layer();
	{
		const rbw = rng(41);
		for (let rr = 0; rr < rows; rr += 1) {
			for (let c = 0; c < cols; c += 1) {
				if (!isWall(c, rr)) {
					continue;
				}
				const X4 = tx(c);
				const Y4 = ty(rr);
				if (rbw() < 0.2) {
					bw.x.strokeStyle = PAL.bloodMid;
					bw.x.globalAlpha = 0.8;
					bw.x.lineCap = 'round';
					bw.x.lineWidth = 3 + rbw() * 6;
					bw.x.beginPath();
					const x0 = X4 + 4 + rbw() * 22;
					const y0 = Y4 + 4 + rbw() * 22;
					bw.x.moveTo(x0, y0);
					bw.x.lineTo(x0 + (rbw() - 0.5) * 22, y0 + (rbw() - 0.5) * 22);
					bw.x.stroke();
					bw.x.globalAlpha = 1;
				}
				if (!isWall(c, rr + 1) && rbw() < 0.4) {
					const dx0 = X4 + 5 + rbw() * (T - 10);
					const len = 4 + rbw() * 9;
					bw.x.strokeStyle = '#5e0a0f';
					bw.x.lineWidth = 3;
					bw.x.lineCap = 'round';
					bw.x.beginPath();
					bw.x.moveTo(dx0, Y4 + T - 8);
					bw.x.lineTo(dx0, Y4 + T + len);
					bw.x.stroke();
					bw.x.fillStyle = '#7c0e14';
					bw.x.beginPath();
					bw.x.arc(dx0, Y4 + T + len, 2.6, 0, 7);
					bw.x.fill();
				}
			}
		}
	}

	// ---- the walls: one flat muscle ridge, painted tile by tile and lit from inside ----
	const walls = layer();
	const emis = layer();
	{
		const w = walls.x;
		const ex = emis.x;
		const rw = rng(31);
		for (let i = 0; i < 8; i += 1) {
			const an = (i / 8) * 6.2832;
			w.drawImage(tint(wallM, PAL.pit), LX + Math.cos(an) * 2.2, LY + Math.sin(an) * 2.2);
		}
		const top = layer();
		const tp = top.x;
		const gt0 = tp.createLinearGradient(MX, MY, MX + cols * T, MY + rows * T);
		gt0.addColorStop(0, st.grad[0]);
		gt0.addColorStop(0.5, st.grad[1]);
		gt0.addColorStop(1, st.grad[2]);
		tp.fillStyle = gt0;
		tp.fillRect(LX, LY, LW, LH);
		for (let rr = 0; rr < rows; rr += 1) {
			for (let c = 0; c < cols; c += 1) {
				if (!isWall(c, rr)) {
					continue;
				}
				const X3 = tx(c);
				const Y3 = ty(rr);
				const v = rw();
				tp.fillStyle =
					v < 0.5
						? `rgba(255,200,180,${0.03 + v * 0.04})`
						: `rgba(30,6,10,${0.03 + (v - 0.5) * 0.06})`;
				tp.fillRect(X3 - 1, Y3 - 1, T + 2, T + 2);
				if (V.blocks) {
					paintBlock(tp, X3, Y3, V.blocks, rw);
				} else {
					paintQuiet(tp, X3, Y3, rw);
				}
			}
		}
		// the tone wanders over a big island: soft light and dark patches, continuous over tiles
		if (st.mottle > 0) {
			for (let rr = 0; rr < rows; rr += 1) {
				for (let c = 0; c < cols; c += 1) {
					if (!isWall(c, rr)) {
						continue;
					}
					const cx = tx(c) + T / 2;
					const cy = ty(rr) + T / 2;
					const k = (fbm(cx / 70, cy / 70) - 0.5) * 2 * st.mottle;
					const a = Math.min(0.5, Math.abs(k) * 0.9);
					const bg = tp.createRadialGradient(cx, cy, 0, cx, cy, T * 1.3);
					const col = k > 0 ? '255,225,200' : '20,6,6';
					bg.addColorStop(0, `rgba(${col},${a})`);
					bg.addColorStop(1, `rgba(${col},0)`);
					tp.fillStyle = bg;
					tp.fillRect(cx - T * 1.3, cy - T * 1.3, T * 2.6, T * 2.6);
				}
			}
		}
		// a skull in each inner corner of the maze
		const corners: ReadonlyArray<readonly [number, number]> = [
			[1, 1],
			[cols - 2, 1],
			[1, rows - 2],
			[cols - 2, rows - 2]
		];
		for (const p of corners) {
			if (!isWall(p[0], p[1])) {
				continue;
			}
			paintSkull(tp, ex, tx(p[0]) + T / 2, ty(p[1]) + T / 2);
		}
		w.drawImage(clipTo(top.cv, wallM), LX, LY);
		w.drawImage(clipTo(tint(edgeOf(wallM, st.lip, st.lip), st.rim), wallM), LX, LY);
		w.drawImage(clipTo(tint(edgeOf(wallM, -2, -2), st.shade), wallM), LX, LY);
		{
			// a cord round every island: a dark body with a thin hot line that pulses with the heart
			const ring = (r2: number): HTMLCanvasElement => {
				const c2 = makeCanvas(LW, LH);
				const x2 = context(c2);
				for (let k = 0; k < 8; k += 1) {
					const an = (k / 8) * 6.2832;
					x2.drawImage(edgeOf(wallM, Math.cos(an) * r2, Math.sin(an) * r2), 0, 0);
				}
				return c2;
			};
			w.drawImage(clipTo(tint(ring(4), ringBody), wallM), LX, LY);
			ex.drawImage(clipTo(tint(ring(1.8), `rgba(${st.cord},.9)`), wallM), LX, LY);
		}
		paintGate(S, w, ex, cols, rows);
	}
	const glowCv = blur(emis.cv, 3, true);

	const wallShadow = clipTo(blur(tint(wallM, '#000'), 2, true), deckM);

	// ---- the tunnels (vertical rifts) and the round pads under the spawn and the fruit ----
	const maw = layer();
	const rifts: Rift[] = [];
	const pads: Pad[] = [];
	{
		const mx = maw.x;
		for (let rr = 0; rr < rows; rr += 1) {
			for (let c = 0; c < cols; c += 1) {
				if (kindOf(S, c, rr) !== 'tele') {
					continue;
				}
				const pi = rifts.length;
				const cx = tx(c + 0.5);
				const cy = ty(rr + 0.5);
				const H0 = 2 * T * 0.47 * 0.9;
				const seed = 11 + pi * 7;
				const outer = riftPoly(cx, cy, H0 * 1.12, T * 0.3, seed);
				const inn = riftPoly(cx, cy, H0 * 0.94, T * 0.14, seed);
				polyPath(mx, outer);
				const rg = mx.createLinearGradient(cx, cy - H0 / 2, cx, cy + H0 / 2);
				rg.addColorStop(0, '#8a2a2e');
				rg.addColorStop(0.5, '#c4544c');
				rg.addColorStop(1, '#8a2a2e');
				mx.fillStyle = rg;
				mx.fill();
				mx.strokeStyle = 'rgba(255,215,200,.4)';
				mx.lineWidth = 1.2;
				mx.lineCap = 'round';
				mx.beginPath();
				mx.moveTo(cx - T * 0.2, cy - H0 * 0.3);
				mx.lineTo(cx - T * 0.14, cy - H0 * 0.05);
				mx.stroke();
				polyPath(mx, inn);
				mx.fillStyle = '#0a0206';
				mx.fill();
				rifts.push({ cx, cy, h: H0, inner: inn });
			}
		}
		for (let rr = 0; rr < rows; rr += 1) {
			for (let c = 0; c < cols; c += 1) {
				const t = S[rr][c];
				const R2 = t === 'PM' ? T * 0.38 : t === 'FT' ? T * 0.3 : 0;
				if (R2 === 0) {
					continue;
				}
				const cx = tx(c + 0.5);
				const cy = ty(rr + 0.5);
				mx.fillStyle = '#12030a';
				mx.beginPath();
				mx.arc(cx, cy, R2 + 3, 0, 7);
				mx.fill();
				mx.strokeStyle = '#6a2326';
				mx.lineWidth = 5;
				mx.beginPath();
				mx.arc(cx, cy, R2, 0, 7);
				mx.stroke();
				mx.strokeStyle = 'rgba(255,190,170,.45)';
				mx.lineWidth = 1.6;
				mx.beginPath();
				mx.arc(cx, cy, R2, 3.6, 5.0);
				mx.stroke();
				mx.fillStyle = '#1a0409';
				mx.beginPath();
				mx.arc(cx, cy, R2 - 2.5, 0, 7);
				mx.fill();
				pads.push({ cx, cy, k: t === 'PM' ? 0.3 : 0.26 });
			}
		}
	}

	// ---- compose the maze layer in the scene's order ----
	const maze = layer();
	{
		const m = maze.x;
		m.drawImage(arenaFlesh, LX, LY);
		m.globalAlpha = 0.8;
		m.drawImage(bloodFloor, LX, LY);
		m.globalAlpha = 1;
		m.drawImage(maw.cv, LX, LY);
		m.globalAlpha = st.ao;
		m.drawImage(wallShadow, LX, LY);
		m.globalAlpha = 1;
		m.drawImage(walls.cv, LX, LY);
		m.globalAlpha = 0.8;
		m.drawImage(bw.cv, LX, LY);
		m.globalAlpha = 1;
	}

	// ---- cysts: swellings in the side pockets and the margins ----
	const cysts: Cyst[] = [];
	for (const p of sidePockets(S, cols, rows)) {
		const x = tx(0) + p[0] * T;
		const y = ty(0) + p[1] * T;
		cysts.push({ x, y, r: 30, sprite: cystSprite(30), ph: p[0] + p[1] });
	}
	const rc = rng(71);
	const margins: ReadonlyArray<readonly [number, number, number]> = [
		[110, 120, 38],
		[320, 300, 26],
		[90, 470, 44],
		[310, 540, 22],
		[220, 880, 36],
		[370, 770, 24],
		[1500, 120, 40],
		[1280, 250, 24],
		[1520, 500, 46],
		[1290, 590, 22],
		[1380, 900, 38],
		[1240, 800, 26],
		[800, 36, 18],
		[660, 962, 22],
		[980, 950, 16]
	];
	for (const p of margins) {
		cysts.push({ x: p[0], y: p[1], r: p[2], sprite: cystSprite(p[2]), ph: rc() * 6 });
	}

	return {
		ground,
		maze: maze.cv,
		emis: emis.cv,
		glow: glowCv,
		local: { x: LX, y: LY },
		veins,
		pools,
		cysts,
		rifts,
		pads,
		lair: { x: MX + (cols * T) / 2, y: MY + (rows * T) / 2 },
		cols,
		rows
	};
}

// ---- parts ----

/**
 * The empty pockets at the maze's sides (void tiles between the outer wall and the edge, two
 * rows or more tall): their centres in tiles, where a cyst fills them.
 */
function sidePockets(S: GridMatrix, cols: number, rows: number): Array<readonly [number, number]> {
	const out: Array<readonly [number, number]> = [];
	for (const side of [0, 1]) {
		const run = (rr: number): number => {
			let n = 0;
			while (n < cols && S[rr][side ? cols - 1 - n : n] === 'ES') {
				n += 1;
			}
			return n;
		};
		let r = 1;
		while (r < rows - 1) {
			const n = run(r);
			if (n < 3 || n >= cols - 2) {
				r += 1;
				continue;
			}
			let r1 = r;
			while (r1 + 1 < rows - 1 && run(r1 + 1) === n) {
				r1 += 1;
			}
			if (r1 > r) {
				out.push([side ? cols - n / 2 : n / 2, (r + r1 + 1) / 2]);
			}
			r = r1 + 1;
		}
	}
	return out;
}

/** A quiet tile: faint fibres on the flow of the ground and a few pores, nothing that shouts. */
function paintQuiet(tp: CanvasRenderingContext2D, X3: number, Y3: number, rw: Rng): void {
	const T = SCENE_TILE;
	tp.save();
	tp.lineCap = 'round';
	fibres(tp, 16, rw, X3 - 4, Y3 - 4, T + 8, T + 8, 'rgba(14,3,8,.16)', 'rgba(190,90,80,.1)');
	for (let i = 0; i < 4; i += 1) {
		const px = X3 + 3 + rw() * (T - 6);
		const py = Y3 + 3 + rw() * (T - 6);
		tp.fillStyle = 'rgba(0,0,0,.22)';
		tp.beginPath();
		tp.arc(px + 0.8, py + 1, 1.8 + rw() * 2, 0, 7);
		tp.fill();
		tp.fillStyle = 'rgba(210,120,110,.12)';
		tp.beginPath();
		tp.arc(px - 0.6, py - 0.8, 1.4 + rw() * 1.6, 0, 7);
		tp.fill();
	}
	tp.restore();
}

/** A swelling: lumpy, dark rim, veined, with a wet gloss. */
function cystSprite(R: number): HTMLCanvasElement {
	const S = Math.ceil(R * 2 + 36);
	const c = makeCanvas(S, S);
	const x = context(c);
	const cx = S / 2;
	const cy = S / 2;
	const r = rng(Math.round(R * 31));
	const lumps: Array<readonly [number, number, number]> = [];
	for (let k = 0; k < 7; k += 1) {
		const la = r() * 6.2832;
		lumps.push([Math.cos(la) * R * 0.62, Math.sin(la) * R * 0.62, R * (0.42 + r() * 0.22)]);
	}
	const blob = (grow: number): void => {
		x.beginPath();
		x.arc(cx, cy, R + grow, 0, 7);
		for (const l of lumps) {
			x.moveTo(cx + l[0] + l[2] + grow, cy + l[1]);
			x.arc(cx + l[0], cy + l[1], l[2] + grow, 0, 7);
		}
	};
	x.fillStyle = 'rgba(0,0,0,.5)';
	x.save();
	x.translate(3, 6);
	blob(5);
	x.fill();
	x.restore();
	x.fillStyle = '#4a1c22';
	blob(7);
	x.fill();
	x.fillStyle = PAL.pit;
	blob(3);
	x.fill();
	const g = x.createRadialGradient(cx - R * 0.3, cy - R * 0.35, R * 0.1, cx, cy, R * 1.1);
	g.addColorStop(0, '#b8605a');
	g.addColorStop(0.5, '#7e2a2e');
	g.addColorStop(1, '#3a1015');
	x.fillStyle = g;
	blob(0);
	x.fill();
	x.save();
	blob(0);
	x.clip();
	for (let k = 0; k < 9; k += 1) {
		x.strokeStyle = rgbaOf(PAL.vein, 0.8);
		x.lineWidth = 1.2 + r() * 1.6;
		x.beginPath();
		const a = r() * 6.28;
		const rr = R * (0.1 + r() * 0.5);
		x.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
		x.quadraticCurveTo(
			cx + Math.cos(a + 1) * R * 0.9,
			cy + Math.sin(a + 1) * R * 0.9,
			cx + Math.cos(a + 2.2) * R * 1.1,
			cy + Math.sin(a + 2.2) * R * 1.1
		);
		x.stroke();
	}
	for (const l of lumps) {
		x.fillStyle = 'rgba(0,0,0,.18)';
		x.beginPath();
		x.arc(cx + l[0] + 2, cy + l[1] + 3, l[2] * 0.9, 0, 7);
		x.fill();
		x.fillStyle = 'rgba(255,215,200,.12)';
		x.beginPath();
		x.arc(cx + l[0] - 2, cy + l[1] - 2, l[2] * 0.55, 0, 7);
		x.fill();
	}
	x.restore();
	x.fillStyle = 'rgba(255,235,225,.38)';
	x.beginPath();
	x.ellipse(cx - R * 0.36, cy - R * 0.4, R * 0.26, R * 0.13, -0.7, 0, 7);
	x.fill();
	return c;
}

/** A skull set into the wall, its eyes alight. */
function paintSkull(
	tp: CanvasRenderingContext2D,
	ex: CanvasRenderingContext2D,
	cx: number,
	cy: number
): void {
	tp.fillStyle = '#12030a';
	tp.beginPath();
	tp.ellipse(cx, cy - 1, 12.5, 11.5, 0, 0, 7);
	tp.fill();
	tp.fillRect(cx - 6.5, cy + 6, 13, 7);
	tp.fillStyle = '#cdbca2';
	tp.beginPath();
	tp.ellipse(cx, cy - 1, 11, 10, 0, 0, 7);
	tp.fill();
	tp.fillRect(cx - 5, cy + 6, 10, 6);
	tp.fillStyle = '#efe2c8';
	tp.beginPath();
	tp.ellipse(cx - 3, cy - 5, 5, 3, -0.4, 0, 7);
	tp.fill();
	tp.fillStyle = '#12030a';
	tp.beginPath();
	tp.ellipse(cx - 4, cy, 3, 3.6, 0, 0, 7);
	tp.ellipse(cx + 4, cy, 3, 3.6, 0, 0, 7);
	tp.fill();
	tp.beginPath();
	tp.moveTo(cx, cy + 3);
	tp.lineTo(cx - 1.8, cy + 7);
	tp.lineTo(cx + 1.8, cy + 7);
	tp.fill();
	for (let tth = -3; tth <= 3; tth += 2) {
		tp.fillRect(cx + tth - 0.5, cy + 9, 1, 3);
	}
	ex.fillStyle = PAL.glowHot;
	ex.globalAlpha = 0.9;
	ex.beginPath();
	ex.arc(cx - 4, cy, 1.5, 0, 7);
	ex.arc(cx + 4, cy, 1.5, 0, 7);
	ex.fill();
	ex.globalAlpha = 1;
}

/** The lair's gate: bone bars over a burning slit, across the lair's exit tiles. */
function paintGate(
	S: GridMatrix,
	w: CanvasRenderingContext2D,
	ex: CanvasRenderingContext2D,
	cols: number,
	rows: number
): void {
	let c0 = cols;
	let c1 = -1;
	let r0 = rows;
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (S[r][c] === 'LE') {
				c0 = Math.min(c0, c);
				c1 = Math.max(c1, c);
				r0 = Math.min(r0, r);
			}
		}
	}
	if (c1 < 0) {
		return;
	}
	const T = SCENE_TILE;
	const gx0 = tx(c0);
	const gy0 = ty(r0) + 5;
	const gw = (c1 - c0 + 1) * T;
	const gh = T - 10;
	w.fillStyle = '#12030a';
	w.fillRect(gx0 - 1, gy0 - 1, gw + 2, gh + 2);
	ex.fillStyle = PAL.glow;
	ex.globalAlpha = 0.75;
	ex.fillRect(gx0 + 2, gy0 + 2, gw - 4, gh - 4);
	ex.globalAlpha = 1;
	for (let yy = 0; yy < 3; yy += 1) {
		const by = gy0 + 1 + yy * 7;
		w.fillStyle = '#12030a';
		w.fillRect(gx0, by - 1, gw, 6);
		w.fillStyle = PAL.boneDark;
		w.fillRect(gx0 + 1, by, gw - 2, 4);
		w.fillStyle = PAL.bone;
		w.fillRect(gx0 + 1, by, gw - 2, 2);
		w.fillStyle = 'rgba(255,246,224,.6)';
		w.fillRect(gx0 + 3, by, gw - 6, 1);
	}
}

/** The outline of a tall torn seam: ragged jaws that close towards both ends. */
function riftPoly(
	cx: number,
	cy: number,
	h: number,
	w: number,
	seed: number
): Array<readonly [number, number]> {
	const r = rng(seed);
	const n = 16;
	const left: Array<readonly [number, number]> = [];
	const right: Array<readonly [number, number]> = [];
	for (let k = 0; k <= n; k += 1) {
		const u = k / n;
		const env = Math.pow(Math.sin(Math.PI * u), 0.7);
		const jl = 0.7 + 0.6 * r();
		const jr = 0.7 + 0.6 * r();
		const y = cy - h / 2 + u * h;
		left.push([cx - w * env * jl, y]);
		right.push([cx + w * env * jr, y]);
	}
	return left.concat(right.reverse());
}

function polyPath(
	x: CanvasRenderingContext2D,
	pts: ReadonlyArray<readonly [number, number]>
): void {
	x.beginPath();
	pts.forEach((q, ii) => {
		if (ii) {
			x.lineTo(q[0], q[1]);
		} else {
			x.moveTo(q[0], q[1]);
		}
	});
	x.closePath();
}
