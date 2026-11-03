import { COLS, PILLARS, ROWS, SCORE, SIM, stepInterval } from '../config';
import { Rng } from './rng';
import {
	DX,
	DY,
	evalOp,
	opposite,
	type Alpha,
	type Bit,
	type Dir,
	type Op,
	type Rune,
	type Scarab,
	type SealPreview,
	type SimEvent
} from './types';

export interface SimOptions {
	seed: number;
	cols?: number;
	rows?: number;
	pillars?: readonly (readonly [number, number])[];
	/** Автопилот для демо на титульном экране. Вызывается перед каждым шагом. */
	pilot?: (sim: Sim) => Dir | null;
	scarabs?: number;
	alphas?: boolean;
}

/**
 * Детерминированная симуляция Удава. Ни DOM, ни времени кадра:
 * снаружи приходят только update(dt) и press(dir), наружу — состояние и events.
 *
 * Тело хранится в кольцевом буфере клеток (голова → хвост): шаг без роста O(1).
 * Биты привязаны к расстоянию от головы (bits[i] — щиток i-го сегмента),
 * поэтому узор «едет» вместе с телом. bits[0] — голова, щитка у неё нет.
 */
export class Sim {
	readonly cols: number;
	readonly rows: number;
	readonly size: number;
	readonly walls: Uint8Array;
	/** Сколько сегментов змеи стоит в клетке (0/1, кратко 2 при проходе хвоста). */
	readonly occ: Uint8Array;

	private readonly buf: Int16Array;
	private readonly mask: number;
	private headIdx = 0;
	length = 0;
	bits: Bit[] = [];
	/** Клетка, которую хвост освободил на последнем шаге (для плавной интерполяции). */
	prevTail = -1;

	dir: Dir = 1;
	private queue: Dir[] = [];
	alive = true;
	/** Змея стоит, пока игрок не нажал направление. */
	started = false;

	scarabs: Scarab[] = [];
	alpha: Alpha | null = null;
	rune: Rune | null = null;

	act = 1;
	kills = 0;
	streak = 0;
	score = 0;
	readonly stats = { alphas: 0, maxLen: 0 };

	interval: number;
	/** Время с последнего шага змеи, мс. snakeTimer / interval — фаза интерполяции. */
	snakeTimer = 0;
	time = 0;
	events: SimEvent[] = [];

	private acc = 0;
	private readonly rng: Rng;
	private nextId = 1;
	private alphaDelay: number;
	private runeTimer = 0;
	private readonly pilot: ((sim: Sim) => Dir | null) | null;
	private readonly targetScarabs: number;
	private readonly alphasEnabled: boolean;

	// Переиспользуемые буферы, чтобы не плодить мусор на каждом шаге.
	private readonly seen: Uint8Array;
	private readonly bfs: Int16Array;
	private readonly idxOf: Int16Array;

	constructor(opts: SimOptions) {
		this.cols = opts.cols ?? COLS;
		this.rows = opts.rows ?? ROWS;
		this.size = this.cols * this.rows;
		this.walls = new Uint8Array(this.size);
		this.occ = new Uint8Array(this.size);
		this.seen = new Uint8Array(this.size);
		this.bfs = new Int16Array(this.size);
		this.idxOf = new Int16Array(this.size);
		let cap = 1;
		while (cap < this.size + 1) cap <<= 1;
		this.buf = new Int16Array(cap);
		this.mask = cap - 1;

		this.rng = new Rng(opts.seed);
		this.pilot = opts.pilot ?? null;
		this.targetScarabs = opts.scarabs ?? SIM.SCARABS;
		this.alphasEnabled = opts.alphas ?? true;
		this.interval = stepInterval(1);
		this.alphaDelay = SIM.ALPHA_SPAWN_DELAY_MS;

		for (let c = 0; c < this.cols; c++) {
			this.walls[c] = 1;
			this.walls[(this.rows - 1) * this.cols + c] = 1;
		}
		for (let r = 0; r < this.rows; r++) {
			this.walls[r * this.cols] = 1;
			this.walls[r * this.cols + this.cols - 1] = 1;
		}
		for (const [c, r] of opts.pillars ?? PILLARS) this.walls[r * this.cols + c] = 1;

		const hc = Math.min(SIM.START_COL, this.cols - 2);
		const hr = Math.min(SIM.START_ROW, this.rows - 2);
		const len = Math.min(SIM.START_LEN, hc);
		for (let i = len - 1; i >= 0; i--) this.pushHead(hr * this.cols + hc - i);
		this.bits = [0];
		for (let i = 1; i < len; i++) this.bits.push(i % 2 === 1 ? 1 : 0);
		this.prevTail = this.tailCell;
		this.stats.maxLen = this.length;

		if (this.pilot) this.started = true;
		for (let i = 0; i < this.targetScarabs; i++) this.spawnScarab();
	}

	// ------------------------------------------------------------------ тело

	cellAt(i: number): number {
		return this.buf[(this.headIdx + i) & this.mask];
	}

	get headCell(): number {
		return this.buf[this.headIdx];
	}

	get tailCell(): number {
		return this.cellAt(this.length - 1);
	}

	private pushHead(cell: number): void {
		this.headIdx = (this.headIdx - 1) & this.mask;
		this.buf[this.headIdx] = cell;
		this.length++;
		this.occ[cell]++;
	}

	private popTail(): number {
		const cell = this.cellAt(this.length - 1);
		this.length--;
		this.occ[cell]--;
		return cell;
	}

	private trimTo(len: number): number[] {
		const removed: number[] = [];
		while (this.length > len) removed.push(this.popTail());
		this.bits.length = this.length;
		if (removed.length > 0) this.prevTail = this.tailCell;
		return removed;
	}

	// ------------------------------------------------------------------ ввод и время

	press(d: Dir): void {
		if (!this.alive) return;
		this.started = true;
		const last = this.queue.length > 0 ? this.queue[this.queue.length - 1] : this.dir;
		if (d === last || d === opposite(last)) return;
		if (this.queue.length < SIM.INPUT_QUEUE) this.queue.push(d);
	}

	update(dt: number): void {
		if (!this.alive) return;
		this.acc += Math.min(dt, 250);
		while (this.acc >= SIM.FIXED_MS) {
			this.acc -= SIM.FIXED_MS;
			this.tick(SIM.FIXED_MS);
			if (!this.alive) return;
		}
	}

	/** Фаза между шагами змеи 0..1. */
	get phase(): number {
		return this.started && this.alive ? Math.min(1, this.snakeTimer / this.interval) : 1;
	}

	private tick(dt: number): void {
		this.time += dt;
		if (this.started) {
			this.snakeTimer += dt;
			if (this.snakeTimer >= this.interval) {
				this.snakeTimer -= this.interval;
				this.stepSnake();
				if (!this.alive) return;
			}
		}
		for (const s of this.scarabs) this.tickScarab(s, dt);
		if (this.alpha) this.tickAlpha(this.alpha, dt);
		this.tickSpawns(dt);
	}

	// ------------------------------------------------------------------ шаг змеи

	private stepSnake(): void {
		if (this.pilot) {
			const d = this.pilot(this);
			if (d !== null) this.press(d);
		}
		const q = this.queue.shift();
		if (q !== undefined && q !== opposite(this.dir)) this.dir = q;

		const h = this.headCell;
		const nc = (h % this.cols) + DX[this.dir];
		const nr = Math.floor(h / this.cols) + DY[this.dir];
		if (nc < 0 || nr < 0 || nc >= this.cols || nr >= this.rows) return this.die(h);
		const n = nr * this.cols + nc;
		if (this.walls[n] || this.inAlpha(n)) return this.die(n);

		const si = this.scarabAt(n);
		const grow = si >= 0;
		if (this.occ[n] && !(n === this.tailCell && !grow)) return this.die(n);

		if (grow) this.prevTail = this.tailCell;
		else this.prevTail = this.popTail();
		this.pushHead(n);

		if (grow) {
			const s = this.scarabs[si];
			this.scarabs.splice(si, 1);
			this.bits.splice(1, 0, s.bit);
			this.score += SCORE.EAT;
			this.events.push({ type: 'eat', cell: n, bit: s.bit });
		}
		if (this.rune && this.rune.cell === n) {
			for (let i = 1; i < this.bits.length; i++) this.bits[i] = (this.bits[i] ^ 1) as Bit;
			this.rune = null;
			this.runeTimer = 0;
			this.events.push({ type: 'not', cell: n });
		}
		if (this.length > this.stats.maxLen) this.stats.maxLen = this.length;
		this.checkRing();
	}

	private die(cell: number): void {
		this.alive = false;
		this.events.push({ type: 'death', cell });
	}

	// ------------------------------------------------------------------ кольцо

	/**
	 * После шага ищем область вокруг Альфы, отрезанную телом (и стенами).
	 * Если она не больше MAX_ENCLOSE — кольцо замкнуто, проверяем печать
	 * по битам сегментов, которые касаются области по стороне клетки.
	 */
	private checkRing(): void {
		const a = this.alpha;
		if (!a || a.escaping) return;

		const region = this.floodFrom(a.cell, SIM.MAX_ENCLOSE);
		if (region === null) return;

		const ring = this.ringIndices(region);
		if (ring.length === 0) return;
		const ringBits = ring.map((i) => this.bits[i]);
		const ok = evalOp(a.op, ringBits);

		if (ok) {
			const inRegion = new Set(region);
			const bonusCells: number[] = [];
			this.scarabs = this.scarabs.filter((s) => {
				if (!inRegion.has(s.cell)) return true;
				bonusCells.push(s.cell);
				return false;
			});
			this.streak++;
			const mult = Math.min(this.streak, SCORE.MAX_MULTIPLIER);
			const points =
				(SCORE.KILL_BASE + SCORE.KILL_PER_SEGMENT * ring.length) * mult +
				SCORE.BONUS_PREY * bonusCells.length;
			this.score += points;
			this.kills++;
			this.stats.alphas++;
			const lostCells = this.trimTo(
				Math.max(SIM.MIN_LEN, Math.min(this.length, ring.length + SIM.DIGEST_EXTRA))
			);
			this.events.push({
				type: 'strike',
				ok: true,
				op: a.op,
				alphaCell: a.cell,
				ring,
				points,
				bonusCells,
				lostCells,
				escapeTo: -1
			});
			this.alpha = null;
			this.alphaDelay = SIM.ALPHA_SPAWN_DELAY_MS;
			if (this.kills >= SIM.KILLS_PER_ACT) {
				this.act++;
				this.kills = 0;
				this.interval = stepInterval(this.act);
				this.events.push({ type: 'act', act: this.act });
			}
			return;
		}

		this.streak = 0;
		const lostCells = this.trimTo(Math.max(SIM.MIN_LEN, this.length - SIM.FAIL_TAIL_LOSS));
		const from = a.cell;
		const to = this.findAlphaSpot();
		if (to >= 0) {
			a.prev = a.cell;
			a.cell = to;
			a.escaping = true;
			a.fleeing = false;
			a.moveMs = SIM.ALPHA_ESCAPE_MS;
			a.timer = SIM.ALPHA_ESCAPE_MS;
		} else {
			this.alpha = null;
			this.alphaDelay = SIM.ALPHA_SPAWN_DELAY_MS;
		}
		this.events.push({
			type: 'strike',
			ok: false,
			op: a.op,
			alphaCell: from,
			ring,
			points: 0,
			bonusCells: [],
			lostCells,
			escapeTo: to
		});
	}

	/** Свободные клетки (не стена, не тело), связные с start. null — если область больше limit. */
	private floodFrom(start: number, limit: number): number[] | null {
		this.seen.fill(0);
		let head = 0;
		let tail = 0;
		this.bfs[tail++] = start;
		this.seen[start] = 1;
		while (head < tail) {
			const c = this.bfs[head++];
			if (tail > limit) return null;
			const col = c % this.cols;
			for (let d = 0; d < 4; d++) {
				const nc = col + DX[d];
				const n = c + DX[d] + DY[d] * this.cols;
				if (nc < 0 || nc >= this.cols || n < 0 || n >= this.size) continue;
				if (this.seen[n] || this.walls[n] || this.occ[n]) continue;
				this.seen[n] = 1;
				this.bfs[tail++] = n;
				if (tail > limit) return null;
			}
		}
		return Array.from(this.bfs.subarray(0, tail));
	}

	/** Индексы сегментов (без головы), касающихся клеток области по стороне. */
	private ringIndices(cells: readonly number[]): number[] {
		this.idxOf.fill(-1);
		for (let i = 0; i < this.length; i++) this.idxOf[this.cellAt(i)] = i;
		const found = new Set<number>();
		for (const c of cells) {
			const col = c % this.cols;
			for (let d = 0; d < 4; d++) {
				const nc = col + DX[d];
				const n = c + DX[d] + DY[d] * this.cols;
				if (nc < 0 || nc >= this.cols || n < 0 || n >= this.size) continue;
				const i = this.idxOf[n];
				if (i >= 1) found.add(i);
			}
		}
		return Array.from(found).sort((x, y) => x - y);
	}

	/** Живая подсказка для печати: что будет, если замкнуть кольцо сейчас. */
	preview(): SealPreview | null {
		const a = this.alpha;
		if (!a) return null;
		const around = this.alphaPerimeter(a.cell);
		this.idxOf.fill(-1);
		for (let i = 0; i < this.length; i++) this.idxOf[this.cellAt(i)] = i;
		let total = 0;
		let touching = 0;
		const bits: Bit[] = [];
		for (const n of around) {
			if (this.walls[n]) continue;
			total++;
			const i = this.idxOf[n];
			if (i >= 0) touching++;
			if (i >= 1) bits.push(this.bits[i]);
		}
		return { op: a.op, touching, total, ok: evalOp(a.op, bits) };
	}

	private alphaPerimeter(cell: number): number[] {
		const c = cell % this.cols;
		const r = Math.floor(cell / this.cols);
		const out: number[] = [];
		const add = (cc: number, rr: number): void => {
			if (cc >= 0 && rr >= 0 && cc < this.cols && rr < this.rows) out.push(rr * this.cols + cc);
		};
		add(c, r - 1);
		add(c + 1, r - 1);
		add(c + 2, r);
		add(c + 2, r + 1);
		add(c + 1, r + 2);
		add(c, r + 2);
		add(c - 1, r + 1);
		add(c - 1, r);
		return out;
	}

	// ------------------------------------------------------------------ добыча

	private scarabAt(cell: number): number {
		for (let i = 0; i < this.scarabs.length; i++) if (this.scarabs[i].cell === cell) return i;
		return -1;
	}

	inAlpha(cell: number): boolean {
		const a = this.alpha;
		if (!a || a.escaping) return false;
		const c = cell % this.cols;
		const r = Math.floor(cell / this.cols);
		const ac = a.cell % this.cols;
		const ar = Math.floor(a.cell / this.cols);
		return c >= ac && c <= ac + 1 && r >= ar && r <= ar + 1;
	}

	private freeCell(cell: number): boolean {
		return (
			!this.walls[cell] &&
			!this.occ[cell] &&
			this.scarabAt(cell) < 0 &&
			!this.inAlpha(cell) &&
			!(this.rune !== null && this.rune.cell === cell)
		);
	}

	private distToHead(cell: number): number {
		const h = this.headCell;
		return (
			Math.abs((cell % this.cols) - (h % this.cols)) +
			Math.abs(Math.floor(cell / this.cols) - Math.floor(h / this.cols))
		);
	}

	private neighbours(cell: number): number[] {
		const c = cell % this.cols;
		const out: number[] = [];
		for (let d = 0; d < 4; d++) {
			const nc = c + DX[d];
			const n = cell + DX[d] + DY[d] * this.cols;
			if (nc < 0 || nc >= this.cols || n < 0 || n >= this.size) continue;
			out.push(n);
		}
		return out;
	}

	private tickScarab(s: Scarab, dt: number): void {
		s.timer -= dt;
		if (s.timer > 0) return;
		const flee = this.started && this.distToHead(s.cell) <= SIM.SCARAB_FLEE_DIST;
		const options = this.neighbours(s.cell).filter((n) => this.freeCell(n));
		let next = -1;
		if (options.length > 0) {
			if (flee) {
				let best = -1;
				for (const n of options) {
					const score = this.distToHead(n) + this.rng.next() * 0.5;
					if (score > best) {
						best = score;
						next = n;
					}
				}
			} else if (this.rng.next() >= SIM.SCARAB_IDLE_CHANCE) {
				next = options[this.rng.int(options.length)];
			}
		}
		s.prev = s.cell;
		if (next >= 0) s.cell = next;
		s.fleeing = flee;
		s.moveMs = flee
			? SIM.SCARAB_FLEE_MS
			: this.rng.range(SIM.SCARAB_MOVE_MIN_MS, SIM.SCARAB_MOVE_MAX_MS);
		s.timer = s.moveMs;
	}

	private alphaFits(cell: number, self: Alpha | null): boolean {
		const c = cell % this.cols;
		const r = Math.floor(cell / this.cols);
		if (c < 0 || r < 0 || c + 1 >= this.cols || r + 1 >= this.rows) return false;
		const saved = this.alpha;
		if (self) this.alpha = null;
		const ok =
			this.freeCell(cell) &&
			this.freeCell(cell + 1) &&
			this.freeCell(cell + this.cols) &&
			this.freeCell(cell + this.cols + 1);
		this.alpha = saved;
		return ok;
	}

	private alphaDist(cell: number): number {
		let best = Infinity;
		for (const n of [cell, cell + 1, cell + this.cols, cell + this.cols + 1]) {
			best = Math.min(best, this.distToHead(n));
		}
		return best;
	}

	private tickAlpha(a: Alpha, dt: number): void {
		a.timer -= dt;
		if (a.timer > 0) return;
		if (a.escaping) {
			a.escaping = false;
			a.prev = a.cell;
			a.timer = a.moveMs = SIM.ALPHA_MOVE_MS;
			return;
		}
		const flee = this.started && this.alphaDist(a.cell) <= SIM.ALPHA_FLEE_DIST;
		const options: number[] = [];
		const c = a.cell % this.cols;
		for (let d = 0; d < 4; d++) {
			const nc = c + DX[d];
			const n = a.cell + DX[d] + DY[d] * this.cols;
			if (nc < 0 || nc + 1 >= this.cols || n < 0 || n >= this.size) continue;
			if (this.alphaFits(n, a)) options.push(n);
		}
		let next = -1;
		if (options.length > 0) {
			if (flee) {
				let best = -1;
				for (const n of options) {
					const score = this.alphaDist(n) + this.rng.next() * 0.5;
					if (score > best) {
						best = score;
						next = n;
					}
				}
			} else if (this.rng.next() >= 0.3) {
				next = options[this.rng.int(options.length)];
			}
		}
		a.prev = a.cell;
		if (next >= 0) a.cell = next;
		a.fleeing = flee;
		a.moveMs = flee ? SIM.ALPHA_FLEE_MS : SIM.ALPHA_MOVE_MS;
		a.timer = a.moveMs;
	}

	// ------------------------------------------------------------------ появление

	private tickSpawns(dt: number): void {
		if (this.scarabs.length < this.targetScarabs) this.spawnScarab();

		if (this.alphasEnabled && !this.alpha) {
			this.alphaDelay -= dt;
			if (this.alphaDelay <= 0) {
				if (!this.spawnAlpha()) this.alphaDelay = 500;
			}
		}

		if (this.act >= SIM.RUNE_FROM_ACT) {
			if (this.rune) {
				this.rune.life -= dt;
				if (this.rune.life <= 0) this.rune = null;
			} else {
				this.runeTimer += dt;
				if (this.runeTimer >= SIM.RUNE_EVERY_MS) {
					this.runeTimer = 0;
					const cell = this.randomFreeCell(SIM.SCARAB_SPAWN_MIN_DIST);
					if (cell >= 0) {
						this.rune = { cell, life: SIM.RUNE_LIFE_MS };
						this.events.push({ type: 'runeSpawn', cell });
					}
				}
			}
		}
	}

	private randomFreeCell(minDist: number): number {
		for (let attempt = 0; attempt < 80; attempt++) {
			const cell = this.rng.int(this.size);
			if (this.freeCell(cell) && this.distToHead(cell) >= minDist) return cell;
		}
		for (let cell = 0; cell < this.size; cell++) {
			if (this.freeCell(cell) && this.distToHead(cell) >= minDist) return cell;
		}
		return -1;
	}

	private currentOp(): Op | null {
		return this.alpha ? this.alpha.op : null;
	}

	private spawnScarab(): boolean {
		const cell = this.randomFreeCell(SIM.SCARAB_SPAWN_MIN_DIST);
		if (cell < 0) return false;
		const andBias = this.currentOp() === 'and' || (this.act === 2 && !this.alpha);
		const bit: Bit = this.rng.next() < (andBias ? SIM.AND_ONE_BIAS : 0.5) ? 1 : 0;
		const moveMs = this.rng.range(SIM.SCARAB_MOVE_MIN_MS, SIM.SCARAB_MOVE_MAX_MS);
		this.scarabs.push({
			id: this.nextId++,
			cell,
			prev: cell,
			bit,
			timer: moveMs,
			moveMs,
			fleeing: false
		});
		return true;
	}

	private opForAct(): Op {
		if (this.act === 1) return 'or';
		if (this.act === 2) return 'and';
		if (this.act === 3) return 'xor';
		const ops: Op[] = ['or', 'and', 'xor'];
		return ops[this.rng.int(ops.length)];
	}

	private findAlphaSpot(): number {
		for (let attempt = 0; attempt < 120; attempt++) {
			const c = 1 + this.rng.int(this.cols - 3);
			const r = 1 + this.rng.int(this.rows - 3);
			const cell = r * this.cols + c;
			if (this.alphaFits(cell, this.alpha) && this.alphaDist(cell) >= SIM.ALPHA_SPAWN_MIN_DIST) {
				return cell;
			}
		}
		return -1;
	}

	private spawnAlpha(): boolean {
		const cell = this.findAlphaSpot();
		if (cell < 0) return false;
		const op = this.opForAct();
		this.alpha = {
			id: this.nextId++,
			cell,
			prev: cell,
			op,
			timer: SIM.ALPHA_MOVE_MS,
			moveMs: SIM.ALPHA_MOVE_MS,
			fleeing: false,
			escaping: false
		};
		this.events.push({ type: 'alphaSpawn', cell, op });
		return true;
	}

	// ------------------------------------------------------------------ для тестов

	/** Ставит тело по списку клеток (голова первая) и биты. Только для тестов. */
	debugPlaceSnake(cells: readonly number[], bits?: readonly Bit[]): void {
		while (this.length > 0) this.popTail();
		for (let i = cells.length - 1; i >= 0; i--) this.pushHead(cells[i]);
		this.bits = bits ? [...bits] : cells.map(() => 0 as Bit);
		this.bits.length = this.length;
		this.prevTail = this.tailCell;
	}

	/** Ставит Альфу в клетку (левый верх) с печатью. Только для тестов. */
	debugPlaceAlpha(cell: number, op: Op): void {
		this.alpha = {
			id: this.nextId++,
			cell,
			prev: cell,
			op,
			timer: 1e9,
			moveMs: 1e9,
			fleeing: false,
			escaping: false
		};
	}

	debugClearPrey(): void {
		this.scarabs = [];
	}

	debugAddScarab(cell: number, bit: Bit): void {
		this.scarabs.push({
			id: this.nextId++,
			cell,
			prev: cell,
			bit,
			timer: 1e9,
			moveMs: 1e9,
			fleeing: false
		});
	}

	debugSetDir(d: Dir): void {
		this.dir = d;
		this.queue = [];
	}

	/** Один шаг змеи без учёта времени. Только для тестов. */
	debugStep(): void {
		this.started = true;
		this.stepSnake();
	}
}
