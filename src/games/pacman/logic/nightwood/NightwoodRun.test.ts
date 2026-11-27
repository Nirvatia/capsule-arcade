import { describe, expect, it } from 'vitest';
import { parseMaze } from '../../config/mazes/parseMaze';
import type { GhostKind, GhostState } from '../actors/GhostModel';
import { NIGHT_TUNE, NightwoodRun } from './NightwoodRun';
import type { RunGhost, RunGhosts, RunPlayer, RunProgress } from './NightwoodRun';
import { castRay, sees, visibility } from './lightRays';
import { forestKind, placeLamps } from './nightwoodLamps';

// two corridors, one above the other, a thicket between them; an energizer at the lower left
const MAZE = parseMaze('test', [
	'ES ES ES ES ES ES ES ES ES ES ES ES ES',
	'ES WL WL WL WL WL WL WL WL WL WL WL ES',
	'ES WL DT DT DT DT DT DT DT DT DT WL ES',
	'ES WL WL WL WL WL WL WL WL WL WL WL ES',
	'ES WL EU DT DT DT DT DT DT DT DT WL ES',
	'ES WL WL WL WL WL WL WL WL WL WL WL ES',
	'ES ES ES ES ES ES ES ES ES ES ES ES ES'
]);

class FakeGhost implements RunGhost {
	state: GhostState = 'active';
	constructor(
		readonly kind: GhostKind,
		public position: { x: number; y: number }
	) {}
}
class FakeGhosts implements RunGhosts {
	banishes = 0;
	constructor(readonly list: FakeGhost[]) {}
	setGhostState(kind: GhostKind, state: GhostState): void {
		const g = this.list.find((x) => x.kind === kind);
		if (g) g.state = state;
	}
	banish(): void {
		this.banishes += 1;
	}
}
class FakeProgress implements RunProgress {
	taken = new Set<string>();
	remainingDots = 10;
	resets = 0;
	get collectedDots(): number {
		return this.taken.size;
	}
	isCollected(x: number, y: number): boolean {
		return this.taken.has(`${x},${y}`);
	}
	resetDots(): void {
		this.taken.clear();
		this.remainingDots = 10;
		this.resets += 1;
	}
}

function setup(ghost = { x: 6.5, y: 2.5 }) {
	const player: RunPlayer & { position: { x: number; y: number } } = {
		position: { x: 10.5, y: 2.5 },
		facing: 'RIGHT'
	};
	const ghosts = new FakeGhosts([new FakeGhost('BLINKY', ghost)]);
	const progress = new FakeProgress();
	const run = new NightwoodRun(MAZE, ghosts, player, progress, 3);
	run.battery = 0; // no torch: only the lamps decide
	run.lamps.length = 0;
	run.lamps.push({ x: 4.5, y: 2.5, postX: 4.5, postY: 2.1, r: 4.4, on: true, tell: 0, held: 0 });
	return { run, ghosts, progress, player, ghost: ghosts.list[0] };
}
const steps = (run: NightwoodRun, seconds: number, fire = false) => {
	for (let t = 0; t < seconds - 1e-9; t += 0.1) run.update(0.1, fire && t === 0);
};

describe('light on the grid', () => {
	it('a ray stops at the first wall, and the thicket takes a little light into itself', () => {
		const solid = (x: number, y: number) => forestKind(MAZE[y]?.[x]) !== 'open';
		expect(castRay(solid, 2.5, 2.5, 0, 20)).toBeCloseTo(8.5, 1);
		expect(sees(solid, 2.5, 2.5, 8.5, 2.5)).toBe(true);
		expect(sees(solid, 2.5, 2.5, 2.5, 4.5)).toBe(false);
		const poly = visibility(solid, 5.5, 2.5, 0, Math.PI * 2, 60, 6);
		expect(poly.length).toBe(2 + 2 * 61);
	});

	it('places lamps along the trails, apart, none in the clearing', () => {
		const lamps = placeLamps(MAZE);
		expect(lamps.length).toBeGreaterThan(0);
		for (const a of lamps)
			for (const b of lamps)
				if (a !== b) expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(8);
	});
});

describe('the Taken and the light', () => {
	it('a shroud burns in a lamp pool, the Taken is stunned, then wakes with part of its shroud', () => {
		const { run, ghost } = setup();
		expect(run.shield('BLINKY')).toBe(1);
		steps(run, 1.6);
		expect(ghost.state).toBe('frightened');
		expect(run.shield('BLINKY')).toBe(0);
		expect(run.stun('BLINKY')).toBeGreaterThan(3);
		let woke = false;
		for (let i = 0; i < 60 && !woke; i += 1) {
			run.update(0.1);
			woke = ghost.state === 'active';
		}
		expect(woke).toBe(true);
	});

	it('a wall between the lamp and the Taken keeps it in the dark', () => {
		const { run, ghost } = setup({ x: 4.5, y: 4.5 });
		steps(run, 3);
		expect(ghost.state).toBe('active');
		expect(run.shield('BLINKY')).toBe(1);
	});

	it('in the dark the shroud regrows', () => {
		const { run, ghost } = setup();
		steps(run, 1.6);
		for (let i = 0; i < 80 && ghost.state !== 'active'; i += 1) run.update(0.1);
		run.lamps[0].on = false;
		const before = run.shield('BLINKY');
		steps(run, 1);
		expect(run.shield('BLINKY')).toBeGreaterThan(before + 0.15);
	});

	it('an eaten Taken is banished and the Presence loses power; five and it falls into the dawn', () => {
		const { run, ghosts, ghost } = setup({ x: 1.5, y: 4.5 });
		expect(run.presenceRatio).toBe(1);
		for (let k = 1; k <= 5; k += 1) {
			ghost.state = 'frightened';
			run.update(0.1);
			ghost.state = 'eyes';
			run.update(0.1);
			ghost.state = 'active';
			expect(run.banished).toBe(k);
		}
		expect(run.presence).toBe(0);
		expect(run.defeated).toBe(true);
		expect(ghosts.banishes).toBe(1);
	});

	it('an energizer switches the shrouds off while its power lasts', () => {
		const { run, ghost } = setup({ x: 1.5, y: 4.5 });
		let on = true;
		run.powered = () => on;
		ghost.state = 'frightened';
		steps(run, 0.5);
		expect(run.shield('BLINKY')).toBe(0);
		on = false;
		ghost.state = 'active';
		steps(run, 0.1);
		expect(run.shield('BLINKY')).toBeGreaterThan(0);
	});
});

describe('the hero, the torch and the lamps', () => {
	it('the torch burns what stands in its cone and not what stands behind a wall', () => {
		const { run, player, ghost } = setup({ x: 3.5, y: 2.5 });
		run.lamps.length = 0;
		player.position = { x: 9.5, y: 2.5 };
		(player as { facing: 'LEFT' | 'RIGHT' }).facing = 'LEFT';
		run.battery = 1;
		steps(run, 1.5);
		expect(ghost.state).toBe('frightened');
		const other = setup({ x: 9.5, y: 4.5 });
		other.run.lamps.length = 0;
		other.run.battery = 1;
		other.player.position = { x: 9.5, y: 2.5 };
		steps(other.run, 3);
		expect(other.ghost.state).toBe('active');
	});

	it('the battery drains, the dots refill it, an energizer lights a flare', () => {
		const { run, progress } = setup();
		run.battery = 0.5;
		steps(run, 1);
		expect(run.battery).toBeLessThan(0.5);
		const low = run.battery;
		progress.taken.add('3,4');
		progress.taken.add('4,4');
		run.update(0.1);
		expect(run.battery).toBeGreaterThan(low + 0.05);
		progress.taken.add('2,4');
		run.update(0.1);
		expect(run.flares).toHaveLength(1);
		expect(run.flares[0].left).toBeLessThanOrEqual(NIGHT_TUNE.flare.life);
		steps(run, NIGHT_TUNE.flare.life + 0.5);
		expect(run.flares).toHaveLength(0);
	});

	it('the flash strips the shrouds in reach and costs battery', () => {
		const { run, ghost, player } = setup({ x: 8.5, y: 2.5 });
		run.lamps.length = 0;
		player.position = { x: 6.5, y: 2.5 };
		run.battery = 1;
		run.update(0.1, true);
		expect(ghost.state).toBe('frightened');
		expect(run.battery).toBeLessThan(1 - NIGHT_TUNE.torch.flashCost + 0.01);
		expect(run.flash).toBeGreaterThan(0);
	});

	it('the Presence puts a lamp out and walking over it lights it again', () => {
		const { run, player } = setup({ x: 1.5, y: 4.5 });
		player.position = { x: 10.5, y: 2.5 };
		steps(run, 30);
		const lamp = run.lamps[0];
		expect(lamp.on).toBe(false);
		player.position = { x: lamp.x, y: lamp.y };
		steps(run, NIGHT_TUNE.lamp.relight + 0.2);
		expect(lamp.on).toBe(true);
	});

	it('when every dot is gone the forest glows again', () => {
		const { run, progress } = setup();
		progress.remainingDots = 0;
		run.update(0.1);
		expect(progress.resets).toBe(1);
		expect(progress.remainingDots).toBe(10);
	});
});
