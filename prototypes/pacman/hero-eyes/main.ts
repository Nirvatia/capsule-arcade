// The fruit heroes with candidate eyes: the game's orange and watermelon, their eye (and the
// orange's brow) painted by `eyes.ts` instead. Each card loops both running, blinking, half the
// loop in their power; at game scale (32 px tile) and enlarged.
import { FRUIT_BODY_RATIO, MelonHero, OrangeHero } from '../../../src/games/pacman/render/actors/hero/FruitHero';
import { paintBrow, paintEye } from './eyes';
import type { EyeStyle } from './eyes';

type Ctx = CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const SIZES = [32, 96];

function orange(style: EyeStyle): OrangeHero {
	if (style === 'now') return new OrangeHero();
	return new (class extends OrangeHero {
		protected paintEye(ctx: Ctx, x: number, y: number, r: number, p: number): void {
			const close = Math.max(this.blink >= 0 ? Math.sin((this.blink / 0.13) * Math.PI) : 0, this.squint * 0.75);
			paintEye(ctx, style, x, y, { r, close, gx: this.gazeX * r * 0.3, gy: this.gazeY * r * 0.3, power: p, girl: false });
		}
		protected paintBrow(ctx: Ctx, ex: number, ey: number, er: number, R: number): void {
			paintBrow(ctx, style, ex, ey, er, R);
		}
	})();
}

function melon(style: EyeStyle): MelonHero {
	if (style === 'now') return new MelonHero();
	return new (class extends MelonHero {
		protected paintEye(ctx: Ctx, x: number, y: number, r: number, p: number): void {
			const close = Math.max(this.blink >= 0 ? Math.sin((this.blink / 0.13) * Math.PI) : 0, this.squint * 0.75);
			paintEye(ctx, style, x, y, { r, close, gx: this.gazeX * r * 0.3, gy: this.gazeY * r * 0.3, power: p, girl: true });
		}
	})();
}

const CARDS: ReadonlyArray<{ style: EyeStyle; title: string; note: string }> = [
	{ style: 'now', title: 'В игре сейчас', note: 'выбран B (дерзкий), это он' },
	{ style: 'a', title: 'A: задорный', note: 'высокий овал, большой зрачок и блик, подводка сверху к внешнему углу; у апельсина уверенная дуга брови' },
	{ style: 'b', title: 'B: дерзкий', note: 'верхнее веко опущено наискось к переду, взгляд из-под века; у апельсина резкая бровь прямо над веком, у арбуза стрелка' },
	{ style: 'c', title: 'C: милый', note: 'большой круглый глаз с цветной радужкой (янтарь у него, розовая у неё), два больших блика; маленькая приподнятая бровь' }
];

interface Live {
	readonly heroes: Array<{ hero: OrangeHero | MelonHero; ctx: Ctx; S: number; at: number }>;
}
const live: Live[] = [];

const root = document.getElementById('sections') as HTMLElement;
const section = document.createElement('section');
section.innerHTML = '<header><h2>Глаза</h2><p>Оба героя бегут вправо, моргают; на второй половине круга — в силе (лёд у глаза).</p></header>';
const grid = document.createElement('div');
grid.className = 'grid';
section.append(grid);
root.append(section);

for (const card of CARDS) {
	const el = document.createElement('figure');
	el.className = 'card';
	const views = document.createElement('div');
	views.className = 'views';
	const item: Live = { heroes: [] };
	for (const S of SIZES) {
		const w = S * 3;
		const h = S * 1.4;
		const cv = document.createElement('canvas');
		cv.width = Math.round(w * D);
		cv.height = Math.round(h * D);
		cv.style.width = `${w}px`;
		cv.style.aspectRatio = `${w} / ${h}`;
		cv.setAttribute('aria-label', `${card.title}, тайл ${S} px`);
		const ctx = cv.getContext('2d') as Ctx;
		ctx.setTransform(D, 0, 0, D, 0, 0);
		views.append(cv);
		[orange(card.style), melon(card.style)].forEach((hero, i) => {
			hero.setRadius(S * FRUIT_BODY_RATIO);
			item.heroes.push({ hero, ctx, S, at: i });
		});
	}
	el.append(views);
	el.insertAdjacentHTML('beforeend', `<figcaption><b>${card.title}</b> — ${card.note}</figcaption>`);
	grid.append(el);
	live.push(item);
}

let last = performance.now();
let time = 0;
const tick = (now: number): void => {
	const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
	last = now;
	time += dt;
	const power = time % 6 > 3;
	for (const item of live) {
		const cleared = new Set<Ctx>();
		for (const { hero, ctx, S, at } of item.heroes) {
			if (!cleared.has(ctx)) {
				ctx.fillStyle = '#2a1214';
				ctx.fillRect(0, 0, S * 3, S * 1.4);
				cleared.add(ctx);
			}
			const x = S * (0.8 + at * 1.4);
			const y = S * 0.7;
			hero.update(dt, { x, y, angle: 0, look: 0, moving: true, power, ending: false, season: 'summer' });
			hero.draw(ctx);
		}
	}
	requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
