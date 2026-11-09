import type { GhostService } from '../../logic/actors/GhostService';
import type { GhostKind, GhostModel } from '../../logic/actors/GhostModel';
import type { GridLayout } from '../maze/GridView';
import type { HypnosisMode } from '../../logic/rules/HypnosisService';
import { drawDropGhost, dropStateFor } from './dropGhost';

/** `disc` is the plain round ghost; `drop` is the summer water drop (`dropGhost.ts`). */
/** Radians of the stride per tile walked: a full step cycle every ~1.1 tiles. */
const STRIDE_PER_TILE = 5.7;

export type GhostStyle = 'disc' | 'drop';

export class GhostView {
	/** The look to draw; the level renderer sets it from the season. */
	style: GhostStyle = 'disc';
	/** Render time in seconds, for the drop's idle motion. */
	time = 0;
	/** Distance walked by each ghost (tiles), so a drop's feet step with the ground covered. */
	private readonly walked = new Map<GhostKind, { x: number; y: number; distance: number }>();
	/** The ghosts are hunting, not scattering (set from the service each draw). */
	private chasing = false;

	draw(
		ctx: CanvasRenderingContext2D,
		ghosts: GhostService,
		layout: GridLayout,
		powerTimer: number,
		msOverdrive: boolean,
		vanish = 0,
		hypnosis: HypnosisMode | null = null
	): void {
		if (!Number.isFinite(layout.tileSize) || layout.tileSize <= 0) {
			console.error('GhostView.draw', 'invalid layout tile size', layout.tileSize);
			return;
		}
		this.chasing = ghosts.currentMode === 'chase';
		for (const ghost of ghosts.list) {
			this.drawGhost(ctx, ghost, layout, powerTimer, msOverdrive, hypnosis);
		}
		if (vanish < 1) {
			for (const ghost of ghosts.banishedList) {
				this.drawVanishing(ctx, ghost, layout, powerTimer, msOverdrive, vanish);
			}
		}
	}

	/**
	 * A ghost the lair code sent away (`p` 0..1): it stops, swells a little, then shrinks
	 * and rises as it fades, while sparks in its colour fly out and go out.
	 */
	private drawVanishing(
		ctx: CanvasRenderingContext2D,
		ghost: GhostModel,
		layout: GridLayout,
		powerTimer: number,
		msOverdrive: boolean,
		p: number
	): void {
		const t = Math.max(0, Math.min(1, p));
		const S = layout.tileSize;
		const position = ghost.position;
		const x = layout.offsetX + position.x * S;
		const y = layout.offsetY + position.y * S;
		const fade = t < 0.25 ? 1 : 1 - (t - 0.25) / 0.75;
		const scale = t < 0.25 ? 1 + t * 0.6 : 1.15 * fade;
		if (fade > 0) {
			ctx.save();
			ctx.globalAlpha *= fade;
			ctx.translate(x, y - t * t * S * 0.35);
			ctx.scale(scale, scale);
			ctx.translate(-x, -y);
			this.drawGhost(ctx, ghost, layout, powerTimer, msOverdrive);
			ctx.restore();
		}
		if (t > 0.2) {
			const k = (t - 0.2) / 0.8;
			ctx.save();
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha *= 1 - k;
			ctx.fillStyle = this.colorFor(ghost.kind);
			for (let i = 0; i < 8; i++) {
				const a = (i / 8) * Math.PI * 2 + ghost.kind.length;
				const r = S * (0.15 + k * 0.45);
				const side = Math.max(1, S * 0.12 * (1 - k * 0.6));
				ctx.fillRect(x + Math.cos(a) * r - side / 2, y + Math.sin(a) * r - side / 2, side, side);
			}
			ctx.restore();
		}
	}

	private drawGhost(
		ctx: CanvasRenderingContext2D,
		ghost: GhostModel,
		layout: GridLayout,
		powerTimer: number,
		msOverdrive: boolean,
		hypnosis: HypnosisMode | null = null
	): void {
		const position = ghost.position;
		if (!Number.isFinite(position.x) || !Number.isFinite(position.y)) {
			console.error('GhostView.drawGhost', 'invalid ghost position', {
				kind: ghost.kind,
				position
			});
			return;
		}
		const x = layout.offsetX + position.x * layout.tileSize;
		const y = layout.offsetY + position.y * layout.tileSize;
		const radius = Math.max(2, layout.tileSize * 0.34);
		let lookX = 0;
		let lookY = 0;
		if (ghost.facing === 'UP') {
			lookY = -1;
		} else if (ghost.facing === 'DOWN') {
			lookY = 1;
		} else if (ghost.facing === 'LEFT') {
			lookX = -1;
		} else if (ghost.facing === 'RIGHT') {
			lookX = 1;
		}
		if (this.style === 'drop') {
			this.drawDrop(
				ctx,
				ghost,
				x,
				y,
				layout.tileSize,
				lookX,
				lookY,
				powerTimer,
				msOverdrive,
				hypnosis
			);
			return;
		}
		if (ghost.state === 'eyes') {
			this.drawEyes(ctx, x, y, radius, lookX, lookY);
			return;
		}
		const frightened = ghost.state === 'frightened';
		const hypnotized = ghost.state === 'hypnotized';
		const enraged = ghost.state === 'enraged';
		const flash =
			frightened && powerTimer > 0 && powerTimer < 2 && Math.floor(powerTimer * 4) % 2 === 0;
		ctx.save();
		if (ghost.state === 'lair' || ghost.state === 'exiting') {
			ctx.globalAlpha = 0.72;
		}
		if (hypnotized) {
			ctx.fillStyle = '#79ff6f';
		} else if (enraged) {
			ctx.fillStyle = '#ff4d4d';
		} else if (frightened) {
			if (flash) {
				ctx.fillStyle = '#e8efff';
			} else if (msOverdrive) {
				ctx.fillStyle = '#59f0ff';
			} else {
				ctx.fillStyle = '#2f2fd8';
			}
		} else {
			ctx.fillStyle = this.colorFor(ghost.kind);
		}
		ctx.beginPath();
		ctx.arc(x, y, radius, 0, Math.PI * 2);
		ctx.fill();
		if (hypnotized) {
			ctx.strokeStyle = 'rgba(121, 255, 111, 0.65)';
			ctx.lineWidth = Math.max(1, radius * 0.12);
			ctx.beginPath();
			ctx.arc(x, y, radius * 1.22, 0, Math.PI * 2);
			ctx.stroke();
		}
		if (enraged) {
			ctx.strokeStyle = 'rgba(255, 77, 77, 0.75)';
			ctx.lineWidth = Math.max(1, radius * 0.14);
			ctx.beginPath();
			ctx.arc(x, y, radius * 1.18, 0, Math.PI * 2);
			ctx.stroke();
		}
		const eyeRadius = Math.max(1, radius * 0.18);
		const eyeOffsetX = radius * 0.34;
		const eyeOffsetY = radius * 0.18;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(
			x - eyeOffsetX + lookX * radius * 0.12,
			y - eyeOffsetY + lookY * radius * 0.12,
			eyeRadius,
			0,
			Math.PI * 2
		);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(
			x + eyeOffsetX + lookX * radius * 0.12,
			y - eyeOffsetY + lookY * radius * 0.12,
			eyeRadius,
			0,
			Math.PI * 2
		);
		ctx.fill();
		if (enraged) {
			ctx.fillStyle = '#ffffff';
		} else if (hypnotized) {
			// the pupils say what the hypnosis makes it: green eats dots, red hunts ghosts
			ctx.fillStyle = hypnosis === 'hunter' ? '#ff1f1f' : '#14b81c';
		} else if (frightened) {
			ctx.fillStyle = '#ffb14d';
		} else {
			ctx.fillStyle = '#030509';
		}
		ctx.beginPath();
		ctx.arc(
			x - eyeOffsetX + lookX * radius * 0.24,
			y - eyeOffsetY + lookY * radius * 0.24,
			Math.max(1, eyeRadius * 0.5),
			0,
			Math.PI * 2
		);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(
			x + eyeOffsetX + lookX * radius * 0.24,
			y - eyeOffsetY + lookY * radius * 0.24,
			Math.max(1, eyeRadius * 0.5),
			0,
			Math.PI * 2
		);
		ctx.fill();
		ctx.restore();
	}

	/** The stride phase of a ghost: grows with the tiles it walks (a jump, as a tunnel, adds none). */
	private strideOf(ghost: GhostModel): number {
		const { x, y } = ghost.position;
		const seen = this.walked.get(ghost.kind);
		if (!seen) {
			this.walked.set(ghost.kind, { x, y, distance: 0 });
			return 0;
		}
		const moved = Math.hypot(x - seen.x, y - seen.y);
		if (moved < 1.5) {
			seen.distance += moved;
		}
		seen.x = x;
		seen.y = y;
		return seen.distance * STRIDE_PER_TILE;
	}

	private drawDrop(
		ctx: CanvasRenderingContext2D,
		ghost: GhostModel,
		x: number,
		y: number,
		tileSize: number,
		lookX: number,
		lookY: number,
		powerTimer: number,
		msOverdrive: boolean,
		hypnosis: HypnosisMode | null
	): void {
		const state = dropStateFor({ state: ghost.state, hypnosis, overdrive: msOverdrive });
		const frightened = state === 'scared' || state === 'overdrive';
		const flashing = frightened && powerTimer > 0 && powerTimer < 2;
		ctx.save();
		if (ghost.state === 'lair' || ghost.state === 'exiting') {
			ctx.globalAlpha = 0.72;
		}
		drawDropGhost(ctx, x, y, (tileSize / 25) * 0.78, {
			kind: ghost.kind,
			state,
			flashing,
			white: flashing && Math.floor(powerTimer * 4) % 2 === 0,
			lookX,
			lookY,
			time: this.time,
			step: this.strideOf(ghost),
			chasing: this.chasing
		});
		ctx.restore();
	}

	private drawEyes(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		radius: number,
		lookX: number,
		lookY: number
	): void {
		const eyeRadius = Math.max(1, radius * 0.24);
		const eyeOffsetX = radius * 0.34;
		const eyeOffsetY = radius * 0.18;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.arc(x - eyeOffsetX, y - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(x + eyeOffsetX, y - eyeOffsetY, eyeRadius, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = '#030509';
		ctx.beginPath();
		ctx.arc(
			x - eyeOffsetX + lookX * radius * 0.24,
			y - eyeOffsetY + lookY * radius * 0.24,
			Math.max(1, eyeRadius * 0.5),
			0,
			Math.PI * 2
		);
		ctx.fill();
		ctx.beginPath();
		ctx.arc(
			x + eyeOffsetX + lookX * radius * 0.24,
			y - eyeOffsetY + lookY * radius * 0.24,
			Math.max(1, eyeRadius * 0.5),
			0,
			Math.PI * 2
		);
		ctx.fill();
	}

	private colorFor(kind: GhostModel['kind']): string {
		if (kind === 'BLINKY') {
			return '#ff4d4d';
		}
		if (kind === 'PINKY') {
			return '#ff9de2';
		}
		if (kind === 'INKY') {
			return '#59f0ff';
		}
		return '#ffb14d';
	}
}
