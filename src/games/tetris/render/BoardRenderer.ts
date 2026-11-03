import {
	CLEAR_MS,
	COLS,
	HIDDEN_ROWS,
	LOCK_DELAY_MS,
	ROWS,
	TOPOUT_MS,
	VISIBLE_ROWS
} from '../config';
import { dropDistance, fits, stackHeight } from '../core/board';
import { pieceCells } from '../core/pieces';
import {
	CONCRETE,
	Phase,
	SpinKind,
	type ClearResult,
	type GameState,
	type PieceType
} from '../core/types';
import type { CellPos, EventBus } from '../engine/EventBus';
import { colorOf, WELL } from '../theme/palette';
import { SpriteSheet } from './sprites';

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
	color: string;
}

interface Trail {
	col: number;
	from: number;
	to: number;
	color: string;
	life: number;
}

interface Flash {
	cells: CellPos[];
	life: number;
}

const TRAIL_MS = 240;
const FLASH_MS = 170;
const COLLAPSE_MS = 150;
const SWEEP_MS = 900;
const MAX_PARTICLES = 700;
const GRAVITY = 0.0028;

export class BoardRenderer {
	readonly canvas: HTMLCanvasElement;
	private readonly ctx: CanvasRenderingContext2D;
	private readonly sprites = new SpriteSheet();
	private background: HTMLCanvasElement | null = null;
	private cell = 0;
	private dpr = 1;
	private time = 0;
	private particles: Particle[] = [];
	private trails: Trail[] = [];
	private flashes: Flash[] = [];
	private shake = 0;
	private sweep = -1;
	private pendingBurst: ClearResult | null = null;
	private lastClear: ClearResult | null = null;
	private collapse: { shift: number[]; t: number } | null = null;
	private lastPhase: Phase = Phase.IDLE;
	private showGhost = true;
	private readonly unsubscribe: (() => void)[];

	constructor(bus: EventBus) {
		this.canvas = document.createElement('canvas');
		this.canvas.className = 'tetris-board-canvas';
		const ctx = this.canvas.getContext('2d', { alpha: false });
		if (!ctx) throw new Error('[Tetris/BoardRenderer] Failed to get 2D context');
		this.ctx = ctx;

		this.unsubscribe = [
			bus.on('hardDrop', (e) => this.onHardDrop(e.cells, e.distance, e.type)),
			bus.on('lock', (e) => this.flashes.push({ cells: e.cells, life: FLASH_MS })),
			bus.on('clear', (e) => {
				if (e.count === 0) return;
				this.pendingBurst = e;
				this.lastClear = e;
				this.shake = Math.max(this.shake, this.cell * (e.count >= 4 || e.perfect ? 0.35 : 0.12));
			}),
			bus.on('levelUp', () => (this.sweep = 0)),
			bus.on('gameOver', () => (this.shake = Math.max(this.shake, this.cell * 0.3))),
			bus.on('reset', () => this.resetEffects())
		];
	}

	setGhost(visible: boolean): void {
		this.showGhost = visible;
	}

	get cssCellSize(): number {
		return this.cell / this.dpr;
	}

	mount(parent: HTMLElement): void {
		parent.appendChild(this.canvas);
	}

	destroy(): void {
		for (const off of this.unsubscribe) off();
		this.canvas.remove();
	}

	resize(cssCell: number): void {
		if (!(cssCell > 0)) {
			throw new Error(`[Tetris/BoardRenderer] Invalid cell size ${cssCell}`);
		}
		const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
		const cell = Math.max(4, Math.floor(cssCell * dpr));
		if (cell === this.cell && dpr === this.dpr) return;
		this.dpr = dpr;
		this.cell = cell;
		this.canvas.width = COLS * cell;
		this.canvas.height = VISIBLE_ROWS * cell;
		this.canvas.style.width = `${this.canvas.width / dpr}px`;
		this.canvas.style.height = `${this.canvas.height / dpr}px`;
		this.sprites.build(cell);
		this.background = this.buildBackground();
	}

	render(state: GameState, frameMs: number): void {
		if (this.cell === 0 || !this.background) return;
		const dt = Math.min(frameMs, 100);
		this.time += dt;
		this.trackPhase(state);

		const ctx = this.ctx;
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.globalAlpha = 1;
		ctx.drawImage(this.background, 0, 0);

		if (this.shake > 0.3) {
			const a = this.shake;
			ctx.translate(
				Math.round((Math.random() - 0.5) * a),
				Math.round((Math.random() * 0.8 + 0.2) * a)
			);
			this.shake *= Math.exp(-dt / 70);
		} else {
			this.shake = 0;
		}

		this.drawTrails(dt);
		this.drawBoard(state, dt);
		if (state.active && (state.phase === Phase.PLAYING || state.phase === Phase.PAUSED)) {
			if (this.showGhost) this.drawGhost(state);
			this.drawActive(state);
		}
		this.drawFlashes(dt);
		this.spawnBurst(state);
		this.drawParticles(dt);

		ctx.setTransform(1, 0, 0, 1, 0, 0);
		this.drawSweep(dt);
		this.drawDanger(state);
	}

	private resetEffects(): void {
		this.particles = [];
		this.trails = [];
		this.flashes = [];
		this.collapse = null;
		this.pendingBurst = null;
		this.lastClear = null;
		this.sweep = -1;
		this.shake = 0;
	}

	private trackPhase(state: GameState): void {
		if (this.lastPhase === Phase.CLEARING && state.phase === Phase.PLAYING && this.lastClear) {
			const shift = new Array<number>(ROWS).fill(0);
			const rows = this.lastClear.rows;
			for (let y = 0; y < ROWS; y++) {
				if (rows.includes(y)) continue;
				const below = rows.filter((r) => r > y).length;
				if (y + below < ROWS) shift[y + below] = below;
			}
			this.collapse = { shift, t: 0 };
			this.lastClear = null;
		}
		this.lastPhase = state.phase;
	}

	private buildBackground(): HTMLCanvasElement {
		const bg = document.createElement('canvas');
		bg.width = this.canvas.width;
		bg.height = this.canvas.height;
		const ctx = bg.getContext('2d');
		if (!ctx) throw new Error('[Tetris/BoardRenderer] Failed to create background');
		const c = this.cell;

		const grad = ctx.createLinearGradient(0, 0, 0, bg.height);
		grad.addColorStop(0, WELL.top);
		grad.addColorStop(1, WELL.bottom);
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, bg.width, bg.height);

		ctx.fillStyle = WELL.stripe;
		for (let x = 0; x < COLS; x += 2) ctx.fillRect(x * c, 0, c, bg.height);

		ctx.fillStyle = WELL.dot;
		const dot = Math.max(1, Math.round(c * 0.06));
		for (let x = 1; x < COLS; x++) {
			for (let y = 1; y < VISIBLE_ROWS; y++) {
				ctx.fillRect(x * c - dot / 2, y * c - dot / 2, dot, dot);
			}
		}

		const vignette = ctx.createRadialGradient(
			bg.width / 2,
			bg.height / 2,
			bg.width * 0.3,
			bg.width / 2,
			bg.height / 2,
			bg.height * 0.75
		);
		vignette.addColorStop(0, 'rgba(0,0,0,0)');
		vignette.addColorStop(1, WELL.vignette);
		ctx.fillStyle = vignette;
		ctx.fillRect(0, 0, bg.width, bg.height);
		return bg;
	}

	private rowY(y: number): number {
		return (y - HIDDEN_ROWS) * this.cell;
	}

	private drawBoard(state: GameState, dt: number): void {
		const ctx = this.ctx;
		const c = this.cell;
		const clearing = state.phase === Phase.CLEARING && state.clearing ? state.clearing.rows : [];
		const clearProgress = Math.min(1, state.phaseTime / CLEAR_MS);
		const topout =
			state.phase === Phase.TOPOUT
				? Math.min(1, state.phaseTime / TOPOUT_MS)
				: state.phase === Phase.GAMEOVER
					? 1
					: -1;

		let collapseK = 0;
		if (this.collapse) {
			this.collapse.t += dt;
			const t = Math.min(1, this.collapse.t / COLLAPSE_MS);
			collapseK = (1 - t) * (1 - t);
			if (t >= 1) this.collapse = null;
		}

		for (let y = HIDDEN_ROWS; y < ROWS; y++) {
			const row = state.board[y];
			if (clearing.includes(y)) {
				this.drawClearingRow(state, y, clearProgress);
				continue;
			}
			const offset = this.collapse ? this.collapse.shift[y] * collapseK : 0;
			const concrete = topout >= 0 && ROWS - 1 - y < topout * VISIBLE_ROWS;
			const py = Math.round(this.rowY(y) - offset * c);
			for (let x = 0; x < COLS; x++) {
				const cell = row[x];
				if (cell === 0) continue;
				ctx.drawImage(this.sprites.get(concrete ? CONCRETE : cell), x * c, py);
			}
		}
	}

	private drawClearingRow(state: GameState, y: number, p: number): void {
		const ctx = this.ctx;
		const c = this.cell;
		const row = state.board[y];
		const py = this.rowY(y);
		const flashEnd = 0.3;
		for (let x = 0; x < COLS; x++) {
			const cell = row[x];
			if (cell === 0) continue;
			const dist = Math.abs(x + 0.5 - COLS / 2) / (COLS / 2);
			const q = Math.max(0, (p - flashEnd) / (1 - flashEnd));
			const local = Math.min(1, Math.max(0, (q - dist * 0.45) / 0.55));
			const scale = 1 - local * local;
			if (scale <= 0.02) continue;
			const s = c * scale;
			const ox = x * c + (c - s) / 2;
			const oy = py + (c - s) / 2;
			ctx.drawImage(this.sprites.get(cell), ox, oy, s, s);
			const glow = p < flashEnd ? Math.sin((p / flashEnd) * Math.PI * 0.5) : 1 - local * 0.6;
			ctx.fillStyle = `rgba(255, 246, 220, ${0.85 * glow})`;
			ctx.fillRect(ox, oy, s, s);
		}
	}

	private drawGhost(state: GameState): void {
		const piece = state.active;
		if (!piece) return;
		const distance = dropDistance(state.board, piece);
		if (distance === 0) return;
		const ctx = this.ctx;
		const c = this.cell;
		const color = colorOf(piece.type);
		const lw = Math.max(1, Math.round(c * 0.08));
		ctx.lineWidth = lw;
		for (const [cx, cy] of pieceCells(piece.type, piece.rotation)) {
			const y = piece.y + cy + distance;
			if (y < HIDDEN_ROWS) continue;
			const px = (piece.x + cx) * c;
			const py = this.rowY(y);
			ctx.globalAlpha = 0.14;
			ctx.fillStyle = color.base;
			ctx.fillRect(px + lw, py + lw, c - lw * 2, c - lw * 2);
			ctx.globalAlpha = 0.6;
			ctx.strokeStyle = color.light;
			ctx.strokeRect(px + lw * 1.5, py + lw * 1.5, c - lw * 3, c - lw * 3);
		}
		ctx.globalAlpha = 1;
	}

	private drawActive(state: GameState): void {
		const piece = state.active;
		if (!piece) return;
		const ctx = this.ctx;
		const c = this.cell;
		const sprite = this.sprites.get(piece.type);
		const grounded = !fits(state.board, piece, 0, 1);
		const lockK = grounded ? Math.min(1, state.lockTimer / LOCK_DELAY_MS) : 0;
		for (const [cx, cy] of pieceCells(piece.type, piece.rotation)) {
			const y = piece.y + cy;
			if (y < HIDDEN_ROWS) continue;
			const px = (piece.x + cx) * c;
			const py = this.rowY(y);
			ctx.drawImage(sprite, px, py);
			if (lockK > 0) {
				ctx.fillStyle = `rgba(255, 244, 214, ${0.32 * lockK})`;
				ctx.fillRect(px, py, c, c);
			}
		}
	}

	private onHardDrop(cells: CellPos[], distance: number, type: PieceType): void {
		if (distance <= 0) return;
		const color = colorOf(type);
		const tops = new Map<number, number>();
		const bottoms = new Map<number, number>();
		for (const { x, y } of cells) {
			tops.set(x, Math.min(tops.get(x) ?? Infinity, y));
			bottoms.set(x, Math.max(bottoms.get(x) ?? -Infinity, y));
		}
		for (const [col, top] of tops) {
			this.trails.push({ col, from: top - distance, to: top, color: color.light, life: TRAIL_MS });
		}
		const c = this.cell;
		for (const [col, bottom] of bottoms) {
			for (let i = 0; i < 3; i++) {
				this.addParticle({
					x: (col + Math.random()) * c,
					y: this.rowY(bottom + 1),
					vx: (Math.random() - 0.5) * 0.25 * (c / 30),
					vy: -Math.random() * 0.25 * (c / 30),
					life: 380,
					max: 380,
					size: c * (0.06 + Math.random() * 0.06),
					color: 'rgba(236, 222, 190, 0.9)'
				});
			}
		}
		this.shake = Math.max(this.shake, Math.min(c * 0.16, distance * c * 0.012));
	}

	private drawTrails(dt: number): void {
		const ctx = this.ctx;
		const c = this.cell;
		this.trails = this.trails.filter((t) => (t.life -= dt) > 0);
		for (const t of this.trails) {
			const k = t.life / TRAIL_MS;
			const y0 = this.rowY(Math.max(HIDDEN_ROWS, t.from));
			const y1 = this.rowY(t.to);
			if (y1 <= y0) continue;
			const g = ctx.createLinearGradient(0, y0, 0, y1);
			g.addColorStop(0, 'rgba(255,255,255,0)');
			g.addColorStop(1, t.color);
			ctx.globalAlpha = 0.45 * k;
			ctx.fillStyle = g;
			const w = c * (0.5 + 0.4 * k);
			ctx.fillRect(t.col * c + (c - w) / 2, y0, w, y1 - y0);
		}
		ctx.globalAlpha = 1;
	}

	private drawFlashes(dt: number): void {
		const ctx = this.ctx;
		const c = this.cell;
		this.flashes = this.flashes.filter((f) => (f.life -= dt) > 0);
		for (const f of this.flashes) {
			ctx.fillStyle = `rgba(255, 248, 225, ${0.55 * (f.life / FLASH_MS)})`;
			for (const { x, y } of f.cells) {
				if (y >= HIDDEN_ROWS) ctx.fillRect(x * c, this.rowY(y), c, c);
			}
		}
	}

	private spawnBurst(state: GameState): void {
		const burst = this.pendingBurst;
		if (!burst) return;
		this.pendingBurst = null;
		const c = this.cell;
		const big = burst.count >= 4 || burst.perfect || burst.spin !== SpinKind.NONE;
		const speed = c / 30;
		for (const y of burst.rows) {
			const row = state.board[y];
			for (let x = 0; x < COLS; x++) {
				const cell = row[x];
				if (cell === 0) continue;
				const color = colorOf(cell);
				const n = big ? 4 : 2;
				for (let i = 0; i < n; i++) {
					const max = 600 + Math.random() * 500;
					this.addParticle({
						x: (x + 0.5) * c,
						y: this.rowY(y) + c / 2,
						vx: (Math.random() - 0.5) * 0.7 * speed,
						vy: (-0.25 - Math.random() * 0.55) * speed,
						life: max,
						max,
						size: c * (0.1 + Math.random() * 0.14),
						color: big && i % 2 === 0 ? '#ffd77e' : i % 2 === 0 ? color.light : color.base
					});
				}
			}
		}
	}

	private addParticle(p: Particle): void {
		if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
		this.particles.push(p);
	}

	private drawParticles(dt: number): void {
		const ctx = this.ctx;
		const g = GRAVITY * (this.cell / 30);
		this.particles = this.particles.filter((p) => (p.life -= dt) > 0);
		for (const p of this.particles) {
			p.vy += g * dt;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
			ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.5);
			ctx.fillStyle = p.color;
			ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
		}
		ctx.globalAlpha = 1;
	}

	private drawSweep(dt: number): void {
		if (this.sweep < 0) return;
		this.sweep += dt / SWEEP_MS;
		if (this.sweep >= 1) {
			this.sweep = -1;
			return;
		}
		const ctx = this.ctx;
		const h = this.canvas.height;
		const y = h * (1 - this.sweep);
		const band = this.cell * 3;
		const g = ctx.createLinearGradient(0, y - band, 0, y + band);
		g.addColorStop(0, `rgba(${WELL.gold}, 0)`);
		g.addColorStop(0.5, `rgba(${WELL.gold}, ${0.35 * (1 - this.sweep * 0.6)})`);
		g.addColorStop(1, `rgba(${WELL.gold}, 0)`);
		ctx.fillStyle = g;
		ctx.fillRect(0, y - band, this.canvas.width, band * 2);
	}

	private drawDanger(state: GameState): void {
		if (state.phase !== Phase.PLAYING && state.phase !== Phase.CLEARING) return;
		const threshold = VISIBLE_ROWS - 6;
		const height = stackHeight(state.board) - HIDDEN_ROWS;
		if (height <= threshold) return;
		const k = Math.min(1, (height - threshold) / 5);
		const pulse = 0.65 + 0.35 * Math.sin(this.time / 220);
		const ctx = this.ctx;
		const depth = this.cell * 5;
		const g = ctx.createLinearGradient(0, 0, 0, depth);
		g.addColorStop(0, `rgba(${WELL.danger}, ${0.4 * k * pulse})`);
		g.addColorStop(1, `rgba(${WELL.danger}, 0)`);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, this.canvas.width, depth);
	}
}
