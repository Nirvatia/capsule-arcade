// Watercolour and ink primitives for the look prototype (Canvas 2D, no dependencies).
/* exported Paint */
'use strict';

const Paint = (() => {
	const TAU = Math.PI * 2;

	function rng(seed) {
		let a = seed >>> 0 || 1;
		const next = () => {
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), a | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
		next.gauss = () => {
			const u = 1 - next();
			const v = next();
			return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
		};
		next.range = (a0, b0) => a0 + next() * (b0 - a0);
		return next;
	}

	// ------------------------------------------------------------------ watercolour

	/** Midpoint displacement: each edge gets a new vertex pushed out by a gaussian. */
	function deform(poly, depth, variance, r) {
		let out = poly;
		for (let d = 0; d < depth; d++) {
			const next = [];
			for (let i = 0; i < out.length; i++) {
				const a = out[i];
				const b = out[(i + 1) % out.length];
				next.push(a);
				const len = Math.hypot(b.x - a.x, b.y - a.y);
				const k = variance * (a.v + b.v) * 0.5;
				next.push({
					x: (a.x + b.x) / 2 + r.gauss() * len * k,
					y: (a.y + b.y) / 2 + r.gauss() * len * k,
					v: (a.v + b.v) / 2 + r.gauss() * 0.08
				});
			}
			out = next;
		}
		return out;
	}

	function fillPoly(ctx, poly) {
		ctx.beginPath();
		poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
		ctx.closePath();
		ctx.fill();
	}

	/**
	 * A watercolour wash: many translucent, slightly different deformed copies of one shape.
	 * `shape` — array of {x, y} or a circle {x, y, r}; `color` — css colour without alpha handling.
	 */
	function wash(ctx, shape, color, o = {}) {
		const r = o.rng || rng(o.seed || 1);
		const layers = o.layers ?? 26;
		const alpha = o.alpha ?? 0.035;
		let base;
		if (Array.isArray(shape)) base = shape.map((p) => ({ x: p.x, y: p.y, v: 0.5 + r() * 0.5 }));
		else {
			const n = o.sides ?? 10;
			const sx = o.sx ?? 1;
			const sy = o.sy ?? 1;
			const rot = o.rot ?? 0;
			base = [];
			for (let i = 0; i < n; i++) {
				const a = (i / n) * TAU;
				const x = Math.cos(a) * shape.r * sx;
				const y = Math.sin(a) * shape.r * sy;
				base.push({
					x: shape.x + x * Math.cos(rot) - y * Math.sin(rot),
					y: shape.y + x * Math.sin(rot) + y * Math.cos(rot),
					v: 0.4 + r() * 0.8
				});
			}
		}
		const spread = o.spread ?? 0.11;
		base = deform(base, 2, spread, r);
		let cx = 0;
		let cy = 0;
		for (const p of base) {
			cx += p.x / base.length;
			cy += p.y / base.length;
		}
		ctx.save();
		ctx.globalCompositeOperation = o.blend || 'source-over';
		ctx.fillStyle = color;
		let lastPoly = base;
		for (let i = 0; i < layers; i++) {
			// every layer is a little smaller or larger and more ragged: edges feather out
			const k = 0.9 + r() * 0.16;
			const scaled = base.map((p) => ({ x: cx + (p.x - cx) * k, y: cy + (p.y - cy) * k, v: p.v }));
			lastPoly = deform(scaled, 3, spread * 1.7, r);
			ctx.globalAlpha = alpha;
			fillPoly(ctx, lastPoly);
		}
		if (o.edge) {
			// pigment pools at the edge of a dried wash
			ctx.globalAlpha = o.edge;
			ctx.strokeStyle = color;
			ctx.lineWidth = o.edgeW ?? 1.2;
			ctx.beginPath();
			lastPoly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
			ctx.closePath();
			ctx.stroke();
		}
		ctx.restore();
	}

	/** Any css colour → [r, g, b] (cached), so a gradient can fade to the same colour, not to black. */
	const rgbCache = new Map();
	const probe = document.createElement('canvas').getContext('2d');
	function rgb(color) {
		let v = rgbCache.get(color);
		if (v) return v;
		probe.clearRect(0, 0, 1, 1);
		probe.fillStyle = color;
		probe.fillRect(0, 0, 1, 1);
		const d = probe.getImageData(0, 0, 1, 1).data;
		v = [d[0], d[1], d[2]];
		rgbCache.set(color, v);
		return v;
	}

	/** Soft round bloom of colour (radial gradient), for light and wet pigment. */
	function bloom(ctx, x, y, r, color, a, blend = 'source-over') {
		ctx.save();
		ctx.globalCompositeOperation = blend;
		const [cr, cg, cb] = rgb(color);
		const g = ctx.createRadialGradient(x, y, 0, x, y, r);
		g.addColorStop(0, `rgba(${cr},${cg},${cb},1)`);
		g.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.45)`);
		g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
		ctx.globalAlpha = a;
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(x, y, r, 0, TAU);
		ctx.fill();
		ctx.restore();
	}

	/** Paper grain: fine noise plus a few soft fibres, cached per size and tone. */
	const grainCache = new Map();
	function grain(w, h, seed = 7) {
		const key = `${w}x${h}:${seed}`;
		if (grainCache.has(key)) return grainCache.get(key);
		const c = document.createElement('canvas');
		c.width = w;
		c.height = h;
		const x = c.getContext('2d');
		const img = x.createImageData(w, h);
		const r = rng(seed);
		for (let i = 0; i < img.data.length; i += 4) {
			const v = 128 + (r() - 0.5) * 90;
			img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
			img.data[i + 3] = 255;
		}
		x.putImageData(img, 0, 0);
		x.globalAlpha = 0.05;
		x.strokeStyle = '#000';
		for (let i = 0; i < (w * h) / 9000; i++) {
			const px = r() * w;
			const py = r() * h;
			const a = r() * TAU;
			const l = 6 + r() * 26;
			x.lineWidth = 0.5 + r();
			x.beginPath();
			x.moveTo(px, py);
			x.quadraticCurveTo(px + Math.cos(a + 0.6) * l * 0.5, py + Math.sin(a + 0.6) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l);
			x.stroke();
		}
		grainCache.set(key, c);
		return c;
	}

	function paper(ctx, w, h, strength = 0.18, blend = 'overlay', seed = 7) {
		ctx.save();
		ctx.globalCompositeOperation = blend;
		ctx.globalAlpha = strength;
		ctx.drawImage(grain(Math.ceil(w), Math.ceil(h), seed), 0, 0, w, h);
		ctx.restore();
	}

	// ------------------------------------------------------------------ curves

	/** Catmull-Rom through points, `per` samples per segment. */
	function spline(pts, per = 12) {
		const out = [];
		for (let i = 0; i < pts.length - 1; i++) {
			const p0 = pts[Math.max(0, i - 1)];
			const p1 = pts[i];
			const p2 = pts[i + 1];
			const p3 = pts[Math.min(pts.length - 1, i + 2)];
			for (let k = 0; k < per; k++) {
				const t = k / per;
				const t2 = t * t;
				const t3 = t2 * t;
				out.push({
					x: 0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
					y: 0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
				});
			}
		}
		out.push({ ...pts[pts.length - 1] });
		return out;
	}

	function resample(pts, step) {
		const out = [{ ...pts[0] }];
		let carry = 0;
		for (let i = 1; i < pts.length; i++) {
			const a = pts[i - 1];
			const b = pts[i];
			const len = Math.hypot(b.x - a.x, b.y - a.y);
			if (len < 1e-9) continue;
			let d = step - carry;
			while (d < len) {
				out.push({ x: a.x + ((b.x - a.x) * d) / len, y: a.y + ((b.y - a.y) * d) / len });
				d += step;
			}
			carry = len - (d - step);
		}
		out.push({ ...pts[pts.length - 1] });
		return out;
	}

	/** Tangents and normals for a polyline. */
	function frame(pts) {
		return pts.map((p, i) => {
			const a = pts[Math.max(0, i - 1)];
			const b = pts[Math.min(pts.length - 1, i + 1)];
			const l = Math.hypot(b.x - a.x, b.y - a.y) || 1;
			const tx = (b.x - a.x) / l;
			const ty = (b.y - a.y) / l;
			return { x: p.x, y: p.y, tx, ty, nx: -ty, ny: tx };
		});
	}

	/** Grid path with rounded corners: each 90° corner becomes a quarter arc of radius `rad`. */
	function roundCorners(pts, rad) {
		if (pts.length < 3) return pts.slice();
		const out = [pts[0]];
		for (let i = 1; i < pts.length - 1; i++) {
			const a = pts[i - 1];
			const b = pts[i];
			const c = pts[i + 1];
			const d1 = { x: b.x - a.x, y: b.y - a.y };
			const d2 = { x: c.x - b.x, y: c.y - b.y };
			const l1 = Math.hypot(d1.x, d1.y);
			const l2 = Math.hypot(d2.x, d2.y);
			const straight = Math.abs(d1.x * d2.y - d1.y * d2.x) < 1e-6;
			if (straight) {
				out.push(b);
				continue;
			}
			const r = Math.min(rad, l1 / 2, l2 / 2);
			const p = { x: b.x - (d1.x / l1) * r, y: b.y - (d1.y / l1) * r };
			const q = { x: b.x + (d2.x / l2) * r, y: b.y + (d2.y / l2) * r };
			for (let k = 0; k <= 8; k++) {
				const t = k / 8;
				// quadratic through the corner gives a clean round turn
				out.push({
					x: (1 - t) * (1 - t) * p.x + 2 * (1 - t) * t * b.x + t * t * q.x,
					y: (1 - t) * (1 - t) * p.y + 2 * (1 - t) * t * b.y + t * t * q.y
				});
			}
		}
		out.push(pts[pts.length - 1]);
		return out;
	}

	// ------------------------------------------------------------------ ink

	/** Brush line: width swells and thins with gentle noise, tapered ends, a dry-brush second pass. */
	function brush(ctx, pts, w, color, o = {}) {
		const r = o.rng || rng(o.seed || 3);
		const P = frame(resample(pts, o.step ?? 2));
		const n = P.length;
		if (n < 2) return;
		const taper = o.taper ?? 0.18;
		let ph = r() * 10;
		const widths = P.map((p, i) => {
			const u = i / (n - 1);
			const tip = Math.min(1, u / taper, (1 - u) / taper);
			const ease = tip < 1 ? Math.sin((tip * Math.PI) / 2) : 1;
			ph += 0.06;
			return w * (0.12 + 0.88 * ease) * (0.82 + 0.18 * Math.sin(ph * (o.wobble ?? 1.7)) + (o.grit ?? 0.05) * r.gauss());
		});
		ctx.save();
		ctx.globalAlpha = o.alpha ?? 1;
		ctx.fillStyle = color;
		ctx.beginPath();
		P.forEach((p, i) => {
			const x = p.x + p.nx * widths[i] * 0.5;
			const y = p.y + p.ny * widths[i] * 0.5;
			if (i) ctx.lineTo(x, y);
			else ctx.moveTo(x, y);
		});
		for (let i = n - 1; i >= 0; i--) ctx.lineTo(P[i].x - P[i].nx * widths[i] * 0.5, P[i].y - P[i].ny * widths[i] * 0.5);
		ctx.closePath();
		ctx.fill();
		if (o.dry !== false) {
			ctx.globalAlpha = (o.alpha ?? 1) * 0.35;
			ctx.strokeStyle = color;
			ctx.lineWidth = Math.max(0.6, w * 0.08);
			for (const off of [-0.62, 0.66]) {
				ctx.beginPath();
				let open = false;
				P.forEach((p, i) => {
					if (r() < 0.08) {
						open = false;
						return;
					}
					const x = p.x + p.nx * widths[i] * off;
					const y = p.y + p.ny * widths[i] * off;
					if (open) ctx.lineTo(x, y);
					else ctx.moveTo(x, y);
					open = true;
				});
				ctx.stroke();
			}
		}
		ctx.restore();
	}

	/** Ensō: a single brush circle, thick at the start, dry and open at the end. */
	function enso(ctx, cx, cy, R, w, color, o = {}) {
		const r = o.rng || rng(o.seed || 9);
		const a0 = o.start ?? -1.2;
		const span = TAU * (o.span ?? 0.9);
		const pts = [];
		for (let i = 0; i <= 80; i++) {
			const a = a0 + (span * i) / 80;
			const rr = R * (1 + 0.025 * Math.sin(a * 3 + 1) + 0.01 * r.gauss());
			pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
		}
		const P = frame(pts);
		ctx.save();
		ctx.globalAlpha = o.alpha ?? 1;
		ctx.fillStyle = color;
		const wid = (u) => w * (u < 0.08 ? 0.5 + 6 * u : 1 - 0.75 * Math.pow(u, 1.6));
		ctx.beginPath();
		P.forEach((p, i) => {
			const ww = wid(i / 80) / 2;
			if (i) ctx.lineTo(p.x + p.nx * ww, p.y + p.ny * ww);
			else ctx.moveTo(p.x + p.nx * ww, p.y + p.ny * ww);
		});
		for (let i = 80; i >= 0; i--) {
			const ww = wid(i / 80) / 2;
			ctx.lineTo(P[i].x - P[i].nx * ww, P[i].y - P[i].ny * ww);
		}
		ctx.closePath();
		ctx.fill();
		// bristle streaks at the dry end
		ctx.strokeStyle = color;
		ctx.lineWidth = Math.max(0.6, w * 0.06);
		for (let k = 0; k < 7; k++) {
			const off = (k / 6 - 0.5) * 0.8;
			const from = 50 + Math.floor(r() * 15);
			const to = Math.min(80, 70 + Math.floor(r() * 14));
			ctx.globalAlpha = (o.alpha ?? 1) * 0.45;
			ctx.beginPath();
			for (let i = from; i <= to; i++) {
				const ww = wid(i / 80) * off;
				const x = P[i].x + P[i].nx * ww;
				const y = P[i].y + P[i].ny * ww;
				if (i === from) ctx.moveTo(x, y);
				else ctx.lineTo(x, y);
			}
			ctx.stroke();
		}
		ctx.restore();
	}

	return { TAU, rng, wash, bloom, paper, grain, spline, resample, frame, roundCorners, brush, enso, fillPoly };
})();
