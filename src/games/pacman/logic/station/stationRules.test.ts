import { describe, expect, it } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { STATION } from '../../config/stationConfig';
import { buildLevelSession } from '../level/LevelSession';
import type { LevelSession } from '../level/LevelSession';
import { stationSeason } from '../level/SeasonCatalog';
import type { GhostKind } from '../actors/GhostModel';
import type { PlayerDirection } from '../actors/PlayerModel';
import type { StationService } from './StationService';

function station(): { session: LevelSession; rules: StationService } {
	const session = buildLevelSession({
		events: new EventBus<PacmanEventMap>(),
		level: 5,
		profile: 'pacman',
		season: stationSeason(),
		hell: false,
		station: true,
		secret: false,
		godMode: false
	});
	const rules = session.stationRules;
	if (!rules) {
		throw new Error('the station level has no station rules');
	}
	return { session, rules };
}

function ghost(session: LevelSession, kind: GhostKind, x: number, y: number) {
	const g = session.ghosts.list.find((item) => item.kind === kind);
	if (!g) {
		throw new Error(`missing ghost ${kind}`);
	}
	g.teleportTo({ x, y });
	g.setState('active');
	return g;
}

/** The hero on (x, y), running `facing` (the bottom corridor, row 24, is open from 2 to 22). */
function heroAt(session: LevelSession, x: number, y: number, facing: PlayerDirection): void {
	session.player.placeAt({ x, y });
	session.player.setDesiredDirection(facing);
	session.player.update(0.01);
}

function eat(session: LevelSession, share: number): void {
	const { grid, progress } = session;
	for (let y = 0; y < grid.height && progress.collectionRatio < share; y += 1) {
		for (let x = 0; x < grid.width && progress.collectionRatio < share; x += 1) {
			if (grid.tileAt(x, y) === 'DT' && !progress.isCollected(x, y)) {
				progress.collectAt(x, y);
			}
		}
	}
}

describe('the station', () => {
	it('has its own kit: no fruit, no power from an energizer, no win on the last dot', () => {
		const { session } = station();
		eat(session, 1);
		for (let i = 0; i < 600; i += 1) {
			session.fruit.update(0.05, session.player);
		}
		expect(session.fruit.active).toBeNull();
		session.combat.update(1 / 60);
		expect(session.combat.isPowerActive).toBe(false);
		expect(session.combat.result).toBe('none');
	});

	it('a touch costs one HP and pulls the hero back along his trail, then grants grace', () => {
		const { session, rules } = station();
		heroAt(session, 3, 24, 'RIGHT');
		// past the start's grace, running right along the bottom corridor
		for (let i = 0; i < 150; i += 1) {
			session.player.update(1 / 60);
			rules.update(1 / 60, false);
		}
		const before = session.player.tile.x;
		expect(before).toBeGreaterThan(6);
		const g = ghost(session, 'BLINKY', before, 24);
		// the hero turned his back on it: a touch from behind
		session.player.setDesiredDirection('LEFT');
		session.player.update(0.01);
		session.combat.update(1 / 60);
		expect(rules.hp).toBe(STATION.hp - 1);
		expect(rules.rewinding).toBe(true);
		expect(g.state).toBe('frightened');
		for (let i = 0; i < 40 && rules.rewinding; i += 1) {
			rules.update(1 / 60, false);
		}
		expect(rules.rewinding).toBe(false);
		expect(session.player.tile.x).toBeLessThan(before - 3);
		expect(session.player.isInvulnerable).toBe(true);
	});

	it('the last HP lost is being caught', () => {
		const { session, rules } = station();
		const g = ghost(session, 'BLINKY', 10, 24);
		const wait = (seconds: number) => {
			for (let t = 0; t < seconds; t += 1 / 60) session.player.update(1 / 60);
		};
		wait(2.1);
		for (let hit = 0; hit < STATION.hp; hit += 1) {
			rules.hit(g);
			for (let i = 0; i < 60; i += 1) {
				rules.update(1 / 60, false);
				session.player.update(1 / 60);
			}
			wait(STATION.grace + 0.6);
		}
		expect(rules.hp).toBe(0);
		expect(rules.consumeCaught()).toBe(true);
		expect(rules.consumeCaught()).toBe(false);
	});

	it('the flashlight makes what it lights flee, and a fleeing creature cannot hurt', () => {
		const { session, rules } = station();
		heroAt(session, 4, 24, 'RIGHT');
		const ahead = ghost(session, 'PINKY', 8, 24);
		const behind = ghost(session, 'INKY', 2, 24);
		rules.update(1 / 60, false);
		expect(ahead.state).toBe('frightened');
		expect(behind.state).toBe('active');
		ahead.teleportTo(session.player.tile);
		behind.teleportTo({ x: 12, y: 12 });
		session.combat.update(1 / 60);
		expect(rules.hp).toBe(STATION.hp);
		// out of the light it hunts again after a moment
		ahead.teleportTo({ x: 12, y: 2 });
		for (let i = 0; i < 60; i += 1) {
			rules.update(1 / 60, false);
		}
		expect(ahead.state).toBe('active');
	});

	it('a flare picked up bursts: everything near flees for a while', () => {
		const { session, rules } = station();
		heroAt(session, 2, 4, 'DOWN');
		const near = ghost(session, 'CLYDE', 6, 2);
		const far = ghost(session, 'BLINKY', 20, 24);
		session.progress.collectAt(2, 2);
		rules.update(1 / 60, false);
		expect(rules.flares).toHaveLength(1);
		expect(near.state).toBe('frightened');
		expect(rules.scaredFor('CLYDE')).toBeGreaterThan(STATION.flare.seconds - 0.5);
		expect(far.state).toBe('active');
	});

	it('the ghosts turn into hunters through cocoons, by the dots or by the clock', () => {
		const { session, rules } = station();
		for (const kind of ['BLINKY', 'PINKY', 'INKY', 'CLYDE'] as const) {
			ghost(session, kind, 12, 2);
		}
		heroAt(session, 4, 24, 'LEFT');
		eat(session, 0.2);
		rules.update(1 / 60, false);
		expect(rules.cocoons.map((c) => c.kind)).toEqual(['BLINKY']);
		expect(session.ghosts.frozenFor('BLINKY')).toBeGreaterThan(0);
		for (let t = 0; t < STATION.metamorphosis.cocoon + 0.2; t += 0.1) {
			rules.update(0.1, false);
		}
		expect([...rules.hunters]).toEqual(['BLINKY']);
		expect(rules.phase).toBe(1);
		// nothing eaten for a long while: the clock brings the next one anyway
		let t = 0;
		while (rules.cocoons.length === 0 && t < STATION.metamorphosis.maxGap + 1) {
			rules.update(0.1, false);
			t += 0.1;
		}
		expect(t).toBeGreaterThan(STATION.metamorphosis.maxGap - 7);
		expect(rules.cocoons.map((c) => c.kind)).toEqual(['PINKY']);
		expect(rules.phase).toBe(2);
	});

	it('the nest: the super flare appears, is carried and burns a corridor that scares', () => {
		const { session, rules } = station();
		for (const kind of ['BLINKY', 'PINKY', 'INKY', 'CLYDE'] as const) {
			ghost(session, kind, 12, 2);
		}
		heroAt(session, 3, 24, 'RIGHT');
		eat(session, 0.85);
		for (let i = 0; i < 6; i += 1) {
			rules.update(1 / 60, false);
		}
		expect(rules.phase).toBe(3);
		// the cocoons hatch
		for (let t = 0; t < STATION.metamorphosis.cocoon + 0.5; t += 0.1) {
			rules.update(0.1, false);
		}
		expect(rules.hunters.size).toBe(4);
		const token = rules.token;
		expect(token).not.toBeNull();
		heroAt(session, token!.x, token!.y, 'RIGHT');
		rules.update(1 / 60, false);
		expect(rules.carried).toBe(true);
		heroAt(session, 3, 24, 'RIGHT');
		rules.update(1 / 60, true);
		expect(rules.carried).toBe(false);
		expect(rules.superBeam?.tiles.length).toBeGreaterThan(10);
		// a hunter that walks into the burning corridor flees, even behind the hero's back
		const inLine = ghost(session, 'BLINKY', 14, 24);
		heroAt(session, 3, 24, 'LEFT');
		rules.update(1 / 60, false);
		expect(inLine.state).toBe('frightened');
	});
});
