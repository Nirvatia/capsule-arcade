import { describe, expect, it } from 'vitest';
import { parseMaze } from './parseMaze';
import { validateMaze } from './validateMaze';
import { GRID_01, GRID_02, GRID_03, GRID_04, GRID_CLASSIC, SEASON_MAZES } from './index';
import { GRID_TRON } from './grid_tron';
import { GRID_DOOM as GRID_DOOM_NEXT } from './grid_doom';

const TUNNELS: Record<string, number> = { grid_01: 2, grid_02: 2, grid_03: 2, grid_04: 0 };

describe('the season mazes', () => {
	it('are the four grids, all of one size', () => {
		expect(SEASON_MAZES).toEqual([GRID_01, GRID_02, GRID_03, GRID_04]);
		const sizes = new Set(SEASON_MAZES.map((g) => `${g[0]?.length}x${g.length}`));
		expect([...sizes]).toEqual(['25x27']);
	});

	it.each([
		['grid_01', GRID_01],
		['grid_02', GRID_02],
		['grid_03', GRID_03],
		['grid_04', GRID_04],
		['classic01', GRID_CLASSIC],
		['grid_tron', GRID_TRON]
	])('%s passes the validator', (_name, grid) => {
		expect(validateMaze(grid)).toEqual([]);
	});

	it('the upcoming hell maze passes the validator', () => {
		expect(validateMaze(GRID_DOOM_NEXT)).toEqual([]);
	});

	it.each(Object.entries(TUNNELS))('%s has %i tunnel ends', (name, ends) => {
		const grid = SEASON_MAZES[Number(name.slice(-1)) - 1];
		const count = grid?.flat().filter((t) => t.startsWith('0')).length;
		expect(count).toBe(ends);
	});
});

describe('validateMaze', () => {
	const base = [
		'ES ES ES ES ES ES ES ES ES ES ES',
		'ES WL WL WL WL WL WL WL WL WL ES',
		'ES WL EU DT DT PM DT DT EU WL ES',
		'ES WL DT WL LE LE LE WL DT WL ES',
		'ES WL DT WL LT LT LT WL DT WL ES',
		'ES WL DT WL BY IY LT WL DT WL ES',
		'ES WL DT WL PY CE LT WL DT WL ES',
		'ES WL DT DT DT FT DT DT DT WL ES',
		'ES WL WL WL WL WL WL WL WL WL ES',
		'ES ES ES ES ES ES ES ES ES ES ES'
	];
	const make = (edit: (rows: string[]) => void) => {
		const rows = [...base];
		edit(rows);
		return parseMaze('test', rows);
	};

	it('accepts a small correct maze', () => {
		expect(validateMaze(make(() => undefined))).toEqual([]);
	});

	it('reports a dot walled off from Pac-Man', () => {
		const grid = make((rows) => {
			rows[2] = 'ES WL EU WL DT PM DT DT EU WL ES';
			rows[7] = 'ES WL DT WL DT FT DT DT DT WL ES';
		});
		expect(validateMaze(grid).join('\n')).toMatch(/unreachable/);
	});

	it('reports a tunnel with one end', () => {
		const grid = make((rows) => {
			rows[7] = 'ES 0A DT DT DT FT DT DT DT WL ES';
		});
		expect(validateMaze(grid).join('\n')).toMatch(/tunnel 0A has 1 ends/);
	});

	it('walks through a paired tunnel', () => {
		const grid = make((rows) => {
			rows[2] = 'ES WL 0A WL DT PM DT DT EU WL ES';
			rows[7] = 'ES WL DT DT DT FT DT DT DT 0A ES';
			rows[3] = 'ES WL DT WL LE LE LE WL DT WL ES';
		});
		const problems = validateMaze(grid).filter((p) => !/border|energizers/.test(p));
		expect(problems).toEqual([]);
	});

	it('reports a missing fruit pad and a broken border', () => {
		const grid = make((rows) => {
			rows[7] = 'ES WL DT DT DT DT DT DT DT WL DT';
		});
		const text = validateMaze(grid).join('\n');
		expect(text).toMatch(/exactly one FT, found 0/);
		expect(text).toMatch(/border tile/);
	});

	it('lets a maze without dots through when asked', () => {
		const grid = make((rows) => {
			rows[2] = 'ES WL FL FL FL PM FL FL FL WL ES';
		});
		expect(validateMaze(grid, { requireDots: false }).join('\n')).not.toMatch(/dots|energizers/);
	});
});
