// When the hell's lair gate is open: while the boss (once he has materialised), his echo or an
// imp goes through it, it slides open; it shuts behind them. Only who leaves or enters counts:
// inside the lair, near the gate; outside, already stepping into the doorway. The boss running
// along the corridor past the gate leaves it shut.

/** An actor this close (tiles) to a gate tile opens the gate. */
export const GATE_REACH = 1.4;
/** Share of the full slide per second, opening and closing. */
const OPEN_RATE = 7;
const CLOSE_RATE = 3;

export interface Point {
	readonly x: number;
	readonly y: number;
}

/** The centres of the `LE` tiles, in tile-centre coordinates. */
export function gateTiles(grid: {
	readonly width: number;
	readonly height: number;
	tileAt(x: number, y: number): string | null | undefined;
}): Point[] {
	const tiles: Point[] = [];
	for (let y = 0; y < grid.height; y += 1) {
		for (let x = 0; x < grid.width; x += 1) {
			if (grid.tileAt(x, y) === 'LE') {
				tiles.push({ x: x + 0.5, y: y + 0.5 });
			}
		}
	}
	return tiles;
}

/** How far (tiles) an actor outside must have stepped from the corridor into the doorway. */
const DOORWAY_STEP = 0.2;

/**
 * Which side of the gate row the lair is on: +1 below, -1 above (the row next to the gate
 * that is not a wall or a corridor is the lair's).
 */
export function lairSide(
	grid: { tileAt(x: number, y: number): string | null | undefined },
	tiles: readonly Point[]
): 1 | -1 {
	const t = tiles[0];
	if (!t) {
		return 1;
	}
	const below = grid.tileAt(Math.floor(t.x), Math.floor(t.y) + 1);
	return below === 'LT' || (below !== 'WL' && below !== 'DT' && below !== 'EU' && below !== 'ES')
		? 1
		: -1;
}

/**
 * 1 if any actor is going through the gate, else 0: inside the lair (beyond the gate row) and
 * within reach of a gate tile, or outside but already in the doorway (in a gate column, past
 * the corridor's centre line towards the gate).
 */
export function gateWanted(
	tiles: readonly Point[],
	actors: readonly Point[],
	side: 1 | -1 = 1,
	reach = GATE_REACH
): 0 | 1 {
	if (tiles.length === 0) {
		return 0;
	}
	const gy = tiles[0].y;
	const x0 = Math.min(...tiles.map((t) => t.x)) - 0.5;
	const x1 = Math.max(...tiles.map((t) => t.x)) + 0.5;
	const corridor = gy - side;
	return actors.some((a) => {
		const depth = (a.y - gy) * side;
		if (depth >= 0) {
			return tiles.some((t) => Math.hypot(a.x - t.x, a.y - t.y) < reach);
		}
		const stepped = (a.y - corridor) * side;
		return a.x > x0 && a.x < x1 && stepped >= DOORWAY_STEP;
	})
		? 1
		: 0;
}

/** One frame of the slide towards `wanted`. */
export function easeGate(current: number, wanted: number, dt: number): number {
	const rate = wanted > current ? OPEN_RATE : CLOSE_RATE;
	const next = current + (wanted - current) * Math.min(1, dt * rate);
	return Math.abs(wanted - next) < 0.002 ? wanted : next;
}
