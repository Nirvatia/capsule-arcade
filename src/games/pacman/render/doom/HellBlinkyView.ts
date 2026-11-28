import type { DoomDirection } from '../../logic/doom/DoomGraph';
import type { DoomShape, DoomStateName } from '../../logic/doom/DoomBossModel';
import type { GridLayout } from '../maze/GridView';
import { dirAngle, lightGlow } from './hellGhost';
import { LavaDash } from './doomDashFx';
import { drawBoss } from './hellActors';
import type { BossMode, BossState } from './hellActors';

/** Everything the view needs about one body (the boss or its phase-3 echo). */
export interface BossSnapshot {
	/** Tile-center coordinates. */
	readonly x: number;
	readonly y: number;
	readonly phase: number;
	readonly state: DoomStateName;
	readonly shape: DoomShape;
	/** Where the body is heading (or aims, during a wind-up). */
	readonly dir: DoomDirection;
	/** Telegraph progress 0..1. */
	readonly progress: number;
	readonly alpha: number;
	/** 0..1 while the boss materialises at the start of the fight. */
	readonly intro: number;
	/** Angle toward the player: his eyes never leave him. */
	readonly look: number;
	/** 0..1 after taking a hit (he squeezes his eyes and recoils). */
	readonly hit: number;
	/** The phase-3 decoy: same body, cold violet and translucent. */
	readonly echo: boolean;
	/** He has just hit the hero: he gloats. */
	readonly gloat?: boolean;
}

/** What his body and face do now, from the fight's state (`hellActors.drawBoss`). */
function modeOf(snap: BossSnapshot, tele: number): { mode: BossMode; k: number } {
	if (snap.hit > 0.05) return { mode: 'hit', k: 1 - snap.hit };
	switch (snap.state) {
		case 'STUNNED':
			return { mode: 'stunned', k: 0 };
		case 'TRANSITION':
			return { mode: 'omen', k: 0.8 };
		case 'TELEGRAPH':
			// the dash's crouch, or the swell before a cast
			return snap.shape === 'wedge'
				? { mode: 'windup', k: Math.min(1, tele * 1.3) }
				: { mode: 'charge', k: tele };
		case 'ACTIVE':
			return snap.shape === 'wedge' ? { mode: 'windup', k: 1 } : { mode: 'cast', k: 0.3 };
		case 'RECOVER':
			return { mode: 'recover', k: 0 };
		default:
			return { mode: snap.gloat ? 'gloat' : 'chase', k: 0 };
	}
}

/**
 * Blinky, lord of hell (the owner's pick of the `hell-actors` prototype): his body and face are
 * `hellActors.drawBoss` (he breathes, leans, tracks the hero with his eyes, crouches before the
 * dash, swells before a cast, squeezes on a hit, slumps stunned, gloats; the phases grow his horns,
 * crack him, add tusks, a second pair of horns and lava). The dash stays the lava ball (`LavaDash`,
 * unchanged): over the wind-up's end he turns into it, rolls, and turns back. The echo is the same
 * body in cold violet.
 */
export class HellBlinkyView {
	private readonly lava = new LavaDash();

	draw(ctx: CanvasRenderingContext2D, snap: BossSnapshot, layout: GridLayout, time: number): void {
		if (snap.alpha <= 0.01) {
			return;
		}
		const S = layout.tileSize;
		const phase = Math.min(3, Math.max(1, Math.floor(snap.phase))) as 1 | 2 | 3;
		const intro = Math.min(1, Math.max(0, snap.intro));
		const tele = snap.state === 'TELEGRAPH' ? snap.progress : 0;
		const stunned = snap.state === 'STUNNED';
		const transition = snap.state === 'TRANSITION';
		const dash = snap.state === 'ACTIVE' && snap.shape === 'wedge';
		const dashTele = snap.state === 'TELEGRAPH' && snap.shape === 'wedge';
		const heading = dirAngle(snap.dir);
		const cx = layout.offsetX + snap.x * S;
		const cy = layout.offsetY + snap.y * S;
		let x = cx;
		let y = cy;
		if (dashTele) {
			// he crouches and rocks back before the dash
			const back = S * 0.2 * Math.min(1, tele * 2);
			x -= Math.cos(heading) * back;
			y -= Math.sin(heading) * back;
		}
		const lava = this.lava;
		lava.update(cx, cy, dashTele, dash, snap.progress, time, S);
		const morph = lava.morph;
		ctx.save();
		ctx.globalAlpha = snap.alpha * (snap.echo ? 0.72 : 1);
		lava.drawFloor(ctx, S, time, snap.echo);
		lava.drawCrouch(ctx, x, y, S, snap.echo);
		ctx.restore();
		const shiver = (transition ? 0.08 : 0) + (stunned ? 0.03 : 0);
		if (shiver > 0) {
			x += Math.sin(time * 90) * S * 0.5 * shiver;
			y += Math.cos(time * 77) * S * 0.5 * shiver;
		}

		ctx.save();
		ctx.globalAlpha = snap.alpha * (snap.echo ? 0.72 : 1) * (0.3 + 0.7 * intro);
		lightGlow(
			ctx,
			x,
			y,
			S * 0.53,
			snap.echo ? '150,90,255' : '255,70,30',
			snap.echo ? 0.3 : tele * 0.3
		);

		// the body, unless the turn into the ball is over: smaller and fading as it turns
		if (morph < 0.999) {
			const { mode, k } = modeOf(snap, tele);
			const state: BossState = {
				dir: snap.dir,
				phase,
				mode,
				k,
				look: { x: Math.cos(snap.look), y: Math.sin(snap.look) }
			};
			const size = (0.3 + 0.7 * intro) * (1 - 0.4 * morph);
			ctx.save();
			ctx.globalAlpha *= Math.pow(1 - morph, 0.7);
			ctx.translate(x, y);
			ctx.scale(size, size);
			ctx.translate(-x, -y);
			if (snap.echo) {
				ctx.filter = 'hue-rotate(250deg) saturate(0.7) brightness(1.1)';
			}
			drawBoss(ctx, x, y, S, time * (stunned ? 0.35 : 1), state);
			ctx.restore();
		}
		if (morph > 0.001) {
			lava.drawBall(ctx, x, y, S, heading, phase, time, snap.echo, snap.hit);
		}
		lava.drawAir(ctx, S, time, snap.echo);
		lava.drawSteam(ctx, x, y, S, time, 0.7);
		ctx.restore();
	}
}
