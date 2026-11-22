// Prototype: the station's actors from the game's own painters (`render/station/`), large and at
// game scale: the wraiths (with both glitch looks), the hunters (four colours, four headings, a
// lunge), the cocoon, the spores and the flares. The station itself is seen in the game (dev
// panel: Station).
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import { drawWraith } from '../../../src/games/pacman/render/station/stationWraith';
import { drawCocoon, drawHunter } from '../../../src/games/pacman/render/station/stationHunter';
import { drawFlare, drawSpore } from '../../../src/games/pacman/render/station/stationFood';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const D = Math.min(window.devicePixelRatio || 1, 2);
const params = new URLSearchParams(location.search);
const frozen = params.has('t') ? Number(params.get('t')) : null;
const KINDS: readonly GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
const HEADINGS = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

type Item = { name: string; draw: (x: number, y: number, s: number, t: number) => void };

const items: Item[] = [
	...KINDS.map<Item>((k) => ({ name: `wraith ${k.toLowerCase()}`, draw: (x, y, s, t) => drawWraith(ctx, x, y, s, k, 0, t, 1) })),
	{ name: 'wraith glitch: whole', draw: (x, y, s, t) => drawWraith(ctx, x, y, s, 'INKY', 0, Math.floor(t) + 0.43, 1, 'whole') },
	{ name: 'wraith glitch: cut', draw: (x, y, s, t) => drawWraith(ctx, x, y, s, 'INKY', 0, Math.floor(t) + 0.43, 1, 'cut') },
	...KINDS.map<Item>((k, i) => ({ name: `hunter ${k.toLowerCase()}`, draw: (x, y, s, t) => drawHunter(ctx, x, y, s, k, HEADINGS[i], t, { lit: 1 }) })),
	{ name: 'hunter lunge', draw: (x, y, s, t) => drawHunter(ctx, x, y, s, 'BLINKY', 0, t, { lit: 1, bite: 1 }) },
	{ name: 'cocoon', draw: (x, y, s, t) => drawCocoon(ctx, x, y, s, 'PINKY', t) },
	{ name: 'spores', draw: (x, y, s, t) => [0.1, 0.4, 0.6, 0.9].forEach((k, i) => drawSpore(ctx, x + ((i % 2) - 0.5) * s * 0.6, y + (Math.floor(i / 2) - 0.5) * s * 0.6, s, t, k)) },
	{ name: 'flare / lit', draw: (x, y, s, t) => (drawFlare(ctx, x - s * 0.45, y, s, t, false), drawFlare(ctx, x + s * 0.45, y, s, t, true)) }
];

function frame(now: number): void {
	const t = frozen ?? now / 1000;
	const vw = window.innerWidth;
	const vh = window.innerHeight;
	if (view.width !== Math.round(vw * D)) {
		view.width = Math.round(vw * D);
		view.height = Math.round(vh * D);
	}
	ctx.setTransform(D, 0, 0, D, 0, 0);
	ctx.fillStyle = '#07090a';
	ctx.fillRect(0, 0, vw, vh);
	const cols = 6;
	const rows = Math.ceil(items.length / cols);
	const cell = Math.min((vw - 40) / cols, (vh - 110) / rows);
	const x0 = (vw - cell * cols) / 2;
	items.forEach((it, i) => {
		const cx = x0 + (i % cols) * cell + cell / 2;
		const cy = 16 + Math.floor(i / cols) * cell + cell / 2;
		ctx.fillStyle = '#11161a';
		ctx.beginPath();
		ctx.roundRect(cx - cell / 2 + 5, cy - cell / 2 + 5, cell - 10, cell - 10, 8);
		ctx.fill();
		it.draw(cx, cy - 8, cell * 0.38, t);
		ctx.fillStyle = 'rgba(216,226,234,.75)';
		ctx.font = '600 12px "Courier New", monospace';
		ctx.textAlign = 'center';
		ctx.fillText(it.name, cx, cy + cell / 2 - 14);
	});
	// the same at game scale
	const s = (vh * 0.8) / 25;
	const y = 16 + rows * cell + s;
	items.forEach((it, i) => it.draw(x0 + 24 + i * s * 1.7, y, s, t));
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
