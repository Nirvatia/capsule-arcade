// Spring as a Japanese garden (the owner's pick, 2026-11-23): the walls are garden walls of cream
// plaster with a dark roof-tile edge (the scene's wall dress, clipped to their silhouette, the
// corners' rounding kept), the corridors raked grey gravel with the lines running along the way,
// the lair a wooden deck, a gutter of dark river pebbles along the walls' feet, stone toro
// lanterns and koi in the pond. Light from the upper left.
import type { MeadowFrame } from '../meadow/MeadowBake';
import type { MeadowPathCell } from '../meadow/MeadowTheme';
import { TAU, addLight, hash, rng, spot, wallClip } from '../meadow/seasonScene';
import type { SceneLit } from '../meadow/seasonScene';
import { greenFoot } from '../meadow/wallFlora';
import { WORLD_TILE } from '../../common/worldDecor';

const T = WORLD_TILE;
export const GRAVEL = '#6f6c66';
const TILE = '#3c4048';
const PLASTER = '#efe6d4';

/** The corridor: raked gravel, the rake's lines along the way (across a junction, none). */
export function gardenFloor(f: MeadowFrame, cell: MeadowPathCell): void {
	const { b, isW } = f;
	const { x, y, r, c, k } = cell;
	b.fillStyle = GRAVEL;
	b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
	// the grain of the gravel
	for (let i = 0; i < 26; i += 1) {
		b.fillStyle = i % 2 ? 'rgba(255,255,255,.16)' : 'rgba(30,28,24,.16)';
		b.beginPath();
		b.arc(x + k() * T, y + k() * T, 0.35 + k() * 0.45, 0, TAU);
		b.fill();
	}
	const hz = !isW(r, c - 1) || !isW(r, c + 1);
	const vt = !isW(r - 1, c) || !isW(r + 1, c);
	const along = hz && !vt ? 'h' : vt && !hz ? 'v' : null;
	if (along) {
		for (let i = 1; i < 5; i += 1) {
			const o = (i * T) / 5;
			b.fillStyle = 'rgba(40,36,30,.16)';
			if (along === 'h') b.fillRect(x - 0.5, y + o + 0.6, T + 1, 0.8);
			else b.fillRect(x + o + 0.6, y - 0.5, 0.8, T + 1);
			b.fillStyle = 'rgba(255,255,255,.2)';
			if (along === 'h') b.fillRect(x - 0.5, y + o - 0.3, T + 1, 0.8);
			else b.fillRect(x + o - 0.3, y - 0.5, 0.8, T + 1);
		}
	}
	// the contact shadow where a wall stands (light from the upper left)
	const strip = (
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		w: number,
		h: number,
		a: number
	) => {
		const g = b.createLinearGradient(x0, y0, x1, y1);
		g.addColorStop(0, `rgba(0,0,0,${a})`);
		g.addColorStop(1, 'rgba(0,0,0,0)');
		b.fillStyle = g;
		b.fillRect(Math.min(x0, x1), Math.min(y0, y1), w, h);
	};
	if (isW(r, c - 1)) strip(x, y, x + 8, y, 8, T, 0.3);
	if (isW(r - 1, c)) strip(x, y, x, y + 8, T, 8, 0.3);
	if (isW(r, c + 1)) strip(x + T, y, x + T - 4, y, 4, T, 0.15);
	if (isW(r + 1, c)) strip(x, y + T, x, y + T - 4, T, 4, 0.15);
}

/** The lair: a deck of warm wooden planks, muted so the ghosts and the egg read on it. */
export function gardenLair(f: MeadowFrame, cell: MeadowPathCell): void {
	const { b } = f;
	const { x, y, r, k } = cell;
	b.fillStyle = '#5a4430';
	b.fillRect(x - 0.5, y - 0.5, T + 1, T + 1);
	const tones = ['#6e5438', '#685034', '#73583b'];
	for (let i = 0; i < 4; i += 1) {
		const py = y + (i * T) / 4;
		b.fillStyle = tones[(hash(r * 4 + i, 3) * 3) | 0];
		b.fillRect(x - 0.5, py + 0.5, T + 1, T / 4 - 1);
		b.fillStyle = 'rgba(40,26,14,.35)';
		b.fillRect(x - 0.5, py + T / 4 - 0.5, T + 1, 0.6);
		// a plank's end now and then, staggered row by row
		if (k() < 0.35) b.fillRect(x + 4 + k() * (T - 8), py + 0.5, 0.6, T / 4 - 1);
	}
}

/** A gutter of dark river pebbles along the walls' feet (`paintWalls`'s `foot`). */
export const pebbleFoot = (f: MeadowFrame): void =>
	greenFoot(f, 'rgba(34,34,40,.42)', ['#4c4d54', '#666870', '#3a3b42', '#5a5c63'], 61);

/**
 * The garden walls (the scene's wall dress, already clipped to the silhouette): dark roof tiles
 * along every edge, scalloped, and cream plaster over the top inside them.
 */
export function plasterWalls(f: MeadowFrame): void {
	const { b } = f;
	b.fillStyle = TILE;
	b.fill(wallClip(f, 0.6));
	// the tiles' rounded ends along the open edges, each with a lit rim
	for (let r = 0; r < f.R; r += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(r, c)) continue;
			const x = c * T;
			const y = r * T;
			const edges: Array<[number, number, number]> = [];
			if (!f.isW(r - 1, c)) edges.push([0, -1, 0]);
			if (!f.isW(r + 1, c)) edges.push([0, 1, 0]);
			if (!f.isW(r, c - 1)) edges.push([-1, 0, 0]);
			if (!f.isW(r, c + 1)) edges.push([1, 0, 0]);
			for (const [nx, ny] of edges) {
				for (let s = 2; s < T; s += 3.8) {
					const ex = nx ? (nx < 0 ? x + 2.5 : x + T - 2.5) : x + s;
					const ey = ny ? (ny < 0 ? y + 2.5 : y + T - 2.5) : y + s;
					b.strokeStyle = nx < 0 || ny < 0 ? 'rgba(150,160,176,.55)' : 'rgba(110,118,132,.45)';
					b.lineWidth = 0.5;
					b.beginPath();
					b.arc(ex, ey, 1.9, 0, TAU);
					b.stroke();
				}
			}
		}
	}
	// the plaster top, a step inside the tiles, with a soft shade on its lower/right side
	const top = wallClip(f, 4.4);
	b.fillStyle = PLASTER;
	b.fill(top);
	b.save();
	b.clip(top);
	for (let r = 0; r < f.R; r += 1) {
		for (let c = 0; c < f.C; c += 1) {
			if (!f.isW(r, c)) continue;
			const x = c * T;
			const y = r * T;
			const k = rng(hash(r * 37 + c * 11, 14) * 1e6);
			if (!f.isW(r + 1, c)) {
				const g = b.createLinearGradient(x, y + T, x, y + T - 6);
				g.addColorStop(0, 'rgba(150,120,90,.35)');
				g.addColorStop(1, 'rgba(150,120,90,0)');
				b.fillStyle = g;
				b.fillRect(x, y + T - 6, T, 6);
			}
			if (!f.isW(r, c + 1)) {
				const g = b.createLinearGradient(x + T, y, x + T - 6, y);
				g.addColorStop(0, 'rgba(150,120,90,.3)');
				g.addColorStop(1, 'rgba(150,120,90,0)');
				b.fillStyle = g;
				b.fillRect(x + T - 6, y, 6, T);
			}
			// the plaster's quiet texture: a few faint trowel marks
			b.fillStyle = 'rgba(180,160,130,.12)';
			for (let i = 0; i < 2; i += 1) {
				b.beginPath();
				b.ellipse(x + 4 + k() * (T - 8), y + 4 + k() * (T - 8), 3 + k() * 3, 1.2, k() * 3, 0, TAU);
				b.fill();
			}
		}
	}
	b.restore();
}

/** A stone toro lantern from above: a square base, the round fire box, a hipped cap. */
function toro(b: CanvasRenderingContext2D, x: number, y: number, s: number): void {
	b.fillStyle = 'rgba(30,40,20,.3)';
	b.beginPath();
	b.ellipse(x + s * 0.35, y + s * 0.45, s * 1.15, s * 1.05, 0, 0, TAU);
	b.fill();
	b.fillStyle = '#8f8c84';
	b.fillRect(x - s * 0.9, y - s * 0.9, s * 1.8, s * 1.8);
	b.fillStyle = '#a8a59c';
	b.beginPath();
	b.moveTo(x - s * 1.05, y - s * 1.05);
	b.lineTo(x + s * 1.05, y - s * 1.05);
	b.lineTo(x + s * 1.05, y + s * 1.05);
	b.lineTo(x - s * 1.05, y + s * 1.05);
	b.closePath();
	b.fill();
	b.strokeStyle = 'rgba(60,58,52,.6)';
	b.lineWidth = 0.6;
	b.beginPath();
	b.moveTo(x - s * 1.05, y - s * 1.05);
	b.lineTo(x + s * 1.05, y + s * 1.05);
	b.moveTo(x + s * 1.05, y - s * 1.05);
	b.lineTo(x - s * 1.05, y + s * 1.05);
	b.stroke();
	b.strokeRect(x - s * 1.05, y - s * 1.05, s * 2.1, s * 2.1);
	b.fillStyle = '#c8c4b8';
	b.beginPath();
	b.arc(x, y, s * 0.32, 0, TAU);
	b.fill();
}

/** One koi from above: a tapered body, a forked tail, its colours in patches. */
function koi(
	b: CanvasRenderingContext2D,
	x: number,
	y: number,
	l: number,
	rot: number,
	k: () => number
): void {
	b.save();
	b.translate(x, y);
	b.rotate(rot);
	b.fillStyle = 'rgba(20,40,60,.25)';
	b.beginPath();
	b.ellipse(1, 1.4, l * 0.5, l * 0.17, 0, 0, TAU);
	b.fill();
	const body = k() < 0.5 ? '#f6f0e6' : '#f08a2a';
	b.fillStyle = body;
	b.beginPath();
	b.moveTo(l * 0.5, 0);
	b.quadraticCurveTo(l * 0.2, -l * 0.2, -l * 0.3, -l * 0.06);
	b.lineTo(-l * 0.55, -l * 0.2);
	b.lineTo(-l * 0.48, 0);
	b.lineTo(-l * 0.55, l * 0.2);
	b.lineTo(-l * 0.3, l * 0.06);
	b.quadraticCurveTo(l * 0.2, l * 0.2, l * 0.5, 0);
	b.fill();
	b.fillStyle = body === '#f08a2a' ? '#fff4e4' : '#e0402a';
	b.beginPath();
	b.ellipse(l * 0.1 + (k() - 0.5) * l * 0.2, 0, l * 0.12, l * 0.08, 0, 0, TAU);
	b.fill();
	b.restore();
}

/** The garden's props: koi in each pond, four toro lanterns by the maze that glow at night. */
export function gardenProps(f: MeadowFrame, lit: SceneLit): void {
	const { b } = f;
	const k = rng(91);
	for (const o of f.DEC) {
		if (o.k !== 'pond') continue;
		const rx = o.rx ?? T;
		const ry = o.ry ?? T * 0.6;
		for (let i = 0; i < 5; i += 1) {
			const a = k() * TAU;
			const d = 0.25 + k() * 0.4;
			koi(b, o.x + Math.cos(a) * rx * d, o.y + Math.sin(a) * ry * d, 7 + k() * 3, k() * TAU, k);
		}
	}
	const taken: Array<[number, number, number]> = [];
	const at: Array<[number, number]> = [
		[-1.6, f.R * 0.18],
		[f.C + 1.6, f.R * 0.18],
		[-1.6, f.R * 0.82],
		[f.C + 1.6, f.R * 0.82]
	];
	for (const [tx, ty] of at) {
		const [x, y] = spot(f, tx, ty, 0.7, taken);
		toro(b, x, y, T * 0.32);
		addLight(lit, x, y, 1.6 * T, '255,200,120', 0.75, false);
	}
}
