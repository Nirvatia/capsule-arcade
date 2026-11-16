import type { AbilityService } from '../../logic/bonuses/AbilityService';
import type { GhostService } from '../../logic/actors/GhostService';
import type { GhostKind } from '../../logic/actors/GhostModel';
import type { PlayerService } from '../../logic/actors/PlayerService';
import type { GridLayout } from '../maze/GridView';
import { ABILITY } from '../../config/abilityConfig';
import { EchoCloneView } from './EchoCloneView';
import type { CuteShape } from './cuteGhost';
import type { HeroSeason } from './hero/heroSeasons';
import {
	MORPH_SECONDS,
	SHOCK_HOP,
	drawAbilityIcon,
	drawGhostForm,
	drawHeldArcs,
	drawMorph,
	drawRelease,
	drawShockArcs
} from './abilityArt';
import type { GhostForm } from './abilityArt';

/** Seconds the smoke of a ghost the shock let go rises. */
const RELEASE_SECONDS = 0.45;
/** Radians of the stride per tile the masked hero walks (as the ghosts'). */
const STRIDE_PER_TILE = 5.7;
/** The mask's last second blinks this many times a second. */
const BLINK_RATE = 8;

/** How the hero shows this frame while the mask is on, comes on or comes off. */
export type MaskShow =
	| { readonly kind: 'none' }
	| { readonly kind: 'form'; readonly peek: boolean }
	| { readonly kind: 'morph'; readonly k: number; readonly out: boolean };

/**
 * The abilities on the board (the art is `abilityArt`, picked in the `powers` prototype): the
 * tokens and the echo's riot under the actors; the shock's arcs, the arcs round the held ghosts
 * and the smoke of the ones let go over them; the masked hero as the season's ghost, with the
 * turn into it and back.
 */
export class AbilityView {
	private readonly echoView = new EchoCloneView();
	/** Where each held ghost was last seen, and when it was let go (render time, or -1). */
	private readonly held = new Map<GhostKind, { x: number; y: number; freed: number }>();
	/** The mask as last drawn: on, and when it came off (render time, or -1). */
	private wasMasked = false;
	private maskOff = -1;
	private walked = 0;
	private lastHero: { x: number; y: number } | null = null;

	/** The token (if one lies on the board) and the echo's riot: under the actors. */
	drawUnder(
		ctx: CanvasRenderingContext2D,
		abilities: AbilityService,
		layout: GridLayout,
		time: number
	): void {
		const at = abilities.tokenPosition;
		if (abilities.phase === 'token' && at) {
			const left = abilities.tokenTimer;
			if (abilities.kind === 'echo') {
				this.echoView.drawToken(ctx, at, left, layout, time);
			} else {
				const S = layout.tileSize;
				// the last seconds it flickers: take it or lose it
				const blinking = left < ABILITY.tokenBlinkSeconds && Math.floor(left * 5) % 2 === 0;
				ctx.save();
				ctx.globalAlpha *= blinking ? 0.45 : 1;
				drawAbilityIcon(
					ctx,
					abilities.kind,
					layout.offsetX + at.x * S,
					layout.offsetY + at.y * S,
					S,
					time
				);
				ctx.restore();
			}
		}
		this.echoView.draw(ctx, abilities.echo, layout, time);
	}

	/** The shock over the ghosts: the discharge, the arcs round the held ones, the release. */
	drawOver(
		ctx: CanvasRenderingContext2D,
		abilities: AbilityService,
		ghosts: GhostService,
		layout: GridLayout,
		time: number
	): void {
		const S = layout.tileSize;
		if (!Number.isFinite(S) || S <= 0) {
			return;
		}
		const px = (x: number) => layout.offsetX + x * S;
		const py = (y: number) => layout.offsetY + y * S;
		ghosts.list.forEach((ghost, i) => {
			const left = ghosts.frozenFor(ghost.kind);
			const p = ghost.position;
			const seen = this.held.get(ghost.kind);
			if (left > 0) {
				this.held.set(ghost.kind, { x: p.x, y: p.y, freed: -1 });
				drawHeldArcs(
					ctx,
					px(p.x),
					py(p.y),
					S,
					ABILITY.shock.seconds - left,
					ABILITY.shock.seconds,
					ABILITY.shock.shakeSeconds,
					i
				);
				return;
			}
			if (seen && seen.freed < 0) {
				seen.freed = time;
			}
			if (seen) {
				const k = (time - seen.freed) / RELEASE_SECONDS;
				if (k >= 1 || k < 0) {
					this.held.delete(ghost.kind);
				} else {
					drawRelease(ctx, px(seen.x), py(seen.y), S, k, i);
				}
			}
		});
		const strike = abilities.strike;
		if (strike && abilities.strikeAge < 0.6) {
			const hops = strike.links.map((link, i) => {
				const from = link.from < 0 ? strike : strike.links[link.from];
				return {
					x0: px(from?.x ?? strike.x),
					y0: py(from?.y ?? strike.y),
					x1: px(link.x),
					y1: py(link.y),
					delay: i * SHOCK_HOP
				};
			});
			drawShockArcs(ctx, hops, px(strike.x), py(strike.y), S, abilities.strikeAge);
		}
	}

	/**
	 * How the hero shows now: as himself, as his ghost form (peeking out in the mask's last
	 * second), or mid-turn. Call once a frame, in play; `time` is the render clock.
	 */
	maskShow(abilities: AbilityService | null, playing: boolean, time: number): MaskShow {
		const masked = Boolean(abilities?.masked) && playing;
		if (masked && abilities) {
			this.wasMasked = true;
			this.maskOff = -1;
			const left = abilities.timer;
			const on = abilities.duration - left;
			if (on < MORPH_SECONDS) {
				return { kind: 'morph', k: on / MORPH_SECONDS, out: false };
			}
			const peek = left < ABILITY.mask.blinkSeconds && Math.floor(left * BLINK_RATE) % 2 === 0;
			return { kind: 'form', peek };
		}
		if (this.wasMasked) {
			this.wasMasked = false;
			this.maskOff = playing ? time : -1;
		}
		if (this.maskOff >= 0) {
			const k = (time - this.maskOff) / MORPH_SECONDS;
			if (k >= 0 && k < 1) {
				return { kind: 'morph', k, out: true };
			}
			this.maskOff = -1;
		}
		return { kind: 'none' };
	}

	/** The ghost form's look this frame: the season's ghost, heading and stride of the hero. */
	ghostForm(
		player: PlayerService,
		ms: boolean,
		shape: CuteShape,
		season: HeroSeason,
		time: number
	): GhostForm {
		const p = player.position;
		if (this.lastHero) {
			const moved = Math.hypot(p.x - this.lastHero.x, p.y - this.lastHero.y);
			if (moved < 1.5) this.walked += moved;
		}
		this.lastHero = { x: p.x, y: p.y };
		const facing = player.facing;
		return {
			ms,
			shape,
			season,
			lookX: facing === 'LEFT' ? -1 : facing === 'RIGHT' ? 1 : 0,
			lookY: facing === 'UP' ? -1 : facing === 'DOWN' ? 1 : 0,
			time,
			step: this.walked * STRIDE_PER_TILE
		};
	}

	/**
	 * Draws the hero as `show` says, at (x, y) px on a tile of `S` px; `hero(c)` paints him
	 * centred at (0, 0) of `c` (for the turn), `heroHere()` where he stands (the peek).
	 */
	drawMasked(
		ctx: CanvasRenderingContext2D,
		show: MaskShow,
		form: GhostForm,
		x: number,
		y: number,
		S: number,
		hero: (c: CanvasRenderingContext2D) => void,
		heroHere: () => void
	): void {
		if (show.kind === 'morph') {
			drawMorph(ctx, show.k, show.out, x, y, S, hero, form);
			return;
		}
		if (show.kind !== 'form') {
			return;
		}
		if (show.peek) {
			// the mask wears thin: the hero shows through it
			ctx.save();
			ctx.globalAlpha *= 0.7;
			heroHere();
			ctx.restore();
			drawGhostForm(ctx, form, x, y, S, 0.25, 0.45);
			return;
		}
		drawGhostForm(ctx, form, x, y, S);
	}
}
