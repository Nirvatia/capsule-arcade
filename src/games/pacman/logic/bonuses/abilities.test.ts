import { describe, expect, it } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanAudioCue, PacmanEventMap, PacmanFx } from '../../core/Events';
import { ABILITY } from '../../config/abilityConfig';
import type { AbilityKind } from '../../config/abilityConfig';
import { ECHO } from '../../config/echoConfig';
import { buildLevelSession, resetLevelSession } from '../level/LevelSession';
import { seasonForLevel } from '../level/SeasonCatalog';
import { SpawnLocator } from '../maze/SpawnLocator';
import { AbilityService } from './AbilityService';
import type { AbilityWorld } from './AbilityService';
import type { GridPoint } from '../maze/GridModel';
import type { GhostModel } from '../actors/GhostModel';

const DT = 1 / 60;

/** A seeded generator (mulberry32). */
function seeded(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** A generator that gives these values in turn, then repeats the last. */
function values(...list: number[]): () => number {
	let i = 0;
	return () => list[Math.min(i++, list.length - 1)] as number;
}

const key = (t: GridPoint) => `${t.x},${t.y}`;

/** Steps by path between two tiles the hero can walk, never entering `blocked` (tunnels not counted). */
function pathSteps(
	grid: { isPlayerWalkable(x: number, y: number): boolean },
	from: GridPoint,
	to: GridPoint,
	blocked: ReadonlySet<string> = new Set()
): number {
	const seen = new Set([key(from)]);
	let frontier = [from];
	for (let d = 0; frontier.length > 0; d += 1) {
		if (frontier.some((t) => t.x === to.x && t.y === to.y)) return d;
		const next: GridPoint[] = [];
		for (const t of frontier) {
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const n = { x: t.x + dx, y: t.y + dy };
				if (!seen.has(key(n)) && !blocked.has(key(n)) && grid.isPlayerWalkable(n.x, n.y)) {
					seen.add(key(n));
					next.push(n);
				}
			}
		}
		frontier = next;
	}
	return Infinity;
}

/**
 * A real season level. `random` drives a separate ability service for the token tests; the
 * session's own one (wired into the combat's shield) is used through `debugGrant`.
 */
function setup(
	random: () => number = seeded(1),
	level = 1,
	profile: 'pacman' | 'ms-pacman' = 'pacman'
) {
	const events = new EventBus<PacmanEventMap>();
	const fx: PacmanFx[] = [];
	const cues: PacmanAudioCue[] = [];
	events.on('fx:event', (e) => fx.push(e));
	events.on('audio:cue', (e) => cues.push(e.cue));
	const session = buildLevelSession({
		events,
		level,
		profile,
		season: seasonForLevel(level),
		hell: false,
		secret: false,
		godMode: false
	});
	resetLevelSession(session);
	const { grid, progress, player, ghosts, fruit, combat, hypnosis } = session;
	// the respawn shield wears off with the hero standing on his spawn
	player.setMovementLocked(true);
	for (let i = 0; i < 80 && player.isInvulnerable; i += 1) player.update(0.1);
	player.setMovementLocked(false);
	const tokens = new AbilityService(
		grid,
		progress,
		new SpawnLocator(grid, progress),
		events,
		random
	);
	const world = (): AbilityWorld => ({
		player,
		ghosts,
		fruit,
		powered: combat.isPowerActive || hypnosis.overdriveActive
	});
	const eatDots = (n: number) => {
		let left = n;
		for (let y = 0; y < grid.height && left > 0; y += 1) {
			for (let x = 0; x < grid.width && left > 0; x += 1) {
				if (grid.tileAt(x, y) === 'DT' && !progress.isCollected(x, y)) {
					progress.collectDotOnly(x, y);
					left -= 1;
				}
			}
		}
	};
	/** Runs the token service alone, with the hero standing still. */
	const runTokens = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds / DT); i += 1) tokens.update(DT, world());
	};
	/** Runs the session's abilities, ghosts and combat, as a frame of play does (hero still). */
	const play = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds / DT) && !combat.deathActive; i += 1) {
			session.abilities.update(DT, world());
			ghosts.update(DT);
			combat.update(DT);
		}
	};
	/** A ghost out of the lair on `tile`, hunting. */
	const place = (ghost: GhostModel, tile: GridPoint, state: GhostModel['state'] = 'active') => {
		ghost.teleportTo(tile);
		ghost.setState(state);
	};
	/** A walkable tile `d` steps (by path) from the hero's spawn. */
	const tileAt = (d: number): GridPoint => {
		const s = grid.playerSpawn;
		const seen = new Set([key(s)]);
		let frontier: GridPoint[] = [s];
		for (let i = 0; i < d && frontier.length > 0; i += 1) {
			const next: GridPoint[] = [];
			for (const t of frontier) {
				for (const [dx, dy] of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1]
				]) {
					const n = { x: t.x + dx!, y: t.y + dy! };
					if (!seen.has(key(n)) && grid.isPlayerWalkable(n.x, n.y)) {
						seen.add(key(n));
						next.push(n);
					}
				}
			}
			frontier = next;
		}
		const tile = frontier[0];
		if (!tile) throw new Error(`no tile ${d} steps away`);
		return tile;
	};
	/** The walkable tile farthest (by path) from the hero's spawn. */
	const farthest = (): GridPoint => {
		let d = 1;
		let last = tileAt(1);
		for (;;) {
			try {
				last = tileAt(++d);
			} catch {
				return last;
			}
		}
	};
	return {
		session,
		tokens,
		world,
		eatDots,
		runTokens,
		play,
		place,
		tileAt,
		farthest,
		fx,
		cues,
		events
	};
}

describe('the ability token', () => {
	it('comes on about half the levels, each kind about as often', () => {
		const kinds: Record<AbilityKind, number> = { echo: 0, mask: 0, shock: 0 };
		let comes = 0;
		const N = 600;
		for (let seed = 1; seed <= N; seed += 1) {
			const s = new AbilityService(...serviceArgs(), seeded(seed));
			if (s.willCome) {
				comes += 1;
				kinds[s.kind] += 1;
			}
		}
		expect(comes / N).toBeGreaterThan(ABILITY.chance - 0.06);
		expect(comes / N).toBeLessThan(ABILITY.chance + 0.06);
		for (const n of Object.values(kinds)) expect(n / comes).toBeGreaterThan(0.25);
	});

	it('does not come on a level that did not roll it', () => {
		const { tokens, eatDots, runTokens, session } = setup(values(0.99, 0, 0.5));
		expect(tokens.willCome).toBe(false);
		eatDots(Math.floor(session.grid.dotCount * 0.9));
		runTokens(2);
		expect(tokens.phase).toBe('waiting');
	});

	it('waits for its share of the dots, then lies on an eaten dot tile', () => {
		const { tokens, eatDots, runTokens, session } = setup(values(0, 0, 0));
		runTokens(1);
		expect(tokens.phase).toBe('waiting');
		eatDots(Math.floor(session.grid.dotCount * (ABILITY.window[0] - 0.05)));
		runTokens(0.5);
		expect(tokens.phase).toBe('waiting');
		eatDots(Math.ceil(session.grid.dotCount * 0.1));
		runTokens(0.5);
		expect(tokens.phase).toBe('token');
		const at = tokens.tokenPosition!;
		const tile = { x: Math.floor(at.x), y: Math.floor(at.y) };
		expect(session.grid.tileAt(tile.x, tile.y)).toBe('DT');
		expect(session.progress.isCollected(tile.x, tile.y)).toBe(true);
	});

	// the echo token used to lie anywhere at least 8 steps away: up to the far end of the maze
	// (25-30 steps), behind the ghosts, out of reach in its 8 seconds
	it('lies within reach: 8-18 steps from the hero, on a way that passes no ghost', () => {
		let checked = 0;
		for (let seed = 1; seed <= 30; seed += 1) {
			for (const level of [1, 2, 3, 4]) {
				const { tokens, eatDots, runTokens, session, place } = setup(
					values(0, 0, 0, (seed % 10) / 10),
					level
				);
				eatDots(Math.floor(session.grid.dotCount * (0.35 + (seed % 7) * 0.08)));
				// two ghosts out hunting somewhere on the board
				const open = session.progress.safeSpawnTiles();
				const ghosts = session.ghosts.list;
				place(ghosts[0]!, open[(seed * 7) % open.length]!);
				place(ghosts[1]!, open[(seed * 13 + 5) % open.length]!);
				runTokens(0.1);
				if (tokens.phase !== 'token') {
					// no tile in reach right now: it waits for one, it never lies far
					expect(tokens.phase).toBe('waiting');
					continue;
				}
				checked += 1;
				const at = tokens.tokenPosition!;
				const tile = { x: Math.floor(at.x), y: Math.floor(at.y) };
				const blocked = new Set<string>();
				for (const g of ghosts.slice(0, 2)) {
					for (const [dx, dy] of [
						[0, 0],
						[1, 0],
						[-1, 0],
						[0, 1],
						[0, -1]
					]) {
						blocked.add(key({ x: g.tile.x + dx!, y: g.tile.y + dy! }));
					}
				}
				const steps = pathSteps(session.grid, session.player.tile, tile, blocked);
				expect(steps).toBeGreaterThanOrEqual(ABILITY.steps[0]);
				expect(steps).toBeLessThanOrEqual(ABILITY.steps[1]);
			}
		}
		expect(checked).toBeGreaterThan(60);
	});

	it('is gone after its seconds, for good: one token a level at most', () => {
		const { tokens, eatDots, runTokens, session } = setup(values(0, 0, 0));
		eatDots(Math.floor(session.grid.dotCount * 0.5));
		runTokens(0.2);
		expect(tokens.phase).toBe('token');
		runTokens(ABILITY.tokenSeconds + 0.5);
		expect(tokens.phase).toBe('spent');
		expect(tokens.tokenPosition).toBeNull();
		eatDots(20);
		runTokens(2);
		expect(tokens.phase).toBe('spent');
	});

	it('goes into the slot when the hero takes it, and stays there through a death', () => {
		const { session, cues } = setup();
		const abilities = session.abilities;
		abilities.debugSpawn(session.player, session.ghosts, 'mask');
		expect(abilities.phase).toBe('token');
		// the token comes to the hero (the test moves it under his feet)
		const t = session.player.tile;
		(abilities as unknown as { tokenTileValue: GridPoint }).tokenTileValue = { x: t.x, y: t.y };
		abilities.update(DT, {
			player: session.player,
			ghosts: session.ghosts,
			fruit: session.fruit,
			powered: false
		});
		expect(abilities.phase).toBe('carried');
		expect(abilities.kind).toBe('mask');
		expect(cues).toContain('ability-take');
		abilities.onDeath();
		expect(abilities.phase).toBe('carried');
		// the level's end burns it
		abilities.reset();
		expect(abilities.phase).toBe('waiting');
	});
});

describe('spending an ability', () => {
	it('does nothing with an empty slot', () => {
		const { session, world, cues } = setup();
		expect(session.abilities.use(world())).toBe('empty');
		expect(cues).not.toContain('ability-fizzle');
	});

	it('is refused during an energizer or an overdrive, and the ability stays', () => {
		for (const profile of ['pacman', 'ms-pacman'] as const) {
			const { session, world, cues } = setup(seeded(1), 1, profile);
			session.abilities.debugGrant('echo');
			session.combat.debugPower();
			expect(world().powered).toBe(true);
			expect(session.abilities.use(world())).toBe('refused');
			expect(session.abilities.phase).toBe('carried');
			expect(cues).toContain('ability-fizzle');
		}
	});
});

describe('the echo', () => {
	it('sets off a 3 s riot from the hero, then is spent', () => {
		const { session, world, play } = setup();
		const abilities = session.abilities;
		abilities.debugGrant('echo');
		expect(abilities.use(world())).toBe('used');
		expect(abilities.phase).toBe('active');
		const t = session.player.tile;
		expect(abilities.echo.clones[0]).toMatchObject({ x: t.x + 0.5, y: t.y + 0.5 });
		expect(abilities.duration).toBe(ECHO.seconds);
		session.ghosts.banish();
		play(ECHO.seconds - 0.2);
		expect(abilities.phase).toBe('active');
		play(0.4);
		expect(abilities.phase).toBe('spent');
	});
});

describe('the mask', () => {
	it('lets an active ghost pass through the hero, for its seconds only', () => {
		// control: without the mask the same touch kills
		const control = setup();
		control.place(control.session.ghosts.list[0]!, control.session.player.tile);
		control.play(DT * 2);
		expect(control.session.combat.deathActive).toBe(true);

		const { session, world, play, place } = setup();
		session.abilities.debugGrant('mask');
		expect(session.abilities.use(world())).toBe('used');
		expect(session.abilities.shieldsHero).toBe(true);
		const blinky = session.ghosts.list[0]!;
		place(blinky, session.player.tile);
		session.ghosts.freeze(blinky.kind, ABILITY.mask.seconds + 1);
		play(ABILITY.mask.seconds - 0.2);
		expect(session.combat.deathActive).toBe(false);
		// it ends inside the ghost: a moment of grace, then the touch kills again
		play(0.3);
		expect(session.abilities.masked).toBe(false);
		expect(session.abilities.shieldsHero).toBe(true);
		expect(session.combat.deathActive).toBe(false);
		play(ABILITY.mask.graceSeconds + 0.1);
		expect(session.combat.deathActive).toBe(true);
	});

	it('sends the hunters to their corners: Blinky in chase stops closing in', () => {
		const run = (masked: boolean) => {
			const { session, world, place, tileAt } = setup();
			const ghosts = session.ghosts;
			ghosts.setTuning(0.01, 100, 1);
			ghosts.reset();
			for (const g of ghosts.list.slice(1)) g.setState('lair');
			const blinky = ghosts.list[0]!;
			place(blinky, tileAt(10));
			ghosts.update(0.05);
			expect(ghosts.currentMode).toBe('chase');
			if (masked) {
				session.abilities.debugGrant('mask');
				session.abilities.use(world());
			}
			for (let i = 0; i < 90; i += 1) {
				session.abilities.update(DT, world());
				ghosts.update(DT);
			}
			return pathSteps(session.grid, session.player.tile, blinky.tile);
		};
		expect(run(false)).toBeLessThan(run(true));
	});

	it('ends at once when an energizer is eaten, with no grace', () => {
		const { session, world, play } = setup();
		session.abilities.debugGrant('mask');
		session.abilities.use(world());
		session.combat.debugPower();
		play(DT * 2);
		expect(session.abilities.phase).toBe('spent');
		expect(session.abilities.shieldsHero).toBe(false);
		expect(session.ghosts.heroHidden).toBe(false);
	});
});

describe('the shock', () => {
	it('chains through the hunting ghosts in reach and holds them still for its seconds', () => {
		const { session, world, place, tileAt, farthest, play, fx } = setup();
		const [blinky, pinky, inky, clyde] = session.ghosts.list as GhostModel[];
		place(blinky!, tileAt(3));
		place(pinky!, tileAt(5));
		// Inky is scared: not struck; Clyde is far: not struck
		place(inky!, tileAt(4), 'frightened');
		place(clyde!, farthest());
		session.abilities.debugGrant('shock');
		expect(session.abilities.use(world())).toBe('used');
		const struck = session.abilities.strike!.links.map((l) => l.ghost);
		expect(struck).toContain('BLINKY');
		expect(struck).toContain('PINKY');
		expect(struck).not.toContain('INKY');
		expect(struck).not.toContain('CLYDE');
		expect(fx.some((e) => e.kind === 'shock')).toBe(true);
		const at = { ...blinky!.position };
		play(ABILITY.shock.seconds - 0.2);
		expect(blinky!.position).toEqual(at);
		expect(session.abilities.phase).toBe('active');
		play(0.5);
		expect(session.abilities.phase).toBe('spent');
		expect(session.ghosts.frozenFor('BLINKY')).toBe(0);
	});

	it("jumps from ghost to ghost: one out of the hero's reach is struck through a nearer one", () => {
		const { session, world, place } = setup();
		const [blinky, pinky] = session.ghosts.list as GhostModel[];
		// Blinky near the hero, Pinky beyond the hero's reach but near Blinky
		const s = session.player.position;
		const walk: GridPoint[] = [];
		for (let y = 0; y < session.grid.height; y += 1) {
			for (let x = 0; x < session.grid.width; x += 1) {
				if (session.grid.isPlayerWalkable(x, y)) walk.push({ x, y });
			}
		}
		const fromHero = (t: GridPoint) => Math.hypot(t.x + 0.5 - s.x, t.y + 0.5 - s.y);
		const R = ABILITY.shock.reach;
		let pair: [GridPoint, GridPoint] | null = null;
		for (const a of walk.filter((t) => fromHero(t) < R - 1.5 && fromHero(t) > 2)) {
			const b = walk.find(
				(t) => fromHero(t) > R + 0.5 && Math.hypot(t.x - a.x, t.y - a.y) < R - 0.5
			);
			if (b) {
				pair = [a, b];
				break;
			}
		}
		expect(pair).not.toBeNull();
		const [near, beyond] = pair!;
		place(blinky!, near);
		const candidates = [beyond];
		place(pinky!, candidates[0]!);
		session.abilities.debugGrant('shock');
		session.abilities.use(world());
		const links = session.abilities.strike!.links;
		expect(links.map((l) => l.ghost)).toEqual(['BLINKY', 'PINKY']);
		expect(links[1]!.from).toBe(0);
	});

	it('leaves the struck ghosts deadly to touch', () => {
		const { session, world, place, play } = setup();
		const blinky = session.ghosts.list[0]!;
		place(blinky, session.player.tile);
		session.abilities.debugGrant('shock');
		session.abilities.use(world());
		expect(session.ghosts.frozenFor('BLINKY')).toBeGreaterThan(0);
		play(DT * 2);
		expect(session.combat.deathActive).toBe(true);
	});

	it('is refused with nobody in reach, and stays in the slot', () => {
		const { session, world, place, farthest, cues } = setup();
		for (const g of session.ghosts.list) place(g, farthest());
		session.abilities.debugGrant('shock');
		expect(session.abilities.use(world())).toBe('refused');
		expect(session.abilities.phase).toBe('carried');
		expect(cues).toContain('ability-fizzle');
	});

	it('ends when an energizer scares the held ghosts', () => {
		const { session, world, place, tileAt, play } = setup();
		place(session.ghosts.list[0]!, tileAt(3));
		session.abilities.debugGrant('shock');
		session.abilities.use(world());
		session.combat.debugPower();
		play(DT * 2);
		expect(session.ghosts.frozenFor('BLINKY')).toBe(0);
		expect(session.abilities.phase).toBe('spent');
	});
});

/** The constructor arguments of an ability service on level 1, but its dice. */
function serviceArgs() {
	const events = new EventBus<PacmanEventMap>();
	const session = buildLevelSession({
		events,
		level: 1,
		profile: 'pacman',
		season: seasonForLevel(1),
		hell: false,
		secret: false,
		godMode: false
	});
	return [
		session.grid,
		session.progress,
		new SpawnLocator(session.grid, session.progress),
		events
	] as const;
}
