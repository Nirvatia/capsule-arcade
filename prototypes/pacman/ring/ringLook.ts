// The quarantine ring, a candidate for the station's fence (the owner, 2026-11-26: the beams
// through walls and the cut on the maze graph go; a boundary that does not depend on the maze's
// matrix). Seen from above, a dome of field over the station: its rim a thin cold circle that may
// cross walls (it is overhead), and where the rim crosses a corridor, a **seal**: a membrane of
// light from wall to wall that he cannot pass. Two fencers stand on the rim as its projectors.
// The tell: the rim grows from the projectors as dashes, thickening while they charge (he may
// slip out); lit, light runs round it; a touch ripples the seal; it fades with a slow flicker.

export interface Ring {
	/** The centre and radius, tiles (cell centres at x + 0.5). */
	readonly cx: number;
	readonly cy: number;
	readonly r: number;
	/** The projectors' angles on the rim, radians. */
	readonly from: readonly number[];
}

/** A step he cannot take: from the open tile inside (a) to the one outside (b). */
export interface Seal {
	readonly ax: number;
	readonly ay: number;
	readonly bx: number;
	readonly by: number;
}

export interface RingPhase {
	/** The tell's charge, 0..1 (0 = none): the rim growing, dashed. */
	readonly charge: number;
	/** Lit, 0..1 (the fade takes it down). */
	readonly lit: number;
	/** A touch on a seal: which, and its age, s. */
	readonly bump: { readonly seal: Seal; readonly age: number } | null;
}

interface Layout {
	readonly tileSize: number;
	readonly offsetX: number;
	readonly offsetY: number;
}

const TAU = Math.PI * 2;
const FIELD = '150, 215, 255';
const CORE = '#e6f6ff';

/** Every step across the rim between two open tiles (the maze only says where the corridors are). */
export function ringSeals(
	open: (x: number, y: number) => boolean,
	cols: number,
	rows: number,
	ring: Ring
): Seal[] {
	const inside = (x: number, y: number) => Math.hypot(x + 0.5 - ring.cx, y + 0.5 - ring.cy) <= ring.r;
	const seals: Seal[] = [];
	for (let y = 0; y < rows; y++) {
		for (let x = 0; x < cols; x++) {
			if (!open(x, y) || !inside(x, y)) continue;
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const bx = x + dx;
				const by = y + dy;
				if (open(bx, by) && !inside(bx, by)) seals.push({ ax: x, ay: y, bx, by });
			}
		}
	}
	return seals;
}

export function drawRing(
	c: CanvasRenderingContext2D,
	L: Layout,
	ring: Ring,
	seals: readonly Seal[],
	ph: RingPhase,
	time: number
): void {
	const S = L.tileSize;
	const cx = L.offsetX + ring.cx * S;
	const cy = L.offsetY + ring.cy * S;
	const R = ring.r * S;
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.lineCap = 'round';

	if (ph.lit > 0) {
		// the dome: a faint cold tint, stronger toward the rim
		const g = c.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
		g.addColorStop(0, `rgba(${FIELD}, 0)`);
		g.addColorStop(1, `rgba(${FIELD}, ${0.1 * ph.lit})`);
		c.fillStyle = g;
		c.beginPath();
		c.arc(cx, cy, R, 0, TAU);
		c.fill();
		// the rim: a soft glow and a thin core
		c.beginPath();
		c.arc(cx, cy, R, 0, TAU);
		c.strokeStyle = `rgba(${FIELD}, ${0.22 * ph.lit})`;
		c.lineWidth = S * 0.28;
		c.stroke();
		c.strokeStyle = `rgba(${FIELD}, ${0.55 * ph.lit})`;
		c.lineWidth = Math.max(1.2, S * 0.06);
		c.stroke();
		// light running round it out of each projector, both ways
		for (const a0 of ring.from) {
			for (const dir of [1, -1]) {
				const a = a0 + dir * ((time * 0.9) % 1) * Math.PI;
				c.beginPath();
				c.arc(cx, cy, R, Math.min(a, a - dir * 0.35), Math.max(a, a - dir * 0.35));
				c.strokeStyle = `rgba(230, 246, 255, ${0.7 * ph.lit})`;
				c.lineWidth = Math.max(1.6, S * 0.1);
				c.stroke();
			}
		}
	} else if (ph.charge > 0) {
		// the tell: the rim grows from the projectors as dashes, thickening as they charge
		const k = ph.charge;
		c.setLineDash([S * (0.15 + 0.35 * k), S * (0.35 - 0.2 * k)]);
		c.lineDashOffset = -time * S * 1.5;
		c.strokeStyle = `rgba(${FIELD}, ${0.3 + 0.45 * k})`;
		c.lineWidth = Math.max(1, S * (0.04 + 0.06 * k));
		for (const a0 of ring.from) {
			const span = (Math.PI / 2) * k + 0.08;
			c.beginPath();
			c.arc(cx, cy, R, a0 - span, a0 + span);
			c.stroke();
		}
		c.setLineDash([]);
	}

	// the seals: a membrane across each corridor where the rim crosses it
	for (const s of seals) {
		const mx = L.offsetX + ((s.ax + s.bx) / 2 + 0.5) * S;
		const my = L.offsetY + ((s.ay + s.by) / 2 + 0.5) * S;
		const across = s.ax === s.bx; // the step is vertical: the membrane lies across x
		const hx = across ? S * 0.5 : 0;
		const hy = across ? 0 : S * 0.5;
		const hit = ph.bump && ph.bump.seal === s ? Math.max(0, 1 - ph.bump.age / 0.6) : 0;
		if (ph.lit > 0) {
			const shimmer = 0.85 + 0.15 * Math.sin(time * 5 + mx * 0.05 + my * 0.07);
			c.beginPath();
			c.moveTo(mx - hx, my - hy);
			c.lineTo(mx + hx, my + hy);
			c.strokeStyle = `rgba(${FIELD}, ${(0.35 + 0.4 * hit) * ph.lit})`;
			c.lineWidth = S * (0.42 + 0.2 * hit);
			c.stroke();
			c.strokeStyle = `rgba(230, 246, 255, ${(0.75 * shimmer + 0.25 * hit) * ph.lit})`;
			c.lineWidth = S * 0.12;
			c.stroke();
			// its two ends sit in the walls as small emitters
			for (const e of [-1, 1]) {
				c.beginPath();
				c.arc(mx + e * hx, my + e * hy, S * 0.09, 0, TAU);
				c.fillStyle = `rgba(230, 246, 255, ${0.9 * ph.lit})`;
				c.fill();
			}
		} else if (ph.charge > 0) {
			c.setLineDash([S * 0.1, S * 0.1]);
			c.beginPath();
			c.moveTo(mx - hx, my - hy);
			c.lineTo(mx + hx, my + hy);
			c.strokeStyle = `rgba(${FIELD}, ${0.55 * ph.charge})`;
			c.lineWidth = Math.max(1, S * 0.06);
			c.stroke();
			c.setLineDash([]);
		}
		if (hit > 0) {
			// the touch: ripples run out of the seal along the corridor, inward
			const dx = s.ax - s.bx;
			const dy = s.ay - s.by;
			for (let i = 0; i < 2; i++) {
				const u = Math.min(1, ph.bump!.age / 0.6 + i * 0.25);
				const rr = S * (0.2 + 0.7 * u);
				const a = Math.atan2(dy, dx);
				c.beginPath();
				c.arc(mx, my, rr, a - 1.0, a + 1.0);
				c.strokeStyle = `rgba(230, 246, 255, ${0.8 * (1 - u)})`;
				c.lineWidth = Math.max(1.2, S * 0.07);
				c.stroke();
			}
		}
	}
	c.restore();
}
