// The squad's creature: the glass albino (concept 02 of the owner's mock-up "Station_Mimics_2.html",
// 2026-11-25), carried over as drawn: a milky blind eel from the flask, a dark heart, a glowing
// nerve cord and ribs through the wet skin; five states (hunt, the tell, frightened, rage, the
// mimicry's fold into a spore), a soft drop shadow, strictly inside its tile. In the game its
// shake is a slow sway (the mock-up's was 40-58 Hz) and its swim runs on `bodyTime`. The fold is the
// mock-up's; the disguise itself is the level's own spore painted by the caller (`opts.spore`).
export type SquadKind = 'BLINKY' | 'PINKY' | 'INKY' | 'CLYDE';
export type AlbinoState = 'hunt' | 'tell' | 'frightened' | 'rage' | 'mimic';

export interface AlbinoOpts {
	/** Heading, radians (+x is the snout). */
	readonly angle?: number;
	/** The fold into the disguise, 0 the creature .. 1 the spore (the mimicry state). */
	readonly mimicK?: number;
	readonly speed?: number;
	/** The body's clock (the swim's wave): runs with the creature's travel, not the wall clock. */
	readonly bodyTime?: number;
	/** Paints the disguise at the creature's point, with this alpha and scale. */
	readonly spore?: (
		ctx: CanvasRenderingContext2D,
		x: number,
		y: number,
		alpha: number,
		scale: number
	) => void;
}

type MimicLook = ReturnType<typeof resolveMimicState>;
const TAU = Math.PI * 2;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const smoothstep = (e0: number, e1: number, x: number) => {
	const k = clamp((x - e0) / (e1 - e0), 0, 1);
	return k * k * (3 - 2 * k);
};

const TIMING = {
	AUTO_HEADING_SEC: 2.2, // Smooth rotation through 4 cardinal headings in Auto mode
	TELL_PERIOD_SEC: 1.3, // Warm gold anticipation pulse period
	FRIGHT_BLINK_HZ: 1.7, // Pale frightened blink rate (< 3 Hz)
	MIMIC_CYCLE_SEC: 5.0, // Showcase morph loop (creature <-> disguised bio-spore)
	SPORE_BREATH_HZ: 0.55 // Synchronized real bio-spore breathing rate (cycles/sec)
};
const SQUAD = {
	BLINKY: {
		id: 'BLINKY',
		hex: '#ff6b5e',
		rgb: [255, 107, 94],
		hi: '#ffd7d2',
		deep: '#7a1812',
		lenScale: 1.03,
		widScale: 0.94,
		headScale: 1.02,
		sharpness: 1.0
	},
	PINKY: {
		id: 'PINKY',
		hex: '#ff9fe0',
		rgb: [255, 159, 224],
		hi: '#ffe8f8',
		deep: '#7a1f5c',
		lenScale: 0.97,
		widScale: 1.04,
		headScale: 1.01,
		sharpness: 0.25
	},
	INKY: {
		id: 'INKY',
		hex: '#5fe3ff',
		rgb: [95, 227, 255],
		hi: '#e0faff',
		deep: '#0d5b73',
		lenScale: 1.07,
		widScale: 0.85,
		headScale: 0.92,
		sharpness: 0.75
	},
	CLYDE: {
		id: 'CLYDE',
		hex: '#ffbb4d',
		rgb: [255, 187, 77],
		hi: '#fff0cf',
		deep: '#7d4508',
		lenScale: 0.95,
		widScale: 1.07,
		headScale: 1.13,
		sharpness: 0.4
	}
};

const rgba = (rgb: readonly number[], a: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
const mixRgb = (a: readonly number[], b: readonly number[], k: number): number[] => [
	Math.round(lerp(a[0], b[0], k)),
	Math.round(lerp(a[1], b[1], k)),
	Math.round(lerp(a[2], b[2], k))
];
/** Resolves shared state colors, tension, trembling, and mimic morph factor (0..1). */
function resolveMimicState(kind: SquadKind, state: AlbinoState, t: number, opts: AlbinoOpts = {}) {
	const spec = SQUAD[kind] || SQUAD.BLINKY;
	let accentRgb = spec.rgb;
	let accentHi = spec.hi;
	let scale = 1.0;
	let jx = 0;
	let jy = 0;
	let tellPulse = 0;
	let fright = 0;
	let frightFlash = 0;
	let rage = 0;
	let mimicK = 0; // 0 = creature, 1 = disguised bio-spore

	if (state === 'tell') {
		const u = (t % TIMING.TELL_PERIOD_SEC) / TIMING.TELL_PERIOD_SEC;
		tellPulse = Math.sin(clamp(u / 0.65, 0, 1) * Math.PI);
		accentRgb = mixRgb(spec.rgb, [255, 226, 122], 0.42 + 0.58 * tellPulse);
		accentHi = '#fff7cc';
		scale = 1 - 0.06 * tellPulse;
		jx = Math.sin(t * 2.6) * 0.008 * tellPulse;
		jy = Math.cos(t * 2.2) * 0.008 * tellPulse;
	} else if (state === 'frightened') {
		fright = 1;
		const fw = Math.sin(t * TIMING.FRIGHT_BLINK_HZ * TAU);
		frightFlash = smoothstep(0.56, 0.94, fw);
		accentRgb = mixRgb([39, 73, 184], [220, 234, 255], frightFlash);
		accentHi = frightFlash > 0.5 ? '#ffffff' : '#98b8ff';
		scale = 0.89;
		jx = Math.sin(t * 3.1) * 0.014;
		jy = Math.cos(t * 2.7) * 0.014;
	} else if (state === 'rage') {
		rage = 1;
		accentRgb = [255, 59, 40];
		accentHi = '#ffd7cf';
		scale = 1.0;
		jx = Math.sin(t * 2.4) * 0.008;
		jy = Math.cos(t * 2.1) * 0.008;
	} else if (state === 'mimic') {
		if (typeof opts.mimicK === 'number') {
			mimicK = clamp(opts.mimicK, 0, 1);
		} else {
			// Hold creature briefly (0..0.14), fold (0.14..0.32), hold spore (0.32..0.84), unfold (0.84..1.0)
			const u = (t % TIMING.MIMIC_CYCLE_SEC) / TIMING.MIMIC_CYCLE_SEC;
			if (u < 0.14) mimicK = 0;
			else if (u < 0.32) mimicK = smoothstep(0.14, 0.32, u);
			else if (u < 0.84) mimicK = 1;
			else mimicK = 1 - smoothstep(0.84, 1.0, u);
		}
	}

	return {
		spec,
		accentRgb,
		accentHi,
		scale,
		jx,
		jy,
		tellPulse,
		fright,
		frightFlash,
		rage,
		mimicK,
		speedMult: opts.speed ?? 1.0
	};
}

/**
 * Enforces strict 1×1 tile clipping [-size/2, +size/2], soft lower-right drop shadow
 * (<= 0.43 * size), tight rage internal afterimage, and smooth mimic morphing into drawBioSpore.
 */
function renderStrictAbyssal(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	kind: SquadKind,
	state: AlbinoState,
	t: number,
	opts: AlbinoOpts,
	paintFn: (
		g: CanvasRenderingContext2D,
		R: number,
		lim: number,
		size: number,
		st: MimicLook,
		lx: number,
		ly: number,
		t: number
	) => void
) {
	const angle = opts?.angle ?? 0;
	const st = resolveMimicState(kind, state, t, opts || {});
	const half = size / 2;
	const lim = size * 0.43; // Hard radial ceiling inside 1×1 tile

	ctx.save();
	// Hard 1×1 square tile clip — zero pixel overflow possible
	ctx.beginPath();
	ctx.rect(x - half, y - half, size, size);
	ctx.clip();

	// Fully disguised bio-spore (breathing out of phase: phaseOffset = 0.5)
	if (st.mimicK > 0.96) {
		opts.spore?.(ctx, x, y, 1, 1);
		ctx.restore();
		return;
	}
	// Emerging bio-spore underneath as the creature coils/folds into it
	if (st.mimicK > 0.08) {
		opts.spore?.(ctx, x, y, smoothstep(0.22, 0.9, st.mimicK), lerp(0.55, 1.0, st.mimicK));
	}

	const bodyAlpha = 1 - smoothstep(0.6, 0.96, st.mimicK);
	const R = size * 0.38 * st.scale;
	const cx = x + st.jx * size;
	const cy = y + st.jy * size;

	// Soft lower-right drop shadow (key light from upper-left), strictly <= 0.43 * size
	const shX = cx + size * 0.025;
	const shY = cy + size * 0.032;
	const shR = Math.min(lim, R * lerp(1.06, 0.65, st.mimicK));
	const sh = ctx.createRadialGradient(shX, shY, shR * 0.2, shX, shY, shR);
	sh.addColorStop(0, `rgba(0, 0, 0, ${0.74 * bodyAlpha})`);
	sh.addColorStop(0.68, `rgba(0, 0, 0, ${0.36 * bodyAlpha})`);
	sh.addColorStop(1, 'rgba(0, 0, 0, 0)');
	ctx.fillStyle = sh;
	ctx.beginPath();
	ctx.arc(shX, shY, shR, 0, TAU);
	ctx.fill();

	// Tight internal crimson-orange motion blur / afterimage in Rage strictly inside 1×1
	if (st.rage > 0) {
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(angle);
		const ag = ctx.createLinearGradient(0, 0, -lim, 0);
		ag.addColorStop(0, 'rgba(255, 59, 40, 0.44)');
		ag.addColorStop(0.6, 'rgba(255, 92, 42, 0.16)');
		ag.addColorStop(1, 'rgba(255, 42, 30, 0)');
		ctx.fillStyle = ag;
		ctx.beginPath();
		ctx.moveTo(R * 0.1, -R * 0.62);
		ctx.lineTo(-lim, -R * 0.22);
		ctx.lineTo(-lim, R * 0.22);
		ctx.lineTo(R * 0.1, R * 0.62);
		ctx.closePath();
		ctx.fill();
		ctx.restore();
	}

	// Upper-left key light rotated into local creature coordinates (+X = heading)
	const lx = Math.cos(-angle) * -0.62 - Math.sin(-angle) * -0.78;
	const ly = Math.sin(-angle) * -0.62 + Math.cos(-angle) * -0.78;

	ctx.globalAlpha *= bodyAlpha;
	ctx.translate(cx, cy);
	ctx.rotate(angle);

	paintFn(ctx, R, lim, size, st, lx, ly, opts.bodyTime ?? t);

	ctx.restore();
}
export function drawAlbino(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	size: number,
	kind: SquadKind,
	state: AlbinoState,
	t: number,
	opts: AlbinoOpts = {}
) {
	renderStrictAbyssal(ctx, x, y, size, kind, state, t, opts, (g, R, lim, sz, st, lx, ly, time) => {
		const { spec, accentRgb, accentHi, tellPulse, fright, frightFlash, rage, mimicK } = st;

		const swimFreq = (rage ? 11.5 : fright ? 13.5 : 5.6) * st.speedMult;
		const segs = 14;
		const xHead = Math.min(lim * 0.94, R * 1.04 * spec.lenScale);
		const xTail = -Math.min(lim * 0.96, R * 1.04 * spec.lenScale);

		const spine: Array<{ x: number; y: number; w: number; u: number }> = [];
		for (let i = 0; i <= segs; i++) {
			const u = i / segs; // 0 = blunt snout, 1 = whip-tail tip
			let px, py;

			if (mimicK < 0.02) {
				px = lerp(xHead, xTail, u);
				const whipAmp = R * (fright ? 0.25 : rage ? 0.28 : 0.2) * Math.pow(u, 1.35);
				py = Math.sin(time * swimFreq - u * 4.8) * whipAmp;
			} else {
				// Curls tightly into a pale ring around its glowing cardiac knot!
				const sPx = lerp(xHead, xTail, u);
				const sPy = Math.sin(time * swimFreq - u * 4.8) * R * 0.2 * Math.pow(u, 1.35);
				const coilAng = u * TAU * 0.92 - Math.PI * 0.2;
				const coilR = R * 0.36 * (1 - mimicK * 0.35);
				px = lerp(sPx, Math.cos(coilAng) * coilR, mimicK);
				py = lerp(sPy, Math.sin(coilAng) * coilR, mimicK);
			}

			// Sleek cave-eel anatomical width: blunt rounded snout -> chest -> slender undulating whip tail
			let wProf;
			if (u < 0.12) wProf = lerp(0.32, 0.5 * spec.headScale, u / 0.12);
			else if (u < 0.34) wProf = lerp(0.5 * spec.headScale, 0.44, (u - 0.12) / 0.22);
			else wProf = lerp(0.44, 0.06, Math.pow((u - 0.34) / 0.66, 1.15));

			const peristalsis = 1 + 0.11 * Math.sin(time * swimFreq * 1.15 - u * 7.2);
			spine.push({
				x: clamp(px, -lim * 0.96, lim * 0.96),
				y: clamp(py, -lim * 0.94, lim * 0.94),
				w: R * wProf * spec.widScale * peristalsis * lerp(1, 0.65, mimicK),
				u
			});
		}

		// Compute smooth normals for outer body outline
		const lPts: Array<[number, number]> = [];
		const rPts: Array<[number, number]> = [];
		for (let i = 0; i <= segs; i++) {
			const prev = spine[Math.max(0, i - 1)];
			const next = spine[Math.min(segs, i + 1)];
			let dx = next.x - prev.x;
			let dy = next.y - prev.y;
			const dl = Math.hypot(dx, dy) || 1;
			dx /= dl;
			dy /= dl;
			const nx = -dy;
			const ny = dx;
			const p = spine[i];
			lPts.push([clamp(p.x + nx * p.w, -lim, lim), clamp(p.y + ny * p.w, -lim, lim)]);
			rPts.push([clamp(p.x - nx * p.w, -lim, lim), clamp(p.y - ny * p.w, -lim, lim)]);
		}

		const traceAlbinoBody = () => {
			const s0 = spine[0];
			g.beginPath();
			g.moveTo(lPts[0][0], lPts[0][1]);
			for (let i = 1; i <= segs; i++) g.lineTo(lPts[i][0], lPts[i][1]);
			g.lineTo(rPts[segs][0], rPts[segs][1]);
			for (let i = segs - 1; i >= 0; i--) g.lineTo(rPts[i][0], rPts[i][1]);
			g.quadraticCurveTo(clamp(s0.x + R * 0.14, -lim, lim), s0.y, lPts[0][0], lPts[0][1]);
			g.closePath();
		};

		// 1. PALE MILKY TRANSLUCENT ALBINO FLESH (#dce5dd / #aebfb6) — instantly brightest on floor!
		traceAlbinoBody();
		const fleshGrad = g.createLinearGradient(
			lx * R * 0.8,
			ly * R * 0.8,
			-lx * R * 0.8,
			-ly * R * 0.8
		);
		if (fright) {
			fleshGrad.addColorStop(0, frightFlash > 0.5 ? '#f4f8ff' : '#89abff');
			fleshGrad.addColorStop(0.55, frightFlash > 0.5 ? '#b4ccfa' : '#2749b8');
			fleshGrad.addColorStop(1, '#14266b');
		} else {
			fleshGrad.addColorStop(0, 'rgba(232, 240, 232, 0.94)');
			fleshGrad.addColorStop(0.55, 'rgba(202, 216, 206, 0.88)');
			fleshGrad.addColorStop(1, 'rgba(142, 160, 152, 0.92)');
		}
		g.fillStyle = fleshGrad;
		g.fill();

		// 2. INTERNAL TRANSLUCENT ANATOMY CLIPPED INSIDE MILKY SKIN
		g.save();
		traceAlbinoBody();
		g.clip();

		// Subtle dark internal rim shadow for glassy depth
		traceAlbinoBody();
		g.strokeStyle = fright ? 'rgba(14, 28, 92, 0.6)' : 'rgba(26, 38, 36, 0.45)';
		g.lineWidth = Math.max(1.6, R * 0.18);
		g.stroke();

		// Faint translucent internal rib ticks along thoracic spine
		if (sz >= 30) {
			g.strokeStyle = fright ? 'rgba(190, 214, 255, 0.35)' : 'rgba(62, 76, 72, 0.36)';
			g.lineWidth = Math.max(0.7, R * 0.048);
			for (let i = 4; i <= 9; i++) {
				const p = spine[i];
				const prev = spine[i - 1];
				const dx = p.x - prev.x;
				const dy = p.y - prev.y;
				const dl = Math.hypot(dx, dy) || 1;
				const nx = -dy / dl;
				const ny = dx / dl;
				const ribSpan = p.w * 0.66;
				g.beginPath();
				g.moveTo(p.x - nx * ribSpan, p.y - ny * ribSpan);
				g.lineTo(p.x + nx * ribSpan, p.y + ny * ribSpan);
				g.stroke();
			}
		}

		// Glowing squad-colored spinal nerve cord running cleanly down the translucent spine!
		g.lineCap = 'round';
		g.strokeStyle = rgba(accentRgb, 0.94);
		g.lineWidth = Math.max(1.3, R * (0.14 + 0.03 * tellPulse));
		g.beginPath();
		for (let i = 2; i < segs; i++) {
			const p = spine[i];
			if (i === 2) g.moveTo(p.x, p.y);
			else g.lineTo(p.x, p.y);
		}
		g.stroke();

		// Inner white-hot nerve filament
		g.strokeStyle = accentHi;
		g.lineWidth = Math.max(0.6, R * 0.05);
		g.stroke();

		// Dark pulsing cardiac knot + bioluminescent heart chamber visible through chest skin
		const heartP = spine[3];
		const heartBeat = 1 + 0.18 * Math.pow(0.5 + 0.5 * Math.sin(time * (rage ? 11 : 4.2)), 2);
		const hR = R * 0.22 * heartBeat;

		const hGlow = g.createRadialGradient(heartP.x, heartP.y, 0, heartP.x, heartP.y, hR * 2.1);
		hGlow.addColorStop(0, rgba(accentRgb, 0.85));
		hGlow.addColorStop(1, rgba(accentRgb, 0));
		g.fillStyle = hGlow;
		g.beginPath();
		g.arc(heartP.x, heartP.y, hR * 2.1, 0, TAU);
		g.fill();

		g.fillStyle = rage ? '#6e0c0a' : '#22141a';
		g.beginPath();
		g.ellipse(heartP.x, heartP.y, hR * 0.95, hR * 0.72, 0.25, 0, TAU);
		g.fill();

		// Bright central heartbeat spark inside dark knot
		g.fillStyle = tellPulse > 0.25 ? '#ffe27a' : accentHi;
		g.beginPath();
		g.arc(heartP.x + hR * 0.15, heartP.y, hR * 0.36, 0, TAU);
		g.fill();

		// Soft wet upper-left glossy highlight along the translucent head & back
		g.strokeStyle = 'rgba(255, 255, 255, 0.62)';
		g.lineWidth = Math.max(1.0, R * 0.11);
		g.beginPath();
		for (let i = 1; i <= 7; i++) {
			const p = spine[i];
			const ox = lx * p.w * 0.42;
			const oy = ly * p.w * 0.42;
			if (i === 1) g.moveTo(p.x + ox, p.y + oy);
			else g.lineTo(p.x + ox, p.y + oy);
		}
		g.stroke();
		g.restore();

		// Dark wet rim outline (crimson in Rage)
		traceAlbinoBody();
		g.strokeStyle = rage ? '#ff3b28' : '#0b0f0e';
		g.lineWidth = Math.max(0.95, R * (rage ? 0.1 : 0.07));
		g.stroke();

		// 3. TWO TINY DARK RECESSED EMBRYONAL PIN-EYES AT BLUNT PALE SNOUT (+X)
		const snoutP = spine[1];
		const eyeSpread = snoutP.w * 0.56;
		const pinR = Math.max(1.15, R * (fright ? 0.13 : 0.095));

		for (const side of [-1, 1]) {
			const ex = snoutP.x + R * 0.08;
			const ey = snoutP.y + side * eyeSpread;

			// Deep sunken embryonal socket
			g.fillStyle = '#080b0c';
			g.beginPath();
			g.arc(ex, ey, pinR * 1.38, 0, TAU);
			g.fill();

			// Crisp glowing pupil dot pointing forward
			g.fillStyle =
				tellPulse > 0.25 ? '#ffe27a' : rage ? '#ff3b28' : fright ? '#dbe8ff' : rgba(accentRgb, 1);
			g.beginPath();
			g.arc(ex + pinR * 0.22, ey, pinR * 0.78, 0, TAU);
			g.fill();

			g.fillStyle = '#ffffff';
			g.beginPath();
			g.arc(ex + pinR * 0.34, ey - pinR * 0.12, Math.max(0.45, pinR * 0.32), 0, TAU);
			g.fill();
		}
	});
}
