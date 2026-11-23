// Рисунок — набор штрихов на сетке. Каждый штрих — простой путь по соседним клеткам.

export interface Cell {
	x: number;
	y: number;
}

/** Точка в единицах клетки: центр клетки (x, y) — это (x + 0.5, y + 0.5). */
export interface Pt {
	x: number;
	y: number;
}

export interface Stroke {
	/** Клетки по порядку от одного конца к другому. */
	cells: Cell[];
	/**
	 * Куда дотягиваются концы в гладком рисунке: [для начала, для конца], в единицах клетки.
	 * Конец к концу — середина стыка, конец к середине чужого штриха — центр его клетки.
	 */
	joins: [Pt | null, Pt | null];
}

export type Vertex = readonly [number, number];

export interface PictureSource {
	id: string;
	/** Основной оттенок линий (HSL hue). */
	hue: number;
	/** Тональность эмбиента, полутоны от A3. */
	root: number;
	/**
	 * Штрихи как ломаные по вершинам-клеткам. Между вершинами строится лесенка из соседних
	 * клеток, ближайшая к прямой. Одна вершина — «звезда» (например, глаз).
	 */
	strokes: readonly (readonly Vertex[])[];
	/** Сколько штрихов в каждом заходе, по порядку. Сумма — число штрихов. */
	cycles: readonly number[];
}

export interface Picture {
	id: string;
	hue: number;
	root: number;
	cols: number;
	rows: number;
	strokes: Stroke[];
	/** Индексы штрихов по заходам. */
	cycles: number[][];
}
