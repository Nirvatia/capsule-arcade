// Prototype: the Pretender for B-7 (`station-b7/mimicLooks.ts`) alone on a clean sheet, large, for
// the owner's approval: the heading (four ways, a 180 live and slowed), every state with its
// effects (the tell's pulse, the rage's ring and hanging mask, the fright's tremble and sweat, the
// flashing, the eyes), the mimicry frame by frame and looped into the level's own spore, the
// squad's four colours and the game's scale. No station, no play.
//   `node prototypes/pacman/build.mjs pretender`, open the file.  ?candy: the mock-up's colours
import { GRID_STATION } from '../../../src/games/pacman/config/mazes';
import { createB7Scene } from '../../../src/games/pacman/render/station/b7/b7Scene';
import type { SquadKind } from '../../../src/games/pacman/render/station/albino';
import { drawMimic, type MOpts, type MState } from '../station-b7/mimicLooks';

const q = new URLSearchParams(location.search);
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const scene = createB7Scene(GRID_STATION);
const candy = q.has('candy');

const KINDS: readonly SquadKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const DIRS: Record<string, readonly [number, number]> = {
	'→': [1, 0],
	'↓': [0, 1],
	'←': [-1, 0],
	'↑': [0, -1]
};

interface Cell {
	readonly label: string;
	readonly note?: string;
	/** Draws into the cell centred at (x, y), `S` the creature's tile. */
	readonly draw: (x: number, y: number, S: number, t: number, dt: number) => void;
}

/** The level's own spore (stage space scaled to the tile), breathing out of step with the food. */
function sporeAt(S: number, t: number) {
	return (c: CanvasRenderingContext2D, alpha: number, scale: number) => {
		c.save();
		c.globalAlpha *= alpha;
		c.scale(S / scene.TILE, S / scene.TILE);
		scene.drawSporeAt(c, 0, 0, scale * (1 + 0.04 * Math.sin(t * 2.0 + Math.PI)));
		c.restore();
	};
}

function one(
	x: number,
	y: number,
	S: number,
	t: number,
	st: MState,
	o: {
		kind?: SquadKind;
		dir?: readonly [number, number];
		face?: { x: number; y: number };
		fold?: number;
		walk?: boolean;
		reveal?: number;
	}
): void {
	const [lx, ly] = o.dir ?? [1, 0];
	const kind = o.kind ?? 'BLINKY';
	const opts: MOpts = {
		lookX: lx,
		lookY: ly,
		faceX: o.face?.x ?? lx,
		faceY: o.face?.y ?? ly,
		time: t,
		step: o.walk === false ? 0 : t * 6 + KINDS.indexOf(kind) * 0.8,
		fold: o.fold ?? 0,
		reveal: o.reveal,
		candy,
		spore: sporeAt(S, t)
	};
	drawMimic(ctx, x, y, S, kind, 'pretender', st, opts);
}

/** A heading that turns back every `period` s, its face eased at `rate` /s (12 is the game's feel). */
function turner(period: number, rate: number) {
	let face = { x: 1, y: 0 };
	return (t: number, dt: number) => {
		const dir: readonly [number, number] = Math.floor(t / period) % 2 ? [-1, 0] : [1, 0];
		const e = Math.min(1, dt * rate);
		face = { x: face.x + (dir[0] - face.x) * e, y: face.y + (dir[1] - face.y) * e };
		return { dir, face };
	};
}
const fast180 = turner(1.6, 12);
const slow180 = turner(2.4, 2.2);

/** The rage's loop: hunting, the mask goes up, the true face, the mask back down. */
function revealLoop(t: number): number {
	const u = (t % 4.4) / 4.4;
	if (u < 0.25) return 0;
	if (u < 0.33) return (u - 0.25) / 0.08;
	if (u < 0.85) return 1;
	if (u < 0.93) return 1 - (u - 0.85) / 0.08;
	return 0;
}

/** The mimicry's loop: walk, fold, lie as a spore, unfold. */
function foldLoop(t: number): number {
	const u = (t % 5.2) / 5.2;
	if (u < 0.2) return 0;
	if (u < 0.42) return (u - 0.2) / 0.22;
	if (u < 0.82) return 1;
	return 1 - (u - 0.82) / 0.18;
}

const ROWS: readonly (readonly Cell[])[] = [
	[
		...Object.entries(DIRS).map(([name, dir]) => ({
			label: `охота ${name}`,
			note: 'маска отстаёт, глаз по курсу',
			draw: (x: number, y: number, S: number, t: number) => one(x, y, S, t, 'hunt', { dir })
		})),
		{
			label: 'разворот 180°',
			note: 'как в игре',
			draw: (x, y, S, t, dt) => one(x, y, S, t, 'hunt', fast180(t, dt))
		},
		{
			label: 'разворот 180°, медленно',
			note: 'маска переезжает через лицо',
			draw: (x, y, S, t, dt) => one(x, y, S, t, 'hunt', slow180(t, dt))
		}
	],
	[
		{
			label: 'срыв маски',
			note: 'охота → ярость, цикл',
			draw: (x, y, S, t) => {
				const r = revealLoop(t);
				one(x, y, S, t, r > 0 ? 'rage' : 'hunt', { reveal: r });
			}
		},
		{ label: 'сигнал тактики', note: 'глаз пульсирует, улыбка шире', draw: (x, y, S, t) => one(x, y, S, t, 'tell', {}) },
		{ label: 'ярость (побег)', note: 'маска на макушке, истинное лицо', draw: (x, y, S, t) => one(x, y, S, t, 'rage', {}) },
		{ label: 'испуг', note: 'дрожь, пот, зигзаг', draw: (x, y, S, t) => one(x, y, S, t, 'fright', {}) },
		{ label: 'мигание', note: 'конец испуга, 2.2 Гц', draw: (x, y, S, t) => one(x, y, S, t, 'flash', {}) },
		{ label: 'глаза', note: 'съеден, бежит домой', draw: (x, y, S, t) => one(x, y, S, t, 'eyes', {}) }
	],
	[
		...[0, 0.35, 0.6, 0.8, 1].map((k) => ({
			label: k === 1 ? 'мимикрия: спора' : `мимикрия ${Math.round(k * 100)}%`,
			note: k === 0 ? 'встал на клетку' : k === 1 ? 'спора уровня' : undefined,
			draw: (x: number, y: number, S: number, t: number) => one(x, y, S, t, 'mimic', { fold: k, walk: false })
		})),
		{
			label: 'мимикрия, цикл',
			note: 'свернуться, лежать, встать',
			draw: (x, y, S, t) => {
				const k = foldLoop(t);
				one(x, y, S, t, k > 0 ? 'mimic' : 'hunt', { fold: k, walk: k === 0 });
			}
		}
	],
	[
		...KINDS.map((kind) => ({
			label: kind,
			draw: (x: number, y: number, S: number, t: number) => one(x, y, S, t, 'hunt', { kind })
		})),
		{
			label: 'в игре: 34 px',
			note: 'охота, сигнал, ярость, испуг',
			draw: (x: number, y: number, _S: number, t: number) => small(x, y, 34, t)
		},
		{
			label: 'в игре: 24 px',
			note: 'телефон',
			draw: (x: number, y: number, _S: number, t: number) => small(x, y, 24, t)
		}
	]
];

/** The four kinds at the game's tile, in four states, two by two rows. */
function small(x: number, y: number, S: number, t: number): void {
	const states: MState[] = ['hunt', 'tell', 'rage', 'fright'];
	KINDS.forEach((kind, i) => {
		const cx = x + (i - 1.5) * S * 1.25;
		one(cx, y - S * 0.65, S, t, states[i], { kind });
		one(cx, y + S * 0.65, S, t, 'hunt', { kind, dir: [[1, 0], [0, 1], [-1, 0], [0, -1]][i] as [number, number] });
	});
}

let last = 0;
function frame(now: number): void {
	const t = now / 1000;
	const dt = last ? Math.min(0.05, t - last) : 1 / 60;
	last = t;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	if (view.width !== Math.round(vw * D)) {
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
	}
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#15191b';
	ctx.fillRect(0, 0, vw, vh);
	const head = 34;
	ctx.fillStyle = '#e8e2d4';
	ctx.font = '600 15px ui-sans-serif, system-ui, sans-serif';
	ctx.textBaseline = 'middle';
	ctx.fillText(`ПРИТВОРЩИК B-7${candy ? ' · цвета макета' : ''}`, 14, head / 2);
	const cols = 6;
	const cw = vw / cols;
	const ch = (vh - head) / ROWS.length;
	const S = Math.min(cw, ch) * 0.76;
	ROWS.forEach((row, r) => {
		row.forEach((cell, i) => {
			const x0 = i * cw;
			const y0 = head + r * ch;
			ctx.fillStyle = (r + i) % 2 ? '#1b2022' : '#1e2426';
			ctx.fillRect(x0 + 2, y0 + 2, cw - 4, ch - 4);
			ctx.fillStyle = '#d9d3c4';
			ctx.font = '600 12px ui-sans-serif, system-ui, sans-serif';
			ctx.fillText(cell.label, x0 + 10, y0 + 14);
			if (cell.note) {
				ctx.fillStyle = '#8b9590';
				ctx.font = '11px ui-sans-serif, system-ui, sans-serif';
				ctx.fillText(cell.note, x0 + 10, y0 + ch - 13);
			}
			ctx.save();
			ctx.beginPath();
			ctx.rect(x0 + 2, y0 + 22, cw - 4, ch - 42);
			ctx.clip();
			cell.draw(x0 + cw / 2, y0 + ch / 2 + 2, S, t, dt);
			ctx.restore();
		});
	});
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
