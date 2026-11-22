import { describe, expect, it } from 'vitest';
import { Wake } from './wake';

// the comet's tails as `CometMs` lays them: a run right, an L turn down, a stop
function run(w: Wake, until: number): void {
	for (let t = 0; t <= until; t += 1 / 60) {
		const d = Math.min(t, 1.2) * 7 * 30;
		const x = 100 + Math.min(d, 6 * 30);
		const y = 50 + Math.max(0, d - 6 * 30);
		w.push(x, y, t, t < 1.2 ? 1 : 0);
	}
}
const R = 10;
const spec = (shift: boolean) => ({
	life: 0.3,
	width: R * 0.42,
	capHead: R * 0.7,
	capTail: R * 1.8,
	widen: (u: number) => 0.6 + 1.0 * u,
	shift: shift ? (u: number) => Math.pow(u, 1.3) * R * 0.55 : undefined,
	color: () => 'white'
});

describe("the comet's tails never end in a cut", () => {
	for (const shift of [false, true]) {
		it(`width and alpha are 0 at both ends, through the turn and after the stop (${shift ? 'curved' : 'straight'})`, () => {
			let frames = 0;
			for (let now = 0.1; now < 1.7; now += 1 / 30) {
				const w = new Wake();
				run(w, now);
				const pts = w.points(now, spec(shift));
				if (!pts.length) continue;
				frames += 1;
				expect(pts[0].w).toBe(0);
				expect(pts[0].a).toBe(0);
				expect(pts[pts.length - 1].w).toBe(0);
				expect(pts[pts.length - 1].a).toBe(0);
			}
			expect(frames).toBeGreaterThan(20);
		});
	}

	it('draws back into her and is gone a life after she stops', () => {
		const w = new Wake();
		run(w, 1.2 + 0.3 + 0.05);
		expect(w.points(1.55, spec(true))).toEqual([]);
	});
});
