// The heroes' CG materials (the owner asked for a rendered, "Pixar" look rather than a painted
// one): every pixel of the sphere is lit like a 3D surface. A glossy sphere needs something
// to reflect, so both reflect the same cosmic studio: deep space, a big soft box along the
// key light, a cool strip light from below and a violet haze at the horizon. Volume comes
// from light alone: diffuse, two speculars, Fresnel, subsurface warmth at the edge, a cool
// rim light from behind (the hero shot), and a soft darkening at the silhouette instead of
// ink. Frame space: y is down, z points at the viewer, units are body radii.
import type { RGB } from './RibbonTrail';
import type { Vec3 } from './Hero';

const clamp01 = (v: number): number => Math.max(0, Math.min(1, v));
const smooth = (a: number, b: number, v: number): number => {
	const t = clamp01((v - a) / (b - a));
	return t * t * (3 - 2 * t);
};
const lerp3 = (a: RGB, b: RGB, k: number): RGB => [
	a[0] + (b[0] - a[0]) * k,
	a[1] + (b[1] - a[1]) * k,
	a[2] + (b[2] - a[2]) * k
];

function hash(x: number, y: number): number {
	let h = (x * 374761393 + y * 668265263) | 0;
	h = Math.imul(h ^ (h >>> 13), 1274126177);
	return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function noise(x: number, y: number): number {
	const ix = Math.floor(x);
	const iy = Math.floor(y);
	const fx = x - ix;
	const fy = y - iy;
	const ux = fx * fx * (3 - 2 * fx);
	const uy = fy * fy * (3 - 2 * fy);
	const a = hash(ix, iy);
	const b = hash(ix + 1, iy);
	const c = hash(ix, iy + 1);
	const d = hash(ix + 1, iy + 1);
	return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function fbm(x: number, y: number): number {
	let s = 0;
	let a = 0.5;
	for (let i = 0; i < 4; i++) {
		s += a * noise(x, y);
		x = x * 2.03 + 17.1;
		y = y * 2.03 + 3.7;
		a *= 0.5;
	}
	return s / 0.9375;
}

/** What the sphere reflects in the direction (rx, ry, rz): the cosmic studio. */
function studio(rx: number, ry: number, rz: number, light: Vec3): RGB {
	// deep space, a little lighter towards the horizon
	let col: RGB = lerp3([10, 12, 30], [40, 30, 80], clamp01(1 - Math.abs(ry)));
	// the key soft box
	const key = Math.pow(Math.max(0, rx * light.x + ry * light.y + rz * light.z), 7);
	col = lerp3(col, [255, 248, 236], clamp01(key * 1.3));
	// a cool strip light from below and behind
	const n = Math.hypot(0.35, 0.85, 0.4);
	const strip = Math.pow(Math.max(0, (rx * 0.35 + ry * 0.85 + rz * 0.4) / n), 10);
	col = [col[0] + 80 * strip, col[1] + 130 * strip, col[2] + 255 * strip];
	// violet haze at the horizon
	const haze = Math.exp(-Math.pow((ry + 0.05) / 0.22, 2)) * 0.35;
	return [col[0] + 140 * haze, col[1] + 90 * haze, col[2] + 200 * haze];
}

interface Lit {
	readonly ndl: number;
	readonly ndh: number;
	readonly fres: number;
	readonly reflected: RGB;
	readonly rim: number;
	readonly edge: number;
}

/** The common lighting terms at a point of the unit sphere. */
function lighting(x: number, y: number, z: number, light: Vec3): Lit {
	const ndl = Math.max(0, x * light.x + y * light.y + z * light.z);
	const hx = light.x;
	const hy = light.y;
	const hz = light.z + 1;
	const hn = Math.hypot(hx, hy, hz);
	const ndh = Math.max(0, (x * hx + y * hy + z * hz) / hn);
	const fres = Math.pow(1 - z, 5);
	// the reflected view ray: V = (0, 0, 1), R = 2(n·V)n − V
	const reflected = studio(2 * z * x, 2 * z * y, 2 * z * z - 1, light);
	// a cool rim from behind and above (the frame's -x, -y): the hero shot
	const rl = Math.hypot(x, y) || 1;
	const rim = Math.pow(1 - z, 2.2) * Math.max(0, (-x * 0.8 - y * 0.45) / rl);
	// a soft darkening at the silhouette, in place of ink
	const edge = 0.5 + 0.5 * smooth(0, 0.3, z);
	return { ndl, ndh, fres, reflected, rim, edge };
}

/**
 * Pac-Man: stellar gold. A warm semi-metal that reflects the cosmic studio, a white-hot
 * specular, subsurface warmth at the edge and a cool blue rim from behind. Powered (look 1)
 * the star inside shines through: the gold pales and glows from the centre.
 */
export function stellarGold(x: number, y: number, z: number, light: Vec3, look: number): RGB {
	const l = lighting(x, y, z, light);
	const albedo = lerp3([255, 178, 46], [255, 236, 170], look);
	const diffuse = (0.16 + 0.84 * l.ndl) * 0.78 * l.edge;
	const refl = 0.32 + 0.68 * l.fres;
	const tint = lerp3([255, 200, 110], [255, 236, 200], look);
	let r = albedo[0] * diffuse + (l.reflected[0] * tint[0] * refl) / 255 / 1.6;
	let g = albedo[1] * diffuse + (l.reflected[1] * tint[1] * refl) / 255 / 1.6;
	let b = albedo[2] * diffuse + (l.reflected[2] * tint[2] * refl) / 255 / 1.6;
	const spec = Math.pow(l.ndh, 140) * 2.4 + Math.pow(l.ndh, 22) * 0.35;
	r += 255 * spec;
	g += 245 * spec;
	b += 220 * spec;
	// subsurface warmth at the edge
	const sss = Math.pow(1 - z, 2.5) * (0.55 + 0.3 * look);
	r += 255 * sss;
	g += 110 * sss;
	b += 20 * sss;
	// the cool rim light from behind
	r += 110 * l.rim * 1.3;
	g += 150 * l.rim * 1.3;
	b += 255 * l.rim * 1.3;
	// powered: the star inside shines through the shell
	const core = Math.pow(z, 1.6) * look;
	r += 255 * core * 0.55;
	g += 225 * core * 0.55;
	b += 150 * core * 0.55;
	return [r, g, b];
}

/** Stars scattered in a field: a soft point in some cells of a grid. */
function stars(x: number, y: number, scale: number, density: number): number {
	const gx = x * scale;
	const gy = y * scale;
	const ix = Math.floor(gx);
	const iy = Math.floor(gy);
	const h = hash(ix + 991, iy + 313);
	if (h < 1 - density) return 0;
	const sx = ix + 0.25 + 0.5 * hash(ix + 7, iy + 11);
	const sy = iy + 0.25 + 0.5 * hash(ix + 13, iy + 5);
	const d2 = (gx - sx) ** 2 + (gy - sy) ** 2;
	return Math.exp(-d2 * 22) * (0.6 + 0.4 * h);
}

/**
 * Ms. Pac-Man: a nebula in a pearl. A translucent pearl shell with a pink and violet nebula
 * full of stars inside (seen deepest at the centre), an iridescent Fresnel rim, glossy
 * speculars and a pink rim light. Powered (look 1) the pearl turns white and the nebula
 * lavender and bright.
 */
export function nebulaPearl(x: number, y: number, z: number, light: Vec3, look: number): RGB {
	const l = lighting(x, y, z, light);
	// the nebula, seen through the shell (a little refracted towards the centre)
	const ix = x * 0.85;
	const iy = y * 0.85;
	const n1 = fbm(ix * 2.2 + 3.1, iy * 2.2 + 1.7);
	const n2 = fbm(ix * 4.1 + 7.3, iy * 4.1 + 2.9);
	let neb = lerp3(
		lerp3([46, 12, 76], [120, 90, 200], look),
		lerp3([255, 96, 176], [230, 200, 255], look),
		smooth(0.35, 0.78, n1)
	);
	neb = lerp3(neb, lerp3([90, 130, 255], [180, 240, 255], look), smooth(0.55, 0.85, n2) * 0.55);
	const st = stars(ix, iy, 9, 0.18 + 0.12 * look) + stars(ix + 3.3, iy + 1.1, 17, 0.12);
	neb = [neb[0] + 255 * st, neb[1] + 245 * st, neb[2] + 255 * st];
	// the pearl shell, lit
	const albedo = lerp3([255, 186, 214], [255, 244, 252], look);
	const diffuse = (0.3 + 0.7 * l.ndl) * l.edge;
	const shell: RGB = [albedo[0] * diffuse, albedo[1] * diffuse, albedo[2] * diffuse];
	const see = clamp01(Math.pow(z, 0.7) * (0.62 - 0.12 * look));
	let col = lerp3(shell, neb, see);
	// iridescence on the Fresnel edge
	const f = Math.pow(1 - z, 2);
	const irid: RGB = [
		0.5 + 0.5 * Math.cos(6.283 * (f * 1.2)),
		0.5 + 0.5 * Math.cos(6.283 * (f * 1.2 + 0.33)),
		0.5 + 0.5 * Math.cos(6.283 * (f * 1.2 + 0.67))
	];
	const ir = f * (0.45 + 0.35 * look);
	col = [col[0] + 255 * irid[0] * ir, col[1] + 255 * irid[1] * ir, col[2] + 255 * irid[2] * ir];
	// the studio in the glossy shell, the speculars, a pink rim from behind
	const refl = 0.06 + 0.94 * l.fres;
	col = [
		col[0] + l.reflected[0] * refl * 0.9,
		col[1] + l.reflected[1] * refl * 0.9,
		col[2] + l.reflected[2] * refl * 0.9
	];
	const spec = Math.pow(l.ndh, 220) * 2.6 + Math.pow(l.ndh, 30) * 0.4;
	const rim = l.rim * 1.2;
	return [
		col[0] + 255 * spec + 255 * rim,
		col[1] + 252 * spec + 140 * rim,
		col[2] + 255 * spec + 230 * rim
	];
}
