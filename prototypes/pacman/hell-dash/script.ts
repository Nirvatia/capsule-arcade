// The scripted round of the prototype, a pure function of time: the boss stands, crouches (the
// game's telegraph, its length per phase), turns into the dash form over its last 0.25 s, runs
// a straight line at the game's dash speed, comes back into the body over 0.28 s at the stop,
// pants for the game's recover time, then stands while what he left fades by itself.
// The game's numbers (`logic/doom/DoomBalance`): telegraph 0.7/0.6/0.5 s, recover 0.8/0.7/0.6 s,
// dash speed = 2 x chase, chase = 0.8/0.857/0.914 x the player's base (6 tiles/s by default).
import type { DoomStateName, DoomShape } from '../../../src/games/pacman/logic/doom/DoomBossModel';
import { smoothstep } from '../../../src/games/pacman/render/common/trailRibbon';

export const MORPH_IN = 0.25;
export const MORPH_OUT = 0.28;
const TELEGRAPH = [0.7, 0.6, 0.5];
const RECOVER = [0.8, 0.7, 0.6];
const SPEED = [0.8, 6 / 7, 32 / 35].map((r) => 6 * r * 2);
const LEAD = 0.45;
const REST = 2.6;

export interface Lane {
	/** Start tile centre (tile-centre coordinates). */
	readonly x0: number;
	readonly y0: number;
	/** Unit step per tile. */
	readonly dx: number;
	readonly dy: number;
	readonly tiles: number;
}

export interface Beat {
	readonly x: number;
	readonly y: number;
	readonly state: DoomStateName;
	readonly shape: DoomShape;
	/** Telegraph progress 0..1. */
	readonly progress: number;
	/** 0 body .. 1 the dash form. */
	readonly morph: number;
	/** 0..1 while crouching. */
	readonly crouch: number;
	/** Seconds since the dash began (-1 before). */
	readonly sinceStart: number;
	/** Seconds since the stop (-1 before). */
	readonly sinceStop: number;
	/** 0..1 of the recover (the steam). */
	readonly recover: number;
	/** Tiles per second in the dash. */
	readonly speed: number;
}

export interface Round {
	readonly phase: number;
	readonly lane: Lane;
}

export function timing(r: Round) {
	const pi = Math.min(3, Math.max(1, r.phase)) - 1;
	const tel = TELEGRAPH[pi];
	const t0 = LEAD;
	const t1 = t0 + tel;
	const dur = r.lane.tiles / SPEED[pi];
	const t2 = t1 + dur;
	const t3 = t2 + RECOVER[pi];
	return { tel, t0, t1, t2, t3, cycle: t3 + REST, speed: SPEED[pi], rec: RECOVER[pi] };
}

export function beat(r: Round, time: number): Beat {
	const T = timing(r);
	const t = ((time % T.cycle) + T.cycle) % T.cycle;
	const L = r.lane;
	const along = t < T.t1 ? 0 : t < T.t2 ? (t - T.t1) * T.speed : L.tiles;
	const x = L.x0 + L.dx * along;
	const y = L.y0 + L.dy * along;
	// the form: in over the telegraph's last MORPH_IN s, out over the first MORPH_OUT s of the stop
	let morph = 0;
	if (t >= T.t1 - MORPH_IN && t < T.t2) morph = smoothstep(T.t1 - MORPH_IN, T.t1, t);
	else if (t >= T.t2) morph = 1 - smoothstep(T.t2, T.t2 + MORPH_OUT, t);
	const base = { x, y, morph, speed: T.speed, sinceStart: t >= T.t1 ? t - T.t1 : -1, sinceStop: t >= T.t2 ? t - T.t2 : -1 };
	if (t < T.t0) return { ...base, state: 'CHASE', shape: 'normal', progress: 0, crouch: 0, recover: 0 };
	if (t < T.t1) {
		const p = (t - T.t0) / T.tel;
		return { ...base, state: 'TELEGRAPH', shape: 'wedge', progress: p, crouch: p, recover: 0 };
	}
	if (t < T.t2) return { ...base, state: 'ACTIVE', shape: 'wedge', progress: 1, crouch: 0, recover: 0 };
	if (t < T.t3) return { ...base, state: 'RECOVER', shape: 'normal', progress: 0, crouch: 0, recover: (t - T.t2) / T.rec };
	return { ...base, state: 'CHASE', shape: 'normal', progress: 0, crouch: 0, recover: 0 };
}

/** The moments of the contact sheet: name and time in the round. */
export function moments(r: Round): Array<{ name: string; t: number }> {
	const T = timing(r);
	return [
		{ name: 'замах', t: T.t0 + T.tel * 0.45 },
		{ name: 'превращение', t: T.t1 - MORPH_IN * 0.45 },
		{ name: 'рывок', t: T.t1 + (T.t2 - T.t1) * 0.6 },
		{ name: 'стоп: возврат', t: T.t2 + MORPH_OUT * 0.5 },
		{ name: 'пар', t: T.t2 + 0.55 },
		{ name: 'след +1.2 с', t: T.t2 + 1.2 },
		{ name: 'след +2.2 с', t: T.t2 + 2.2 }
	];
}
