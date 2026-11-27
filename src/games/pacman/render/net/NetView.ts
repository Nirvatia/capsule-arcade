// The Net on screen: the baked server (`bakeNet`) with everything that lives on it drawn from the
// cached sprites (`netSprites`) and a few cheap live shapes: the doors, the data, the core's turn. The
// caller draws the hero between the actors and the overlay.
import type { GridMatrix } from '../../config/gridConfig';
import { NET } from '../../config/netConfig';
import type { GridService } from '../../logic/maze/GridService';
import type { NetService } from '../../logic/net/NetService';
import type { GridLayout } from '../maze/GridView';
import { bakeNet, NET_MARGIN } from './netBake';
import type { NetBake } from './netBake';
import { coreSprite, dataSprite, droneSprite, nodeSprite } from './netSprites';
import type { DroneMood } from './netSprites';

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;

export class NetView {
	private bake: NetBake | null = null;

	constructor(
		private readonly grid: GridService,
		private readonly matrix: GridMatrix
	) {}

	/** Everything except the hero, in its order; `hero` draws the hero between the actors and the overlay. */
	draw(ctx: Ctx, n: NetService, L: GridLayout, time: number, hero: () => void): void {
		this.bake ??= bakeNet(this.matrix);
		const S = L.tileSize;
		const M = NET_MARGIN;
		const b = this.bake;
		ctx.drawImage(
			b.scene,
			L.offsetX - M * S,
			L.offsetY - M * S,
			(b.cols + 2 * M) * S,
			(b.rows + 2 * M) * S
		);
		const px = (x: number): number => L.offsetX + x * S;
		const py = (y: number): number => L.offsetY + y * S;
		this.core(ctx, n, px, py, S, time);
		this.data(ctx, n, px, py, S, time);
		this.doors(ctx, n, px, py, S, time);
		this.drones(ctx, n, px, py, S, time);
		hero();
	}

	/** The last-data alarm and the popups, over everything. */
	drawOverlay(ctx: Ctx, n: NetService, L: GridLayout, vw: number, vh: number, time: number): void {
		if (n.surge > 1 && n.state === 'play') {
			const k = (n.surge > NET.surge.firstMul ? 0.2 : 0.12) + 0.06 * Math.sin(time * 9);
			const g = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.32, vw / 2, vh / 2, vh * 0.85);
			g.addColorStop(0, 'rgba(255,40,80,0)');
			g.addColorStop(1, `rgba(255,40,80,${k * 2.4})`);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, vw, vh);
		}
		const S = L.tileSize;
		ctx.textAlign = 'center';
		ctx.font = `700 ${S * 0.62}px "Arial Narrow",system-ui,sans-serif`;
		for (const p of n.popups) {
			ctx.globalAlpha = Math.max(0, 1 - p.age / 1.1);
			ctx.lineWidth = 4;
			ctx.strokeStyle = '#080a1c';
			ctx.fillStyle = '#7ff6ff';
			const x = L.offsetX + p.x * S;
			const y = L.offsetY + p.y * S - p.age * S * 1.2;
			ctx.strokeText(p.text, x, y);
			ctx.fillText(p.text, x, y);
		}
		ctx.globalAlpha = 1;
		ctx.textAlign = 'start';
	}

	private core(
		ctx: Ctx,
		n: NetService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		const m = n.map.monolith;
		const cx = px(m.x + 0.5);
		const cy = py(m.y + 0.5);
		const R = S * 1.5;
		if (n.coreOpen) {
			const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 2.6);
			g.addColorStop(0, `rgba(92,255,176,${0.5 + 0.2 * Math.sin(time * 4)})`);
			g.addColorStop(1, 'rgba(92,255,176,0)');
			ctx.fillStyle = g;
			ctx.fillRect(cx - S * 2.6, cy - S * 2.6, S * 5.2, S * 5.2);
		}
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(time * (n.coreOpen ? 0.6 : 0.15));
		ctx.drawImage(coreSprite(n.coreOpen), -R, -R, R * 2, R * 2);
		ctx.restore();
	}

	private data(
		ctx: Ctx,
		n: NetService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		const d = S * 0.34;
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (this.grid.isDot(x, y) && !n.progress.isCollected(x, y)) {
					ctx.drawImage(dataSprite(), px(x + 0.5) - d / 2, py(y + 0.5) - d / 2, d, d);
				}
			}
		}
		n.map.artifacts.forEach((a, i) => {
			if (n.taken[i]) {
				return;
			}
			const cx = px(a.x + 0.5);
			const cy = py(a.y + 0.5);
			const k = 1 + 0.1 * Math.sin(time * 5 + i);
			const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 1.2);
			g.addColorStop(0, 'rgba(255,63,216,.5)');
			g.addColorStop(1, 'rgba(255,63,216,0)');
			ctx.fillStyle = g;
			ctx.fillRect(cx - S * 1.2, cy - S * 1.2, S * 2.4, S * 2.4);
			const r = S * 0.9 * k;
			ctx.drawImage(nodeSprite(), cx - r / 2, cy - r / 2, r, r);
		});
	}

	private doors(
		ctx: Ctx,
		n: NetService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		for (const d of n.doors.list) {
			const cx = px((d.a.x + d.b.x) / 2 + 0.5);
			const cy = py((d.a.y + d.b.y) / 2 + 0.5);
			const horizontal = d.a.y === d.b.y;
			const half = S * 0.44;
			const closed = n.doors.isClosed(d);
			const left = closed ? d.closedUntil - n.doors.now : 0;
			const age = NET.doors.hold - left;
			const grow = closed ? Math.min(1, age / 0.12) : 0;
			const blink = closed && left < 1 ? (Math.floor(time * 10) % 2 === 0 ? 0.35 : 1) : 1;
			ctx.save();
			ctx.translate(cx, cy);
			if (horizontal) {
				ctx.rotate(Math.PI / 2);
			}
			// posts and a dashed line (always: the door is there), the solid bar when it is shut
			ctx.fillStyle = closed ? '#ff3f6e' : 'rgba(47,224,255,.9)';
			for (const s of [-1, 1]) {
				ctx.fillRect(-S * 0.1, s * half - S * 0.09, S * 0.2, S * 0.18);
			}
			if (!closed) {
				ctx.strokeStyle = 'rgba(47,224,255,.55)';
				ctx.lineWidth = 2;
				ctx.setLineDash([S * 0.1, S * 0.1]);
				ctx.beginPath();
				ctx.moveTo(0, -half);
				ctx.lineTo(0, half);
				ctx.stroke();
				ctx.setLineDash([]);
			}
			if (grow > 0) {
				ctx.globalAlpha = blink;
				ctx.shadowColor = '#ff3f6e';
				ctx.shadowBlur = 12;
				ctx.fillStyle = '#ff3f6e';
				ctx.fillRect(-S * 0.08, -half * grow, S * 0.16, half * 2 * grow);
				ctx.shadowBlur = 0;
				ctx.fillStyle = '#ffd6e2';
				ctx.fillRect(-S * 0.025, -half * grow, S * 0.05, half * 2 * grow);
				ctx.globalAlpha = 1;
			}
			ctx.restore();
			if (n.slammed && n.slammed.id === d.id) {
				ctx.strokeStyle = `rgba(255,255,255,${1 - n.slammed.age / 0.4})`;
				ctx.lineWidth = 3;
				ctx.beginPath();
				ctx.arc(cx, cy, S * (0.3 + n.slammed.age * 2.2), 0, TAU);
				ctx.stroke();
			}
		}
	}

	private drones(
		ctx: Ctx,
		n: NetService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		const fear = n.drones.fear;
		for (const d of n.drones.list) {
			if (d.state === 'dead') {
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
			ctx.fillStyle = 'rgba(2,3,10,.45)';
			ctx.beginPath();
			ctx.ellipse(cx + S * 0.08, cy + S * 0.2, S * 0.4, S * 0.22, 0, 0, TAU);
			ctx.fill();
			ctx.save();
			ctx.translate(cx, cy);
			ctx.globalAlpha = d.state === 'wait' ? 0.45 : 1;
			ctx.rotate(Math.atan2(d.dy, d.dx));
			const w = S * 1.3;
			ctx.drawImage(droneSprite(d.role, mood), -w / 2, -w / 2, w, w);
			ctx.restore();
		}
	}
}
