// The escape's lure (the owner's pick of the `station-b7` page's candidates, 2026-11-26): a green
// signal flare thrown on the deck: the stick, a green fire flickering at its tip, sparks shooting
// up and falling, smoke drifting off. Green so it reads in the alarm's red.

/** The flare's light, for the level's light map. */
export const LURE_RGB = '120, 255, 150';

const TAU = Math.PI * 2;
const TILT = -0.45;
const hash = (a: number, b: number) => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

/** The flare lying at (x, y), `S` the tile's size in px, `fade` 0..1 as it burns out. */
export function drawLureFlare(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	S: number,
	t: number,
	fade: number
): void {
	if (fade <= 0) return;
	const flick = 0.86 + 0.08 * Math.sin(t * 17) + 0.06 * Math.sin(t * 29 + 1);
	c.save();
	c.globalAlpha *= fade;
	c.translate(x, y);
	// smoke drifting off
	for (let i = 0; i < 5; i++) {
		const u = (t * 0.45 + i / 5) % 1;
		c.fillStyle = `rgba(170, 205, 180, ${0.22 * (1 - u)})`;
		c.beginPath();
		c.arc(
			S * 0.14 + Math.sin(u * 3 + i) * S * 0.25 + u * S * 0.3,
			-u * S * 1.1,
			S * (0.12 + 0.32 * u),
			0,
			TAU
		);
		c.fill();
	}
	// the stick
	c.save();
	c.rotate(TILT);
	c.fillStyle = '#2b302d';
	c.fillRect(-S * 0.34, -S * 0.065, S * 0.44, S * 0.13);
	c.fillStyle = '#d8dcd2';
	c.fillRect(-S * 0.2, -S * 0.065, S * 0.06, S * 0.13);
	c.strokeStyle = '#0e100f';
	c.lineWidth = 1;
	c.strokeRect(-S * 0.34, -S * 0.065, S * 0.44, S * 0.13);
	c.restore();
	// the fire at its tip
	const tx = Math.cos(TILT) * S * 0.12;
	const ty = Math.sin(TILT) * S * 0.12;
	c.globalCompositeOperation = 'lighter';
	const g = c.createRadialGradient(tx, ty, 0, tx, ty, S * 1.1);
	g.addColorStop(0, `rgba(170, 255, 180, ${0.85 * flick})`);
	g.addColorStop(0.3, `rgba(80, 240, 120, ${0.45 * flick})`);
	g.addColorStop(1, 'rgba(40, 200, 90, 0)');
	c.fillStyle = g;
	c.beginPath();
	c.arc(tx, ty, S * 1.1, 0, TAU);
	c.fill();
	c.fillStyle = 'rgba(240, 255, 235, 1)';
	c.beginPath();
	c.ellipse(tx, ty, S * 0.13 * flick, S * 0.11 * flick, 0, 0, TAU);
	c.fill();
	// sparks
	for (let i = 0; i < 14; i++) {
		const u = (t * 1.5 + hash(i, 1)) % 1;
		const a = -Math.PI / 2 + (hash(i, 2) - 0.5) * 2.4;
		const sp = S * (0.8 + 0.7 * hash(i, 3));
		c.fillStyle = `rgba(220, 255, 200, ${1 - u})`;
		c.beginPath();
		c.arc(
			tx + Math.cos(a) * sp * u,
			ty + Math.sin(a) * sp * u + S * 1.1 * u * u,
			Math.max(0.8, S * 0.04 * (1 - u)),
			0,
			TAU
		);
		c.fill();
	}
	c.restore();
}
