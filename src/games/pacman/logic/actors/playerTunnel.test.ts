import { describe, expect, it } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap, PacmanFx } from '../../core/Events';
import { buildLevelSession } from '../level/LevelSession';
import { seasonForLevel } from '../level/SeasonCatalog';

/** The player model, which the service keeps private: a test puts the hero beside a tunnel pad. */
interface WithModel {
	player: { teleportTo(tile: { x: number; y: number }): void };
}

describe('going through a tunnel', () => {
	it('is reported with where he went in and where he came out', () => {
		const events = new EventBus<PacmanEventMap>();
		const fx: PacmanFx[] = [];
		const cues: string[] = [];
		events.on('fx:event', (e) => fx.push(e));
		events.on('audio:cue', (e) => cues.push(e.cue));
		const season = seasonForLevel(1);
		const session = buildLevelSession({
			events,
			level: 1,
			profile: 'pacman',
			season,
			hell: false,
			secret: false,
			godMode: false
		});
		// the left pad of grid_01's tunnel, and the hero two tiles to its right, heading for it
		const grid = session.grid;
		let pad: { x: number; y: number } | null = null;
		for (let y = 0; y < grid.height && !pad; y += 1) {
			for (let x = 0; x < grid.width && !pad; x += 1) {
				if (grid.isTeleport(x, y)) pad = { x, y };
			}
		}
		expect(pad).not.toBeNull();
		const exit = grid.teleportDestination(pad!.x, pad!.y)!;
		(session.player as unknown as WithModel).player.teleportTo({ x: pad!.x + 2, y: pad!.y });
		session.player.setDesiredDirection('LEFT');
		for (let i = 0; i < 120 && !cues.includes('teleport'); i += 1) {
			session.player.update(1 / 60);
		}
		expect(cues).toContain('teleport');
		expect(fx.filter((e) => e.kind === 'teleport')).toEqual([
			{ kind: 'teleport', x: pad!.x + 0.5, y: pad!.y + 0.5, tx: exit.x + 0.5, ty: exit.y + 0.5 }
		]);
	});

	it('does not happen on a maze without a tunnel', () => {
		const grid = seasonForLevel(4).grid;
		expect(grid.flat().some((t) => t.startsWith('0'))).toBe(false);
	});
});
