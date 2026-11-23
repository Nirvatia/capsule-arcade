// The meadow's trees and shrubs per season (the owner's review, 2026-11-23: the bubble bushes go,
// the trees get a readable crown from above). A broad crown is a few leaf masses round a trunk
// whose branches show between them, each mass lit from the upper left with a leafy edge; a fir is
// a star of needle layers with snow on the lit tips; a shrub is a small round mass (with flowers
// or berries) or a bare tangle of twigs (frosted, or with a few last leaves). Baked once.
import type { BakeKit } from './MeadowTheme';
import type { WorldDecor } from '../../common/worldDecor';

const TAU = Math.PI * 2;

export interface CrownStyle {
	readonly kind: 'broad' | 'fir';
	/** Leaf tones: light, mid, dark. */
	readonly leaves: readonly [string, string, string];
	readonly branch: string;
	/** Share of the leaf masses missing (a half-bare autumn crown), 0..1. */
	readonly gaps?: number;
	/** Blossom dots over the leaves (sakura). */
	readonly blossom?: readonly string[];
	/** Snow on the lit tips (a winter fir). */
	readonly snow?: string;
}

export interface ShrubStyle {
	readonly kind: 'round' | 'bare';
	readonly leaves: readonly [string, string, string];
	readonly twig: string;
	readonly flowers?: readonly string[];
	readonly berries?: string;
	/** Frost on the twigs' ends (winter). */
	readonly frost?: string;
	/** A few leaves left on a bare shrub (autumn). */
	readonly lastLeaves?: readonly string[];
}

function seeded(seed: number): () => number {
	let a = (seed * 2654435761) >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** One leaf mass: a dark base, a lit cap toward the upper left, small leaves round its rim. */
function mass(
	kt: BakeKit,
	x: number,
	y: number,
	r: number,
	L: CrownStyle['leaves'],
	k: () => number
): void {
	const { b } = kt;
	b.fillStyle = L[2];
	b.beginPath();
	b.arc(x, y, r, 0, TAU);
	b.fill();
	b.fillStyle = L[1];
	b.beginPath();
	b.arc(x - r * 0.15, y - r * 0.15, r * 0.8, 0, TAU);
	b.fill();
	b.fillStyle = L[0];
	b.beginPath();
	b.arc(x - r * 0.32, y - r * 0.32, r * 0.42, 0, TAU);
	b.fill();
	// the leafy rim: small leaves breaking the circle's edge
	const n = Math.max(6, Math.round(r * 0.9));
	for (let i = 0; i < n; i += 1) {
		const a = (i / n) * TAU + k() * 0.4;
		const lit = Math.cos(a + Math.PI * 0.75) > 0.2;
		b.fillStyle = lit ? L[1] : L[2];
		b.beginPath();
		b.ellipse(x + Math.cos(a) * r * 0.95, y + Math.sin(a) * r * 0.95, r * 0.2, r * 0.12, a, 0, TAU);
		b.fill();
	}
}

/** A tree crown from above, its shadow cast to the lower right. */
export function crown(kt: BakeKit, o: WorldDecor, s: CrownStyle): void {
	const { b, blob, shade } = kt;
	const r = o.r ?? 0;
	const k = seeded((o.s ?? 0) + 11);
	blob(o.x + r * 0.22, o.y + r * 0.3, r * 0.98, r * 0.85, shade(0.3), 0);
	if (s.kind === 'fir') {
		const layer = (lr: number, col: string, rot: number) => {
			const n = 9;
			b.fillStyle = col;
			b.beginPath();
			for (let i = 0; i < n * 2; i += 1) {
				const a = rot + (i / (n * 2)) * TAU;
				const d = i % 2 ? lr * 0.62 : lr;
				const px = o.x + Math.cos(a) * d;
				const py = o.y + Math.sin(a) * d;
				if (i) b.lineTo(px, py);
				else b.moveTo(px, py);
			}
			b.closePath();
			b.fill();
			if (s.snow) {
				for (let i = 0; i < n; i += 1) {
					const a = rot + (i / n) * TAU;
					// snow lies on the tips that face the light
					if (Math.cos(a + Math.PI * 0.75) < -0.1) continue;
					blob(
						o.x + Math.cos(a) * lr * 0.78,
						o.y + Math.sin(a) * lr * 0.78,
						lr * 0.16,
						lr * 0.09,
						s.snow,
						a
					);
				}
			}
		};
		layer(r, s.leaves[2], k() * TAU);
		layer(r * 0.72, s.leaves[1], k() * TAU);
		layer(r * 0.45, s.leaves[0], k() * TAU);
		b.fillStyle = s.snow ?? s.leaves[0];
		b.beginPath();
		b.arc(o.x, o.y, r * 0.08, 0, TAU);
		b.fill();
		return;
	}
	// branches from the trunk, seen where the leaf masses part
	const nb = 6;
	b.strokeStyle = s.branch;
	b.lineCap = 'round';
	const ends: Array<[number, number, number]> = [];
	for (let i = 0; i < nb; i += 1) {
		const a = (i / nb) * TAU + k() * 0.6;
		const L = r * (0.55 + k() * 0.2);
		const ex = o.x + Math.cos(a) * L;
		const ey = o.y + Math.sin(a) * L;
		b.lineWidth = r * 0.08;
		b.beginPath();
		b.moveTo(o.x, o.y);
		b.quadraticCurveTo(
			o.x + Math.cos(a + 0.3) * L * 0.5,
			o.y + Math.sin(a + 0.3) * L * 0.5,
			ex,
			ey
		);
		b.stroke();
		b.lineWidth = r * 0.035;
		b.beginPath();
		b.moveTo(o.x + Math.cos(a) * L * 0.6, o.y + Math.sin(a) * L * 0.6);
		b.lineTo(o.x + Math.cos(a - 0.5) * L * 0.9, o.y + Math.sin(a - 0.5) * L * 0.9);
		b.stroke();
		ends.push([ex, ey, a]);
	}
	b.fillStyle = s.branch;
	b.beginPath();
	b.arc(o.x, o.y, r * 0.09, 0, TAU);
	b.fill();
	// the leaf masses: round the trunk and over its middle, some missing on a bare crown
	const masses: Array<[number, number, number]> = [];
	for (const [, , a] of ends) {
		const d = r * (0.42 + k() * 0.15);
		masses.push([o.x + Math.cos(a) * d, o.y + Math.sin(a) * d, r * (0.36 + k() * 0.12)]);
	}
	masses.push([o.x - r * 0.08, o.y - r * 0.08, r * 0.42]);
	for (const [mx, my, mr] of masses) {
		if (s.gaps && k() < s.gaps) continue;
		mass(kt, mx, my, mr, s.leaves, k);
		if (s.blossom) {
			for (let i = 0; i < 9; i += 1) {
				const a = k() * TAU;
				const d = Math.sqrt(k()) * mr * 0.9;
				blob(
					mx + Math.cos(a) * d,
					my + Math.sin(a) * d,
					mr * 0.13,
					mr * 0.11,
					s.blossom[(k() * s.blossom.length) | 0],
					0
				);
			}
		}
	}
}

/** A shrub from above. */
export function shrub(kt: BakeKit, o: WorldDecor, s: ShrubStyle): void {
	const { b, blob, shade } = kt;
	const r = o.r ?? 0;
	const k = seeded(Math.round(o.x * 7 + o.y * 13));
	blob(o.x + r * 0.3, o.y + r * 0.4, r * 0.95, r * 0.7, shade(0.28), 0);
	if (s.kind === 'bare') {
		b.strokeStyle = s.twig;
		b.lineCap = 'round';
		const n = 9;
		for (let i = 0; i < n; i += 1) {
			const a = (i / n) * TAU + k() * 0.5;
			const L = r * (0.6 + k() * 0.4);
			const ex = o.x + Math.cos(a) * L;
			const ey = o.y + Math.sin(a) * L;
			b.lineWidth = 1.1;
			b.beginPath();
			b.moveTo(o.x, o.y);
			b.lineTo(ex, ey);
			b.moveTo(o.x + Math.cos(a) * L * 0.55, o.y + Math.sin(a) * L * 0.55);
			b.lineTo(o.x + Math.cos(a + 0.6) * L * 0.85, o.y + Math.sin(a + 0.6) * L * 0.85);
			b.stroke();
			if (s.frost) blob(ex, ey, 1.4, 1, s.frost, 0);
			if (s.lastLeaves && k() < 0.45) {
				blob(ex, ey, 2.2, 1.4, s.lastLeaves[(k() * s.lastLeaves.length) | 0], a);
			}
		}
		return;
	}
	const parts: Array<[number, number, number]> = [
		[o.x - r * 0.28, o.y + r * 0.05, r * 0.5],
		[o.x + r * 0.3, o.y + r * 0.08, r * 0.48],
		[o.x, o.y - r * 0.25, r * 0.55]
	];
	for (const [px, py, pr] of parts) mass(kt, px, py, pr, s.leaves, k);
	const dots = s.flowers ?? (s.berries ? [s.berries] : null);
	if (dots) {
		for (let i = 0; i < 9; i += 1) {
			const a = k() * TAU;
			const d = Math.sqrt(k()) * r * 0.65;
			blob(
				o.x + Math.cos(a) * d,
				o.y - r * 0.08 + Math.sin(a) * d,
				1.5,
				1.4,
				dots[(k() * dots.length) | 0],
				0
			);
		}
	}
}
