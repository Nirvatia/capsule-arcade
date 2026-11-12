import type { DoomDirection } from '../../logic/doom/DoomGraph';
import type { DoomShape, DoomStateName } from '../../logic/doom/DoomBossModel';
import type { GridLayout } from '../maze/GridView';
import type { CelTones, EyeStyle, GhostShape, HornStyle } from './hellGhost';
import {
	celBands,
	celOutline,
	dirAngle,
	drawEyes,
	drawHorns,
	ghostPath,
	lightGlow
} from './hellGhost';
import { DashTrack, drawCrouchEmbers, drawSpeedLines, drawSteam } from './doomDashFx';
import { IRON_HORN, drawCheeks, drawHelm } from './bossArmor';

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
	/** Angle toward the player: the eyes lock onto it during a wind-up. */
	readonly look: number;
	/** 0..1 white flash after taking a hit. */
	readonly hit: number;
	/** The phase-3 decoy: same body, cold violet and translucent. */
	readonly echo: boolean;
}

interface Skin extends CelTones {
	/** The rim light along the dome. */
	readonly rim: string;
	/** Lava cracks and the fire inside (rgb). */
	readonly fire: string;
	readonly horn: HornStyle;
	readonly eye: string;
}

const BONE: readonly [string, string] = ['#f1e4cc', '#9c8a72'];

/**
 * One body colour in every phase, the arcade red (the other colours are the imps'), with a thick
 * ink line, yellow eyes and a light rim so it parts from the red flesh. The phases differ by iron
 * (`bossArmor`): phase 1 short bone horns; phase 2 an iron helm; phase 3 the helm, cheek plates
 * and long iron horns.
 */
const BODY = {
	light: '#f4604e',
	mid: '#d0261f',
	shade: '#7a0c14',
	rim: '#ffc9a8',
	fire: '255,110,40',
	eye: '#ffe27a'
} as const;
const HORNS: readonly HornStyle[] = [
	{ length: 0.4, curl: 0, bone: BONE, ember: null },
	{ length: 0.5, curl: 0.15, bone: BONE, ember: null },
	{ length: 0.85, curl: 0.4, bone: IRON_HORN, ember: null }
];
const SKINS: readonly Skin[] = HORNS.map((horn) => ({ ...BODY, horn }));

const ECHO_SKIN: Skin = {
	light: '#d8c8ff',
	mid: '#6a46b8',
	shade: '#241046',
	rim: '#f0e8ff',
	fire: '170,120,255',
	horn: { length: 0.72, curl: 0.35, bone: ['#e8dcff', '#8068b8'], ember: '170,120,255' },
	eye: '#efe8ff'
};

/**
 * Blinky, lord of hell: the red arcade ghost turned demon, one tile in size, cel-shaded like
 * the heroes (hard tone bands, a thick ink line).
 * One body colour, red, in every phase; the phases differ by iron (`bossArmor`): phase 1 short bone
 * horns, phase 2 an iron helm, phase 3 the helm, cheek plates and long iron horns.
 * The eyes look where it is heading (on the wind-up: at the player); no chevron, the
 * eyes are enough for the boss (the imps keep theirs). Wind-up: it swells and shivers, the
 * mouth glows. Dash: stretched along the heading with afterimages. Stunned: spiral eyes.
 */
export class HellBlinkyView {
	private readonly dashTrack = new DashTrack();

	/** `ghost`: one of the dash's afterimages (the body only, no effects, no floor marks). */
	draw(
		ctx: CanvasRenderingContext2D,
		snap: BossSnapshot,
		layout: GridLayout,
		time: number,
		ghost = false
	): void {
		if (snap.alpha <= 0.01) {
			return;
		}
		const S = layout.tileSize;
		const phase = Math.min(3, Math.max(1, Math.floor(snap.phase)));
		const intro = Math.min(1, Math.max(0, snap.intro));
		const tele = snap.state === 'TELEGRAPH' ? snap.progress : 0;
		const stunned = snap.state === 'STUNNED';
		const transition = snap.state === 'TRANSITION';
		const dash = snap.state === 'ACTIVE' && snap.shape === 'wedge';
		const dashTele = snap.state === 'TELEGRAPH' && snap.shape === 'wedge';
		const recover = snap.state === 'RECOVER';
		const casting = snap.state === 'ACTIVE' && snap.shape === 'cast';
		const skin = snap.echo ? ECHO_SKIN : SKINS[phase - 1];
		const t = time * (stunned ? 0.35 : 1);
		const heading = dirAngle(snap.dir);
		const R = S * 0.5 * (0.3 + 0.7 * intro) * (1 + tele * 0.06);
		let x = layout.offsetX + snap.x * S;
		let y = layout.offsetY + snap.y * S;
		if (dashTele) {
			// he crouches and rocks back before the dash
			const back = S * 0.2 * Math.min(1, tele * 2);
			x -= Math.cos(heading) * back;
			y -= Math.sin(heading) * back;
		}
		if (!ghost) {
			this.dashTrack.update(x, y, dash, recover, time);
			this.dashTrack.drawFloor(ctx, S, heading, x, y, time);
		}
		const shiver = (transition ? 0.08 : 0) + (stunned ? 0.03 : 0) + tele * 0.04;
		if (shiver > 0) {
			x += Math.sin(time * 90) * R * shiver;
			y += Math.cos(time * 77) * R * shiver;
		}
		const bob = Math.sin(t * 3.2) * R * 0.03;
		const shape: GhostShape = {
			// sized so the horn tips (phase 3) end at the tile's top edge
			w: R * 0.64,
			domeY: -R * 0.02 + bob,
			hem: R * 0.78 + bob,
			feet: 4,
			torn: snap.echo ? 1 : 0,
			seed: 7
		};
		const pulse = 0.5 + 0.5 * Math.sin(t * (3 + phase * 1.5));

		ctx.save();
		ctx.globalAlpha = snap.alpha * (snap.echo ? 0.72 : 1) * (0.3 + 0.7 * intro);
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';

		// a dark pool and a glow under it, kept inside the tile
		if (!ghost) {
			const pool = ctx.createRadialGradient(x, y + R * 0.2, R * 0.2, x, y + R * 0.2, R);
			pool.addColorStop(0, 'rgba(0,0,0,0.5)');
			pool.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.fillStyle = pool;
			ctx.fillRect(x - R, y - R * 0.8, R * 2, R * 2);
			lightGlow(
				ctx,
				x,
				y,
				R * 1.05,
				snap.echo ? '150,90,255' : '255,70,30',
				snap.echo ? 0.3 : tele * 0.3
			);
		}

		if (dash && !ghost) {
			// afterimages trail the dash: the whole body again, fainter the further back
			for (let k = 4; k >= 1; k -= 1) {
				const off = k * 0.42;
				this.draw(
					ctx,
					{
						...snap,
						x: snap.x - Math.cos(heading) * off,
						y: snap.y - Math.sin(heading) * off,
						alpha: snap.alpha * (0.34 - k * 0.065)
					},
					layout,
					time,
					true
				);
			}
		}

		ctx.save();
		ctx.translate(x, y);
		if (dashTele) {
			ctx.rotate(heading);
			ctx.scale(1 - 0.1 * tele, 1 + 0.07 * tele);
			ctx.rotate(-heading);
		}
		if (dash) {
			// stretched along the heading, squeezed across it
			ctx.rotate(heading);
			ctx.scale(1.14, 0.88);
			ctx.rotate(-heading);
		}
		const burning = casting || tele > 0;
		drawHorns(
			ctx,
			0,
			0,
			shape,
			0.55,
			burning && !skin.horn.ember ? { ...skin.horn, ember: skin.fire } : skin.horn,
			pulse
		);
		this.drawBody(ctx, shape, skin, phase, t, snap);
		this.drawFace(ctx, shape, skin, phase, t, tele, casting, stunned, transition, recover, snap);
		ctx.restore();

		if (!ghost) {
			if (dashTele) {
				drawCrouchEmbers(ctx, S, heading, x, y, tele, time);
			} else if (dash) {
				drawSpeedLines(ctx, S, heading, x, y);
			} else if (recover) {
				drawSteam(ctx, S, x, y, time);
			}
		}
		ctx.restore();
	}

	private drawBody(
		ctx: CanvasRenderingContext2D,
		shape: GhostShape,
		skin: Skin,
		phase: number,
		t: number,
		snap: BossSnapshot
	): void {
		const { w, domeY, hem } = shape;
		ghostPath(ctx, 0, 0, shape, t);
		ctx.fillStyle = skin.mid;
		ctx.fill();

		ctx.save();
		ghostPath(ctx, 0, 0, shape, t);
		ctx.clip();
		celBands(ctx, shape, skin);
		if (phase >= 2 && !snap.echo) {
			drawHelm(ctx, shape);
		}
		if (snap.hit > 0) {
			ctx.fillStyle = `rgba(255,255,255,${0.85 * snap.hit})`;
			ctx.fillRect(-w * 1.3, domeY - w * 1.3, w * 2.6, hem - domeY + w * 2.6);
		}
		ctx.restore();
		celOutline(ctx, shape, t, skin.rim);
		if (phase >= 3 && !snap.echo) {
			ctx.save();
			ghostPath(ctx, 0, 0, shape, t);
			ctx.clip();
			drawCheeks(ctx, shape);
			ctx.restore();
		}
	}

	private drawFace(
		ctx: CanvasRenderingContext2D,
		shape: GhostShape,
		skin: Skin,
		phase: number,
		t: number,
		tele: number,
		casting: boolean,
		stunned: boolean,
		transition: boolean,
		recover: boolean,
		snap: BossSnapshot
	): void {
		const { w, domeY } = shape;
		const faceY = domeY + w * 0.35;
		// on the wind-up the eyes lock onto the player; otherwise they look ahead
		const look = tele > 0 ? snap.look : dirAngle(snap.dir);
		const hot = tele > 0.5 || casting;
		const eyes: EyeStyle = {
			sclera: hot ? '#ffffff' : skin.eye,
			glow: snap.echo || hot ? skin.fire : null
		};
		drawEyes(ctx, 0, faceY, w, look, eyes, transition ? 0 : recover ? 0.55 : 1, stunned, t);

		// mouth: a scowl in phase 1, a fanged grin later; it opens and glows on a wind-up
		const my = faceY + w * 0.42;
		const mw = w * (!snap.echo ? 0.36 : 0.5);
		const open = !snap.echo ? tele * 0.18 : 0.1 + tele * 0.14 + (casting ? 0.08 : 0);
		ctx.fillStyle = '#120000';
		ctx.beginPath();
		ctx.moveTo(-mw, my - w * 0.04);
		ctx.quadraticCurveTo(0, my + w * (0.06 + open), mw, my - w * 0.04);
		ctx.quadraticCurveTo(0, my + w * 0.02, -mw, my - w * 0.04);
		ctx.fill();
		if (open > 0.05) {
			lightGlow(
				ctx,
				0,
				my + w * open * 0.4,
				mw * 1.1,
				skin.fire,
				0.3 + tele * 0.6 + (casting ? 0.4 : 0)
			);
			ctx.fillStyle = '#f4ead8';
			const fangs = 4;
			for (let i = 0; i < fangs; i += 1) {
				const fx = -mw * 0.7 + (i / (fangs - 1)) * mw * 1.4;
				ctx.beginPath();
				ctx.moveTo(fx - w * 0.05, my - w * 0.02);
				ctx.lineTo(fx, my + w * (0.06 + open * 0.6));
				ctx.lineTo(fx + w * 0.05, my - w * 0.02);
				ctx.fill();
			}
		}
	}
}
