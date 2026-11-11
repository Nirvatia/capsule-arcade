import { GlPass, rgb01 } from '../../common/GlPass';
import { DECAY_FRAGMENT } from './decayShader';

/**
 * A world's colours for the black hole, as 0xRRGGBB: `deep` and `mid` the void, `wisp` the
 * arms of light, `ice` the stars, `rim` the drain front and the hole's burning rim, `warm`
 * the front where the colour returns.
 */
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
	/** Drain front (death field) and colour front (respawn field); < -50: off. */
	readonly front: number;
	readonly rebuild: number;
	readonly shock: number;
	readonly time: number;
	/** Death point and respawn point, tile-centre coordinates. */
	readonly epicX: number;
	readonly epicY: number;
	readonly spawnX: number;
	readonly spawnY: number;
	/** How far the dying world has fallen into the hole, and how folded the reborn one is. */
	readonly collapse: number;
	readonly bloom: number;
	/** Radius that holds the whole picture round the death and the respawn point, css px. */
	readonly reachDeath: number;
	readonly reachSpawn: number;
	/** 0 dying world, 1 void, 2 reborn world. */
	readonly phase: number;
	readonly flash: number;
	readonly palette: DecayPalette;
}

const UNIFORMS = [
	'uScene',
	'uNext',
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
	'uSpawn',
	'uCollapse',
	'uReach',
	'uPhase',
	'uFlash',
	'uUseNext',
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
const NEXT_UNIT = 2;

/**
 * The death shader on a `GlPass`: uploads the rendered world layer as a texture each frame
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
		pass.addTexture(NEXT_UNIT, 'uNext', 'linear');
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

	/**
	 * Renders the decayed `scene` at `pixelWidth`×`pixelHeight` into `canvas`. With `next` the
	 * reborn world is that picture (the next level), else `scene` again.
	 */
	render(
		scene: HTMLCanvasElement,
		next: HTMLCanvasElement | null,
		pixelWidth: number,
		pixelHeight: number,
		u: DecayUniforms
	): void {
		const pass = this.pass;
		const gl = pass.gl;
		const l = (name: UniformName) => pass.uniform(name);
		pass.uploadCanvas(SCENE_UNIT, scene);
		if (next) {
			pass.uploadCanvas(NEXT_UNIT, next);
		}
		gl.uniform1f(l('uUseNext'), next ? 1 : 0);
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
		gl.uniform2f(l('uSpawn'), u.spawnX, u.spawnY);
		gl.uniform2f(l('uCollapse'), u.collapse, u.bloom);
		gl.uniform2f(l('uReach'), u.reachDeath, u.reachSpawn);
		gl.uniform1f(l('uPhase'), u.phase);
		gl.uniform1f(l('uFlash'), u.flash);
		gl.uniform3f(l('uDeep'), ...rgb01(u.palette.deep));
		gl.uniform3f(l('uMid'), ...rgb01(u.palette.mid));
		gl.uniform3f(l('uWisp'), ...rgb01(u.palette.wisp));
		gl.uniform3f(l('uIce'), ...rgb01(u.palette.ice));
		gl.uniform3f(l('uRim'), ...rgb01(u.palette.rim));
		gl.uniform3f(l('uWarm'), ...rgb01(u.palette.warm));
		pass.draw(pixelWidth, pixelHeight);
	}
}
