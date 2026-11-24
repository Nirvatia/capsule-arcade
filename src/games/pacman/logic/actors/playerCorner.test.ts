import { describe, expect, it } from 'vitest';
import { GRID_CLASSIC } from '../../config/mazes';
import { CORNER_WINDOW, RAGE, rageSpeed } from '../../config/actorConfig';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { LevelProgress } from '../level/LevelProgress';
import { ScoreModel } from '../level/ScoreModel';
import { buildLevelSession } from '../level/LevelSession';
import { seasonForLevel } from '../level/SeasonCatalog';
import { PlayerService } from './PlayerService';
import type { PlayerDirection } from './PlayerModel';

const DT = 1 / 240;

function makePlayer() {
	const grid = new GridService(new GridModel(GRID_CLASSIC));
	const events = new EventBus<PacmanEventMap>();
	const progress = new LevelProgress(grid, new ScoreModel(), events);
	return { grid, player: new PlayerService(grid, progress, events) };
}

/**
 * Runs the hero left from his spawn until he is `short` tiles before the centre of a
 * junction that opens up or down; returns that junction and the way it opens.
 */
function approachJunction(short: number) {
	const made = makePlayer();
	const { grid, player } = made;
	player.setDesiredDirection('LEFT');
	for (let i = 0; i < 4000; i++) {
		const target = { x: player.tile.x - 1, y: player.tile.y };
		const opens: PlayerDirection | null = grid.isPlayerWalkable(target.x, target.y - 1)
			? 'UP'
			: grid.isPlayerWalkable(target.x, target.y + 1)
				? 'DOWN'
				: null;
		const left = player.position.x - (target.x + 0.5);
		if (opens && player.facing === 'LEFT' && left > short - 0.02 && left <= short) {
			return { ...made, junction: target, opens };
		}
		player.update(DT / 4);
	}
	throw new Error('no junction on the way left');
}

describe('cornering', () => {
	it('takes a turn pressed just before a junction at once and runs the corner on the diagonal', () => {
		const short = 0.3;
		const { player, junction, opens } = approachJunction(short);
		const start = player.position;
		const sign = opens === 'UP' ? -1 : 1;
		player.setDesiredDirection(opens);
		player.update(DT);
		expect(player.facing).toBe(opens);
		expect(player.tile).toEqual(junction);
		// he moves along both axes at once
		const after = player.position;
		expect(after.x).toBeLessThan(start.x);
		expect((after.y - start.y) * sign).toBeGreaterThan(0);
		// back on the centre line `short` tiles past the junction in `short / speed` seconds:
		// half the time of going to the centre and out again
		const speed = player.baseSpeed;
		let t = DT;
		while (player.isCutting && t < 1) {
			player.update(DT);
			t += DT;
		}
		expect(t).toBeCloseTo(short / speed, 1);
		expect(player.position.x).toBeCloseTo(junction.x + 0.5, 6);
		expect((player.position.y - (junction.y + 0.5)) * sign).toBeCloseTo(short, 1);
	});

	it('waits for the junction when the turn is pressed farther than the window', () => {
		const { player, opens } = approachJunction(CORNER_WINDOW + 0.2);
		player.setDesiredDirection(opens);
		player.update(DT);
		expect(player.facing).toBe('LEFT');
		expect(player.isCutting).toBe(false);
	});
});

describe('the rage', () => {
	it('dashes +20 % for the first second, then steps down to +10 % with no blend', () => {
		expect(rageSpeed(0)).toBe(1.2);
		expect(rageSpeed(0.99)).toBe(1.2);
		expect(rageSpeed(1)).toBe(1.1);
		expect(rageSpeed(5)).toBe(1.1);
	});

	for (const profile of ['pacman', 'ms-pacman'] as const) {
		it(`an energizer (${profile}) does not stop play; Pac-Man dashes`, () => {
			const session = buildLevelSession({
				events: new EventBus<PacmanEventMap>(),
				level: 1,
				profile,
				season: seasonForLevel(1),
				hell: false,
				secret: false,
				godMode: false
			});
			const { grid, progress, combat, player } = session;
			let at: { x: number; y: number } | null = null;
			for (let y = 0; y < grid.height && !at; y++) {
				for (let x = 0; x < grid.width && !at; x++) if (grid.tileAt(x, y) === 'EU') at = { x, y };
			}
			expect(at).not.toBeNull();
			expect(player.rageSpeed).toBe(1);
			progress.collectAt(at!.x, at!.y);
			combat.update(1 / 60);
			expect(combat.consumeHitStop()).toBe(0);
			if (profile === 'pacman') expect(player.rageSpeed).toBe(RAGE.dash);
			else expect(player.rageSpeed).toBe(1);
			// a second in: the step down, no blend
			for (let i = 0; i < 60; i++) combat.update(1 / 60);
			if (profile === 'pacman') expect(player.rageSpeed).toBe(RAGE.lead);
			else expect(player.rageSpeed).toBe(1);
			// it fades and ends with the power
			for (let i = 0; i < 60 * 30; i++) combat.update(1 / 60);
			expect(player.rageSpeed).toBe(1);
		});
	}
});
