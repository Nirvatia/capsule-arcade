// The station's light as the rules see it (DESIGN.md §7a): whether a point is in the hero's
// flashlight cone with nothing in between, and the tiles the super flare's beam burns down.
import { STATION } from '../../config/stationConfig';
import type { PlayerDirection } from '../actors/PlayerModel';

export interface Point {
	readonly x: number;
	readonly y: number;
}

/** A wall or the void at tile (x, y): light does not pass. */
export type Solid = (x: number, y: number) => boolean;

export const DIRECTION_ANGLE: Readonly<Record<PlayerDirection, number>> = {
	RIGHT: 0,
	DOWN: Math.PI / 2,
	LEFT: Math.PI,
	UP: -Math.PI / 2
};

const STEP: Readonly<Record<PlayerDirection, Point>> = {
	RIGHT: { x: 1, y: 0 },
	DOWN: { x: 0, y: 1 },
	LEFT: { x: -1, y: 0 },
	UP: { x: 0, y: -1 }
};

/** Nothing solid on the straight line from `a` to `b` (both in tile coordinates, centres). */
export function clearLine(a: Point, b: Point, solid: Solid): boolean {
	const d = Math.hypot(b.x - a.x, b.y - a.y);
	const n = Math.max(1, Math.ceil(d / 0.2));
	for (let i = 1; i < n; i += 1) {
		const x = a.x + ((b.x - a.x) * i) / n;
		const y = a.y + ((b.y - a.y) * i) / n;
		if (solid(Math.floor(x), Math.floor(y))) {
			return false;
		}
	}
	return true;
}

/**
 * Whether `p` is in the flashlight: within reach, within the cone round `angle` (or right
 * beside the hero, in his halo), and seen with no wall in between.
 */
export function inBeam(hero: Point, angle: number, p: Point, solid: Solid): boolean {
	const dx = p.x - hero.x;
	const dy = p.y - hero.y;
	const d = Math.hypot(dx, dy);
	if (d > STATION.beam.reach) {
		return false;
	}
	if (d > 0.9) {
		let da = Math.atan2(dy, dx) - angle;
		while (da > Math.PI) da -= Math.PI * 2;
		while (da < -Math.PI) da += Math.PI * 2;
		if (Math.abs(da) > STATION.beam.half) {
			return false;
		}
	}
	return clearLine(hero, p, solid);
}

/** The tiles the super flare burns: from the hero's tile ahead along `facing` to the first wall. */
export function beamTiles(
	from: Point,
	facing: PlayerDirection,
	solid: Solid,
	reach: number
): Point[] {
	const step = STEP[facing];
	const tiles: Point[] = [{ x: from.x, y: from.y }];
	for (let i = 1; i <= reach; i += 1) {
		const x = from.x + step.x * i;
		const y = from.y + step.y * i;
		if (solid(x, y)) {
			break;
		}
		tiles.push({ x, y });
	}
	return tiles;
}
