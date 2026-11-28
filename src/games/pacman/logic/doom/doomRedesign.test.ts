import { describe, expect, it } from 'vitest';
import { GRID_DOOM, DOOM_PICKUP_TILES } from '../../config/mazes/doom';
import type { PacmanEventMap } from '../../core/Events';
import { EventBus } from '../../engine/EventBus';
import { PlayerService } from '../actors/PlayerService';
import type { PlayerDirection } from '../actors/PlayerModel';
import { LevelProgress } from '../level/LevelProgress';
import { ScoreModel } from '../level/ScoreModel';
import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import type { DronePack } from '../net/DronePack';
import { DoomAbilityService } from './DoomAbilityService';
import {
	BFG_ORB_DAMAGE,
	BOSS_HP,
	INTRO_DURATION,
	MAW_COST,
	PHASE_THRESHOLDS,
	PLAYER_MAX_HP,
	RUSH_COOLDOWN,
	RUSH_COUNTER_MUL,
	RUSH_DAMAGE,
	SPLIT_GHOST_DAMAGE,
	SPLIT_PACMAN,
	STING_DAMAGE
} from './DoomBalance';
import { DoomBossService } from './DoomBossService';
import { assertDoomMap } from './DoomMapValidation';
import { DoomPickupService } from './DoomPickupService';
import type { DoomSplitService } from './DoomSplitService';

const STEP = 1 / 60;

function fight() {
	const grid = new GridService(new GridModel(GRID_DOOM));
	grid.setLairOpen(true);
	const events = new EventBus<PacmanEventMap>();
	const score = new ScoreModel();
	const progress = new LevelProgress(grid, score, events);
	const player = new PlayerService(grid, progress, events);
	player.reset();
	const spawn = grid.bossSpawn();
	if (!spawn) {
		throw new Error('missing boss spawn');
	}
	const boss = new DoomBossService(grid, spawn);
	const doom = new DoomAbilityService(grid, boss, progress, score, events);
	doom.setGodMode(true);
	/** One frame the way `PlayingState` runs it. */
	const tick = (held = false): void => {
		player.update(STEP);
		if (!doom.bossFrozen) {
			boss.update(STEP, player);
		}
		doom.update(STEP, player, held);
	};
	const run = (seconds: number, held = false): void => {
		for (let t = 0; t < seconds; t += STEP) {
			tick(held);
		}
	};
	return { grid, progress, player, boss, doom, score, tick, run };
}

type Fight = ReturnType<typeof fight>;

/** Brings the boss to his first threshold and runs until the split's Pac-Man part has begun. */
function toSplit(f: Fight): DoomSplitService {
	f.run(INTRO_DURATION + 0.1);
	f.boss.takeDamage(BOSS_HP - PHASE_THRESHOLDS[0]);
	for (let i = 0; i < 60 * 6 && f.doom.split.stage !== 'pacman'; i += 1) {
		f.tick();
	}
	expect(f.doom.split.stage).toBe('pacman');
	return f.doom.split;
}

/** Frightens the four and eats `count` of them, each led apart to a corner first. */
function eatGhosts(f: Fight, count: number): void {
	const pack = (f.doom.split as unknown as { pack: DronePack }).pack;
	f.run(2);
	pack.hack(30);
	f.tick();
	const corners = [
		{ x: 2, y: 5 },
		{ x: 22, y: 5 },
		{ x: 2, y: 21 },
		{ x: 22, y: 21 }
	];
	for (let i = 0; i < count; i += 1) {
		const d = pack.list[i];
		expect(d.state).toBe('fright');
		const at = corners[i];
		Object.assign(d, {
			fx: at.x,
			fy: at.y,
			tx: at.x,
			ty: at.y,
			p: 0,
			x: at.x + 0.5,
			y: at.y + 0.5
		});
		f.player.placeAt(at);
		f.doom.update(STEP, f.player);
	}
	expect(f.doom.split.eaten).toBe(count);
}

/** Runs until the split is over (the boss has formed on the core). */
function finishSplit(f: Fight): void {
	f.player.placeAt({ x: 2, y: 2 });
	for (let i = 0; i < 60 * (SPLIT_PACMAN + 5) && f.doom.split.stage !== 'off'; i += 1) {
		f.tick();
	}
	expect(f.doom.split.stage).toBe('off');
}

describe('the hell map with food', () => {
	it('keeps its food and leaves the pickup spots bare', () => {
		const grid = new GridService(new GridModel(GRID_DOOM));
		expect(grid.dotCount).toBeGreaterThan(200);
		expect(grid.energizerCount).toBe(4);
		for (const p of DOOM_PICKUP_TILES) {
			expect(grid.isDot(p.x, p.y) || grid.isEnergizer(p.x, p.y)).toBe(false);
		}
		expect(() => assertDoomMap(grid, DOOM_PICKUP_TILES)).not.toThrow();
	});

	it('refuses food on a pickup spot', () => {
		const grid = new GridService(new GridModel(GRID_DOOM));
		const onFood = { x: 2, y: 5 };
		expect(grid.isDot(onFood.x, onFood.y)).toBe(true);
		expect(() => assertDoomMap(grid, [onFood])).toThrow(/food/);
	});

	it('lights the energizers only during the split', () => {
		const f = fight();
		expect(f.progress.isCollected(2, 2)).toBe(true);
		toSplit(f);
		expect(f.progress.isCollected(2, 2)).toBe(false);
		finishSplit(f);
		expect(f.progress.isCollected(2, 2)).toBe(true);
	});
});

/** Eats `count` pieces of food (the meter counts what was eaten). */
function eat(f: Fight, count: number): void {
	let eaten = 0;
	for (let y = 0; y < f.grid.height && eaten < count; y += 1) {
		for (let x = 0; x < f.grid.width && eaten < count; x += 1) {
			if (f.grid.isDot(x, y) && !f.progress.isCollected(x, y)) {
				f.progress.collectAt(x, y);
				eaten += 1;
			}
		}
	}
	// the meter takes it in on the next update; the hero stays where he is
	f.doom.update(STEP, f.player);
}

describe('the food meter feeds the guns', () => {
	it('the Maw fires only on a full meter and empties it', () => {
		const f = fight();
		f.doom.debugGiveWeapon('bfg');
		f.player.setDesiredDirection('UP');
		f.run(0.2);
		eat(f, MAW_COST - 1 - Math.round(f.doom.food * MAW_COST));
		expect(f.doom.bfgReady).toBe(false);
		expect(f.doom.fire(f.player)).toBeNull();
		eat(f, 1);
		expect(f.doom.food).toBe(1);
		expect(f.doom.fire(f.player)).toBe('bfg');
		f.run(1);
		expect(f.doom.food).toBe(0);
		expect(f.doom.armed).toBe('bfg');
	});
});

describe('the split', () => {
	it('freezes the boss, refills the food and runs plain Pac-Man', () => {
		const f = fight();
		f.run(INTRO_DURATION + 0.1);
		for (let x = 0; x < 6; x += 1) {
			f.progress.collectAt(x + 2, 8);
		}
		const before = f.grid.dotCount - f.progress.remainingDots;
		expect(before).toBeGreaterThan(0);
		f.boss.takeDamage(BOSS_HP - PHASE_THRESHOLDS[0]);
		const split = toSplit(f);
		expect(f.doom.bossFrozen).toBe(true);
		expect(f.progress.remainingDots).toBe(f.grid.dotCount);
		expect(split.core).toEqual(f.boss.tile);
		const at = { ...f.boss.position };
		f.run(3);
		expect(f.boss.position).toEqual(at);
		expect(split.ghosts.length).toBeGreaterThan(0);
	});

	it('no ghost eaten: the boss forms neither stunned nor hurt', () => {
		const f = fight();
		toSplit(f);
		const hp = f.boss.hp;
		finishSplit(f);
		expect(f.boss.hp).toBe(hp);
		expect(f.boss.isStunned).toBe(false);
	});

	it('some eaten: no stun, SPLIT_GHOST_DAMAGE each', () => {
		const f = fight();
		toSplit(f);
		const hp = f.boss.hp;
		eatGhosts(f, 2);
		finishSplit(f);
		expect(f.boss.hp).toBe(hp - 2 * SPLIT_GHOST_DAMAGE);
		expect(f.boss.isStunned).toBe(false);
	});

	it('all four eaten: it ends at once and the boss forms stunned, unhurt', () => {
		const f = fight();
		toSplit(f);
		const hp = f.boss.hp;
		eatGhosts(f, 4);
		expect(f.doom.split.stage).toBe('merge');
		finishSplit(f);
		expect(f.boss.hp).toBe(hp);
		expect(f.boss.isStunned).toBe(true);
	});

	it('the weapons are off while it runs', () => {
		const f = fight();
		f.doom.debugGiveWeapon('berserk');
		toSplit(f);
		expect(f.doom.fire(f.player)).toBeNull();
		expect(f.doom.armed).toBe('berserk');
	});
});

describe('the hand', () => {
	/** The hero three tiles left of the boss on one row, facing him; the boss held still. */
	function lineUp(f: Fight, dir: PlayerDirection = 'RIGHT'): void {
		// wait for the boss to stand with three of the hero's tiles free on his left
		const freeLeft = (): boolean => {
			const b = f.boss.tile;
			return [1, 2, 3].every((k) => f.grid.isPlayerWalkable(b.x - k, b.y));
		};
		f.run(INTRO_DURATION + 0.1);
		for (let i = 0; i < 60 * 20 && !(freeLeft() && !f.boss.isMoving); i += 1) {
			f.tick();
		}
		expect(freeLeft()).toBe(true);
		f.boss.applyStun(10);
		const b = f.boss.tile;
		f.player.placeAt({ x: b.x - 3, y: b.y });
		f.player.setDesiredDirection(dir);
		f.run(0.05);
	}

	it('the berserk rushes for free, then waits its cooldown', () => {
		const f = fight();
		lineUp(f);
		f.doom.debugGiveWeapon('berserk');
		f.tick();
		const hp = f.boss.hp;
		expect(f.doom.counterWindow).toBe(false);
		expect(f.doom.fire(f.player)).toBe('rush');
		f.run(0.6);
		expect(f.boss.hp).toBe(hp - RUSH_DAMAGE);
		expect(f.doom.fire(f.player)).toBeNull();
		f.run(RUSH_COOLDOWN);
		expect(f.doom.fire(f.player)).toBe('rush');
		expect(f.doom.armed).toBe('berserk');
	});

	it("a rush in the boss's live attack is a counter: more damage, unhurt", () => {
		const f = fight();
		lineUp(f);
		f.doom.debugGiveWeapon('berserk');
		f.tick();
		Object.defineProperty(f.doom, 'counterWindow', { get: () => true });
		const hp = f.boss.hp;
		expect(f.doom.fire(f.player)).toBe('rush');
		expect(f.player.isInvulnerable).toBe(true);
		f.run(0.6);
		expect(f.boss.hp).toBe(hp - RUSH_DAMAGE * RUSH_COUNTER_MUL);
	});

	it('a plain rush starts without cover', () => {
		const f = fight();
		lineUp(f);
		f.run(2);
		f.doom.debugGiveWeapon('berserk');
		f.tick();
		expect(f.doom.fire(f.player)).toBe('rush');
		expect(f.player.isInvulnerable).toBe(false);
	});

	it('the counter window opens while a rift burns', () => {
		const f = fight();
		f.run(INTRO_DURATION + 0.1);
		f.boss.debugForceAttack('rift');
		let seen = false;
		for (let i = 0; i < 60 * 10 && !seen; i += 1) {
			f.tick();
			seen = f.doom.counterWindow;
		}
		expect(seen).toBe(true);
	});

	it('the Sting fires while held, a segment a second, and stops on an empty meter', () => {
		const f = fight();
		lineUp(f);
		f.doom.debugGiveWeapon('plasma');
		eat(f, 10);
		const hp = f.boss.hp;
		f.run(2, true);
		expect(f.doom.food).toBe(0);
		expect(f.boss.hp).toBeLessThan(hp);
		expect((hp - f.boss.hp) % STING_DAMAGE).toBe(0);
		const after = f.boss.hp;
		f.run(1, true);
		expect(f.boss.hp).toBe(after);
		expect(f.doom.armed).toBe('plasma');
	});

	it('the Maw orb hits for its full damage', () => {
		const f = fight();
		lineUp(f);
		f.doom.debugGiveWeapon('bfg');
		f.doom.debugGiveWeapon('food');
		f.tick();
		const hp = f.boss.hp;
		expect(f.doom.fire(f.player)).toBe('bfg');
		f.run(1.5);
		expect(f.boss.hp).toBeLessThanOrEqual(hp - BFG_ORB_DAMAGE);
	});
});

describe('the pickups', () => {
	it('a new weapon replaces the one in hand; the same one is not taken', () => {
		const pickups = new DoomPickupService(DOOM_PICKUP_TILES, {
			hp: PLAYER_MAX_HP,
			held: 'plasma',
			handFree: true
		});
		expect(
			pickups.isCollectible('berserk', { hp: PLAYER_MAX_HP, held: 'plasma', handFree: true })
		).toBe(true);
		expect(
			pickups.isCollectible('plasma', { hp: PLAYER_MAX_HP, held: 'plasma', handFree: true })
		).toBe(false);
		expect(
			pickups.isCollectible('bfg', { hp: PLAYER_MAX_HP, held: 'plasma', handFree: false })
		).toBe(false);
	});

	it('bring the medkit only to a hurt hero', () => {
		const whole = new DoomPickupService(DOOM_PICKUP_TILES, {
			hp: PLAYER_MAX_HP,
			held: null,
			handFree: true
		});
		expect(whole.list.map((p) => p.kind)).not.toContain('medkit');
		expect(whole.choices({ hp: 1, held: null, handFree: true })).toContain('medkit');
		expect(whole.isCollectible('medkit', { hp: PLAYER_MAX_HP, held: null, handFree: true })).toBe(
			false
		);
	});

	it('never lay the weapon in hand, nor two of a kind', () => {
		const pickups = new DoomPickupService(DOOM_PICKUP_TILES, {
			hp: 1,
			held: 'plasma',
			handFree: true
		});
		const lying = pickups.list.map((p) => p.kind).filter((k) => k !== null);
		expect(lying).not.toContain('plasma');
		expect(new Set(lying).size).toBe(lying.length);
	});
});
