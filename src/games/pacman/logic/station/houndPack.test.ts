import { describe, expect, it } from 'vitest';
import { GRID_STATION } from '../../config/mazes';
import { isTeleportToken } from '../../config/gridConfig';
import type { SwarmMaze } from './SwarmField';
import type { HoundTuning } from './HoundPack';
import { HoundPack } from './HoundPack';

const MAZE: SwarmMaze = {
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

const TUNING: HoundTuning = {
	heroSpeed: 6,
	stalk: 0.55,
	lunge: 1.3,
	flee: 1.15,
	recover: 0.35,
	sight: 7,
	windup: 0.35,
	dash: 1.1,
	tired: 1,
	sniffChance: 0,
	sniff: [0.3, 0.9],
	bite: 0.55,
	afterLight: 0.6
};

const hero = (x: number, y: number) => ({ x: x + 0.5, y: y + 0.5, facing: null });

describe('the hounds', () => {
	it('stay in the corridors whatever they do', () => {
		const pack = new HoundPack(MAZE, 7);
		for (let i = 0; i < 6; i += 1) pack.spawn({ x: 12, y: 12 });
		for (let t = 0; t < 30; t += 1 / 60) {
			const hx = 2 + Math.floor((t * 2) % 20);
			pack.update(1 / 60, hero(hx, 24), [], TUNING);
			for (const h of pack.list) {
				expect(MAZE.walkable(Math.floor(h.x), Math.floor(h.y))).toBe(true);
			}
		}
	});

	it('hunt the hero down and bite', () => {
		const pack = new HoundPack(MAZE, 3);
		pack.spawn({ x: 2, y: 2 }, 'chaser');
		let bitten = 0;
		for (let t = 0; t < 20 && bitten === 0; t += 1 / 60) {
			bitten += pack.update(1 / 60, hero(12, 20), [], TUNING).length;
		}
		expect(bitten).toBe(1);
		expect(pack.list[0].mode).toBe('flee');
	});

	it('see the hero down a straight corridor, hold a breath, then dash', () => {
		const pack = new HoundPack(MAZE, 5);
		const h = pack.spawn({ x: 10, y: 24 }, 'chaser');
		pack.update(1 / 60, hero(4, 24), [], TUNING);
		expect(h.mode).toBe('windup');
		for (let t = 0; t < TUNING.windup + 0.05; t += 1 / 60)
			pack.update(1 / 60, hero(4, 24), [], TUNING);
		expect(h.mode).toBe('lunge');
		for (let t = 0; t < 0.5; t += 1 / 60) pack.update(1 / 60, hero(4, 24), [], TUNING);
		expect(h.speed).toBeGreaterThan(TUNING.heroSpeed);
	});

	it('flee from fire and keep out of it', () => {
		const pack = new HoundPack(MAZE, 9);
		const h = pack.spawn({ x: 11, y: 24 }, 'chaser');
		const torch = { x: 6.5, y: 24.5, r: 2.5 };
		let closest = Infinity;
		for (let t = 0; t < 6; t += 1 / 60) {
			pack.update(1 / 60, hero(6, 24), [torch], TUNING);
			closest = Math.min(closest, Math.hypot(h.x - torch.x, h.y - torch.y));
		}
		expect(closest).toBeGreaterThan(torch.r - 0.3);
		expect(pack.update(1 / 60, hero(6, 24), [torch], TUNING)).toHaveLength(0);
	});

	it('spread out instead of piling on one tile', () => {
		const pack = new HoundPack(MAZE, 11);
		for (let i = 0; i < 5; i += 1) pack.spawn({ x: 12, y: 10 });
		for (let t = 0; t < 4; t += 1 / 60)
			pack.update(1 / 60, hero(12, 24), [{ x: 12.5, y: 24.5, r: 3 }], TUNING);
		const tiles = new Set(pack.list.map((h) => `${Math.floor(h.x)},${Math.floor(h.y)}`));
		expect(tiles.size).toBeGreaterThanOrEqual(4);
	});
});
