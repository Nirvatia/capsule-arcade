// Throwaway: the meadow world of a season exactly as the game draws it (`MeadowLevelRenderer`'s
// order), for judging the seasons. ?season=spring|summer|autumn|winter  ?storm=1  ?night=1
import { GRID_01 } from '../../../src/games/pacman/config/mazes';
import { MeadowWorld } from '../../../src/games/pacman/render/seasons/meadow/MeadowWorld';
import { meadowThemeFor } from '../../../src/games/pacman/render/seasons/meadow/meadowThemes';
import type { MeadowTheme } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';

const view = document.getElementById('view') as HTMLCanvasElement;
const ctx = view.getContext('2d') as CanvasRenderingContext2D;
const q = new URLSearchParams(location.search);
const D = 1;
const vw = window.innerWidth;
const vh = window.innerHeight;
view.width = vw;
view.height = vh;
const world = new MeadowWorld(GRID_01, meadowThemeFor(q.get('season') ?? 'spring') as MeadowTheme);
world.resize(vw, vh, D);
world.setMood(q.has('storm') ? 1 : 0, q.has('night') ? 1 : 0);
world.setLairGate(0);
for (let i = 0; i < 120; i += 1) world.update(0.1);
function frame(): void {
	ctx.setTransform(D, 0, 0, D, 0, 0);
	world.update(1 / 60);
	world.drawWorld(ctx);
	world.drawMood(ctx);
	world.drawFood(ctx, () => false);
	world.drawOverlay(ctx);
	requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
