// Seasonal details instead of the sticker patches (the owner's review, 2026-11-23): the cabins'
// roofs carry real fallen leaves and moss in the tile joints (autumn), handfuls of petals
// (spring) or clean sun-faded tiles (summer); the meadow's grey stones give way to leaf piles
// (autumn), clover with dandelions (spring), dry grass (summer). Winter keeps its snowy stones.
import type { BakeKit } from './MeadowTheme';
import type { WorldDecor } from '../../common/worldDecor';

const TAU = Math.PI * 2;
type Roof = (k: BakeKit, X: number, Y: number, w: number, h: number) => void;
type Spot = (k: BakeKit, o: WorldDecor) => void;

function leaf(
	b: CanvasRenderingContext2D,
	x: number,
	y: number,
	l: number,
	rot: number,
	col: string
): void {
	b.save();
	b.translate(x, y);
	b.rotate(rot);
	b.fillStyle = col;
	b.beginPath();
	b.moveTo(-l, 0);
	b.quadraticCurveTo(0, -l * 0.55, l, 0);
	b.quadraticCurveTo(0, l * 0.55, -l, 0);
	b.fill();
	b.strokeStyle = 'rgba(60,30,10,.45)';
	b.lineWidth = 0.4;
	b.beginPath();
	b.moveTo(-l * 0.8, 0);
	b.lineTo(l * 0.8, 0);
	b.stroke();
	b.restore();
}

/** Autumn roofs: moss in the tile joints, fallen leaves lying flat with their shade. */
export const autumnRoof: Roof = ({ b, rnd, rr }, X, Y, w, h) => {
	b.strokeStyle = 'rgba(90,110,40,.55)';
	b.lineWidth = 1;
	for (let i = 0; i < 10; i += 1) {
		const yy = Y + Math.round(rnd() * (h / 6)) * 6;
		const xx = X + rnd() * (w - 10);
		b.beginPath();
		b.moveTo(xx, yy);
		b.lineTo(xx + rr(4, 10), yy);
		b.stroke();
	}
	const cols = ['#d26a22', '#e8a030', '#a83c18', '#c9962e'];
	for (let i = 0; i < 9; i += 1) {
		const x = X + 4 + rnd() * (w - 8);
		const y = Y + 4 + rnd() * (h - 8);
		b.fillStyle = 'rgba(40,20,10,.25)';
		b.beginPath();
		b.ellipse(x + 0.8, y + 1, 3.6, 2, 0, 0, TAU);
		b.fill();
		leaf(b, x, y, rr(3.2, 4.4), rnd() * TAU, cols[(rnd() * 4) | 0]);
	}
};

/** Spring roofs: three handfuls of petals, each a small drift of separate petals. */
export const springRoof: Roof = ({ b, rnd, rr }, X, Y, w, h) => {
	for (let n = 0; n < 3; n += 1) {
		const cx = X + 8 + rnd() * (w - 16);
		const cy = Y + 6 + rnd() * (h - 12);
		for (let i = 0; i < 9; i += 1) {
			const a = rnd() * TAU;
			const d = rnd() * 6;
			b.fillStyle = rnd() < 0.5 ? '#ffd3e2' : '#f6a8c4';
			b.beginPath();
			b.ellipse(
				cx + Math.cos(a) * d,
				cy + Math.sin(a) * d * 0.7,
				rr(1.4, 2),
				rr(0.8, 1.1),
				rnd() * 3,
				0,
				TAU
			);
			b.fill();
		}
	}
};

/** Summer roofs: clean tiles, two soft sun-faded bands across the slope that faces the light. */
export const summerRoof: Roof = ({ b }, X, Y, w, h) => {
	for (const t of [0.18, 0.32]) {
		const g = b.createLinearGradient(X, Y + h * t - 4, X, Y + h * t + 4);
		g.addColorStop(0, 'rgba(255,236,200,0)');
		g.addColorStop(0.5, 'rgba(255,236,200,.16)');
		g.addColorStop(1, 'rgba(255,236,200,0)');
		b.fillStyle = g;
		b.fillRect(X, Y + h * t - 4, w, 8);
	}
};

/** Autumn: a pile of fallen leaves where a stone lay. */
export const leafPile: Spot = ({ b, blob, shade, rnd, rr }, o) => {
	const r = o.r ?? 10;
	blob(o.x + 2, o.y + 3, r * 1.05, r * 0.65, shade(0.22), 0);
	const cols = ['#d26a22', '#e8a030', '#a83c18', '#c9962e', '#8a4a1e'];
	for (let i = 0; i < 16; i += 1) {
		const a = rnd() * TAU;
		const d = Math.sqrt(rnd()) * r * 0.8;
		leaf(
			b,
			o.x + Math.cos(a) * d,
			o.y + Math.sin(a) * d * 0.65,
			rr(2.6, 3.8),
			rnd() * TAU,
			cols[(rnd() * 5) | 0]
		);
	}
};

/** Spring: a patch of clover with a few dandelions. */
export const cloverPatch: Spot = ({ b, rnd, rr }, o) => {
	const r = o.r ?? 10;
	for (let i = 0; i < 12; i += 1) {
		const a = rnd() * TAU;
		const d = Math.sqrt(rnd()) * r * 0.9;
		const x = o.x + Math.cos(a) * d;
		const y = o.y + Math.sin(a) * d * 0.7;
		b.fillStyle = rnd() < 0.5 ? '#4f9a3a' : '#5fae44';
		for (let j = 0; j < 3; j += 1) {
			const q = (j / 3) * TAU + a;
			b.beginPath();
			b.arc(x + Math.cos(q) * 1.1, y + Math.sin(q) * 1.1, 1.1, 0, TAU);
			b.fill();
		}
	}
	for (let i = 0; i < 3; i += 1) {
		const x = o.x + rr(-0.6, 0.6) * r;
		const y = o.y + rr(-0.4, 0.4) * r;
		b.fillStyle = '#ffd23a';
		b.beginPath();
		b.arc(x, y, 1.6, 0, TAU);
		b.fill();
		b.fillStyle = '#f0a81a';
		b.beginPath();
		b.arc(x, y, 0.6, 0, TAU);
		b.fill();
	}
};

/** Summer: a tuft of dry, sun-bleached grass. */
export const dryGrass: Spot = ({ b, rnd, rr }, o) => {
	const r = o.r ?? 10;
	b.lineCap = 'round';
	for (let i = 0; i < 18; i += 1) {
		const x = o.x + rr(-0.8, 0.8) * r;
		const y = o.y + rr(-0.4, 0.4) * r;
		b.strokeStyle = rnd() < 0.5 ? '#d8c07a' : '#bca05a';
		b.lineWidth = 0.8;
		b.beginPath();
		b.moveTo(x, y);
		b.quadraticCurveTo(x + rr(-2, 2), y - rr(2, 4), x + rr(-3, 3), y - rr(4, 7));
		b.stroke();
	}
};
