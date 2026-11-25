// The station's rules in the game (DESIGN.md §7a), lifted from the squad prototype: the squad
// (`StationSquad`) hunts with its tactics; the food charges the hatch (`StationEscape`) and the
// infection grows with it (and slowly with time); a power cell breaks the play and the squad can
// be eaten; a lurker's bite holds the hero; a hunter's touch costs one of his three HP (the
// hell's rule, the owner 2026-11-25): no restart, he flashes and is safe for a moment, the one that
// bit is thrown back and those round him stunned; at none the level ends without its reward.
// Then the escape: the squad in a rage and 1-4 more breaking out (`EscapeRush`); a touch costs HP
// there too; his lure (the fire key, two per escape) glows far off his way and draws them to it,
// round him. Out through the hatch: the level is won.
import type { GridPoint } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import type { GhostService } from '../actors/GhostService';
import type { GhostModel } from '../actors/GhostModel';
import type { PlayerService } from '../actors/PlayerService';
import type { LevelProgress } from '../level/LevelProgress';
import type { ScoreModel } from '../level/ScoreModel';
import type { GridMatrix } from '../../config/gridConfig';
import { SQUAD_TUNE, StationSquad } from './StationSquad';
import { StationEscape } from './StationEscape';
import { EscapeRush } from './EscapeRush';
import type { StationSound } from '../../audio/StationSynth';

export const RUN_TUNE = {
	hp: 3,
	/** The power cell, s. */
	power: 6,
	contact: 0.6,
	/** A hit: his safe time, s; the stun on the one that bit and those round him, s; the reach, tiles. */
	safe: 1.5,
	bitStun: 1.6,
	stun: 1.2,
	pulseReach: 3,
	/** The escape: the hero's head start, s. */
	headStart: 1.5,
	/** The lure: per escape; how long it glows, s; how far from him, steps; how far off his way, tiles. */
	lures: 2,
	lureTime: 4,
	lureNear: 10,
	lureFar: 20,
	lureOff: 3,
	/** The infection: its share from the hatch's charge, and the time it takes to fill by itself, s. */
	infectionCharge: 0.85,
	infectionTime: 300,
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

/** A word over the board (TO THE CONSOLE, RUN, -1, GRABBED, LURE, a score). */
export interface StationPopup {
	readonly x: number;
	readonly y: number;
	readonly text: string;
	age: number;
}

const under = (p: { x: number; y: number }) => ({ x: Math.floor(p.x), y: Math.floor(p.y) });
const SIDES = [
	[1, 0],
	[-1, 0],
	[0, 1],
	[0, -1]
] as const;

export class StationRun {
	readonly squad: StationSquad;
	readonly escape: StationEscape;
	readonly rush: EscapeRush;
	hp: number = RUN_TUNE.hp;
	/** His safe time after a hit, s. */
	safe = 0;
	/** Seconds since the last hit, or -1 (the damage's flash). */
	hurt = -1;
	power = 0;
	private chain = 0;
	grab = 0;
	/** Seconds since a hit's push went off, or -1. */
	pulse = -1;
	/** 0 clean .. 1 overrun: the hatch's charge and, slowly, the time; never back. */
	infection = 0;
	/** The lure: where it glows and for how long yet; the lures left in this escape. */
	lure: { x: number; y: number; left: number } | null = null;
	lures: number = RUN_TUNE.lures;
	end: 'out' | 'taken' | null = null;
	/** Where its sounds go (the level wires the audio's bus). */
	sound: (s: StationSound) => void = () => undefined;
	private lastPhase = 'calm';
	private folding = new Set<string>();
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

	/** A fresh attempt at the level: the HP back, the squad calm, the hero at the start. */
	reset(): void {
		this.hp = RUN_TUNE.hp;
		this.safe = 0;
		this.hurt = -1;
		this.end = null;
		this.pulse = -1;
		this.lure = null;
		this.lures = RUN_TUNE.lures;
		this.infection = 0;
		this.time = 0;
		this.popups = [];
		this.total = this.progress.remainingDots;
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
		if (this.hurt >= 0) this.hurt += dt;
		this.safe = Math.max(0, this.safe - dt);
		if (this.end) return;
		if (this.grab > 0) {
			this.grab -= dt;
			this.player.setMovementLocked(this.grab > 0);
		}
		if (fire && this.escape.state === 'running') this.throwLure();
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
			this.sound('power');
		}
		if (this.power > 0) {
			this.power -= dt;
			if (this.power <= 0) {
				this.ghosts.endFrightened();
				this.ghosts.setPowerActive(false);
			}
		}
		this.escape.setFood(this.total - this.progress.remainingDots, this.total);
		this.infection = Math.max(
			this.infection,
			Math.min(
				1,
				RUN_TUNE.infectionCharge * this.escape.charge +
					(1 - RUN_TUNE.infectionCharge) * Math.min(1, this.time / RUN_TUNE.infectionTime)
			)
		);
		if (this.escape.state === 'running') this.infection = Math.min(1, this.infection + dt / 6);
		const ev = this.escape.update(dt, hero);
		if (ev.armed) {
			this.popup(RUN_TUNE.console.x + 0.5, RUN_TUNE.console.y - 0.4, 'TO THE CONSOLE');
			this.sound('armed');
		}
		if (ev.started) {
			this.startChase();
			this.seal(RUN_TUNE.headStart);
			this.popup(hero.x + 0.5, hero.y - 0.4, 'RUN');
			this.sound('alarm');
		}
		if (ev.out) {
			this.end = 'out';
			this.sound('out');
			return;
		}
		if (this.lure) {
			this.lure.left -= dt;
			if (this.lure.left <= 0) this.lure = null;
		}
		this.squad.lure = this.lure ? { x: this.lure.x, y: this.lure.y } : null;
		const sev = this.squad.update(dt, this.ghosts, hero, this.player.facing);
		this.playSounds();
		if (this.escape.state === 'running') {
			const lure = this.lure;
			this.rush.update(
				dt,
				lure ? { x: lure.x, y: lure.y } : hero,
				lure ? [] : this.escape.route,
				this.ghosts.baseSpeed * SQUAD_TUNE.rage,
				(x, y) => this.blocked(x, y)
			);
		}
		if (sev.grab > 0) {
			this.grab = sev.grab;
			this.player.setMovementLocked(true);
			this.popup(hero.x + 0.5, hero.y - 0.4, 'GRABBED');
			this.sound('grab');
		}
		this.touches();
	}

	/** The plays' stings: a tell as it starts, a lurker as it begins to fold. */
	private playSounds(): void {
		const sq = this.squad;
		if (sq.phase === 'tell' && this.lastPhase !== 'tell' && sq.next) this.sound(`tell-${sq.next}`);
		this.lastPhase = sq.phase;
		const now = new Set<string>();
		for (const h of sq.hiddenList) {
			if (h.as === 'vent' || h.state !== 'fading') continue;
			const key = `${h.kind}`;
			now.add(key);
			if (!this.folding.has(key)) this.sound('fold');
		}
		this.folding = now;
	}

	/** Where the enraged may not step: the lit lane, and while the lure glows, his way and round him. */
	private blocked(x: number, y: number): boolean {
		if (this.escape.laneBlocks(x, y)) return true;
		if (!this.lure) return false;
		const hero = under(this.player.position);
		if (Math.abs(x - hero.x) + Math.abs(y - hero.y) <= 1) return true;
		return this.escape.onRoute(x, y);
	}

	private touches(): void {
		const p = this.player.position;
		if (this.escape.state === 'running') {
			for (const rn of this.rush.runners) {
				if (rn.stun > 0) continue;
				const rp = this.rush.position(rn);
				if (Math.hypot(rp.x - p.x, rp.y - p.y) >= RUN_TUNE.contact) continue;
				this.hit(p, null);
				if (this.safe > 0) rn.stun = RUN_TUNE.bitStun;
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
			// stunned or held by the alarm: it does not bite
			if (this.ghosts.frozenFor(ghost.kind) > 0) continue;
			this.hit(p, ghost.kind);
			return;
		}
	}

	/**
	 * A touch: one HP, unless he is still safe from the last. The one that bit is thrown back a
	 * tile and stunned, those round him stunned too; at none the level is taken.
	 */
	private hit(p: { x: number; y: number }, biter: GhostModel['kind'] | null): void {
		if (this.safe > 0) return;
		this.hp -= 1;
		this.safe = RUN_TUNE.safe;
		this.hurt = 0;
		this.pulse = 0;
		this.popup(p.x, p.y - 0.5, '-1');
		this.sound('hit');
		const hero = under(p);
		for (const g of this.ghosts.list) {
			const near = Math.hypot(g.position.x - p.x, g.position.y - p.y) < RUN_TUNE.pulseReach;
			if (g.kind === biter) {
				// thrown back a tile, away from him
				for (const [dx, dy] of SIDES) {
					const x = g.tile.x + dx;
					const y = g.tile.y + dy;
					const away =
						Math.abs(x - hero.x) + Math.abs(y - hero.y) >
						Math.abs(g.tile.x - hero.x) + Math.abs(g.tile.y - hero.y);
					if (away && GridService.prototype.isGhostWalkable.call(this.grid, x, y, false)) {
						g.teleportTo({ x, y });
						break;
					}
				}
				this.ghosts.freeze(g.kind, RUN_TUNE.bitStun);
			} else if (near) {
				this.ghosts.freeze(g.kind, RUN_TUNE.stun);
			}
		}
		for (const rn of this.rush.runners) {
			const rp = this.rush.position(rn);
			if (Math.hypot(rp.x - p.x, rp.y - p.y) < RUN_TUNE.pulseReach) rn.stun = RUN_TUNE.stun;
		}
		if (this.hp <= 0) this.end = 'taken';
	}

	/** The alarm: the squad holds a moment (his head start). */
	private seal(hold: number): void {
		for (const g of this.ghosts.list) {
			if (g.state === 'active' || g.state === 'frightened') this.ghosts.freeze(g.kind, hold);
		}
	}

	/** The alarm's chase: the squad enraged, and 1-4 more breaking out of the door and the vents. */
	private startChase(): void {
		this.lures = RUN_TUNE.lures;
		this.lure = null;
		this.squad.chase(this.ghosts, null, () => this.escape.route, {
			lane: (x, y) => this.blocked(x, y)
		});
		this.rush.start(1 + Math.floor(this.random() * 4), RUN_TUNE.doors);
	}

	/**
	 * The lure: it glows on a tile far from him (`lureNear`..`lureFar` steps) and off his way to
	 * the hatch (`lureOff` tiles at least), on the far side from it when it can; the enraged run to
	 * it round him for `lureTime`.
	 */
	throwLure(): boolean {
		if (this.lures <= 0 || this.lure || this.escape.state !== 'running') return false;
		const spot = this.lureSpot();
		if (!spot) return false;
		this.lures -= 1;
		this.lure = { x: spot.x, y: spot.y, left: RUN_TUNE.lureTime };
		this.popup(spot.x + 0.5, spot.y - 0.4, 'LURE');
		this.sound('lure');
		return true;
	}

	/** Where the lure goes (see `throwLure`), or null. */
	lureSpot(): { x: number; y: number } | null {
		const start = under(this.player.position);
		const W = this.rows[0].length;
		const H = this.rows.length;
		const route = this.escape.route;
		const offWay = (x: number, y: number) => {
			let d = Infinity;
			for (const t of route) d = Math.min(d, Math.abs(t.x - x) + Math.abs(t.y - y));
			return d;
		};
		const dist = new Int32Array(W * H).fill(-1);
		const queue = [start];
		dist[start.y * W + start.x] = 0;
		let best: { x: number; y: number; score: number } | null = null;
		for (let i = 0; i < queue.length; i += 1) {
			const c = queue[i];
			const d = dist[c.y * W + c.x];
			if (d >= RUN_TUNE.lureNear && d <= RUN_TUNE.lureFar && this.rows[c.y][c.x] !== 'WL') {
				const off = offWay(c.x, c.y);
				if (off >= RUN_TUNE.lureOff) {
					const score = Math.min(off, 8) * 2 + d;
					if (!best || score > best.score) best = { x: c.x, y: c.y, score };
				}
			}
			if (d >= RUN_TUNE.lureFar) continue;
			for (const [dx, dy] of SIDES) {
				const x = c.x + dx;
				const y = c.y + dy;
				if (x < 0 || y < 0 || x >= W || y >= H || dist[y * W + x] >= 0) continue;
				if (!GridService.prototype.isPlayerWalkable.call(this.grid, x, y)) continue;
				dist[y * W + x] = d + 1;
				queue.push({ x, y });
			}
		}
		return best ? { x: best.x, y: best.y } : null;
	}
}
