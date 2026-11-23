// The tunnel pads as burrows the hero dives into, one per season (the owner's pick, 2026-11-23):
// winter an ice hole, autumn a hollow stump, spring a stone well, summer a whirlpool in the sand.
// Baked under the live ripple (`ripplePad`), which stays translucent so the burrow shows through.
// Centred on the pad, within ~11 units (the pad's tile is 24).
const TAU = Math.PI * 2;
type C2 = CanvasRenderingContext2D;

function ring(
	b: C2,
	x: number,
	y: number,
	r0: number,
	r1: number,
	fill: string | CanvasGradient
): void {
	b.fillStyle = fill;
	b.beginPath();
	b.arc(x, y, r1, 0, TAU);
	b.arc(x, y, r0, 0, TAU, true);
	b.fill('evenodd');
}

function hole(b: C2, x: number, y: number, r: number, inner: string, outer: string): void {
	const g = b.createRadialGradient(x - r * 0.2, y - r * 0.25, 0, x, y, r);
	g.addColorStop(0, inner);
	g.addColorStop(1, outer);
	b.fillStyle = g;
	b.beginPath();
	b.arc(x, y, r, 0, TAU);
	b.fill();
}

/** An uneven loop round (x, y): `r` with a seeded wobble. */
function wobbly(b: C2, x: number, y: number, r: number, amp: number, seed: number): void {
	b.beginPath();
	for (let i = 0; i <= 28; i += 1) {
		const a = (i / 28) * TAU;
		const m = r + amp * (Math.sin(a * 3 + seed) * 0.6 + Math.sin(a * 7 + seed * 2) * 0.4);
		if (i) b.lineTo(x + Math.cos(a) * m, y + Math.sin(a) * m);
		else b.moveTo(x + Math.cos(a) * m, y + Math.sin(a) * m);
	}
	b.closePath();
}

/** Winter: a hole cut in the ice, a thick white rim with cracks, dark water. */
export function iceHole(b: C2, x: number, y: number): void {
	wobbly(b, x, y, 11.2, 0.8, 1);
	b.fillStyle = '#e8f2fa';
	b.fill();
	b.strokeStyle = 'rgba(90,120,160,.5)';
	b.lineWidth = 0.6;
	b.stroke();
	b.strokeStyle = 'rgba(120,150,190,.55)';
	b.lineWidth = 0.5;
	for (let i = 0; i < 6; i += 1) {
		const a = (i / 6) * TAU + 0.3;
		b.beginPath();
		b.moveTo(x + Math.cos(a) * 8, y + Math.sin(a) * 8);
		b.lineTo(x + Math.cos(a + 0.15) * 10.5, y + Math.sin(a + 0.15) * 10.5);
		b.stroke();
	}
	wobbly(b, x, y, 7.8, 0.6, 4);
	b.fillStyle = '#16324e';
	b.fill();
	hole(b, x, y, 7, '#2e5a80', '#0e2238');
}

/** Autumn: a hollow stump seen from above: bark, the year rings, the dark hollow. */
export function hollowStump(b: C2, x: number, y: number): void {
	wobbly(b, x, y, 11.4, 0.9, 2);
	b.fillStyle = '#5a3a22';
	b.fill();
	ring(b, x, y, 6.8, 9.8, '#c49a62');
	b.strokeStyle = 'rgba(120,80,40,.55)';
	b.lineWidth = 0.5;
	for (const rr of [7.6, 8.4, 9.2]) {
		b.beginPath();
		b.arc(x, y, rr, 0, TAU);
		b.stroke();
	}
	hole(b, x, y, 6.8, '#3a2414', '#120a06');
}

/** Spring: a well of light sandstone blocks round dark water. */
export function stoneWell(b: C2, x: number, y: number): void {
	ring(b, x, y, 7, 11.2, '#c9ae80');
	b.strokeStyle = 'rgba(110,86,50,.6)';
	b.lineWidth = 0.6;
	for (let i = 0; i < 10; i += 1) {
		const a = (i / 10) * TAU;
		b.beginPath();
		b.moveTo(x + Math.cos(a) * 7, y + Math.sin(a) * 7);
		b.lineTo(x + Math.cos(a) * 11.2, y + Math.sin(a) * 11.2);
		b.stroke();
	}
	b.beginPath();
	b.arc(x, y, 11.2, 0, TAU);
	b.stroke();
	b.strokeStyle = 'rgba(255,245,220,.5)';
	b.beginPath();
	b.arc(x, y, 10.4, Math.PI * 0.95, Math.PI * 1.6);
	b.stroke();
	hole(b, x, y, 7, '#2a4a52', '#0c1a20');
}

/** Summer: a whirlpool in a sandy dip: the sand's rim, spiral streaks to the dark eye. */
export function sandWhirl(b: C2, x: number, y: number): void {
	wobbly(b, x, y, 11.4, 0.7, 3);
	b.fillStyle = '#e2c890';
	b.fill();
	hole(b, x, y, 8.6, '#3aa0a8', '#0e3a44');
	b.strokeStyle = 'rgba(230,250,250,.55)';
	b.lineWidth = 0.7;
	b.lineCap = 'round';
	for (let i = 0; i < 3; i += 1) {
		b.beginPath();
		for (let j = 0; j <= 20; j += 1) {
			const u = j / 20;
			const a = (i / 3) * TAU + u * Math.PI * 1.6;
			const rr = 8 - u * 6.5;
			const px = x + Math.cos(a) * rr;
			const py = y + Math.sin(a) * rr;
			if (j) b.lineTo(px, py);
			else b.moveTo(px, py);
		}
		b.stroke();
	}
}
