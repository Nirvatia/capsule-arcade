// @ts-nocheck
// Throwaway: Gemini's "Heat and Frost" heroes (EmberAshHero, FrostMistHero), lifted verbatim
// from the owner's preview page (heat-frost-summer-preview.html) onto our own Hero, so the
// hero-art page shows them on the real worlds and moments. The base to improve; not game code.
import {
	Hero,
	Spring,
	clamp01,
	css,
	easeOut,
	glow,
	mix
} from '../../../src/games/pacman/render/actors/hero/Hero';
import { Wake } from '../../../src/games/pacman/render/actors/hero/heroWake';
import { clamp } from '../../../src/games/pacman/render/common/math';

const LIGHT = (() => {
	const n = Math.hypot(-0.55, -0.83);
	return { x: -0.55 / n, y: -0.83 / n };
})();

var HF_TAU = Math.PI * 2;
var HF_BODY_RATIO = .295; // компактный радиус корпуса (0.295T): корпус + орбита + бант 100% внутри тайла 1×1!
var HF_ORBIT_MAX = 1.44;  // 0.295 * 1.44 = 0.425T (даже с импульсом укуса 1.1x -> 0.467T < 0.50T)
var HF_AURA_MAX = 1.54;   // 0.295 * 1.54 = 0.454T — полное затухание ореола внутри тайла
var HF_FIRE_INK = [36, 20, 24]; // единый тёплый контур #241418 в стиле черепашек и сезонной еды
var HF_ICE_INK = [29, 35, 54];  // глубокий морозно-чернильный контур #1d2336 для льда

/**
* Предзапечённый объёмный штамп дыма/пара (5 смещённых мягких лепестков) —
* живой клубящийся пепел и ледяной пар на 60 FPS без просадки кадров.
*/
var hfSmokeCache = new Map();
function getHfSmokeStamp(key, coreRgba, midRgba, edgeRgba) {
	let c = hfSmokeCache.get(key);
	if (c) return c;
	c = document.createElement("canvas");
	c.width = c.height = 96;
	const g = c.getContext("2d");
	const lobes = [
		{ x: 48, y: 48, r: 36, a: .95 },
		{ x: 35, y: 43, r: 28, a: .78 },
		{ x: 61, y: 44, r: 26, a: .74 },
		{ x: 47, y: 60, r: 27, a: .72 },
		{ x: 46, y: 34, r: 24, a: .68 }
	];
	for (const lb of lobes) {
		const gr = g.createRadialGradient(lb.x, lb.y, 0, lb.x, lb.y, lb.r);
		gr.addColorStop(0, coreRgba);
		gr.addColorStop(.52, midRgba);
		gr.addColorStop(1, edgeRgba);
		g.globalAlpha = lb.a;
		g.fillStyle = gr;
		g.beginPath();
		g.arc(lb.x, lb.y, lb.r, 0, HF_TAU);
		g.fill();
	}
	hfSmokeCache.set(key, c);
	return c;
}

/** 4-лучевая острая искра / снежинка-кристалл. */
function hfStar4(ctx, cx, cy, big, small, rot = 0) {
	ctx.beginPath();
	for (let i = 0; i < 8; i++) {
		const a = rot + i * Math.PI / 4;
		const r = i % 2 === 0 ? big : small;
		const x = cx + Math.cos(a) * r;
		const y = cy + Math.sin(a) * r;
		if (i === 0) ctx.moveTo(x, y);
		else ctx.lineTo(x, y);
	}
	ctx.closePath();
}

/** Переводит мировой ключ света в локальную систему героя. */
function hfLight(hero) {
	const ca = Math.cos(hero.angle);
	const sa = Math.sin(hero.angle);
	return {
		lx: LIGHT.x * ca + LIGHT.y * sa,
		ly: (-LIGHT.x * sa + LIGHT.y * ca) * hero.flip
	};
}

/** Плавное усиление читаемости глаза в мелком масштабе лабиринта (R ~ 8–12px). */
function hfEyeLod(R) {
	return R < 20 ? 1 + (20 - R) / 20 * .24 : 1;
}

/** Маленький острый клычок при широком укусе (чистый рот, ZERO помады). */
function drawHfFang(ctx, R, ends, inkCss, scale = .95) {
	if (ends.U.y >= -R * .28) return;
	const fx = ends.A.x + (ends.U.x - ends.A.x) * .68;
	const fy = ends.A.y + (ends.U.y - ends.A.y) * .68;
	ctx.fillStyle = "#ffffff";
	ctx.strokeStyle = inkCss;
	ctx.lineWidth = Math.max(.7, R * .034);
	ctx.lineJoin = "round";
	ctx.beginPath();
	ctx.moveTo(fx - R * .048 * scale, fy + R * .005);
	ctx.lineTo(fx + R * .048 * scale, fy + R * .026);
	ctx.lineTo(fx + R * .006, fy + R * .13 * scale);
	ctx.closePath();
	ctx.fill();
	ctx.stroke();
}

/**
* Две гладкие, стремительные орбитальные ленты стихии в баффе:
* строго внутри HF_ORBIT_MAX (1.44 R = 0.425 T) — никогда не вылезают за тайл!
*/
function drawElementalVeils(ctx, R, k, t, colMain, colCore, dirSign) {
	ctx.save();
	ctx.rotate(t * 4.0 * dirSign);
	ctx.lineCap = "round";

	for (let i = 0; i < 2; i++) {
		ctx.save();
		ctx.rotate(i * Math.PI);
		const rOut = Math.min(R * HF_ORBIT_MAX, R * (1.18 + .25 * k));
		const rIn = R * (1.06 + .04 * k);

		ctx.beginPath();
		ctx.arc(0, 0, rOut, -1.08, .96, false);
		ctx.arc(-R * .06, 0, rIn, .82, -.92, true);
		ctx.closePath();

		const gr = ctx.createLinearGradient(0, -rOut, 0, rOut);
		gr.addColorStop(0, css(colMain, 0));
		gr.addColorStop(.32, css(colMain, .88 * k));
		gr.addColorStop(.68, css(colCore, .96 * k));
		gr.addColorStop(1, css(colMain, 0));
		ctx.fillStyle = gr;
		ctx.fill();

		ctx.globalCompositeOperation = "lighter";
		ctx.strokeStyle = css(colCore, .94 * k);
		ctx.lineWidth = Math.max(.85, R * .046);
		ctx.beginPath();
		ctx.arc(0, 0, rOut * .97, -.74, .74);
		ctx.stroke();
		ctx.globalCompositeOperation = "source-over";
		ctx.restore();
	}
	ctx.restore();
}

/**
* Базовый класс для стихийных клубов «Жара и Стужи»:
* - живые объёмные клубы пепельного дыма / морозного пара с инерцией на поворотах
* - компактная ширина по коридору лабиринта
* - внутренняя подсветка стихией в баффе
*/
var ElementalVaporBase = class extends Hero {
	wake = new Wake();
	puffs = [];
	puffAccum = 0;
	windK = 0;
	bitePulse = 0;
	turnPulse = 0;

	resetLooks() {
		this.puffs = [];
		this.puffAccum = 0;
		this.windK = 0;
		this.bitePulse = 0;
		this.turnPulse = 0;
		this.wake.clear();
	}
	onBite() {
		this.bitePulse = 1;
		this.emitVaporPuff(true, 1.1);
	}
	onTurn() {
		this.turnPulse = 1;
		for (let i = 0; i < 4; i++) {
			this.emitVaporPuff(true, .96 + i * .1);
		}
		for (let i = 0; i < 6; i++) {
			this.spawn("spark", this.power > .45, this.angle + Math.PI + (this.random() - .5) * 1.4, 2.9 + this.random() * 2.6, true);
		}
	}
	emitVaporPuff(isKick = false, sizeMul = 1) {
		const R = this.r;
		const p = this.power;
		const backX = -Math.cos(this.angle);
		const backY = -Math.sin(this.angle);
		const perpX = -backY;
		const perpY = backX;
		const lat = (this.random() - .5) * R * (isKick ? .72 : .46);
		const spdBack = R * ((isKick ? 1.75 : .95) + this.random() * 1.35) * (1 + .32 * p);
		const spdSide = (this.random() - .5) * R * (isKick ? 2.1 : .95);
		const maxLife = (.44 + this.random() * .24) * (1 + .3 * p);

		this.puffs.push({
			x: this.x + backX * R * .48 + perpX * lat,
			y: this.y + backY * R * .48 + perpY * lat,
			vx: backX * spdBack + perpX * spdSide,
			vy: backY * spdBack + perpY * spdSide,
			rot: this.random() * HF_TAU,
			spin: (this.random() - .5) * (3.6 + 2.4 * p),
			r0: R * (.37 + this.random() * .16) * sizeMul,
			r1: R * (.76 + this.random() * .28 + .2 * p) * sizeMul,
			life: maxLife,
			max: maxLife,
			hot: p > .45 || isKick,
			swirlSign: this.random() < .5 ? 1 : -1
		});
		if (this.puffs.length > 44) this.puffs.shift();
	}
	scrollEffects(dx, dy, emitTrail) {
		for (const h of this.wake.hist) { h.x += dx; h.y += dy; }
		for (const e of this.embers) { e.x += dx; e.y += dy; }
		for (const f of this.puffs) { f.x += dx; f.y += dy; }
		const step = Math.hypot(dx, dy);
		if (emitTrail && step > .05) {
			this.travel += step / Math.max(1, this.r);
			this.roll += step / Math.max(1, this.r);
			const ux = -dx / step;
			const uy = -dy / step;
			this.stormDist += step;
			const gap = this.r * (this.power > .5 ? .3 : .52);
			while (this.stormDist >= gap) {
				this.stormDist -= gap;
				this.spawnStorm(ux, uy, this.power > .5 || this.ballOn);
			}
		}
	}
	afterUpdate(dt) {
		this.windK += ((this.moving ? 1 : 0) - this.windK) * Math.min(1, dt * 6);
		this.bitePulse = Math.max(0, this.bitePulse - dt / .26);
		this.turnPulse = Math.max(0, this.turnPulse - dt / .28);
		this.wake.push(this.x, this.y, this.time, this.moving ? 1 : 0);

		this.puffAccum += dt;
		const spawnInterval = this.moving
			? (this.power > .45 ? .023 : .035)
			: (this.power > .45 ? .072 : .135);
		while (this.puffAccum >= spawnInterval) {
			this.puffAccum -= spawnInterval;
			this.emitVaporPuff(false, this.moving ? 1 : .76);
		}

		const drag = Math.pow(.92, dt * 60);
		for (const f of this.puffs) {
			f.life -= dt;
			const age = f.max - f.life;
			const curl = Math.sin(age * 7 + f.rot) * this.r * .4 * f.swirlSign;
			f.x += (f.vx + curl * .35) * dt;
			f.y += (f.vy - (this.moving ? 0 : this.r * .65)) * dt;
			f.vx *= drag;
			f.vy *= drag;
			f.rot += f.spin * dt;
		}
		this.puffs = this.puffs.filter((f) => f.life > 0);
	}
	drawVaporClouds(ctx, stampBase, stampEdge, stampHot, baseAlpha, hotAlpha, alwaysHot = 0) {
		if (!this.puffs.length) return;
		ctx.save();
		for (const f of this.puffs) {
			const u = 1 - clamp01(f.life / f.max);
			const fadeIn = Math.min(1, u * 6);
			const fadeOut = Math.pow(1 - u, 1.35);
			const a = fadeIn * fadeOut;
			if (a <= .015) continue;
			const rad = f.r0 + (f.r1 - f.r0) * easeOut(u);
			const size = rad * 2.2;

			ctx.save();
			ctx.translate(f.x, f.y);
			ctx.rotate(f.rot);

			if (stampEdge) {
				ctx.globalCompositeOperation = "source-over";
				ctx.globalAlpha = a * baseAlpha * .5;
				ctx.drawImage(stampEdge, -size * .56, -size * .56, size * 1.12, size * 1.12);
			}

			ctx.globalCompositeOperation = "source-over";
			ctx.globalAlpha = a * baseAlpha;
			ctx.drawImage(stampBase, -size * .5, -size * .5, size, size);

			const glowAmt = Math.max(alwaysHot * (1 - u * .75), this.power * (f.hot ? 1 : .7));
			if (glowAmt > .06 && stampHot) {
				ctx.globalCompositeOperation = "lighter";
				ctx.globalAlpha = a * hotAlpha * glowAmt;
				const hs = size * .8;
				ctx.drawImage(stampHot, -hs * .5, -hs * .5, hs, hs);
			}
			ctx.restore();
		}
		ctx.restore();
	}
	liftFor() { return 0; }
};

// ===========================================================================
// 1. ЖАР — ПЕПЕЛЬНОЕ ПЛАМЯ (EmberAshHero — Pac-Man)
// Яркий золотисто-янтарный огненный дух (0.295T, 100% узнаваемый Пакман!)
// с единым тёплым контуром #241418.
// За ним клубится ГУСТОЙ ТЁМНЫЙ ПЕПЕЛЬНЫЙ ДЫМ (драматичный контраст на песке
// и снегу!), внутри которого тлеют и летят раскалённые оранжево-золотые угли!
// ===========================================================================
var EMBER_CALM = {
	light: [255, 250, 176],
	mid: [255, 200, 38],
	shadow: [238, 114, 20],
	deep: [176, 48, 14],
	bounce: [255, 162, 54],
	ink: HF_FIRE_INK,
	highlight: [255, 255, 240],
	rim: [255, 244, 176]
};
var EMBER_AWOKEN = {
	light: [255, 255, 236],
	mid: [255, 236, 98],
	shadow: [255, 144, 24],
	deep: [216, 56, 16],
	bounce: [255, 212, 88],
	ink: HF_FIRE_INK,
	highlight: [255, 255, 255],
	rim: [255, 252, 204]
};
var EMBER_DESIGN = {
	id: "pacman-ember-ash",
	calm: EMBER_CALM,
	awoken: EMBER_AWOKEN,
	hinge: .06,
	inside: { mid: [212, 62, 22], deep: [68, 14, 12] },
	mouthSpan: .76,
	grinRest: .18,
	grinRun: .07,
	chompRate: 4.6,
	flare: [255, 164, 42],
	death: "open",
	bands: [.1, .34, .74]
};

var EmberAshHero = class extends ElementalVaporBase {
	design = EMBER_DESIGN;

	draw(ctx) {
		this.drawAshFlameStream(ctx);
		super.draw(ctx);
	}
	/** Главная фишка Жара: густой тёмный пепельный дым + раскалённая огненная жила внутри! */
	drawAshFlameStream(ctx) {
		const R = this.r;
		const p = this.power;
		const long = 1 + .42 * p;

		const ashStamp = getHfSmokeStamp("ash", "rgba(26,17,19,0.90)", "rgba(44,28,28,0.64)", "rgba(38,24,24,0)");
		const sootEdge = getHfSmokeStamp("ashEdge", "rgba(68,32,22,0.56)", "rgba(46,24,20,0.28)", "rgba(36,18,16,0)");
		const emberHot = getHfSmokeStamp("emberHot", "rgba(255,214,82,0.96)", "rgba(255,96,24,0.52)", "rgba(214,42,14,0)");

		// 1. Тягучая лента тёмного пепельного дыма (резкий контраст и днём, и на снегу!)
		this.wake.draw(ctx, this.time, {
			life: .48 * long,
			width: R * (.68 + .2 * p),
			capHead: R * .42,
			capTail: R * 2.3,
			add: false,
			shift: (u) => -Math.sin(u * 6.5 - this.time * 5.2) * R * .15 * Math.min(1, u * 3),
			color: (u, a) => `rgba(38,24,24,${((.46 + .12 * p) * a * (1 - u * .9)).toFixed(3)})`
		});

		this.wake.draw(ctx, this.time, {
			life: .44 * long,
			width: R * (.52 + .16 * p),
			capHead: R * .35,
			capTail: R * 2.15,
			add: false,
			shift: (u) => Math.sin(u * 8 - this.time * 6.5) * R * .12 * Math.min(1, u * 3),
			color: (u, a) => `rgba(22,15,18,${((.82 + .1 * p) * a * (1 - u * .88)).toFixed(3)})`
		});

		// 2. Живые клубы пепельного дыма (слегка тлеют изнутри даже в обычном виде, и ПОЛЫХАЮТ в баффе!)
		this.drawVaporClouds(ctx, ashStamp, sootEdge, emberHot, .86, .66, .24);

		// 3. Раскалённая золотисто-оранжевая струя огня сквозь центр тёмного пепла!
		this.wake.draw(ctx, this.time, {
			life: .38 * long,
			width: R * (.11 + .1 * p),
			capHead: R * .35,
			capTail: R * 1.95,
			add: true,
			shift: (u) => Math.sin(u * 11 - this.time * 10.2) * R * (.12 + .07 * p) * Math.min(1, u * 3),
			color: (u, a) => css(mix([255, 240, 134], [255, 76, 18], Math.min(1, u * 1.2)), (.68 + .28 * p) * a * (1 - u))
		});
	}
	drawAura(ctx, R, p) {
		ctx.save();
		// Лёгкая тёплая дымка-подложка
		const sh = ctx.createRadialGradient(0, 0, R * .78, 0, 0, R * 1.38);
		sh.addColorStop(0, "rgba(36,16,14,0.34)");
		sh.addColorStop(.65, "rgba(36,16,14,0.12)");
		sh.addColorStop(1, "rgba(36,16,14,0)");
		ctx.fillStyle = sh;
		ctx.beginPath();
		ctx.arc(0, 0, R * 1.38, 0, HF_TAU);
		ctx.fill();

		// Тёплое солнечное свечение костра (в баффе — жаркий ореол строго <= HF_AURA_MAX)
		ctx.globalCompositeOperation = "lighter";
		const eg = ctx.createRadialGradient(0, 0, R * .76, 0, 0, R * HF_AURA_MAX);
		eg.addColorStop(0, `rgba(255,204,64,${(.32 + .44 * p).toFixed(3)})`);
		eg.addColorStop(.52, `rgba(255,96,24,${(.12 + .24 * p).toFixed(3)})`);
		eg.addColorStop(1, "rgba(255,82,18,0)");
		ctx.fillStyle = eg;
		ctx.beginPath();
		ctx.arc(0, 0, R * HF_AURA_MAX, 0, HF_TAU);
		ctx.fill();
		ctx.restore();
	}
	/** Бафф «Огненный Вихрь»: две гладкие раскалённые ленты пламени (строго <= 1.44 R = 0.425 T!). */
	drawBehind(ctx, R, k) {
		drawElementalVeils(ctx, R, k, this.time, [255, 92, 20], [255, 248, 174], 1);
	}
	/** Сочный золотисто-янтарный огненный корпус в стиле черепашек + живое горнило и трещины жара в баффе. */
	decorate(sc, R, p) {
		const { lx, ly } = hfLight(this);
		const t = this.time;

		// Плотная огненно-золотая основа с сочным оранжево-рубиновым полумесяцем тени
		const bodyG = sc.createRadialGradient(lx * R * .34, ly * R * .34, R * .04, 0, 0, R * 1.08);
		bodyG.addColorStop(0, p > .4 ? "#ffffe0" : "#fff288");
		bodyG.addColorStop(.45, p > .4 ? "#ffe04a" : "#ffc628");
		bodyG.addColorStop(.82, p > .4 ? "#ff8c18" : "#ec7814");
		bodyG.addColorStop(1, p > .4 ? "#d43810" : "#b83a10");
		sc.fillStyle = bodyG;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);

		// Живое пульсирующее тепло в глубине тела
		const sx = Math.cos(t * 2.2) * R * .18;
		const sy = Math.sin(t * 1.9) * R * .18;
		const furnace = sc.createRadialGradient(-R * .18 + sx, R * .14 + sy, 0, -R * .18 + sx, R * .14 + sy, R * .72);
		furnace.addColorStop(0, `rgba(255,82,18,${(.22 + .26 * p).toFixed(3)})`);
		furnace.addColorStop(.6, `rgba(255,156,36,${(.1 + .16 * p).toFixed(3)})`);
		furnace.addColorStop(1, "rgba(255,156,36,0)");
		sc.fillStyle = furnace;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);

		// В баффе — яркие раскалённые магмовые жилки-трещины внутри корпуса!
		if (p > .06) {
			sc.save();
			sc.strokeStyle = `rgba(255,72,18,${(.82 * p).toFixed(3)})`;
			sc.lineWidth = Math.max(1.25, R * .078);
			sc.lineCap = "round";
			sc.lineJoin = "round";
			sc.beginPath();
			sc.moveTo(-R * .86, -R * .12);
			sc.lineTo(-R * .44, -R * .02);
			sc.lineTo(-R * .2, R * .24);
			sc.lineTo(-R * .5, R * .54);
			sc.stroke();
			sc.strokeStyle = `rgba(255,255,224,${(.95 * p).toFixed(3)})`;
			sc.lineWidth = Math.max(.6, R * .034);
			sc.stroke();
			sc.restore();
		}

		// Чёткий верхне-левый блик пламени
		sc.fillStyle = "rgba(255,255,244,.88)";
		sc.beginPath();
		sc.ellipse(lx * R * .5, ly * R * .5, R * .26, R * .11, Math.atan2(ly, lx) + Math.PI / 2, 0, HF_TAU);
		sc.fill();

		// Яркий золотой контровой серп по затылку (чётко отделяет корпус от тёмного пепельного дыма!)
		sc.strokeStyle = p > .4 ? "rgba(255,254,214,.96)" : "rgba(255,240,168,.88)";
		sc.lineWidth = Math.max(1.15, R * (.062 + .026 * p));
		sc.beginPath();
		sc.arc(0, 0, R * .955, Math.PI * .62, Math.PI * 1.54);
		sc.stroke();
	}
	drawLips(ctx, lips, R, pal, ends) {
		ctx.strokeStyle = css(HF_FIRE_INK);
		ctx.lineWidth = Math.max(1.15, R * .06);
		lips();
		ctx.stroke();
		drawHfFang(ctx, R, ends, css(HF_FIRE_INK), .96);
	}
	/**
	* КРУПНЫЙ, ДЕРЗКИЙ ОГНЕННЫЙ ГЛАЗ ЖАРА:
	* чёткая тёмная окантовка-бровь `#241418` + крупная пылающая оранжево-белая
	* огненная линза внутри — читается на 100% даже на светлом золотом корпусе и в 18px!
	*/
	drawWorn(ctx, R, p) {
		const lod = hfEyeLod(R);
		const gx = this.gazeX * R * .055;
		const gy = this.gazeY * R * .04;
		const ex = R * .21 + gx;
		const ey = -R * .37 + gy;
		const w = R * .31 * lod;
		const h = R * (.22 - .03 * this.windK + .03 * p) * lod;

		ctx.save();
		ctx.translate(ex, ey);
		ctx.rotate(.15 + .05 * this.windK);

		// Тёмная каллиграфическая оправа-бровь (даёт 100% контраст огненному глазу на золотом шаре!)
		ctx.fillStyle = css(HF_FIRE_INK);
		ctx.beginPath();
		ctx.moveTo(-w * 1.12, -h * .86);
		ctx.lineTo(w * 1.12, -h * .22);
		ctx.quadraticCurveTo(w * .94, h * .98, -w * .1, h * .96);
		ctx.quadraticCurveTo(-w * .98, h * .78, -w * 1.12, -h * .86);
		ctx.closePath();
		ctx.fill();

		// Пылающий огненный глаз (внутри — жаркий оранжево-жёлтый градиент и ослепительно-белое ядро!)
		ctx.beginPath();
		ctx.moveTo(-w * .84, -h * .52);
		ctx.lineTo(w * .86, -h * .04);
		ctx.quadraticCurveTo(w * .7, h * .76, -w * .1, h * .72);
		ctx.quadraticCurveTo(-w * .76, h * .56, -w * .84, -h * .52);
		ctx.closePath();

		const eyeG = ctx.createLinearGradient(-w * .4, -h, w * .4, h);
		if (p > .35) {
			eyeG.addColorStop(0, "#ffffff");
			eyeG.addColorStop(.55, "#fff48a");
			eyeG.addColorStop(1, "#ff6418");
		} else {
			eyeG.addColorStop(0, "#fffce0");
			eyeG.addColorStop(.52, "#ffae24");
			eyeG.addColorStop(1, "#e63612");
		}
		ctx.fillStyle = eyeG;
		ctx.fill();

		// Горячее чисто-белое сердечко глаза (держит хищный блеск в 18px!)
		ctx.beginPath();
		ctx.moveTo(-w * .52, -h * .26);
		ctx.lineTo(w * .54, 0);
		ctx.quadraticCurveTo(w * .34, h * .38, -w * .12, h * .34);
		ctx.quadraticCurveTo(-w * .48, h * .24, -w * .52, -h * .26);
		ctx.closePath();
		ctx.fillStyle = "#ffffff";
		ctx.fill();

		// Огненный росчерк искр, срывающийся с уголка глаза на укусе, повороте и в баффе!
		const trailK = Math.max(p, this.bitePulse * .85, this.turnPulse * .8);
		if (trailK > .15) {
			const sLen = R * (.62 * trailK);
			const wv = Math.sin(this.time * 15) * h * .32;
			ctx.globalCompositeOperation = "lighter";
			ctx.fillStyle = `rgba(255,174,48,${(.92 * trailK).toFixed(2)})`;
			ctx.beginPath();
			ctx.moveTo(-w * .75, -h * .55);
			ctx.quadraticCurveTo(-w - sLen * .45, -h * .72 + wv, -w - sLen, -h * .92 - wv);
			ctx.quadraticCurveTo(-w - sLen * .35, h * .18 + wv, -w * .65, h * .36);
			ctx.closePath();
			ctx.fill();
		}
		ctx.restore();
	}
	paintBallPattern(ctx, R, p) {
		ctx.strokeStyle = p > .4 ? "#fff48a" : "#e84814";
		ctx.lineWidth = R * .16;
		ctx.lineCap = "round";
		for (let k = 0; k < 2; k++) {
			ctx.save();
			ctx.rotate(k * Math.PI);
			ctx.beginPath();
			for (let i = 0; i <= 18; i++) {
				const f = i / 18;
				const a = f * 2.7;
				const r = R * (.14 + .62 * f);
				if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
				else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
			}
			ctx.stroke();
			ctx.restore();
		}
		ctx.fillStyle = "#fffce0";
		ctx.beginPath(); ctx.arc(0, 0, R * .22, 0, HF_TAU); ctx.fill();
	}
	paintBallOrbit(ctx, R) {
		drawElementalVeils(ctx, R * .96, 1, this.time * 1.3, [255, 92, 20], [255, 248, 174], 1);
	}
	particleFor() { return "ember"; }
	swirlFor() { return .34; }
	sizeFor() { return 1.15; }
	/** Тлеющие и вылетающие из пепельного дыма раскалённые угольки! */
	drawParticle(ctx, e, a, s) {
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		ctx.globalAlpha = a * .88;
		const g = glow(e.hot ? [255, 212, 84] : [255, 112, 28]);
		ctx.drawImage(g, e.x - s * 2.8, e.y - s * 2.8, s * 5.6, s * 5.6);
		ctx.globalCompositeOperation = "source-over";
		ctx.globalAlpha = a;
		ctx.fillStyle = e.hot ? "#fffce0" : "#ff9a2e";
		ctx.strokeStyle = "rgba(36,20,24,.75)";
		ctx.lineWidth = Math.max(.55, s * .14);
		hfStar4(ctx, e.x, e.y, s * (e.hot ? 1.18 : .88), s * .34, e.spin * .35 * (e.max - e.life));
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}
	drawBursts(ctx) {
		const R = this.r;
		for (const b of this.bursts) {
			const k = b.t / .5;
			const ease = easeOut(k);
			const a = 1 - k;
			const rad = R * (.95 + 2.35 * ease);
			ctx.save();
			ctx.translate(b.x, b.y);
			ctx.strokeStyle = `rgba(30,18,18,${(.76 * a).toFixed(3)})`;
			ctx.lineWidth = R * .36 * a;
			ctx.beginPath(); ctx.arc(0, 0, rad, 0, HF_TAU); ctx.stroke();

			ctx.globalCompositeOperation = "lighter";
			ctx.strokeStyle = `rgba(255,152,36,${(.95 * a).toFixed(3)})`;
			ctx.lineWidth = Math.max(1.2, R * .16 * a);
			ctx.beginPath(); ctx.arc(0, 0, rad * .96, 0, HF_TAU); ctx.stroke();
			ctx.restore();
		}
	}
};

// ===========================================================================
// 2. СТУЖА — МОРОЗНЫЙ ПАР (FrostMistHero — Ms. Pac-Man)
// Ослепительно-белый снежно-ледяной дух (0.295T) в клубах МОРОЗНОГО ПАРА
// с острыми кристаллическими бликами.
// - БОЛЬШОЙ, СТРОЙНЫЙ РУБИНОВО-РЯБИНОВЫЙ БАНТ (как алая рябина на снегу —
//   размах 1.56R, внешний радиус <= 0.426T, идеально читается в любом масштабе!)
// - КРУПНЫЙ, ЧИСТЫЙ, ПРОНЗИТЕЛЬНЫЙ ЛЕДЯНО-САПФИРОВЫЙ ГЛАЗ с одной плавной
//   верхней ресницей-стрелкой и крупным белым бликом (0% неуклюжести!).
// ===========================================================================
var FROST_CALM = {
	light: [255, 255, 255],
	mid: [236, 248, 255],
	shadow: [164, 214, 246],
	deep: [96, 152, 206],
	bounce: [132, 232, 255],
	ink: HF_ICE_INK,
	highlight: [255, 255, 255],
	rim: [232, 250, 255]
};
var FROST_AWOKEN = {
	light: [255, 255, 255],
	mid: [228, 252, 255],
	shadow: [134, 224, 255],
	deep: [62, 166, 236],
	bounce: [164, 252, 255],
	ink: [20, 32, 56],
	highlight: [255, 255, 255],
	rim: [192, 254, 255]
};
var FROST_DESIGN = {
	id: "ms-pacman-frost-mist",
	calm: FROST_CALM,
	awoken: FROST_AWOKEN,
	hinge: .08,
	inside: { mid: [28, 92, 158], deep: [12, 28, 62] },
	mouthSpan: .72,
	grinRest: .12,
	grinRun: .04,
	chompRate: 4.8,
	flare: [84, 234, 255],
	death: "spin",
	bands: [.1, .32, .74]
};

var FrostMistHero = class extends ElementalVaporBase {
	design = FROST_DESIGN;
	bow = new Spring(0);
	blink = -1;
	nextBlink = 2.1;
	blinks = 0;

	resetLooks() {
		super.resetLooks();
		this.bow.value = 0;
		this.bow.velocity = 0;
	}
	onBite() {
		super.onBite();
		this.bow.velocity += 4.8;
	}
	onTurn() {
		super.onTurn();
		this.bow.velocity += (this.random() < .5 ? 1 : -1) * 5.8;
	}
	afterUpdate(dt) {
		super.afterUpdate(dt);
		this.bow.step(.045 * Math.sin(this.time * 2.6) - .05 * this.windK, dt, 125, 8.8);
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
		this.drawFrostVaporStream(ctx);
		super.draw(ctx);
	}
	/** Главная фишка Стужи: густой ледяной морозный пар + кристальная голубая струя! */
	drawFrostVaporStream(ctx) {
		const R = this.r;
		const p = this.power;
		const long = 1 + .42 * p;

		const frostStamp = getHfSmokeStamp("frost", "rgba(246,253,255,0.94)", "rgba(206,238,255,0.68)", "rgba(186,228,255,0)");
		const iceEdge = getHfSmokeStamp("frostEdge", "rgba(62,118,168,0.44)", "rgba(44,90,138,0.22)", "rgba(38,76,122,0)");
		const cyanHot = getHfSmokeStamp("frostHot", "rgba(186,254,255,0.96)", "rgba(46,216,255,0.52)", "rgba(18,158,238,0)");

		// 1. Деликатная ледяно-синяя подложка, чтобы белый пар чётко читался на светлом летнем песке
		this.wake.draw(ctx, this.time, {
			life: .46 * long,
			width: R * (.66 + .18 * p),
			capHead: R * .45,
			capTail: R * 2.25,
			add: false,
			shift: (u) => -Math.sin(u * 6.5 - this.time * 5.4) * R * .14 * Math.min(1, u * 3),
			color: (u, a) => `rgba(58,112,166,${((.34 + .12 * p) * a * (1 - u * .9)).toFixed(3)})`
		});

		// Плотная морозно-белая струя пара
		this.wake.draw(ctx, this.time, {
			life: .42 * long,
			width: R * (.52 + .16 * p),
			capHead: R * .35,
			capTail: R * 2.15,
			add: false,
			shift: (u) => Math.sin(u * 8 - this.time * 6.4) * R * .12 * Math.min(1, u * 3),
			color: (u, a) => `rgba(246,252,255,${((.86 + .12 * p) * a * (1 - u * .86)).toFixed(3)})`
		});

		// 2. Живые клубы морозного пара (в баффе вспыхивают ледяным цианом изнутри!)
		this.drawVaporClouds(ctx, frostStamp, iceEdge, cyanHot, .88, .64, .18);

		// 3. Звенящая ледяно-голубая нить вьюги сквозь пар
		this.wake.draw(ctx, this.time, {
			life: .4 * long,
			width: R * (.08 + .09 * p),
			capHead: R * .4,
			capTail: R * 2.0,
			add: true,
			shift: (u) => -Math.sin(u * 11 - this.time * 9.8) * R * (.14 + .07 * p) * Math.min(1, u * 3),
			color: (u, a) => css(mix([82, 236, 255], [236, 253, 255], 1 - u), (.68 + .28 * p) * a * (1 - u))
		});
	}
	drawAura(ctx, R, p) {
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		const g = ctx.createRadialGradient(0, 0, R * .76, 0, 0, R * HF_AURA_MAX);
		g.addColorStop(0, css(mix([230, 248, 255], [126, 246, 255], p), .3 + .44 * p));
		g.addColorStop(.55, css(mix([68, 206, 255], [32, 186, 255], p), .1 + .24 * p));
		g.addColorStop(1, "rgba(32,186,255,0)");
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(0, 0, R * HF_AURA_MAX, 0, HF_TAU);
		ctx.fill();
		ctx.restore();
	}
	/** Бафф «Ледяная Буря»: две гладкие ленты морозного вихря (строго <= 1.44 R = 0.425 T!). */
	drawBehind(ctx, R, k) {
		drawElementalVeils(ctx, R, k, this.time + .8, [34, 194, 255], [236, 253, 255], -1);
	}
	/** Чистый снежно-фарфоровый корпус с ледяной глубиной и морозными узорами в баффе. */
	decorate(sc, R, p) {
		const { lx, ly } = hfLight(this);
		const t = this.time;

		const base = sc.createRadialGradient(lx * R * .32, ly * R * .32, R * .04, 0, 0, R * 1.08);
		base.addColorStop(0, "#ffffff");
		base.addColorStop(.52, p > .4 ? "#e6fcff" : "#edf7ff");
		base.addColorStop(.86, p > .4 ? "#9ee8ff" : "#b8dcf6");
		base.addColorStop(1, p > .4 ? "#4cbef2" : "#7cb2de");
		sc.fillStyle = base;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);

		// Мягкое морозное сияние в глубине
		const sx = Math.cos(t * 1.7 + 1) * R * .18;
		const sy = Math.sin(t * 1.4 + 1) * R * .18;
		const core = sc.createRadialGradient(-R * .15 + sx, R * .1 + sy, 0, -R * .15 + sx, R * .1 + sy, R * .75);
		core.addColorStop(0, `rgba(42,212,255,${(.14 + .32 * p).toFixed(3)})`);
		core.addColorStop(.55, `rgba(148,242,255,${(.06 + .16 * p).toFixed(3)})`);
		core.addColorStop(1, "rgba(148,242,255,0)");
		sc.fillStyle = core;
		sc.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.4);

		// В баффе — тонкие ледяные кристаллические прожилки (морозный узор на стекле!)
		if (p > .06) {
			sc.save();
			sc.strokeStyle = `rgba(26,184,248,${(.86 * p).toFixed(3)})`;
			sc.lineWidth = Math.max(1.1, R * .062);
			sc.lineCap = "round";
			sc.lineJoin = "round";
			sc.beginPath();
			sc.moveTo(-R * .84, R * .08);
			sc.lineTo(-R * .4, R * .02);
			sc.lineTo(-R * .16, R * .3);
			sc.moveTo(-R * .4, R * .02);
			sc.lineTo(-R * .24, -R * .24);
			sc.stroke();
			sc.strokeStyle = `rgba(255,255,255,${(.94 * p).toFixed(3)})`;
			sc.lineWidth = Math.max(.55, R * .028);
			sc.stroke();
			sc.restore();
		}

		// Чистый снежно-ледяной блик
		sc.fillStyle = "rgba(255,255,255,.96)";
		sc.beginPath();
		sc.ellipse(lx * R * .48, ly * R * .48, R * .28, R * .12, Math.atan2(ly, lx) + Math.PI / 2, 0, HF_TAU);
		sc.fill();

		if (p > .08) {
			sc.strokeStyle = `rgba(98,242,255,${(.84 * p).toFixed(3)})`;
			sc.lineWidth = Math.max(1.15, R * .07);
			sc.beginPath();
			sc.arc(0, 0, R * .955, 0, HF_TAU);
			sc.stroke();
		}
	}
	drawLips(ctx, lips, R, pal, ends) {
		ctx.strokeStyle = css(HF_ICE_INK);
		ctx.lineWidth = Math.max(1.05, R * .058);
		lips();
		ctx.stroke();
		drawHfFang(ctx, R, ends, css(HF_ICE_INK), .9);
	}
	/**
	* БОЛЬШОЙ, СТРОЙНЫЙ РУБИНОВО-РЯБИНОВЫЙ БАНТ (цвета алой рябины на белом снегу!):
	* посажен глубоко по дуге головы (dist = 0.76R), размах 1.56R, край <= 0.426T (внутри тайла 1×1!).
	*/
	drawRowanBow(ctx, R, p) {
		const ba = -.64 * Math.PI;
		const dist = R * .76;
		const sway = clamp(this.bow.value, -.2, .2);
		const scale = 1 + .05 * p;

		ctx.save();
		ctx.translate(Math.cos(ba) * dist, Math.sin(ba) * dist);
		ctx.rotate(ba + Math.PI / 2 + sway);
		ctx.scale(scale, scale);
		ctx.lineJoin = "round";
		ctx.lineCap = "round";

		const bw = R * .78;
		const bh = R * .44;
		const inkW = Math.max(.85, R * .054);

		// Лёгкое рубиновое сияние позади банта
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		const bg = ctx.createRadialGradient(0, -bh * .1, 0, 0, 0, bw * 1.05);
		bg.addColorStop(0, `rgba(255,54,94,${(.32 + .36 * p).toFixed(2)})`);
		bg.addColorStop(1, "rgba(255,34,74,0)");
		ctx.fillStyle = bg;
		ctx.beginPath();
		ctx.arc(0, 0, bw * 1.05, 0, HF_TAU);
		ctx.fill();
		ctx.restore();

		// Две стройные, обтекаемые ленты-крылья рубиново-рябинового цвета
		for (const side of [-1, 1]) {
			ctx.beginPath();
			ctx.moveTo(0, -bh * .08);
			ctx.bezierCurveTo(side * bw * .32, -bh * 1.06, side * bw * .88, -bh * .88, side * bw, -bh * .14);
			ctx.quadraticCurveTo(side * bw * .98, bh * .48, side * bw * .56, bh * .56);
			ctx.quadraticCurveTo(side * bw * .24, bh * .52, 0, bh * .16);
			ctx.closePath();

			const lg = ctx.createLinearGradient(0, -bh, side * bw, bh * .5);
			if (p > .4) {
				lg.addColorStop(0, "#ffe4ec");
				lg.addColorStop(.32, "#ff2e5c");
				lg.addColorStop(1, "#b80a32");
			} else {
				lg.addColorStop(0, "#ff587a");
				lg.addColorStop(.45, "#e81442");
				lg.addColorStop(1, "#960828");
			}
			ctx.fillStyle = lg;
			ctx.fill();

			if (R >= 14) {
				ctx.save();
				ctx.clip();
				ctx.strokeStyle = "rgba(84,4,24,.46)";
				ctx.lineWidth = Math.max(.8, R * .042);
				ctx.beginPath();
				ctx.moveTo(side * bw * .12, bh * .06);
				ctx.quadraticCurveTo(side * bw * .45, bh * .16, side * bw * .74, bh * .06);
				ctx.stroke();

				ctx.strokeStyle = p > .4 ? "rgba(255,255,255,.94)" : "rgba(255,232,240,.86)";
				ctx.lineWidth = Math.max(.8, R * .048);
				ctx.beginPath();
				ctx.moveTo(side * bw * .22, -bh * .44);
				ctx.quadraticCurveTo(side * bw * .56, -bh * .64, side * bw * .82, -bh * .28);
				ctx.stroke();
				ctx.restore();
			}

			ctx.strokeStyle = css(HF_ICE_INK);
			ctx.lineWidth = inkW;
			ctx.stroke();
		}

		// Ледяной кристальный узел-самоцвет в центре рубинового банта!
		ctx.beginPath();
		ctx.ellipse(0, bh * .04, bw * .22, bh * .42, 0, 0, HF_TAU);
		ctx.fillStyle = p > .4 ? "#ffffff" : "#8ef4ff";
		ctx.fill();
		ctx.strokeStyle = css(HF_ICE_INK);
		ctx.lineWidth = inkW;
		ctx.stroke();

		ctx.fillStyle = "#ffffff";
		ctx.beginPath();
		ctx.arc(-bw * .04, -bh * .08, Math.max(.85, R * .055), 0, HF_TAU);
		ctx.fill();
		ctx.restore();
	}
	/**
	* КРУПНЫЙ, ЧИСТЫЙ, ПРОНЗИТЕЛЬНЫЙ ЛЕДЯНО-САПФИРОВЫЙ ГЛАЗ СТУЖИ:
	* яркий сине-бирюзовый градиент на белоснежном теле + крупный белый блик +
	* одна плавная верхняя ресница-стрелка. В баффе загорается ледяным светом!
	*/
	drawWorn(ctx, R, p) {
		this.drawRowanBow(ctx, R, p);

		const lod = hfEyeLod(R);
		const gx = this.gazeX * R * .05;
		const gy = this.gazeY * R * .038;
		const ex = R * .22 + gx;
		const ey = -R * .36 + gy;
		const w = R * .29 * lod;
		const blink = this.blink >= 0 ? Math.sin(this.blink / .13 * Math.PI) : 0;
		const squint = Math.max(blink, this.bitePulse * .78);
		const h = R * (.225 + .02 * p) * lod * (1 - squint * .86);

		ctx.save();
		ctx.translate(ex, ey);
		ctx.rotate(.08);

		if (squint > .72) {
			ctx.strokeStyle = css(HF_ICE_INK);
			ctx.lineWidth = Math.max(1.3, R * .085);
			ctx.lineCap = "round";
			ctx.beginPath();
			ctx.moveTo(-w * .85, 0);
			ctx.quadraticCurveTo(0, -R * .1, w * .88, -R * .04);
			ctx.quadraticCurveTo(w * 1.15, -R * .08, w * 1.28, -R * .2);
			ctx.stroke();
		} else {
			// Мягкое морозно-циановое свечение глаза
			ctx.globalCompositeOperation = "lighter";
			const gl = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 1.65);
			gl.addColorStop(0, `rgba(68,232,255,${(.48 + .44 * p).toFixed(2)})`);
			gl.addColorStop(1, "rgba(24,174,255,0)");
			ctx.fillStyle = gl;
			ctx.beginPath();
			ctx.arc(0, 0, w * 1.65, 0, HF_TAU);
			ctx.fill();
			ctx.globalCompositeOperation = "source-over";

			// 1. Крупный, открытый, чистый ледяно-сапфировый глаз
			ctx.beginPath();
			ctx.moveTo(-w * .92, -h * .28);
			ctx.quadraticCurveTo(0, -h * .98, w * .92, -h * .16);
			ctx.quadraticCurveTo(w * .74, h * .95, -w * .08, h * .92);
			ctx.quadraticCurveTo(-w * .84, h * .76, -w * .92, -h * .28);
			ctx.closePath();

			const eyeG = ctx.createRadialGradient(-w * .15, -h * .2, 0, 0, h * .1, w * 1.15);
			if (p > .38) {
				eyeG.addColorStop(0, "#ffffff");
				eyeG.addColorStop(.48, "#7efaff");
				eyeG.addColorStop(1, "#0a88f0");
			} else {
				eyeG.addColorStop(0, "#8cf6ff");
				eyeG.addColorStop(.46, "#16a6ff");
				eyeG.addColorStop(1, "#0c4ea8");
			}
			ctx.fillStyle = eyeG;
			ctx.fill();

			ctx.strokeStyle = "rgba(29,35,54,.72)";
			ctx.lineWidth = Math.max(.75, R * .042);
			ctx.stroke();

			// Тонкий зрачок в крупном масштабе
			if (R >= 13) {
				ctx.fillStyle = p > .38 ? "rgba(10,74,148,.76)" : "rgba(18,28,58,.84)";
				ctx.beginPath();
				ctx.ellipse(w * .08, h * .1, w * .22, h * .52, .06, 0, HF_TAU);
				ctx.fill();
			}

			// Крупный чистый белый кристальный блик
			ctx.fillStyle = "#ffffff";
			ctx.beginPath();
			ctx.ellipse(-w * .24, -h * .18, Math.max(1.05, w * .28), Math.max(.85, h * .3), -.25, 0, HF_TAU);
			ctx.fill();

			// 2. Одна плавная, упругая верхняя ресница-стрелка
			ctx.fillStyle = css(HF_ICE_INK);
			ctx.beginPath();
			ctx.moveTo(-w * 1.04, -h * .18);
			ctx.quadraticCurveTo(-w * .12, -h * 1.24, w * .92, -h * .3);
			ctx.quadraticCurveTo(w * 1.18, -h * .42, w * 1.34, -h * .72);
			ctx.quadraticCurveTo(w * 1.15, -h * .14, w * .92, h * .06);
			ctx.quadraticCurveTo(0, -h * .78, -w * .94, -h * .02);
			ctx.closePath();
			ctx.fill();

			// Морозный световой росчерк в баффе / на вираже
			const trailK = Math.max(p, this.turnPulse * .75);
			if (trailK > .2) {
				const sLen = R * (.52 * trailK);
				const wv = Math.sin(this.time * 14) * h * .28;
				ctx.globalCompositeOperation = "lighter";
				ctx.fillStyle = `rgba(92,240,255,${(.9 * trailK).toFixed(2)})`;
				ctx.beginPath();
				ctx.moveTo(w * .8, -h * .38);
				ctx.quadraticCurveTo(w * 1.15 + sLen * .28, -h * .88 + wv, -w * .15 - sLen * .38, -h * 1.08 - wv);
				ctx.quadraticCurveTo(w * .55, -h * .48, w * .68, -h * .05);
				ctx.closePath();
				ctx.fill();
			}
		}
		ctx.restore();
	}
	paintBallPattern(ctx, R, p) {
		ctx.strokeStyle = p > .4 ? "#36d8ff" : "#1a9ae8";
		ctx.lineWidth = R * .15;
		ctx.lineCap = "round";
		for (let k = 0; k < 2; k++) {
			ctx.save();
			ctx.rotate(k * Math.PI);
			ctx.beginPath();
			for (let i = 0; i <= 18; i++) {
				const f = i / 18;
				const a = f * 2.7;
				const r = R * (.14 + .62 * f);
				if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
				else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
			}
			ctx.stroke();
			ctx.restore();
		}
		ctx.fillStyle = "#e8224c";
		ctx.beginPath(); ctx.arc(0, 0, R * .22, 0, HF_TAU); ctx.fill();
	}
	paintBallOrbit(ctx, R) {
		drawElementalVeils(ctx, R * .96, 1, this.time * 1.3, [34, 194, 255], [236, 253, 255], -1);
	}
	particleFor() { return "crystal"; }
	swirlFor() { return .38; }
	sizeFor() { return 1.12; }
	/** Острые сверкающие кристаллики льда внутри морозного пара! */
	drawParticle(ctx, e, a, s) {
		ctx.save();
		ctx.globalCompositeOperation = "lighter";
		ctx.globalAlpha = a * .82;
		const g = glow(e.hot ? [138, 248, 255] : [64, 212, 255]);
		ctx.drawImage(g, e.x - s * 2.6, e.y - s * 2.6, s * 5.2, s * 5.2);
		ctx.globalCompositeOperation = "source-over";
		ctx.globalAlpha = a;
		ctx.fillStyle = e.hot ? "#ffffff" : "#b8f6ff";
		ctx.strokeStyle = "rgba(29,35,54,.65)";
		ctx.lineWidth = Math.max(.5, s * .13);
		hfStar4(ctx, e.x, e.y, s * (e.hot ? 1.2 : .92), s * .26, e.spin * .3 * (e.max - e.life));
		ctx.fill();
		ctx.stroke();
		ctx.restore();
	}
	drawBursts(ctx) {
		const R = this.r;
		for (const b of this.bursts) {
			const k = b.t / .5;
			const ease = easeOut(k);
			const a = 1 - k;
			const rad = R * (.95 + 2.35 * ease);
			ctx.save();
			ctx.translate(b.x, b.y);
			ctx.strokeStyle = `rgba(246,253,255,${(.88 * a).toFixed(3)})`;
			ctx.lineWidth = R * .34 * a;
			ctx.beginPath(); ctx.arc(0, 0, rad, 0, HF_TAU); ctx.stroke();

			ctx.strokeStyle = `rgba(54,218,255,${(.94 * a).toFixed(3)})`;
			ctx.lineWidth = Math.max(1.2, R * .14 * a);
			ctx.beginPath(); ctx.arc(0, 0, rad * .92, 0, HF_TAU); ctx.stroke();
			ctx.restore();
		}
	}
};

export { EmberAshHero, FrostMistHero, HF_BODY_RATIO };
