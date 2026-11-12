import { describe, expect, it } from 'vitest';
import { LightWall, cutHead } from './LightWall';

/** Feeds a path in small steps, as frames would. */
function run(wall: LightWall, path: Array<[number, number]>, step = 0.1): void {
	let [x, y] = path[0];
	wall.advance(x, y);
	for (const [tx, ty] of path.slice(1)) {
		while (Math.abs(tx - x) + Math.abs(ty - y) > 1e-9) {
			x += Math.sign(tx - x) * Math.min(step, Math.abs(tx - x));
			y += Math.sign(ty - y) * Math.min(step, Math.abs(ty - y));
			wall.advance(x, y);
		}
	}
}

const length = (pts: Array<{ x: number; y: number }>) =>
	pts.slice(1).reduce((s, p, i) => s + Math.abs(p.x - pts[i].x) + Math.abs(p.y - pts[i].y), 0);

describe('the light wall', () => {
	it('is a straight line behind a straight run, as long as it is allowed', () => {
		const wall = new LightWall(3);
		run(wall, [
			[0.5, 0.5],
			[6.5, 0.5]
		]);
		const pts = wall.polyline();
		expect(pts).toHaveLength(2);
		expect(pts[0].x).toBeCloseTo(3.5, 6);
		expect(pts[1].x).toBeCloseTo(6.5, 6);
		expect(length(pts)).toBeCloseTo(3, 6);
	});

	it('turns at exact right angles, at the tile centre, whatever the frame steps', () => {
		const wall = new LightWall(10);
		// steps that do not land on the corner
		run(
			wall,
			[
				[0.5, 0.5],
				[3.5, 0.5],
				[3.5, 2.5]
			],
			0.37
		);
		const pts = wall.polyline();
		expect(pts).toHaveLength(3);
		expect(pts[1]).toEqual({ x: 3.5, y: 0.5 });
		for (let i = 1; i < pts.length; i++) {
			const horizontal = Math.abs(pts[i].y - pts[i - 1].y) < 1e-9;
			const vertical = Math.abs(pts[i].x - pts[i - 1].x) < 1e-9;
			expect(horizontal || vertical).toBe(true);
		}
	});

	it('keeps its length exactly while the tail slides round a corner', () => {
		const wall = new LightWall(4);
		run(wall, [
			[0.5, 0.5],
			[3.5, 0.5],
			[3.5, 5.5]
		]);
		const pts = wall.polyline();
		expect(length(pts)).toBeCloseTo(4, 6);
		expect(pts[0].x).toBeCloseTo(3.5, 6);
	});

	it('starts again after a jump', () => {
		const wall = new LightWall(5);
		run(wall, [
			[0.5, 0.5],
			[4.5, 0.5]
		]);
		wall.advance(12.5, 9.5);
		expect(wall.polyline()).toEqual([]);
		wall.advance(12.6, 9.5);
		expect(wall.polyline()).toHaveLength(2);
	});

	it('leaves the rider: the head end can be cut off', () => {
		const pts = cutHead(
			[
				{ x: 0, y: 0 },
				{ x: 2, y: 0 },
				{ x: 2, y: 0.3 }
			],
			0.5
		);
		expect(pts).toHaveLength(2);
		expect(pts[1].x).toBeCloseTo(1.8, 6);
	});
});
