import type { AbilityService } from '../../logic/bonuses/AbilityService';
import type { GhostService } from '../../logic/actors/GhostService';
import type { GridLayout } from '../maze/GridView';
import { ABILITY } from '../../config/abilityConfig';
import { EchoCloneView } from './EchoCloneView';

// The abilities on the board. PLACEHOLDER art for the mask and the shock (their tokens, the
// struck ghosts, the masked hero): the `powers` prototype picks the real looks. The echo keeps
// its accepted wisps (`EchoCloneView`).

const SHOCK = 'rgba(190, 232, 255,';
const MASK = 'rgba(255, 242, 168,';

export class AbilityView {
	private readonly echoView = new EchoCloneView();

	/** The token (if one lies on the board) and the echo's riot: under the actors. */
	drawUnder(
		ctx: CanvasRenderingContext2D,
		abilities: AbilityService,
		layout: GridLayout,
		time: number
	): void {
		const at = abilities.tokenPosition;
		if (abilities.phase === 'token' && at) {
			if (abilities.kind === 'echo') {
				this.echoView.drawToken(ctx, at, abilities.tokenTimer, layout, time);
			} else {
				this.drawToken(ctx, abilities, at, layout, time);
			}
		}
		this.echoView.draw(ctx, abilities.echo, layout, time);
	}

	/** The ghosts the shock holds, and the discharge's arcs: over the ghosts. */
	drawOver(
		ctx: CanvasRenderingContext2D,
		abilities: AbilityService,
		ghosts: GhostService,
		layout: GridLayout,
		time: number
	): void {
		const S = layout.tileSize;
		if (!Number.isFinite(S) || S <= 0) {
			return;
		}
		ctx.save();
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		for (const ghost of ghosts.list) {
			const held = ghosts.frozenFor(ghost.kind);
			if (held <= 0) {
				continue;
			}
			const p = ghost.position;
			const x = layout.offsetX + p.x * S;
			const y = layout.offsetY + p.y * S;
			const shaking = held < ABILITY.shock.shakeSeconds;
			this.crackle(ctx, x, y, S * 0.55, time + ghost.kind.length, shaking ? 0.5 : 0.9, S);
		}
		const strike = abilities.strike;
		const age = abilities.strikeAge;
		if (strike && age < 0.3) {
			const fade = 1 - age / 0.3;
			ctx.strokeStyle = `${SHOCK}${0.9 * fade})`;
			ctx.lineWidth = Math.max(1, S * 0.08);
			for (const link of strike.links) {
				const from = link.from < 0 ? strike : strike.links[link.from];
				if (!from) {
					continue;
				}
				this.bolt(
					ctx,
					layout.offsetX + from.x * S,
					layout.offsetY + from.y * S,
					layout.offsetX + link.x * S,
					layout.offsetY + link.y * S,
					S,
					time
				);
			}
		}
		ctx.restore();
	}

	/** The masked hero's halo: drawn around the (faded) hero. */
	drawMaskHalo(
		ctx: CanvasRenderingContext2D,
		position: { readonly x: number; readonly y: number },
		layout: GridLayout,
		time: number
	): void {
		const S = layout.tileSize;
		const x = layout.offsetX + position.x * S;
		const y = layout.offsetY + position.y * S;
		ctx.save();
		ctx.strokeStyle = `${MASK}${0.55 + 0.25 * Math.sin(time * 6)})`;
		ctx.lineWidth = Math.max(1, S * 0.06);
		ctx.setLineDash([S * 0.12, S * 0.1]);
		ctx.beginPath();
		ctx.arc(x, y, S * 0.62, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
	}

	private drawToken(
		ctx: CanvasRenderingContext2D,
		abilities: AbilityService,
		at: { readonly x: number; readonly y: number },
		layout: GridLayout,
		time: number
	): void {
		const S = layout.tileSize;
		const x = layout.offsetX + at.x * S;
		const y = layout.offsetY + at.y * S;
		const left = abilities.tokenTimer;
		const blinking = left < ABILITY.tokenBlinkSeconds && Math.floor(left * 5) % 2 === 0;
		const pulse = 0.5 + 0.5 * Math.sin(time * 4);
		const tint = abilities.kind === 'mask' ? MASK : SHOCK;
		ctx.save();
		ctx.globalAlpha = blinking ? 0.45 : 1;
		ctx.strokeStyle = `${tint}${0.6 + 0.3 * pulse})`;
		ctx.lineWidth = Math.max(1, S * 0.06);
		ctx.beginPath();
		ctx.arc(x, y, S * (0.4 + 0.05 * pulse), 0, Math.PI * 2);
		ctx.stroke();
		ctx.fillStyle = `${tint}0.95)`;
		ctx.strokeStyle = 'rgba(20, 24, 40, 0.9)';
		ctx.lineWidth = Math.max(1, S * 0.04);
		if (abilities.kind === 'mask') {
			// a small ghost: dome, skirt
			const r = S * 0.2;
			ctx.beginPath();
			ctx.arc(x, y - r * 0.2, r, Math.PI, 0);
			ctx.lineTo(x + r, y + r * 0.9);
			for (let i = 0; i < 3; i += 1) {
				const x0 = x + r - ((i + 0.5) * 2 * r) / 3;
				ctx.lineTo(x0, y + r * 0.55);
				ctx.lineTo(x + r - ((i + 1) * 2 * r) / 3, y + r * 0.9);
			}
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		} else {
			// a bolt
			const h = S * 0.24;
			ctx.beginPath();
			ctx.moveTo(x + h * 0.25, y - h);
			ctx.lineTo(x - h * 0.45, y + h * 0.1);
			ctx.lineTo(x + h * 0.05, y + h * 0.1);
			ctx.lineTo(x - h * 0.25, y + h);
			ctx.lineTo(x + h * 0.45, y - h * 0.1);
			ctx.lineTo(x - h * 0.05, y - h * 0.1);
			ctx.closePath();
			ctx.fill();
			ctx.stroke();
		}
		ctx.restore();
	}

	/** A ring of short jagged sparks around a held ghost. */
	private crackle(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		r: number,
		time: number,
		alpha: number,
		S: number
	): void {
		const frame = Math.floor(time * 20);
		ctx.strokeStyle = `${SHOCK}${alpha})`;
		ctx.lineWidth = Math.max(1, S * 0.05);
		ctx.beginPath();
		for (let i = 0; i < 6; i += 1) {
			const a = (i / 6) * Math.PI * 2 + frame * 0.7;
			const jitter = ((frame * 13 + i * 7) % 5) / 5;
			ctx.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
			ctx.lineTo(
				x + Math.cos(a + 0.25) * r * (1.15 + 0.2 * jitter),
				y + Math.sin(a + 0.25) * r * (1.15 + 0.2 * jitter)
			);
		}
		ctx.stroke();
	}

	/** A jagged line from one point to another. */
	private bolt(
		ctx: CanvasRenderingContext2D,
		x0: number,
		y0: number,
		x1: number,
		y1: number,
		S: number,
		time: number
	): void {
		const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / (S * 0.5)));
		const nx = -(y1 - y0);
		const ny = x1 - x0;
		const len = Math.hypot(nx, ny) || 1;
		const frame = Math.floor(time * 30);
		ctx.beginPath();
		ctx.moveTo(x0, y0);
		for (let i = 1; i < n; i += 1) {
			const t = i / n;
			const off = ((((frame + i * 17) * 7919) % 100) / 100 - 0.5) * S * 0.5;
			ctx.lineTo(x0 + (x1 - x0) * t + (nx / len) * off, y0 + (y1 - y0) * t + (ny / len) * off);
		}
		ctx.lineTo(x1, y1);
		ctx.stroke();
	}
}
