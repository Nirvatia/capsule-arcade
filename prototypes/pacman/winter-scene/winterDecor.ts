import type { GridMatrix } from '../../../src/games/pacman/config/gridConfig';
import { glowTexture } from '../../../src/games/pacman/render/common/textures';
import type { WorldDecor } from '../../../src/games/pacman/render/common/worldDecor';
import { tunnelRowOf, worldDecor } from '../../../src/games/pacman/render/common/worldDecor';
import type { GridLayout } from '../../../src/games/pacman/render/maze/GridView';
import { T } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import type { MeadowFrame } from '../../../src/games/pacman/render/seasons/meadow/MeadowBake';
import type { BakeKit } from '../../../src/games/pacman/render/seasons/meadow/MeadowTheme';

const INK = '#25313c';
const WARM = 0xffcb78;
const BULB_COLORS = [0xffc66d, 0xd9534f, 0x7fa77b] as const;

interface Bulb {
	readonly kind: 'bulb';
	readonly x: number;
	readonly y: number;
	readonly color: number;
	readonly phase: number;
}

interface WindowLight {
	readonly kind: 'window';
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
	readonly phase: number;
}

type FestiveLight = Bulb | WindowLight;

export const WINTER_LANDMARK_EX = [3.4, 1.6] as const;

function decorFor(S: GridMatrix): WorldDecor[] {
	return worldDecor(S.length, S[0].length, WINTER_LANDMARK_EX, tunnelRowOf(S));
}

export function winterTreePosition(landmark: WorldDecor): { x: number; y: number } {
	return { x: landmark.x - 1.65 * T, y: landmark.y - 1.35 * T };
}

function starPath(x: number, y: number, outer: number, inner: number): Path2D {
	const p = new Path2D();
	for (let i = 0; i < 10; i++) {
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		const r = i % 2 ? inner : outer;
		const px = x + Math.cos(a) * r;
		const py = y + Math.sin(a) * r;
		if (i === 0) p.moveTo(px, py);
		else p.lineTo(px, py);
	}
	p.closePath();
	return p;
}

function crownPath(x: number, y: number, radius: number, rotation: number): Path2D {
	const p = new Path2D();
	for (let i = 0; i < 24; i++) {
		const a = rotation + (i / 24) * Math.PI * 2;
		const r = i % 3 === 0 ? radius : i % 3 === 1 ? radius * 0.58 : radius * 0.78;
		const px = x + Math.cos(a) * r;
		const py = y + Math.sin(a) * r * 0.9;
		if (i === 0) p.moveTo(px, py);
		else p.lineTo(px, py);
	}
	p.closePath();
	return p;
}

export function drawWinterTree(k: BakeKit, landmark: WorldDecor): void {
	const { b, blob, shade } = k;
	const { x, y } = winterTreePosition(landmark);
	blob(x + 4, y + 6, 28, 21, shade(0.3), 0);
	for (const [radius, color, dx, dy, rotation] of [
		[27, '#244d46', 1, 2, 0.05],
		[21, '#316358', -0.5, 0, 0.18],
		[14.5, '#42766a', -1.5, -1.5, 0.02]
	] as const) {
		const path = crownPath(x + dx, y + dy, radius, rotation);
		b.fillStyle = color;
		b.fill(path);
		b.strokeStyle = 'rgba(24,50,47,.65)';
		b.lineWidth = 0.8;
		b.stroke(path);
	}
	b.fillStyle = '#edf6fb';
	for (const [dx, dy, rx, ry, rot] of [
		[-13, -13, 8, 3, -0.55],
		[-20, -3, 6, 2.4, -0.2],
		[-5, -20, 6, 2.6, -0.9],
		[-8, -7, 5, 2, -0.4]
	] as const) {
		blob(x + dx, y + dy, rx, ry, '#edf6fb', rot);
	}
	const ornaments = [
		[-12, 4, '#c84343'],
		[8, 10, '#d8ae4d'],
		[13, -5, '#c84343'],
		[-3, 14, '#d8ae4d'],
		[-8, -10, '#d8ae4d'],
		[3, -2, '#c84343']
	] as const;
	for (const [dx, dy, color] of ornaments) {
		b.fillStyle = color;
		b.beginPath();
		b.arc(x + dx, y + dy, 1.8, 0, Math.PI * 2);
		b.fill();
		b.strokeStyle = INK;
		b.lineWidth = 0.65;
		b.stroke();
		b.fillStyle = 'rgba(255,255,255,.65)';
		b.beginPath();
		b.arc(x + dx - 0.5, y + dy - 0.6, 0.45, 0, Math.PI * 2);
		b.fill();
	}
	const star = starPath(x - 1.5, y - 2, 5.5, 2.5);
	b.fillStyle = '#e7bd54';
	b.fill(star);
	b.strokeStyle = '#6b5125';
	b.lineWidth = 0.8;
	b.stroke(star);
	for (const [gx, gy, color] of [
		[x - 10, y + 23, '#a83d43'],
		[x + 1, y + 24, '#b08b3f']
	] as const) {
		b.fillStyle = shade(0.24);
		b.fillRect(gx + 1.5, gy + 2, 9, 7);
		b.fillStyle = color;
		b.fillRect(gx, gy, 9, 7);
		b.strokeStyle = INK;
		b.lineWidth = 0.7;
		b.strokeRect(gx, gy, 9, 7);
		b.fillStyle = '#e4c375';
		b.fillRect(gx + 3.7, gy, 1.6, 7);
	}
}

function cabinWindows(o: WorldDecor): WindowLight[] {
	const w = o.w ?? 0;
	const h = o.h ?? 0;
	const X = o.x - w / 2;
	const Y = o.y - h / 2;
	return [0.28, 0.7].map((at, i) => ({
		kind: 'window',
		x: X + w * at,
		y: Y + h * 0.69,
		w: Math.max(8, w * 0.075),
		h: Math.max(6, h * 0.09),
		phase: i * 1.7 + o.x * 0.01
	}));
}

function cabinBulbs(o: WorldDecor): Bulb[] {
	const w = o.w ?? 0;
	const h = o.h ?? 0;
	const X = o.x - w / 2;
	const Y = o.y - h / 2;
	const points: Bulb[] = [];
	const count = Math.max(8, Math.round(w / 13));
	for (let i = 0; i <= count; i++) {
		const u = i / count;
		points.push({
			kind: 'bulb',
			x: X + 5 + u * (w - 10),
			y: Y + h - 4 + Math.sin(u * Math.PI * 3) * 2.2,
			color: BULB_COLORS[i % BULB_COLORS.length],
			phase: i * 0.83 + o.x * 0.02
		});
	}
	return points;
}

function bridgeBulbs(o: WorldDecor): Bulb[] {
	const bx = o.x - 26;
	const by = o.y - 34;
	return Array.from({ length: 8 }, (_, i) => {
		const u = i / 7;
		return {
			kind: 'bulb',
			x: bx + 50 + Math.sin(u * Math.PI * 3) * 2.4,
			y: by + 4 + u * 60,
			color: BULB_COLORS[(i + 1) % BULB_COLORS.length],
			phase: i * 0.91 + 2
		};
	});
}

function treeBulbs(landmark: WorldDecor): Bulb[] {
	const { x, y } = winterTreePosition(landmark);
	return [
		[-16, 1],
		[-8, 11],
		[4, 13],
		[14, 4],
		[9, -10],
		[-5, -14]
	].map(([dx, dy], i) => ({
		kind: 'bulb',
		x: x + dx,
		y: y + dy,
		color: i % 3 === 0 ? 0xd9534f : 0xffcb78,
		phase: i * 1.13 + 0.4
	}));
}

const festiveCache = new WeakMap<GridMatrix, readonly FestiveLight[]>();

function lightsFor(S: GridMatrix): readonly FestiveLight[] {
	const cached = festiveCache.get(S);
	if (cached) return cached;
	const result: FestiveLight[] = [];
	for (const o of decorFor(S)) {
		if (o.k === 'cabin') {
			result.push(...cabinWindows(o), ...cabinBulbs(o));
		} else if (o.k === 'bridge') {
			result.push(...bridgeBulbs(o));
		} else if (o.k === 'landmark' && o.x < 0) {
			result.push(...treeBulbs(o));
		}
	}
	festiveCache.set(S, result);
	return result;
}

function paintWindow(b: CanvasRenderingContext2D, o: WindowLight): void {
	const x = o.x - o.w / 2;
	const y = o.y - o.h / 2;
	b.fillStyle = 'rgba(25,32,40,.32)';
	b.fillRect(x - 1.5, y - 1, o.w + 3, o.h + 3.5);
	b.fillStyle = '#293641';
	b.fillRect(x - 1, y - 1, o.w + 2, o.h + 2);
	b.fillStyle = '#806b50';
	b.fillRect(x, y, o.w, o.h);
	b.fillStyle = '#a48558';
	b.fillRect(x + 1, y + 1, o.w * 0.42, o.h - 2);
	b.fillStyle = '#35414a';
	b.fillRect(x + o.w / 2 - 0.45, y, 0.9, o.h);
	b.fillRect(x, y + o.h / 2 - 0.4, o.w, 0.8);
	b.strokeStyle = '#eef6fb';
	b.lineWidth = 1.4;
	b.lineCap = 'round';
	b.beginPath();
	b.moveTo(x - 1, y - 1.5);
	b.lineTo(x + o.w + 1, y - 1.5);
	b.stroke();
}

function paintCord(b: CanvasRenderingContext2D, bulbs: readonly Bulb[]): void {
	if (bulbs.length < 2) return;
	b.strokeStyle = '#314039';
	b.lineWidth = 0.9;
	b.beginPath();
	b.moveTo(bulbs[0].x, bulbs[0].y);
	for (let i = 1; i < bulbs.length; i++) {
		const a = bulbs[i - 1];
		const q = bulbs[i];
		b.quadraticCurveTo((a.x + q.x) / 2, (a.y + q.y) / 2 + 1.2, q.x, q.y);
	}
	b.stroke();
	for (const p of bulbs) {
		b.fillStyle = `#${p.color.toString(16).padStart(6, '0')}`;
		b.beginPath();
		b.arc(p.x, p.y, 1.45, 0, Math.PI * 2);
		b.fill();
		b.strokeStyle = INK;
		b.lineWidth = 0.55;
		b.stroke();
	}
}

export function paintWinterEnvironment(f: MeadowFrame): void {
	const { b, DEC } = f;
	for (const o of DEC) {
		if (o.k === 'cabin') {
			for (const w of cabinWindows(o)) paintWindow(b, w);
			paintCord(b, cabinBulbs(o));
		} else if (o.k === 'bridge') {
			paintCord(b, bridgeBulbs(o));
		}
	}
}

export function drawWinterFestiveLights(
	ctx: CanvasRenderingContext2D,
	S: GridMatrix,
	layout: GridLayout,
	time: number,
	night: number,
	motion: number
): void {
	if (night <= 0.01) return;
	ctx.save();
	ctx.translate(layout.offsetX, layout.offsetY);
	ctx.scale(layout.tileSize / T, layout.tileSize / T);
	for (const p of lightsFor(S)) {
		const shimmer = motion ? 0.9 + Math.sin(time * 0.85 + p.phase) * 0.1 : 1;
		if (p.kind === 'window') {
			const glow = glowTexture(WARM);
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = night * 0.2 * shimmer;
			ctx.drawImage(glow, p.x - 22, p.y - 17, 44, 34);
			ctx.globalCompositeOperation = 'source-over';
			ctx.globalAlpha = 0.18 + night * 0.78;
			ctx.fillStyle = '#ffd68a';
			ctx.fillRect(p.x - p.w / 2 + 1, p.y - p.h / 2 + 1, p.w - 2, p.h - 2);
			ctx.fillStyle = '#fff0bd';
			ctx.globalAlpha = night * 0.45;
			ctx.fillRect(p.x - p.w / 2 + 1.5, p.y - p.h / 2 + 1.5, p.w * 0.35, p.h - 3);
		} else {
			const glow = glowTexture(p.color);
			ctx.globalCompositeOperation = 'lighter';
			ctx.globalAlpha = (0.025 + night * 0.2) * shimmer;
			ctx.drawImage(glow, p.x - 5.5, p.y - 5.5, 11, 11);
			ctx.globalCompositeOperation = 'source-over';
			ctx.globalAlpha = 0.2 + night * 0.8;
			ctx.fillStyle = '#fff0c2';
			ctx.beginPath();
			ctx.arc(p.x - 0.25, p.y - 0.3, 0.65, 0, Math.PI * 2);
			ctx.fill();
		}
	}
	ctx.restore();
}
