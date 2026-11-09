import { describe, expect, it } from 'vitest';
import type { GridMatrix, TileType } from '../../../config/gridConfig';
import { GRID_CLASSIC } from '../../../config/mazes';
import { computeDecayField, DECAY_MARGIN, packDecayFields, sampleDecayField } from './decayField';
import { COLOR_BAND, DRAIN_BAND, decayFronts, farCorner, FRONT_OFF } from './decayTimeline';
import { FLOW } from '../../../config/flowConfig';

/** Rows of two-letter tokens separated by spaces. */
function grid(rows: string[]): GridMatrix {
	return rows.map((r) => r.split(' ') as TileType[]);
}

// A U-shaped corridor around a two-tile wall: the ends of the U are close in a straight
// line, but the decay should go round by the corridor.
const U = grid([
	'WL WL WL WL WL WL',
	'WL DT DT DT DT WL',
	'WL DT WL WL DT WL',
	'WL DT WL WL DT WL',
	'WL DT WL WL DT WL',
	'WL WL WL WL WL WL'
]);

const at = (field: ReturnType<typeof computeDecayField>, x: number, y: number) =>
	field.dist[(y + field.margin) * field.cols + x + field.margin];

describe('decay field', () => {
	it('is zero at the origin and finite everywhere', () => {
		const field = computeDecayField(GRID_CLASSIC, 12, 19);
		expect(at(field, 12, 19)).toBe(0);
		expect(field.dist.every((v) => Number.isFinite(v))).toBe(true);
		expect(field.cols).toBe(GRID_CLASSIC[0].length + 2 * DECAY_MARGIN);
	});

	it('runs along corridors instead of through walls', () => {
		const field = computeDecayField(U, 1, 4);
		// round the U: 3 up, 3 across, 3 down
		expect(at(field, 4, 4)).toBeCloseTo(9, 5);
		// straight through the two wall tiles would cost 3 + 5 + 3 = 11
		expect(at(field, 4, 4)).toBeLessThan(11);
		expect(at(field, 2, 4)).toBeGreaterThan(at(field, 1, 3));
	});

	it('does not cut diagonally through wall corners', () => {
		const field = computeDecayField(U, 1, 1);
		// (2, 2) is a wall: from (1, 1) the step to (2, 2) would cut its corner, so the wall
		// is entered straight from (1, 2) or (2, 1): 1 + (1 + 5) / 2
		expect(at(field, 2, 2)).toBeCloseTo(4, 5);
	});

	it('samples like the shader: tile centres, bilinear, growing past the ring', () => {
		const field = computeDecayField(GRID_CLASSIC, 12, 19);
		expect(sampleDecayField(field, 12.5, 19.5)).toBeCloseTo(0, 5);
		const far = sampleDecayField(field, -200, -200);
		expect(far).toBeGreaterThan(field.max);
	});

	it('packs two 16-bit fields per texel', () => {
		const a = computeDecayField(U, 1, 1);
		const b = computeDecayField(U, 3, 4);
		const data = packDecayFields(a, b);
		const i = (1 + a.margin) * a.cols + 3 + a.margin;
		const decode = (hi: number, lo: number, max: number) => ((hi + lo / 255) / 255) * max;
		expect(decode(data[i * 4], data[i * 4 + 1], a.max)).toBeCloseTo(a.dist[i], 1);
		expect(decode(data[i * 4 + 2], data[i * 4 + 3], b.max)).toBeCloseTo(b.dist[i], 1);
	});
});

describe('decay timeline', () => {
	const { shatter, void: hold, rebuild } = FLOW.death;
	const start = shatter + hold;

	it('starts with the world intact and nothing drained', () => {
		const f = decayFronts(0, 40, 30);
		expect(f.phase).toBe(0);
		expect(f.collapse).toBe(0);
		expect(f.bloom).toBe(1);
		expect(f.color).toBe(FRONT_OFF);
		expect(f.drain).toBeLessThan(0);
	});

	it('drains the whole view while the world only starts to fall in', () => {
		const f = decayFronts(1.2, 40, 30);
		expect(f.drain).toBeGreaterThan(40 + DRAIN_BAND);
		expect(f.collapse).toBeGreaterThan(0);
		expect(f.collapse).toBeLessThan(0.1);
		expect(decayFronts(0.99, 40, 30).collapse).toBe(0);
	});

	it('falls into the hole during the shatter phase and never goes back', () => {
		let last = 0;
		for (let t = 1; t <= shatter; t += 0.05) {
			const k = decayFronts(t, 40, 30).collapse;
			expect(k).toBeGreaterThanOrEqual(last);
			last = k;
		}
		expect(decayFronts(shatter - 0.001, 40, 30).collapse).toBeCloseTo(1, 2);
	});

	it('flashes and sends the shock right after the world is gone, then shows the void', () => {
		const peak = decayFronts(shatter + 0.08, 40, 30);
		expect(peak.flash).toBeCloseTo(1, 5);
		expect(peak.shock).toBeGreaterThanOrEqual(0);
		expect(decayFronts(shatter + hold / 2, 40, 30).phase).toBe(1);
		expect(decayFronts(shatter + hold / 2, 40, 30).cover).toBeGreaterThan(0.99);
		expect(decayFronts(0.5, 40, 30).shock).toBe(-1);
	});

	it('unfolds the next picture from the respawn point and ends fully restored', () => {
		const first = decayFronts(start + 0.01, 40, 30);
		expect(first.phase).toBe(2);
		expect(first.bloom).toBeGreaterThan(0.95);
		expect(first.color).toBe(FRONT_OFF);
		const mid = decayFronts(start + rebuild / 2, 40, 30);
		expect(mid.bloom).toBeLessThan(first.bloom);
		expect(mid.color).toBeGreaterThan(0);
		expect(mid.color).toBeLessThan(30 + COLOR_BAND + 6);
		const end = decayFronts(start + rebuild, 40, 30);
		expect(end.bloom).toBe(0);
		expect(end.color).toBeGreaterThan(1000);
		expect(end.cover).toBe(0);
	});

	it('takes four seconds in all', () => {
		expect(shatter + hold + rebuild).toBeCloseTo(4, 5);
	});

	it("holds the hero's own death inside the shatter phase", () => {
		// the hero's dying move, burst and last flare take 1.75 s (`Hero.DEATH_END`)
		expect(shatter).toBeGreaterThanOrEqual(1.75);
	});
});

describe('farCorner', () => {
	it('is the distance to the farthest corner, a little over', () => {
		expect(farCorner(0, 0, 300, 400)).toBeCloseTo(500 * 1.03, 5);
		expect(farCorner(150, 200, 300, 400)).toBeCloseTo(250 * 1.03, 5);
		expect(farCorner(300, 400, 300, 400)).toBeCloseTo(500 * 1.03, 5);
	});
});
