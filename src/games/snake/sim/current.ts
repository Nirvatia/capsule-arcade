// Течение: свободный дрейф, искры, зов и портал на Полотно.
// Координаты — в единицах поля: короткая сторона экрана = 1000.

import { CURRENT } from '../config';
import type { Pt } from '../pictures/types';

export interface Spark {
	x: number;
	y: number;
	vx: number;
	vy: number;
	ph: number;
	big: boolean;
	born: number;
}

export type CurrentEvent =
	| { k: 'spark'; x: number; y: number; big: boolean }
	| { k: 'open' }
	| { k: 'enter' }
	| { k: 'call' }
	| { k: 'wrap'; from: Pt; to: Pt; dx: number; dy: number };

/** Точка хвоста. `g` — разрыв: здесь змейка вынырнула с другой стороны поля. */
export interface TrailPt extends Pt {
	g: boolean;
}

export class Current {
	w: number;
	h: number;
	x: number;
	y: number;
	ang: number;
	readonly trail: TrailPt[] = [];
	readonly sparks: Spark[] = [];
	readonly events: CurrentEvent[] = [];
	got = 0;
	need: number;
	readonly gate: Pt & { open: boolean } = { x: 0, y: 0, open: false };
	callAt = -99;
	private callCd = 0;
	time = 0;
	/** Портал срабатывает не сразу после появления на поле. */
	private gateCd = 1.5;
	entered = false;
	/** Желаемое направление (единичный вектор) или null — плыть как плывём. */
	private aim: Pt | null = null;
	/** Демо на титуле: змейка сама петляет и собирает искры. */
	autopilot = false;

	constructor(
		w: number,
		h: number,
		private readonly rnd: () => number,
		need: number = CURRENT.NEED
	) {
		this.w = w;
		this.h = h;
		this.need = need;
		this.x = w * (0.3 + rnd() * 0.4);
		this.y = h * (0.3 + rnd() * 0.4);
		this.ang = rnd() * Math.PI * 2;
		for (let i = 0; i < CURRENT.TAIL / 6; i++) {
			this.trail.push({
				x: this.x - Math.cos(this.ang) * (CURRENT.TAIL - i * 6),
				y: this.y - Math.sin(this.ang) * (CURRENT.TAIL - i * 6),
				g: false
			});
		}
		this.trail.forEach((p) => {
			p.x = Math.min(w - CURRENT.EDGE, Math.max(CURRENT.EDGE, p.x));
			p.y = Math.min(h - CURRENT.EDGE, Math.max(CURRENT.EDGE, p.y));
		});
		while (this.sparks.length < CURRENT.SPARKS) this.spawn(true);
		this.placeGate();
	}

	resize(w: number, h: number): void {
		const kx = w / this.w;
		const ky = h / this.h;
		const fix = (p: Pt): void => {
			p.x *= kx;
			p.y *= ky;
		};
		fix(this);
		this.trail.forEach(fix);
		this.sparks.forEach(fix);
		fix(this.gate);
		this.w = w;
		this.h = h;
	}

	get open(): boolean {
		return this.got >= this.need;
	}

	steer(v: Pt | null): void {
		if (!v || (v.x === 0 && v.y === 0)) this.aim = null;
		else {
			const l = Math.hypot(v.x, v.y);
			this.aim = { x: v.x / l, y: v.y / l };
		}
	}

	call(): boolean {
		if (this.callCd > 0) return false;
		this.callAt = this.time;
		this.callCd = CURRENT.CALL_COOLDOWN;
		this.events.push({ k: 'call' });
		return true;
	}

	private spawn(far: boolean): void {
		let x = 0;
		let y = 0;
		for (let i = 0; i < 20; i++) {
			x = 60 + this.rnd() * (this.w - 120);
			y = 60 + this.rnd() * (this.h - 120);
			if (!far || Math.hypot(x - this.x, y - this.y) > 220) break;
		}
		const a = this.rnd() * Math.PI * 2;
		const s = 8 + this.rnd() * 14;
		this.sparks.push({
			x,
			y,
			vx: Math.cos(a) * s,
			vy: Math.sin(a) * s,
			ph: this.rnd() * 10,
			big: this.rnd() < CURRENT.BIG_CHANCE,
			born: this.time
		});
	}

	private placeGate(): void {
		const m = Math.min(this.w, this.h);
		let x = 0;
		let y = 0;
		for (let i = 0; i < 40; i++) {
			x = 140 + this.rnd() * (this.w - 280);
			y = 140 + this.rnd() * (this.h - 280);
			if (Math.hypot(x - this.x, y - this.y) > m * 0.45) break;
		}
		this.gate.x = x;
		this.gate.y = y;
	}

	update(dt: number): void {
		this.time += dt;
		this.callCd = Math.max(0, this.callCd - dt);
		this.gateCd = Math.max(0, this.gateCd - dt);

		let aim = this.aim;
		if (this.autopilot) aim = this.pilot();
		const dg = Math.hypot(this.gate.x - this.x, this.gate.y - this.y);
		if (this.open && dg < CURRENT.GATE_ASSIST_R && dg > 1) {
			// Возле открытого портала змейку мягко заворачивает внутрь.
			const k = CURRENT.GATE_ASSIST * (1 - dg / CURRENT.GATE_ASSIST_R);
			const gx = (this.gate.x - this.x) / dg;
			const gy = (this.gate.y - this.y) / dg;
			const bx = (aim?.x ?? Math.cos(this.ang)) + gx * k;
			const by = (aim?.y ?? Math.sin(this.ang)) + gy * k;
			aim = { x: bx, y: by };
		}
		if (aim) {
			const want = Math.atan2(aim.y, aim.x);
			let d = want - this.ang;
			d = Math.atan2(Math.sin(d), Math.cos(d));
			const max = CURRENT.TURN * dt;
			this.ang += Math.max(-max, Math.min(max, d * (1 - Math.exp(-8 * dt)) * 3));
		}

		const dx = Math.cos(this.ang);
		const dy = Math.sin(this.ang);
		this.x += dx * CURRENT.SPEED * dt;
		this.y += dy * CURRENT.SPEED * dt;
		this.wrap(dx, dy);

		for (let i = this.sparks.length - 1; i >= 0; i--) this.moveSpark(i, dt);

		const open = this.open;
		if (open && !this.gate.open) this.events.push({ k: 'open' });
		this.gate.open = open;
		if (open && !this.entered && this.gateCd <= 0 && !this.autopilot && dg < CURRENT.GATE_R) {
			this.entered = true;
			this.events.push({ k: 'enter' });
		}
	}

	private wrap(dx: number, dy: number): void {
		const E = CURRENT.EDGE;
		const outX = this.x < E ? -1 : this.x > this.w - E ? 1 : 0;
		const outY = this.y < E ? -1 : this.y > this.h - E ? 1 : 0;
		if (outX || outY) {
			const from = {
				x: Math.min(this.w - E, Math.max(E, this.x)),
				y: Math.min(this.h - E, Math.max(E, this.y))
			};
			if (outX) this.x = outX < 0 ? this.w - E - (E - this.x) : E + (this.x - (this.w - E));
			if (outY) this.y = outY < 0 ? this.h - E - (E - this.y) : E + (this.y - (this.h - E));
			this.x = Math.min(this.w - E, Math.max(E, this.x));
			this.y = Math.min(this.h - E, Math.max(E, this.y));
			this.trail.push({ ...from, g: false });
			this.trail.push({ x: this.x, y: this.y, g: true });
			this.events.push({ k: 'wrap', from, to: { x: this.x, y: this.y }, dx, dy });
		} else {
			const l = this.trail[this.trail.length - 1];
			if (!l || Math.hypot(l.x - this.x, l.y - this.y) >= 4)
				this.trail.push({ x: this.x, y: this.y, g: false });
		}
		const want = Math.ceil((CURRENT.TAIL + Math.min(this.got, 10) * 8) / 4);
		while (this.trail.length > want) this.trail.shift();
	}

	private moveSpark(i: number, dt: number): void {
		const s = this.sparks[i];
		const t = this.time;
		s.x += (s.vx + Math.sin(t * 0.5 + s.ph) * 7) * dt;
		s.y += (s.vy + Math.cos(t * 0.43 + s.ph) * 7) * dt;
		if (s.x < -20) s.x = this.w + 20;
		if (s.x > this.w + 20) s.x = -20;
		if (s.y < -20) s.y = this.h + 20;
		if (s.y > this.h + 20) s.y = -20;
		const d = Math.hypot(this.x - s.x, this.y - s.y);
		if (d < CURRENT.PULL_R && d > 1) {
			const k = ((1 - d / CURRENT.PULL_R) * CURRENT.PULL * dt) / d;
			s.x += (this.x - s.x) * Math.min(1, k);
			s.y += (this.y - s.y) * Math.min(1, k);
		}
		const since = t - this.callAt;
		if (since < CURRENT.CALL_TIME) {
			const r = CURRENT.CALL_R * Math.min(1, since / (CURRENT.CALL_TIME * 0.8));
			if (d < r && d > 8) {
				const k = (CURRENT.CALL_PULL * dt) / d;
				s.x += (this.x - s.x) * Math.min(1, k);
				s.y += (this.y - s.y) * Math.min(1, k);
			}
		}
		if (Math.hypot(this.x - s.x, this.y - s.y) < CURRENT.PICK_R + (s.big ? 6 : 0)) {
			this.sparks.splice(i, 1);
			this.got += s.big ? CURRENT.BIG_VALUE : 1;
			this.events.push({ k: 'spark', x: s.x, y: s.y, big: s.big });
			this.spawn(true);
		}
	}

	/** Автопилот демо: плывёт к ближайшей искре, лениво петляя. */
	private pilot(): Pt {
		let best: Spark | null = null;
		let bd = Infinity;
		for (const s of this.sparks) {
			const d = Math.hypot(s.x - this.x, s.y - this.y);
			if (d < bd) {
				bd = d;
				best = s;
			}
		}
		const wob = Math.sin(this.time * 0.7) * 0.6;
		if (!best) return { x: Math.cos(this.ang + wob), y: Math.sin(this.ang + wob) };
		const a = Math.atan2(best.y - this.y, best.x - this.x) + wob;
		return { x: Math.cos(a), y: Math.sin(a) };
	}
}
