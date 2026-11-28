// The hell fight's new rules (DESIGN.md §7 "The fight, redesigned"), for the playable prototype: the
// real boss (`DoomBossService`: chase, attacks, phases, damage, stun), the real hero and food
// (`PlayerService`, `LevelProgress`), the four ghosts of the split on `DronePack`'s classic chase. What is
// new lives here, written to move into `logic/doom` once the owner has played it: the food's BFG charge,
// the split (omen, burst, 18 s of Pac-Man, the return to the core, the stunned boss), the arsenal (the
// berserk's rush, the snare, the plasma) and the pickups (moved off the corners, medkit or armour).
import { GRID_DOOM as DRAWN } from '../../../src/games/pacman/config/mazes/grid_doom';
import type { GridMatrix, TileType } from '../../../src/games/pacman/config/gridConfig';
import type { PacmanEventMap } from '../../../src/games/pacman/core/Events';
import { EventBus } from '../../../src/games/pacman/engine/EventBus';
import { PlayerService } from '../../../src/games/pacman/logic/actors/PlayerService';
import { DoomBossService } from '../../../src/games/pacman/logic/doom/DoomBossService';
import { PHASE_THRESHOLDS } from '../../../src/games/pacman/logic/doom/DoomBalance';
import type { DoomBfgShot, DoomFxEvent } from '../../../src/games/pacman/logic/doom/DoomWeaponService';
import { LevelProgress } from '../../../src/games/pacman/logic/level/LevelProgress';
import { ScoreModel } from '../../../src/games/pacman/logic/level/ScoreModel';
import type { GridPoint } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridModel } from '../../../src/games/pacman/logic/maze/GridModel';
import { GridService } from '../../../src/games/pacman/logic/maze/GridService';
import type { Drone } from '../../../src/games/pacman/logic/net/DronePack';
import { DronePack } from '../../../src/games/pacman/logic/net/DronePack';
import { zoneRng } from '../../../src/games/pacman/logic/zone/zoneRng';

/** Every number of the new rules, in one place for tuning. */
export const TUNE = {
	foodPerShot: 30,
	bfgCharge: 0.8,
	bfgSpeed: 14,
	bfgDamage: 250,
	bfgStun: 0.5,
	omenMin: 0.4,
	burst: 0.6,
	pacman: 18,
	merge: 1.6,
	fear: 7,
	ghostDamage: 75,
	/** All four eaten: he forms stunned (and loses nothing). */
	formStun: 5,
	berserk: 8,
	berserkSpeed: 1.15,
	rushTiles: 5,
	rushDamage: 250,
	rushStun: 1.2,
	snareLife: 25,
	snareHold: 2.5,
	snareDamage: 100,
	plasmaAmmo: 3,
	plasmaRate: 0.1,
	plasmaSpeed: 16,
	plasmaDamage: 10,
	respawnMin: 15,
	respawnMax: 20,
	iframes: 1.5,
	maxHp: 3
} as const;

export type Stage = 'fight' | 'omen' | 'burst' | 'pacman' | 'merge' | 'won' | 'lost';
export type HandItem = 'berserk' | 'snare' | 'plasma';
export type PickupKind = HandItem | 'medkit' | 'armour';

export interface Pickup {
	readonly tile: GridPoint;
	kind: PickupKind | null;
	timer: number;
}

export interface Snare {
	readonly tile: GridPoint;
	life: number;
	/** Seconds since it snapped, or -1 while open. */
	snapped: number;
}

/** Four spots in the middle of the outer sides: the corners are the split's energizers'. */
export const PICKUP_TILES: readonly GridPoint[] = [
	{ x: 12, y: 2 },
	{ x: 19, y: 12 },
	{ x: 12, y: 23 },
	{ x: 5, y: 12 }
];
const HAND: readonly HandItem[] = ['berserk', 'snare', 'plasma'];
const GHOST_HOMES: readonly GridPoint[] = [
	{ x: 12, y: 10 },
	{ x: 4, y: 8 },
	{ x: 20, y: 8 },
	{ x: 12, y: 16 }
];
const STEP: Record<string, [number, number]> = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };

/** The drawn hell with its food kept; the boss is born on the lair's centre; no food on the pickups. */
function hellWithFood(): GridMatrix {
	return DRAWN.map((row, r) =>
		row.map((token, c): TileType => {
			if (PICKUP_TILES.some((p) => p.x === c && p.y === r)) return 'FL';
			return token === 'LT' && row[c - 1] === 'IY' && row[c + 1] === 'PY' ? 'DB' : token;
		})
	);
}

export class HellRules {
	readonly grid: GridService;
	readonly events = new EventBus<PacmanEventMap>();
	readonly progress: LevelProgress;
	readonly player: PlayerService;
	readonly boss: DoomBossService;
	readonly pack: DronePack;
	readonly pickups: Pickup[];
	readonly orbs: DoomBfgShot[] = [];
	readonly bolts: DoomBfgShot[] = [];
	readonly popups: Array<{ x: number; y: number; text: string; age: number }> = [];
	stage: Stage = 'fight';
	stageT = 0;
	hp: number = TUNE.maxHp;
	armour = false;
	god = false;
	/** Food eaten toward the next BFG shot (`TUNE.foodPerShot` is a shot ready). */
	charge = 0;
	charging = -1;
	hand: HandItem | null = null;
	berserkLeft = 0;
	plasmaLeft = 0;
	snare: Snare | null = null;
	core: GridPoint | null = null;
	eaten = 0;
	bonus = 0;
	private chain = 0;
	private eatenBefore = 0;
	private plasmaClock = 0;
	private rushing = false;
	private rushHit = false;
	private merging: Array<{ x: number; y: number }> = [];
	private fx: DoomFxEvent[] = [];

	constructor() {
		this.grid = new GridService(new GridModel(hellWithFood()));
		this.grid.setLairOpen(true);
		this.progress = new LevelProgress(this.grid, new ScoreModel(), this.events);
		this.player = new PlayerService(this.grid, this.progress, this.events);
		this.player.reset();
		const spawn = this.grid.bossSpawn();
		if (!spawn) throw new Error('HellRules: no boss spawn');
		this.boss = new DoomBossService(this.grid, spawn);
		this.boss.setProtectedTiles(PICKUP_TILES.flatMap((t) => [t, ...this.grid.walkableNeighbors(t.x, t.y)]));
		this.pack = new DronePack(this.grid, GHOST_HOMES, zoneRng(3), 4, 0);
		for (const d of this.pack.list) this.sleep(d);
		this.progress.clearEnergizers();
		this.pickups = PICKUP_TILES.map((tile) => ({ tile, kind: null, timer: 0 }));
		for (const p of this.pickups) this.spawnInto(p);
	}

	get score(): number {
		return this.progress.score + this.bonus;
	}

	get bfgReady(): boolean {
		return this.charge >= TUNE.foodPerShot;
	}

	get berserk(): boolean {
		return this.hand === 'berserk';
	}

	/** The split is on: the boss is four ghosts, the weapons are off. */
	get split(): boolean {
		return this.stage === 'burst' || this.stage === 'pacman' || this.stage === 'merge';
	}

	get mergePoints(): ReadonlyArray<{ x: number; y: number }> {
		return this.merging;
	}

	consumeFx(): DoomFxEvent[] {
		const out = this.fx;
		this.fx = [];
		return out;
	}

	/** Dev: bring the boss down to his next threshold, so the split comes now. */
	splitNow(): void {
		if (this.stage !== 'fight' || this.boss.phase >= 3) return;
		this.boss.takeDamage(this.boss.hp - PHASE_THRESHOLDS[this.boss.phase - 1], 'dev');
	}

	/** Dev: as if the hero had walked over `kind`. */
	give(kind: PickupKind | 'bfg'): void {
		if (kind === 'bfg') this.charge = TUNE.foodPerShot;
		else this.take(kind);
	}

	update(dt: number, fireHeld: boolean, firePressed: boolean): void {
		for (const q of this.popups) q.age += dt;
		while (this.popups.length && this.popups[0].age > 1.1) this.popups.shift();
		if (this.stage === 'won' || this.stage === 'lost') return;
		this.stageT += dt;
		const speed = this.berserk ? TUNE.berserkSpeed : 1;
		this.player.setSpeedModifier(this.split ? 1 : speed * this.boss.playerSpeedFactor(this.player));
		this.player.setMovementLocked(this.charging >= 0);
		this.player.update(dt);
		this.countFood();
		if (this.split) {
			this.updateSplit(dt);
		} else {
			this.updateFight(dt, fireHeld, firePressed);
		}
		this.moveShots(this.orbs, dt, (s) => this.orbHits(s));
		this.moveShots(this.bolts, dt, (s) => this.boltHits(s));
	}

	// ---------- the fight ----------

	private updateFight(dt: number, fireHeld: boolean, firePressed: boolean): void {
		this.boss.update(dt, this.player);
		if (this.boss.defeated) {
			this.stage = 'won';
			return;
		}
		if (this.boss.consumePhaseTransition()) this.enter('omen');
		// the omen is the old phase transition: he stands and shakes, then bursts where he is
		if (this.stage === 'omen' && this.stageT >= TUNE.omenMin && this.boss.state !== 'TRANSITION') {
			this.burst();
			return;
		}
		if (this.boss.consumeBossContactHit()) this.hurt('boss');
		if (this.boss.consumeMinionContactHit()) this.hurt('imp');
		if (this.boss.consumeHazardHit()) this.hurt('hazard');
		this.updatePickups(dt);
		this.updateHand(dt, fireHeld, firePressed);
		this.updateSnare(dt);
	}

	private updateHand(dt: number, fireHeld: boolean, firePressed: boolean): void {
		if (this.charging >= 0) {
			this.charging += dt;
			if (this.charging >= TUNE.bfgCharge) {
				this.charging = -1;
				this.charge = 0;
				this.shoot(this.orbs, TUNE.bfgSpeed, 'bfg-fire');
			}
			return;
		}
		if (this.rushing) {
			this.rushStrike();
			if (!this.player.isDashing) {
				this.rushing = false;
				this.hand = null;
			}
			return;
		}
		if (this.hand === 'berserk') {
			this.berserkLeft -= dt;
			if (firePressed && this.player.facing) {
				this.rushing = true;
				this.rushHit = false;
				this.player.startDash(TUNE.rushTiles);
				this.player.grantInvulnerability(TUNE.rushTiles / 10 + 0.15);
				this.rushStrike();
			} else if (this.berserkLeft <= 0) {
				this.hand = null;
			}
			return;
		}
		if (this.hand === 'snare') {
			if (firePressed && !this.snare) {
				const t = this.player.tile;
				this.snare = { tile: { x: t.x, y: t.y }, life: TUNE.snareLife, snapped: -1 };
				this.fx.push({ kind: 'barrel-place', x: t.x + 0.5, y: t.y + 0.5 });
				this.hand = null;
			}
			return;
		}
		if (this.hand === 'plasma') {
			if (fireHeld && this.player.facing) {
				this.plasmaLeft -= dt;
				this.plasmaClock -= dt;
				if (this.plasmaClock <= 0) {
					this.plasmaClock += TUNE.plasmaRate;
					this.shoot(this.bolts, TUNE.plasmaSpeed, null);
				}
				if (this.plasmaLeft <= 0) this.hand = null;
			} else {
				this.plasmaClock = 0;
			}
			return;
		}
		if (firePressed && this.bfgReady && this.player.facing) this.charging = 0;
	}

	/** The rush: the boss or an imp within reach of the hero while he dashes. */
	private rushStrike(): void {
		const p = this.player.position;
		const b = this.boss.position;
		if (!this.rushHit && Math.hypot(b.x - p.x, b.y - p.y) < 0.95 && this.boss.state !== 'INTRO') {
			this.rushHit = true;
			this.boss.takeDamage(TUNE.rushDamage, 'rush');
			this.boss.applyStun(TUNE.rushStun);
			this.fx.push({ kind: 'bite', x: b.x, y: b.y });
			this.fx.push({ kind: 'boss-hit', x: b.x, y: b.y });
		}
		this.boss.killMinionsWhere((m) => Math.hypot(m.tile.x + 0.5 - p.x, m.tile.y + 0.5 - p.y) < 0.95);
	}

	private updateSnare(dt: number): void {
		const s = this.snare;
		if (!s) return;
		if (s.snapped >= 0) {
			s.snapped += dt;
			if (s.snapped > TUNE.snareHold) this.snare = null;
			return;
		}
		s.life -= dt;
		if (s.life <= 0) {
			this.snare = null;
			return;
		}
		const t = this.boss.tile;
		const st = this.boss.state;
		if (t.x === s.tile.x && t.y === s.tile.y && st !== 'STUNNED' && st !== 'INTRO' && st !== 'TRANSITION') {
			s.snapped = 0;
			this.boss.takeDamage(TUNE.snareDamage, 'snare');
			this.boss.applyStun(TUNE.snareHold);
			this.fx.push({ kind: 'boss-hit', x: s.tile.x + 0.5, y: s.tile.y + 0.5 });
		}
	}

	private shoot(into: DoomBfgShot[], speed: number, fx: 'bfg-fire' | null): void {
		const f = this.player.facing;
		if (!f) return;
		const [dx, dy] = STEP[f];
		const p = this.player.position;
		into.push({ x: p.x, y: p.y, vx: dx * speed, vy: dy * speed, life: 2 });
		if (fx) this.fx.push({ kind: fx, x: p.x, y: p.y, dx, dy });
	}

	private moveShots(list: DoomBfgShot[], dt: number, hits: (s: DoomBfgShot) => boolean): void {
		for (let i = list.length - 1; i >= 0; i -= 1) {
			const s = list[i];
			s.x += s.vx * dt;
			s.y += s.vy * dt;
			s.life -= dt;
			const wall = !this.grid.isPlayerWalkable(Math.floor(s.x), Math.floor(s.y));
			if (hits(s) || wall || s.life <= 0) {
				if (list === this.orbs) this.fx.push({ kind: 'bfg-impact', x: s.x, y: s.y });
				list.splice(i, 1);
			}
		}
	}

	private orbHits(s: DoomBfgShot): boolean {
		if (this.split) return false;
		const b = this.boss.position;
		if (Math.hypot(b.x - s.x, b.y - s.y) < 0.6 && this.boss.state !== 'INTRO') {
			this.boss.takeDamage(TUNE.bfgDamage, 'bfg');
			this.boss.applyStun(TUNE.bfgStun);
			this.fx.push({ kind: 'boss-hit', x: b.x, y: b.y });
			return true;
		}
		return this.boss.killMinionsWhere((m) => Math.hypot(m.tile.x + 0.5 - s.x, m.tile.y + 0.5 - s.y) < 0.6) > 0;
	}

	private boltHits(s: DoomBfgShot): boolean {
		if (this.split) return true;
		const b = this.boss.position;
		if (Math.hypot(b.x - s.x, b.y - s.y) < 0.55 && this.boss.state !== 'INTRO') {
			this.boss.takeDamage(TUNE.plasmaDamage, 'plasma');
			return true;
		}
		return this.boss.killMinionsWhere((m) => Math.hypot(m.tile.x + 0.5 - s.x, m.tile.y + 0.5 - s.y) < 0.55) > 0;
	}

	// ---------- pickups ----------

	private updatePickups(dt: number): void {
		const p = this.player.position;
		for (const pk of this.pickups) {
			if (!pk.kind) {
				pk.timer -= dt;
				if (pk.timer <= 0) this.spawnInto(pk);
				continue;
			}
			if (Math.hypot(pk.tile.x + 0.5 - p.x, pk.tile.y + 0.5 - p.y) > 0.7 || !this.canTake(pk.kind)) continue;
			this.take(pk.kind);
			this.fx.push({ kind: 'pickup', x: pk.tile.x + 0.5, y: pk.tile.y + 0.5, detail: pk.kind });
			pk.kind = null;
			pk.timer = TUNE.respawnMin + Math.random() * (TUNE.respawnMax - TUNE.respawnMin);
		}
	}

	canTake(kind: PickupKind): boolean {
		if (kind === 'medkit') return this.hp < TUNE.maxHp;
		if (kind === 'armour') return !this.armour;
		return this.hand === null && this.charging < 0;
	}

	private take(kind: PickupKind): void {
		if (kind === 'medkit') this.hp = Math.min(TUNE.maxHp, this.hp + 1);
		else if (kind === 'armour') this.armour = true;
		else {
			this.hand = kind;
			if (kind === 'berserk') this.berserkLeft = TUNE.berserk;
			if (kind === 'plasma') this.plasmaLeft = TUNE.plasmaAmmo;
		}
	}

	/** One of each kind at most; the medkit only for a hurt hero, the armour only for a whole one. */
	private spawnInto(pk: Pickup): void {
		const lying = new Set(this.pickups.map((q) => q.kind));
		const pool: PickupKind[] = HAND.filter((k) => !lying.has(k) && this.hand !== k);
		if (!lying.has('medkit') && this.hp < TUNE.maxHp) pool.push('medkit', 'medkit');
		if (!lying.has('armour') && !lying.has('medkit') && this.hp >= TUNE.maxHp && !this.armour) pool.push('armour');
		if (!pool.length) {
			pk.timer = 3;
			return;
		}
		pk.kind = pool[Math.floor(Math.random() * pool.length)];
	}

	// ---------- damage ----------

	private hurt(source: string): void {
		if (this.god || this.player.isInvulnerable) return;
		const p = this.player.position;
		this.fx.push({ kind: 'player-hit', x: p.x, y: p.y, detail: source });
		this.charging = -1;
		if (this.armour) {
			this.armour = false;
		} else {
			this.hp -= 1;
			if (this.hp <= 0) {
				this.stage = 'lost';
				return;
			}
		}
		this.player.grantInvulnerability(TUNE.iframes);
	}

	// ---------- the split ----------

	private enter(stage: Stage): void {
		this.stage = stage;
		this.stageT = 0;
	}

	private burst(): void {
		const t = this.boss.tile;
		this.core = { x: t.x, y: t.y };
		this.eaten = 0;
		this.chain = 0;
		this.charging = -1;
		this.rushing = false;
		this.orbs.length = 0;
		// his flesh splatters into new food: every eaten tile fills again, the energizers light up
		this.progress.resetDots();
		this.eatenBefore = 0;
		this.pack.fear = 0;
		this.pack.list.forEach((d, i) => {
			Object.assign(d, { fx: t.x, fy: t.y, tx: t.x, ty: t.y, p: 0, x: t.x + 0.5, y: t.y + 0.5, dx: 0, dy: 0 });
			d.state = 'wait';
			d.timer = TUNE.burst + i * 0.3;
		});
		this.fx.push({ kind: 'barrel-blast', x: t.x + 0.5, y: t.y + 0.5 });
		this.enter('burst');
	}

	private updateSplit(dt: number): void {
		if (this.stage === 'merge') {
			if (this.stageT >= TUNE.merge) this.form();
			return;
		}
		if (this.stage === 'burst' && this.stageT >= TUNE.burst) this.enter('pacman');
		if (this.progress.consumePendingEnergizer()) {
			this.pack.hack(TUNE.fear);
			this.chain = 0;
		}
		const t = this.player.tile;
		const f = this.player.facing;
		const ahead = (n: number): GridPoint => {
			let at: GridPoint = { x: t.x, y: t.y };
			if (!f) return at;
			const [dx, dy] = STEP[f];
			for (let i = 1; i <= n; i += 1) {
				const q = { x: t.x + dx * i, y: t.y + dy * i };
				if (!this.grid.isGhostWalkable(q.x, q.y, false)) break;
				at = q;
			}
			return at;
		};
		this.pack.update(dt, { hero: t, ahead2: ahead(2), ahead4: ahead(4), speedMul: 1, shut: () => false });
		if (this.pack.fear <= 0) this.chain = 0;
		const p = this.player.position;
		for (const d of this.pack.list) {
			if (d.state === 'wait' || d.state === 'dead') continue;
			if (Math.hypot(d.x - p.x, d.y - p.y) >= 0.7) continue;
			if (d.state === 'fright') {
				const worth = 200 * 2 ** this.chain;
				this.bonus += worth;
				this.chain = Math.min(3, this.chain + 1);
				this.eaten += 1;
				this.popups.push({ x: d.x, y: d.y, text: `+${worth} · ${this.eaten}/4`, age: 0 });
				this.pack.eat(d);
				this.sleep(d);
			} else {
				this.hurt('ghost');
				this.pack.bitten(d);
			}
		}
		if (this.stage === 'lost') return;
		if (this.eaten >= 4 || (this.stage === 'pacman' && this.stageT >= TUNE.pacman)) {
			this.merging = this.pack.list.filter((d) => d.state !== 'dead').map((d) => ({ x: d.x, y: d.y }));
			this.enter('merge');
		}
	}

	/**
	 * The boss forms on the core. All four eaten: he is stunned, the window for a real hit, and loses
	 * nothing more. Fewer: no stun, only what was eaten comes off him (far less than a hit would).
	 */
	private form(): void {
		for (const d of this.pack.list) this.sleep(d);
		this.merging = [];
		this.progress.clearEnergizers();
		const n = this.eaten;
		const c = this.boss.position;
		if (n >= 4) {
			this.boss.applyStun(TUNE.formStun);
		} else if (n > 0) {
			const floor = this.boss.phase <= 2 ? PHASE_THRESHOLDS[1] + 1 : 1;
			const damage = Math.min(TUNE.ghostDamage * n, Math.max(0, this.boss.hp - floor));
			if (damage > 0) this.boss.takeDamage(damage, `split, ${n} eaten`);
			this.popups.push({ x: c.x, y: c.y, text: `−${Math.round(damage)} HP`, age: 0 });
		}
		this.core = null;
		this.enter('fight');
	}

	private sleep(d: Drone): void {
		d.state = 'dead';
		d.timer = Infinity;
	}

	// ---------- food ----------

	private countFood(): void {
		const now = this.progress.collectedDots;
		const eaten = Math.max(0, now - this.eatenBefore);
		this.eatenBefore = now;
		this.charge = Math.min(TUNE.foodPerShot, this.charge + eaten);
	}

	/** Ghost at index i is drawn when it is out (the split's four). */
	visibleGhosts(): Drone[] {
		return this.pack.list.filter((d) => d.state === 'hunt' || d.state === 'fright');
	}
}
