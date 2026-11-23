import { describe, expect, it } from 'vitest';
import { POND } from '../config';
import type { Cell } from '../pictures/types';
import { Pond, entryPoint, type Dir, type PondEvent } from './pond';

const line = (pts: [number, number][]): Cell[] => pts.map(([x, y]) => ({ x, y }));

function pond(strokes: Cell[][], start: Cell, dir: Dir): Pond {
	return new Pond({
		cols: 12,
		rows: 8,
		strokes: strokes.map((cells, id) => ({ id, cells })),
		start,
		dir,
		len: 3
	});
}

/** Прогнать ровно n шагов, независимо от скорости. */
function steps(p: Pond, n: number): void {
	for (let i = 0; i < n; i++) {
		p.t = 1 - 1e-9;
		p.update(1e-6);
	}
}

const kinds = (e: PondEvent[]): string[] => e.map((x) => x.k);

describe('pond movement', () => {
	it('moves one cell per step and wraps across the edge', () => {
		const p = pond([], { x: 10, y: 3 }, 1);
		steps(p, 1);
		expect(p.head).toMatchObject({ x: 11, y: 3, w: false });
		steps(p, 1);
		expect(p.head).toMatchObject({ x: 0, y: 3, w: true });
		expect(p.events.some((e) => e.k === 'wrap')).toBe(true);
	});

	it('queues turns and ignores reversing', () => {
		const p = pond([], { x: 2, y: 2 }, 1);
		p.press(3);
		p.press(2);
		steps(p, 2);
		expect(p.head).toMatchObject({ x: 3, y: 3 });
	});

	it('slows down near an unlit stroke', () => {
		const p = pond(
			[
				line([
					[6, 2],
					[7, 2],
					[8, 2]
				])
			],
			{ x: 1, y: 2 },
			1
		);
		p.update(0.01);
		expect(p.speed).toBeGreaterThan(POND.TRACE);
		steps(p, 4);
		for (let i = 0; i < 60; i++) p.update(1 / 60);
		expect(p.speed).toBeLessThan((POND.CRUISE + POND.TRACE) / 2);
	});
});

describe('tracing', () => {
	const L = line([
		[3, 2],
		[4, 2],
		[5, 2],
		[5, 3],
		[5, 4]
	]);

	it('lights a stroke traced cell by cell', () => {
		const p = pond([L], { x: 2, y: 2 }, 1);
		steps(p, 3);
		p.press(2);
		steps(p, 2);
		expect(p.strokes[0].lit).toBe(true);
		expect(kinds(p.events)).toEqual(['trace', 'trace', 'trace', 'trace', 'lit', 'clear']);
	});

	it('can start from either end', () => {
		const p = pond([L], { x: 5, y: 5 }, 0);
		steps(p, 3);
		p.press(3);
		steps(p, 2);
		expect(p.strokes[0].lit).toBe(true);
	});

	it('is strict: leaving the stroke resets its progress', () => {
		const p = pond([L], { x: 2, y: 2 }, 1);
		steps(p, 4); // проскочили поворот на (5, 2)
		expect(p.strokes[0].n).toBe(0);
		expect(p.events.some((e) => e.k === 'lost')).toBe(true);
	});

	it('stays quiet when the snake only brushes a stroke end', () => {
		const p = pond([L], { x: 3, y: 1 }, 2);
		steps(p, 3);
		expect(p.strokes[0].n).toBe(0);
		expect(p.events.some((e) => e.k === 'lost')).toBe(false);
	});

	it('lights a one-cell star by passing over it', () => {
		const p = pond([line([[4, 4]])], { x: 2, y: 4 }, 1);
		steps(p, 2);
		expect(p.strokes[0].lit).toBe(true);
	});

	it('does not count a path that wraps through the edge', () => {
		const p = pond(
			[
				line([
					[11, 1],
					[0, 1],
					[1, 1]
				])
			],
			{ x: 10, y: 1 },
			1
		);
		steps(p, 3);
		expect(p.strokes[0].lit).toBe(false);
	});
});

describe('forgiveness', () => {
	const L = line([
		[3, 2],
		[4, 2],
		[5, 2],
		[5, 3],
		[5, 4]
	]);

	it('accepts a slightly late turn when it keeps the trace', () => {
		const p = pond([L], { x: 2, y: 2 }, 1);
		steps(p, 3); // голова на (5, 2), шаг уже начат к (6, 2)
		p.t = POND.LATE_TURN * 0.5;
		p.press(2);
		expect(p.next).toMatchObject({ x: 5, y: 3 });
		steps(p, 2);
		expect(p.strokes[0].lit).toBe(true);
	});

	it('does not rewrite the step when the late turn would not help', () => {
		const p = pond([], { x: 2, y: 2 }, 1);
		steps(p, 1);
		p.t = 0.1;
		p.press(2);
		expect(p.next).toMatchObject({ x: 4, y: 2 });
		steps(p, 1);
		expect(p.head).toMatchObject({ x: 4, y: 2 });
		steps(p, 1);
		expect(p.head).toMatchObject({ x: 4, y: 3 });
	});

	it('is not applied once the head is too far past the centre', () => {
		const p = pond([L], { x: 2, y: 2 }, 1);
		steps(p, 3);
		p.t = POND.LATE_TURN + 0.1;
		p.press(2);
		expect(p.next).toMatchObject({ x: 6, y: 2 });
	});
});

describe('staircase with two held keys', () => {
	it('alternates directions when nothing guides it', () => {
		const p = pond([], { x: 1, y: 1 }, 1);
		p.setHeld([1, 2]);
		steps(p, 4);
		expect(p.body.map((c) => `${c.x},${c.y}`)).toEqual(['2,2', '3,2', '3,3']);
	});

	it('follows an uneven stroke staircase', () => {
		const S = line([
			[2, 1],
			[3, 1],
			[4, 1],
			[4, 2],
			[5, 2],
			[6, 2],
			[6, 3]
		]);
		const p = pond([S], { x: 1, y: 1 }, 1);
		p.setHeld([1, 2]);
		steps(p, 7);
		expect(p.strokes[0].lit).toBe(true);
	});
});

describe('entryPoint', () => {
	it('stays away from strokes', () => {
		let s = 1;
		const rnd = (): number => (s = (s * 16807) % 2147483647) / 2147483647;
		const strokes = [
			{
				cells: line([
					[2, 2],
					[3, 2],
					[4, 2]
				])
			}
		];
		const { cell } = entryPoint(12, 8, strokes, rnd);
		const d = Math.min(
			...strokes[0].cells.map((c) => Math.abs(c.x - cell.x) + Math.abs(c.y - cell.y))
		);
		expect(d).toBeGreaterThanOrEqual(3);
	});
});
