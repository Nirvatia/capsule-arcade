import type { Sim } from './Sim';
import { DX, DY, opposite, type Dir } from './types';

/**
 * Простой автопилот для демо на титульном экране:
 * кратчайший путь к ближайшему скарабею, иначе — ход в самую просторную сторону.
 */
export function autopilot(sim: Sim): Dir | null {
	const head = sim.headCell;
	const tail = sim.tailCell;
	const blocked = (cell: number): boolean =>
		sim.walls[cell] === 1 || (sim.occ[cell] > 0 && cell !== tail) || sim.inAlpha(cell);

	const prey = new Set(sim.scarabs.map((s) => s.cell));
	const firstDir = new Int8Array(sim.size).fill(-1);
	const queue: number[] = [];
	for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
		if (d === opposite(sim.dir)) continue;
		const n = step(sim, head, d);
		if (n < 0 || blocked(n) || firstDir[n] >= 0) continue;
		firstDir[n] = d;
		queue.push(n);
	}
	for (let i = 0; i < queue.length; i++) {
		const c = queue[i];
		if (prey.has(c)) return firstDir[c] as Dir;
		for (let d = 0; d < 4; d++) {
			const n = step(sim, c, d as Dir);
			if (n < 0 || blocked(n) || firstDir[n] >= 0 || n === head) continue;
			firstDir[n] = firstDir[c];
			queue.push(n);
		}
	}

	let best: Dir | null = null;
	let bestRoom = -1;
	for (let d = 0 as Dir; d < 4; d = (d + 1) as Dir) {
		if (d === opposite(sim.dir)) continue;
		const n = step(sim, head, d);
		if (n < 0 || blocked(n)) continue;
		const room = roomFrom(sim, n, blocked, 60);
		if (room > bestRoom) {
			bestRoom = room;
			best = d;
		}
	}
	return best;
}

function step(sim: Sim, cell: number, d: Dir): number {
	const c = (cell % sim.cols) + DX[d];
	const r = Math.floor(cell / sim.cols) + DY[d];
	if (c < 0 || r < 0 || c >= sim.cols || r >= sim.rows) return -1;
	return r * sim.cols + c;
}

function roomFrom(sim: Sim, start: number, blocked: (c: number) => boolean, cap: number): number {
	const seen = new Set<number>([start]);
	const queue = [start];
	for (let i = 0; i < queue.length && seen.size < cap; i++) {
		for (let d = 0; d < 4; d++) {
			const n = step(sim, queue[i], d as Dir);
			if (n < 0 || blocked(n) || seen.has(n)) continue;
			seen.add(n);
			queue.push(n);
		}
	}
	return seen.size;
}
