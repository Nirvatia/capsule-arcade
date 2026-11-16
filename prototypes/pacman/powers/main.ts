// Prototype `powers`: the looks of the abilities (roadmap I.2), all candidates side by side on
// the real season worlds, drawn with the game's own painters (the world, the food, the fruit,
// the season ghosts, the heroes, the echo token). Scenes:
//   icons      the tokens at game scale on the maze (beside an energizer, a fruit, the ghosts)
//              and magnified ×4 in the margins;
//   mask       the turn into the hero's ghost form, frame by frame: looks A, B, C × both heroes;
//   lineup     the ghost forms A, B, C in a row with the season's four ghosts and a scared one;
//   shock      the shock, frame by frame: V1 (branching lightning) and V2 (plasma and a cage);
//   shock-live the shock on the maze at game scale, looping.
// Query: ?scene=mask&season=autumn&hero=ms&shock=plasma&capture (capture: window.__advance(s)).
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { buildLevelSession } from '../../../src/games/pacman/logic/level/LevelSession';
import type { LevelSession } from '../../../src/games/pacman/logic/level/LevelSession';
import { seasonForLevel } from '../../../src/games/pacman/logic/level/SeasonCatalog';
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { drawCuteGhost } from '../../../src/games/pacman/render/actors/cuteGhost';
import type { CuteShape, CuteState } from '../../../src/games/pacman/render/actors/cuteGhost';
import { PacmanHero } from '../../../src/games/pacman/render/actors/hero/PacmanHero';
import { MsPacmanHero } from '../../../src/games/pacman/render/actors/hero/MsPacmanHero';
import type { Hero } from '../../../src/games/pacman/render/actors/hero/Hero';
import { EchoCloneView } from '../../../src/games/pacman/render/actors/EchoCloneView';
import { drawFruit } from '../../../src/games/pacman/render/items/fruit/FruitView';
import type { GridLayout } from '../../../src/games/pacman/render/maze/GridView';
import {
	ICON_NAMES,
	MASK_NAMES,
	SHOCK_NAMES,
	SHOCK_SECONDS,
	drawGhostForm,
	drawHeldAura,
	drawHeldGhost,
	drawIcon,
	drawMorph,
	drawShockArcs,
	heldGhost
} from './art';
import type { GhostForm, IconId, MaskLook, ShockLook, ShockTarget } from './art';

const SEASONS = ['summer', 'autumn', 'winter', 'spring'] as const;
type Season = (typeof SEASONS)[number];
const SCENES = ['icons', 'mask', 'lineup', 'shock', 'shock-live'] as const;
type Scene = (typeof SCENES)[number];
const SHAPES: Record<Season, CuteShape> = {
	spring: 'tulip',
	summer: 'turtle',
	autumn: 'hedgehog',
	winter: 'bunny'
};
const KINDS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const LOOKS: readonly MaskLook[] = ['a', 'b', 'c'];
const INK = '#241418';

const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const view = $<HTMLCanvasElement>('view');
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const q = new URLSearchParams(location.search);
const pick = <T extends string>(list: readonly T[], value: string | null, fallback: T): T =>
	list.includes(value as T) ? (value as T) : fallback;

let season: Season = pick(SEASONS, q.get('season'), 'autumn');
let scene: Scene = pick(SCENES, q.get('scene'), 'icons');
let ms = q.get('hero') === 'ms';
let shock: ShockLook = pick(['bolt', 'plasma'] as const, q.get('shock'), 'bolt');
let slow = false;
let vw = 0;
let vh = 0;
let time = 0;
let world: MeadowWorld;
/** The same world drawn big once, for the magnified frames. */
let big: MeadowWorld;
let bigCanvas: HTMLCanvasElement;
let session: LevelSession;
const echoView = new EchoCloneView();
/** Hero instances: one per use, so that none trails from one place to another. */
const heroes = new Map<string, Hero>();
if (q.has('capture')) document.body.classList.add('capture');

function hero(id: string): Hero {
	const key = `${ms ? 'ms' : 'pac'}:${id}`;
	let h = heroes.get(key);
	if (!h) {
		h = ms ? new MsPacmanHero() : new PacmanHero();
		heroes.set(key, h);
	}
	return h;
}

/** Draws the hero (standing, facing right) centred at (x, y) on a tile of `S` px. */
function drawHero(c: CanvasRenderingContext2D, id: string, x: number, y: number, S: number): void {
	const h = hero(id);
	h.setRadius(S * 0.39);
	h.update(0, { x, y, angle: 0, moving: false, power: false, ending: false, season });
	h.draw(c);
}

function ghostState(scared: boolean): CuteState {
	return scared ? 'scared' : 'normal';
}

function drawGhost(
	c: CanvasRenderingContext2D,
	kind: GhostKind,
	x: number,
	y: number,
	S: number,
	look = -1,
	scared = false
): void {
	drawCuteGhost(c, x, y, (S / 25) * 0.78, {
		shape: SHAPES[season],
		kind,
		state: ghostState(scared),
		lookX: look,
		lookY: 0,
		time,
		step: time * 9 + kind.length,
		chasing: true
	});
}

function form(look: MaskLook, lookX = 1): GhostForm {
	return {
		look,
		ms,
		shape: SHAPES[season],
		season,
		lookX,
		lookY: 0,
		time,
		step: time * 9,
		dpr: D
	};
}

// ── the worlds ─────────────────────────────────────────────────────────────────

function newSession(): LevelSession {
	const level = SEASONS.indexOf(season) + 1;
	return buildLevelSession({
		events: new EventBus<PacmanEventMap>(),
		level,
		profile: ms ? 'ms-pacman' : 'pacman',
		season: seasonForLevel(level),
		hell: false,
		secret: false,
		godMode: true
	});
}

function settle(w: MeadowWorld): void {
	w.setMood(0, 0);
	for (let i = 0; i < 40; i++) w.update(0.1);
}

function build(): void {
	const level = SEASONS.indexOf(season) + 1;
	const grid = seasonForLevel(level).grid;
	const theme = meadowThemeFor(season) as MeadowTheme;
	world = new MeadowWorld(grid, theme);
	world.resize(vw, vh, D);
	settle(world);
	big = new MeadowWorld(grid, theme);
	big.resize(2400, 2200, 1);
	settle(big);
	bigCanvas = document.createElement('canvas');
	bigCanvas.width = 2400;
	bigCanvas.height = 2200;
	const bc = bigCanvas.getContext('2d') as CanvasRenderingContext2D;
	big.drawWorld(bc);
	big.drawMood(bc);
	big.drawFood(bc, () => false);
	session = newSession();
	session.fruit.debugSpawn(ms ? 'CHERRY' : 'CHERRY');
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
		b.setAttribute('aria-pressed', String(b.dataset.season === season));
	}
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-scene]')) {
		b.setAttribute('aria-pressed', String(b.dataset.scene === scene));
	}
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-hero]')) {
		b.setAttribute('aria-pressed', String((b.dataset.hero === 'ms') === ms));
	}
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-shock]')) {
		b.setAttribute('aria-pressed', String(b.dataset.shock === shock));
	}
}

function layout(): void {
	vw = window.innerWidth;
	vh = window.innerHeight;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	view.style.width = `${vw}px`;
	view.style.height = `${vh}px`;
	build();
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-season]')) {
	b.addEventListener('click', () => {
		season = b.dataset.season as Season;
		build();
	});
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-scene]')) {
	b.addEventListener('click', () => {
		scene = b.dataset.scene as Scene;
		time = 0;
		build();
	});
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-hero]')) {
	b.addEventListener('click', () => {
		ms = b.dataset.hero === 'ms';
		build();
	});
}
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-shock]')) {
	b.addEventListener('click', () => {
		shock = b.dataset.shock as ShockLook;
		build();
	});
}
$('slow').addEventListener('click', () => {
	slow = !slow;
	$('slow').setAttribute('aria-pressed', String(slow));
});

// ── helpers: tiles, corridors, labels, magnified cells ────────────────────────────

const px = (L: GridLayout, tx: number) => L.offsetX + tx * L.tileSize;
const py = (L: GridLayout, ty: number) => L.offsetY + ty * L.tileSize;

/** The longest straight run of tiles the hero can walk, along a row (not the lair's). */
function longestRow(minY = 0): { y: number; x0: number; x1: number } {
	const g = session.grid;
	let best = { y: 0, x0: 0, x1: 0 };
	for (let y = minY; y < g.height; y++) {
		let start = -1;
		for (let x = 0; x <= g.width; x++) {
			const ok = x < g.width && g.isPlayerWalkable(x, y) && !g.isTeleport(x, y);
			if (ok && start < 0) start = x;
			if (!ok && start >= 0) {
				if (x - 1 - start > best.x1 - best.x0) best = { y, x0: start, x1: x - 1 };
				start = -1;
			}
		}
	}
	return best;
}

function label(c: CanvasRenderingContext2D, text: string, x: number, y: number, size = 13, align: CanvasTextAlign = 'center'): void {
	c.save();
	c.font = `700 ${size}px "Trebuchet MS","Segoe UI",system-ui,sans-serif`;
	c.textAlign = align;
	c.textBaseline = 'middle';
	c.lineJoin = 'round';
	c.strokeStyle = 'rgba(20,12,16,.9)';
	c.lineWidth = Math.max(3, size * 0.32);
	c.strokeText(text, x, y);
	c.fillStyle = '#fff6dc';
	c.fillText(text, x, y);
	c.restore();
}

function card(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
	c.save();
	c.fillStyle = 'rgba(16,12,20,.78)';
	c.strokeStyle = 'rgba(255,230,170,.35)';
	c.lineWidth = 1.5;
	c.beginPath();
	c.roundRect(x, y, w, h, 14);
	c.fill();
	c.stroke();
	c.restore();
}

/**
 * A magnified window onto the big world: `cw` × `ch` px at (x, y), centred on tile (tx, ty), a
 * tile `Z` px. Returns the tile → px mapping for what is drawn into it.
 */
function cell(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	cw: number,
	ch: number,
	tx: number,
	ty: number,
	Z: number
): (ux: number, uy: number) => [number, number] {
	const L = big.layout;
	const k = L.tileSize / Z;
	c.save();
	c.beginPath();
	c.roundRect(x, y, cw, ch, 10);
	c.clip();
	c.drawImage(
		bigCanvas,
		px(L, tx) - (cw / 2) * k,
		py(L, ty) - (ch / 2) * k,
		cw * k,
		ch * k,
		x,
		y,
		cw,
		ch
	);
	c.restore();
	c.save();
	c.strokeStyle = 'rgba(255,230,170,.45)';
	c.lineWidth = 1.5;
	c.beginPath();
	c.roundRect(x, y, cw, ch, 10);
	c.stroke();
	c.restore();
	return (ux, uy) => [x + cw / 2 + (ux - tx) * Z, y + ch / 2 + (uy - ty) * Z];
}

function clipCell(c: CanvasRenderingContext2D, x: number, y: number, cw: number, ch: number): void {
	c.beginPath();
	c.roundRect(x, y, cw, ch, 10);
	c.clip();
}

// ── scene: icons ───────────────────────────────────────────────────────────────

const ICONS: readonly IconId[] = ['m1', 'm2', 'm3', 's1', 's2', 's3'];

function sceneIcons(): void {
	const L = world.layout;
	const S = L.tileSize;
	const g = session.grid;
	// the tokens spread over the corridors, at least three tiles apart, off the hero's start and
	// the lair; the echo's beside an energizer
	const spawn = g.playerSpawn;
	const energizer = (() => {
		for (let y = g.height - 1; y >= 0; y--)
			for (let x = 0; x < g.width; x++) if (g.tileAt(x, y) === 'EU') return { x, y };
		return spawn;
	})();
	const free: Array<[number, number]> = [];
	for (let y = 0; y < g.height; y++)
		for (let x = 0; x < g.width; x++) if (g.tileAt(x, y) === 'DT') free.push([x, y]);
	const cx = g.width / 2;
	const cy = g.height * 0.62;
	free.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
	const echoAt = free.find(([x, y]) => Math.abs(x - energizer.x) + Math.abs(y - energizer.y) === 2) ?? free[0]!;
	const spots: Array<[number, number]> = [];
	const far = (x: number, y: number) =>
		[...spots, echoAt, [spawn.x, spawn.y] as [number, number]].every(
			([sx, sy]) => Math.max(Math.abs(sx - x), Math.abs(sy - y)) >= 3
		);
	for (const [x, y] of free) {
		if (spots.length >= ICONS.length) break;
		if (y > 1 && far(x, y)) spots.push([x, y]);
	}
	spots.push(echoAt);
	const ids: Array<IconId | 'echo'> = [...ICONS, 'echo'];
	spots.forEach(([tx, ty], i) => {
		const id = ids[i]!;
		const x = px(L, tx + 0.5);
		const y = py(L, ty + 0.5);
		if (id === 'echo') echoView.drawToken(ctx, { x: tx + 0.5, y: ty + 0.5 }, 8, L, time);
		else drawIcon(ctx, id, x, y, S, time);
		label(ctx, id === 'echo' ? 'E' : id.toUpperCase(), x, y - S * 0.85, 12);
	});
	// the fruit on its pad, the ghosts about, the hero at his start
	const f = session.fruit.position;
	drawFruit(ctx, 'CHERRY', px(L, f.x), py(L, f.y), S, time);
	const top = longestRow(1);
	KINDS.forEach((kind, i) => {
		const tx = top.x0 + 2 + i * 3;
		drawGhost(ctx, kind, px(L, tx + 0.5), py(L, top.y + 0.5), S, i % 2 ? 1 : -1);
	});
	const s = g.playerSpawn;
	drawHero(ctx, 'icons', px(L, s.x + 0.5), py(L, s.y + 0.5), S);
	// magnified ×4 in the margins: the mask's icons on the left, the shock's on the right
	const Z = Math.min(110, Math.max(70, (L.offsetX - 40) / 2.2));
	const cardW = Z * 2 + 60;
	const leftX = Math.max(10, L.offsetX / 2 - cardW / 2);
	const rightX = Math.min(vw - cardW - 10, L.offsetX + g.width * S + (vw - L.offsetX - g.width * S) / 2 - cardW / 2);
	const panel = (x0: number, list: Array<IconId | 'echo'>, title: string) => {
		const h = list.length * (Z * 1.25 + 22) + 40;
		card(ctx, x0, 20, cardW, h);
		label(ctx, title, x0 + cardW / 2, 40, 14);
		list.forEach((id, i) => {
			const cy = 70 + i * (Z * 1.25 + 22) + Z * 0.6;
			const cx = x0 + cardW / 2;
			if (id === 'echo') echoView.drawToken(ctx, { x: 0, y: 0 }, 8, { ...L, tileSize: Z * 1.2, offsetX: cx, offsetY: cy }, time);
			else drawIcon(ctx, id, cx, cy, Z * 1.2, time);
			label(ctx, id === 'echo' ? 'E · эхо (принято)' : ICON_NAMES[id], cx, cy + Z * 0.72, 13);
		});
	};
	panel(leftX, ['m1', 'm2', 'm3'], 'МАСКА');
	panel(rightX, ['s1', 's2', 's3', 'echo'], 'РАЗРЯД · ЭХО');
}

// ── scene: the mask, frame by frame ───────────────────────────────────────────────

const MORPH_SECONDS = 0.45;

function sceneMask(): void {
	ctx.fillStyle = '#0d0b12';
	ctx.fillRect(0, 0, vw, vh);
	const g = session.grid;
	const row = longestRow(Math.floor(g.height * 0.55));
	const tx = Math.floor((row.x0 + row.x1) / 2) + 0.5;
	const ty = row.y + 0.5;
	const cols: Array<{ name: string; draw: (c: CanvasRenderingContext2D, x: number, y: number, Z: number, look: MaskLook, key: string) => void }> = [
		{ name: 'герой', draw: (c, x, y, Z, _l, key) => drawHero(c, key, x, y, Z) },
		...[0.15, 0.3, 0.45, 0.6, 0.8].map((k) => ({
			name: `${Math.round(k * MORPH_SECONDS * 1000)} мс`,
			draw: (c: CanvasRenderingContext2D, x: number, y: number, Z: number, look: MaskLook, key: string) =>
				drawMorph(c, k, false, x, y, Z, (cc, hx, hy) => drawHero(cc, `${key}m`, hx, hy, Z), form(look))
		})),
		{ name: 'маска', draw: (c, x, y, Z, look) => drawGhostForm(c, form(look), x, y, Z) },
		{
			name: 'конец: мигает',
			draw: (c, x, y, Z, look, key) => {
				c.save();
				c.globalAlpha = 0.7;
				drawHero(c, `${key}e`, x, y, Z);
				c.restore();
				drawGhostForm(c, form(look), x, y, Z, 0.25, 0.45);
			}
		},
		...[0.35, 0.7].map((k) => ({
			name: `назад ${Math.round(k * MORPH_SECONDS * 1000)} мс`,
			draw: (c: CanvasRenderingContext2D, x: number, y: number, Z: number, look: MaskLook, key: string) =>
				drawMorph(c, k, true, x, y, Z, (cc, hx, hy) => drawHero(cc, `${key}o`, hx, hy, Z), form(look))
		}))
	];
	const labelW = 190;
	const gap = 8;
	const rows: Array<[boolean, MaskLook]> = [];
	for (const m of [false, true]) for (const l of LOOKS) rows.push([m, l]);
	const cw = Math.floor(
		Math.min(124, (vw - labelW - 40 - gap * cols.length) / cols.length, (vh - 110) / rows.length - 10)
	);
	const rowH = cw + 10;
	const y0 = Math.max(56, (vh - rows.length * rowH - 30) / 2 + 20);
	label(ctx, `Маска: превращение в призрака сезона (${SHAPES[season]}), ${MORPH_SECONDS * 1000} мс туда и обратно`, vw / 2, y0 - 26, 16);
	const keep = ms;
	rows.forEach(([m, look], r) => {
		ms = m;
		const y = y0 + r * rowH;
		label(ctx, m ? 'Ms. Pac-Man' : 'Pac-Man', 20, y + cw / 2 - 9, 13, 'left');
		label(ctx, MASK_NAMES[look], 20, y + cw / 2 + 9, 13, 'left');
		cols.forEach((col, i) => {
			const x = 20 + labelW + i * (cw + gap);
			const map = cell(ctx, x, y, cw, cw, tx, ty, cw / 2.1);
			const [cx, cy] = map(tx, ty);
			ctx.save();
			clipCell(ctx, x, y, cw, cw);
			col.draw(ctx, cx, cy, cw / 2.1, look, `mask${r}-${i}`);
			ctx.restore();
			if (r === 0) label(ctx, col.name, x + cw / 2, y - 10, 11);
		});
	});
	ms = keep;
}

// ── scene: the ghost forms in a row with the season's ghosts ────────────────────────

function sceneLineup(): void {
	const L = world.layout;
	const S = L.tileSize;
	const row = longestRow(1);
	const cast: Array<{ name: string; draw: (x: number, y: number) => void }> = [
		{ name: 'Clyde', draw: (x, y) => drawGhost(ctx, 'CLYDE', x, y, S, 1) },
		{ name: 'A', draw: (x, y) => drawGhostForm(ctx, form('a'), x, y, S) },
		{ name: 'Blinky', draw: (x, y) => drawGhost(ctx, 'BLINKY', x, y, S, 1) },
		{ name: 'B', draw: (x, y) => drawGhostForm(ctx, form('b'), x, y, S) },
		{ name: 'Pinky', draw: (x, y) => drawGhost(ctx, 'PINKY', x, y, S, 1) },
		{ name: 'C', draw: (x, y) => drawGhostForm(ctx, form('c'), x, y, S) },
		{ name: 'Inky', draw: (x, y) => drawGhost(ctx, 'INKY', x, y, S, 1) },
		{ name: 'испуг', draw: (x, y) => drawGhost(ctx, 'BLINKY', x, y, S, 1, true) }
	];
	const span = row.x1 - row.x0 + 1;
	const step = Math.max(1, Math.floor(span / cast.length));
	cast.forEach((a, i) => {
		const tx = row.x0 + i * step + 0.5;
		a.draw(px(L, tx), py(L, row.y + 0.5));
		label(ctx, a.name, px(L, tx), py(L, row.y + 0.5) - S * 0.85, 11);
	});
	const s = session.grid.playerSpawn;
	drawHero(ctx, 'lineup', px(L, s.x + 0.5), py(L, s.y + 0.5), S);
	// the same row magnified ×2.6 at the bottom
	const Z = Math.min(64, (vw - 60) / (span + 1));
	const w = (span + 1) * Z;
	const h = Z * 2.2;
	const x0 = (vw - w) / 2;
	const y0 = vh - h - 64;
	const map = cell(ctx, x0, y0, w, h, row.x0 + span / 2, row.y + 0.5, Z);
	ctx.save();
	clipCell(ctx, x0, y0, w, h);
	const keepS = S;
	cast.forEach((a, i) => {
		const [cx, cy] = map(row.x0 + i * step + 0.5, row.y + 0.5);
		const big2 = Z;
		// draw at the big size: the painters take the tile size
		const castBig: Array<(x: number, y: number) => void> = [
			(x, y) => drawGhost(ctx, 'CLYDE', x, y, big2, 1),
			(x, y) => drawGhostForm(ctx, form('a'), x, y, big2),
			(x, y) => drawGhost(ctx, 'BLINKY', x, y, big2, 1),
			(x, y) => drawGhostForm(ctx, form('b'), x, y, big2),
			(x, y) => drawGhost(ctx, 'PINKY', x, y, big2, 1),
			(x, y) => drawGhostForm(ctx, form('c'), x, y, big2),
			(x, y) => drawGhost(ctx, 'INKY', x, y, big2, 1),
			(x, y) => drawGhost(ctx, 'BLINKY', x, y, big2, 1, true)
		];
		castBig[i]!(cx, cy);
		void keepS;
		void a;
	});
	ctx.restore();
	label(ctx, `Маска рядом с призраками сезона — игровой масштаб и ×${(Z / S).toFixed(1)}`, vw / 2, y0 - 14, 14);
}

// ── scene: the shock ─────────────────────────────────────────────────────────────

/** The hero and three ghosts on a corridor: two in the hero's reach, one reached through them. */
function shockCast(L: GridLayout, map?: (ux: number, uy: number) => [number, number]) {
	const row = longestRow(Math.floor(session.grid.height * 0.55));
	const y = row.y + 0.5;
	const hx = row.x0 + 0.5;
	const at = (ux: number) => (map ? map(ux, y) : ([px(L, ux), py(L, y)] as [number, number]));
	const [hX, hY] = at(hx);
	const offs: Array<[GhostKind, number, number]> = [
		['BLINKY', 2.5, 0],
		['PINKY', 4.5, 0.06],
		['INKY', 8, 0.12]
	];
	const targets: ShockTarget[] = [];
	let fx = hX;
	let fy = hY;
	for (const [kind, dx, delay] of offs) {
		if (row.x0 + dx > row.x1) break;
		const [gx, gy] = at(hx + dx);
		targets.push({ kind, x: gx, y: gy, fromX: fx, fromY: fy, delay });
		fx = gx;
		fy = gy;
	}
	return { hX, hY, targets, row };
}

function drawShockAt(
	c: CanvasRenderingContext2D,
	look: ShockLook,
	cast: ReturnType<typeof shockCast>,
	S: number,
	t: number,
	key: string
): void {
	drawHero(c, key, cast.hX, cast.hY, S);
	cast.targets.forEach((tg, i) => {
		const local = t - tg.delay;
		const held = heldGhost(look, local);
		const paint = (cc: CanvasRenderingContext2D) =>
			drawCuteGhost(cc, 0, 0, (S / 25) * 0.78, {
				shape: SHAPES[season],
				kind: tg.kind,
				state: 'normal',
				lookX: -1,
				lookY: 0,
				time: held && local < SHOCK_SECONDS ? 0 : time,
				// held: the feet stop mid-step
				step: held && local < SHOCK_SECONDS ? 1.2 : time * 9,
				chasing: true
			});
		if (held) {
			drawHeldGhost(c, paint, tg.x, tg.y, S, D, held, local, i);
			drawHeldAura(c, look, tg.x, tg.y, S, local, i);
		} else {
			c.save();
			c.translate(tg.x, tg.y);
			paint(c);
			c.restore();
		}
	});
	drawShockArcs(c, look, cast.targets, cast.hX, cast.hY, S, t);
}

const SHOCK_FRAMES = [0.02, 0.06, 0.12, 0.24, 1.0, 2.0, 2.75, 3.15];

function sceneShock(): void {
	ctx.fillStyle = '#0d0b12';
	ctx.fillRect(0, 0, vw, vh);
	const Z = 40;
	const cast0 = shockCast(world.layout);
	const span = Math.min(9.5, cast0.row.x1 - cast0.row.x0 + 1);
	const cw = Math.round(span * Z);
	const ch = Math.round(2.6 * Z);
	const perLine = Math.max(1, Math.min(4, Math.floor((vw - 40) / (cw + 10))));
	const lines = Math.ceil(SHOCK_FRAMES.length / perLine);
	const blockH = lines * (ch + 24) + 34;
	const y0 = Math.max(30, (vh - blockH * 2 - 50) / 2);
	(['bolt', 'plasma'] as const).forEach((look, v) => {
		const yb = y0 + v * blockH;
		label(ctx, SHOCK_NAMES[look], vw / 2, yb + 4, 16);
		SHOCK_FRAMES.forEach((t, i) => {
			const col = i % perLine;
			const line = Math.floor(i / perLine);
			const x = (vw - perLine * (cw + 10) + 10) / 2 + col * (cw + 10);
			const y = yb + 30 + line * (ch + 24);
			const midX = cast0.row.x0 + span / 2;
			const map = cell(ctx, x, y, cw, ch, midX, cast0.row.y + 0.5, Z);
			const cast = shockCast(world.layout, map);
			ctx.save();
			clipCell(ctx, x, y, cw, ch);
			drawShockAt(ctx, look, cast, Z, t, `shock${v}-${i}`);
			ctx.restore();
			label(ctx, `${t.toFixed(2)} с`, x + cw / 2, y + ch + 11, 11);
		});
	});
}

function sceneShockLive(): void {
	const L = world.layout;
	const S = L.tileSize;
	const t = time % 4.4;
	drawShockAt(ctx, shock, shockCast(L), S, t, 'live');
	label(ctx, `${SHOCK_NAMES[shock]} — игровой масштаб, повтор каждые 4.4 с`, vw / 2, 24, 15);
}

// ── the loop ───────────────────────────────────────────────────────────────────────

function frame(realDt: number): void {
	const dt = realDt * (slow ? 0.25 : 1);
	time += dt;
	world.update(dt);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
	if (scene === 'mask' || scene === 'shock') {
		if (scene === 'mask') sceneMask();
		else sceneShock();
		return;
	}
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, () => false);
	if (scene === 'icons') sceneIcons();
	else if (scene === 'lineup') sceneLineup();
	else sceneShockLive();
	world.drawOverlay(ctx);
	void INK;
}

window.addEventListener('resize', layout);
layout();
if (q.has('capture')) {
	(window as unknown as { __advance: (s: number) => void }).__advance = (seconds: number) => {
		for (let i = 0; i < Math.round(seconds * 60); i++) frame(1 / 60);
	};
	frame(0);
} else {
	let last = performance.now();
	const loop = (now: number) => {
		frame(Math.min(0.1, Math.max(0, (now - last) / 1000)));
		last = now;
		requestAnimationFrame(loop);
	};
	requestAnimationFrame(loop);
}
