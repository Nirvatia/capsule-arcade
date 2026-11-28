import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import type { GridMatrix, TileType } from '../../config/gridConfig';
import { PlayerService } from '../actors/PlayerService';
import type { PlayerDirection } from '../actors/PlayerModel';
import { LevelProgress } from '../level/LevelProgress';
import { ScoreModel } from '../level/ScoreModel';
import { GridModel } from '../maze/GridModel';
import { GridService } from '../maze/GridService';
import { DoomAbilityService } from '../doom/DoomAbilityService';
import { DoomBossService } from '../doom/DoomBossService';
import { BOSS_HP, INTRO_DURATION, PHASE_THRESHOLDS, PLAYER_MAX_HP } from '../doom/DoomBalance';

/**
 * A bot that fights the hell's boss on the real services (no screen), for comparing mazes
 * (`hellReport.test.ts`). It plays like a person, not like a solver: it notices a telegraphed
 * attack only after a reaction time, plans a few tiles ahead, now and then turns late, and aims
 * the Sting and the Maw only after it has seen it is lined up with the boss. It never dies: a hit
 * is counted and the health put back, so every fight runs to the end and the counts compare.
 */
export interface HellBotProfile {
	readonly name: string;
	/** Seconds from a warning showing to the bot taking it into account (mean and spread). */
	readonly reaction: number;
	readonly reactionJitter: number;
	/** The chance that a turn is pressed late (it then overshoots or turns a tile later). */
	readonly missTurn: number;
	/** Seconds between plans. */
	readonly replan: number;
	/** Per second, how readily it fires the Maw at a boss who is not stunned. */
	readonly greed: number;
}

export const HELL_BOT_PROFILES: readonly HellBotProfile[] = [
	{ name: 'casual', reaction: 0.4, reactionJitter: 0.1, missTurn: 0.1, replan: 0.16, greed: 0.5 },
	{ name: 'skilled', reaction: 0.25, reactionJitter: 0.05, missTurn: 0.03, replan: 0.1, greed: 0.8 }
];

export interface HellBotRun {
	readonly drawn: GridMatrix;
	readonly pickups: ReadonlyArray<{ readonly x: number; readonly y: number }>;
	readonly profile: HellBotProfile;
	readonly seed: number;
	/**
	 * The boss's phase the fight starts in (1–3): from 2 on, his health is set just under the
	 * threshold after the intro, so the split runs first. The fight ends when he leaves the phase.
	 */
	readonly phase?: number;
	/**
	 * A weapon drill: whenever the hand is empty the bot is given this weapon with a full meter, so
	 * the Sting's and the Maw's use can be measured on every maze alike (the pickups' dice aside).
	 */
	readonly drill?: 'plasma' | 'bfg';
	/** Game seconds before it stops (default 150). */
	readonly maxSeconds?: number;
	/** A line every quarter second of what the bot sees and wants (for debugging the bot). */
	readonly trace?: (line: string) => void;
}

export interface AttackTally {
	faced: number;
	hit: number;
}

export interface HellBotResult {
	readonly won: boolean;
	readonly seconds: number;
	readonly bossHpLeft: number;
	readonly phase: number;
	/** Hits taken by source (`hazard`, `boss contact`, `minion`, `ghost`). */
	readonly hits: Record<string, number>;
	/** Boss attacks by kind: how many it made and in how many the bot got hit. */
	readonly attacks: Record<string, AttackTally>;
	/** Boss contact outside any attack (the chase). */
	readonly chaseHits: number;
	readonly maw: { charges: number; fired: number; full: number; glance: number };
	readonly sting: { bolts: number; boss: number; imp: number; wall: number; seconds: number };
	readonly rush: { rushes: number; hits: number; counters: number };
	/** The split: ghosts eaten, out of the splits played. */
	readonly split: { played: number; eaten: number };
	/** Damage dealt to the boss by source label (`Sting`, `Maw orb, stunned`, …). */
	readonly damage: Record<string, number>;
	/** Seconds held per weapon (`''` unarmed). */
	readonly armed: Record<string, number>;
}

type Tile = { x: number; y: number };
type Window = { start: number; end: number };

const DT = 1 / 60;
const TILE_TIME = 1 / 6;
const DIRS: readonly PlayerDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
const VEC: Record<PlayerDirection, readonly [number, number]> = {
	UP: [0, -1],
	LEFT: [-1, 0],
	DOWN: [0, 1],
	RIGHT: [1, 0]
};
/** How far each weapon is aimed from (tiles along the line to the boss). */
const RANGE: Record<string, readonly [number, number]> = {
	berserk: [2, 5],
	plasma: [4, 9],
	bfg: [4, 12]
};
/** The maze's own floor (not the lair): where a split may burst. */
const MAZE_FLOOR: ReadonlySet<string> = new Set(['DT', 'EU', 'FL', 'PM', 'FT']);
/** Hits within this long of an attack's telegraph count against that attack. */
const ATTACK_WINDOW = 5;

function seeded(seed: number): () => number {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/** The hell's maze as `doom.ts` makes it: pickup spots bare, the boss born on the lair's centre. */
export function hellGrid(drawn: GridMatrix, pickups: HellBotRun['pickups']): GridMatrix {
	return drawn.map((row, r) =>
		row.map((token, c): TileType => {
			if (pickups.some((p) => p.x === c && p.y === r)) {
				return 'FL';
			}
			return token === 'LT' && row[c - 1] === 'IY' && row[c + 1] === 'PY' ? 'DB' : token;
		})
	);
}

export function playHell(run: HellBotRun): HellBotResult {
	// the game's own dice (attacks, pickups) follow the run's seed too
	const realRandom = Math.random;
	Math.random = seeded(run.seed ^ 0x5bd1e995);
	try {
		return fight(run);
	} finally {
		Math.random = realRandom;
	}
}

function fight(run: HellBotRun): HellBotResult {
	const rng = seeded(run.seed);
	const profile = run.profile;
	const grid = new GridService(new GridModel(hellGrid(run.drawn, run.pickups)));
	grid.setLairOpen(true);
	const events = new EventBus<PacmanEventMap>();
	const score = new ScoreModel();
	const progress = new LevelProgress(grid, score, events);
	const player = new PlayerService(grid, progress, events);
	player.reset();
	const spawn = grid.bossSpawn();
	if (!spawn) {
		throw new Error('hellBot: the maze has no boss spawn');
	}
	const boss = new DoomBossService(grid, spawn);
	const doom = new DoomAbilityService(grid, boss, progress, score, events, run.pickups);
	const W = grid.width;
	const H = grid.height;
	const idx = (x: number, y: number) => y * W + x;
	const open = (x: number, y: number) =>
		grid.isInside(x, y) && grid.isPlayerWalkable(x, y) && !grid.isTeleport(x, y);

	// ---- the tallies
	const hits: Record<string, number> = {};
	const attacks: Record<string, AttackTally> = {};
	const damage: Record<string, number> = {};
	const armed: Record<string, number> = {};
	const maw = { charges: 0, fired: 0, full: 0, glance: 0 };
	const sting = { bolts: 0, boss: 0, imp: 0, wall: 0, seconds: 0 };
	const rush = { rushes: 0, hits: 0, counters: 0 };
	let chaseHits = 0;
	let current: { kind: string; at: number; hit: boolean } | null = null;
	let now = 0;
	const closeAttack = () => {
		if (current) {
			const tally = (attacks[current.kind] ??= { faced: 0, hit: 0 });
			tally.faced += 1;
			if (current.hit) tally.hit += 1;
		}
		current = null;
	};
	doom.setDebugSink((channel, text) => {
		if (channel !== 'damage') return;
		const source = /\(([^)]+)\)/.exec(text)?.[1] ?? 'hit';
		hits[source] = (hits[source] ?? 0) + 1;
		if (source === 'hazard' || source === 'boss contact') {
			if (current && now - current.at <= ATTACK_WINDOW) current.hit = true;
			else if (source === 'boss contact') chaseHits += 1;
		}
	});
	const takeDamage = boss.takeDamage.bind(boss);
	boss.takeDamage = ((amount: number, label?: string) => {
		const before = boss.hp;
		const result = takeDamage(amount, label);
		const key = label ?? 'other';
		damage[key] = (damage[key] ?? 0) + (before - boss.hp);
		return result;
	}) as typeof boss.takeDamage;
	const bossModel = (boss as unknown as { model: { attackKind: string | null } }).model;
	const healer = doom as unknown as { playerHpValue: number };

	// ---- what the bot has noticed
	const noticed = new WeakMap<object, number>();
	const reactionSample = () =>
		Math.max(0.1, profile.reaction + (rng() * 2 - 1) * profile.reactionJitter);
	let telegraphSeenAt = -1;
	let lastState = boss.state;
	let alignedSince = -1;
	let path: Tile[] = [];
	let nextPlan = 0;
	let lateUntil = 0;
	let lastTurnKey = '';
	let lastEaten = 0;
	let lastBossDist = new Int16Array(0);

	const fromTile = (): Tile => {
		const pos = player.position;
		const facing = player.facing;
		const moving = facing !== null && (pos.x % 1 !== 0.5 || pos.y % 1 !== 0.5);
		const here = { x: Math.floor(pos.x), y: Math.floor(pos.y) };
		if (!moving || !facing) return here;
		const ahead = { x: player.tile.x + VEC[facing][0], y: player.tile.y + VEC[facing][1] };
		// pressed into a wall in the middle of a cut corner: it stands where it is
		return open(ahead.x, ahead.y) ? ahead : here;
	};

	/** The danger windows the bot knows of, per tile, in seconds from now. */
	const dangerMap = (): Map<number, Window[]> => {
		const map = new Map<number, Window[]>();
		const add = (x: number, y: number, start: number, end: number) => {
			if (!grid.isInside(x, y)) return;
			const k = idx(x, y);
			const list = map.get(k);
			if (list) list.push({ start, end });
			else map.set(k, [{ start, end }]);
		};
		const around = (t: Tile, end: number) => {
			add(t.x, t.y, 0, end);
			for (const d of DIRS) add(t.x + VEC[d][0], t.y + VEC[d][1], 0, end * 0.6);
		};
		for (const h of boss.hazardList) {
			const visible = h.warn <= h.warnVisible || h.warn <= 0;
			if (!visible) continue;
			if (!noticed.has(h)) noticed.set(h, now + reactionSample());
			if (now < (noticed.get(h) ?? Infinity)) continue;
			const start = Math.max(0, h.warn);
			for (const t of h.tiles) add(t.x, t.y, start, start + Math.max(0, h.active));
		}
		for (const s of boss.pendingSealList) {
			if (!noticed.has(s)) noticed.set(s, now + reactionSample());
			if (now >= (noticed.get(s) ?? Infinity))
				add(s.x, s.y, Math.max(0, s.warn - 0.1), s.warn + 0.5);
		}
		const kind = bossModel.attackKind;
		if (kind === 'dash' && telegraphSeenAt >= 0 && now >= telegraphSeenAt && boss.facing) {
			const [dx, dy] = VEC[boss.facing as PlayerDirection];
			let x = boss.tile.x;
			let y = boss.tile.y;
			for (let i = 0; i < 26 && open(x + dx, y + dy); i += 1) {
				x += dx;
				y += dy;
				add(x, y, 0, 1.6);
			}
		}
		around(boss.tile, 0.7);
		for (const m of boss.minionList) around(m.tile, 0.5);
		const echo = boss.echoPosition();
		if (echo) around({ x: Math.floor(echo.x), y: Math.floor(echo.y) }, 0.6);
		if (doom.split.stage === 'pacman') {
			for (const g of doom.split.ghosts) {
				if (g.drone.state === 'hunt')
					around({ x: Math.floor(g.drone.x), y: Math.floor(g.drone.y) }, 0.8);
			}
		}
		return map;
	};

	const overlaps = (list: Window[] | undefined, a: number, b: number) =>
		!!list && list.some((w) => w.start < b && w.end > a);

	/** The tiles from which the boss stands on a straight, open line, with the way to face him. */
	const firingTiles = (range: readonly [number, number]): Map<number, PlayerDirection> => {
		const result = new Map<number, PlayerDirection>();
		const b = boss.tile;
		for (const d of DIRS) {
			const [dx, dy] = VEC[d];
			let x = b.x;
			let y = b.y;
			for (let n = 1; n <= range[1]; n += 1) {
				x += dx;
				y += dy;
				if (!grid.isInside(x, y) || !grid.isWalkable(x, y)) break;
				if (n >= range[0] && open(x, y)) {
					const back = DIRS.find((o) => VEC[o][0] === -dx && VEC[o][1] === -dy) ?? d;
					result.set(idx(x, y), back);
				}
			}
		}
		return result;
	};

	/** The weapon in hand can be used now: the Maw full, the Sting charged, a berserk segment full. */
	const weaponReady = () => {
		const slot = doom.armed;
		if (slot === 'bfg') return doom.bfgReady;
		if (slot === 'plasma') return doom.food > 0.02;
		if (slot === 'berserk') return doom.food >= 1 / 3 - 1e-6;
		return false;
	};

	const liveFood = (x: number, y: number) =>
		(grid.isDot(x, y) || grid.isEnergizer(x, y)) && !progress.isCollected(x, y);

	const plan = () => {
		const danger = dangerMap();
		const start = fromTile();
		if (!open(start.x, start.y)) {
			path = [];
			return;
		}
		// the boss's reach (soft): keep a few tiles away unless rushing him
		const bossDist = new Int16Array(W * H).fill(-1);
		const queue: Tile[] = [boss.tile];
		bossDist[idx(boss.tile.x, boss.tile.y)] = 0;
		for (let q = 0; q < queue.length; q += 1) {
			const c = queue[q];
			for (const d of DIRS) {
				const nx = c.x + VEC[d][0];
				const ny = c.y + VEC[d][1];
				if (open(nx, ny) && bossDist[idx(nx, ny)] < 0) {
					bossDist[idx(nx, ny)] = bossDist[idx(c.x, c.y)] + 1;
					queue.push({ x: nx, y: ny });
				}
			}
		}
		lastBossDist = bossDist;
		const slot = doom.armed;
		const rushReady = slot === 'berserk' && weaponReady();
		// the boss is a threat where he can get to no later than the bot (not while stunned or held)
		const bossThreat =
			!doom.split.active && !boss.isStunned && boss.state !== 'INTRO' && !boss.defeated;
		const reachedByBoss = (k: number, step: number) =>
			bossThreat && !rushReady && bossDist[k] >= 0 && bossDist[k] <= 5 && bossDist[k] <= step + 1;
		const softPenalty = (k: number) => {
			const d = bossDist[k];
			if (d < 0 || !bossThreat) return 0;
			const keep = rushReady ? 1 : 5;
			return d < keep ? (keep - d) * 3 : 0;
		};

		// Dijkstra over (tile), cost = steps + penalties; a tile is entered only if it is not
		// burning while the bot would be on it
		const cost = new Float64Array(W * H).fill(Infinity);
		const steps = new Int16Array(W * H).fill(-1);
		const prev = new Int32Array(W * H).fill(-1);
		const s = idx(start.x, start.y);
		cost[s] = 0;
		steps[s] = 0;
		const heap: number[] = [s];
		const done = new Uint8Array(W * H);
		while (heap.length > 0) {
			let bi = 0;
			for (let i = 1; i < heap.length; i += 1) if (cost[heap[i]] < cost[heap[bi]]) bi = i;
			const k = heap[bi];
			heap[bi] = heap[heap.length - 1];
			heap.pop();
			if (done[k]) continue;
			done[k] = 1;
			const cx = k % W;
			const cy = (k - cx) / W;
			if (steps[k] > 40) continue;
			for (const d of DIRS) {
				const nx = cx + VEC[d][0];
				const ny = cy + VEC[d][1];
				if (!open(nx, ny)) continue;
				const nk = idx(nx, ny);
				const ta = (steps[k] + 1) * TILE_TIME;
				if (overlaps(danger.get(nk), ta - 0.12, ta + TILE_TIME + 0.12)) continue;
				if (reachedByBoss(nk, steps[k] + 1)) continue;
				const c = cost[k] + 1 + softPenalty(nk);
				if (c < cost[nk]) {
					cost[nk] = c;
					steps[nk] = steps[k] + 1;
					prev[nk] = k;
					heap.push(nk);
				}
			}
		}
		const restSafe = (k: number) => {
			const ta = Math.max(0, steps[k]) * TILE_TIME;
			if (!rushReady && bossThreat && bossDist[k] >= 0 && bossDist[k] < 4) return false;
			return !overlaps(danger.get(k), ta, ta + 1.2);
		};

		// what it wants
		const goals = new Map<number, number>();
		const want = (k: number, value: number) => {
			if (cost[k] === Infinity || !restSafe(k)) return;
			const old = goals.get(k);
			if (old === undefined || value < old) goals.set(k, value);
		};
		const foodGoals = () => {
			for (let y = 0; y < H; y += 1)
				for (let x = 0; x < W; x += 1) if (liveFood(x, y)) want(idx(x, y), 4);
		};
		const wander = () => {
			for (let k = 0; k < W * H; k += 1) {
				if (bossDist[k] >= 0) want(k, 40 + Math.abs(bossDist[k] - 8) * 2);
			}
		};
		const split = doom.split;
		if (split.active) {
			if (split.stage === 'pacman') {
				const prey = split.ghosts.filter((g) => g.drone.state === 'fright');
				for (const g of prey) want(idx(Math.floor(g.drone.x), Math.floor(g.drone.y)), 0);
				if (prey.length === 0) {
					for (let y = 0; y < H; y += 1)
						for (let x = 0; x < W; x += 1)
							if (grid.isEnergizer(x, y) && !progress.isCollected(x, y)) want(idx(x, y), 0);
				}
				foodGoals();
			}
			wander();
		} else {
			for (const p of doom.pickupList) {
				if (p.visible && p.kind && p.kind !== 'medkit' && doom.canCollect(p.kind)) {
					want(idx(p.tile.x, p.tile.y), slot === '' ? 0 : 15);
				}
			}
			if (slot !== '') {
				const ready = weaponReady();
				if (ready) {
					for (const k of firingTiles(RANGE[slot]).keys()) want(k, 0);
				}
				if (!ready || doom.canEat) foodGoals();
			}
			wander();
		}
		let best = -1;
		let bestValue = Infinity;
		for (const [k, v] of goals) {
			const total = cost[k] + v;
			if (total < bestValue) {
				bestValue = total;
				best = k;
			}
		}
		if (best < 0) {
			// nowhere safe to rest: the farthest it can reach from the boss
			bestValue = -1;
			for (let k = 0; k < W * H; k += 1) {
				if (cost[k] < Infinity && bossDist[k] > bestValue) {
					best = k;
					bestValue = bossDist[k];
				}
			}
		}
		const out: Tile[] = [];
		for (let k = best; k >= 0; k = prev[k]) out.unshift({ x: k % W, y: (k - (k % W)) / W });
		path = out;
	};

	/** The bot's hands for this frame: where it steers and whether it fires. */
	const control = (): { held: boolean; fire: boolean } => {
		if (now >= nextPlan) {
			plan();
			nextPlan = now + profile.replan;
		}
		const from = fromTile();
		const at = path.findIndex((t) => t.x === from.x && t.y === from.y);
		if (at < 0) nextPlan = now;
		let desired: PlayerDirection | null = null;
		if (at >= 0 && at + 1 < path.length) {
			const next = path[at + 1];
			desired =
				DIRS.find((d) => from.x + VEC[d][0] === next.x && from.y + VEC[d][1] === next.y) ?? null;
		}

		// nowhere to go and the boss close: away from him, as anyone would
		const threat =
			!doom.split.active && !boss.isStunned && boss.state !== 'INTRO' && !boss.defeated;
		const near = Math.abs(from.x - boss.tile.x) + Math.abs(from.y - boss.tile.y) <= 4;
		if (
			!desired &&
			threat &&
			near &&
			!(doom.armed === 'berserk' && weaponReady()) &&
			lastBossDist.length > 0
		) {
			let far = -1;
			for (const d of DIRS) {
				const nx = from.x + VEC[d][0];
				const ny = from.y + VEC[d][1];
				if (!open(nx, ny)) continue;
				const bd = lastBossDist[idx(nx, ny)];
				if (bd > far) {
					far = bd;
					desired = d;
				}
			}
		}

		// lined up with the boss: turn to face him and shoot
		const slot = doom.armed;
		let held = false;
		let fire = false;
		const here = { x: Math.floor(player.position.x), y: Math.floor(player.position.y) };
		const line =
			slot !== '' && !doom.split.active
				? firingTiles(RANGE[slot]).get(idx(here.x, here.y))
				: undefined;
		if (line) {
			if (alignedSince < 0) alignedSince = now;
			const ready = weaponReady() && (slot !== 'berserk' || doom.rushCooldown <= 0);
			const danger = dangerMap();
			const ahead = { x: here.x + VEC[line][0], y: here.y + VEC[line][1] };
			const safe =
				!overlaps(danger.get(idx(here.x, here.y)), 0, slot === 'bfg' ? 1.0 : 0.4) &&
				!overlaps(danger.get(idx(ahead.x, ahead.y)), 0, 0.5);
			const seen = now - alignedSince >= profile.reaction * 0.6;
			const gap = Math.abs(here.x - boss.tile.x) + Math.abs(here.y - boss.tile.y);
			const close = slot !== 'berserk' && gap < 4 && !boss.isStunned;
			if (ready && safe && seen && !close) {
				desired = line;
				if (player.facing === line) {
					if (slot === 'plasma') held = true;
					if (slot === 'bfg') fire = boss.isStunned || rng() < profile.greed * DT * 4;
					if (slot === 'berserk') fire = gap <= 5;
				}
			}
		} else {
			alignedSince = -1;
		}

		if (desired && desired !== player.facing) {
			// a turn: sometimes pressed late, as people do
			const turnKey = `${from.x},${from.y},${desired}`;
			if (turnKey !== lastTurnKey) {
				lastTurnKey = turnKey;
				if (rng() < profile.missTurn) lateUntil = now + 0.18;
			}
			if (now >= lateUntil) player.setDesiredDirection(desired);
		} else if (desired) {
			player.setDesiredDirection(desired);
		}
		return { held, fire };
	};

	// ---- the fight, one frame the way `PlayingState` runs it
	const maxSeconds = run.maxSeconds ?? 150;
	const phase = Math.min(3, Math.max(1, Math.floor(run.phase ?? 1)));
	const splitTally = { played: 0, eaten: 0 };
	// the later phases are reached the way a fight reaches them: health under each threshold in
	// turn, once he is out in the maze, each split played; the tallies start with the phase
	const thresholds: number[] = PHASE_THRESHOLDS.slice(0, phase - 1);
	let begun = phase === 1;
	let startedAt = 0;
	const resetTallies = () => {
		for (const o of [hits, attacks, damage, armed]) for (const k of Object.keys(o)) delete o[k];
		for (const o of [maw, sting, rush, splitTally])
			for (const k of Object.keys(o)) (o as Record<string, number>)[k] = 0;
		chaseHits = 0;
		current = null;
	};
	let splitWas = false;
	const bolts = new WeakSet<object>();
	for (
		;
		now - startedAt < maxSeconds && now < maxSeconds + 120 && !boss.defeated && boss.phase <= phase;
		now += DT
	) {
		if (
			thresholds.length > 0 &&
			now >= INTRO_DURATION + 0.1 &&
			!doom.split.active &&
			boss.state === 'CHASE' &&
			MAZE_FLOOR.has(grid.tileAt(boss.tile.x, boss.tile.y) ?? 'WL')
		) {
			const target = thresholds.shift() ?? BOSS_HP;
			boss.takeDamage(Math.max(1, boss.hp - target + 1), 'phase start');
			delete damage['phase start'];
		}
		if (!begun && boss.phase === phase) {
			begun = true;
			startedAt = now;
			resetTallies();
		}
		if (run.drill && begun && !doom.split.active && doom.armed !== run.drill) {
			doom.debugGiveWeapon(run.drill);
			doom.debugGiveWeapon('food');
		}
		if (doom.split.active && !splitWas) splitTally.played += 1;
		if (splitWas && !doom.split.active) splitTally.eaten += lastEaten;
		splitWas = doom.split.active;
		if (doom.split.active) lastEaten = doom.split.eaten;
		const { held, fire } = control();
		player.update(DT);
		if (!doom.bossFrozen) boss.update(DT, player);
		doom.update(DT, player, held);
		if (fire) {
			const used = doom.fire(player);
			if (used === 'bfg') maw.charges += 1;
			if (used === 'rush') {
				rush.rushes += 1;
				if (doom.rushIsCounter) rush.counters += 1;
			}
		}
		if (held && doom.stingFiring) sting.seconds += DT;
		for (const b of doom.bolts) {
			if (!bolts.has(b)) {
				bolts.add(b);
				sting.bolts += 1;
			}
		}
		for (const fx of doom.consumeFx()) {
			if (fx.kind === 'bfg-fire') maw.fired += 1;
			if (fx.kind === 'maw-hit') {
				if (fx.detail === 'full') maw.full += 1;
				else maw.glance += 1;
			}
			if (fx.kind === 'sting-hit') {
				if (fx.detail === 'boss') sting.boss += 1;
				else if (fx.detail === 'imp') sting.imp += 1;
				else sting.wall += 1;
			}
			if (fx.kind === 'rush-hit') rush.hits += 1;
		}
		const slotNow = doom.armed;
		armed[slotNow] = (armed[slotNow] ?? 0) + DT;
		// a new attack: its telegraph starts; the bot notices it after a reaction time
		const state = boss.state;
		if (state === 'TELEGRAPH' && lastState !== 'TELEGRAPH') {
			closeAttack();
			current = { kind: bossModel.attackKind ?? 'unknown', at: now, hit: false };
			telegraphSeenAt = now + reactionSample();
		}
		if (current && now - current.at > ATTACK_WINDOW) closeAttack();
		lastState = state;
		if (run.trace && Math.round(now * 60) % 15 === 0) {
			const goal = path[path.length - 1];
			run.trace(
				`${now.toFixed(2)} p${player.tile.x},${player.tile.y} from${fromTile().x},${fromTile().y}:${open(fromTile().x, fromTile().y) ? 'o' : 'X'} pos${player.position.x.toFixed(2)},${player.position.y.toFixed(2)} f${player.facing} b${boss.tile.x},${boss.tile.y} ${state}:${bossModel.attackKind} hits${Object.values(hits).reduce((a, b) => a + b, 0)} ${doom.armed || '-'} food${doom.food} path${path.length}→${goal ? `${goal.x},${goal.y}` : '-'} hz${boss.hazardList.length} split:${doom.split.stage}/${doom.split.eaten}/${doom.split.ghosts.map((g) => `${g.drone.state[0]}${Math.floor(g.drone.x)},${Math.floor(g.drone.y)}`).join(' ')} pick:${doom.pickupList.map((p) => (p.visible ? p.kind : '-')).join(',')}`
			);
		}
		if (doom.playerHp < PLAYER_MAX_HP) healer.playerHpValue = PLAYER_MAX_HP;
		doom.consumePlayerDeath();
	}
	closeAttack();
	return {
		won: boss.defeated,
		seconds: now - startedAt,
		bossHpLeft: boss.hp,
		phase: boss.phase,
		hits,
		attacks,
		chaseHits,
		maw,
		sting,
		rush,
		split: splitTally,
		damage,
		armed
	};
}
