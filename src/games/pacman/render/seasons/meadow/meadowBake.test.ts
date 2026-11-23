import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { GridMatrix } from '../../../config/gridConfig';
import { bakeMeadow, MEADOW_TILE } from './MeadowBake';
import type { MeadowBakeTheme } from './MeadowTheme';
import { winterTheme } from '../winter/winterTheme';
import { autumnTheme } from '../autumn/autumnTheme';
import { springTheme } from '../spring/springTheme';
import { summerTheme } from '../summer/summerTheme';

/** A 2D context that only remembers fillRects, with the style they were drawn in. */
class FakeContext {
	fillStyle: unknown = '#000';
	strokeStyle: unknown = '#000';
	lineWidth = 1;
	lineCap = 'butt';
	lineJoin = 'miter';
	globalAlpha = 1;
	globalCompositeOperation = 'source-over';
	imageSmoothingEnabled = true;
	shadowColor = '';
	shadowBlur = 0;
	shadowOffsetX = 0;
	shadowOffsetY = 0;
	readonly fills: Array<{ style: unknown; x: number; y: number; w: number; h: number }> = [];
	private readonly stack: unknown[] = [];

	fillRect(x: number, y: number, w: number, h: number): void {
		this.fills.push({ style: this.fillStyle, x, y, w, h });
	}
	scale(): void {}
	translate(): void {}
	save(): void {
		this.stack.push(null);
	}
	restore(): void {
		this.stack.pop();
	}
	beginPath(): void {}
	closePath(): void {}
	moveTo(): void {}
	lineTo(): void {}
	arcTo(): void {}
	arc(): void {}
	ellipse(): void {}
	quadraticCurveTo(): void {}
	fill(): void {}
	stroke(): void {}
	clip(): void {}
	createLinearGradient(): { addColorStop: () => void } {
		return { addColorStop: () => {} };
	}
	createRadialGradient(): { addColorStop: () => void } {
		return { addColorStop: () => {} };
	}
}

let contexts: FakeContext[];

beforeEach(() => {
	contexts = [];
	vi.stubGlobal('document', {
		createElement: () => {
			const context = new FakeContext();
			contexts.push(context);
			const canvas: { width: number; height: number; getContext: () => FakeContext } = {
				width: 0,
				height: 0,
				getContext: () => context
			};
			return canvas;
		}
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
});

// walls all around, a path block inside, one lair tile:
//   WL WL WL WL WL
//   WL FL FL FL WL
//   WL FL LT FL WL
//   WL FL FL FL WL
//   WL WL WL WL WL
const GRID: GridMatrix = [
	['WL', 'WL', 'WL', 'WL', 'WL'],
	['WL', 'FL', 'FL', 'FL', 'WL'],
	['WL', 'FL', 'LT', 'FL', 'WL'],
	['WL', 'FL', 'FL', 'FL', 'WL'],
	['WL', 'WL', 'WL', 'WL', 'WL']
];
const T = MEADOW_TILE;
const PATH_CELLS = 8;

const FLOOR_MARK = '#ff00ff';
const LAIR_MARK = '#00ffff';
const WALL_MARK = '#00ff00';

function themed(over: {
	floor?: MeadowBakeTheme['floor']['paint'];
	lair?: MeadowBakeTheme['lair']['paint'];
	wall?: MeadowBakeTheme['wall']['paint'];
}): MeadowBakeTheme {
	// (the holiday scene is left out: these tests are about the paint hooks)
	const base = { ...winterTheme.bake, scene: undefined };
	return {
		...base,
		wall: { ...base.wall, paint: over.wall },
		floor: { ...base.floor, paint: over.floor },
		lair: { ...base.lair, paint: over.lair }
	};
}

function bake(P: MeadowBakeTheme): FakeContext {
	const cv = bakeMeadow(GRID, P, 0, 0, 5 * T, 5 * T, 1);
	return (cv as unknown as { getContext: () => FakeContext }).getContext();
}

describe('MeadowBake theme paint hooks', () => {
	it('paints path cells with the theme hook when one is set', () => {
		const b = bake(
			themed({
				floor: (f, cell) => {
					f.b.fillStyle = FLOOR_MARK;
					f.b.fillRect(cell.x, cell.y, T, T);
				}
			})
		);
		const marks = b.fills.filter((d) => d.style === FLOOR_MARK);
		expect(marks).toHaveLength(PATH_CELLS);
		// every marked cell is inside the wall border (a path cell)
		expect(marks.every((d) => d.x >= T && d.y >= T && d.x <= 3 * T && d.y <= 3 * T)).toBe(true);
	});

	it('paints the lair and the walls with their hooks', () => {
		const b = bake(
			themed({
				lair: (f, cell) => {
					f.b.fillStyle = LAIR_MARK;
					f.b.fillRect(cell.x, cell.y, T, T);
				},
				wall: (f) => {
					f.b.fillStyle = WALL_MARK;
					f.b.fillRect(0, 0, T, T);
				}
			})
		);
		expect(b.fills.filter((d) => d.style === LAIR_MARK)).toHaveLength(1);
		// the wall hook replaces the whole wall painter: one call per bake
		expect(b.fills.filter((d) => d.style === WALL_MARK)).toHaveLength(1);
	});

	it('keeps the shared painters when no hooks are set', () => {
		const b = bake(themed({}));
		expect(b.fills.some((d) => d.style === FLOOR_MARK)).toBe(false);
		expect(b.fills.some((d) => d.style === LAIR_MARK)).toBe(false);
		expect(b.fills.some((d) => d.style === WALL_MARK)).toBe(false);
	});

	it("every season paints its corridor and keeps the shared lair; winter and autumn dress the walls' feet", () => {
		for (const theme of [winterTheme, autumnTheme, springTheme, summerTheme]) {
			expect(theme.bake.floor.paint).toBeTypeOf('function');
			// the lair is the common tile floor in every season (winter's ice crust is gone)
			expect(theme.bake.lair.paint).toBeUndefined();
			// the wall painter lays tiles[0] under the rounded corners: it is the corridor's tone
			expect(new Set(theme.bake.floor.tiles).size).toBe(1);
		}
		// the shared stone with a band at the feet: winter's snow bank, autumn's wet leaf litter
		expect(winterTheme.bake.wall.paint).toBeTypeOf('function');
		expect(autumnTheme.bake.wall.paint).toBeTypeOf('function');
		expect(springTheme.bake.wall.paint).toBeUndefined();
		expect(summerTheme.bake.wall.paint).toBeUndefined();
		// only autumn's ground gets wet in the rain
		expect(autumnTheme.bake.wet).toBeTypeOf('function');
		for (const theme of [winterTheme, springTheme, summerTheme])
			expect(theme.bake.wet).toBeUndefined();
	});

	it('every season carries its holiday scene', () => {
		for (const theme of [autumnTheme, winterTheme, springTheme, summerTheme]) {
			expect(theme.bake.scene).toBeDefined();
		}
		// every scene dresses the walls: Halloween (moss, leaves, cobwebs), New Year (the snow
		// blanket), the hanami (petals), the fair (bunting)
		for (const theme of [autumnTheme, winterTheme, springTheme, summerTheme]) {
			expect(theme.bake.scene?.wallDress).toBeTypeOf('function');
		}
	});
});
