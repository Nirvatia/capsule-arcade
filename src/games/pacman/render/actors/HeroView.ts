// A hero driven by the game (render/actors/hero): Pac-Man on the season levels, Ms. Pac-Man
// everywhere she plays. It turns the player's position, heading and speed, the energizer (her
// overdrive) and its last seconds, the death and the respawn shield into the hero's state, and
// the game's cues into acting (a glow at the lips per dot, a real bite for fruit, the egg and
// ghosts). In the hell both heroes carry the BFG charge's light (`chargeLight`, over the body):
// the berserk is the awoken look, the BFG charge swells the body. The arcade draws its own sprites.
import type { PlayerService } from '../../logic/actors/PlayerService';
import type { PacmanAudioCue } from '../../core/Events';
import type { GridLayout } from '../maze/GridView';
import type { PlayerDrawOptions } from './playerDrawOptions';
import type { Hero, HeroFeel, OverPainter } from './hero/Hero';
import { NO_FEEL } from './hero/Hero';
import type { HeroSeason } from './hero/heroSeasons';

/** Body radius in tiles (Pac-Man 10 % smaller than the first cut, the owner's review). */
const RADIUS = 0.39;

function facingAngle(facing: string | null, fallback: number): number {
	if (facing === 'UP') return -Math.PI / 2;
	if (facing === 'DOWN') return Math.PI / 2;
	if (facing === 'LEFT') return Math.PI;
	if (facing === 'RIGHT') return 0;
	return fallback;
}

/** The heading a hero shows before its first move (0: facing right). */
const START_ANGLE = 0;

/** He stays a ball this long after a tunnel, then opens up (seconds). */
const AFTER_TUNNEL = 0.6;

/**
 * The `feel` prototype's switches the view handles on top of the hero's own (`HeroFeel`):
 * `lean` cuts a corner (with a turn asked, he drifts a little to its side), `shadow` a soft
 * contact shadow under him, `suck` pulls the dots ahead into his mouth (the level renderer
 * draws the food, it reads `attract`). All off by default.
 */
export interface PlayerFeel extends HeroFeel {
	readonly lean: boolean;
	readonly shadow: boolean;
	readonly suck: boolean;
}

export const NO_PLAYER_FEEL: PlayerFeel = { ...NO_FEEL, lean: false, shadow: false, suck: false };

/** The game's feel: every idea, the owner took them all (the `feel` prototype switches them). */
export const GAME_FEEL: PlayerFeel = {
	gaze: true,
	eye: true,
	smear: true,
	bump: true,
	puff: true,
	sphere: true,
	lean: true,
	shadow: true,
	suck: true
};

/** How far a corner is cut, tiles. */
const LEAN = 0.08;

let shadowSprite: HTMLCanvasElement | null = null;

/** A soft dark disc, painted once. */
function shadow(): HTMLCanvasElement {
	if (!shadowSprite) {
		const n = 64;
		const c = document.createElement('canvas');
		c.width = c.height = n;
		const x = c.getContext('2d');
		if (x) {
			const g = x.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
			g.addColorStop(0, 'rgba(0,0,0,0.7)');
			g.addColorStop(0.55, 'rgba(0,0,0,0.45)');
			g.addColorStop(1, 'rgba(0,0,0,0)');
			x.fillStyle = g;
			x.fillRect(0, 0, n, n);
		}
		shadowSprite = c;
	}
	return shadowSprite;
}

export class HeroView {
	constructor(
		private readonly hero: Hero,
		/** The light painted over the body in the hell (the BFG charge). */
		private readonly chargeLight: OverPainter | null = null
	) {
		hero.setFeel(GAME_FEEL);
	}

	private lastTime = -1;
	private angle = START_ANGLE;
	private last: { x: number; y: number } | null = null;
	/** Smoothed speed, tiles per second. */
	private speed = 0;
	private season: HeroSeason = 'summer';
	/** Seconds the ball keeps rolling after the tunnel. */
	private afterTunnel = 0;
	private feel: PlayerFeel = GAME_FEEL;
	private lastFacing: string | null = null;
	private leanX = 0;
	private leanY = 0;
	/** He was running last frame (a stop against a wall bumps him once). */
	private running = false;

	setFeel(feel: PlayerFeel): void {
		this.feel = feel;
		this.hero.setFeel(feel);
	}

	/**
	 * Where the dots ahead are pulled to (tile coordinates, his mouth) while `suck` is on, or
	 * null: the level renderer passes it to the food.
	 */
	attract(player: PlayerService): { x: number; y: number; angle: number } | null {
		if (!this.feel.suck || !player.facing) {
			return null;
		}
		const a = facingAngle(player.facing, this.angle);
		const p = player.position;
		return { x: p.x + Math.cos(a) * 0.3, y: p.y + Math.sin(a) * 0.3, angle: a };
	}

	/** The world the hero is in (its colour touches the rim light, the trail, the particles). */
	setSeason(season: HeroSeason): void {
		this.season = season;
	}

	trigger(cue: PacmanAudioCue): void {
		if (cue === 'teleport') {
			this.afterTunnel = AFTER_TUNNEL;
		} else if (cue === 'dot') {
			this.hero.gulp();
		} else if (cue === 'fruit-collect' || cue === 'egg-collect' || cue === 'ghost-eaten') {
			this.hero.eat();
		}
	}

	/** The BFG's release: the body recoils and flashes. */
	kick(): void {
		this.hero.kick();
	}

	reset(): void {
		this.hero.reset();
		this.last = null;
		this.speed = 0;
		this.afterTunnel = 0;
		this.lastFacing = null;
		this.leanX = 0;
		this.leanY = 0;
		this.running = false;
	}

	draw(
		ctx: CanvasRenderingContext2D,
		player: PlayerService,
		layout: GridLayout,
		time: number,
		options: PlayerDrawOptions = { look: 'normal', charge: 0, dying: false }
	): void {
		const S = layout.tileSize;
		const pos = player.position;
		if (!(S > 0) || !Number.isFinite(pos.x) || !Number.isFinite(pos.y)) {
			return;
		}
		const dt = this.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - this.lastTime));
		this.lastTime = time;

		const moved = this.last ? Math.hypot(pos.x - this.last.x, pos.y - this.last.y) : 0;
		if (dt > 0 && moved < 1.5) {
			this.speed += (moved / dt - this.speed) * Math.min(1, dt * 12);
		}
		this.last = { x: pos.x, y: pos.y };
		if (!player.facing) {
			// a fresh start or a respawn: face the start direction, not the last heading
			this.angle = START_ANGLE;
		} else {
			// turn fast but not in one frame: the hero reads the turn
			const target = facingAngle(player.facing, this.angle);
			let turn = target - this.angle;
			while (turn > Math.PI) turn -= Math.PI * 2;
			while (turn < -Math.PI) turn += Math.PI * 2;
			this.angle += turn * Math.min(1, dt * 30);
		}

		// a turn taken: the smear and the kick-up start from the heading he leaves; a stop
		// against a wall: one bump. Not while paused (he stands still then, but hit nothing)
		if (!options.paused) {
			if (player.facing && this.lastFacing && player.facing !== this.lastFacing) {
				this.hero.turnKick(facingAngle(this.lastFacing, this.angle));
			}
			this.lastFacing = player.facing;
			const runningNow = this.speed > 2 && moved > 1e-4;
			if (this.running && moved < 1e-6 && player.facing && !options.dying) {
				this.hero.bump();
			}
			this.running = runningNow || (this.running && moved > 1e-6);
		}
		// cutting a corner: a turn asked to the side, he drifts a little towards it
		let lx = 0;
		let ly = 0;
		const desired = player.desired;
		if (this.feel.lean && desired && player.facing && desired !== player.facing && !options.dying) {
			const da = facingAngle(desired, this.angle);
			const fa = facingAngle(player.facing, this.angle);
			if (Math.abs(Math.cos(da - fa)) < 0.5) {
				lx = Math.cos(da) * LEAN;
				ly = Math.sin(da) * LEAN;
			}
		}
		const lk = Math.min(1, dt * 14);
		this.leanX += (lx - this.leanX) * lk;
		this.leanY += (ly - this.leanY) * lk;
		const look =
			this.feel.gaze && desired && desired !== player.facing
				? facingAngle(desired, this.angle)
				: null;

		// a ball for the tunnel: from two tiles before it until a moment after
		this.afterTunnel = Math.max(0, this.afterTunnel - dt);
		this.hero.setBall(!options.dying && (Boolean(options.padAhead) || this.afterTunnel > 0));
		this.hero.setSink(options.padSink ?? 0);
		this.hero.setOver(options.chargeLight ? this.chargeLight : null);
		this.hero.setCharge(options.dying ? 0 : options.charge);
		this.hero.setRadius(S * RADIUS);
		const hx = layout.offsetX + (pos.x + this.leanX) * S;
		const hy = layout.offsetY + (pos.y + this.leanY) * S;
		if (this.feel.shadow && !options.dying) {
			// a soft contact shadow, off to the side away from the key light (upper left)
			const r = S * RADIUS;
			ctx.drawImage(shadow(), hx - r * 1.05 + r * 0.32, hy - r * 0.95 + r * 0.45, r * 2.1, r * 1.9);
		}
		this.hero.update(dt, {
			x: hx,
			y: hy,
			look,
			angle: this.angle,
			moving: !options.dying && this.speed > 0.5,
			// the hell's berserk is the awoken look, for both heroes
			power: options.look === 'energized' || options.look === 'berserk',
			ending: Boolean(options.ending),
			dying: options.dying,
			season: this.season
		});
		this.hero.draw(ctx);
	}
}
