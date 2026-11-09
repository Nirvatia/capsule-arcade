/**
 * Which season maze a season level plays. Season levels come in cycles of `CYCLE_LENGTH`
 * (one per season), and a cycle plays every maze once. The first cycle goes in order
 * (so the menu, which shows level 1, already shows the maze the game starts on); each
 * later cycle is a seeded shuffle whose first maze differs from the last one of the
 * cycle before, so no maze is ever played twice in a row.
 *
 * Pure: the same `(seed, cycle)` always gives the same order, so a dev jump to any level
 * lands on the maze a normal run would reach.
 */

export const CYCLE_LENGTH = 4;

/** mulberry32: a small seeded generator. */
function rng(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function identity(): number[] {
	return Array.from({ length: CYCLE_LENGTH }, (_, i) => i);
}

function shuffled(seed: number, cycle: number, notFirst: number): number[] {
	const random = rng(Math.imul(seed ^ 0x9e3779b9, 31) + Math.imul(cycle + 1, 0x85ebca6b));
	const order = identity();
	for (let i = order.length - 1; i > 0; i -= 1) {
		const j = Math.floor(random() * (i + 1));
		[order[i], order[j]] = [order[j] as number, order[i] as number];
	}
	if (order[0] === notFirst) {
		const j = 1 + Math.floor(random() * (order.length - 1));
		[order[0], order[j]] = [order[j] as number, order[0] as number];
	}
	return order;
}

/** The maze indexes (0-based) a cycle plays, in order. */
export function mazeOrder(seed: number, cycle: number): readonly number[] {
	if (!Number.isFinite(cycle) || cycle < 0) {
		console.error('MazeCycle.mazeOrder', 'invalid cycle', cycle);
		return identity();
	}
	let order = identity();
	for (let c = 1; c <= Math.floor(cycle); c += 1) {
		order = shuffled(seed, c, order[CYCLE_LENGTH - 1] as number);
	}
	return order;
}

/** The maze index (0-based) of the `seasonLevel`-th season level (1-based). */
export function mazeIndexForSeasonLevel(seed: number, seasonLevel: number): number {
	const n = Math.max(1, Math.floor(seasonLevel)) - 1;
	return mazeOrder(seed, Math.floor(n / CYCLE_LENGTH))[n % CYCLE_LENGTH] as number;
}
