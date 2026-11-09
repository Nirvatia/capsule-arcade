// Prototype: three candidate food sets (pellet + energizer) per season. Textures are painted
// the way the themes paint theirs (`makeTexture`, units of the world: a tile is ~25 units,
// a pellet 10, an energizer 26), so a chosen set moves into the season's `live` theme as it is.
// The idea: an energizer is an OBJECT (an orb, a gem, a star, a lantern, a rune stone), never
// something that looks edible, and it reads at a glance against the fruit.
import {
	lazy,
	makeTexture
} from '../../../src/games/pacman/render/seasons/meadow/meadowSprites';

type Ctx = CanvasRenderingContext2D;
type Tex = () => HTMLCanvasElement;
const TAU = Math.PI * 2;

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface FoodSet {
	readonly name: string;
	readonly note: string;
	readonly pellet: { readonly texture: Tex; readonly size: number };
	readonly energizer: {
		readonly texture: Tex;
		readonly size: number;
		readonly glow: number;
		readonly glowSize: number;
		readonly motion: 'spin' | 'sway';
	};
}

const disc = (x: Ctx, cx: number, cy: number, r: number): void => {
	x.beginPath();
	x.arc(cx, cy, r, 0, TAU);
};
const outline = (x: Ctx, color: string, width: number): void => {
	x.strokeStyle = color;
	x.lineWidth = width;
	x.lineJoin = 'round';
	x.stroke();
};
function starPath(x: Ctx, points: number, outer: number, inner: number, rot = 0): void {
	x.beginPath();
	for (let i = 0; i < points * 2; i++) {
		const a = rot + (i * Math.PI) / points - Math.PI / 2;
		const r = i % 2 ? inner : outer;
		if (i) x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
		else x.moveTo(Math.cos(a) * r, Math.sin(a) * r);
	}
	x.closePath();
}
function polygon(x: Ctx, sides: number, radius: number, rot = 0): Array<[number, number]> {
	const pts: Array<[number, number]> = [];
	for (let i = 0; i < sides; i++) {
		const a = rot + (i * TAU) / sides - Math.PI / 2;
		pts.push([Math.cos(a) * radius, Math.sin(a) * radius]);
	}
	x.beginPath();
	pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
	x.closePath();
	return pts;
}

// ── pellets (10 × 10 units) ─────────────────────────────────────────────────────────────

interface BeadColors {
	readonly hi: string;
	readonly mid: string;
	readonly lo: string;
	readonly rim: string;
}
/** A small round bead with a soft shadow, a light centre and a dark rim. */
const bead = (c: BeadColors, r = 2.6): Tex =>
	lazy(() =>
		makeTexture(10, 10, (x) => {
			x.translate(5, 5);
			x.fillStyle = 'rgba(0,0,0,.28)';
			disc(x, 0.5, 0.7, r + 0.1);
			x.fill();
			const g = x.createRadialGradient(-r * 0.3, -r * 0.35, 0.2, 0, 0, r);
			g.addColorStop(0, c.hi);
			g.addColorStop(0.55, c.mid);
			g.addColorStop(1, c.lo);
			x.fillStyle = g;
			disc(x, 0, 0, r);
			x.fill();
			outline(x, c.rim, 0.7);
		})
	);

/** A tiny four-point sparkle. */
const spark = (core: string, mid: string, rimColor: string): Tex =>
	lazy(() =>
		makeTexture(10, 10, (x) => {
			x.translate(5, 5);
			starPath(x, 4, 4.2, 1.1);
			x.fillStyle = mid;
			x.fill();
			outline(x, rimColor, 0.7);
			disc(x, 0, 0, 1.3);
			x.fillStyle = core;
			x.fill();
		})
	);

/** A single petal, tilted. */
const petal = (hi: string, lo: string, rimColor: string): Tex =>
	lazy(() =>
		makeTexture(10, 10, (x) => {
			x.translate(5, 5);
			x.rotate(-0.6);
			const g = x.createLinearGradient(-3, 0, 3, 0);
			g.addColorStop(0, hi);
			g.addColorStop(1, lo);
			x.fillStyle = g;
			x.beginPath();
			x.ellipse(0, 0, 3.3, 2.1, 0, 0, TAU);
			x.fill();
			outline(x, rimColor, 0.7);
		})
	);

/** A small cut diamond. */
const diamond = (hi: string, lo: string, rimColor: string): Tex =>
	lazy(() =>
		makeTexture(10, 10, (x) => {
			x.translate(5, 5);
			x.beginPath();
			x.moveTo(0, -3.8);
			x.lineTo(2.6, 0);
			x.lineTo(0, 3.8);
			x.lineTo(-2.6, 0);
			x.closePath();
			const g = x.createLinearGradient(-2, -3, 2, 3);
			g.addColorStop(0, hi);
			g.addColorStop(1, lo);
			x.fillStyle = g;
			x.fill();
			outline(x, rimColor, 0.7);
			x.beginPath();
			x.moveTo(0, -3.8);
			x.lineTo(0, 3.8);
			x.strokeStyle = 'rgba(255,255,255,.55)';
			x.lineWidth = 0.4;
			x.stroke();
		})
	);

// ── energizers (26 × 26 units) ──────────────────────────────────────────────────────────

interface OrbColors {
	readonly hi: string;
	readonly mid: string;
	readonly lo: string;
	readonly rim: string;
}
/** A glass orb: shadow, tinted body, dark rim, two reflections; `inner` paints inside it. */
const orb = (c: OrbColors, inner?: (x: Ctx) => void, base?: string): Tex =>
	lazy(() =>
		makeTexture(26, 26, (x) => {
			x.translate(13, base ? 11 : 13);
			const r = 9.6;
			x.fillStyle = 'rgba(0,0,0,.3)';
			x.beginPath();
			x.ellipse(0.6, r + 1.2 + (base ? 2 : 0), r * 0.8, 1.7, 0, 0, TAU);
			x.fill();
			if (base) {
				x.fillStyle = base;
				x.beginPath();
				x.roundRect(-6.2, r - 2.6, 12.4, 4.6, 1.4);
				x.fill();
				outline(x, '#14243a', 1.1);
			}
			const g = x.createRadialGradient(-3, -3.6, 0.8, 0, 0, r);
			g.addColorStop(0, c.hi);
			g.addColorStop(0.55, c.mid);
			g.addColorStop(1, c.lo);
			x.fillStyle = g;
			disc(x, 0, 0, r);
			x.fill();
			if (inner) {
				x.save();
				disc(x, 0, 0, r - 0.8);
				x.clip();
				inner(x);
				x.restore();
			}
			disc(x, 0, 0, r);
			outline(x, c.rim, 1.4);
			x.fillStyle = 'rgba(255,255,255,.85)';
			x.beginPath();
			x.ellipse(-3.6, -4.6, 3.3, 1.8, -0.7, 0, TAU);
			x.fill();
			x.fillStyle = 'rgba(255,255,255,.3)';
			disc(x, 4, 4.6, 1.2);
			x.fill();
		})
	);

/** A faceted gem; the facets are shaded by where they face (light from the top left). */
const gem = (
	sides: number,
	c: { mid: string; table: string; rim: string },
	rot = 0
): Tex =>
	lazy(() =>
		makeTexture(26, 26, (x) => {
			x.translate(13, 13);
			const R = 10.8;
			x.fillStyle = 'rgba(0,0,0,.28)';
			polygon(x, sides, R, rot);
			x.save();
			x.translate(0.6, 1.2);
			x.fill();
			x.restore();
			const outer = polygon(x, sides, R, rot);
			x.fillStyle = c.mid;
			x.fill();
			outer.forEach(([px, py], i) => {
				const [qx, qy] = outer[(i + 1) % sides];
				const ang = Math.atan2((py + qy) / 2, (px + qx) / 2);
				const lit = Math.cos(ang + (3 * Math.PI) / 4);
				x.beginPath();
				x.moveTo(0, 0);
				x.lineTo(px, py);
				x.lineTo(qx, qy);
				x.closePath();
				if (lit > 0.25) x.fillStyle = `rgba(255,255,255,${(lit * 0.5).toFixed(2)})`;
				else if (lit < -0.25) x.fillStyle = `rgba(0,0,20,${(-lit * 0.38).toFixed(2)})`;
				else x.fillStyle = 'rgba(255,255,255,0)';
				x.fill();
			});
			polygon(x, sides, R * 0.5, rot);
			x.fillStyle = c.table;
			x.fill();
			outline(x, 'rgba(255,255,255,.55)', 0.6);
			polygon(x, sides, R, rot);
			outline(x, c.rim, 1.4);
			x.save();
			x.translate(-4.2, -4.6);
			starPath(x, 4, 2.6, 0.6);
			x.fillStyle = '#ffffff';
			x.fill();
			x.restore();
		})
	);

/** A big four-point star with a small diagonal one behind it and a hot core. */
const star = (c: { core: string; mid: string; lo: string; rim: string }): Tex =>
	lazy(() =>
		makeTexture(26, 26, (x) => {
			x.translate(13, 13);
			x.lineJoin = 'round';
			starPath(x, 4, 7.4, 2.4, Math.PI / 4);
			x.fillStyle = c.mid;
			x.fill();
			outline(x, c.rim, 1.3);
			starPath(x, 4, 12, 3.3);
			const g = x.createRadialGradient(0, 0, 0.5, 0, 0, 12);
			g.addColorStop(0, c.core);
			g.addColorStop(0.4, c.mid);
			g.addColorStop(1, c.lo);
			x.fillStyle = g;
			x.fill();
			outline(x, c.rim, 1.5);
			disc(x, 0, 0, 2.6);
			x.fillStyle = c.core;
			x.fill();
		})
	);

/** A disc with eight pointed rays (the summer sun's build), in any palette. */
const sunDisc = (c: { ray: string; hi: string; mid: string; lo: string; rim: string }): Tex =>
	lazy(() =>
		makeTexture(26, 26, (x) => {
			x.translate(13, 13);
			const rays = (): void => {
				x.beginPath();
				for (let i = 0; i < 8; i++) {
					const a = (i * Math.PI) / 4;
					const side = Math.PI / 10;
					x.moveTo(Math.cos(a - side) * 6.2, Math.sin(a - side) * 6.2);
					x.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
					x.lineTo(Math.cos(a + side) * 6.2, Math.sin(a + side) * 6.2);
					x.closePath();
				}
			};
			x.lineJoin = 'round';
			rays();
			x.fillStyle = c.ray;
			x.fill();
			outline(x, c.rim, 1.5);
			disc(x, 0, 0, 6.6);
			outline(x, c.rim, 1.5);
			const g = x.createRadialGradient(-1.6, -1.8, 0.4, 0, 0, 6.6);
			g.addColorStop(0, c.hi);
			g.addColorStop(0.5, c.mid);
			g.addColorStop(1, c.lo);
			x.fillStyle = g;
			disc(x, 0, 0, 6.6);
			x.fill();
			disc(x, 0, 0, 3.2);
			outline(x, 'rgba(255,255,255,.7)', 0.7);
		})
	);

/** A six-armed snowflake with a dark blue outline, so it holds on pale snow. */
const snowflake: Tex = lazy(() =>
	makeTexture(26, 26, (x) => {
		x.translate(13, 13);
		x.lineCap = 'round';
		const arms = (): void => {
			x.beginPath();
			for (let i = 0; i < 6; i++) {
				const a = (i * Math.PI) / 3;
				const dx = Math.cos(a);
				const dy = Math.sin(a);
				x.moveTo(0, 0);
				x.lineTo(dx * 11, dy * 11);
				for (const [at, len] of [
					[6.6, 4.2],
					[9, 2.4]
				]) {
					for (const s of [-1, 1]) {
						const b = a + s * (Math.PI / 3);
						x.moveTo(dx * at, dy * at);
						x.lineTo(dx * at + Math.cos(b) * len, dy * at + Math.sin(b) * len);
					}
				}
			}
		};
		arms();
		x.strokeStyle = '#1d4a78';
		x.lineWidth = 3.8;
		x.stroke();
		polygon(x, 6, 3.2);
		outline(x, '#1d4a78', 2.2);
		arms();
		x.strokeStyle = '#eaf8ff';
		x.lineWidth = 1.9;
		x.stroke();
		polygon(x, 6, 3.2);
		x.fillStyle = '#ffffff';
		x.fill();
	})
);

/** A paper lantern: ribbed glowing body, dark caps, a tassel. */
const lantern = (c: { hi: string; mid: string; lo: string; rim: string; cap: string }): Tex =>
	lazy(() =>
		makeTexture(26, 26, (x) => {
			x.translate(13, 12);
			x.fillStyle = 'rgba(0,0,0,.28)';
			x.beginPath();
			x.ellipse(0.6, 11.6, 7, 1.6, 0, 0, TAU);
			x.fill();
			x.strokeStyle = c.rim;
			x.lineWidth = 1;
			x.beginPath();
			x.moveTo(0, -12);
			x.lineTo(0, -9);
			x.stroke();
			const g = x.createRadialGradient(0, 0, 0.5, 0, 0, 9.5);
			g.addColorStop(0, c.hi);
			g.addColorStop(0.55, c.mid);
			g.addColorStop(1, c.lo);
			x.fillStyle = g;
			x.beginPath();
			x.ellipse(0, 0, 8.4, 9, 0, 0, TAU);
			x.fill();
			x.strokeStyle = 'rgba(80,15,0,.45)';
			x.lineWidth = 0.8;
			for (const k of [0.38, 0.75]) {
				x.beginPath();
				x.ellipse(0, 0, 8.4 * k, 9, 0, 0, TAU);
				x.stroke();
			}
			x.beginPath();
			x.ellipse(0, 0, 8.4, 9, 0, 0, TAU);
			outline(x, c.rim, 1.4);
			x.fillStyle = c.cap;
			for (const y of [-10.6, 8.2]) {
				x.beginPath();
				x.roundRect(-4.4, y, 8.8, 2.6, 1);
				x.fill();
				outline(x, c.rim, 0.9);
			}
			x.strokeStyle = c.cap;
			x.lineWidth = 1.2;
			x.beginPath();
			x.moveTo(0, 10.8);
			x.lineTo(0, 12.6);
			x.stroke();
			x.fillStyle = 'rgba(255,255,255,.5)';
			x.beginPath();
			x.ellipse(-3.2, -3.4, 1.8, 3.2, 0.3, 0, TAU);
			x.fill();
		})
	);

/** A dark standing stone with a glowing rune. */
const runeStone = (c: { rune: string; hi: string; mid: string; lo: string }): Tex =>
	lazy(() =>
		makeTexture(26, 26, (x) => {
			x.translate(13, 13);
			x.lineJoin = 'round';
			const stone = (): void => {
				x.beginPath();
				const pts: Array<[number, number]> = [
					[-3, -11.4],
					[5.6, -10],
					[10, -2],
					[8, 8],
					[1, 11.6],
					[-8, 9],
					[-10.4, -1],
					[-8, -8]
				];
				pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py)));
				x.closePath();
			};
			x.fillStyle = 'rgba(0,0,0,.3)';
			x.save();
			x.translate(0.7, 1.3);
			stone();
			x.fill();
			x.restore();
			stone();
			const g = x.createLinearGradient(-8, -10, 8, 10);
			g.addColorStop(0, c.hi);
			g.addColorStop(0.5, c.mid);
			g.addColorStop(1, c.lo);
			x.fillStyle = g;
			x.fill();
			outline(x, '#120a1c', 1.5);
			x.save();
			x.shadowColor = c.rune;
			x.shadowBlur = 5;
			x.strokeStyle = c.rune;
			x.lineWidth = 1.8;
			x.lineCap = 'round';
			x.beginPath();
			x.moveTo(-1, -6.4);
			x.lineTo(-1, 6.6);
			x.moveTo(-1, -6.4);
			x.lineTo(4.6, -1.6);
			x.lineTo(-1, 2.4);
			x.moveTo(-1, 1);
			x.lineTo(4.4, 6.6);
			x.stroke();
			x.restore();
			x.strokeStyle = '#ffffff';
			x.globalAlpha = 0.9;
			x.lineWidth = 0.6;
			x.beginPath();
			x.moveTo(-1, -5);
			x.lineTo(-1, 5);
			x.stroke();
			x.globalAlpha = 1;
		})
	);

// Things painted inside an orb.
const innerFlower = (x: Ctx): void => {
	for (let i = 0; i < 5; i++) {
		x.save();
		x.rotate((i * TAU) / 5);
		x.fillStyle = '#fff6fb';
		x.strokeStyle = '#c0457f';
		x.lineWidth = 0.6;
		x.beginPath();
		x.ellipse(0, -3.2, 1.9, 3, 0, 0, TAU);
		x.fill();
		x.stroke();
		x.restore();
	}
	disc(x, 0, 0, 1.7);
	x.fillStyle = '#ffd54a';
	x.fill();
};
const innerBolt = (x: Ctx): void => {
	x.beginPath();
	x.moveTo(1.6, -7);
	x.lineTo(-3.6, 0.8);
	x.lineTo(-0.4, 0.8);
	x.lineTo(-2.2, 7.4);
	x.lineTo(4, -1.4);
	x.lineTo(0.8, -1.4);
	x.closePath();
	x.fillStyle = '#fffbd6';
	x.fill();
	outline(x, '#b8590a', 0.8);
};
const innerFlame = (x: Ctx): void => {
	x.beginPath();
	x.moveTo(0, -7);
	x.bezierCurveTo(5.4, -1.6, 5, 6, 0, 6.6);
	x.bezierCurveTo(-5, 6, -5.4, -1.6, 0, -7);
	x.fillStyle = '#ffd24a';
	x.fill();
	x.beginPath();
	x.moveTo(0, -1.6);
	x.bezierCurveTo(2.6, 1.6, 2.2, 5, 0, 5.2);
	x.bezierCurveTo(-2.2, 5, -2.6, 1.6, 0, -1.6);
	x.fillStyle = '#fffbe0';
	x.fill();
};
const innerFlakes = (x: Ctx): void => {
	x.fillStyle = '#ffffff';
	for (const [px, py, r] of [
		[-4, -3, 1],
		[3, -4.4, 0.8],
		[-1, 0.4, 0.9],
		[4.4, 1.6, 1],
		[-4.6, 3.6, 0.8],
		[1, 5, 0.9]
	]) {
		disc(x, px, py, r);
		x.fill();
	}
};

// ── the sets ────────────────────────────────────────────────────────────────────────────

const GLOW = 21;

export const FOOD: Record<Season, FoodSet[]> = {
	spring: [
		{
			name: 'A · Роса и шар',
			note: 'капля росы · стеклянный шар с цветком',
			pellet: {
				texture: bead({ hi: '#ffffff', mid: '#cfeeff', lo: '#7fb6e0', rim: '#3d78a8' }),
				size: 10
			},
			energizer: {
				texture: orb(
					{ hi: '#ffd1ea', mid: '#ff7fbf', lo: '#c23c86', rim: '#7a1c52' },
					innerFlower
				),
				size: 26,
				glow: 0xff6fbf,
				glowSize: GLOW,
				motion: 'sway'
			}
		},
		{
			name: 'B · Пыльца и звезда',
			note: 'зёрнышко пыльцы · розово-золотая звезда',
			pellet: {
				texture: bead({ hi: '#fffbe0', mid: '#ffe88a', lo: '#f0b93a', rim: '#a0701a' }, 2.4),
				size: 10
			},
			energizer: {
				texture: star({ core: '#fff4c8', mid: '#ff7fb6', lo: '#d6397f', rim: '#7a1c52' }),
				size: 26,
				glow: 0xff7fb6,
				glowSize: GLOW,
				motion: 'spin'
			}
		},
		{
			name: 'C · Лепесток и камень',
			note: 'белый лепесток · розовый кварц',
			pellet: { texture: petal('#ffffff', '#ffc2dc', '#c0457f'), size: 10 },
			energizer: {
				texture: gem(6, { mid: '#ff8fc4', table: '#ffd1e8', rim: '#8a2860' }, 0),
				size: 26,
				glow: 0xff9fd0,
				glowSize: GLOW,
				motion: 'sway'
			}
		}
	],
	summer: [
		{
			name: 'A · Искра и молния',
			note: 'жёлтая искорка · оранжевый шар с молнией',
			pellet: { texture: spark('#ffffff', '#ffd23a', '#b8590a'), size: 10 },
			energizer: {
				texture: orb({ hi: '#ffe9a0', mid: '#ff9a2e', lo: '#d2501a', rim: '#7a2a08' }, innerBolt),
				size: 26,
				glow: 0xffa733,
				glowSize: GLOW,
				motion: 'sway'
			}
		},
		{
			name: 'B · Жемчуг и аквамарин',
			note: 'жемчужина · бирюзовый кристалл',
			pellet: {
				texture: bead({ hi: '#ffffff', mid: '#f6e6f0', lo: '#cfa6c4', rim: '#8a5a80' }),
				size: 10
			},
			energizer: {
				texture: gem(8, { mid: '#35d6c4', table: '#a8f5ea', rim: '#0b5d62' }, Math.PI / 8),
				size: 26,
				glow: 0x6ff5da,
				glowSize: GLOW,
				motion: 'sway'
			}
		},
		{
			name: 'C · Пена и солнце',
			note: 'капля пены · красное солнце с лучами',
			pellet: {
				texture: bead({ hi: '#ffffff', mid: '#e6f6ff', lo: '#9fd0ea', rim: '#3a7aa0' }, 2.4),
				size: 10
			},
			energizer: {
				texture: sunDisc({
					ray: '#ff6a2a',
					hi: '#fff0b8',
					mid: '#ffc23a',
					lo: '#ff7a1f',
					rim: '#7a2208'
				}),
				size: 26,
				glow: 0xff8a3a,
				glowSize: GLOW,
				motion: 'spin'
			}
		}
	],
	autumn: [
		{
			name: 'A · Уголёк и фонарь',
			note: 'тлеющий уголёк · бумажный фонарик',
			pellet: {
				texture: bead({ hi: '#fff0a8', mid: '#ff9a3a', lo: '#d2401a', rim: '#6a1a08' }, 2.5),
				size: 10
			},
			energizer: {
				texture: lantern({
					hi: '#fff0b0',
					mid: '#ff8a2a',
					lo: '#c8341a',
					rim: '#4a1208',
					cap: '#3a1c10'
				}),
				size: 26,
				glow: 0xff7a2a,
				glowSize: GLOW,
				motion: 'sway'
			}
		},
		{
			name: 'B · Янтарь и руна',
			note: 'янтарная бусина · камень с огненной руной',
			pellet: {
				texture: bead({ hi: '#fff1b0', mid: '#f0b03a', lo: '#b8661a', rim: '#6a3408' }),
				size: 10
			},
			energizer: {
				texture: runeStone({ rune: '#ff9a3a', hi: '#6a4a86', mid: '#3a2a52', lo: '#1c1230' }),
				size: 26,
				glow: 0xff8a3a,
				glowSize: GLOW,
				motion: 'sway'
			}
		},
		{
			name: 'C · Зёрнышко и огненный шар',
			note: 'золотое зёрнышко · стеклянный шар с пламенем',
			pellet: {
				texture: bead({ hi: '#fff6c8', mid: '#e8c04a', lo: '#a07a1a', rim: '#5a3e08' }, 2.4),
				size: 10
			},
			energizer: {
				texture: orb({ hi: '#ffb98a', mid: '#e8502a', lo: '#8a1a14', rim: '#3a0a08' }, innerFlame),
				size: 26,
				glow: 0xff5a2a,
				glowSize: GLOW,
				motion: 'sway'
			}
		}
	],
	winter: [
		{
			name: 'A · Снежинка',
			note: 'снежная бусина · резная снежинка',
			pellet: {
				texture: bead({ hi: '#ffffff', mid: '#eef6ff', lo: '#a8c4e0', rim: '#4a76a0' }),
				size: 10
			},
			energizer: {
				texture: snowflake,
				size: 26,
				glow: 0x7fd8ff,
				glowSize: GLOW,
				motion: 'spin'
			}
		},
		{
			name: 'B · Лёд и снежный шар',
			note: 'ледяной ромбик · шар со снегом на подставке',
			pellet: { texture: diamond('#ffffff', '#7fc4f0', '#2a6aa0'), size: 10 },
			energizer: {
				texture: orb(
					{ hi: '#f2fbff', mid: '#9fd8ff', lo: '#4a90d0', rim: '#1d4a78' },
					innerFlakes,
					'#3a5a86'
				),
				size: 26,
				glow: 0x8fd8ff,
				glowSize: GLOW,
				motion: 'sway'
			}
		},
		{
			name: 'C · Сияние и кристалл',
			note: 'голубая искорка · сине-фиолетовый кристалл',
			pellet: { texture: spark('#ffffff', '#7ff0ff', '#1d7a9a'), size: 10 },
			energizer: {
				texture: gem(6, { mid: '#6a8cff', table: '#c8d8ff', rim: '#1d2a7a' }, Math.PI / 6),
				size: 26,
				glow: 0x8aa8ff,
				glowSize: GLOW,
				motion: 'sway'
			}
		}
	]
};
