// Prototype: the fruit heroes (the owner's orange and watermelon) on the game's own summer world,
// each walking back and forth along a corridor, to judge how they read, above all in the buff
// ("Ледяной фреш"), at the game's scale. Rows: the owner's version ("was") and the reworked one
// ("now"), then the trail candidates. The buttons on top switch the hero, the buff, the time of
// day and the pause (the query `?m ?calm ?night` only sets where they start).
//   `node prototypes/pacman/build.mjs fresh-fruit`, open the file.
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { summerTheme } from '../../../src/games/pacman/render/seasons/summer/summerTheme';
import { FR_BODY_RATIO, OrangeFreshHero, WatermelonFreshHero } from './freshHeroes';
import { OrangeFreshHero as Orange2, WatermelonFreshHero as Melon2 } from './freshHeroesV2';
import { MY_BODY_RATIO, MyMelon, MyOrange } from './myFruit';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 3);
const params = new URLSearchParams(location.search);
const st = { melon: params.has('m'), buff: !params.has('calm'), night: params.has('night') ? 1 : 0, paused: false, stand: params.has('stand') };

let vw = 0;
let vh = 0;
const world = new MeadowWorld(GRID_01, summerTheme);
world.setLairGate(0);

/** The longest horizontal corridors, one to a row and not on neighbouring rows. */
function corridors(count: number): Array<{ y: number; x0: number; x1: number }> {
	const open = (t: string) => t !== 'WL' && t !== 'ES';
	const best: Array<{ y: number; x0: number; x1: number }> = [];
	GRID_01.forEach((row, y) => {
		let x = 0;
		let top = { y, x0: 0, x1: -1 };
		while (x < row.length) {
			if (!open(row[x])) {
				x += 1;
				continue;
			}
			let e = x;
			while (e + 1 < row.length && open(row[e + 1])) e += 1;
			if (e - x > top.x1 - top.x0) top = { y, x0: x, x1: e };
			x = e + 1;
		}
		if (top.x1 - top.x0 >= 7) best.push(top);
	});
	best.sort((a, b) => b.x1 - b.x0 - (a.x1 - a.x0));
	const chosen: typeof best = [];
	for (const c of best) if (chosen.every((o) => Math.abs(o.y - c.y) > 1)) chosen.push(c);
	return chosen.slice(0, count).sort((a, b) => a.y - b.y);
}

interface Demo {
	readonly label: string;
	readonly hero: { [k: string]: any };
	readonly power: boolean;
	phase: number;
	readonly ratio?: number;
}
let demos: Demo[] = [];
let rows: Array<{ y: number; x0: number; x1: number }> = [];
const prevAngle = new Map<Demo, number>();
interface StandCell {
	readonly label: string;
	readonly hero: { [k: string]: any };
	readonly power: boolean;
	readonly col: number;
	readonly row: number;
	readonly ratio?: number;
}
let stand: StandCell[] = [];
/** The showcase: the owner's reworked hero and mine, calm above and buffed below, large. */
function rebuildStand(): void {
	const Now = st.melon ? Melon2 : Orange2;
	const Mine = st.melon ? MyMelon : MyOrange;
	const mk = (col: number, row: number, label: string, hero: { [k: string]: any }, power: boolean, ratio?: number): StandCell => ({ label, hero, power, col, row, ratio });
	const t1 = new Now();
	t1.trailStyle = 3;
	const t2 = new Now();
	t2.trailStyle = 3;
	stand = [
		mk(0, 0, 'владельца, доработан: спокойный', t1, false),
		mk(1, 0, 'моя версия: спокойный', new Mine(), false, MY_BODY_RATIO),
		mk(0, 1, 'владельца, доработан: бафф', t2, true),
		mk(1, 1, 'моя версия: бафф', new Mine(), true, MY_BODY_RATIO)
	];
}

/** The five rows of the chosen hero: the owner's (was), the reworked (now), three trails. */
function rebuild(): void {
	const name = st.melon ? 'арбуз' : 'апельсин';
	const Was = st.melon ? WatermelonFreshHero : OrangeFreshHero;
	const Now = st.melon ? Melon2 : Orange2;
	const Mine = st.melon ? MyMelon : MyOrange;
	const theirs = new Now();
	theirs.trailStyle = 3;
	demos = [
		{ label: `${name}: было (макет владельца)`, hero: new Was(), power: st.buff, phase: 0 },
		{ label: `${name}: он же, доработан, шипучий шлейф`, hero: theirs, power: st.buff, phase: 0.3 },
		{ label: `${name}: моя версия`, hero: new Mine(), power: st.buff, phase: 0.6, ratio: MY_BODY_RATIO }
	];
	rows = corridors(demos.length);
	prevAngle.clear();
	rebuildStand();
}

let simT = 0;
let last = -1;

function drawStand(step: number): void {
	const g = ctx.createLinearGradient(0, 0, 0, vh);
	g.addColorStop(0, '#caa66c');
	g.addColorStop(1, '#b98f55');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, vw, vh);
	const top = 54;
	const cw = vw / 2;
	const ch = (vh - top) / 2;
	const Rr = Math.min(cw * 0.1, ch * 0.2);
	for (const c of stand) {
		const x0 = c.col * cw;
		const y0 = top + c.row * ch;
		ctx.fillStyle = 'rgba(20,18,12,.28)';
		ctx.fillRect(x0 + 3, y0 + 3, cw - 6, ch - 6);
		ctx.fillStyle = 'rgba(250,248,242,.95)';
		ctx.font = '600 13px system-ui, sans-serif';
		ctx.fillText(c.label, x0 + 14, y0 + 22);
		const k = Math.sin(simT * 0.9 + c.col * 0.7);
		const x = x0 + cw / 2 + k * cw * 0.3;
		const y = y0 + ch / 2 + 8;
		const angle = Math.cos(simT * 0.9 + c.col * 0.7) >= 0 ? 0 : Math.PI;
		const prev = standAngle.get(c);
		if (prev !== undefined && prev !== angle) c.hero.turnKick(prev);
		standAngle.set(c, angle);
		c.hero.setRadius(Rr * (c.ratio ? c.ratio / FR_BODY_RATIO : 1));
		c.hero.update(step, { x, y, angle, look: angle, moving: true, power: c.power, ending: false, season: 'summer' });
		c.hero.draw(ctx);
	}
}
const standAngle = new Map<StandCell, number>();

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
		world.setMood(0, st.night);
		for (let i = 0; i < 80; i += 1) world.update(0.1);
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
	demos.forEach((d, i) => {
		const row = rows[i];
		if (!row) return;
		const len = row.x1 - row.x0 - 1;
		const speed = 4.2;
		const u = ((simT * speed) / len + d.phase) % 2;
		const along = u < 1 ? u : 2 - u;
		const angle = u < 1 ? 0 : Math.PI;
		const tx = row.x0 + 0.5 + along * len + 0.5;
		const x = lay.offsetX + tx * S;
		const info = ((window as unknown as { __rows?: Array<Record<string, number>> }).__rows ??= []);
		info[i] = { x0: lay.offsetX + row.x0 * S, x1: lay.offsetX + (row.x1 + 1) * S, y: lay.offsetY + (row.y + 0.5) * S, S, u, hx: x };
		const y = lay.offsetY + (row.y + 0.5) * S;
		const prev = prevAngle.get(d);
		if (prev !== undefined && prev !== angle) d.hero.turnKick(prev);
		prevAngle.set(d, angle);
		d.hero.setRadius(S * (d.ratio ?? FR_BODY_RATIO));
		d.hero.update(step, { x, y, angle, look: angle, moving: true, power: d.power, ending: false, season: 'summer' });
		d.hero.draw(ctx);
		ctx.fillStyle = 'rgba(16,18,14,.78)';
		const lx = lay.offsetX + (row.x0 + 0.3) * S;
		ctx.font = '600 11px system-ui, sans-serif';
		const w = ctx.measureText(d.label).width + 10;
		ctx.fillRect(lx, y - S * 0.95, w, 15);
		ctx.fillStyle = 'rgba(250,248,242,.94)';
		ctx.fillText(d.label, lx + 5, y - S * 0.95 + 11);
	});
	requestAnimationFrame(frame);
}

// ---------------------------------------------------------------------------------- buttons

interface Group {
	readonly label: string;
	readonly items: ReadonlyArray<[string, () => void, () => boolean]>;
}
function settleNight(): void {
	world.setMood(0, st.night);
	for (let i = 0; i < 80; i += 1) world.update(0.1);
}
const groups: Group[] = [
	{
		label: 'Герой',
		items: [
			['Апельсин', () => { st.melon = false; rebuild(); }, () => !st.melon],
			['Арбуз', () => { st.melon = true; rebuild(); }, () => st.melon]
		]
	},
	{
		label: 'Режим',
		items: [
			['Бафф', () => { st.buff = true; rebuild(); }, () => st.buff],
			['Спокойный', () => { st.buff = false; rebuild(); }, () => !st.buff]
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
		label: 'Вид',
		items: [
			[
				'Лабиринт',
				() => {
					st.stand = false;
				},
				() => !st.stand
			],
			[
				'Витрина (крупно)',
				() => {
					st.stand = true;
				},
				() => st.stand
			]
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
	bar.style.cssText =
		'position:fixed;left:8px;top:8px;display:flex;gap:14px;flex-wrap:wrap;padding:6px 10px;border-radius:8px;background:rgba(16,18,14,.84);font:600 12px system-ui,sans-serif;color:#e8e2d4;z-index:5';
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
rebuild();
mountButtons();
requestAnimationFrame(frame);
