import { Action } from '../core/types';

export interface KeyboardTarget {
	press(action: Action): void;
	release(action: Action): void;
	releaseAll(): void;
	confirm(): void;
	togglePause(): void;
	restart(): void;
	toggleMute(): void;
}

const BINDINGS: Readonly<Record<string, Action>> = {
	ArrowLeft: Action.LEFT,
	KeyA: Action.LEFT,
	ArrowRight: Action.RIGHT,
	KeyD: Action.RIGHT,
	ArrowDown: Action.SOFT_DROP,
	KeyS: Action.SOFT_DROP,
	Space: Action.HARD_DROP,
	ArrowUp: Action.ROTATE_CW,
	KeyX: Action.ROTATE_CW,
	KeyW: Action.ROTATE_CW,
	KeyZ: Action.ROTATE_CCW,
	ControlLeft: Action.ROTATE_CCW,
	KeyC: Action.HOLD,
	ShiftLeft: Action.HOLD,
	ShiftRight: Action.HOLD
};

export class Keyboard {
	private readonly abort = new AbortController();

	constructor(private readonly target: KeyboardTarget) {}

	attach(): void {
		const signal = this.abort.signal;
		window.addEventListener('keydown', this.onKeyDown, { signal });
		window.addEventListener('keyup', this.onKeyUp, { signal });
		window.addEventListener('blur', this.onBlur, { signal });
	}

	destroy(): void {
		this.abort.abort();
	}

	private readonly onKeyDown = (e: KeyboardEvent): void => {
		if (e.metaKey || e.altKey || (e.ctrlKey && e.code !== 'ControlLeft')) return;
		const action = BINDINGS[e.code];
		if (action) {
			e.preventDefault();
			if (!e.repeat) this.target.press(action);
			return;
		}
		if (e.repeat) return;
		switch (e.code) {
			case 'Enter':
			case 'NumpadEnter':
				e.preventDefault();
				this.target.confirm();
				break;
			case 'Escape':
			case 'KeyP':
				e.preventDefault();
				this.target.togglePause();
				break;
			case 'KeyR':
				this.target.restart();
				break;
			case 'KeyM':
				this.target.toggleMute();
				break;
		}
	};

	private readonly onKeyUp = (e: KeyboardEvent): void => {
		const action = BINDINGS[e.code];
		if (action) this.target.release(action);
	};

	private readonly onBlur = (): void => {
		this.target.releaseAll();
	};
}
