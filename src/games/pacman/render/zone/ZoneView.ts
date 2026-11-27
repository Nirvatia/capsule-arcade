// The Zone on screen: the baked Pripyat (`bakeZone`) with everything that lives on it drawn from the
// cached sprites (`zoneSprites`) and a few cheap live shapes: the anomalies, the wave, the wheel's
// turn. Nothing here is a full-screen pass except the wave and the siren's vignette, and those are
// one gradient each. The caller draws the hero between `drawWorld`'s actors and the overlay.
import type { GridMatrix } from '../../config/gridConfig';
import type { GridLayout } from '../maze/GridView';
import type { GridService } from '../../logic/maze/GridService';
import type { Anomaly } from '../../logic/zone/ZoneAnomalies';
import type { ZoneService } from '../../logic/zone/ZoneService';
import { bakeZone, ZONE_MARGIN } from './zoneBake';
import type { ZoneBake } from './zoneBake';
import {
	ARTIFACT_GLOW,
	artifactSprite,
	barrelSprite,
	hatchSprite,
	nutSprite,
	poltergeistSprite,
	tushkanSprite,
	wheelSprite
} from './zoneSprites';
import type { TushkanMood } from './zoneSprites';

type Ctx = CanvasRenderingContext2D;
const INK = '#15110d';
const TAU = Math.PI * 2;
const hash = (a: number, b: number): number => {
	const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
	return s - Math.floor(s);
};

export class ZoneView {
	private bake: ZoneBake | null = null;

	constructor(
		private readonly grid: GridService,
		private readonly matrix: GridMatrix
	) {}

	/** Everything except the hero, in its order; `hero` draws the hero between the actors and the overlay. */
	draw(ctx: Ctx, z: ZoneService, L: GridLayout, time: number, hero: () => void): void {
		this.bake ??= bakeZone(this.matrix);
		const S = L.tileSize;
		const M = ZONE_MARGIN;
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
		this.hatches(ctx, z, px, py, S, time);
		this.wheel(ctx, z, px, py, S, time);
		this.anomalies(ctx, z, px, py, S, time);
		this.nuts(ctx, z, px, py, S, time);
		this.artifacts(ctx, z, px, py, S, time);
		this.bolt(ctx, z, px, py, S, time);
		this.tushkans(ctx, z, px, py, S, time);
		this.poltergeist(ctx, z, px, py, S, time);
		hero();
		this.hint(ctx, z, px, py, S, time);
	}

	/** The wave, the siren and the popups, over everything. */
	drawOverlay(ctx: Ctx, z: ZoneService, L: GridLayout, vw: number, vh: number, time: number): void {
		const e = z.emission;
		if (e.phase === 'siren') {
			const k = 0.1 + 0.08 * Math.sin(time * 8);
			const g = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.32, vw / 2, vh / 2, vh * 0.85);
			g.addColorStop(0, 'rgba(255,80,30,0)');
			g.addColorStop(1, `rgba(255,80,30,${k * 3.2})`);
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, vw, vh);
		} else if (e.phase === 'wave') {
			const x = -vw * 0.35 + e.waveProgress * vw * 1.7;
			const g = ctx.createLinearGradient(x - vw * 0.35, 0, x + vw * 0.12, 0);
			g.addColorStop(0, 'rgba(255,190,80,0)');
			g.addColorStop(0.65, 'rgba(255,130,60,.5)');
			g.addColorStop(1, 'rgba(255,255,225,.9)');
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, vw, vh);
		}
		const S = L.tileSize;
		ctx.textAlign = 'center';
		ctx.font = `700 ${S * 0.62}px "Arial Narrow",system-ui,sans-serif`;
		for (const p of z.popups) {
			ctx.globalAlpha = Math.max(0, 1 - p.age / 1.1);
			ctx.lineWidth = 4;
			ctx.strokeStyle = '#1a1208';
			ctx.fillStyle = p.gold ? '#ffd23f' : '#ffffff';
			const x = L.offsetX + p.x * S;
			const y = L.offsetY + p.y * S - p.age * S * 1.2;
			ctx.strokeText(p.text, x, y);
			ctx.fillText(p.text, x, y);
		}
		ctx.globalAlpha = 1;
		ctx.textAlign = 'start';
	}

	private hatches(
		ctx: Ctx,
		z: ZoneService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		const alert = z.emission.dangerous;
		for (const h of z.map.shelters) {
			const cx = px(h.x + 0.5);
			const cy = py(h.y + 0.5);
			if (alert) {
				const k = 0.5 + 0.5 * Math.sin(time * 9);
				const g = ctx.createRadialGradient(cx, cy, S * 0.2, cx, cy, S * 1.15);
				g.addColorStop(0, `rgba(120,255,110,${0.5 + 0.3 * k})`);
				g.addColorStop(1, 'rgba(120,255,110,0)');
				ctx.fillStyle = g;
				ctx.fillRect(cx - S * 1.2, cy - S * 1.2, S * 2.4, S * 2.4);
			}
			ctx.drawImage(hatchSprite(), cx - S * 0.4, cy - S * 0.4, S * 0.8, S * 0.8);
		}
	}

	private wheel(
		ctx: Ctx,
		z: ZoneService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		const m = z.map.monolith;
		const cx = px(m.x + 0.5);
		const cy = py(m.y + 0.5);
		const R = S * 1.55;
		ctx.fillStyle = 'rgba(4,6,8,.35)';
		ctx.beginPath();
		ctx.ellipse(cx + S * 0.18, cy + S * 0.24, R * 0.95, R * 0.9, 0, 0, TAU);
		ctx.fill();
		ctx.save();
		ctx.translate(cx, cy);
		ctx.rotate(time * 0.07);
		ctx.drawImage(wheelSprite(), -R, -R, R * 2, R * 2);
		ctx.restore();
		const open = z.monolithOpen;
		if (open) {
			const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 2.2);
			g.addColorStop(0, `rgba(150,255,210,${0.65 + 0.2 * Math.sin(time * 3)})`);
			g.addColorStop(1, 'rgba(150,255,210,0)');
			ctx.fillStyle = g;
			ctx.fillRect(cx - S * 2.2, cy - S * 2.2, S * 4.4, S * 4.4);
		}
		// the Monolith: a black slab at the hub, seen from above
		ctx.fillStyle = 'rgba(0,0,0,.4)';
		ctx.fillRect(cx - S * 0.2 + S * 0.08, cy - S * 0.26 + S * 0.1, S * 0.4, S * 0.52);
		ctx.fillStyle = open ? '#16241d' : '#0e0f10';
		ctx.fillRect(cx - S * 0.2, cy - S * 0.26, S * 0.4, S * 0.52);
		ctx.strokeStyle = open ? '#9bffc8' : '#58605f';
		ctx.lineWidth = 2;
		ctx.strokeRect(cx - S * 0.2, cy - S * 0.26, S * 0.4, S * 0.52);
		ctx.fillStyle = open ? 'rgba(160,255,210,.55)' : 'rgba(255,255,255,.14)';
		ctx.fillRect(cx - S * 0.2, cy - S * 0.26, S * 0.4, S * 0.07);
	}

	private nuts(
		ctx: Ctx,
		z: ZoneService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		for (let y = 0; y < this.grid.height; y += 1) {
			for (let x = 0; x < this.grid.width; x += 1) {
				if (!this.grid.isDot(x, y) || z.progress.isCollected(x, y)) {
					continue;
				}
				const gold = z.anomalies.covers(x, y);
				const r = gold ? S * (0.5 + 0.05 * Math.sin(time * 6 + x)) : S * 0.32;
				ctx.drawImage(nutSprite(gold), px(x + 0.5) - r / 2, py(y + 0.5) - r / 2, r, r);
			}
		}
	}

	private artifacts(
		ctx: Ctx,
		z: ZoneService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		z.map.artifacts.forEach((a, i) => {
			if (z.taken[i]) {
				return;
			}
			const cx = px(a.x + 0.5);
			const cy = py(a.y + 0.5) + Math.sin(time * 3 + i) * S * 0.05;
			const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 1.2);
			g.addColorStop(0, ARTIFACT_GLOW[i % 4]);
			g.addColorStop(1, 'rgba(0,0,0,0)');
			ctx.globalAlpha = 0.45 + 0.2 * Math.sin(time * 4 + i);
			ctx.fillStyle = g;
			ctx.fillRect(cx - S * 1.25, cy - S * 1.25, S * 2.5, S * 2.5);
			ctx.globalAlpha = 1;
			ctx.drawImage(artifactSprite(i), cx - S * 0.62, cy - S * 0.62, S * 1.24, S * 1.24);
		});
	}

	private anomalies(
		ctx: Ctx,
		z: ZoneService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		for (const a of z.anomalies.list) {
			const st = z.anomalies.stateOf(a);
			const zone = z.anomalies.zoneOf(a);
			for (const p of zone) {
				const cx = px(p.x + 0.5);
				const cy = py(p.y + 0.5);
				if (a.kind === 'heat') {
					this.heatTile(ctx, st, cx, cy, S, time, p.x, p.y);
				} else {
					this.electraTile(ctx, st, cx, cy, S, time);
				}
				if (st === 'warn' || st === 'active') {
					this.brackets(ctx, cx, cy, S);
				}
			}
			if (a.kind === 'electra') {
				this.electraCore(ctx, a, st, zone, px, py, S, time);
			}
		}
	}

	private heatTile(
		ctx: Ctx,
		st: string,
		cx: number,
		cy: number,
		S: number,
		time: number,
		tx: number,
		ty: number
	): void {
		ctx.fillStyle = st === 'inert' ? 'rgba(20,18,16,.35)' : 'rgba(12,8,6,.55)';
		ctx.beginPath();
		ctx.ellipse(cx, cy, S * 0.46, S * 0.42, 0, 0, TAU);
		ctx.fill();
		const glow =
			st === 'active'
				? 1
				: st === 'warn'
					? 0.5 + 0.4 * Math.sin(time * 22)
					: st === 'inert'
						? 0
						: 0.35;
		ctx.strokeStyle = `rgba(255,${st === 'active' ? 190 : 110},40,${0.25 + glow * 0.6})`;
		ctx.lineWidth = 1.6;
		for (let k = 0; k < 4; k += 1) {
			const a = hash(tx, ty + k) * TAU;
			ctx.beginPath();
			ctx.moveTo(cx + Math.cos(a) * S * 0.08, cy + Math.sin(a) * S * 0.08);
			ctx.lineTo(cx + Math.cos(a + 0.3) * S * 0.4, cy + Math.sin(a + 0.3) * S * 0.38);
			ctx.stroke();
		}
		if (st === 'inert') {
			return;
		}
		if (st === 'idle') {
			return;
		} else if (st === 'warn') {
			ctx.strokeStyle = `rgba(255,150,40,${0.5 + 0.4 * Math.sin(time * 22)})`;
			ctx.lineWidth = 3;
			ctx.beginPath();
			ctx.arc(cx, cy, S * 0.4, 0, TAU);
			ctx.stroke();
		} else {
			const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.78);
			g.addColorStop(0, 'rgba(255,252,220,1)');
			g.addColorStop(0.3, 'rgba(255,190,50,.95)');
			g.addColorStop(1, 'rgba(255,80,20,0)');
			ctx.fillStyle = g;
			ctx.fillRect(cx - S * 0.8, cy - S * 0.8, S * 1.6, S * 1.6);
			ctx.fillStyle = 'rgba(255,120,30,.9)';
			for (let k = 0; k < 6; k += 1) {
				const a = (k / 6) * TAU + time * 3 + hash(tx, ty) * 6;
				const l = S * (0.42 + 0.12 * Math.sin(time * 14 + k));
				ctx.beginPath();
				ctx.moveTo(cx + Math.cos(a - 0.22) * S * 0.14, cy + Math.sin(a - 0.22) * S * 0.14);
				ctx.lineTo(cx + Math.cos(a) * l, cy + Math.sin(a) * l);
				ctx.lineTo(cx + Math.cos(a + 0.22) * S * 0.14, cy + Math.sin(a + 0.22) * S * 0.14);
				ctx.fill();
			}
		}
	}

	private electraTile(ctx: Ctx, st: string, cx: number, cy: number, S: number, time: number): void {
		ctx.fillStyle = st === 'inert' ? 'rgba(20,22,26,.3)' : 'rgba(8,12,22,.5)';
		ctx.beginPath();
		ctx.arc(cx, cy, S * 0.42, 0, TAU);
		ctx.fill();
		if (st === 'inert') {
			return;
		}
		ctx.strokeStyle =
			st === 'active'
				? 'rgba(210,235,255,.95)'
				: `rgba(110,170,255,${st === 'warn' ? 0.5 + 0.4 * Math.sin(time * 26) : 0.3})`;
		ctx.lineWidth = st === 'active' ? 3 : 1.8;
		ctx.beginPath();
		ctx.arc(cx, cy, S * 0.38, 0, TAU);
		ctx.stroke();
		if (st === 'active') {
			ctx.fillStyle = 'rgba(160,205,255,.5)';
			ctx.fillRect(cx - S * 0.4, cy - S * 0.4, S * 0.8, S * 0.8);
		}
	}

	private electraCore(
		ctx: Ctx,
		a: Anomaly,
		st: string,
		zone: Array<{ x: number; y: number }>,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		const cx = px(a.x + 0.5);
		const cy = py(a.y + 0.5);
		if (st !== 'inert') {
			const k = st === 'active' ? 1 : st === 'warn' ? 0.7 + 0.3 * Math.sin(time * 26) : 0.45;
			const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * 0.5);
			g.addColorStop(0, `rgba(235,248,255,${k})`);
			g.addColorStop(0.4, `rgba(110,170,255,${k * 0.8})`);
			g.addColorStop(1, 'rgba(110,170,255,0)');
			ctx.fillStyle = g;
			ctx.fillRect(cx - S * 0.5, cy - S * 0.5, S, S);
			if (st !== 'idle') {
				const frame = Math.floor(time * 24);
				ctx.strokeStyle = st === 'active' ? '#ffffff' : 'rgba(170,205,255,.85)';
				ctx.lineWidth = st === 'active' ? 3 : 1.6;
				ctx.shadowColor = '#7fb0ff';
				ctx.shadowBlur = st === 'active' ? 10 : 4;
				for (const p of zone) {
					if (p.x === a.x && p.y === a.y) {
						continue;
					}
					const ex = px(p.x + 0.5);
					const ey = py(p.y + 0.5);
					ctx.beginPath();
					ctx.moveTo(cx, cy);
					for (let i = 1; i <= 4; i += 1) {
						const t = i / 4;
						const j = (hash(frame + i, p.x * 7 + p.y) - 0.5) * S * 0.34 * (i < 4 ? 1 : 0);
						ctx.lineTo(cx + (ex - cx) * t + j, cy + (ey - cy) * t - j);
					}
					ctx.stroke();
				}
				ctx.shadowBlur = 0;
			}
		}
		ctx.fillStyle = st === 'inert' ? '#3a3d42' : '#cfe6ff';
		ctx.beginPath();
		ctx.arc(cx, cy, S * 0.13, 0, TAU);
		ctx.fill();
		ctx.strokeStyle = INK;
		ctx.lineWidth = 1.6;
		ctx.stroke();
	}

	/** Yellow tape marks at a field tile's corners: the exact tile is readable. */
	private brackets(ctx: Ctx, cx: number, cy: number, S: number): void {
		const h = S * 0.5;
		const l = S * 0.2;
		for (const [sx, sy] of [
			[-1, -1],
			[1, -1],
			[1, 1],
			[-1, 1]
		]) {
			const x = cx + sx * (h - 2);
			const y = cy + sy * (h - 2);
			for (const [w, col] of [
				[4.4, 'rgba(18,14,6,.85)'],
				[2.4, '#f2c230']
			] as const) {
				ctx.strokeStyle = col;
				ctx.lineWidth = w;
				ctx.beginPath();
				ctx.moveTo(x - sx * l, y);
				ctx.lineTo(x, y);
				ctx.lineTo(x, y - sy * l);
				ctx.stroke();
			}
		}
	}

	private bolt(
		ctx: Ctx,
		z: ZoneService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		if (z.flight) {
			const f = z.flight;
			const t = Math.min(1, f.age / 0.18);
			const x = px(f.from.x + 0.5 + (f.to.x - f.from.x) * t);
			const y = py(f.from.y + 0.5 + (f.to.y - f.from.y) * t);
			ctx.strokeStyle = `rgba(255,255,255,${1 - f.age * 3.5})`;
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(px(f.from.x + 0.5), py(f.from.y + 0.5));
			ctx.lineTo(x, y);
			ctx.stroke();
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(time * 18);
			ctx.drawImage(nutSprite(true), -S * 0.3, -S * 0.3, S * 0.6, S * 0.6);
			ctx.restore();
		}
		if (z.lure) {
			const cx = px(z.lure.tile.x + 0.5);
			const cy = py(z.lure.tile.y + 0.5);
			for (let k = 0; k < 2; k += 1) {
				const u = (time * 1.4 + k * 0.5) % 1;
				ctx.strokeStyle = `rgba(255,255,255,${0.6 * (1 - u)})`;
				ctx.lineWidth = 2;
				ctx.beginPath();
				ctx.arc(cx, cy, u * S * 1.7, 0, TAU);
				ctx.stroke();
			}
			ctx.drawImage(nutSprite(true), cx - S * 0.28, cy - S * 0.28, S * 0.56, S * 0.56);
		}
	}

	private tushkans(
		ctx: Ctx,
		z: ZoneService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		const fear = z.tushkans.fear;
		for (const t of z.tushkans.list) {
			if (t.state === 'dead') {
				continue;
			}
			const mood: TushkanMood =
				fear > 0
					? fear < 2 && Math.floor(time * 8) % 2 === 0
						? 'flash'
						: 'scared'
					: t.state === 'rush'
						? 'rush'
						: 'calm';
			const bob = t.state === 'sniff' ? Math.sin(time * 16 + t.role) * S * 0.04 : 0;
			const cx = px(t.x);
			const cy = py(t.y) + bob;
			ctx.fillStyle = 'rgba(4,6,8,.38)';
			ctx.beginPath();
			ctx.ellipse(cx + S * 0.06, cy + S * 0.14, S * 0.42, S * 0.24, 0, 0, TAU);
			ctx.fill();
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(Math.atan2(t.dy, t.dx));
			const w = S * 1.3;
			ctx.drawImage(tushkanSprite(t.role, mood), -w / 2, -w / 2, w, w);
			ctx.restore();
		}
	}

	private poltergeist(
		ctx: Ctx,
		z: ZoneService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		const p = z.poltergeist;
		if (p.state === 'appear' || p.state === 'aim') {
			// the line to be thrown down: yellow and black stripes that run toward the wall
			for (const l of p.line) {
				const x = px(l.x);
				const y = py(l.y);
				ctx.fillStyle =
					p.state === 'aim'
						? `rgba(255,70,40,${0.2 + 0.18 * Math.sin(time * 18)})`
						: 'rgba(255,200,50,.1)';
				ctx.fillRect(x + 2, y + 2, S - 4, S - 4);
				if (p.state === 'aim') {
					ctx.save();
					ctx.beginPath();
					ctx.rect(x + 2, y + 2, S - 4, S - 4);
					ctx.clip();
					ctx.strokeStyle = 'rgba(242,194,48,.8)';
					ctx.lineWidth = S * 0.14;
					for (let k = -3; k < 6; k += 1) {
						ctx.beginPath();
						ctx.moveTo(x + k * S * 0.32 - ((time * S * 2) % (S * 0.64)), y + S);
						ctx.lineTo(x + k * S * 0.32 - ((time * S * 2) % (S * 0.64)) + S, y);
						ctx.stroke();
					}
					ctx.restore();
				}
			}
		}
		if (p.state === 'appear' || p.state === 'aim' || p.state === 'stunned') {
			const cx = px(p.at.x + 0.5);
			const cy = py(p.at.y + 0.5) + Math.sin(time * 5) * S * 0.06;
			const w = S * 1.35;
			ctx.globalAlpha = p.state === 'stunned' ? 0.4 : 0.8 + 0.2 * Math.sin(time * 12);
			ctx.drawImage(poltergeistSprite(p.state === 'aim'), cx - w / 2, cy - w / 2, w, w);
			ctx.globalAlpha = 1;
			// the debris it lifts, circling
			for (let k = 0; k < 5; k += 1) {
				const a = time * 2.4 + (k / 5) * TAU;
				const x = cx + Math.cos(a) * S * 0.7;
				const y = cy + Math.sin(a) * S * 0.45;
				ctx.fillStyle = k % 2 ? '#7a7d82' : '#a65a3a';
				ctx.strokeStyle = '#15110d';
				ctx.lineWidth = 1.6;
				ctx.save();
				ctx.translate(x, y);
				ctx.rotate(a * 2);
				ctx.fillRect(-S * 0.09, -S * 0.07, S * 0.18, S * 0.14);
				ctx.strokeRect(-S * 0.09, -S * 0.07, S * 0.18, S * 0.14);
				ctx.restore();
			}
			if (p.state === 'stunned') {
				ctx.fillStyle = '#fff';
				ctx.font = `700 ${S * 0.4}px "Arial Narrow",sans-serif`;
				ctx.fillText('z z', cx + S * 0.3, cy - S * 0.55);
			}
		}
		if (p.barrel) {
			const b = p.barrel;
			const cx = px(b.x);
			const cy = py(b.y);
			ctx.strokeStyle = 'rgba(255,255,255,.35)';
			ctx.lineWidth = S * 0.1;
			ctx.beginPath();
			ctx.moveTo(cx - b.dx * S * 1.2, cy - b.dy * S * 1.2);
			ctx.lineTo(cx, cy);
			ctx.stroke();
			ctx.save();
			ctx.translate(cx, cy);
			ctx.rotate(Math.atan2(b.dy, b.dx));
			ctx.drawImage(barrelSprite(), -S * 0.6, -S * 0.4, S * 1.2, S * 0.8);
			ctx.restore();
		}
	}

	/** During the siren and the wave: an arrow beside the hero toward the nearest hatch. */
	private hint(
		ctx: Ctx,
		z: ZoneService,
		px: (x: number) => number,
		py: (y: number) => number,
		S: number,
		time: number
	): void {
		if (!z.emission.dangerous || z.sheltered || z.state !== 'play') {
			return;
		}
		const h = z.player.position;
		let best = z.map.shelters[0];
		for (const s of z.map.shelters) {
			if (
				Math.abs(s.x + 0.5 - h.x) + Math.abs(s.y + 0.5 - h.y) <
				Math.abs(best.x + 0.5 - h.x) + Math.abs(best.y + 0.5 - h.y)
			) {
				best = s;
			}
		}
		const a = Math.atan2(best.y + 0.5 - h.y, best.x + 0.5 - h.x);
		const r = S * (1.05 + 0.1 * Math.sin(time * 10));
		const x = px(h.x) + Math.cos(a) * r;
		const y = py(h.y) + Math.sin(a) * r;
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(a);
		ctx.fillStyle = '#7dff6a';
		ctx.strokeStyle = '#10200c';
		ctx.lineWidth = 2.4;
		ctx.beginPath();
		ctx.moveTo(S * 0.3, 0);
		ctx.lineTo(-S * 0.18, -S * 0.22);
		ctx.lineTo(-S * 0.08, 0);
		ctx.lineTo(-S * 0.18, S * 0.22);
		ctx.closePath();
		ctx.stroke();
		ctx.fill();
		ctx.restore();
	}
}
