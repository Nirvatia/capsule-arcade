// Scenes of the look prototype: two palettes × title, Current, Canvas and reveal frames.
/* global Paint, PICTURES */
'use strict';

const Scenes = (() => {
	const { TAU, rng, wash, bloom, paper, spline, resample, frame, roundCorners, brush, enso, fillPoly } = Paint;
	const W = 1280;
	const H = 720;

	/** Palettes: A — dusk water and warm paper, B — pale world that gets its colour back. */
	const PAL = {
		A: {
			dark: true,
			sky: ['#3b5180', '#25335c', '#121a34'],
			surface: '#a9bde0',
			washes: ['#6a5a9c', '#2f7486', '#7a5f9a'],
			far: '#2b3966',
			near: '#161f40',
			kelp: '#0f1731',
			shaft: 'rgba(200,216,240,0.07)',
			mote: 'rgba(230,236,245,0.55)',
			spark: '#fff1cc',
			sparkHalo: 'rgba(244,214,150,0.9)',
			enso: '#efe4ca',
			ensoWash: '#8d7cc4',
			ink: '#0d1426',
			body: '#4f949b',
			belly: '#c9e2da',
			mark: '#285e69',
			fin: '#e8a6b4',
			finEdge: '#f6d3da',
			eye: '#0d1426',
			text: '#ece4d2',
			dim: 'rgba(236,228,210,0.6)',
			paper: '#efe7d6',
			paperInk: '#1e2843',
			pencil: 'rgba(110,104,92,0.55)',
			gridDot: 'rgba(120,110,92,0.2)'
		},
		B: {
			dark: false,
			sky: ['#f3f2ef', '#e2e4e4', '#cdd2d5'],
			surface: '#ffffff',
			washes: ['#c4c9cd', '#b5bcc2', '#d5d8d9'],
			far: '#c3c9ce',
			near: '#9aa3ab',
			kelp: '#88929b',
			shaft: 'rgba(255,255,255,0.35)',
			mote: 'rgba(90,100,110,0.35)',
			spark: '#2c3440',
			sparkHalo: 'rgba(225,150,130,0.8)',
			enso: '#2a313c',
			ensoWash: '#d9a691',
			ink: '#262c36',
			body: '#eceeed',
			belly: '#ffffff',
			mark: '#a3acb4',
			fin: '#e39484',
			finEdge: '#c96f60',
			eye: '#262c36',
			text: '#2a313c',
			dim: 'rgba(42,49,60,0.55)',
			paper: '#f2ecdf',
			paperInk: '#262c36',
			pencil: 'rgba(110,104,92,0.5)',
			gridDot: 'rgba(120,110,92,0.2)'
		}
	};

	function hsl(h, s, l) {
		return `hsl(${h},${s}%,${l}%)`;
	}

	// ------------------------------------------------------------------ backgrounds

	function water(ctx, pal, seed, opts = {}) {
		const r = rng(seed);
		const g = ctx.createLinearGradient(0, 0, 0, H);
		g.addColorStop(0, pal.sky[0]);
		g.addColorStop(0.5, pal.sky[1]);
		g.addColorStop(1, pal.sky[2]);
		ctx.fillStyle = g;
		ctx.fillRect(0, 0, W, H);
		// light from the surface
		bloom(ctx, W * 0.42, -H * 0.2, H * 1.05, pal.surface, pal.dark ? 0.35 : 0.8, pal.dark ? 'screen' : 'source-over');
		if (pal.dark) bloom(ctx, W * 0.86, H * 0.12, H * 0.55, '#d79aa8', 0.16, 'screen');
		// a few large quiet washes, analogous colours only
		for (let i = 0; i < 4; i++) {
			const c = pal.washes[i % pal.washes.length];
			wash(ctx, { x: W * (0.15 + 0.25 * i) + r.gauss() * 60, y: H * (0.25 + 0.3 * r()), r: 200 + r() * 160 }, c, {
				rng: r,
				alpha: pal.dark ? 0.012 : 0.006,
				layers: 40,
				sx: 1.7,
				sy: 0.75,
				rot: r.gauss() * 0.2,
				spread: 0.14
			});
		}
		// colours that came back (variant B): clean soft washes in the hues of finished pictures
		for (const [i, hue] of (opts.colors || []).entries()) {
			const x = W * (0.2 + 0.5 * i);
			const y = H * (0.62 - 0.18 * i);
			wash(ctx, { x, y, r: 190 }, hsl(hue, 45, 72), { rng: r, alpha: 0.022, layers: 44, sx: 1.6, sy: 0.8, blend: 'multiply', spread: 0.15, edge: 0.06 });
		}
		// soft shafts of light: feathered across their width and fading with depth
		const layer = document.createElement('canvas');
		layer.width = W;
		layer.height = H;
		const lc = layer.getContext('2d');
		for (let i = 0; i < 4; i++) {
			const x = W * (0.16 + 0.22 * i) + r.gauss() * 30;
			const w = 70 + r() * 80;
			lc.save();
			lc.translate(x, 0);
			lc.transform(1, 0, 0.32, 1, 0, 0);
			const lg = lc.createLinearGradient(-w / 2, 0, w / 2, 0);
			lg.addColorStop(0, 'rgba(255,255,255,0)');
			lg.addColorStop(0.5, pal.shaft);
			lg.addColorStop(1, 'rgba(255,255,255,0)');
			lc.fillStyle = lg;
			lc.fillRect(-w / 2, 0, w, H);
			lc.restore();
		}
		lc.globalCompositeOperation = 'destination-in';
		const fade = lc.createLinearGradient(0, 0, 0, H * 0.8);
		fade.addColorStop(0, 'rgba(0,0,0,1)');
		fade.addColorStop(1, 'rgba(0,0,0,0)');
		lc.fillStyle = fade;
		lc.fillRect(0, 0, W, H);
		ctx.save();
		ctx.globalCompositeOperation = pal.dark ? 'screen' : 'source-over';
		ctx.drawImage(layer, 0, 0);
		ctx.restore();
		reef(ctx, pal, r);
		ctx.fillStyle = pal.mote;
		for (let i = 0; i < 60; i++) {
			const sz = r();
			ctx.globalAlpha = 0.12 + 0.45 * sz;
			ctx.beginPath();
			ctx.arc(r() * W, r() * H * 0.85, 0.5 + 1.3 * sz * sz, 0, TAU);
			ctx.fill();
		}
		ctx.globalAlpha = 1;
		paper(ctx, W, H, pal.dark ? 0.1 : 0.16, pal.dark ? 'overlay' : 'multiply', seed);
	}

	/** Smooth closed silhouette from a list of points along its top edge. */
	function silhouette(ctx, top, color, alpha, r, texture) {
		const pts = spline(top, 10);
		const poly = [{ x: pts[0].x, y: H + 20 }, ...pts, { x: pts[pts.length - 1].x, y: H + 20 }];
		ctx.save();
		ctx.globalAlpha = alpha;
		ctx.fillStyle = color;
		fillPoly(ctx, poly);
		ctx.restore();
		if (texture) {
			ctx.save();
			ctx.beginPath();
			poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
			ctx.closePath();
			ctx.clip();
			for (let i = 0; i < 5; i++)
				wash(ctx, { x: r() * W, y: H * (0.85 + 0.1 * r()), r: 120 + r() * 120 }, texture, { rng: r, alpha: 0.02, layers: 24, sx: 1.8, sy: 0.6 });
			ctx.restore();
		}
	}

	/** Two layers of rounded rocks with an arch, and a few long kelp ribbons. */
	function reef(ctx, pal, r) {
		const far = [];
		for (let x = -220; x <= W + 220; x += 110) far.push({ x, y: H * 0.74 - Math.pow(Math.abs(Math.sin(x * 0.004 + 1.3)), 2) * 90 - r() * 20 });
		silhouette(ctx, far, pal.far, pal.dark ? 0.75 : 0.55, r, pal.dark ? '#3a4a7a' : '#d4d8da');
		// an arch of stone on the right, far layer
		ctx.save();
		ctx.globalAlpha = pal.dark ? 0.7 : 0.5;
		ctx.fillStyle = pal.far;
		ctx.beginPath();
		const ax = W * 0.83;
		const ay = H * 0.72;
		ctx.moveTo(ax - 120, ay + 40);
		ctx.bezierCurveTo(ax - 110, ay - 170, ax + 120, ay - 190, ax + 130, ay + 40);
		ctx.lineTo(ax + 80, ay + 40);
		ctx.bezierCurveTo(ax + 70, ay - 110, ax - 60, ay - 100, ax - 70, ay + 40);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
		const near = [];
		for (let x = -280; x <= W + 280; x += 140) near.push({ x, y: H * 0.9 - Math.pow(Math.abs(Math.sin(x * 0.0035 + 0.2)), 3) * 70 - r() * 14 });
		silhouette(ctx, near, pal.near, pal.dark ? 0.95 : 0.7, r, null);
		for (let i = 0; i < 5; i++) {
			const x = W * (0.06 + 0.2 * i) + r.gauss() * 40;
			const h = 140 + r() * 190;
			const pts = [];
			for (let k = 0; k <= 10; k++) pts.push({ x: x + Math.sin(k * 0.5 + i * 1.7) * 22 * (k / 10), y: H + 10 - (h * k) / 10 });
			brush(ctx, spline(pts, 6), 11 + r() * 5, pal.kelp, { rng: r, alpha: pal.dark ? 0.9 : 0.45, taper: 0.5, dry: false, grit: 0.02, wobble: 0.6 });
		}
	}

	function sparks(ctx, pal, seed, n, avoid) {
		const r = rng(seed);
		for (let i = 0; i < n; i++) {
			let x;
			let y;
			do {
				x = 60 + r() * (W - 120);
				y = 70 + r() * (H * 0.62);
			} while (avoid && Math.hypot(x - avoid.x, y - avoid.y) < avoid.r);
			const big = r() < 0.15;
			bloom(ctx, x, y, big ? 26 : 16, pal.sparkHalo, pal.dark ? 0.55 : 0.5, pal.dark ? 'screen' : 'multiply');
			ctx.fillStyle = pal.spark;
			ctx.beginPath();
			ctx.arc(x, y, big ? 2.8 : 1.9, 0, TAU);
			ctx.fill();
		}
	}

	function portal(ctx, pal, x, y, R, seed) {
		const r = rng(seed);
		bloom(ctx, x, y, R * 1.5, pal.ensoWash, pal.dark ? 0.45 : 0.4, pal.dark ? 'screen' : 'multiply');
		enso(ctx, x, y, R, R * 0.2, pal.enso, { rng: r, alpha: 0.9 });
		enso(ctx, x, y, R * 0.62, R * 0.07, pal.enso, { rng: r, alpha: 0.45, start: 1.4, span: 0.75 });
	}

	// ------------------------------------------------------------------ the creature

	/**
	 * A living sea serpent seen from the side: tapered body with soft bands, a long translucent
	 * fin along the back with fine rays, a trailing tail wisp, a small head with one almond eye
	 * and two whiskers. `spine` goes from the snout to the tail tip.
	 */
	function creature(ctx, spine, R, pal, o = {}) {
		const r = rng(o.seed || 5);
		const P = frame(resample(spine, 2.5));
		const n = P.length;
		// the fin sits on the side that faces up at the neck
		const neck = P[Math.min(n - 1, 8)];
		const side = neck.ny < 0 ? 1 : -1;
		const half = (u) => {
			const neckU = 0.07;
			if (u < neckU) return R * (0.78 + 0.22 * (u / neckU));
			const tail = Math.pow(1 - (u - neckU) / (1 - neckU), 1.15);
			return R * (0.06 + 0.94 * Math.min(1, tail * 1.25));
		};
		const pts = P.map((p, i) => {
			const u = i / (n - 1);
			const w = half(u);
			return { ...p, u, w, ux: p.x + p.nx * w * side, uy: p.y + p.ny * w * side, lx: p.x - p.nx * w * side, ly: p.y - p.ny * w * side };
		});

		// fin: a ribbon that swells and ripples along the back
		const fin = pts.map((p, i) => {
			const u = p.u;
			const env = u < 0.1 || u > 0.97 ? 0 : Math.pow(Math.sin((Math.PI * (u - 0.1)) / 0.87), 0.7);
			const ripple = 0.75 + 0.25 * Math.sin(u * 26 + (o.phase || 0));
			const h = R * (o.finH ?? 1.35) * env * ripple;
			return { x: p.ux + p.nx * side * h - p.tx * h * 0.25, y: p.uy + p.ny * side * h - p.ty * h * 0.25, i };
		});
		ctx.save();
		ctx.beginPath();
		pts.forEach((p, i) => (i ? ctx.lineTo(p.ux, p.uy) : ctx.moveTo(p.ux, p.uy)));
		for (let i = n - 1; i >= 0; i--) ctx.lineTo(fin[i].x, fin[i].y);
		ctx.closePath();
		ctx.fillStyle = pal.fin;
		ctx.globalAlpha = 0.34;
		ctx.fill();
		ctx.globalAlpha = 0.22;
		ctx.strokeStyle = pal.finEdge;
		ctx.lineWidth = 0.8;
		for (let i = 6; i < n - 4; i += 5) {
			ctx.beginPath();
			ctx.moveTo(pts[i].ux, pts[i].uy);
			ctx.lineTo(fin[i].x, fin[i].y);
			ctx.stroke();
		}
		ctx.globalAlpha = 0.6;
		ctx.lineWidth = 1;
		ctx.beginPath();
		fin.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
		ctx.stroke();
		ctx.restore();

		// tail wisp: a thin ribbon continuing past the tip
		const tip = pts[n - 1];
		const wisp = [];
		for (let k = 0; k <= 10; k++) {
			const d = k * R * 0.55;
			wisp.push({ x: tip.x + tip.tx * d + tip.nx * Math.sin(k * 0.7 + (o.phase || 0)) * R * 0.5 * (k / 10), y: tip.y + tip.ty * d + tip.ny * Math.sin(k * 0.7 + (o.phase || 0)) * R * 0.5 * (k / 10) });
		}
		brush(ctx, spline(wisp, 4), R * 0.5, pal.fin, { rng: r, alpha: 0.5, taper: 0.5, dry: false });

		// body
		const outline = () => {
			ctx.beginPath();
			pts.forEach((p, i) => (i ? ctx.lineTo(p.ux, p.uy) : ctx.moveTo(p.ux, p.uy)));
			for (let i = n - 1; i >= 0; i--) ctx.lineTo(pts[i].lx, pts[i].ly);
			ctx.closePath();
		};
		ctx.save();
		outline();
		ctx.fillStyle = pal.body;
		ctx.fill();
		ctx.clip();
		// lighter belly along the lower side
		ctx.globalAlpha = 0.55;
		ctx.strokeStyle = pal.belly;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		ctx.beginPath();
		pts.forEach((p, i) => {
			const x = p.lx + (p.x - p.lx) * 0.25;
			const y = p.ly + (p.y - p.ly) * 0.25;
			if (i) ctx.lineTo(x, y);
			else ctx.moveTo(x, y);
		});
		ctx.lineWidth = R * 0.9;
		ctx.stroke();
		// soft darker bands across the back
		ctx.globalAlpha = 0.38;
		ctx.fillStyle = pal.mark;
		const band = R * 2.2;
		let s = 0;
		for (let i = 1; i < n; i++) {
			s += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
			if (pts[i].u < 0.1) continue;
			const ph = (s % band) / band;
			if (ph < 0.06) {
				const p = pts[i];
				const w = p.w;
				ctx.beginPath();
				ctx.ellipse(p.x + p.nx * side * w * 0.35, p.y + p.ny * side * w * 0.35, w * 0.32, w * 0.75, Math.atan2(p.ty, p.tx), 0, TAU);
				ctx.fill();
			}
		}
		ctx.restore();
		// ink outline, thicker on the back
		ctx.save();
		ctx.strokeStyle = pal.ink;
		ctx.globalAlpha = 0.85;
		ctx.lineJoin = 'round';
		ctx.lineWidth = 1.6;
		ctx.beginPath();
		pts.forEach((p, i) => (i ? ctx.lineTo(p.ux, p.uy) : ctx.moveTo(p.ux, p.uy)));
		ctx.stroke();
		ctx.lineWidth = 1;
		ctx.globalAlpha = 0.6;
		ctx.beginPath();
		pts.forEach((p, i) => (i ? ctx.lineTo(p.lx, p.ly) : ctx.moveTo(p.lx, p.ly)));
		ctx.stroke();
		ctx.restore();

		head(ctx, pts[0], R, pal, side, o.phase || 0);
	}

	function head(ctx, p, R, pal, side, phase) {
		const ang = Math.atan2(-p.ty, -p.tx);
		ctx.save();
		ctx.translate(p.x, p.y);
		ctx.rotate(ang);
		ctx.scale(1, side === 1 ? -1 : 1);
		// here +x is forward and -y is the back (fin) side
		const L = R * 2.3;
		const Hh = R * 1.05;
		// whiskers trailing back from the jaw
		ctx.strokeStyle = pal.ink;
		ctx.lineWidth = 0.9;
		ctx.globalAlpha = 0.7;
		for (const k of [0, 1]) {
			ctx.beginPath();
			ctx.moveTo(L * 0.72, Hh * 0.45);
			ctx.bezierCurveTo(L * 0.5, Hh * (1.4 + k * 0.5), -L * 0.2, Hh * (1.2 + k * 0.4 + 0.2 * Math.sin(phase)), -L * (0.8 + 0.3 * k), Hh * (1.5 + k * 0.6));
			ctx.stroke();
		}
		ctx.globalAlpha = 1;
		// head shape: rounded skull, long gentle snout
		ctx.beginPath();
		ctx.moveTo(-R * 0.3, -Hh * 0.78);
		ctx.bezierCurveTo(L * 0.15, -Hh * 1.15, L * 0.6, -Hh * 0.9, L * 0.95, -Hh * 0.28);
		ctx.quadraticCurveTo(L * 1.05, 0, L * 0.9, Hh * 0.3);
		ctx.bezierCurveTo(L * 0.6, Hh * 0.8, L * 0.15, Hh * 0.95, -R * 0.3, Hh * 0.78);
		ctx.closePath();
		ctx.fillStyle = pal.body;
		ctx.fill();
		ctx.save();
		ctx.clip();
		ctx.globalAlpha = 0.55;
		ctx.fillStyle = pal.belly;
		ctx.beginPath();
		ctx.ellipse(L * 0.45, Hh * 0.7, L * 0.6, Hh * 0.45, 0, 0, TAU);
		ctx.fill();
		ctx.restore();
		ctx.strokeStyle = pal.ink;
		ctx.globalAlpha = 0.85;
		ctx.lineWidth = 1.5;
		ctx.stroke();
		// mouth line
		ctx.lineWidth = 0.9;
		ctx.beginPath();
		ctx.moveTo(L * 0.92, Hh * 0.2);
		ctx.quadraticCurveTo(L * 0.7, Hh * 0.42, L * 0.5, Hh * 0.36);
		ctx.stroke();
		// almond eye with a lid line
		const ex = L * 0.52;
		const ey = -Hh * 0.22;
		ctx.globalAlpha = 1;
		ctx.fillStyle = pal.eye;
		ctx.beginPath();
		ctx.ellipse(ex, ey, R * 0.32, R * 0.24, -0.15, 0, TAU);
		ctx.fill();
		ctx.fillStyle = 'rgba(255,250,240,0.9)';
		ctx.beginPath();
		ctx.arc(ex + R * 0.1, ey - R * 0.08, R * 0.08, 0, TAU);
		ctx.fill();
		ctx.strokeStyle = pal.ink;
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(ex - R * 0.45, ey - R * 0.12);
		ctx.quadraticCurveTo(ex, ey - R * 0.48, ex + R * 0.45, ey - R * 0.18);
		ctx.stroke();
		ctx.restore();
	}

	// ------------------------------------------------------------------ text

	function label(ctx, pal, text, x, y, size, o = {}) {
		ctx.save();
		ctx.fillStyle = o.color || pal.text;
		ctx.globalAlpha = o.alpha ?? 1;
		ctx.font = `${o.weight || 300} ${size}px "Cormorant Garamond", "EB Garamond", Georgia, serif`;
		ctx.textAlign = o.align || 'left';
		ctx.textBaseline = 'middle';
		if (o.spacing) {
			const chars = [...text];
			const widths = chars.map((c) => ctx.measureText(c).width + o.spacing);
			const total = widths.reduce((a, b) => a + b, 0) - o.spacing;
			let cx = o.align === 'center' ? x - total / 2 : x;
			ctx.textAlign = 'left';
			chars.forEach((c, i) => {
				ctx.fillText(c, cx, y);
				cx += widths[i];
			});
		} else ctx.fillText(text, x, y);
		ctx.restore();
	}

	function hud(ctx, pal, pic, lit, total, sparkText) {
		label(ctx, pal, `Рисунок ${pic}`, 40, 38, 20, { color: pal.dim, spacing: 2 });
		for (let i = 0; i < total; i++) {
			ctx.save();
			ctx.translate(46 + i * 16, 64);
			ctx.rotate(Math.PI / 4);
			ctx.strokeStyle = pal.dim;
			ctx.fillStyle = pal.dim;
			ctx.lineWidth = 1;
			if (i < lit) ctx.fillRect(-3.5, -3.5, 7, 7);
			else ctx.strokeRect(-3.5, -3.5, 7, 7);
			ctx.restore();
		}
		if (sparkText) label(ctx, pal, sparkText, W / 2, 38, 20, { color: pal.dim, align: 'center', spacing: 2 });
	}

	// ------------------------------------------------------------------ frames

	function serpentSpine(x, y, len, dir, amp, waves, phase) {
		const pts = [];
		for (let k = 0; k <= 24; k++) {
			const s = (k / 24) * len;
			const off = Math.sin((k / 24) * TAU * waves + phase) * amp * Math.min(1, k / 5);
			pts.push({ x: x - Math.cos(dir) * s - Math.sin(dir) * off, y: y - Math.sin(dir) * s + Math.cos(dir) * off });
		}
		return spline(pts, 6);
	}

	function title(ctx, v) {
		const pal = PAL[v];
		water(ctx, pal, 11, { colors: v === 'B' ? [186] : [] });
		sparks(ctx, pal, 4, 10, { x: W / 2, y: H * 0.42, r: 260 });
		creature(ctx, serpentSpine(W * 0.8, H * 0.83, 520, -0.06, 26, 1.4, 0.6), 12, pal, { seed: 2, phase: 1 });
		label(ctx, pal, 'ДРЕЙФ', W / 2, H * 0.33, 96, { align: 'center', spacing: 30, weight: 300 });
		label(ctx, pal, 'спокойная змейка · без поражений', W / 2, H * 0.33 + 74, 20, { align: 'center', spacing: 4, color: pal.dim, weight: 400 });
		const items = ['Плыть', 'Альбом', 'Звук: вкл', 'В зал игр'];
		items.forEach((t, i) => label(ctx, pal, t, W / 2, H * 0.55 + i * 38, 22, { align: 'center', spacing: 2, color: i ? pal.dim : pal.text, weight: i ? 400 : 500 }));
		brush(ctx, [{ x: W / 2 - 60, y: H * 0.55 + 18 }, { x: W / 2 + 60, y: H * 0.55 + 16 }], 2.2, pal.text, { seed: 3, alpha: 0.6, taper: 0.4 });
	}

	function current(ctx, v) {
		const pal = PAL[v];
		water(ctx, pal, 21, { colors: v === 'B' ? [186, 300] : [] });
		const gate = { x: W * 0.78, y: H * 0.36 };
		portal(ctx, pal, gate.x, gate.y, 54, 8);
		sparks(ctx, pal, 6, 12, { x: gate.x, y: gate.y, r: 120 });
		creature(ctx, serpentSpine(W * 0.5, H * 0.5, 430, -0.35, 40, 1.15, 2.2), 12, pal, { seed: 3, phase: 2.5 });
		hud(ctx, pal, 'IV', 4, 7, 'искры  5 / 5');
	}

	function paperSheet(ctx, pal, seed) {
		ctx.fillStyle = pal.paper;
		ctx.fillRect(0, 0, W, H);
		const r = rng(seed);
		// very faint unevenness of the sheet and a soft darker edge
		for (let i = 0; i < 5; i++) bloom(ctx, r() * W, r() * H, 260 + r() * 200, 'rgba(196,182,150,1)', 0.08, 'multiply');
		const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
		v.addColorStop(0, 'rgba(0,0,0,0)');
		v.addColorStop(1, 'rgba(120,100,70,0.22)');
		ctx.fillStyle = v;
		ctx.fillRect(0, 0, W, H);
		paper(ctx, W, H, 0.22, 'multiply', seed);
		return r;
	}

	/** Wet colour along a stroke: overlapping soft blooms, slightly irregular. */
	function bleed(ctx, pts, color, size, r, a = 0.16) {
		for (let k = 0; k < pts.length; k++) {
			const p = pts[k];
			bloom(ctx, p.x + r.gauss() * size * 0.15, p.y + r.gauss() * size * 0.15, size * (0.8 + r() * 0.5), color, a, 'multiply');
		}
	}

	/** Canvas world: a sheet of paper; the picture is drawn with ink, lit strokes bleed colour. */
	function canvas(ctx, v) {
		const pal = PAL[v];
		const pic = PICTURES.whale;
		const hue = pic.hue;
		const r = paperSheet(ctx, pal, 31);
		const c = 46;
		const gx = (W - c * 24) / 2;
		const gy = (H - c * 14) / 2 + 22;
		const cellPx = (q) => ({ x: gx + (q[0] + 0.5) * c, y: gy + (q[1] + 0.5) * c });
		ctx.fillStyle = pal.gridDot;
		for (let x = 0; x < 24; x++)
			for (let y = 0; y < 14; y++) {
				ctx.beginPath();
				ctx.arc(gx + (x + 0.5) * c, gy + (y + 0.5) * c, 1.2, 0, TAU);
				ctx.fill();
			}
		const lit = new Set(pic.cycles[0]);
		const pending = pic.cycles[1];
		const color = hsl(hue, 55, 66);
		pic.strokes.forEach((s, i) => {
			if (!lit.has(i)) return;
			bleed(ctx, resample(roundCorners(s.cells.map(cellPx), c * 0.45), c * 0.6), color, c * 0.7, r, 0.14);
		});
		pic.strokes.forEach((s, i) => {
			if (!lit.has(i)) return;
			const pts = roundCorners(s.cells.map(cellPx), c * 0.45);
			if (pts.length === 1) {
				ctx.fillStyle = pal.paperInk;
				ctx.beginPath();
				ctx.arc(pts[0].x, pts[0].y, 5, 0, TAU);
				ctx.fill();
				return;
			}
			brush(ctx, pts, 5, pal.paperInk, { seed: 40 + i, alpha: 0.9 });
		});
		// pending strokes: a light pencil line with an ink asterisk at each end
		pending.forEach((i, j) => {
			const pts = pic.strokes[i].cells.map(cellPx);
			ctx.save();
			ctx.strokeStyle = pal.pencil;
			ctx.lineWidth = 1;
			ctx.setLineDash([1.5, 6]);
			ctx.lineCap = 'round';
			ctx.beginPath();
			pts.forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
			ctx.stroke();
			ctx.restore();
			const ends = pts.length === 1 ? [pts[0]] : [pts[0], pts[pts.length - 1]];
			for (const e of ends) star(ctx, e.x, e.y, 7, pal.paperInk, j * 0.4);
		});
		// the snake is tracing the lower edge of the tail: the traced part is fresh ink
		const s = pic.strokes[pending[0]].cells;
		const done = Math.max(2, Math.ceil(s.length * 0.6));
		const traced = s.slice(0, done);
		const tracedPts = roundCorners(traced.map(cellPx), c * 0.45);
		bleed(ctx, resample(tracedPts, c * 0.6), color, c * 0.6, r, 0.08);
		brush(ctx, tracedPts, 3.5, pal.paperInk, { seed: 77, alpha: 0.55 });
		// body: the traced cells plus a short straight run into the first cell
		const first = s[0];
		const second = s[1];
		const back = [first[0] - (second[0] - first[0]), first[1] - (second[1] - first[1])];
		const body = [];
		for (let k = 4; k >= 1; k--) body.push([first[0] + (back[0] - first[0]) * k, first[1] + (back[1] - first[1]) * k]);
		const cells = body.concat(traced).slice(-8);
		const spine = roundCorners(cells.map(cellPx), c * 0.5).reverse();
		const head = spine[0];
		const nextCell = s[done];
		// push the head a little forward along the next step so it is mid-move
		if (nextCell) {
			const np = cellPx(nextCell);
			spine.unshift({ x: head.x + (np.x - head.x) * 0.35, y: head.y + (np.y - head.y) * 0.35 });
			star(ctx, np.x, np.y, 0, pal.paperInk, 0, true);
		}
		// on paper the snake becomes the brush itself: ink body, the fin takes the picture colour
		creature(ctx, resample(spine, 3), c * 0.2, { ...pal, ink: pal.paperInk, body: '#2a3452', belly: '#56617f', mark: '#141b30', fin: hsl(hue, 50, 62), finEdge: hsl(hue, 45, 45), eye: '#f4eee0' }, { seed: 9, phase: 1.2, finH: 1.15 });
		label(ctx, pal, 'Рисунок IV', 40, 38, 20, { color: 'rgba(40,40,50,0.55)', spacing: 2 });
	}

	function star(ctx, x, y, R, color, rot, ring) {
		ctx.save();
		ctx.translate(x, y);
		ctx.strokeStyle = color;
		if (ring) {
			ctx.globalAlpha = 0.45;
			ctx.lineWidth = 1.2;
			ctx.beginPath();
			ctx.arc(0, 0, 12, 0, TAU);
			ctx.stroke();
			ctx.restore();
			return;
		}
		ctx.rotate(rot);
		ctx.globalAlpha = 0.8;
		ctx.lineWidth = 1.4;
		ctx.lineCap = 'round';
		for (let k = 0; k < 4; k++) {
			const a = (k * Math.PI) / 4;
			const l = k % 2 ? R * 0.55 : R;
			ctx.beginPath();
			ctx.moveTo(-Math.cos(a) * l, -Math.sin(a) * l);
			ctx.lineTo(Math.cos(a) * l, Math.sin(a) * l);
			ctx.stroke();
		}
		ctx.restore();
	}

	/** Reveal: the finished picture as an ink drawing filled with watercolour on the paper. */
	function reveal(ctx, v) {
		const pal = PAL[v];
		const pic = PICTURES.whale;
		const hue = pic.hue;
		const r = paperSheet(ctx, pal, 51);
		const c = 46;
		const gx = (W - c * 24) / 2;
		const gy = (H - c * 14) / 2 - 6;
		const P = (p) => ({ x: gx + p[0] * c, y: gy + p[1] * c });
		// silhouette: back (0) → fluke (3, reversed) → lower tail (2, reversed) → belly (1, reversed)
		const sm = (i) => pic.strokes[i].smooth.map(P);
		const outline = [...sm(0), ...sm(3).slice().reverse(), ...sm(2).slice().reverse(), ...sm(1).slice().reverse()];
		ctx.save();
		ctx.beginPath();
		outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
		ctx.closePath();
		ctx.clip();
		// wet-in-wet: a pale ground, deeper colour on the back, light belly
		bloom(ctx, gx + 13 * c, gy + 7 * c, c * 9, hsl(hue, 45, 74), 0.9, 'multiply');
		for (let i = 0; i < 26; i++)
			bloom(ctx, gx + (6 + r() * 15) * c, gy + (3 + r() * 4.5) * c, c * (1.4 + r() * 2), hsl(hue + r.gauss() * 10, 50, 60), 0.16, 'multiply');
		for (let i = 0; i < 10; i++) bloom(ctx, gx + (2 + r() * 4) * c, gy + (1 + r() * 4) * c, c * (0.8 + r()), hsl(hue - 8, 48, 62), 0.25, 'multiply');
		for (let i = 0; i < 6; i++) bloom(ctx, gx + (10 + r() * 9) * c, gy + (10.4 + r() * 1.2) * c, c * (1.6 + r()), '#fbf6ea', 0.18);
		ctx.restore();
		// pigment pooling along the edge
		ctx.save();
		ctx.strokeStyle = hsl(hue, 45, 48);
		ctx.globalAlpha = 0.25;
		ctx.lineWidth = 7;
		ctx.lineJoin = 'round';
		ctx.globalCompositeOperation = 'multiply';
		ctx.beginPath();
		outline.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
		ctx.closePath();
		ctx.stroke();
		ctx.restore();
		paper(ctx, W, H, 0.18, 'multiply', 52);
		pic.strokes.forEach((s, i) => {
			const pts = s.smooth.map(P);
			if (pts.length === 1) {
				ctx.fillStyle = pal.paperInk;
				ctx.beginPath();
				ctx.arc(pts[0].x, pts[0].y, 5.5, 0, TAU);
				ctx.fill();
				return;
			}
			brush(ctx, pts, i < 2 ? 6 : 4.5, pal.paperInk, { seed: 60 + i, alpha: 0.92 });
		});
		label(ctx, pal, 'КИТ', W / 2, H - 64, 44, { align: 'center', color: pal.paperInk, weight: 400, spacing: 18 });
		label(ctx, pal, 'записано в альбом', W / 2, H - 30, 18, { align: 'center', color: 'rgba(40,40,50,0.55)', spacing: 3 });
	}

	return { W, H, title, current, canvas, reveal };
})();
