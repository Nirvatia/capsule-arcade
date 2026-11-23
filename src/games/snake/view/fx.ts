// Короткоживущие эффекты в пикселях экрана: частицы, кольца порталов, рябь.
// Порталы и рябь ещё и искажают пространство через пост (см. post.ts).

import type { Warp } from './post';

export interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
	hue: number;
}

export interface Portal {
	x: number;
	y: number;
	dx: number;
	dy: number;
	t: number;
	dur: number;
	amp: number;
	r0: number;
	r1: number;
	ring: boolean;
	size: number;
	hue: number;
}

/** Огибающая: быстрый подъём и плавный спад. */
const env = (t: number): number =>
	t <= 0 ? 0 : Math.min(1, (1 - Math.exp(-t * 22)) * Math.exp(-t * 3.6) * 2);

export class Fx {
	readonly parts: Particle[] = [];
	readonly portals: Portal[] = [];

	clear(): void {
		this.parts.length = 0;
		this.portals.length = 0;
	}

	burst(x: number, y: number, n: number, hue: number, speed = 80, life = 1.1, size = 8): void {
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2;
			const s = speed * (0.25 + Math.random());
			this.parts.push({
				x,
				y,
				vx: Math.cos(a) * s,
				vy: Math.sin(a) * s,
				life: life * (0.5 + Math.random() * 0.7),
				max: life,
				size: size * (0.5 + Math.random()),
				hue: hue + (Math.random() - 0.5) * 30
			});
		}
	}

	/** Кольцо портала на краю поля: `kind` — вход или выход. */
	portal(
		x: number,
		y: number,
		dx: number,
		dy: number,
		size: number,
		hue: number,
		kind: 'in' | 'out',
		delay = 0
	): void {
		this.portals.push({
			x,
			y,
			dx,
			dy,
			t: -delay,
			dur: 1.05,
			amp: kind === 'in' ? 0.8 : -0.6,
			r0: 0.07,
			r1: 0.16,
			ring: true,
			size,
			hue: hue + (kind === 'in' ? 0 : 24)
		});
	}

	ripple(x: number, y: number, amp = 0.3, r1 = 0.1, dur = 0.7): void {
		this.portals.push({
			x,
			y,
			dx: 1,
			dy: 0,
			t: 0,
			dur,
			amp,
			r0: 0.02,
			r1,
			ring: false,
			size: 0,
			hue: 0
		});
	}

	update(dt: number): void {
		for (let i = this.portals.length - 1; i >= 0; i--) {
			const e = this.portals[i];
			e.t += dt;
			if (e.t > e.dur) this.portals.splice(i, 1);
		}
		for (let i = this.parts.length - 1; i >= 0; i--) {
			const p = this.parts[i];
			p.life -= dt;
			if (p.life <= 0) {
				this.parts.splice(i, 1);
				continue;
			}
			const k = Math.exp(-1.6 * dt);
			p.vx *= k;
			p.vy *= k;
			p.x += p.vx * dt;
			p.y += p.vy * dt;
		}
	}

	warps(w: number, h: number): Warp[] {
		const out: Warp[] = [];
		for (const e of this.portals) {
			if (e.t <= 0) continue;
			const a = env(e.t) * e.amp;
			if (Math.abs(a) < 0.01) continue;
			const k = e.t / e.dur;
			const ease = 1 - Math.pow(1 - Math.min(1, k), 3);
			out.push({
				x: e.x / w,
				y: e.y / h,
				a,
				r: e.r0 + (e.r1 - e.r0) * ease,
				dx: e.dx,
				dy: e.dy,
				age: k,
				iso: e.ring ? 0 : 1
			});
		}
		out.sort((p, q) => Math.abs(q.a) - Math.abs(p.a));
		return out.slice(0, 4);
	}
}
