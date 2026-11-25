import { describe, expect, it } from 'vitest';
import { YARD_TUNE, YardRules } from './YardRules';
import type { YardMaze } from './YardRules';

// a cross of corridors in a 9 x 9 yard: row 4 and column 4 are open, the rest is wall
const cross: YardMaze = {
	width: 9,
	height: 9,
	open: (x, y) => x >= 0 && y >= 0 && x < 9 && y < 9 && (x === 4 || y === 4)
};

describe('the yard', () => {
	it('lays bombs only where nothing lies and only as many as he has', () => {
		const yard = new YardRules(cross, [[6, 4]]);
		expect(yard.place(0, 0)).toBe(false); // a wall
		expect(yard.place(6, 4)).toBe(false); // a crate
		expect(yard.place(4, 4)).toBe(true);
		expect(yard.place(4, 4)).toBe(false); // a bomb
		expect(yard.place(3, 4)).toBe(false); // one bomb at a time
		expect(yard.blocks(4, 4)).toBe(true);
	});

	it('blows a cross along the corridors after the fuse: walls stop it, the first crate breaks', () => {
		const yard = new YardRules(cross, [
			[5, 4],
			[6, 4]
		]);
		yard.range = 3;
		yard.place(4, 4);
		expect(yard.update(YARD_TUNE.fuse - 0.01)).toEqual([]);
		expect(yard.blasts).toHaveLength(0);
		const broken = yard.update(0.02);
		expect(broken).toEqual([{ x: 5, y: 4, fromX: 4, fromY: 4 }]);
		expect(yard.crates.has('5,4')).toBe(false);
		expect(yard.crates.has('6,4')).toBe(true); // shielded by the first
		const [blast] = yard.blasts;
		const arm = (dx: number, dy: number) => blast.arms.find((a) => a.dx === dx && a.dy === dy)!;
		expect(arm(1, 0)).toMatchObject({ len: 1, crate: true });
		expect(arm(-1, 0)).toMatchObject({ len: 3, wall: false });
		expect(arm(0, -1)).toMatchObject({ len: 3 });
		expect(yard.burning(1, 4)).toBe(blast);
		expect(yard.burning(6, 4)).toBeUndefined();
		expect(yard.burning(3, 3)).toBeUndefined(); // a wall corner, off the cross
		yard.update(YARD_TUNE.burn);
		expect(yard.burning(4, 4)).toBeUndefined();
		yard.update(YARD_TUNE.life);
		expect(yard.blasts).toHaveLength(0);
	});

	it('stops at the wall and says so', () => {
		const yard = new YardRules(cross, []);
		yard.range = 5;
		yard.place(4, 1);
		yard.update(YARD_TUNE.fuse);
		const up = yard.blasts[0].arms.find((a) => a.dy === -1)!;
		expect(up).toMatchObject({ len: 1, wall: true });
	});

	it('sets off a bomb its fire reaches, in the same step', () => {
		const yard = new YardRules(cross, []);
		yard.maxBombs = 2;
		yard.place(4, 4);
		yard.update(1);
		yard.place(4, 6);
		yard.update(YARD_TUNE.fuse - 1);
		expect(yard.bombs).toHaveLength(0);
		expect(yard.blasts.map((b) => `${b.x},${b.y}`).sort()).toEqual(['4,4', '4,6']);
	});

	it('leaves pickups in some crates; taking them adds a bomb or a tile of fire, up to the cap', () => {
		const crates: Array<[number, number]> = [];
		for (let x = 0; x < 9; x += 1) if (x !== 4) crates.push([x, 4]);
		let found = 0;
		for (let seed = 1; seed < 40; seed += 1) {
			const yard = new YardRules(cross, crates, seed);
			yard.place(4, 4);
			yard.update(YARD_TUNE.fuse);
			found += yard.pickups.size;
		}
		// two crates a blast, a 30% chance each
		expect(found).toBeGreaterThan(10);
		expect(found).toBeLessThan(40);
		const yard = new YardRules(cross, []);
		yard.pickups.set('4,5', 'bomb');
		yard.pickups.set('4,6', 'flame');
		expect(yard.take(4, 5)).toBe('bomb');
		expect(yard.take(4, 5)).toBeNull();
		expect(yard.take(4, 6)).toBe('flame');
		expect([yard.maxBombs, yard.range]).toEqual([2, 3]);
	});
});
