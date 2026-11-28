// Kit C, «Сера»: brimstone. Black volcanic glass with lava in its cracks, sulphur crystals; the ghosts
// are charred, the arcade colour still in them, their tatters burnt to smoke, their horn tips smouldering.
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
	shadow,
	type Ctx,
	type Dir,
	type GhostShape,
	type Tones
} from './paint';

const GLASS: Tones = { light: '#6a5a78', mid: '#2a2032', shade: '#0e0812' };
const SULPHUR: Tones = { light: '#fffbb0', mid: '#e8d23a', shade: '#8a7410' };
const PEEL: Tones = { light: '#ffd66a', mid: '#ff8a1a', shade: '#a8400a' };
const SKINS: readonly Tones[] = [
	{ light: '#ff8a70', mid: '#c4321e', shade: '#3a0a06' },
	{ light: '#ffb0d0', mid: '#c44c88', shade: '#3a0c26' },
	{ light: '#98e6f4', mid: '#2690b2', shade: '#06283a' },
	{ light: '#ffc488', mid: '#d06c1e', shade: '#3a1806' }
];
const FRIGHT: Tones = { light: '#c8d2ff', mid: '#3d4fd8', shade: '#10164e' };
const TINT = ['255,90,40', '255,110,180', '80,210,255', '255,160,60'];
const LAVA = '#ff7a1a';

function ghostShape(S: number, i: number): GhostShape {
	// about the hero's size: in the split they are the enemies, not the boss's small imps
	const w = S * 0.36;
	return { w, domeY: -w * 0.16, hem: w * 1.05, feet: 4, torn: 1, seed: 7 + i * 2.9 };
}

/** A crack of lava: a dark seam with a hot core. */
function crack(c: Ctx, pts: ReadonlyArray<readonly [number, number]>, S: number, hot = LAVA): void {
	c.beginPath();
	pts.forEach(([px, py], k) => (k ? c.lineTo(px, py) : c.moveTo(px, py)));
	c.strokeStyle = '#1a0402';
	c.lineWidth = Math.max(1.6, S * 0.05);
	c.stroke();
	c.strokeStyle = hot;
	c.lineWidth = Math.max(0.8, S * 0.022);
	c.stroke();
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
	drawHorns(
		c,
		0,
		0,
		shape,
		0.6,
		{ length: 0.55, curl: 0.22, bone: fright ? ['#c8cce0', '#5c6480'] : ['#5a4a60', '#1a1220'], ember: fright ? null : '255,120,30' },
		0.6
	);
	ghostPath(c, 0, 0, shape, t * 1.3 + shape.seed);
	c.fillStyle = tones.mid;
	c.fill();
	c.save();
	ghostPath(c, 0, 0, shape, t * 1.3 + shape.seed);
	c.clip();
	celBands(c, shape, tones);
	// charred toward the tatters
	c.fillStyle = linear(c, 0, domeY + w * 0.6, 0, hem + w * 0.2, ['rgba(14,6,8,0)', 'rgba(14,6,8,.85)']);
	c.fillRect(-w * 1.5, domeY, w * 3, hem - domeY + w);
	if (!fright) {
		crack(
			c,
			[
				[w * 0.5, domeY + w * 0.45],
				[w * 0.35, domeY + w * 0.8],
				[w * 0.62, domeY + w * 1.05],
				[w * 0.45, hem]
			],
			S
		);
		crack(
			c,
			[
				[-w * 0.7, domeY + w * 0.9],
				[-w * 0.45, domeY + w * 1.15],
				[-w * 0.6, hem]
			],
			S
		);
	}
	c.restore();
	ghostPath(c, 0, 0, shape, t * 1.3 + shape.seed);
	c.lineWidth = Math.max(1.4, w * 0.15);
	c.strokeStyle = INK;
	c.stroke();
	const look = Math.atan2(VEC[dir][1], VEC[dir][0]);
	if (fright) {
		for (const side of [-1, 1]) {
			c.fillStyle = '#f4f0ff';
			c.beginPath();
			c.arc(side * w * 0.36, domeY + w * 0.3, w * 0.12, 0, TAU);
			c.fill();
		}
		c.strokeStyle = '#f4f0ff';
		c.lineWidth = Math.max(1, w * 0.09);
		c.beginPath();
		for (let k = 0; k <= 6; k += 1) c.lineTo(-w * 0.5 + (k * w) / 6, domeY + w * 0.78 + (k % 2 ? -1 : 1) * w * 0.07);
		c.stroke();
	} else {
		drawEyes(c, 0, domeY + w * 0.42, w, look, { sclera: '#fff2a0', glow: '255,200,80' }, 1, false, t);
	}
	c.restore();
}

/** A sulphur nugget: three facets, a dark line. */
function food(c: Ctx, x: number, y: number, S: number): void {
	const r = S * 0.11;
	shadow(c, x, y + r * 0.6, r * 1.1, S * 0.045);
	const pts: Array<[number, number]> = [
		[x - r * 0.95, y + r * 0.2],
		[x - r * 0.4, y - r * 0.95],
		[x + r * 0.6, y - r * 0.75],
		[x + r * 1.0, y + r * 0.25],
		[x + r * 0.2, y + r * 0.95],
		[x - r * 0.6, y + r * 0.8]
	];
	const facet = (ids: number[], fill: string): void => {
		c.beginPath();
		ids.forEach((id, k) => (k ? c.lineTo(pts[id][0], pts[id][1]) : c.moveTo(pts[id][0], pts[id][1])));
		c.closePath();
		c.fillStyle = fill;
		c.fill();
	};
	const centre: [number, number] = [x + r * 0.05, y + r * 0.05];
	pts.push(centre);
	facet([0, 1, 2, 6], SULPHUR.light);
	facet([2, 3, 6], SULPHUR.mid);
	facet([3, 4, 5, 6], SULPHUR.shade);
	facet([5, 0, 6], SULPHUR.mid);
	c.beginPath();
	pts.slice(0, 6).forEach(([px, py], k) => (k ? c.lineTo(px, py) : c.moveTo(px, py)));
	c.closePath();
	ink(c, S, 0.8);
	c.fillStyle = 'rgba(255,255,255,.8)';
	c.beginPath();
	c.arc(x - r * 0.35, y - r * 0.4, Math.max(0.8, r * 0.16), 0, TAU);
	c.fill();
}

/** The split's energizer: a lava orb in a cracked crust of glass. */
function energizer(c: Ctx, x: number, y: number, S: number, t: number): void {
	const r = S * 0.21;
	shadow(c, x, y + r * 0.95, r * 1.05, S * 0.06);
	bloom(c, x, y, S * (0.55 + 0.05 * Math.sin(t * 4)), '255,110,30', 0.4);
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.fillStyle = radial(c, x, y, 0, r, ['#fff4b0', '#ffb02a', '#d0400a']);
	c.fill();
	// the crust: plates of glass with lava between them
	const plates: ReadonlyArray<readonly [number, number, number]> = [
		[-0.55, -0.5, 0.42],
		[0.45, -0.55, 0.38],
		[-0.6, 0.45, 0.4],
		[0.5, 0.5, 0.42],
		[0.0, 0.05, 0.22]
	];
	c.save();
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	c.clip();
	for (const [px, py, pr] of plates) {
		cel(
			c,
			() => {
				c.beginPath();
				for (let k = 0; k < 6; k += 1) {
					const a = (k / 6) * TAU + px;
					c.lineTo(x + px * r + Math.cos(a) * pr * r, y + py * r + Math.sin(a) * pr * r * 0.9);
				}
				c.closePath();
			},
			GLASS,
			x + px * r,
			y + py * r,
			pr * r,
			S,
			0.4
		);
	}
	c.restore();
	c.beginPath();
	c.arc(x, y, r, 0, TAU);
	ink(c, S, 1);
	gloss(c, x - r * 0.5, y - r * 0.5, r * 0.15, r * 0.07, 0.8);
}

/** The snare: two rows of glass shards round a lava seam; shut, they meet and the seam goes thin. */
function snare(c: Ctx, x: number, y: number, S: number, open: number): void {
	const R = S * 0.42;
	shadow(c, x, y + S * 0.1, R * 1.02, S * 0.12);
	const gap = S * (0.02 + 0.16 * open);
	bloom(c, x, y, S * (0.2 + 0.25 * open), '255,110,30', 0.5);
	c.beginPath();
	c.ellipse(x, y, R * 0.78, gap + S * 0.02, 0, 0, TAU);
	c.fillStyle = radial(c, x, y, 0, R * 0.8, ['#fff0a0', LAVA, '#7a1a04']);
	c.fill();
	ink(c, S, 0.6);
	for (const side of [-1, 1]) {
		for (let k = 0; k < 5; k += 1) {
			const u = (k + (side > 0 ? 0.5 : 0)) / 5 - 0.45;
			const bx = x + u * R * 1.7;
			const by = y + side * (gap + S * 0.12);
			const tipY = y + side * (gap - S * 0.08 * (1 - open) - S * 0.01);
			const wide = S * 0.07;
			cel(
				c,
				() => {
					c.beginPath();
					c.moveTo(bx - wide, by);
					c.lineTo(bx + wide * 0.4, tipY);
					c.lineTo(bx + wide, by);
					c.lineTo(bx + wide * 0.2, by + side * S * 0.05);
					c.closePath();
				},
				GLASS,
				bx,
				(by + tipY) / 2,
				S * 0.1,
				S,
				0.6
			);
		}
	}
}

function icon(c: Ctx, item: 'snare' | 'plasma' | 'armour', x: number, y: number, S: number): void {
	if (item === 'snare') {
		snare(c, x, y, S * 0.8, 0.85);
		return;
	}
	if (item === 'plasma') {
		shadow(c, x, y + S * 0.24, S * 0.32, S * 0.07);
		// a glass barrel, a sulphur chamber, a burning mouth
		cel(
			c,
			() => {
				c.beginPath();
				c.moveTo(x - S * 0.4, y - S * 0.02);
				c.lineTo(x - S * 0.2, y - S * 0.12);
				c.lineTo(x + S * 0.22, y - S * 0.1);
				c.lineTo(x + S * 0.26, y + S * 0.06);
				c.lineTo(x - S * 0.18, y + S * 0.1);
				c.lineTo(x - S * 0.24, y + S * 0.24);
				c.lineTo(x - S * 0.34, y + S * 0.22);
				c.closePath();
			},
			GLASS,
			x - S * 0.05,
			y,
			S * 0.3,
			S
		);
		crack(
			c,
			[
				[x - S * 0.15, y - S * 0.08],
				[x - S * 0.1, y + S * 0.02],
				[x + S * 0.02, y + S * 0.06]
			],
			S
		);
		food(c, x + S * 0.02, y - S * 0.02, S * 1.3);
		bloom(c, x + S * 0.3, y - S * 0.02, S * 0.3, '220,255,60', 0.55);
		c.beginPath();
		c.ellipse(x + S * 0.28, y - S * 0.02, S * 0.05, S * 0.08, 0, 0, TAU);
		c.fillStyle = radial(c, x + S * 0.28, y - S * 0.02, 0, S * 0.08, ['#ffffe0', '#d8ff3a', '#4a8a10']);
		c.fill();
		ink(c, S, 0.7);
		return;
	}
	// the armour: a shell of glass scales, lava in the seams between them
	shadow(c, x, y + S * 0.3, S * 0.28, S * 0.07);
	const shell = (): void => {
		c.beginPath();
		c.moveTo(x, y - S * 0.32);
		c.lineTo(x + S * 0.3, y - S * 0.18);
		c.lineTo(x + S * 0.26, y + S * 0.12);
		c.lineTo(x, y + S * 0.32);
		c.lineTo(x - S * 0.26, y + S * 0.12);
		c.lineTo(x - S * 0.3, y - S * 0.18);
		c.closePath();
	};
	bloom(c, x, y, S * 0.4, '255,110,30', 0.25);
	shell();
	c.fillStyle = LAVA;
	c.fill();
	c.save();
	shell();
	c.clip();
	for (let row = 0; row < 4; row += 1) {
		for (let k = -2; k <= 2; k += 1) {
			const sx = x + k * S * 0.15 + (row % 2) * S * 0.075;
			const sy = y - S * 0.24 + row * S * 0.15;
			cel(
				c,
				() => {
					c.beginPath();
					c.moveTo(sx - S * 0.065, sy);
					c.lineTo(sx, sy - S * 0.06);
					c.lineTo(sx + S * 0.065, sy);
					c.lineTo(sx, sy + S * 0.1);
					c.closePath();
				},
				GLASS,
				sx,
				sy,
				S * 0.07,
				S,
				0.4
			);
		}
	}
	c.restore();
	shell();
	ink(c, S, 1);
	gloss(c, x - S * 0.12, y - S * 0.16, S * 0.05, S * 0.02, 0.7);
}

/** A sulphur fireball: a pale core, a yellow-green body, flame tongues behind. */
function bolt(c: Ctx, x: number, y: number, S: number, dir: Dir): void {
	bloom(c, x, y, S * 0.55, '210,255,60', 0.55);
	c.save();
	face(c, x, y, dir);
	for (const side of [-1, 0, 1]) {
		c.beginPath();
		c.moveTo(0, side * S * 0.06);
		c.quadraticCurveTo(-S * 0.18, side * S * 0.12, -S * (0.32 - Math.abs(side) * 0.08), side * S * 0.05);
		c.quadraticCurveTo(-S * 0.12, side * S * 0.02, 0, -side * S * 0.02);
		c.closePath();
		c.fillStyle = side ? '#9ad82a' : '#e8ff6a';
		c.fill();
		ink(c, S, 0.4);
	}
	c.beginPath();
	c.arc(0, 0, S * 0.1, 0, TAU);
	c.fillStyle = radial(c, -S * 0.02, -S * 0.02, 0, S * 0.1, ['#ffffff', '#f0ff9a', '#9ad82a']);
	c.fill();
	ink(c, S, 0.6);
	c.restore();
}

/** Glass scales over the hero's back (opposite his heading), lava in the seams. */
function armour(c: Ctx, x: number, y: number, S: number, dir: Dir): void {
	c.save();
	face(c, x, y, dir);
	for (let k = -2; k <= 2; k += 1) {
		const a = Math.PI + k * 0.42;
		const px = Math.cos(a) * S * 0.38;
		const py = Math.sin(a) * S * 0.38;
		c.save();
		c.translate(px, py);
		c.rotate(a);
		c.fillStyle = LAVA;
		c.beginPath();
		c.moveTo(-S * 0.06, -S * 0.09);
		c.lineTo(S * 0.1, 0);
		c.lineTo(-S * 0.06, S * 0.09);
		c.closePath();
		c.fill();
		cel(
			c,
			() => {
				c.beginPath();
				c.moveTo(-S * 0.05, -S * 0.08);
				c.lineTo(S * 0.08, 0);
				c.lineTo(-S * 0.05, S * 0.08);
				c.lineTo(-S * 0.02, 0);
				c.closePath();
			},
			GLASS,
			0,
			0,
			S * 0.08,
			S,
			0.6
		);
		c.restore();
	}
	c.restore();
}

/**
 * The rush: the orange cools into a spearhead of black glass from the back forward, lava in its
 * cracks, the eye still burning in it. `morph` 0 the fruit, 1 the spearhead.
 */
function form(c: Ctx, x: number, y: number, S: number, dir: Dir, morph: number, t: number): void {
	const m = Math.max(0, Math.min(1, morph));
	const r = S * 0.36;
	const tip = r * (1 + 0.7 * m);
	c.save();
	face(c, x, y, dir);
	bloom(c, 0, 0, S * 0.5, '255,110,30', 0.3 * m);
	const head = (): void => {
		c.beginPath();
		c.moveTo(tip, 0);
		c.quadraticCurveTo(r * 0.3, -r * (1 - 0.15 * m), -r * 0.9, -r * 0.75);
		c.lineTo(-r * (0.95 + 0.35 * m), 0);
		c.lineTo(-r * 0.9, r * 0.75);
		c.quadraticCurveTo(r * 0.3, r * (1 - 0.15 * m), tip, 0);
		c.closePath();
	};
	// the fruit still shows where the glass has not reached yet
	cel(
		c,
		() => {
			c.beginPath();
			c.arc(0, 0, r, 0, TAU);
		},
		PEEL,
		0,
		0,
		r,
		S
	);
	c.save();
	head();
	c.clip();
	c.beginPath();
	c.rect(-r * 2, -r * 2, r * 2 * (0.4 + 1.6 * m) + r * 0.5, r * 4);
	c.clip();
	head();
	c.fillStyle = GLASS.mid;
	c.fill();
	c.fillStyle = GLASS.light;
	c.beginPath();
	c.moveTo(tip, 0);
	c.quadraticCurveTo(r * 0.3, -r * 0.9, -r * 0.9, -r * 0.75);
	c.lineTo(-r * 0.2, -r * 0.05);
	c.closePath();
	c.fill();
	c.restore();
	head();
	ink(c, S, 1.1);
	crack(
		c,
		[
			[-r * 0.8, -r * 0.4],
			[-r * 0.3, -r * 0.15],
			[r * 0.2, -r * 0.25]
		],
		S
	);
	crack(
		c,
		[
			[-r * 0.7, r * 0.45],
			[-r * 0.1, r * 0.2],
			[r * 0.5, r * 0.05]
		],
		S
	);
	bloom(c, r * 0.25, -r * 0.1, S * 0.2, '255,200,80', 0.6);
	c.fillStyle = '#fff2a0';
	c.beginPath();
	c.ellipse(r * 0.25, -r * 0.12, r * 0.16, r * 0.1, 0, 0, TAU);
	c.fill();
	ink(c, S, 0.5);
	c.fillStyle = '#3a0c00';
	c.beginPath();
	c.arc(r * 0.33, -r * 0.12, r * 0.06, 0, TAU);
	c.fill();
	gloss(c, r * 0.6, -r * 0.3, r * 0.2, r * 0.05, 0.6, 0.25);
	c.restore();
	void t;
}

/** The hit: glass shards flying and a puff of sulphur. */
function impact(c: Ctx, x: number, y: number, S: number): void {
	bloom(c, x, y, S * 0.6, '230,255,80', 0.45);
	// a puff of sulphur: three cel clouds
	for (const [px, py, pr] of [
		[-0.1, 0.06, 0.2],
		[0.12, -0.08, 0.17],
		[0.16, 0.14, 0.13]
	] as const) {
		cel(
			c,
			() => {
				c.beginPath();
				c.arc(x + px * S, y + py * S, pr * S, 0, TAU);
			},
			SULPHUR,
			x + px * S,
			y + py * S,
			pr * S,
			S,
			0.7
		);
	}
	for (let k = 0; k < 7; k += 1) {
		const a = -1.3 + k * 0.43;
		const d = S * (0.32 + 0.14 * (k % 2));
		const px = x + Math.cos(a) * d;
		const py = y + Math.sin(a) * d;
		cel(
			c,
			() => {
				c.beginPath();
				c.moveTo(px + Math.cos(a) * S * 0.1, py + Math.sin(a) * S * 0.1);
				c.lineTo(px + Math.cos(a + 2) * S * 0.05, py + Math.sin(a + 2) * S * 0.05);
				c.lineTo(px + Math.cos(a - 2) * S * 0.05, py + Math.sin(a - 2) * S * 0.05);
				c.closePath();
			},
			GLASS,
			px,
			py,
			S * 0.06,
			S,
			0.5
		);
	}
}

export const BRIM_KIT: Kit = {
	id: 'brim',
	name: 'Сера',
	idea: 'Вулкан ада: чёрное стекло с лавой в трещинах и жёлтая сера. Призраки обуглены, цвет аркады в них остаётся, лохмотья сгорели в дым, кончики рогов тлеют; еда — кристаллы серы, энерджайзер — лавовый шар в корке, капкан — осколки вокруг лавового шва. В рывке апельсин застывает в обсидиановый наконечник.',
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
