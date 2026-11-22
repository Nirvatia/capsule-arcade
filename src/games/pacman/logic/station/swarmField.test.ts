import { describe, expect, it } from 'vitest';
import { GRID_STATION } from '../../config/mazes';
import { isTeleportToken } from '../../config/gridConfig';
import type { SwarmMaze, SwarmTuning } from './SwarmField';
import { SwarmField } from './SwarmField';

/** One corridor, x 1..14 on row 1. */
const LINE: SwarmMaze = {
	width: 16,
	height: 3,
	walkable: (x, y) => y === 1 && x >= 1 && x <= 14,
	teleport: () => null
};

const TUNING: SwarmTuning = { output: 4, spread: 1.5, pull: 1.2, push: 6, maxMass: 30 };

function run(field: SwarmField, seconds: number, step: (dt: number) => void): void {
	for (let t = 0; t < seconds; t += 1 / 60) {
		step(1 / 60);
	}
	void field;
}

describe('the swarm', () => {
	it('pours out of its source and spreads along the corridor', () => {
		const field = new SwarmField(LINE);
		run(field, 3, (dt) => field.step(dt, null, [], [{ x: 1, y: 1 }], TUNING));
		expect(field.at(1, 1)).toBeGreaterThan(0);
		expect(field.at(6, 1)).toBeGreaterThan(0);
		expect(field.at(1, 1)).toBeGreaterThan(field.at(6, 1));
		expect(field.at(3, 0)).toBe(0);
	});

	it('flows toward the hero', () => {
		const field = new SwarmField(LINE);
		field.add(7, 1, 2);
		run(field, 1.5, (dt) => field.step(dt, { x: 13.5, y: 1.5 }, [], [], TUNING));
		const right = field.at(10, 1) + field.at(11, 1) + field.at(12, 1) + field.at(13, 1);
		const left = field.at(1, 1) + field.at(2, 1) + field.at(3, 1) + field.at(4, 1);
		expect(right).toBeGreaterThan(left * 3);
	});

	it('never enters light, and what is lit is pushed out of it', () => {
		const field = new SwarmField(LINE);
		field.add(9, 1, 2);
		const torch = { x: 9.5, y: 1.5, r: 2.5 };
		run(field, 1, (dt) => field.step(dt, { x: 13.5, y: 1.5 }, [torch], [{ x: 2, y: 1 }], TUNING));
		expect(field.at(9, 1)).toBeLessThan(0.05);
		// the light cuts the corridor: nothing from the source gets past it
		run(field, 3, (dt) => field.step(dt, { x: 13.5, y: 1.5 }, [torch], [{ x: 2, y: 1 }], TUNING));
		expect(field.at(9, 1)).toBeLessThan(0.05);
		expect(field.at(4, 1)).toBeGreaterThan(0.1);
	});

	it('goes through the tunnels and the vents', () => {
		const maze: SwarmMaze = {
			width: GRID_STATION[0].length,
			height: GRID_STATION.length,
			walkable: (x, y) => {
				const t = GRID_STATION[y]?.[x];
				return t !== undefined && t !== 'WL' && t !== 'ES';
			},
			teleport: (x, y) => {
				const t = GRID_STATION[y]?.[x];
				if (!t || !isTeleportToken(t)) return null;
				for (let yy = 0; yy < GRID_STATION.length; yy += 1)
					for (let xx = 0; xx < GRID_STATION[0].length; xx += 1)
						if ((xx !== x || yy !== y) && GRID_STATION[yy][xx] === t) return { x: xx, y: yy };
				return null;
			}
		};
		const field = new SwarmField(maze);
		// the left tunnel's mouth, the hero by the right one
		field.add(1, 13, 3);
		run(field, 1, (dt) => field.step(dt, { x: 22.5, y: 13.5 }, [], [], TUNING));
		expect(field.at(23, 13) + field.at(22, 13)).toBeGreaterThan(0.1);
	});

	it('holds no more than its most', () => {
		const field = new SwarmField(LINE);
		run(field, 30, (dt) =>
			field.step(dt, null, [], [{ x: 1, y: 1 }], { ...TUNING, output: 20, maxMass: 6 })
		);
		expect(field.mass).toBeLessThan(6.5);
	});
});
