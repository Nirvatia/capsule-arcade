// How a squad creature is drawn moving (DESIGN.md §7a): the logic moves it tile by tile on rails
// and turns it at once at a tile's centre; the drawing glides. The drawn point trails the real one
// a little (at most `lag` tiles, so a touch still reads true), which rounds every corner into an
// arc; the head turns towards where the body goes at a limited rate; the body's clock (its swim)
// runs with its travel, slow at rest. A jump (a tunnel, back to the lair) is taken at once.

export const MOTION_TUNE = {
	/** The drawn point's time constant, s, and the most it may trail, tiles. */
	follow: 0.06,
	lag: 0.15,
	/** The head's turn, radians per second at most. */
	turn: 9,
	/** A step longer than this is a jump, tiles. */
	jump: 1.5,
	/** The body's clock: its rate at rest, and at full speed (tiles per second). */
	idle: 0.35,
	fullSpeed: 6
} as const;

export class CreatureMotion {
	x = 0;
	y = 0;
	heading = 0;
	/** The body's clock, s. */
	clock = 0;
	private started = false;
	private lastX = 0;
	private lastY = 0;

	/** One frame: `x`, `y` the real position (tiles), `facing` its heading when known. */
	update(dt: number, x: number, y: number, facing: number | null): void {
		if (!this.started || Math.hypot(x - this.lastX, y - this.lastY) > MOTION_TUNE.jump) {
			this.started = true;
			this.x = x;
			this.y = y;
			this.lastX = x;
			this.lastY = y;
			if (facing !== null) this.heading = facing;
			return;
		}
		const speed = dt > 0 ? Math.hypot(x - this.lastX, y - this.lastY) / dt : 0;
		this.lastX = x;
		this.lastY = y;
		const px = this.x;
		const py = this.y;
		const k = 1 - Math.exp(-dt / MOTION_TUNE.follow);
		this.x += (x - this.x) * k;
		this.y += (y - this.y) * k;
		// never more than `lag` behind
		const dx = x - this.x;
		const dy = y - this.y;
		const d = Math.hypot(dx, dy);
		if (d > MOTION_TUNE.lag) {
			this.x = x - (dx / d) * MOTION_TUNE.lag;
			this.y = y - (dy / d) * MOTION_TUNE.lag;
		}
		// the head follows the drawn body's way (the real heading when it stands)
		const vx = this.x - px;
		const vy = this.y - py;
		const want = Math.hypot(vx, vy) > 1e-4 ? Math.atan2(vy, vx) : facing;
		if (want !== null) {
			let diff = want - this.heading;
			while (diff > Math.PI) diff -= Math.PI * 2;
			while (diff < -Math.PI) diff += Math.PI * 2;
			const step = MOTION_TUNE.turn * dt;
			this.heading += Math.max(-step, Math.min(step, diff));
		}
		const pace = Math.min(1, speed / MOTION_TUNE.fullSpeed);
		this.clock += dt * (MOTION_TUNE.idle + (1 - MOTION_TUNE.idle) * pace);
	}
}
