import { describe, expect, it } from 'vitest';
import { GATE_REACH, easeGate, gateTiles, gateWanted, lairSide } from './doomGate';
import { gateOf } from './fleshGate';
import { GRID_DOOM } from '../../config/mazes';

describe('the hell lair gate', () => {
	const grid = {
		width: GRID_DOOM[0].length,
		height: GRID_DOOM.length,
		tileAt: (x: number, y: number) => GRID_DOOM[y]?.[x]
	};
	const tiles = gateTiles(grid);

	it('finds the gate tiles of the hell maze (three in a row)', () => {
		expect(tiles).toHaveLength(3);
		expect(new Set(tiles.map((t) => t.y)).size).toBe(1);
	});

	const side = lairSide(grid, tiles);

	it('knows the lair is below the gate in the hell maze', () => {
		expect(side).toBe(1);
	});

	it('opens for whoever leaves the lair, not for actors far from it', () => {
		const mid = tiles[1];
		expect(gateWanted(tiles, [], side)).toBe(0);
		expect(gateWanted(tiles, [{ x: mid.x, y: mid.y + GATE_REACH + 3 }], side)).toBe(0);
		expect(gateWanted(tiles, [{ x: mid.x, y: mid.y + 1 }], side)).toBe(1);
	});

	it('opens for whoever steps into the doorway from the corridor', () => {
		const mid = tiles[1];
		expect(
			gateWanted(
				tiles,
				[
					{ x: 0, y: 0 },
					{ x: mid.x, y: mid.y - 0.6 }
				],
				side
			)
		).toBe(1);
	});

	it('stays shut while the boss runs along the corridor past the gate', () => {
		const corridorY = tiles[0].y - 1;
		for (let x = tiles[0].x - 3; x <= tiles[2].x + 3; x += 0.25) {
			expect(gateWanted(tiles, [{ x, y: corridorY }])).toBe(0);
		}
	});

	it('slides open fast and shut slowly, and settles exactly', () => {
		let open = 0;
		for (let i = 0; i < 20; i += 1) open = easeGate(open, 1, 1 / 60);
		expect(open).toBeGreaterThan(0.9);
		let shut = 1;
		for (let i = 0; i < 20; i += 1) shut = easeGate(shut, 0, 1 / 60);
		expect(shut).toBeGreaterThan(0.2);
		for (let i = 0; i < 600; i += 1) shut = easeGate(shut, 0, 1 / 60);
		expect(shut).toBe(0);
	});

	it('has a gate in the scene for the hell maze, spanning its three tiles', () => {
		const gate = gateOf(GRID_DOOM, 0, 0, 32);
		expect(gate).not.toBeNull();
		expect(gate?.w).toBe(3 * 32);
	});
});
