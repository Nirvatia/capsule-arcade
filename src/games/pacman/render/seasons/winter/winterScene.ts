// Winter's holiday scene, New Year (the owner's pick of the `season-dress` prototype): a decorated
// tree beside each snowman (from above: layered branches with snow on the lit tips, baubles, a
// spiral of lights, the gold star at the centre) with presents under it and two sparklers stuck in
// the snow; strings of lights round the cabins' roofs and on the bridge's rails; warm window light
// on the snow; a present on each doorstep; holly on the lamps. Live: the sparklers' sparks (short,
// turning slowly). The walls wear the snow blanket (`winterDress`) as the scene's wall dress.
import { gift, lights, newYearTree, windowSpill } from '../meadow/sceneProps';
import type { SeasonScene } from '../meadow/seasonScene';
import { TAU, addBulbs, addLight, addMark, cabinsOf } from '../meadow/seasonScene';
import { WORLD_TILE } from '../../common/worldDecor';
import { snowBlanket } from './winterDress';

const T = WORLD_TILE;

export const newYearScene: SeasonScene = {
	wallDress: snowBlanket,
	landmark(k, o, lit, i) {
		// the tree stands beside the snowman, the presents under its lower branches
		const side = i === 0 ? -1 : 1;
		const tx = o.x + side * 1.75 * T;
		const ty = o.y - 0.5 * T;
		const R = 1.25 * T;
		addBulbs(lit, newYearTree(k.b, tx, ty, R));
		addLight(lit, tx, ty, T * 0.9, '255,220,120', 0.6);
		const gifts: ReadonlyArray<readonly [number, number, number, number, string, string]> = [
			[0.75, 1.0, 0.55, 0.45, '#c0303a', '#f4d27a'],
			[1.25, 0.45, 0.42, 0.42, '#2e6fb8', '#f4f4f4'],
			[0.15, 1.3, 0.38, 0.48, '#f0c040', '#c0303a'],
			[-0.65, 1.1, 0.45, 0.36, '#2f8a4a', '#f4d27a']
		];
		for (const [dx, dy, w, h, c0, c1] of gifts)
			gift(k.b, tx + dx * T, ty + dy * T, w * T, h * T, (dx - dy) * 0.4, c0, c1);
		// two sparklers stuck in the snow by the presents (their sparks are live)
		for (const dx of [1.5, -1.3]) {
			const x = tx + dx * T;
			const y = ty + 1.55 * T;
			k.b.fillStyle = '#5a5a60';
			k.b.beginPath();
			k.b.arc(x, y, 0.9, 0, TAU);
			k.b.fill();
			addMark(lit, 'sparkler', x, y, dx);
		}
	},
	props(f, lit) {
		const b = f.b;
		// strings of lights round the cabins' roofs, warm light from their windows on the snow
		for (const cb of cabinsOf(f.DEC)) {
			const w = cb.w ?? 0;
			const h = cb.h ?? 0;
			const X = cb.x - w / 2;
			const Y = cb.y - h / 2;
			const pts: Array<[number, number]> = [];
			const inset = 2.5;
			for (let i = 0; i <= 40; i += 1) {
				const f2 = i / 40;
				// round the roof's rim, sagging a little between the eaves' corners
				const per = 2 * (w + h);
				let s = f2 * per;
				let pt: [number, number];
				if (s < w) pt = [X + s, Y + inset + Math.sin((s / w) * Math.PI) * 1.4];
				else if ((s -= w) < h) pt = [X + w - inset - Math.sin((s / h) * Math.PI) * 1.4, Y + s];
				else if ((s -= h) < w) pt = [X + w - s, Y + h - inset - Math.sin((s / w) * Math.PI) * 1.4];
				else pt = [X + inset + Math.sin(((s - w) / h) * Math.PI) * 1.4, Y + h - (s - w)];
				pts.push(pt);
			}
			addBulbs(lit, lights(b, pts, 6, Math.round(cb.x)));
			for (const [px, py, dx, dy] of [
				[X + w, cb.y - h * 0.25, 1, 0],
				[X + w, cb.y + h * 0.25, 1, 0],
				[X, cb.y - h * 0.25, -1, 0],
				[X, cb.y + h * 0.25, -1, 0],
				[cb.x - w * 0.25, Y + h, 0, 1],
				[cb.x + w * 0.25, Y + h, 0, 1]
			] as const) {
				windowSpill(b, px, py, 9, 1.3 * T, dx, dy);
				addLight(lit, px + dx * 0.6 * T, py + dy * 0.6 * T, T * 1.1, '255,190,100', 0.32);
			}
			// a present on the doorstep
			gift(
				b,
				cb.x + (cb.x < 0 ? 1 : -1) * (w / 2 + 0.7 * T),
				cb.y + 0.4 * T,
				0.5 * T,
				0.42 * T,
				0.3,
				'#c0303a',
				'#f4d27a'
			);
		}
		// the bridge's rails carry lights too
		for (const o of f.DEC) {
			if (o.k === 'bridge') {
				for (const rx of [o.x - 24, o.x + 24])
					addBulbs(
						lit,
						lights(
							b,
							[
								[rx, o.y - 34],
								[rx, o.y + 34]
							],
							6,
							3
						)
					);
			}
			if (o.k === 'lamp') {
				// holly round the lamp: a green ring, red berries
				b.strokeStyle = '#2c6a36';
				b.lineWidth = 2.2;
				b.beginPath();
				b.arc(o.x, o.y, 6.2, 0, TAU);
				b.stroke();
				for (let i = 0; i < 5; i += 1) {
					const a = i * 1.3 + 0.4;
					b.fillStyle = '#d0262e';
					b.beginPath();
					b.arc(o.x + Math.cos(a) * 6.2, o.y + Math.sin(a) * 6.2, 1, 0, TAU);
					b.fill();
				}
				addLight(lit, o.x, o.y, T * 1.3, '255,214,140', 0.4);
			}
		}
	},
	live(ctx, t, v) {
		// sparklers: a white-hot point and short sparks turning round it, shimmering slowly
		const k = v.k;
		ctx.save();
		ctx.globalCompositeOperation = 'lighter';
		for (const g of v.lit.marks.values()) {
			if (g.kind !== 'sparkler') continue;
			const x = v.ox + g.x * k;
			const y = v.oy + g.y * k;
			const gr = ctx.createRadialGradient(x, y, 0, x, y, 9 * k);
			gr.addColorStop(0, 'rgba(255,240,200,.85)');
			gr.addColorStop(1, 'rgba(255,200,120,0)');
			ctx.fillStyle = gr;
			ctx.fillRect(x - 9 * k, y - 9 * k, 18 * k, 18 * k);
			ctx.strokeStyle = 'rgba(255,236,190,.8)';
			ctx.lineWidth = Math.max(0.6, 0.35 * k);
			ctx.lineCap = 'round';
			for (let i = 0; i < 12; i += 1) {
				const a = i * 0.524 + t * 0.6 + g.ph;
				const len = (3 + 3 * (0.5 + 0.5 * Math.sin(t * 2 + i * 2.1))) * k;
				ctx.beginPath();
				ctx.moveTo(x + Math.cos(a) * 1.5 * k, y + Math.sin(a) * 1.5 * k);
				ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
				ctx.stroke();
			}
		}
		ctx.restore();
	}
};
