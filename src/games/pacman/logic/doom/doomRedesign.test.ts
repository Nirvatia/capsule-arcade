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
	BOSS_HP,
	FOOD_PER_SHOT,
	INTRO_DURATION,
	PHASE_THRESHOLDS,
	PLASMA_AMMO,
	PLASMA_DAMAGE,
	PLAYER_MAX_HP,
	RUSH_DAMAGE,
	SNARE_DAMAGE,
	SPLIT_GHOST_DAMAGE,
	SPLIT_PACMAN
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

describe('the food charges the BFG', () => {
	it('readies one shot after FOOD_PER_SHOT pieces and fires it with empty hands', () => {
		const f = fight();
		let eaten = 0;
		for (let y = 0; y < f.grid.height && eaten < FOOD_PER_SHOT; y += 1) {
			for (let x = 0; x < f.grid.width && eaten < FOOD_PER_SHOT; x += 1) {
				if (f.grid.isDot(x, y)) {
					f.progress.collectAt(x, y);
					eaten += 1;
				}
			}
		}
		f.tick();
		expect(f.doom.bfgReady).toBe(true);
		expect(f.doom.armed).toBe('bfg');
		f.player.setDesiredDirection('UP');
		f.run(0.2);
		expect(f.doom.fire(f.player)).toBe('bfg');
		f.run(1);
		expect(f.doom.bfgReady).toBe(false);
		expect(f.doom.bfgCharge).toBeLessThan(1);
	});

	it('an item in hand is spent first; the charge waits', () => {
		const f = fight();
		f.doom.debugGiveWeapon('bfg');
		f.doom.debugGiveWeapon('snare');
		f.tick();
		expect(f.doom.armed).toBe('snare');
		expect(f.doom.fire(f.player)).toBe('snare');
		expect(f.doom.bfgReady).toBe(true);
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
		f.doom.debugGiveWeapon('snare');
		toSplit(f);
		expect(f.doom.fire(f.player)).toBeNull();
		expect(f.doom.armed).toBe('snare');
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

	it('the berserk rushes once into the boss and ends', () => {
		const f = fight();
		lineUp(f);
		f.doom.debugGiveWeapon('berserk');
		f.tick();
		const hp = f.boss.hp;
		expect(f.doom.fire(f.player)).toBe('rush');
		f.run(1);
		expect(f.boss.hp).toBe(hp - RUSH_DAMAGE);
		expect(f.doom.berserkActive).toBe(false);
	});

	it('the plasma fires while held and empties the hand', () => {
		const f = fight();
		lineUp(f);
		f.doom.debugGiveWeapon('plasma');
		const hp = f.boss.hp;
		f.run(PLASMA_AMMO + 1, true);
		expect(f.doom.armed).not.toBe('plasma');
		expect(f.boss.hp).toBeLessThan(hp);
		expect((hp - f.boss.hp) % PLASMA_DAMAGE).toBe(0);
	});

	it('the snare shuts on the boss stepping in', () => {
		const f = fight();
		f.run(INTRO_DURATION + 0.1);
		f.doom.debugGiveWeapon('snare');
		// set it on the boss's next tiles: under him as soon as his stun ends
		f.player.placeAt(f.boss.tile);
		f.tick();
		expect(f.doom.fire(f.player)).toBe('snare');
		f.player.placeAt({ x: 2, y: 2 });
		const hp = f.boss.hp;
		f.run(0.5);
		expect(f.doom.snare?.snapped).toBeGreaterThanOrEqual(0);
		expect(f.boss.hp).toBe(hp - SNARE_DAMAGE);
		expect(f.boss.isStunned).toBe(true);
	});

	it('the armour takes one hit instead of health', () => {
		const f = fight();
		f.run(2);
		f.doom.setGodMode(false);
		f.doom.debugGiveWeapon('armour');
		f.doom.damagePlayer(1, f.player, 'test');
		expect(f.doom.playerHp).toBe(PLAYER_MAX_HP);
		expect(f.doom.armour).toBe(false);
		f.run(2);
		f.doom.damagePlayer(1, f.player, 'test');
		expect(f.doom.playerHp).toBe(PLAYER_MAX_HP - 1);
	});
});

describe('the pickups', () => {
	it('bring the medkit only to a hurt hero and the armour only to a whole one', () => {
		const pickups = new DoomPickupService(DOOM_PICKUP_TILES, {
			hp: PLAYER_MAX_HP,
			armour: false,
			held: null,
			handFree: true
		});
		const lying = pickups.list.map((p) => p.kind);
		expect(lying).not.toContain('medkit');
		const hurt = pickups.choices({ hp: 1, armour: false, held: null, handFree: true });
		expect(hurt).not.toContain('armour');
		const armoured = pickups.choices({
			hp: PLAYER_MAX_HP,
			armour: true,
			held: null,
			handFree: true
		});
		expect(armoured).not.toContain('armour');
		expect(armoured).not.toContain('medkit');
	});

	it('never lay the kind in hand, nor two of a kind', () => {
		const pickups = new DoomPickupService(DOOM_PICKUP_TILES, {
			hp: 1,
			armour: false,
			held: 'plasma',
			handFree: false
		});
		const lying = pickups.list.map((p) => p.kind).filter((k) => k !== null);
		expect(lying).not.toContain('plasma');
		expect(new Set(lying).size).toBe(lying.length);
	});
});
