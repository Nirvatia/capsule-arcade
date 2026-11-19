import type { LevelSession } from '../../../src/games/pacman/logic/level/LevelSession';
import type { GhostKind } from '../../../src/games/pacman/logic/actors/GhostModel';
import { glowTexture } from '../../../src/games/pacman/render/common/textures';
import { drawCuteGhost } from '../../../src/games/pacman/render/actors/cuteGhost';
import type { CuteState } from '../../../src/games/pacman/render/actors/cuteGhost';
import type { HeroView } from '../../../src/games/pacman/render/actors/HeroView';
import { winterPellet } from '../../../src/games/pacman/render/seasons/meadow/seasonFood';
import { winterSceneBauble } from './winterFood';
import { cropWinterArt, winterReadabilityArt } from './winterDetails';

function label(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size = 11): void {
	ctx.fillStyle = 'rgba(232,240,250,.9)';
	ctx.font = `700 ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
	ctx.textAlign = 'center';
	ctx.fillText(text, x, y);
}

export function drawWinterReadability(
	ctx: CanvasRenderingContext2D,
	vw: number,
	vh: number,
	session: LevelSession,
	hero: HeroView,
	rage: HeroView,
	time: number,
	night: number,
	gameTile: number
): void {
	ctx.fillStyle = '#0b0e14';
	ctx.fillRect(0, 0, vw, vh);
	const top = 112;
	const gap = 10;
	const margin = 18;
	const cardW = (vw - margin * 2 - gap * 3) / 4;
	const cardH = (vh - top - 18 - gap * 2) / 3;
	const { lair, corridor } = winterReadabilityArt();
	const card = (col: number, row: number, lairFloor: boolean): { x: number; y: number; cx: number; cy: number } => {
		const x = margin + col * (cardW + gap);
		const y = top + row * (cardH + gap);
		cropWinterArt(ctx, lairFloor ? lair : corridor, x, y, cardW, cardH);
		if (night > 0) {
			ctx.fillStyle = `rgba(52,68,112,${night * 0.32})`;
			ctx.fillRect(x, y, cardW, cardH);
		}
		ctx.strokeStyle = 'rgba(145,174,207,.32)';
		ctx.strokeRect(x + 0.5, y + 0.5, cardW - 1, cardH - 1);
		return { x, y, cx: x + cardW / 2, cy: y + cardH / 2 + 3 };
	};
	const kinds: GhostKind[] = ['BLINKY', 'PINKY', 'INKY', 'CLYDE'];
	kinds.forEach((kind, i) => {
		const p = card(i, 0, true);
		drawCuteGhost(ctx, p.cx, p.cy, (Math.min(76, cardH * 0.46) / 25) * 0.78, {
			shape: 'bunny',
			kind,
			state: 'normal',
			lookX: 1,
			lookY: 0,
			time,
			step: time * 2,
			chasing: false
		});
		drawCuteGhost(ctx, p.x + 28, p.y + cardH - 26, (gameTile / 25) * 0.78, {
			shape: 'bunny',
			kind,
			state: 'normal',
			lookX: 1,
			lookY: 0,
			time,
			step: 0,
			chasing: false
		});
		label(ctx, kind, p.cx, p.y + 17);
		label(ctx, '×1', p.x + 28, p.y + cardH - 7, 9);
	});
	const states: Array<{ state: CuteState; name: string; white?: boolean }> = [
		{ state: 'scared', name: 'ИСПУГ' },
		{ state: 'scared', name: 'БЕЛАЯ ФАЗА', white: true },
		{ state: 'eyes', name: 'ГЛАЗА' },
		{ state: 'overdrive', name: 'OVERDRIVE' }
	];
	states.forEach((entry, i) => {
		const p = card(i, 1, true);
		drawCuteGhost(ctx, p.cx, p.cy, (Math.min(76, cardH * 0.46) / 25) * 0.78, {
			shape: 'bunny',
			kind: 'BLINKY',
			state: entry.state,
			flashing: entry.white,
			white: entry.white,
			lookX: -1,
			lookY: 0,
			time,
			step: time * 2,
			chasing: false
		});
		label(ctx, entry.name, p.cx, p.y + 17);
	});
	for (const [i, view, look, name] of [
		[0, hero, 'normal', 'ГЕРОЙ'],
		[1, rage, 'energized', 'ГЕРОЙ · RAGE']
	] as const) {
		const p = card(i, 2, false);
		const tile = Math.min(78, cardH * 0.5);
		const pos = session.player.position;
		view.draw(ctx, session.player, {
			tileSize: tile,
			offsetX: p.cx - pos.x * tile,
			offsetY: p.cy - pos.y * tile
		}, time, { look, charge: 0, dying: false });
		label(ctx, name, p.cx, p.y + 17);
	}
	{
		const p = card(2, 2, false);
		const glow = glowTexture(0x9fd8ff);
		ctx.globalAlpha = 0.5;
		ctx.globalCompositeOperation = 'lighter';
		ctx.drawImage(glow, p.cx - 31, p.cy - 31, 62, 62);
		ctx.globalCompositeOperation = 'source-over';
		ctx.globalAlpha = 1;
		ctx.drawImage(winterSceneBauble(), p.cx - 30, p.cy - 30, 60, 60);
		label(ctx, 'ЭНЕРДЖАЙЗЕР', p.cx, p.y + 17);
	}
	{
		const p = card(3, 2, false);
		ctx.drawImage(winterPellet(), p.cx - 15, p.cy - 15, 30, 30);
		ctx.drawImage(winterPellet(), p.cx + 35 - gameTile / 2, p.cy - gameTile / 2, gameTile, gameTile);
		label(ctx, 'ЕДА · ×3 И ×1', p.cx, p.y + 17);
	}
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
}
