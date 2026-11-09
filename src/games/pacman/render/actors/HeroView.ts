// A hero driven by the game (render/actors/hero): Pac-Man on the season levels, Ms. Pac-Man
// everywhere she plays. It turns the player's position, heading and speed, the energizer (her
// overdrive) and its last seconds, the death and the respawn shield into the hero's state, and
// the game's cues into acting (a glow at the lips per dot, a real bite for fruit, the egg and
// ghosts). The hell keeps PlayerView for Pac-Man (berserk and the BFG charge are its own
// looks); Ms. Pac-Man plays the hell as this hero too. The arcade draws its own sprites.
import type { PlayerService } from '../../logic/actors/PlayerService';
import type { PacmanAudioCue } from '../../core/Events';
import type { GridLayout } from '../maze/GridView';
import type { PlayerDrawOptions } from './PlayerView';
import type { Hero } from './hero/Hero';
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

export class HeroView {
	constructor(private readonly hero: Hero) {}

	private lastTime = -1;
	private angle = START_ANGLE;
	private last: { x: number; y: number } | null = null;
	/** Smoothed speed, tiles per second. */
	private speed = 0;
	private season: HeroSeason = 'summer';
	/** Seconds the ball keeps rolling after the tunnel. */
	private afterTunnel = 0;

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

	reset(): void {
		this.hero.reset();
		this.last = null;
		this.speed = 0;
		this.afterTunnel = 0;
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

		// a ball for the tunnel: from two tiles before it until a moment after
		this.afterTunnel = Math.max(0, this.afterTunnel - dt);
		this.hero.setBall(!options.dying && (Boolean(options.padAhead) || this.afterTunnel > 0));
		this.hero.setSink(options.padSink ?? 0);
		this.hero.setRadius(S * RADIUS);
		this.hero.update(dt, {
			x: layout.offsetX + pos.x * S,
			y: layout.offsetY + pos.y * S,
			angle: this.angle,
			moving: !options.dying && this.speed > 0.5,
			// in the hell Ms. Pac-Man's berserk shows as her powered look (her own art: stage 8)
			power: options.look === 'energized' || options.look === 'berserk',
			ending: Boolean(options.ending),
			dying: options.dying,
			season: this.season
		});
		this.hero.draw(ctx);
	}
}
