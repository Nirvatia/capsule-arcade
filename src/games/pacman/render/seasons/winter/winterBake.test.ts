import { describe, expect, it } from 'vitest';
import type { MeadowFrame } from '../meadow/MeadowBake';
import { MEADOW_TILE as T } from '../meadow/MeadowBake';
import type { WorldDecor } from '../../common/worldDecor';
import { paintSnowWalls, paintWinterAfter } from './winterBake';
import { winterTheme } from './winterTheme';

type Op = { op: string; args: unknown[]; fill?: unknown; stroke?: unknown };

/** A context and bake kit that record calls instead of drawing. */
function recorder() {
	const ops: Op[] = [];
	let fill: unknown;
	let stroke: unknown;
	const gradient = () => ({ addColorStop: () => {} });
	const ctx = new Proxy({} as Record<string, unknown>, {
		get: (target, key: string) =>
			key in target
				? target[key]
				: (...args: unknown[]) => {
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
	it('put the cap, the lip and the drift only on exposed edges of a wall block', () => {
		const rec = recorder();
		paintSnowWalls(wallFrame(rec));
		const caps = rec.ops.filter(
			(o) => o.op === 'lin' && o.args[4] === '#ffffff' && o.args[5] === '#dfe9f4'
		);
		expect(caps).toHaveLength(3);
		expect(caps.every((o) => o.args[1] === 0)).toBe(true);
		const lips = rec.ops.filter((o) => o.op === 'fillRect' && o.fill === 'rgba(255,255,255,.85)');
		expect(lips).toHaveLength(3);
		expect(lips.every((o) => o.args[0] === -1)).toBe(true);
		const drifts = rec.ops.filter((o) => o.op === 'blob' && o.args[4] === '#ffffff');
		expect(drifts).toHaveLength(3);
		expect(drifts.every((o) => o.args[1] === 2 * T + T * 0.98)).toBe(true);
	});

	it('leave the inner stone of a block bare of snow and of moss or flower stickers', () => {
		const rec = recorder();
		paintSnowWalls(wallFrame(rec));
		const drifts = winterTheme.bake.wall.drifts;
		const innerDrifts = rec.ops.filter(
			(o) =>
				o.op === 'blob' &&
				drifts.includes(o.args[4] as string) &&
				(o.args[0] as number) >= T &&
				(o.args[0] as number) < 2 * T &&
				(o.args[1] as number) >= T &&
				(o.args[1] as number) < 2 * T
		);
		expect(innerDrifts).toHaveLength(0);
		const W = winterTheme.bake.wall;
		expect(
			rec.ops.some((o) => o.op === 'stroke' && (o.stroke === W.crack || o.stroke === W.joints))
		).toBe(false);
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
		expect(
			rec.ops.some((o) => o.op === 'stroke' && o.stroke === winterTheme.bake.cabin.ridge)
		).toBe(true);
		expect(
			rec.ops.filter((o) => o.op === 'blob' && o.args[4] === 'rgba(255,255,255,.88)')
		).toHaveLength(1);
	});
});

describe('the winter theme opts into its setting', () => {
	it('wires its own wall material, final layer, landmark, patches and pond ice', () => {
		expect(winterTheme.bake.wall.paint).toBe(paintSnowWalls);
		expect(winterTheme.bake.after).toBe(paintWinterAfter);
		expect(winterTheme.bake.landmark.draw).toBeDefined();
		expect(winterTheme.bake.flowerPatch).toBeDefined();
		expect(winterTheme.bake.pondExtras).toBeDefined();
	});
});
