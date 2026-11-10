import type { DoomDirection } from '../../logic/doom/DoomGraph';
import type { DoomShape, DoomStateName } from '../../logic/doom/DoomBossModel';
import type { GridLayout } from '../maze/GridView';
import type { CelTones, EyeStyle, GhostShape, HornStyle } from './hellGhost';
import {
	INK,
	celBands,
	celOutline,
	dirAngle,
	drawEyes,
	drawHorns,
	ghostPath,
	lightGlow,
	noise
} from './hellGhost';

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

const BONE: readonly [string, string] = ['#f1e4cc', '#8a7860'];

/**
 * Phase 1 → 3 (the owner's mock-up, `prototypes/pacman/art/hell-flesh-boss.html`): a red
 * overseer; a charred body split by lava with longer glowing horns; a body burning white-hot
 * from inside. A red body alone sinks into the red flesh, so every skin keeps the ink line,
 * yellow eyes and a light rim.
 */
const SKINS: readonly Skin[] = [
	{
		light: '#f4604e',
		mid: '#c8221f',
		shade: '#7a0c14',
		rim: '#ffc9a8',
		fire: '255,110,40',
		horn: { length: 0.5, curl: 0, bone: ['#f1e4cc', '#9c8a72'], ember: null },
		eye: '#ffe27a'
	},
	{
		light: '#d84a2a',
		mid: '#7a1216',
		shade: '#300810',
		rim: '#ffb070',
		fire: '255,120,40',
		horn: { length: 0.68, curl: 0.25, bone: BONE, ember: '255,120,40' },
		eye: '#ffe27a'
	},
	{
		light: '#fff2b8',
		mid: '#ff8a2c',
		shade: '#c0261a',
		rim: '#fffbe0',
		fire: '255,190,70',
		horn: { length: 0.74, curl: 0.35, bone: ['#fff6dc', '#c8a070'], ember: '255,190,70' },
		eye: '#fffbd8'
	}
];

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
 * Phase 1: a red overseer, small bone horns, a closed scowl, a stitched belly.
 * Phase 2: charred, lava cracks, longer glowing horns, a torn skirt, a fanged grin, the belly
 * split open on his ribs.
 * Phase 3: white-hot from inside, a second pair of horns, a skirt of flames.
 * The eyes look where it is heading (on the wind-up: at the player); no chevron, the
 * eyes are enough for the boss (the imps keep theirs). Wind-up: it swells and shivers, the
 * grin glows. Dash: stretched along the heading with afterimages. Stunned: spiral eyes.
 */
export class HellBlinkyView {
	draw(ctx: CanvasRenderingContext2D, snap: BossSnapshot, layout: GridLayout, time: number): void {
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
		const casting = snap.state === 'ACTIVE' && snap.shape === 'cast';
		const skin = snap.echo ? ECHO_SKIN : SKINS[phase - 1];
		const t = time * (stunned ? 0.35 : 1);
		const heading = dirAngle(snap.dir);
		const R = S * 0.5 * (0.3 + 0.7 * intro) * (1 + tele * 0.06);
		let x = layout.offsetX + snap.x * S;
		let y = layout.offsetY + snap.y * S;
		const shiver = (transition ? 0.08 : 0) + (stunned ? 0.03 : 0) + tele * 0.04;
		if (shiver > 0) {
			x += Math.sin(time * 90) * R * shiver;
			y += Math.cos(time * 77) * R * shiver;
		}
		const bob = Math.sin(t * 3.2) * R * 0.03;
		const shape: GhostShape = {
			// sized so the horn tips (phase 3, with their glow) end at the tile's top edge
			w: R * 0.64,
			domeY: -R * 0.02 + bob,
			hem: R * 0.78 + bob,
			feet: 4,
			torn: snap.echo ? 1 : [0, 0.8, 1][phase - 1],
			seed: 7
		};
		const pulse = 0.5 + 0.5 * Math.sin(t * (3 + phase * 1.5));

		ctx.save();
		ctx.globalAlpha = snap.alpha * (snap.echo ? 0.72 : 1) * (0.3 + 0.7 * intro);
		ctx.lineJoin = 'round';
		ctx.lineCap = 'round';

		// a dark pool and a glow under it, kept inside the tile
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
			0.14 + 0.08 * phase + tele * 0.3
		);

		if (dash) {
			// afterimages trail the dash
			for (let k = 2; k >= 1; k -= 1) {
				ctx.save();
				ctx.globalAlpha *= 0.22 * (3 - k);
				ghostPath(
					ctx,
					x - Math.cos(heading) * R * 0.22 * k,
					y - Math.sin(heading) * R * 0.22 * k,
					shape,
					t
				);
				ctx.fillStyle = skin.mid;
				ctx.fill();
				ctx.restore();
			}
		}

		ctx.save();
		ctx.translate(x, y);
		if (dash) {
			// stretched along the heading, squeezed across it
			ctx.rotate(heading);
			ctx.scale(1.14, 0.88);
			ctx.rotate(-heading);
		}
		if (phase >= 3 || snap.echo) {
			// the second, lower pair of horns
			drawHorns(
				ctx,
				0,
				0,
				shape,
				1.05,
				{ ...skin.horn, length: skin.horn.length * 0.55, curl: 0.6 },
				pulse
			);
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
		this.drawBody(ctx, shape, skin, phase, t, pulse, snap);
		this.drawFace(ctx, shape, skin, phase, t, tele, casting, stunned, transition, snap);
		ctx.restore();

		if (phase >= 3 && !snap.echo) {
			this.drawFlames(ctx, x, y, shape, skin, t);
		}
		ctx.restore();
	}

	private drawBody(
		ctx: CanvasRenderingContext2D,
		shape: GhostShape,
		skin: Skin,
		phase: number,
		t: number,
		pulse: number,
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
		if (!snap.echo) {
			this.drawBelly(ctx, shape, skin, phase, pulse);
		}
		if (phase >= 2 || snap.echo) {
			this.drawCracks(ctx, shape, skin, pulse);
		}
		if (phase >= 3 && !snap.echo) {
			// the fire inside shows through the skin
			lightGlow(ctx, 0, hem * 0.35, w * (0.8 + 0.1 * pulse), skin.fire, 0.4);
		}
		if (snap.hit > 0) {
			ctx.fillStyle = `rgba(255,255,255,${0.85 * snap.hit})`;
			ctx.fillRect(-w * 1.3, domeY - w * 1.3, w * 2.6, hem - domeY + w * 2.6);
		}
		ctx.restore();
		celOutline(ctx, shape, t, skin.rim);
	}

	/** A seam across the belly: stitched, then split open on his ribs, then a white-hot wound. */
	private drawBelly(
		ctx: CanvasRenderingContext2D,
		shape: GhostShape,
		skin: Skin,
		phase: number,
		pulse: number
	): void {
		const { w, domeY } = shape;
		const sy = domeY + w * 1.18;
		const sw = w * 0.62;
		ctx.strokeStyle = INK;
		if (phase === 1) {
			ctx.lineWidth = Math.max(1, w * 0.07);
			ctx.beginPath();
			ctx.moveTo(-sw, sy);
			ctx.quadraticCurveTo(0, sy + w * 0.08, sw, sy);
			ctx.stroke();
			for (let s = 0; s < 5; s += 1) {
				const u = -0.8 + s * 0.4;
				const bow = w * 0.04 * (1 - u * u);
				ctx.beginPath();
				ctx.moveTo(u * sw, sy - w * 0.1 + bow);
				ctx.lineTo(u * sw + w * 0.04, sy + w * 0.14 + bow);
				ctx.stroke();
			}
			return;
		}
		const gh = w * (phase === 2 ? 0.42 : 0.52);
		ctx.fillStyle = '#0d0204';
		ctx.beginPath();
		ctx.ellipse(0, sy + gh * 0.2, sw, gh, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.save();
		ctx.beginPath();
		ctx.ellipse(0, sy + gh * 0.2, sw * 0.9, gh * 0.85, 0, 0, Math.PI * 2);
		ctx.clip();
		ctx.fillStyle = `rgba(${skin.fire},${0.55 + 0.35 * pulse})`;
		ctx.fillRect(-sw, sy - gh, sw * 2, gh * 2.4);
		if (phase >= 3) {
			ctx.fillStyle = `rgba(255,248,214,${0.5 + 0.4 * pulse})`;
			ctx.beginPath();
			ctx.ellipse(0, sy + gh * 0.2, sw * 0.5, gh * 0.55, 0, 0, Math.PI * 2);
			ctx.fill();
		}
		ctx.lineWidth = Math.max(1.2, w * 0.1);
		for (let rb = -1; rb <= 1; rb += 1) {
			ctx.beginPath();
			ctx.moveTo(rb * sw * 0.5, sy - gh);
			ctx.quadraticCurveTo(rb * sw * 0.5 + w * 0.06, sy + gh * 0.2, rb * sw * 0.42, sy + gh * 1.4);
			ctx.stroke();
		}
		ctx.restore();
		ctx.lineWidth = Math.max(1, w * 0.07);
		ctx.beginPath();
		ctx.ellipse(0, sy + gh * 0.2, sw, gh, 0, 0, Math.PI * 2);
		ctx.stroke();
	}

	/** Lava cracks on the dome and the sides, clear of the face. */
	private drawCracks(
		ctx: CanvasRenderingContext2D,
		shape: GhostShape,
		skin: Skin,
		pulse: number
	): void {
		const { w, domeY } = shape;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		const seeds: ReadonlyArray<readonly [number, number, number]> = [
			[-0.72, -0.1, 1],
			[0.7, 0.05, -1],
			[-0.5, 0.9, 1],
			[0.55, 1.0, -1]
		];
		seeds.forEach(([sx, sy, dir], i) => {
			const pts: Array<[number, number]> = [
				[sx * w, domeY + sy * w + (i > 1 ? w * 0.3 : -w * 0.5)]
			];
			for (let q = 1; q < 4; q += 1) {
				pts.push([
					pts[q - 1][0] + dir * (noise(i, q) - 0.2) * w * 0.35,
					pts[q - 1][1] + w * (0.2 + noise(i, q + 3) * 0.14)
				]);
			}
			const line = () => {
				ctx.beginPath();
				pts.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
				ctx.stroke();
			};
			ctx.strokeStyle = INK;
			ctx.lineWidth = Math.max(2.2, w * 0.17);
			line();
			ctx.strokeStyle = `rgba(${skin.fire},${0.65 + 0.35 * pulse})`;
			ctx.lineWidth = Math.max(1.1, w * 0.08);
			line();
		});
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
		snap: BossSnapshot
	): void {
		const { w, domeY } = shape;
		const faceY = domeY + w * 0.35;
		// on the wind-up the eyes lock onto the player; otherwise they look ahead
		const look = tele > 0 ? snap.look : dirAngle(snap.dir);
		const hot = tele > 0.5 || casting;
		const eyes: EyeStyle = {
			sclera: hot ? '#ffffff' : skin.eye,
			glow: phase >= 2 || snap.echo || hot ? skin.fire : null
		};
		drawEyes(ctx, 0, faceY, w, look, eyes, transition ? 0 : 1, stunned, t);

		// mouth: a scowl in phase 1, a fanged grin later; it opens and glows on a wind-up
		const my = faceY + w * 0.42;
		const mw = w * (phase === 1 && !snap.echo ? 0.36 : 0.5);
		const open = phase === 1 && !snap.echo ? tele * 0.18 : 0.1 + tele * 0.14 + (casting ? 0.08 : 0);
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

	/** Phase 3: tongues of fire licking from the hem, additive, inside the tile. */
	private drawFlames(
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		shape: GhostShape,
		skin: Skin,
		t: number
	): void {
		const { w, hem } = shape;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (let i = 0; i < 6; i += 1) {
			const fx = x - w * 0.85 + (i / 5) * w * 1.7;
			const flick = 0.5 + 0.5 * Math.sin(t * 13 + i * 1.9);
			const len = w * (0.14 + 0.16 * flick);
			const g = ctx.createLinearGradient(fx, y + hem - len, fx, y + hem + len);
			g.addColorStop(0, `rgba(${skin.fire},0)`);
			g.addColorStop(0.5, `rgba(${skin.fire},0.85)`);
			g.addColorStop(1, 'rgba(255,240,180,0)');
			ctx.fillStyle = g;
			ctx.beginPath();
			ctx.moveTo(fx - w * 0.12, y + hem - len * 0.4);
			ctx.quadraticCurveTo(
				fx + Math.sin(t * 9 + i) * w * 0.08,
				y + hem + len,
				fx + w * 0.12,
				y + hem - len * 0.4
			);
			ctx.fill();
		}
		ctx.restore();
	}
}
