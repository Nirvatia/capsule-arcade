import { describe, expect, it } from 'vitest';
import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { buildLevelSession } from '../level/LevelSession';
import { seasonForLevel } from '../level/SeasonCatalog';
import { isLairTile } from '../maze/LairExit';
import { shortestRoute } from './ghostRoutes';

describe('eaten ghosts (eyes)', () => {
	it('go home the shortest way, never round the lair', () => {
		const session = buildLevelSession({
			events: new EventBus<PacmanEventMap>(),
			level: 1,
			profile: 'pacman',
			season: seasonForLevel(1),
			hell: false,
			secret: false,
			godMode: false
		});
		const { grid, ghosts } = session;
		const ghost = ghosts.list.find((g) => g.kind === 'BLINKY')!;
		const spawn = grid.ghostSpawns.BLINKY;
		const world = {
			walkable: (x: number, y: number) => grid.isGhostWalkable(x, y, true),
			teleport: (x: number, y: number) => grid.teleportDestination(x, y)
		};
		const late: string[] = [];
		for (let y = 0; y < grid.height; y++) {
			for (let x = 0; x < grid.width; x++) {
				if (!grid.isGhostWalkable(x, y, false) || grid.isTeleport(x, y) || isLairTile(grid, x, y))
					continue;
				for (const facing of ['UP', 'DOWN', 'LEFT', 'RIGHT'] as const) {
					const route = shortestRoute(
						world,
						{ tile: { x, y }, facing: null },
						(gx, gy) => gx === spawn.x && gy === spawn.y
					);
					expect(route).not.toBeNull();
					// heading `facing` as it is eaten: it has just arrived on the tile that way
					const from = { UP: [0, 1], DOWN: [0, -1], LEFT: [1, 0], RIGHT: [-1, 0] }[facing];
					if (!grid.isGhostWalkable(x + from[0], y + from[1], true)) continue;
					ghost.reset({ x: x + from[0], y: y + from[1] }, 0);
					ghost.setState('eyes');
					ghost.beginMove(facing, { x, y });
					ghost.addProgress(0.999);
					let steps = -1;
					let last = `${ghost.tile.x},${ghost.tile.y}`;
					for (let frame = 0; frame < 6000 && ghost.state === 'eyes'; frame++) {
						ghosts.update(1 / 240);
						const now = `${ghost.tile.x},${ghost.tile.y}`;
						if (now !== last) steps += 1;
						last = now;
					}
					expect(ghost.state).toBe('lair');
					if (steps > route!.directions.length)
						late.push(`${x},${y} ${facing}: ${steps}/${route!.directions.length}`);
				}
			}
		}
		expect(late).toEqual([]);
	});
});
