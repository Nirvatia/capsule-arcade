import { describe, expect, it } from 'vitest';
import { GRID_STATION } from '../../config/mazes';
import type { PacmanEventMap } from '../../core/Events';
import { EventBus } from '../../engine/EventBus';
import { GhostService } from '../actors/GhostService';
import type { GhostTile } from '../actors/GhostModel';
import { PlayerService } from '../actors/PlayerService';
import { LevelProgress } from '../level/LevelProgress';
import { ScoreModel } from '../level/ScoreModel';
import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { ESCAPE_TUNE, StationEscape } from './StationEscape';
import { SQUAD_TUNE, StationSquad } from './StationSquad';
import type { SquadWorld } from './StationSquad';

function station() {
	const grid = new GridService(new GridModel(GRID_STATION));
	const events = new EventBus<PacmanEventMap>();
	const progress = new LevelProgress(grid, new ScoreModel(), events);
	const player = new PlayerService(grid, progress, events);
	const ghosts = new GhostService(grid, player, progress);
	player.reset();
	ghosts.reset();
	const eaten = new Set<string>();
	const world: SquadWorld = {
		walkable: (x, y) => grid.isGhostWalkable(x, y, false),
		teleport: (x, y) => grid.teleportDestination(x, y),
		eaten: (x, y) => eaten.has(`${x},${y}`),
		cell: (x, y) => grid.tileAt(x, y) === 'EU'
	};
	return { grid, player, ghosts, world, eaten };
}

/** Lets the ghosts out of the lair and hunting. */
function release(s: ReturnType<typeof station>, seconds = 12): void {
	for (let t = 0; t < seconds; t += 1 / 60) s.ghosts.update(1 / 60);
}

describe('the squad guide', () => {
	it('steers a hunting ghost, turning it back if it says so', () => {
		const s = station();
		release(s);
		const ghost = s.ghosts.list.find((g) => g.state === 'active')!;
		const asked: string[] = [];
		s.ghosts.setSquadGuide({
			direction: (g) => {
				if (g !== ghost) return null;
				const back = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' } as const;
				const d = ghost.facing ? back[ghost.facing] : 'UP';
				asked.push(d);
				return d;
			},
			speedFactor: () => 1
		});
		const seen = new Set<string>();
		for (let t = 0; t < 3; t += 1 / 60) {
			s.ghosts.update(1 / 60);
			seen.add(`${ghost.tile.x},${ghost.tile.y}`);
		}
		// turned back at every tile: it rocks between two
		expect(asked.length).toBeGreaterThan(5);
		expect(seen.size).toBeLessThanOrEqual(3);
	});
});

describe('the director', () => {
	it('runs calm, tell, play, calm; only the train before a quarter of the charge', () => {
		const s = station();
		const squad = new StationSquad(s.world, 3);
		const seen: string[] = [];
		for (let t = 0; t < 60; t += 1 / 30) {
			squad.update(1 / 30, s.ghosts, s.player.tile, 0);
			const now = `${squad.phase}:${squad.phase === 'tell' ? squad.next : squad.play}`;
			if (seen[seen.length - 1] !== now) seen.push(now);
		}
		expect(seen.slice(0, 4)).toEqual(['calm:calm', 'tell:train', 'on:train', 'calm:calm']);
		expect(seen.every((p) => !p.includes('pincer') && !p.includes('mimic'))).toBe(true);
	});

	it('opens the pincer and the mimics as the hatch charges', () => {
		const s = station();
		const squad = new StationSquad(s.world, 5);
		const plays = new Set<string>();
		for (let t = 0; t < 400; t += 1 / 30) {
			squad.update(1 / 30, s.ghosts, s.player.tile, 1);
			if (squad.phase === 'on') plays.add(squad.play);
			if (squad.play === 'mimic') squad.reset(s.ghosts);
		}
		expect([...plays].sort()).toEqual(['mimic', 'pincer', 'train']);
	});
});

describe('the plays', () => {
	it('the train: the cars line up behind the leader', () => {
		const s = station();
		release(s);
		const squad = new StationSquad(s.world, 1);
		s.ghosts.setSquadGuide(squad);
		squad.play = 'train';
		squad.phase = 'on';
		squad.left = 99;
		const hero = { x: 1, y: 24 };
		for (let t = 0; t < 10; t += 1 / 60) {
			squad.update(1 / 60, s.ghosts, hero, 0);
			s.ghosts.update(1 / 60);
		}
		const lead = s.ghosts.list.find((g) => g.kind === squad.leader)!;
		// every car stands on the leader's trail
		const trail = new Set(squad.trail.map((t) => `${t.x},${t.y}`));
		const cars = s.ghosts.list.filter((g) => g !== lead && g.state === 'active');
		expect(cars.length).toBeGreaterThan(0);
		const onTrail = cars.filter((g) => trail.has(`${g.tile.x},${g.tile.y}`));
		expect(onTrail.length).toBe(cars.length);
	});

	it('the pincer: finds the junctions round him and sends one hunter to each', () => {
		const s = station();
		const squad = new StationSquad(s.world, 1);
		// (12,20) is the hero's start: a wall above; left and right, each a step away, a junction
		const exits = squad
			.exits({ x: 12, y: 20 })
			.map((t) => `${t.x},${t.y}`)
			.sort();
		expect(exits).toEqual(['11,20', '13,20']);
		release(s);
		s.ghosts.setSquadGuide(squad);
		squad.phase = 'calm';
		squad.left = 0;
		// force the pincer next
		(squad as unknown as { pickNext: () => string }).pickNext = () => 'pincer';
		squad.update(0.01, s.ghosts, { x: 12, y: 20 }, 1);
		expect(squad.phase).toBe('tell');
		const claims = squad.claims;
		expect(claims.length).toBe(s.ghosts.list.filter((g) => g.state === 'active').length);
		// one drives him, the others hold distinct ways out
		const spots = claims.slice(1).map((c) => `${c.x},${c.y}`);
		expect(new Set(spots).size).toBe(spots.length);
	});

	it('the mimics: hide on eaten tiles only, bite and hold him, harmless for a moment', () => {
		const s = station();
		release(s);
		const squad = new StationSquad(s.world, 2);
		const hero: GhostTile = { x: 12, y: 20 };
		// he has eaten the bottom row
		for (let x = 1; x < 24; x += 1) s.eaten.add(`${x},24`);
		(squad as unknown as { pickNext: () => string }).pickNext = () => 'mimic';
		squad.left = 0;
		squad.update(0.01, s.ghosts, hero, 1);
		squad.update(SQUAD_TUNE.tell + 0.01, s.ghosts, hero, 1);
		expect(squad.play).toBe('mimic');
		squad.update(SQUAD_TUNE.fade + 0.01, s.ghosts, hero, 1);
		expect(squad.mimics.length).toBeGreaterThan(0);
		for (const m of squad.mimics) {
			expect(m.state).toBe('hidden');
			expect(s.eaten.has(`${m.x},${m.y}`)).toBe(true);
			const g = s.ghosts.list.find((gg) => gg.kind === m.kind)!;
			expect([g.tile.x, g.tile.y]).toEqual([m.x, m.y]);
		}
		const m = squad.mimics[0];
		const ev = squad.update(0.01, s.ghosts, { x: m.x, y: m.y }, 1);
		expect(ev.grab).toBe(SQUAD_TUNE.grab);
		expect(squad.hidden(m.kind)).toBeUndefined();
		expect(squad.harmless(m.kind)).toBe(true);
		squad.update(SQUAD_TUNE.harmless + 0.1, s.ghosts, hero, 1);
		expect(squad.harmless(m.kind)).toBe(false);
	});

	it('a power cell breaks the play and shows every mimic', () => {
		const s = station();
		release(s);
		const squad = new StationSquad(s.world, 2);
		for (let x = 1; x < 24; x += 1) s.eaten.add(`${x},24`);
		(squad as unknown as { pickNext: () => string }).pickNext = () => 'mimic';
		squad.left = 0;
		squad.update(0.01, s.ghosts, { x: 12, y: 20 }, 1);
		squad.update(SQUAD_TUNE.tell + SQUAD_TUNE.fade + 0.1, s.ghosts, { x: 12, y: 20 }, 1);
		expect(squad.mimics.length).toBeGreaterThan(0);
		squad.onPower(s.ghosts);
		expect(squad.mimics).toHaveLength(0);
		expect(squad.phase).toBe('calm');
	});
});

describe('the escape', () => {
	const s = station();
	const world = { walkable: (x: number, y: number) => s.grid.isPlayerWalkable(x, y) };
	const make = () => new StationEscape(world, { x: 12, y: 16 }, { x: 6, y: 1 });

	it('charges with the food, arms, and starts at the console along a route to the hatch', () => {
		const e = make();
		e.setFood(10, 100);
		expect(e.update(0.1, { x: 1, y: 2 }).armed).toBe(false);
		e.setFood(Math.ceil(100 * ESCAPE_TUNE.charge), 100);
		expect(e.update(0.1, { x: 1, y: 2 }).armed).toBe(true);
		expect(e.update(0.1, { x: 1, y: 2 }).started).toBe(false);
		expect(e.update(0.1, { x: 12, y: 16 }).started).toBe(true);
		expect(e.route[0]).toEqual({ x: 12, y: 16 });
		expect(e.route[e.route.length - 1]).toEqual({ x: 6, y: 1 });
		for (let i = 1; i < e.route.length; i += 1) {
			const a = e.route[i - 1];
			const b = e.route[i];
			expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBe(1);
		}
		expect(e.doors.length).toBeGreaterThan(0);
	});

	it('runs along: doors close ahead in time to be beaten and shut behind him', () => {
		const e = make();
		e.setFood(1, 1);
		e.update(0, { x: 0, y: 0 });
		e.update(0, { x: 12, y: 16 });
		const path = e.route.slice();
		const door = e.doors[0];
		// at full speed (about 8 tiles a second) a step every 0.125 s
		for (const t of path) {
			e.update(0.125, t);
			if (t.x === door.x && t.y === door.y) expect(door.closed).toBeLessThan(ESCAPE_TUNE.blocks);
			if (e.state === 'out') break;
		}
		expect(e.state).toBe('out');
		expect(door.passed).toBe(true);
	});

	it('lays the route anew after a wrong turn', () => {
		const e = make();
		e.setFood(1, 1);
		e.update(0, { x: 0, y: 0 });
		e.update(0, { x: 12, y: 16 });
		const off = { x: 1, y: 24 };
		expect(e.update(0.1, off).rebuilt).toBe(true);
		expect(e.route[0]).toEqual(off);
		expect(e.route[e.route.length - 1]).toEqual({ x: 6, y: 1 });
	});

	it('forgives the first touch with the pulse, restarts on the second', () => {
		const e = make();
		e.setFood(1, 1);
		e.update(0, { x: 0, y: 0 });
		e.update(0, { x: 12, y: 16 });
		expect(e.touch()).toBe('pulse');
		expect(e.pulse).toBe(false);
		expect(e.touch()).toBe('restart');
		expect(e.pulse).toBe(true);
		expect(e.state).toBe('running');
		expect(e.route[0]).toEqual({ x: 12, y: 16 });
	});

	it('the chase comes from behind: the train never steps on his way ahead', () => {
		const s = station();
		release(s);
		const squad = new StationSquad(s.world, 4);
		s.ghosts.setSquadGuide(squad);
		// his way ahead: the whole top row
		const ahead = (x: number, y: number) => y === 2;
		const hero = { x: 6, y: 2 };
		// Blinky on his row, seven tiles off: head on along it is the shortest way; the rest held
		for (const g of s.ghosts.list) {
			if (g.kind !== 'BLINKY') s.ghosts.freeze(g.kind, 1e6);
		}
		const blinky = s.ghosts.list.find((g) => g.kind === 'BLINKY')!;
		blinky.teleportTo({ x: 13, y: 2 });
		blinky.setState('active');
		squad.chase(s.ghosts, ahead);
		const leader = () => s.ghosts.list.find((g) => g.kind === squad.leader);
		const stepped: string[] = [];
		let caught = false;
		for (let t = 0; t < 8 && !caught; t += 1 / 60) {
			squad.update(1 / 60, s.ghosts, hero, 1);
			s.ghosts.update(1 / 60);
			const l = leader();
			if (!l) continue;
			// until it catches him (then the game's touch rules take over)
			if (l.tile.x === hero.x && l.tile.y === hero.y) caught = true;
			else if (ahead(l.tile.x, l.tile.y) && l.tile.x !== 13)
				stepped.push(`${l.tile.x},${l.tile.y}`);
		}
		expect(caught).toBe(true);
		expect(squad.leader).not.toBeNull();
		expect(stepped).toEqual([]);
	});
});
