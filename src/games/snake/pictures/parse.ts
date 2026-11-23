// Описание рисунка (ломаные по вершинам) → штрихи из соседних клеток.
// Бросает ошибку с понятным текстом, если рисунок неверен.

import type { Cell, Picture, PictureSource, Pt, Stroke, Vertex } from './types';

const ORTHO: readonly (readonly [number, number])[] = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
];

const AROUND: readonly (readonly [number, number])[] = [
	...ORTHO,
	[1, 1],
	[1, -1],
	[-1, 1],
	[-1, -1]
];

/**
 * Лесенка из соседних по стороне клеток от a до b, ближайшая к прямой.
 * Включает обе крайние клетки.
 */
export function rasterize(a: Vertex, b: Vertex, preferX = false): Cell[] {
	const dx = Math.abs(b[0] - a[0]);
	const dy = Math.abs(b[1] - a[1]);
	const sx = Math.sign(b[0] - a[0]);
	const sy = Math.sign(b[1] - a[1]);
	let x = a[0];
	let y = a[1];
	const out: Cell[] = [{ x, y }];
	let ix = 0;
	let iy = 0;
	for (let i = 0; i < dx + dy; i++) {
		// Шаг по той оси, по которой мы сильнее отстали от прямой.
		const ex = (0.5 + ix) / dx;
		const ey = (0.5 + iy) / dy;
		if (ex < ey || (ex === ey && preferX)) {
			x += sx;
			ix++;
		} else {
			y += sy;
			iy++;
		}
		out.push({ x, y });
	}
	return out;
}

/** Ломаная → клетки. На равных лесенка выбирает тот первый шаг, что не идёт назад по углу. */
export function strokeCells(vertices: readonly Vertex[]): Cell[] {
	const cells: Cell[] = [{ x: vertices[0][0], y: vertices[0][1] }];
	const used = new Set([`${cells[0].x},${cells[0].y}`]);
	for (let i = 1; i < vertices.length; i++) {
		const free = (seg: Cell[]): boolean => seg.slice(1).every((c) => !used.has(`${c.x},${c.y}`));
		let seg = rasterize(vertices[i - 1], vertices[i]).slice(0);
		if (!free(seg)) {
			const alt = rasterize(vertices[i - 1], vertices[i], true);
			if (free(alt)) seg = alt;
		}
		for (const c of seg.slice(1)) {
			cells.push(c);
			used.add(`${c.x},${c.y}`);
		}
	}
	return cells;
}

const key = (x: number, y: number): string => `${x},${y}`;

export function parsePicture(src: PictureSource, cols: number, rows: number): Picture {
	const fail = (msg: string): never => {
		throw new Error(`picture "${src.id}": ${msg}`);
	};
	const total = src.cycles.reduce((a, b) => a + b, 0);
	if (total !== src.strokes.length)
		fail(`cycles add up to ${total}, but there are ${src.strokes.length} strokes`);
	if (src.cycles.some((n) => n < 1)) fail('every cycle needs at least one stroke');

	const owner = new Map<string, number>();
	const strokes: Stroke[] = src.strokes.map((vertices, si) => {
		if (vertices.length === 0) fail(`stroke ${si} has no vertices`);
		const cells = strokeCells(vertices);
		const mine = new Set<string>();
		for (const c of cells) {
			if (c.x < 0 || c.y < 0 || c.x >= cols || c.y >= rows)
				fail(`stroke ${si} leaves the ${cols}×${rows} grid at ${c.x},${c.y}`);
			const k = key(c.x, c.y);
			if (mine.has(k)) fail(`stroke ${si} crosses itself at ${c.x},${c.y}`);
			const other = owner.get(k);
			if (other !== undefined) fail(`strokes ${other} and ${si} share the cell ${c.x},${c.y}`);
			mine.add(k);
		}
		for (const k of mine) owner.set(k, si);
		return { cells, joins: [null, null] };
	});

	const ownerAt = (x: number, y: number): number => owner.get(key(x, y)) ?? -1;
	const isEnd = (si: number, x: number, y: number): boolean => {
		const c = strokes[si].cells;
		const a = c[0];
		const b = c[c.length - 1];
		return (a.x === x && a.y === y) || (b.x === x && b.y === y);
	};

	// Концы, которые касаются другого штриха, дотягиваются до него в гладком рисунке:
	// по стороне — к любой клетке, по диагонали — только к концу. Почти замкнутый штрих
	// (концы рядом) замыкается сам на себя.
	strokes.forEach((s, si) => {
		if (s.cells.length < 2) return;
		for (const side of [0, 1] as const) {
			const e = side === 0 ? s.cells[0] : s.cells[s.cells.length - 1];
			const far = side === 0 ? s.cells[s.cells.length - 1] : s.cells[0];
			let join: Pt | null = null;
			let ortho = false;
			// Конец к концу встречаются посередине, к середине штриха — в центре его клетки.
			const toward = (x: number, y: number, mid: boolean): Pt =>
				mid ? { x: (e.x + x) / 2 + 0.5, y: (e.y + y) / 2 + 0.5 } : { x: x + 0.5, y: y + 0.5 };
			for (const [dx, dy] of AROUND) {
				const x = e.x + dx;
				const y = e.y + dy;
				const o = ownerAt(x, y);
				if (o < 0) continue;
				const diagonal = dx !== 0 && dy !== 0;
				if (o === si) {
					if (x === far.x && y === far.y && s.cells.length > 3 && !ortho) {
						join = toward(x, y, true);
						ortho = !diagonal;
					}
					continue;
				}
				if (strokes[o].cells.length < 2) continue;
				if (diagonal && !isEnd(o, x, y)) continue;
				const mid = isEnd(o, x, y);
				if (!diagonal && !ortho) {
					join = toward(x, y, mid);
					ortho = true;
				} else if (!join) join = toward(x, y, mid);
			}
			s.joins[side] = join;
		}
	});

	const cycles: number[][] = [];
	let next = 0;
	for (const n of src.cycles) {
		cycles.push(Array.from({ length: n }, (_, i) => next + i));
		next += n;
	}
	return { id: src.id, hue: src.hue, root: src.root, cols, rows, strokes, cycles };
}
