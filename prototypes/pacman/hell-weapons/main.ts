// The hell's weapons' art pass, one card per candidate: each plays on a loop over a strip of the real
// hell (the game's `DoomWorld`), at game scale and beside it enlarged. Nothing is played by a player.
import { GRID_DOOM, DOOM_PICKUP_TILES } from '../../../src/games/pacman/config/mazes/doom';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import { PlayerService } from '../../../src/games/pacman/logic/actors/PlayerService';
import { LevelProgress } from '../../../src/games/pacman/logic/level/LevelProgress';
import { ScoreModel } from '../../../src/games/pacman/logic/level/ScoreModel';
import { GridModel } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridService } from '../../../src/games/pacman/logic/maze/GridService';
import { HeroView } from '../../../src/games/pacman/render/actors/HeroView';
import { FRUIT_BODY_RATIO, OrangeHero } from '../../../src/games/pacman/render/actors/hero/FruitHero';
import { chargePainter } from '../../../src/games/pacman/render/actors/hero/heroCharge';
import { pickupSprite } from '../../../src/games/pacman/render/doom/DoomSprites';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { HellBlinkyView } from '../../../src/games/pacman/render/doom/HellBlinkyView';
import { FLESH_KIT } from '../hell-kit/kitFlesh';
import * as W from './weapons';
import * as B from './bossFx';
import * as E from './endFx';
import { tar } from '../../../src/games/pacman/render/doom/attackArt';
import { drawBonusLife } from '../../../src/games/pacman/render/items/BonusLifeView';
import { drawExit } from '../../../src/games/pacman/render/items/ExitView';

type Ctx = CanvasRenderingContext2D;
type Look = 'normal' | 'berserk';

const D = Math.min(window.devicePixelRatio || 1, 2);
/** The game's tile on a laptop, and the enlarged view's. */
const GAME_S = 32;
const BIG_S = 84;
/** The strip of the maze every card plays on: row 8 is one long corridor. */
const STRIP = { x: 2, y: 7, w: 8, h: 3 };
const ROW = 8;

const grid = new GridService(new GridModel(GRID_DOOM));
const events = new EventBus<PacmanEventMap>();
const progress = new LevelProgress(grid, new ScoreModel(), events);
const player = new PlayerService(grid, progress, events);
player.placeAt({ x: 4, y: ROW });
player.setDesiredDirection('RIGHT');
player.update(0.02);
const heroView = new HeroView(new OrangeHero(), chargePainter, FRUIT_BODY_RATIO);
heroView.setSeason('hell');
const bossView = new HellBlinkyView();

/** The hell drawn once, large; each card crops the strip out of it. */
const WORLD_W = 1240;
const WORLD_H = 1340;
const world = new DoomWorld(GRID_DOOM, DOOM_PICKUP_TILES);
world.resize(WORLD_W, WORLD_H, D);
world.update(0.016);
const floor = document.createElement('canvas');
floor.width = Math.round(WORLD_W * D);
floor.height = Math.round(WORLD_H * D);
{
	const f = floor.getContext('2d') as Ctx;
	f.setTransform(D, 0, 0, D, 0, 0);
	world.drawWorld(f);
	world.drawMood(f, []);
}
const L = world.layout;

/** Draws the strip's floor into a card at tile `S` (tile coordinates relative to the strip). */
function drawFloor(ctx: Ctx, S: number): void {
	const sx = (L.offsetX + STRIP.x * L.tileSize) * D;
	const sy = (L.offsetY + STRIP.y * L.tileSize) * D;
	ctx.drawImage(floor, sx, sy, STRIP.w * L.tileSize * D, STRIP.h * L.tileSize * D, 0, 0, STRIP.w * S, STRIP.h * S);
}

/** The card's helpers: a tile's centre in px, the hero, the boss, an imp. */
interface Stage {
	readonly ctx: Ctx;
	readonly S: number;
	X(tx: number): number;
	Y(): number;
	hero(tx: number, look?: Look, alpha?: number): void;
	boss(tx: number, stunned?: boolean, hit?: number, dx?: number): void;
	imp(tx: number): void;
}

function stage(ctx: Ctx, S: number): Stage {
	const X = (tx: number): number => (tx - STRIP.x + 0.5) * S;
	const Y = (): number => (ROW - STRIP.y + 0.5) * S;
	return {
		ctx,
		S,
		X,
		Y,
		hero(tx, look = 'normal', alpha = 1) {
			if (alpha <= 0) return;
			ctx.save();
			ctx.globalAlpha *= alpha;
			const lay = { tileSize: S, offsetX: X(tx) - player.position.x * S, offsetY: Y() - player.position.y * S };
			heroView.draw(ctx, player, lay, 0.4, { look, charge: 0, dying: false });
			ctx.restore();
		},
		boss(tx, stunned = false, hit = 0, dx = 0) {
			bossView.draw(
				ctx,
				{ x: 0.5, y: 0.5, phase: 3, state: stunned ? 'STUNNED' : 'CHASE', shape: stunned ? 'stunned' : 'normal', dir: 'LEFT', progress: 0, alpha: 1, intro: 1, look: 0, hit, echo: false },
				{ tileSize: S, offsetX: X(tx) - S / 2 + dx * S, offsetY: Y() - S / 2 },
				0.35
			);
		},
		imp(tx) {
			FLESH_KIT.ghost(ctx, 2, X(tx), Y(), S * 0.7, 'LEFT', false, 0.35);
		}
	};
}

type Scene = (st: Stage, u: number, t: number) => void;
interface Card {
	readonly title: string;
	readonly note?: string;
	readonly period: number;
	readonly scene: Scene;
}
interface Section {
	readonly id: string;
	readonly title: string;
	readonly note: string;
	readonly cards: readonly Card[];
}

const ease = (a: number, b: number, u: number): number => Math.max(0, Math.min(1, (u - a) / (b - a)));
const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;

const PICKUP_GLOW = { bfg: '255,150,60', plasma: '80,210,255', berserk: '255,122,26', medkit: '255,58,42' };

function glow(ctx: Ctx, x: number, y: number, rgb: string, r: number): void {
	const g = ctx.createRadialGradient(x, y, 0, x, y, r);
	g.addColorStop(0, `rgba(${rgb},.55)`);
	g.addColorStop(0.45, `rgba(${rgb},.22)`);
	g.addColorStop(1, `rgba(${rgb},0)`);
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	ctx.fillStyle = g;
	ctx.fillRect(x - r, y - r, r * 2, r * 2);
	ctx.restore();
}

/** A pickup lying on the floor as the game shows it: its glow, then the icon, bobbing a little. */
function lying(st: Stage, tx: number, rgb: string, paint: (c: Ctx) => void, t: number): void {
	const x = st.X(tx);
	const y = st.Y();
	glow(st.ctx, x, y, rgb, st.S * 0.62);
	st.ctx.save();
	st.ctx.translate(x, y);
	st.ctx.scale(1 + 0.05 * Math.sin(t * 2.6), 1 + 0.05 * Math.sin(t * 2.6));
	st.ctx.rotate(Math.sin(t * 2) * 0.1);
	W.icon(st.ctx, 0, 0, st.S * 0.9, paint);
	st.ctx.restore();
}

const fromSprite = (kind: 'berserk' | 'bfg' | 'medkit') => (c: Ctx): void => {
	c.drawImage(pickupSprite(kind).icon, -50, -50, 100, 100);
};
const maw = (c: Ctx): void => FLESH_KIT.icon(c, 'bfg', 0, 0, 100);

/** A Sting icon among the other pickups on the floor, the current one first for reference. */
const iconCard = (title: string, paint: (c: Ctx) => void, note?: string): Card => ({
	title,
	note,
	period: 4,
	scene: (st, _u, t) => {
		lying(st, 3, PICKUP_GLOW.plasma, paint, t);
		lying(st, 5, PICKUP_GLOW.bfg, maw, t + 1);
		lying(st, 7, PICKUP_GLOW.berserk, fromSprite('berserk'), t + 2);
	}
});

/** The rush: the hero turns into the object, runs four tiles into the boss, hits, turns back. */
const rushCard = (title: string, draw: (st: Stage, x: number, t: number, counter: boolean) => void, counter: boolean): Card => ({
	title,
	period: 2.6,
	scene: (st, u, t) => {
		st.boss(8);
		const morph = ease(0.1, 0.25, u) * (1 - ease(0.85, 0.97, u));
		const go = ease(0.28, 0.5, u);
		const tx = lerp(3, 7.2, go) - ease(0.6, 0.85, u) * 0.6;
		if (counter && u < 0.3) W.counterReady(st.ctx, st.X(3), st.Y(), st.S, t);
		st.hero(tx, 'berserk', 1 - morph);
		if (morph > 0) {
			st.ctx.save();
			st.ctx.globalAlpha *= morph;
			if (go > 0 && go < 1) W.rushTrail(st.ctx, st.X(tx), st.Y(), st.S, 'RIGHT', 1, counter);
			const k = 0.6 + 0.4 * morph;
			st.ctx.translate(st.X(tx), st.Y());
			st.ctx.scale(k, k);
			st.ctx.translate(-st.X(tx), -st.Y());
			draw(st, st.X(tx), t, counter);
			st.ctx.restore();
		}
		if (u > 0.5 && u < 0.85) W.rushHit(st.ctx, st.X(8), st.Y(), st.S, ease(0.5, 0.85, u), counter);
	}
});

const stingFire = (target: 'boss' | 'wall' | 'imp'): Scene => (st, u, t) => {
	const hx = 3;
	const end = target === 'boss' ? 7.7 : target === 'wall' ? 8.55 : 7.3;
	if (target === 'boss') st.boss(8);
	if (target === 'wall') {
		// the corridor's far end shut by a wall block for this card
		st.ctx.fillStyle = '#5a2620';
		st.ctx.fillRect(st.X(9) - st.S / 2, st.Y() - st.S / 2, st.S, st.S);
		st.ctx.fillStyle = '#7a3a30';
		st.ctx.fillRect(st.X(9) - st.S / 2, st.Y() - st.S / 2, st.S * 0.12, st.S);
	}
	if (target === 'imp' && u < 0.55) st.imp(7.5);
	st.hero(hx);
	const firing = u < 0.7;
	if (firing) W.stingMuzzle(st.ctx, st.X(hx), st.Y(), st.S, 'RIGHT', (u * 10) % 1);
	for (let k = 0; k < 6; k += 1) {
		const bu = u * 1.6 - k * 0.1;
		if (bu < 0 || bu > 0.7) continue;
		const bx = lerp(hx + 0.4, end, bu / 0.7);
		W.drawStingBolt(st.ctx, st.X(0) + (bx - STRIP.x) * st.S, st.Y(), st.S * 0.8, 'RIGHT');
	}
	const hitU = ease(0.45, 0.95, u);
	if (hitU > 0 && hitU < 1) {
		const hx2 = st.X(0) + (end - STRIP.x) * st.S;
		if (target === 'boss') W.stingHitBoss(st.ctx, hx2, st.Y(), st.S, (hitU * 3) % 1);
		if (target === 'wall') W.stingHitWall(st.ctx, hx2, st.Y(), st.S, hitU);
		if (target === 'imp') W.stingKillImp(st.ctx, st.X(7.5), st.Y(), st.S * 0.8, ease(0.55, 0.95, u));
	}
	void t;
};

const mawShot = (stunned: boolean): Scene => (st, u, t) => {
	st.boss(8, stunned);
	st.hero(3);
	if (u < 0.35) W.mawCharge(st.ctx, st.X(3), st.Y(), st.S, 'RIGHT', ease(0, 0.35, u));
	const fly = ease(0.35, 0.55, u);
	if (fly > 0 && fly < 1) W.mawOrb(st.ctx, st.X(lerp(3.5, 7.6, fly)), st.Y(), st.S, t);
	const hit = ease(0.55, 0.95, u);
	if (hit > 0 && hit < 1) {
		if (stunned) W.mawFull(st.ctx, st.X(8), st.Y(), st.S, hit);
		else W.mawGlance(st.ctx, st.X(7.7), st.Y(), st.S, hit);
	}
};

/** A hit on the boss at u = 0.15: `strength` 0 the current white flash only, 1..3 the new reaction. */
const hitCard = (title: string, strength: number): Card => ({
	title,
	period: 1.4,
	scene: (st, u) => {
		const f = ease(0.15, 0.6, u);
		const on = u >= 0.15 && f < 1;
		const hit = on ? 1 - f : 0;
		const recoil = strength > 0 && on ? Math.sin(Math.min(1, f * 3) * Math.PI) * 0.06 * strength : 0;
		st.boss(6, strength === 3, hit, recoil);
		if (strength > 0 && on) B.hitChips(st.ctx, st.X(6), st.Y(), st.S, f, strength);
	}
});

const GHOST_FROM: ReadonlyArray<readonly [number, number]> = [[-3, -1], [3, -1], [-3, 1], [3, 1]];

/** The corridor's tiles the tar cards cover, and the tar painters' origin in a card. */
// one alone, a pair, one alone again: tar comes tile by tile and need not join
const TAR_TILES = [3, 5, 6, 8].map((c) => ({ c, r: ROW }));
const tarCard = (title: string, paint: typeof tar): Card => ({
	title,
	period: 4,
	scene: (st, _u, t) => {
		paint(st.ctx, TAR_TILES, -STRIP.x * st.S, -STRIP.y * st.S, st.S, t);
		st.hero(2.6);
	}
});

const END_SECTIONS: readonly Section[] = [
	{
		id: 'end',
		title: 'Финал: смерть босса, сердце, выход',
		note: 'Смерть: босс разбухает, из него бьют вращающиеся лучи, лопается белой вспышкой с двумя ударными волнами, куски плоти с кровавыми следами, рога высоко вверх, кровавый дождь, лужа с рогами и угольками. Сердце: два светлых варианта, чтобы не терялось на полу. Выход (люк) принят.',
		cards: [
			{ title: 'Смерть босса: эффектнее', period: 3.6, scene: (st, u, t) => E.bossDeath(st.ctx, st.X(6), st.Y(), st.S, ease(0.05, 0.85, u), t, (dx) => st.boss(6, false, 0, dx)) },
			{
				title: 'Сердце и выход: сейчас',
				period: 3,
				scene: (st, _u, t) => {
					drawBonusLife(st.ctx, st.X(4), st.Y(), st.S, t);
					drawExit(st.ctx, st.X(7), st.Y(), st.S, t);
				}
			},
			{
				title: 'Сердце: 1 — в костяной оправе; выход — люк',
				period: 3,
				scene: (st, u, t) => {
					E.heartReliquary(st.ctx, st.X(4), st.Y(), st.S, t);
					E.exitHatch(st.ctx, st.X(7), st.Y(), st.S, t, ease(0, 0.4, u));
				}
			},
			{
				title: 'Сердце: 2 — раскалённое',
				period: 3,
				scene: (st, _u, t) => E.heartHot(st.ctx, st.X(4), st.Y(), st.S, t)
			}
		]
	},
	{
		id: 'tar',
		title: 'Смола третьей фазы',
		note: 'Каждая клетка сама по себе (смола может лежать одиночными клетками), без кругов. C: глянцевая чёрная плита по форме клетки с потёками. D: неровная клякса, у каждой клетки своя. E: плита сухой корки с тлеющими трещинами.',
		cards: [tarCard('Сейчас: лужи', tar), tarCard('C: плита', E.tarSlab), tarCard('D: клякса', E.tarSplat), tarCard('E: корка', E.tarCrustTile)]
	}
];

const BOSS_SECTIONS: readonly Section[] = [
	{
		id: 'stun',
		title: 'Босс: оглушение и окно удара',
		note: 'Оглушение: над рогами кружат черепки, под ним кольцо-таймер. Окно раскола (съедены все четыре): золотые скобы «бей сейчас» и золотой таймер.',
		cards: [
			{ title: 'Сейчас: оглушён', period: 3, scene: (st) => st.boss(6, true) },
			{ title: 'Оглушён: черепки и таймер', period: 3, scene: (st, u, t) => { st.boss(6, true); B.stunOverlay(st.ctx, st.X(6), st.Y(), st.S, t, 1 - u); } },
			{ title: 'Окно раскола: бей сейчас', period: 3, scene: (st, u, t) => { st.boss(6, true); B.stunOverlay(st.ctx, st.X(6), st.Y(), st.S, t, 1 - u); B.windowMark(st.ctx, st.X(6), st.Y(), st.S, t, 1 - u); st.hero(3, 'berserk'); } }
		]
	},
	{
		id: 'hits',
		title: 'Босс: реакция на удар по силе',
		note: 'Сейчас — только белая вспышка. Новое: отдача назад и ошмётки, чем сильнее удар, тем больше.',
		cards: [hitCard('Сейчас: вспышка', 0), hitCard('Слабый: Жало', 1), hitCard('Средний: рывок, Жерло вскользь', 2), hitCard('Сильный: полное Жерло', 3)]
	},
	{
		id: 'split',
		title: 'Раскол',
		note: 'Предвестие, ядро (сейчас и новое), сбор четырёх на ядре, съеденный призрак, испуг и мигание.',
		cards: [
			{
				title: 'Предвестие',
				period: 2.5,
				scene: (st, u, t) => {
					const k = ease(0, 0.9, u);
					st.boss(6, false, 0, Math.sin(t * 60) * 0.03 * k);
					B.omen(st.ctx, st.X(6), st.Y(), st.S, t, k);
				}
			},
			{ title: 'Ядро: сердце в рёбрах', period: 3, scene: (st, _u, t) => B.core(st.ctx, st.X(6), st.Y(), st.S, t) },
			{
				title: 'Сбор на ядре',
				period: 3,
				scene: (st, u, t) => {
					const go = ease(0, 0.55, u);
					if (u < 0.6) B.core(st.ctx, st.X(6), st.Y(), st.S, t);
					if (go < 1) {
						GHOST_FROM.forEach(([gx, gy], i) => {
							const e = go * go * (3 - 2 * go);
							const x = st.X(6) + gx * st.S * (1 - e);
							const y = st.Y() + gy * st.S * (1 - e);
							st.ctx.save();
							st.ctx.globalAlpha *= 1 - 0.3 * e;
							FLESH_KIT.ghost(st.ctx, i, x, y, st.S * (1 - 0.4 * e), gx < 0 ? 'RIGHT' : 'LEFT', false, t + i);
							st.ctx.restore();
						});
					}
					const form = ease(0.55, 0.8, u);
					if (form > 0) st.boss(6, true);
					if (form > 0 && form < 1) B.formFlash(st.ctx, st.X(6), st.Y(), st.S, form);
					if (u > 0.8) B.stunOverlay(st.ctx, st.X(6), st.Y(), st.S, t, 1 - ease(0.8, 1, u) * 0.2);
				}
			},
			{
				title: 'Призрак съеден',
				period: 2,
				scene: (st, u, t) => {
					const eat = ease(0.3, 0.95, u);
					if (u < 0.3) FLESH_KIT.ghost(st.ctx, 1, st.X(6), st.Y(), st.S, 'LEFT', true, t);
					st.hero(lerp(3.5, 6.3, ease(0, 0.3, u)));
					if (eat > 0 && eat < 1) B.ghostEaten(st.ctx, st.X(6), st.Y(), st.S, eat, 400);
				}
			},
			{
				title: 'Испуг и мигание (сейчас)',
				period: 2,
				scene: (st, u, t) => {
					const blink = u > 0.5 && Math.floor(t * 8) % 2 === 0;
					FLESH_KIT.ghost(st.ctx, 2, st.X(6), st.Y(), st.S, 'LEFT', !blink, t);
				}
			}
		]
	}
];

const SECTIONS: readonly Section[] = [
	{
		id: 'sting',
		title: 'Жало: иконка',
		note: 'На полу ада рядом с Жерлом и кулаком, как их увидит игрок. Первая карточка — как сейчас.',
		cards: [
			iconCard('G: винтовка с баком', W.paintStingTank, 'толстая винтовка, на спине стеклянный бак яда, светящиеся кольца на стволе')
		]
	},
	{
		id: 'sting-fire',
		title: 'Жало: выстрел и попадания',
		note: 'Плевок яда у ствола; попадание в босса шипит и дымит, в стену — растекается, имп лопается.',
		cards: [
			{ title: 'В босса', period: 1.6, scene: stingFire('boss') },
			{ title: 'В стену', period: 1.6, scene: stingFire('wall') },
			{ title: 'В импа', period: 1.6, scene: stingFire('imp') }
		]
	},
	{
		id: 'rush',
		title: 'Рывок: превращение в предмет',
		note: 'Герой превращается в предмет, и рывок не зависит от его арта. Первая карточка — нынешний вихрь.',
		cards: [
			rushCard('Выбрано: пила из клыков', (st, x, t, k) => W.rushSaw(st.ctx, x, st.Y(), st.S, t, k), false),
			rushCard('Пила: контратака ×3', (st, x, t, k) => W.rushSaw(st.ctx, x, st.Y(), st.S, t, k), true),

		]
	},
	{
		id: 'maw',
		title: 'Жерло: зарядка и два попадания',
		note: 'По неоглушённому боссу — оранжевый взрыв вполовину меньше и искры в стороны; по оглушённому — полный удар с белым ядром и кусками плоти.',
		cards: [
			{ title: 'Босс не оглушён: 150 (взрыв меньше)', period: 2.4, scene: mawShot(false) },
			{ title: 'Босс оглушён: 400', period: 2.4, scene: mawShot(true) }
		]
	},
	{
		id: 'field',
		title: 'На поле: появилось, кончилось, отказ, аптечка',
		note: 'Аптечка: нынешняя и костяная шкатулка с красным крестом (светлая, чтобы не терялась на тёмном полу).',
		cards: [
			{
				title: 'Появилось оружие',
				period: 2.4,
				scene: (st, u) => W.arrive(st.ctx, st.X(5), st.Y(), st.S, ease(0, 0.7, u), maw, PICKUP_GLOW.bfg)
			},
			{
				title: 'Оружие кончилось',
				period: 2.4,
				scene: (st, u) => {
					st.hero(5);
					W.spent(st.ctx, st.X(5), st.Y(), st.S, ease(0.1, 0.9, u), W.paintStingTank);
				}
			},
			{
				title: 'Отказ: нет заряда',
				period: 1.6,
				scene: (st, u) => {
					const f = ease(0.2, 0.7, u);
					const jolt = f > 0 && f < 1 ? Math.sin(f * Math.PI * 4) * 0.08 * (1 - f) : 0;
					st.hero(5 - jolt);
					if (f > 0 && f < 1) W.refused(st.ctx, st.X(5), st.Y(), st.S, 'RIGHT', f);
				}
			},
			{
				title: 'Аптечка: сейчас и «Плоть»',
				period: 4,
				scene: (st, _u, t) => {
					lying(st, 3, PICKUP_GLOW.medkit, fromSprite('medkit'), t);
					lying(st, 6, PICKUP_GLOW.medkit, W.paintMedkit, t + 1);
				}
			}
		]
	}
];

/** The dial's cards: the meter through a weapon's life, drawn as the HUD would. */
interface DialCard {
	readonly title: string;
	readonly period: number;
	draw(ctx: Ctx, x: number, y: number, r: number, u: number): void;
}

const DIALS: readonly DialCard[] = [
	{
		title: 'Берсерк: заряд, рывок, дозарядка',
		period: 6,
		draw(ctx, x, y, r, u) {
			// eat 1.5 segments, rush (one burns), eat the two left full, rush, rush: spent
			const [burnt, charge] =
				u < 0.2 ? [0, 1.5 * ease(0, 0.2, u)]
				: u < 0.35 ? [1, 0.5]
				: u < 0.6 ? [1, lerp(0.5, 2, ease(0.35, 0.6, u))]
				: u < 0.72 ? [2, 1]
				: [3, 0];
			const segs: W.Seg[] = [];
			const fill: number[] = [];
			for (let i = 0; i < 3; i += 1) {
				const v = Math.max(0, Math.min(1, charge - (i - burnt)));
				segs.push(i < burnt ? 'burnt' : v >= 1 ? 'charged' : 'chargeable');
				fill.push(i < burnt ? 0 : v);
			}
			W.dial(ctx, x, y, r, segs, fill, burnt < 3 && charge >= 3 - burnt);
		}
	},
	{
		title: 'Жало: заряд, стрельба сжигает',
		period: 6,
		draw(ctx, x, y, r, u) {
			const N = 24;
			const charged = Math.round(N * Math.min(1, ease(0, 0.3, u)));
			const burnt = Math.round(N * 0.5 * ease(0.4, 0.7, u));
			const segs: W.Seg[] = [];
			const fill: number[] = [];
			for (let i = 0; i < N; i += 1) {
				segs.push(i < burnt ? 'burnt' : i < charged ? 'charged' : 'chargeable');
				fill.push(0);
			}
			W.dial(ctx, x, y, r, segs, fill, charged >= N && burnt === 0, true);
		}
	},
	{
		title: 'Жерло: заряд, полное, выстрел',
		period: 5,
		draw(ctx, x, y, r, u) {
			const k = ease(0, 0.6, u);
			if (u < 0.85) W.dial(ctx, x, y, r, [k >= 1 ? 'charged' : 'chargeable'], [k], k >= 1);
			else W.dial(ctx, x, y, r, ['burnt'], [0], false);
		}
	}
];

// ── the page ─────────────────────────────────────────────────────────────────────────────────────

interface Live {
	readonly period: number;
	readonly paint: (t: number) => void;
}
const live: Live[] = [];

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
	const pair: Array<[HTMLCanvasElement, Ctx, number]> = [GAME_S, BIG_S].map((S) => {
		const [cv, ctx] = canvas(STRIP.w * S, STRIP.h * S, `${card.title}, тайл ${S} px`);
		cv.className = S === GAME_S ? 'game' : 'big';
		views.append(cv);
		return [cv, ctx, S];
	});
	el.append(views);
	el.insertAdjacentHTML('beforeend', `<figcaption><b>${card.title}</b>${card.note ? ` — ${card.note}` : ''}</figcaption>`);
	live.push({
		period: card.period,
		paint: (t) => {
			const u = (t % card.period) / card.period;
			for (const [, ctx, S] of pair) {
				ctx.clearRect(0, 0, STRIP.w * S, STRIP.h * S);
				drawFloor(ctx, S);
				card.scene(stage(ctx, S), u, t);
			}
		}
	});
	return el;
}

function dialEl(card: DialCard): HTMLElement {
	const el = document.createElement('figure');
	el.className = 'card dial';
	const [cv, ctx] = canvas(140, 120, card.title);
	el.append(cv);
	el.insertAdjacentHTML('beforeend', `<figcaption><b>${card.title}</b></figcaption>`);
	live.push({
		period: card.period,
		paint: (t) => {
			ctx.clearRect(0, 0, 140, 120);
			card.draw(ctx, 70, 60, 44, (t % card.period) / card.period);
		}
	});
	return el;
}

const root = document.getElementById('sections') as HTMLElement;
const section = (id: string, title: string, note: string): HTMLElement => {
	const s = document.createElement('section');
	s.id = id;
	s.innerHTML = `<header><h2>${title}</h2><p>${note}</p></header>`;
	const grid = document.createElement('div');
	grid.className = 'grid';
	s.append(grid);
	root.append(s);
	return grid;
};
for (const sec of [...END_SECTIONS, ...BOSS_SECTIONS, ...SECTIONS]) {
	const g = section(sec.id, sec.title, sec.note);
	sec.cards.forEach((c) => g.append(cardEl(c)));
}
{
	const g = section('dial', 'Шкала оружия и еда', 'Ярко — заряжено, тускло — можно дозарядить, серое в трещинах — сгорело навсегда. Еда, которую сейчас нельзя съесть, бледнеет.');
	DIALS.forEach((d) => g.append(dialEl(d)));
	g.append(
		cardEl({
			title: 'Еда: можно есть | шкала полна',
			period: 3,
			scene: (st) => {
				for (let tx = 2; tx <= 5; tx += 1) W.drawFleshFood(st.ctx, st.X(tx), st.Y(), st.S);
				for (let tx = 6; tx <= 9; tx += 1) W.foodWaiting(st.ctx, st.X(tx), st.Y(), st.S);
			}
		})
	);
}

/** `?t=<seconds>` freezes every card at that moment (for still frames). */
const frozen = new URLSearchParams(location.search).get('t');
const start = performance.now();
const tick = (now: number): void => {
	const t = frozen !== null ? Number(frozen) : (now - start) / 1000;
	for (const l of live) l.paint(t);
	if (frozen === null) requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
