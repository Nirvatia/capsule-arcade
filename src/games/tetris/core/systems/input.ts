import { Action, type GameState } from '../types';

export interface InputCommands {
	shift(dx: -1 | 1): boolean;
	rotate(dir: 1 | -1): void;
	hardDrop(): void;
	hold(): void;
	softDropStart(): void;
	isActive(): boolean;
}

function setDirection(state: GameState, dir: -1 | 0 | 1): void {
	state.input.shiftDir = dir;
	state.input.dasTimer = 0;
	state.input.arrTimer = 0;
}

export function processInput(state: GameState, dt: number, cmd: InputCommands): void {
	const input = state.input;
	const queue = input.queue.splice(0);

	for (const action of queue) {
		if (!cmd.isActive()) break;
		switch (action) {
			case Action.LEFT:
				setDirection(state, -1);
				cmd.shift(-1);
				break;
			case Action.RIGHT:
				setDirection(state, 1);
				cmd.shift(1);
				break;
			case Action.ROTATE_CW:
				cmd.rotate(1);
				break;
			case Action.ROTATE_CCW:
				cmd.rotate(-1);
				break;
			case Action.HOLD:
				cmd.hold();
				break;
			case Action.HARD_DROP:
				cmd.hardDrop();
				break;
			case Action.SOFT_DROP:
				cmd.softDropStart();
				break;
		}
	}

	if (input.shiftDir === -1 && !input.held.has(Action.LEFT)) {
		setDirection(state, input.held.has(Action.RIGHT) ? 1 : 0);
	} else if (input.shiftDir === 1 && !input.held.has(Action.RIGHT)) {
		setDirection(state, input.held.has(Action.LEFT) ? -1 : 0);
	}

	if (input.shiftDir === 0 || !cmd.isActive()) return;

	const before = input.dasTimer;
	input.dasTimer += dt;
	if (input.dasTimer < input.dasMs) return;
	const arr = Math.max(0, input.arrMs);
	input.arrTimer = before < input.dasMs ? arr + input.dasTimer - input.dasMs : input.arrTimer + dt;
	if (arr === 0) {
		while (cmd.shift(input.shiftDir));
		input.arrTimer = 0;
		return;
	}
	while (input.arrTimer >= arr) {
		input.arrTimer -= arr;
		if (!cmd.shift(input.shiftDir)) {
			input.arrTimer = 0;
			break;
		}
	}
}
