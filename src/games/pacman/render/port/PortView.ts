// The Port on screen: the baked terminal (`bakePort`) with everything that lives on it drawn from the
// cached sprites (`portSprites`) and a few cheap live shapes: the radar, the drones' spotlights, the
// terminals' hack rings, the yard gates. The caller draws the hero between the actors and the overlay.
import type { GridMatrix } from '../../config/gridConfig';
import { NET } from '../../config/netConfig';
import { PORT } from '../../config/portConfig';
import type { GridService } from '../../logic/maze/GridService';
import type { PortService } from '../../logic/port/PortService';
import type { GridLayout } from '../maze/GridView';
import { bakePort, PORT_MARGIN_X, PORT_MARGIN_Y } from './portBake';
import type { PortBake } from './portBake';
import { brokerSprite, cellSprite, droneSprite, nutSprite, terminalSprite } from './portSprites';
import type { BrokerMood, DroneMood } from './portSprites';

type Ctx = CanvasRenderingContext2D;
type Px = (v: number) => number;
const TAU = Math.PI * 2;

export class PortView {
	private bake: PortBake | null = null;

	constructor(
		private readonly grid: GridService,
		private readonly matrix: GridMatrix
	) {}

	/** Everything except the hero, in its order; `hero` draws the hero between the actors and the overlay. */
	draw(ctx: Ctx, p: PortService, L: GridLayout, time: number, hero: () => void): void {
		this.bake ??= bakePort(this.matrix);
		const S = L.tileSize;
		const b = this.bake;
		ctx.drawImage(
			b.scene,
			L.offsetX - PORT_MARGIN_X * S,
			L.offsetY - PORT_MARGIN_Y * S,
			(b.cols + 2 * PORT_MARGIN_X) * S,
			(b.rows + 2 * PORT_MARGIN_Y) * S
		);
		const px: Px = (x) => L.offsetX + x * S;
		const py: Px = (y) => L.offsetY + y * S;
		this.radar(ctx, b, px, py, S, time);
		this.nuts(ctx, p, px, py, S);
		this.cells(ctx, p, px, py, S, time);
		this.terminals(ctx, p, px, py, S, time);
		this.gates(ctx, p, px, py, S, time);
		this.boss(ctx, p, px, py, S, time);
		this.drones(ctx, p, px, py, S, time);
		hero();
	}

	/** The alarm and the popups, over everything. */
	drawOverlay(ctx: Ctx, p: PortService, L: GridLayout, vw: number, vh: number, time: number): void {
		if (p.state === 'play' && p.boss.hacks >= PORT.terminals.length - 1) {
			const g = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.3, vw / 2, vh / 2, vh * 0.85);
			g.addColorStop(0, 'rgba(255,40,70,0)');
			g.addColorStop(1, `rgba(255,40,70,${0.3 + 0.12 * Math.sin(time * 8)})`);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, vw, vh);
		}
		const S = L.tileSize;
		ctx.textAlign = 'center';
		ctx.font = `700 ${S * 0.62}px "Arial Narrow",system-ui,sans-serif`;
		for (const q of p.popups) {
			ctx.globalAlpha = Math.max(0, 1 - q.age / 1.1);
			ctx.lineWidth = 4;
			ctx.strokeStyle = '#080a12';
			ctx.fillStyle = '#ffd24a';
			const x = L.offsetX + q.x * S;
			const y = L.offsetY + q.y * S - q.age * S * 1.2;
			ctx.strokeText(q.text, x, y);
			ctx.fillText(q.text, x, y);
		}
		ctx.globalAlpha = 1;
		ctx.textAlign = 'start';
	}

	/** The radar on the control building's roof: a dish and a sweep. */
	private radar(ctx: Ctx, b: PortBake, px: Px, py: Px, S: number, time: number): void {
		const cx = px(b.building.c + b.building.w * 0.84);
		const cy = py(b.building.r + b.building.h * 0.5);
		const r = S * 0.62;
		ctx.fillStyle = 'rgba(0,0,0,.35)';
		ctx.beginPath();
		ctx.arc(cx + 3, cy + 4, r, 0, TAU);
		ctx.fill();
		ctx.fillStyle = '#c4cbd1';
		ctx.beginPath();
		ctx.arc(cx, cy, r, 0, TAU);
		ctx.fill();
		ctx.strokeStyle = '#090c12';
		ctx.lineWidth = 2;
		ctx.stroke();
		const a = time * 1.6;
		const g = ctx.createConicGradient(a, cx, cy);
		g.addColorStop(0, 'rgba(52,231,255,.65)');
		g.addColorStop(0.18, 'rgba(52,231,255,0)');
		g.addColorStop(1, 'rgba(52,231,255,0)');
		ctx.fillStyle = g;
		ctx.beginPath();
		ctx.arc(cx, cy, r * 0.92, 0, TAU);
		ctx.fill();
		ctx.fillStyle = '#ff3a3a';
		ctx.beginPath();
		ctx.arc(cx, cy, S * 0.07, 0, TAU);
		ctx.fill();
	}

	private nuts(ctx: Ctx, p: PortService, px: Px, py: Px, S: number): void {
		const d = S * 0.3;
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (this.grid.isDot(x, y) && !p.progress.isCollected(x, y)) {
					ctx.drawImage(nutSprite(), px(x + 0.5) - d / 2, py(y + 0.5) - d / 2, d, d);
				}
			}
		}
	}

	private cells(ctx: Ctx, p: PortService, px: Px, py: Px, S: number, time: number): void {
		p.cells.forEach((c, i) => {
			if (p.cellTaken[i]) {
				return;
			}
			const cx = px(c.x + 0.5);
			const cy = py(c.y + 0.5);
			const k = 1 + 0.08 * Math.sin(time * 5 + i);
			const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 1.1);
			g.addColorStop(0, 'rgba(84,255,138,.5)');
			g.addColorStop(1, 'rgba(84,255,138,0)');
			ctx.fillStyle = g;
			ctx.fillRect(cx - S * 1.1, cy - S * 1.1, S * 2.2, S * 2.2);
			const r = S * 0.9 * k;
			ctx.drawImage(cellSprite(), cx - r / 2, cy - r / 2, r, r);
		});
	}

	private terminals(ctx: Ctx, p: PortService, px: Px, py: Px, S: number, time: number): void {
		const b = p.boss;
		p.terminals.forEach((t, i) => {
			const cx = px(t.x + 0.5);
			const cy = py(t.y + 0.5);
			const hacked = b.hacked[i];
			const target = b.target === i && b.state !== 'dead';
			if (hacked) {
				const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 1.1);
				g.addColorStop(0, 'rgba(255,50,70,.5)');
				g.addColorStop(1, 'rgba(255,50,70,0)');
				ctx.fillStyle = g;
				ctx.fillRect(cx - S * 1.1, cy - S * 1.1, S * 2.2, S * 2.2);
			}
			if (target && b.state === 'travel') {
				// the next one: rings that run in to it
				for (let k = 0; k < 2; k += 1) {
					const u = (time * 1.2 + k * 0.5) % 1;
					ctx.strokeStyle = `rgba(255,63,216,${0.8 * u})`;
					ctx.lineWidth = 3;
					ctx.beginPath();
					ctx.arc(cx, cy, S * (1.8 - u * 1.2), 0, TAU);
					ctx.stroke();
				}
			}
			const r = S * 1.05;
			ctx.globalAlpha = hacked ? 0.7 : 1;
			ctx.drawImage(terminalSprite(), cx - r / 2, cy - r / 2, r, r);
			ctx.globalAlpha = 1;
			if (target && b.state === 'hack' && b.progress > 0) {
				ctx.shadowColor = '#ff3fd8';
				ctx.shadowBlur = 12;
				ctx.strokeStyle = '#ff3fd8';
				ctx.lineWidth = S * 0.14;
				ctx.beginPath();
				ctx.arc(cx, cy, S * 0.78, -Math.PI / 2, -Math.PI / 2 + TAU * Math.min(1, b.progress));
				ctx.stroke();
				ctx.shadowBlur = 0;
			}
			ctx.fillStyle = hacked ? '#ff3a4a' : '#7dff9a';
			ctx.beginPath();
			ctx.arc(cx + S * 0.34, cy - S * 0.34, S * 0.07, 0, TAU);
			ctx.fill();
			ctx.fillStyle = '#ffffff';
			ctx.font = `700 ${S * 0.36}px "Arial Narrow",system-ui,sans-serif`;
			ctx.textAlign = 'center';
			ctx.strokeStyle = '#090c12';
			ctx.lineWidth = 3;
			ctx.strokeText(String(i + 1), cx - S * 0.34, cy + S * 0.62);
			ctx.fillText(String(i + 1), cx - S * 0.34, cy + S * 0.62);
			ctx.textAlign = 'start';
		});
	}

	/** The yard gates (the doors): green posts when open, a striped bar and a beacon when shut. */
	private gates(ctx: Ctx, p: PortService, px: Px, py: Px, S: number, time: number): void {
		for (const d of p.doors.list) {
			const cx = px((d.a.x + d.b.x) / 2 + 0.5);
			const cy = py((d.a.y + d.b.y) / 2 + 0.5);
			const horizontal = d.a.y === d.b.y;
			const half = S * 0.46;
			const closed = p.doors.isClosed(d);
			const left = closed ? d.closedUntil - p.doors.now : 0;
			const grow = closed ? Math.min(1, (NET.doors.hold - left) / 0.12) : 0;
			const blink = closed && left < 1 ? (Math.floor(time * 10) % 2 === 0 ? 0.35 : 1) : 1;
			ctx.save();
			ctx.translate(cx, cy);
			if (horizontal) {
				ctx.rotate(Math.PI / 2);
			}
			for (const s of [-1, 1]) {
				ctx.fillStyle = '#2b323c';
				ctx.fillRect(-S * 0.1, s * half - S * 0.1, S * 0.2, S * 0.2);
				ctx.strokeStyle = '#090c12';
				ctx.lineWidth = 1.6;
				ctx.strokeRect(-S * 0.1, s * half - S * 0.1, S * 0.2, S * 0.2);
				ctx.fillStyle = closed ? '#ff3a4a' : '#6dff8f';
				ctx.beginPath();
				ctx.arc(0, s * half, S * 0.05, 0, TAU);
				ctx.fill();
			}
			if (grow > 0) {
				ctx.globalAlpha = blink;
				const len = half * 2 * grow;
				ctx.fillStyle = '#14181e';
				ctx.fillRect(-S * 0.09, -len / 2, S * 0.18, len);
				ctx.save();
				ctx.beginPath();
				ctx.rect(-S * 0.09, -len / 2, S * 0.18, len);
				ctx.clip();
				ctx.fillStyle = '#f0c23a';
				for (let k = -8; k < 8; k += 1) {
					ctx.beginPath();
					ctx.moveTo(-S * 0.1, -half + k * S * 0.22);
					ctx.lineTo(S * 0.1, -half + k * S * 0.22 - S * 0.1);
					ctx.lineTo(S * 0.1, -half + k * S * 0.22 + S * 0.02);
					ctx.lineTo(-S * 0.1, -half + k * S * 0.22 + S * 0.12);
					ctx.fill();
				}
				ctx.restore();
				ctx.strokeStyle = '#090c12';
				ctx.lineWidth = 1.6;
				ctx.strokeRect(-S * 0.09, -len / 2, S * 0.18, len);
				ctx.globalAlpha = 1;
			} else {
				ctx.strokeStyle = 'rgba(109,255,143,.4)';
				ctx.lineWidth = 1.6;
				ctx.setLineDash([S * 0.09, S * 0.09]);
				ctx.beginPath();
				ctx.moveTo(0, -half);
				ctx.lineTo(0, half);
				ctx.stroke();
				ctx.setLineDash([]);
			}
			ctx.restore();
			if (p.slammed && p.slammed.id === d.id) {
				ctx.strokeStyle = `rgba(255,255,255,${1 - p.slammed.age / 0.4})`;
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.arc(cx, cy, S * (0.3 + p.slammed.age * 2.2), 0, TAU);
				ctx.stroke();
			}
		}
	}

	private boss(ctx: Ctx, p: PortService, px: Px, py: Px, S: number, time: number): void {
		const b = p.boss;
		if (b.state === 'dead') {
			return;
		}
		const mood: BrokerMood =
			b.state === 'stunned'
				? 'stunned'
				: b.state === 'hack'
					? 'hack'
					: b.slowLeft > 0
						? 'slow'
						: b.panic
							? 'panic'
							: 'calm';
		const cx = px(b.x);
		const cy = py(b.y);
		ctx.fillStyle = 'rgba(2,4,10,.45)';
		ctx.beginPath();
		ctx.ellipse(cx + S * 0.14, cy + S * 0.22, S * 0.78, S * 0.5, 0, 0, TAU);
		ctx.fill();
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(Math.atan2(b.dy, b.dx));
		const w = S * 2.1;
		if (b.state === 'stunned') {
			ctx.translate((Math.random() - 0.5) * S * 0.06, (Math.random() - 0.5) * S * 0.06);
		}
		ctx.drawImage(brokerSprite(mood), -w / 2, -w / 2, w, w);
		ctx.restore();
		// the health pips above him
		for (let k = 0; k < PORT.boss.hp; k += 1) {
			const x = cx + (k - 1) * S * 0.3;
			const y = cy - S * 1.15;
			ctx.fillStyle = k < b.hp ? '#ff3fd8' : '#2a2231';
			ctx.beginPath();
			for (let i = 0; i < 6; i += 1) {
				const a = (i / 6) * TAU + 0.5236;
				ctx[i === 0 ? 'moveTo' : 'lineTo'](x + Math.cos(a) * S * 0.14, y + Math.sin(a) * S * 0.14);
			}
			ctx.closePath();
			ctx.fill();
			ctx.strokeStyle = '#090c12';
			ctx.lineWidth = 1.6;
			ctx.stroke();
		}
		void time;
	}

	private drones(ctx: Ctx, p: PortService, px: Px, py: Px, S: number, time: number): void {
		const fear = p.drones.fear;
		const siren = Math.floor(time * 6) % 2 === 0;
		for (const d of p.drones.list) {
			if (d.state === 'dead' || (d.state === 'wait' && d.timer === Infinity)) {
				continue;
			}
			const mood: DroneMood =
				d.state === 'fright'
					? fear < 2 && Math.floor(time * 8) % 2 === 0
						? 'flash'
						: 'fright'
					: 'hunt';
			const cx = px(d.x);
			const cy = py(d.y) + Math.sin(time * 6 + d.role) * S * 0.04;
			const a = Math.atan2(d.dy, d.dx);
			ctx.fillStyle = 'rgba(2,4,10,.45)';
			ctx.beginPath();
			ctx.ellipse(cx + S * 0.1, cy + S * 0.24, S * 0.42, S * 0.24, 0, 0, TAU);
			ctx.fill();
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(a);
			ctx.globalAlpha = d.state === 'wait' ? 0.5 : 1;
			if (d.state === 'hunt') {
				// the spotlight: a wedge of warm light ahead
				const g = ctx.createLinearGradient(0, 0, S * 2.6, 0);
				g.addColorStop(0, 'rgba(255,240,190,.5)');
				g.addColorStop(1, 'rgba(255,240,190,0)');
				ctx.globalCompositeOperation = 'lighter';
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.moveTo(S * 0.3, -S * 0.08);
				ctx.lineTo(S * 2.6, -S * 0.7);
				ctx.lineTo(S * 2.6, S * 0.7);
				ctx.lineTo(S * 0.3, S * 0.08);
				ctx.closePath();
				ctx.fill();
				ctx.globalCompositeOperation = 'source-over';
			}
			const w = S * 1.3;
			ctx.drawImage(droneSprite(d.role, mood, siren), -w / 2, -w / 2, w, w);
			ctx.restore();
		}
	}
}
