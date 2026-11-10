// The hell's armor for both heroes (the owner's "doom fighter" mock-up, the heavy weight): a
// helmet and a chin guard painted on the ball, never beyond its outline and never over the
// mouth, so the hero stays round and the corridors keep their width. Cel-shaded like the body
// (hard bands, an ink line), cold steel against the warm flesh. Pac-Man reads by a visor slit,
// Ms. Pac-Man keeps her eye in a goggle. In the berserk (the awoken look, `power`) the armor
// turns black and the cracks in it burn; the BFG charge lights three seam lights on the nape,
// the visor and the throat green. An open strip of the body stays under the helmet, so the gold
// and the pink still read. Frame space: the hero faces +x, the top is -y.
import type { BodyCut, OverPainter } from './Hero';
import { css, glow, mix } from './Hero';
import type { RGB } from './heroSeasons';

interface ArmorPalette {
	/** The helmet's lit band, mid tone and shadow band. */
	readonly lit: RGB;
	readonly mid: RGB;
	readonly shade: RGB;
	/** The inner edge light and the visor. */
	readonly edge: RGB;
	readonly visor: RGB;
	readonly rim: RGB;
}

export type ArmorWearer = 'pacman' | 'ms-pacman';

const CALM: Record<ArmorWearer, ArmorPalette> = {
	pacman: {
		lit: [98, 150, 80],
		mid: [47, 78, 42],
		shade: [22, 38, 26],
		edge: [176, 216, 146],
		visor: [125, 246, 255],
		rim: [130, 235, 225]
	},
	'ms-pacman': {
		lit: [120, 108, 196],
		mid: [60, 50, 116],
		shade: [28, 22, 66],
		edge: [190, 180, 244],
		visor: [214, 196, 255],
		rim: [170, 225, 255]
	}
};
/** The berserk: black plates with a hot edge (red would sink into the flesh). */
const HOT: Record<ArmorWearer, ArmorPalette> = {
	pacman: {
		lit: [66, 50, 44],
		mid: [26, 17, 16],
		shade: [8, 4, 5],
		edge: [255, 214, 126],
		visor: [255, 246, 214],
		rim: [255, 250, 230]
	},
	'ms-pacman': {
		lit: [70, 46, 82],
		mid: [28, 15, 36],
		shade: [9, 4, 12],
		edge: [255, 190, 226],
		visor: [255, 240, 250],
		rim: [255, 246, 250]
	}
};

const INK: RGB = [22, 8, 9];
const BFG: RGB = [125, 255, 90];

/** The helmet and the chin guard, body radii. Less than the ball: the body shows below. */
const HELMET = { x: -0.45, y: -0.5, r: 0.95 };
const CHIN = { x: 0.1, y: 1.05, r: 0.42 };

function palette(who: ArmorWearer, berserk: number): ArmorPalette {
	const a = CALM[who];
	const b = HOT[who];
	return {
		lit: mix(a.lit, b.lit, berserk),
		mid: mix(a.mid, b.mid, berserk),
		shade: mix(a.shade, b.shade, berserk),
		edge: mix(a.edge, b.edge, berserk),
		visor: mix(a.visor, b.visor, berserk),
		rim: mix(a.rim, b.rim, berserk)
	};
}

/** The armor's plates, shrunk by `inset` px (the inner edge light is one such path). */
function plates(ctx: CanvasRenderingContext2D, R: number, inset: number): void {
	ctx.beginPath();
	ctx.arc(HELMET.x * R, HELMET.y * R, HELMET.r * R - inset, 0, Math.PI * 2);
	ctx.moveTo(CHIN.x * R + CHIN.r * R - inset, CHIN.y * R);
	ctx.arc(CHIN.x * R, CHIN.y * R, CHIN.r * R - inset, 0, Math.PI * 2);
}

function disc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
	ctx.beginPath();
	ctx.arc(x, y, r, 0, Math.PI * 2);
	ctx.fill();
}

/** Armor for one wearer, as the painter a `Hero` takes in `setOver`. */
export function armorPainter(who: ArmorWearer): OverPainter {
	return (ctx, R, cut) => paintArmor(ctx, R, cut, who);
}

export function paintArmor(
	ctx: CanvasRenderingContext2D,
	R: number,
	cut: BodyCut,
	who: ArmorWearer
): void {
	const berserk = cut.power;
	const charge = cut.charge;
	const P = palette(who, berserk);
	const visor = mix(P.visor, BFG, charge);
	const ink = css(INK);
	const line = Math.max(1.5, R * 0.1);

	ctx.save();
	cut.outline(ctx);
	ctx.clip();
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';

	// the plates in three hard bands: a lit patch towards the light, a shadow crescent away from it
	plates(ctx, R, 0);
	ctx.fillStyle = css(P.mid);
	ctx.fill();
	ctx.save();
	plates(ctx, R, 0);
	ctx.clip();
	ctx.fillStyle = css(P.lit);
	disc(ctx, (HELMET.x + cut.lightX * 0.5) * R, (HELMET.y + cut.lightY * 0.5) * R, R * 0.5);
	ctx.fillStyle = css(P.shade);
	ctx.beginPath();
	ctx.rect(-2 * R, -2 * R, 4 * R, 4 * R);
	ctx.arc(cut.lightX * 0.3 * R, cut.lightY * 0.3 * R, R * 0.95, 0, Math.PI * 2);
	ctx.fill('evenodd');
	ctx.restore();
	plates(ctx, R, 0);
	ctx.lineWidth = line;
	ctx.strokeStyle = ink;
	ctx.stroke();
	plates(ctx, R, R * 0.09);
	ctx.lineWidth = Math.max(0.6, R * 0.04);
	ctx.strokeStyle = css(P.edge, 0.55);
	ctx.stroke();

	// three seam lights on the nape: the charge meter, and in the berserk the first embers
	for (let k = 0; k < 3; k++) {
		const a = Math.PI + (k - 1) * 0.5;
		const lit = charge > (k + 0.5) / 3.2;
		ctx.fillStyle = css(lit ? BFG : mix(P.shade, P.edge, berserk));
		disc(ctx, Math.cos(a) * 0.7 * R, Math.sin(a) * 0.7 * R, (lit ? 0.12 : 0.08) * R);
	}
	if (berserk > 0.05) {
		// cracks that burn through the black plates
		ctx.strokeStyle = css(P.edge, berserk);
		ctx.lineWidth = Math.max(0.8, R * 0.06);
		ctx.beginPath();
		ctx.moveTo(-0.9 * R, -0.5 * R);
		ctx.lineTo(-0.62 * R, -0.3 * R);
		ctx.lineTo(-0.74 * R, 0.02 * R);
		ctx.moveTo(-0.4 * R, -1.0 * R);
		ctx.lineTo(-0.5 * R, -0.7 * R);
		ctx.lineTo(-0.26 * R, -0.6 * R);
		ctx.stroke();
	}

	if (who === 'pacman') {
		// he has no eye: the visor slit is his look
		ctx.strokeStyle = ink;
		ctx.lineWidth = Math.max(2.2, R * 0.36);
		ctx.beginPath();
		ctx.arc(0, 0, 0.68 * R, -1.45, -0.92);
		ctx.stroke();
		ctx.strokeStyle = css(visor);
		ctx.lineWidth = Math.max(1.2, R * 0.19);
		ctx.beginPath();
		ctx.arc(0, 0, 0.68 * R, -1.45, -0.92);
		ctx.stroke();
	} else {
		// her eye is drawn after the armor: a goggle behind it
		ctx.fillStyle = css(visor, 0.32);
		ctx.strokeStyle = ink;
		ctx.lineWidth = Math.max(1, R * 0.07);
		ctx.beginPath();
		ctx.ellipse(0.28 * R, -0.45 * R, 0.3 * R, 0.34 * R, -0.2, 0, Math.PI * 2);
		ctx.fill();
		ctx.stroke();
	}

	// a cold rim light on the nape separates the armor from the warm flesh
	ctx.strokeStyle = css(P.rim, 0.6);
	ctx.lineWidth = Math.max(0.8, R * 0.09);
	ctx.lineCap = 'butt';
	ctx.beginPath();
	ctx.arc(0, 0, R * 0.9, 2.1, 4.0);
	ctx.stroke();
	ctx.fillStyle = 'rgba(255,255,255,0.85)';
	ctx.beginPath();
	ctx.ellipse(-0.3 * R, -0.75 * R, 0.2 * R, 0.08 * R, -0.5, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	// berserk: fangs along both lips, pointing into the mouth
	if (berserk > 0.3) {
		const gape = Math.atan2(cut.lower.y, cut.lower.x - cut.hinge.x);
		if (gape > 0.12) {
			ctx.fillStyle = css([255, 250, 236], berserk);
			for (const [end, side] of [
				[cut.upper, -1],
				[cut.lower, 1]
			] as const) {
				const len = Math.hypot(end.x - cut.hinge.x, end.y - cut.hinge.y);
				const ux = (end.x - cut.hinge.x) / len;
				const uy = (end.y - cut.hinge.y) / len;
				// the normal that points into the mouth
				const nx = side < 0 ? -uy : uy;
				const ny = side < 0 ? ux : -ux;
				const h = 0.22 * R * Math.min(1, gape * 2.5);
				for (const d of [0.52, 0.78]) {
					const bx = cut.hinge.x + ux * d * R;
					const by = cut.hinge.y + uy * d * R;
					ctx.beginPath();
					ctx.moveTo(bx - ux * 0.09 * R, by - uy * 0.09 * R);
					ctx.lineTo(bx + ux * 0.09 * R, by + uy * 0.09 * R);
					ctx.lineTo(bx + nx * h, by + ny * h);
					ctx.closePath();
					ctx.fill();
				}
			}
		}
	}

	// light: the visor's glow (his), the charge in the throat and a halo, all inside the tile
	ctx.globalCompositeOperation = 'lighter';
	if (who === 'pacman') {
		const gs = R * 0.5;
		ctx.globalAlpha = 0.5;
		ctx.drawImage(
			glow(visor),
			Math.cos(-1.18) * 0.68 * R - gs,
			Math.sin(-1.18) * 0.68 * R - gs,
			gs * 2,
			gs * 2
		);
	}
	if (charge > 0) {
		const hs = R * 1.28;
		ctx.globalAlpha = 0.45 * charge;
		ctx.drawImage(glow(BFG), -hs, -hs, hs * 2, hs * 2);
		const ts = R * (0.4 + 0.6 * charge);
		ctx.globalAlpha = 0.8 * charge;
		ctx.drawImage(glow(BFG), 0.3 * R - ts, -ts, ts * 2, ts * 2);
		if (charge > 0.9) {
			const cs = R * 0.4;
			ctx.globalAlpha = 0.9;
			ctx.drawImage(glow([255, 255, 255]), 0.3 * R - cs, -cs, cs * 2, cs * 2);
		}
	}
	ctx.globalAlpha = 1;
	ctx.globalCompositeOperation = 'source-over';
}
