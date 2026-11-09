import { EventBus } from '../../engine/EventBus';
import type { PacmanEventMap } from '../../core/Events';
import { buildLevelSession, resetLevelSession } from '../level/LevelSession';
import type { LevelSession } from '../level/LevelSession';
import type { SeasonData } from '../level/SeasonCatalog';
import type { PlayerDirection } from '../actors/PlayerModel';
import type { GameProfile } from '../rules/HypnosisService';

/**
 * A bot that plays one season level on the real services (no screen, no director), for the
 * balance check: it goes for the nearest dot by path, keeps out of the ghosts' reach, takes an
 * energizer when a ghost is near and hunts scared ghosts while the power lasts. It is a
 * middling player, on purpose: what matters is how a level treats the same player across
 * mazes, seasons and levels, not how well it plays.
 */
export interface BotRun {
	readonly season: SeasonData;
	readonly level: number;
	readonly profile: GameProfile;
	readonly seed: number;
	/** Game seconds before it gives up. */
	readonly maxSeconds?: number;
}

export interface BotResult {
	readonly cleared: boolean;
	/** Game seconds played (the level's own time, no READY or death animations). */
	readonly seconds: number;
	readonly deaths: number;
	readonly score: number;
	/** Seconds at the first death (or the whole run if it never died). */
	readonly firstDeathAt: number;
	/** 1 when an echo token showed up on the level. */
	readonly echoTokens: number;
	readonly hypnoses: number;
	/** Of the hypnoses, how many planned to feed and how many to hunt. */
	readonly feeders: number;
	readonly hunters: number;
	/** Dots the hypnotised ghosts ate and ghosts the hunters ate. */
	readonly fedDots: number;
	readonly huntedGhosts: number;
}

const DT = 1 / 60;
const DIRS: readonly PlayerDirection[] = ['UP', 'LEFT', 'DOWN', 'RIGHT'];
const VEC: Record<PlayerDirection, readonly [number, number]> = {
	UP: [0, -1],
	LEFT: [-1, 0],
	DOWN: [0, 1],
	RIGHT: [1, 0]
};
const OPPOSITE: Record<PlayerDirection, PlayerDirection> = {
	UP: 'DOWN',
	DOWN: 'UP',
	LEFT: 'RIGHT',
	RIGHT: 'LEFT'
};

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

/** Breadth-first distances over tiles `open` admits, from the given sources (tunnels count). */
function distances(
	session: LevelSession,
	sources: ReadonlyArray<{ x: number; y: number }>,
	open: (x: number, y: number) => boolean,
	limit = Infinity
): Int16Array {
	const { grid } = session;
	const W = grid.width;
	const dist = new Int16Array(W * grid.height).fill(-1);
	let frontier: Array<[number, number]> = [];
	for (const s of sources) {
		if (grid.isInside(s.x, s.y)) {
			dist[s.y * W + s.x] = 0;
			frontier.push([s.x, s.y]);
		}
	}
	for (let d = 0; frontier.length > 0 && d < limit; d += 1) {
		const next: Array<[number, number]> = [];
		for (const [x, y] of frontier) {
			const around: Array<[number, number]> = DIRS.map(
				(dir) => [x + VEC[dir][0], y + VEC[dir][1]] as [number, number]
			);
			const tunnel = grid.teleportDestination(x, y);
			if (tunnel) around.push([tunnel.x, tunnel.y]);
			for (const [nx, ny] of around) {
				if (!grid.isInside(nx, ny) || dist[ny * W + nx] >= 0 || !open(nx, ny)) continue;
				dist[ny * W + nx] = d + 1;
				next.push([nx, ny]);
			}
		}
		frontier = next;
	}
	return dist;
}

export function playLevel(run: BotRun): BotResult {
	// the game's own dice (the echo's chance and place) follow the run's seed too, so a seed
	// always plays the same game
	const realRandom = Math.random;
	Math.random = seeded(run.seed ^ 0x5bd1e995);
	try {
		return play(run);
	} finally {
		Math.random = realRandom;
	}
}

function play(run: BotRun): BotResult {
	const random = seeded(run.seed);
	const events = new EventBus<PacmanEventMap>();
	let echoTokens = 0;
	let eatenByHunter = 0;
	events.on('fx:event', (e) => {
		if (e.kind === 'ghost-eaten' && e.points === 200 && session.hypnosis.mode === 'hunter')
			eatenByHunter += 1;
	});
	const session = buildLevelSession({
		events,
		level: run.level,
		profile: run.profile,
		season: run.season,
		hell: false,
		secret: false,
		godMode: false
	});
	resetLevelSession(session);
	session.combat.setLives(99);
	const { grid, player, ghosts, combat, progress, fruit, echo, lairCode } = session;
	const maxSeconds = run.maxSeconds ?? 600;
	let seconds = 0;
	let deaths = 0;
	let firstDeathAt = -1;
	let hypnoses = 0;
	let feeders = 0;
	let hunters = 0;
	let fedDots = 0;
	let lastRemaining = progress.remainingDots;
	let hypnotisedBefore: string | null = null;
	let sawToken = false;
	let lastTile = '';
	let lastDirection: PlayerDirection | null = null;
	const walkable = (x: number, y: number) => grid.isPlayerWalkable(x, y);

	const steer = () => {
		const tile = player.tile;
		const key = `${tile.x},${tile.y}`;
		// decide once per tile, and again when the ghosts have come close
		const threats = ghosts.list.filter((g) => g.state === 'active' || g.state === 'enraged');
		const prey = ghosts.list.filter((g) => g.state === 'frightened');
		const danger = distances(
			session,
			threats.map((g) => g.tile),
			(x, y) => grid.isGhostWalkable(x, y, false),
			12
		);
		const dangerAt = (x: number, y: number) => {
			const d = danger[y * grid.width + x];
			return d < 0 ? 99 : d;
		};
		if (key === lastTile && dangerAt(tile.x, tile.y) > 4) return;
		lastTile = key;
		const powered =
			combat.isPowerActive || (run.profile === 'ms-pacman' && session.hypnosis.overdriveActive);
		const near = dangerAt(tile.x, tile.y);
		let best: PlayerDirection | null = null;
		let bestScore = Infinity;
		for (const dir of DIRS) {
			const nx = tile.x + VEC[dir][0];
			const ny = tile.y + VEC[dir][1];
			if (!walkable(nx, ny)) continue;
			let score: number;
			const d = dangerAt(nx, ny);
			if (d <= 1 && !powered) {
				score = 1000 - d * 50;
			} else {
				const avoid = powered ? 0 : 2;
				const dist = distances(
					session,
					[{ x: nx, y: ny }],
					(x, y) => walkable(x, y) && (powered || dangerAt(x, y) > avoid),
					60
				);
				let pathLen = Infinity;
				const wantEnergizer = !powered && near <= 8;
				for (let y = 0; y < grid.height; y += 1) {
					for (let x = 0; x < grid.width; x += 1) {
						const dd = dist[y * grid.width + x];
						if (dd < 0 || progress.isCollected(x, y)) continue;
						const t = grid.tileAt(x, y);
						let want = Infinity;
						if (t === 'DT') want = dd;
						else if (t === 'EU') want = wantEnergizer ? dd * 0.3 : dd + 6;
						if (want < pathLen) pathLen = want;
					}
				}
				if (powered) {
					for (const g of prey) {
						const dd = dist[g.tile.y * grid.width + g.tile.x];
						if (dd >= 0 && dd < combat.powerTimer * 4) pathLen = Math.min(pathLen, dd * 0.5);
					}
				}
				score = pathLen === Infinity ? 500 - d * 10 : pathLen;
			}
			if (lastDirection && dir === OPPOSITE[lastDirection] && near > 3) score += 3;
			score += random() * 0.4;
			if (score < bestScore) {
				bestScore = score;
				best = dir;
			}
		}
		if (best) {
			player.setDesiredDirection(best);
			lastDirection = best;
		}
	};

	player.setMovementLocked(true);
	for (let i = 0; i < 80 && player.isInvulnerable; i += 1) player.update(0.1);
	player.setMovementLocked(false);

	while (seconds < maxSeconds) {
		steer();
		lairCode.update(DT);
		player.update(DT);
		fruit.update(DT, player);
		echo.update(DT, player, { ghosts, fruit });
		ghosts.update(DT);
		combat.update(DT);
		seconds += DT;
		if (!sawToken && echo.phase !== 'waiting') {
			sawToken = true;
			echoTokens = 1;
		}
		const hypno = session.hypnosis.hypnotizedKind;
		if (hypno && hypno !== hypnotisedBefore) {
			hypnoses += 1;
			if (session.hypnosis.mode === 'hunter') hunters += 1;
			else feeders += 1;
		}
		hypnotisedBefore = hypno;
		const left = progress.remainingDots;
		// dots that vanish while a ghost is hypnotised and the hero is not the one eating are its
		if (hypno && session.hypnosis.mode === 'feeder' && left < lastRemaining) {
			const g = ghosts.list.find((x) => x.kind === hypno);
			const p = player.position;
			if (g && Math.hypot(g.position.x - p.x, g.position.y - p.y) > 0.6)
				fedDots += lastRemaining - left;
		}
		lastRemaining = left;
		if (combat.deathActive) {
			deaths += 1;
			if (firstDeathAt < 0) firstDeathAt = seconds;
			combat.finishDeath();
			lastTile = '';
		}
		if (combat.endRequested) {
			break;
		}
	}
	return {
		cleared: combat.endRequested && combat.result === 'win',
		seconds,
		deaths,
		score: session.score.score,
		firstDeathAt: firstDeathAt < 0 ? seconds : firstDeathAt,
		echoTokens,
		hypnoses,
		feeders,
		hunters,
		fedDots,
		huntedGhosts: eatenByHunter
	};
}
