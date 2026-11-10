// The dash's effects around Blinky (the owner's mock-up
// `prototypes/pacman/art/hell-flesh-attacks.html`): the crouch's embers, the skid mark and the
// dust the dash leaves on the floor, the speed lines, and the steam he pants out when it is over
// and he is open to attack. All in screen pixels, `S` a tile.
import { noise } from './hellGhost';

/** The floor marks of one dash: where it began, where it has got to, when it ended. */
export class DashTrack {
	private from: { x: number; y: number } | null = null;
	private to = { x: 0, y: 0 };
	private t0 = 0;
	private endT = -1;
	private recT0 = -1;
	private wasRec = false;

	/** Call every frame with the boss's position in px. */
	update(x: number, y: number, dash: boolean, recover: boolean, time: number): void {
		if (dash) {
			if (!this.from || this.endT >= 0) {
				this.from = { x, y };
				this.t0 = time;
				this.endT = -1;
			}
			this.to = { x, y };
		} else if (this.from && this.endT < 0) {
			this.endT = time;
		}
		if (recover && !this.wasRec) {
			this.recT0 = time;
		}
		this.wasRec = recover;
	}

	/** The skid mark and the dust rings, on the floor under the boss. */
	drawFloor(
		ctx: CanvasRenderingContext2D,
		S: number,
		heading: number,
		x: number,
		y: number,
		time: number
	): void {
		const from = this.from;
		if (from) {
			const fade = this.endT < 0 ? 1 : Math.max(0, 1 - (time - this.endT) / 1.6);
			if (fade <= 0) {
				this.from = null;
			} else {
				const nx = -Math.sin(heading);
				const ny = Math.cos(heading);
				ctx.save();
				ctx.lineCap = 'round';
				ctx.strokeStyle = `rgba(10,2,4,${0.75 * fade})`;
				ctx.lineWidth = S * 0.3;
				ctx.beginPath();
				ctx.moveTo(from.x, from.y);
				ctx.lineTo(this.to.x, this.to.y);
				ctx.stroke();
				ctx.globalCompositeOperation = 'lighter';
				ctx.strokeStyle = `rgba(255,120,40,${0.35 * fade})`;
				ctx.lineWidth = S * 0.05;
				for (const off of [0.14, -0.1]) {
					ctx.beginPath();
					ctx.moveTo(from.x + nx * S * off, from.y + ny * S * off);
					ctx.lineTo(this.to.x + nx * S * off, this.to.y + ny * S * off);
					ctx.stroke();
				}
				ctx.restore();
				const k0 = (time - this.t0) / 0.3;
				if (k0 >= 0 && k0 < 1) {
					ring(
						ctx,
						from.x,
						from.y + S * 0.3,
						S * (0.3 + 1.4 * k0),
						S * (0.12 + 0.5 * k0),
						1 - k0,
						S
					);
				}
			}
		}
		const k1 = (time - this.recT0) / 0.4;
		if (this.recT0 >= 0 && k1 >= 0 && k1 < 1) {
			ring(
				ctx,
				x + Math.cos(heading) * S * 0.5,
				y + S * 0.3,
				S * (0.3 + 1.2 * k1),
				S * (0.1 + 0.4 * k1),
				1 - k1,
				S
			);
		}
	}
}

function ring(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	rx: number,
	ry: number,
	a: number,
	S: number
): void {
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.strokeStyle = `rgba(255,200,140,${0.8 * a})`;
	ctx.lineWidth = S * 0.14 * a + 1;
	ctx.beginPath();
	ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
	ctx.stroke();
	ctx.restore();
}

/** Sparks kicked up behind the boss as he crouches for the dash. */
export function drawCrouchEmbers(
	ctx: CanvasRenderingContext2D,
	S: number,
	heading: number,
	x: number,
	y: number,
	p: number,
	time: number
): void {
	const bx = Math.cos(heading);
	const by = Math.sin(heading);
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	for (let i = 0; i < 8; i += 1) {
		const q = (time * 2 + noise(i, 2)) % 1;
		const back = S * 0.3 + q * S * 0.7;
		const side = (noise(i, 3) - 0.5) * S * 0.5;
		ctx.fillStyle = `rgba(255,150,60,${0.8 * p * (1 - q)})`;
		ctx.fillRect(
			x - bx * back - by * side,
			y - by * back + bx * side + S * 0.3 - q * S * 0.2,
			2.5,
			2.5
		);
	}
	ctx.restore();
}

/** Lines streaming back from the boss while he dashes. */
export function drawSpeedLines(
	ctx: CanvasRenderingContext2D,
	S: number,
	heading: number,
	x: number,
	y: number
): void {
	const bx = Math.cos(heading);
	const by = Math.sin(heading);
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.lineCap = 'round';
	ctx.lineWidth = 1.6;
	for (let i = 0; i < 6; i += 1) {
		const off = (i - 2.5) * S * 0.15;
		const len = S * (1.2 + noise(i, 1) * 0.9);
		const sx = x - bx * S * 0.45 - by * off;
		const sy = y - by * S * 0.45 + bx * off;
		ctx.strokeStyle = `rgba(255,200,140,${0.5 - Math.abs(i - 2.5) * 0.08})`;
		ctx.beginPath();
		ctx.moveTo(sx, sy);
		ctx.lineTo(sx - bx * len, sy - by * len);
		ctx.stroke();
	}
	ctx.restore();
}

/** Steam puffing off the boss while he is open to attack. */
export function drawSteam(
	ctx: CanvasRenderingContext2D,
	S: number,
	x: number,
	y: number,
	time: number
): void {
	ctx.save();
	for (let i = 0; i < 7; i += 1) {
		const q = (time * 0.8 + noise(i, 7)) % 1;
		ctx.fillStyle = `rgba(235,225,215,${0.4 * (1 - q)})`;
		ctx.beginPath();
		ctx.arc(
			x + (noise(i, 8) - 0.5) * S * 0.5,
			y - S * 0.35 - q * S * 0.9,
			S * (0.07 + 0.12 * q),
			0,
			Math.PI * 2
		);
		ctx.fill();
	}
	ctx.restore();
}
