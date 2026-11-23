// Полотно: змейка идёт по сетке клетка за клеткой и обводит штрихи.
// Чистая логика без DOM: время подаётся снаружи, события копятся в `events`.

import { POND } from '../config';
import type { Cell } from '../pictures/types';

export type Dir = 0 | 1 | 2 | 3;
/** Вверх, вправо, вниз, влево. */
export const DIRS: readonly (readonly [number, number])[] = [
	[0, -1],
	[1, 0],
	[0, 1],
	[-1, 0]
];

export const opposite = (d: Dir): Dir => ((d + 2) % 4) as Dir;

/** Клетка тела. `w` — в эту клетку змейка пришла через край поля. */
export interface BodyCell extends Cell {
	w: boolean;
}

export interface PondStroke {
	/** Индекс штриха в рисунке. */
	id: number;
	cells: readonly Cell[];
	lit: boolean;
	/** Сколько клеток подряд пройдено и с какого конца. */
	n: number;
	rev: boolean;
}

export type PondEvent =
	| { k: 'trace'; stroke: number; n: number; len: number }
	| { k: 'lost'; stroke: number }
	| { k: 'lit'; stroke: number }
	| { k: 'clear' }
	| { k: 'wrap'; from: Cell; to: Cell; dir: Dir };

export interface PondOptions {
	cols: number;
	rows: number;
	strokes: { id: number; cells: readonly Cell[] }[];
	start: Cell;
	dir: Dir;
	len?: number;
}

const same = (a: Cell, b: Cell): boolean => a.x === b.x && a.y === b.y;

export class Pond {
	readonly cols: number;
	readonly rows: number;
	readonly strokes: PondStroke[];
	/** Клетки тела от хвоста к голове. Голова — последняя. */
	readonly body: BodyCell[];
	/** Куда идёт текущий шаг. */
	next: BodyCell;
	dir: Dir;
	/** Доля пройденного шага, 0..1. */
	t = 0;
	speed: number = POND.CRUISE;
	readonly queue: Dir[] = [];
	/** Зажатые направления (для лесенки). */
	held: Dir[] = [];
	readonly events: PondEvent[] = [];
	cleared = false;
	/** Сколько шагов сделано: вид использует для анимаций. */
	steps = 0;
	/** Шаг был перестроен поздним поворотом. */
	private lateUsed = false;
	private readonly hist: BodyCell[] = [];

	constructor(o: PondOptions) {
		this.cols = o.cols;
		this.rows = o.rows;
		this.strokes = o.strokes.map((s) => ({
			id: s.id,
			cells: s.cells,
			lit: false,
			n: 0,
			rev: false
		}));
		this.dir = o.dir;
		const len = o.len ?? POND.LEN;
		this.body = Array.from({ length: len }, () => ({ x: o.start.x, y: o.start.y, w: false }));
		this.hist.push({ ...this.body[0] });
		this.next = this.body[0];
		this.beginStep();
	}

	get head(): BodyCell {
		return this.body[this.body.length - 1];
	}

	/** Нажатие направления. Поворот ставится в очередь или, если это помогает обводке, применяется к текущему шагу. */
	press(d: Dir): void {
		const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
		if (d === last || d === opposite(last)) return;
		if (!this.queue.length && this.tryLateTurn(d)) return;
		if (this.queue.length >= POND.QUEUE) this.queue[this.queue.length - 1] = d;
		else this.queue.push(d);
	}

	setHeld(dirs: Dir[]): void {
		this.held = dirs;
	}

	update(dt: number): void {
		const target = this.near() ? POND.TRACE : POND.CRUISE;
		this.speed += (target - this.speed) * (1 - Math.exp(-POND.EASE * dt));
		this.t += dt * this.speed;
		let guard = 0;
		while (this.t >= 1 && guard++ < 4) {
			this.t -= 1;
			this.finishStep();
			this.beginStep();
		}
	}

	/** Клетка, куда приведёт направление d из клетки c (с переходом через край). */
	step(c: Cell, d: Dir): BodyCell {
		let x = c.x + DIRS[d][0];
		let y = c.y + DIRS[d][1];
		const w = x < 0 || y < 0 || x >= this.cols || y >= this.rows;
		x = (x + this.cols) % this.cols;
		y = (y + this.rows) % this.rows;
		return { x, y, w };
	}

	/** Следующая клетка обводки: продолжение начатого штриха или конец ещё не начатого. */
	private wanted(c: Cell): (s: PondStroke, cell: Cell) => boolean {
		return (s, cell) => {
			if (s.lit) return false;
			if (s.n > 0) {
				const seq = s.rev ? [...s.cells].reverse() : s.cells;
				const cur = seq[s.n - 1];
				return same(cur, c) && s.n < seq.length && same(seq[s.n], cell);
			}
			return same(s.cells[0], cell) || same(s.cells[s.cells.length - 1], cell);
		};
	}

	private helps(from: Cell, d: Dir): boolean {
		const cell = this.step(from, d);
		if (cell.w) return false;
		const ok = this.wanted(from);
		return this.strokes.some((s) => ok(s, cell));
	}

	private tryLateTurn(d: Dir): boolean {
		if (this.lateUsed || this.t > POND.LATE_TURN) return false;
		const head = this.head;
		// Текущий шаг уже ведёт по штриху — не ломаем его.
		if (this.helps(head, this.dir)) return false;
		if (!this.helps(head, d)) return false;
		this.dir = d;
		this.next = this.step(head, d);
		this.lateUsed = true;
		return true;
	}

	private beginStep(): void {
		this.lateUsed = false;
		while (this.queue.length) {
			const d = this.queue.shift() as Dir;
			if (d !== this.dir && d !== opposite(this.dir)) {
				this.dir = d;
				break;
			}
		}
		this.applyHeld();
		this.next = this.step(this.head, this.dir);
		if (this.next.w)
			this.events.push({
				k: 'wrap',
				from: { x: this.head.x, y: this.head.y },
				to: { x: this.next.x, y: this.next.y },
				dir: this.dir
			});
	}

	/** Две зажатые перпендикулярные стрелки — лесенка, подстроенная под штрих впереди. */
	private applyHeld(): void {
		if (this.queue.length || this.held.length !== 2) return;
		const [a, b] = this.held;
		if (a === b || a === opposite(b)) return;
		const head = this.head;
		const options = [a, b].filter((d) => d !== opposite(this.dir));
		const guided = options.find((d) => this.helps(head, d));
		if (guided !== undefined) {
			this.dir = guided;
			return;
		}
		// Если текущий шаг продолжает обводку по прямой — не сворачиваем.
		if (this.helps(head, this.dir) && options.includes(this.dir)) return;
		if (options.includes(this.dir)) this.dir = options.find((d) => d !== this.dir) ?? this.dir;
		else if (options.length) this.dir = options[0];
	}

	private finishStep(): void {
		this.body.push(this.next);
		this.body.shift();
		this.hist.push({ ...this.next });
		if (this.hist.length > 64) this.hist.shift();
		this.steps++;
		this.arrive();
	}

	private arrive(): void {
		for (const s of this.strokes) {
			if (s.lit) continue;
			const was = s.n;
			const p = this.progressOf(s);
			s.n = p.n;
			s.rev = p.rev;
			if (s.n === s.cells.length) {
				s.lit = true;
				this.events.push({ k: 'lit', stroke: s.id });
			} else if (s.n > was) {
				this.events.push({ k: 'trace', stroke: s.id, n: s.n, len: s.cells.length });
			} else if (was > 1 && s.n === 0) {
				this.events.push({ k: 'lost', stroke: s.id });
			}
		}
		if (!this.cleared && this.strokes.every((s) => s.lit)) {
			this.cleared = true;
			this.events.push({ k: 'clear' });
		}
	}

	/** Самый длинный хвост истории, совпадающий с началом штриха (с любого конца). */
	private progressOf(s: PondStroke): { n: number; rev: boolean } {
		const h = this.hist;
		let best = 0;
		let bestRev = false;
		for (const rev of [false, true]) {
			const seq = rev ? [...s.cells].reverse() : s.cells;
			for (let m = Math.min(seq.length, h.length); m >= 1; m--) {
				let ok = true;
				for (let i = 0; i < m; i++) {
					const a = h[h.length - m + i];
					if (!same(a, seq[i]) || (i > 0 && a.w)) {
						ok = false;
						break;
					}
				}
				if (ok) {
					if (m > best) {
						best = m;
						bestRev = rev;
					}
					break;
				}
			}
		}
		return { n: best, rev: bestRev };
	}

	/** Голова рядом с необведённым штрихом или ведёт обводку. */
	private near(): boolean {
		const c = this.next;
		for (const s of this.strokes) {
			if (s.lit) continue;
			if (s.n > 0) return true;
			for (const p of s.cells)
				if (Math.abs(p.x - c.x) <= 1 && Math.abs(p.y - c.y) <= 1) return true;
		}
		return false;
	}

	/** Следующая клетка, которую ждёт начатый штрих (для подсказки на виде). */
	expected(): { stroke: number; cell: Cell; turn: Dir | null }[] {
		const out: { stroke: number; cell: Cell; turn: Dir | null }[] = [];
		for (const s of this.strokes) {
			if (s.lit || s.n === 0) continue;
			const seq = s.rev ? [...s.cells].reverse() : s.cells;
			const cur = seq[s.n - 1];
			const nxt = seq[s.n];
			const d = DIRS.findIndex(([dx, dy]) => cur.x + dx === nxt.x && cur.y + dy === nxt.y);
			out.push({ stroke: s.id, cell: nxt, turn: d >= 0 ? (d as Dir) : null });
		}
		return out;
	}
}

/** Клетка входа на Полотно: подальше от штрихов, направление — к центру. */
export function entryPoint(
	cols: number,
	rows: number,
	strokes: readonly { cells: readonly Cell[] }[],
	rnd: () => number
): { cell: Cell; dir: Dir } {
	let best: Cell = { x: 1, y: 1 };
	let bestScore = -1;
	for (let i = 0; i < 300; i++) {
		const c = { x: 1 + Math.floor(rnd() * (cols - 2)), y: 1 + Math.floor(rnd() * (rows - 2)) };
		let d = Infinity;
		for (const s of strokes)
			for (const p of s.cells) d = Math.min(d, Math.abs(p.x - c.x) + Math.abs(p.y - c.y));
		const score = Math.min(d, 5) + rnd() * 0.5;
		if (score > bestScore) {
			bestScore = score;
			best = c;
		}
	}
	const dx = cols / 2 - best.x;
	const dy = rows / 2 - best.y;
	const dir: Dir = Math.abs(dx) > Math.abs(dy) * 1.4 ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0;
	return { cell: best, dir };
}
