// Steering by touch: a swipe anywhere on the game turns the hero, and the finger kept down
// keeps steering, as a held key does. A drag that bends turns again without lifting the finger:
// each recognised swipe starts the next one where it ended.

export type SwipeDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

/** The direction of a move (dx, dy) at least `threshold` long, along its longer axis; or null. */
export function swipeDirection(dx: number, dy: number, threshold: number): SwipeDirection | null {
	if (!Number.isFinite(dx) || !Number.isFinite(dy)) {
		return null;
	}
	const ax = Math.abs(dx);
	const ay = Math.abs(dy);
	if (Math.max(ax, ay) < threshold) {
		return null;
	}
	if (ax >= ay) {
		return dx > 0 ? 'RIGHT' : 'LEFT';
	}
	return dy > 0 ? 'DOWN' : 'UP';
}

/** The swipe's length in css px on a screen whose shorter side is `shortSide` px. */
export function swipeThreshold(shortSide: number): number {
	return Math.max(14, Math.min(28, shortSide * 0.035));
}

/**
 * One finger at a time steers. `down` starts a swipe where the finger lands; `move` returns a
 * new direction once the finger has gone far enough (and the swipe restarts there), else
 * null; `up` ends it. `held` is the direction the finger is holding, if any.
 */
export class SwipeTracker {
	private id: number | null = null;
	private x = 0;
	private y = 0;
	private heldValue: SwipeDirection | null = null;

	constructor(private threshold: number) {}

	get held(): SwipeDirection | null {
		return this.heldValue;
	}

	get active(): boolean {
		return this.id !== null;
	}

	setThreshold(value: number): void {
		if (Number.isFinite(value) && value > 0) {
			this.threshold = value;
		}
	}

	down(id: number, x: number, y: number): void {
		if (this.id !== null) {
			// a second finger does not steer
			return;
		}
		this.id = id;
		this.x = x;
		this.y = y;
	}

	move(id: number, x: number, y: number): SwipeDirection | null {
		if (id !== this.id) {
			return null;
		}
		const direction = swipeDirection(x - this.x, y - this.y, this.threshold);
		if (!direction) {
			return null;
		}
		this.x = x;
		this.y = y;
		const changed = direction !== this.heldValue;
		this.heldValue = direction;
		return changed ? direction : null;
	}

	up(id: number): void {
		if (id !== this.id) {
			return;
		}
		this.id = null;
		this.heldValue = null;
	}

	/** Every finger is gone (the window lost focus, the game paused). */
	reset(): void {
		this.id = null;
		this.heldValue = null;
	}
}
