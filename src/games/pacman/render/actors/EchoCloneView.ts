import type { EchoCloneService, EchoDirection } from '../../logic/bonuses/EchoCloneService';
import type { GameProfile } from '../../logic/rules/HypnosisService';
import type { GridLayout } from '../maze/GridView';
import { ECHO } from '../../config/echoConfig';
import type { Hero } from './hero/Hero';
import type { HeroDesign, Palette, MouthInside } from './hero/Hero';
import { PACMAN_DESIGN, PacmanHero } from './hero/PacmanHero';
import { MS_DESIGN, MsPacmanHero } from './hero/MsPacmanHero';
import type { MsTint } from './hero/MsPacmanHero';

/** A clone is a little smaller than the hero it copies (the hero is 0.39 of a tile). */
const CLONE_RADIUS = 0.34;

const ANGLES: Record<EchoDirection, number> = {
	RIGHT: 0,
	DOWN: Math.PI / 2,
	LEFT: Math.PI,
	UP: -Math.PI / 2
};

/** The blue of the echo: the hero's own body painted in ice and sky colours. */
const BLUE: Palette = {
	light: [196, 240, 255],
	mid: [96, 196, 255],
	shadow: [44, 116, 214],
	deep: [24, 60, 140],
	bounce: [120, 214, 255],
	ink: [14, 28, 76],
	highlight: [255, 255, 255],
	rim: [220, 248, 255]
};
const BLUE_INSIDE: MouthInside = {
	mid: [30, 40, 120],
	deep: [14, 18, 80],
	tongue: [150, 224, 255],
	tongueLight: [214, 246, 255]
};
const BLUE_TINT: MsTint = {
	id: 'blue',
	bow: [70, 168, 255],
	bowShade: [34, 94, 196],
	bowTail: [52, 130, 230],
	lipstick: [60, 140, 240],
	blush: [90, 170, 255]
};

const blue = (design: HeroDesign): HeroDesign => ({
	...design,
	id: `${design.id}-echo`,
	calm: BLUE,
	awoken: BLUE,
	inside: BLUE_INSIDE
});
const ECHO_PACMAN_DESIGN = blue(PACMAN_DESIGN);
const ECHO_MS_DESIGN = blue(MS_DESIGN);

/** Pac-Man's blue copy. */
class EchoPacmanHero extends PacmanHero {
	protected readonly design: HeroDesign = ECHO_PACMAN_DESIGN;
}

/** Ms. Pac-Man's blue copy: her bow, lipstick and blush are blue too. */
class EchoMsPacmanHero extends MsPacmanHero {
	protected readonly design: HeroDesign = ECHO_MS_DESIGN;
	protected readonly tint: MsTint = BLUE_TINT;
}

/**
 * The echo bonus on the board: the token is a little blue copy of the hero resting in a
 * pulsing ring; the riot is 7-9 such copies running (each one a real hero: the same body,
 * mouth and trail, the season's blue-white flakes behind it). They blink in the riot's last
 * half second.
 */
export class EchoCloneView {
	private profile: GameProfile | null = null;
	private readonly clones = new Map<number, Hero>();
	private token: Hero | null = null;
	private lastTime = -1;

	private make(profile: GameProfile): Hero {
		return profile === 'ms-pacman' ? new EchoMsPacmanHero() : new EchoPacmanHero();
	}

	draw(
		ctx: CanvasRenderingContext2D,
		echo: EchoCloneService,
		layout: GridLayout,
		time: number,
		profile: GameProfile
	): void {
		const S = layout.tileSize;
		if (!Number.isFinite(S) || S <= 0) {
			console.error('EchoCloneView.draw', 'invalid layout tile size', S);
			return;
		}
		if (profile !== this.profile) {
			this.profile = profile;
			this.clones.clear();
			this.token = null;
		}
		const dt = this.lastTime < 0 ? 0 : Math.min(0.1, Math.max(0, time - this.lastTime));
		this.lastTime = time;
		if (echo.phase === 'token') {
			this.drawToken(ctx, echo, layout, dt, time, profile);
		} else if (echo.phase === 'riot') {
			this.drawRiot(ctx, echo, layout, dt, profile);
		}
		if (echo.phase !== 'riot') {
			this.clones.clear();
		}
	}

	private drawToken(
		ctx: CanvasRenderingContext2D,
		echo: EchoCloneService,
		layout: GridLayout,
		dt: number,
		time: number,
		profile: GameProfile
	): void {
		const at = echo.tokenPosition;
		if (!at) {
			return;
		}
		const S = layout.tileSize;
		const x = layout.offsetX + at.x * S;
		const y = layout.offsetY + at.y * S;
		this.token ??= this.make(profile);
		this.token.setRadius(S * CLONE_RADIUS);
		this.token.update(dt, {
			x,
			y,
			angle: 0,
			moving: false,
			power: false,
			ending: false,
			season: 'winter'
		});
		const blinking = echo.timer < 2 && Math.floor(echo.timer * 5) % 2 === 0;
		ctx.save();
		ctx.globalAlpha = blinking ? 0.45 : 1;
		// a ring that breathes round the little copy
		const pulse = 0.5 + 0.5 * Math.sin(time * 5);
		ctx.strokeStyle = 'rgba(150, 226, 255, 0.9)';
		ctx.lineWidth = Math.max(1, S * 0.06);
		ctx.beginPath();
		ctx.arc(x, y, S * (0.44 + 0.05 * pulse), 0, Math.PI * 2);
		ctx.stroke();
		this.token.draw(ctx);
		ctx.restore();
	}

	private drawRiot(
		ctx: CanvasRenderingContext2D,
		echo: EchoCloneService,
		layout: GridLayout,
		dt: number,
		profile: GameProfile
	): void {
		const S = layout.tileSize;
		const fading = echo.timer < ECHO.fadeSeconds && Math.floor(echo.timer * 12) % 2 === 0;
		const alive = new Set<number>();
		for (const clone of echo.clones) {
			if (!clone.alive) {
				continue;
			}
			alive.add(clone.id);
			let hero = this.clones.get(clone.id);
			if (!hero) {
				hero = this.make(profile);
				this.clones.set(clone.id, hero);
			}
			hero.setRadius(S * CLONE_RADIUS);
			hero.update(dt, {
				x: layout.offsetX + clone.x * S,
				y: layout.offsetY + clone.y * S,
				angle: ANGLES[clone.facing],
				moving: clone.started,
				power: false,
				ending: false,
				season: 'winter'
			});
			ctx.save();
			ctx.globalAlpha = fading ? 0.4 : 0.92;
			hero.draw(ctx);
			ctx.restore();
		}
		for (const id of [...this.clones.keys()]) {
			if (!alive.has(id)) {
				this.clones.delete(id);
			}
		}
	}
}
