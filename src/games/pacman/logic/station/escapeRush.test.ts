import { describe, expect, it } from 'vitest';
import { GRID_STATION } from '../../config/mazes';
import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { EscapeRush, RUSH_TUNE } from './EscapeRush';
import { ESCAPE_TUNE, StationEscape } from './StationEscape';

const grid = new GridService(new GridModel(GRID_STATION));
const walk = (x: number, y: number) => grid.isGhostWalkable(x, y, false);

describe('the breakout', () => {
	it('comes out of the doors one by one and runs at the hero', () => {
		const rush = new EscapeRush({ walkable: walk });
		rush.start(3, [{ x: 12, y: 10 }]);
		rush.update(0.31, { x: 2, y: 24 }, [], 8, () => false);
		expect(rush.runners).toHaveLength(1);
		rush.update(RUSH_TUNE.every * 2, { x: 2, y: 24 }, [], 8, () => false);
		expect(rush.runners).toHaveLength(3);
		// a hero standing still is reached
		const first = rush.runners[0];
		rush.update(6, { x: 2, y: 24 }, [], 8, () => false);
		expect(Math.abs(first.x - 2) + Math.abs(first.y - 24)).toBeLessThanOrEqual(1);
	});

	it('never steps on a lit lane; one standing on it is thrown off and stunned', () => {
		const rush = new EscapeRush({ walkable: walk });
		rush.start(1, [{ x: 12, y: 10 }]);
		rush.update(0.31, { x: 12, y: 24 }, [], 8, () => false);
		const r = rush.runners[0];
		const at = { x: r.x, y: r.y };
		const lane = (x: number, y: number) => x === at.x && y === at.y;
		rush.knockOff(lane, 1.5);
		expect(lane(r.x, r.y)).toBe(false);
		expect(r.stun).toBe(1.5);
		// the bottom row lit: it cannot step on it to reach him
		const row = (x: number, y: number) => y === 24;
		let onRow = false;
		for (let t = 0; t < 8; t += 1 / 60) {
			rush.update(1 / 60, { x: 12, y: 24 }, [], 8, row);
			if (r.y === 24 || r.ny === 24) onRow = true;
		}
		expect(onRow).toBe(false);
	});
});

describe('the breakthrough', () => {
	const make = () =>
		new StationEscape(
			{ walkable: (x, y) => grid.isPlayerWalkable(x, y) },
			{ x: 12, y: 24 },
			{ x: 6, y: 1 },
			false
		);

	it('lights his way to the hatch for a moment, two times an escape; no doors on a free way', () => {
		const e = make();
		e.setFood(1, 1);
		e.update(0, { x: 0, y: 0 });
		e.update(0, { x: 12, y: 24 });
		expect(e.state).toBe('running');
		expect(e.doors).toHaveLength(0);
		expect(e.useLane({ x: 12, y: 24 })).toBe(true);
		expect(e.laneBlocks(6, 1)).toBe(true);
		expect(e.charges).toBe(ESCAPE_TUNE.charges - 1);
		e.update(ESCAPE_TUNE.lane + 0.01, { x: 12, y: 24 });
		expect(e.lane).toBeNull();
		expect(e.useLane({ x: 12, y: 24 })).toBe(true);
		expect(e.useLane({ x: 12, y: 24 })).toBe(false);
		// a restart gives the charges back
		e.touch();
		e.touch();
		expect(e.charges).toBe(ESCAPE_TUNE.charges);
	});
});
