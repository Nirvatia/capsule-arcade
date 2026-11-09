/**
 * How far a hero has sunk into a tunnel pad, 0..1, from his distance to the pad's centre
 * (tiles): 0 from a tile away, 1 on the centre. He fades into the pad going in, and comes out
 * of it the same way, since he starts at its centre.
 */
export function padSink(distance: number): number {
	const k = Math.max(0, Math.min(1, (1 - distance) / 0.85));
	return k * k * (3 - 2 * k);
}
