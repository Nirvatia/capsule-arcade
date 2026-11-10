// The BFG charge's light for the heroes in the hell, painted over the body. Frame space: the hero
// faces +x, the top is -y.
import type { OverPainter } from './Hero';
import { glow } from './Hero';
import type { RGB } from './heroSeasons';

const BFG: RGB = [125, 255, 90];

/**
 * A green ring round the body that closes in as it charges, a halo, and a bright glow in the
 * throat; white-hot at the end. Inside the tile.
 */
export const chargePainter: OverPainter = (ctx, R, cut) => {
	const charge = cut.charge;
	if (charge <= 0) {
		return;
	}
	ctx.save();
	ctx.globalCompositeOperation = 'lighter';
	const hs = R * 1.28;
	ctx.globalAlpha = 0.6 * charge;
	ctx.drawImage(glow(BFG), -hs, -hs, hs * 2, hs * 2);
	ctx.globalAlpha = 0.5 + 0.5 * charge;
	ctx.strokeStyle = `rgba(125,255,90,${0.5 + 0.4 * charge})`;
	ctx.lineWidth = R * (0.06 + 0.1 * charge);
	ctx.beginPath();
	ctx.arc(0, 0, R * (1.12 - 0.07 * charge), 0, Math.PI * 2);
	ctx.stroke();
	const ts = R * (0.7 + 0.9 * charge);
	ctx.globalAlpha = Math.min(1, 0.4 + 0.8 * charge);
	ctx.drawImage(glow(BFG), 0.45 * R - ts, -ts, ts * 2, ts * 2);
	if (charge > 0.85) {
		const cs = R * 0.55;
		ctx.globalAlpha = 0.95;
		ctx.drawImage(glow([255, 255, 255]), 0.45 * R - cs, -cs, cs * 2, cs * 2);
	}
	ctx.restore();
};
