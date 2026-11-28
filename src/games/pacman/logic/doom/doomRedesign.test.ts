import { describe, expect, it } from 'vitest';
import { zoneRng } from '../zone/zoneRng';
import { GRID_DOOM, DOOM_PICKUP_TILES } from '../../config/mazes/doom';
import type { PacmanEventMap } from '../../core/Events';
import { EventBus } from '../../engine/EventBus';
import { PlayerService } from '../actors/PlayerService';
import type { PlayerDirection } from '../actors/PlayerModel';
import { LevelProgress } from '../level/LevelProgress';
import { ScoreModel } from '../level/ScoreModel';
import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { DronePack } from '../net/DronePack';
import { DoomArena } from './DoomArena';
import { DoomAbilityService } from './DoomAbilityService';
import {
	BFG_ORB_DAMAGE,
	BFG_ORB_GLANCE_DAMAGE,
	BOSS_HP,
	FOOD_PER_SEGMENT,
	MEDKIT_WAIT_MAX,
	INTRO_DURATION,
	MAW_COST,
	PHASE_THRESHOLDS,
	PLAYER_MAX_HP,
	RUSH_COOLDOWN,
	RUSH_COUNTER_MUL,
	RUSH_COST,
	SPLIT_FORM_STUN,
	SPLIT_WINDOW_MUL,
	BERSERK_HASTE,
	BERSERK_SPEED_MUL,
	RUSH_DAMAGE,
	SPLIT_GHOST_DAMAGE,
	SPLIT_PACMAN,
	STING_DAMAGE,
	FOOD_REGROW_EVERY,
	FOOD_REGROW_MIN_DIST,
	WEAPON_WAIT_MAX
} from './DoomBalance';
import { DoomBossService } from './DoomBossService';
import { assertDoomMap } from './DoomMapValidation';
import { DoomPickupService } from './DoomPickupService';
import type { DoomPickupNeeds } from './DoomPickupService';
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
		// one shot spends the Maw: it leaves the hand
		expect(f.doom.armed).toBe('');
	});

	it('he does not eat into a full meter, nor empty-handed: the food waits on the map', () => {
		const f = fight();
		f.run(INTRO_DURATION + 0.1);
		const left = f.progress.remainingDots;
		eat(f, 5);
		expect(f.progress.remainingDots).toBe(left);
		f.doom.debugGiveWeapon('plasma');
		eat(f, MAW_COST + 5);
		expect(f.progress.remainingDots).toBe(left - MAW_COST);
		expect(f.doom.food).toBe(1);
	});

	it('in the split he eats as in plain Pac-Man, whatever is in hand', () => {
		const f = fight();
		toSplit(f);
		const left = f.progress.remainingDots;
		eat(f, 5);
		expect(f.progress.remainingDots).toBe(left - 5);
	});
});

describe('the split', () => {
	it('freezes the boss, refills the food and runs plain Pac-Man', () => {
		const f = fight();
		f.run(INTRO_DURATION + 0.1);
		f.doom.debugGiveWeapon('bfg');
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

	it('all four eaten: his last weapon comes back to him charged', () => {
		const f = fight();
		f.doom.debugGiveWeapon('plasma');
		toSplit(f);
		eatGhosts(f, 4);
		finishSplit(f);
		expect(f.doom.armed).toBe('plasma');
		expect(f.doom.food).toBe(1);
		expect(f.doom.capacity).toBe(1);
	});

	it('all four eaten: a weapon spent before the split comes back too', () => {
		const f = fight();
		f.doom.debugGiveWeapon('bfg');
		f.doom.debugGiveWeapon('food');
		f.player.setDesiredDirection('UP');
		f.run(0.2);
		expect(f.doom.fire(f.player)).toBe('bfg');
		f.run(1);
		expect(f.doom.armed).toBe('');
		toSplit(f);
		eatGhosts(f, 4);
		finishSplit(f);
		expect(f.doom.armed).toBe('bfg');
		expect(f.doom.bfgReady).toBe(true);
	});

	it('all four eaten with nothing ever held: the berserk, charged', () => {
		const f = fight();
		toSplit(f);
		eatGhosts(f, 4);
		finishSplit(f);
		expect(f.doom.armed).toBe('berserk');
		expect(f.doom.food).toBe(1);
	});

	it('fewer eaten: nothing is given', () => {
		const f = fight();
		toSplit(f);
		eatGhosts(f, 3);
		finishSplit(f);
		expect(f.doom.armed).toBe('');
	});

	it('reports each ghost eaten and his forming for their effects; the stun timer runs down', () => {
		const f = fight();
		toSplit(f);
		f.doom.consumeFx();
		eatGhosts(f, 4);
		finishSplit(f);
		const kinds = f.doom.consumeFx().map((e) => `${e.kind}:${e.detail ?? ''}`);
		expect(kinds.filter((k) => k.startsWith('ghost-eaten'))).toEqual([
			'ghost-eaten:200',
			'ghost-eaten:400',
			'ghost-eaten:800',
			'ghost-eaten:1600'
		]);
		expect(kinds).toContain('split-form:');
		const left = f.boss.stunLeft;
		expect(left).toBeGreaterThan(0.9);
		f.run(1);
		expect(f.boss.stunLeft).toBeLessThan(left);
	});

	it('all four eaten: in his stun the rush and the Sting hit SPLIT_WINDOW_MUL times harder', () => {
		const f = fight();
		toSplit(f);
		eatGhosts(f, 4);
		finishSplit(f);
		expect(f.doom.splitWindow).toBe(true);
		const b = f.boss.tile;
		const ways: Array<[PlayerDirection, number, number]> = [
			['RIGHT', -1, 0],
			['LEFT', 1, 0],
			['DOWN', 0, -1],
			['UP', 0, 1]
		];
		const way = ways.find(([, dx, dy]) =>
			[1, 2, 3].every((k) => f.grid.isPlayerWalkable(b.x + dx * k, b.y + dy * k))
		);
		expect(way).toBeDefined();
		const [dir, dx, dy] = way!;
		f.player.placeAt({ x: b.x + dx * 3, y: b.y + dy * 3 });
		f.player.setDesiredDirection(dir);
		f.doom.debugGiveWeapon('berserk');
		f.doom.debugGiveWeapon('food');
		f.run(0.05);
		const hp = f.boss.hp;
		expect(f.doom.fire(f.player)).toBe('rush');
		f.run(0.6);
		expect(f.boss.hp).toBe(hp - RUSH_DAMAGE * SPLIT_WINDOW_MUL);
		f.run(SPLIT_FORM_STUN);
		expect(f.boss.isStunned).toBe(false);
		expect(f.doom.splitWindow).toBe(false);
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

	it('the berserk will not rush without a charged segment', () => {
		const f = fight();
		lineUp(f);
		f.doom.debugGiveWeapon('berserk');
		f.tick();
		eat(f, RUSH_COST - 1);
		const hp = f.boss.hp;
		expect(f.doom.fire(f.player)).toBeNull();
		f.run(0.6);
		expect(f.boss.hp).toBe(hp);
		eat(f, 1);
		expect(f.doom.fire(f.player)).toBe('rush');
	});

	it('a rush burns out its segment for good: three rushes spend the berserk', () => {
		const f = fight();
		lineUp(f);
		f.doom.debugGiveWeapon('berserk');
		f.doom.debugGiveWeapon('food');
		f.tick();
		const hp = f.boss.hp;
		expect(f.doom.counterWindow).toBe(false);
		expect(f.doom.fire(f.player)).toBe('rush');
		f.run(0.6);
		expect(f.boss.hp).toBe(hp - RUSH_DAMAGE);
		expect(f.doom.fire(f.player)).toBeNull();
		f.run(RUSH_COOLDOWN);
		// the burnt segment does not come back: food tops up only the two left
		f.doom.debugGiveWeapon('food');
		expect(f.doom.capacity * MAW_COST).toBeCloseTo(RUSH_COST * 2);
		expect(f.doom.food).toBeCloseTo(f.doom.capacity);
		expect(f.doom.fire(f.player)).toBe('rush');
		f.run(RUSH_COOLDOWN + 0.1);
		expect(f.doom.fire(f.player)).toBe('rush');
		expect(f.doom.armed).toBe('');
	});

	it('the berserk is faster only for BERSERK_HASTE s after it is taken', () => {
		const f = fight();
		f.run(INTRO_DURATION + 0.1);
		const speed = () => (f.player as unknown as { speedModifierValue: number }).speedModifierValue;
		const base = speed();
		f.doom.debugGiveWeapon('berserk');
		f.tick();
		expect(speed()).toBeCloseTo(base * BERSERK_SPEED_MUL);
		f.run(BERSERK_HASTE + 0.1);
		expect(f.doom.armed).toBe('berserk');
		expect(speed()).toBeCloseTo(base);
	});

	it("a rush in the boss's live attack is a counter: more damage, unhurt", () => {
		const f = fight();
		lineUp(f);
		f.doom.debugGiveWeapon('berserk');
		f.doom.debugGiveWeapon('food');
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
		f.doom.debugGiveWeapon('food');
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

	it('the Sting fires while held, a segment a second, burning its meter for good', () => {
		const f = fight();
		lineUp(f);
		f.doom.debugGiveWeapon('plasma');
		eat(f, FOOD_PER_SEGMENT);
		const hp = f.boss.hp;
		f.run(2, true);
		expect(f.doom.food).toBeCloseTo(0);
		expect(f.boss.hp).toBeLessThan(hp);
		expect((hp - f.boss.hp) % STING_DAMAGE).toBe(0);
		const after = f.boss.hp;
		f.run(1, true);
		expect(f.boss.hp).toBe(after);
		// nothing charged only stops it; a segment of its meter is burnt
		expect(f.doom.armed).toBe('plasma');
		// (what he ate on the way was fired too)
		expect(f.doom.capacity * MAW_COST).toBeLessThanOrEqual(MAW_COST - FOOD_PER_SEGMENT + 1e-6);
	});

	it("the Sting's bolts hit SPLIT_WINDOW_MUL times harder in the split's window", () => {
		const f = fight();
		lineUp(f);
		(f.doom as unknown as { splitWindowValue: boolean }).splitWindowValue = true;
		f.doom.debugGiveWeapon('plasma');
		f.doom.debugGiveWeapon('food');
		const hp = f.boss.hp;
		f.run(0.5, true);
		expect(f.doom.splitWindow).toBe(true);
		expect(hp - f.boss.hp).toBeGreaterThan(0);
		expect((hp - f.boss.hp) % (STING_DAMAGE * SPLIT_WINDOW_MUL)).toBe(0);
	});

	it('the Sting is spent when its whole meter is burnt', () => {
		const f = fight();
		lineUp(f);
		f.doom.debugGiveWeapon('plasma');
		f.doom.debugGiveWeapon('food');
		f.run(MAW_COST / FOOD_PER_SEGMENT + 0.2, true);
		expect(f.doom.armed).toBe('');
	});

	it('the Sting let go before the meter is empty stays in hand', () => {
		const f = fight();
		lineUp(f);
		f.doom.debugGiveWeapon('plasma');
		eat(f, FOOD_PER_SEGMENT * 2);
		f.run(0.5, true);
		f.run(0.5);
		expect(f.doom.food).toBeGreaterThan(0);
		expect(f.doom.armed).toBe('plasma');
	});

	it('the Maw orb hits a stunned boss for its full damage', () => {
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

	it('the Maw orb only glances off a boss who is not stunned', () => {
		const f = fight();
		lineUp(f);
		// wake him but keep him where he stands: the boss is not updated below
		const model = (f.boss as unknown as { model: { state: string; stunTimer: number } }).model;
		model.state = 'CHASE';
		model.stunTimer = 0;
		f.doom.debugGiveWeapon('bfg');
		f.doom.debugGiveWeapon('food');
		const step = (): void => {
			f.player.update(STEP);
			f.doom.update(STEP, f.player);
		};
		step();
		const hp = f.boss.hp;
		expect(f.boss.isStunned).toBe(false);
		expect(f.doom.fire(f.player)).toBe('bfg');
		for (let t = 0; t < 1.5; t += STEP) {
			step();
		}
		expect(f.boss.hp).toBe(hp - BFG_ORB_GLANCE_DAMAGE);
	});
});

describe('the pickups', () => {
	const full = { hp: PLAYER_MAX_HP, held: null, handFree: true, phase: 1 } as const;
	const still = new PlayerService(
		new GridService(new GridModel(GRID_DOOM)),
		new LevelProgress(
			new GridService(new GridModel(GRID_DOOM)),
			new ScoreModel(),
			new EventBus<PacmanEventMap>()
		),
		new EventBus<PacmanEventMap>()
	);
	const lying = (pickups: DoomPickupService) =>
		pickups.list.map((p) => p.kind).filter((k) => k !== null);
	const wait = (pickups: DoomPickupService, seconds: number, needs: DoomPickupNeeds) => {
		for (let t = 0; t < seconds; t += STEP) {
			pickups.update(STEP, still, needs);
		}
	};

	it('a new weapon replaces the one in hand; the same one is not taken', () => {
		const pickups = new DoomPickupService(DOOM_PICKUP_TILES, { ...full, held: 'plasma' });
		expect(pickups.isCollectible('berserk', { ...full, held: 'plasma' })).toBe(true);
		expect(pickups.isCollectible('plasma', { ...full, held: 'plasma' })).toBe(false);
		expect(pickups.isCollectible('bfg', { ...full, held: 'plasma', handFree: false })).toBe(false);
	});

	it('bring the medkit only to a hurt hero, after its wait', () => {
		const pickups = new DoomPickupService(DOOM_PICKUP_TILES, full);
		wait(pickups, MEDKIT_WAIT_MAX + 1, { ...full, held: 'berserk' });
		expect(lying(pickups)).not.toContain('medkit');
		wait(pickups, MEDKIT_WAIT_MAX + 1, { ...full, hp: 1, held: 'berserk' });
		expect(lying(pickups)).toContain('medkit');
		expect(pickups.isCollectible('medkit', full)).toBe(false);
	});

	it('one weapon at a time: none comes while one is held or lies', () => {
		const pickups = new DoomPickupService(DOOM_PICKUP_TILES, full);
		expect(lying(pickups)).toHaveLength(1);
		wait(pickups, 30, full);
		expect(lying(pickups)).toHaveLength(1);
		pickups.list.forEach((p) => p.reset());
		wait(pickups, 30, { ...full, held: 'bfg' });
		expect(lying(pickups)).toHaveLength(0);
		wait(pickups, WEAPON_WAIT_MAX + 0.1, full);
		expect(lying(pickups)).toHaveLength(1);
	});

	it('the heavy gun is rare in the first phase and the likeliest in the last', () => {
		let i = 0;
		const sweep = () => ((i += 1) % 1000) / 1000;
		const pickups = new DoomPickupService(DOOM_PICKUP_TILES, { ...full, held: 'bfg' }, sweep);
		const count = (phase: number) => {
			const n = { berserk: 0, plasma: 0, bfg: 0, medkit: 0 };
			for (let k = 0; k < 1000; k += 1) {
				n[pickups.drawWeapon(phase)] += 1;
			}
			return n;
		};
		const first = count(1);
		const last = count(3);
		expect(first.bfg).toBeLessThan(first.plasma);
		expect(first.plasma).toBeLessThan(first.berserk);
		expect(last.bfg).toBeGreaterThan(last.plasma);
		expect(last.bfg).toBeGreaterThan(last.berserk);
	});
});

describe('the food grows back', () => {
	it('an eaten tile away from the hero fills again, and the meter does not count it', () => {
		const f = fight();
		f.run(INTRO_DURATION + 0.1);
		f.progress.setDotGate(null);
		eat(f, 10000);
		expect(f.progress.remainingDots).toBe(0);
		const meter = f.doom.food;
		const hero = f.player.tile;
		const step = (): void => {
			f.player.update(STEP);
			f.doom.update(STEP, f.player);
		};
		for (let t = 0; t < FOOD_REGROW_EVERY * 4 + 0.1; t += STEP) {
			step();
		}
		expect(f.progress.remainingDots).toBe(4);
		expect(f.doom.food).toBe(meter);
		for (let y = 0; y < f.grid.height; y += 1) {
			for (let x = 0; x < f.grid.width; x += 1) {
				if (f.grid.isDot(x, y) && !f.progress.isCollected(x, y)) {
					expect(Math.abs(x - hero.x) + Math.abs(y - hero.y)).toBeGreaterThanOrEqual(
						FOOD_REGROW_MIN_DIST
					);
				}
			}
		}
	});
});

describe('the tar', () => {
	it('never lies on a teleport nor at its mouth', () => {
		const grid = new GridService(new GridModel(GRID_DOOM));
		const arena = new DoomArena(grid);
		(arena as unknown as { corruptionValue: number }).corruptionValue = 1;
		let teleports = 0;
		for (let y = 0; y < grid.height; y += 1) {
			for (let x = 0; x < grid.width; x += 1) {
				if (!grid.isTeleport(x, y)) {
					continue;
				}
				teleports += 1;
				for (const [dx, dy] of [
					[0, 0],
					[1, 0],
					[-1, 0],
					[0, 1],
					[0, -1]
				]) {
					expect(arena.isCorrupted(x + dx, y + dy), `${x + dx},${y + dy}`).toBe(false);
				}
			}
		}
		expect(teleports).toBeGreaterThan(0);
	});
});

describe("the split's ghosts", () => {
	it('a frightened one turns at random at a junction, not always away from the hero', () => {
		const f = fight();
		const pack = (f.doom.split as unknown as { pack: DronePack }).pack;
		pack.update(STEP, {
			hero: { x: 12, y: 21 },
			ahead2: { x: 12, y: 21 },
			ahead4: { x: 12, y: 21 },
			speedMul: 1,
			shut: () => false
		});
		pack.hack(30);
		const d = pack.list[0];
		const aim = (pack as unknown as { aim: (d: unknown, w: unknown) => void }).aim.bind(pack);
		const ways = new Set<string>();
		for (let k = 0; k < 24; k += 1) {
			Object.assign(d, { state: 'fright', fx: 5, fy: 5, dx: 0, dy: 0 });
			aim(d, { shut: () => false });
			ways.add(`${d.dx},${d.dy}`);
		}
		expect(ways.size).toBeGreaterThan(1);
	});

	it('the shy one does not retreat to its corner near the hero', () => {
		const pack = new DronePack(
			new GridService(new GridModel(GRID_DOOM)),
			[{ x: 2, y: 2 }],
			zoneRng(5),
			4
		);
		pack.classic = true;
		const mapFor = (pack as unknown as { mapFor: (d: unknown, h: unknown) => unknown }).mapFor.bind(
			pack
		);
		const shy = pack.list[3];
		const heroMap = (pack as unknown as { heroMap: unknown }).heroMap;
		expect(mapFor(shy, { x: 5, y: 5 })).toBe(heroMap);
	});
});
