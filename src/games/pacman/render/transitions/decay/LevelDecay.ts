import type { GridMatrix } from '../../../config/gridConfig';
import { rgba } from '../../common/color';
import { canvasContext, makeCanvas } from '../../common/textures';
import type { GridLayout } from '../../maze/GridView';
import { DecayPass } from './DecayPass';
import type { DecayPalette } from './DecayPass';
import { computeDecayField, packDecayFields, sampleDecayField } from './decayField';
import type { DecayField } from './decayField';
import { decayFronts, farCorner } from './decayTimeline';
import type { DebugFront } from '../../debug/DebugOverlayView';

/** World units per tile inside the shader. */
const TILE_WORLD = 24;
/** The pass runs at most at this pixel ratio; it is upscaled on composite. */
const MAX_PASS_RATIO = 1.5;
const SHAKE_TIME = 0.45;
const SHAKE_PX = 3;
const FLASH_TIME = 0.3;

export const ICE_PALETTE: DecayPalette = {
	deep: 0x050a17,
	mid: 0x142b4a,
	wisp: 0x409ed1,
	ice: 0xcceaff,
	rim: 0x73bfff,
	warm: 0xfff2d9
};

export const EMBER_PALETTE: DecayPalette = {
	deep: 0x120303,
	mid: 0x3a0c07,
	wisp: 0xff5a1e,
	ice: 0xffc08a,
	rim: 0xff6a2a,
	warm: 0xffe2b0
};

export interface DecayRequest {
	readonly grid: GridMatrix;
	/** Death point, tile-centre coordinates (tile (c, r) is centred at (c + .5, r + .5)). */
	readonly deathX: number;
	readonly deathY: number;
	/** Respawn tile (grid indices): the level reassembles from here. */
	readonly spawnX: number;
	readonly spawnY: number;
	/** Seconds since the death state started. */
	readonly elapsed: number;
	readonly palette: DecayPalette;
	/**
	 * When the reborn world is another level (a lost boss fight): its maze and its respawn tile.
	 * The picture comes from `beginNext()`'s context; the colour returns along its corridors.
	 */
	readonly next?: { readonly grid: GridMatrix; readonly spawnX: number; readonly spawnY: number };
}

/**
 * The death transition: the level drains of colour round the death point, falls into a
 * black hole there, and unfolds again from the respawn point. Usage per frame while
 * dying: draw the world into `begin()`'s context, then `compose()` onto the screen.
 * Without WebGL2 a dark veil stands in for the shader.
 */
export class LevelDecay {
	private debugFrontValue: DebugFront | null = null;

	/** The front being drawn now (dev overlay): the drain, or the colour front once it runs. */
	get debugFront(): DebugFront | null {
		return this.debugFrontValue;
	}

	private pass: DecayPass | null | undefined;
	private scene: HTMLCanvasElement | null = null;
	private sceneCtx: CanvasRenderingContext2D | null = null;
	private nextScene: HTMLCanvasElement | null = null;
	private nextCtx: CanvasRenderingContext2D | null = null;
	private fieldKey = '';
	private death: DecayField | null = null;
	private respawn: DecayField | null = null;
	private viewKey = '';
	private frontEnd = 1;
	private rebuildEnd = 1;

	/** Camera shake for the first moments of the death, css px. */
	shake(elapsed: number): { x: number; y: number } {
		if (!(elapsed >= 0) || elapsed >= SHAKE_TIME) {
			return { x: 0, y: 0 };
		}
		const a = SHAKE_PX * (1 - elapsed / SHAKE_TIME);
		return { x: (Math.random() - 0.5) * a, y: (Math.random() - 0.5) * a };
	}

	/** Offscreen context the level is rendered into this frame (same size as the screen). */
	begin(pixelWidth: number, pixelHeight: number): CanvasRenderingContext2D {
		if (!this.scene || !this.sceneCtx) {
			this.scene = makeCanvas(pixelWidth, pixelHeight);
			this.sceneCtx = canvasContext(this.scene);
		}
		if (this.scene.width !== pixelWidth || this.scene.height !== pixelHeight) {
			this.scene.width = pixelWidth;
			this.scene.height = pixelHeight;
		}
		return this.sceneCtx;
	}

	/** Offscreen context the next level's world is rendered into (`DecayRequest.next`). */
	beginNext(pixelWidth: number, pixelHeight: number): CanvasRenderingContext2D {
		if (!this.nextScene || !this.nextCtx) {
			this.nextScene = makeCanvas(pixelWidth, pixelHeight);
			this.nextCtx = canvasContext(this.nextScene);
		}
		if (this.nextScene.width !== pixelWidth || this.nextScene.height !== pixelHeight) {
			this.nextScene.width = pixelWidth;
			this.nextScene.height = pixelHeight;
		}
		return this.nextCtx;
	}

	/**
	 * Draws the transition onto `ctx` (css px transform), then the death flash. `layout` is
	 * where the board was drawn, `shake` the offset it was drawn with.
	 */
	compose(
		ctx: CanvasRenderingContext2D,
		width: number,
		height: number,
		pixelRatio: number,
		layout: GridLayout,
		shake: { x: number; y: number },
		time: number,
		request: DecayRequest
	): void {
		const scene = this.scene;
		if (!scene) {
			return;
		}
		this.prepareFields(request);
		this.fitFronts(width, height, layout);
		const death = this.death;
		if (!death) {
			return;
		}
		const fronts = decayFronts(request.elapsed, this.frontEnd, this.rebuildEnd);
		this.debugFrontValue =
			fronts.phase === 2 && this.respawn
				? { field: this.respawn, front: fronts.color }
				: { field: death, front: fronts.drain };
		if (this.pass === undefined) {
			this.pass = DecayPass.create();
			if (this.pass) {
				this.uploadFields();
			}
		}
		ctx.save();
		ctx.globalAlpha = 1;
		ctx.globalCompositeOperation = 'source-over';
		if (this.pass) {
			const ratio = Math.min(pixelRatio, MAX_PASS_RATIO);
			const ts = layout.tileSize;
			const ox = layout.offsetX + shake.x;
			const oy = layout.offsetY + shake.y;
			const next = request.next && this.nextScene ? this.nextScene : null;
			const spawnX = request.next ? request.next.spawnX : request.spawnX;
			const spawnY = request.next ? request.next.spawnY : request.spawnY;
			this.pass.render(scene, next, Math.round(width * ratio), Math.round(height * ratio), {
				width,
				height,
				originX: ox,
				originY: oy,
				worldScale: ts / TILE_WORLD,
				tileWorld: TILE_WORLD,
				front: fronts.drain,
				rebuild: fronts.color,
				shock: fronts.shock,
				time,
				epicX: request.deathX,
				epicY: request.deathY,
				spawnX: spawnX + 0.5,
				spawnY: spawnY + 0.5,
				collapse: fronts.collapse,
				bloom: fronts.bloom,
				reachDeath: farCorner(ox + request.deathX * ts, oy + request.deathY * ts, width, height),
				reachSpawn: farCorner(ox + (spawnX + 0.5) * ts, oy + (spawnY + 0.5) * ts, width, height),
				phase: fronts.phase,
				flash: fronts.flash,
				palette: request.palette
			});
			ctx.drawImage(this.pass.canvas, 0, 0, width, height);
		} else {
			ctx.drawImage(scene, 0, 0, width, height);
			ctx.globalAlpha = 0.9 * fronts.cover;
			ctx.fillStyle = '#050a17';
			ctx.fillRect(0, 0, width, height);
		}
		if (request.elapsed < FLASH_TIME) {
			ctx.globalCompositeOperation = 'lighter';
			ctx.fillStyle = rgba(request.palette.ice, 0.35 * (1 - request.elapsed / FLASH_TIME));
			ctx.fillRect(0, 0, width, height);
		}
		ctx.restore();
	}

	private prepareFields(request: DecayRequest): void {
		const dx = Math.floor(request.deathX);
		const dy = Math.floor(request.deathY);
		const spawn = request.next ?? request;
		const key = `${dx},${dy}:${spawn.spawnX},${spawn.spawnY}:${request.next ? 'next' : ''}`;
		if (key === this.fieldKey && this.death && this.respawn && this.death.cols > 0) {
			return;
		}
		this.death = computeDecayField(request.grid, dx, dy);
		this.respawn = computeDecayField(
			request.next ? request.next.grid : request.grid,
			spawn.spawnX,
			spawn.spawnY
		);
		this.fieldKey = key;
		this.viewKey = '';
		if (this.pass) {
			this.uploadFields();
		}
	}

	private uploadFields(): void {
		const { death, respawn, pass } = this;
		if (!death || !respawn || !pass) {
			return;
		}
		pass.setFields(
			packDecayFields(death, respawn),
			death.cols,
			death.rows,
			death.margin,
			death.max,
			respawn.max
		);
	}

	/** Largest distances on screen: each front must sweep the whole view in its phase. */
	private fitFronts(width: number, height: number, layout: GridLayout): void {
		const key = `${this.fieldKey}|${width}x${height}|${layout.tileSize},${layout.offsetX},${layout.offsetY}`;
		const { death, respawn } = this;
		if (key === this.viewKey || !death || !respawn || !(layout.tileSize > 0)) {
			return;
		}
		const x0 = -layout.offsetX / layout.tileSize;
		const y0 = -layout.offsetY / layout.tileSize;
		const x1 = (width - layout.offsetX) / layout.tileSize;
		const y1 = (height - layout.offsetY) / layout.tileSize;
		let a = 0;
		let b = 0;
		for (let y = y0; y <= y1 + 0.5; y += 0.5) {
			for (let x = x0; x <= x1 + 0.5; x += 0.5) {
				a = Math.max(a, sampleDecayField(death, x, y));
				b = Math.max(b, sampleDecayField(respawn, x, y));
			}
		}
		this.frontEnd = a + 2;
		this.rebuildEnd = b + 2;
		this.viewKey = key;
	}
}
