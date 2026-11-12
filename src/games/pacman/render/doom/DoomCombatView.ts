import type { GridLayout } from '../maze/GridView';
import type { GridService } from '../../logic/maze/GridService';
import type { DoomBossService } from '../../logic/doom/DoomBossService';
import type { DoomAbilityService } from '../../logic/doom/DoomAbilityService';
import { minionPosition } from '../../logic/doom/DoomMinions';
import { VOID_FLICKER } from '../../logic/doom/DoomBalance';
import { DOOM_TILE } from './DoomBake';
import { barrelSprite, glowTexture, pickupSprite } from './DoomSprites';
import { drawImp } from './HellImpView';
import {
	drawLaneBeam,
	drawLaneWarning,
	drawRiftBeam,
	drawRiftWarning,
	RiftScars
} from './doomRift';
import type { Lane } from './doomRift';
import { CROSS_ACTIVE } from '../../logic/doom/DoomBalance';
import { block, liveTile, sealLocked, sealWarn, tar, warnTile } from './attackArt';
import type { Tile } from './attackArt';

export class DoomCombatView {
	private readonly scars = new RiftScars();
	/** When the cross's burst was first seen, for its short fade. */
	private crossT0 = -1;

	/** Everything lying on the floor, drawn under the boss. */
	drawGround(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		doom: DoomAbilityService,
		grid: GridService,
		layout: GridLayout,
		time: number
	): void {
		this.drawCorruption(ctx, boss, grid, layout, time);
		this.drawVoidCells(ctx, boss, layout, time);
		this.drawPendingSeals(ctx, boss, layout, time);
		this.scars.track(boss.hazardList, time);
		this.scars.draw(ctx, layout, time);
		this.drawHazardWarnings(ctx, boss, layout, time);
		this.drawCrossTelegraph(ctx, boss, grid, layout, time);
		this.drawPickups(ctx, doom, layout, time);
		this.drawBarrels(ctx, doom, layout, time);
	}

	/** Hazard blasts and minions, drawn over the boss (projectiles live in DoomFxView). */
	drawAir(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		layout: GridLayout,
		time: number
	): void {
		this.drawHazardBlasts(ctx, boss, layout, time);
		this.drawMinions(ctx, boss, layout, time);
	}

	/** Pull: chains of void dragging the player toward the boss. */
	drawPull(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		player: { x: number; y: number },
		layout: GridLayout,
		time: number
	): void {
		const left = boss.pullRemaining;
		if (left <= 0) {
			return;
		}
		const s = layout.tileSize;
		const b = boss.position;
		const x0 = layout.offsetX + b.x * s;
		const y0 = layout.offsetY + b.y * s;
		const x1 = layout.offsetX + player.x * s;
		const y1 = layout.offsetY + player.y * s;
		const fade = Math.min(1, left / 0.5);
		const len = Math.hypot(x1 - x0, y1 - y0);
		const nx = len > 0 ? -(y1 - y0) / len : 0;
		const ny = len > 0 ? (x1 - x0) / len : 0;
		ctx.save();
		for (let strand = 0; strand < 3; strand += 1) {
			const cord = () => {
				ctx.beginPath();
				for (let i = 0; i <= 24; i += 1) {
					const u = i / 24;
					const wave =
						Math.sin(u * 10 - time * 9 + strand * 2.1) * s * 0.18 * Math.sin(u * Math.PI);
					const x = x0 + (x1 - x0) * u + nx * wave;
					const y = y0 + (y1 - y0) * u + ny * wave;
					if (i === 0) {
						ctx.moveTo(x, y);
					} else {
						ctx.lineTo(x, y);
					}
				}
				ctx.stroke();
			};
			// a dark body, then the hot line: the same cord as the maze's outline
			ctx.globalCompositeOperation = 'source-over';
			ctx.strokeStyle = `rgba(30,4,8,${0.7 * fade})`;
			ctx.lineWidth = Math.max(1.4, s * 0.1);
			cord();
			ctx.globalCompositeOperation = 'lighter';
			ctx.strokeStyle = `rgba(255,96,64,${0.55 * fade})`;
			ctx.lineWidth = Math.max(1, s * 0.04);
			cord();
		}
		// beads crawling toward the boss
		for (let i = 0; i < 6; i += 1) {
			const u = 1 - ((time * 0.9 + i / 6) % 1);
			ctx.fillStyle = `rgba(255,190,120,${0.8 * fade})`;
			ctx.beginPath();
			ctx.arc(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, Math.max(1, s * 0.07), 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.restore();
	}

	/** Phase 3: outer corridors fill with tar (they slow the player). */
	private drawCorruption(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		grid: GridService,
		layout: GridLayout,
		time: number
	): void {
		if (boss.corruption <= 0) {
			return;
		}
		const tiles: Tile[] = [];
		for (let y = 0; y < grid.height; y += 1) {
			for (let x = 0; x < grid.width; x += 1) {
				if (boss.isCorrupted(x, y)) {
					tiles.push({ c: x, r: y });
				}
			}
		}
		tar(ctx, tiles, layout.offsetX, layout.offsetY, layout.tileSize, time);
	}

	private drawPendingSeals(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		for (const seal of boss.pendingSealList) {
			const p = 1 - Math.max(0, seal.warn) / seal.total;
			sealWarn(ctx, layout.offsetX + seal.x * s, layout.offsetY + seal.y * s, s, p, time);
		}
	}

	private drawHazardWarnings(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		ctx.save();
		for (const hazard of boss.hazardList) {
			if (hazard.warn <= 0 || hazard.warn > hazard.warnVisible) {
				continue;
			}
			const p = 1 - hazard.warn / hazard.warnVisible;
			// a later wave (the eruption's outer ring) stays dim until its turn comes
			const soon = Math.min(1, Math.max(0.3, 1.3 - hazard.warn));
			const flicker = (p > 0.75 && hazard.warn < 0.4 ? 0.5 + 0.5 * Math.sin(time * 50) : 1) * soon;
			const rift = hazard.kind === 'rift';
			if (rift) {
				drawRiftWarning(ctx, hazard, layout, p, flicker, time);
				continue;
			}
			ctx.globalAlpha = soon;
			for (const tile of hazard.tiles) {
				warnTile(ctx, layout.offsetX + tile.x * s, layout.offsetY + tile.y * s, s, p, time);
			}
			// a ring that closes on the middle of the blast
			const mid = centre(hazard.tiles);
			ctx.globalAlpha = flicker;
			ctx.strokeStyle = 'rgba(255,214,110,.95)';
			ctx.lineWidth = Math.max(1.4, s * 0.07);
			ctx.setLineDash([s * 0.2, s * 0.14]);
			ctx.lineDashOffset = -time * s;
			ctx.beginPath();
			ctx.arc(
				layout.offsetX + (mid.x + 0.5) * s,
				layout.offsetY + (mid.y + 0.5) * s,
				s * (2.6 - 1.4 * p),
				0,
				Math.PI * 2
			);
			ctx.stroke();
			ctx.setLineDash([]);
			ctx.globalAlpha = 1;
		}
		ctx.restore();
	}

	private drawHazardBlasts(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		ctx.save();
		for (const hazard of boss.hazardList) {
			if (hazard.warn > 0) {
				continue;
			}
			const k = Math.max(0, hazard.active / hazard.activeTotal);
			if (hazard.kind === 'rift' && hazard.tiles.length > 0) {
				drawRiftBeam(ctx, hazard, layout, k, time);
				continue;
			}
			for (const tile of hazard.tiles) {
				liveTile(ctx, layout.offsetX + tile.x * s, layout.offsetY + tile.y * s, s, k);
			}
			// the shock wave runs out from the middle
			const mid = centre(hazard.tiles);
			ctx.strokeStyle = `rgba(255,236,200,${0.85 * k})`;
			ctx.lineWidth = Math.max(2, s * 0.12);
			ctx.beginPath();
			ctx.arc(
				layout.offsetX + (mid.x + 0.5) * s,
				layout.offsetY + (mid.y + 0.5) * s,
				s * (1 + 1.6 * (1 - k)),
				0,
				Math.PI * 2
			);
			ctx.stroke();
		}
		ctx.restore();
	}

	private drawVoidCells(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		for (const cell of boss.voidCellList) {
			const px = layout.offsetX + cell.x * s;
			const py = layout.offsetY + cell.y * s;
			let alpha = 1.0;
			if (cell.timer < VOID_FLICKER) {
				alpha = 0.4 + 0.6 * Math.abs(Math.sin(time * 10));
			}
			if (cell.kind === 'seal') {
				sealLocked(ctx, px, py, s, time, alpha);
			} else {
				block(ctx, px, py, s, time, alpha);
			}
		}
	}

	/** The cross's four arms: marked like the rift while he winds up, burst when he lets go. */
	private drawCrossTelegraph(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		grid: GridService,
		layout: GridLayout,
		time: number
	): void {
		const rs = boss.renderState;
		const telegraph = boss.state === 'TELEGRAPH' && rs.shape === 'cross';
		const active = boss.state === 'ACTIVE' && rs.shape === 'cross';
		if (!active) {
			this.crossT0 = -1;
		}
		if (!telegraph && !active) {
			return;
		}
		const tile = boss.tile;
		const lanes: Lane[] = [];
		for (const dir of [
			{ dx: 1, dy: 0 },
			{ dx: -1, dy: 0 },
			{ dx: 0, dy: 1 },
			{ dx: 0, dy: -1 }
		]) {
			let cx = tile.x + dir.dx;
			let cy = tile.y + dir.dy;
			let steps = 0;
			let last: { x: number; y: number } | null = null;
			while (steps < 32 && grid.isInside(cx, cy) && grid.isWalkable(cx, cy)) {
				last = { x: cx, y: cy };
				cx += dir.dx;
				cy += dir.dy;
				steps += 1;
			}
			if (last) {
				lanes.push({ a: { x: tile.x + dir.dx, y: tile.y + dir.dy }, b: last });
			}
		}
		ctx.save();
		if (telegraph) {
			const p = rs.progress;
			const soon = p > 0.85 ? 0.55 + 0.45 * Math.sin(p * 120) : 1;
			for (const lane of lanes) {
				drawLaneWarning(ctx, lane, layout, p, soon, time);
			}
		} else {
			if (this.crossT0 < 0) {
				this.crossT0 = time;
			}
			const k = Math.max(0, 1 - (time - this.crossT0) / CROSS_ACTIVE);
			for (const lane of lanes) {
				drawLaneBeam(ctx, lane, layout, k, time);
			}
		}
		ctx.restore();
	}

	// Power-up from the prototype: additive glow plus icon, gently pulsing and swaying.
	// A pickup that cannot be taken right now (full health, occupied slot) is dimmed.
	private drawPickups(
		ctx: CanvasRenderingContext2D,
		doom: DoomAbilityService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		const u = s / DOOM_TILE;
		for (const pickup of doom.pickupList) {
			const px = layout.offsetX + (pickup.tile.x + 0.5) * s;
			const py = layout.offsetY + (pickup.tile.y + 0.5) * s;
			const phase = pickup.tile.x * 1.7 + pickup.tile.y * 0.9;
			if (pickup.visible && pickup.kind) {
				const sprite = pickupSprite(pickup.kind);
				const ready = doom.canCollect(pickup.kind);
				const scale = 1 + 0.05 * Math.sin(time * 2.6 + phase);
				const glow = ((64 * 0.95) / 3) * u;
				ctx.save();
				ctx.translate(px, py);
				ctx.scale(scale, scale);
				ctx.globalCompositeOperation = 'lighter';
				ctx.globalAlpha = ready ? 0.7 : 0.25;
				ctx.drawImage(glowTexture(sprite.glow), -glow / 2, -glow / 2, glow, glow);
				ctx.globalCompositeOperation = 'source-over';
				ctx.globalAlpha = ready ? 1 : 0.45;
				ctx.rotate(ready ? Math.sin(time * 2 + phase) * 0.1 : 0);
				ctx.drawImage(sprite.icon, -13 * u, -13 * u, 26 * u, 26 * u);
				ctx.restore();
			} else if (!pickup.visible && pickup.respawnProgress > 0) {
				const radius = 9 * u;
				ctx.save();
				ctx.globalAlpha = 0.35;
				ctx.strokeStyle = '#ff8a5a';
				ctx.lineWidth = Math.max(1, 1.4 * u);
				ctx.beginPath();
				ctx.arc(px, py, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pickup.respawnProgress);
				ctx.stroke();
				if (pickup.pendingKind) {
					const sprite = pickupSprite(pickup.pendingKind);
					ctx.globalAlpha = 0.18;
					ctx.drawImage(sprite.icon, px - 8 * u, py - 8 * u, 16 * u, 16 * u);
				}
				ctx.restore();
			}
		}
	}

	private drawBarrels(
		ctx: CanvasRenderingContext2D,
		doom: DoomAbilityService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		const u = s / DOOM_TILE;
		for (const barrel of doom.barrelList) {
			const px = layout.offsetX + (barrel.x + 0.5) * s;
			const py = layout.offsetY + (barrel.y + 0.5) * s;
			const flash = barrel.timer < 2 ? Math.abs(Math.sin(time * 8)) : 0;
			ctx.save();
			ctx.translate(px, py);
			if (flash > 0) {
				const glow = 22 * u;
				ctx.globalCompositeOperation = 'lighter';
				ctx.globalAlpha = flash * 0.8;
				ctx.drawImage(glowTexture(0xff6a1a), -glow / 2, -glow / 2, glow, glow);
				ctx.globalCompositeOperation = 'source-over';
				ctx.globalAlpha = 1;
			}
			ctx.drawImage(barrelSprite(), -12 * u, -12 * u, 24 * u, 24 * u);
			ctx.restore();
		}
	}

	/** Blinky's imps: small horned ghosts, eyes and chevron pointing where they run. */
	private drawMinions(
		ctx: CanvasRenderingContext2D,
		boss: DoomBossService,
		layout: GridLayout,
		time: number
	): void {
		const s = layout.tileSize;
		for (const minion of boss.minionList) {
			const pos = minionPosition(minion);
			drawImp(
				ctx,
				minion.kind,
				layout.offsetX + pos.x * s,
				layout.offsetY + pos.y * s,
				s,
				minion.facing,
				time,
				Math.min(1, minion.lifetime / 2)
			);
		}
	}
}

/** The middle of a set of tiles, in tile coordinates. */
function centre(tiles: readonly { readonly x: number; readonly y: number }[]): {
	x: number;
	y: number;
} {
	const n = Math.max(1, tiles.length);
	return {
		x: tiles.reduce((m, t) => m + t.x, 0) / n,
		y: tiles.reduce((m, t) => m + t.y, 0) / n
	};
}
