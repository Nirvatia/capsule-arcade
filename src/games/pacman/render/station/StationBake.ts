// The station baked (DESIGN.md §7a, style B): the scene that never moves, painted once per level
// at a scale fitted to the screen, in layers the phases treat apart: the base (deck, surround,
// corridors, walls, vents, the nest), what glows by itself on the surround (lamps, tanks, the
// window), the walls' safety edge and their light strip, and the nest's resin for each phase
// (made the first time that phase is shown).
import type { GridMatrix } from '../../config/gridConfig';
import { context, makeCanvas } from '../doom/fleshNoise';
import type { Lamp, Phase } from './stationPaint';
import { FRAME, layer, setBakeScale, sk, stationLamps } from './stationPaint';
import { paintDeck, paintSurround } from './stationSurround';
import { paintCorridors, paintNest, paintResin, paintVents } from './stationMaze';
import { paintWalls } from './stationWalls';

export interface StationBake {
	/** Device pixels per scene unit of every layer. */
	readonly k: number;
	readonly base: HTMLCanvasElement;
	/** The surround's own lights (lamp cages, tanks, the window, the nest's breath). */
	readonly glow: HTMLCanvasElement;
	/** The walls' photoluminescent edge: continuous, lit in every phase. */
	readonly edge: HTMLCanvasElement;
	readonly lamps: readonly Lamp[];
	/** The nest's resin of `phase`, a transparent layer over the base. */
	resin(phase: Phase): HTMLCanvasElement;
}

function frameCanvas(k: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
	const c = makeCanvas(FRAME.w * k, FRAME.h * k);
	const x = context(c);
	x.scale(k, k);
	return [c, x];
}

/** Bakes the station for `grid` at `k` device pixels per scene unit. */
export function bakeStation(grid: GridMatrix, k: number): StationBake {
	setBakeScale(k);
	const scale = sk();
	const [base, c] = frameCanvas(scale);
	const [glow, gl] = frameCanvas(scale);
	const [edge, ed] = frameCanvas(scale);
	paintDeck(c);
	paintSurround(c, gl, grid);
	paintCorridors(c, grid);
	paintWalls(c, ed, grid);
	paintVents(c, grid);
	paintNest(c, gl, grid);
	const resins = new Map<Phase, HTMLCanvasElement>();
	return {
		k: scale,
		base,
		glow,
		edge,
		lamps: stationLamps(grid),
		resin(phase: Phase): HTMLCanvasElement {
			const hit = resins.get(phase);
			if (hit) {
				return hit;
			}
			setBakeScale(scale);
			const [cv, x] = layer();
			paintResin(x, grid, phase);
			resins.set(phase, cv);
			return cv;
		}
	};
}
