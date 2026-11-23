// «Обними цветом» — playable prototype.
// A grey watercolour world hides a painting. The snake is a living ink brush; when its body or
// its drying trace closes a loop, the painting's colour blooms inside the loop like wet pigment.
/* global Paint, PICTURES */
'use strict';

(() => {
	const { TAU, rng, deform, wash, bloom, paper, spline, resample, frame, brush } = Paint;
	const $ = (id) => document.getElementById(id);
	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const ease = (t) => {
		t = clamp(t, 0, 1);
		return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
	};
	const hsl = (h, s, l) => `hsl(${h},${s}%,${l}%)`;

	// ------------------------------------------------------------------ tuning

	const T = {
		SPEED: 165, // px/s at 720p
		TURN: 3.1, // rad/s with the arrow keys: a full circle ≈ 2 s
		FOLLOW_TURN: 4.2, // rad/s when following the pointer
		BODY: 330, // body length, px at 720p
		TRACE: 5.5, // seconds the drying trace stays and can close a loop
		MIN_LOOP: 2600, // px² at 720p — smaller loops are ignored
		BLOOM_TIME: 1.15, // seconds a loop takes to spread its colour
		LAYERS: 12,
		DROPS: 9,
		GOAL_PIC: 0.78, // share of the hidden creature that must get its colour back
		GOAL_ALL: 0.5 // and of the whole sheet
	};

	// ------------------------------------------------------------------ canvases

	const view = $('view');
	const ctx = view.getContext('2d');
	let W = 0;
	let H = 0;
	let S = 1;
	let k = 1;
	let colorCv; // the hidden painting, full colour
	let greyCv; // the same painting drained of colour
	let paintedCv; // colour that came back (accumulates)
	let paintedCtx;
	let maskCv; // small: how much colour came back where
	let maskCtx;
	let picMask; // small: where the creature is
	let colorSmall; // small copy of the painting for sampling drop colours
	const MS = 8; // mask downscale

	function makeCanvas(w, h, s) {
		const c = document.createElement('canvas');
		c.width = Math.max(1, Math.round(w * s));
		c.height = Math.max(1, Math.round(h * s));
		const x = c.getContext('2d', { willReadFrequently: s < 1 });
		x.scale(s, s);
		return [c, x];
	}

	// ------------------------------------------------------------------ the hidden painting

	function pictureFrame() {
		const c = Math.min((W * 0.84) / 24, (H * 0.78) / 14);
		return { c, ox: (W - 24 * c) / 2, oy: (H - 14 * c) / 2 + H * 0.02 };
	}

	function whaleOutline() {
		const pic = PICTURES.whale;
		const { c, ox, oy } = pictureFrame();
		const P = (p) => ({ x: ox + p[0] * c, y: oy + p[1] * c });
		const sm = (i) => pic.strokes[i].smooth.map(P);
		return { outline: [...sm(0), ...sm(3).slice().reverse(), ...sm(2).slice().reverse(), ...sm(1).slice().reverse()], sm, c, P };
	}

	function band(y0, y1, jag) {
		const pts = [];
		for (let x = -60; x <= W + 60; x += 80) pts.push({ x, y: y0 + Math.sin(x * 0.01) * jag });
		for (let x = W + 60; x >= -60; x -= 80) pts.push({ x, y: y1 + Math.sin(x * 0.013 + 2) * jag });
		return pts;
	}

	function paintScene(x) {
		const r = rng(5);
		x.fillStyle = '#f2ecdf';
		x.fillRect(0, 0, W, H);
		// sea: bands of colour from light at the surface to deep below
		wash(x, band(-40, H * 0.55, 30 * k), hsl(186, 40, 86), { rng: r, alpha: 0.04, layers: 16, spread: 0.05, blend: 'multiply' });
		wash(x, band(H * 0.25, H * 0.85, 40 * k), hsl(196, 42, 80), { rng: r, alpha: 0.035, layers: 16, spread: 0.06, blend: 'multiply' });
		wash(x, band(H * 0.6, H + 60, 30 * k), hsl(210, 36, 72), { rng: r, alpha: 0.035, layers: 16, spread: 0.06, blend: 'multiply' });
		wash(x, { x: W * 0.8, y: H * 0.2, r: 220 * k }, hsl(258, 38, 86), { rng: r, alpha: 0.04, layers: 16, sx: 1.6, sy: 0.7, blend: 'multiply' });
		bloom(x, W * 0.4, -H * 0.15, H * 0.9, '#fffaf0', 0.55);
		// light shafts, fading with depth (no hard lower edge)
		const [lc, l] = makeCanvas(W, H, 1);
		for (let i = 0; i < 4; i++) {
			const sx = W * (0.15 + 0.22 * i);
			const w = (60 + r() * 70) * k;
			const g = l.createLinearGradient(sx - w, 0, sx + w, 0);
			g.addColorStop(0, 'rgba(255,252,240,0)');
			g.addColorStop(0.5, 'rgba(255,252,240,0.3)');
			g.addColorStop(1, 'rgba(255,252,240,0)');
			l.save();
			l.transform(1, 0, 0.3, 1, 0, 0);
			l.fillStyle = g;
			l.fillRect(sx - w, 0, w * 2, H);
			l.restore();
		}
		l.globalCompositeOperation = 'destination-in';
		const fade = l.createLinearGradient(0, 0, 0, H * 0.8);
		fade.addColorStop(0, 'rgba(0,0,0,1)');
		fade.addColorStop(1, 'rgba(0,0,0,0)');
		l.fillStyle = fade;
		l.fillRect(0, 0, W, H);
		x.drawImage(lc, 0, 0, W, H);
		// reef: warm rocks, coral and kelp
		for (let i = 0; i < 7; i++) {
			const cx = W * (i / 6) + r.gauss() * 40 * k;
			wash(x, { x: cx, y: H * 0.95, r: (90 + r() * 70) * k }, i % 2 ? hsl(38, 42, 82) : hsl(24, 36, 76), { rng: r, alpha: 0.03, layers: 16, sx: 1.6, sy: 0.8, blend: 'multiply' });
		}
		for (let i = 0; i < 5; i++)
			wash(x, { x: W * (0.1 + 0.2 * i) + r.gauss() * 30 * k, y: H * 0.88, r: 34 * k }, hsl(350, 48, 84), { rng: r, alpha: 0.04, layers: 12, blend: 'multiply' });
		for (let i = 0; i < 7; i++) {
			const kx = W * (0.04 + 0.15 * i) + r.gauss() * 30 * k;
			const h = (120 + r() * 160) * k;
			const pts = [];
			for (let j = 0; j <= 10; j++) pts.push({ x: kx + Math.sin(j * 0.55 + i) * 18 * k * (j / 10), y: H + 10 - (h * j) / 10 });
			brush(x, spline(pts, 6), (8 + r() * 5) * k, hsl(152, 30, 50), { rng: r, alpha: 0.55, taper: 0.45, dry: false, grit: 0.02 });
		}
		// a school of small orange fish
		for (let i = 0; i < 11; i++) {
			const fx = W * 0.78 + r.gauss() * 70 * k;
			const fy = H * 0.16 + r.gauss() * 34 * k;
			const s = (6 + r() * 3) * k;
			x.save();
			x.translate(fx, fy);
			x.rotate(-0.15 + r.gauss() * 0.1);
			x.fillStyle = hsl(22, 72, 60);
			x.beginPath();
			x.ellipse(0, 0, s, s * 0.45, 0, 0, TAU);
			x.fill();
			x.beginPath();
			x.moveTo(-s * 0.8, 0);
			x.lineTo(-s * 1.6, -s * 0.5);
			x.lineTo(-s * 1.6, s * 0.5);
			x.closePath();
			x.fill();
			x.restore();
		}
		// the whale: watercolour body inside the ink outline
		const { outline, sm, c } = whaleOutline();
		x.save();
		x.beginPath();
		outline.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)));
		x.closePath();
		x.clip();
		const { ox, oy } = pictureFrame();
		bloom(x, ox + 13 * c, oy + 7 * c, c * 9, hsl(212, 40, 78), 0.95, 'multiply');
		for (let i = 0; i < 24; i++) bloom(x, ox + (6 + r() * 15) * c, oy + (3 + r() * 4.5) * c, c * (1.4 + r() * 2), hsl(212 + r.gauss() * 10, 44, 66), 0.18, 'multiply');
		for (let i = 0; i < 8; i++) bloom(x, ox + (2 + r() * 4) * c, oy + (1 + r() * 4) * c, c * (0.8 + r()), hsl(205, 45, 60), 0.3, 'multiply');
		for (let i = 0; i < 6; i++) bloom(x, ox + (10 + r() * 9) * c, oy + (10.4 + r() * 1.2) * c, c * (1.6 + r()), '#f7f2e6', 0.16);
		x.restore();
		x.save();
		x.strokeStyle = hsl(212, 45, 42);
		x.globalAlpha = 0.25;
		x.lineWidth = 7 * k;
		x.lineJoin = 'round';
		x.globalCompositeOperation = 'multiply';
		x.beginPath();
		outline.forEach((p, i) => (i ? x.lineTo(p.x, p.y) : x.moveTo(p.x, p.y)));
		x.closePath();
		x.stroke();
		x.restore();
		PICTURES.whale.strokes.forEach((s, i) => {
			const pts = sm(i);
			if (pts.length === 1) {
				x.fillStyle = '#262c36';
				x.beginPath();
				x.arc(pts[0].x, pts[0].y, 5 * k, 0, TAU);
				x.fill();
				return;
			}
			brush(x, pts, (i < 2 ? 5.5 : 4.2) * k, '#262c36', { seed: 60 + i, alpha: 0.92 });
		});
		for (let i = 0; i < 6; i++) {
			x.strokeStyle = 'rgba(38,44,54,0.5)';
			x.lineWidth = 1;
			x.beginPath();
			x.arc(ox + (13 + r.gauss() * 0.4) * c, oy + (-0.3 - i * 0.55) * c + 2 * c, (2 + r() * 3) * k, 0, TAU);
			x.stroke();
		}
		paper(x, W, H, 0.22, 'multiply', 12);
	}

	/** Drain the colour: a faint, warm grey ghost of the painting. */
	function drain(src) {
		const [c, x] = makeCanvas(W, H, 1);
		x.setTransform(1, 0, 0, 1, 0, 0);
		const w = c.width;
		const h = c.height;
		x.drawImage(src, 0, 0, w, h);
		const img = x.getImageData(0, 0, w, h);
		const d = img.data;
		const pr = 236;
		const pg = 233;
		const pb = 226;
		for (let i = 0; i < d.length; i += 4) {
			const l = 0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2];
			const pl = 0.3 * pr + 0.59 * pg + 0.11 * pb;
			// how much darker than paper, compressed: washes keep a hint of form, ink nearly vanishes
			const v = 26 * (1 - Math.exp(-Math.max(0, pl - l) / 55));
			d[i] = pr - v;
			d[i + 1] = pg - v;
			d[i + 2] = pb - v * 0.9;
		}
		x.putImageData(img, 0, 0);
		return c;
	}

	function buildScene() {
		[colorCv] = makeCanvas(W, H, S);
		const cx = colorCv.getContext('2d');
		paintScene(cx);
		greyCv = drain(colorCv);
		[paintedCv, paintedCtx] = makeCanvas(W, H, S);
		[maskCv, maskCtx] = makeCanvas(W, H, 1 / MS);
		// where the creature is, at mask resolution
		const [pm, pmx] = makeCanvas(W, H, 1 / MS);
		pmx.fillStyle = '#000';
		pmx.beginPath();
		whaleOutline().outline.forEach((p, i) => (i ? pmx.lineTo(p.x, p.y) : pmx.moveTo(p.x, p.y)));
		pmx.closePath();
		pmx.fill();
		const pd = pmx.getImageData(0, 0, pm.width, pm.height).data;
		picMask = [];
		for (let i = 3; i < pd.length; i += 4) if (pd[i] > 128) picMask.push((i - 3) / 4);
		const [cs, csx] = makeCanvas(W, H, 1 / 4);
		csx.drawImage(colorCv, 0, 0, W, H);
		colorSmall = { w: cs.width, h: cs.height, d: csx.getImageData(0, 0, cs.width, cs.height).data };
	}

	// ------------------------------------------------------------------ state

	const snake = { x: 0, y: 0, ang: 0, sp: 1 };
	let trail = []; // {x, y, t, g, s}
	let travelled = 0;
	let loopFrom = 0; // trail index before which segments no longer close loops
	let blooms = [];
	let drops = [];
	let splashes = [];
	let time = 0;
	let coverage = { pic: 0, all: 0 };
	let done = null; // {t}
	let lastCoverage = 0;
	const keys = new Set();
	let pointer = null;

	function reset() {
		snake.x = W * 0.3;
		snake.y = H * 0.35;
		snake.ang = 0.2;
		trail = [];
		travelled = 0;
		loopFrom = 0;
		blooms = [];
		splashes = [];
		drops = [];
		done = null;
		coverage = { pic: 0, all: 0 };
		paintedCtx.clearRect(0, 0, W, H);
		maskCtx.clearRect(0, 0, W, H);
		for (let i = 0; i < T.DROPS; i++) spawnDrop();
		$('banner').classList.remove('on');
		hint('Плывите и замыкайте петли — внутри вернётся цвет', 7);
		updateHud();
	}

	function sampleColor(x, y) {
		const px = clamp(Math.floor(x / 4), 0, colorSmall.w - 1);
		const py = clamp(Math.floor(y / 4), 0, colorSmall.h - 1);
		const i = (py * colorSmall.w + px) * 4;
		return `rgb(${colorSmall.d[i]},${colorSmall.d[i + 1]},${colorSmall.d[i + 2]})`;
	}

	function spawnDrop() {
		const r = Math.random;
		const x = W * (0.08 + r() * 0.84);
		const y = H * (0.1 + r() * 0.8);
		const a = r() * TAU;
		drops.push({ x, y, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, ph: r() * 10, color: sampleColor(x, y), born: time });
	}

	// ------------------------------------------------------------------ loops

	function segX(a, b, c, d) {
		const r = { x: b.x - a.x, y: b.y - a.y };
		const s = { x: d.x - c.x, y: d.y - c.y };
		const den = r.x * s.y - r.y * s.x;
		if (Math.abs(den) < 1e-9) return null;
		const t = ((c.x - a.x) * s.y - (c.y - a.y) * s.x) / den;
		const u = ((c.x - a.x) * r.y - (c.y - a.y) * r.x) / den;
		if (t < 0 || t > 1 || u < 0 || u > 1) return null;
		return { x: a.x + r.x * t, y: a.y + r.y * t };
	}

	function polyArea(p) {
		let a = 0;
		for (let i = 0; i < p.length; i++) {
			const q = p[(i + 1) % p.length];
			a += p[i].x * q.y - q.x * p[i].y;
		}
		return Math.abs(a) / 2;
	}

	function inside(p, poly) {
		let c = false;
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const a = poly[i];
			const b = poly[j];
			if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
		}
		return c;
	}

	/** The newest segment crosses an older, still wet part of the trace: a loop is closed. */
	function checkLoop() {
		const n = trail.length;
		if (n < 8) return;
		const a = trail[n - 2];
		const b = trail[n - 1];
		if (b.g) return;
		for (let i = n - 8; i >= loopFrom; i--) {
			const p = trail[i];
			const q = trail[i + 1];
			if (q.g || p.g) break; // the trace is cut where the snake crossed the edge
			if (time - p.t > T.TRACE) break;
			const hit = segX(p, q, a, b);
			if (!hit) continue;
			const poly = [hit, ...trail.slice(i + 1, n - 1).map((t) => ({ x: t.x, y: t.y })), hit];
			const area = polyArea(poly);
			if (area < T.MIN_LOOP * k * k) return;
			closeLoop(poly, area);
			loopFrom = n - 1;
			return;
		}
	}

	function closeLoop(poly, area) {
		let gathered = 0;
		for (let i = drops.length - 1; i >= 0; i--) {
			if (!inside(drops[i], poly)) continue;
			const d = drops[i];
			for (let j = 0; j < 6; j++) splashes.push({ x: d.x, y: d.y, vx: Math.cos(j) * 40 * k, vy: Math.sin(j) * 40 * k, life: 0.7, color: d.color });
			drops.splice(i, 1);
			gathered++;
		}
		while (drops.length < T.DROPS) spawnDrop();
		// small loops paint strongly, wide ones softly; every drop inside adds pigment
		const size = Math.sqrt(area) / k;
		const alpha = clamp(13 / size, 0.035, 0.15) + 0.035 * gathered;
		blooms.push({ poly: resample(poly, 6 * k), t: 0, drawn: 0, alpha, seed: (Math.random() * 1e9) | 0, area });
		Aud.loop(size, gathered);
		const c = poly.reduce((acc, p) => ({ x: acc.x + p.x / poly.length, y: acc.y + p.y / poly.length }), { x: 0, y: 0 });
		for (let j = 0; j < 7; j++) {
			const a = Math.random() * TAU;
			splashes.push({ x: c.x, y: c.y, vx: Math.cos(a) * 30 * k, vy: Math.sin(a) * 30 * k, life: 0.9, color: sampleColor(c.x, c.y) });
		}
	}

	/** Spread a loop's colour layer by layer: each layer a little wider and more ragged. */
	function growBlooms(dt) {
		for (let bi = blooms.length - 1; bi >= 0; bi--) {
			const b = blooms[bi];
			b.t += dt;
			const want = Math.floor(T.LAYERS * ease(b.t / T.BLOOM_TIME));
			const r = rng(b.seed + b.drawn * 7);
			while (b.drawn < want) {
				const j = b.drawn++;
				let cx = 0;
				let cy = 0;
				for (const p of b.poly) {
					cx += p.x / b.poly.length;
					cy += p.y / b.poly.length;
				}
				// wet pigment creeps past the loop: later layers are wider and more ragged
				const grow = 0.9 + (j / T.LAYERS) * 0.22;
				const base = b.poly.map((p) => ({ x: cx + (p.x - cx) * grow, y: cy + (p.y - cy) * grow, v: 0.4 + r() * 0.9 }));
				const poly = deform(deform(base, 1, 0.06, r), 2, 0.11, r);
				paintedCtx.save();
				paintedCtx.beginPath();
				poly.forEach((p, i) => (i ? paintedCtx.lineTo(p.x, p.y) : paintedCtx.moveTo(p.x, p.y)));
				paintedCtx.closePath();
				paintedCtx.clip();
				paintedCtx.globalAlpha = b.alpha;
				paintedCtx.drawImage(colorCv, 0, 0, W, H);
				paintedCtx.restore();
				maskCtx.save();
				maskCtx.globalAlpha = b.alpha;
				maskCtx.fillStyle = '#000';
				maskCtx.beginPath();
				poly.forEach((p, i) => (i ? maskCtx.lineTo(p.x, p.y) : maskCtx.moveTo(p.x, p.y)));
				maskCtx.closePath();
				maskCtx.fill();
				maskCtx.restore();
			}
			if (b.drawn >= T.LAYERS) {
				if (b.area < W * H * 0.5) pool(b);
				blooms.splice(bi, 1);
			}
		}
	}

	/** A dried wash keeps a slightly darker rim where the pigment pooled. */
	function pool(b) {
		const r = rng(b.seed + 1);
		let cx = 0;
		let cy = 0;
		for (const p of b.poly) {
			cx += p.x / b.poly.length;
			cy += p.y / b.poly.length;
		}
		const ring = deform(
			b.poly.map((p) => ({ x: cx + (p.x - cx) * 1.06, y: cy + (p.y - cy) * 1.06, v: 0.5 + r() * 0.5 })),
			2,
			0.1,
			r
		);
		paintedCtx.save();
		paintedCtx.beginPath();
		ring.forEach((p, i) => (i ? paintedCtx.lineTo(p.x, p.y) : paintedCtx.moveTo(p.x, p.y)));
		paintedCtx.closePath();
		paintedCtx.lineWidth = 3 * k;
		paintedCtx.globalAlpha = 0.5 * b.alpha * T.LAYERS * 0.25;
		paintedCtx.globalCompositeOperation = 'multiply';
		paintedCtx.strokeStyle = sampleColor(cx, cy);
		paintedCtx.stroke();
		paintedCtx.restore();
	}

	function measure() {
		const d = maskCtx.getImageData(0, 0, maskCv.width, maskCv.height).data;
		let all = 0;
		for (let i = 3; i < d.length; i += 4) all += Math.min(1, d[i] / 200);
		let pic = 0;
		for (const i of picMask) pic += Math.min(1, d[i * 4 + 3] / 200);
		coverage = { pic: pic / Math.max(1, picMask.length), all: all / (d.length / 4) };
		updateHud();
		if (!done && coverage.pic >= T.GOAL_PIC && coverage.all >= T.GOAL_ALL) finish();
	}

	function finish() {
		done = { t: 0 };
		// the rest of the sheet floods with colour
		const rect = [];
		for (let x = -40; x <= W + 40; x += 60) rect.push({ x, y: -40 });
		for (let y = -40; y <= H + 40; y += 60) rect.push({ x: W + 40, y });
		for (let x = W + 40; x >= -40; x -= 60) rect.push({ x, y: H + 40 });
		for (let y = H + 40; y >= -40; y -= 60) rect.push({ x: -40, y });
		blooms.push({ poly: rect, t: 0, drawn: 0, alpha: 0.2, seed: 99, area: W * H });
		Aud.finish();
		setTimeout(() => {
			$('banner').classList.add('on');
			hint('Пробел — ещё раз', 30);
		}, 1600);
	}

	// ------------------------------------------------------------------ update

	function update(dt) {
		time += dt;
		// steering: arrows turn the brush, the pointer pulls it along
		let turn = 0;
		if (keys.has('left')) turn -= 1;
		if (keys.has('right')) turn += 1;
		if (turn) snake.ang += turn * T.TURN * dt;
		else if (pointer) {
			const dx = pointer.x - snake.x;
			const dy = pointer.y - snake.y;
			if (Math.hypot(dx, dy) > 24 * k) {
				let d = Math.atan2(dy, dx) - snake.ang;
				d = Math.atan2(Math.sin(d), Math.cos(d));
				snake.ang += clamp(d * 6 * dt, -T.FOLLOW_TURN * dt, T.FOLLOW_TURN * dt);
			}
		}
		const want = keys.has('up') ? 1.55 : keys.has('down') ? 0.5 : 1;
		snake.sp += (want - snake.sp) * Math.min(1, dt * 4);
		const v = T.SPEED * k * snake.sp;
		snake.x += Math.cos(snake.ang) * v * dt;
		snake.y += Math.sin(snake.ang) * v * dt;
		travelled += v * dt;
		let gap = false;
		if (snake.x < 0 || snake.x > W) {
			snake.x -= Math.sign(snake.x) * W;
			gap = true;
		}
		if (snake.y < 0 || snake.y > H) {
			snake.y -= Math.sign(snake.y) * H;
			gap = true;
		}
		const last = trail[trail.length - 1];
		if (gap || !last || Math.hypot(last.x - snake.x, last.y - snake.y) >= 2.5 * k) {
			trail.push({ x: snake.x, y: snake.y, t: time, g: gap, s: travelled });
			if (!gap) checkLoop();
		}
		// forget the trace that has dried and is no longer part of the body
		while (trail.length > 2 && time - trail[0].t > T.TRACE && travelled - trail[0].s > T.BODY * k) {
			trail.shift();
			loopFrom = Math.max(0, loopFrom - 1);
		}
		growBlooms(dt);
		for (const d of drops) {
			d.x += (d.vx + Math.sin(time * 0.5 + d.ph) * 5) * dt;
			d.y += (d.vy + Math.cos(time * 0.4 + d.ph) * 5) * dt;
			if (d.x < 0) d.x += W;
			if (d.x > W) d.x -= W;
			if (d.y < 0) d.y += H;
			if (d.y > H) d.y -= H;
		}
		for (let i = splashes.length - 1; i >= 0; i--) {
			const s = splashes[i];
			s.life -= dt;
			s.x += s.vx * dt;
			s.y += s.vy * dt;
			s.vx *= 0.94;
			s.vy *= 0.94;
			if (s.life <= 0) splashes.splice(i, 1);
		}
		if (time - lastCoverage > 0.5) {
			lastCoverage = time;
			measure();
		}
		if (done) done.t += dt;
	}

	// ------------------------------------------------------------------ drawing

	function render() {
		ctx.setTransform(S, 0, 0, S, 0, 0);
		ctx.globalAlpha = 1;
		ctx.drawImage(greyCv, 0, 0, W, H);
		ctx.drawImage(paintedCv, 0, 0, W, H);
		// colour drops: a wet spot of the hidden colour and a speck of ink
		for (const d of drops) {
			const fade = clamp((time - d.born) / 1.2, 0, 1);
			const tw = 0.85 + 0.15 * Math.sin(time * 2 + d.ph);
			bloom(ctx, d.x, d.y, 15 * k * tw, d.color, 0.75 * fade, 'multiply');
			ctx.fillStyle = 'rgba(38,44,54,0.8)';
			ctx.globalAlpha = fade;
			ctx.beginPath();
			ctx.arc(d.x, d.y, 1.8 * k, 0, TAU);
			ctx.fill();
			ctx.globalAlpha = 1;
		}
		for (const s of splashes) bloom(ctx, s.x, s.y, 7 * k, s.color, s.life * 0.8, 'multiply');
		drawTrace();
		drawBrush();
	}

	/** The drying trace: thin ink that pales with age; it can still close a loop while visible. */
	function drawTrace() {
		const n = trail.length;
		ctx.lineCap = 'round';
		ctx.strokeStyle = '#262c36';
		for (let i = Math.max(1, loopFrom + 1); i < n; i++) {
			const a = trail[i - 1];
			const b = trail[i];
			if (b.g) continue;
			const age = time - b.t;
			if (age > T.TRACE) continue;
			const f = 1 - age / T.TRACE;
			ctx.globalAlpha = 0.32 * f * f;
			ctx.lineWidth = (0.8 + 1.4 * f) * k;
			ctx.beginPath();
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(b.x, b.y);
			ctx.stroke();
		}
		// older part, already used by a loop: fades faster
		for (let i = 1; i <= Math.min(loopFrom, n - 1); i++) {
			const a = trail[i - 1];
			const b = trail[i];
			if (b.g) continue;
			const age = time - b.t;
			if (age > T.TRACE * 0.6) continue;
			ctx.globalAlpha = 0.18 * (1 - age / (T.TRACE * 0.6));
			ctx.lineWidth = 1 * k;
			ctx.beginPath();
			ctx.moveTo(a.x, a.y);
			ctx.lineTo(b.x, b.y);
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
	}

	function hash(i) {
		const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
		return s - Math.floor(s);
	}

	/**
	 * The snake as a living brush stroke: a wet ink belly behind a rounded tip, a long taper,
	 * dry-brush streaks that travel with the body and a tail that splits into a few hairs.
	 */
	function drawBrush() {
		const L = T.BODY * k;
		const R = 9 * k;
		// body path from the head back along the trail, in pieces cut at the edges
		const pieces = [];
		let piece = [{ x: snake.x, y: snake.y, sh: 0 }];
		let sh = 0;
		for (let i = trail.length - 1; i > 0 && sh < L; i--) {
			const p = trail[i];
			const q = trail[i - 1];
			if (p.g) {
				pieces.push(piece);
				piece = [];
				sh += 2.5 * k;
				continue;
			}
			const prev = piece[piece.length - 1] || p;
			sh += Math.hypot(q.x - prev.x, q.y - prev.y);
			piece.push({ x: q.x, y: q.y, sh });
		}
		pieces.push(piece);
		const width = (u) => {
			if (u < 0.05) return R * (0.62 + 0.38 * Math.sin((u / 0.05) * Math.PI * 0.5));
			const t = (u - 0.05) / 0.95;
			return R * Math.pow(1 - t, 1.25) * (1 + 0.12 * Math.sin(t * 9));
		};
		for (const pc of pieces) {
			if (pc.length < 2) continue;
			const pts = resample(pc, 2 * k);
			// resample loses sh: recompute along the piece from its first sh
			let s = pc[0].sh;
			const withSh = pts.map((p, i) => {
				if (i) s += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
				return { x: p.x, y: p.y, sh: s };
			});
			const F = frame(withSh);
			const body = F.map((p, i) => {
				const u = withSh[i].sh / L;
				// a gentle swimming wave, still at the tip
				const wave = Math.sin(withSh[i].sh / (R * 6) - time * 4) * R * 0.45 * clamp(withSh[i].sh / (R * 5), 0, 1);
				return { x: p.x + p.nx * wave, y: p.y + p.ny * wave, u, w: width(u), sh: withSh[i].sh };
			});
			const B = frame(body).map((p, i) => ({ ...p, u: body[i].u, w: body[i].w, sh: body[i].sh }));
			const main = B.filter((p) => p.u <= 0.86);
			if (main.length > 1) {
				// wet ink: a darker core, slightly lighter edges
				ctx.beginPath();
				main.forEach((p, i) => (i ? ctx.lineTo(p.x + p.nx * p.w, p.y + p.ny * p.w) : ctx.moveTo(p.x + p.nx * p.w, p.y + p.ny * p.w)));
				for (let i = main.length - 1; i >= 0; i--) ctx.lineTo(main[i].x - main[i].nx * main[i].w, main[i].y - main[i].ny * main[i].w);
				ctx.closePath();
				ctx.fillStyle = 'rgba(32,36,46,0.88)';
				ctx.fill();
				ctx.beginPath();
				main.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
				ctx.strokeStyle = 'rgba(14,16,22,0.55)';
				ctx.lineWidth = R * 0.7;
				ctx.lineCap = 'round';
				ctx.stroke();
				// dry-brush streaks, broken where the bristles skip
				for (const [off, seed] of [
					[-0.62, 1],
					[-0.28, 2],
					[0.18, 3],
					[0.55, 4]
				]) {
					ctx.strokeStyle = 'rgba(242,236,223,0.32)';
					ctx.lineWidth = Math.max(0.6, R * 0.09);
					ctx.beginPath();
					let open = false;
					for (const p of main) {
						if (p.u < 0.08) continue;
						const gap = hash(Math.floor(p.sh / (R * 0.9)) * 7 + seed) < 0.35;
						if (gap) {
							open = false;
							continue;
						}
						const x = p.x + p.nx * p.w * off;
						const y = p.y + p.ny * p.w * off;
						if (open) ctx.lineTo(x, y);
						else ctx.moveTo(x, y);
						open = true;
					}
					ctx.stroke();
				}
			}
			// the tail splits into a few hairs
			const tail = B.filter((p) => p.u >= 0.8);
			if (tail.length > 1) {
				for (const [spread, a] of [
					[-0.9, 0.7],
					[0, 0.85],
					[1.1, 0.6]
				]) {
					ctx.beginPath();
					tail.forEach((p, i) => {
						const t = i / (tail.length - 1);
						const off = spread * R * 0.55 * t * t;
						const x = p.x + p.nx * off;
						const y = p.y + p.ny * off;
						if (i) ctx.lineTo(x, y);
						else ctx.moveTo(x, y);
					});
					ctx.strokeStyle = `rgba(32,36,46,${a})`;
					ctx.lineWidth = Math.max(0.6, R * 0.12);
					ctx.stroke();
				}
			}
		}
		// the tip: rounded, the wettest ink; the eye is a speck of bare paper
		const ca = Math.cos(snake.ang);
		const sa = Math.sin(snake.ang);
		ctx.fillStyle = 'rgba(20,22,30,0.95)';
		ctx.beginPath();
		ctx.ellipse(snake.x + ca * R * 0.35, snake.y + sa * R * 0.35, R * 1.05, R * 0.72, snake.ang, 0, TAU);
		ctx.fill();
		const ex = snake.x + ca * R * 0.7 - sa * R * 0.32;
		const ey = snake.y + sa * R * 0.7 + ca * R * 0.32;
		ctx.fillStyle = '#f2ecdf';
		ctx.beginPath();
		ctx.arc(ex, ey, R * 0.17, 0, TAU);
		ctx.fill();
		ctx.globalAlpha = 1;
	}

	// ------------------------------------------------------------------ HUD, sound, input

	let hintTimer = 0;
	function hint(text, seconds) {
		const el = $('hint');
		el.textContent = text;
		el.classList.add('on');
		clearTimeout(hintTimer);
		hintTimer = setTimeout(() => el.classList.remove('on'), seconds * 1000);
	}

	function updateHud() {
		const p = clamp(Math.min(coverage.pic / T.GOAL_PIC, coverage.all / T.GOAL_ALL), 0, 1);
		$('ring').style.strokeDashoffset = String(100 - p * 100);
	}

	const Aud = {
		ac: null,
		muted: false,
		init() {
			if (this.ac) return;
			const AC = window.AudioContext || window.webkitAudioContext;
			if (!AC) return;
			this.ac = new AC();
			this.out = this.ac.createGain();
			this.out.gain.value = 0.35;
			const dl = this.ac.createDelay(1);
			dl.delayTime.value = 0.32;
			const fb = this.ac.createGain();
			fb.gain.value = 0.38;
			this.out.connect(this.ac.destination);
			this.out.connect(dl);
			dl.connect(fb);
			fb.connect(dl);
			dl.connect(this.ac.destination);
		},
		note(deg, delay = 0, vol = 0.08, dur = 2.2) {
			if (!this.ac || this.muted) return;
			const sc = [0, 2, 4, 7, 9];
			const f = 220 * Math.pow(2, (sc[((deg % 5) + 5) % 5] + 12 * Math.floor(deg / 5)) / 12);
			const t = this.ac.currentTime + delay;
			const o = this.ac.createOscillator();
			const g = this.ac.createGain();
			o.type = 'triangle';
			o.frequency.value = f;
			g.gain.setValueAtTime(0, t);
			g.gain.linearRampToValueAtTime(vol, t + 0.02);
			g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
			o.connect(g);
			g.connect(this.out);
			o.start(t);
			o.stop(t + dur + 0.05);
		},
		loop(size, gathered) {
			// small loops ring high and short, wide loops low and long
			const top = size < 90 ? 10 : size < 180 ? 7 : 4;
			const n = 3 + gathered;
			for (let i = 0; i < n; i++) this.note(top + i, i * 0.09, 0.07, 1.6 + 0.004 * size);
		},
		finish() {
			[0, 2, 4, 5, 7, 9, 12].forEach((d, i) => this.note(d + 3, i * 0.22, 0.07, 4));
		}
	};

	const KEYS = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
	addEventListener('keydown', (e) => {
		Aud.init();
		if (KEYS[e.code]) {
			keys.add(KEYS[e.code]);
			e.preventDefault();
		} else if (e.code === 'Space') {
			e.preventDefault();
			if (done && done.t > 1.5) reset();
		} else if (e.code === 'KeyR') reset();
		else if (e.code === 'KeyM') Aud.muted = !Aud.muted;
	});
	addEventListener('keyup', (e) => KEYS[e.code] && keys.delete(KEYS[e.code]));
	addEventListener('blur', () => keys.clear());
	addEventListener('pointerdown', (e) => {
		Aud.init();
		pointer = { x: e.clientX, y: e.clientY };
		if (done && done.t > 1.5) reset();
	});
	addEventListener('pointermove', (e) => {
		if (pointer) pointer = { x: e.clientX, y: e.clientY };
	});
	addEventListener('pointerup', () => (pointer = null));
	addEventListener('pointercancel', () => (pointer = null));

	// ------------------------------------------------------------------ boot

	function resize() {
		W = innerWidth;
		H = innerHeight;
		S = Math.min(devicePixelRatio || 1, 1.5);
		k = Math.min(W, H) / 720;
		view.width = Math.round(W * S);
		view.height = Math.round(H * S);
		buildScene();
		reset();
	}
	addEventListener('resize', () => {
		clearTimeout(resize.t);
		resize.t = setTimeout(resize, 200);
	});

	let last = 0;
	function frameLoop(ts) {
		const dt = Math.min(0.05, last ? (ts - last) / 1000 : 0.016);
		last = ts;
		update(dt);
		render();
		requestAnimationFrame(frameLoop);
	}
	resize();
	requestAnimationFrame(frameLoop);

	// test hooks
	window.__embrace = {
		snake,
		get coverage() {
			return coverage;
		},
		get done() {
			return done;
		},
		keys,
		T,
		teleport: (x, y, ang) => {
			snake.x = x;
			snake.y = y;
			snake.ang = ang;
			trail.push({ x, y, t: time, g: true, s: travelled });
			loopFrom = trail.length - 1;
		},
		step: (n, dt = 1 / 60) => {
			for (let i = 0; i < n; i++) update(dt);
			render();
		}
	};
})();
