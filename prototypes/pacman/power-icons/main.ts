// Prototype: the abilities' icons (echo, mask, shock) as one family. The first row is the game's
// icons as they are now; the next three are candidate sets (`sets.ts`). Each row shows the icons
// at game scale on the four seasons' corridor tones, at the HUD slot's size and enlarged.
import { drawAbilityIcon } from '../../../src/games/pacman/render/actors/abilityArt';
import { EchoCloneView } from '../../../src/games/pacman/render/actors/EchoCloneView';
import { SETS, type Kind } from './sets';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const KINDS: Kind[] = ['echo', 'mask', 'shock'];
const NAMES: Record<Kind, string> = { echo: 'эхо', mask: 'маска', shock: 'разряд' };
const CORRIDORS = ['#465166', '#403c3a', '#6f5137', '#a68b58'];
const echo = new EchoCloneView();

type Paint = (c: CanvasRenderingContext2D, kind: Kind, x: number, y: number, S: number) => void;

/** The game's current icons, frozen at one moment. */
const current: Paint = (c, kind, x, y, S) => {
	if (kind === 'echo') {
		echo.drawToken(c, { x: 0, y: 0 }, 8, { tileSize: S, offsetX: x, offsetY: y } as never, 0.4);
	} else {
		drawAbilityIcon(c, kind, x, y, S, 0.4);
	}
};

const rows: Array<{ name: string; paint: Paint }> = [
	{ name: 'Сейчас в игре', paint: current },
	...SETS.map((s) => ({ name: s.name, paint: s.paint as Paint }))
];

function frame(): void {
	const vw = window.innerWidth;
	const rowH = 190;
	const vh = rows.length * rowH + 20;
	view.style.height = `${vh}px`;
	view.width = Math.round(vw * D);
	view.height = Math.round(vh * D);
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#161a20';
	ctx.fillRect(0, 0, vw, vh);
	rows.forEach((row, ri) => {
		const top = 10 + ri * rowH;
		ctx.fillStyle = '#e8e4da';
		ctx.font = '600 14px system-ui, sans-serif';
		ctx.fillText(row.name, 16, top + 16);
		// game scale: a strip of the four seasons' corridors, a 28 px tile
		const T = 28;
		CORRIDORS.forEach((col, ci) => {
			const x0 = 16 + ci * (T * 3 + 8);
			ctx.fillStyle = col;
			ctx.fillRect(x0, top + 34, T * 3, T * 3);
			KINDS.forEach((k, ki) => {
				const cx = x0 + T * 0.5 + ki * T;
				const cy = top + 34 + T * (ki === 1 ? 1.5 : ki === 0 ? 0.5 : 2.5);
				row.paint(ctx, k, cx, cy, T);
			});
		});
		// the HUD slot's size on its dark panel
		const hx = 16 + 4 * (T * 3 + 8) + 12;
		ctx.fillStyle = '#2a2320';
		ctx.beginPath();
		ctx.roundRect(hx, top + 34, 3 * 56 + 16, 84, 10);
		ctx.fill();
		KINDS.forEach((k, ki) => row.paint(ctx, k, hx + 8 + 28 + ki * 56, top + 34 + 42, 48));
		// enlarged
		const ex = hx + 3 * 56 + 40;
		KINDS.forEach((k, ki) => {
			const cx = ex + 60 + ki * 130;
			ctx.fillStyle = '#20262e';
			ctx.beginPath();
			ctx.roundRect(cx - 58, top + 26, 116, 150, 10);
			ctx.fill();
			row.paint(ctx, k, cx, top + 90, 110);
			ctx.fillStyle = '#9aa2ad';
			ctx.font = '12px system-ui, sans-serif';
			ctx.textAlign = 'center';
			ctx.fillText(NAMES[k], cx, top + 168);
			ctx.textAlign = 'left';
		});
	});
}

window.addEventListener('resize', frame);
frame();
