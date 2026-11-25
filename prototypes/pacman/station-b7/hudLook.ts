// Candidate: the station's own HUD (DESIGN.md §7a), in the style of the owner's B-7 mock-up's panel:
// a dark slab with a hairline frame and hazard stripes, a monospace face in teal and amber. On it:
// the three HP cells (a lost one cracked and dark; the one just lost flashes red), the hatch's
// charge, the infection; in the escape the alarm and the lures left.

export interface HudValues {
	readonly hp: number;
	/** 0..1 of the last hit's flash (1 just hit). */
	readonly hurt: number;
	readonly charge: number;
	readonly infection: number;
	readonly escape: boolean;
	readonly lures: number;
	readonly time: number;
}

const FONT = 'ui-monospace, "JetBrains Mono", Menlo, monospace';

function hazard(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
	g.save();
	g.beginPath();
	g.rect(x, y, w, h);
	g.clip();
	g.fillStyle = '#16140c';
	g.fillRect(x, y, w, h);
	g.fillStyle = 'rgba(214, 168, 52, 0.85)';
	for (let i = -h; i < w + h; i += 8) {
		g.beginPath();
		g.moveTo(x + i, y + h);
		g.lineTo(x + i + 4, y + h);
		g.lineTo(x + i + 4 + h, y);
		g.lineTo(x + i + h, y);
		g.closePath();
		g.fill();
	}
	g.restore();
}

function bar(
	g: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	k: number,
	from: string,
	to: string
): void {
	g.fillStyle = '#070a0a';
	g.fillRect(x, y, w, h);
	g.strokeStyle = 'rgba(120, 150, 140, 0.35)';
	g.lineWidth = 1;
	g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
	const segs = 20;
	const sw = (w - 4) / segs;
	for (let i = 0; i < segs; i += 1) {
		if ((i + 1) / segs > k + 1e-6) break;
		const u = i / (segs - 1);
		g.fillStyle = u < 0.5 ? from : to;
		g.globalAlpha = 0.55 + 0.45 * u;
		g.fillRect(x + 2 + i * sw + 0.5, y + 2, sw - 1.5, h - 4);
	}
	g.globalAlpha = 1;
}

/** The HUD over the board's top band: `x`, `w` the board's walls, `y` the band's top. */
export function drawStationHud(g: CanvasRenderingContext2D, x: number, y: number, w: number, v: HudValues): void {
	const h = 50;
	g.save();
	// the slab
	g.fillStyle = 'rgba(9, 13, 12, 0.94)';
	g.fillRect(x, y, w, h);
	g.strokeStyle = 'rgba(96, 124, 116, 0.55)';
	g.lineWidth = 1;
	g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
	hazard(g, x + 1, y + 1, 10, h - 2);
	hazard(g, x + w - 11, y + 1, 10, h - 2);
	// the header
	g.font = `600 9px ${FONT}`;
	g.fillStyle = 'rgba(150, 176, 168, 0.75)';
	g.fillText('SECTOR B-7 // QUARANTINE', x + 20, y + 13);
	if (v.escape) {
		const on = Math.sin(v.time * Math.PI * 1.6) > 0;
		g.fillStyle = on ? '#ff5a46' : 'rgba(255, 90, 70, 0.35)';
		g.fillText('■ ALARM: TO THE HATCH', x + 190, y + 13);
	}
	// HP: three cells
	g.font = `700 10px ${FONT}`;
	g.fillStyle = 'rgba(190, 220, 210, 0.9)';
	g.fillText('HP', x + 20, y + 35);
	for (let i = 0; i < 3; i += 1) {
		const cx = x + 42 + i * 26;
		const cy = y + 24;
		const alive = i < v.hp;
		const justLost = i === v.hp && v.hurt > 0;
		g.fillStyle = alive ? '#bff3e4' : justLost ? `rgba(255, 60, 50, ${0.35 + 0.65 * v.hurt})` : '#1a1f1e';
		g.fillRect(cx, cy, 20, 15);
		g.strokeStyle = alive ? 'rgba(120, 230, 200, 0.9)' : 'rgba(120, 60, 60, 0.7)';
		g.strokeRect(cx + 0.5, cy + 0.5, 19, 14);
		if (alive) {
			g.fillStyle = 'rgba(255, 255, 255, 0.55)';
			g.fillRect(cx + 2, cy + 2, 16, 3);
		} else {
			// cracked
			g.strokeStyle = 'rgba(255, 110, 90, 0.8)';
			g.beginPath();
			g.moveTo(cx + 4, cy + 2);
			g.lineTo(cx + 10, cy + 8);
			g.lineTo(cx + 8, cy + 13);
			g.moveTo(cx + 10, cy + 8);
			g.lineTo(cx + 16, cy + 6);
			g.stroke();
		}
	}
	// the hatch's charge and the infection
	const bw = Math.max(80, (w - 260) / 2 - 64);
	g.fillStyle = 'rgba(190, 220, 210, 0.9)';
	g.fillText('HATCH', x + 132, y + 35);
	bar(g, x + 172, y + 25, bw, 13, v.charge, '#5fd6b4', '#c8ffe8');
	g.fillText(`${Math.round(v.charge * 100)}%`, x + 176 + bw, y + 35);
	const ix = x + 214 + bw;
	g.fillText('INFECT', ix, y + 35);
	bar(g, ix + 46, y + 25, bw, 13, v.infection, '#c98a3a', '#ff4a36');
	g.fillText(`${Math.round(v.infection * 100)}%`, ix + 50 + bw, y + 35);
	// the lures in the escape
	if (v.escape) {
		for (let i = 0; i < 2; i += 1) {
			const lx = x + w - 52 + i * 18;
			g.strokeStyle = i < v.lures ? 'rgba(150, 230, 255, 0.95)' : 'rgba(90, 110, 120, 0.5)';
			g.lineWidth = 1.5;
			g.beginPath();
			g.arc(lx, y + 31, 6, 0, Math.PI * 2);
			g.stroke();
			if (i < v.lures) {
				g.fillStyle = 'rgba(220, 248, 255, 0.95)';
				g.beginPath();
				g.arc(lx, y + 31, 2.2, 0, Math.PI * 2);
				g.fill();
			}
		}
		g.fillStyle = 'rgba(150, 230, 255, 0.85)';
		g.font = `600 9px ${FONT}`;
		g.fillText('LURE [F]', x + w - 62, y + 17);
	}
	g.restore();
}
