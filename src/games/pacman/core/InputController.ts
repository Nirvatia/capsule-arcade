import { SwipeTracker, swipeThreshold } from './touchInput';

export type InputDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

/** What a touch on these does is theirs (buttons, the HUD's dial, the pad): it never steers. */
const NO_SWIPE = 'button, a, input, select, [role="button"], [data-no-swipe]';

export interface InputHandlers {
	direction?: (direction: InputDirection) => void;
	confirm?: () => void;
	fire?: () => void;
	/** The fire key let go (the hell's plasma fires while it is held). */
	fireRelease?: () => void;
	pause?: () => void;
	menu?: () => void;
	profile?: () => void;
	/** `M`: sound on / off. */
	mute?: () => void;
	/** Dev hotkeys: `` ` `` shows the dev panels, F8 steps one frame. */
	debugToggle?: () => void;
	debugStep?: () => void;
}

const DIRECTION_KEYS: Record<string, InputDirection> = {
	ArrowUp: 'UP',
	KeyW: 'UP',
	ArrowDown: 'DOWN',
	KeyS: 'DOWN',
	ArrowLeft: 'LEFT',
	KeyA: 'LEFT',
	ArrowRight: 'RIGHT',
	KeyD: 'RIGHT'
};

export class InputController {
	private readonly handlers: InputHandlers;
	private attached = false;
	/** Direction keys held down, the latest pressed last. */
	private held: InputDirection[] = [];
	/** A finger swiping on the game; and the on-screen pad's direction, while pressed. */
	private readonly swipe = new SwipeTracker(swipeThreshold(720));
	private padHeld: InputDirection | null = null;

	constructor(handlers: InputHandlers) {
		this.handlers = handlers;
	}

	attach(): void {
		if (this.attached) {
			return;
		}
		if (typeof window === 'undefined') {
			console.error('InputController.attach', 'window is unavailable');
			return;
		}
		window.addEventListener('keydown', this.handleKeyDown);
		window.addEventListener('keyup', this.handleKeyUp);
		window.addEventListener('blur', this.releaseAll);
		window.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
		window.addEventListener('pointermove', this.handlePointerMove, { passive: false });
		window.addEventListener('pointerup', this.handlePointerUp);
		window.addEventListener('pointercancel', this.handlePointerUp);
		this.attached = true;
	}

	detach(): void {
		if (!this.attached) {
			return;
		}
		if (typeof window === 'undefined') {
			this.attached = false;
			return;
		}
		window.removeEventListener('keydown', this.handleKeyDown);
		window.removeEventListener('keyup', this.handleKeyUp);
		window.removeEventListener('blur', this.releaseAll);
		window.removeEventListener('pointerdown', this.handlePointerDown);
		window.removeEventListener('pointermove', this.handlePointerMove);
		window.removeEventListener('pointerup', this.handlePointerUp);
		window.removeEventListener('pointercancel', this.handlePointerUp);
		this.releaseAll();
		this.attached = false;
	}

	/**
	 * The direction key held down most recently, or null. Applied every frame, so a held key
	 * steers even when its press fell into a pause, a death or a fade, and releasing the
	 * latest key falls back to one still held.
	 */
	get heldDirection(): InputDirection | null {
		if (this.held.length > 0) {
			return this.held[this.held.length - 1] ?? null;
		}
		return this.padHeld ?? this.swipe.held;
	}

	/**
	 * The on-screen pad: a direction while a finger is on it (turning as it slides round), null
	 * when it lets go. A new direction is a press, as a key's.
	 */
	steer(direction: InputDirection | null): void {
		if (direction === this.padHeld) {
			return;
		}
		this.padHeld = direction;
		if (direction) {
			this.pressDirection(direction);
		}
	}

	pressDirection(direction: InputDirection): void {
		this.handlers.direction?.(direction);
	}

	pressConfirm(): void {
		this.handlers.confirm?.();
	}

	pressFire(): void {
		this.handlers.fire?.();
	}

	releaseFire(): void {
		this.handlers.fireRelease?.();
	}

	pressPause(): void {
		this.handlers.pause?.();
	}

	pressMenu(): void {
		this.handlers.menu?.();
	}

	pressProfile(): void {
		this.handlers.profile?.();
	}

	private handleKeyDown = (event: KeyboardEvent): void => {
		if (event.repeat) {
			if (DIRECTION_KEYS[event.code]) {
				event.preventDefault();
			}
			return;
		}
		const direction = DIRECTION_KEYS[event.code];
		if (direction) {
			this.held = this.held.filter((d) => d !== direction);
			this.held.push(direction);
		}
		switch (event.code) {
			case 'ArrowUp':
			case 'KeyW':
				event.preventDefault();
				this.pressDirection('UP');
				break;
			case 'ArrowDown':
			case 'KeyS':
				event.preventDefault();
				this.pressDirection('DOWN');
				break;
			case 'ArrowLeft':
			case 'KeyA':
				event.preventDefault();
				this.pressDirection('LEFT');
				break;
			case 'ArrowRight':
			case 'KeyD':
				event.preventDefault();
				this.pressDirection('RIGHT');
				break;
			case 'Enter':
				event.preventDefault();
				this.pressConfirm();
				break;
			case 'ShiftLeft':
			case 'ShiftRight':
			case 'KeyF':
				event.preventDefault();
				this.pressFire();
				break;
			case 'Space':
			case 'KeyP':
				event.preventDefault();
				this.pressPause();
				break;
			case 'KeyH':
				event.preventDefault();
				this.pressProfile();
				break;
			case 'KeyM':
				event.preventDefault();
				this.handlers.mute?.();
				break;
			case 'Backquote':
				if (this.handlers.debugToggle) {
					event.preventDefault();
					this.handlers.debugToggle();
				}
				break;
			case 'F8':
				if (this.handlers.debugStep) {
					event.preventDefault();
					this.handlers.debugStep();
				}
				break;
			default:
				break;
		}
	};

	private handleKeyUp = (event: KeyboardEvent): void => {
		if (event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyF') {
			this.releaseFire();
			return;
		}
		const direction = DIRECTION_KEYS[event.code];
		if (!direction) {
			return;
		}
		// another key for the same direction may still be down (W and ArrowUp): rare, ignored
		this.held = this.held.filter((d) => d !== direction);
	};

	private handlePointerDown = (event: PointerEvent): void => {
		if (event.pointerType === 'mouse' || !this.steersAt(event.target)) {
			return;
		}
		const side = Math.min(window.innerWidth || 0, window.innerHeight || 0);
		this.swipe.setThreshold(swipeThreshold(side || 720));
		this.swipe.down(event.pointerId, event.clientX, event.clientY);
	};

	private handlePointerMove = (event: PointerEvent): void => {
		if (event.pointerType === 'mouse' || !this.swipe.active) {
			return;
		}
		const direction = this.swipe.move(event.pointerId, event.clientX, event.clientY);
		if (event.cancelable) {
			event.preventDefault();
		}
		if (direction) {
			this.pressDirection(direction);
		}
	};

	private handlePointerUp = (event: PointerEvent): void => {
		this.swipe.up(event.pointerId);
	};

	/** Whether a touch that lands on `target` steers (not on a button, the dial or the pad). */
	private steersAt(target: EventTarget | null): boolean {
		const element = target as { closest?: (selector: string) => unknown } | null;
		return !(element && typeof element.closest === 'function' && element.closest(NO_SWIPE));
	}

	private releaseAll = (): void => {
		this.held = [];
		this.padHeld = null;
		this.swipe.reset();
	};
}
