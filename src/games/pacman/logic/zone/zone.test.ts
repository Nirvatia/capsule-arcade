import { describe, expect, it } from 'vitest';
import { GRID_ZONE } from '../../config/mazes/grid_zone';
import { validateMaze } from '../../config/mazes/validateMaze';
import { ZONE } from '../../config/zoneConfig';
import { EmissionClock } from './EmissionClock';
import { applyWish, NO_MODIFIERS, offerWishes, WISHES } from './ZoneWishes';
import { ZoneService } from './ZoneService';

describe('the Zone', () => {
	it('has a maze that passes the game rules', () => {
		expect(validateMaze(GRID_ZONE)).toEqual([]);
	});

	it('runs the emission: calm, siren, wave, a hurt at the peak, then calm again', () => {
		const clock = new EmissionClock();
		const seen: string[] = [];
		for (
			let t = 0;
			t < ZONE.emission.first + ZONE.emission.siren + ZONE.emission.wave + 1;
			t += 0.1
		) {
			seen.push(...clock.update(0.1));
		}
		expect(seen).toEqual(['siren', 'wave', 'peak', 'over']);
		expect(clock.phase).toBe('calm');
	});

	it('has no emission in a world that wished it away', () => {
		const clock = new EmissionClock(1, true);
		expect(clock.update(500)).toEqual([]);
		expect(clock.dangerous).toBe(false);
	});

	it('puts every anomaly on a free corridor tile, away from the spawn, and keeps the guards by the artifacts', () => {
		const z = new ZoneService(7);
		const spawn = z.grid.playerSpawn;
		for (const a of z.anomalies.list) {
			expect(z.grid.isGhostWalkable(a.x, a.y, false)).toBe(true);
			if (!a.anchored) {
				expect(Math.abs(a.x - spawn.x) + Math.abs(a.y - spawn.y)).toBeGreaterThanOrEqual(
					ZONE.anomalies.spawnClear
				);
			}
		}
		expect(z.anomalies.list.filter((a) => a.anchored)).toHaveLength(z.map.artifacts.length);
		const before = z.anomalies.list.filter((a) => !a.anchored).map((a) => `${a.x},${a.y}`);
		z.anomalies.reshuffle();
		expect(z.anomalies.list.filter((a) => !a.anchored).map((a) => `${a.x},${a.y}`)).not.toEqual(
			before
		);
	});

	it('warns before an anomaly fires, and a bolt makes it inert', () => {
		const z = new ZoneService(3);
		const heat = z.anomalies.list.find((a) => a.kind === 'heat');
		if (!heat) {
			throw new Error('no heat anomaly');
		}
		const seen = new Set<string>();
		for (let i = 0; i < 400; i += 1) {
			z.anomalies.update(0.02);
			seen.add(z.anomalies.stateOf(heat));
		}
		expect(seen.has('warn') && seen.has('active') && seen.has('idle')).toBe(true);
		z.anomalies.disarm(heat, 5);
		expect(z.anomalies.stateOf(heat)).toBe('inert');
	});

	it('throws a bolt only with one in the pocket, and spends it', () => {
		const z = new ZoneService(1);
		z.update(0.05, 'LEFT');
		expect(z.throwBolt()).toBe(false);
		z.bolts = 2;
		expect(z.throwBolt()).toBe(true);
		expect(z.bolts).toBe(1);
	});

	it('keeps a tushkan alive and moving in the corridors, and kills it in an active anomaly', () => {
		const z = new ZoneService(5);
		const t = z.tushkans.list[0];
		const start = { x: t.x, y: t.y };
		for (let i = 0; i < 300; i += 1) {
			z.tushkans.update(0.05, { hero: { x: 12, y: 6 }, lure: null, deadly: () => false });
			expect(z.grid.isGhostWalkable(Math.floor(t.x), Math.floor(t.y), false)).toBe(true);
		}
		expect(Math.hypot(t.x - start.x, t.y - start.y)).toBeGreaterThan(0);
		z.tushkans.update(0.05, { hero: { x: 12, y: 6 }, lure: null, deadly: () => true });
		expect(t.state).toBe('dead');
	});

	it('offers three different wishes, each with a price, and applies the chosen one', () => {
		const offer = offerWishes(Math.random);
		expect(new Set(offer.map((w) => w.id)).size).toBe(3);
		for (const w of WISHES) {
			expect(w.price.length).toBeGreaterThan(0);
		}
		const mods = applyWish(NO_MODIFIERS, WISHES.find((w) => w.id === 'gold') ?? WISHES[0]);
		expect(mods.score).toBe(5000);
		expect(mods.boltMax).toBe(0);
	});

	it('opens the Monolith with the artifacts and the nuts, then offers wishes and clears the level', () => {
		const z = new ZoneService(2);
		expect(z.monolithOpen).toBe(false);
		z.cheatOpen();
		z.update(0.05, null);
		expect(z.monolithOpen).toBe(true);
		expect(z.artifactsTaken).toBe(z.map.artifacts.length);
		z.player.placeAt(z.map.monolith);
		z.update(0.05, null);
		expect(z.state).toBe('wish');
		expect(z.offered).toHaveLength(3);
		z.chooseWish(z.offered[0].id);
		expect(z.state).toBe('cleared');
		expect(z.nextModifiers()).not.toEqual(z.mods);
	});

	it('takes lives from a hero in the open at the wave, and none in a shelter', () => {
		const open = new ZoneService(4);
		const hid = new ZoneService(4);
		hid.player.placeAt(hid.map.shelters[0]);
		for (const z of [open, hid]) {
			z.emission.skipCalm();
			for (let i = 0; i < 12 * 20; i += 1) {
				z.update(0.05, null);
				z.player.grantInvulnerability(0);
			}
		}
		expect(hid.hp).toBe(ZONE.hp);
		expect(open.hp).toBeLessThan(ZONE.hp);
	});
});
