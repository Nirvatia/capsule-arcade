import { describe, expect, it } from 'vitest';
import { ageFade, motes, ribbon, sampleGrid } from './trail';
import type { RibbonPoint, TrailSpec } from './trail';

// a dash like the prototype's: 0.5 s crouch with the transformation's last 0.25 s, a straight run
// of `tiles` tiles at 9.6 tiles/s, then the return into the body over 0.28 s, then standing still
const S = 32;
function dash(tiles: number) {
	const start = 0.5;
	const dur = tiles / 9.6;
	const end = start + dur;
	const morph = (t: number) => {
		if (t < start - 0.25) return 0;
		if (t < start) return (t - (start - 0.25)) / 0.25;
		if (t < end) return 1;
		return Math.max(0, 1 - (t - end) / 0.28);
	};
	const at = (t: number) => {
		const k = Math.min(1, Math.max(0, (t - start) / dur));
		return { x: 100 + k * tiles * S, y: 50, emit: morph(t) };
	};
	return { start, end, at };
}
const SPEC: TrailSpec = { life: 0.9, width: S * 0.4, capHead: S * 0.45, capTail: S * 0.7 };

function checkEnds(r: RibbonPoint[]): void {
	expect(r.length).toBeGreaterThan(1);
	expect(r[0].w).toBe(0);
	expect(r[0].a).toBe(0);
	expect(r[r.length - 1].w).toBe(0);
	expect(r[r.length - 1].a).toBe(0);
}

/** The steepest change of half-width per px of length along the ribbon. */
function steepest(r: RibbonPoint[]): number {
	let m = 0;
	for (let i = 1; i < r.length; i += 1) {
		const ds = Math.hypot(r[i].x - r[i - 1].x, r[i].y - r[i - 1].y);
		m = Math.max(m, Math.abs(r[i].w - r[i - 1].w) / Math.max(ds, 1e-6));
	}
	return m;
}

describe('the dash trail never ends in a cut', () => {
	for (const tiles of [3, 6, 12]) {
		it(`a ${tiles}-tile dash: width and alpha are 0 at both ends in every frame, and change smoothly`, () => {
			const d = dash(tiles);
			let frames = 0;
			for (let now = d.start + 0.02; now < d.end + SPEC.life + 0.5; now += 1 / 60) {
				const r = ribbon(sampleGrid(now, 3, 1 / 60, d.at), now, SPEC);
				if (!r.length) continue;
				frames += 1;
				checkEnds(r);
				// no step anywhere: the slope stays under the tapers' own (smoothstep: 1.5 / cap)
				expect(steepest(r)).toBeLessThan((1.6 * SPEC.width) / SPEC.capHead);
			}
			expect(frames).toBeGreaterThan(20);
		});
	}

	it('after the stop the trail keeps fading by itself and is gone by its life', () => {
		const d = dash(10);
		let prev = Infinity;
		for (let now = d.end + 0.3; now < d.end + SPEC.life + 0.4; now += 1 / 60) {
			const r = ribbon(sampleGrid(now, 3, 1 / 60, d.at), now, SPEC);
			const widest = r.reduce((m, p) => Math.max(m, p.w), 0);
			expect(widest).toBeLessThanOrEqual(prev + 1e-9);
			prev = widest;
		}
		// the return into the body ends at +0.28 s; its last shed point dies life s later
		const gone = ribbon(sampleGrid(d.end + 0.28 + SPEC.life + 0.02, 3, 1 / 60, d.at), d.end + 0.28 + SPEC.life + 0.02, SPEC);
		expect(gone).toEqual([]);
	});

	it('the oldest end is laid at exactly age = life', () => {
		const d = dash(12);
		const now = d.start + 1.1;
		const r = ribbon(sampleGrid(now, 3, 1 / 60, d.at), now, SPEC);
		expect(r[r.length - 1].age).toBeCloseTo(SPEC.life, 9);
	});

	it('a body that is not transformed sheds nothing', () => {
		const at = (t: number) => ({ x: t * 300, y: 0, emit: 0 });
		expect(ribbon(sampleGrid(2, 3, 1 / 60, at), 2, SPEC)).toEqual([]);
	});

	it('the age fade is 1 when laid and 0 at life, never negative', () => {
		expect(ageFade(0, 1)).toBe(1);
		expect(ageFade(1, 1)).toBe(0);
		expect(ageFade(2, 1)).toBe(0);
		for (let a = 0; a <= 1; a += 0.01) expect(ageFade(a, 1, 1.6)).toBeGreaterThanOrEqual(0);
	});

	it('motes fade in and out: alpha 0 at birth and at the end of life', () => {
		const d = dash(10);
		const opt = { life: 0.8, per: 3, speed: 40, drag: 2, spread: 0.6, seed: 1, step: 1 / 60, every: 2 };
		for (let now = d.start; now < d.end + 1.2; now += 1 / 60) {
			for (const m of motes(sampleGrid(now, 2, 1 / 60, d.at), now, opt)) {
				expect(m.a).toBeGreaterThanOrEqual(0);
				expect(m.a).toBeLessThanOrEqual(1);
				if (m.k < 0.001 || m.k > 0.999) expect(m.a).toBeLessThan(0.01);
			}
		}
	});
});
