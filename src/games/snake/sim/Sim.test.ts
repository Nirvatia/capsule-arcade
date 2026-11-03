import { describe, expect, it } from 'vitest';
import { SIM } from '../config';
import { Sim } from './Sim';
import { autopilot } from './autopilot';
import { evalOp, type Bit } from './types';

const COLS = 14;
const ROWS = 10;
const at = (c: number, r: number): number => r * COLS + c;

/** Пустая арена 14×10 без колонн, без самопоявления добычи. */
function arena(): Sim {
	const sim = new Sim({ seed: 1, cols: COLS, rows: ROWS, pillars: [], scarabs: 0, alphas: false });
	sim.debugClearPrey();
	return sim;
}

/** Клетки кольца вокруг блока 2×2 с левым верхом (c, r), по часовой от (c-1, r-1). */
function ringAround(c: number, r: number): number[] {
	const out: number[] = [];
	for (let x = c - 1; x <= c + 2; x++) out.push(at(x, r - 1));
	for (let y = r; y <= r + 2; y++) out.push(at(c + 2, y));
	for (let x = c + 1; x >= c - 1; x--) out.push(at(x, r + 2));
	for (let y = r + 1; y >= r; y--) out.push(at(c - 1, y));
	return out;
}

describe('evalOp', () => {
	it('OR, AND, XOR', () => {
		expect(evalOp('or', [0, 0, 1])).toBe(true);
		expect(evalOp('or', [0, 0])).toBe(false);
		expect(evalOp('and', [1, 1, 1])).toBe(true);
		expect(evalOp('and', [1, 0, 1])).toBe(false);
		expect(evalOp('xor', [1, 1, 1])).toBe(true);
		expect(evalOp('xor', [1, 1, 0])).toBe(false);
		expect(evalOp('or', [])).toBe(false);
	});
});

describe('movement', () => {
	it('стоит до первого нажатия, потом идёт с интервалом', () => {
		const sim = new Sim({ seed: 3, scarabs: 0, alphas: false });
		const head = sim.headCell;
		sim.update(1000);
		expect(sim.headCell).toBe(head);
		sim.press(1);
		sim.update(sim.interval + SIM.FIXED_MS);
		expect(sim.headCell).toBe(head + 1);
	});

	it('разворот на 180° игнорируется', () => {
		const sim = arena();
		sim.debugPlaceSnake([at(5, 5), at(4, 5), at(3, 5), at(2, 5)]);
		sim.debugSetDir(1);
		sim.press(3);
		sim.debugStep();
		expect(sim.headCell).toBe(at(6, 5));
	});

	it('смерть о стену', () => {
		const sim = arena();
		sim.debugPlaceSnake([at(12, 5), at(11, 5), at(10, 5), at(9, 5)]);
		sim.debugSetDir(1);
		sim.debugStep();
		expect(sim.alive).toBe(false);
		expect(sim.events.at(-1)?.type).toBe('death');
	});

	it('в клетку уходящего хвоста можно, в остальное тело нельзя', () => {
		const sim = arena();
		// квадрат 2×2: голова идёт в клетку хвоста
		sim.debugPlaceSnake([at(5, 5), at(5, 6), at(4, 6), at(4, 5)]);
		sim.debugSetDir(3);
		sim.debugStep();
		expect(sim.alive).toBe(true);

		const sim2 = arena();
		sim2.debugPlaceSnake([at(5, 5), at(5, 6), at(4, 6), at(4, 5), at(4, 4)]);
		sim2.debugSetDir(3);
		sim2.debugStep();
		expect(sim2.alive).toBe(false);
	});
});

describe('eating', () => {
	it('рост на 1 и новый бит сразу за головой', () => {
		const sim = arena();
		sim.debugPlaceSnake([at(5, 5), at(4, 5), at(3, 5), at(2, 5)], [0, 1, 0, 1]);
		sim.debugAddScarab(at(6, 5), 0);
		sim.debugSetDir(1);
		sim.debugStep();
		expect(sim.length).toBe(5);
		expect(sim.bits).toEqual([0, 0, 1, 0, 1]);
		expect(sim.scarabs.length).toBe(0);
		expect(sim.score).toBe(10);
	});

	it('биты едут вместе с телом при обычном шаге', () => {
		const sim = arena();
		sim.debugPlaceSnake([at(5, 5), at(4, 5), at(3, 5)], [0, 1, 0]);
		sim.debugSetDir(1);
		sim.debugStep();
		expect(sim.bits).toEqual([0, 1, 0]);
		expect(sim.cellAt(1)).toBe(at(5, 5));
	});
});

describe('ring', () => {
	/**
	 * Змея лежит по кольцу вокруг Альфы (5,4), голова в (4,4) смотрит вверх,
	 * хвост выходит за кольцо в (5,2), поэтому шаг вверх замыкает кольцо.
	 * После шага сегменты, касающиеся Альфы: индексы 1,2,4,5,7,8,10,11.
	 * Угловые 3,6,9 Альфу не касаются и в кольцо не входят.
	 */
	function nearlyClosed(ones: number[], op: 'or' | 'and' | 'xor'): Sim {
		const sim = arena();
		const ring = ringAround(5, 4);
		const body = [...ring.slice(1).reverse(), at(5, 2)];
		const bits: Bit[] = body.map(() => 0);
		for (const i of ones) bits[i] = 1;
		sim.debugPlaceSnake(body, bits);
		sim.debugPlaceAlpha(at(5, 4), op);
		sim.debugSetDir(0);
		return sim;
	}
	const strikeOf = (sim: Sim) => sim.events.find((e) => e.type === 'strike');

	it('успех OR: Альфа убита, очки, серия', () => {
		const sim = nearlyClosed([2], 'or');
		sim.debugStep();
		const st = strikeOf(sim);
		expect(st && st.type === 'strike' && st.ok).toBe(true);
		expect(st && st.type === 'strike' && st.ring).toEqual([1, 2, 4, 5, 7, 8, 10, 11]);
		expect(sim.alpha).toBeNull();
		expect(sim.kills).toBe(1);
		expect(sim.streak).toBe(1);
		expect(sim.score).toBeGreaterThan(0);
	});

	it('единица только в углу не считается', () => {
		const sim = nearlyClosed([3, 6, 9], 'or');
		sim.debugStep();
		const st = strikeOf(sim);
		expect(st && st.type === 'strike' && st.ok).toBe(false);
	});

	it('переваривание: длина = кольцо + DIGEST_EXTRA, если змея длиннее', () => {
		const sim = arena();
		const ring = ringAround(5, 4);
		const tailOut = [at(5, 2), at(6, 2), at(7, 2), at(8, 2), at(9, 2), at(10, 2)];
		const body = [...ring.slice(1).reverse(), ...tailOut];
		const bits: Bit[] = body.map(() => 1);
		sim.debugPlaceSnake(body, bits);
		sim.debugPlaceAlpha(at(5, 4), 'and');
		sim.debugSetDir(0);
		sim.debugStep();
		const st = strikeOf(sim);
		expect(st && st.type === 'strike' && st.ok).toBe(true);
		expect(sim.length).toBe(8 + SIM.DIGEST_EXTRA);
		expect(st && st.type === 'strike' && st.lostCells.length).toBeGreaterThan(0);
	});

	it('провал AND: хвост теряет 2 сегмента, Альфа сбегает, серия сброшена', () => {
		const sim = nearlyClosed([1, 2, 5, 7, 8, 10, 11], 'and');
		sim.streak = 3;
		const len = sim.length;
		sim.debugStep();
		const st = strikeOf(sim);
		expect(st && st.type === 'strike' && !st.ok).toBe(true);
		expect(sim.length).toBe(len - SIM.FAIL_TAIL_LOSS);
		expect(sim.streak).toBe(0);
		expect(sim.alpha === null || sim.alpha.escaping).toBe(true);
	});

	it('XOR смотрит на чётность единиц в кольце', () => {
		const simOk = nearlyClosed([1, 2, 4], 'xor');
		simOk.debugStep();
		const a = strikeOf(simOk);
		expect(a && a.type === 'strike' && a.ok).toBe(true);

		const simBad = nearlyClosed([1, 2], 'xor');
		simBad.debugStep();
		const b = strikeOf(simBad);
		expect(b && b.type === 'strike' && b.ok).toBe(false);
	});

	it('большая область не считается кольцом', () => {
		const sim = arena();
		const cells: number[] = [];
		for (let r = 1; r <= 7; r++) cells.push(at(7, r));
		sim.debugPlaceSnake(cells.reverse());
		sim.debugPlaceAlpha(at(2, 3), 'or');
		sim.debugSetDir(2);
		sim.debugStep();
		expect(sim.events.some((e) => e.type === 'strike')).toBe(false);
	});

	it('preview показывает касания и результат', () => {
		const sim = nearlyClosed([1], 'or');
		const p = sim.preview();
		expect(p).not.toBeNull();
		expect(p!.total).toBe(8);
		expect(p!.touching).toBe(8);
		expect(p!.ok).toBe(true);
	});

	it('после трёх убийств наступает следующий акт и растёт скорость', () => {
		let kills = 0;
		let last: Sim | null = null;
		const interval = nearlyClosed([2], 'or').interval;
		for (let k = 0; k < SIM.KILLS_PER_ACT; k++) {
			const s = nearlyClosed([2], 'or');
			s.kills = kills;
			s.debugStep();
			kills = s.kills;
			last = s;
		}
		expect(last!.act).toBe(2);
		expect(last!.interval).toBeLessThan(interval);
		expect(last!.events.some((e) => e.type === 'act')).toBe(true);
	});
});

describe('rune NOT', () => {
	it('инвертирует все щитки', () => {
		const sim = arena();
		sim.debugPlaceSnake([at(5, 5), at(4, 5), at(3, 5)], [0, 1, 0]);
		sim.rune = { cell: at(6, 5), life: 1e9 };
		sim.debugSetDir(1);
		sim.debugStep();
		expect(sim.bits).toEqual([0, 0, 1]);
		expect(sim.rune).toBeNull();
		expect(sim.events.some((e) => e.type === 'not')).toBe(true);
	});
});

describe('determinism and demo', () => {
	it('одинаковый seed и ввод → одинаковый результат', () => {
		const run = (): string => {
			const sim = new Sim({ seed: 42 });
			sim.press(1);
			for (let i = 0; i < 200; i++) {
				if (i % 17 === 0) sim.press(((i / 17) % 4) as 0 | 1 | 2 | 3);
				sim.update(50);
			}
			return JSON.stringify([sim.score, sim.length, sim.headCell, sim.alive, sim.scarabs.map((s) => s.cell)]);
		};
		expect(run()).toBe(run());
	});

	it('автопилот живёт и ест', () => {
		const sim = new Sim({ seed: 9, pilot: autopilot });
		for (let i = 0; i < 600 && sim.alive; i++) sim.update(50);
		expect(sim.stats.maxLen).toBeGreaterThan(SIM.START_LEN);
	});
});
