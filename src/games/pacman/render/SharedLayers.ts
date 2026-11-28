import { padSink } from './actors/padSink';
import type { GridLayout } from './maze/GridView';
import { HeroView } from './actors/HeroView';
import { CinnabarHero } from './actors/hero/CinnabarHero';
import { JadeHero } from './actors/hero/JadeHero';
import { FRUIT_BODY_RATIO, MelonHero, OrangeHero } from './actors/hero/FruitHero';
import { readHeroSkin } from './actors/hero/heroSkin';
import { CJ_BODY_RATIO } from './actors/hero/vesselHero';
import type { PacmanAudioCue } from '../core/Events';
import type { PlayerDrawOptions } from './actors/playerDrawOptions';
import { chargePainter } from './actors/hero/heroCharge';
import { heroSeasonOf } from './actors/hero/heroSeasons';
import { AbilityView } from './actors/AbilityView';
import { SEASON_GHOST } from './actors/cuteGhost';
import { FruitView } from './items/fruit/FruitView';
import { EasterEggView } from './items/EasterEggView';
import { drawBonusLife } from './items/BonusLifeView';
import { drawExit } from './items/ExitView';
import { drawHellExit, drawHellHeart } from './doom/finaleArt';
import type { RenderFrame } from './RenderFrame';

/**
 * Layers drawn the same way on every level: Pac-Man and the bonuses. Level renderers place
 * the bonuses in their draw order; the pipeline draws Pac-Man over the level decay and the
 * season turn. The HUD and the screens are Svelte (`ui/PacmanUi`), not canvas.
 */
export class SharedLayers {
	private readonly fruit = readHeroSkin() === 'fruit';
	private readonly heroView = this.fruit
		? new HeroView(new OrangeHero(), chargePainter, FRUIT_BODY_RATIO)
		: new HeroView(new CinnabarHero(), chargePainter, CJ_BODY_RATIO);
	private readonly msHeroView = this.fruit
		? new HeroView(new MelonHero(), chargePainter, FRUIT_BODY_RATIO)
		: new HeroView(new JadeHero(), chargePainter, CJ_BODY_RATIO);
	private readonly fruitView = new FruitView();
	private readonly easterEggView = new EasterEggView();
	private readonly abilityView = new AbilityView();

	drawCollectibles(frame: RenderFrame, layout: GridLayout): void {
		const { ctx, level } = frame;
		const fruit = level.fruit;
		if (fruit && fruit.active !== null) {
			this.fruitView.draw(ctx, fruit, layout, frame.time);
		}

		const egg = level.egg;
		if (egg && egg.phase === 'egg') {
			this.easterEggView.draw(ctx, egg, layout, frame.time);
		}

		const abilities = level.abilities;
		if (abilities && !level.hellMode && !level.secretMode) {
			this.abilityView.drawUnder(ctx, abilities, layout, frame.time);
		}

		const reward = level.bossReward;
		const heart = reward?.offered ? reward.heart : null;
		const exit = reward?.offered ? reward.exit : null;
		const S = layout.tileSize;
		// the hell's own: an iron hatch open on gold light, a red heart in a bone frame
		const hell = level.hellMode;
		if (exit) {
			const ex = layout.offsetX + exit.x * S;
			const ey = layout.offsetY + exit.y * S;
			if (hell) drawHellExit(ctx, ex, ey, S, frame.time, 1);
			else drawExit(ctx, ex, ey, S, frame.time);
		}
		if (heart) {
			const hx = layout.offsetX + heart.x * S;
			const hy = layout.offsetY + heart.y * S;
			if (hell) drawHellHeart(ctx, hx, hy, S, frame.time);
			else drawBonusLife(ctx, hx, hy, S, frame.time);
		}
	}

	/** What the abilities show over the ghosts (the shock's held ghosts and its arcs). */
	drawAbilitiesOver(frame: RenderFrame, layout: GridLayout): void {
		const { level } = frame;
		const abilities = level.abilities;
		const ghosts = level.ghosts;
		if (abilities && ghosts && !level.hellMode && !level.secretMode) {
			this.abilityView.drawOver(frame.ctx, abilities, ghosts, layout, frame.time);
		}
	}

	/** Eating, power-ups, teleports: both players react, only the one on screen shows it. */
	trigger(cue: PacmanAudioCue): void {
		this.heroView.trigger(cue);
		this.msHeroView.trigger(cue);
	}

	/** The BFG's release: whoever is on screen recoils. */
	fireBurst(): void {
		this.heroView.kick();
		this.msHeroView.kick();
	}

	drawPlayer(frame: RenderFrame, layout: GridLayout): void {
		const player = frame.level.player;
		if (!player) {
			return;
		}
		const season = heroSeasonOf(frame.season.name, frame.level.hellMode);
		this.heroView.setSeason(season);
		this.msHeroView.setSeason(season);
		// Ms. Pac-Man the heroine or Pac-Man the hero, the hell included
		const view = frame.level.profile === 'ms-pacman' ? this.msHeroView : this.heroView;
		const ctx = frame.ctx;
		const options = { ...this.playerOptions(frame), paused: frame.paused };
		const drawHero = (c: CanvasRenderingContext2D) =>
			view.draw(c, player, layout, frame.time, options);
		const level = frame.level;
		const show =
			level.hellMode || level.secretMode
				? ({ kind: 'none' } as const)
				: this.abilityView.maskShow(level.abilities, frame.state === 'playing', frame.time);
		if (show.kind === 'none') {
			drawHero(ctx);
			return;
		}
		// the mask: the hero as the season's ghost, or turning into it or back
		const S = layout.tileSize;
		const p = player.position;
		const x = layout.offsetX + p.x * S;
		const y = layout.offsetY + p.y * S;
		const form = this.abilityView.ghostForm(
			player,
			level.profile === 'ms-pacman',
			SEASON_GHOST[frame.season.name] ?? 'drop',
			season,
			frame.time
		);
		this.abilityView.drawMasked(
			ctx,
			show,
			form,
			x,
			y,
			S,
			(c) => {
				// the hero painted where he stands, moved to the scratch canvas's centre
				c.save();
				c.translate(-x, -y);
				drawHero(c);
				c.restore();
			},
			() => drawHero(ctx)
		);
	}

	/** Where the food ahead is pulled to (the hero's mouth), while he plays; else null. */
	attract(frame: RenderFrame): { x: number; y: number; angle: number } | null {
		const player = frame.level.player;
		if (!player || frame.state !== 'playing' || frame.paused) {
			return null;
		}
		const view = frame.level.profile === 'ms-pacman' ? this.msHeroView : this.heroView;
		return view.attract(player);
	}

	private playerOptions(frame: RenderFrame): PlayerDrawOptions {
		const { level } = frame;
		const dying = frame.state === 'death';
		const shield = frame.state === 'playing';
		const padAhead = this.padAhead(frame);
		if (level.hellMode) {
			const doom = level.doom;
			return {
				look: doom && doom.berserkActive ? 'berserk' : 'normal',
				charge: doom && doom.bfgCharging ? doom.bfgChargeProgress : 0,
				dying,
				shield,
				padAhead,
				chargeLight: true
			};
		}
		const combat = level.combat;
		const hypnosis = level.hypnosis;
		const powered =
			level.profile === 'ms-pacman'
				? Boolean(hypnosis && hypnosis.overdriveActive)
				: Boolean(combat && combat.isPowerActive);
		// the powered look calms down over the power's last two seconds
		const left =
			level.profile === 'ms-pacman' ? (hypnosis?.overdriveTimer ?? 0) : (combat?.powerTimer ?? 0);
		const ending = powered && left < 2;
		return {
			look: powered ? 'energized' : 'normal',
			charge: 0,
			dying,
			ending,
			shield,
			padAhead,
			padSink: this.padSink(frame)
		};
	}

	/** How far the hero has sunk into the tunnel pad he stands on or near, 0..1. */
	private padSink(frame: RenderFrame): number {
		const player = frame.level.player;
		if (!player) {
			return 0;
		}
		const { x, y } = player.position;
		let nearest = Infinity;
		for (let dy = -1; dy <= 1; dy++) {
			for (let dx = -1; dx <= 1; dx++) {
				const tx = Math.floor(x) + dx;
				const ty = Math.floor(y) + dy;
				if (frame.grid.isInside(tx, ty) && frame.grid.isTeleport(tx, ty)) {
					nearest = Math.min(nearest, Math.hypot(x - (tx + 0.5), y - (ty + 0.5)));
				}
			}
		}
		return padSink(nearest);
	}

	/** A tunnel pad lies one or two tiles ahead of the hero along his heading. */
	private padAhead(frame: RenderFrame): boolean {
		const player = frame.level.player;
		const facing = player?.facing;
		if (!player || !facing) {
			return false;
		}
		const v = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] }[facing];
		const tile = player.tile;
		for (const k of [1, 2]) {
			const x = tile.x + v[0] * k;
			const y = tile.y + v[1] * k;
			if (frame.grid.isInside(x, y) && frame.grid.isTeleport(x, y)) {
				return true;
			}
		}
		return false;
	}
}
