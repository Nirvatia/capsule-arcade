// The play screen, drawn whole on one canvas in logical 1600×900 pixels:
// the world (workshop, tape, carriage) on top, the goal «было → надо» above it, the command
// board as the machine's console below. Almost no words: the picture explains the task.
import { drawCustomer, type Customer } from './characters';
import { U } from './palette';
import type { Arm, Mood } from './robot';
import { drawScene } from './scene';
import {
	bubble,
	drawBoard,
	drawPicker,
	label,
	lamp,
	miniTape,
	panel,
	roundButton,
	stars,
	type BoardModel,
	type Cmd,
	type Lamp
} from './ui';

export const VIEW = { w: 1600, h: 900 } as const;
const WORLD_H = 610;

export interface PlayModel {
	t: number;
	code: string;
	title: string;
	customer: Customer;
	goal: { input: string; output: string };
	tests: Lamp[];
	tape: string[];
	head: number;
	headPos: number;
	focus: number;
	state: number;
	mood: Mood;
	arm?: Arm;
	tilt?: number;
	flash?: { index: number; amount: number };
	board: BoardModel;
	picker?: Partial<Cmd>;
	running: boolean;
	say?: { who: 'robot' | 'customer'; text: string };
	/** 0..1 fade-in of the «готово» overlay */
	win?: number;
	stars: number;
}

export function drawPlayScreen(ctx: CanvasRenderingContext2D, m: PlayModel) {
	const { t } = m;
	// ---- world
	ctx.save();
	ctx.beginPath();
	ctx.rect(0, 0, VIEW.w, WORLD_H);
	ctx.clip();
	const L = drawScene(ctx, VIEW.w, WORLD_H, {
		t,
		cells: m.tape,
		head: m.head,
		headPos: m.headPos,
		focus: m.focus,
		state: `q${m.state}`,
		mood: m.mood,
		arm: m.arm,
		tilt: m.tilt,
		flash: m.flash,
		tileSize: 72
	});
	// darken the top so the HUD and the goal read over the workshop
	const g = ctx.createLinearGradient(0, 0, 0, 230);
	g.addColorStop(0, 'rgba(8,10,16,.85)');
	g.addColorStop(1, 'rgba(8,10,16,0)');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, VIEW.w, 230);
	ctx.restore();

	// ---- HUD: back, level, stars, sound
	roundButton(ctx, 50, 44, 24, 'home');
	label(ctx, m.code, 92, 32, { size: 13, color: U.muted, weight: 600 });
	label(ctx, m.title, 92, 54, { size: 21, font: 'head' });
	stars(ctx, VIEW.w / 2, 46, 15, m.stars);
	roundButton(ctx, VIEW.w - 50, 44, 24, 'sound');

	// ---- goal card: customer, было → надо, test lamps
	const s = 34;
	const inW = [...m.goal.input].length * s * 1.1 - s * 0.1;
	const outW = [...m.goal.output].length * s * 1.1 - s * 0.1;
	const lampsW = m.tests.length * 26;
	const cardW = 20 + 72 + 26 + inW + 80 + outW + 34 + lampsW + 18;
	const cx = (VIEW.w - cardW) / 2;
	const cy = 96;
	panel(ctx, { x: cx, y: cy, w: cardW, h: 96 }, 22, 'rgba(22,27,39,.92)');
	ctx.save();
	ctx.translate(cx + 14, cy + 12);
	drawCustomer(ctx, m.customer, 72, t);
	ctx.restore();
	let x = cx + 20 + 72 + 26;
	const ty = cy + 48 - (s * 1.12) / 2;
	miniTape(ctx, x, ty, s, m.goal.input);
	x += inW + 40;
	ctx.strokeStyle = U.muted;
	ctx.lineWidth = 4;
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	ctx.beginPath();
	ctx.moveTo(x - 16, cy + 48);
	ctx.lineTo(x + 12, cy + 48);
	ctx.moveTo(x + 2, cy + 38);
	ctx.lineTo(x + 13, cy + 48);
	ctx.lineTo(x + 2, cy + 58);
	ctx.stroke();
	x += 40;
	miniTape(ctx, x, ty, s, m.goal.output);
	x += outW + 24;
	ctx.fillStyle = U.line;
	ctx.fillRect(x, cy + 20, 1, 56);
	m.tests.forEach((st, i) => lamp(ctx, x + 22 + i * 26, cy + 48, 7, st, t));

	// ---- console
	const con = { x: 24, y: WORLD_H + 6, w: VIEW.w - 48, h: VIEW.h - WORLD_H - 22 };
	panel(ctx, con, 24);
	const B = drawBoard(ctx, con.x + 28, con.y + 20, m.board, t);
	// controls on the right: back · play · step, reset
	const ccy = con.y + con.h / 2 + 4;
	const px = con.x + con.w - 190;
	roundButton(ctx, px - 104, ccy, 32, 'back');
	roundButton(ctx, px, ccy, 52, m.running ? 'pause' : 'play', {
		primary: true,
		glow: m.running ? 0 : 0.5 + 0.5 * Math.sin(t * 3)
	});
	roundButton(ctx, px + 104, ccy, 32, 'step');
	roundButton(ctx, px + 170, ccy - 64, 20, 'reset');

	// ---- picker
	if (m.board.editing && m.picker) {
		const e = m.board.editing;
		drawPicker(ctx, B.cell(e.q, e.sym), m.board.symbols, m.board.states, m.picker);
	}

	// ---- win
	if (m.win) {
		const k = m.win;
		ctx.save();
		ctx.fillStyle = `rgba(6,8,13,${0.55 * k})`;
		ctx.fillRect(0, 0, VIEW.w, WORLD_H);
		ctx.globalAlpha = k;
		ctx.translate(VIEW.w / 2, 262);
		ctx.rotate(-0.06);
		const sc = 1 + (1 - k) * 0.6;
		ctx.scale(sc, sc);
		ctx.strokeStyle = U.ok;
		ctx.lineWidth = 6;
		ctx.shadowColor = U.ok;
		ctx.shadowBlur = 24;
		ctx.beginPath();
		ctx.roundRect(-190, -54, 380, 108, 22);
		ctx.stroke();
		ctx.shadowBlur = 0;
		label(ctx, 'ГОТОВО', 0, 3, {
			size: 58,
			font: 'head',
			weight: 800,
			color: U.ok,
			align: 'center'
		});
		ctx.restore();
		ctx.save();
		ctx.globalAlpha = k;
		stars(ctx, VIEW.w / 2, 372, 24, m.stars * k);
		ctx.restore();
	}

	// ---- speech
	if (m.say) {
		if (m.say.who === 'robot') {
			const rx = L.robotX + 70 * L.scale;
			bubble(ctx, m.say.text, rx + 14, L.tipY - 150 * L.scale, rx, L.tipY - 100 * L.scale);
		} else {
			bubble(ctx, m.say.text, cx + cardW + 18, cy + 24, cx + cardW + 4, cy + 48);
		}
	}
}
