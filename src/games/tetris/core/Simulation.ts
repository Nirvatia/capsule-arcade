import {
	CLEAR_MS,
	COUNTDOWN_STEP_MS,
	COUNTDOWN_STEPS,
	HARD_DROP_POINTS,
	PREVIEW_COUNT,
	TOPOUT_MS
} from '../config';
import type { CellPos, EventBus } from '../engine/EventBus';
import { countHoles, dropDistance, fits, fullRows, placePiece, removeRows } from './board';
import { MODES, ModeId, type GameMode } from './modes';
import { randomSeed } from './random';
import { pieceCells, spawnPosition } from './pieces';
import { Randomizer } from './Randomizer';
import { createState, resetState } from './state';
import { fallInterval, stepFall } from './systems/fall';
import { processInput, type InputCommands } from './systems/input';
import { rotate, shift } from './systems/movement';
import { detectSpin, scoreLock } from './systems/scoring';
import {
	Action,
	EndReason,
	Phase,
	SpinKind,
	type ActivePiece,
	type GameState,
	type PieceType
} from './types';

export interface StartOptions {
	mode?: ModeId;
	seed?: number;
}

interface PhaseStep {
	duration?: number;
	enter?: () => void;
	update?: (dt: number) => void;
	finish?: () => Phase;
}

const PAUSABLE: readonly Phase[] = [Phase.PLAYING, Phase.CLEARING, Phase.COUNTDOWN];

export class Simulation {
	readonly state: GameState = createState();
	private readonly randomizer = new Randomizer();
	private countdownStep = 0;

	private readonly commands: InputCommands = {
		shift: (dx) => {
			const ok = shift(this.state, dx);
			if (ok) this.bus.emit('move', { dx });
			return ok;
		},
		rotate: (dir) => {
			const result = rotate(this.state, dir);
			if (result.ok) this.bus.emit('rotate', { kicked: result.kicked });
		},
		hardDrop: () => this.hardDrop(),
		hold: () => this.hold(),
		softDropStart: () => {
			this.state.gravityTimer = Math.max(this.state.gravityTimer, fallInterval(this.state));
		},
		isActive: () => this.state.phase === Phase.PLAYING && this.state.active !== null
	};

	private readonly scenario: Record<Phase, PhaseStep> = {
		[Phase.IDLE]: {},
		[Phase.PAUSED]: {},
		[Phase.GAMEOVER]: {},
		[Phase.COUNTDOWN]: {
			duration: COUNTDOWN_STEPS * COUNTDOWN_STEP_MS,
			enter: () => {
				this.countdownStep = COUNTDOWN_STEPS;
				this.bus.emit('countdown', { step: this.countdownStep });
			},
			update: () => {
				const step = COUNTDOWN_STEPS - Math.floor(this.state.phaseTime / COUNTDOWN_STEP_MS);
				if (step !== this.countdownStep && step > 0) {
					this.countdownStep = step;
					this.bus.emit('countdown', { step });
				}
			},
			finish: () => {
				this.bus.emit('countdown', { step: 0 });
				return this.state.resumePhase;
			}
		},
		[Phase.PLAYING]: {
			enter: () => {
				if (!this.state.active && !this.spawnNext()) this.topOut();
			},
			update: (dt) => {
				this.tickClock(dt);
				if (this.state.phase === Phase.PLAYING) this.play(dt);
			}
		},
		[Phase.CLEARING]: {
			duration: CLEAR_MS,
			update: (dt) => this.tickClock(dt),
			finish: () => {
				if (this.state.clearing) removeRows(this.state, this.state.clearing.rows);
				this.state.clearing = null;
				const goal = this.state.mode.goalLines;
				if (goal !== null && this.state.lines >= goal) return this.endGame(EndReason.GOAL);
				return Phase.PLAYING;
			}
		},
		[Phase.TOPOUT]: {
			duration: TOPOUT_MS,
			finish: () => Phase.GAMEOVER
		}
	};

	constructor(private readonly bus: EventBus) {}

	start(options: StartOptions = {}): void {
		const mode: GameMode = MODES[options.mode ?? this.state.mode.id];
		if (!mode) {
			throw new Error(`[Tetris/Simulation] Unknown mode ${String(options.mode)}`);
		}
		const seed = options.seed ?? randomSeed();
		resetState(this.state);
		this.state.mode = mode;
		this.state.seed = seed;
		this.state.level = mode.startLevel;
		this.randomizer.reset(seed);
		for (let i = 0; i < PREVIEW_COUNT; i++) this.state.queue.push(this.randomizer.next());
		this.state.resumePhase = Phase.PLAYING;
		this.bus.emit('reset', { mode: mode.id, seed });
		this.enter(Phase.COUNTDOWN);
	}

	toMenu(): void {
		const phase = this.state.phase;
		if (phase !== Phase.PAUSED && phase !== Phase.GAMEOVER && phase !== Phase.TOPOUT) return;
		resetState(this.state);
		this.enter(Phase.IDLE);
	}

	configureInput(dasMs: number, arrMs: number): void {
		if (!(dasMs >= 0) || !(arrMs >= 0)) {
			throw new Error(`[Tetris/Simulation] Invalid input timing das=${dasMs} arr=${arrMs}`);
		}
		this.state.input.dasMs = dasMs;
		this.state.input.arrMs = arrMs;
	}

	togglePause(): void {
		if (this.state.phase === Phase.PAUSED) {
			this.enter(Phase.COUNTDOWN);
			return;
		}
		this.pause();
	}

	pause(): void {
		const phase = this.state.phase;
		if (!PAUSABLE.includes(phase)) return;
		if (phase !== Phase.COUNTDOWN) this.state.resumePhase = phase;
		this.state.input.queue.length = 0;
		this.enter(Phase.PAUSED);
	}

	press(action: Action): void {
		this.state.input.held.add(action);
		if (this.state.phase === Phase.PLAYING) this.state.input.queue.push(action);
	}

	tap(action: Action): void {
		if (this.state.phase === Phase.PLAYING) this.state.input.queue.push(action);
	}

	release(action: Action): void {
		this.state.input.held.delete(action);
	}

	releaseAll(): void {
		this.state.input.held.clear();
	}

	update(dt: number): void {
		const step = this.scenario[this.state.phase];
		this.state.phaseTime += dt;
		step.update?.(dt);
		if (
			step.duration !== undefined &&
			step.finish &&
			this.state.phaseTime >= step.duration &&
			this.scenario[this.state.phase] === step
		) {
			this.enter(step.finish());
		}
	}

	private enter(phase: Phase): void {
		this.state.phase = phase;
		this.state.phaseTime = 0;
		this.bus.emit('phase', { phase });
		this.scenario[phase].enter?.();
	}

	private tickClock(dt: number): void {
		const s = this.state;
		s.elapsedMs += dt;
		const limit = s.mode.timeLimitMs;
		if (limit !== null && s.elapsedMs >= limit) {
			s.elapsedMs = limit;
			this.enter(this.endGame(EndReason.TIME));
		}
	}

	private endGame(reason: EndReason): Phase {
		const s = this.state;
		s.endReason = reason;
		s.active = null;
		s.input.queue.length = 0;
		this.bus.emit('gameOver', {
			mode: s.mode.id,
			reason,
			seed: s.seed,
			timeMs: Math.round(s.elapsedMs),
			holes: countHoles(s.board),
			score: s.score,
			lines: s.lines,
			level: s.level,
			pieces: s.pieces,
			tetrises: s.tetrises,
			spins: s.spins,
			maxCombo: s.maxCombo
		});
		return reason === EndReason.TOPOUT ? Phase.TOPOUT : Phase.GAMEOVER;
	}

	private topOut(): void {
		this.enter(this.endGame(EndReason.TOPOUT));
	}

	private play(dt: number): void {
		processInput(this.state, dt, this.commands);
		if (this.state.phase !== Phase.PLAYING || !this.state.active) return;
		if (stepFall(this.state, dt)) this.lockActive();
	}

	private hardDrop(): void {
		const piece = this.state.active;
		if (!piece) return;
		const distance = dropDistance(this.state.board, piece);
		piece.y += distance;
		this.state.score += distance * HARD_DROP_POINTS;
		if (distance > 0) this.state.lastActionWasRotation = false;
		this.bus.emit('hardDrop', { cells: absoluteCells(piece), distance, type: piece.type });
		this.lockActive();
	}

	private hold(): void {
		const s = this.state;
		if (!s.active || s.holdUsed) return;
		const current = s.active.type;
		const swap = s.hold;
		s.hold = current;
		const ok = swap === null ? this.spawnNext() : this.spawn(swap);
		s.holdUsed = true;
		this.bus.emit('hold', { type: current });
		if (!ok) this.topOut();
	}

	private lockActive(): void {
		const s = this.state;
		const piece = s.active;
		if (!piece) return;
		const visible = placePiece(s.board, piece);
		s.active = null;
		s.pieces += 1;
		this.bus.emit('lock', { cells: absoluteCells(piece), type: piece.type });
		if (!visible) {
			this.topOut();
			return;
		}

		const rows = fullRows(s.board);
		const spin = detectSpin(s, piece);
		const previousLevel = s.level;
		const result = scoreLock(s, rows, spin);

		if (rows.length > 0 || spin !== SpinKind.NONE) this.bus.emit('clear', result);
		if (s.level > previousLevel) this.bus.emit('levelUp', { level: s.level });

		if (rows.length > 0) {
			s.clearing = result;
			this.enter(Phase.CLEARING);
			return;
		}
		if (!this.spawnNext()) this.topOut();
	}

	private spawnNext(): boolean {
		const type = this.state.queue.shift();
		if (type === undefined) {
			throw new Error('[Tetris/Simulation] Piece queue is empty');
		}
		this.state.queue.push(this.randomizer.next());
		this.state.holdUsed = false;
		return this.spawn(type);
	}

	private spawn(type: PieceType): boolean {
		const s = this.state;
		const { x, y } = spawnPosition(type);
		const piece: ActivePiece = { type, rotation: 0, x, y };
		if (!fits(s.board, piece)) {
			s.active = null;
			return false;
		}
		s.active = piece;
		s.gravityTimer = 0;
		s.lockTimer = 0;
		s.lockResets = 0;
		s.lowestY = y;
		s.lastActionWasRotation = false;
		this.bus.emit('spawn', { type });
		return true;
	}
}

function absoluteCells(piece: ActivePiece): CellPos[] {
	return pieceCells(piece.type, piece.rotation).map(([cx, cy]) => ({
		x: piece.x + cx,
		y: piece.y + cy
	}));
}
