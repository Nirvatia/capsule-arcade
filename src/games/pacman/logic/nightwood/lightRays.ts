// Light on the maze's grid, pure: a ray marches tile by tile (DDA) until a tile stops it. The
// lamps' pools, the torch's cone and the line of sight that decides who stands in the light are all
// cut by the walls this way, so the forest's thickets throw crisp shadows (`DESIGN.md` §7b).

/** Does the tile (x, y) stop light? Out-of-range tiles must answer true. */
export type Solid = (x: number, y: number) => boolean;

/** How far a ray from (ox, oy), in tile units, goes in direction `ang` before a solid tile. */
export function castRay(solid: Solid, ox: number, oy: number, ang: number, maxR: number): number {
	const dx = Math.cos(ang);
	const dy = Math.sin(ang);
	let mx = Math.floor(ox);
	let my = Math.floor(oy);
	const ddx = Math.abs(dx) < 1e-9 ? Infinity : Math.abs(1 / dx);
	const ddy = Math.abs(dy) < 1e-9 ? Infinity : Math.abs(1 / dy);
	const sx = dx < 0 ? -1 : 1;
	const sy = dy < 0 ? -1 : 1;
	let tx = ddx === Infinity ? Infinity : (dx < 0 ? ox - mx : mx + 1 - ox) * ddx;
	let ty = ddy === Infinity ? Infinity : (dy < 0 ? oy - my : my + 1 - oy) * ddy;
	let d = 0;
	while (d < maxR) {
		if (tx < ty) {
			d = tx;
			tx += ddx;
			mx += sx;
		} else {
			d = ty;
			ty += ddy;
			my += sy;
		}
		if (solid(mx, my)) {
			return Math.min(d, maxR);
		}
	}
	return maxR;
}

/** Can the point a see the point b (tile units)? */
export function sees(solid: Solid, ax: number, ay: number, bx: number, by: number): boolean {
	const d = Math.hypot(bx - ax, by - ay);
	if (d < 0.01) {
		return true;
	}
	return castRay(solid, ax, ay, Math.atan2(by - ay, bx - ax), d + 0.05) >= d - 0.02;
}

/**
 * The lit polygon of a light as flat tile coordinates, the origin first: `n + 1` rays from `a0`
 * to `a1`. A ray that strikes a solid tile goes `into` tiles further, so the near boughs of a
 * thicket catch the light that falls on them.
 */
export function visibility(
	solid: Solid,
	ox: number,
	oy: number,
	a0: number,
	a1: number,
	n: number,
	maxR: number,
	into = 0.62
): number[] {
	const pts: number[] = [ox, oy];
	for (let i = 0; i <= n; i += 1) {
		const a = a0 + ((a1 - a0) * i) / n;
		let d = castRay(solid, ox, oy, a, maxR);
		if (d < maxR) {
			d = Math.min(maxR, d + into);
		}
		pts.push(ox + Math.cos(a) * d, oy + Math.sin(a) * d);
	}
	return pts;
}
