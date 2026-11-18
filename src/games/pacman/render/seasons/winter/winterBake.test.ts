import { describe, expect, it } from 'vitest';
import type { MeadowFrame } from '../meadow/MeadowBake';
import { MEADOW_TILE as T } from '../meadow/MeadowBake';
import type { WorldDecor } from '../../common/worldDecor';
import { tileRandom } from '../../common/worldDecor';
import { paintSnowFloor, paintSnowWalls, paintWinterAfter } from './winterBake';
import { winterTheme } from './winterTheme';

type Op = { op: string; args: unknown[]; fill?: unknown; stroke?: unknown };

/** A context and bake kit that record calls instead of drawing. */
function recorder() {
	const ops: Op[] = [];
	let fill: unknown;
	let stroke: unknown;
	const stack: Array<{ fill: unknown; stroke: unknown }> = [];
	const gradient = () => ({ addColorStop: () => {} });
	const ctx = new Proxy({} as Record<string, unknown>, {
		get: (target, key: string) =>
			key in target
				? target[key]
				: (...args: unknown[]) => {
						if (key === 'save') stack.push({ fill, stroke });
						if (key === 'restore') {
							const s = stack.pop();
							if (s) {
								fill = s.fill;
								stroke = s.stroke;
							}
						}
						ops.push({ op: key, args, fill, stroke });
						return key.startsWith('create') ? gradient() : undefined;
					},
		set: (target, key: string, value) => {
			target[key] = value;
			if (key === 'fillStyle') fill = value;
			if (key === 'strokeStyle') stroke = value;
			return true;
		}
	}) as unknown as CanvasRenderingContext2D;
	const lin = (...args: unknown[]) => {
		ops.push({ op: 'lin', args });
		return gradient() as unknown as CanvasGradient;
	};
	const blob = (...args: unknown[]) => {
		ops.push({ op: 'blob', args });
	};
	const rp = (...args: unknown[]) => {
		ops.push({ op: 'rp', args });
	};
	return { ctx, ops, lin, blob, rp };
}

function wallFrame(rec: ReturnType<typeof recorder>): MeadowFrame {
	const isW = (r: number, c: number) => r >= 0 && r < 3 && c >= 0 && c < 3;
	return {
		S: Array.from({ length: 3 }, () => Array<string>(3).fill('WL')),
		P: winterTheme.bake,
		R: 3,
		C: 3,
		isW,
		b: rec.ctx,
		vis: () => true,
		lin: rec.lin,
		blob: rec.blob,
		rp: rec.rp,
		RS: 1
	} as unknown as MeadowFrame;
}

describe('snow-capped walls', () => {
	it('put the cap, the lip and the base shelf only on exposed edges, inside the tile', () => {
		const rec = recorder();
		paintSnowWalls(wallFrame(rec));
		// the cap's gradient spans 0.7 tile from the top; the base shelf's spans the last 0.2
		const caps = rec.ops.filter(
			(o) =>
				o.op === 'lin' &&
				o.args[4] === '#ffffff' &&
				o.args[5] === '#dfe9f4' &&
				Math.abs((o.args[3] as number) - (o.args[1] as number) - T * 0.7) < 1e-9
		);
		expect(caps).toHaveLength(3);
		expect(caps.every((o) => o.args[1] === 0)).toBe(true);
		const shelves = rec.ops.filter(
			(o) =>
				o.op === 'lin' &&
				o.args[4] === '#ffffff' &&
				o.args[5] === '#dfe9f4' &&
				Math.abs((o.args[3] as number) - (o.args[1] as number) - T * 0.2) < 1e-9
		);
		expect(shelves).toHaveLength(3);
		expect(shelves.every((o) => Math.abs((o.args[1] as number) - (2 * T + T * 0.8)) < 1e-9)).toBe(
			true
		);
		const lips = rec.ops.filter((o) => o.op === 'moveTo' && o.fill === 'rgba(255,255,255,.85)');
		expect(lips).toHaveLength(3);
		const shelfBlobs = rec.ops.filter((o) => o.op === 'blob' && o.args[4] === '#ffffff');
		expect(shelfBlobs).toHaveLength(3);
		expect(shelfBlobs.every((o) => (o.args[1] as number) <= 3 * T)).toBe(true);
		// no snow shape may start outside the block: the old cap and lip leaked a pixel
		const snow = rec.ops.filter((o) => o.fill === '#ffffff' || o.fill === 'rgba(255,255,255,.85)');
		expect(snow.length).toBeGreaterThan(0);
		for (const o of snow) {
			for (const a of o.args.slice(0, 2)) {
				if (typeof a === 'number') {
					expect(a).toBeGreaterThanOrEqual(0);
					expect(a).toBeLessThanOrEqual(3 * T);
				}
			}
		}
		// the bevels are clipped to their own tile so nothing draws round the corners
		const clips = rec.ops.filter((o) => o.op === 'rect' && o.args[2] === T && o.args[3] === T);
		expect(clips).toHaveLength(9);
	});

	it('give the stone its joints and specks back, without moss or flower stickers', () => {
		const rec = recorder();
		paintSnowWalls(wallFrame(rec));
		const W = winterTheme.bake.wall;
		expect(rec.ops.filter((o) => o.op === 'stroke' && o.stroke === W.joints)).toHaveLength(9);
		const banned: string[] = [...W.moss, ...W.flowers];
		expect(
			rec.ops.some((o) => banned.includes(o.fill as string) || banned.includes(o.stroke as string))
		).toBe(false);
	});
});

describe('the New Year final layer', () => {
	it('lights the chimney, hangs a garland and loads the fir crowns with snow', () => {
		const rec = recorder();
		const DEC = [
			{ k: 'cabin', x: 200, y: 200, w: 100, h: 60 },
			{ k: 'tree', pk: true, x: 400, y: 200, r: 20 }
		] as unknown as WorldDecor[];
		const f = {
			DEC,
			P: winterTheme.bake,
			b: rec.ctx,
			vis: () => true,
			blob: rec.blob,
			rp: rec.rp,
			lin: rec.lin
		} as unknown as MeadowFrame;
		paintWinterAfter(f);
		expect(rec.ops.filter((o) => o.op === 'fillRect' && o.fill === '#ff9a4d')).toHaveLength(1);
		const bulbs = rec.ops.filter(
			(o) =>
				o.op === 'arc' &&
				o.args[2] === 1.4 &&
				['#ffd98a', '#ff9a6b', '#9fd8ff'].includes(o.fill as string)
		);
		expect(bulbs).toHaveLength(11);
		// the seam is a soft snow ridge bar, and the planes meet it round, not at sharp angles
		expect(rec.ops.some((o) => o.op === 'rp' && o.args[3] === 5.2)).toBe(true);
		expect(
			rec.ops.some((o) => o.op === 'stroke' && o.stroke === winterTheme.bake.cabin.ridgeShadow)
		).toBe(true);
		expect(rec.ops.filter((o) => o.op === 'quadraticCurveTo').length).toBeGreaterThanOrEqual(4);
		expect(
			rec.ops.filter((o) => o.op === 'blob' && o.args[4] === 'rgba(255,255,255,.88)')
		).toHaveLength(1);
	});
});

describe('the trodden snow path', () => {
	it('packs a blue-grey base with dust and specks over the whole cell', () => {
		const rec = recorder();
		const f = wallFrame(rec);
		paintSnowFloor(f, T, T, tileRandom(1, 1));
		const bases = rec.ops.filter(
			(o) =>
				o.op === 'fillRect' &&
				o.args[0] === T - 0.5 &&
				o.args[2] === T + 1 &&
				['#879bb1', '#8093a9', '#8ea2b8'].includes(o.fill as string)
		);
		expect(bases).toHaveLength(1);
		expect(
			rec.ops.filter((o) => o.op === 'blob' && o.args[4] === 'rgba(255,255,255,.22)')
		).toHaveLength(2);
	});
});

describe('the winter theme opts into its setting', () => {
	it('wires its own wall material, final layer, landmark, patches and pond ice', () => {
		expect(winterTheme.bake.wall.paint).toBe(paintSnowWalls);
		expect(winterTheme.bake.floor.paint).toBe(paintSnowFloor);
		expect(winterTheme.bake.after).toBe(paintWinterAfter);
		expect(winterTheme.bake.landmark.draw).toBeDefined();
		expect(winterTheme.bake.flowerPatch).toBeDefined();
		expect(winterTheme.bake.pondExtras).toBeDefined();
	});
});
