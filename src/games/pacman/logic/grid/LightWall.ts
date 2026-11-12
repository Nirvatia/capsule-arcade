// The wall of light a rider leaves in the grid world (`TRON.md`): a polyline on the maze's
// lines, its corners exactly where the rider turned, its head where he is now, its tail cut at a
// fixed length behind him (so it never trembles: nothing here is sampled by frame time). Tile
// units; the caller feeds the rider's position every frame.

export interface WallPoint {
	readonly x: number;
	readonly y: number;
}

/** A move longer than this in one step is a jump (a respawn): the wall starts again. */
const JUMP = 2;

export class LightWall {
	/** Fixed corners, oldest first; the head is apart. */
	private corners: WallPoint[] = [];
	private head: WallPoint | null = null;
	private lengthValue: number;
	/** Tile units cut off the tail by the last `advance` (the derez feeds on it). */
	private shedValue = 0;
	private tailValue: WallPoint | null = null;

	constructor(length: number) {
		this.lengthValue = Math.max(0, length);
	}

	get length(): number {
		return this.lengthValue;
	}

	/** How far the tail moved in the last step. */
	get shed(): number {
		return this.shedValue;
	}

	/** Where the tail is now (null with no wall yet). */
	get tail(): WallPoint | null {
		return this.tailValue;
	}

	setLength(length: number): void {
		this.lengthValue = Math.max(0, length);
	}

	reset(): void {
		this.corners = [];
		this.head = null;
		this.tailValue = null;
		this.shedValue = 0;
	}

	/** The rider is at (x, y) now. A change of axis since the last step leaves a corner. */
	advance(x: number, y: number): void {
		const next = { x, y };
		const head = this.head;
		if (!head) {
			this.corners = [next];
			this.head = next;
			this.tailValue = next;
			this.shedValue = 0;
			return;
		}
		if (Math.abs(x - head.x) + Math.abs(y - head.y) > JUMP) {
			this.reset();
			this.advance(x, y);
			return;
		}
		const last = this.corners[this.corners.length - 1];
		const wasH = Math.abs(head.x - last.x) > 1e-9;
		const wasV = Math.abs(head.y - last.y) > 1e-9;
		const nowH = Math.abs(x - head.x) > 1e-9;
		const nowV = Math.abs(y - head.y) > 1e-9;
		if ((wasH && nowV) || (wasV && nowH)) {
			// the turn's corner: on the old line, at the new line's position
			this.corners.push(wasH ? { x, y: head.y } : { x: head.x, y });
		} else if (
			(wasH && nowH && Math.sign(x - head.x) !== Math.sign(head.x - last.x)) ||
			(wasV && nowV && Math.sign(y - head.y) !== Math.sign(head.y - last.y))
		) {
			// a reversal folds the wall back on itself: the turning point is a corner
			this.corners.push(head);
		}
		this.head = next;
		this.trim();
	}

	/** The wall from its tail to its head (at least two points, or none). */
	polyline(): WallPoint[] {
		if (!this.head || !this.tailValue) {
			return [];
		}
		if (this.head.x === this.tailValue.x && this.head.y === this.tailValue.y) {
			return [];
		}
		const pts = [this.tailValue, ...this.corners.slice(1), this.head];
		return pts.length >= 2 && this.lengthValue > 0 ? pts : [];
	}

	/** Cuts the corners past the length and puts the tail on the wall exactly that far back. */
	private trim(): void {
		const head = this.head;
		if (!head) return;
		const before = this.tailValue;
		let left = this.lengthValue;
		let from = head;
		for (let i = this.corners.length - 1; i >= 0; i--) {
			const c = this.corners[i];
			const d = Math.abs(from.x - c.x) + Math.abs(from.y - c.y);
			if (d >= left) {
				const k = d > 0 ? left / d : 0;
				const tail = { x: from.x + (c.x - from.x) * k, y: from.y + (c.y - from.y) * k };
				// keep the tail as the oldest corner: the segment it starts stays on its line
				this.corners = [tail, ...this.corners.slice(i + 1)];
				this.tailValue = tail;
				this.shedValue = before ? Math.abs(before.x - tail.x) + Math.abs(before.y - tail.y) : 0;
				return;
			}
			left -= d;
			from = c;
		}
		this.tailValue = this.corners[0];
		this.shedValue = 0;
	}
}

/** The same polyline with `d` tile units cut off its head end (the wall leaves the rider's back). */
export function cutHead(pts: readonly WallPoint[], d: number): WallPoint[] {
	const out = [...pts];
	let left = d;
	while (out.length >= 2 && left > 0) {
		const a = out[out.length - 2];
		const b = out[out.length - 1];
		const len = Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
		if (len > left) {
			const k = (len - left) / len;
			out[out.length - 1] = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
			return out;
		}
		out.pop();
		left -= len;
	}
	return out.length >= 2 ? out : [];
}
