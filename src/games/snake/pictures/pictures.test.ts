import { describe, expect, it } from 'vitest';
import { COLS, ROWS } from '../config';
import { LIBRARY } from './library';
import { parsePicture, rasterize, strokeCells } from './parse';
import { gaussian, morph, resample, strokeShape } from './smooth';

describe('rasterize', () => {
	it('builds a 4-connected staircase including both ends', () => {
		const cells = rasterize([0, 0], [3, 2]);
		expect(cells[0]).toEqual({ x: 0, y: 0 });
		expect(cells[cells.length - 1]).toEqual({ x: 3, y: 2 });
		expect(cells).toHaveLength(6);
		for (let i = 1; i < cells.length; i++)
			expect(Math.abs(cells[i].x - cells[i - 1].x) + Math.abs(cells[i].y - cells[i - 1].y)).toBe(1);
	});

	it('does not walk back over the corner of a sharp turn', () => {
		const cells = strokeCells([
			[0, 0],
			[3, 3],
			[0, 6]
		]);
		expect(new Set(cells.map((c) => `${c.x},${c.y}`)).size).toBe(cells.length);
	});
});

describe('parsePicture', () => {
	it('rejects overlapping strokes', () => {
		expect(() =>
			parsePicture(
				{
					id: 't',
					hue: 0,
					root: 0,
					strokes: [
						[
							[0, 0],
							[4, 0]
						],
						[
							[2, 0],
							[2, 3]
						]
					],
					cycles: [2]
				},
				COLS,
				ROWS
			)
		).toThrow(/share/);
	});

	it('rejects strokes outside the grid and wrong cycle sizes', () => {
		const strokes = [
			[
				[0, 0],
				[COLS, 0]
			] as [number, number][]
		];
		expect(() =>
			parsePicture({ id: 't', hue: 0, root: 0, strokes, cycles: [1] }, COLS, ROWS)
		).toThrow(/leaves/);
		expect(() =>
			parsePicture(
				{
					id: 't',
					hue: 0,
					root: 0,
					strokes: [
						[
							[0, 0],
							[2, 0]
						]
					],
					cycles: [2]
				},
				COLS,
				ROWS
			)
		).toThrow(/cycles/);
	});

	it('joins touching ends halfway', () => {
		const pic = parsePicture(
			{
				id: 't',
				hue: 0,
				root: 0,
				strokes: [
					[
						[0, 0],
						[3, 0]
					],
					[
						[4, 0],
						[4, 3]
					]
				],
				cycles: [2]
			},
			COLS,
			ROWS
		);
		expect(pic.strokes[0].joins[1]).toEqual({ x: 4, y: 0.5 });
		expect(pic.strokes[1].joins[0]).toEqual({ x: 4, y: 0.5 });
	});
});

describe('library', () => {
	it('has unique ids and every picture parses', () => {
		expect(new Set(LIBRARY.map((p) => p.id)).size).toBe(LIBRARY.length);
		for (const src of LIBRARY) {
			const pic = parsePicture(src, COLS, ROWS);
			expect(pic.cycles.flat()).toEqual(pic.strokes.map((_, i) => i));
		}
	});

	it('keeps every stroke short enough to trace calmly', () => {
		for (const src of LIBRARY)
			for (const s of parsePicture(src, COLS, ROWS).strokes)
				expect(s.cells.length).toBeLessThanOrEqual(30);
	});
});

describe('smoothing', () => {
	it('keeps ends in place and point counts equal', () => {
		const raw = resample([
			{ x: 0.5, y: 0.5 },
			{ x: 4.5, y: 0.5 },
			{ x: 4.5, y: 4.5 }
		]);
		const sm = gaussian(raw);
		expect(sm).toHaveLength(raw.length);
		expect(sm[0]).toEqual(raw[0]);
		expect(sm[sm.length - 1]).toEqual(raw[raw.length - 1]);
	});

	it('morph goes from the grid line to the smooth line', () => {
		const pic = parsePicture(LIBRARY[0], COLS, ROWS);
		const shape = strokeShape(pic.strokes[0]);
		expect(morph(shape, 0)).toEqual(shape.raw);
		const end = morph(shape, 1);
		end.forEach((p, i) => {
			expect(p.x).toBeCloseTo(shape.smooth[i].x);
			expect(p.y).toBeCloseTo(shape.smooth[i].y);
		});
	});
});
