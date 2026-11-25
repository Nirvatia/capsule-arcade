import { describe, expect, it } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { buildLevelSession } from '../level/LevelSession';
import { stationSeason } from '../level/SeasonCatalog';
import { RUN_TUNE } from './StationRun';

function level() {
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
	const run = session.stationRun;
	if (!run) throw new Error('the station level has no station run');
	return { session, run };
}

/** A hunter on the hero's tile. */
function touch(s: ReturnType<typeof level>): void {
	const g = s.session.ghosts.list[0];
	g.setState('active');
	g.teleportTo({
		x: Math.floor(s.session.player.position.x),
		y: Math.floor(s.session.player.position.y)
	});
}

describe('the station level', () => {
	it('plays by the squad and the escape', () => {
		const { session } = level();
		expect(session.stationRun).not.toBeNull();
	});

	it('costs one of three hits per touch, and the third ends the level taken', () => {
		const s = level();
		for (let hit = 1; hit <= RUN_TUNE.hits; hit += 1) {
			touch(s);
			s.run.update(1 / 60, false);
			expect(s.run.dying).toBeGreaterThanOrEqual(0);
			for (let t = 0; t <= RUN_TUNE.death + 0.05; t += 1 / 60) s.run.update(1 / 60, false);
			expect(s.run.hits).toBe(RUN_TUNE.hits - hit);
		}
		expect(s.run.end).toBe('taken');
	});

	it('is won through the hatch in the escape', () => {
		const s = level();
		const { progress, player, season } = s.session;
		const rows = season.grid;
		for (let y = 0; y < rows.length; y += 1)
			for (let x = 0; x < rows[y].length; x += 1) if (rows[y][x] === 'DT') progress.collectAt(x, y);
		s.run.update(1 / 60, false);
		expect(s.run.escape.charge).toBe(1);
		player.placeAt(RUN_TUNE.console);
		for (let t = 0; t < 1; t += 1 / 60) {
			s.session.ghosts.list.forEach((g) => s.session.ghosts.freeze(g.kind, 1));
			s.run.update(1 / 60, false);
		}
		expect(s.run.escape.state).toBe('running');
		player.placeAt(RUN_TUNE.hatch);
		s.run.update(1 / 60, false);
		expect(s.run.end).toBe('out');
	});
});
