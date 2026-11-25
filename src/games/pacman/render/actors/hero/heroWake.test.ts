import { describe, expect, it } from 'vitest';
import { Wake } from './heroWake';

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
				const pieces = w.points(now, spec(shift));
				if (!pieces.length) continue;
				expect(pieces).toHaveLength(1);
				const pts = pieces[0];
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

	it('does not bridge a teleport: the piece at the mouth fades, a new one grows at the exit', () => {
		const w = new Wake();
		let pieces = 0;
		for (let t = 0; t <= 1; t += 1 / 60) {
			// right along a tunnel row, through its mouth at x 200 and out at x -400
			const x = 100 + t * 7 * 30;
			w.push(x > 200 ? x - 600 : x, 50, t, 1, R * 3);
			for (const pts of w.points(t, spec(true))) {
				expect(pts[0].w).toBe(0);
				expect(pts[pts.length - 1].w).toBe(0);
				for (let i = 1; i < pts.length; i += 1) {
					expect(Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)).toBeLessThan(R * 3);
				}
			}
			pieces = Math.max(pieces, w.points(t, spec(true)).length);
		}
		expect(pieces).toBe(2);
		// a life later only the new one is left
		expect(w.points(1, spec(true))).toHaveLength(1);
	});
});
