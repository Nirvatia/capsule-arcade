import { describe, expect, it } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap, PacmanFx } from '../../core/Events';
import { ECHO } from '../../config/echoConfig';
import { SCORE_TABLE } from '../../config/scoreConfig';
import { buildLevelSession } from '../level/LevelSession';
import { seasonForLevel } from '../level/SeasonCatalog';
import { EchoCloneService } from './EchoCloneService';

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
	const echo = new EchoCloneService(session.grid, session.progress, events, random);
	const world = { ghosts: session.ghosts, fruit: session.fruit };
	const run = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds / DT); i += 1) {
			echo.update(DT, world);
		}
	};
	return { session, echo, fx, run, world, events };
}

describe('the riot', () => {
	function started(seed: number) {
		const s = setup(seeded(seed));
		s.echo.start(s.session.grid.playerSpawn);
		return s;
	}

	it('has 7-9 clones and lasts 3 seconds, whatever the dice say', () => {
		for (let seed = 1; seed <= 80; seed += 1) {
			const { echo } = started(seed);
			expect(echo.phase).toBe('riot');
			expect(echo.clones.length).toBeGreaterThanOrEqual(ECHO.clones[0]);
			expect(echo.clones.length).toBeLessThanOrEqual(ECHO.clones[1]);
			expect(echo.duration).toBe(3);
		}
	});

	it('starts from the tile it is given, not from a walled one', () => {
		const { echo, session } = setup(seeded(1));
		const at = session.grid.playerSpawn;
		echo.start(at);
		expect(echo.clones.every((c) => c.x === at.x + 0.5 && c.y === at.y + 0.5)).toBe(true);
		const walled = setup(seeded(1));
		walled.echo.start({ x: 0, y: 0 });
		expect(walled.echo.phase).toBe('idle');
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
		run(ECHO.seconds + 0.2);
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
				echo.update(DT, { ghosts: session.ghosts, fruit: session.fruit });
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
		const { echo, session, world } = setup(seeded(3));
		let left = 90;
		for (let y = 0; y < session.grid.height && left > 0; y += 1) {
			for (let x = 0; x < session.grid.width && left > 0; x += 1) {
				if (session.grid.tileAt(x, y) === 'DT' && !session.progress.isCollected(x, y)) {
					session.progress.collectDotOnly(x, y);
					left -= 1;
				}
			}
		}
		session.fruit.update(DT, session.player);
		expect(session.fruit.active).not.toBeNull();
		const at = session.fruit.position;
		const points = SCORE_TABLE.fruit[session.fruit.active!];
		const score = session.score.score;
		echo.start({ x: Math.floor(at.x), y: Math.floor(at.y) });
		echo.update(DT, world);
		expect(session.fruit.active).toBeNull();
		expect(session.score.score - score).toBe(points);
	});

	it('loses a clone to an active ghost, and only to an active one', () => {
		const verdicts: Array<[string, number]> = [];
		for (const state of ['active', 'enraged', 'frightened', 'eyes', 'lair'] as const) {
			const { echo, session, world, fx } = setup(seeded(9));
			echo.start({ x: 12, y: 20 });
			const ghost = session.ghosts.list[0]!;
			ghost.teleportTo({ x: 12, y: 20 });
			ghost.setState(state);
			const count = echo.clones.length;
			for (let i = 0; i < 20; i += 1) echo.update(DT, world);
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
		const { echo, run } = started(2);
		const duration = echo.duration;
		run(duration - 0.3);
		expect(echo.phase).toBe('riot');
		run(0.5);
		expect(echo.phase).toBe('idle');
		expect(echo.clones).toHaveLength(0);
		expect(echo.timer).toBe(0);
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
		echo.start(start);
		run(1.5);
		expect(session.progress.remainingDots).toBe(0);
		expect(echo.phase).toBe('idle');
	});

	it('drives the HUD with a duration that covers the time left', () => {
		const { echo, run } = started(7);
		run(0.5);
		expect(echo.timer).toBeGreaterThan(0);
		expect(echo.duration).toBeGreaterThanOrEqual(echo.timer);
	});
});
