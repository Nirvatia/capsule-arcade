// Эффекты, управляемые событиями симуляции. Состояние эффектов живёт здесь,
// симуляция о нём не знает. Время — в секундах (t), как у рендера.

import type { Sim } from '../sim/Sim';
import type { SimEvent } from '../sim/types';
import type { AspidStyle } from './aspid';
import { FONT_DISPLAY, PAL, clamp01, type Light } from './paint';

interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	max: number;
	size: number;
	color: string;
	shard: boolean;
	grav: number;
	glow: boolean;
}

interface Float {
	text: string;
	x: number;
	y: number;
	t0: number;
	color: string;
	size: number;
}

export interface Ghost {
	x: number;
	y: number;
	angle: number;
	t0: number;
}

export interface FxHooks {
	/** Звук и прочие реакции. */
	onEvent?: (e: SimEvent) => void;
	actLabel: (act: number) => [string, string];
}

const DEATH_LEAD = 0.25;

export class Fx {
	private readonly particles: Particle[] = [];
	private readonly floats: Float[] = [];
	private shakeMag = 0;
	private bulges: number[] = [];
	private eatT0 = -10;
	private strikeT0 = -10;
	private strikeOk = false;
	private notT0 = -10;
	private pushT0 = -10;
	private pushX = 0;
	private pushY = 0;
	private deathT0 = -1;
	private deathLen = 0;
	private crumbled = 0;
	private actT0 = -10;
	private actText: [string, string] = ['', ''];
	private crackT0 = -10;
	/** Колонны, поднимающиеся из пола: клетка → время начала. */
	readonly pillarRise = new Map<number, number>();
	private hitStopMs = 0;
	ghost: Ghost | null = null;

	constructor(
		private readonly cs: number,
		private readonly hooks: FxHooks
	) {}

	reset(): void {
		this.particles.length = 0;
		this.floats.length = 0;
		this.shakeMag = 0;
		this.bulges = [];
		this.eatT0 = this.strikeT0 = this.notT0 = this.pushT0 = this.actT0 = this.crackT0 = -10;
		this.deathT0 = -1;
		this.crumbled = 0;
		this.ghost = null;
		this.pillarRise.clear();
		this.hitStopMs = 0;
	}

	consumeHitStop(): number {
		const v = this.hitStopMs;
		this.hitStopMs = 0;
		return v;
	}

	get dying(): boolean {
		return this.deathT0 >= 0;
	}

	deathDone(t: number): boolean {
		return (
			this.deathT0 >= 0 && t - this.deathT0 > DEATH_LEAD + this.deathPer() * this.deathLen + 0.9
		);
	}

	private deathPer(): number {
		return Math.min(0.07, 1.2 / Math.max(1, this.deathLen));
	}

	private center(sim: Sim, cell: number): [number, number] {
		const cs = this.cs;
		return [((cell % sim.cols) + 0.5) * cs, (Math.floor(cell / sim.cols) + 0.5) * cs];
	}

	handle(events: readonly SimEvent[], sim: Sim, t: number, alphaAngle: number): void {
		const cs = this.cs;
		for (const e of events) {
			this.hooks.onEvent?.(e);
			switch (e.type) {
				case 'eat': {
					const [x, y] = this.center(sim, e.cell);
					this.burst(
						x,
						y,
						9,
						[e.bit ? PAL.gold : PAL.pat, e.bit ? PAL.goldHi : PAL.patHi],
						cs * 2.2,
						0.45,
						0,
						cs * 0.06,
						true
					);
					this.bulges.push(0);
					this.eatT0 = t;
					break;
				}
				case 'strike': {
					const ax = ((e.alphaCell % sim.cols) + 1) * cs;
					const ay = (Math.floor(e.alphaCell / sim.cols) + 1) * cs;
					this.strikeT0 = t;
					this.strikeOk = e.ok;
					if (e.ok) {
						this.ghost = { x: ax, y: ay, angle: alphaAngle, t0: t };
						this.addFloat(`+${e.points}`, ax, ay - cs * 0.4, t, PAL.goldHi, cs * 0.7);
						for (const b of e.bonusCells) {
							const [x, y] = this.center(sim, b);
							this.burst(x, y, 8, [PAL.gold, PAL.goldHi], cs * 2, 0.6, 0, cs * 0.06, true);
						}
						this.shake(4);
						this.hitStopMs = 90;
					} else {
						this.pushT0 = t;
						this.pushX = ax / cs;
						this.pushY = ay / cs;
						this.crackT0 = t;
						this.burst(ax, ay, 14, [PAL.crim, PAL.crimHi], cs * 3, 0.5, 0, cs * 0.05, true);
						this.addFloat(`−${e.lostCells.length}`, ax, ay - cs * 0.6, t, PAL.crimHi, cs * 0.6);
						this.shake(6);
						this.hitStopMs = 70;
					}
					for (const lc of e.lostCells) {
						const [x, y] = this.center(sim, lc);
						this.burst(
							x,
							y,
							10,
							[PAL.stone, PAL.stoneLight, PAL.stoneDark],
							cs * 1.6,
							1.0,
							cs * 6,
							cs * 0.06,
							false,
							true
						);
					}
					break;
				}
				case 'not': {
					this.notT0 = t;
					const [x, y] = this.center(sim, e.cell);
					this.burst(x, y, 16, [PAL.patHi, PAL.pat], cs * 2.4, 0.6, 0, cs * 0.05, true);
					break;
				}
				case 'death': {
					this.deathT0 = t;
					this.deathLen = sim.length;
					this.crumbled = 0;
					const [x, y] = this.center(sim, e.cell);
					this.burst(x, y, 10, ['#cfd5d2'], cs * 2, 0.35, 0, cs * 0.04, false);
					this.shake(6);
					break;
				}
				case 'act': {
					this.actT0 = t;
					this.actText = this.hooks.actLabel(e.act);
					break;
				}
				case 'alphaSpawn': {
					const x = ((e.cell % sim.cols) + 1) * cs;
					const y = (Math.floor(e.cell / sim.cols) + 1) * cs;
					this.burst(
						x,
						y,
						14,
						[PAL.stone, PAL.stoneLight],
						cs * 1.4,
						0.7,
						cs * 1.5,
						cs * 0.05,
						false
					);
					break;
				}
				case 'runeSpawn': {
					const [x, y] = this.center(sim, e.cell);
					this.burst(x, y, 10, [PAL.pat, PAL.patHi], cs * 1.4, 0.6, 0, cs * 0.04, true);
					break;
				}
				case 'bite': {
					const ax = ((e.alphaCell % sim.cols) + 1) * cs;
					const ay = (Math.floor(e.alphaCell / sim.cols) + 1) * cs;
					const [hx, hy] = this.center(sim, e.cell);
					this.pushT0 = t;
					this.pushX = ax / cs;
					this.pushY = ay / cs;
					this.crackT0 = t;
					this.burst(hx, hy, 12, [PAL.crim, PAL.crimHi], cs * 2.6, 0.45, 0, cs * 0.05, true);
					if (e.lostCells.length > 0) {
						this.addFloat(`−${e.lostCells.length}`, hx, hy - cs * 0.6, t, PAL.crimHi, cs * 0.6);
					}
					for (const lc of e.lostCells) {
						const [x, y] = this.center(sim, lc);
						this.burst(
							x,
							y,
							10,
							[PAL.stone, PAL.stoneLight, PAL.stoneDark],
							cs * 1.6,
							1.0,
							cs * 6,
							cs * 0.06,
							false,
							true
						);
					}
					this.shake(5);
					this.hitStopMs = 60;
					break;
				}
				case 'pillar': {
					const [x, y] = this.center(sim, e.cell);
					this.pillarRise.set(e.cell, t);
					this.burst(
						x,
						y,
						18,
						[PAL.stone, PAL.stoneLight, PAL.stoneDark],
						cs * 2,
						1.0,
						cs * 4,
						cs * 0.07,
						false,
						true
					);
					this.burst(x, y, 10, ['#cfd5d2'], cs * 1.2, 0.8, -cs * 0.4, cs * 0.05, false);
					this.shake(5);
					break;
				}
			}
		}
	}

	/** Название акта при старте игры. */
	announceAct(t: number, act: number): void {
		this.actT0 = t;
		this.actText = this.hooks.actLabel(act);
	}

	update(dt: number, t: number, sim: Sim): void {
		const ds = dt / 1000;
		for (let i = this.particles.length - 1; i >= 0; i--) {
			const p = this.particles[i];
			p.life -= ds;
			if (p.life <= 0) {
				this.particles.splice(i, 1);
				continue;
			}
			p.vy += p.grav * ds;
			p.x += p.vx * ds;
			p.y += p.vy * ds;
			p.vx *= 0.96;
		}
		for (let i = this.floats.length - 1; i >= 0; i--)
			if (t - this.floats[i].t0 > 1.4) this.floats.splice(i, 1);
		this.bulges = this.bulges.map((b) => b + ds * 7).filter((b) => b < sim.length);
		this.shakeMag *= Math.exp(-9 * ds);
		if (this.ghost && t - this.ghost.t0 > 1.1) this.ghost = null;
		if (this.ghost && t - this.ghost.t0 > 0.55 && t - this.ghost.t0 - ds <= 0.55) {
			this.burst(
				this.ghost.x,
				this.ghost.y,
				28,
				[PAL.gold, PAL.goldHi, '#ffd27a'],
				this.cs * 3.2,
				1.1,
				-this.cs * 0.6,
				this.cs * 0.07,
				true
			);
		}
		if (this.deathT0 >= 0) {
			const per = this.deathPer();
			while (
				this.crumbled < this.deathLen &&
				t - this.deathT0 > DEATH_LEAD + per * this.crumbled + 0.32
			) {
				const i = this.crumbled;
				if (i < sim.length) {
					const [x, y] = this.center(sim, sim.cellAt(i));
					this.burst(
						x,
						y,
						9,
						[PAL.stone, PAL.stoneLight, PAL.stoneDark],
						this.cs * 1.2,
						1.1,
						this.cs * 3,
						this.cs * 0.06,
						false,
						true
					);
				}
				this.crumbled++;
			}
		}
	}

	shake(m: number): void {
		this.shakeMag = Math.max(this.shakeMag, m);
	}

	shakeOffset(t: number): [number, number] {
		if (this.shakeMag < 0.3) return [0, 0];
		return [Math.sin(t * 91) * this.shakeMag, Math.cos(t * 73) * this.shakeMag];
	}

	/** Поправки к стилю аспида на текущий момент. */
	snakeStyle(t: number, len: number): Partial<AspidStyle> {
		const o: Partial<AspidStyle> = {};
		if (this.bulges.length) o.bulges = this.bulges;
		const ev = t - this.eatT0;
		if (ev < 0.7) o.flashBit = (i: number) => (i === 1 ? 1 - ev / 0.7 : 0);

		// Фоновая жизнь: раз в 5 секунд шипы встают волной.
		const idle = t % 5;
		if (idle < 1.4) o.wave = (idle / 1.2) * len;

		const ts = t - this.strikeT0;
		if (this.strikeOk && ts < 1.5) {
			o.strike = clamp01(ts / 0.15) * (ts > 1.0 ? clamp01(1 - (ts - 1.0) / 0.4) : 1);
			o.eyeGlow = ts < 1.2 ? 1 : 0;
			if (ts < 0.9) {
				o.sweep = (ts / 0.6) * len;
				o.wave = o.sweep;
			}
		}
		const tp = t - this.pushT0;
		if (tp < 0.6)
			o.push = { x: this.pushX, y: this.pushY, amt: 0.3 * Math.sin(clamp01(tp / 0.6) * Math.PI) };

		const tn = t - this.notT0;
		if (tn < 1.2) {
			const front = (tn / 0.8) * len;
			o.flip = (i: number) => i > front;
			o.flashAt = (i: number) => {
				const k = front - i;
				return k > 0 && k < 1.2 ? 1 - k / 1.2 : 0;
			};
			o.wave = front;
		}

		if (this.deathT0 >= 0) {
			const td = t - this.deathT0;
			const per = this.deathPer();
			o.grey = (i: number) => clamp01((td - DEATH_LEAD - per * i) / 0.18);
			let from = 0;
			for (let i = 0; i < len; i++) if (td - DEATH_LEAD - per * i > 0.32) from = i + 0.5;
			o.from = from;
			o.tongue = false;
			o.wave = null;
		}
		return o;
	}

	/** Трещина печати после провала. */
	sealCrack(t: number): number {
		const tc = t - this.crackT0;
		return tc < 0.9 ? clamp01(tc / 0.25) * (tc > 0.6 ? 1 - (tc - 0.6) / 0.3 : 1) : 0;
	}

	ghostStyle(t: number): { squeeze: number; flashA: number; alpha: number; thrash: number } | null {
		if (!this.ghost) return null;
		const te = t - this.ghost.t0;
		const dissolve = clamp01((te - 0.55) / 0.35);
		return {
			squeeze: clamp01(te / 0.45),
			flashA: 0.6 * Math.max(0, Math.sin(te * 14)) * (1 - dissolve),
			alpha: 1 - dissolve,
			thrash: te < 0.55 ? 0.6 : 0
		};
	}

	draw(c: CanvasRenderingContext2D, t: number, W: number, H: number, L: Light[]): void {
		const cs = this.cs;
		// ударная волна провала
		const tp = t - this.pushT0;
		if (tp < 0.6) {
			const rr = cs * (0.6 + tp * 5);
			c.strokeStyle = `rgba(224,56,79,${0.85 * (1 - tp / 0.6)})`;
			c.lineWidth = 3;
			c.beginPath();
			c.arc(this.pushX * cs, this.pushY * cs, rr, 0, Math.PI * 2);
			c.stroke();
		}
		// кольцо успеха
		if (this.ghost) {
			const te = t - this.ghost.t0;
			if (te < 0.7) {
				c.strokeStyle = `rgba(255,230,163,${0.8 * (1 - te / 0.7)})`;
				c.lineWidth = 2.5;
				c.beginPath();
				c.arc(this.ghost.x, this.ghost.y, cs * (0.5 + te * 4), 0, Math.PI * 2);
				c.stroke();
			}
		}
		for (const p of this.particles) {
			const a = p.life / p.max;
			c.globalAlpha = a;
			c.fillStyle = p.color;
			const sz = p.size * (0.5 + 0.5 * a);
			if (p.shard) {
				c.save();
				c.translate(p.x, p.y);
				c.rotate(p.life * 7);
				c.fillRect(-sz, -sz * 0.7, sz * 2, sz * 1.4);
				c.restore();
			} else {
				c.beginPath();
				c.arc(p.x, p.y, sz, 0, Math.PI * 2);
				c.fill();
			}
			if (p.glow) L.push([p.x, p.y, sz * 5, p.color, 0.4 * a]);
		}
		c.globalAlpha = 1;
		c.textAlign = 'center';
		c.textBaseline = 'middle';
		for (const f of this.floats) {
			const dt = t - f.t0;
			const a = dt < 1 ? 1 : 1 - (dt - 1) / 0.4;
			c.globalAlpha = Math.max(0, a);
			c.font = `${f.size}px ${FONT_DISPLAY}`;
			c.lineWidth = 3;
			c.strokeStyle = 'rgba(0,0,0,0.75)';
			c.strokeText(f.text, f.x, f.y - dt * cs * 0.7);
			c.fillStyle = f.color;
			c.fillText(f.text, f.x, f.y - dt * cs * 0.7);
		}
		c.globalAlpha = 1;
		const ta = t - this.actT0;
		if (ta < 2.4) {
			const a = ta < 0.3 ? ta / 0.3 : ta > 1.9 ? 1 - (ta - 1.9) / 0.5 : 1;
			c.globalAlpha = Math.max(0, a);
			c.fillStyle = 'rgba(0,0,0,0.45)';
			c.fillRect(0, H / 2 - cs * 1.3, W, cs * 2.6);
			c.font = `${cs * 1.25}px ${FONT_DISPLAY}`;
			c.lineWidth = 4;
			c.strokeStyle = 'rgba(0,0,0,0.8)';
			c.strokeText(this.actText[0], W / 2, H / 2 - cs * 0.3);
			c.fillStyle = PAL.goldHi;
			c.fillText(this.actText[0], W / 2, H / 2 - cs * 0.3);
			c.font = `${cs * 0.5}px ${FONT_DISPLAY}`;
			c.fillStyle = '#e6e0cf';
			c.fillText(this.actText[1], W / 2, H / 2 + cs * 0.65);
			c.globalAlpha = 1;
		}
	}

	private addFloat(
		text: string,
		x: number,
		y: number,
		t: number,
		color: string,
		size: number
	): void {
		this.floats.push({ text, x, y, t0: t, color, size });
	}

	private burst(
		x: number,
		y: number,
		n: number,
		colors: readonly string[],
		speed: number,
		life: number,
		grav: number,
		size: number,
		glow: boolean,
		shard = false
	): void {
		for (let i = 0; i < n; i++) {
			const a = Math.random() * Math.PI * 2;
			const v = speed * (0.35 + 0.65 * Math.random());
			const l = life * (0.6 + 0.4 * Math.random());
			this.particles.push({
				x,
				y,
				vx: Math.cos(a) * v,
				vy: Math.sin(a) * v - (grav > 0 ? speed * 0.4 : 0),
				life: l,
				max: l,
				size: size * (0.6 + Math.random() * 0.8),
				color: colors[i % colors.length],
				shard,
				grav,
				glow
			});
		}
		if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
	}
}
