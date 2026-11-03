import { Action } from '../core/types';

export interface GestureTarget {
	tap(action: Action): void;
}

const TAP_MAX_MS = 260;
const TAP_MAX_PX = 12;
const FLICK_SPEED = 0.9;
const STEP_RATIO = 0.85;

export class Gestures {
	private readonly abort = new AbortController();
	private pointerId = -1;
	private startX = 0;
	private startY = 0;
	private anchorX = 0;
	private anchorY = 0;
	private startTime = 0;
	private moved = false;
	private samples: { y: number; t: number }[] = [];

	constructor(
		private readonly element: HTMLElement,
		private readonly target: GestureTarget,
		private readonly cellSize: () => number
	) {}

	attach(): void {
		const signal = this.abort.signal;
		this.element.addEventListener('pointerdown', this.onDown, { signal });
		this.element.addEventListener('pointermove', this.onMove, { signal });
		this.element.addEventListener('pointerup', this.onUp, { signal });
		this.element.addEventListener('pointercancel', this.onCancel, { signal });
	}

	destroy(): void {
		this.abort.abort();
	}

	private readonly onDown = (e: PointerEvent): void => {
		if (e.pointerType === 'mouse' || this.pointerId !== -1) return;
		e.preventDefault();
		this.pointerId = e.pointerId;
		this.startX = this.anchorX = e.clientX;
		this.startY = this.anchorY = e.clientY;
		this.startTime = e.timeStamp;
		this.moved = false;
		this.samples = [{ y: e.clientY, t: e.timeStamp }];
		this.element.setPointerCapture(e.pointerId);
	};

	private readonly onMove = (e: PointerEvent): void => {
		if (e.pointerId !== this.pointerId) return;
		const step = Math.max(8, this.cellSize() * STEP_RATIO);
		this.samples.push({ y: e.clientY, t: e.timeStamp });
		if (this.samples.length > 6) this.samples.shift();

		while (Math.abs(e.clientX - this.anchorX) >= step) {
			const dir = Math.sign(e.clientX - this.anchorX);
			this.target.tap(dir > 0 ? Action.RIGHT : Action.LEFT);
			this.anchorX += dir * step;
			this.anchorY = e.clientY;
			this.moved = true;
		}
		while (e.clientY - this.anchorY >= step * 1.2) {
			this.target.tap(Action.SOFT_DROP);
			this.anchorY += step * 1.2;
			this.anchorX = e.clientX;
			this.moved = true;
		}
	};

	private readonly onUp = (e: PointerEvent): void => {
		if (e.pointerId !== this.pointerId) return;
		this.pointerId = -1;
		const dx = e.clientX - this.startX;
		const dy = e.clientY - this.startY;
		const duration = e.timeStamp - this.startTime;
		const first = this.samples[0];
		const speed = first ? (e.clientY - first.y) / Math.max(1, e.timeStamp - first.t) : 0;

		if (speed > FLICK_SPEED && dy > Math.abs(dx) * 1.5) {
			this.target.tap(Action.HARD_DROP);
			return;
		}
		if (-dy > this.cellSize() * 2.5 && -dy > Math.abs(dx) * 1.5 && !this.moved) {
			this.target.tap(Action.HOLD);
			return;
		}
		if (!this.moved && duration < TAP_MAX_MS && Math.hypot(dx, dy) < TAP_MAX_PX) {
			this.target.tap(Action.ROTATE_CW);
		}
	};

	private readonly onCancel = (e: PointerEvent): void => {
		if (e.pointerId === this.pointerId) this.pointerId = -1;
	};
}
