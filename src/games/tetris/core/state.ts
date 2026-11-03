import { START_LEVEL } from '../config';
import { createBoard } from './board';
import { Phase, type GameState } from './types';

export function createState(): GameState {
	return {
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
		level: START_LEVEL,
		combo: -1,
		backToBack: false,
		pieces: 0,
		tetrises: 0,
		spins: 0,
		maxCombo: 0,
		input: {
			held: new Set(),
			queue: [],
			shiftDir: 0,
			dasTimer: 0,
			arrTimer: 0
		}
	};
}

export function resetState(state: GameState): void {
	const held = state.input.held;
	Object.assign(state, createState());
	state.input.held = held;
}
