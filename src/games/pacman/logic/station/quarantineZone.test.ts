import { describe, expect, it } from 'vitest';
import { GRID_STATION } from '../../config/mazes';
import { seededRandom } from '../../render/common/random';
import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { planZone, zoneSpots, type ZoneKind } from './QuarantineZone';

const grid = new GridService(new GridModel(GRID_STATION));
const LAIR = new Set(['LE', 'LT', 'BY', 'IY', 'PY', 'CE']);
const kind = (x: number, y: number): ZoneKind => {
	const t = grid.tileAt(x, y);
	if (t === 'ES') return 'void';
	if (LAIR.has(t)) return 'lair';
	return grid.isGhostWalkable(x, y, false) && !grid.teleportDestination(x, y) ? 'open' : 'wall';
};
const W = grid.width;
const H = grid.height;

/** Plans zones round many open tiles and seeds. */
function zones() {
	const out: Array<{
		hero: { x: number; y: number };
		plan: NonNullable<ReturnType<typeof planZone>>;
	}> = [];
	for (let seed = 1; seed <= 12; seed += 1)
		for (let y = 1; y < H - 1; y += 3)
			for (let x = 1; x < W - 1; x += 3) {
				if (kind(x, y) !== 'open') continue;
				const hero = { x, y };
				const plan = planZone(
					kind,
					W,
					H,
					hero,
					hero,
					[9, 11],
					seededRandom(seed * 977 + x * 31 + y)
				);
				if (plan) out.push({ hero, plan });
			}
	return out;
}

describe('the quarantine zone', () => {
	it('always holds the hero, never the void, and has two doors at least', () => {
		const all = zones();
		expect(all.length).toBeGreaterThan(50);
		for (const { hero, plan } of all) {
			expect(plan.tiles.has(hero.y * W + hero.x)).toBe(true);
			for (const k of plan.tiles) expect(kind(k % W, Math.floor(k / W))).not.toBe('void');
			expect(plan.doors.length).toBeGreaterThanOrEqual(2);
		}
	});

	it('never cuts a wall island: every small block is wholly in or wholly out', () => {
		for (const { plan } of zones()) {
			const seen = new Set<number>();
			for (let y = 0; y < H; y += 1)
				for (let x = 0; x < W; x += 1) {
					if (kind(x, y) !== 'wall' || seen.has(y * W + x)) continue;
					const isle = [y * W + x];
					seen.add(y * W + x);
					for (let i = 0; i < isle.length; i += 1)
						for (const [dx, dy] of [
							[1, 0],
							[-1, 0],
							[0, 1],
							[0, -1]
						]) {
							const nx = (isle[i] % W) + dx;
							const ny = Math.floor(isle[i] / W) + dy;
							if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
							if (kind(nx, ny) !== 'wall' || seen.has(ny * W + nx)) continue;
							seen.add(ny * W + nx);
							isle.push(ny * W + nx);
						}
					if (isle.length > 45) continue;
					const inside = isle.filter((k) => plan.tiles.has(k)).length;
					expect(inside === 0 || inside === isle.length).toBe(true);
				}
		}
	});

	it('keeps the lair whole, in or out, with its ring', () => {
		for (const { plan } of zones()) {
			const lair: number[] = [];
			for (let y = 0; y < H; y += 1)
				for (let x = 0; x < W; x += 1) if (kind(x, y) === 'lair') lair.push(y * W + x);
			const inside = lair.filter((k) => plan.tiles.has(k)).length;
			expect(inside === 0 || inside === lair.length).toBe(true);
		}
	});

	it('puts a door only where a corridor leaves the zone, from an inside tile to an outside one', () => {
		for (const { plan } of zones()) {
			for (const d of plan.doors) {
				expect(plan.tiles.has(d.y * W + d.x)).toBe(true);
				expect(plan.tiles.has((d.y + d.dy) * W + d.x + d.dx)).toBe(false);
				expect(kind(d.x, d.y)).toBe('open');
				expect(kind(d.x + d.dx, d.y + d.dy)).toBe('open');
			}
		}
	});

	it('picks two different posts on doors', () => {
		for (const { hero, plan } of zones().slice(0, 40)) {
			const spots = zoneSpots(plan, hero, true);
			expect(spots).toHaveLength(2);
			expect(spots[0].x === spots[1].x && spots[0].y === spots[1].y).toBe(false);
			for (const p of spots) expect(plan.doors.some((d) => d.x === p.x && d.y === p.y)).toBe(true);
		}
	});
});
