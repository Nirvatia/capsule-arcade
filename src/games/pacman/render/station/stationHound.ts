// The station's hounds on screen (DESIGN.md §7a): bright seekers shaped like arrowheads, a
// burning eye at the tip, thin legs scuttling under a dark wet carapace with a hot edge, a whip of
// a tail streaming behind. Stalking they crouch and creep; before a dash the body rises and the
// eye swells (a held breath, no blink); dashing they stretch and leave a streak; fleeing their
// fire dims. `HoundMotion` smooths the logic's tile-to-tile path into curves for the eye.
import type { Hound } from '../../logic/station/HoundPack';
import { rgba, stationGlow } from './stationColors';

const HOT = '#ff5a1f';
const EYE = '#ffe7a0';

interface Shown {
	x: number;
	y: number;
	heading: number;
	stride: number;
}

/** Each hound's drawn place, eased after its logic place: corners round, nothing snaps. */
export class HoundMotion {
	private readonly shown = new Map<number, Shown>();

	update(hounds: readonly Hound[], dt: number): void {
		const k = 1 - Math.exp(-dt / 0.07);
		const seen = new Set<number>();
		for (const h of hounds) {
			seen.add(h.id);
			const s = this.shown.get(h.id);
			if (!s || Math.hypot(s.x - h.x, s.y - h.y) > 3) {
				// new, or through a vent: no smear across the map
				this.shown.set(h.id, { x: h.x, y: h.y, heading: h.heading, stride: 0 });
				continue;
			}
			s.x += (h.x - s.x) * k;
			s.y += (h.y - s.y) * k;
			let d = h.heading - s.heading;
			while (d > Math.PI) d -= Math.PI * 2;
			while (d < -Math.PI) d += Math.PI * 2;
			s.heading += d * Math.min(1, k * 1.5);
			s.stride += h.speed * dt * 2.2;
		}
		for (const id of [...this.shown.keys()]) {
			if (!seen.has(id)) this.shown.delete(id);
		}
	}

	of(h: Hound): Shown {
		return this.shown.get(h.id) ?? { x: h.x, y: h.y, heading: h.heading, stride: 0 };
	}
}

/** Draws one hound at (x, y) px, tile size S. */
export function drawHound(
	c: CanvasRenderingContext2D,
	h: Hound,
	x: number,
	y: number,
	heading: number,
	stride: number,
	S: number,
	time: number
): void {
	// a little longer than a tile: the body reads at game scale, the legs and tail reach past it
	const u = S * 1.35;
	const dash = h.mode === 'lunge';
	const fleeing = h.mode === 'flee';
	const rise = 1 + h.windup * 0.18;
	const stretch = dash ? 1.25 : h.mode === 'stalk' || h.mode === 'sniff' ? 0.92 : 1;
	const fire = fleeing ? 0.35 : 1;
	c.save();
	c.translate(x, y);
	// its glow on the floor and its shadow
	c.save();
	c.globalCompositeOperation = 'lighter';
	stationGlow(c, 0, 0, u * (0.9 + h.windup * 0.5), HOT, 0.22 * fire + h.windup * 0.25);
	c.restore();
	c.rotate(heading);
	c.scale(stretch * rise, rise);
	c.fillStyle = 'rgba(0,0,0,.45)';
	c.beginPath();
	c.ellipse(-u * 0.02, u * 0.06, u * 0.36, u * 0.2, 0, 0, Math.PI * 2);
	c.fill();
	// a dash leaves a streak
	if (dash) {
		c.save();
		c.globalCompositeOperation = 'lighter';
		const g = c.createLinearGradient(-u * 1.3, 0, 0, 0);
		g.addColorStop(0, rgba(HOT, 0));
		g.addColorStop(1, rgba(HOT, 0.45));
		c.fillStyle = g;
		c.beginPath();
		c.moveTo(0, -u * 0.12);
		c.lineTo(-u * 1.3, 0);
		c.lineTo(0, u * 0.12);
		c.fill();
		c.restore();
	}
	// the tail: a thin whip, waving slow when it creeps, straight when it runs
	const wave = dash ? 0.15 : 1;
	c.lineCap = 'round';
	c.strokeStyle = '#120806';
	c.lineWidth = u * 0.07;
	c.beginPath();
	c.moveTo(-u * 0.18, 0);
	for (let i = 1; i <= 8; i += 1) {
		const k = i / 8;
		c.lineTo(-u * (0.18 + k * 0.55), Math.sin(time * 6 - k * 4 + h.id) * u * 0.09 * k * wave);
	}
	c.stroke();
	c.strokeStyle = rgba(HOT, 0.55 * fire);
	c.lineWidth = u * 0.025;
	c.stroke();
	// legs: two pairs, scuttling with the stride
	c.lineWidth = u * 0.05;
	for (const side of [-1, 1]) {
		for (const [bx, ph] of [
			[u * 0.08, 0],
			[-u * 0.1, Math.PI]
		] as const) {
			const swing = Math.sin(stride * 6 + ph + (side > 0 ? Math.PI / 2 : 0)) * u * 0.1;
			c.beginPath();
			c.moveTo(bx, side * u * 0.08);
			c.lineTo(bx + swing * 0.5 + u * 0.04, side * u * 0.28);
			c.lineTo(bx + swing - u * 0.02, side * u * (0.36 + h.windup * 0.06));
			c.strokeStyle = '#120806';
			c.lineWidth = u * 0.055;
			c.stroke();
			// the joints catch the body's fire
			c.strokeStyle = rgba(HOT, 0.7 * fire);
			c.lineWidth = u * 0.022;
			c.stroke();
		}
	}
	// the carapace: an arrowhead, dark and wet, with a hot edge
	const body = () => {
		c.beginPath();
		c.moveTo(u * 0.42, 0);
		c.quadraticCurveTo(u * 0.1, -u * 0.12, -u * 0.24, -u * 0.22);
		c.lineTo(-u * 0.12, 0);
		c.lineTo(-u * 0.24, u * 0.22);
		c.quadraticCurveTo(u * 0.1, u * 0.12, u * 0.42, 0);
		c.closePath();
	};
	body();
	const g = c.createLinearGradient(0, -u * 0.22, 0, u * 0.22);
	g.addColorStop(0, '#6a3218');
	g.addColorStop(0.5, '#2a120a');
	g.addColorStop(1, '#120604');
	c.fillStyle = g;
	c.fill();
	// it burns from inside: the fire shows through the plates, hottest down the spine
	c.save();
	c.clip();
	c.globalCompositeOperation = 'lighter';
	const inner = c.createLinearGradient(-u * 0.24, 0, u * 0.42, 0);
	inner.addColorStop(0, rgba(HOT, 0.05 * fire));
	inner.addColorStop(0.7, rgba(HOT, (0.35 + h.windup * 0.3) * fire));
	inner.addColorStop(1, rgba(EYE, 0.5 * fire));
	c.fillStyle = inner;
	c.fillRect(-u * 0.3, -u * 0.25, u * 0.75, u * 0.5);
	// the plates' seams across the back
	c.globalCompositeOperation = 'source-over';
	c.strokeStyle = 'rgba(10,4,2,.8)';
	c.lineWidth = Math.max(0.7, u * 0.025);
	for (const k of [0.05, -0.08, -0.18]) {
		c.beginPath();
		c.moveTo(u * k + u * 0.04, -u * 0.2);
		c.quadraticCurveTo(u * k - u * 0.03, 0, u * k + u * 0.04, u * 0.2);
		c.stroke();
	}
	c.restore();
	c.save();
	c.globalCompositeOperation = 'lighter';
	c.strokeStyle = rgba(HOT, 0.85 * fire);
	c.lineWidth = Math.max(1, u * 0.035);
	c.stroke();
	c.restore();
	// a ridge down its back and one hard glint
	c.strokeStyle = 'rgba(255,190,140,.35)';
	c.lineWidth = Math.max(0.6, u * 0.02);
	c.beginPath();
	c.moveTo(u * 0.34, 0);
	c.lineTo(-u * 0.08, 0);
	c.stroke();
	c.fillStyle = 'rgba(255,240,220,.6)';
	c.beginPath();
	c.ellipse(u * 0.12, -u * 0.06, u * 0.08, u * 0.02, -0.25, 0, Math.PI * 2);
	c.fill();
	// the eye at the tip: it swells while the hound holds its breath before a dash
	c.save();
	c.globalCompositeOperation = 'lighter';
	stationGlow(c, u * 0.36, 0, u * (0.22 + h.windup * 0.25), EYE, 0.8 * fire);
	c.fillStyle = rgba(EYE, fire);
	c.beginPath();
	c.arc(u * 0.36, 0, u * (0.045 + h.windup * 0.025), 0, Math.PI * 2);
	c.fill();
	c.restore();
	c.restore();
}
