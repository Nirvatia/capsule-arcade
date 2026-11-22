// The dash's trail as pure functions: nothing here draws, nothing keeps state, so the shape can
// be tested and two frames at the same time always look the same.
//
// The trail is the boss's recent positions (`Sample`: where he was, when, and how strongly his
// transformed body was shedding there, `emit` 0..1). `ribbon` turns them into a centreline with a
// half-width and an alpha at every point. The rule the owner set: no tail, trail or track may end
// in a cut. So every factor that shapes the ribbon goes to zero smoothly:
//   - age: a point lives `life` seconds and fades with `1 - smoothstep(age / life)`; the last
//     point is interpolated at exactly `age = life`, so the old end is always 0;
//   - both ends in space: `smoothstep` over `capHead` px from the newest shedding point and over
//     `capTail` px from the oldest one, so a dash that has just begun or has just stopped tapers
//     at both ends instead of ending in a square edge;
//   - emission: a body that is not transformed sheds nothing (`emit` 0), and the transformation
//     takes 0.25 s, so the shedding fades in and out with it.
// After the boss stops, the points keep ageing, so the trail goes on fading by itself.

export interface Sample {
	readonly x: number;
	readonly y: number;
	/** Birth time, seconds. */
	readonly t: number;
	/** How strongly this point sheds, 0..1 (the transformation's amount at birth). */
	readonly emit: number;
}

export interface TrailSpec {
	/** Seconds a point lives. */
	readonly life: number;
	/** Full half-width, px. */
	readonly width: number;
	/** Taper length at the newest end, px. */
	readonly capHead: number;
	/** Taper length at the oldest end, px. */
	readonly capTail: number;
	/** Exponent on the age fade (>1 fades sooner). */
	readonly ageBias?: number;
}

export interface RibbonPoint {
	readonly x: number;
	readonly y: number;
	/** Unit normal (left of the direction of travel). */
	readonly nx: number;
	readonly ny: number;
	/** Half-width, px. */
	readonly w: number;
	/** 0..1. */
	readonly a: number;
	/** Seconds since this point was laid. */
	readonly age: number;
	/** 0 at the newest end, 1 at the oldest, by arc length. */
	readonly u: number;
}

export const smoothstep = (e0: number, e1: number, x: number): number => {
	const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
	return k * k * (3 - 2 * k);
};

/** The age fade: 1 when laid, 0 at `life` and after, smooth at both ends. */
export function ageFade(age: number, life: number, bias = 1): number {
	if (age <= 0) return 1;
	if (age >= life) return 0;
	return 1 - smoothstep(0, 1, Math.pow(age / life, 1 / bias));
}

/**
 * The ribbon of a trail at time `now`. `samples` in any order. Points closer than `merge` px are
 * one point (the boss stands still in the crouch and after the stop): the newest position, the
 * strongest emission. Returns [] when nothing is left to draw; otherwise the first and last
 * points have `w = 0` and `a = 0`.
 */
export function ribbon(samples: readonly Sample[], now: number, spec: TrailSpec, merge = 0.75): RibbonPoint[] {
	const live = samples.filter((s) => s.t <= now).sort((p, q) => q.t - p.t);
	if (live.length < 2) return [];
	// cut at exactly age = life, interpolating the end point
	const pts: Sample[] = [];
	for (let i = 0; i < live.length; i += 1) {
		const s = live[i];
		const age = now - s.t;
		if (age < spec.life) {
			pts.push(s);
			continue;
		}
		if (i > 0) {
			const p = live[i - 1];
			const pa = now - p.t;
			const k = (spec.life - pa) / (age - pa);
			pts.push({ x: p.x + (s.x - p.x) * k, y: p.y + (s.y - p.y) * k, t: now - spec.life, emit: p.emit + (s.emit - p.emit) * k });
		}
		break;
	}
	// drop what sheds nothing at either end
	let a = 0;
	let b = pts.length - 1;
	while (a <= b && pts[a].emit <= 1e-4) a += 1;
	while (b >= a && pts[b].emit <= 1e-4) b -= 1;
	if (b - a < 1) return [];
	// merge points that stand on each other
	const run: Sample[] = [];
	for (let i = a; i <= b; i += 1) {
		const s = pts[i];
		const last = run[run.length - 1];
		if (last && Math.hypot(s.x - last.x, s.y - last.y) < merge) {
			run[run.length - 1] = { ...last, emit: Math.max(last.emit, s.emit) };
			continue;
		}
		run.push(s);
	}
	if (run.length < 2) return [];
	const arc: number[] = [0];
	for (let i = 1; i < run.length; i += 1) {
		arc.push(arc[i - 1] + Math.hypot(run[i].x - run[i - 1].x, run[i].y - run[i - 1].y));
	}
	const total = arc[arc.length - 1];
	if (total <= 0) return [];
	const out: RibbonPoint[] = [];
	for (let i = 0; i < run.length; i += 1) {
		const s = run[i];
		const p = run[Math.max(0, i - 1)];
		const q = run[Math.min(run.length - 1, i + 1)];
		// direction of travel: from older (q) to newer (p)
		let dx = p.x - q.x;
		let dy = p.y - q.y;
		const dl = Math.hypot(dx, dy) || 1;
		dx /= dl;
		dy /= dl;
		const age = now - s.t;
		const env = ageFade(age, spec.life, spec.ageBias ?? 1);
		const cap = smoothstep(0, spec.capHead, arc[i]) * smoothstep(0, spec.capTail, total - arc[i]);
		const k = s.emit * env * cap;
		out.push({ x: s.x, y: s.y, nx: -dy, ny: dx, w: spec.width * k, a: Math.min(1, s.emit * env) * cap, age, u: arc[i] / total });
	}
	return out;
}

/** The boss's positions on a fixed time grid (so a sample keeps its birth time frame to frame). */
export function sampleGrid(now: number, window: number, step: number, at: (t: number) => { x: number; y: number; emit: number }): Sample[] {
	const out: Sample[] = [];
	const t1 = Math.floor(now / step) * step;
	// the newest sample is now itself, so the head follows the body exactly
	const head = at(now);
	out.push({ x: head.x, y: head.y, t: now, emit: head.emit });
	for (let t = t1; t > now - window - step; t -= step) {
		if (t >= now) continue;
		const p = at(t);
		out.push({ x: p.x, y: p.y, t, emit: p.emit });
	}
	return out;
}

/** Seeded 0..1 noise. */
export function hash(i: number, k = 0): number {
	const v = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
	return v - Math.floor(v);
}

export interface Mote {
	x: number;
	y: number;
	/** 0..1 of its life. */
	k: number;
	/** 0..1, already faded in and out. */
	a: number;
	/** Seed, for per-mote looks. */
	seed: number;
	/** Direction of the shedding body when it was born (radians). */
	heading: number;
}

/**
 * Motes shed along the trail: every `every`-th grid sample of the last `life` s throws `per`
 * motes with seeded velocities (`speed` px/s, slowing with `drag`/s). Their alpha rises over the
 * first 10 % of life and falls to 0 at its end, so none pops in or out. Pure.
 */
export function motes(samples: readonly Sample[], now: number, opt: { life: number; per: number; speed: number; drag: number; spread: number; seed: number; step: number; every: number; back?: number; across?: number }): Mote[] {
	const out: Mote[] = [];
	const sorted = [...samples].sort((p, q) => q.t - p.t);
	for (let i = 0; i < sorted.length - 1; i += 1) {
		const s = sorted[i];
		const tick = Math.round(s.t / opt.step);
		if (tick % opt.every !== 0 || s.emit <= 0.01) continue;
		const age = now - s.t;
		if (age < 0 || age > opt.life) continue;
		const o = sorted[i + 1];
		const heading = Math.atan2(s.y - o.y, s.x - o.x);
		const moving = Math.hypot(s.x - o.x, s.y - o.y) > 0.01;
		for (let j = 0; j < opt.per; j += 1) {
			const seed = tick * 7.13 + j * 1.71 + opt.seed;
			const life = opt.life * (0.55 + 0.45 * hash(seed, 1));
			if (age > life) continue;
			const k = age / life;
			const ang = (moving ? heading + Math.PI : hash(seed, 2) * Math.PI * 2) + (hash(seed, 3) - 0.5) * 2 * opt.spread;
			const v = opt.speed * (0.4 + 0.6 * hash(seed, 4));
			// distance with exponential drag: v (1 - e^(-d t)) / d
			const d = opt.drag > 0 ? (v * (1 - Math.exp(-opt.drag * age))) / opt.drag : v * age;
			const jx = (hash(seed, 5) - 0.5) * (opt.back ?? 0);
			// split into along and across the run; the across part is eased under `across` (tanh),
			// so a mote slows as it nears the corridor's edge instead of being cut there
			const ox = Math.cos(ang) * d;
			const oy = Math.sin(ang) * d;
			const ux = Math.cos(heading);
			const uy = Math.sin(heading);
			const al = ox * ux + oy * uy;
			let ac = -ox * uy + oy * ux + jx;
			if (opt.across) ac = opt.across * Math.tanh(ac / opt.across);
			out.push({
				x: s.x + ux * al - uy * ac,
				y: s.y + uy * al + ux * ac,
				k,
				a: smoothstep(0, 0.1, k) * (1 - smoothstep(0.45, 1, k)) * s.emit,
				seed,
				heading
			});
		}
	}
	return out;
}
