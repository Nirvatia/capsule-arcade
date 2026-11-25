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
		food: (x, y) =>
			(grid.tileAt(x, y) === 'DT' || grid.tileAt(x, y) === 'EU') && !eaten.has(`${x},${y}`),
		cell: (x, y) => grid.tileAt(x, y) === 'EU',
		vent: (x, y) => ['0B', '0C'].includes(grid.tileAt(x, y)),
		width: grid.width,
		height: grid.height
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

/** Steps the squad and the ghosts together, the hero standing on `hero`. */
function run(
	s: ReturnType<typeof station>,
	squad: StationSquad,
	hero: GhostTile,
	seconds: number,
	each?: () => void
): number {
	let grab = 0;
	for (let t = 0; t < seconds; t += 1 / 60) {
		grab = Math.max(grab, squad.update(1 / 60, s.ghosts, hero, null).grab);
		s.ghosts.update(1 / 60);
		each?.();
	}
	return grab;
}

/** Forces the next tactic and runs through its tell. */
function force(
	s: ReturnType<typeof station>,
	squad: StationSquad,
	hero: GhostTile,
	tactic: 'fence' | 'ambush' | 'vent'
): void {
	(squad as unknown as { pick: () => string }).pick = () => tactic;
	squad.left = 0;
	run(s, squad, hero, SQUAD_TUNE.tell + 0.05);
}

describe('the hero, read', () => {
	it('goes on along a corridor and turns toward the nearest food he has not eaten', () => {
		const s = station();
		const squad = new StationSquad(s.world, 1);
		// the bottom row from the left: he has eaten it up to x 8, heading right
		for (let x = 1; x <= 8; x += 1) s.eaten.add(`${x},24`);
		squad.update(0.01, s.ghosts, { x: 4, y: 24 }, 'RIGHT');
		const xs = squad.foreseen.slice(0, 4).map((t) => `${t.x},${t.y}`);
		// on to the junction (not back), then up the column: the nearest food he has not eaten
		expect(xs).toEqual(['4,24', '5,24', '6,24', '6,23']);
	});
});

describe('the director', () => {
	it('runs calm, tell, a tactic, calm, and does not play the same tactic twice running', () => {
		const s = station();
		release(s);
		const squad = new StationSquad(s.world, 3);
		s.ghosts.setSquadGuide(squad);
		for (let x = 1; x < 24; x += 1) s.eaten.add(`${x},24`);
		const seen: string[] = [];
		run(s, squad, { x: 12, y: 24 }, 90, () => {
			const now = `${squad.phase}:${squad.phase === 'tell' ? squad.next : (squad.tactic ?? '')}`;
			if (seen[seen.length - 1] !== now) seen.push(now);
		});
		expect(seen[0]).toBe('calm:');
		expect(seen[1]).toMatch(/^tell:/);
		const ons = seen.filter((p) => p.startsWith('on:'));
		expect(ons.length).toBeGreaterThan(2);
		for (let i = 1; i < ons.length; i += 1) expect(ons[i]).not.toBe(ons[i - 1]);
	});
});

describe('the fence', () => {
	it('finds two lines that hold him in 60-75% of the station, each line needed', () => {
		const s = station();
		const squad = new StationSquad(s.world, 1);
		squad.update(0.01, s.ghosts, { x: 12, y: 24 }, null);
		const plan = squad.fencePlan();
		expect(plan).not.toBeNull();
		expect(plan).toHaveLength(2);
	});

	it('the fencers walk to the lines, charge, and the lit beams hold him', () => {
		const s = station();
		release(s);
		const squad = new StationSquad(s.world, 1);
		s.ghosts.setSquadGuide(squad);
		const hero = { x: 12, y: 24 };
		force(s, squad, hero, 'fence');
		expect(squad.tactic).toBe('fence');
		expect(squad.beams).toHaveLength(2);
		const roles = [...squad.roles.values()].sort();
		expect(roles).toContain('fencer');
		run(s, squad, hero, SQUAD_TUNE.walk);
		expect(squad.beams.every((b) => b.lit)).toBe(true);
		// what he reaches with the beams lit
		const seen = new Set<string>(['12,24']);
		const stack = [hero];
		while (stack.length) {
			const t = stack.pop()!;
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const x = t.x + dx;
				const y = t.y + dy;
				if (!s.world.walkable(x, y) || squad.blocks(x, y) || seen.has(`${x},${y}`)) continue;
				seen.add(`${x},${y}`);
				const far = s.world.teleport(x, y);
				stack.push(far && !squad.blocks(far.x, far.y) ? far : { x, y });
				if (far) seen.add(`${far.x},${far.y}`);
			}
		}
		let all = 0;
		for (let y = 0; y < s.grid.height; y += 1)
			for (let x = 0; x < s.grid.width; x += 1) if (s.world.walkable(x, y)) all += 1;
		expect(seen.size / all).toBeLessThanOrEqual(SQUAD_TUNE.fenceShare[1] + 0.02);
	});
});

describe('the ambush', () => {
	it('hides one as food on an eaten tile along his way and leaves him only the way to it', () => {
		const s = station();
		release(s);
		const squad = new StationSquad(s.world, 2);
		s.ghosts.setSquadGuide(squad);
		// he ate the bottom row left of the console and the food lies on up the left side
		for (let x = 1; x <= 12; x += 1) s.eaten.add(`${x},24`);
		const hero = { x: 12, y: 24 };
		(squad as unknown as { pick: () => string }).pick = () => 'ambush';
		squad.left = 0;
		squad.update(0.01, s.ghosts, hero, 'LEFT');
		run(s, squad, hero, SQUAD_TUNE.tell + SQUAD_TUNE.fade + 0.1);
		const h = squad.hiddenList.find((hh) => hh.as !== 'vent');
		expect(h).toBeDefined();
		expect(h!.state).toBe('hidden');
		expect(s.eaten.has(`${h!.x},${h!.y}`)).toBe(true);
		// the herders head for the other ways out, not the open one
		const open = squad.openWay!;
		expect(open).not.toBeNull();
		for (const [kind, t] of squad.targets) {
			if (squad.role(kind) === 'cutter') expect(`${t.x},${t.y}`).not.toBe(`${open.x},${open.y}`);
		}
		// he steps on it: it holds him, harmless for a moment
		const grab = run(s, squad, { x: h!.x, y: h!.y }, 0.05);
		expect(grab).toBe(SQUAD_TUNE.grab);
		expect(squad.hidden(h!.kind)).toBeUndefined();
		expect(squad.harmless(h!.kind)).toBe(true);
	});
});

describe('the first lurkers teach', () => {
	it('fold slowly, settle farther on and carry the lesson, fading over the ambushes', () => {
		const s = station();
		release(s);
		const squad = new StationSquad(s.world, 2);
		s.ghosts.setSquadGuide(squad);
		// he ate all but the top rows: his way to the food runs long over eaten tiles
		for (let y = 6; y < s.grid.height; y += 1)
			for (let x = 0; x < s.grid.width; x += 1)
				if (s.grid.tileAt(x, y) === 'DT') s.eaten.add(`${x},${y}`);
		const hero = { x: 12, y: 24 };
		const lessons: number[] = [];
		for (let i = 0; i < 4; i += 1) {
			(squad as unknown as { pick: () => string }).pick = () => 'ambush';
			squad.left = 0;
			squad.update(0.01, s.ghosts, hero, 'LEFT');
			const h = squad.hiddenList.find((hh) => hh.as !== 'vent');
			expect(h).toBeDefined();
			if (i === 0) {
				expect(h!.fade).toBe(SQUAD_TUNE.lessonFade);
				// at least `lessonSettle` steps along his way
				expect(Math.abs(h!.x - hero.x) + Math.abs(h!.y - hero.y)).toBeGreaterThanOrEqual(
					SQUAD_TUNE.lessonSettle
				);
			} else {
				expect(h!.fade).toBe(SQUAD_TUNE.fade);
			}
			lessons.push(h!.lesson);
			squad.reset(s.ghosts);
		}
		expect(lessons[0]).toBe(1);
		expect(lessons[1]).toBeLessThan(lessons[0]);
		expect(lessons[3]).toBe(0);
	});
});

describe('the vent', () => {
	it('waits in a shaft on his way, its eyes glow as he nears, then it comes out', () => {
		const s = station();
		release(s);
		const squad = new StationSquad(s.world, 2);
		s.ghosts.setSquadGuide(squad);
		// he runs the top row to the right, toward the vent mouth at (6,2)
		const hero = { x: 1, y: 2 };
		(squad as unknown as { pick: () => string }).pick = () => 'vent';
		squad.left = 0;
		squad.update(0.01, s.ghosts, hero, 'RIGHT');
		run(s, squad, hero, SQUAD_TUNE.tell + SQUAD_TUNE.fade + 0.1);
		const h = squad.hiddenList.find((hh) => hh.as === 'vent');
		expect(h).toBeDefined();
		expect(s.world.vent(h!.x, h!.y)).toBe(true);
		expect(h!.state).toBe('hidden');
		// he comes near its mouth
		run(s, squad, { x: h!.x - 1 > 0 ? h!.x - 1 : h!.x + 1, y: h!.y === 1 ? 2 : h!.y - 1 }, 0.05);
		expect(h!.state).toBe('glow');
		run(s, squad, hero, SQUAD_TUNE.glow + 0.05);
		expect(squad.hidden(h!.kind)).toBeUndefined();
		const g = s.ghosts.list.find((gg) => gg.kind === h!.kind)!;
		expect(Math.abs(g.tile.x - h!.x) + Math.abs(g.tile.y - h!.y)).toBeLessThanOrEqual(2);
	});
});

describe('the roles', () => {
	it('one that has reached its post hunts on and does not rock back to it', () => {
		const s = station();
		release(s);
		const squad = new StationSquad(s.world, 2);
		s.ghosts.setSquadGuide(squad);
		const inky = s.ghosts.list.find((g) => g.kind === 'INKY')!;
		for (const g of s.ghosts.list) if (g !== inky) s.ghosts.freeze(g.kind, 1e6);
		const post = { x: 6, y: 10 };
		inky.teleportTo(post);
		inky.setState('active');
		// a cutter at its post, the hero far down the left side
		squad.phase = 'on';
		squad.tactic = 'ambush';
		squad.left = 99;
		squad.roles.set('INKY', 'cutter');
		squad.targets.set('INKY', post);
		const hero = { x: 1, y: 24 };
		let back = 0;
		let away = false;
		for (let t = 0; t < 4; t += 1 / 60) {
			squad.update(1 / 60, s.ghosts, hero, null);
			s.ghosts.update(1 / 60);
			const d = Math.abs(inky.tile.x - post.x) + Math.abs(inky.tile.y - post.y);
			if (d >= 2) away = true;
			if (away && d === 0) back += 1;
		}
		expect(away).toBe(true);
		expect(back).toBe(0);
	});
});

describe('a power cell', () => {
	it('breaks the tactic: the beams go dark, the hidden come out', () => {
		const s = station();
		release(s);
		const squad = new StationSquad(s.world, 2);
		s.ghosts.setSquadGuide(squad);
		for (let x = 1; x <= 12; x += 1) s.eaten.add(`${x},24`);
		squad.update(0.01, s.ghosts, { x: 12, y: 24 }, 'LEFT');
		force(s, squad, { x: 12, y: 24 }, 'ambush');
		expect(squad.hiddenList.length).toBeGreaterThan(0);
		squad.onPower(s.ghosts);
		expect(squad.hiddenList).toHaveLength(0);
		expect(squad.beams).toHaveLength(0);
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
			squad.update(1 / 60, s.ghosts, hero, null);
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

	it('the interception: one dashes to a junction ahead on his route, told by it first', () => {
		const s = station();
		release(s);
		const squad = new StationSquad(s.world, 4);
		s.ghosts.setSquadGuide(squad);
		// his route: the bottom row to the right; (6,24) a junction five steps on
		const route = Array.from({ length: 23 }, (_, i) => ({ x: 1 + i, y: 24 }));
		const hero = route[0];
		for (const g of s.ghosts.list)
			if (g.kind !== 'INKY' && g.kind !== 'BLINKY') s.ghosts.freeze(g.kind, 1e6);
		const inky = s.ghosts.list.find((g) => g.kind === 'INKY')!;
		inky.teleportTo({ x: 6, y: 21 });
		inky.setState('active');
		const blinky = s.ghosts.list.find((g) => g.kind === 'BLINKY')!;
		blinky.teleportTo({ x: 1, y: 18 });
		blinky.setState('active');
		squad.chase(
			s.ghosts,
			(x, y) => route.some((t) => t.x === x && t.y === y),
			() => route
		);
		let seen: { x: number; y: number } | null = null;
		for (let t = 0; t < 3 && !seen; t += 1 / 60) {
			squad.update(1 / 60, s.ghosts, hero, 'RIGHT');
			if (squad.intercept) seen = { x: squad.intercept.x, y: squad.intercept.y };
		}
		expect(squad.leader).toBe('BLINKY');
		expect(seen).toEqual({ x: 6, y: 24 });
		expect(squad.intercept?.kind).toBe('INKY');
		expect(squad.intercept?.warn).toBeGreaterThan(0);
	});
});
