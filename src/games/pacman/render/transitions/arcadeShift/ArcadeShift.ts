import { canvasContext, makeCanvas } from '../../common/textures';
import { GlPass, rgb01 } from '../../common/GlPass';
import { ARCADE_SHIFT_FRAGMENT } from './arcadeShiftShader';
import { shiftChannels } from './arcadeShiftTimeline';
import type { ShiftKind } from './arcadeShiftTimeline';

const MAX_PASS_RATIO = 1.5;

const UNIFORMS = [
	'uFrom',
	'uTo',
	'uSizePx',
	'uScenePx',
	'uOrigin',
	'uMode',
	'uPhase',
	'uFlash',
	'uBlock',
	'uLevels',
	'uDim',
	'uOpen',
	'uBoost',
	'uGlow',
	'uGrow',
	'uTime',
	'uAccent'
] as const;

type Uniform = (typeof UNIFORMS)[number];

export interface ArcadeShiftRequest {
	readonly kind: ShiftKind;
	/** 0..1 through the shift (`SHIFT_DURATION`). */
	readonly progress: number;
	/** The egg (enter) or the dot of light (leave), css px. */
	readonly originX: number;
	readonly originY: number;
	/** The flash and the ring of light, 0xRRGGBB. */
	readonly accent: number;
	readonly time: number;
}

/**
 * The way into the arcade and out of it: a world breaking into pixels while a CRT switches
 * on, and a CRT switching off while a dot of light unfolds into the next world. Per frame:
 * draw the picture that is leaving into `from()`, the one that arrives into `to()`, then
 * `compose()`. Without WebGL2 it cuts through black.
 */
export class ArcadeShift {
	private pass: GlPass<Uniform> | null | undefined;
	private readonly scenes: Array<{ cv: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null> =
		[null, null];

	from(pixelWidth: number, pixelHeight: number): CanvasRenderingContext2D {
		return this.scene(0, pixelWidth, pixelHeight);
	}

	to(pixelWidth: number, pixelHeight: number): CanvasRenderingContext2D {
		return this.scene(1, pixelWidth, pixelHeight);
	}

	compose(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		pixelRatio: number,
		request: ArcadeShiftRequest
	): void {
		const from = this.scenes[0];
		const to = this.scenes[1];
		if (!from || !to) {
			return;
		}
		const c = shiftChannels(request.kind, request.progress);
		if (this.pass === undefined) {
			this.pass = GlPass.create('ArcadeShift', ARCADE_SHIFT_FRAGMENT, UNIFORMS);
			this.pass?.addTexture(0, 'uFrom', 'linear');
			this.pass?.addTexture(1, 'uTo', 'linear');
		}
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		const pass = this.pass;
		if (pass) {
			const ratio = Math.min(pixelRatio, MAX_PASS_RATIO);
			const pw = Math.round(width * ratio);
			const ph = Math.round(height * ratio);
			const gl = pass.gl;
			const l = (name: Uniform) => pass.uniform(name);
			pass.uploadCanvas(0, from.cv);
			pass.uploadCanvas(1, to.cv);
			gl.uniform2f(l('uSizePx'), pw, ph);
			gl.uniform2f(l('uScenePx'), width, height);
			gl.uniform2f(l('uOrigin'), request.originX, request.originY);
			gl.uniform1f(l('uMode'), c.kind === 'enter' ? 0 : 1);
			gl.uniform1f(l('uPhase'), c.phase);
			gl.uniform1f(l('uFlash'), c.flash);
			gl.uniform1f(l('uBlock'), c.block);
			gl.uniform1f(l('uLevels'), c.levels);
			gl.uniform1f(l('uDim'), c.dim);
			gl.uniform2f(l('uOpen'), c.openX, c.openY);
			gl.uniform1f(l('uBoost'), c.boost);
			gl.uniform1f(l('uGlow'), c.glow);
			gl.uniform1f(l('uGrow'), c.grow);
			gl.uniform1f(l('uTime'), request.time);
			gl.uniform3f(l('uAccent'), ...rgb01(request.accent));
			pass.draw(pw, ph);
			ctx.drawImage(pass.canvas, 0, 0, width, height);
		} else {
			const showTo = c.kind === 'enter' ? c.phase === 1 : c.grow > 0;
			ctx.fillStyle = '#000';
			ctx.fillRect(0, 0, width, height);
			if (showTo || c.openY > 0.2) {
				ctx.drawImage(showTo ? to.cv : from.cv, 0, 0, width, height);
			}
		}
		ctx.restore();
	}

	private scene(index: 0 | 1, pixelWidth: number, pixelHeight: number): CanvasRenderingContext2D {
		let s = this.scenes[index];
		if (!s) {
			const cv = makeCanvas(pixelWidth, pixelHeight);
			s = { cv, ctx: canvasContext(cv) };
			this.scenes[index] = s;
		}
		if (s.cv.width !== pixelWidth || s.cv.height !== pixelHeight) {
			s.cv.width = pixelWidth;
			s.cv.height = pixelHeight;
		}
		return s.ctx;
	}
}
