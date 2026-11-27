// @ts-nocheck
// The fruit heroes reworked for the buff ("now"): see the changes marked `V2`. A copy of
// `freshHeroes.ts` (the owner's, "was"); throwaway.
import { Hero, Spring, mix, css, clamp01, easeOut, LIGHT } from '../../../src/games/pacman/render/actors/hero/Hero';
import { Wake } from '../../../src/games/pacman/render/actors/hero/heroWake';
import { clamp } from '../../../src/games/pacman/render/common/math';

export var FR_TAU = Math.PI * 2;
export var FR_BODY_RATIO = .295; // корпус 0.295T: чистый круг + бант + ледяная кромка строго внутри тайла 1×1!
export var FR_MAX_FX_R = 1.44;   // 0.295 * 1.44 = 0.425T (даже при импульсе укуса 1.1x -> 0.467T < 0.50T)
export var FR_AURA_MAX = 1.46;   // 0.295 * 1.46 = 0.431T — свежее сияние полностью гаснет внутри тайла
export var FR_ORG_INK = [66, 22, 4];     // тёплый тёмно-коричный контур #421604 (резко отделяет апельсин от песка!)
export var FR_MEL_INK = [12, 42, 20];    // глубокий хвойно-арбузный контур #0c2a14

/** Переводит мировой ключ света в локальную систему героя. */
function frLight(hero) {
	const ca = Math.cos(hero.angle);
	const sa = Math.sin(hero.angle);
	return {
		lx: LIGHT.x * ca + LIGHT.y * sa,
		ly: (-LIGHT.x * sa + LIGHT.y * ca) * hero.flip
	};
}

/** Чистая капля сока вдоль +X. */
function frJuiceDrop(ctx, len, wid) {
	ctx.beginPath();
	ctx.moveTo(len, 0);
	ctx.quadraticCurveTo(len * .16, -wid, -len * .52, -wid * .56);
	ctx.quadraticCurveTo(-len * .95, 0, -len * .52, wid * .56);
	ctx.quadraticCurveTo(len * .16, wid, len, 0);
	ctx.closePath();
}

/** Арбузная глянцевая семечка-капля (остриём в сторону -X, т.е. к центру плода). */
function frMelonSeed(ctx, len, wid) {
	ctx.beginPath();
	ctx.moveTo(-len, 0);
	ctx.quadraticCurveTo(-len * .12, -wid, len * .55, -wid * .62);
	ctx.quadraticCurveTo(len * 1.0, 0, len * .55, wid * .62);
	ctx.quadraticCurveTo(-len * .12, wid, -len, 0);
	ctx.closePath();
}

/** Прозрачный шипучий пузырёк газировки с чётким ободком и белой точкой-бликом. */
function frFizzBubble(ctx, x, y, r, rimColor, fillColor) {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, FR_TAU);
	ctx.fillStyle = fillColor;
	ctx.fill();
	ctx.strokeStyle = rimColor;
	ctx.lineWidth = Math.max(.85, r * .26);
	ctx.stroke();
	ctx.fillStyle = "#ffffff";
	ctx.beginPath();
	ctx.arc(x - r * .34, y - r * .34, Math.max(.65, r * .28), 0, FR_TAU);
	ctx.fill();
}

/**
* Уверенный чистый глаз-клин в глубокой контрастной оправе (не derpy, не стикер!):
* В обычном виде — сочный и чёткий на яркой мякоти; в баффе вспыхивает ледяным цианом/лимоном!
*/
function drawFreshWedgeEye(ctx, R, p, opts) {
	const { gazeX, gazeY, squint, inkRgb, coreRgb, buffRgb, haloRgb, isMs } = opts;
	const lod = R < 20 ? 1 + (20 - R) / 20 * .22 : 1;
	const gx = gazeX * R * .048;
	const gy = gazeY * R * .032;
	const ex = R * .245 + gx;
	const ey = -R * .33 + gy;

	ctx.save();
	ctx.translate(ex, ey);

	// При укусе / моргании — резкий весёлый горизонтальный росчерк
	if (squint > .68) {
		const w = R * .21 * lod;
		ctx.strokeStyle = p > .35 ? "#ffffff" : css(inkRgb);
		ctx.lineWidth = Math.max(1.6, R * .095);
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		ctx.beginPath();
		if (isMs) {
			ctx.moveTo(-w, R * .03);
			ctx.quadraticCurveTo(0, -R * .13, w * .96, -R * .04);
		} else {
			ctx.moveTo(-w * .85, -R * .07);
			ctx.lineTo(w * .78, R * .01);
			ctx.lineTo(-w * .85, R * .1);
		}
		ctx.stroke();
		ctx.restore();
		return;
	}

	ctx.rotate(isMs ? -.14 : .12);
	const w = R * .25 * lod;
	const h = R * (.13 + .02 * p) * lod * (1 - squint * .76);

	// Плотная тёмная оправа-углубление (обеспечивает 100% читаемость на яркой фруктовой мякоти!)
	ctx.fillStyle = css(inkRgb, .94);
	ctx.beginPath();
	if (isMs) {
		ctx.moveTo(-w * 1.2, h * .2);
		ctx.quadraticCurveTo(-w * .08, -h * 1.54, w * 1.24, -h * .4);
		ctx.quadraticCurveTo(w * .14, h * 1.32, -w * 1.2, h * .2);
	} else {
		ctx.moveTo(-w * 1.18, -h * .42);
		ctx.quadraticCurveTo(w * .08, -h * 1.12, w * 1.2, h * .08);
		ctx.quadraticCurveTo(w * .02, h * 1.42, -w * 1.18, -h * .42);
	}
	ctx.closePath();
	ctx.fill();

	// В баффе — свежее ледяное сияние вокруг клина
	if (p > .15) {
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		const g = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 1.6);
		g.addColorStop(0, css(haloRgb, .18 * p));
		g.addColorStop(1, css(haloRgb, 0));
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, w * 1.6, 0, FR_TAU);
		ctx.fill();
		ctx.restore();
	}

	// Сам чистый светящийся клин (тёплый кремовый в обычном виде -> ослепительно-ледяной в баффе!)
	ctx.beginPath();
	if (isMs) {
		ctx.moveTo(-w * .92, h * .16);
		ctx.quadraticCurveTo(-w * .08, -h * 1.12, w * 1.0, -h * .35);
		ctx.quadraticCurveTo(w * .12, h * .88, -w * .92, h * .16);
	} else {
		ctx.moveTo(-w * .92, -h * .34);
		ctx.lineTo(w * .96, h * .04);
		ctx.quadraticCurveTo(w * .06, h * 1.02, -w * .92, -h * .34);
	}
	ctx.closePath();

	const curCol = mix(coreRgb, buffRgb, p);
	const cg = ctx.createLinearGradient(-w, -h, w, h);
	cg.addColorStop(0, p > .3 ? "#ffffff" : css(curCol));
	cg.addColorStop(.52, "#ffffff");
	cg.addColorStop(1, css(curCol));
	ctx.fillStyle = cg;
	ctx.fill();

	ctx.restore();
}

/**
* БАЗОВЫЙ КЛАСС ФРУКТОВОЙ ПАРЫ (Апельсин × Арбуз):
* • `drawInside() {}` — чистый сквозной вырез (рот Пакмана буквально является отрезанной долькой!).
* • Чистый круг без ушек, хвостов и крыльев!
* • Физика сочной отдачи (`juiceSpring`) + шипучие пузырьки газировки в баффе («Ледяной фреш»).
*/
export var FreshFruitBase = class extends Hero {
	wake = new Wake();
	fizz = [];
	fizzDist = 0;
	windK = 0;
	bitePulse = 0;
	turnPulse = 0;
	juiceSpring = new Spring(0);
	lastMu = .4;
	lastMd = .4;

	/** Убираем круг за ртом — вырез выглядит как настоящая отрезанная долька фрукта! */
	drawInside() {}

	resetLooks() {
		this.fizz = [];
		this.fizzDist = 0;
		this.windK = 0;
		this.bitePulse = 0;
		this.turnPulse = 0;
		this.juiceSpring.value = 0;
		this.juiceSpring.velocity = 0;
		this.wake.clear();
	}
	gulp() {
		super.gulp();
		if (this.power > .25) this.emitFizz(1, false);
	}
	onBite() {
		this.bitePulse = 1;
		this.juiceSpring.velocity += 8.2;
		this.emitFizz(this.power > .35 ? 3 : 2, true);
	}
	onTurn() {
		this.turnPulse = 1;
		const dir = this.random() < .5 ? 1 : -1;
		this.juiceSpring.velocity += dir * 10.5;
		this.emitFizz(this.power > .35 ? 6 : 4, true);
		for (let i = 0; i < 6; i++) {
			this.spawn(this.particleFor("turn"), this.power > .45, this.angle + Math.PI + (this.random() - .5) * 1.4, 2.7 + this.random() * 2.5, true);
		}
	}
	emitFizz(count, isKick = false) {
		if (this.power > .35 && this.trailStyle !== 0) return; // V2: a flowing trail has no loose bubbles
		const R = this.r;
		const backX = -Math.cos(this.angle);
		const backY = -Math.sin(this.angle);
		const perpX = -backY;
		const perpY = backX;
		const isBuff = this.power > .35;
		for (let i = 0; i < count; i++) {
			const lat = (this.random() - .5) * R * (isKick ? 1.15 : .85);
			const spd = R * ((isKick ? 2.1 : 1.1) + this.random() * 1.55) * (isBuff ? 1.25 : 1);
			const life = (.28 + this.random() * .2) * (isBuff ? 1.35 : 1);
			this.fizz.push({
				x: this.x + backX * R * (.5 + this.random() * .35) + perpX * lat,
				y: this.y + backY * R * (.5 + this.random() * .35) + perpY * lat,
				vx: backX * spd + perpX * (this.random() - .5) * R * .85,
				vy: backY * spd + perpY * (this.random() - .5) * R * .85 - (isBuff ? R * .45 : 0),
				ang: this.angle + Math.PI + (this.random() - .5) * .4,
				size: R * ((isBuff ? .16 : .19) + this.random() * .11),
				life,
				max: life,
				buff: isBuff,
				isBubble: isBuff ? this.random() < .72 : this.random() < .25,
				alt: this.random() < .35
			});
		}
		if (this.fizz.length > 30) this.fizz.splice(0, this.fizz.length - 30);
	}
	scrollEffects(dx, dy, emitTrail) {
		for (const h of this.wake.hist) { h.x += dx; h.y += dy; }
		for (const e of this.embers) { e.x += dx; e.y += dy; }
		for (const f of this.fizz) { f.x += dx; f.y += dy; }
		const step = Math.hypot(dx, dy);
		if (emitTrail && step > .05) {
			this.travel += step / Math.max(1, this.r);
			this.roll += step / Math.max(1, this.r);
			const ux = -dx / step;
			const uy = -dy / step;
			this.stormDist += step;
			const gap = this.r * (this.power > .5 ? .34 : .58);
			while (this.stormDist >= gap) {
				this.stormDist -= gap;
				this.spawnStorm(ux, uy, this.power > .5 || this.ballOn);
			}
			this.fizzDist += step;
			const fGap = this.r * (this.power > .5 ? .4 : .92);
			while (this.fizzDist >= fGap) {
				this.fizzDist -= fGap;
				this.emitFizz(1, false);
			}
		}
	}
	afterUpdate(dt) {
		this.windK += ((this.moving ? 1 : 0) - this.windK) * Math.min(1, dt * 6);
		this.bitePulse = Math.max(0, this.bitePulse - dt / .26);
		this.turnPulse = Math.max(0, this.turnPulse - dt / .3);
		this.juiceSpring.step(0, dt, 120, 9.2);
		this.wake.push(this.x, this.y, this.time, this.moving ? 1 : 0);

		if (this.moving) {
			this.fizzDist += this.r * 3.8 * dt;
			const fGap = this.r * (this.power > .5 ? .42 : .98);
			if (this.fizzDist >= fGap) {
				this.fizzDist = 0;
				this.emitFizz(1, false);
			}
		}

		const drag = Math.pow(.89, dt * 60);
		for (const f of this.fizz) {
			f.life -= dt;
			f.x += f.vx * dt;
			f.y += f.vy * dt;
			f.vx *= drag;
			f.vy *= drag;
		}
		this.fizz = this.fizz.filter((f) => f.life > 0);
	}
	liftFor() { return 0; }

	/** V2: the buff's trail as a liquid (`trailStyle` 1 jet, 2 ripples, 3 fizzy; 0 keeps the old). */
	trailStyle = 1;
	/** V2: the base's golden dashes and drops would only crowd a flowing trail in the buff. */
	spawnStorm(ux, uy, hot) {
		if (this.power > .35 && this.trailStyle !== 0) return;
		super.spawnStorm(ux, uy, hot);
	}
	/**
	* V2: one smooth liquid ribbon, no particles. The centreline sways and the width swells and
	* thins as a wave that runs back along it, so it reads as a flow; layered from the outside in:
	* a dark teal edge, the cold sheath, the warm core, a gloss line, thin streaks running down it.
	*/
	drawBuffTrail(ctx, kit) {
		const R = this.r;
		const p = this.power;
		const t = this.time;
		const style = this.trailStyle;
		// the length is fixed in tiles, not in time, so a fast hero does not trail a snake: about a
		// tile and a third (`kit.len` in body radii), tapering to nothing at its end
		const raw = this.wake.points(t, { life: .5, width: R, capHead: R * .3, capTail: R * 1.5 })[0];
		if (!raw || raw.length < 5) return;
		const maxLen = R * (kit.len ?? 4.4);
		const cut = [];
		let acc = 0;
		for (let i = 0; i < raw.length; i++) {
			if (i > 0) acc += Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y);
			if (acc > maxLen) break;
			cut.push({ q: raw[i], s: acc });
		}
		if (cut.length < 5) return;
		const total = Math.max(1, cut[cut.length - 1].s);
		const amp = style === 2 ? .3 : .13;
		const wave = style === 2 ? 17 : 9;
		const pts = cut.map(({ q, s: sAlong }) => {
			const u = sAlong / total;
			const ramp = Math.min(1, u * 5);
			const off = Math.sin(u * 6.5 - t * 7.5) * R * (style === 2 ? .13 : .09) * Math.min(1, u * 3) * (kit.flip ?? 1);
			return {
				x: q.x + q.nx * off,
				y: q.y + q.ny * off,
				nx: q.nx,
				ny: q.ny,
				u,
				a: 1,
				w: R * .95 * ramp * Math.pow(1 - u, .85) * (1 + amp * Math.sin(u * wave - t * 9) * ramp)
			};
		});
		const head = pts[0];
		const tail = pts[pts.length - 1];
		const edge = (f, side) => pts.map((q) => ({ x: q.x + q.nx * q.w * f * side, y: q.y + q.ny * q.w * f * side }));
		const smooth = (list, first) => {
			for (let i = 1; i < list.length - 1; i++) {
				const m = { x: (list[i].x + list[i + 1].x) / 2, y: (list[i].y + list[i + 1].y) / 2 };
				ctx.quadraticCurveTo(list[i].x, list[i].y, m.x, m.y);
			}
			ctx.lineTo(list[list.length - 1].x, list[list.length - 1].y);
		};
		const ribbonPath = (f) => {
			const L = edge(f, 1);
			const Rr = edge(f, -1).reverse();
			ctx.beginPath();
			ctx.moveTo(L[0].x, L[0].y);
			smooth(L);
			ctx.lineTo(Rr[0].x, Rr[0].y);
			smooth(Rr);
			ctx.closePath();
		};
		const grad = (stops) => {
			const g = ctx.createLinearGradient(head.x, head.y, tail.x, tail.y);
			for (const [at, rgb, al] of stops) g.addColorStop(at, css(rgb, al * p));
			return g;
		};
		ctx.save();
		ctx.lineJoin = "round";
		ctx.lineCap = "round";
		// the dark edge keeps the liquid against a pale path and a green hedge
		ribbonPath(1.14);
		ctx.fillStyle = grad([[0, kit.dark, .0], [.1, kit.dark, .85], [.7, kit.dark, .5], [1, kit.dark, 0]]);
		ctx.fill();
		// the cold sheath
		ribbonPath(1);
		ctx.fillStyle = style === 3
			? grad([[0, [236, 255, 255], .0], [.1, [236, 255, 255], .62], [.6, kit.ice, .4], [1, kit.ice, 0]])
			: grad([[0, [236, 255, 255], .0], [.1, [236, 255, 255], .96], [.55, kit.ice, .8], [1, kit.ice, 0]]);
		ctx.fill();
		// the warm core
		ribbonPath(style === 3 ? .46 : .64);
		ctx.fillStyle = grad([[0, kit.core0, .0], [.1, kit.core0, 1], [.6, kit.core1, .9], [1, kit.core1, 0]]);
		ctx.fill();
		// the gloss, on the side that faces the light
		const lit = pts.reduce((s2, q) => s2 + (q.nx * -.6 + q.ny * -.8), 0) >= 0 ? 1 : -1;
		const gloss = edge(style === 2 ? .6 : .42, lit);
		ctx.beginPath();
		ctx.moveTo(gloss[1].x, gloss[1].y);
		for (let i = 2; i < Math.floor(gloss.length * .72); i++) ctx.lineTo(gloss[i].x, gloss[i].y);
		ctx.strokeStyle = css([255, 255, 255], .78 * p);
		ctx.lineWidth = Math.max(1, R * .1);
		ctx.stroke();
		if (style === 2) {
			// ripples: arcs across the flow that run back with it
			for (let k = 0; k < 3; k++) {
				const u = (k / 3 + t * .55) % 1;
				const q = pts[Math.min(pts.length - 1, Math.round(u * (pts.length - 1)))];
				if (q.w < R * .12) continue;
				const bow = R * .16;
				ctx.beginPath();
				ctx.moveTo(q.x + q.nx * q.w * .92, q.y + q.ny * q.w * .92);
				ctx.quadraticCurveTo(q.x - q.ny * bow, q.y + q.nx * bow, q.x - q.nx * q.w * .92, q.y - q.ny * q.w * .92);
				ctx.strokeStyle = css([255, 255, 255], .6 * p * (1 - u) * q.a);
				ctx.lineWidth = Math.max(1, R * .08);
				ctx.stroke();
			}
		} else {
			// streaks running down the flow
			for (const [ph, f] of [[0, .3], [2.3, -.28]]) {
				ctx.beginPath();
				for (let i = 1; i < pts.length - 2; i++) {
					const q = pts[i];
					const o = q.w * f * (.6 + .4 * Math.sin(q.u * 9 - t * 10 + ph));
					const x = q.x + q.nx * o;
					const y = q.y + q.ny * o;
					if (i === 1) ctx.moveTo(x, y);
					else ctx.lineTo(x, y);
				}
				ctx.strokeStyle = css(style === 3 ? [255, 255, 255] : kit.core0, .5 * p);
				ctx.lineWidth = Math.max(.8, R * .06);
				ctx.stroke();
			}
		}
		if (style === 3) {
			// a few fine bubbles inside the liquid, rising along it: the soda
			for (let k = 0; k < 4; k++) {
				const u = (k * .23 + t * .35) % 1;
				const q = pts[Math.min(pts.length - 1, Math.round(u * (pts.length - 1)))];
				if (q.w < R * .2) continue;
				const o = q.w * .5 * Math.sin(k * 2.1 + t * 3);
				ctx.beginPath();
				ctx.arc(q.x + q.nx * o, q.y + q.ny * o, Math.max(.9, R * .1), 0, FR_TAU);
				ctx.fillStyle = css([255, 255, 255], .55 * p * (1 - u));
				ctx.fill();
				ctx.strokeStyle = css([255, 255, 255], .9 * p * (1 - u));
				ctx.lineWidth = Math.max(.6, R * .035);
				ctx.stroke();
			}
		}
		ctx.restore();
	}

	/**
	* КОНТУР ФРУКТА + ХРУСТЯЩАЯ КРОМКА ИНЕЯ В БАФФЕ («Ледяной фреш»):
	* • В обычном виде: одна сочная тёмная обводка, которая чисто отделяет кожуру от песка и стен.
	* • В баффе: кожура не темнеет, а покрывается хрустящим морозным ободком инея
	*   (тонкая тёмно-ледяная кайма снаружи + сверкающий кристально-белый/ледяной иней!).
	*/
	drawSilhouetteOutline(ctx, outline, R, p, lx, ly, pal, mu, md) {
		this.lastMu = mu;
		this.lastMd = md;
		const inkRgb = pal.ink;

		ctx.save();
		outline(ctx);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		if (p > .05) {
			// 1. Внешняя тонкая тёмно-ледяная окантовка — чтобы белый иней звенел на ярком дневном песке!
			ctx.strokeStyle = css([8, 52, 80], .97 * p);
			ctx.lineWidth = Math.max(3.4, R * .27);
			ctx.stroke();

			// 2. Хрустящий морозно-белый ободок инея по всему силуэту!
			ctx.strokeStyle = css(mix(inkRgb, [244, 255, 255], p));
			ctx.lineWidth = Math.max(1.9, R * .12);
			ctx.stroke();

			// 3. Несколько крошечных кристаллов-льдинок инея прямо на кромке (строго <= 1.19R!)
			const startA = md + .24;
			const endA = FR_TAU - mu - .24;
			const span = endA - startA;
			if (span > 1.2) {
				const count = R >= 13 ? 6 : 3;
				for (let i = 0; i < count; i++) {
					const a = startA + (i + .5) / count * span;
					const pulse = .85 + .22 * Math.sin(this.time * 6 + i * 1.7);
					const h = R * (.13 * p * pulse);
					const rBase = R * 1.03;
					const wA = .08;
					ctx.beginPath();
					ctx.moveTo(Math.cos(a - wA) * rBase, Math.sin(a - wA) * rBase);
					ctx.lineTo(Math.cos(a) * (rBase + h), Math.sin(a) * (rBase + h));
					ctx.lineTo(Math.cos(a + wA) * rBase, Math.sin(a + wA) * rBase);
					ctx.closePath();
					ctx.fillStyle = i % 2 === 0 ? "#ffffff" : "#9af4ff";
					ctx.fill();
					ctx.strokeStyle = "rgba(12,68,104,.82)";
					ctx.lineWidth = Math.max(.65, R * .034);
					ctx.stroke();
				}
			}
		} else {
			ctx.strokeStyle = css(inkRgb);
			ctx.lineWidth = Math.max(1.5, R * .12);
			ctx.stroke();
		}
		ctx.restore();
	}

	/** Внутренние губы выреза-дольки (светлая белая плёнка дольки у апельсина, чёткий край у арбуза). */
	drawLips(ctx, lips, R) {
		const p = this.power;
		const col = p > .25 ? [236, 254, 255] : this.design.calm.ink;
		ctx.lineCap = "round";
		ctx.lineJoin = "round";
		if (p > .25) {
			// V2: a dark line under the light one, so the cut keeps its edge on the paler flesh
			ctx.strokeStyle = css([8, 52, 80], .85 * p);
			ctx.lineWidth = Math.max(2.1, R * .13);
			lips();
			ctx.stroke();
		}
		ctx.strokeStyle = css(col, .95);
		ctx.lineWidth = Math.max(1.2, R * (.056 + .018 * p));
		lips();
		ctx.stroke();
	}

	/** Внутренние шипучие пузырьки газировки в баффе (поднимаются внутри мякоти!). */
	drawInternalFizz(sc, R, p) {
		if (p <= .12 || R < 10) return;
		const t = this.time;
		sc.save();
		for (let i = 0; i < 6; i++) {
			const u = (t * (.72 + (i % 3) * .18) + i * .17) % 1;
			const x = (-R * .54 + (i % 3) * R * .42) + Math.sin(t * 5 + i * 2.1) * R * .08;
			const y = R * (.62 - u * 1.18);
			const br = Math.max(1.0, R * (.048 + (i % 2) * .028) * Math.sin(u * Math.PI));
			if (br < .5) continue;
			sc.beginPath();
			sc.arc(x, y, br, 0, FR_TAU);
			sc.fillStyle = `rgba(255,255,255,${(.48 * p).toFixed(2)})`;
			sc.fill();
			sc.strokeStyle = `rgba(255,255,255,${(.92 * p).toFixed(2)})`;
			sc.lineWidth = Math.max(.65, br * .26);
			sc.stroke();
		}
		sc.restore();
	}
};

// ===========================================================================
// 1. АПЕЛЬСИН (OrangeFreshHero — Pac-Man)
// • Сочный мандариново-оранжевый срез: глянцевая цедра-ободок + тонкое
//   белое кольцо мякоти + 7 чётких радиальных долек!
// • Сам открывающийся рот Пакмана работает как отрезанная долька апельсина!
// • Бафф («Ледяной Фреш / Цитрус-Содовая»): мякоть вспыхивает неоново-лимонным
//   и ледяным апельсиновым соком, кожура покрывается инеем, внутри и позади
//   кипят шипучие пузырьки газировки!
// ===========================================================================
var ORANGE_CALM = {
	light: [255, 224, 96],
	mid: [255, 138, 18],
	shadow: [232, 82, 6],
	deep: [158, 42, 4],
	bounce: [255, 232, 128],
	ink: FR_ORG_INK,
	highlight: [255, 255, 255],
	rim: [255, 240, 178]
};
var ORANGE_AWOKEN = {
	light: [255, 226, 120],
	mid: [255, 152, 28],
	shadow: [238, 96, 10],
	deep: [170, 52, 6],
	bounce: [176, 252, 255],
	ink: FR_ORG_INK,
	highlight: [255, 255, 255],
	rim: [212, 254, 255]
};
var ORANGE_DESIGN = {
	id: "pacman-summer-orange-v1",
	calm: ORANGE_CALM,
	awoken: ORANGE_AWOKEN,
	hinge: .04,
	inside: { mid: [0, 0, 0], deep: [0, 0, 0] },
	mouthSpan: .74,
	grinRest: .14,
	grinRun: .05,
	chompRate: 4.5,
	flare: [255, 216, 56],
	death: "open",
	bands: [.1, .34, .74]
};

export var OrangeFreshHero = class extends FreshFruitBase {
	design = ORANGE_DESIGN;
	blink = -1;
	nextBlink = 2.9;
	blinks = 0;

	afterUpdate(dt) {
		super.afterUpdate(dt);
		if (this.blink >= 0) {
			this.blink += dt;
			if (this.blink > .13) this.blink = -1;
		} else if (this.time > this.nextBlink) {
			this.blink = 0;
			this.blinks += 1;
			this.nextBlink = this.time + 2.9 + (this.blinks % 3) * 1.1;
		}
	}
	draw(ctx) {
		this.drawOrangeJuiceTrail(ctx);
		super.draw(ctx);
	}
	/**
	* ШЛЕЙФ АПЕЛЬСИНА:
	* • Обычный: яркий сочный мандариново-оранжевый след сока + брызги.
	* • Бафф («Цитрусовая Газировка»): сверкающий ледяной лимонно-апельсиновый поток
	*   с морозно-белой кромкой и шипучими прозрачными пузырьками!
	*/
	drawOrangeJuiceTrail(ctx) {
		const R = this.r;
		const p = this.power;
		const long = 1 + .46 * p;
		const sway = (u) => Math.sin(u * 7.0 - this.time * 6.4) * R * .09 * Math.min(1, u * 3);

		if (p >= .35 && this.trailStyle !== 0) {
			this.drawBuffTrail(ctx, { dark: [12, 62, 92], core0: [255, 200, 48], core1: [255, 140, 20], ice: [70, 214, 248], fruit: 'orange' });
			return;
		}
		if (p < .35) {
			// Тонкая тёплая кайма, чтобы оранжевый сок не сливался с песком
			this.wake.draw(ctx, this.time, {
				life: .42,
				width: R * .54,
				capHead: R * .4,
				capTail: R * 2.3,
				add: false,
				shift: sway,
				widen: (u) => 1 - u * .68,
				color: (u, a) => css(mix([226, 76, 6], [156, 40, 4], u), .84 * a * (1 - u * .86))
			});
			// Яркий апельсиновый фреш
			this.wake.draw(ctx, this.time, {
				life: .38,
				width: R * .34,
				capHead: R * .34,
				capTail: R * 2.0,
				add: false,
				shift: sway,
				widen: (u) => 1 - u * .72,
				color: (u, a) => css(mix([255, 212, 58], [255, 132, 14], u), .95 * a * (1 - u * .82))
			});
		} else {
			// БАФФ: ЛЕДЯНАЯ ЦИТРУСОВАЯ ГАЗИРОВКА + ШИПУЧАЯ ПЕНА!
			// 1. Внешняя ледяная мятно-голубая кайма холода (отлично контрастирует с тёплым песком!)
			this.wake.draw(ctx, this.time, {
				life: .52 * long,
				width: R * (.68 + .1 * p),
				capHead: R * .4,
				capTail: R * 2.5,
				add: false,
				shift: sway,
				widen: (u) => 1 - u * .64,
				color: (u, a) => css(mix([52, 214, 248], [22, 146, 212], u), .86 * p * a * (1 - u * .84))
			});

			// 2. Яркий неоново-лимонный и мандариновый поток фреша внутри
			this.wake.draw(ctx, this.time, {
				life: .48 * long,
				width: R * .44,
				capHead: R * .36,
				capTail: R * 2.25,
				add: false,
				shift: sway,
				widen: (u) => 1 - u * .7,
				color: (u, a) => css(mix([255, 248, 128], [255, 148, 18], u), .96 * a * (1 - u * .8))
			});

			// 3. Белая шипучая полоса газировки по центру
			this.wake.draw(ctx, this.time, {
				life: .4 * long,
				width: R * .15,
				capHead: R * .3,
				capTail: R * 1.9,
				add: true,
				shift: (u) => -Math.sin(u * 10 - this.time * 9.2) * R * .12 * Math.min(1, u * 3),
				widen: (u) => 1 - u * .76,
				color: (u, a) => css([242, 254, 255], .94 * a * (1 - u))
			});
		}

		// Брызги сока и шипучие пузырьки газировки!
		if (this.fizz.length) {
			ctx.save();
			for (const f of this.fizz) {
				const u = clamp01(f.life / f.max);
				const a = Math.min(1, (1 - u) * 6) * u;
				if (a <= .02) continue;
				ctx.save();
				ctx.globalAlpha = a;
				if (f.isBubble) {
					const br = Math.max(1.8, f.size * (.62 + .58 * (1 - u)));
					frFizzBubble(ctx, f.x, f.y, br, f.buff ? "#e4fcff" : "#fff4cc", f.buff ? "rgba(120,240,255,.32)" : "rgba(255,214,72,.28)");
				} else {
					const sz = Math.max(1.7, f.size * (.5 + .5 * u));
					ctx.translate(f.x, f.y);
					ctx.rotate(f.ang);
					frJuiceDrop(ctx, sz * 1.25, sz * .66);
					ctx.fillStyle = f.buff ? (f.alt ? "#98f4ff" : "#fff066") : (f.alt ? "#ffcf38" : "#ff7c0c");
					ctx.fill();
					ctx.strokeStyle = css(FR_ORG_INK, .72);
					ctx.lineWidth = Math.max(.6, sz * .15);
					ctx.stroke();
				}
				ctx.restore();
			}
			ctx.restore();
		}
	}
	drawAura(ctx, R, p) {
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		const g = ctx.createRadialGradient(0, 0, R * .74, 0, 0, R * FR_AURA_MAX);
		g.addColorStop(0, css(mix([255, 198, 64], [148, 248, 255], p), .2 + .1 * p));
		g.addColorStop(.55, css(mix([255, 126, 18], [255, 176, 40], p), .08 + .03 * p));
		g.addColorStop(1, "rgba(255,148,22,0)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R * FR_AURA_MAX, 0, FR_TAU);
		ctx.fill();
		ctx.restore();
	}
	/**
	* СРЕЗ СПЕЛОГО АПЕЛЬСИНА (в координатах `decorate`):
	* 1. Яркая цедра-кожура по краю (0.84R..1.00R) — в баффе охлаждается ледяным инеем!
	* 2. Чёткое белое кольцо альбедо (0.76R..0.84R) — мгновенная узнаваемость на 16px!
	* 3. 7 сочных радиальных долек, сходящихся к белой сердцевине (рот = отрезанная долька!).
	* 4. Один чистый глянцевый блик сока сверху-слева + шипучие пузырьки в баффе!
	*/
	decorate(sc, R, p) {
		const { lx, ly } = frLight(this);
		const flex = clamp(this.juiceSpring.value * .04, -.14, .14);

		// 1. Внешний слой: цедра апельсина (в баффе получает ледяной оттенок инея)
		const peelG = sc.createRadialGradient(lx * R * .28, ly * R * .28, R * .1, 0, 0, R * 1.08);
		peelG.addColorStop(0, css(mix([255, 146, 12], [255, 222, 62], p)));
		peelG.addColorStop(.68, css(mix([244, 96, 6], [255, 146, 14], p)));
		peelG.addColorStop(1, css(mix([194, 58, 4], [128, 224, 244], p)));
		sc.fillStyle = peelG;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);

		// Крошечные поры цедры на ободке (видны на крупном стенде)
		if (R >= 18 && p < .6) {
			sc.fillStyle = `rgba(148,42,4,${(.28 * (1 - p)).toFixed(2)})`;
			for (let i = 0; i < 14; i++) {
				const a = i * FR_TAU / 14 + .2;
				const rad = R * (.91 + (i % 2) * .04);
				sc.beginPath();
				sc.arc(Math.cos(a) * rad, Math.sin(a) * rad, Math.max(.7, R * .022), 0, FR_TAU);
				sc.fill();
			}
		}

		// 2. Характерное светлое белое кольцо альбедо (сразу отделяет кожуру от долек!)
		sc.fillStyle = p > .4 ? "#f0feff" : "#fff6e0";
		sc.beginPath();
		sc.arc(0, 0, R * .84, 0, FR_TAU);
		sc.fill();

		// 3. Сочная мякоть цитруса (в баффе вспыхивает электро-лимоном и свежим мандарином!)
		const pulpR = R * .765;
		const pulpG = sc.createRadialGradient(lx * R * .22, ly * R * .22, R * .04, 0, 0, pulpR * 1.05);
		pulpG.addColorStop(0, css(mix([255, 226, 76], [255, 254, 174], p)));
		pulpG.addColorStop(.58, css(mix([255, 152, 18], [255, 212, 34], p)));
		pulpG.addColorStop(1, css(mix([234, 92, 8], [255, 134, 16], p)));
		sc.fillStyle = pulpG;
		sc.beginPath();
		sc.arc(0, 0, pulpR, 0, FR_TAU);
		sc.fill();

		// 4. Радиальные сочные дольки (6 чётких лучей-перегородок вокруг выреза рта!)
		const cx = R * .04;
		const cy = 0;
		const wedgeAngles = [-2.45, -1.78, -1.08, 1.08, 1.78, 2.45, Math.PI];

		// Лёгкая тёплая тень внутри каждой дольки ближе к корке для объёма
		sc.save();
		sc.strokeStyle = p > .4 ? "rgba(255,255,255,.92)" : "rgba(255,248,224,.94)";
		sc.lineWidth = Math.max(1.05, R * (.058 + .012 * this.bitePulse));
		sc.lineCap = "round";
		for (const baseA of wedgeAngles) {
			const a = baseA + flex * Math.sin(baseA);
			sc.beginPath();
			sc.moveTo(cx, cy);
			sc.lineTo(cx + Math.cos(a) * R * .82, cy + Math.sin(a) * R * .82);
			sc.stroke();
		}

		// Аккуратная белая звёздочка-сердцевина в точке схождения долек
		sc.fillStyle = p > .4 ? "#ffffff" : "#fff7e2";
		sc.beginPath();
		sc.arc(cx, cy, Math.max(1.4, R * .105), 0, FR_TAU);
		sc.fill();
		sc.restore();

		// 5. Шипучие пузырьки газировки внутри долек в режиме баффа!
		this.drawInternalFizz(sc, R, p);

		// 6. Один чистый глянцевый блик сока сверху-слева
		sc.fillStyle = "rgba(255,255,255,.88)";
		sc.beginPath();
		sc.ellipse(lx * R * .48, ly * R * .48, R * .25, R * .095, Math.atan2(ly, lx) + Math.PI / 2, 0, FR_TAU);
		sc.fill();
	}
	drawWorn(ctx, R, p) {
		const blink = this.blink >= 0 ? Math.sin(this.blink / .13 * Math.PI) : 0;
		const squint = Math.max(blink, this.bitePulse * .76);
		drawFreshWedgeEye(ctx, R, p, {
			gazeX: this.gazeX,
			gazeY: this.gazeY,
			squint,
			inkRgb: FR_ORG_INK,
			coreRgb: [255, 244, 178],
			buffRgb: [192, 254, 255],
			haloRgb: [128, 248, 255],
			isMs: false
		});
	}
	/** Шар портала: целый катящийся спелый апельсин с зелёной плодоножкой-звёздочкой! */
	paintBallPattern(ctx, R, p) {
		const g = ctx.createRadialGradient(-R * .24, -R * .24, R * .05, 0, 0, R * .98);
		g.addColorStop(0, p > .4 ? "#fff48a" : "#ffbe2c");
		g.addColorStop(.55, p > .4 ? "#ff9c14" : "#ff7208");
		g.addColorStop(1, p > .4 ? "#64e8ff" : "#cc4404");
		ctx.fillStyle = g;
		ctx.beginPath(); ctx.arc(0, 0, R * .92, 0, FR_TAU); ctx.fill();

		// Лёгкие поры кожуры
		ctx.fillStyle = "rgba(154,48,4,.26)";
		for (let i = 0; i < 8; i++) {
			const a = i * FR_TAU / 8;
			ctx.beginPath();
			ctx.arc(Math.cos(a) * R * .55, Math.sin(a) * R * .55, Math.max(.9, R * .055), 0, FR_TAU);
			ctx.fill();
		}

		// Зелёная звёздочка-плодоножка на полюсе шара (крутится при перекатывании!)
		ctx.fillStyle = "#2ba83e";
		ctx.strokeStyle = "#12421c";
		ctx.lineWidth = Math.max(.8, R * .05);
		ctx.beginPath();
		for (let i = 0; i < 10; i++) {
			const a = i * Math.PI / 5;
			const rad = i % 2 === 0 ? R * .3 : R * .13;
			if (i === 0) ctx.moveTo(Math.cos(a) * rad, Math.sin(a) * rad);
			else ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
		}
		ctx.closePath();
		ctx.fill();
		ctx.stroke();
	}
	particleFor() { return "orangeDrop"; }
	swirlFor() { return .24; }
	sizeFor() { return 1.18; }
	drawParticle(ctx, e, a, s) {
		const ang = Math.atan2(e.vy, e.vx);
		const sz = Math.max(1.7, s * (e.hot ? 1.24 : 1.0));
		const isBub = e.hot && (e.lane ?? 0) > Math.PI * .75;
		ctx.save();
		ctx.globalAlpha = a;
		if (isBub) {
			frFizzBubble(ctx, e.x, e.y, Math.max(1.6, sz * .88), "#e6feff", "rgba(128,244,255,.32)");
		} else {
			ctx.translate(e.x, e.y);
			ctx.rotate(ang);
			frJuiceDrop(ctx, sz * 1.2, sz * .62);
			ctx.fillStyle = e.hot ? "#fff066" : "#ff8812";
			ctx.fill();
			ctx.strokeStyle = css(FR_ORG_INK, .74);
			ctx.lineWidth = Math.max(.55, sz * .15);
			ctx.stroke();
		}
		ctx.restore();
	}
	drawBursts(ctx) {
		const R = this.r;
		for (const b of this.bursts) {
			const k = b.t / .48;
			const ease = easeOut(k);
			const a = 1 - k;
			const rad = R * (.95 + 2.3 * ease);
			ctx.save();
			ctx.translate(b.x, b.y);
			ctx.strokeStyle = `rgba(56,220,255,${(.84 * a).toFixed(3)})`;
			ctx.lineWidth = R * .28 * a;
			ctx.beginPath(); ctx.arc(0, 0, rad, 0, FR_TAU); ctx.stroke();

			ctx.strokeStyle = `rgba(255,244,124,${(.96 * a).toFixed(3)})`;
			ctx.lineWidth = Math.max(1.4, R * .14 * a);
			ctx.beginPath(); ctx.arc(0, 0, rad * .95, 0, FR_TAU); ctx.stroke();
			ctx.restore();
		}
	}
};

// ===========================================================================
// 2. АРБУЗ (WatermelonFreshHero — Ms. Pac-Man)
// • Полосатая тёмно-зелёная/изумрудная корка + тонкое белое кольцо +
//   сочная рубиново-малиновая мякоть + 5 глянцевых чёрных семечек!
// • СКУЛЬПТУРНЫЙ СОЛНЕЧНО-ЛИМОННЫЙ БАНТ с V-хвостиками и свежим мятным
//   узелком (максимальный контраст на малиновой мякоти, зелёной корке и
//   зелёных стенах лабиринта! Строго <= 1.41R = 0.416T в тайле 1×1!).
// • Бафф («Арбузный Сорбет / Газировка»): корка покрывается морозным инеем,
//   мякоть сияет освежающим неоново-арбузным сорбетом с пузырьками газировки!
// ===========================================================================
var MELON_CALM = {
	light: [255, 114, 146],
	mid: [252, 42, 86],
	shadow: [204, 16, 60],
	deep: [122, 8, 36],
	bounce: [132, 236, 152],
	ink: FR_MEL_INK,
	highlight: [255, 255, 255],
	rim: [232, 255, 224]
};
var MELON_AWOKEN = {
	light: [255, 172, 198],
	mid: [248, 52, 104],
	shadow: [214, 20, 76],
	deep: [140, 10, 52],
	bounce: [164, 254, 255],
	ink: FR_MEL_INK,
	highlight: [255, 255, 255],
	rim: [212, 254, 255]
};
var MELON_DESIGN = {
	id: "ms-pacman-summer-watermelon-v1",
	calm: MELON_CALM,
	awoken: MELON_AWOKEN,
	hinge: .06,
	inside: { mid: [0, 0, 0], deep: [0, 0, 0] },
	mouthSpan: .72,
	grinRest: .13,
	grinRun: .05,
	chompRate: 4.8,
	flare: [255, 96, 146],
	death: "spin",
	bands: [.1, .32, .74]
};

export var WatermelonFreshHero = class extends FreshFruitBase {
	design = MELON_DESIGN;
	bowSway = new Spring(0);
	blink = -1;
	nextBlink = 2.2;
	blinks = 0;

	resetLooks() {
		super.resetLooks();
		this.bowSway.value = 0;
		this.bowSway.velocity = 0;
	}
	onBite() {
		super.onBite();
		this.bowSway.velocity += 5.0;
	}
	onTurn() {
		super.onTurn();
		const dir = this.random() < .5 ? 1 : -1;
		this.bowSway.velocity += dir * 6.0;
	}
	afterUpdate(dt) {
		super.afterUpdate(dt);
		this.bowSway.step(.04 * Math.sin(this.time * 3.0) - .055 * this.windK, dt, 130, 8.4);

		if (this.blink >= 0) {
			this.blink += dt;
			if (this.blink > .13) this.blink = -1;
		} else if (this.time > this.nextBlink) {
			this.blink = 0;
			this.blinks += 1;
			this.nextBlink = this.time + (this.blinks % 4 === 0 ? .32 : 2.4 + (this.blinks % 3) * 1.1);
		}
	}
	draw(ctx) {
		this.drawMelonJuiceTrail(ctx);
		super.draw(ctx);
	}
	/**
	* ШЛЕЙФ АРБУЗА:
	* • Обычный: яркий рубиново-арбузный фреш с тонкой свежей зелёной каймой.
	* • Бафф («Арбузная Газировка»): охлаждённый розово-малиновый и мятно-ледяной
	*   шипучий поток с прозрачными пузырьками и каплями сока!
	*/
	drawMelonJuiceTrail(ctx) {
		const R = this.r;
		const p = this.power;
		const long = 1 + .46 * p;
		const sway = (u) => -Math.sin(u * 7.8 - this.time * 7.2) * R * .1 * Math.min(1, u * 3);

		if (p >= .35 && this.trailStyle !== 0) {
			this.drawBuffTrail(ctx, { dark: [8, 70, 60], core0: [255, 110, 150], core1: [240, 46, 100], ice: [96, 240, 214], fruit: 'melon', flip: -1 });
			return;
		}
		if (p < .35) {
			// Свежая арбузно-зелёная тонкая подложка (отделяет сок от песка)
			this.wake.draw(ctx, this.time, {
				life: .42,
				width: R * .54,
				capHead: R * .4,
				capTail: R * 2.3,
				add: false,
				shift: sway,
				widen: (u) => 1 - u * .68,
				color: (u, a) => css(mix([24, 136, 56], [14, 78, 34], u), .82 * a * (1 - u * .86))
			});
			// Сочная малиновая арбузная лента внутри
			this.wake.draw(ctx, this.time, {
				life: .38,
				width: R * .34,
				capHead: R * .34,
				capTail: R * 2.0,
				add: false,
				shift: sway,
				widen: (u) => 1 - u * .72,
				color: (u, a) => css(mix([255, 76, 118], [226, 22, 68], u), .95 * a * (1 - u * .82))
			});
		} else {
			// БАФФ: ЛЕДЯНАЯ АРБУЗНО-МЯТНАЯ ГАЗИРОВКА + ПУЗЫРЬКИ!
			this.wake.draw(ctx, this.time, {
				life: .52 * long,
				width: R * (.68 + .1 * p),
				capHead: R * .4,
				capTail: R * 2.5,
				add: false,
				shift: sway,
				widen: (u) => 1 - u * .64,
				color: (u, a) => css(mix([86, 248, 224], [24, 178, 168], u), .86 * p * a * (1 - u * .84))
			});

			this.wake.draw(ctx, this.time, {
				life: .48 * long,
				width: R * .44,
				capHead: R * .36,
				capTail: R * 2.25,
				add: false,
				shift: sway,
				widen: (u) => 1 - u * .7,
				color: (u, a) => css(mix([255, 118, 164], [244, 34, 92], u), .96 * a * (1 - u * .8))
			});

			this.wake.draw(ctx, this.time, {
				life: .4 * long,
				width: R * .15,
				capHead: R * .3,
				capTail: R * 1.9,
				add: true,
				shift: (u) => Math.sin(u * 10.5 - this.time * 9.8) * R * .12 * Math.min(1, u * 3),
				widen: (u) => 1 - u * .76,
				color: (u, a) => css([242, 255, 252], .94 * a * (1 - u))
			});
		}

		// Брызги арбузного сока и шипучие пузырьки газировки!
		if (this.fizz.length) {
			ctx.save();
			for (const f of this.fizz) {
				const u = clamp01(f.life / f.max);
				const a = Math.min(1, (1 - u) * 6) * u;
				if (a <= .02) continue;
				ctx.save();
				ctx.globalAlpha = a;
				if (f.isBubble) {
					const br = Math.max(1.8, f.size * (.62 + .58 * (1 - u)));
					frFizzBubble(ctx, f.x, f.y, br, f.buff ? "#e6fffb" : "#ffe6ee", f.buff ? "rgba(136,252,236,.32)" : "rgba(255,104,142,.28)");
				} else {
					const sz = Math.max(1.7, f.size * (.5 + .5 * u));
					ctx.translate(f.x, f.y);
					ctx.rotate(f.ang);
					frJuiceDrop(ctx, sz * 1.25, sz * .66);
					ctx.fillStyle = f.buff ? (f.alt ? "#8efee8" : "#ff689c") : (f.alt ? "#ff6b92" : "#ef2254");
					ctx.fill();
					ctx.strokeStyle = css(FR_MEL_INK, .72);
					ctx.lineWidth = Math.max(.6, sz * .15);
					ctx.stroke();
				}
				ctx.restore();
			}
			ctx.restore();
		}
	}
	drawAura(ctx, R, p) {
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		const g = ctx.createRadialGradient(0, 0, R * .74, 0, 0, R * FR_AURA_MAX);
		g.addColorStop(0, css(mix([255, 118, 152], [146, 252, 240], p), .2 + .1 * p));
		g.addColorStop(.55, css(mix([42, 186, 86], [255, 76, 134], p), .08 + .03 * p));
		g.addColorStop(1, "rgba(24,158,68,0)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R * FR_AURA_MAX, 0, FR_TAU);
		ctx.fill();
		ctx.restore();
	}
	/**
	* СРЕЗ СПЕЛОГО АРБУЗА (в координатах `decorate`):
	* 1. Полосатая зелёная корка (0.82R..1.00R) — в баффе покрывается ледяной мятной глазурью инея!
	* 2. Тонкое светлое белое/мятное кольцо (0.74R..0.82R) — мгновенно считывается на любом масштабе!
	* 3. Сочная рубиново-малиновая мякоть (0..0.74R) с 5 глянцевыми чёрными семечками!
	* 4. Один чистый блик сока сверху-слева + шипучие пузырьки в баффе!
	*/
	decorate(sc, R, p) {
		const { lx, ly } = frLight(this);
		const flex = clamp(this.juiceSpring.value * .035, -.12, .12);

		// 1. Внешняя зелёная корка арбуза (в баффе — морозно-мятная ледяная корка!)
		const rindG = sc.createRadialGradient(lx * R * .28, ly * R * .28, R * .1, 0, 0, R * 1.08);
		rindG.addColorStop(0, css(mix([52, 198, 86], [136, 252, 232], p)));
		rindG.addColorStop(.68, css(mix([28, 146, 58], [46, 206, 186], p)));
		rindG.addColorStop(1, css(mix([14, 92, 36], [24, 138, 146], p)));
		sc.fillStyle = rindG;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);

		// Чёткие тёмно-зелёные арбузные полоски на корке!
		sc.save();
		sc.strokeStyle = p > .4 ? "rgba(18,108,118,.58)" : "rgba(10,58,24,.78)";
		sc.lineWidth = Math.max(1.3, R * .09);
		sc.lineCap = "round";
		for (let i = 0; i < 9; i++) {
			const a = i * FR_TAU / 9 + .25;
			sc.beginPath();
			sc.moveTo(Math.cos(a) * R * .82, Math.sin(a) * R * .82);
			sc.lineTo(Math.cos(a + .08) * R * 1.04, Math.sin(a + .08) * R * 1.04);
			sc.stroke();
		}
		sc.restore();

		// 2. Тонкое светло-кремовое/мятное кольцо под коркой (иконический контраст арбуза!)
		sc.fillStyle = p > .4 ? "#e6fffb" : "#f2ffe8";
		sc.beginPath();
		sc.arc(0, 0, R * .82, 0, FR_TAU);
		sc.fill();

		// 3. Сочная рубиново-малиновая мякоть (в баффе — яркий охлаждённый арбузный сорбет!)
		const fleshR = R * .745;
		const fleshG = sc.createRadialGradient(lx * R * .22, ly * R * .22, R * .04, 0, 0, fleshR * 1.05);
		fleshG.addColorStop(0, css(mix([255, 108, 138], [255, 174, 206], p)));
		fleshG.addColorStop(.55, css(mix([252, 42, 86], [255, 68, 128], p)));
		fleshG.addColorStop(1, css(mix([198, 16, 56], [226, 26, 86], p)));
		sc.fillStyle = fleshG;
		sc.beginPath();
		sc.arc(0, 0, fleshR, 0, FR_TAU);
		sc.fill();

		// 4. 5 аккуратных глянцевых чёрных семечек арбуза (расставлены в стороне от глаза и рта!)
		const seedAngles = [-2.55, -1.85, 2.58, 1.88, 1.15];
		const seedLen = Math.max(1.8, R * .125);
		const seedWid = Math.max(1.0, R * .066);
		for (let i = 0; i < seedAngles.length; i++) {
			const a = seedAngles[i] + flex * (i % 2 ? 1 : -1);
			const dist = R * (.44 + (i % 2) * .08);
			sc.save();
			sc.translate(Math.cos(a) * dist, Math.sin(a) * dist);
			sc.rotate(a);
			frMelonSeed(sc, seedLen, seedWid);
			sc.fillStyle = "#1c0e12";
			sc.fill();
			// Крошечный блик на глянцевой семечке
			if (R >= 16) {
				sc.fillStyle = "rgba(255,255,255,.72)";
				sc.beginPath();
				sc.arc(seedLen * .18, -seedWid * .2, Math.max(.55, seedWid * .25), 0, FR_TAU);
				sc.fill();
			}
			sc.restore();
		}

		// 5. Шипучие пузырьки газировки внутри мякоти в баффе!
		this.drawInternalFizz(sc, R, p);

		// 6. Один чистый глянцевый блик сока сверху-слева
		sc.fillStyle = "rgba(255,255,255,.88)";
		sc.beginPath();
		sc.ellipse(lx * R * .48, ly * R * .48, R * .24, R * .092, Math.atan2(ly, lx) + Math.PI / 2, 0, FR_TAU);
		sc.fill();
	}
	/**
	* СКУЛЬПТУРНЫЙ СОЛНЕЧНО-ЛИМОННЫЙ БАНТ МИСС ПАКМАН С МЯТНЫМ УЗЕЛКОМ:
	* • Ярко-лимонный шёлк с V-хвостиками, тёмно-хвойной чёткой обводкой (не теряется
	*   ни на малиновой мякоти, ни на зелёной корке, ни на стенах лабиринта!).
	* • Свежий изумрудно-мятный узелок в центре связывает бант с арбузной коркой.
	* • Строго <= 1.40R = 0.413T (с импульсом укуса 1.1x -> 0.454T < 0.500T).
	*/
	drawLemonBow(ctx, R, p) {
		const phaseOn = p > .2;
		const ba = -.65 * Math.PI;
		const dist = R * .87;
		const sway = clamp(this.bowSway.value, -.16, .16);
		const scale = 1 + .03 * p;
		const ink = phaseOn ? "#e2feff" : css(FR_MEL_INK);
		const inkW = Math.max(1.25, R * (phaseOn ? .068 : .082));
		const outerDarkW = Math.max(2.15, R * .135);

		const bw = R * .76;
		const bh = R * .43;

		const strokeWithMode = () => {
			if (phaseOn) {
				ctx.strokeStyle = "rgba(12,62,92,.92)";
				ctx.lineWidth = outerDarkW;
				ctx.stroke();
			}
			ctx.strokeStyle = ink;
			ctx.lineWidth = inkW;
			ctx.stroke();
		};

		const tailPath = (side) => {
			const s = side;
			ctx.beginPath();
			ctx.moveTo(s * bw * .06, bh * .1);
			ctx.quadraticCurveTo(s * bw * .32, bh * .42, s * bw * .46, bh * .86);
			ctx.lineTo(s * bw * .26, bh * .73);
			ctx.lineTo(s * bw * .14, bh * .92);
			ctx.quadraticCurveTo(s * bw * .1, bh * .54, 0, bh * .22);
			ctx.closePath();
		};

		const wingPath = (side) => {
			const s = side;
			ctx.beginPath();
			ctx.moveTo(0, -bh * .12);
			ctx.bezierCurveTo(s * bw * .32, -bh * 1.02, s * bw * .98, -bh * .86, s * bw * 1.0, -bh * .06);
			ctx.bezierCurveTo(s * bw * .96, bh * .6, s * bw * .42, bh * .66, 0, bh * .2);
			ctx.closePath();
		};

		ctx.save();
		ctx.translate(Math.cos(ba) * dist, Math.sin(ba) * dist);
		ctx.rotate(ba + Math.PI / 2 + sway);
		ctx.scale(scale, scale);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		// 0. Мягкая контактная тень под бантом на арбузной корке
		ctx.save();
		ctx.fillStyle = "rgba(10,36,18,.38)";
		ctx.beginPath();
		ctx.ellipse(0, bh * .24, bw * .84, bh * .42, 0, 0, FR_TAU);
		ctx.fill();
		ctx.restore();

		// 1. Хвостики-ленты с V-вырезом (насыщенный солнечно-янтарный жёлтый)
		for (const side of [-1, 1]) {
			tailPath(side);
			const tg = ctx.createLinearGradient(0, bh * .1, side * bw * .44, bh * .92);
			tg.addColorStop(0, "#ffd828");
			tg.addColorStop(1, "#e28804");
			ctx.fillStyle = tg;
			ctx.fill();
			strokeWithMode();
		}

		// 2. Расклешённые солнечно-лимонные крылья с внутренним шёлковым объёмом
		for (const side of [-1, 1]) {
			wingPath(side);
			const lg = ctx.createLinearGradient(0, -bh * .95, side * bw * .8, bh * .6);
			lg.addColorStop(0, "#fff89c");
			lg.addColorStop(.45, "#ffe028");
			lg.addColorStop(1, "#f09608");
			ctx.fillStyle = lg;
			ctx.fill();

			// Внутренние складки и блик внутри clip (не затирают контур крыла!)
			ctx.save();
			wingPath(side);
			ctx.clip();

			ctx.fillStyle = "rgba(255,255,240,.82)";
			ctx.beginPath();
			ctx.ellipse(side * bw * .5, -bh * .44, bw * .36, bh * .15, side * .22, 0, FR_TAU);
			ctx.fill();

			if (R >= 10) {
				ctx.strokeStyle = "rgba(154,74,4,.56)";
				ctx.lineWidth = Math.max(.95, R * .05);
				ctx.beginPath();
				ctx.moveTo(side * bw * .08, bh * .04);
				ctx.quadraticCurveTo(side * bw * .34, -bh * .05, side * bw * .52, bh * .03);
				ctx.stroke();
			}
			ctx.restore();

			// Полная чёткая обводка всего крыла!
			wingPath(side);
			strokeWithMode();
		}

		// 3. Компактный свежий мятно-лаймовый узелок в центре банта!
		const kw = Math.max(1.9, R * .148);
		const kh = Math.max(2.4, R * .205);
		ctx.beginPath();
		ctx.roundRect(-kw, -kh + bh * .04, kw * 2, kh * 2, Math.min(kw, kh) * .72);
		const kg = ctx.createLinearGradient(-kw, -kh, kw, kh);
		kg.addColorStop(0, p > .35 ? "#e6fffb" : "#9effa8");
		kg.addColorStop(.5, p > .35 ? "#5cf4dc" : "#28c858");
		kg.addColorStop(1, p > .35 ? "#148c8a" : "#127834");
		ctx.fillStyle = kg;
		ctx.fill();
		strokeWithMode();

		ctx.fillStyle = "#ffffff";
		ctx.beginPath();
		ctx.arc(-kw * .3, -kh * .3 + bh * .04, Math.max(.7, kw * .26), 0, FR_TAU);
		ctx.fill();

		ctx.restore();
	}
	drawWorn(ctx, R, p) {
		this.drawLemonBow(ctx, R, p);
		const blink = this.blink >= 0 ? Math.sin(this.blink / .13 * Math.PI) : 0;
		const squint = Math.max(blink, this.bitePulse * .76);
		drawFreshWedgeEye(ctx, R, p, {
			gazeX: this.gazeX,
			gazeY: this.gazeY,
			squint,
			inkRgb: FR_MEL_INK,
			coreRgb: [255, 244, 198],
			buffRgb: [176, 254, 246],
			haloRgb: [118, 252, 236],
			isMs: true
		});
	}
	/** Шар портала: целый миниатюрный полосатый арбузик! */
	paintBallPattern(ctx, R, p) {
		const g = ctx.createRadialGradient(-R * .24, -R * .24, R * .05, 0, 0, R * .98);
		g.addColorStop(0, p > .4 ? "#98fff0" : "#5ae074");
		g.addColorStop(.58, p > .4 ? "#26c4b2" : "#229e44");
		g.addColorStop(1, p > .4 ? "#10747c" : "#0e5a24");
		ctx.fillStyle = g;
		ctx.beginPath(); ctx.arc(0, 0, R * .92, 0, FR_TAU); ctx.fill();

		// Изогнутые тёмные полосы арбуза, сходящиеся к полюсу
		ctx.strokeStyle = p > .4 ? "rgba(10,82,92,.72)" : "rgba(10,56,22,.82)";
		ctx.lineWidth = Math.max(1.4, R * .14);
		ctx.lineCap = "round";
		for (let k = 0; k < 4; k++) {
			ctx.save();
			ctx.rotate(k * Math.PI / 2);
			ctx.beginPath();
			ctx.moveTo(0, 0);
			ctx.quadraticCurveTo(R * .42, R * .22, R * .92, 0);
			ctx.stroke();
			ctx.restore();
		}
		ctx.fillStyle = p > .4 ? "#e8fffb" : "#12421c";
		ctx.beginPath(); ctx.arc(0, 0, R * .14, 0, FR_TAU); ctx.fill();
	}
	particleFor() { return "melonDrop"; }
	swirlFor() { return .3; }
	sizeFor() { return 1.18; }
	drawParticle(ctx, e, a, s) {
		const ang = Math.atan2(e.vy, e.vx);
		const sz = Math.max(1.7, s * (e.hot ? 1.24 : 1.0));
		const isBub = e.hot && (e.lane ?? 0) > Math.PI * .75;
		ctx.save();
		ctx.globalAlpha = a;
		if (isBub) {
			frFizzBubble(ctx, e.x, e.y, Math.max(1.6, sz * .88), "#e8fffc", "rgba(136,252,236,.32)");
		} else {
			ctx.translate(e.x, e.y);
			ctx.rotate(ang);
			frJuiceDrop(ctx, sz * 1.2, sz * .62);
			ctx.fillStyle = e.hot ? "#ff76a6" : "#f22458";
			ctx.fill();
			ctx.strokeStyle = css(FR_MEL_INK, .74);
			ctx.lineWidth = Math.max(.55, sz * .15);
			ctx.stroke();
		}
		ctx.restore();
	}
	drawBursts(ctx) {
		const R = this.r;
		for (const b of this.bursts) {
			const k = b.t / .48;
			const ease = easeOut(k);
			const a = 1 - k;
			const rad = R * (.95 + 2.3 * ease);
			ctx.save();
			ctx.translate(b.x, b.y);
			ctx.strokeStyle = `rgba(92,248,226,${(.86 * a).toFixed(3)})`;
			ctx.lineWidth = R * .28 * a;
			ctx.beginPath(); ctx.arc(0, 0, rad, 0, FR_TAU); ctx.stroke();

			ctx.strokeStyle = `rgba(255,104,152,${(.96 * a).toFixed(3)})`;
			ctx.lineWidth = Math.max(1.4, R * .14 * a);
			ctx.beginPath(); ctx.arc(0, 0, rad * .95, 0, FR_TAU); ctx.stroke();
			ctx.restore();
		}
	}
};
//#endregion
