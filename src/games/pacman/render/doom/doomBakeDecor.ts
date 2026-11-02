import type { DoomFrame } from './DoomBake';

/** Meadow life: the decorations around the maze (`worldDecor`), back to front. */
export function paintDecor(f: DoomFrame): void {
	const { DEC, b, vis, rnd, rr, pick, lin, blob, rp, sph } = f;
	for (const o of DEC) {
		if (!vis(o.x, o.y, 60 + (o.w || (o.rx || 0) * 2))) {
			continue;
		}
		if (o.k === 'fl') {
			const c = o.c ?? 0;
			const cl =
				c < 0.3
					? ['#8a0a0a', '#5a0606']
					: c < 0.55
						? ['#d8d0b8', '#a89f88']
						: c < 0.8
							? ['#ff6a1a', '#c0300a']
							: ['#2a2220', '#1a1514'];
			for (let i = 0; i < (o.n ?? 0); i++) {
				blob(o.x + rr(-16, 16), o.y + rr(-12, 12), rr(2.2, 3.8), rr(1.2, 2.2), pick(cl));
			}
		} else if (o.k === 'bush') {
			const r = o.r ?? 0;
			blob(o.x + 3, o.y + 4, r, r * 0.7, 'rgba(0,0,0,.3)', 0);
			for (let i = 0; i < 4; i++) {
				const px = o.x + rr(-0.5, 0.5) * r;
				const py = o.y + rr(-0.4, 0.4) * r;
				const gr = b.createRadialGradient(px - 2, py - 2, 1, px, py, r * 0.7);
				gr.addColorStop(0, '#7a3a22');
				gr.addColorStop(1, '#1a0a06');
				b.fillStyle = gr;
				b.beginPath();
				b.arc(px, py, r * 0.7, 0, 7);
				b.fill();
			}
		} else if (o.k === 'pond') {
			const rx = o.rx ?? 0;
			const ry = o.ry ?? 0;
			blob(o.x + 3, o.y + 4, rx * 1.05, ry * 1.05, 'rgba(0,0,0,.25)', 0);
			blob(o.x, o.y, rx * 1.1, ry * 1.12, '#4a4a4a', 0);
			b.fillStyle = lin(o.x - rx, o.y - ry, o.x + rx, o.y + ry, '#9aff4a', '#128a12');
			b.beginPath();
			b.ellipse(o.x, o.y, rx, ry, 0, 0, 7);
			b.fill();
			b.strokeStyle = 'rgba(0,40,0,.6)';
			b.lineWidth = 1.5;
			b.stroke();
			b.strokeStyle = 'rgba(255,255,255,.8)';
			b.lineWidth = 1;
			for (let i = 0; i < 5; i++) {
				const a = rnd() * 6.28;
				const L = rr(0.3, 0.8);
				b.beginPath();
				b.moveTo(o.x + Math.cos(a) * rx * 0.1, o.y + Math.sin(a) * ry * 0.1);
				b.lineTo(o.x + Math.cos(a + 0.2) * rx * L * 0.6, o.y + Math.sin(a + 0.2) * ry * L);
				b.lineTo(o.x + Math.cos(a - 0.1) * rx * L, o.y + Math.sin(a - 0.1) * ry * L * 1.1);
				b.stroke();
			}
			blob(o.x - rx * 0.35, o.y - ry * 0.4, rx * 0.3, ry * 0.1, 'rgba(255,255,255,.85)', -0.3);
			for (let i = 0; i < 9; i++) {
				const a = i * 0.7 + rnd() * 0.4;
				blob(
					o.x + Math.cos(a) * rx * 1.05,
					o.y + Math.sin(a) * ry * 1.07,
					rr(3, 5),
					rr(2, 3.4),
					'#6a6a6a'
				);
			}
		} else if (o.k === 'landmark') {
			const U = (o.r ?? 0) * 2.4;
			b.save();
			b.shadowColor = 'rgba(255,40,20,.9)';
			b.shadowBlur = 14;
			b.strokeStyle = '#c8160c';
			b.lineWidth = 2.2;
			b.beginPath();
			b.arc(o.x, o.y, U, 0, 7);
			b.stroke();
			b.beginPath();
			for (let i = 0; i <= 5; i++) {
				const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
				if (i) {
					b.lineTo(o.x + Math.cos(a) * U, o.y + Math.sin(a) * U);
				} else {
					b.moveTo(o.x + Math.cos(a) * U, o.y + Math.sin(a) * U);
				}
			}
			b.stroke();
			b.restore();
		} else if (o.k === 'lamp') {
			blob(o.x + 2, o.y + 3, 5, 3.5, 'rgba(0,0,0,.35)', 0);
			sph(o.x, o.y, 4.2, '#7b7268', '#2f2a27');
			sph(o.x, o.y, 2.6, '#fff6cf', '#ffc561');
			blob(o.x - 2.6, o.y - 3, 2.4, 1.2, '#ffffff', 0);
		} else if (o.k === 'bridge') {
			const bx = o.x - 26;
			const by = o.y - 34;
			b.fillStyle = 'rgba(0,0,0,.35)';
			b.fillRect(bx + 4, by + 5, 52, 68);
			for (let yy = by, i = 0; yy < by + 68; yy += 5, i++) {
				b.fillStyle = i % 2 ? '#8c6342' : '#795634';
				b.fillRect(bx + 2, yy, 48, 4.2);
				b.fillStyle = 'rgba(255,230,190,.25)';
				b.fillRect(bx + 2, yy, 48, 0.8);
			}
			b.fillStyle = '#4f3622';
			b.fillRect(bx, by, 4, 68);
			b.fillRect(bx + 48, by, 4, 68);
			const bolts: ReadonlyArray<readonly [number, number]> = [
				[bx - 1, by - 1],
				[bx + 47, by - 1],
				[bx - 1, by + 63],
				[bx + 47, by + 63]
			];
			for (const [px, py] of bolts) {
				b.fillStyle = '#3a281a';
				b.fillRect(px, py, 6, 6);
				blob(px + 3, py + 1, 2.8, 1.6, '#d9a020', 0);
			}
			blob(bx + 26, by + 20, 7, 2.6, 'rgba(255,120,30,.6)', 0.2);
		} else if (o.k === 'cabin') {
			const ow = o.w ?? 0;
			const oh = o.h ?? 0;
			const X = o.x - ow / 2;
			const Y = o.y - oh / 2;
			b.fillStyle = 'rgba(0,0,0,.3)';
			rp(X + 6, Y + 8, ow, oh, [4, 4, 4, 4]);
			b.fill();
			b.save();
			rp(X, Y, ow, oh, [4, 4, 4, 4]);
			b.clip();
			b.fillStyle = lin(X, Y, X, o.y, '#6a6e76', '#555a62');
			b.fillRect(X, Y, ow, oh / 2);
			b.fillStyle = lin(X, o.y, X, Y + oh, '#3a3d44', '#2a2d32');
			b.fillRect(X, o.y, ow, oh / 2);
			b.strokeStyle = 'rgba(40,20,20,.22)';
			b.lineWidth = 1;
			for (let r2 = 0; r2 < oh / 6; r2++) {
				b.beginPath();
				b.moveTo(X, Y + r2 * 6);
				b.lineTo(X + ow, Y + r2 * 6);
				for (let xx = X + (r2 % 2) * 5; xx < X + ow; xx += 10) {
					b.moveTo(xx, Y + r2 * 6);
					b.lineTo(xx, Y + r2 * 6 + 6);
				}
				b.stroke();
			}
			for (let i = 0; i < 16; i++) {
				blob(X + rnd() * ow, Y + rnd() * oh, rr(8, 18), rr(4, 8), 'rgba(160,70,30,.35)');
			}
			b.restore();
			b.lineCap = 'round';
			b.strokeStyle = '#9aa0a8';
			b.lineWidth = 4;
			b.beginPath();
			b.moveTo(X + 3, o.y);
			b.lineTo(X + ow - 3, o.y);
			b.stroke();
			b.strokeStyle = 'rgba(0,0,0,.5)';
			b.lineWidth = 1;
			b.beginPath();
			b.moveTo(X + 3, o.y + 2.8);
			b.lineTo(X + ow - 3, o.y + 2.8);
			b.stroke();
			b.strokeStyle = 'rgba(45,25,25,.5)';
			b.lineWidth = 1.5;
			rp(X, Y, ow, oh, [4, 4, 4, 4]);
			b.stroke();
			const cx = o.x + ow * 0.25;
			const cy = o.y - oh * 0.22;
			b.fillStyle = 'rgba(0,0,0,.35)';
			b.fillRect(cx - 2, cy - 1, 12, 12);
			b.fillStyle = '#8c8179';
			b.fillRect(cx - 6, cy - 6, 12, 12);
			b.fillStyle = '#2b2523';
			b.fillRect(cx - 3.5, cy - 3.5, 7, 7);
			blob(cx - 4, cy - 5, 3, 1.5, '#44484e', 0);
		} else if (o.k === 'rock') {
			const r = o.r ?? 0;
			blob(o.x + 3, o.y + 5, r * 1.1, r * 0.7, 'rgba(0,0,0,.35)', 0);
			b.fillStyle = lin(o.x - r, o.y - r, o.x + r, o.y + r, '#7a4a3a', '#2a1410');
			b.beginPath();
			b.ellipse(o.x, o.y, r, r * 0.75, 0, 0, 7);
			b.fill();
			blob(o.x - r * 0.3, o.y - r * 0.35, r * 0.6, r * 0.28, '#9a5a3e', 0);
			blob(o.x + r * 0.4, o.y - r * 0.2, r * 0.25, r * 0.15, '#5a3022', 0);
		}
	}
}
