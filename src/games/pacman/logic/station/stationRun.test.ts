import { describe, expect, it } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { buildLevelSession } from '../level/LevelSession';
import { stationSeason } from '../level/SeasonCatalog';
import { RUN_TUNE } from './StationRun';
import { stationLayout } from './stationLayout';
import { GRID_STATION } from '../../config/mazes';

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
	s.session.ghosts.thawAll();
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

	it('takes one HP a touch, no restart: he stays put, safe a moment; at none the level is taken', () => {
		const s = level();
		const { player } = s.session;
		player.placeAt({ x: 4, y: 24 });
		for (let hp = RUN_TUNE.hp - 1; hp >= 0; hp -= 1) {
			const at = { ...player.position };
			touch(s);
			s.run.update(1 / 60, false);
			expect(s.run.hp).toBe(hp);
			expect(s.run.safe).toBeGreaterThan(0);
			// no restart: he is where he was hit
			expect(Math.hypot(player.position.x - at.x, player.position.y - at.y)).toBeLessThan(0.5);
			if (hp === 0) break;
			// still safe: another touch costs nothing
			touch(s);
			s.run.update(1 / 60, false);
			expect(s.run.hp).toBe(hp);
			for (let t = 0; t <= RUN_TUNE.safe; t += 1 / 60) {
				s.session.ghosts.list.forEach((g) => s.session.ghosts.freeze(g.kind, 1));
				s.run.update(1 / 60, false);
			}
		}
		expect(s.run.end).toBe('taken');
	});

	it('throws the lure in the escape far from him and off his way, and the squad runs to it', () => {
		const s = level();
		const { progress, player, season } = s.session;
		const rows = season.grid;
		for (let y = 0; y < rows.length; y += 1)
			for (let x = 0; x < rows[y].length; x += 1) if (rows[y][x] === 'DT') progress.collectAt(x, y);
		s.run.update(1 / 60, false);
		player.placeAt(s.run.layout.console);
		for (let t = 0; t < 1; t += 1 / 60) {
			s.session.ghosts.list.forEach((g) => s.session.ghosts.freeze(g.kind, 1));
			s.run.update(1 / 60, false);
		}
		expect(s.run.escape.state).toBe('running');
		s.run.update(1 / 60, true);
		const lure = s.run.lure;
		expect(lure).not.toBeNull();
		expect(s.run.lures).toBe(RUN_TUNE.lures - 1);
		const hero = { x: Math.floor(player.position.x), y: Math.floor(player.position.y) };
		expect(Math.abs(lure!.x - hero.x) + Math.abs(lure!.y - hero.y)).toBeGreaterThanOrEqual(4);
		for (const t of s.run.escape.route)
			expect(Math.abs(t.x - lure!.x) + Math.abs(t.y - lure!.y)).toBeGreaterThanOrEqual(
				RUN_TUNE.lureOff
			);
		expect(s.run.squad.lure).toEqual({ x: lure!.x, y: lure!.y });
		// one at a time
		expect(s.run.throwLure()).toBe(false);
	});

	it('reads its console, exit and breakout doors from the matrix; none come out by the exit', () => {
		const layout = stationLayout(GRID_STATION);
		expect(layout.console).toEqual({ x: 12, y: 24 });
		expect(layout.hatch).toEqual({ x: 6, y: 1 });
		// the containment's door first, then the vents' and the side tunnels' mouths
		expect(layout.doors[0]).toEqual({ x: 12, y: 10 });
		expect(layout.doors).toEqual(
			expect.arrayContaining([
				{ x: 18, y: 2 },
				{ x: 6, y: 24 },
				{ x: 2, y: 13 },
				{ x: 22, y: 13 }
			])
		);
		for (const d of layout.doors)
			expect(Math.abs(d.x - layout.hatch.x) + Math.abs(d.y - layout.hatch.y)).toBeGreaterThan(1);
	});

	it('keeps the exit shut until the escape, then opens it to the hero alone; the cells go out', () => {
		const s = level();
		const { progress, player, season, grid } = s.session;
		const { hatch } = s.run.layout;
		expect(grid.isPlayerWalkable(hatch.x, hatch.y)).toBe(false);
		expect(grid.isTeleport(hatch.x, hatch.y)).toBe(false);
		const rows = season.grid;
		for (let y = 0; y < rows.length; y += 1)
			for (let x = 0; x < rows[y].length; x += 1) if (rows[y][x] === 'DT') progress.collectAt(x, y);
		s.run.update(1 / 60, false);
		const cells = (): number =>
			rows.flatMap((row, y) => row.filter((t, x) => t === 'EU' && !progress.isCollected(x, y)))
				.length;
		expect(cells()).toBeGreaterThan(0);
		player.placeAt(s.run.layout.console);
		for (let t = 0; t < 1; t += 1 / 60) {
			s.session.ghosts.list.forEach((g) => s.session.ghosts.freeze(g.kind, 1));
			s.run.update(1 / 60, false);
		}
		expect(s.run.escape.state).toBe('running');
		expect(grid.isPlayerWalkable(hatch.x, hatch.y)).toBe(true);
		expect(grid.isGhostWalkable(hatch.x, hatch.y, false)).toBe(false);
		expect(cells()).toBe(0);
		expect(s.run.escape.route.at(-1)).toEqual(hatch);
	});

	it('is won through the hatch in the escape', () => {
		const s = level();
		const { progress, player, season } = s.session;
		const rows = season.grid;
		for (let y = 0; y < rows.length; y += 1)
			for (let x = 0; x < rows[y].length; x += 1) if (rows[y][x] === 'DT') progress.collectAt(x, y);
		s.run.update(1 / 60, false);
		expect(s.run.escape.charge).toBe(1);
		player.placeAt(s.run.layout.console);
		for (let t = 0; t < 1; t += 1 / 60) {
			s.session.ghosts.list.forEach((g) => s.session.ghosts.freeze(g.kind, 1));
			s.run.update(1 / 60, false);
		}
		expect(s.run.escape.state).toBe('running');
		player.placeAt(s.run.layout.hatch);
		s.run.update(1 / 60, false);
		expect(s.run.end).toBe('out');
	});
});
