// The night workshop behind the tape: wall panels, slow gears, machines with lamps, hanging
// lights, a neon sign and dust. Everything is placed relative to w/h so the scene scales.
import { C, FONT_HUD, hash } from './palette';

export interface FactoryOpts {
	t: number;
	/** y of the workshop floor (the belt sits on it) */
	floorY: number;
	sign?: string;
	signColor?: string;
	/** where the sign sits, 0..1 of the width */
	signX?: number;
}

function gear(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	teeth: number,
	rot: number
) {
	ctx.beginPath();
	for (let i = 0; i < teeth * 2; i++) {
		const a0 = rot + (i * Math.PI) / teeth;
		const a1 = rot + ((i + 1) * Math.PI) / teeth;
		const rr = i % 2 ? r * 0.86 : r;
		ctx.lineTo(x + Math.cos(a0 + 0.06) * rr, y + Math.sin(a0 + 0.06) * rr);
		ctx.lineTo(x + Math.cos(a1 - 0.06) * rr, y + Math.sin(a1 - 0.06) * rr);
	}
	ctx.closePath();
	ctx.moveTo(x + r * 0.32, y);
	ctx.arc(x, y, r * 0.32, 0, Math.PI * 2, true);
	ctx.fill('evenodd');
	ctx.lineWidth = r * 0.06;
	ctx.beginPath();
	ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
	ctx.stroke();
}

function lamp(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	floorY: number,
	t: number,
	i: number
) {
	ctx.strokeStyle = '#2a3460';
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.moveTo(x, 0);
	ctx.lineTo(x, y);
	ctx.stroke();
	// light cone
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	const flick = 0.85 + 0.15 * Math.sin(t * 1.3 + i * 2.1);
	const g = ctx.createLinearGradient(0, y, 0, floorY);
	g.addColorStop(0, `rgba(255,214,130,${0.2 * flick})`);
	g.addColorStop(1, 'rgba(255,214,130,0)');
	ctx.fillStyle = g;
	const spread = (floorY - y) * 0.5;
	ctx.beginPath();
	ctx.moveTo(x - 16, y + 10);
	ctx.lineTo(x + 16, y + 10);
	ctx.lineTo(x + spread, floorY);
	ctx.lineTo(x - spread, floorY);
	ctx.closePath();
	ctx.fill();
	ctx.restore();
	// shade
	ctx.fillStyle = '#2e3a6c';
	ctx.beginPath();
	ctx.moveTo(x - 7, y - 4);
	ctx.lineTo(x + 7, y - 4);
	ctx.lineTo(x + 19, y + 11);
	ctx.lineTo(x - 19, y + 11);
	ctx.closePath();
	ctx.fill();
	ctx.save();
	ctx.shadowColor = '#ffd682';
	ctx.shadowBlur = 16;
	ctx.fillStyle = '#ffe7b0';
	ctx.beginPath();
	ctx.ellipse(x, y + 11, 11, 3.5, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

function neonSign(
	ctx: CanvasRenderingContext2D,
	text: string,
	x: number,
	y: number,
	color: string,
	t: number
) {
	ctx.save();
	ctx.font = `700 17px ${FONT_HUD}`;
	const w = ctx.measureText(text).width + 34;
	const h = 34;
	const on = Math.sin(t * 17) > -0.97 || Math.sin(t * 0.7) > 0;
	ctx.fillStyle = 'rgba(8,12,27,.75)';
	ctx.beginPath();
	ctx.roundRect(x - w / 2, y - h / 2, w, h, 10);
	ctx.fill();
	ctx.globalAlpha = on ? 1 : 0.35;
	ctx.shadowColor = color;
	ctx.shadowBlur = 16;
	ctx.strokeStyle = color;
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.roundRect(x - w / 2 + 3, y - h / 2 + 3, w - 6, h - 6, 8);
	ctx.stroke();
	ctx.fillStyle = color;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText(text, x, y + 1);
	ctx.shadowBlur = 0;
	ctx.fillStyle = 'rgba(255,255,255,.75)';
	ctx.fillText(text, x, y + 1);
	ctx.restore();
	// two hanging wires
	ctx.strokeStyle = '#2a3460';
	ctx.lineWidth = 1.5;
	ctx.beginPath();
	ctx.moveTo(x - w / 2 + 14, 0);
	ctx.lineTo(x - w / 2 + 14, y - h / 2);
	ctx.moveTo(x + w / 2 - 14, 0);
	ctx.lineTo(x + w / 2 - 14, y - h / 2);
	ctx.stroke();
}

export function drawFactory(ctx: CanvasRenderingContext2D, w: number, h: number, o: FactoryOpts) {
	const { t, floorY } = o;
	const bg = ctx.createLinearGradient(0, 0, 0, h);
	bg.addColorStop(0, C.night);
	bg.addColorStop(0.65, C.wall);
	bg.addColorStop(1, C.night2);
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, w, h);

	// wall panels with rivets
	const pw = 132;
	for (let x = -((t * 4) % pw), i = 0; x < w; x += pw, i++) {
		ctx.fillStyle = i % 2 ? 'rgba(40,54,110,.22)' : 'rgba(40,54,110,.12)';
		ctx.fillRect(x + 3, h * 0.12, pw - 6, floorY - h * 0.12);
		ctx.fillStyle = 'rgba(150,165,230,.16)';
		for (const ry of [h * 0.12 + 8, floorY - 8]) {
			ctx.beginPath();
			ctx.arc(x + 12, ry, 2, 0, Math.PI * 2);
			ctx.arc(x + pw - 12, ry, 2, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	// slow gears
	ctx.fillStyle = 'rgba(70,85,150,.22)';
	ctx.strokeStyle = 'rgba(8,12,27,.5)';
	gear(ctx, w * 0.07, floorY * 0.42, floorY * 0.36, 14, t * 0.12);
	gear(ctx, w * 0.07 + floorY * 0.52, floorY * 0.2, floorY * 0.2, 9, -t * 0.22 + 0.2);
	gear(ctx, w * 0.93, floorY * 0.5, floorY * 0.3, 12, -t * 0.1);

	// a pipe across the top with joints
	ctx.fillStyle = '#1f2a55';
	ctx.fillRect(0, h * 0.07, w, 9);
	ctx.fillStyle = 'rgba(150,165,230,.2)';
	ctx.fillRect(0, h * 0.07, w, 2);
	for (let x = 60; x < w; x += 220) {
		ctx.fillStyle = '#2b3770';
		ctx.fillRect(x, h * 0.07 - 3, 14, 15);
	}

	// machine silhouettes on the floor, with blinking lamps
	let x = -20;
	for (let i = 0; x < w + 40; i++) {
		const mw = 70 + hash(i) * 90;
		const mh = floorY * (0.25 + hash(i + 9) * 0.3);
		ctx.fillStyle = i % 2 ? '#121a38' : '#0f1631';
		ctx.beginPath();
		ctx.roundRect(x, floorY - mh, mw, mh, [8, 8, 0, 0]);
		ctx.fill();
		ctx.fillStyle = 'rgba(120,140,220,.07)';
		ctx.fillRect(x + 8, floorY - mh + 10, mw - 16, 3);
		const n = 1 + Math.floor(hash(i + 3) * 3);
		for (let k = 0; k < n; k++) {
			const colors = [C.mint, C.pink, C.sun, C.glow];
			const col = colors[Math.floor(hash(i * 7 + k) * 4)];
			const on = Math.sin(t * (1 + hash(i + k) * 2) + i * 3 + k) > -0.2;
			ctx.save();
			ctx.globalAlpha = on ? 0.95 : 0.2;
			ctx.shadowColor = col;
			ctx.shadowBlur = on ? 8 : 0;
			ctx.fillStyle = col;
			ctx.beginPath();
			ctx.arc(x + 14 + k * 12, floorY - mh + 22, 2.6, 0, Math.PI * 2);
			ctx.fill();
			ctx.restore();
		}
		x += mw + 14 + hash(i + 5) * 40;
	}

	// hanging lamps
	const lamps = Math.max(2, Math.round(w / 420));
	for (let i = 0; i < lamps; i++) {
		lamp(ctx, ((i + 0.5) * w) / lamps, h * 0.16 + (i % 2) * 12, floorY, t, i);
	}

	if (o.sign) neonSign(ctx, o.sign, w * (o.signX ?? 0.5), h * 0.28, o.signColor ?? C.glow, t);

	// floor
	const fg = ctx.createLinearGradient(0, floorY, 0, h);
	fg.addColorStop(0, '#0d1330');
	fg.addColorStop(1, '#060915');
	ctx.fillStyle = fg;
	ctx.fillRect(0, floorY, w, h - floorY);
	ctx.save();
	ctx.beginPath();
	ctx.rect(0, floorY, w, 6);
	ctx.clip();
	for (let sx = -20; sx < w; sx += 22) {
		ctx.fillStyle = 'rgba(255,210,74,.5)';
		ctx.beginPath();
		ctx.moveTo(sx, floorY + 6);
		ctx.lineTo(sx + 11, floorY + 6);
		ctx.lineTo(sx + 17, floorY);
		ctx.lineTo(sx + 6, floorY);
		ctx.closePath();
		ctx.fill();
	}
	ctx.restore();

	// dust
	ctx.fillStyle = 'rgba(255,230,180,.5)';
	for (let i = 0; i < 46; i++) {
		const dx = (hash(i) * w + t * (6 + hash(i + 1) * 10)) % w;
		const dy = (hash(i + 2) * floorY + Math.sin(t * 0.6 + i) * 8 + floorY) % floorY;
		ctx.globalAlpha = 0.15 + hash(i + 4) * 0.35;
		ctx.fillRect(dx, dy, 1.6, 1.6);
	}
	ctx.globalAlpha = 1;
}

/** The steel rail the carriage rides on, with brackets up to the ceiling. */
export function drawRail(ctx: CanvasRenderingContext2D, w: number, y: number, shift: number) {
	ctx.fillStyle = '#26305c';
	for (let x = (((shift % 240) + 240) % 240) - 120; x < w + 40; x += 240) {
		ctx.fillRect(x - 3, 0, 6, y);
		ctx.fillRect(x - 12, y - 10, 24, 6);
	}
	const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
	g.addColorStop(0, '#c9d1f2');
	g.addColorStop(0.45, C.rail);
	g.addColorStop(1, '#4b5688');
	ctx.fillStyle = g;
	ctx.fillRect(0, y - 5, w, 10);
	ctx.fillStyle = 'rgba(0,0,0,.35)';
	ctx.fillRect(0, y + 5, w, 3);
}
