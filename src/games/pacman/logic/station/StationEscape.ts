// The station's escape (DESIGN.md §7a): the food charges the hatch; charged, the console lights;
// the hero at the console starts the escape, a lit route from there to the hatch, bulkhead doors
// along it closing as he nears (at full speed he beats each one, and it shuts behind him on the
// squad). Made easy: off the route, the route is laid anew from where he is; the first touch is
// forgiven by his one-shot pulse; the second starts the escape over from the console.
import type { GhostTile } from '../actors/GhostModel';

export const ESCAPE_TUNE = {
	/** The share of the food that charges the hatch. */
	charge: 0.9,
	/** A door starts closing when he is this many route steps from it. */
	warn: 3,
	/** Seconds a door takes to close. */
	close: 1.4,
	/** From this much closed a door stops him. */
	blocks: 0.6,
	/** Route steps between doors (and before the first). */
	spacing: 6,
	/** The breakthrough: how many per escape, how long its lane stays lit. */
	charges: 2,
	lane: 2.5
} as const;

export type EscapeState = 'charging' | 'armed' | 'running' | 'out';

/** Where he has to go now (the HUD's goal line, the beacon): the console once the hatch is
 *  charged, then the hatch; none while charging or once out. */
export function escapeGoal(state: EscapeState): 'console' | 'hatch' | null {
	return state === 'armed' ? 'console' : state === 'running' ? 'hatch' : null;
}

export interface EscapeWorld {
	/** Where the hero may walk (no lair, no walls). The route never jumps a tunnel. */
	walkable(x: number, y: number): boolean;
}

export interface Door {
	readonly x: number;
	readonly y: number;
	/** 0 open .. 1 shut. */
	closed: number;
	/** The hero is through it: it shuts for good, on the squad. */
	passed: boolean;
}

export interface EscapeEvents {
	armed: boolean;
	started: boolean;
	rebuilt: boolean;
	out: boolean;
}

const key = (x: number, y: number): string => `${x},${y}`;

export class StationEscape {
	state: EscapeState = 'charging';
	/** 0..1 toward the escape. */
	charge = 0;
	route: GhostTile[] = [];
	doors: Door[] = [];
	/** The one-shot pulse is still his. */
	pulse = true;
	restarts = 0;
	/** The breakthrough's lit lane to the hatch (none may step on it), and the charges left. */
	lane: { tiles: Set<string>; route: GhostTile[]; left: number } | null = null;
	charges: number = ESCAPE_TUNE.charges;

	constructor(
		private readonly world: EscapeWorld,
		readonly console: GhostTile,
		readonly hatch: GhostTile,
		/** Bulkhead doors along the route (off: the way is free). */
		private readonly withDoors = true
	) {}

	/** The breakthrough: the way from him to the hatch lights as a lane for a moment. */
	useLane(hero: GhostTile): boolean {
		if (this.state !== 'running' || this.charges <= 0) return false;
		const keep = this.route;
		if (!this.layRoute(hero)) return false;
		const route = this.route;
		this.route = keep.length ? keep : route;
		this.charges -= 1;
		this.lane = { tiles: new Set(route.map((t) => key(t.x, t.y))), route, left: ESCAPE_TUNE.lane };
		return true;
	}

	/** The lane is lit on the tile: no creature steps there. */
	laneBlocks(x: number, y: number): boolean {
		return this.lane !== null && this.lane.tiles.has(key(x, y));
	}

	/** Eaten of all the food. */
	setFood(eaten: number, total: number): void {
		this.charge = total > 0 ? Math.min(1, eaten / (total * ESCAPE_TUNE.charge)) : 1;
	}

	/** A door (shut enough) stands there: nobody walks through. */
	blocks(x: number, y: number): boolean {
		return this.doors.some((d) => d.x === x && d.y === y && d.closed >= ESCAPE_TUNE.blocks);
	}

	onRoute(x: number, y: number): boolean {
		return this.route.some((t) => t.x === x && t.y === y);
	}

	update(dt: number, hero: GhostTile): EscapeEvents {
		const ev: EscapeEvents = { armed: false, started: false, rebuilt: false, out: false };
		if (this.state === 'charging' && this.charge >= 1) {
			this.state = 'armed';
			ev.armed = true;
		}
		if (this.state === 'armed' && hero.x === this.console.x && hero.y === this.console.y) {
			this.start();
			ev.started = true;
			return ev;
		}
		if (this.lane) {
			this.lane.left -= dt;
			if (this.lane.left <= 0) this.lane = null;
		}
		if (this.state !== 'running') return ev;
		if (hero.x === this.hatch.x && hero.y === this.hatch.y) {
			this.state = 'out';
			ev.out = true;
			return ev;
		}
		const at = this.route.findIndex((t) => t.x === hero.x && t.y === hero.y);
		if (at < 0) {
			// a wrong turn: the lights run anew from where he is
			ev.rebuilt = this.layRoute(hero);
		} else if (at > 0) {
			// the doors in the stretch he has run are behind him: they shut on the squad
			for (const t of this.route.slice(0, at)) {
				const d = this.doors.find((dd) => dd.x === t.x && dd.y === t.y);
				if (d) d.passed = true;
			}
			this.route.splice(0, at);
		}
		for (const door of this.doors) {
			if (door.passed) {
				door.closed = Math.min(1, door.closed + dt / ESCAPE_TUNE.close);
				continue;
			}
			const i = this.route.findIndex((t) => t.x === door.x && t.y === door.y);
			if (i >= 1 && i <= ESCAPE_TUNE.warn) {
				door.closed = Math.min(1, door.closed + dt / ESCAPE_TUNE.close);
			} else if (i < 0) {
				// off his way now: it opens again slowly
				door.closed = Math.max(0, door.closed - dt / ESCAPE_TUNE.close);
			}
		}
		// a door shut across his way: round it; if there is no way round, it opens again
		const shut = this.route.find((t, i) => i > 0 && this.blocks(t.x, t.y));
		if (shut) {
			if (!this.layRoute(hero)) {
				const d = this.doors.find((dd) => dd.x === shut.x && dd.y === shut.y);
				if (d) d.closed = 0;
				this.layRoute(hero);
			}
			ev.rebuilt = true;
		}
		return ev;
	}

	/**
	 * The squad touched him in the escape: the first time his pulse goes off ('pulse'), the
	 * second the escape starts over from the console ('restart', the doors open, the pulse back).
	 */
	touch(): 'pulse' | 'restart' {
		if (this.pulse) {
			this.pulse = false;
			return 'pulse';
		}
		this.restarts += 1;
		this.start();
		return 'restart';
	}

	private start(): void {
		this.state = 'running';
		this.pulse = true;
		this.charges = ESCAPE_TUNE.charges;
		this.lane = null;
		this.layRoute(this.console);
		this.doors = [];
		for (
			let i = ESCAPE_TUNE.spacing;
			this.withDoors && i < this.route.length - 2;
			i += ESCAPE_TUNE.spacing
		) {
			const t = this.route[i];
			this.doors.push({ x: t.x, y: t.y, closed: 0, passed: false });
		}
	}

	/** The shortest way from `from` to the hatch round the shut doors; false when there is none. */
	private layRoute(from: GhostTile): boolean {
		const prev = new Map<string, string | null>([[key(from.x, from.y), null]]);
		let frontier: GhostTile[] = [from];
		let found = false;
		while (frontier.length && !found) {
			const next: GhostTile[] = [];
			for (const t of frontier) {
				for (const [dx, dy] of [
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1]
				]) {
					const x = t.x + dx;
					const y = t.y + dy;
					// the hatch is the way out even while shut to the rest of the maze
					const isHatch = x === this.hatch.x && y === this.hatch.y;
					if (!isHatch && (!this.world.walkable(x, y) || this.blocks(x, y))) continue;
					if (prev.has(key(x, y))) continue;
					prev.set(key(x, y), key(t.x, t.y));
					if (isHatch) {
						found = true;
						break;
					}
					next.push({ x, y });
				}
				if (found) break;
			}
			frontier = next;
		}
		if (!found) return false;
		const route: GhostTile[] = [];
		let at: string | null = key(this.hatch.x, this.hatch.y);
		while (at) {
			const [x, y] = at.split(',').map(Number);
			route.unshift({ x, y });
			at = prev.get(at) ?? null;
		}
		this.route = route;
		return true;
	}
}
