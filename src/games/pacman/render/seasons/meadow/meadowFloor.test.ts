import { describe, expect, it, vi } from 'vitest';
import type { GridMatrix } from '../../../config/gridConfig';
import { bakeMeadow, MEADOW_TILE as T } from './MeadowBake';
import { winterTheme } from '../winter/winterTheme';

/** A canvas whose context accepts every bake call without painting. */
function stubDocument() {
	const ctx = new Proxy({} as Record<string, unknown>, {
		get: (t, k: string) =>
			k in t ? t[k] : () => (k.startsWith('create') ? { addColorStop: () => {} } : undefined),
		set: (t, k: string, v) => {
			t[k] = v;
			return true;
		}
	}) as unknown as CanvasRenderingContext2D;
	vi.stubGlobal('document', {
		createElement: () => ({ width: 0, height: 0, getContext: () => ctx })
	});
}

const S: GridMatrix = [
	['WL', 'DT', 'WL'],
	['DT', 'LT', 'DT'],
	['WL', 'DT', 'WL']
];

describe('the per-season path floor hook', () => {
	it('hands every path cell to the season painter and keeps the lair shared', () => {
		stubDocument();
		try {
			const seen: Array<[number, number]> = [];
			const theme = {
				...winterTheme.bake,
				floor: {
					...winterTheme.bake.floor,
					paint: (_f: unknown, x: number, y: number) => seen.push([x, y])
				}
			};
			bakeMeadow(S, theme, 0, 0, 3 * T, 3 * T, 1);
			expect(seen).toHaveLength(4);
			expect(seen.every(([x, y]) => x % T === 0 && y % T === 0)).toBe(true);
			expect(seen.some(([x, y]) => x === T && y === T)).toBe(false);
		} finally {
			vi.unstubAllGlobals();
		}
	});
});
