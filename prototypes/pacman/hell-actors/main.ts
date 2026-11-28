// The hell's actors drawn anew, every state on a loop: each card at game scale and enlarged, on a
// plain strip of hell floor. Nothing plays; the states are scripted.
import * as A from './actors';
import type { Dir } from '../hell-kit/paint';

type Ctx = CanvasRenderingContext2D;

const D = Math.min(window.devicePixelRatio || 1, 2);
const GAME_S = 32;
const BIG_S = 72;
const W = 4;
const H = 2;
const DIRS: readonly Dir[] = ['RIGHT', 'DOWN', 'LEFT', 'UP'];

const ease = (a: number, b: number, u: number): number => Math.max(0, Math.min(1, (u - a) / (b - a)));
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

/** A strip of hell floor: dark plates with seams and a little wear. */
function floor(c: Ctx, S: number): void {
	c.fillStyle = '#2a1214';
	c.fillRect(0, 0, W * S, H * S);
	for (let r = 0; r < H; r += 1) {
		for (let q = 0; q < W; q += 1) {
			const v = Math.sin(q * 12.9 + r * 78.2) * 43758.5;
			c.fillStyle = `rgba(80,30,30,${0.15 + 0.15 * (v - Math.floor(v))})`;
			c.fillRect(q * S + 1, r * S + 1, S - 2, S - 2);
		}
	}
	c.strokeStyle = 'rgba(0,0,0,.35)';
	c.lineWidth = 1;
	for (let q = 1; q < W; q += 1) {
		c.beginPath();
		c.moveTo(q * S, 0);
		c.lineTo(q * S, H * S);
		c.stroke();
	}
}

/** The hero as a plain marker (the eyes have to follow something). */
function heroDot(c: Ctx, x: number, y: number, S: number): void {
	c.fillStyle = '#ffb02a';
	c.beginPath();
	c.arc(x, y, S * 0.26, 0, Math.PI * 2);
	c.fill();
	c.strokeStyle = '#14080a';
	c.lineWidth = Math.max(1.2, S * 0.05);
	c.stroke();
}

interface Card {
	readonly title: string;
	readonly note?: string;
	readonly period: number;
	/** u 0..1 through the loop, t the time; X/Y give a tile's centre (tx 0..3, ty 0..1). */
	scene(c: Ctx, S: number, X: (tx: number) => number, Y: (ty: number) => number, u: number, t: number): void;
}

const boss = (phase: 1 | 2 | 3, mode: A.BossMode, dir: Dir, k: number, look: A.Look): A.BossState => ({ phase, mode, dir, k, look });

const BOSS: readonly Card[] = [
	{
		title: 'Погоня: четыре стороны',
		note: 'дышит, наклоняется в сторону хода, юбка волной назад',
		period: 4,
		scene: (c, S, X, Y, u, t) => {
			const dir = DIRS[Math.floor(u * 4)];
			A.drawBoss(c, X(1.5), Y(0.5), S, t, boss(1, 'chase', dir, 0, { x: 1, y: 0 }));
		}
	},
	{
		title: 'Взгляд не отпускает героя',
		note: 'зрачки следят за героем, куда бы он ни шёл',
		period: 4,
		scene: (c, S, X, Y, u, t) => {
			const a = u * Math.PI * 2;
			const hx = 1.5 + Math.cos(a) * 1.6;
			const hy = 0.5 + Math.sin(a) * 0.45;
			heroDot(c, X(hx), Y(hy), S);
			A.drawBoss(c, X(1.5), Y(0.5), S, t, boss(1, 'chase', 'LEFT', 0, { x: hx - 1.5, y: hy - 0.5 }));
		}
	},
	{
		title: 'Рывок: присел → бросок → отдышка',
		note: 'перед рывком приседает и щурится, в броске вытягивается и ревёт',
		period: 2.6,
		scene: (c, S, X, Y, u, t) => {
			heroDot(c, X(3.5), Y(0.5), S);
			if (u < 0.45) A.drawBoss(c, X(0.5), Y(0.5), S, t, boss(1, 'windup', 'RIGHT', ease(0, 0.4, u), { x: 1, y: 0 }));
			else if (u < 0.65) A.drawBoss(c, X(lerp(0.5, 2.4, ease(0.45, 0.65, u))), Y(0.5), S, t, boss(1, 'dash', 'RIGHT', 1, { x: 1, y: 0 }));
			else A.drawBoss(c, X(2.4), Y(0.5), S, t, boss(1, 'recover', 'RIGHT', 0, { x: 1, y: 0 }));
		}
	},
	{
		title: 'Удар по площади: заряд → крик',
		note: 'раздувается, глаза горят; потом ревёт и сдувается',
		period: 2.4,
		scene: (c, S, X, Y, u, t) => {
			heroDot(c, X(3.5), Y(1.5) - S, S);
			const mode = u < 0.55 ? 'charge' : 'cast';
			const k = u < 0.55 ? ease(0, 0.55, u) : ease(0.55, 1, u);
			A.drawBoss(c, X(1.5), Y(0.5), S, t, boss(2, mode, 'RIGHT', k, { x: 1, y: 0 }));
		}
	},
	{
		title: 'Получил удар',
		note: 'жмурится, рога дёргаются, отлетает',
		period: 1.2,
		scene: (c, S, X, Y, u, t) => {
			heroDot(c, X(0.5), Y(0.5), S);
			A.drawBoss(c, X(2), Y(0.5), S, t, boss(2, u < 0.5 ? 'hit' : 'chase', 'LEFT', ease(0, 0.5, u), { x: -1, y: 0 }));
		}
	},
	{
		title: 'Оглушён',
		note: 'осел, покачивается, глаза-спирали, брови домиком',
		period: 3,
		scene: (c, S, X, Y, _u, t) => A.drawBoss(c, X(1.5), Y(0.5), S, t, boss(2, 'stunned', 'DOWN', 0, { x: 0, y: 1 }))
	},
	{
		title: 'Попал по герою: злорадство',
		note: 'ухмылка во все зубы, подпрыгивает',
		period: 2,
		scene: (c, S, X, Y, _u, t) => {
			heroDot(c, X(0.5), Y(0.5), S);
			A.drawBoss(c, X(2), Y(0.5), S, t, boss(3, 'gloat', 'LEFT', 0, { x: -1, y: 0 }));
		}
	},
	{
		title: 'Предвестие раскола',
		note: 'трясётся, трещины разгораются',
		period: 2.4,
		scene: (c, S, X, Y, u, t) => A.drawBoss(c, X(1.5), Y(0.5), S, t, boss(3, 'omen', 'DOWN', u, { x: 0, y: 1 }))
	},
	{
		title: 'Фазы 1 · 2 · 3',
		note: 'вторая — светящиеся трещины, третья — рога длиннее и дымятся, кожа темнее',
		period: 4,
		scene: (c, S, X, Y, _u, t) => {
			([1, 2, 3] as const).forEach((p, i) => A.drawBoss(c, X(0.5 + i * 1.25), Y(0.5), S, t + i, boss(p, 'chase', 'DOWN', 0, { x: 0, y: 1 })));
		}
	}
];

const imp = (kind: 0 | 1 | 2, mode: A.ImpMode, dir: Dir, k: number, seed: number): A.ImpState => ({ kind, mode, dir, k, seed });

const IMPS: readonly Card[] = [
	{
		title: 'Скачут (Пинки, Инки, Клайд)',
		note: 'вприпрыжку, каждый в своём ритме; хвост-плётка, хитрая ухмылка',
		period: 3,
		scene: (c, S, X, Y, u, t) => {
			([0, 1, 2] as const).forEach((kind, i) => A.drawImp(c, X(((u * 4 + i * 1.3) % 4)), Y(0.35 + (i % 2) * 0.75), S, t, imp(kind, 'walk', 'RIGHT', 0, i * 0.37)));
		}
	},
	{
		title: 'Четыре стороны',
		period: 4,
		scene: (c, S, X, Y, u, t) => A.drawImp(c, X(1.5), Y(0.5), S, t, imp(0, 'walk', DIRS[Math.floor(u * 4)], 0, 0))
	},
	{
		title: 'Испуг: герой с оружием рядом',
		note: 'глаза круглые, дрожит и пятится',
		period: 2,
		scene: (c, S, X, Y, _u, t) => {
			heroDot(c, X(0.5), Y(0.5), S);
			A.drawImp(c, X(1.6), Y(0.5), S, t, imp(1, 'scared', 'LEFT', 0, 0));
		}
	},
	{
		title: 'Появление',
		note: 'выскакивает из трещины в полу',
		period: 1.6,
		scene: (c, S, X, Y, u, t) => A.drawImp(c, X(1.5), Y(0.5), S, t, imp(2, u < 0.6 ? 'spawn' : 'walk', 'DOWN', ease(0, 0.6, u), 0))
	}
];

const ghost = (kind: 0 | 1 | 2 | 3, mode: A.GhostMode, dir: Dir, k: number): A.GhostState => ({ kind, mode, dir, k });

const GHOSTS: readonly Card[] = [
	{
		title: 'Четверо: характеры',
		note: 'Блинки хмурится, Пинки щурится с ухмылкой, у Инки бегают глаза, Клайд косит и разинул рот',
		period: 4,
		scene: (c, S, X, Y, _u, t) => ([0, 1, 2, 3] as const).forEach((k) => A.drawGhost(c, X(k), Y(0.5), S, t, ghost(k, 'walk', 'RIGHT', 0)))
	},
	{
		title: 'Ход: четыре стороны',
		note: 'ноги шагают, раз в несколько клеток капля крови',
		period: 4,
		scene: (c, S, X, Y, u, t) => A.drawGhost(c, X(1.5), Y(0.5), S, t, ghost(0, 'walk', DIRS[Math.floor(u * 4)], 0))
	},
	{
		title: 'Испуг и мигание',
		note: 'синие, дрожат, глаза-точки, рот волной; в конце мигают белым',
		period: 3,
		scene: (c, S, X, Y, u, t) => ([0, 1, 2, 3] as const).forEach((k) => A.drawGhost(c, X(k), Y(0.5), S, t, ghost(k, u < 0.5 ? 'fright' : 'blink', 'LEFT', 0)))
	},
	{
		title: 'Слияние на ядре',
		note: 'вытягиваются каплей и тают',
		period: 2,
		scene: (c, S, X, Y, u, t) => A.drawGhost(c, X(1.5), Y(0.5), S, t, ghost(2, 'merge', 'DOWN', ease(0, 0.9, u)))
	}
];

// ── the page ─────────────────────────────────────────────────────────────────────────────────────

const live: Array<(t: number) => void> = [];

function canvas(w: number, h: number, label: string): [HTMLCanvasElement, Ctx] {
	const cv = document.createElement('canvas');
	cv.width = Math.round(w * D);
	cv.height = Math.round(h * D);
	cv.style.width = `${w}px`;
	cv.style.aspectRatio = `${w} / ${h}`;
	cv.setAttribute('role', 'img');
	cv.setAttribute('aria-label', label);
	const ctx = cv.getContext('2d') as Ctx;
	ctx.setTransform(D, 0, 0, D, 0, 0);
	return [cv, ctx];
}

function cardEl(card: Card): HTMLElement {
	const el = document.createElement('figure');
	el.className = 'card';
	const views = document.createElement('div');
	views.className = 'views';
	const pair = [GAME_S, BIG_S].map((S) => {
		const [cv, ctx] = canvas(W * S, H * S, `${card.title}, тайл ${S} px`);
		views.append(cv);
		return { ctx, S };
	});
	el.append(views);
	el.insertAdjacentHTML('beforeend', `<figcaption><b>${card.title}</b>${card.note ? ` — ${card.note}` : ''}</figcaption>`);
	live.push((t) => {
		const u = (t % card.period) / card.period;
		for (const { ctx, S } of pair) {
			ctx.clearRect(0, 0, W * S, H * S);
			floor(ctx, S);
			card.scene(ctx, S, (tx) => (tx + 0.5) * S, (ty) => (ty + 0.5) * S, u, t);
		}
	});
	return el;
}

const root = document.getElementById('sections') as HTMLElement;
for (const [id, title, note, cards] of [
	['boss', 'Босс: Блинки, повелитель ада', 'Каждое состояние — своё тело и лицо: подготовка к атаке видна по телу раньше, чем по полу.', BOSS],
	['imps', 'Импы', 'Маленькие пакостники: прыгают, хлещут хвостом, ухмыляются; боятся героя с оружием.', IMPS],
	['ghosts', 'Призраки раскола', 'Освежёванные четверо: характер у каждого в глазах, как в аркаде.', GHOSTS]
] as const) {
	const s = document.createElement('section');
	s.id = id;
	s.innerHTML = `<header><h2>${title}</h2><p>${note}</p></header>`;
	const grid = document.createElement('div');
	grid.className = 'grid';
	cards.forEach((c) => grid.append(cardEl(c)));
	s.append(grid);
	root.append(s);
}

const frozen = new URLSearchParams(location.search).get('t');
const start = performance.now();
const tick = (now: number): void => {
	const t = frozen !== null ? Number(frozen) : (now - start) / 1000;
	for (const paint of live) paint(t);
	if (frozen === null) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
