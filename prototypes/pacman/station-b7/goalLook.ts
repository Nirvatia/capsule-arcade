// A candidate for the station's goal mark (the owner, 2026-11-26: the beacon's ellipses look
// poor), in place of `StationLevelRenderer.drawGoal`'s rings and column: the station's own UI
// and the object itself coming alive.
//   the reticle  four steel corner brackets round the tile, a green edge (the HUD's goal green),
//                breathing slowly in and out;
//   the plate    a small riveted steel plate with the goal in stencil (КОНСОЛЬ / ЛЮК), above the
//                tile or below it at the top of the maze;
//   the console  its screen lit green, a holographic chevron over it with scanlines, flickering;
//   the hatch    light spilling out of it into the corridor, hazard stripes running round its
//                frame.
// Screen space; `S` the tile in px, (x, y) the tile's centre.

export type Goal = 'console' | 'hatch';

const GREEN = '157, 255, 214';
const TAU = Math.PI * 2;

function plate(c: CanvasRenderingContext2D, x: number, y: number, S: number, text: string): void {
	c.save();
	c.font = `800 ${Math.round(S * 0.34)}px "Arial Narrow", "Roboto Condensed", ui-sans-serif, sans-serif`;
	const w = Math.max(S * 1.5, c.measureText(text).width + S * 0.7);
	const h = S * 0.5;
	const x0 = x - w / 2;
	const y0 = y - h / 2;
	c.fillStyle = 'rgba(6, 10, 9, 0.6)';
	c.fillRect(x0 + 2, y0 + 3, w, h);
	const g = c.createLinearGradient(0, y0, 0, y0 + h);
	g.addColorStop(0, '#3d4946');
	g.addColorStop(1, '#232b29');
	c.fillStyle = g;
	c.fillRect(x0, y0, w, h);
	c.strokeStyle = '#0b0f0e';
	c.lineWidth = Math.max(1, S * 0.05);
	c.strokeRect(x0, y0, w, h);
	c.fillStyle = 'rgba(210, 230, 222, 0.22)';
	c.fillRect(x0 + 1, y0 + 1, w - 2, Math.max(1, S * 0.03));
	c.fillStyle = 'rgba(150, 168, 160, 0.8)';
	for (const rx of [x0 + S * 0.14, x0 + w - S * 0.14]) {
		c.beginPath();
		c.arc(rx, y, S * 0.045, 0, TAU);
		c.fill();
	}
	c.textAlign = 'center';
	c.textBaseline = 'middle';
	c.fillStyle = `rgb(${GREEN})`;
	c.shadowColor = `rgba(${GREEN}, 0.7)`;
	c.shadowBlur = S * 0.15;
	c.fillText(text, x, y + S * 0.02);
	c.restore();
}

function reticle(c: CanvasRenderingContext2D, x: number, y: number, S: number, t: number): void {
	const half = S * (0.72 + 0.06 * Math.sin(t * 2.2));
	const arm = S * 0.34;
	c.save();
	c.lineCap = 'square';
	for (const [w, col] of [
		[S * 0.17, '#0b0f0e'],
		[S * 0.11, '#56625e'],
		[S * 0.04, `rgba(${GREEN}, 0.95)`]
	] as const) {
		c.strokeStyle = col;
		c.lineWidth = w;
		for (const [sx, sy] of [
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, 1]
		]) {
			c.beginPath();
			c.moveTo(x + sx * half, y + sy * (half - arm));
			c.lineTo(x + sx * half, y + sy * half);
			c.lineTo(x + sx * (half - arm), y + sy * half);
			c.stroke();
		}
	}
	c.restore();
}

function consoleAlive(c: CanvasRenderingContext2D, x: number, y: number, S: number, t: number): void {
	const flick = 0.85 + 0.15 * Math.sin(t * 7.1) * Math.sin(t * 3.3);
	c.save();
	c.globalCompositeOperation = 'lighter';
	// its screen lit green
	const g = c.createRadialGradient(x, y, 0, x, y, S * 0.8);
	g.addColorStop(0, `rgba(${GREEN}, ${0.45 * flick})`);
	g.addColorStop(1, `rgba(${GREEN}, 0)`);
	c.fillStyle = g;
	c.fillRect(x - S, y - S, S * 2, S * 2);
	// the hologram: a chevron over it with scanlines, a thin beam down to the screen
	const hy = y - S * (1.05 + 0.06 * Math.sin(t * 2.2));
	c.beginPath();
	c.moveTo(x - S * 0.38, hy - S * 0.22);
	c.lineTo(x, hy + S * 0.2);
	c.lineTo(x + S * 0.38, hy - S * 0.22);
	c.lineTo(x + S * 0.2, hy - S * 0.22);
	c.lineTo(x, hy - S * 0.02);
	c.lineTo(x - S * 0.2, hy - S * 0.22);
	c.closePath();
	c.fillStyle = `rgba(${GREEN}, ${0.5 * flick})`;
	c.fill();
	c.strokeStyle = `rgba(${GREEN}, ${0.9 * flick})`;
	c.lineWidth = Math.max(1, S * 0.035);
	c.stroke();
	c.globalCompositeOperation = 'source-over';
	c.fillStyle = 'rgba(4, 12, 10, 0.35)';
	for (let k = 0; k < 6; k++) {
		const ly = hy - S * 0.22 + ((k * S * 0.08 + t * S * 0.25) % (S * 0.44));
		c.fillRect(x - S * 0.4, ly, S * 0.8, Math.max(1, S * 0.025));
	}
	c.globalCompositeOperation = 'lighter';
	const beam = c.createLinearGradient(0, hy + S * 0.2, 0, y);
	beam.addColorStop(0, `rgba(${GREEN}, 0.3)`);
	beam.addColorStop(1, `rgba(${GREEN}, 0)`);
	c.fillStyle = beam;
	c.beginPath();
	c.moveTo(x - S * 0.06, hy + S * 0.2);
	c.lineTo(x + S * 0.06, hy + S * 0.2);
	c.lineTo(x + S * 0.3, y);
	c.lineTo(x - S * 0.3, y);
	c.fill();
	c.restore();
}

function hatchAlive(c: CanvasRenderingContext2D, x: number, y: number, S: number, t: number): void {
	c.save();
	c.globalCompositeOperation = 'lighter';
	// light spilling out of it, down into the corridor
	const g = c.createRadialGradient(x, y + S * 0.4, 0, x, y + S * 0.4, S * 1.8);
	g.addColorStop(0, `rgba(${GREEN}, 0.5)`);
	g.addColorStop(0.5, `rgba(${GREEN}, 0.16)`);
	g.addColorStop(1, `rgba(${GREEN}, 0)`);
	c.fillStyle = g;
	c.beginPath();
	c.moveTo(x - S * 0.45, y);
	c.lineTo(x + S * 0.45, y);
	c.lineTo(x + S * 1.3, y + S * 2.2);
	c.lineTo(x - S * 1.3, y + S * 2.2);
	c.closePath();
	c.fill();
	c.restore();
	// hazard stripes running round its frame
	c.save();
	const r = S * 0.5;
	c.beginPath();
	c.rect(x - r - S * 0.12, y - r - S * 0.12, (r + S * 0.12) * 2, (r + S * 0.12) * 2);
	c.rect(x - r, y - r, r * 2, r * 2);
	c.clip('evenodd');
	c.translate(x, y);
	const off = ((t * 0.6) % 1) * S * 0.3;
	for (let k = -8; k < 8; k++) {
		c.fillStyle = k % 2 ? '#141210' : '#e6b23a';
		c.beginPath();
		const u = k * S * 0.15 + off;
		c.moveTo(u - S, -S);
		c.lineTo(u - S + S * 0.15, -S);
		c.lineTo(u + S + S * 0.15, S);
		c.lineTo(u + S, S);
		c.fill();
	}
	c.restore();
}

/** The goal's mark over the light: the object alive, the reticle, the plate. */
export function drawGoalMark(
	c: CanvasRenderingContext2D,
	goal: Goal,
	x: number,
	y: number,
	S: number,
	t: number,
	top: boolean
): void {
	if (goal === 'console') consoleAlive(c, x, y, S, t);
	else hatchAlive(c, x, y, S, t);
	reticle(c, x, y, S, t);
	plate(c, x, top ? y + S * 1.25 : y - S * (goal === 'console' ? 1.75 : 1.25), S, goal === 'console' ? 'КОНСОЛЬ' : 'ЛЮК');
}
