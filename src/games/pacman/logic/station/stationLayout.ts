// The station's places read from its maze (the owner draws them in the matrix, 2026-11-26): the
// console (CN) the hero starts the escape at, the exit hatch (EX) he leaves through, and where the
// escape's breakout comes from: the vents' mouths (every tunnel's end, 0A..) and above the
// containment's door (the lair's exit), never the hatch.
import { isTeleportToken } from '../../config/gridConfig';
import type { GhostTile } from '../actors/GhostModel';

export interface StationLayout {
	readonly console: GhostTile;
	readonly hatch: GhostTile;
	/** The breakout's doors: the containment's first, then the vents' mouths. */
	readonly doors: readonly GhostTile[];
}

/** Where they stood before the matrix said (`grid_station` of 2026-11-25). */
const FALLBACK = { console: { x: 12, y: 24 }, hatch: { x: 6, y: 1 } } as const;
const LAIR = new Set(['LE', 'LT', 'BY', 'PY', 'IY', 'CE', 'DB']);
const SIDES = [
	[0, -1],
	[0, 1],
	[-1, 0],
	[1, 0]
] as const;

export function stationLayout(rows: readonly (readonly string[])[]): StationLayout {
	const at = (x: number, y: number): string => rows[y]?.[x] ?? 'ES';
	const corridor = (x: number, y: number): boolean => {
		const t = at(x, y);
		return t !== 'WL' && t !== 'ES' && t !== 'EX' && !LAIR.has(t) && !isTeleportToken(t);
	};
	const find = (token: string): GhostTile | null => {
		for (let y = 0; y < rows.length; y += 1)
			for (let x = 0; x < rows[y].length; x += 1) if (rows[y][x] === token) return { x, y };
		return null;
	};
	const doors: GhostTile[] = [];
	const add = (x: number, y: number) => {
		if (!doors.some((d) => d.x === x && d.y === y)) doors.push({ x, y });
	};
	// the containment's door: the corridor beyond the lair's middle exit tile
	const gates: GhostTile[] = [];
	for (let y = 0; y < rows.length; y += 1)
		for (let x = 0; x < rows[y].length; x += 1) if (rows[y][x] === 'LE') gates.push({ x, y });
	const gate = gates[Math.floor(gates.length / 2)];
	if (gate) {
		const out = SIDES.find(([dx, dy]) => corridor(gate.x + dx, gate.y + dy));
		if (out) add(gate.x + out[0], gate.y + out[1]);
	}
	// the vents' mouths
	for (let y = 0; y < rows.length; y += 1)
		for (let x = 0; x < rows[y].length; x += 1) {
			if (!isTeleportToken(rows[y][x])) continue;
			const out = SIDES.find(([dx, dy]) => corridor(x + dx, y + dy));
			if (out) add(x + out[0], y + out[1]);
		}
	return {
		console: find('CN') ?? FALLBACK.console,
		hatch: find('EX') ?? FALLBACK.hatch,
		doors
	};
}
