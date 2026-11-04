/** 0 вверх, 1 вправо, 2 вниз, 3 влево. */
export type Dir = 0 | 1 | 2 | 3;
export const DX: readonly number[] = [0, 1, 0, -1];
export const DY: readonly number[] = [-1, 0, 1, 0];
export const opposite = (d: Dir): Dir => ((d + 2) & 3) as Dir;

export type Bit = 0 | 1;
export type Op = 'or' | 'and' | 'xor';

export function evalOp(op: Op, bits: readonly Bit[]): boolean {
	if (bits.length === 0) return false;
	let ones = 0;
	for (const b of bits) ones += b;
	if (op === 'or') return ones > 0;
	if (op === 'and') return ones === bits.length;
	return ones % 2 === 1;
}

export interface Scarab {
	id: number;
	cell: number;
	prev: number;
	bit: Bit;
	/** Сколько мс осталось до следующего хода. */
	timer: number;
	/** Длительность текущего хода (для интерполяции). */
	moveMs: number;
	fleeing: boolean;
}

/** Альфа занимает блок 2×2; cell — левая верхняя клетка. */
export interface Alpha {
	id: number;
	cell: number;
	prev: number;
	op: Op;
	timer: number;
	moveMs: number;
	fleeing: boolean;
	/** Прыжок через кольцо после проваленного удара: проверок кольца нет. */
	escaping: boolean;
	/** Оцепенение: тело касается Альфы с половины сторон — она не двигается. */
	frozen: boolean;
}

export interface Rune {
	cell: number;
	life: number;
}

export interface SealPreview {
	op: Op;
	/** Сколько клеток вокруг Альфы занято телом. */
	touching: number;
	/** Сколько клеток вокруг Альфы вообще может занять тело (не стены). */
	total: number;
	/** Пройдёт ли удар, если замкнуть кольцо по текущим касаниям. */
	ok: boolean;
}

export type SimEvent =
	| { type: 'eat'; cell: number; bit: Bit }
	| {
			type: 'strike';
			ok: boolean;
			op: Op;
			alphaCell: number;
			/** Индексы сегментов кольца (от головы). */
			ring: number[];
			points: number;
			/** Клетки скарабеев, съеденных внутри кольца. */
			bonusCells: number[];
			/** Клетки хвоста, ушедшие при переваривании или провале. */
			lostCells: number[];
			escapeTo: number;
	  }
	| { type: 'not'; cell: number }
	| { type: 'death'; cell: number }
	| { type: 'act'; act: number }
	| { type: 'alphaSpawn'; cell: number; op: Op }
	| { type: 'runeSpawn'; cell: number }
	| { type: 'bite'; cell: number; alphaCell: number; lostCells: number[]; escapeTo: number }
	| { type: 'pillar'; cell: number };
