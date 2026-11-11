// When the hell's lair gate is open: while the boss (once he has materialised), his echo or an
// imp is at the gate, it slides open; it shuts behind them.

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

/** 1 if any actor is within reach of a gate tile, else 0. */
export function gateWanted(
	tiles: readonly Point[],
	actors: readonly Point[],
	reach = GATE_REACH
): 0 | 1 {
	return actors.some((a) => tiles.some((t) => Math.hypot(a.x - t.x, a.y - t.y) < reach)) ? 1 : 0;
}

/** One frame of the slide towards `wanted`. */
export function easeGate(current: number, wanted: number, dt: number): number {
	const rate = wanted > current ? OPEN_RATE : CLOSE_RATE;
	const next = current + (wanted - current) * Math.min(1, dt * rate);
	return Math.abs(wanted - next) < 0.002 ? wanted : next;
}
