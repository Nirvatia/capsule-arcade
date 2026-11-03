import { ARR_MS, DAS_MS } from '../config';
import { ModeId, MODES } from './modes';
import { createBoard } from './board';
import { Phase, type GameState } from './types';

export function createState(): GameState {
	const mode = MODES[ModeId.MARATHON];
	return {
		seed: 0,
		mode,
		elapsedMs: 0,
		endReason: null,
		phase: Phase.IDLE,
		phaseTime: 0,
		resumePhase: Phase.PLAYING,
		board: createBoard(),
		active: null,
		hold: null,
		holdUsed: false,
		queue: [],
		gravityTimer: 0,
		lockTimer: 0,
		lockResets: 0,
		lowestY: 0,
		lastActionWasRotation: false,
		lastKickIndex: 0,
		clearing: null,
		score: 0,
		lines: 0,
		level: mode.startLevel,
		combo: -1,
		backToBack: false,
		pieces: 0,
		tetrises: 0,
		spins: 0,
		maxCombo: 0,
		input: {
			dasMs: DAS_MS,
			arrMs: ARR_MS,
			held: new Set(),
			queue: [],
			shiftDir: 0,
			dasTimer: 0,
			arrTimer: 0
		}
	};
}

export function resetState(state: GameState): void {
	const { held, dasMs, arrMs } = state.input;
	Object.assign(state, createState());
	Object.assign(state.input, { held, dasMs, arrMs });
}
