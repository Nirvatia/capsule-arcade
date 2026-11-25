// The station's rules in the game (DESIGN.md §7a), lifted from the squad prototype: the squad
// (`StationSquad`) hunts with its tactics; the food charges the hatch (`StationEscape`); a power
// cell breaks the play and the squad can be eaten; a lurker's bite holds the hero; a hunter's
// touch costs one of the station's three hits (the third ends the level without its reward).
// Then the escape: the squad in a rage and 1-4 more breaking out (`EscapeRush`); the first
// touch sets off his pulse, the second starts the escape over from the console; his
// breakthrough (the fire key, two per escape) lights the way out as a lane. Out through the
// hatch: the level is won.
import type { GridPoint } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import type { GhostService } from '../actors/GhostService';
import type { PlayerService } from '../actors/PlayerService';
import type { LevelProgress } from '../level/LevelProgress';
import type { ScoreModel } from '../level/ScoreModel';
import type { GridMatrix } from '../../config/gridConfig';
import { SQUAD_TUNE, StationSquad } from './StationSquad';
import { StationEscape } from './StationEscape';
import { EscapeRush } from './EscapeRush';

export const RUN_TUNE = {
	hits: 3,
	/** The power cell, s. */
	power: 6,
	/** A hit's pause before he is back at the start, s. */
	death: 1.4,
	contact: 0.6,
	/** The pulse: how long it stuns the squad, s; how far it reaches, tiles. */
	stun: 1.2,
	pulseReach: 3,
	/** The escape: the hero's head start, s; a restart's stun on the squad, s. */
	headStart: 1.5,
	restartStun: 3,
	/** The breakthrough's stun on those it throws off, s. */
	laneStun: 1.5,
	/** Where the breakout comes from: above the containment's door, the vents' mouths. */
	doors: [
		{ x: 12, y: 10 },
		{ x: 6, y: 2 },
		{ x: 18, y: 2 },
		{ x: 6, y: 24 },
		{ x: 18, y: 24 }
	],
	/** The lair's exit delays against the season levels'. */
	exitScale: 0.35,
	console: { x: 12, y: 24 },
	hatch: { x: 6, y: 1 }
} as const;

/** The game's grid with the escape's doors and the fence's beams in the way, the hatch no vent once open. */
export class StationGrid extends GridService {
	escape: StationEscape | null = null;
	squad: StationSquad | null = null;
	isPlayerWalkable(x: number, y: number): boolean {
		return super.isPlayerWalkable(x, y) && !this.escape?.blocks(x, y) && !this.squad?.blocks(x, y);
	}
	isGhostWalkable(x: number, y: number, allowLair: boolean): boolean {
		return (
			super.isGhostWalkable(x, y, allowLair) &&
			!this.escape?.blocks(x, y) &&
			(allowLair || !this.escape?.laneBlocks(x, y))
		);
	}
	private isHatch(x: number, y: number): boolean {
		return this.escape?.state === 'running' && x === RUN_TUNE.hatch.x && y === RUN_TUNE.hatch.y;
	}
	isTeleport(x: number, y: number): boolean {
		return !this.isHatch(x, y) && super.isTeleport(x, y);
	}
	teleportDestination(x: number, y: number): GridPoint | undefined {
		return this.isHatch(x, y) ? undefined : super.teleportDestination(x, y);
	}
}

/** A word over the board (TO THE CONSOLE, RUN, PULSE, GRABBED, a score). */
export interface StationPopup {
	readonly x: number;
	readonly y: number;
	readonly text: string;
	age: number;
}

const under = (p: { x: number; y: number }) => ({ x: Math.floor(p.x), y: Math.floor(p.y) });

export class StationRun {
	readonly squad: StationSquad;
	readonly escape: StationEscape;
	readonly rush: EscapeRush;
	hits: number = RUN_TUNE.hits;
	/** Seconds into a hit's pause, or -1. */
	dying = -1;
	power = 0;
	private chain = 0;
	grab = 0;
	/** Seconds since the pulse went off, or -1. */
	pulse = -1;
	end: 'out' | 'taken' | null = null;
	popups: StationPopup[] = [];
	time = 0;
	private total = 0;

	constructor(
		private readonly grid: StationGrid,
		private readonly ghosts: GhostService,
		private readonly player: PlayerService,
		private readonly progress: LevelProgress,
		private readonly score: ScoreModel,
		private readonly rows: GridMatrix,
		private readonly random: () => number = Math.random
	) {
		const isFood = (x: number, y: number) => rows[y]?.[x] === 'DT' || rows[y]?.[x] === 'EU';
		this.squad = new StationSquad(
			{
				walkable: (x, y) => grid.isGhostWalkable(x, y, false),
				teleport: (x, y) => grid.teleportDestination(x, y),
				eaten: (x, y) => isFood(x, y) && progress.isCollected(x, y),
				food: (x, y) => isFood(x, y) && !progress.isCollected(x, y),
				cell: (x, y) => rows[y]?.[x] === 'EU',
				vent: (x, y) => /^0[ABC]$/.test(rows[y]?.[x] ?? ''),
				width: rows[0].length,
				height: rows.length
			},
			(random() * 1e9) | 0
		);
		this.escape = new StationEscape(
			{ walkable: (x, y) => GridService.prototype.isPlayerWalkable.call(grid, x, y) },
			RUN_TUNE.console,
			RUN_TUNE.hatch,
			false
		);
		this.rush = new EscapeRush({
			walkable: (x, y) => GridService.prototype.isGhostWalkable.call(grid, x, y, false)
		});
		grid.escape = this.escape;
		grid.squad = this.squad;
		ghosts.setSquadGuide(this.squad);
		this.total = progress.remainingDots;
	}

	/** A fresh attempt at the level: the hits back, the squad calm, the hero at the start. */
	reset(): void {
		this.hits = RUN_TUNE.hits;
		this.end = null;
		this.dying = -1;
		this.pulse = -1;
		this.popups = [];
		this.total = this.progress.remainingDots;
		this.respawn();
	}

	private respawn(): void {
		this.player.reset();
		this.ghosts.reset();
		this.squad.reset(this.ghosts);
		this.power = 0;
		this.grab = 0;
		this.player.setMovementLocked(false);
	}

	private popup(x: number, y: number, text: string): void {
		this.popups.push({ x, y, text, age: 0 });
	}

	/** One frame: the hero and the squad move, then the plays, the escape and the touches. */
	update(dt: number, fire: boolean): void {
		this.time += dt;
		for (const p of this.popups) p.age += dt;
		this.popups = this.popups.filter((p) => p.age < 1.2);
		if (this.pulse >= 0) this.pulse += dt;
		if (this.end) return;
		if (this.dying >= 0) {
			this.dying += dt;
			if (this.dying >= RUN_TUNE.death) {
				this.dying = -1;
				this.hits -= 1;
				if (this.hits <= 0) {
					this.end = 'taken';
					return;
				}
				this.respawn();
			}
			return;
		}
		if (this.grab > 0) {
			this.grab -= dt;
			this.player.setMovementLocked(this.grab > 0);
		}
		if (fire && this.escape.state === 'running') this.breakthrough();
		this.player.update(dt);
		this.ghosts.update(dt);
		const hero = under(this.player.position);
		// the power cell: the play breaks, the mimics show, the squad can be eaten
		if (this.progress.consumePendingEnergizer()) {
			this.squad.onPower(this.ghosts);
			this.ghosts.frightenActive();
			this.ghosts.setPowerActive(true);
			this.power = RUN_TUNE.power;
			this.chain = 0;
		}
		if (this.power > 0) {
			this.power -= dt;
			if (this.power <= 0) {
				this.ghosts.endFrightened();
				this.ghosts.setPowerActive(false);
			}
		}
		this.escape.setFood(this.total - this.progress.remainingDots, this.total);
		const ev = this.escape.update(dt, hero);
		if (ev.armed) this.popup(RUN_TUNE.console.x + 0.5, RUN_TUNE.console.y - 0.4, 'TO THE CONSOLE');
		if (ev.started) {
			this.startChase();
			this.seal(RUN_TUNE.headStart);
			this.popup(hero.x + 0.5, hero.y - 0.4, 'RUN');
		}
		if (ev.out) {
			this.end = 'out';
			return;
		}
		const sev = this.squad.update(dt, this.ghosts, hero, this.player.facing);
		if (this.escape.state === 'running') {
			this.rush.update(
				dt,
				hero,
				this.escape.route,
				this.ghosts.baseSpeed * SQUAD_TUNE.rage,
				(x, y) => this.escape.laneBlocks(x, y)
			);
		}
		if (sev.grab > 0) {
			this.grab = sev.grab;
			this.player.setMovementLocked(true);
			this.popup(hero.x + 0.5, hero.y - 0.4, 'GRABBED');
		}
		this.touches();
	}

	private touches(): void {
		const p = this.player.position;
		if (this.escape.state === 'running') {
			for (const rn of this.rush.runners) {
				if (rn.stun > 0) continue;
				const rp = this.rush.position(rn);
				if (Math.hypot(rp.x - p.x, rp.y - p.y) >= RUN_TUNE.contact) continue;
				this.touched(p);
				return;
			}
		}
		for (const ghost of this.ghosts.list) {
			if (this.squad.hidden(ghost.kind)) continue;
			const gp = ghost.position;
			if (Math.hypot(gp.x - p.x, gp.y - p.y) >= RUN_TUNE.contact) continue;
			if (ghost.state === 'frightened') {
				this.ghosts.toEyes(ghost);
				this.chain += 1;
				const pts = 200 * 2 ** Math.min(3, this.chain - 1);
				this.score.add(pts);
				this.popup(gp.x, gp.y - 0.4, String(pts));
				continue;
			}
			if (
				(ghost.state !== 'active' && ghost.state !== 'enraged') ||
				this.squad.harmless(ghost.kind)
			)
				continue;
			// stunned by the pulse or held by the alarm: it does not bite
			if (this.ghosts.frozenFor(ghost.kind) > 0) continue;
			if (this.escape.state === 'running') {
				this.touched(p);
				return;
			}
			this.dying = 0;
			return;
		}
	}

	/** The alarm: the squad holds a moment (his head start). */
	private seal(hold: number): void {
		for (const g of this.ghosts.list) {
			if (g.state === 'active' || g.state === 'frightened') this.ghosts.freeze(g.kind, hold);
		}
	}

	/** The alarm's chase: the squad enraged, and 1-4 more breaking out of the door and the vents. */
	private startChase(): void {
		this.squad.chase(this.ghosts, null, () => this.escape.route, {
			lane: (x, y) => this.escape.laneBlocks(x, y)
		});
		this.rush.start(1 + Math.floor(this.random() * 4), RUN_TUNE.doors);
	}

	/** The breakthrough: the way to the hatch lit; whoever stands on it is thrown off and stunned. */
	breakthrough(): void {
		const hero = under(this.player.position);
		if (!this.escape.useLane(hero)) return;
		const lane = (x: number, y: number) => this.escape.laneBlocks(x, y);
		for (const g of this.ghosts.list) {
			if (g.state !== 'active' || !lane(g.tile.x, g.tile.y)) continue;
			for (const [dx, dy] of [
				[1, 0],
				[-1, 0],
				[0, 1],
				[0, -1]
			]) {
				const x = g.tile.x + dx;
				const y = g.tile.y + dy;
				if (GridService.prototype.isGhostWalkable.call(this.grid, x, y, false) && !lane(x, y)) {
					g.teleportTo({ x, y });
					break;
				}
			}
			this.ghosts.freeze(g.kind, RUN_TUNE.laneStun);
		}
		this.rush.knockOff(lane, RUN_TUNE.laneStun);
		this.popup(hero.x + 0.5, hero.y - 0.4, 'BREAKTHROUGH');
	}

	/** A touch in the escape: the first sets off the pulse, the second starts it over. */
	private touched(p: { x: number; y: number }): void {
		if (this.escape.touch() === 'pulse') {
			// the pulse throws off only those close round him; the rest come on
			this.pulse = 0;
			const near = (x: number, y: number) => Math.hypot(x - p.x, y - p.y) < RUN_TUNE.pulseReach;
			for (const g of this.ghosts.list)
				if (near(g.position.x, g.position.y)) this.ghosts.freeze(g.kind, RUN_TUNE.stun);
			for (const rn of this.rush.runners) {
				const rp = this.rush.position(rn);
				if (near(rp.x, rp.y)) rn.stun = RUN_TUNE.stun;
			}
			this.popup(p.x, p.y - 0.5, 'PULSE');
			return;
		}
		this.player.placeAt(RUN_TUNE.console);
		this.startChase();
		this.seal(RUN_TUNE.restartStun);
		for (const rn of this.rush.runners) rn.stun = RUN_TUNE.restartStun;
		this.popup(RUN_TUNE.console.x + 0.5, RUN_TUNE.console.y - 0.4, 'AGAIN');
	}
}
