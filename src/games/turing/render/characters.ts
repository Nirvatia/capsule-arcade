// Customer portraits, drawn into a square of side `s` at the origin.
import { C, FONT_HEAD } from './palette';

export type Customer = 'goose' | 'inspector' | 'owl';

function backdrop(ctx: CanvasRenderingContext2D, s: number, a: string, b: string) {
	const g = ctx.createRadialGradient(s * 0.5, s * 0.35, s * 0.05, s * 0.5, s * 0.5, s * 0.7);
	g.addColorStop(0, a);
	g.addColorStop(1, b);
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.roundRect(0, 0, s, s, s * 0.22);
	ctx.fill();
	// soft floor glow
	ctx.fillStyle = 'rgba(255,255,255,.06)';
	ctx.beginPath();
	ctx.ellipse(s * 0.5, s * 1.02, s * 0.5, s * 0.22, 0, 0, Math.PI * 2);
	ctx.fill();
}

/** Гусь Палочкин: a stern goose accountant with round glasses and a pencil behind the head. */
function goose(ctx: CanvasRenderingContext2D, s: number, t: number) {
	backdrop(ctx, s, '#3b4fa8', '#18204a');
	const k = s / 100;
	const nod = Math.sin(t * 1.6) * 1.2 * k;
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(0, 0, s, s, s * 0.22);
	ctx.clip();
	// body & bow tie
	ctx.fillStyle = '#e9e6df';
	ctx.beginPath();
	ctx.ellipse(62 * k, 108 * k, 36 * k, 26 * k, 0, 0, Math.PI * 2);
	ctx.fill();
	// neck
	ctx.strokeStyle = '#f6f4ef';
	ctx.lineCap = 'round';
	ctx.lineWidth = 22 * k;
	ctx.beginPath();
	ctx.moveTo(62 * k, 96 * k);
	ctx.bezierCurveTo(66 * k, 70 * k, 40 * k, 62 * k, 48 * k, 40 * k + nod);
	ctx.stroke();
	ctx.strokeStyle = 'rgba(160,150,140,.25)';
	ctx.lineWidth = 6 * k;
	ctx.beginPath();
	ctx.moveTo(70 * k, 94 * k);
	ctx.bezierCurveTo(72 * k, 72 * k, 50 * k, 62 * k, 58 * k, 44 * k);
	ctx.stroke();
	ctx.fillStyle = C.pink;
	ctx.beginPath();
	ctx.moveTo(60 * k, 86 * k);
	ctx.lineTo(46 * k, 79 * k);
	ctx.lineTo(46 * k, 93 * k);
	ctx.closePath();
	ctx.moveTo(60 * k, 86 * k);
	ctx.lineTo(74 * k, 79 * k);
	ctx.lineTo(74 * k, 93 * k);
	ctx.closePath();
	ctx.fill();
	ctx.fillStyle = '#c92f6c';
	ctx.beginPath();
	ctx.arc(60 * k, 86 * k, 3.5 * k, 0, Math.PI * 2);
	ctx.fill();
	// pencil behind the head
	ctx.save();
	ctx.translate(58 * k, 26 * k + nod);
	ctx.rotate(0.5);
	ctx.fillStyle = C.sun;
	ctx.fillRect(-4 * k, -2 * k, 30 * k, 7 * k);
	ctx.fillStyle = C.pink;
	ctx.fillRect(26 * k, -2 * k, 5 * k, 7 * k);
	ctx.restore();
	// head
	ctx.fillStyle = '#fbfaf6';
	ctx.beginPath();
	ctx.ellipse(48 * k, 36 * k + nod, 20 * k, 17 * k, -0.15, 0, Math.PI * 2);
	ctx.fill();
	// beak
	ctx.fillStyle = '#ff9a2e';
	ctx.beginPath();
	ctx.moveTo(33 * k, 31 * k + nod);
	ctx.quadraticCurveTo(14 * k, 34 * k + nod, 10 * k, 42 * k + nod);
	ctx.quadraticCurveTo(22 * k, 46 * k + nod, 35 * k, 44 * k + nod);
	ctx.closePath();
	ctx.fill();
	ctx.strokeStyle = '#c96a10';
	ctx.lineWidth = 1.6 * k;
	ctx.beginPath();
	ctx.moveTo(33 * k, 39 * k + nod);
	ctx.lineTo(14 * k, 41 * k + nod);
	ctx.stroke();
	ctx.fillStyle = '#e07b18';
	ctx.beginPath();
	ctx.arc(33 * k, 30 * k + nod, 4 * k, 0, Math.PI * 2);
	ctx.fill();
	// eye + glasses
	ctx.fillStyle = C.ink;
	ctx.beginPath();
	ctx.arc(46 * k, 32 * k + nod, 3.2 * k, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = C.ink;
	ctx.lineWidth = 2.4 * k;
	ctx.beginPath();
	ctx.arc(46 * k, 32 * k + nod, 8 * k, 0, Math.PI * 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(54 * k, 31 * k + nod);
	ctx.lineTo(66 * k, 29 * k + nod);
	ctx.stroke();
	ctx.fillStyle = 'rgba(79,227,255,.25)';
	ctx.beginPath();
	ctx.arc(46 * k, 32 * k + nod, 7 * k, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = 'rgba(255,255,255,.8)';
	ctx.fillRect(42 * k, 27 * k + nod, 3 * k, 3 * k);
	// stern brow
	ctx.strokeStyle = C.ink;
	ctx.lineWidth = 3 * k;
	ctx.beginPath();
	ctx.moveTo(38 * k, 22 * k + nod);
	ctx.lineTo(53 * k, 24 * k + nod);
	ctx.stroke();
	ctx.restore();
}

/** Инспектор Эф: a living office folder with a monocle, a mustache and a form sticking out. */
function inspector(ctx: CanvasRenderingContext2D, s: number, t: number) {
	backdrop(ctx, s, '#5b3fb0', '#1e1648');
	const k = s / 100;
	const b = Math.sin(t * 2) * 1 * k;
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(0, 0, s, s, s * 0.22);
	ctx.clip();
	ctx.translate(0, b);
	// back of folder + tab
	ctx.fillStyle = '#c98f3c';
	ctx.beginPath();
	ctx.roundRect(18 * k, 18 * k, 30 * k, 14 * k, 4 * k);
	ctx.fill();
	ctx.beginPath();
	ctx.roundRect(18 * k, 26 * k, 64 * k, 80 * k, 6 * k);
	ctx.fill();
	// paper sheet
	ctx.save();
	ctx.translate(52 * k, 30 * k);
	ctx.rotate(0.08);
	ctx.fillStyle = C.paperHi;
	ctx.fillRect(-22 * k, -12 * k, 44 * k, 40 * k);
	ctx.fillStyle = 'rgba(26,33,64,.35)';
	for (let i = 0; i < 3; i++) ctx.fillRect(-16 * k, (-6 + i * 6) * k, (26 - i * 6) * k, 2 * k);
	ctx.restore();
	// front of folder
	const g = ctx.createLinearGradient(0, 36 * k, 0, 106 * k);
	g.addColorStop(0, '#f3c46e');
	g.addColorStop(1, '#dca24c');
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.moveTo(14 * k, 40 * k);
	ctx.lineTo(86 * k, 40 * k);
	ctx.lineTo(82 * k, 106 * k);
	ctx.lineTo(18 * k, 106 * k);
	ctx.closePath();
	ctx.fill();
	// label with ƒ
	ctx.fillStyle = C.paperHi;
	ctx.beginPath();
	ctx.roundRect(56 * k, 78 * k, 22 * k, 16 * k, 3 * k);
	ctx.fill();
	ctx.fillStyle = C.ink;
	ctx.font = `italic 700 ${13 * k}px ${FONT_HEAD}`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('ƒ', 67 * k, 87 * k);
	// eyes
	ctx.fillStyle = C.ink;
	ctx.beginPath();
	ctx.arc(36 * k, 58 * k, 3.4 * k, 0, Math.PI * 2);
	ctx.arc(62 * k, 58 * k, 3.4 * k, 0, Math.PI * 2);
	ctx.fill();
	ctx.lineWidth = 2.6 * k;
	ctx.strokeStyle = C.ink;
	ctx.beginPath();
	ctx.moveTo(28 * k, 48 * k);
	ctx.lineTo(42 * k, 51 * k);
	ctx.moveTo(56 * k, 50 * k);
	ctx.lineTo(70 * k, 47 * k);
	ctx.stroke();
	// monocle and chain
	ctx.strokeStyle = C.sun;
	ctx.lineWidth = 2.4 * k;
	ctx.beginPath();
	ctx.arc(62 * k, 58 * k, 9 * k, 0, Math.PI * 2);
	ctx.stroke();
	ctx.fillStyle = 'rgba(255,255,255,.22)';
	ctx.beginPath();
	ctx.arc(62 * k, 58 * k, 8 * k, 0, Math.PI * 2);
	ctx.fill();
	ctx.lineWidth = 1.4 * k;
	ctx.beginPath();
	ctx.moveTo(70 * k, 62 * k);
	ctx.quadraticCurveTo(84 * k, 74 * k, 80 * k, 96 * k);
	ctx.stroke();
	// mustache
	ctx.fillStyle = '#5a3a1c';
	ctx.beginPath();
	ctx.moveTo(49 * k, 68 * k);
	ctx.quadraticCurveTo(38 * k, 64 * k, 30 * k, 74 * k);
	ctx.quadraticCurveTo(40 * k, 71 * k, 49 * k, 73 * k);
	ctx.quadraticCurveTo(58 * k, 71 * k, 68 * k, 74 * k);
	ctx.quadraticCurveTo(60 * k, 64 * k, 49 * k, 68 * k);
	ctx.fill();
	ctx.restore();
}

/** Сова-экзаменатор: a round owl in a mortarboard who says nothing at all. */
function owl(ctx: CanvasRenderingContext2D, s: number, t: number) {
	backdrop(ctx, s, '#1f7a6e', '#0b2b30');
	const k = s / 100;
	const blink = t % 4.2 > 4.05;
	ctx.save();
	ctx.beginPath();
	ctx.roundRect(0, 0, s, s, s * 0.22);
	ctx.clip();
	// body
	const g = ctx.createLinearGradient(0, 30 * k, 0, 110 * k);
	g.addColorStop(0, '#8a7aa8');
	g.addColorStop(1, '#4e4370');
	ctx.fillStyle = g;
	ctx.beginPath();
	ctx.ellipse(50 * k, 72 * k, 34 * k, 40 * k, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.fillStyle = '#d9cdee';
	ctx.beginPath();
	ctx.ellipse(50 * k, 86 * k, 20 * k, 22 * k, 0, 0, Math.PI * 2);
	ctx.fill();
	ctx.strokeStyle = 'rgba(78,67,112,.5)';
	ctx.lineWidth = 2 * k;
	for (let i = 0; i < 3; i++) {
		ctx.beginPath();
		ctx.arc(50 * k, (76 + i * 8) * k, 8 * k, 0.2 * Math.PI, 0.8 * Math.PI);
		ctx.stroke();
	}
	// eyes
	for (const ex of [36, 64]) {
		ctx.fillStyle = '#f7f1ff';
		ctx.beginPath();
		ctx.arc(ex * k, 54 * k, 12 * k, 0, Math.PI * 2);
		ctx.fill();
		if (blink) {
			ctx.strokeStyle = C.ink;
			ctx.lineWidth = 3 * k;
			ctx.beginPath();
			ctx.moveTo((ex - 8) * k, 54 * k);
			ctx.lineTo((ex + 8) * k, 54 * k);
			ctx.stroke();
		} else {
			ctx.fillStyle = C.sun;
			ctx.beginPath();
			ctx.arc(ex * k, 55 * k, 7 * k, 0, Math.PI * 2);
			ctx.fill();
			ctx.fillStyle = C.ink;
			ctx.beginPath();
			ctx.arc(ex * k, 55 * k, 3.6 * k, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	// flat, judging brows
	ctx.fillStyle = '#3a3158';
	ctx.fillRect(22 * k, 39 * k, 26 * k, 4 * k);
	ctx.fillRect(52 * k, 39 * k, 26 * k, 4 * k);
	ctx.fillStyle = '#ff9a2e';
	ctx.beginPath();
	ctx.moveTo(46 * k, 62 * k);
	ctx.lineTo(54 * k, 62 * k);
	ctx.lineTo(50 * k, 70 * k);
	ctx.closePath();
	ctx.fill();
	// mortarboard
	ctx.fillStyle = '#141a33';
	ctx.beginPath();
	ctx.moveTo(50 * k, 14 * k);
	ctx.lineTo(84 * k, 26 * k);
	ctx.lineTo(50 * k, 38 * k);
	ctx.lineTo(16 * k, 26 * k);
	ctx.closePath();
	ctx.fill();
	ctx.fillRect(34 * k, 28 * k, 32 * k, 9 * k);
	ctx.strokeStyle = C.sun;
	ctx.lineWidth = 2 * k;
	ctx.beginPath();
	ctx.moveTo(50 * k, 26 * k);
	ctx.lineTo(78 * k, 30 * k);
	ctx.lineTo(78 * k, 44 * k + Math.sin(t * 2) * 1.5 * k);
	ctx.stroke();
	ctx.fillStyle = C.sun;
	ctx.beginPath();
	ctx.arc(78 * k, 46 * k + Math.sin(t * 2) * 1.5 * k, 3 * k, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
}

export function drawCustomer(ctx: CanvasRenderingContext2D, who: Customer, s: number, t: number) {
	if (who === 'goose') goose(ctx, s, t);
	else if (who === 'inspector') inspector(ctx, s, t);
	else owl(ctx, s, t);
}
