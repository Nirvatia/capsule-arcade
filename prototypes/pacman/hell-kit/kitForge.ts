// Kit B, «Кузня»: the forge of hell. Steel and brass with rivets and hot seams; the ghosts keep the
// arcade colours in their bodies and wear forged helms with steel horns; the food is brass shells.
import type { Kit } from './kits';
import {
	INK,
	TAU,
	VEC,
	bloom,
	cel,
	celBands,
	drawEyes,
	drawHorns,
	face,
	ghostPath,
	gloss,
	ink,
	lightGlow,
	linear,
	radial,
	rim,
	rivet,
	shadow,
	type Ctx,
	type Dir,
	type GhostShape,
	type Tones
} from './paint';

const STEEL: Tones = { light: '#dfe6ea', mid: '#8a959e', shade: '#3a434b' };
const DARK_STEEL: Tones = { light: '#9aa6b0', mid: '#55606a', shade: '#262d34' };
const BRASS: Tones = { light: '#fff0a8', mid: '#e0a83a', shade: '#7a4c10' };
const PEEL: Tones = { light: '#ffd66a', mid: '#ff8a1a', shade: '#a8400a' };
const SKINS: readonly Tones[] = [
	{ light: '#ff9a84', mid: '#d43a2c', shade: '#701410' },
	{ light: '#ffbcd8', mid: '#d85a98', shade: '#701a4c' },
	{ light: '#a4ecf6', mid: '#2ea2c4', shade: '#0e4a64' },
	{ light: '#ffd09a', mid: '#e07a28', shade: '#703408' }
];
const FRIGHT: Tones = { light: '#c8d2ff', mid: '#3d4fd8', shade: '#151c6e' };
const TINT = ['255,90,60', '255,120,200', '90,220,255', '255,170,70'];
const HOT = '#ff8a2a';

function ghostShape(S: number, i: number): GhostShape {
	// about the hero's size: in the split they are the enemies, not the boss's small imps
	const w = S * 0.36;
	return { w, domeY: -w * 0.15, hem: w * 1.02, feet: 3, torn: 0.15, seed: 5 + i * 2.3 };
}

/** The helm over the dome: a forged cap with a brim, rivets, a nose guard and a hot seam. */
function helm(c: Ctx, shape: GhostShape, S: number, fright: boolean): void {
	const { w, domeY } = shape;
	const tones = fright ? { light: '#b0b8d0', mid: '#5c6480', shade: '#262c44' } : STEEL;
	const brim = domeY + w * 0.12;
	const cap = (): void => {
		c.beginPath();
		c.moveTo(-w * 1.08, brim);
		c.arc(0, domeY, w * 1.08, Math.PI + 0.12, -0.12);
		c.lineTo(w * 1.08, brim);
		c.quadraticCurveTo(0, brim + w * 0.12, -w * 1.08, brim);
		c.closePath();
	};
	cel(c, cap, tones, 0, domeY - w * 0.3, w, S, 1.1);
	// the hot seam along the brim
	if (!fright) {
		c.strokeStyle = HOT;
		c.lineWidth = Math.max(1, w * 0.06);
		c.beginPath();
		c.moveTo(-w * 0.95, brim - w * 0.08);
		c.quadraticCurveTo(0, brim + w * 0.03, w * 0.95, brim - w * 0.08);
		c.stroke();
	}
	// a ridge over the crown and the nose guard
	cel(
		c,
		() => {
			c.beginPath();
			c.roundRect(-w * 0.1, domeY - w * 1.1, w * 0.2, w * 1.38, w * 0.08);
		},
		fright ? { light: '#c8cce0', mid: '#7a80a0', shade: '#363c58' } : BRASS,
		0,
		domeY - w * 0.5,
		w * 0.3,
		S,
		0.8
	);
	for (const sx of [-0.7, 0.7]) rivet(c, sx * w, brim - w * 0.2, w * 0.08, S);
}

function ghost(c: Ctx, i: number, x: number, y: number, S: number, dir: Dir, fright: boolean, t: number): void {
	const shape = ghostShape(S, i);
	const { w, domeY, hem } = shape;
	const tones = fright ? FRIGHT : SKINS[i];
	c.save();
	c.lineJoin = 'round';
	c.lineCap = 'round';
	lightGlow(c, x, y, w * 1.9, fright ? '90,110,255' : TINT[i], 0.16);
	c.translate(x, y);
	c.fillStyle = 'rgba(8,1,3,.4)';
	c.beginPath();
	c.ellipse(w * 0.15, hem + w * 0.12, w * 0.95, w * 0.22, 0, 0, TAU);
	c.fill();
	drawHorns(c, 0, 0, shape, 0.75, { length: 0.42, curl: 0.05, bone: fright ? ['#c8cce0', '#5c6480'] : ['#e8eef2', '#55606a'], ember: null }, 0);
	ghostPath(c, 0, 0, shape, t * 1.3 + shape.seed);
	c.fillStyle = tones.mid;
	c.fill();
	c.save();
	ghostPath(c, 0, 0, shape, t * 1.3 + shape.seed);
	c.clip();
	celBands(c, shape, tones);
	// a chain mail hem
	c.strokeStyle = 'rgba(20,10,12,.35)';
	c.lineWidth = Math.max(0.8, w * 0.04);
	for (let k = 0; k < 7; k += 1) {
		c.beginPath();
		c.arc(-w + (k + 0.5) * ((2 * w) / 7), hem - w * 0.28, w * 0.12, 0, Math.PI);
		c.stroke();
	}
	c.restore();
	ghostPath(c, 0, 0, shape, t * 1.3 + shape.seed);
	c.lineWidth = Math.max(1.4, w * 0.15);
	c.strokeStyle = INK;
	c.stroke();
	helm(c, shape, S, fright);
	const look = Math.atan2(VEC[dir][1], VEC[dir][0]);
	if (fright) {
		for (const side of [-1, 1]) {
			c.fillStyle = '#f4f0ff';
			c.beginPath();
			c.arc(side * w * 0.36, domeY + w * 0.45, w * 0.12, 0, TAU);
			c.fill();
		}
		c.strokeStyle = '#f4f0ff';
		c.lineWidth = Math.max(1, w * 0.09);
		c.beginPath();
		for (let k = 0; k <= 6; k += 1) c.lineTo(-w * 0.5 + (k * w) / 6, domeY + w * 0.85 + (k % 2 ? -1 : 1) * w * 0.07);
		c.stroke();
	} else {
		drawEyes(c, 0, domeY + w * 0.62, w * 0.92, look, { sclera: '#ffd07a', glow: null }, 1, false, t);
	}
	c.restore();
}

/** A spent brass shell standing on its rim, its primer up. */
function food(c: Ctx, x: number, y: number, S: number): void {
	const w = S * 0.07;
	const h = S * 0.16;
	shadow(c, x, y + h * 0.9, w * 1.6, S * 0.045);
	cel(
		c,
		() => {
			c.beginPath();
			c.moveTo(x - w, y - h * 0.6);
			c.lineTo(x + w, y - h * 0.6);
			c.lineTo(x + w, y + h * 0.75);
			c.lineTo(x + w * 1.15, y + h * 0.8);
			c.lineTo(x + w * 1.15, y + h);
			c.lineTo(x - w * 1.15, y + h);
			c.lineTo(x - w * 1.15, y + h * 0.8);
			c.lineTo(x - w, y + h * 0.75);
			c.closePath();
		},
		BRASS,
		x,
		y + h * 0.1,
		w * 1.4,
		S,
		0.8
	);
	c.beginPath();
	c.ellipse(x, y - h * 0.6, w, w * 0.4, 0, 0, TAU);
	c.fillStyle = '#3a2408';
	c.fill();
	ink(c, S, 0.6);
	c.fillStyle = 'rgba(255,255,255,.75)';
	c.fillRect(x - w * 0.6, y - h * 0.4, Math.max(1, S * 0.014), h * 1.05);
}

/** The split's energizer: a soul sphere caged in forged bands. */
function energizer(c: Ctx, x: number, y: number, S: number, t: number): void {
	const r = S * (0.2 + 0.012 * Math.sin(t * 5));
	shadow(c, x, y + r * 0.95, r * 1.05, S * 0.06);
	bloom(c, x, y, S * 0.6, '60,150,255', 0.35);
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fillStyle = radial(c, x - r * 0.3, y - r * 0.35, r * 0.05, r * 1.05, ['#eafcff', '#58b4ff', '#1240a8', '#06144a']);
	c.fill();
	c.fillStyle = 'rgba(6,20,70,.5)';
	for (const sx of [-1, 1]) {
		c.beginPath();
		c.ellipse(x + sx * r * 0.32, y + r * 0.05, r * 0.12, r * 0.16, 0, 0, TAU);
		c.fill();
	}
	c.beginPath();
	c.ellipse(x, y + r * 0.45, r * 0.18, r * 0.07, 0, 0, TAU);
	c.fill();
	// the cage: a band round the equator, two over the poles
	for (const [rx, ry] of [
		[r * 1.02, r * 0.3],
		[r * 0.35, r * 1.02]
	] as const) {
		c.beginPath();
		c.ellipse(x, y, rx, ry, 0, 0, TAU);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(2.4, S * 0.08);
		c.stroke();
		c.strokeStyle = linear(c, x - r, y - r, x + r, y + r, ['#dfe6ea', '#55606a']);
		c.lineWidth = Math.max(1.2, S * 0.04);
		c.stroke();
	}
	rivet(c, x, y - r * 1.0, S * 0.03, S);
	rivet(c, x - r, y, S * 0.03, S);
	rivet(c, x + r, y, S * 0.03, S);
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	ink(c, S, 0.9);
	gloss(c, x - r * 0.42, y - r * 0.45, r * 0.18, r * 0.09, 0.85);
}

/** The forged jaw trap: a brass pan, two toothed bows on springs; shut, the teeth interlock. */
function snare(c: Ctx, x: number, y: number, S: number, open: number): void {
	const R = S * 0.42;
	shadow(c, x, y + S * 0.12, R * 1.02, S * 0.12);
	// the springs on both sides
	for (const sx of [-1, 1]) {
		cel(
			c,
			() => {
				c.beginPath();
				c.ellipse(x + sx * R * 1.0, y, S * 0.09, S * 0.06, 0, 0, TAU);
			},
			DARK_STEEL,
			x + sx * R,
			y,
			S * 0.07,
			S,
			0.7
		);
	}
	const jawRy = R * (0.12 + 0.78 * open);
	for (const side of [-1, 1]) {
		const bow = (): void => {
			c.beginPath();
			c.ellipse(x, y, R, jawRy, 0, side < 0 ? Math.PI : 0, side < 0 ? TAU : Math.PI);
			c.ellipse(x, y, R * 0.82, jawRy * 0.72, 0, side < 0 ? TAU : Math.PI, side < 0 ? Math.PI : 0, true);
			c.closePath();
		};
		cel(c, bow, STEEL, x, y + side * jawRy * 0.6, R * 0.6, S, 0.9);
		// teeth along the inner edge, toward the middle
		for (let k = 0; k < 7; k += 1) {
			const u = (k + (side > 0 ? 0.5 : 0)) / 7;
			const a = side < 0 ? Math.PI + u * Math.PI : u * Math.PI;
			const bx = x + Math.cos(a) * R * 0.82;
			const by = y + Math.sin(a) * jawRy * 0.72;
			const toward = Math.atan2(y - by, x - bx);
			const len = S * 0.09 * (0.6 + 0.4 * Math.sin(u * Math.PI));
			c.beginPath();
			c.moveTo(bx + Math.cos(toward + Math.PI / 2) * S * 0.025, by + Math.sin(toward + Math.PI / 2) * S * 0.025);
			c.lineTo(bx + Math.cos(toward) * len, by + Math.sin(toward) * len);
			c.lineTo(bx + Math.cos(toward - Math.PI / 2) * S * 0.025, by + Math.sin(toward - Math.PI / 2) * S * 0.025);
			c.closePath();
			c.fillStyle = '#f4f8fa';
			c.fill();
			ink(c, S, 0.45);
		}
	}
	if (open > 0.3) {
		cel(
			c,
			() => {
				c.beginPath();
				c.ellipse(x, y, R * 0.36, jawRy * 0.3, 0, 0, TAU);
			},
			BRASS,
			x,
			y,
			R * 0.3,
			S,
			0.7
		);
		bloom(c, x, y, S * 0.2, '255,150,60', 0.25 * open);
	}
	for (const sx of [-1, 1]) rivet(c, x + sx * R, y, S * 0.035, S);
}

function icon(c: Ctx, item: 'snare' | 'plasma' | 'armour', x: number, y: number, S: number): void {
	if (item === 'snare') {
		snare(c, x, y, S * 0.8, 0.85);
		return;
	}
	if (item === 'plasma') {
		shadow(c, x, y + S * 0.24, S * 0.32, S * 0.07);
		cel(
			c,
			() => {
				c.beginPath();
				c.moveTo(x - S * 0.24, y + S * 0.05);
				c.lineTo(x - S * 0.12, y + S * 0.05);
				c.lineTo(x - S * 0.09, y + S * 0.25);
				c.lineTo(x - S * 0.2, y + S * 0.25);
				c.closePath();
			},
			DARK_STEEL,
			x - S * 0.16,
			y + S * 0.15,
			S * 0.08,
			S,
			0.8
		);
		cel(
			c,
			() => {
				c.beginPath();
				c.roundRect(x - S * 0.4, y - S * 0.11, S * 0.58, S * 0.19, S * 0.05);
			},
			STEEL,
			x - S * 0.1,
			y - S * 0.02,
			S * 0.3,
			S
		);
		c.fillStyle = '#5ae0ff';
		for (let k = 0; k < 3; k += 1) {
			c.beginPath();
			c.roundRect(x - S * 0.33 + k * S * 0.1, y - S * 0.05, S * 0.055, S * 0.09, S * 0.015);
			c.fill();
			ink(c, S, 0.4);
		}
		cel(
			c,
			() => {
				c.beginPath();
				c.roundRect(x + S * 0.16, y - S * 0.14, S * 0.1, S * 0.25, S * 0.03);
			},
			BRASS,
			x + S * 0.21,
			y - S * 0.02,
			S * 0.1,
			S,
			0.8
		);
		bloom(c, x + S * 0.32, y - S * 0.02, S * 0.3, '80,210,255', 0.5);
		c.beginPath();
		c.ellipse(x + S * 0.3, y - S * 0.02, S * 0.06, S * 0.12, 0, 0, TAU);
		c.fillStyle = radial(c, x + S * 0.3, y - S * 0.02, 0, S * 0.12, ['#f0fdff', '#5ae0ff', '#0a6a9a']);
		c.fill();
		ink(c, S, 0.8);
		gloss(c, x - S * 0.26, y - S * 0.07, S * 0.08, S * 0.02, 0.6, 0);
		return;
	}
	// the armour: a forged breastplate, a brass rim, a ridge and rivets
	shadow(c, x, y + S * 0.3, S * 0.28, S * 0.07);
	const plate = (): void => {
		c.beginPath();
		c.moveTo(x - S * 0.3, y - S * 0.24);
		c.lineTo(x - S * 0.12, y - S * 0.3);
		c.quadraticCurveTo(x, y - S * 0.18, x + S * 0.12, y - S * 0.3);
		c.lineTo(x + S * 0.3, y - S * 0.24);
		c.quadraticCurveTo(x + S * 0.32, y + S * 0.12, x, y + S * 0.32);
		c.quadraticCurveTo(x - S * 0.32, y + S * 0.12, x - S * 0.3, y - S * 0.24);
		c.closePath();
	};
	c.save();
	plate();
	c.lineWidth = Math.max(3, S * 0.11);
	c.strokeStyle = BRASS.mid;
	c.stroke();
	c.restore();
	cel(c, plate, STEEL, x, y, S * 0.3, S);
	c.strokeStyle = 'rgba(30,36,42,.5)';
	c.lineWidth = Math.max(1, S * 0.03);
	c.beginPath();
	c.moveTo(x, y - S * 0.17);
	c.lineTo(x, y + S * 0.28);
	c.stroke();
	for (const [rx, ry] of [
		[-0.2, -0.16],
		[0.2, -0.16],
		[-0.18, 0.08],
		[0.18, 0.08]
	]) {
		rivet(c, x + rx * S, y + ry * S, S * 0.03, S);
	}
	gloss(c, x - S * 0.14, y - S * 0.1, S * 0.05, S * 0.08, 0.6, 0);
}

/** A plasma bolt: a cyan ball with a white core and a smaller one behind. */
function bolt(c: Ctx, x: number, y: number, S: number, dir: Dir): void {
	const [dx, dy] = VEC[dir];
	bloom(c, x, y, S * 0.55, '70,200,255', 0.6);
	for (const [k, r] of [
		[1, 0.07],
		[0, 0.12]
	] as const) {
		const bx = x - dx * S * 0.2 * k;
		const by = y - dy * S * 0.2 * k;
		c.beginPath();
		c.arc(bx, by, S * r, 0, TAU);
		c.fillStyle = radial(c, bx - S * r * 0.3, by - S * r * 0.3, 0, S * r, ['#ffffff', '#8ae8ff', '#1a8ad0']);
		c.fill();
		ink(c, S, 0.55);
	}
}

/** Forged pauldrons over the hero's back (opposite his heading): riveted, brass-edged. */
function armour(c: Ctx, x: number, y: number, S: number, dir: Dir): void {
	c.save();
	face(c, x, y, dir);
	for (const side of [-1, 1]) {
		const plate = (): void => {
			c.beginPath();
			c.arc(0, 0, S * 0.42, Math.PI + side * 0.15, Math.PI + side * 1.05, side < 0);
			c.arc(0, 0, S * 0.3, Math.PI + side * 1.05, Math.PI + side * 0.15, side > 0);
			c.closePath();
		};
		c.save();
		plate();
		c.lineWidth = Math.max(2.5, S * 0.09);
		c.strokeStyle = BRASS.mid;
		c.stroke();
		c.restore();
		cel(c, plate, STEEL, -S * 0.3, side * S * 0.2, S * 0.15, S, 0.9);
		const a = Math.PI + side * 0.6;
		rivet(c, Math.cos(a) * S * 0.36, Math.sin(a) * S * 0.36, S * 0.028, S);
	}
	c.restore();
}

/**
 * The rush: an iron shell slams shut round the orange, spikes grow from it, a hot seam runs round
 * the visor slit through which its eye glares. `morph` 0 the fruit, 1 the spiked ball.
 */
function form(c: Ctx, x: number, y: number, S: number, dir: Dir, morph: number, t: number): void {
	const m = Math.max(0, Math.min(1, morph));
	const r = S * 0.37;
	c.save();
	face(c, x, y, dir);
	// the spikes
	for (let k = 0; k < 8; k += 1) {
		const a = (k / 8) * TAU + t * 0.0 + 0.2;
		const len = S * 0.2 * m;
		if (len < 1) continue;
		const bx = Math.cos(a) * r * 0.9;
		const by = Math.sin(a) * r * 0.9;
		c.beginPath();
		c.moveTo(bx + Math.cos(a + 1.6) * S * 0.06, by + Math.sin(a + 1.6) * S * 0.06);
		c.lineTo(bx + Math.cos(a) * len, by + Math.sin(a) * len);
		c.lineTo(bx + Math.cos(a - 1.6) * S * 0.06, by + Math.sin(a - 1.6) * S * 0.06);
		c.closePath();
		c.fillStyle = linear(c, bx, by - S * 0.05, bx + Math.cos(a) * len, by + Math.sin(a) * len, ['#e8eef2', '#55606a']);
		c.fill();
		ink(c, S, 0.7);
	}
	// the fruit inside, then the shell closing over it from back to front
	cel(
		c,
		() => {
			c.beginPath();
			c.arc(0, 0, r * 0.98, 0, TAU);
		},
		PEEL,
		0,
		0,
		r,
		S
	);
	const cover = Math.PI * (0.35 + 0.62 * m);
	for (const side of [-1, 1]) {
		const half = (): void => {
			c.beginPath();
			c.arc(0, 0, r, Math.PI, Math.PI + side * cover, side < 0);
			c.lineTo(0, 0);
			c.closePath();
		};
		cel(c, half, STEEL, -r * 0.3, side * r * 0.3, r * 0.7, S, 1.1);
	}
	// the hot seam and the visor slit with the eye
	c.strokeStyle = HOT;
	c.lineWidth = Math.max(1.2, S * 0.04);
	c.beginPath();
	c.arc(0, 0, r * 0.72, Math.PI * 0.55, Math.PI * 1.45);
	c.stroke();
	bloom(c, r * 0.35, -r * 0.18, S * 0.25, '255,140,40', 0.45 * m);
	c.beginPath();
	c.roundRect(r * 0.05, -r * 0.32, r * 0.62, r * 0.24, r * 0.1);
	c.fillStyle = '#2a0c04';
	c.fill();
	ink(c, S, 0.7);
	c.fillStyle = '#ffd27a';
	c.beginPath();
	c.ellipse(r * 0.42, -r * 0.2, r * 0.13, r * 0.07, 0, 0, TAU);
	c.fill();
	for (const a of [Math.PI * 0.8, Math.PI * 1.2, Math.PI]) rivet(c, Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86, S * 0.03, S);
	gloss(c, -r * 0.45, -r * 0.45, r * 0.2, r * 0.08, 0.6);
	c.restore();
}

/** The hit: sparks and a struck ring. */
function impact(c: Ctx, x: number, y: number, S: number): void {
	bloom(c, x, y, S * 0.6, '255,170,60', 0.6);
	for (let k = 0; k < 9; k += 1) {
		const a = -1.4 + k * 0.35;
		const d0 = S * 0.15;
		const d1 = S * (0.45 + 0.15 * (k % 3));
		c.beginPath();
		c.moveTo(x + Math.cos(a) * d0, y + Math.sin(a) * d0);
		c.lineTo(x + Math.cos(a) * d1, y + Math.sin(a) * d1);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(2.4, S * 0.07);
		c.stroke();
		c.strokeStyle = k % 2 ? '#ffe08a' : '#ff9a2a';
		c.lineWidth = Math.max(1.2, S * 0.035);
		c.stroke();
	}
	c.beginPath();
	c.arc(x, y, S * 0.3, -1.3, 1.3);
	c.strokeStyle = INK;
	c.lineWidth = Math.max(3, S * 0.09);
	c.stroke();
	c.strokeStyle = '#fff4d0';
	c.lineWidth = Math.max(1.4, S * 0.045);
	c.stroke();
}

export const FORGE_KIT: Kit = {
	id: 'forge',
	name: 'Кузня',
	idea: 'Кузница ада: сталь и латунь, заклёпки и раскалённые швы. Призраки остаются в цветах аркады и носят кованые шлемы со стальными рогами, еда — латунные гильзы, энерджайзер — сфера души в клетке, капкан — кованый. В рывке апельсин захлопывается в шипастую железную скорлупу.',
	food,
	energizer,
	ghost,
	snare,
	icon,
	bolt,
	armour,
	form,
	impact
};
