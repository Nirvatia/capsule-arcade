// The New Year setting of the winter meadow (the owner's pick over the palette-swap winter):
// snow sits on exposed edges only, roofs carry composed snow planes, firs wear snow caps and
// the cabins are lit from within. Everything here is static bake; the live blizzard stays.
import type { MeadowFrame } from '../meadow/MeadowBake';
import { MEADOW_TILE as T } from '../meadow/MeadowBake';
import type { BakeKit } from '../meadow/MeadowTheme';
import type { WorldDecor } from '../../common/worldDecor';
import { tileRandom } from '../../common/worldDecor';

/** Snow-capped stone: a cap on the open top, a lip on the open left, a drift at the open base. */
export function paintSnowWalls(f: MeadowFrame): void {
	const { P, R: rows, C: cols, isW, b, vis, lin, blob, rp, RS } = f;
	const W = P.wall;
	const WL: Array<[number, number]> = [];
	for (let r = 0; r < rows; r++)
		for (let c = 0; c < cols; c++)
			if (isW(r, c) && vis(c * T + T / 2, r * T + T / 2, T)) WL.push([r, c]);
	const wsh = (r: number, c: number, i: number, j: number, k: number, all: boolean) => {
		const oL = !isW(r, c - 1);
		const oU = !isW(r - 1, c);
		const oR = !isW(r, c + 1);
		const oD = !isW(r + 1, c);
		rp(
			c * T + (oL ? i : j),
			r * T + (oU ? i : j),
			T - (oL ? i : j) - (oR ? i : j),
			T - (oU ? i : j) - (oD ? i : j),
			all ? [k, k, k, k] : [oU && oL ? k : 0, oU && oR ? k : 0, oD && oR ? k : 0, oD && oL ? k : 0]
		);
	};
	b.save();
	b.shadowColor = W.shadow;
	b.shadowBlur = 7 * RS;
	b.shadowOffsetX = 2 * RS;
	b.shadowOffsetY = 3 * RS;
	b.fillStyle = W.base;
	for (const [r, c] of WL) {
		wsh(r, c, 0, -0.4, 8, false);
		b.fill();
	}
	b.restore();
	for (const [r, c] of WL) {
		const k = tileRandom(r, c);
		const v = k();
		const x = c * T;
		const y = r * T;
		b.fillStyle = lin(x, y, x + T, y + T, W.top[(k() * 3) | 0], W.bottom[(k() * 3) | 0]);
		wsh(r, c, 0.6, 0.6, 8, false);
		b.fill();
		wsh(r, c, 0.6, 0.6, 8, false);
		b.save();
		b.clip();
		b.fillStyle = lin(x, y, x + T, y + T, 'rgba(190,225,255,.22)', 'rgba(255,255,255,0)');
		b.fillRect(x, y, T, T);
		// snow sits only on exposed edges, never sprinkled per tile like stickers
		if (!isW(r - 1, c)) {
			b.fillStyle = lin(x, y, x, y + T * 0.7, '#ffffff', '#dfe9f4');
			b.beginPath();
			b.moveTo(x - 1, y - 1);
			b.lineTo(x + T + 1, y - 1);
			b.lineTo(x + T + 1, y + T * 0.36);
			for (let xx = x + T; xx >= x - 1; xx -= T / 5)
				b.lineTo(xx, y + T * (0.44 + 0.08 * Math.sin(xx * 0.33 + r * 1.7)));
			b.closePath();
			b.fill();
		}
		if (!isW(r, c - 1)) {
			b.fillStyle = 'rgba(255,255,255,.85)';
			b.fillRect(x - 1, y - 1, T * 0.16, T * 0.62);
		}
		// a few specks only on the exposed stone
		for (let i = 0; i < 3; i++)
			blob(
				x + T * 0.5 + k() * T * 0.42,
				y + T * 0.62 + k() * T * 0.3,
				0.6 + k() * 0.8,
				0.4 + k() * 0.5,
				W.specks[(k() * 2) | 0],
				k() * 3
			);
		b.restore();
		// a composed drift spilling onto the ground where the wall ends
		if (!isW(r + 1, c)) {
			blob(x + T * 0.5, y + T * 0.98, T * 0.5, T * 0.12, '#ffffff', 0);
			blob(x + T * 0.3, y + T * 1.02, T * 0.3, T * 0.09, '#e8f1f9', 0);
		}
		b.strokeStyle = W.light;
		b.lineWidth = 2;
		b.save();
		b.translate(-1.2, -1.2);
		wsh(r, c, 0.6, 0.6, 8, false);
		b.stroke();
		b.restore();
		b.strokeStyle = W.dark;
		b.lineWidth = 1.4;
		b.save();
		b.translate(1.2, 1.2);
		wsh(r, c, 0.6, 0.6, 8, false);
		b.stroke();
		b.restore();
		if (v > 0.97) {
			const px = x + 5 + k() * (T - 10);
			const py = y + 4 + k() * (T * 0.3);
			b.strokeStyle = 'rgba(255,255,255,.9)';
			b.lineWidth = 1;
			b.beginPath();
			b.moveTo(px - 2, py);
			b.lineTo(px + 2, py);
			b.moveTo(px, py - 2);
			b.lineTo(px, py + 2);
			b.stroke();
		}
	}
}

/** Final static layer: snow-laden fir crowns, composed roof snow, firelight and garlands. */
export function paintWinterAfter(f: MeadowFrame): void {
	const { DEC, P, b, vis, blob, rp, lin } = f;
	const bulb = (x: number, y: number, c: string) => {
		const g = b.createRadialGradient(x, y, 0.2, x, y, 5);
		g.addColorStop(0, c + 'cc');
		g.addColorStop(1, c + '00');
		b.fillStyle = g;
		b.beginPath();
		b.arc(x, y, 5, 0, 7);
		b.fill();
		b.fillStyle = c;
		b.beginPath();
		b.arc(x, y, 1.4, 0, 7);
		b.fill();
	};
	for (const o of DEC) {
		if (!vis(o.x, o.y, 90)) continue;
		const r = o.r ?? 0;
		if (o.k === 'tree' && o.pk) {
			// snow load on the fir crown, a green rim left showing
			blob(o.x - r * 0.15, o.y - r * 0.2, r * 0.72, r * 0.62, 'rgba(255,255,255,.88)', 0);
			blob(o.x + r * 0.3, o.y + r * 0.1, r * 0.4, r * 0.34, 'rgba(244,249,253,.8)', 0);
			blob(o.x - r * 0.45, o.y + r * 0.25, r * 0.35, r * 0.3, 'rgba(244,249,253,.75)', 0);
			continue;
		}
		const ow = o.w ?? 0;
		const oh = o.h ?? 0;
		const X = o.x - ow / 2;
		const Y = o.y - oh / 2;
		if (o.k === 'cabin') {
			// composed snow planes on the two roof slopes instead of scattered blobs
			b.save();
			rp(X + 1, Y + 1, ow - 2, oh - 2, [3, 3, 3, 3]);
			b.clip();
			b.fillStyle = lin(X, Y, X, o.y, '#ffffff', '#e4edf6');
			b.beginPath();
			b.moveTo(X + 3, o.y);
			b.lineTo(X + 3, Y + 3);
			for (let xx = X + 3; xx <= X + ow - 3; xx += 6)
				b.lineTo(xx, Y + 3 + Math.sin(xx * 0.35 + o.x) * 1.6);
			b.lineTo(X + ow - 3, o.y);
			b.closePath();
			b.fill();
			b.fillStyle = lin(X, o.y, X, Y + oh, '#f2f7fc', '#dfe9f4');
			b.beginPath();
			b.moveTo(X + 3, o.y);
			b.lineTo(X + ow - 3, o.y);
			b.lineTo(X + ow - 3, Y + oh - 3);
			for (let xx = X + ow - 3; xx >= X + 3; xx -= 6)
				b.lineTo(xx, Y + oh - 3 + Math.sin(xx * 0.3 + o.y) * 1.6);
			b.closePath();
			b.fill();
			b.lineCap = 'round';
			b.strokeStyle = P.cabin.ridge;
			b.lineWidth = 4;
			b.beginPath();
			b.moveTo(X + 3, o.y);
			b.lineTo(X + ow - 3, o.y);
			b.stroke();
			b.strokeStyle = P.cabin.ridgeShadow;
			b.lineWidth = 1;
			b.beginPath();
			b.moveTo(X + 3, o.y + 2.8);
			b.lineTo(X + ow - 3, o.y + 2.8);
			b.stroke();
			b.restore();
			// firelight in the chimney mouth (the cabin is seen from above)
			const cx = o.x + ow * 0.25;
			const cy = o.y - oh * 0.22;
			b.fillStyle = '#8c8179';
			b.fillRect(cx - 6, cy - 6, 12, 12);
			const g = b.createRadialGradient(cx, cy, 1, cx, cy, 22);
			g.addColorStop(0, 'rgba(255,170,80,.4)');
			g.addColorStop(1, 'rgba(255,170,80,0)');
			b.fillStyle = g;
			b.fillRect(cx - 22, cy - 22, 44, 44);
			b.fillStyle = '#ff9a4d';
			b.fillRect(cx - 3.5, cy - 3.5, 7, 7);
			b.fillStyle = '#ffd98a';
			b.fillRect(cx - 2, cy - 2, 4, 4);
			// window light spilling onto the snow below the eave
			for (const t of [0.28, 0.72]) {
				const lx = X + ow * t;
				const ly = Y + oh + 4;
				const g2 = b.createRadialGradient(lx, ly, 1, lx, ly, 18);
				g2.addColorStop(0, 'rgba(255,190,110,.35)');
				g2.addColorStop(1, 'rgba(255,190,110,0)');
				b.fillStyle = g2;
				b.fillRect(lx - 18, ly - 18, 36, 36);
			}
			// a garland sagging along the ridge
			b.strokeStyle = 'rgba(40,50,70,.55)';
			b.lineWidth = 0.8;
			b.beginPath();
			for (let i = 0; i <= 10; i++) {
				const t = i / 10;
				const x = X + 4 + t * (ow - 8);
				const y = o.y + 6 + Math.sin(t * Math.PI) * 3;
				if (i) b.lineTo(x, y);
				else b.moveTo(x, y);
			}
			b.stroke();
			const cols = ['#ffd98a', '#ff9a6b', '#9fd8ff'];
			for (let i = 0; i <= 10; i++) {
				const t = i / 10;
				bulb(X + 4 + t * (ow - 8), o.y + 6 + Math.sin(t * Math.PI) * 3, cols[i % 3]);
			}
		} else if (o.k === 'bridge') {
			const bx = o.x - 26;
			const by = o.y - 34;
			for (let i = 0; i <= 6; i++) {
				const t = i / 6;
				bulb(bx + 2, by + t * 68, i % 2 ? '#ffd98a' : '#9fd8ff');
				bulb(bx + 50, by + t * 68, i % 2 ? '#9fd8ff' : '#ffd98a');
			}
		}
	}
}

function shadow(
	b: CanvasRenderingContext2D,
	x: number,
	y: number,
	r: number,
	shade: (a: number) => string
): void {
	b.fillStyle = shade(0.3);
	b.beginPath();
	b.ellipse(x + r * 0.4, y + r * 0.5, r * 1.1, r * 0.75, 0, 0, 7);
	b.fill();
}

/** The landmark pair: a lit New Year fir beside the snowman with the red scarf. */
export function drawWinterLandmark({ b, sph, shade }: BakeKit, o: WorldDecor): void {
	const r = o.r ?? 0;
	const fx = o.x - r * 1.3;
	const fy = o.y + r * 0.2;
	shadow(b, fx, fy, r, shade);
	for (let i = 0; i < 3; i++) {
		const rr = r * (1.15 - i * 0.3);
		const g = b.createRadialGradient(fx - rr * 0.3, fy - rr * 0.3, 1, fx, fy, rr);
		g.addColorStop(0, '#7fae94');
		g.addColorStop(0.6, '#3b6a58');
		g.addColorStop(1, '#2f5a48');
		b.fillStyle = g;
		b.beginPath();
		b.arc(fx, fy - i * r * 0.28, rr, 0, 7);
		b.fill();
	}
	for (let i = 0; i < 10; i++) {
		const a = i * 0.63;
		const d = r * (0.3 + (i % 3) * 0.3);
		b.fillStyle = i % 3 === 0 ? '#ffd98a' : i % 3 === 1 ? '#ff9a6b' : '#9fd8ff';
		b.beginPath();
		b.arc(fx + Math.cos(a) * d, fy - r * 0.3 + Math.sin(a) * d, 1.3, 0, 7);
		b.fill();
	}
	b.fillStyle = '#ffe9a8';
	b.beginPath();
	b.arc(fx, fy - r * 1.1, 1.8, 0, 7);
	b.fill();
	const sx = o.x + r * 0.7;
	const sy = o.y + r * 0.2;
	shadow(b, sx, sy, r, shade);
	sph(sx, sy + r * 0.2, r * 0.9, '#ffffff', '#b4c9de');
	sph(sx - r * 0.1, sy - r * 0.5, r * 0.55, '#ffffff', '#bfd2e4');
	b.strokeStyle = '#d9333a';
	b.lineWidth = 2.2;
	b.beginPath();
	b.arc(sx - r * 0.1, sy - r * 0.5, r * 0.52, 0.3, 2.9);
	b.stroke();
	b.fillStyle = '#2b3340';
	b.beginPath();
	b.arc(sx - r * 0.1, sy - r * 0.52, r * 0.3, 0, 7);
	b.fill();
}

/** Composed snow mounds with a footprint trail instead of flower stickers. */
export function paintSnowPatch({ rr, blob }: BakeKit, o: WorldDecor): void {
	for (let i = 0; i < 3; i++)
		blob(o.x + rr(-14, 14), o.y + rr(-10, 10), rr(3, 6), rr(1.5, 3), 'rgba(255,255,255,.9)', 0);
	let fx = o.x - 8;
	let fy = o.y + 6;
	for (let i = 0; i < 5; i++) {
		blob(fx, fy, 0.8, 1.2, 'rgba(120,150,190,.3)', 0);
		blob(fx + 2, fy + 2, 0.8, 1.2, 'rgba(120,150,190,.3)', 0);
		fx += rr(3, 5);
		fy += rr(-2, 2);
	}
}

/** The frozen pond: an ice sheen and a couple of skate arcs. */
export function paintIceExtras({ b, lin }: BakeKit, o: WorldDecor): void {
	const rx = o.rx ?? 0;
	const ry = o.ry ?? 0;
	b.save();
	b.beginPath();
	b.ellipse(o.x, o.y, rx, ry, 0, 0, 7);
	b.clip();
	b.fillStyle = lin(
		o.x - rx,
		o.y - ry,
		o.x + rx,
		o.y + ry,
		'rgba(255,255,255,.5)',
		'rgba(190,220,245,.08)'
	);
	b.fillRect(o.x - rx, o.y - ry, rx * 2, ry * 2);
	b.strokeStyle = 'rgba(255,255,255,.7)';
	b.lineWidth = 0.8;
	for (let i = 0; i < 3; i++) {
		b.beginPath();
		b.arc(o.x + (i - 1) * rx * 0.3, o.y + (i % 2 ? ry * 0.2 : -ry * 0.1), rx * 0.4, 0.4, 2.4);
		b.stroke();
	}
	b.restore();
}
