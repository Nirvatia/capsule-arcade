// The Zone's world, baked once: Pripyat seen from above. Grass and birches round a town of panel-block
// roofs (the maze's walls, one colour to a building, a parapet, hatches, vents, a few holes with trees
// growing out), asphalt streets with a worn centre line, cracks and puddles (the corridors), a paved
// plaza for the wheel (the lair). Like the hell's flesh scene it is painted in scene units (a tile is
// 32) and the roofs sit in the street: the light comes from the top left, the shadow falls down and
// right. Everything that moves is drawn live by `ZoneView`.
import type { GridMatrix } from '../../config/gridConfig';
import {
	blur,
	clipTo,
	context,
	dilate,
	edgeOf,
	fbm,
	makeCanvas,
	mixHex,
	moved,
	rng,
	threshold,
	tint,
	without
} from '../doom/fleshNoise';

export const ZONE_TILE = 32;
/** Tiles of ground round the maze. */
export const ZONE_MARGIN = 12;

const T = ZONE_TILE;
const M = ZONE_MARGIN;

const ROOFS = ['#b6af99', '#9ea4a4', '#a98a74', '#8f9f82', '#b8b09f', '#a3a79c'] as const;
const STREET = '#3d4248';

type Cv = HTMLCanvasElement;
type Ctx = CanvasRenderingContext2D;

export interface ZoneBake {
	/** The whole scene (ground, streets, roofs, shadows, trees), `(cols + 2 margin) x (rows + 2 margin)` tiles. */
	readonly scene: Cv;
	readonly cols: number;
	readonly rows: number;
}

const isWall = (S: GridMatrix, c: number, r: number): boolean => S[r]?.[c] === 'WL';
const isOutside = (S: GridMatrix, c: number, r: number): boolean => {
	const t = S[r]?.[c];
	return t === undefined || t === 'ES';
};
const isLair = (S: GridMatrix, c: number, r: number): boolean =>
	['LT', 'LE', 'BY', 'PY', 'IY', 'CE'].includes(S[r]?.[c] ?? '');

export function bakeZone(S: GridMatrix): ZoneBake {
	const rows = S.length;
	const cols = S[0].length;
	const W = (cols + 2 * M) * T;
	const H = (rows + 2 * M) * T;
	const scene = makeCanvas(W, H);
	const g = context(scene);
	const x0 = (c: number): number => (c + M) * T;
	const y0 = (r: number): number => (r + M) * T;

	const maskOf = (pred: (c: number, r: number) => boolean, grow: number): Cv => {
		const m = makeCanvas(W, H);
		const x = context(m);
		x.fillStyle = '#fff';
		for (let r = 0; r < rows; r += 1) {
			for (let c = 0; c < cols; c += 1) {
				if (pred(c, r)) {
					x.fillRect(x0(c) - grow, y0(r) - grow, T + 2 * grow, T + 2 * grow);
				}
			}
		}
		return threshold(blur(m, 3, true), 5);
	};
	const wallM = maskOf((c, r) => isWall(S, c, r), 0);
	const streetM = maskOf((c, r) => !isWall(S, c, r) && !isOutside(S, c, r), 0);

	paintGround(g, W, H);
	paintStreets(g, S, streetM, x0, y0, cols, rows);
	paintRoofs(g, S, wallM, x0, y0, cols, rows, W, H);
	paintTrees(g, S, x0, y0, cols, rows, W, H);
	return { scene, cols, rows };
}

/** The ground of the whole scene: mottled grass, dry patches, tufts. */
function paintGround(g: Ctx, W: number, H: number): void {
	const rw = rng(3);
	for (let y = 0; y < H; y += 8) {
		for (let x = 0; x < W; x += 8) {
			const n = fbm(x / 90, y / 90);
			const m = fbm(x / 28 + 9, y / 28 + 4);
			g.fillStyle = mixHex('#3f4f2c', '#62723f', Math.min(1, n * 1.1));
			g.fillRect(x, y, 8, 8);
			if (m > 0.6) {
				g.fillStyle = `rgba(122,112,60,${(m - 0.6) * 1.8})`;
				g.fillRect(x, y, 8, 8);
			}
		}
	}
	for (let i = 0; i < 1400; i += 1) {
		const x = rw() * W;
		const y = rw() * H;
		g.strokeStyle = rw() < 0.5 ? 'rgba(25,40,15,.35)' : 'rgba(150,165,90,.3)';
		g.lineWidth = 1;
		g.beginPath();
		g.moveTo(x, y);
		g.lineTo(x + (rw() - 0.5) * 4, y - 3 - rw() * 4);
		g.stroke();
	}
}

/** Asphalt: the streets, a worn centre line, cracks with weeds, puddles, leaves. */
function paintStreets(
	g: Ctx,
	S: GridMatrix,
	streetM: Cv,
	x0: (c: number) => number,
	y0: (r: number) => number,
	cols: number,
	rows: number
): void {
	const asphalt = makeCanvas(streetM.width, streetM.height);
	const a = context(asphalt);
	a.fillStyle = STREET;
	a.fillRect(0, 0, asphalt.width, asphalt.height);
	for (let y = 0; y < asphalt.height; y += 6) {
		for (let x = 0; x < asphalt.width; x += 6) {
			const n = fbm(x / 40 + 3, y / 40);
			a.fillStyle =
				n > 0.5 ? `rgba(255,255,255,${(n - 0.5) * 0.1})` : `rgba(0,0,0,${(0.5 - n) * 0.16})`;
			a.fillRect(x, y, 6, 6);
		}
	}
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (isOutside(S, c, r) || isWall(S, c, r)) {
				continue;
			}
			const X = x0(c);
			const Y = y0(r);
			if (isLair(S, c, r)) {
				// the plaza: pale paving, plain
				a.fillStyle = '#585c5c';
				a.fillRect(X, Y, T, T);
			}
		}
	}
	g.drawImage(clipTo(asphalt, dilate(streetM, 1)), 0, 0);
	// a curb: a light edge on the street's rim, inside the street (the width is not touched)
	const curb = clipTo(tint(edgeOf(streetM, -1.6, -1.6), 'rgba(205,205,190,.28)'), streetM);
	g.drawImage(curb, 0, 0);
}

/** The roofs: one colour to a building, panels, hatches, vents, holes; a parapet; the shadow on the street. */
function paintRoofs(
	g: Ctx,
	S: GridMatrix,
	wallM: Cv,
	x0: (c: number) => number,
	y0: (r: number) => number,
	cols: number,
	rows: number,
	W: number,
	H: number
): void {
	// the buildings: 4-connected islands of wall tiles
	const island = new Map<string, number>();
	let count = 0;
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (!isWall(S, c, r) || island.has(`${c},${r}`)) {
				continue;
			}
			const q: Array<[number, number]> = [[c, r]];
			island.set(`${c},${r}`, count);
			for (let i = 0; i < q.length; i += 1) {
				for (const [dc, dr] of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1]
				]) {
					const nc = q[i][0] + dc;
					const nr = q[i][1] + dr;
					if (isWall(S, nc, nr) && !island.has(`${nc},${nr}`)) {
						island.set(`${nc},${nr}`, count);
						q.push([nc, nr]);
					}
				}
			}
			count += 1;
		}
	}
	// the shadow first: long on the street (down and right), a tight crease at the foot
	const shadow = (dx: number, dy: number, steps: number, alpha: number): void => {
		g.globalAlpha = alpha;
		g.drawImage(without(blur(moved(tint(wallM, '#05070a'), dx, dy), steps, true), wallM), 0, 0);
		g.globalAlpha = 1;
	};
	shadow(7, 9, 3, 0.55);
	shadow(0, 0, 2, 0.5);

	const roof = makeCanvas(W, H);
	const p = context(roof);
	for (let r = 0; r < rows; r += 1) {
		for (let c = 0; c < cols; c += 1) {
			if (!isWall(S, c, r)) {
				continue;
			}
			const X = x0(c);
			const Y = y0(r);
			const id = island.get(`${c},${r}`) ?? 0;
			const base = ROOFS[id % ROOFS.length];
			p.fillStyle = base;
			p.fillRect(X - 1, Y - 1, T + 2, T + 2);
			// panel joints, faint
			p.fillStyle = 'rgba(30,28,22,.12)';
			if (isWall(S, c + 1, r)) {
				p.fillRect(X + T - 1, Y, 1, T);
			}
			if (isWall(S, c, r + 1)) {
				p.fillRect(X, Y + T - 1, T, 1);
			}
		}
	}
	g.drawImage(clipTo(roof, wallM), 0, 0);
	// the parapet: a light rim on the lit sides, a dark one on the far sides, a dark outline round it
	g.drawImage(clipTo(tint(edgeOf(wallM, 2.4, 2.4), 'rgba(255,252,235,.5)'), wallM), 0, 0);
	g.drawImage(clipTo(tint(edgeOf(wallM, -2.4, -2.4), 'rgba(20,18,14,.45)'), wallM), 0, 0);
	const ring = makeCanvas(W, H);
	const rx = context(ring);
	for (let k = 0; k < 8; k += 1) {
		rx.drawImage(
			edgeOf(wallM, Math.cos((k / 8) * 6.2832) * 3, Math.sin((k / 8) * 6.2832) * 3),
			0,
			0
		);
	}
	g.drawImage(clipTo(tint(ring, 'rgba(18,16,12,.9)'), wallM), 0, 0);
}

function crown(p: Ctx, x: number, y: number, r: number, dark: string, light: string): void {
	p.fillStyle = 'rgba(5,8,4,.32)';
	p.beginPath();
	p.arc(x + r * 0.35, y + r * 0.45, r, 0, 7);
	p.fill();
	p.fillStyle = dark;
	p.beginPath();
	p.arc(x, y, r, 0, 7);
	p.fill();
	p.fillStyle = light;
	for (let k = 0; k < 5; k += 1) {
		const an = k * 1.3 + x;
		p.beginPath();
		p.arc(
			x + Math.cos(an) * r * 0.45 - r * 0.15,
			y + Math.sin(an) * r * 0.4 - r * 0.15,
			r * 0.34,
			0,
			7
		);
		p.fill();
	}
	p.strokeStyle = 'rgba(15,24,10,.55)';
	p.lineWidth = 1;
	p.beginPath();
	p.arc(x, y, r, 0, 7);
	p.stroke();
}

/** Birches and a few pines on the ground outside the maze (the margin and the pockets). */
function paintTrees(
	g: Ctx,
	S: GridMatrix,
	x0: (c: number) => number,
	y0: (r: number) => number,
	cols: number,
	rows: number,
	W: number,
	H: number
): void {
	const rw = rng(41);
	for (let y = 14; y < H; y += 30) {
		for (let x = 14; x < W; x += 30) {
			const px = x + (rw() - 0.5) * 18;
			const py = y + (rw() - 0.5) * 18;
			const c = Math.floor((px - x0(0)) / T);
			const r = Math.floor((py - y0(0)) / T);
			const outside = c < 0 || r < 0 || c >= cols || r >= rows || isOutside(S, c, r);
			if (!outside || rw() < 0.55) {
				continue;
			}
			// keep a strip of ground clear along the roofs so the trees do not climb on them
			const near = [-1, 0, 1].some((dc) =>
				[-1, 0, 1].some(
					(dr) =>
						isWall(S, c + dc, r + dr) &&
						Math.hypot(px - (x0(c + dc) + T / 2), py - (y0(r + dr) + T / 2)) < T * 0.95
				)
			);
			if (near) {
				continue;
			}
			const pine = rw() < 0.28;
			const R = 8 + rw() * 6;
			if (pine) {
				crown(g, px, py, R, '#2b4630', '#3e6a44');
			} else {
				crown(g, px, py, R, '#6f8a38', '#9db853');
			}
		}
	}
}
