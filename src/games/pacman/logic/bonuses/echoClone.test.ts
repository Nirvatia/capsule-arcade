import { describe, expect, it } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap, PacmanFx } from '../../core/Events';
import { ECHO } from '../../config/echoConfig';
import { SCORE_TABLE } from '../../config/scoreConfig';
import { buildLevelSession } from '../level/LevelSession';
import { seasonForLevel } from '../level/SeasonCatalog';
import { SpawnLocator } from '../maze/SpawnLocator';
import { EchoCloneService } from './EchoCloneService';
import type { PlayerService } from '../actors/PlayerService';

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

/** A generator that gives these values in turn. */
function values(...list: number[]): () => number {
	let i = 0;
	return () => list[Math.min(i++, list.length - 1)] as number;
}

/** Steps by path between two tiles the hero can walk, tunnels not counted. */
function pathSteps(
	grid: { isPlayerWalkable(x: number, y: number): boolean },
	from: { x: number; y: number },
	to: { x: number; y: number }
): number {
	const seen = new Set([`${from.x},${from.y}`]);
	let frontier = [from];
	for (let d = 0; frontier.length > 0; d += 1) {
		if (frontier.some((t) => t.x === to.x && t.y === to.y)) return d;
		const next: Array<{ x: number; y: number }> = [];
		for (const t of frontier) {
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const n = { x: t.x + dx, y: t.y + dy };
				const k = `${n.x},${n.y}`;
				if (!seen.has(k) && grid.isPlayerWalkable(n.x, n.y)) {
					seen.add(k);
					next.push(n);
				}
			}
		}
		frontier = next;
	}
	return Infinity;
}

function setup(random: () => number, level = 1) {
	const events = new EventBus<PacmanEventMap>();
	const fx: PacmanFx[] = [];
	events.on('fx:event', (e) => fx.push(e));
	const session = buildLevelSession({
		events,
		level,
		profile: 'pacman',
		season: seasonForLevel(level),
		hell: false,
		secret: false,
		godMode: false
	});
	const locator = new SpawnLocator(session.grid, session.progress);
	const echo = new EchoCloneService(session.grid, session.progress, locator, events, random);
	const world = { ghosts: session.ghosts, fruit: session.fruit };
	/** A stand-in hero standing on a tile (the echo only reads where he is). */
	const hero = (x: number, y: number) =>
		({ position: { x: x + 0.5, y: y + 0.5 }, tile: { x, y } }) as unknown as PlayerService;
	const far = hero(0, 0);
	const eatDots = (n: number) => {
		let left = n;
		for (let y = 0; y < session.grid.height && left > 0; y += 1) {
			for (let x = 0; x < session.grid.width && left > 0; x += 1) {
				if (session.grid.tileAt(x, y) === 'DT' && !session.progress.isCollected(x, y)) {
					session.progress.collectDotOnly(x, y);
					left -= 1;
				}
			}
		}
	};
	const run = (seconds: number, player: PlayerService = far) => {
		for (let i = 0; i < Math.round(seconds / DT); i += 1) {
			echo.update(DT, player, world);
		}
	};
	/** Takes the token: the hero steps on it. */
	const takeToken = () => {
		const at = echo.tokenPosition;
		if (!at) throw new Error('no token');
		echo.update(DT, hero(Math.floor(at.x), Math.floor(at.y)), world);
	};
	return { session, echo, fx, eatDots, run, takeToken, hero, far, world, events };
}

describe('the echo token', () => {
	it('comes on about a third of the levels', () => {
		let comes = 0;
		const N = 600;
		for (let seed = 1; seed <= N; seed += 1) {
			if (setup(seeded(seed)).echo.willCome) comes += 1;
		}
		expect(comes / N).toBeGreaterThan(ECHO.chance - 0.06);
		expect(comes / N).toBeLessThan(ECHO.chance + 0.06);
	});

	it('does not come on a level that did not roll it', () => {
		const { echo, eatDots, run, session } = setup(values(0.99, 0.5));
		expect(echo.willCome).toBe(false);
		eatDots(Math.floor(session.grid.dotCount * 0.9));
		run(2);
		expect(echo.phase).toBe('waiting');
	});

	it('waits for its share of the dots, then lies on a safe dot tile', () => {
		// rolled to come, at the start of its window
		const { echo, eatDots, run, session } = setup(values(0, 0));
		run(1);
		expect(echo.phase).toBe('waiting');
		eatDots(Math.floor(session.grid.dotCount * (ECHO.window[0] - 0.05)));
		run(0.5);
		expect(echo.phase).toBe('waiting');
		eatDots(Math.ceil(session.grid.dotCount * 0.1));
		run(0.5);
		expect(echo.phase).toBe('token');
		const at = echo.tokenPosition!;
		expect(session.grid.tileAt(Math.floor(at.x), Math.floor(at.y))).toBe('DT');
	});

	it('never lies near the hero: at least its steps away by path', () => {
		for (let seed = 1; seed <= 40; seed += 1) {
			const { echo, eatDots, run, session, hero } = setup(values(0, 0));
			eatDots(Math.floor(session.grid.dotCount * (0.35 + (seed % 7) * 0.05)));
			// the hero stands on the very tile the token would have picked without him
			const locator = new SpawnLocator(session.grid, session.progress);
			const naive = locator.findSafeTile(session.progress.collectedDots)!;
			run(0.2, hero(naive.x, naive.y));
			expect(echo.phase).toBe('token');
			const at = echo.tokenPosition!;
			const tile = { x: Math.floor(at.x), y: Math.floor(at.y) };
			expect(pathSteps(session.grid, naive, tile)).toBeGreaterThanOrEqual(ECHO.minSteps);
		}
	});

	it('is gone after its seconds, for good', () => {
		const { echo, eatDots, run, session } = setup(values(0, 0));
		eatDots(Math.floor(session.grid.dotCount * 0.5));
		run(0.2);
		expect(echo.phase).toBe('token');
		run(ECHO.tokenSeconds + 0.5);
		expect(echo.phase).toBe('spent');
		expect(echo.tokenPosition).toBeNull();
		run(1);
		expect(echo.phase).toBe('spent');
	});

	it('is rolled again by a reset (a restart)', () => {
		const rolls = [0, 0, 0.99, 0.5];
		const { echo } = setup(values(...rolls));
		expect(echo.willCome).toBe(true);
		echo.reset();
		expect(echo.willCome).toBe(false);
		expect(echo.phase).toBe('waiting');
	});
});

describe('the riot', () => {
	function started(seed: number) {
		const s = setup(seeded(seed));
		s.echo.debugSpawn();
		s.takeToken();
		return s;
	}

	it('has 7-9 clones and lasts 2-3 seconds, whatever the dice say', () => {
		for (let seed = 1; seed <= 80; seed += 1) {
			const { echo } = started(seed);
			expect(echo.phase).toBe('riot');
			expect(echo.clones.length).toBeGreaterThanOrEqual(ECHO.clones[0]);
			expect(echo.clones.length).toBeLessThanOrEqual(ECHO.clones[1]);
			expect(echo.duration).toBeGreaterThanOrEqual(ECHO.seconds[0]);
			expect(echo.duration).toBeLessThanOrEqual(ECHO.seconds[1]);
		}
	});

	it('sends the clones out in different ways, one after another', () => {
		const { echo, run } = started(5);
		const first = echo.clones;
		expect(first[0]!.started).toBe(true);
		expect(first.slice(1).every((c) => !c.started)).toBe(true);
		run(0.6);
		const ways = new Set(echo.clones.map((c) => c.facing));
		expect(ways.size).toBeGreaterThanOrEqual(2);
		const spread = new Set(echo.clones.map((c) => `${Math.round(c.x * 4)},${Math.round(c.y * 4)}`));
		expect(spread.size).toBeGreaterThan(echo.clones.length / 2);
	});

	it('eats dots for the usual points, and leaves the energizers', () => {
		const { run, session } = started(11);
		const before = { dots: session.progress.remainingDots, score: session.score.score };
		const energizers: Array<[number, number]> = [];
		for (let y = 0; y < session.grid.height; y += 1) {
			for (let x = 0; x < session.grid.width; x += 1) {
				if (session.grid.tileAt(x, y) === 'EU') energizers.push([x, y]);
			}
		}
		expect(energizers).toHaveLength(4);
		run(ECHO.seconds[1] + 0.2);
		const eaten = before.dots - session.progress.remainingDots;
		expect(eaten).toBeGreaterThan(10);
		expect(session.score.score - before.score).toBe(eaten * SCORE_TABLE.dot);
		for (const [x, y] of energizers) {
			expect(session.progress.isCollected(x, y)).toBe(false);
		}
	});

	it('stays on the open corridors', () => {
		for (let seed = 1; seed <= 12; seed += 1) {
			const { echo, session } = started(seed);
			for (let i = 0; i < Math.round(3.2 / DT) && echo.phase === 'riot'; i += 1) {
				echo.update(DT, session.player, { ghosts: session.ghosts, fruit: session.fruit });
				for (const c of echo.clones) {
					const x = Math.floor(c.x);
					const y = Math.floor(c.y);
					expect(session.grid.isInside(x, y)).toBe(true);
					expect(session.grid.tileAt(x, y)).not.toBe('WL');
					expect(session.grid.tileAt(x, y)).not.toBe('ES');
				}
			}
		}
	});

	it('eats the fruit it meets, for the fruit points', () => {
		const { echo, session, eatDots, world, far } = setup(seeded(3));
		eatDots(90);
		session.fruit.update(DT, session.player);
		expect(session.fruit.active).not.toBeNull();
		const at = session.fruit.position;
		const points = SCORE_TABLE.fruit[session.fruit.active!];
		const score = session.score.score;
		echo.debugRiot({ x: Math.floor(at.x), y: Math.floor(at.y) });
		echo.update(DT, far, world);
		expect(session.fruit.active).toBeNull();
		expect(session.score.score - score).toBe(points);
	});

	it('loses a clone to an active ghost, and only to an active one', () => {
		const verdicts: Array<[string, number]> = [];
		for (const state of ['active', 'enraged', 'frightened', 'eyes', 'lair'] as const) {
			const { echo, session, world, far, fx } = setup(seeded(9));
			echo.debugRiot({ x: 12, y: 20 });
			const ghost = session.ghosts.list[0]!;
			ghost.teleportTo({ x: 12, y: 20 });
			ghost.setState(state);
			const count = echo.clones.length;
			for (let i = 0; i < 20; i += 1) echo.update(DT, far, world);
			const lost = fx.filter((e) => e.kind === 'echo-pop').length;
			verdicts.push([state, lost]);
			expect(echo.clones.filter((c) => c.alive).length).toBe(count - lost);
		}
		expect(verdicts.find(([s]) => s === 'active')![1]).toBeGreaterThan(0);
		expect(verdicts.find(([s]) => s === 'enraged')![1]).toBeGreaterThan(0);
		for (const [state, lost] of verdicts) {
			if (state !== 'active' && state !== 'enraged') expect(lost).toBe(0);
		}
	});

	it('ends after its seconds and the clones are gone', () => {
		const { echo, run, session } = started(2);
		const duration = echo.duration;
		run(duration - 0.3);
		expect(echo.phase).toBe('riot');
		run(0.5);
		expect(echo.phase).toBe('spent');
		expect(echo.clones).toHaveLength(0);
		expect(echo.timer).toBe(0);
		// a spent echo does not come again on this level
		session.progress.resetDots();
		run(2);
		expect(echo.phase).toBe('spent');
	});

	it('ends at once when the clones eat the last dot', () => {
		const { echo, session, run } = setup(seeded(4));
		const start = { x: 12, y: 20 };
		// every dot but the ones next to the start is gone
		const keep = new Set(['12,19', '12,21', '11,20', '13,20']);
		for (let y = 0; y < session.grid.height; y += 1) {
			for (let x = 0; x < session.grid.width; x += 1) {
				if (session.grid.tileAt(x, y) === 'DT' && !keep.has(`${x},${y}`)) {
					session.progress.collectDotOnly(x, y);
				}
			}
		}
		const left = session.progress.remainingDots;
		expect(left).toBeGreaterThan(0);
		echo.debugRiot(start);
		run(1.5);
		expect(session.progress.remainingDots).toBe(0);
		expect(echo.phase).toBe('spent');
	});

	it('drives the HUD with a duration that covers the time left', () => {
		const { echo, run } = started(7);
		run(0.5);
		expect(echo.timer).toBeGreaterThan(0);
		expect(echo.duration).toBeGreaterThanOrEqual(echo.timer);
	});
});
