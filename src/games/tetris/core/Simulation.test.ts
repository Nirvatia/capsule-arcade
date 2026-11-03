import { describe, expect, it } from 'vitest';
import {
	CLEAR_MS,
	COLS,
	COUNTDOWN_STEP_MS,
	COUNTDOWN_STEPS,
	HIDDEN_ROWS,
	LOCK_DELAY_MS,
	MAX_LOCK_RESETS,
	ROWS,
	TICK_MS
} from '../config';
import { EventBus, type GameEvents } from '../engine/EventBus';
import { countHoles } from './board';
import { ModeId } from './modes';
import { pieceCells } from './pieces';
import { Simulation } from './Simulation';
import {
	Action,
	EndReason,
	Phase,
	PieceType,
	SpinKind,
	type Cell,
	type PieceType as Piece
} from './types';
import { normalizeSettings } from '../settings';

function run(sim: Simulation, ms: number): void {
	for (let t = 0; t < ms; t += TICK_MS) sim.update(TICK_MS);
}

function startWith(
	queue: Piece[],
	mode: ModeId = ModeId.MARATHON
): { sim: Simulation; bus: EventBus } {
	const bus = new EventBus();
	const sim = new Simulation(bus);
	sim.start({ mode, seed: 7 });
	sim.state.queue = [...queue, PieceType.O, PieceType.O, PieceType.O, PieceType.O, PieceType.O];
	run(sim, COUNTDOWN_STEPS * COUNTDOWN_STEP_MS + TICK_MS);
	return { sim, bus };
}

function fillRow(board: Cell[][], y: number, holes: number[]): void {
	for (let x = 0; x < COLS; x++) board[y][x] = holes.includes(x) ? 0 : PieceType.J;
}

describe('Simulation', () => {
	it('spawns the first piece inside the visible field after the countdown', () => {
		const { sim } = startWith([PieceType.T]);
		expect(sim.state.phase).toBe(Phase.PLAYING);
		const piece = sim.state.active;
		expect(piece?.type).toBe(PieceType.T);
		for (const [, cy] of pieceCells(PieceType.T, 0)) {
			expect((piece?.y ?? 0) + cy).toBeGreaterThanOrEqual(HIDDEN_ROWS);
		}
	});

	it('locks immediately on hard drop and scores 2 points per cell', () => {
		const { sim } = startWith([PieceType.O]);
		sim.press(Action.HARD_DROP);
		run(sim, TICK_MS);
		expect(sim.state.board[ROWS - 1][4]).toBe(PieceType.O);
		expect(sim.state.score).toBe((ROWS - 2 - HIDDEN_ROWS) * 2);
		expect(sim.state.pieces).toBe(1);
	});

	it('clears lines, scores by level and collapses the stack after the animation', () => {
		const { sim } = startWith([PieceType.I]);
		fillRow(sim.state.board, ROWS - 1, [3, 4, 5, 6]);
		sim.state.board[ROWS - 2][0] = PieceType.Z;
		sim.press(Action.HARD_DROP);
		run(sim, TICK_MS);
		expect(sim.state.phase).toBe(Phase.CLEARING);
		expect(sim.state.lines).toBe(1);
		run(sim, CLEAR_MS + TICK_MS);
		expect(sim.state.phase).toBe(Phase.PLAYING);
		expect(sim.state.board[ROWS - 1][0]).toBe(PieceType.Z);
		expect(sim.state.board[ROWS - 2].every((c) => c === 0)).toBe(true);
	});

	it('detects a T-spin double', () => {
		const { sim, bus } = startWith([PieceType.T]);
		const board = sim.state.board;
		fillRow(board, ROWS - 1, [4]);
		fillRow(board, ROWS - 2, [3, 4, 5]);
		board[ROWS - 3][3] = PieceType.J;
		const clears: GameEvents['clear'][] = [];
		bus.on('clear', (e) => clears.push(e));
		sim.state.active = { type: PieceType.T, rotation: 1, x: 3, y: ROWS - 3 };
		sim.press(Action.ROTATE_CW);
		run(sim, TICK_MS);
		sim.release(Action.ROTATE_CW);
		expect(sim.state.active?.rotation).toBe(2);
		run(sim, LOCK_DELAY_MS + TICK_MS * 2);
		expect(clears[0]?.spin).toBe(SpinKind.FULL);
		expect(clears[0]?.count).toBe(2);
		expect(clears[0]?.points).toBe(1200);
	});

	it('limits lock delay resets so a piece cannot stall forever', () => {
		const { sim } = startWith([PieceType.T]);
		sim.press(Action.SOFT_DROP);
		run(sim, 2000);
		sim.release(Action.SOFT_DROP);
		const pieces = sim.state.pieces;
		for (let i = 0; i < MAX_LOCK_RESETS * 4 && sim.state.pieces === pieces; i++) {
			sim.press(Action.ROTATE_CW);
			run(sim, LOCK_DELAY_MS * 0.8);
			sim.release(Action.ROTATE_CW);
		}
		expect(sim.state.pieces).toBe(pieces + 1);
	});

	it('auto-repeats a held direction until the wall', () => {
		const { sim } = startWith([PieceType.O]);
		sim.press(Action.LEFT);
		run(sim, 600);
		expect(sim.state.active?.x).toBe(0);
		sim.release(Action.LEFT);
	});

	it('only allows one hold per piece', () => {
		const { sim } = startWith([PieceType.T, PieceType.I]);
		sim.press(Action.HOLD);
		run(sim, TICK_MS);
		sim.release(Action.HOLD);
		sim.press(Action.HOLD);
		run(sim, TICK_MS);
		expect(sim.state.hold).toBe(PieceType.T);
		expect(sim.state.active?.type).toBe(PieceType.I);
	});

	it('tops out when a new piece cannot spawn', () => {
		const { sim, bus } = startWith([PieceType.O, PieceType.O]);
		let over = false;
		bus.on('gameOver', () => (over = true));
		for (let y = HIDDEN_ROWS + 2; y < ROWS; y++) fillRow(sim.state.board, y, [0]);
		sim.press(Action.HARD_DROP);
		run(sim, TICK_MS);
		expect(over).toBe(true);
		run(sim, 2000);
		expect(sim.state.phase).toBe(Phase.GAMEOVER);
	});

	it('produces the same game for the same seed', () => {
		const play = (seed: number): string => {
			const sim = new Simulation(new EventBus());
			sim.start({ seed });
			run(sim, COUNTDOWN_STEPS * COUNTDOWN_STEP_MS + TICK_MS);
			for (let i = 0; i < 30 && sim.state.phase !== Phase.GAMEOVER; i++) {
				sim.press(i % 3 === 0 ? Action.LEFT : Action.ROTATE_CW);
				run(sim, TICK_MS);
				sim.releaseAll();
				sim.press(Action.HARD_DROP);
				run(sim, CLEAR_MS + TICK_MS * 2);
				sim.releaseAll();
			}
			return JSON.stringify([sim.state.board, sim.state.queue, sim.state.score]);
		};
		expect(play(12345)).toBe(play(12345));
		expect(play(12345)).not.toBe(play(54321));
	});

	it('finishes the sprint when the line goal is reached', () => {
		const { sim, bus } = startWith([PieceType.I], ModeId.SPRINT);
		let reason: string | null = null;
		bus.on('gameOver', (e) => (reason = e.reason));
		sim.state.lines = 39;
		fillRow(sim.state.board, ROWS - 1, [3, 4, 5, 6]);
		sim.press(Action.HARD_DROP);
		run(sim, CLEAR_MS + TICK_MS * 2);
		expect(reason).toBe(EndReason.GOAL);
		expect(sim.state.phase).toBe(Phase.GAMEOVER);
		expect(sim.state.level).toBe(1);
	});

	it('stops the ultra mode when the clock runs out', () => {
		const { sim, bus } = startWith([PieceType.O], ModeId.ULTRA);
		let summary: GameEvents['gameOver'] | null = null;
		bus.on('gameOver', (e) => (summary = e));
		sim.state.elapsedMs = 119900;
		run(sim, 200);
		expect(summary).not.toBeNull();
		expect(summary!.reason).toBe(EndReason.TIME);
		expect(summary!.timeMs).toBe(120000);
	});

	it('counts covered holes', () => {
		const { sim } = startWith([PieceType.O]);
		const board = sim.state.board;
		board[ROWS - 3][2] = PieceType.J;
		board[ROWS - 1][5] = PieceType.J;
		expect(countHoles(board)).toBe(2);
	});

	it('moves to the wall instantly with zero ARR', () => {
		const { sim } = startWith([PieceType.O]);
		sim.configureInput(100, 0);
		sim.press(Action.RIGHT);
		run(sim, 110);
		expect(sim.state.active?.x).toBe(8);
	});

	it('clamps broken settings to safe values', () => {
		const s = normalizeSettings({ dasMs: -5, arrMs: 'x', ghost: 1, sound: false });
		expect(s.dasMs).toBe(60);
		expect(s.arrMs).toBe(40);
		expect(s.ghost).toBe(true);
		expect(s.sound).toBe(false);
	});
});
