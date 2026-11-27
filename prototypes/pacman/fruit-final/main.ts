// Prototype, the final look of the fruit heroes (2026-11-27): my fruits (`../fresh-fruit/myFruit`),
// +10% in size, the buff's trail the fizzy liquid ribbon, the calm trail the owner's own, the bow
// redrawn. On the game's summer world, as in play: the maze with its food, four scared or calm
// ghosts, the orange and the watermelon each on a loop of the owner's. The buttons on top: the
// look (calm, buff, the buff running out, the whole fruit of a tunnel), day or night, the maze or
// a large showcase, the pause. `node prototypes/pacman/build.mjs fruit-final`, open the file.
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import { drawCuteGhost } from '../../../src/games/pacman/render/actors/cuteGhost';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { summerTheme } from '../../../src/games/pacman/render/seasons/summer/summerTheme';
import { MY_BODY_RATIO, MyMelon, MyOrange } from '../fresh-fruit/myFruit';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 3);
const params = new URLSearchParams(location.search);
type Look = 'calm' | 'buff' | 'ending' | 'ball';
const st = {
	look: (params.get('look') as Look) || 'buff',
	night: params.has('night') ? 1 : 0,
	stand: params.has('stand'),
	paused: false
};

let vw = 0;
let vh = 0;
const world = new MeadowWorld(GRID_01, summerTheme);
world.setLairGate(0);

const PAC_LOOP = [[8, 16], [16, 16], [16, 20], [20, 20], [20, 22], [22, 22], [22, 24], [2, 24], [2, 22], [4, 22], [4, 20], [8, 20]];
const MS_LOOP = [[6, 11], [8, 11], [8, 10], [16, 10], [16, 11], [18, 11], [18, 6], [20, 6], [20, 4], [22, 4], [22, 2], [14, 2], [14, 4], [10, 4], [10, 2], [2, 2], [2, 4], [4, 4], [4, 6], [6, 6]];

/** A hero running a closed loop of tiles at a steady pace, with its turns told. */
function runner(loop: number[][], speed: number) {
	const segs = loop.map(([c1, r1], i) => {
		const [c2, r2] = loop[(i + 1) % loop.length];
		return { c1, r1, c2, r2, len: Math.hypot(c2 - c1, r2 - r1), angle: Math.atan2(r2 - r1, c2 - c1), start: 0 };
	});
	let total = 0;
	for (const s of segs) {
		s.start = total;
		total += s.len;
	}
	let dist = 0;
	let last = 0;
	return {
		step(dt: number) {
			dist = (dist + dt * speed) % total;
			let idx = 0;
			for (let i = 0; i < segs.length; i += 1) {
				if (dist >= segs[i].start) idx = i;
				else break;
			}
			const s = segs[idx];
			const f = (dist - s.start) / s.len;
			const turned = idx !== last;
			const prevAngle = segs[last].angle;
			last = idx;
			return { tx: s.c1 + (s.c2 - s.c1) * f + 0.5, ty: s.r1 + (s.r2 - s.r1) * f + 0.5, angle: s.angle, turned, prevAngle };
		}
	};
}
const pacRun = runner(PAC_LOOP, 5.7);
const msRun = runner(MS_LOOP, 5.9);
const pac = new MyOrange();
const ms = new MyMelon();
const showcase = [
	{ hero: new MyOrange(), buff: false, col: 0, row: 0, label: 'апельсин: спокойный' },
	{ hero: new MyMelon(), buff: false, col: 1, row: 0, label: 'арбуз: спокойный' },
	{ hero: new MyOrange(), buff: true, col: 0, row: 1, label: 'апельсин: бафф' },
	{ hero: new MyMelon(), buff: true, col: 1, row: 1, label: 'арбуз: бафф' }
];
const showAngle = new Map<object, number>();

let simT = 0;
let last = -1;
function settleNight(): void {
	world.setMood(0, st.night);
	for (let i = 0; i < 80; i += 1) world.update(0.1);
}

function drawStand(step: number): void {
	const g = ctx.createLinearGradient(0, 0, 0, vh);
	g.addColorStop(0, '#caa66c');
	g.addColorStop(1, '#b98f55');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, vw, vh);
	const top = 54;
	const cw = vw / 2;
	const ch = (vh - top) / 2;
	const R = Math.min(cw * 0.1, ch * 0.2) * (MY_BODY_RATIO / 0.3) * 1.0;
	for (const c of showcase) {
		const x0 = c.col * cw;
		const y0 = top + c.row * ch;
		ctx.fillStyle = 'rgba(20,18,12,.28)';
		ctx.fillRect(x0 + 3, y0 + 3, cw - 6, ch - 6);
		ctx.fillStyle = 'rgba(250,248,242,.95)';
		ctx.font = '600 13px system-ui, sans-serif';
		ctx.fillText(c.label, x0 + 14, y0 + 22);
		const k = Math.sin(simT * 0.9 + c.col * 0.7);
		const angle = Math.cos(simT * 0.9 + c.col * 0.7) >= 0 ? 0 : Math.PI;
		const prev = showAngle.get(c);
		if (prev !== undefined && prev !== angle) c.hero.turnKick(prev);
		showAngle.set(c, angle);
		c.hero.setRadius(R);
		c.hero.update(step, { x: x0 + cw / 2 + k * cw * 0.3, y: y0 + ch / 2 + 8, angle, look: angle, moving: true, power: c.buff, ending: false, season: 'summer' });
		c.hero.draw(ctx);
	}
}

function frame(now: number): void {
	const dt = last < 0 ? 1 / 60 : Math.min(0.05, (now - last) / 1000);
	last = now;
	const step = st.paused ? 0 : dt;
	simT += step;
	if (vw !== window.innerWidth || vh !== window.innerHeight) {
		vw = window.innerWidth;
		vh = window.innerHeight;
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
		view.style.width = `${vw}px`;
		view.style.height = `${vh}px`;
		world.resize(vw, vh, D);
		settleNight();
	}
	world.setMood(0, st.night);
	world.update(step);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#0a0c09';
	ctx.fillRect(0, 0, vw, vh);
	if (st.stand) {
		drawStand(step);
		requestAnimationFrame(frame);
		return;
	}
	world.drawWorld(ctx);
	world.drawMood(ctx);
	const lay = world.layout;
	const S = lay.tileSize;
	const at = (tx: number, ty: number) => ({ x: lay.offsetX + tx * S, y: lay.offsetY + ty * S });
	const buff = st.look === 'buff' || st.look === 'ending';
	const ball = st.look === 'ball';
	const sp = pacRun.step(step);
	const qp = msRun.step(step);
	const pp = { ...at(sp.tx, sp.ty), angle: sp.angle, tx: sp.tx, ty: sp.ty };
	const mp = { ...at(qp.tx, qp.ty), angle: qp.angle, tx: qp.tx, ty: qp.ty };
	if (step > 0) {
		if (sp.turned) pac.turnKick(sp.prevAngle);
		if (qp.turned) ms.turnKick(qp.prevAngle);
	}
	world.drawFood(ctx, () => false, { x: pp.tx, y: pp.ty, angle: pp.angle });
	const gk = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'] as const;
	const ghostTiles = [[6.5, 4.5], [18.5, 8.5], [4.5, 22.5], [20.5, 18.5]];
	const ghostPts = ghostTiles.map(([tx, ty]) => at(tx, ty));
	ghostPts.forEach((p, i) => {
		drawCuteGhost(ctx, p.x, p.y, (S / 25) * 0.78, {
			shape: 'turtle',
			kind: gk[i],
			state: buff ? 'scared' : 'normal',
			flashing: st.look === 'ending',
			white: st.look === 'ending' && Math.floor(simT * 6) % 2 === 0,
			lookX: i % 2 ? -1 : 1,
			lookY: 0,
			time: simT,
			step: simT * 6 + i
		});
	});
	const lookTarget = (pos: { x: number; y: number; angle: number }) => {
		let best: { x: number; y: number } | null = null;
		let bd = S * 5;
		for (const g of ghostPts) {
			const d = Math.hypot(g.x - pos.x, g.y - pos.y);
			if (d < bd) {
				bd = d;
				best = g;
			}
		}
		return best ? Math.atan2(best.y - pos.y, best.x - pos.x) : pos.angle;
	};
	for (const [hero, pos] of [[pac, pp], [ms, mp]] as const) {
		hero.setRadius(S * MY_BODY_RATIO);
		hero.setBall(ball);
		hero.update(step, { x: pos.x, y: pos.y, angle: pos.angle, look: lookTarget(pos), moving: true, power: buff, ending: st.look === 'ending', season: 'summer' });
		hero.draw(ctx);
	}
	requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------------- buttons

interface Group {
	readonly label: string;
	readonly items: ReadonlyArray<[string, () => void, () => boolean]>;
}
const look = (l: Look) => (): void => {
	st.look = l;
};
const groups: Group[] = [
	{
		label: 'Вид героя',
		items: [
			['Спокойный', look('calm'), () => st.look === 'calm'],
			['Бафф', look('buff'), () => st.look === 'buff'],
			['Конец баффа', look('ending'), () => st.look === 'ending'],
			['Целый плод (тоннель)', look('ball'), () => st.look === 'ball']
		]
	},
	{
		label: 'Время',
		items: [
			['День', () => { st.night = 0; settleNight(); }, () => st.night === 0],
			['Ночь', () => { st.night = 1; settleNight(); }, () => st.night === 1]
		]
	},
	{
		label: 'Экран',
		items: [
			['Лабиринт', () => { st.stand = false; }, () => !st.stand],
			['Витрина (крупно)', () => { st.stand = true; }, () => st.stand]
		]
	},
	{
		label: 'Ход',
		items: [
			['Идёт', () => { st.paused = false; }, () => !st.paused],
			['Пауза', () => { st.paused = true; }, () => st.paused]
		]
	}
];
function mountButtons(): void {
	const bar = document.createElement('div');
	bar.style.cssText = 'position:fixed;left:8px;top:8px;display:flex;gap:14px;flex-wrap:wrap;padding:6px 10px;border-radius:8px;background:rgba(16,18,14,.84);font:600 12px system-ui,sans-serif;color:#e8e2d4;z-index:5';
	const paint: Array<() => void> = [];
	for (const g of groups) {
		const row = document.createElement('div');
		row.style.cssText = 'display:flex;gap:4px;align-items:center';
		const lab = document.createElement('span');
		lab.textContent = g.label;
		lab.style.opacity = '.65';
		row.append(lab);
		for (const [text, run, on] of g.items) {
			const b = document.createElement('button');
			b.textContent = text;
			b.style.cssText = 'font:inherit;padding:3px 9px;border-radius:5px;border:1px solid #555;cursor:pointer';
			b.onclick = () => {
				run();
				paint.forEach((f) => f());
			};
			paint.push(() => {
				b.style.background = on() ? '#e8a23a' : '#2a2d26';
				b.style.color = on() ? '#1a1408' : '#e8e2d4';
			});
			row.append(b);
		}
		bar.append(row);
	}
	document.body.append(bar);
	paint.forEach((f) => f());
}
mountButtons();
requestAnimationFrame(frame);
