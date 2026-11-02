import { GlPass, rgb01 } from '../../common/GlPass';
import { DECAY_FRAGMENT } from './decayShader';

/** Colours of the abyss and the fronts, as 0xRRGGBB. */
export interface DecayPalette {
	readonly deep: number;
	readonly mid: number;
	readonly wisp: number;
	readonly ice: number;
	readonly rim: number;
	readonly warm: number;
}

export interface DecayUniforms {
	/** Viewport in CSS px. */
	readonly width: number;
	readonly height: number;
	/** Board origin (css px), css px per world unit, world units per tile. */
	readonly originX: number;
	readonly originY: number;
	readonly worldScale: number;
	readonly tileWorld: number;
	readonly front: number;
	readonly rebuild: number;
	readonly shock: number;
	readonly time: number;
	readonly epicX: number;
	readonly epicY: number;
	readonly palette: DecayPalette;
}

const UNIFORMS = [
	'uScene',
	'uDist',
	'uSizePx',
	'uScenePx',
	'uWorld',
	'uDistSize',
	'uMargin',
	'uDMax',
	'uFront',
	'uRebuild',
	'uTime',
	'uShock',
	'uEpic',
	'uDeep',
	'uMid',
	'uWisp',
	'uIce',
	'uRim',
	'uWarm'
] as const;

type UniformName = (typeof UNIFORMS)[number];

const SCENE_UNIT = 0;
const FIELD_UNIT = 1;

/**
 * The decay shader on a `GlPass`: uploads the rendered world layer as a texture each frame
 * (only while the effect runs) and draws the decayed frame into its own canvas.
 * `create()` returns null when WebGL2 is unavailable or the shader fails to build.
 */
export class DecayPass {
	private readonly pass: GlPass<UniformName>;
	private distCols = 1;
	private distRows = 1;
	private distMargin = 0;
	private distMax: [number, number] = [1, 1];

	private constructor(pass: GlPass<UniformName>) {
		this.pass = pass;
		pass.addTexture(SCENE_UNIT, 'uScene', 'linear');
		pass.addTexture(FIELD_UNIT, 'uDist', 'nearest');
	}

	get canvas(): HTMLCanvasElement {
		return this.pass.canvas;
	}

	static create(): DecayPass | null {
		const pass = GlPass.create('DecayPass', DECAY_FRAGMENT, UNIFORMS);
		if (!pass) {
			console.warn('DecayPass.create', 'no WebGL2 pass; using the fallback veil');
			return null;
		}
		return new DecayPass(pass);
	}

	/** Packed fields from `packDecayFields`, with their geometry and maxima. */
	setFields(
		data: Uint8Array,
		cols: number,
		rows: number,
		margin: number,
		maxDeath: number,
		maxRespawn: number
	): void {
		this.pass.uploadBytes(FIELD_UNIT, data, cols, rows);
		this.distCols = cols;
		this.distRows = rows;
		this.distMargin = margin;
		this.distMax = [maxDeath, maxRespawn];
	}

	/** Renders the decayed `scene` at `pixelWidth`×`pixelHeight` into `canvas`. */
	render(
		scene: HTMLCanvasElement,
		pixelWidth: number,
		pixelHeight: number,
		u: DecayUniforms
	): void {
		const pass = this.pass;
		const gl = pass.gl;
		const l = (name: UniformName) => pass.uniform(name);
		pass.uploadCanvas(SCENE_UNIT, scene);
		gl.uniform2f(l('uSizePx'), pixelWidth, pixelHeight);
		gl.uniform2f(l('uScenePx'), u.width, u.height);
		gl.uniform4f(l('uWorld'), u.originX, u.originY, u.worldScale, u.tileWorld);
		gl.uniform2f(l('uDistSize'), this.distCols, this.distRows);
		gl.uniform1f(l('uMargin'), this.distMargin);
		gl.uniform2f(l('uDMax'), this.distMax[0], this.distMax[1]);
		gl.uniform1f(l('uFront'), u.front);
		gl.uniform1f(l('uRebuild'), u.rebuild);
		gl.uniform1f(l('uTime'), u.time);
		gl.uniform1f(l('uShock'), u.shock);
		gl.uniform2f(l('uEpic'), u.epicX, u.epicY);
		gl.uniform3f(l('uDeep'), ...rgb01(u.palette.deep));
		gl.uniform3f(l('uMid'), ...rgb01(u.palette.mid));
		gl.uniform3f(l('uWisp'), ...rgb01(u.palette.wisp));
		gl.uniform3f(l('uIce'), ...rgb01(u.palette.ice));
		gl.uniform3f(l('uRim'), ...rgb01(u.palette.rim));
		gl.uniform3f(l('uWarm'), ...rgb01(u.palette.warm));
		pass.draw(pixelWidth, pixelHeight);
	}
}
