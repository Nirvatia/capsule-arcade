// Three whole kits for the hell redesign's missing art (DESIGN §7 "The fight, redesigned"): the food,
// the split's energizer, its four equal ghosts (and frightened), the snare (lying open, shut, as a
// pickup), the plasma (pickup and bolts), the armour (pickup and on the hero), the berserk's rush.
// Each kit is one idea in one palette, so its pieces belong together. Light from the top left,
// shadows to the bottom right, a dark ink line round everything, no glow on the food.
// (x, y) is a tile's centre in px, S the tile in px.

export type Dir = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Item = 'snare' | 'plasma' | 'armour';

export interface Kit {
	readonly id: string;
	readonly name: string;
	readonly idea: string;
	food(c: CanvasRenderingContext2D, x: number, y: number, S: number): void;
	energizer(c: CanvasRenderingContext2D, x: number, y: number, S: number): void;
	/** index 0 Blinky, 1 Pinky, 2 Inky, 3 Clyde: the same body, only the colour differs. */
	ghost(c: CanvasRenderingContext2D, i: number, x: number, y: number, S: number, dir: Dir, fright: boolean): void;
	/** open 1 is set, 0 is shut. */
	snare(c: CanvasRenderingContext2D, x: number, y: number, S: number, open: number): void;
	icon(c: CanvasRenderingContext2D, item: Item, x: number, y: number, S: number): void;
	bolt(c: CanvasRenderingContext2D, x: number, y: number, S: number, dir: Dir): void;
	/** Drawn over the hero while he has armour. */
	armour(c: CanvasRenderingContext2D, x: number, y: number, S: number): void;
	/** The rush along a row from x0 to x1 (the hero at x1), and its hit at (hx, y). */
	rush(c: CanvasRenderingContext2D, x0: number, x1: number, y: number, S: number): void;
	impact(c: CanvasRenderingContext2D, x: number, y: number, S: number): void;
}

const INK = '#140608';
const VEC: Record<Dir, [number, number]> = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };

function ink(c: CanvasRenderingContext2D, S: number, k = 1): void {
	c.lineWidth = Math.max(1.5, S * 0.045 * k);
	c.strokeStyle = INK;
	c.lineJoin = 'round';
	c.lineCap = 'round';
	c.stroke();
}

/** A small dark shadow under a thing lying on the floor, down and right. */
function shadow(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, a = 0.42): void {
	c.fillStyle = `rgba(8,1,3,${a})`;
	c.beginPath();
	c.ellipse(x + rx * 0.18, y + ry * 0.9, rx, ry, 0, 0, 7);
	c.fill();
}

/** A fill lit from the top left: `hi` there, `lo` at the bottom right. */
function lit(c: CanvasRenderingContext2D, x: number, y: number, r: number, hi: string, lo: string): CanvasGradient {
	const g = c.createLinearGradient(x - r, y - r, x + r, y + r);
	g.addColorStop(0, hi);
	g.addColorStop(1, lo);
	return g;
}

function gloss(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a = 0.6): void {
	c.fillStyle = `rgba(255,255,255,${a})`;
	c.beginPath();
	c.ellipse(x, y, w, h, -0.5, 0, 7);
	c.fill();
}

/** The classic ghost body: a dome and a hem of `feet` scallops. Width 2w, top -h, hem +h. */
function ghostBody(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, feet: number, wave = 0): void {
	c.beginPath();
	c.moveTo(x - w, y + h);
	c.lineTo(x - w, y - h * 0.15);
	c.arc(x, y - h * 0.15, w, Math.PI, 0);
	c.lineTo(x + w, y + h);
	const step = (2 * w) / feet;
	for (let k = 0; k < feet; k += 1) {
		const ax = x + w - step * k;
		const dip = h * (0.22 + 0.05 * Math.sin(wave + k * 2));
		c.quadraticCurveTo(ax - step / 2, y + h - dip * 1.6, ax - step, y + h);
	}
	c.closePath();
}

/** Two eyes looking along `dir`. */
function eyes(c: CanvasRenderingContext2D, x: number, y: number, S: number, dir: Dir, sclera: string, pupil: string, r = 0.1): void {
	const [dx, dy] = VEC[dir];
	for (const side of [-1, 1]) {
		const ex = x + side * S * 0.12;
		c.fillStyle = sclera;
		c.beginPath();
		c.ellipse(ex + dx * S * 0.03, y + dy * S * 0.03, S * r, S * r * 1.2, 0, 0, 7);
		c.fill();
		c.fillStyle = pupil;
		c.beginPath();
		c.arc(ex + dx * S * 0.06, y + dy * S * 0.07, S * r * 0.5, 0, 7);
		c.fill();
	}
}

// ---------------------------------------------------------------- A: bone

const BONE = '#efe1c2';
const BONE_LO = '#a8916a';
const FLESH: readonly string[] = ['#c9302a', '#d0508a', '#3d9ab0', '#d07a2c'];
const FLESH_LO: readonly string[] = ['#6a1210', '#6e1c46', '#174a5c', '#6a3510'];

/** A: bone and flesh. The hell's own matter: teeth, ribs, a heart, flayed ghosts with skull faces. */
export const BONE_KIT: Kit = {
	id: 'bone',
	name: 'Кость',
	idea: 'Материя самого ада: зубы, рёбра, сердце. Призраки — содранные шкуры с костяной маской, плазма — пузырь синей жёлчи. Цвета: слоновая кость и кровь.',
	food(c, x, y, S) {
		shadow(c, x, y + S * 0.02, S * 0.15, S * 0.07);
		const w = S * 0.085;
		const h = S * 0.2;
		c.beginPath();
		c.moveTo(x - w, y - h * 0.5);
		c.quadraticCurveTo(x - w * 0.95, y + h * 0.1, x, y + h * 0.58);
		c.quadraticCurveTo(x + w * 0.95, y + h * 0.1, x + w, y - h * 0.5);
		c.quadraticCurveTo(x, y - h * 0.68, x - w, y - h * 0.5);
		c.closePath();
		c.fillStyle = lit(c, x, y, w * 1.4, BONE, BONE_LO);
		c.fill();
		ink(c, S, 0.95);
		c.fillStyle = 'rgba(255,255,255,.7)';
		c.fillRect(x - w * 0.55, y - h * 0.38, S * 0.016, h * 0.42);
	},
	energizer(c, x, y, S) {
		shadow(c, x, y + S * 0.06, S * 0.26, S * 0.1);
		const r = S * 0.25;
		c.beginPath();
		c.moveTo(x, y + r * 1.05);
		c.bezierCurveTo(x - r * 1.6, y - r * 0.1, x - r * 0.8, y - r * 1.25, x, y - r * 0.45);
		c.bezierCurveTo(x + r * 0.8, y - r * 1.25, x + r * 1.6, y - r * 0.1, x, y + r * 1.05);
		c.fillStyle = lit(c, x, y, r, '#e0423a', '#5a0c0e');
		c.fill();
		ink(c, S);
		c.strokeStyle = 'rgba(255,200,190,.55)';
		c.lineWidth = Math.max(1, S * 0.025);
		c.beginPath();
		c.moveTo(x - r * 0.15, y - r * 0.35);
		c.quadraticCurveTo(x + r * 0.2, y + r * 0.1, x - r * 0.05, y + r * 0.5);
		c.stroke();
		gloss(c, x - r * 0.45, y - r * 0.4, r * 0.18, r * 0.1, 0.7);
	},
	ghost(c, i, x, y, S, dir, fright) {
		const w = S * 0.36;
		const h = S * 0.36;
		shadow(c, x, y + h * 0.75, w * 0.9, S * 0.08, 0.35);
		ghostBody(c, x, y, w, h, 4, i);
		c.fillStyle = fright ? lit(c, x, y, w, '#5a6ad8', '#1c2470') : lit(c, x, y, w, FLESH[i], FLESH_LO[i]);
		c.fill();
		ink(c, S);
		// the skull mask over the face, the same on all four
		c.beginPath();
		c.ellipse(x, y - h * 0.18, w * 0.62, h * 0.45, 0, 0, 7);
		c.fillStyle = fright ? '#c9cfe8' : lit(c, x, y - h * 0.2, w * 0.6, BONE, BONE_LO);
		c.fill();
		ink(c, S, 0.8);
		if (fright) {
			c.strokeStyle = INK;
			c.lineWidth = Math.max(1.4, S * 0.035);
			c.beginPath();
			for (let k = 0; k < 5; k += 1) c.lineTo(x - w * 0.4 + k * w * 0.2, y - h * 0.02 + (k % 2 ? -1 : 1) * S * 0.025);
			c.stroke();
			eyes(c, x, y - h * 0.3, S, dir, INK, INK, 0.05);
		} else {
			eyes(c, x, y - h * 0.25, S, dir, INK, '#ffd24a', 0.085);
		}
	},
	snare(c, x, y, S, open) {
		shadow(c, x, y + S * 0.08, S * 0.36, S * 0.1);
		// two rows of ribs that bite together, a vertebra in the middle
		for (const side of [-1, 1]) {
			for (let k = -2; k <= 2; k += 1) {
				// the rows sit half a rib apart, so shut they interlock across the spine
				const bx = x + k * S * 0.14 + (side > 0 ? S * 0.07 : 0);
				const tip = y + side * S * (0.28 * open - 0.13 * (1 - open));
				c.beginPath();
				c.moveTo(bx - S * 0.035, y);
				c.quadraticCurveTo(bx + side * k * S * 0.02, (y + tip) / 2, bx, tip);
				c.quadraticCurveTo(bx + S * 0.03, (y + tip) / 2, bx + S * 0.035, y);
				c.fillStyle = lit(c, bx, (y + tip) / 2, S * 0.1, BONE, BONE_LO);
				c.fill();
				ink(c, S, 0.7);
			}
		}
		c.beginPath();
		c.roundRect(x - S * 0.38, y - S * 0.05, S * 0.76, S * 0.1, S * 0.05);
		c.fillStyle = lit(c, x, y, S * 0.3, BONE, BONE_LO);
		c.fill();
		ink(c, S, 0.8);
	},
	icon(c, item, x, y, S) {
		if (item === 'snare') {
			BONE_KIT.snare(c, x, y, S * 1.1, 0.7);
		} else if (item === 'plasma') {
			shadow(c, x, y + S * 0.22, S * 0.3, S * 0.08);
			// a bone stock and a bile bladder
			c.beginPath();
			c.roundRect(x - S * 0.36, y - S * 0.06, S * 0.4, S * 0.14, S * 0.06);
			c.fillStyle = lit(c, x - S * 0.2, y, S * 0.2, BONE, BONE_LO);
			c.fill();
			ink(c, S);
			c.beginPath();
			c.ellipse(x + S * 0.14, y - S * 0.02, S * 0.2, S * 0.17, 0, 0, 7);
			c.fillStyle = lit(c, x + S * 0.14, y, S * 0.2, '#8fe0ff', '#1d5a9a');
			c.fill();
			ink(c, S);
			gloss(c, x + S * 0.08, y - S * 0.09, S * 0.06, S * 0.03);
		} else {
			shadow(c, x, y + S * 0.26, S * 0.28, S * 0.08);
			// a ribbed bone carapace
			c.beginPath();
			c.moveTo(x, y - S * 0.32);
			c.quadraticCurveTo(x + S * 0.34, y - S * 0.26, x + S * 0.3, y + S * 0.04);
			c.quadraticCurveTo(x + S * 0.22, y + S * 0.26, x, y + S * 0.32);
			c.quadraticCurveTo(x - S * 0.22, y + S * 0.26, x - S * 0.3, y + S * 0.04);
			c.quadraticCurveTo(x - S * 0.34, y - S * 0.26, x, y - S * 0.32);
			c.fillStyle = lit(c, x, y, S * 0.3, BONE, BONE_LO);
			c.fill();
			ink(c, S);
			c.strokeStyle = 'rgba(80,50,30,.6)';
			c.lineWidth = Math.max(1, S * 0.03);
			for (let k = -1; k <= 1; k += 1) {
				c.beginPath();
				c.moveTo(x - S * 0.22, y + k * S * 0.1);
				c.quadraticCurveTo(x, y + k * S * 0.1 + S * 0.06, x + S * 0.22, y + k * S * 0.1);
				c.stroke();
			}
		}
	},
	bolt(c, x, y, S, dir) {
		const [dx, dy] = VEC[dir];
		c.beginPath();
		c.ellipse(x, y, S * (0.13 + 0.05 * Math.abs(dx)), S * (0.13 + 0.05 * Math.abs(dy)), 0, 0, 7);
		c.fillStyle = lit(c, x, y, S * 0.14, '#b8f0ff', '#2a7ad0');
		c.fill();
		ink(c, S, 0.8);
		gloss(c, x - S * 0.04, y - S * 0.04, S * 0.04, S * 0.025, 0.8);
		for (let k = 1; k <= 2; k += 1) {
			c.fillStyle = `rgba(80,170,230,${0.55 - k * 0.2})`;
			c.beginPath();
			c.arc(x - dx * S * 0.2 * k, y - dy * S * 0.2 * k, S * (0.06 - k * 0.015), 0, 7);
			c.fill();
		}
	},
	armour(c, x, y, S) {
		// bone plates hugging the hero's back, down the right side
		for (let k = 0; k < 4; k += 1) {
			const a = 0.2 + k * 0.45;
			const px = x + Math.cos(a) * S * 0.46;
			const py = y + Math.sin(a) * S * 0.46;
			c.beginPath();
			c.ellipse(px, py, S * 0.1, S * 0.06, a + Math.PI / 2, 0, 7);
			c.fillStyle = lit(c, px, py, S * 0.08, BONE, BONE_LO);
			c.fill();
			ink(c, S, 0.7);
		}
	},
	rush(c, x0, x1, y, S) {
		// three torn red claw lines behind him
		for (let k = -1; k <= 1; k += 1) {
			const yy = y + k * S * 0.18;
			c.beginPath();
			c.moveTo(x0, yy + S * 0.04);
			c.quadraticCurveTo((x0 + x1) / 2, yy - S * 0.08 * k, x1 - S * 0.4, yy);
			c.lineTo(x0 + S * 0.3, yy - S * 0.03);
			c.closePath();
			c.fillStyle = '#b8241c';
			c.fill();
			ink(c, S, 0.6);
		}
	},
	impact(c, x, y, S) {
		for (let k = 0; k < 3; k += 1) {
			const a = -0.8 + k * 0.55;
			c.beginPath();
			c.moveTo(x + Math.cos(a) * S * 0.1, y + Math.sin(a) * S * 0.1);
			c.lineTo(x + Math.cos(a) * S * 0.6, y + Math.sin(a) * S * 0.6 - S * 0.05);
			c.lineTo(x + Math.cos(a) * S * 0.62, y + Math.sin(a) * S * 0.62 + S * 0.05);
			c.closePath();
			c.fillStyle = BONE;
			c.fill();
			ink(c, S, 0.6);
		}
	}
};

// ---------------------------------------------------------------- B: iron

const STEEL = '#b9c2c8';
const STEEL_LO = '#3c464e';
const BRASS = '#e6b04a';
const BRASS_LO = '#7a4e12';
const VISOR: readonly string[] = ['#ff4a2a', '#ff6ab8', '#3ad8ff', '#ff9a2a'];

/** B: forged iron. The armoury of hell: brass shells, a soul sphere, hooded wraiths in iron masks. */
export const IRON_KIT: Kit = {
	id: 'iron',
	name: 'Железо',
	idea: 'Арсенал ада: латунные гильзы, сфера души, капкан из стали. Призраки — тёмные балахоны в железных масках, цвет только в прорезях глаз. Цвета: сталь и латунь, цветные акценты.',
	food(c, x, y, S) {
		shadow(c, x, y + S * 0.01, S * 0.13, S * 0.06);
		// a spent brass shell standing on its base
		c.beginPath();
		c.roundRect(x - S * 0.065, y - S * 0.14, S * 0.13, S * 0.26, S * 0.03);
		c.fillStyle = lit(c, x, y, S * 0.1, '#ffe08a', BRASS_LO);
		c.fill();
		ink(c, S, 0.9);
		c.beginPath();
		c.ellipse(x, y - S * 0.14, S * 0.065, S * 0.03, 0, 0, 7);
		c.fillStyle = '#5a3a10';
		c.fill();
		c.fillStyle = 'rgba(255,255,255,.65)';
		c.fillRect(x - S * 0.04, y - S * 0.1, S * 0.016, S * 0.17);
	},
	energizer(c, x, y, S) {
		shadow(c, x, y + S * 0.08, S * 0.24, S * 0.09);
		const r = S * 0.24;
		c.beginPath();
		c.arc(x, y, r, 0, 7);
		const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
		g.addColorStop(0, '#d8f4ff');
		g.addColorStop(0.5, '#3a9aff');
		g.addColorStop(1, '#0a2a7a');
		c.fillStyle = g;
		c.fill();
		ink(c, S);
		// the face in the sphere
		c.fillStyle = 'rgba(10,30,90,.55)';
		c.beginPath();
		c.arc(x - r * 0.3, y + r * 0.05, r * 0.12, 0, 7);
		c.arc(x + r * 0.3, y + r * 0.05, r * 0.12, 0, 7);
		c.fill();
		gloss(c, x - r * 0.4, y - r * 0.45, r * 0.22, r * 0.12, 0.8);
	},
	ghost(c, i, x, y, S, dir, fright) {
		const w = S * 0.36;
		const h = S * 0.37;
		shadow(c, x, y + h * 0.75, w * 0.9, S * 0.08, 0.35);
		ghostBody(c, x, y, w, h, 3, i * 1.3);
		c.fillStyle = fright ? lit(c, x, y, w, '#3a4ab0', '#10164a') : lit(c, x, y, w, '#4a3a40', '#140c10');
		c.fill();
		ink(c, S);
		// the iron mask, the same on all four; the colour lives in its eye slit
		c.beginPath();
		c.moveTo(x - w * 0.7, y - h * 0.45);
		c.lineTo(x + w * 0.7, y - h * 0.45);
		c.lineTo(x + w * 0.55, y + h * 0.15);
		c.lineTo(x, y + h * 0.32);
		c.lineTo(x - w * 0.55, y + h * 0.15);
		c.closePath();
		c.fillStyle = fright ? '#8a92b8' : lit(c, x, y - h * 0.2, w * 0.7, STEEL, STEEL_LO);
		c.fill();
		ink(c, S, 0.85);
		const [dx, dy] = VEC[dir];
		c.beginPath();
		c.roundRect(x - w * 0.56 + dx * S * 0.03, y - h * 0.3 + dy * S * 0.02, w * 1.12, h * 0.3, h * 0.1);
		c.fillStyle = fright ? '#1a1e3a' : VISOR[i];
		c.fill();
		ink(c, S, 0.6);
		if (!fright) {
			// the hood's hem in the same colour, so the four part at a glance
			c.beginPath();
			c.moveTo(x - w, y + h * 0.78);
			c.lineTo(x + w, y + h * 0.78);
			c.strokeStyle = VISOR[i];
			c.lineWidth = Math.max(1.5, S * 0.05);
			c.stroke();
		}
		c.fillStyle = 'rgba(20,10,10,.5)';
		for (const side of [-1, 1]) {
			c.beginPath();
			c.arc(x + side * w * 0.45, y + h * 0.02, S * 0.018, 0, 7);
			c.fill();
		}
	},
	snare(c, x, y, S, open) {
		shadow(c, x, y + S * 0.08, S * 0.36, S * 0.1);
		// a steel jaw trap: a plate, two toothed bows
		c.beginPath();
		c.ellipse(x, y, S * 0.14, S * 0.07, 0, 0, 7);
		c.fillStyle = lit(c, x, y, S * 0.1, STEEL, STEEL_LO);
		c.fill();
		ink(c, S, 0.8);
		for (const side of [-1, 1]) {
			const r = S * 0.36;
			const k = side * (0.25 + 0.75 * open);
			c.beginPath();
			c.ellipse(x, y, r, r * Math.abs(k) * 0.55 + S * 0.02, 0, side < 0 ? Math.PI : 0, side < 0 ? Math.PI * 2 : Math.PI);
			c.strokeStyle = INK;
			c.lineWidth = Math.max(3, S * 0.1);
			c.stroke();
			c.strokeStyle = STEEL;
			c.lineWidth = Math.max(1.5, S * 0.05);
			c.stroke();
			c.fillStyle = '#e8eef2';
			for (let t = -2; t <= 2; t += 1) {
				const tx = x + t * r * 0.33;
				const ty = y + side * (r * Math.abs(k) * 0.55 + S * 0.02) * Math.sqrt(Math.max(0, 1 - (t * 0.33) ** 2));
				c.beginPath();
				c.moveTo(tx - S * 0.035, ty);
				c.lineTo(tx, ty - side * S * 0.07);
				c.lineTo(tx + S * 0.035, ty);
				c.closePath();
				c.fill();
				ink(c, S, 0.5);
			}
		}
	},
	icon(c, item, x, y, S) {
		if (item === 'snare') {
			IRON_KIT.snare(c, x, y, S * 1.05, 0.75);
		} else if (item === 'plasma') {
			shadow(c, x, y + S * 0.22, S * 0.32, S * 0.08);
			c.beginPath();
			c.roundRect(x - S * 0.38, y - S * 0.1, S * 0.6, S * 0.2, S * 0.05);
			c.fillStyle = lit(c, x, y, S * 0.3, STEEL, STEEL_LO);
			c.fill();
			ink(c, S);
			c.beginPath();
			c.roundRect(x - S * 0.28, y - S * 0.04, S * 0.3, S * 0.08, S * 0.03);
			c.fillStyle = '#7fe8ff';
			c.fill();
			ink(c, S, 0.6);
			c.beginPath();
			c.roundRect(x + S * 0.22, y - S * 0.06, S * 0.14, S * 0.12, S * 0.03);
			c.fillStyle = lit(c, x + S * 0.28, y, S * 0.08, BRASS, BRASS_LO);
			c.fill();
			ink(c, S, 0.8);
		} else {
			shadow(c, x, y + S * 0.26, S * 0.28, S * 0.08);
			// a steel vest
			c.beginPath();
			c.moveTo(x - S * 0.3, y - S * 0.26);
			c.lineTo(x - S * 0.12, y - S * 0.3);
			c.quadraticCurveTo(x, y - S * 0.2, x + S * 0.12, y - S * 0.3);
			c.lineTo(x + S * 0.3, y - S * 0.26);
			c.lineTo(x + S * 0.26, y + S * 0.28);
			c.lineTo(x - S * 0.26, y + S * 0.28);
			c.closePath();
			c.fillStyle = lit(c, x, y, S * 0.3, '#9ab0c4', STEEL_LO);
			c.fill();
			ink(c, S);
			c.strokeStyle = BRASS;
			c.lineWidth = Math.max(1.5, S * 0.04);
			c.beginPath();
			c.moveTo(x - S * 0.2, y + S * 0.06);
			c.lineTo(x + S * 0.2, y + S * 0.06);
			c.stroke();
			gloss(c, x - S * 0.15, y - S * 0.12, S * 0.05, S * 0.08, 0.45);
		}
	},
	bolt(c, x, y, S, dir) {
		const [dx, dy] = VEC[dir];
		const len = S * 0.3;
		c.beginPath();
		c.roundRect(
			x - (dx ? len / 2 : S * 0.07),
			y - (dy ? len / 2 : S * 0.07),
			dx ? len : S * 0.14,
			dy ? len : S * 0.14,
			S * 0.07
		);
		c.fillStyle = '#5ad8ff';
		c.fill();
		ink(c, S, 0.7);
		c.fillStyle = '#f0fdff';
		c.beginPath();
		c.arc(x + dx * S * 0.05, y + dy * S * 0.05, S * 0.04, 0, 7);
		c.fill();
	},
	armour(c, x, y, S) {
		c.beginPath();
		c.arc(x, y, S * 0.5, -0.4, Math.PI * 0.75);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(4, S * 0.13);
		c.stroke();
		c.strokeStyle = '#9ab0c4';
		c.lineWidth = Math.max(2, S * 0.07);
		c.stroke();
		for (let k = 0; k < 3; k += 1) {
			const a = -0.2 + k * 0.7;
			c.fillStyle = BRASS;
			c.beginPath();
			c.arc(x + Math.cos(a) * S * 0.5, y + Math.sin(a) * S * 0.5, S * 0.03, 0, 7);
			c.fill();
		}
	},
	rush(c, x0, x1, y, S) {
		// straight speed bars and a dust of sparks
		for (let k = -2; k <= 2; k += 1) {
			const yy = y + k * S * 0.11;
			const start = x0 + Math.abs(k) * S * 0.4;
			c.beginPath();
			c.moveTo(start, yy);
			c.lineTo(x1 - S * 0.45, yy);
			c.strokeStyle = k === 0 ? '#ffe08a' : 'rgba(255,160,60,.75)';
			c.lineWidth = Math.max(1.5, S * (k === 0 ? 0.06 : 0.035));
			c.stroke();
		}
	},
	impact(c, x, y, S) {
		for (let k = 0; k < 2; k += 1) {
			c.beginPath();
			c.arc(x, y, S * (0.3 + k * 0.22), -1.2, 1.2);
			c.strokeStyle = INK;
			c.lineWidth = Math.max(3, S * 0.1);
			c.stroke();
			c.strokeStyle = k ? '#ff9a2a' : '#ffe08a';
			c.lineWidth = Math.max(1.5, S * 0.05);
			c.stroke();
		}
	}
};

// ---------------------------------------------------------------- C: arcade

const ARCADE: readonly string[] = ['#ff2a2a', '#ff9ad8', '#2affff', '#ffa040'];

/**
 * C: arcade. The old cabinet's language in the hell: flat colours, a thick line, little shading;
 * ghosts with the classic body and tiny horns, embers for dots, a power pellet that is a coal.
 */
export const ARCADE_KIT: Kit = {
	id: 'arcade',
	name: 'Аркада',
	idea: 'Язык старого автомата в аду: плоские цвета, толстая линия, мало теней. Точки — угольки, энерджайзер — раскалённый уголь, призраки — классическое тело с рожками. Яркие чистые цвета.',
	food(c, x, y, S) {
		c.beginPath();
		c.arc(x, y, S * 0.09, 0, 7);
		c.fillStyle = '#ffb04a';
		c.fill();
		ink(c, S, 0.9);
		c.fillStyle = '#fff2c0';
		c.beginPath();
		c.arc(x - S * 0.03, y - S * 0.03, S * 0.03, 0, 7);
		c.fill();
	},
	energizer(c, x, y, S) {
		c.beginPath();
		for (let k = 0; k < 8; k += 1) {
			const a = (k / 8) * Math.PI * 2;
			const r = S * (k % 2 ? 0.22 : 0.27);
			c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
		}
		c.closePath();
		c.fillStyle = '#ff6a1a';
		c.fill();
		ink(c, S, 1.1);
		c.fillStyle = '#ffe24a';
		c.beginPath();
		c.arc(x - S * 0.02, y - S * 0.02, S * 0.11, 0, 7);
		c.fill();
	},
	ghost(c, i, x, y, S, dir, fright) {
		const w = S * 0.38;
		const h = S * 0.38;
		// two small horns, then the classic body
		for (const side of [-1, 1]) {
			c.beginPath();
			c.moveTo(x + side * w * 0.45, y - h * 0.85);
			c.lineTo(x + side * w * 0.75, y - h * 1.25);
			c.lineTo(x + side * w * 0.85, y - h * 0.62);
			c.closePath();
			c.fillStyle = fright ? '#c8d0ff' : '#fff4e0';
			c.fill();
			ink(c, S, 0.8);
		}
		ghostBody(c, x, y, w, h, 3, 0);
		c.fillStyle = fright ? '#2a3aff' : ARCADE[i];
		c.fill();
		ink(c, S, 1.1);
		if (fright) {
			c.fillStyle = '#ffd0b0';
			c.beginPath();
			c.arc(x - S * 0.1, y - h * 0.2, S * 0.04, 0, 7);
			c.arc(x + S * 0.1, y - h * 0.2, S * 0.04, 0, 7);
			c.fill();
			c.strokeStyle = '#ffd0b0';
			c.lineWidth = Math.max(1.4, S * 0.035);
			c.beginPath();
			for (let k = 0; k < 7; k += 1) c.lineTo(x - w * 0.6 + k * w * 0.2, y + h * 0.22 + (k % 2 ? -1 : 1) * S * 0.03);
			c.stroke();
		} else {
			eyes(c, x, y - h * 0.2, S, dir, '#ffffff', '#1a3aff', 0.1);
		}
	},
	snare(c, x, y, S, open) {
		shadow(c, x, y + S * 0.06, S * 0.34, S * 0.08, 0.3);
		for (const side of [-1, 1]) {
			c.beginPath();
			const ry = S * (0.05 + 0.2 * open);
			c.ellipse(x, y, S * 0.34, ry, 0, side < 0 ? Math.PI : 0, side < 0 ? Math.PI * 2 : Math.PI);
			c.closePath();
			c.fillStyle = '#9aa4b0';
			c.fill();
			ink(c, S, 1.1);
			c.fillStyle = '#ffffff';
			for (let t = -2; t <= 2; t += 1) {
				const tx = x + t * S * 0.11;
				c.beginPath();
				c.moveTo(tx - S * 0.035, y);
				c.lineTo(tx, y + side * S * 0.08);
				c.lineTo(tx + S * 0.035, y);
				c.closePath();
				c.fill();
				ink(c, S, 0.5);
			}
		}
	},
	icon(c, item, x, y, S) {
		if (item === 'snare') {
			ARCADE_KIT.snare(c, x, y, S * 1.1, 0.8);
		} else if (item === 'plasma') {
			// a toy ray gun
			c.beginPath();
			c.roundRect(x - S * 0.34, y - S * 0.12, S * 0.44, S * 0.24, S * 0.12);
			c.fillStyle = '#ff3a8a';
			c.fill();
			ink(c, S, 1.1);
			c.beginPath();
			c.roundRect(x - S * 0.26, y + S * 0.06, S * 0.12, S * 0.22, S * 0.04);
			c.fillStyle = '#ff3a8a';
			c.fill();
			ink(c, S, 1.1);
			for (let k = 0; k < 3; k += 1) {
				c.beginPath();
				c.arc(x + S * (0.14 + k * 0.08), y, S * (0.1 - k * 0.02), 0, 7);
				c.fillStyle = k % 2 ? '#2affff' : '#ffffff';
				c.fill();
				ink(c, S, 0.8);
			}
		} else {
			// a round shield with a star
			c.beginPath();
			c.arc(x, y, S * 0.3, 0, 7);
			c.fillStyle = '#2a7aff';
			c.fill();
			ink(c, S, 1.1);
			c.beginPath();
			for (let k = 0; k < 10; k += 1) {
				const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
				const r = S * (k % 2 ? 0.07 : 0.17);
				c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
			}
			c.closePath();
			c.fillStyle = '#ffe24a';
			c.fill();
			ink(c, S, 0.7);
		}
	},
	bolt(c, x, y, S, dir) {
		const [dx, dy] = VEC[dir];
		for (let k = 0; k < 2; k += 1) {
			c.beginPath();
			c.ellipse(x - dx * S * 0.12 * k, y - dy * S * 0.12 * k, S * (dx ? 0.05 : 0.15), S * (dy ? 0.05 : 0.15), 0, 0, 7);
			c.strokeStyle = INK;
			c.lineWidth = Math.max(3, S * 0.09);
			c.stroke();
			c.strokeStyle = k ? '#ffffff' : '#2affff';
			c.lineWidth = Math.max(1.5, S * 0.045);
			c.stroke();
		}
	},
	armour(c, x, y, S) {
		c.beginPath();
		c.arc(x, y, S * 0.52, 0, 7);
		c.strokeStyle = INK;
		c.lineWidth = Math.max(3, S * 0.09);
		c.stroke();
		c.strokeStyle = '#2a7aff';
		c.lineWidth = Math.max(1.5, S * 0.045);
		c.setLineDash([S * 0.12, S * 0.08]);
		c.stroke();
		c.setLineDash([]);
	},
	rush(c, x0, x1, y, S) {
		for (let k = 0; k < 3; k += 1) {
			const px = x0 + (x1 - x0) * (0.15 + k * 0.25);
			c.beginPath();
			c.arc(px, y + S * 0.22, S * (0.1 + k * 0.03), 0, 7);
			c.fillStyle = '#f4e8d8';
			c.fill();
			ink(c, S, 0.8);
		}
		for (const k of [-1, 1]) {
			c.beginPath();
			c.moveTo(x0 + S * 0.4, y + k * S * 0.15);
			c.lineTo(x1 - S * 0.5, y + k * S * 0.15);
			c.strokeStyle = INK;
			c.lineWidth = Math.max(2, S * 0.05);
			c.stroke();
		}
	},
	impact(c, x, y, S) {
		c.beginPath();
		for (let k = 0; k < 12; k += 1) {
			const a = (k / 12) * Math.PI * 2;
			const r = S * (k % 2 ? 0.2 : 0.42);
			c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
		}
		c.closePath();
		c.fillStyle = '#ffe24a';
		c.fill();
		ink(c, S, 1.1);
	}
};

export const KITS: readonly Kit[] = [BONE_KIT, IRON_KIT, ARCADE_KIT];
