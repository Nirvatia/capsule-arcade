export class GameLoop {
	private accumulator = 0;
	private lastTime = 0;
	private frameId: number | null = null;

	constructor(
		private readonly stepMs: number,
		private readonly maxSteps: number,
		private readonly onUpdate: (dt: number) => void,
		private readonly onRender: (frameMs: number) => void
	) {
		if (!(stepMs > 0) || !(maxSteps > 0)) {
			throw new Error('[Tetris/GameLoop] stepMs and maxSteps must be positive');
		}
	}

	start(): void {
		if (this.frameId !== null) return;
		this.lastTime = performance.now();
		this.accumulator = 0;
		this.frameId = requestAnimationFrame(this.frame);
	}

	stop(): void {
		if (this.frameId !== null) cancelAnimationFrame(this.frameId);
		this.frameId = null;
	}

	private readonly frame = (now: number): void => {
		const frameMs = Math.max(0, Math.min(now - this.lastTime, this.stepMs * this.maxSteps));
		this.lastTime = now;
		this.accumulator += frameMs;
		let steps = 0;
		while (this.accumulator >= this.stepMs && steps < this.maxSteps) {
			this.onUpdate(this.stepMs);
			this.accumulator -= this.stepMs;
			steps++;
		}
		if (steps === this.maxSteps) this.accumulator = 0;
		this.onRender(frameMs);
		this.frameId = requestAnimationFrame(this.frame);
	};
}
