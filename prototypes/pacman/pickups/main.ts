// Throwaway comparison page for the berserk pickup in the hell's maze (part II, step 1): the
// gauntlet that is lost on the plates against three candidates in the family of the HUD's fist
// in flame, on the real maze, next to the other pickups. Deleted once the owner has chosen.
import { GRID_DOOM } from '../../../src/games/pacman/config/mazes';
import { GridModel } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridService } from '../../../src/games/pacman/logic/maze/GridService';
import { DoomPickupService } from '../../../src/games/pacman/logic/doom/DoomPickupService';
import { DoomWorld } from '../../../src/games/pacman/render/doom/DoomWorld';
import { DOOM_TILE } from '../../../src/games/pacman/render/doom/DoomBake';
import { glowTexture, pickupSprite } from '../../../src/games/pacman/render/doom/DoomSprites';
import { VARIANT_PAINTERS, bake } from './variants';
import type { PickupVariant } from './variants';

type Choice = 'now' | PickupVariant;
const CHOICES: ReadonlyArray<{ id: Choice; name: string; glow: number }> = [
	{ id: 'now', name: 'Сейчас: железная перчатка', glow: 0xff7a1a },
	{ id: 'flame', name: '1 · Кулак в пламени', glow: 0xff7a1a },
	{ id: 'medallion', name: '2 · Медальон', glow: 0xffd27a },
	{ id: 'rune', name: '3 · Рунный круг', glow: 0xff5a2a }
];
const W = 1280;
const H = 720;
const D = 2;
const TIME = 1.2;

const grid = new GridService(new GridModel(GRID_DOOM));
const tiles = new DoomPickupService(grid).list.map((p) => p.tile);
const KINDS = ['barrel', 'bfg', 'medkit', 'berserk'] as const;

const world = new DoomWorld(GRID_DOOM, tiles);
const base = document.createElement('canvas');
base.width = W * D;
base.height = H * D;
const bctx = base.getContext('2d') as CanvasRenderingContext2D;
bctx.setTransform(D, 0, 0, D, 0, 0);
world.resize(W, H, D);
world.setMood(false, false);
world.update(0.016);
world.drawWorld(bctx);
world.drawMood(bctx, []);
const layout = world.layout;
const s = layout.tileSize;
const u = s / DOOM_TILE;

const baked = new Map<PickupVariant, HTMLCanvasElement>();
for (const k of Object.keys(VARIANT_PAINTERS) as PickupVariant[]) {
	baked.set(k, bake(VARIANT_PAINTERS[k]));
}

/** The pickups as `DoomCombatView.drawPickups` draws them, with the berserk's icon swapped. */
function drawPickups(ctx: CanvasRenderingContext2D, choice: Choice): void {
	tiles.slice(0, 4).forEach((tile, i) => {
		const kind = KINDS[i];
		const px = layout.offsetX + (tile.x + 0.5) * s;
		const py = layout.offsetY + (tile.y + 0.5) * s;
		const phase = tile.x * 1.7 + tile.y * 0.9;
		const cur = CHOICES.find((c) => c.id === choice) ?? CHOICES[0];
		const sprite = pickupSprite(kind);
		const icon = kind === 'berserk' && choice !== 'now' ? (baked.get(choice) as HTMLCanvasElement) : sprite.icon;
		const tint = kind === 'berserk' ? cur.glow : sprite.glow;
		const scale = 1 + 0.05 * Math.sin(TIME * 2.6 + phase);
		const glow = ((64 * 0.95) / 3) * u;
		ctx.save();
		ctx.translate(px, py);
		ctx.scale(scale, scale);
		ctx.globalCompositeOperation = 'lighter';
		ctx.globalAlpha = 0.7;
		ctx.drawImage(glowTexture(tint), -glow / 2, -glow / 2, glow, glow);
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		ctx.rotate(Math.sin(TIME * 2 + phase) * 0.1);
		ctx.drawImage(icon, -13 * u, -13 * u, 26 * u, 26 * u);
		ctx.restore();
	});
}

function paint(canvas: HTMLCanvasElement, choice: Choice, crop: { x: number; y: number; w: number; h: number } | null): void {
	const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
	const view = crop ?? { x: 0, y: 0, w: W, h: H };
	const k = canvas.width / (view.w * D);
	ctx.setTransform(1, 0, 0, 1, 0, 0);
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.setTransform(k * D, 0, 0, k * D, -view.x * k * D, -view.y * k * D);
	ctx.drawImage(base, 0, 0, W, H);
	drawPickups(ctx, choice);
}

const state = { gray: false, choice: 'flame' as Choice };
const $ = <E extends HTMLElement>(id: string) => document.getElementById(id) as E;
const overview = $<HTMLCanvasElement>('overview');
overview.width = W * D;
overview.height = H * D;
const panels = $('panels');
const bb = tiles[3];
const cx = layout.offsetX + (bb.x + 0.5) * s;
const cy = layout.offsetY + (bb.y + 0.5) * s;
const CROP_W = 7 * s;
const CROP_H = 5.5 * s;
const crop = { x: cx - CROP_W * 0.62, y: cy - CROP_H * 0.6, w: CROP_W, h: CROP_H };
const panelCanvases = new Map<Choice, HTMLCanvasElement>();
for (const c of CHOICES) {
	const fig = document.createElement('figure');
	const cv = document.createElement('canvas');
	cv.width = 560;
	cv.height = Math.round((560 * CROP_H) / CROP_W);
	const cap = document.createElement('figcaption');
	cap.textContent = c.name;
	fig.append(cv, cap);
	panels.append(fig);
	panelCanvases.set(c.id, cv);
}

function render(): void {
	document.body.classList.toggle('gray', state.gray);
	paint(overview, state.choice, null);
	for (const c of CHOICES) paint(panelCanvases.get(c.id) as HTMLCanvasElement, c.id, crop);
	for (const b of document.querySelectorAll<HTMLButtonElement>('[data-choice]')) {
		b.setAttribute('aria-pressed', String(b.dataset.choice === state.choice));
	}
	$('gray').setAttribute('aria-pressed', String(state.gray));
}

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-choice]')) {
	b.addEventListener('click', () => {
		state.choice = b.dataset.choice as Choice;
		render();
	});
}
$('gray').addEventListener('click', () => {
	state.gray = !state.gray;
	render();
});
render();
