import { NET } from '../../config/netConfig';
import type { GridPoint } from '../maze/GridModel';
import type { GridService } from '../maze/GridService';
import { farthestSpread } from '../zone/ZoneMap';

/** A firewall door on the edge between two corridor tiles (a to b). */
export interface Door {
	readonly id: number;
	readonly a: GridPoint;
	readonly b: GridPoint;
	closedUntil: number;
}

/**
 * The Lady Bug idea in a Pac-Man maze: doors in the corridors. The hero always passes a door, and it
 * slams shut behind him for `hold` seconds: the drones cannot cross it (they plan round it, or are
 * cut off). A door is never in a junction, so shutting one never shuts the hero in.
 */
export class NetDoors {
	readonly list: Door[] = [];
	private time = 0;

	constructor(
		private readonly grid: GridService,
		count: number = NET.doors.count
	) {
		const spawn = grid.playerSpawn;
		const edges: Door[] = [];
		const ok = (p: GridPoint): boolean =>
			grid.isGhostWalkable(p.x, p.y, false) &&
			!grid.isTeleport(p.x, p.y) &&
			grid.exitsCount(p.x, p.y) === 2;
		for (let y = 0; y < grid.height; y += 1) {
			for (let x = 0; x < grid.width; x += 1) {
				for (const [dx, dy] of [
					[1, 0],
					[0, 1]
				]) {
					const a = { x, y };
					const b = { x: x + dx, y: y + dy };
					if (ok(a) && ok(b) && Math.abs(x - spawn.x) + Math.abs(y - spawn.y) >= NET.doors.clear) {
						edges.push({ id: edges.length, a, b, closedUntil: 0 });
					}
				}
			}
		}
		const picked = farthestSpread(
			edges.map((e) => e.a),
			count,
			[spawn]
		);
		for (const p of picked) {
			const e = edges.find((q) => q.a.x === p.x && q.a.y === p.y);
			if (e) {
				this.list.push({ ...e, id: this.list.length });
			}
		}
	}

	get now(): number {
		return this.time;
	}

	update(dt: number): void {
		this.time += dt;
	}

	isClosed(d: Door): boolean {
		return this.time < d.closedUntil;
	}

	/** Is a step from (ax, ay) to (bx, by) shut for a drone? */
	blocks(ax: number, ay: number, bx: number, by: number): boolean {
		for (const d of this.list) {
			if (
				this.isClosed(d) &&
				((d.a.x === ax && d.a.y === ay && d.b.x === bx && d.b.y === by) ||
					(d.a.x === bx && d.a.y === by && d.b.x === ax && d.b.y === ay))
			) {
				return true;
			}
		}
		return false;
	}

	closeNow(d: Door): void {
		d.closedUntil = this.time + NET.doors.hold;
	}

	/** The hero crossed from `from` to `to`: a door on that edge slams shut. Returns it. */
	passed(from: GridPoint, to: GridPoint): Door | null {
		for (const d of this.list) {
			if (
				(d.a.x === from.x && d.a.y === from.y && d.b.x === to.x && d.b.y === to.y) ||
				(d.a.x === to.x && d.a.y === to.y && d.b.x === from.x && d.b.y === from.y)
			) {
				d.closedUntil = this.time + NET.doors.hold;
				return d;
			}
		}
		return null;
	}
}
