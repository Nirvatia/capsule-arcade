// Throwaway: lair gate candidates on the real MeadowWorld. A contact sheet: rows the
// candidates (the current gate first), columns the seasons; each cell the lair, enlarged.
// ?night  ?open=<0..1>  ?zoom=<n>  ?full (one whole season frame, ?season=, ?gate=)
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';
import { CANDIDATES, type GateSeason } from './gates';

const q = new URLSearchParams(location.search);
const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const SEASONS: GateSeason[] = ['spring', 'summer', 'autumn', 'winter'];
const night = q.has('night') ? 1 : 0;
const open = Number(q.get('open') ?? 0);
const zoom = Number(q.get('zoom') ?? 3);
const W = 1280;
const H = 800;
const D = q.has('full') ? 1 : zoom;

type Gate = { x0: number; x1: number; y: number };
interface Internals {
	gates: Gate[];
	gateOpen: number;
	sc: number;
	wx: number;
	wy: number;
	t: number;
	drawGate(c: CanvasRenderingContext2D, g: Gate): void;
}

function makeWorld(season: GateSeason, gate: string): { world: MeadowWorld; me: Internals } {
	const world = new MeadowWorld(GRID_01, meadowThemeFor(season) as MeadowTheme);
	const me = world as unknown as Internals;
	const paint = CANDIDATES[gate];
	if (paint) {
		me.drawGate = (c, g) => paint(c, g, { open: me.gateOpen, season, night, t: me.t });
	}
	world.resize(W, H, D);
	world.setMood(0, night);
	world.setLairGate(open);
	for (let i = 0; i < 60; i += 1) world.update(0.1);
	return { world, me };
}

function render(world: MeadowWorld): HTMLCanvasElement {
	const c = document.createElement('canvas');
	c.width = W * D;
	c.height = H * D;
	const x = c.getContext('2d') as CanvasRenderingContext2D;
	x.setTransform(D, 0, 0, D, 0, 0);
	world.drawWorld(x);
	world.drawMood(x);
	world.drawFood(x, () => false);
	world.drawOverlay(x);
	return c;
}

const ids = ['now', ...Object.keys(CANDIDATES)];
if (q.has('full')) {
	const { world } = makeWorld((q.get('season') as GateSeason) ?? 'spring', q.get('gate') ?? 'now');
	view.width = W;
	view.height = H;
	ctx.drawImage(render(world), 0, 0);
} else {
	const cw = 300;
	const ch = 170;
	const label = 22;
	view.width = 40 + cw * SEASONS.length;
	view.height = label + ch * ids.length;
	ctx.fillStyle = '#07090a';
	ctx.fillRect(0, 0, view.width, view.height);
	ctx.font = '14px sans-serif';
	ctx.fillStyle = '#cfd6d8';
	SEASONS.forEach((s, i) => ctx.fillText(s, 40 + i * cw + 6, 16));
	ids.forEach((id, r) => {
		ctx.fillStyle = '#cfd6d8';
		ctx.fillText(id, 6, label + r * ch + ch / 2);
		SEASONS.forEach((s, i) => {
			const { world, me } = makeWorld(s, id);
			const g = me.gates[0];
			const cx = (me.wx + ((g.x0 + g.x1) / 2) * me.sc) * D;
			const cy = (me.wy + (g.y + 8) * me.sc) * D;
			const sw = cw;
			const sh = ch;
			ctx.imageSmoothingEnabled = true;
			ctx.drawImage(render(world), cx - sw / 2, cy - sh / 2, sw, sh, 40 + i * cw, label + r * ch, cw - 2, ch - 2);
		});
	});
}
