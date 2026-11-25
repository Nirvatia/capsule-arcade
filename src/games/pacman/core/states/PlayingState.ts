import type { GameState, GameStateContext } from '../flow/GameState';
import { idleTiming } from '../flow/GameState';
import type { FlowTiming } from '../flow/StateClock';
import type { PacmanStateName } from '../Events';

export class PlayingState implements GameState {
	readonly name: PacmanStateName = 'playing';
	readonly pausable = true;
	private lastHudKey = '';
	/** Seconds the play stays frozen after a ghost is eaten (hit-stop). */
	private hitStop = 0;

	enter(ctx: GameStateContext): void {
		ctx.level.ensure();
		ctx.level.emitHud();
	}

	update(ctx: GameStateContext, dt: number): void {
		if (!Number.isFinite(dt) || dt < 0) {
			console.error('PlayingState.update', 'invalid delta time', dt);
			return;
		}
		const session = ctx.level.session;
		if (!session) {
			console.error('PlayingState.update', 'level is not initialized');
			return;
		}
		if (this.hitStop > 0) {
			this.hitStop = Math.max(0, this.hitStop - dt);
			return;
		}
		const { player, fruit, egg, abilities, ghosts, combat, lairCode, hypnosis } = session;
		if (combat.deathActive) {
			ctx.director.showDeath();
			return;
		}
		if (combat.endRequested) {
			if (combat.result === 'win') {
				ctx.director.showLevelClear();
				return;
			}
			ctx.director.showGameOver();
			return;
		}
		const station = session.stationRun;
		if (station) {
			// the station plays by its own rules (the squad, the escape): they move the hero and the squad
			station.update(dt, ctx.level.consumeFireRequest());
			if (!combat.endRequested && station.end === 'out') {
				combat.completeHellLevel(false);
			} else if (!combat.endRequested && station.end === 'taken') {
				// the third hit: the level ends without its reward, the run goes on (the hell's rule)
				combat.killPlayerInHell();
				ctx.director.showDeath();
				return;
			}
			combat.update(dt);
			this.emitHud(ctx);
			if (combat.endRequested && combat.result === 'win') {
				ctx.director.showLevelClear();
			}
			return;
		}
		lairCode.update(dt);
		ctx.level.syncLairOpen();
		player.update(dt);
		fruit.update(dt, player);
		const fireRequested = ctx.level.consumeFireRequest();
		// the arcade is plain Pac-Man: no Easter egg, no abilities; the hell fires instead
		if (!ctx.level.secretMode) {
			egg.update(dt, player);
		}
		if (!ctx.level.secretMode && !session.doom) {
			const world = {
				player,
				ghosts,
				fruit,
				powered: combat.isPowerActive || hypnosis.overdriveActive
			};
			abilities.update(dt, world);
			if (fireRequested) {
				abilities.use(world);
			}
		}
		if (egg.consumeSecretRequested()) {
			ctx.director.shiftWorld('enter', () => ctx.level.enterSecretLevel());
			return;
		}
		if (session.doom) {
			const { boss: doomBoss, abilities: doom } = session.doom;
			doomBoss.update(dt, player);
			doom.update(dt, player);
			if (!combat.endRequested && doom.consumePlayerDeath()) {
				combat.killPlayerInHell();
				if (combat.deathActive) {
					console.warn('PlayingState.update', 'death requested by doom damage', {
						reason: combat.lastDeathReason
					});
					ctx.director.showDeath();
					return;
				}
			}
			// the boss is dead: the level ends when the player takes the heart or the exit
			const reward = session.bossReward;
			if (!combat.endRequested && doomBoss.defeated && reward) {
				reward.offer(player.tile);
				reward.update(player);
				const choice = reward.consumeChoice();
				if (choice) {
					combat.completeHellLevel(choice === 'life');
				}
			}
			if (!combat.endRequested && fireRequested) {
				doom.fire(player);
			}
		} else {
			ghosts.update(dt);
		}
		combat.update(dt);
		this.hitStop = combat.consumeHitStop();
		if (combat.deathActive) {
			console.warn('PlayingState.update', 'death requested', {
				reason: combat.lastDeathReason
			});
			ctx.director.showDeath();
			return;
		}
		this.emitHud(ctx);
		if (combat.endRequested) {
			if (combat.result === 'win') {
				ctx.director.showLevelClear();
				return;
			}
			ctx.director.showGameOver();
		}
	}

	private emitHud(ctx: GameStateContext): void {
		const hud = ctx.level.hudPayload();
		const hudKey = JSON.stringify(hud);
		if (hudKey !== this.lastHudKey) {
			this.lastHudKey = hudKey;
			ctx.events.emit('ui:hudChanged', hud);
		}
	}

	exit(): void {
		this.lastHudKey = '';
		this.hitStop = 0;
	}

	timing(): FlowTiming {
		return idleTiming('run');
	}
}
