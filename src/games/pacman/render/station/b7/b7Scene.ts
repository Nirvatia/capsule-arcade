// The station B-7 (the owner's mock-up "Station_Level_v2.html", 2026-11-25), carried over as
// drawn on the game's own maze: the hull, the biolab and the observation deck round the maze, the
// 2.5D bulkhead walls merged into engineering modules, the sunken lair pit, the infestation per
// phase, the live props (fans, turbines, tanks, the storm planet, the console screens), the food
// (bio-spores, power cells) and the light map. Stage space: 1920x1080, a tile is 34 px.
/** `lairDoors`: false leaves out the lair's bent blast doors and the hazard band before them;
 *  `lairCocoons`: false leaves out its cocoons (the infestation C draws its own). */
export function createB7Scene(
	rows: readonly (readonly string[])[],
	opts: { readonly lairDoors?: boolean; readonly lairCocoons?: boolean } = {}
) {
	// =========================================================================
	// 1. EXACT 25x27 GRID_STATION LAYOUT (PURE VISUALS — ZERO GAMEPLAY LOGIC)
	// =========================================================================
	const GRID = rows.map((row) => [...row]);
	type WallGeometry = ReturnType<typeof buildUnifiedWallGeometries>;
	const ROWS = GRID.length; // 27
	const COLS = GRID[0].length; // 25

	const CONSOLE_TILE = { x: 12, y: 24 };
	const HATCH_TILE = { x: 6, y: 1 };

	const LAIR_TOKENS = new Set(['LT', 'BY', 'IY', 'PY', 'CE']);
	const tileAt = (x: number, y: number) =>
		y >= 0 && y < ROWS && x >= 0 && x < COLS ? GRID[y][x] : 'ES';
	const isWall = (x: number, y: number) => tileAt(x, y) === 'WL';
	const isVoid = (x: number, y: number) => tileAt(x, y) === 'ES';
	const isLair = (x: number, y: number) => LAIR_TOKENS.has(tileAt(x, y));
	const isGate = (x: number, y: number) => tileAt(x, y) === 'LE';
	const isTeleport = (x: number, y: number) => {
		const tk = tileAt(x, y);
		return tk.length === 2 && tk[0] === '0';
	};
	const isWalkable = (x: number, y: number) => !isWall(x, y) && !isVoid(x, y);
	const isCorridorFloor = (x: number, y: number) => isWalkable(x, y) && !isLair(x, y);
	const isOuterPerimeterWall = (x: number, y: number) =>
		x === 1 || x === COLS - 2 || y === 1 || y === ROWS - 2;

	// =========================================================================
	// 2. STAGE ARCHITECTURAL CUTAWAY GEOMETRY (1920x1080)
	// =========================================================================
	const STAGE_W = 1920;
	const STAGE_H = 1080;
	const TILE = 34;
	const FACADE_H = 7; // Crisp 7px 2.5D south-facing bulkhead vertical skirt

	const MAZE_X = 535;
	const MAZE_Y = 81;

	const tx = (c: number) => MAZE_X + c * TILE;
	const ty = (r: number) => MAZE_Y + r * TILE;
	const tcx = (c: number) => MAZE_X + (c + 0.5) * TILE;
	const tcy = (r: number) => MAZE_Y + (r + 0.5) * TILE;

	// Maze intact armored perimeter bounds (cols 1..23, rows 1..25)
	const MAZE_L = tx(1); // 569
	const MAZE_R = tx(COLS - 1); // 1351
	const MAZE_T = ty(1); // 115
	const MAZE_B = ty(ROWS - 1); // 965

	// Left Enclosed Chamber: "BIOLAB B-7"
	const LEFT_ROOM = {
		outerL: 62,
		innerL: 96,
		innerR: MAZE_L,
		outerT: MAZE_T,
		innerT: ty(2),
		innerB: ty(ROWS - 2),
		outerB: MAZE_B
	};

	// Right Enclosed Chamber: "OBSERVATION DECK // QUARANTINE"
	const RIGHT_ROOM = {
		innerL: MAZE_R,
		innerR: 1824,
		outerR: 1858,
		outerT: MAZE_T,
		innerT: ty(2),
		innerB: ty(ROWS - 2),
		outerB: MAZE_B
	};

	// Flanking Room Landmarks
	const TANKS = [
		{ id: 1, x: 228, y: 288, r: 54, kind: 'intact', seed: 1.1 },
		{ id: 2, x: 404, y: 338, r: 54, kind: 'intact', seed: 2.8 }, // Cracks & frantic bubbles in Phase 3
		{ id: 3, x: 294, y: 742, r: 56, kind: 'shattered', seed: 4.4 }
	];

	const VIEWPORT = { x: 1612, y: 468, r: 138 };
	const OBS_CONSOLE = { x: 1528, y: 744 };
	const CREW_BODY = { x: 1638, y: 834, angle: 0.58 };

	// =========================================================================
	// 3. DETERMINISTIC PRNG, NOISE & HIGH-DPI OFFSCREEN BAKE HELPERS
	// =========================================================================
	const TAU = Math.PI * 2;
	const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
	const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

	function mulberry32(seed: number) {
		let a = seed >>> 0;
		return () => {
			a = (a + 0x6d2b79f5) | 0;
			let t = Math.imul(a ^ (a >>> 15), 1 | a);
			t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	function hash2(x: number, y: number) {
		const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
		return s - Math.floor(s);
	}

	function valueNoise(x: number, y: number) {
		const xi = Math.floor(x);
		const yi = Math.floor(y);
		let xf = x - xi;
		let yf = y - yi;
		xf = xf * xf * (3 - 2 * xf);
		yf = yf * yf * (3 - 2 * yf);
		return lerp(
			lerp(hash2(xi, yi), hash2(xi + 1, yi), xf),
			lerp(hash2(xi, yi + 1), hash2(xi + 1, yi + 1), xf),
			yf
		);
	}

	function fbm(x: number, y: number) {
		return (
			0.55 * valueNoise(x, y) +
			0.28 * valueNoise(x * 2.02, y * 2.02) +
			0.12 * valueNoise(x * 4.07, y * 4.07) +
			0.05 * valueNoise(x * 8.13, y * 8.13)
		);
	}

	// High-DPI bake scale so zooming up to 320% stays crisp at locked 60 FPS
	const BAKE_SCALE = Math.min(1.7, Math.max(1.35, window.devicePixelRatio || 1));

	function makeCanvas(w: number, h: number) {
		const c = document.createElement('canvas');
		c.width = Math.max(1, Math.ceil(w));
		c.height = Math.max(1, Math.ceil(h));
		return c;
	}

	function getCtx(c: HTMLCanvasElement) {
		const g = c.getContext('2d');
		if (!g) throw new Error('2D canvas context unavailable');
		return g;
	}

	function makeStageCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
		const c = makeCanvas(STAGE_W * BAKE_SCALE, STAGE_H * BAKE_SCALE);
		const g = getCtx(c);
		g.scale(BAKE_SCALE, BAKE_SCALE);
		return [c, g];
	}

	function edgeMask(src: HTMLCanvasElement, dxPx: number, dyPx: number) {
		const c = makeCanvas(src.width, src.height);
		const g = getCtx(c);
		g.drawImage(src, 0, 0);
		g.globalCompositeOperation = 'destination-out';
		g.drawImage(src, dxPx, dyPx);
		return c;
	}

	function tintMask(mask: HTMLCanvasElement, color: string) {
		const c = makeCanvas(mask.width, mask.height);
		const g = getCtx(c);
		g.fillStyle = color;
		g.fillRect(0, 0, c.width, c.height);
		g.globalCompositeOperation = 'destination-in';
		g.drawImage(mask, 0, 0);
		return c;
	}

	// =========================================================================
	// 4. BFS DISTANCE FIELDS, UNIFIED WALL MODULES & ROOF/DUCT FANS
	// =========================================================================
	function computeWalkBfs() {
		const dist = Array.from({ length: ROWS }, () => new Array(COLS).fill(Infinity));
		const q: Array<[number, number]> = [];
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				if (isLair(x, y) || isGate(x, y)) {
					dist[y][x] = 0;
					q.push([x, y]);
				}
			}
		}
		let head = 0;
		const dirs = [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		];
		while (head < q.length) {
			const [cx, cy] = q[head++];
			const d = dist[cy][cx];
			for (const [dx, dy] of dirs) {
				const nx = cx + dx;
				const ny = cy + dy;
				if (nx < 1 || ny < 1 || nx >= COLS - 1 || ny >= ROWS - 1) continue;
				if (!isWalkable(nx, ny)) continue;
				if (d + 1 < dist[ny][nx]) {
					dist[ny][nx] = d + 1;
					q.push([nx, ny]);
				}
			}
		}
		return dist;
	}

	function computeWallBfs() {
		const dist = Array.from({ length: ROWS }, () => new Array(COLS).fill(Infinity));
		const q: Array<[number, number]> = [];
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				if (isLair(x, y) || isGate(x, y)) {
					dist[y][x] = 0;
					q.push([x, y]);
				}
			}
		}
		let head = 0;
		const dirs = [
			[1, 0],
			[-1, 0],
			[0, 1],
			[0, -1]
		];
		while (head < q.length) {
			const [cx, cy] = q[head++];
			const d = dist[cy][cx];
			for (const [dx, dy] of dirs) {
				const nx = cx + dx;
				const ny = cy + dy;
				if (nx < 2 || ny < 2 || nx >= COLS - 2 || ny >= ROWS - 2) continue;
				const cost = isWall(nx, ny) ? 1.2 : 1.0;
				if (d + cost < dist[ny][nx]) {
					dist[ny][nx] = d + cost;
					q.push([nx, ny]);
				}
			}
		}
		return dist;
	}

	const WALK_BFS = computeWalkBfs();
	const WALL_BFS = computeWallBfs();
	/** How far a tile lies from the lair for the infection (the floor's or the wall's way), tiles. */
	const infectionDistance = (x: number, y: number) =>
		Math.min(WALK_BFS[y]?.[x] ?? Infinity, WALL_BFS[y]?.[x] ?? Infinity);
	/** The game's infection, 0..1 (-1: the mock-up's phases rule the light). */
	let infection = -1;
	const setInfection = (k: number) => {
		infection = k;
	};
	const lerp3 = (a: readonly number[], b: readonly number[], k: number) =>
		`rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(', ')})`;
	/** Each lamp's failing point on the infection (0 and 3 hang on, weak, to the end). */
	const lampFails = (i: number) =>
		0.3 + 0.62 * ((((Math.sin(i * 12.9898) * 43758.5453) % 1) + 1) % 1);

	// Restrained natural infestation reach per phase ("без фанатизма")
	// Outer perimeter corridors (row 2, row 24, col 2, col 22) remain clean & readable even in Phase 3
	const HIVE_REACH: Record<number, { floor: number; wall: number }> = {
		1: { floor: 0.0, wall: 0.0 }, // Phase 1: strictly inside lair pit + torn LE doors + 2 gate-frame walls
		2: { floor: 5.8, wall: 5.6 }, // Phase 2: creeps ~5-6 tiles along wall bases/corners & partially onto inner walls
		3: { floor: 11.6, wall: 11.2 } // Phase 3: extends ~11-12 tiles across inner maze; outer perimeter stays clean
	};

	/**
	 * Merges contiguous straight runs of interior WL tiles into cohesive brushed-steel
	 * engineering modules (4x1, 3x1, 2x1, 1x4, 1x3, 1x2, 1x1).
	 */
	function buildEngineeringWallModules() {
		const used = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
		const modules = [];
		const rand = mulberry32(4093);
		const STENCILS = ['B-7', 'SEC-A', 'HV-04', 'LAB-2', 'SYS-09', 'BLK-3', 'A-04', 'VENT'];

		const canUse = (x: number, y: number) =>
			x >= 2 && x <= COLS - 3 && y >= 2 && y <= ROWS - 3 && isWall(x, y) && !used[y][x];
		const southExposed = (x: number, y: number) => !isWall(x, y + 1) && !isVoid(x, y + 1);

		// 1. Maximal horizontal runs (len >= 2) with consistent south exposure
		for (let y = 2; y <= ROWS - 3; y++) {
			let x = 2;
			while (x <= COLS - 3) {
				if (!canUse(x, y)) {
					x++;
					continue;
				}
				const sOpen = southExposed(x, y);
				let len = 1;
				while (x + len <= COLS - 3 && canUse(x + len, y) && southExposed(x + len, y) === sOpen) {
					len++;
				}
				if (len >= 2) {
					let minD = Infinity;
					for (let k = 0; k < len; k++) {
						used[y][x + k] = true;
						minD = Math.min(minD, WALL_BFS[y][x + k]);
					}
					const rx = tx(x);
					const ry = ty(y);
					const rw = len * TILE;
					const rh = TILE - (sOpen ? FACADE_H : 0);
					modules.push({
						x,
						y,
						wTiles: len,
						hTiles: 1,
						horiz: true,
						rx,
						ry,
						rw,
						rh,
						bayX: rx + 5,
						bayY: ry + 5,
						bayW: rw - 10,
						bayH: rh - 10,
						dist: minD,
						hwKind:
							len >= 3
								? rand() < 0.36
									? 'fan'
									: rand() < 0.68
										? 'busbar'
										: 'hatch'
								: rand() < 0.5
									? 'hatch'
									: 'stencil',
						stencil: STENCILS[Math.floor(rand() * STENCILS.length)],
						seed: rand()
					});
				}
				x += len;
			}
		}

		// 2. Maximal vertical runs and remaining 1x1 modules
		for (let x = 2; x <= COLS - 3; x++) {
			let y = 2;
			while (y <= ROWS - 3) {
				if (!canUse(x, y)) {
					y++;
					continue;
				}
				let len = 1;
				while (y + len <= ROWS - 3 && canUse(x, y + len)) {
					len++;
				}
				let minD = Infinity;
				for (let k = 0; k < len; k++) {
					used[y + k][x] = true;
					minD = Math.min(minD, WALL_BFS[y + k][x]);
				}
				const sOpenBottom = southExposed(x, y + len - 1);
				const rx = tx(x);
				const ry = ty(y);
				const rw = TILE;
				const rh = len * TILE - (sOpenBottom ? FACADE_H : 0);
				modules.push({
					x,
					y,
					wTiles: 1,
					hTiles: len,
					horiz: false,
					rx,
					ry,
					rw,
					rh,
					bayX: rx + 5,
					bayY: ry + 5,
					bayW: rw - 10,
					bayH: rh - 10,
					dist: minD,
					hwKind:
						len >= 3
							? rand() < 0.42
								? 'fan'
								: 'busbar'
							: len === 2
								? rand() < 0.5
									? 'hatch'
									: 'busbar'
								: 'cap',
					stencil: STENCILS[Math.floor(rand() * STENCILS.length)],
					seed: rand()
				});
				y += len;
			}
		}

		return modules;
	}

	const WALL_MODULES = buildEngineeringWallModules();

	// Live rotating roof exhaust fans inside unified wall modules
	const ROOF_FANS: Array<{
		cx: number;
		cy: number;
		r: number;
		dist: number;
		speed: number;
		ph: number;
	}> = [];
	for (const m of WALL_MODULES) {
		if (m.hwKind !== 'fan') continue;
		const r = Math.min(m.bayW, m.bayH) * 0.42;
		if (r < 5.5) continue;
		if (m.horiz && m.wTiles >= 4) {
			ROOF_FANS.push({
				cx: m.bayX + m.bayW * 0.28,
				cy: m.bayY + m.bayH * 0.5,
				r,
				dist: m.dist,
				speed: 0.75 + m.seed * 0.55,
				ph: m.seed * TAU
			});
			ROOF_FANS.push({
				cx: m.bayX + m.bayW * 0.72,
				cy: m.bayY + m.bayH * 0.5,
				r,
				dist: m.dist,
				speed: -(0.7 + m.seed * 0.45),
				ph: m.seed * TAU + 1.2
			});
		} else {
			ROOF_FANS.push({
				cx: m.bayX + m.bayW * 0.5,
				cy: m.bayY + m.bayH * 0.5,
				r,
				dist: m.dist,
				speed: (m.seed < 0.5 ? 1 : -1) * (0.75 + m.seed * 0.55),
				ph: m.seed * TAU
			});
		}
	}

	// External pneumatic duct turbines (0B, 0C top/bottom and 0A left/right)
	const DUCT_TURBINES = [
		{ cx: tcx(6), cy: MAZE_T - 48, rx: 14, ry: 22, orient: 'v', speed: 1.5, ph: 0.2 },
		{ cx: tcx(18), cy: MAZE_T - 48, rx: 14, ry: 22, orient: 'v', speed: -1.35, ph: 1.7 },
		{ cx: tcx(6), cy: MAZE_B + 48, rx: 14, ry: 22, orient: 'v', speed: 1.4, ph: 3.1 },
		{ cx: tcx(18), cy: MAZE_B + 48, rx: 14, ry: 22, orient: 'v', speed: -1.55, ph: 4.4 },
		{ cx: MAZE_L - 36, cy: tcy(13), rx: 22, ry: 14, orient: 'h', speed: 1.45, ph: 0.9 },
		{ cx: MAZE_R + 36, cy: tcy(13), rx: 22, ry: 14, orient: 'h', speed: -1.3, ph: 2.6 }
	];

	// =========================================================================
	// 5. INDUSTRIAL ARCHITECTURAL PRIMITIVES & INFINITE HULL BACKDROP
	// =========================================================================
	function drawHexBolt(g: CanvasRenderingContext2D, x: number, y: number, r: number) {
		g.fillStyle = 'rgba(0, 0, 0, 0.65)';
		g.beginPath();
		g.arc(x + 0.5, y + 0.6, r * 1.15, 0, TAU);
		g.fill();
		g.fillStyle = '#5c6a66';
		g.beginPath();
		g.arc(x, y, r, 0, TAU);
		g.fill();
		g.fillStyle = 'rgba(214, 232, 226, 0.44)';
		g.beginPath();
		g.arc(x - r * 0.25, y - r * 0.25, r * 0.42, 0, TAU);
		g.fill();
	}

	function drawHazardBand(
		g: CanvasRenderingContext2D,
		x: number,
		y: number,
		w: number,
		h: number,
		rand: () => number,
		alpha = 0.8,
		wear = 0.35
	) {
		g.save();
		g.beginPath();
		g.rect(x, y, w, h);
		g.clip();
		g.globalAlpha = alpha;
		g.fillStyle = '#121516';
		g.fillRect(x, y, w, h);
		g.fillStyle = '#ba922c';
		const st = 8;
		for (let s = -h - st * 2; s < w + h + st * 2; s += st * 2) {
			g.beginPath();
			g.moveTo(x + s, y + h);
			g.lineTo(x + s + st, y + h);
			g.lineTo(x + s + st + h, y);
			g.lineTo(x + s + h, y);
			g.closePath();
			g.fill();
		}
		const n = Math.floor(((w * h) / 44) * wear);
		for (let i = 0; i < n; i++) {
			g.fillStyle = `rgba(18, 22, 21, ${0.35 + rand() * 0.48})`;
			g.fillRect(x + rand() * w, y + rand() * h, 1 + rand() * 4, 1 + rand() * 2.2);
		}
		g.restore();
	}

	function drawStencil(
		g: CanvasRenderingContext2D,
		text: string,
		x: number,
		y: number,
		size: number,
		alpha = 0.22,
		rot = 0
	) {
		g.save();
		g.translate(x, y);
		g.rotate(rot);
		g.font = `800 ${size}px "Arial Narrow", "Roboto Condensed", Impact, sans-serif`;
		g.textAlign = 'center';
		g.textBaseline = 'middle';
		g.fillStyle = `rgba(210, 206, 178, ${alpha})`;
		g.fillText(text, 0, 0);
		g.restore();
	}

	/**
	 * Dynamically paints continuous station hull cross-section (vertical I-beams every 120u,
	 * horizontal structural ribs, and top/bottom gallery cooling conduits) across the ENTIRE
	 * visible world rectangle so there are NEVER black letterbox bars on any aspect ratio or zoom!
	 */
	function drawInfiniteHullBackdrop(
		g: CanvasRenderingContext2D,
		minX: number,
		minY: number,
		spanW: number,
		spanH: number
	) {
		const maxX = minX + spanW;
		const maxY = minY + spanH;

		// Deep industrial steel hull cross-section base
		g.fillStyle = '#090c0c';
		g.fillRect(minX, minY, spanW, spanH);

		// Repeating horizontal bulkhead framing ribs across the full visible vertical extent
		const firstRowY = Math.floor((minY - 115) / 140) * 140 + 115;
		for (let y = firstRowY; y <= maxY + 140; y += 140) {
			g.fillStyle = 'rgba(18, 24, 23, 0.55)';
			g.fillRect(minX, y - 4, spanW, 8);
			g.fillStyle = 'rgba(140, 162, 155, 0.05)';
			g.fillRect(minX, y - 4, spanW, 1.2);
		}

		// Repeating vertical structural I-beams every 120 units aligned cleanly to x = 22 + k*120
		const firstBeamX = Math.floor((minX - 22) / 120) * 120 + 22;
		for (let x = firstBeamX; x <= maxX + 120; x += 120) {
			g.fillStyle = '#040606';
			g.fillRect(x - 10, minY, 20, spanH);
			g.fillStyle = '#121716';
			g.fillRect(x - 6, minY, 12, spanH);
			g.fillStyle = 'rgba(145, 165, 158, 0.08)';
			g.fillRect(x - 6, minY, 1.5, spanH);
			g.fillStyle = '#070909';
			g.fillRect(x - 2, minY, 4, spanH);
		}

		// Seamless horizontal top & bottom gallery truss channels & cooling conduits spanning full width
		const drawGalleryStrip = (y0: number, h: number) => {
			if (y0 + h < minY || y0 > maxY) return;
			g.fillStyle = '#050707';
			g.fillRect(minX, y0, spanW, h);

			// Continuous triangular structural truss web
			const firstTrussX = Math.floor((minX - 62) / 72) * 72 + 62;
			g.strokeStyle = 'rgba(60, 72, 68, 0.34)';
			g.lineWidth = 4;
			g.beginPath();
			for (let x = firstTrussX; x <= maxX + 72; x += 72) {
				g.moveTo(x, y0 + 8);
				g.lineTo(x + 36, y0 + h - 8);
				g.lineTo(x + 72, y0 + 8);
			}
			g.stroke();

			// Twin continuous horizontal cooling/power conduits
			const firstClampX = Math.floor((minX - 130) / 110) * 110 + 130;
			for (const py of [y0 + h * 0.36, y0 + h * 0.68]) {
				const pg = g.createLinearGradient(0, py - 6, 0, py + 6);
				pg.addColorStop(0, '#35403d');
				pg.addColorStop(0.45, '#222a28');
				pg.addColorStop(1, '#0d1110');
				g.fillStyle = pg;
				g.fillRect(minX, py - 5, spanW, 10);

				g.fillStyle = '#485450';
				for (let cx = firstClampX; cx <= maxX + 110; cx += 110) {
					g.fillRect(cx, py - 7, 7, 14);
				}
			}
		};

		drawGalleryStrip(10, MAZE_T - 20);
		drawGalleryStrip(MAZE_B + 10, STAGE_H - MAZE_B - 20);
	}

	// =========================================================================
	// 6. TOP/BOTTOM MANIFOLD DUCTS & STRUCTURAL PLAQUES (DRAWN ON TRANSPARENT BASE)
	// =========================================================================
	function paintManifoldDuctsAndPlaques(g: CanvasRenderingContext2D, rand: () => number) {
		const drawExternalManifoldDuct = (cx: number, yStart: number, yEnd: number, tag: string) => {
			const top = Math.min(yStart, yEnd);
			const len = Math.abs(yEnd - yStart);
			const mw = 46;

			g.save();
			g.fillStyle = '#030404';
			g.fillRect(cx - mw / 2 - 6, top, mw + 12, len);

			const mg = g.createLinearGradient(cx - mw / 2, 0, cx + mw / 2, 0);
			mg.addColorStop(0, '#36413e');
			mg.addColorStop(0.5, '#1e2523');
			mg.addColorStop(1, '#111615');
			g.fillStyle = mg;
			g.fillRect(cx - mw / 2, top, mw, len);

			// Twin flanking pressure pipes
			for (const side of [-1, 1]) {
				const px = cx + side * 28;
				const pg = g.createLinearGradient(px - 5, 0, px + 5, 0);
				pg.addColorStop(0, '#141918');
				pg.addColorStop(0.4, '#3b4744');
				pg.addColorStop(1, '#0e1211');
				g.fillStyle = pg;
				g.fillRect(px - 5, top, 10, len);
				for (let py = top + 16; py < top + len - 12; py += 28) {
					g.fillStyle = '#4c5a56';
					g.fillRect(px - 6.5, py, 13, 5);
				}
			}

			// Deep dark shaft interior (live spinning turbines + slats painted in live pass)
			g.fillStyle = '#070a0a';
			g.fillRect(cx - 15, top, 30, len);

			// Bolted docking collar
			const collarY = yStart < MAZE_T ? MAZE_T - 13 : MAZE_B;
			g.fillStyle = '#3c4744';
			g.fillRect(cx - mw / 2 - 4, collarY, mw + 8, 13);
			g.strokeStyle = '#080b0a';
			g.lineWidth = 1.4;
			g.strokeRect(cx - mw / 2 - 4, collarY, mw + 8, 13);
			drawHexBolt(g, cx - mw / 2, collarY + 6.5, 1.8);
			drawHexBolt(g, cx + mw / 2, collarY + 6.5, 1.8);

			g.font = '700 10px ui-monospace, "Cascadia Mono", Consolas, monospace';
			g.textAlign = 'left';
			g.fillStyle = 'rgba(168, 184, 178, 0.46)';
			g.fillText(tag, cx + 38, yStart < MAZE_T ? 24 : STAGE_H - 18);
			g.restore();
		};

		drawExternalManifoldDuct(tcx(6), 0, MAZE_T, 'DUCT 0B // EXTRACTION');
		drawExternalManifoldDuct(tcx(18), 0, MAZE_T, 'DUCT 0C // VENT');
		drawExternalManifoldDuct(tcx(6), MAZE_B, STAGE_H, 'DUCT 0C // VENT');
		drawExternalManifoldDuct(tcx(18), MAZE_B, STAGE_H, 'DUCT 0B // VENT');

		// Header & footer structural stencils
		g.save();
		g.fillStyle = '#111615';
		g.fillRect(MAZE_L + 178, 30, MAZE_R - MAZE_L - 356, 36);
		g.strokeStyle = 'rgba(130, 148, 142, 0.28)';
		g.lineWidth = 1.2;
		g.strokeRect(MAZE_L + 178, 30, MAZE_R - MAZE_L - 356, 36);
		drawHazardBand(g, MAZE_L + 180, 32, 13, 32, rand, 0.72, 0.28);
		drawHazardBand(g, MAZE_R - 193, 32, 13, 32, rand, 0.72, 0.28);

		drawStencil(g, 'SECTOR B-7  //  QUARANTINE', STAGE_W / 2, 49, 17, 0.64);
		drawStencil(g, 'CONTAINMENT PERIMETER INTACT', STAGE_W / 2, STAGE_H - 44, 13, 0.28);
		g.restore();
	}

	// =========================================================================
	// 7. LEFT COMPARTMENT: "BIOLAB B-7" (STATIC BASE; LIVE TANKS IN RENDER LOOP)
	// =========================================================================
	function paintLeftBiolabBase(g: CanvasRenderingContext2D, rand: () => number) {
		const { innerL, innerR, innerT, innerB } = LEFT_ROOM;
		const rw = innerR - innerL;
		const rh = innerB - innerT;

		g.save();
		g.beginPath();
		g.rect(innerL, innerT, rw, rh);
		g.clip();

		g.fillStyle = '#151a19';
		g.fillRect(innerL, innerT, rw, rh);

		const slab = 48;
		for (let y = innerT; y < innerB; y += slab) {
			for (let x = innerL; x < innerR; x += slab) {
				const n = fbm(x * 0.015, y * 0.015);
				const v = Math.round(lerp(21, 29, n));
				const gr = g.createLinearGradient(x, y, x + slab, y + slab);
				gr.addColorStop(0, `rgb(${v}, ${v + 5}, ${v + 5})`);
				gr.addColorStop(1, `rgb(${v - 4}, ${v + 1}, ${v + 1})`);
				g.fillStyle = gr;
				g.fillRect(x + 1, y + 1, slab - 2, slab - 2);
				g.strokeStyle = 'rgba(4, 7, 7, 0.68)';
				g.lineWidth = 1;
				g.strokeRect(x + 0.5, y + 0.5, slab - 1, slab - 1);
				g.fillStyle = 'rgba(170, 192, 186, 0.04)';
				g.fillRect(x + 1.5, y + 1.5, slab - 3, 1);
			}
		}

		// Recessed perimeter lab floor drains
		const drawDrain = (x: number, y: number, w: number, h: number) => {
			g.fillStyle = '#080b0b';
			g.fillRect(x, y, w, h);
			g.strokeStyle = 'rgba(130, 148, 144, 0.14)';
			g.lineWidth = 1;
			g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
			const horiz = w > h;
			for (let s = 4; s < (horiz ? w : h) - 4; s += 6) {
				g.fillStyle = '#1e2625';
				if (horiz) g.fillRect(x + s, y + 2, 2.4, h - 4);
				else g.fillRect(x + 2, y + s, w - 4, 2.4);
			}
		};

		drawDrain(innerL + 24, innerT + 34, rw - 48, 13);
		drawDrain(innerL + 24, innerB - 50, rw - 48, 13);
		drawDrain(innerL + 24, innerT + 34, 13, rh - 72);

		// Recessed coolant feed conduits feeding the 3 tanks
		g.strokeStyle = '#0e1312';
		g.lineWidth = 12;
		g.beginPath();
		g.moveTo(innerL, TANKS[0].y);
		g.lineTo(TANKS[0].x, TANKS[0].y);
		g.lineTo(TANKS[1].x, TANKS[1].y);
		g.moveTo(innerL, TANKS[2].y);
		g.lineTo(TANKS[2].x, TANKS[2].y);
		g.stroke();
		g.strokeStyle = '#2b3634';
		g.lineWidth = 6;
		g.stroke();

		drawStencil(g, 'BIOLAB B-7', 330, 540, 34, 0.18);
		drawStencil(g, 'SPECIMEN CONTAINMENT', 330, 572, 13, 0.15);
		drawStencil(g, 'LEVEL IV BIO-HAZARD', 330, 886, 12, 0.14);

		// External pneumatic steel duct docking to Left 0A Vent
		{
			const ay = tcy(13);
			g.fillStyle = '#090c0c';
			g.fillRect(innerR - 72, ay - 27, 72, 54);
			g.fillStyle = '#283230';
			g.fillRect(innerR - 70, ay - 25, 70, 50);
			g.fillStyle = '#080b0b';
			g.fillRect(innerR - 64, ay - 16, 64, 32);
			drawHazardBand(g, innerR - 72, ay - 26, 7, 52, rand, 0.74, 0.3);
			drawHexBolt(g, innerR - 58, ay - 20, 1.8);
			drawHexBolt(g, innerR - 58, ay + 20, 1.8);
		}

		// Strictly contained dark bio-spill around Shattered Tank 3
		{
			const t3 = TANKS[2];
			const puddle = g.createRadialGradient(t3.x + 14, t3.y + 8, 12, t3.x + 18, t3.y + 10, 102);
			puddle.addColorStop(0, 'rgba(14, 24, 14, 0.92)');
			puddle.addColorStop(0.58, 'rgba(18, 28, 16, 0.65)');
			puddle.addColorStop(1, 'rgba(12, 20, 12, 0)');
			g.fillStyle = puddle;
			g.beginPath();
			g.ellipse(t3.x + 16, t3.y + 10, 98, 74, 0.22, 0, TAU);
			g.fill();

			g.fillStyle = 'rgba(176, 206, 164, 0.09)';
			g.beginPath();
			g.ellipse(t3.x - 4, t3.y - 12, 24, 6, -0.32, 0, TAU);
			g.fill();
		}

		// Overturned stainless steel lab table & scattered log sheets
		{
			for (let i = 0; i < 11; i++) {
				const nx = 148 + rand() * 145;
				const ny = 468 + rand() * 124;
				g.save();
				g.translate(nx, ny);
				g.rotate(rand() * TAU);
				g.fillStyle = 'rgba(0, 0, 0, 0.45)';
				g.fillRect(-5 + 1.5, -7 + 2, 11, 14);
				g.fillStyle = 'rgba(188, 192, 178, 0.42)';
				g.fillRect(-5, -7, 10, 13);
				g.fillStyle = 'rgba(42, 48, 46, 0.45)';
				g.fillRect(-3, -4, 6, 1);
				g.fillRect(-3, -1, 5, 1);
				g.fillRect(-3, 2, 6, 1);
				g.restore();
			}

			g.save();
			g.translate(182, 514);
			g.rotate(-0.24);
			g.fillStyle = 'rgba(0, 0, 0, 0.7)';
			g.fillRect(-54 + 6, -24 + 8, 110, 50);

			g.strokeStyle = '#525e5a';
			g.lineWidth = 4;
			g.beginPath();
			g.moveTo(-44, 22);
			g.lineTo(-48, 36);
			g.moveTo(42, 22);
			g.lineTo(46, 36);
			g.stroke();

			const bg = g.createLinearGradient(-54, -24, 54, 24);
			bg.addColorStop(0, '#4c5855');
			bg.addColorStop(1, '#252d2b');
			g.fillStyle = bg;
			g.fillRect(-54, -24, 108, 48);
			g.strokeStyle = '#0a0d0c';
			g.lineWidth = 1.6;
			g.strokeRect(-54, -24, 108, 48);

			g.fillStyle = '#181e1d';
			g.fillRect(-42, -14, 42, 24);
			g.fillStyle = '#2b453a';
			g.fillRect(-38, -10, 22, 14);
			g.fillStyle = '#eba334';
			g.fillRect(-12, -8, 4, 4);
			g.fillStyle = '#d24638';
			g.fillRect(-12, -1, 4, 4);
			g.restore();
		}

		// Static pedestal collars & tank chambers
		for (const tk of TANKS) {
			const { x, y, r, kind } = tk;
			g.save();

			for (let seg = 0; seg < 24; seg++) {
				g.fillStyle = seg % 2 === 0 ? 'rgba(184, 144, 44, 0.45)' : 'rgba(14, 18, 17, 0.55)';
				g.beginPath();
				g.arc(x, y, r + 23, (seg / 24) * TAU, ((seg + 1) / 24) * TAU);
				g.arc(x, y, r + 13, ((seg + 1) / 24) * TAU, (seg / 24) * TAU, true);
				g.closePath();
				g.fill();
			}

			g.fillStyle = 'rgba(0, 0, 0, 0.74)';
			g.beginPath();
			g.arc(x + 6, y + 8, r + 11, 0, TAU);
			g.fill();

			const ped = g.createLinearGradient(x - r, y - r, x + r, y + r);
			ped.addColorStop(0, '#56635f');
			ped.addColorStop(0.5, '#313b38');
			ped.addColorStop(1, '#181e1c');
			g.fillStyle = ped;
			g.beginPath();
			g.arc(x, y, r + 10, 0, TAU);
			g.fill();
			g.strokeStyle = '#080b0a';
			g.lineWidth = 2;
			g.stroke();

			for (let b = 0; b < 12; b++) {
				const a = (b / 12) * TAU;
				drawHexBolt(g, x + Math.cos(a) * (r + 5), y + Math.sin(a) * (r + 5), 2.1);
			}

			const inner = g.createRadialGradient(x - r * 0.28, y - r * 0.28, 4, x, y, r);
			if (kind === 'intact') {
				inner.addColorStop(0, '#4e7a52');
				inner.addColorStop(0.55, '#213c26');
				inner.addColorStop(1, '#09140c');
			} else {
				inner.addColorStop(0, '#151b19');
				inner.addColorStop(0.7, '#0b0e0d');
				inner.addColorStop(1, '#050707');
			}
			g.fillStyle = inner;
			g.beginPath();
			g.arc(x, y, r, 0, TAU);
			g.fill();

			if (kind === 'shattered') {
				g.strokeStyle = 'rgba(95, 112, 106, 0.24)';
				g.lineWidth = 1.4;
				g.beginPath();
				g.arc(x, y, r * 0.45, 0, TAU);
				g.stroke();

				g.fillStyle = 'rgba(188, 222, 214, 0.38)';
				g.strokeStyle = 'rgba(222, 246, 240, 0.48)';
				g.lineWidth = 0.8;
				for (let i = 0; i < 14; i++) {
					const a = (i / 14) * TAU + rand() * 0.2;
					const depth = r * (0.65 + rand() * 0.2);
					g.beginPath();
					g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
					g.lineTo(x + Math.cos(a + 0.08) * depth, y + Math.sin(a + 0.08) * depth);
					g.lineTo(x + Math.cos(a + 0.16) * r, y + Math.sin(a + 0.16) * r);
					g.closePath();
					g.fill();
					g.stroke();
				}

				for (let i = 0; i < 32; i++) {
					const a = rand() * TAU;
					const d = r + 14 + rand() * 76;
					const sx = x + Math.cos(a) * d;
					const sy = y + Math.sin(a) * d;
					if (sx > innerR - 16) continue;
					g.save();
					g.translate(sx, sy);
					g.rotate(rand() * TAU);
					g.fillStyle = `rgba(198, 230, 222, ${0.22 + rand() * 0.34})`;
					g.beginPath();
					g.moveTo(0, 0);
					g.lineTo(4 + rand() * 7, 1 + rand() * 2);
					g.lineTo(1 + rand() * 2, 4 + rand() * 6);
					g.closePath();
					g.fill();
					g.restore();
				}
			}
			g.restore();
		}

		g.restore();
	}

	// =========================================================================
	// 8. RIGHT COMPARTMENT: "OBSERVATION DECK // QUARANTINE" (STATIC BASE)
	// =========================================================================
	function paintRightObservationBase(g: CanvasRenderingContext2D, rand: () => number) {
		const { innerL, innerR, innerT, innerB } = RIGHT_ROOM;
		const rw = innerR - innerL;
		const rh = innerB - innerT;

		g.save();
		g.beginPath();
		g.rect(innerL, innerT, rw, rh);
		g.clip();

		g.fillStyle = '#151a19';
		g.fillRect(innerL, innerT, rw, rh);

		const slab = 48;
		for (let y = innerT; y < innerB; y += slab) {
			for (let x = innerL; x < innerR; x += slab) {
				const n = fbm(x * 0.015 + 7, y * 0.015 + 3);
				const v = Math.round(lerp(21, 29, n));
				const gr = g.createLinearGradient(x, y, x + slab, y + slab);
				gr.addColorStop(0, `rgb(${v}, ${v + 4}, ${v + 4})`);
				gr.addColorStop(1, `rgb(${v - 4}, ${v}, ${v})`);
				g.fillStyle = gr;
				g.fillRect(x + 1, y + 1, slab - 2, slab - 2);
				g.strokeStyle = 'rgba(4, 7, 7, 0.68)';
				g.lineWidth = 1;
				g.strokeRect(x + 0.5, y + 0.5, slab - 1, slab - 1);
				g.fillStyle = 'rgba(170, 192, 186, 0.04)';
				g.fillRect(x + 1.5, y + 1.5, slab - 3, 1);
			}
		}

		g.strokeStyle = 'rgba(196, 160, 68, 0.14)';
		g.lineWidth = 2;
		g.strokeRect(innerL + 22, innerT + 22, rw - 44, rh - 44);

		// External pneumatic steel duct docking to Right 0A Vent
		{
			const ay = tcy(13);
			g.fillStyle = '#090c0c';
			g.fillRect(innerL, ay - 27, 72, 54);
			g.fillStyle = '#283230';
			g.fillRect(innerL, ay - 25, 70, 50);
			g.fillStyle = '#080b0b';
			g.fillRect(innerL, ay - 16, 64, 32);
			drawHazardBand(g, innerL + 65, ay - 26, 7, 52, rand, 0.74, 0.3);
			drawHexBolt(g, innerL + 58, ay - 20, 1.8);
			drawHexBolt(g, innerL + 58, ay + 20, 1.8);
		}

		drawStencil(g, 'OBSERVATION DECK', 1600, 212, 22, 0.17);
		drawStencil(g, 'QUARANTINE', 1600, 240, 14, 0.14);

		// Bolted circular viewport collar
		{
			const { x, y, r } = VIEWPORT;
			g.save();
			const floorSpill = g.createRadialGradient(x + 18, y + 32, r * 0.85, x + 18, y + 32, r + 96);
			floorSpill.addColorStop(0, 'rgba(222, 128, 48, 0.25)');
			floorSpill.addColorStop(0.55, 'rgba(176, 86, 28, 0.1)');
			floorSpill.addColorStop(1, 'rgba(140, 62, 20, 0)');
			g.fillStyle = floorSpill;
			g.fillRect(x - r - 110, y - r - 110, (r + 110) * 2, (r + 110) * 2);

			g.fillStyle = 'rgba(0, 0, 0, 0.78)';
			g.beginPath();
			g.arc(x + 7, y + 9, r + 28, 0, TAU);
			g.fill();

			const colGrad = g.createLinearGradient(x - r, y - r, x + r, y + r);
			colGrad.addColorStop(0, '#576561');
			colGrad.addColorStop(0.5, '#333d3a');
			colGrad.addColorStop(1, '#19201e');
			g.fillStyle = colGrad;
			g.beginPath();
			g.arc(x, y, r + 26, 0, TAU);
			g.fill();
			g.strokeStyle = '#070909';
			g.lineWidth = 2.5;
			g.stroke();

			for (let i = 0; i < 36; i++) {
				g.fillStyle = i % 2 === 0 ? 'rgba(188, 148, 38, 0.74)' : '#141817';
				g.beginPath();
				g.arc(x, y, r + 14, (i / 36) * TAU, ((i + 1) / 36) * TAU);
				g.arc(x, y, r + 6, ((i + 1) / 36) * TAU, (i / 36) * TAU, true);
				g.closePath();
				g.fill();
			}

			for (let b = 0; b < 20; b++) {
				const a = (b / 20) * TAU;
				drawHexBolt(g, x + Math.cos(a) * (r + 20), y + Math.sin(a) * (r + 20), 2.6);
			}

			g.fillStyle = '#040606';
			g.beginPath();
			g.arc(x, y, r + 4, 0, TAU);
			g.fill();
			g.restore();
		}

		// Curved monitoring console chassis
		{
			const cx = OBS_CONSOLE.x;
			const cy = OBS_CONSOLE.y;
			g.save();
			g.translate(cx, cy);

			g.fillStyle = 'rgba(0, 0, 0, 0.72)';
			g.beginPath();
			g.arc(4, 18, 92, Math.PI * 1.12, Math.PI * 1.72);
			g.arc(4, 18, 52, Math.PI * 1.72, Math.PI * 1.12, true);
			g.closePath();
			g.fill();

			const cg = g.createLinearGradient(-85, -75, 65, 10);
			cg.addColorStop(0, '#4e5b58');
			cg.addColorStop(1, '#232a28');
			g.fillStyle = cg;
			g.beginPath();
			g.arc(0, 14, 90, Math.PI * 1.12, Math.PI * 1.72);
			g.arc(0, 14, 52, Math.PI * 1.72, Math.PI * 1.12, true);
			g.closePath();
			g.fill();
			g.strokeStyle = '#080b0a';
			g.lineWidth = 1.6;
			g.stroke();
			g.restore();
		}

		// Overturned office swivel chair
		{
			g.save();
			g.translate(1484, 836);
			g.rotate(-0.78);
			g.fillStyle = 'rgba(0, 0, 0, 0.65)';
			g.beginPath();
			g.ellipse(4, 5, 22, 18, 0, 0, TAU);
			g.fill();
			g.strokeStyle = '#4b5754';
			g.lineWidth = 2.6;
			for (let k = 0; k < 5; k++) {
				const a = (k / 5) * TAU;
				g.beginPath();
				g.moveTo(0, 0);
				g.lineTo(Math.cos(a) * 19, Math.sin(a) * 19);
				g.stroke();
			}
			g.fillStyle = '#222928';
			g.beginPath();
			g.roundRect(-14, -18, 28, 22, 5);
			g.fill();
			g.strokeStyle = '#0b0e0d';
			g.lineWidth = 1.4;
			g.stroke();
			g.fillStyle = '#384340';
			g.fillRect(-12, -16, 24, 5);
			g.restore();
		}

		// Fallen crew member in dark hazard suit
		{
			g.save();
			g.translate(CREW_BODY.x, CREW_BODY.y);
			g.rotate(CREW_BODY.angle);

			const pool = g.createRadialGradient(8, -5, 4, 8, -5, 40);
			pool.addColorStop(0, 'rgba(48, 8, 8, 0.88)');
			pool.addColorStop(0.65, 'rgba(34, 6, 6, 0.6)');
			pool.addColorStop(1, 'rgba(24, 4, 4, 0)');
			g.fillStyle = pool;
			g.beginPath();
			g.ellipse(8, -5, 40, 29, 0.25, 0, TAU);
			g.fill();

			g.fillStyle = 'rgba(220, 175, 165, 0.08)';
			g.beginPath();
			g.ellipse(2, -13, 11, 3.0, 0.25, 0, TAU);
			g.fill();

			const suit = '#464d44';
			const suitHi = '#606a5e';
			const dark = '#151918';

			g.lineCap = 'round';
			g.strokeStyle = 'rgba(0, 0, 0, 0.7)';
			g.lineWidth = 11.5;
			const limbs = [
				[-8, 6, -21, 30],
				[8, 6, 15, 32],
				[-11, -15, -30, -5],
				[11, -15, 22, -31]
			];
			for (const [x0, y0, x1, y1] of limbs) {
				g.beginPath();
				g.moveTo(x0 + 2.2, y0 + 2.8);
				g.lineTo(x1 + 2.2, y1 + 2.8);
				g.stroke();
			}

			g.strokeStyle = suit;
			g.lineWidth = 8.8;
			for (const [x0, y0, x1, y1] of limbs) {
				g.beginPath();
				g.moveTo(x0, y0);
				g.lineTo(x1, y1);
				g.stroke();
			}

			g.fillStyle = dark;
			for (const [bx, by] of [
				[-22, 31],
				[16, 33],
				[-31, -4],
				[23, -32]
			]) {
				g.beginPath();
				g.arc(bx, by, 4.2, 0, TAU);
				g.fill();
			}

			g.fillStyle = dark;
			g.beginPath();
			g.roundRect(-14, -21, 28, 32, 8);
			g.fill();
			g.fillStyle = suit;
			g.beginPath();
			g.roundRect(-12.5, -19.5, 25, 29, 7);
			g.fill();

			g.fillStyle = suitHi;
			g.fillRect(-10, -18, 20, 4);
			g.fillStyle = 'rgba(196, 154, 52, 0.62)';
			g.fillRect(-12, -8, 24, 3);

			g.fillStyle = dark;
			g.beginPath();
			g.arc(0, -29, 9.5, 0, TAU);
			g.fill();
			g.fillStyle = '#3a423e';
			g.beginPath();
			g.arc(0, -29, 8.2, 0, TAU);
			g.fill();
			g.fillStyle = '#182124';
			g.beginPath();
			g.ellipse(0, -32.5, 5.4, 3.1, 0, 0, TAU);
			g.fill();
			g.strokeStyle = 'rgba(218, 232, 228, 0.5)';
			g.lineWidth = 0.8;
			g.beginPath();
			g.moveTo(-3, -34);
			g.lineTo(0, -31);
			g.lineTo(4, -33.5);
			g.stroke();

			g.restore();
		}

		g.restore();
	}

	// =========================================================================
	// 9. COMPLETELY CLEAN MAZE CORRIDOR FLOORS (ZERO GRATES, ZERO GREEN LINES!)
	// =========================================================================
	function paintCleanCorridorFloors(g: CanvasRenderingContext2D, rand: () => number) {
		g.save();
		g.beginPath();
		g.rect(MAZE_L, MAZE_T, MAZE_R - MAZE_L, MAZE_B - MAZE_T);
		g.clip();

		// Quiet dark matte steel stage (#141918 .. #1a201e)
		g.fillStyle = '#141918';
		g.fillRect(MAZE_L, MAZE_T, MAZE_R - MAZE_L, MAZE_B - MAZE_T);

		for (let y = 1; y < ROWS - 1; y++) {
			for (let x = 1; x < COLS - 1; x++) {
				if (!isCorridorFloor(x, y)) continue;
				const px = tx(x);
				const py = ty(y);
				const n = fbm(x * 0.24, y * 0.24);

				// Smooth matte dark steel plate (#141918 to #1a201e)
				const v = Math.round(lerp(20, 26, n));
				const tg = g.createLinearGradient(px, py, px + TILE, py + TILE);
				tg.addColorStop(0, `rgb(${v + 1}, ${v + 6}, ${v + 5})`);
				tg.addColorStop(1, `rgb(${v - 2}, ${v + 2}, ${v + 1})`);
				g.fillStyle = tg;
				g.fillRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);

				// Ultra-subtle 1px recessed plate seam
				g.strokeStyle = 'rgba(4, 7, 7, 0.64)';
				g.lineWidth = 1;
				g.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);

				// Barely-there top-left steel bevel catch
				g.fillStyle = 'rgba(170, 192, 186, 0.032)';
				g.fillRect(px + 1.5, py + 1.5, TILE - 3, 0.8);

				// Subtle satin walkway center sheen along straight corridors (NO grates, NO grids!)
				const up = isCorridorFloor(x, y - 1);
				const dn = isCorridorFloor(x, y + 1);
				const lf = isCorridorFloor(x - 1, y);
				const rt = isCorridorFloor(x + 1, y);

				if (lf && rt && !up && !dn) {
					g.fillStyle = 'rgba(176, 196, 190, 0.026)';
					g.fillRect(px, py + TILE * 0.34, TILE, TILE * 0.32);
				} else if (up && dn && !lf && !rt) {
					g.fillStyle = 'rgba(176, 196, 190, 0.026)';
					g.fillRect(px + TILE * 0.34, py, TILE * 0.32, TILE);
				}

				// Tiny muted corner micro-rivets on sparse plates for industrial tactility
				if ((x + y) % 2 === 0) {
					g.fillStyle = 'rgba(6, 9, 9, 0.55)';
					g.fillRect(px + 3, py + 3, 1.3, 1.3);
					g.fillRect(px + TILE - 4.3, py + TILE - 4.3, 1.3, 1.3);
				}
			}
		}

		// Restrained worn hazard threshold strictly in front of the central lair gate (LE)
		if (opts.lairDoors !== false)
			drawHazardBand(g, tx(11), ty(11) - 5, TILE * 3, 5, rand, 0.68, 0.45);
		g.restore();
	}

	// =========================================================================
	// 10. UNIFIED 2.5D BULKHEAD WALLS & ENGINEERING ROOF MODULES
	// =========================================================================
	function buildUnifiedWallGeometries() {
		const [fullMask, fg] = makeStageCanvas();
		const [roofMask, rg] = makeStageCanvas();

		fg.fillStyle = '#ffffff';
		rg.fillStyle = '#ffffff';

		const addWallRect = (x: number, y: number, w: number, h: number, hasSouthOpen: boolean) => {
			fg.fillRect(x, y, w, h);
			rg.fillRect(x, y, w, hasSouthOpen ? h - FACADE_H : h);
		};

		// 1. ALL Maze WL tiles (outer perimeter 100% solid & intact)
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				if (!isWall(x, y)) continue;
				const southIsWall = isWall(x, y + 1);
				const southIsVoid = isVoid(x, y + 1);
				addWallRect(tx(x) - 0.3, ty(y) - 0.3, TILE + 0.6, TILE + 0.6, !southIsWall && !southIsVoid);
			}
		}

		// 2. Left Biolab Outer Bulkheads
		addWallRect(
			LEFT_ROOM.outerL,
			LEFT_ROOM.outerT,
			LEFT_ROOM.innerR - LEFT_ROOM.outerL + 1,
			TILE,
			true
		);
		addWallRect(
			LEFT_ROOM.outerL,
			LEFT_ROOM.innerB,
			LEFT_ROOM.innerR - LEFT_ROOM.outerL + 1,
			TILE,
			false
		);
		addWallRect(
			LEFT_ROOM.outerL,
			LEFT_ROOM.outerT,
			TILE,
			LEFT_ROOM.outerB - LEFT_ROOM.outerT,
			false
		);

		// 3. Right Observation Deck Outer Bulkheads
		addWallRect(
			RIGHT_ROOM.innerL - 1,
			RIGHT_ROOM.outerT,
			RIGHT_ROOM.outerR - RIGHT_ROOM.innerL + 1,
			TILE,
			true
		);
		addWallRect(
			RIGHT_ROOM.innerL - 1,
			RIGHT_ROOM.innerB,
			RIGHT_ROOM.outerR - RIGHT_ROOM.innerL + 1,
			TILE,
			false
		);
		addWallRect(
			RIGHT_ROOM.innerR,
			RIGHT_ROOM.outerT,
			TILE,
			RIGHT_ROOM.outerB - RIGHT_ROOM.outerT,
			false
		);

		return { fullMask, roofMask };
	}

	function paint25DWallsAndModules(g: CanvasRenderingContext2D, wallGeom: WallGeometry) {
		const { fullMask, roofMask } = wallGeom;

		// --- Pass 1: Soft AO & crisp directional drop shadow onto corridor floors ---
		{
			const [aoC, aoG] = makeStageCanvas();
			aoG.setTransform(1, 0, 0, 1, 0, 0);
			aoG.filter = `blur(${4 * BAKE_SCALE}px)`;
			aoG.drawImage(tintMask(fullMask, 'rgba(0, 0, 0, 0.72)'), 0, 0);
			g.drawImage(aoC, 0, 0, STAGE_W, STAGE_H);

			const [shC, shG] = makeStageCanvas();
			shG.setTransform(1, 0, 0, 1, 0, 0);
			shG.filter = `blur(${1.5 * BAKE_SCALE}px)`;
			shG.drawImage(tintMask(fullMask, 'rgba(0, 0, 0, 0.82)'), 3.5 * BAKE_SCALE, 5.2 * BAKE_SCALE);
			g.drawImage(shC, 0, 0, STAGE_W, STAGE_H);
		}

		// --- Pass 2: 2.5D Vertical South-Facing Bulkhead Skirt (#242c29..#101413) ---
		const drawSouthSkirt = (x: number, y: number, w: number, h: number) => {
			const fg = g.createLinearGradient(0, y, 0, y + h);
			fg.addColorStop(0, '#242c29');
			fg.addColorStop(0.58, '#1d2321');
			fg.addColorStop(1, '#101413');
			g.fillStyle = fg;
			g.fillRect(x, y, w, h);

			g.fillStyle = 'rgba(0, 0, 0, 0.65)';
			g.fillRect(x, y, w, 1.3);

			for (let rx = x + 6; rx < x + w - 4; rx += 10) {
				g.fillStyle = 'rgba(0, 0, 0, 0.48)';
				g.fillRect(rx, y + 1.3, 1.6, h - 2.6);
				g.fillStyle = 'rgba(155, 175, 168, 0.12)';
				g.fillRect(rx + 1.6, y + 1.3, 0.8, h - 2.6);
			}

			g.fillStyle = '#080b0a';
			g.fillRect(x, y + h - 1.3, w, 1.3);
		};

		for (let y = 1; y < ROWS - 1; y++) {
			for (let x = 1; x < COLS - 1; x++) {
				if (!isWall(x, y)) continue;
				if (isWall(x, y + 1) || isVoid(x, y + 1)) continue;
				drawSouthSkirt(tx(x), ty(y) + TILE - FACADE_H, TILE, FACADE_H);
			}
		}

		drawSouthSkirt(
			LEFT_ROOM.innerL,
			LEFT_ROOM.innerT - FACADE_H,
			LEFT_ROOM.innerR - LEFT_ROOM.innerL,
			FACADE_H
		);
		drawSouthSkirt(
			RIGHT_ROOM.innerL,
			RIGHT_ROOM.innerT - FACADE_H,
			RIGHT_ROOM.innerR - RIGHT_ROOM.innerL,
			FACADE_H
		);

		// --- Pass 3: CLEAN MATTE BRUSHED QUARANTINE STEEL ROOFS & UNIFIED WALL MODULES ---
		const [roofCanvas, rg] = makeStageCanvas();

		const roofGrad = rg.createLinearGradient(62, 115, 1858, 965);
		roofGrad.addColorStop(0, '#4e5956');
		roofGrad.addColorStop(0.5, '#424d4a');
		roofGrad.addColorStop(1, '#38423f');
		rg.fillStyle = roofGrad;
		rg.fillRect(0, 0, STAGE_W, STAGE_H);

		// Outer perimeter walls: clean solid steel panels
		for (let y = 1; y < ROWS - 1; y++) {
			for (let x = 1; x < COLS - 1; x++) {
				if (!isWall(x, y) || !isOuterPerimeterWall(x, y)) continue;
				const px = tx(x);
				const py = ty(y);
				const southOpen = !isWall(x, y + 1) && !isVoid(x, y + 1);
				const rh = southOpen ? TILE - FACADE_H : TILE;
				const n = fbm(x * 0.22, y * 0.22);
				rg.fillStyle =
					n > 0.5
						? `rgba(210, 226, 220, ${(n - 0.5) * 0.12})`
						: `rgba(10, 14, 13, ${(0.5 - n) * 0.15})`;
				rg.fillRect(px, py, TILE, rh);
				if ((x + y) % 2 === 0) {
					rg.strokeStyle = 'rgba(10, 14, 13, 0.5)';
					rg.lineWidth = 1.2;
					if (x === 1 || x === COLS - 2) {
						rg.beginPath();
						rg.moveTo(px, py);
						rg.lineTo(px + TILE, py);
						rg.stroke();
					} else {
						rg.beginPath();
						rg.moveTo(px, py);
						rg.lineTo(px, py + rh);
						rg.stroke();
					}
				}
			}
		}

		// Unified Interior Engineering Wall Modules (always remain brushed steel — never color-swapped!)
		for (const m of WALL_MODULES) {
			const { bayX, bayY, bayW, bayH, horiz, hwKind, stencil, wTiles, hTiles } = m;
			if (bayW < 6 || bayH < 6) continue;

			// Subtle recessed module frame
			rg.fillStyle = 'rgba(12, 17, 16, 0.44)';
			rg.fillRect(bayX, bayY, bayW, bayH);

			const bGrad = rg.createLinearGradient(bayX, bayY, bayX + bayW, bayY + bayH);
			bGrad.addColorStop(0, '#495552');
			bGrad.addColorStop(1, '#394340');
			rg.fillStyle = bGrad;
			rg.fillRect(bayX + 1.2, bayY + 1.2, bayW - 2.4, bayH - 2.4);

			rg.fillStyle = 'rgba(196, 214, 208, 0.16)';
			rg.fillRect(bayX + 1.2, bayY + 1.2, bayW - 2.4, 0.9);
			rg.fillRect(bayX + 1.2, bayY + 1.2, 0.9, bayH - 2.4);

			if (hwKind === 'busbar') {
				rg.fillStyle = '#1c2321';
				if (horiz) {
					rg.fillRect(bayX + 4, bayY + bayH * 0.28, bayW - 8, bayH * 0.44);
					rg.fillStyle = '#525e5b';
					rg.fillRect(bayX + 6, bayY + bayH * 0.36, bayW - 12, 2.2);
					rg.fillRect(bayX + 6, bayY + bayH * 0.58, bayW - 12, 2.2);
					rg.fillStyle = '#2b3431';
					for (let cx = bayX + 18; cx < bayX + bayW - 14; cx += 24) {
						rg.fillRect(cx, bayY + bayH * 0.24, 4, bayH * 0.52);
					}
				} else {
					rg.fillRect(bayX + bayW * 0.28, bayY + 4, bayW * 0.44, bayH - 8);
					rg.fillStyle = '#525e5b';
					rg.fillRect(bayX + bayW * 0.36, bayY + 6, 2.2, bayH - 12);
					rg.fillRect(bayX + bayW * 0.58, bayY + 6, 2.2, bayH - 12);
					rg.fillStyle = '#2b3431';
					for (let cy = bayY + 18; cy < bayY + bayH - 14; cy += 24) {
						rg.fillRect(bayX + bayW * 0.24, cy, bayW * 0.52, 4);
					}
				}
			} else if (hwKind === 'hatch') {
				const pad = 4;
				if (bayW > 14 && bayH > 10) {
					rg.strokeStyle = 'rgba(10, 14, 13, 0.58)';
					rg.lineWidth = 1.1;
					rg.strokeRect(bayX + pad, bayY + pad, bayW - pad * 2, bayH - pad * 2);
					rg.fillStyle = '#181e1c';
					if (horiz) rg.fillRect(bayX + bayW * 0.5 - 7, bayY + bayH * 0.5 - 2, 14, 4);
					else rg.fillRect(bayX + bayW * 0.5 - 2, bayY + bayH * 0.5 - 7, 4, 14);
					drawHexBolt(rg, bayX + pad + 2.5, bayY + pad + 2.5, 1.15);
					drawHexBolt(rg, bayX + bayW - pad - 2.5, bayY + bayH - pad - 2.5, 1.15);
				}
			} else if (hwKind === 'stencil') {
				drawStencil(rg, stencil, bayX + bayW / 2, bayY + bayH / 2 + 0.5, 9.5, 0.22);
				drawHexBolt(rg, bayX + 4, bayY + 4, 1.1);
				drawHexBolt(rg, bayX + bayW - 4, bayY + bayH - 4, 1.1);
			} else if (hwKind === 'fan') {
				const r = Math.min(bayW, bayH) * 0.42;
				if (r >= 5.5) {
					const centers =
						horiz && wTiles >= 4
							? [
									[bayX + bayW * 0.28, bayY + bayH * 0.5],
									[bayX + bayW * 0.72, bayY + bayH * 0.5]
								]
							: [[bayX + bayW * 0.5, bayY + bayH * 0.5]];
					for (const [fcx, fcy] of centers) {
						rg.fillStyle = '#101514';
						rg.beginPath();
						rg.arc(fcx, fcy, r + 1.5, 0, TAU);
						rg.fill();
						rg.strokeStyle = 'rgba(175, 194, 188, 0.22)';
						rg.lineWidth = 1;
						rg.stroke();
					}
				}
			} else if (hwKind === 'cap') {
				drawHexBolt(rg, bayX + bayW * 0.5, bayY + bayH * 0.5, 1.5);
			}

			if (wTiles >= 3 || hTiles >= 3) {
				drawHexBolt(rg, m.rx + 2.6, m.ry + 2.6, 1.1);
				drawHexBolt(rg, m.rx + m.rw - 2.6, m.ry + m.rh - 2.6, 1.1);
			}
		}

		// Outer armor panel joints along Left & Right Room exterior bulkheads
		rg.strokeStyle = 'rgba(12, 16, 15, 0.62)';
		rg.lineWidth = 1.4;
		for (let x = LEFT_ROOM.outerL + 48; x < RIGHT_ROOM.outerR; x += 68) {
			rg.beginPath();
			rg.moveTo(x, MAZE_T);
			rg.lineTo(x, MAZE_T + TILE);
			rg.moveTo(x, MAZE_B - TILE);
			rg.lineTo(x, MAZE_B);
			rg.stroke();
		}
		for (let y = MAZE_T + 48; y < MAZE_B; y += 68) {
			rg.beginPath();
			rg.moveTo(LEFT_ROOM.outerL, y);
			rg.lineTo(LEFT_ROOM.innerL, y);
			rg.moveTo(RIGHT_ROOM.innerR, y);
			rg.lineTo(RIGHT_ROOM.outerR, y);
			rg.stroke();
		}

		// Clip roof steel to unified roofMask
		rg.setTransform(1, 0, 0, 1, 0, 0);
		rg.globalCompositeOperation = 'destination-in';
		rg.drawImage(roofMask, 0, 0);
		rg.globalCompositeOperation = 'source-over';

		// Crisp 1.5px upper-left metallic bevel (#7d8d88) & dark lower-right lip
		rg.drawImage(tintMask(edgeMask(roofMask, 1.5 * BAKE_SCALE, 1.5 * BAKE_SCALE), '#7d8d88'), 0, 0);
		rg.drawImage(
			tintMask(edgeMask(roofMask, -1.6 * BAKE_SCALE, -1.6 * BAKE_SCALE), 'rgba(8, 11, 10, 0.88)'),
			0,
			0
		);

		g.drawImage(roofCanvas, 0, 0, STAGE_W, STAGE_H);

		// --- Pass 4: 4 INTACT RECESSED ARMORED OBSERVATION WINDOWS ---
		const drawIntactArmoredWindow = (
			wx: number,
			wy: number,
			wh: number,
			hairlineCracked: boolean
		) => {
			g.save();
			g.fillStyle = '#171e1d';
			g.fillRect(wx + 6, wy + 2, TILE - 12, wh - 4);
			g.strokeStyle = '#080b0a';
			g.lineWidth = 1.6;
			g.strokeRect(wx + 6, wy + 2, TILE - 12, wh - 4);

			const glassGrad = g.createLinearGradient(wx + 9, wy, wx + TILE - 9, wy);
			glassGrad.addColorStop(0, 'rgba(116, 174, 168, 0.34)');
			glassGrad.addColorStop(0.5, 'rgba(168, 218, 212, 0.44)');
			glassGrad.addColorStop(1, 'rgba(96, 152, 146, 0.28)');
			g.fillStyle = glassGrad;
			g.fillRect(wx + 10, wy + 5, TILE - 20, wh - 10);

			g.strokeStyle = 'rgba(224, 246, 242, 0.48)';
			g.lineWidth = 1.2;
			g.beginPath();
			g.moveTo(wx + 13.5, wy + 5);
			g.lineTo(wx + 13.5, wy + wh - 5);
			g.stroke();

			g.fillStyle = '#4c5754';
			for (let m = 0; m <= 4; m++) {
				const my = wy + (m / 4) * (wh - 5);
				g.fillRect(wx + 5, my, TILE - 10, 5);
				g.fillStyle = 'rgba(0, 0, 0, 0.65)';
				g.fillRect(wx + 5, my + 5, TILE - 10, 1);
				g.fillStyle = '#4c5754';
			}

			if (hairlineCracked) {
				const cy = wy + wh * 0.62;
				g.strokeStyle = 'rgba(225, 246, 242, 0.55)';
				g.lineWidth = 0.85;
				g.beginPath();
				g.moveTo(wx + 11, cy - 8);
				g.lineTo(wx + 18, cy);
				g.lineTo(wx + 13, cy + 10);
				g.moveTo(wx + 18, cy);
				g.lineTo(wx + 23, cy + 5);
				g.stroke();
			}
			g.restore();
		};

		drawIntactArmoredWindow(tx(1), ty(4), TILE * 4, false);
		drawIntactArmoredWindow(tx(1), ty(19), TILE * 4, true);
		drawIntactArmoredWindow(tx(COLS - 2), ty(4), TILE * 4, false);
		drawIntactArmoredWindow(tx(COLS - 2), ty(19), TILE * 4, false);
	}

	// =========================================================================
	// 11. RECESSED AIRLOCK VENTS (0A, 0B, 0C) & SUNKEN CENTRAL LAIR PIT
	// =========================================================================
	function paintAirlockVents(g: CanvasRenderingContext2D, rand: () => number) {
		for (let y = 0; y < ROWS; y++) {
			for (let x = 0; x < COLS; x++) {
				if (!isTeleport(x, y)) continue;
				const cx = tcx(x);
				const cy = tcy(y);
				const s = TILE * 0.46;

				g.save();
				// Subtle 4px caution ticks right at the inner edges of the 6 airlock vents
				if (x === 1) drawHazardBand(g, tx(2), ty(y) + 3, 4, TILE - 6, rand, 0.62, 0.3);
				else if (x === COLS - 2)
					drawHazardBand(g, tx(COLS - 2) - 4, ty(y) + 3, 4, TILE - 6, rand, 0.62, 0.3);
				else if (y === 1) drawHazardBand(g, tx(x) + 3, ty(2), TILE - 6, 4, rand, 0.62, 0.3);
				else drawHazardBand(g, tx(x) + 3, ty(ROWS - 2) - 4, TILE - 6, 4, rand, 0.62, 0.3);

				g.fillStyle = '#050707';
				g.beginPath();
				g.roundRect(cx - s - 2, cy - s - 2, (s + 2) * 2, (s + 2) * 2, 4);
				g.fill();

				const frame = g.createLinearGradient(cx - s, cy - s, cx + s, cy + s);
				frame.addColorStop(0, '#5e6b67');
				frame.addColorStop(1, '#2a3230');
				g.fillStyle = frame;
				g.beginPath();
				g.roundRect(cx - s, cy - s, s * 2, s * 2, 3);
				g.fill();

				const inner = s - 4;
				g.fillStyle = '#040606';
				g.fillRect(cx - inner, cy - inner, inner * 2, inner * 2);

				const horiz = x === 1 || x === COLS - 2;
				for (let k = -inner + 2.4; k < inner - 1; k += 4.3) {
					g.fillStyle = '#36413e';
					if (horiz) {
						g.fillRect(cx + k, cy - inner, 2.2, inner * 2);
						g.fillStyle = 'rgba(196, 216, 210, 0.26)';
						g.fillRect(cx + k, cy - inner, 0.8, inner * 2);
					} else {
						g.fillRect(cx - inner, cy + k, inner * 2, 2.2);
						g.fillStyle = 'rgba(196, 216, 210, 0.26)';
						g.fillRect(cx - inner, cy + k, inner * 2, 0.8);
					}
				}

				for (const [rx, ry] of [
					[-s + 2.5, -s + 2.5],
					[s - 2.5, -s + 2.5],
					[-s + 2.5, s - 2.5],
					[s - 2.5, s - 2.5]
				]) {
					drawHexBolt(g, cx + rx, cy + ry, 1.25);
				}
				g.restore();
			}
		}
	}

	function paintCentralLairPitAndDoors(g: CanvasRenderingContext2D, rand: () => number) {
		const lx = tx(10);
		const ly = ty(12);
		const lw = TILE * 5;
		const lh = TILE * 3;
		const cx = lx + lw / 2;
		const cy = ly + lh / 2;

		g.save();
		g.beginPath();
		g.rect(lx, ly, lw, lh);
		g.clip();

		// Deep sunken biomechanical pit floor
		const pit = g.createRadialGradient(cx, cy, 8, cx, cy, lw * 0.68);
		pit.addColorStop(0, '#1c2114');
		pit.addColorStop(0.55, '#0d110c');
		pit.addColorStop(1, '#050706');
		g.fillStyle = pit;
		g.fillRect(lx, ly, lw, lh);

		const subGlow = g.createRadialGradient(cx, cy, 6, cx, cy, lw * 0.45);
		subGlow.addColorStop(0, 'rgba(168, 150, 62, 0.28)');
		subGlow.addColorStop(0.6, 'rgba(124, 114, 48, 0.12)');
		subGlow.addColorStop(1, 'rgba(80, 74, 30, 0)');
		g.fillStyle = subGlow;
		g.fillRect(lx, ly, lw, lh);

		// Central spinal vertebral ridge
		g.fillStyle = '#080b08';
		g.fillRect(lx + 14, cy - 6.5, lw - 28, 13);
		for (let vx = lx + 20; vx <= lx + lw - 20; vx += 13) {
			g.fillStyle = '#161b14';
			g.beginPath();
			g.ellipse(vx, cy, 4.8, 9.2, 0, 0, TAU);
			g.fill();
			g.fillStyle = '#9ca896';
			g.beginPath();
			g.ellipse(vx - 0.8, cy - 1.5, 2.8, 5.2, -0.25, 0, TAU);
			g.fill();
			g.fillStyle = 'rgba(230, 236, 217, 0.85)';
			g.beginPath();
			g.ellipse(vx - 1.5, cy - 3.2, 1.3, 2.1, -0.3, 0, TAU);
			g.fill();
		}

		// Radial spinal bone-ash chitin arches lining inner pit perimeter
		const drawPitBoneArch = (
			x0: number,
			y0: number,
			mx: number,
			my: number,
			x1: number,
			y1: number,
			w: number
		) => {
			g.lineCap = 'round';
			g.strokeStyle = '#080b09';
			g.lineWidth = w + 3.4;
			g.beginPath();
			g.moveTo(x0 + 1.2, y0 + 1.5);
			g.quadraticCurveTo(mx + 1.2, my + 1.5, x1 + 1.2, y1 + 1.5);
			g.stroke();

			g.strokeStyle = '#5c6858';
			g.lineWidth = w;
			g.beginPath();
			g.moveTo(x0, y0);
			g.quadraticCurveTo(mx, my, x1, y1);
			g.stroke();

			g.strokeStyle = '#96a48e';
			g.lineWidth = Math.max(1.0, w * 0.48);
			g.beginPath();
			g.moveTo(x0 - 0.5, y0 - 0.5);
			g.quadraticCurveTo(mx - 0.65, my - 0.65, x1 - 0.5, y1 - 0.5);
			g.stroke();

			g.strokeStyle = 'rgba(216, 228, 208, 0.72)';
			g.lineWidth = 0.8;
			g.beginPath();
			g.moveTo(x0 - 0.9, y0 - 0.9);
			g.quadraticCurveTo(mx - 1.1, my - 1.1, x1 - 0.9, y1 - 0.9);
			g.stroke();
		};

		for (let i = 0; i < 11; i++) {
			const rx = lx + 11 + (i / 10) * (lw - 22);
			const curve = (i - 5) * 2.0;
			drawPitBoneArch(
				rx,
				ly - 2,
				rx + curve,
				ly + 12,
				rx + curve * 0.55,
				ly + 23 + (i % 2) * 4,
				3.6
			);
			drawPitBoneArch(
				rx,
				ly + lh + 2,
				rx + curve,
				ly + lh - 12,
				rx + curve * 0.55,
				ly + lh - 23 - (i % 2) * 4,
				3.6
			);
		}
		for (let i = 0; i < 6; i++) {
			const ry = ly + 10 + (i / 5) * (lh - 20);
			const curve = (i - 2.5) * 2.2;
			drawPitBoneArch(lx - 2, ry, lx + 12, ry + curve, lx + 25, ry + curve * 0.5, 3.8);
			drawPitBoneArch(
				lx + lw + 2,
				ry,
				lx + lw - 12,
				ry + curve,
				lx + lw - 25,
				ry + curve * 0.5,
				3.8
			);
		}

		const shT = g.createLinearGradient(lx, ly, lx, ly + 16);
		shT.addColorStop(0, 'rgba(0,0,0,0.88)');
		shT.addColorStop(1, 'rgba(0,0,0,0)');
		g.fillStyle = shT;
		g.fillRect(lx, ly, lw, 16);

		const shL = g.createLinearGradient(lx, ly, lx + 16, ly);
		shL.addColorStop(0, 'rgba(0,0,0,0.84)');
		shL.addColorStop(1, 'rgba(0,0,0,0)');
		g.fillStyle = shL;
		g.fillRect(lx, ly, 16, lh);
		g.restore();

		if (opts.lairDoors !== false) {
			// --- HEAVY YELLOW-BLACK BLAST DOORS AT LE (row 11, cols 11..13) BENT OUTWARD ---
			const gateL = tx(11);
			const gateR = tx(14);
			const gateY = ty(11) + TILE * 0.52;
			const halfSpan = (gateR - gateL) / 2;

			g.save();
			g.fillStyle = '#080b0b';
			g.fillRect(gateL, ty(11) + 4, gateR - gateL, TILE - 8);
			g.strokeStyle = 'rgba(130, 148, 142, 0.18)';
			g.lineWidth = 1;
			g.strokeRect(gateL + 2, ty(11) + 6, gateR - gateL - 4, TILE - 12);

			for (const side of [-1, 1]) {
				g.save();
				const hingeX = side < 0 ? gateL + 1 : gateR - 1;
				const doorW = halfSpan - 8;
				const doorH = 14.5;
				g.translate(hingeX, gateY);
				g.rotate(side < 0 ? -0.36 : 0.36);

				const x0 = side < 0 ? 0 : -doorW;
				g.fillStyle = 'rgba(0, 0, 0, 0.84)';
				g.fillRect(x0 + 2, -doorH / 2 + 4, doorW, doorH + 2);

				g.beginPath();
				if (side < 0) {
					g.moveTo(0, -doorH / 2);
					g.lineTo(doorW - 2, -doorH / 2);
					g.lineTo(doorW + 3.5, -doorH * 0.16);
					g.lineTo(doorW - 3, doorH * 0.14);
					g.lineTo(doorW + 1.5, doorH / 2);
					g.lineTo(0, doorH / 2);
				} else {
					g.moveTo(0, -doorH / 2);
					g.lineTo(-doorW + 2, -doorH / 2);
					g.lineTo(-doorW - 3.5, -doorH * 0.16);
					g.lineTo(-doorW + 3, doorH * 0.14);
					g.lineTo(-doorW - 1.5, doorH / 2);
					g.lineTo(0, doorH / 2);
				}
				g.closePath();

				const dg = g.createLinearGradient(0, -doorH / 2, 0, doorH / 2);
				dg.addColorStop(0, '#4c5854');
				dg.addColorStop(0.5, '#2b3330');
				dg.addColorStop(1, '#161b1a');
				g.fillStyle = dg;
				g.fill();

				g.save();
				g.clip();
				drawHazardBand(g, x0, -doorH / 2, doorW, 5.5, rand, 0.88, 0.5);
				g.restore();

				g.strokeStyle = 'rgba(196, 214, 208, 0.44)';
				g.lineWidth = 1.1;
				g.stroke();
				drawHexBolt(g, side < 0 ? 4 : -4, 0, 2.2);
				g.restore();
			}

			g.strokeStyle = '#7b8c86';
			g.lineWidth = 2.2;
			g.beginPath();
			g.moveTo(gateL + 4, gateY + 6);
			g.lineTo(gateL + 20, gateY - 4);
			g.moveTo(gateR - 4, gateY + 6);
			g.lineTo(gateR - 18, gateY - 3);
			g.stroke();
			g.restore();
		}
	}

	// =========================================================================
	// 12. RESTRAINED, NATURAL ORGANIC INFESTATION ("БЕЗ ФАНАТИЗМА")
	//     - Glossy obsidian-resin (#0b0e0c), dark olive-chitin (#2b3328),
	//       muted sage ridges (#5c6858), delicate wet highlight (rgba(195,212,190,0.42))
	//     - Flowing branching veins/roots hugging wall bases & curling into corners
	//       (corridor center 100% open & clean for compact bio-spores!)
	//     - Sculptural organic resin tendrils climbing PARTIALLY (~25-45%) onto
	//       nearby inner steel walls — NEVER filling whole rectangular wall boxes!
	// =========================================================================

	/** Draws a smooth tapering organic resin root/vein with obsidian base, olive body, and wet highlight. */
	function drawOrganicRoot(
		g: CanvasRenderingContext2D,
		x0: number,
		y0: number,
		cx: number,
		cy: number,
		x1: number,
		y1: number,
		wStart: number,
		wEnd: number,
		alpha = 1
	) {
		g.save();
		g.globalAlpha *= alpha;
		g.lineCap = 'round';

		// Sample quadratic curve into tapered segments for natural root/vein attenuation
		const steps = 6;
		for (let i = 0; i < steps; i++) {
			const t0 = i / steps;
			const t1 = (i + 1) / steps;
			const qx = (t: number) => (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
			const qy = (t: number) => (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
			const ax = qx(t0);
			const ay = qy(t0);
			const bx = qx(t1);
			const by = qy(t1);
			const w = lerp(wStart, wEnd, (t0 + t1) * 0.5);

			// Soft dark cast shadow
			g.strokeStyle = 'rgba(0, 0, 0, 0.62)';
			g.lineWidth = w + 2.0;
			g.beginPath();
			g.moveTo(ax + 1.1, ay + 1.4);
			g.lineTo(bx + 1.1, by + 1.4);
			g.stroke();

			// Deep glossy obsidian-resin body (#0b0e0c)
			g.strokeStyle = '#0b0e0c';
			g.lineWidth = w + 0.9;
			g.beginPath();
			g.moveTo(ax, ay);
			g.lineTo(bx, by);
			g.stroke();

			// Muted dark olive-chitin core (#2b3328)
			g.strokeStyle = '#2b3328';
			g.lineWidth = Math.max(0.8, w * 0.72);
			g.beginPath();
			g.moveTo(ax, ay);
			g.lineTo(bx, by);
			g.stroke();

			// Subtle sage-grey ridge crest & delicate wet highlight on upper-left side
			if (w > 1.15) {
				g.strokeStyle = 'rgba(195, 212, 190, 0.42)';
				g.lineWidth = Math.max(0.55, w * 0.24);
				g.beginPath();
				g.moveTo(ax - 0.55, ay - 0.55);
				g.lineTo(bx - 0.55, by - 0.55);
				g.stroke();
			}
		}
		g.restore();
	}

	/** Draws a compact sculptural corner resin anchor with 2-3 fine curved chitin ridges. */
	function drawCornerResinWeb(
		g: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		ix: number,
		iy: number,
		radius: number,
		strength: number,
		rand: () => number
	) {
		g.save();
		// Glossy dark obsidian resin pocket tucked neatly into concave corner
		g.fillStyle = 'rgba(0, 0, 0, 0.52)';
		g.beginPath();
		g.moveTo(cx, cy);
		g.lineTo(cx + ix * (radius + 2), cy);
		g.quadraticCurveTo(
			cx + ix * radius * 0.36,
			cy + iy * radius * 0.36,
			cx,
			cy + iy * (radius + 2)
		);
		g.closePath();
		g.fill();

		const rg = g.createRadialGradient(cx, cy, 1, cx, cy, radius * 1.1);
		rg.addColorStop(0, '#0b0e0c');
		rg.addColorStop(0.7, '#1a2119');
		rg.addColorStop(1, 'rgba(11, 14, 12, 0.85)');
		g.fillStyle = rg;
		g.beginPath();
		g.moveTo(cx, cy);
		g.lineTo(cx + ix * radius, cy);
		g.quadraticCurveTo(cx + ix * radius * 0.34, cy + iy * radius * 0.34, cx, cy + iy * radius);
		g.closePath();
		g.fill();

		// 2-3 fine curved chitin ribs nestled cleanly across the corner pocket
		const ribN = strength > 0.65 ? 3 : 2;
		for (let r = 0; r < ribN; r++) {
			const f = (r + 1) / (ribN + 0.65);
			const p0x = cx + ix * radius * f;
			const p0y = cy + iy * 1.2;
			const p1x = cx + ix * 1.2;
			const p1y = cy + iy * radius * f;
			const mx = cx + ix * radius * f * 0.34;
			const my = cy + iy * radius * f * 0.34;
			g.lineCap = 'round';
			g.strokeStyle = '#323d2f';
			g.lineWidth = 1.45;
			g.beginPath();
			g.moveTo(p0x, p0y);
			g.quadraticCurveTo(mx, my, p1x, p1y);
			g.stroke();

			g.strokeStyle = 'rgba(195, 212, 190, 0.38)';
			g.lineWidth = 0.6;
			g.beginPath();
			g.moveTo(p0x - 0.4, p0y - 0.4);
			g.quadraticCurveTo(mx - 0.4, my - 0.4, p1x - 0.4, p1y - 0.4);
			g.stroke();
		}

		// Fine tapering root tip creeping slightly along one adjacent wall base
		if (rand() < 0.7) {
			const alongX = rand() < 0.5;
			const reach = radius * (1.15 + rand() * 0.55);
			if (alongX) {
				drawOrganicRoot(
					g,
					cx + ix * radius * 0.7,
					cy + iy * 2.2,
					cx + ix * (radius + reach * 0.45),
					cy + iy * (3.8 + rand() * 2),
					cx + ix * (radius + reach),
					cy + iy * 2.0,
					1.9,
					0.55
				);
			} else {
				drawOrganicRoot(
					g,
					cx + ix * 2.2,
					cy + iy * radius * 0.7,
					cx + ix * (3.8 + rand() * 2),
					cy + iy * (radius + reach * 0.45),
					cx + ix * 2.0,
					cy + iy * (radius + reach),
					1.9,
					0.55
				);
			}
		}
		g.restore();
	}

	/**
	 * Draws a restrained, natural organic tendril cluster climbing PARTIALLY (~25-45%)
	 * up and over an edge of a brushed-steel inner wall block without hiding the steel roof!
	 */
	function drawWallClimbingCluster(
		g: CanvasRenderingContext2D,
		ex0: number,
		ey0: number,
		ex1: number,
		ey1: number,
		inX: number,
		inY: number,
		maxDepth: number,
		strength: number,
		rand: () => number
	) {
		const mx = (ex0 + ex1) * 0.5;
		const my = (ey0 + ey1) * 0.5;
		const span = Math.hypot(ex1 - ex0, ey1 - ey0);
		const dirX = (ex1 - ex0) / (span || 1);
		const dirY = (ey1 - ey0) / (span || 1);

		// Compact glossy dark resin foothold hugging only part of the wall rim
		const padHalf = span * (0.28 + strength * 0.16);
		const padDepth = maxDepth * (0.45 + strength * 0.25);

		g.save();
		// Grounded soft shadow on brushed steel roof
		g.fillStyle = 'rgba(0, 0, 0, 0.46)';
		g.beginPath();
		g.moveTo(mx - dirX * padHalf, my - dirY * padHalf);
		g.quadraticCurveTo(
			mx + inX * (padDepth + 2.2),
			my + inY * (padDepth + 2.2),
			mx + dirX * padHalf,
			my + dirY * padHalf
		);
		g.closePath();
		g.fill();

		// Glossy obsidian-resin anchor pad
		const pg = g.createLinearGradient(mx, my, mx + inX * padDepth, my + inY * padDepth);
		pg.addColorStop(0, '#0b0e0c');
		pg.addColorStop(0.68, '#222920');
		pg.addColorStop(1, 'rgba(18, 24, 18, 0.85)');
		g.fillStyle = pg;
		g.beginPath();
		g.moveTo(mx - dirX * padHalf, my - dirY * padHalf);
		g.quadraticCurveTo(
			mx + inX * padDepth,
			my + inY * padDepth,
			mx + dirX * padHalf,
			my + dirY * padHalf
		);
		g.closePath();
		g.fill();

		// 2-3 fine curved chitin ridges on the foothold
		const ribs = strength > 0.6 ? 3 : 2;
		for (let r = 0; r < ribs; r++) {
			const u = (r - (ribs - 1) * 0.5) * 0.45;
			const bx = mx + dirX * padHalf * u;
			const by = my + dirY * padHalf * u;
			const tx0 = bx + inX * padDepth * 0.72 + dirX * (u * 2.5);
			const ty0 = by + inY * padDepth * 0.72 + dirY * (u * 2.5);
			g.lineCap = 'round';
			g.strokeStyle = '#485445';
			g.lineWidth = 1.3;
			g.beginPath();
			g.moveTo(bx, by);
			g.lineTo(tx0, ty0);
			g.stroke();
			g.strokeStyle = 'rgba(195, 212, 190, 0.42)';
			g.lineWidth = 0.55;
			g.beginPath();
			g.moveTo(bx - 0.45, by - 0.45);
			g.lineTo(tx0 - 0.45, ty0 - 0.45);
			g.stroke();
		}

		// 2-3 tapering branching organic roots creeping naturally across ~30-45% of the steel wall top
		const branches = 2 + (strength > 0.65 && rand() < 0.6 ? 1 : 0);
		for (let b = 0; b < branches; b++) {
			const spread = (b - (branches - 1) * 0.5) * (span * 0.24) + (rand() - 0.5) * 3;
			const sx = mx + dirX * spread * 0.55;
			const sy = my + dirY * spread * 0.55;
			const reach = maxDepth * (0.72 + rand() * 0.48) * (0.65 + strength * 0.35);
			const tipSway = spread * 1.15 + (rand() - 0.5) * 7;
			const ex = sx + inX * reach + dirX * tipSway;
			const ey = sy + inY * reach + dirY * tipSway;
			const ctrlX = sx + inX * reach * 0.52 + dirX * (tipSway * 0.25 + (rand() - 0.5) * 5);
			const ctrlY = sy + inY * reach * 0.52 + dirY * (tipSway * 0.25 + (rand() - 0.5) * 5);

			drawOrganicRoot(g, sx, sy, ctrlX, ctrlY, ex, ey, 2.2 + strength * 0.7, 0.55, 0.94);

			// Delicate secondary fork vein
			if (strength > 0.45 && rand() < 0.55) {
				const midX = (sx + ex) * 0.5 + inX * 1.2;
				const midY = (sy + ey) * 0.5 + inY * 1.2;
				const forkSide = rand() < 0.5 ? 1 : -1;
				const fx = midX + inX * (reach * 0.34) + dirX * forkSide * (4 + rand() * 4);
				const fy = midY + inY * (reach * 0.34) + dirY * forkSide * (4 + rand() * 4);
				drawOrganicRoot(
					g,
					midX,
					midY,
					(midX + fx) * 0.5,
					(midY + fy) * 0.5,
					fx,
					fy,
					1.3,
					0.4,
					0.85
				);
			}
		}
		g.restore();
	}

	function bakeRestrainedHivePhase(phase: number) {
		const [c, g] = makeStageCanvas();
		const rand = mulberry32(phase * 6217 + 83);
		const cfg = HIVE_REACH[phase];

		// --- ALWAYS PRESENT (Phase 1, 2, 3): Glossy organic tendons prying open the bent LE blast doors
		//     and gripping the 2 immediate gate-frame walls (10,11) and (14,11) ---
		const gateTendons = [
			[tx(11.15), ty(12.06), tx(11.38), ty(11.3), tx(10.85), ty(10.95), 3.1, 1.0],
			[tx(13.85), ty(12.06), tx(13.62), ty(11.3), tx(14.15), ty(10.95), 3.1, 1.0],
			[tx(11.82), ty(12.08), tx(12.05), ty(11.38), tx(11.55), ty(10.88), 2.3, 0.8],
			[tx(13.18), ty(12.08), tx(12.95), ty(11.38), tx(13.45), ty(10.88), 2.3, 0.8],
			[tx(12.5), ty(12.04), tx(12.54), ty(11.36), tx(12.46), ty(10.86), 2.0, 0.7]
		];
		for (const [x0, y0, cx, cy, x1, y1, w0, w1] of gateTendons) {
			drawOrganicRoot(g, x0, y0, cx, cy, x1, y1, w0, w1, 1);
		}

		// Subtle organic foothold hugging the 2 gate-frame walls (10,11) & (14,11) even in Phase 1
		drawWallClimbingCluster(g, tx(11), ty(11) + 4, tx(11), ty(12) - 8, -1, 0, 12, 0.55, rand);
		drawWallClimbingCluster(g, tx(14), ty(11) + 4, tx(14), ty(12) - 8, 1, 0, 12, 0.55, rand);

		if (phase === 1) return c;

		// =========================================================================
		// PASS A: CORRIDOR WALL-BASE ROOTS & CONCAVE CORNER WEBBING
		//         Strictly hugs wall edges (<= 7px from wall), NEVER crosses corridor center!
		// =========================================================================
		const [walkClip, wcg] = makeStageCanvas();
		wcg.fillStyle = '#fff';
		for (let y = 2; y < ROWS - 2; y++) {
			for (let x = 2; x < COLS - 2; x++) {
				// Keep outer perimeter ring corridors (row 2, row 24, col 2, col 22) clean!
				if (x <= 2 || x >= COLS - 3 || y <= 2 || y >= ROWS - 3) continue;
				if (isCorridorFloor(x, y)) wcg.fillRect(tx(x), ty(y), TILE, TILE);
			}
		}

		const [floorWork, fg] = makeStageCanvas();

		for (let y = 3; y < ROWS - 3; y++) {
			for (let x = 3; x < COLS - 3; x++) {
				if (!isCorridorFloor(x, y)) continue;
				const d = WALK_BFS[y][x];
				if (!Number.isFinite(d)) continue;
				const jitter = (fbm(x * 0.34, y * 0.34) - 0.5) * 1.6;
				const str = clamp((cfg.floor - (d + jitter)) / 2.6, 0, 1);
				if (str <= 0.12) continue;

				const px = tx(x);
				const py = ty(y);

				// 1. Flowing tapering organic roots hugging adjacent wall bases (offset 2.5..5.5px from wall)
				const wallEdges = [
					{
						wall: isWall(x, y - 1),
						nx: 0,
						ny: 1,
						x0: px,
						y0: py + 2.5,
						x1: px + TILE,
						y1: py + 2.5,
						horiz: true
					},
					{
						wall: isWall(x, y + 1),
						nx: 0,
						ny: -1,
						x0: px,
						y0: py + TILE - 2.5,
						x1: px + TILE,
						y1: py + TILE - 2.5,
						horiz: true
					},
					{
						wall: isWall(x - 1, y),
						nx: 1,
						ny: 0,
						x0: px + 2.5,
						y0: py,
						x1: px + 2.5,
						y1: py + TILE,
						horiz: false
					},
					{
						wall: isWall(x + 1, y),
						nx: -1,
						ny: 0,
						x0: px + TILE - 2.5,
						y0: py,
						x1: px + TILE - 2.5,
						y1: py + TILE,
						horiz: false
					}
				];

				for (const e of wallEdges) {
					if (!e.wall) continue;
					if (rand() > 0.38 + str * 0.42) continue;

					// Subtle dark wet stain band strictly hugging the wall-floor seam (4-6px deep)
					const seamD = 3.5 + str * 3.0;
					const sg = fg.createLinearGradient(e.x0, e.y0, e.x0 + e.nx * seamD, e.y0 + e.ny * seamD);
					sg.addColorStop(0, `rgba(11, 14, 12, ${0.72 * str})`);
					sg.addColorStop(1, 'rgba(11, 14, 12, 0)');
					fg.fillStyle = sg;
					if (e.horiz) fg.fillRect(px, e.ny > 0 ? py : py + TILE - seamD, TILE, seamD);
					else fg.fillRect(e.nx > 0 ? px : px + TILE - seamD, py, seamD, TILE);

					// Smooth curved branching root running along the wall base
					const sway = 2.5 + rand() * 3.2;
					const mx = (e.x0 + e.x1) * 0.5 + e.nx * sway;
					const my = (e.y0 + e.y1) * 0.5 + e.ny * sway;
					const wRoot = 1.4 + str * (phase === 3 ? 1.5 : 1.0);
					drawOrganicRoot(
						fg,
						e.x0,
						e.y0,
						mx,
						my,
						e.x1,
						e.y1,
						wRoot,
						wRoot * (0.45 + rand() * 0.45),
						0.9
					);

					// Occasional delicate secondary tendril curling gently 6px off the wall (never near tile center!)
					if (str > 0.45 && rand() < 0.35) {
						const txEnd = mx + e.nx * (3 + rand() * 2.5) + (e.horiz ? (rand() - 0.5) * 10 : 0);
						const tyEnd = my + e.ny * (3 + rand() * 2.5) + (!e.horiz ? (rand() - 0.5) * 10 : 0);
						drawOrganicRoot(
							fg,
							mx,
							my,
							(mx + txEnd) * 0.5,
							(my + tyEnd) * 0.5,
							txEnd,
							tyEnd,
							1.3,
							0.45,
							0.8
						);
					}
				}

				// 2. Sculptural dark glossy resin webbing tucked cleanly into concave wall corners
				const corners = [
					{ ok: isWall(x - 1, y) && isWall(x, y - 1), cx: px, cy: py, ix: 1, iy: 1 },
					{ ok: isWall(x + 1, y) && isWall(x, y - 1), cx: px + TILE, cy: py, ix: -1, iy: 1 },
					{ ok: isWall(x - 1, y) && isWall(x, y + 1), cx: px, cy: py + TILE, ix: 1, iy: -1 },
					{ ok: isWall(x + 1, y) && isWall(x, y + 1), cx: px + TILE, cy: py + TILE, ix: -1, iy: -1 }
				];
				for (const cc of corners) {
					if (!cc.ok) continue;
					if (rand() > 0.45 + str * 0.4) continue;
					const webR = 8 + str * (phase === 3 ? 5.5 : 4.0);
					drawCornerResinWeb(fg, cc.cx, cc.cy, cc.ix, cc.iy, webR, str, rand);
				}
			}
		}

		fg.setTransform(1, 0, 0, 1, 0, 0);
		fg.globalCompositeOperation = 'destination-in';
		fg.drawImage(walkClip, 0, 0);
		g.drawImage(floorWork, 0, 0, STAGE_W, STAGE_H);

		// =========================================================================
		// PASS B: NATURAL ORGANIC TENDRILS CLIMBING PARTIALLY ONTO INNER STEEL WALLS
		//         Covers only ~25-45% of affected wall blocks so brushed steel silhouette
		//         and 2.5D structure remain 100% readable!
		// =========================================================================
		const [wallClip, wlcg] = makeStageCanvas();
		wlcg.fillStyle = '#fff';
		for (let y = 2; y < ROWS - 2; y++) {
			for (let x = 2; x < COLS - 2; x++) {
				if (!isWall(x, y) || isOuterPerimeterWall(x, y)) continue;
				const southOpen = !isWall(x, y + 1);
				wlcg.fillRect(tx(x), ty(y), TILE, southOpen ? TILE - FACADE_H : TILE);
			}
		}

		const [wallWork, wg] = makeStageCanvas();

		for (let y = 3; y < ROWS - 3; y++) {
			for (let x = 3; x < COLS - 3; x++) {
				if (!isWall(x, y) || isOuterPerimeterWall(x, y)) continue;
				const d = WALL_BFS[y][x];
				if (!Number.isFinite(d)) continue;
				const jitter = (fbm(x * 0.31 + 5, y * 0.31 + 5) - 0.5) * 1.5;
				const str = clamp((cfg.wall - (d + jitter)) / 2.4, 0, 1);
				if (str <= 0.14) continue;

				// Only climb onto ~55-75% of eligible wall tiles so the spread looks organic, not uniform!
				if (rand() > (phase === 3 ? 0.72 : 0.56)) continue;

				const px = tx(x);
				const py = ty(y);
				const southOpen = !isWall(x, y + 1);
				const rh = southOpen ? TILE - FACADE_H : TILE;

				// Pick the 1-2 exposed edges closest to the lair so tendrils physically climb outward from it
				const candidates = [];
				if (isCorridorFloor(x, y - 1) || isGate(x, y - 1)) {
					candidates.push({
						d: WALK_BFS[y - 1][x],
						ex0: px + 3,
						ey0: py,
						ex1: px + TILE - 3,
						ey1: py,
						inX: 0,
						inY: 1,
						maxDepth: rh * 0.52
					});
				}
				if (isCorridorFloor(x, y + 1) || isLair(x, y + 1)) {
					candidates.push({
						d: isLair(x, y + 1) ? 0 : WALK_BFS[y + 1][x],
						ex0: px + 3,
						ey0: py + rh,
						ex1: px + TILE - 3,
						ey1: py + rh,
						inX: 0,
						inY: -1,
						maxDepth: rh * 0.52
					});
				}
				if (isCorridorFloor(x - 1, y) || isLair(x - 1, y)) {
					candidates.push({
						d: isLair(x - 1, y) ? 0 : WALK_BFS[y][x - 1],
						ex0: px,
						ey0: py + 3,
						ex1: px,
						ey1: py + rh - 3,
						inX: 1,
						inY: 0,
						maxDepth: TILE * 0.5
					});
				}
				if (isCorridorFloor(x + 1, y) || isLair(x + 1, y)) {
					candidates.push({
						d: isLair(x + 1, y) ? 0 : WALK_BFS[y][x + 1],
						ex0: px + TILE,
						ey0: py + 3,
						ex1: px + TILE,
						ey1: py + rh - 3,
						inX: -1,
						inY: 0,
						maxDepth: TILE * 0.5
					});
				}

				if (candidates.length === 0) continue;
				candidates.sort((a, b) => a.d - b.d);

				// Climb from the primary lair-facing side (plus optionally a second edge in Phase 3)
				const count = phase === 3 && str > 0.6 && candidates.length > 1 && rand() < 0.45 ? 2 : 1;
				for (let k = 0; k < count; k++) {
					const cnd = candidates[k];
					drawWallClimbingCluster(
						wg,
						cnd.ex0,
						cnd.ey0,
						cnd.ex1,
						cnd.ey1,
						cnd.inX,
						cnd.inY,
						cnd.maxDepth,
						str,
						rand
					);
				}
			}
		}

		wg.setTransform(1, 0, 0, 1, 0, 0);
		wg.globalCompositeOperation = 'destination-in';
		wg.drawImage(wallClip, 0, 0);
		g.drawImage(wallWork, 0, 0, STAGE_W, STAGE_H);

		return c;
	}

	// =========================================================================
	// 13. LIVE ANIMATIONS: ROOF FANS, PNEUMATIC TURBINES, LIVING SIDE ROOMS,
	//     COMPACT BIO-SPORES (DT) & ICONIC LAB POWER CELLS (EU)
	// =========================================================================

	/** Draws slowly rotating dark exhaust turbine blades inside unified wall modules. */
	function drawLiveRoofFans(g: CanvasRenderingContext2D, time: number, phase: number) {
		const wallReach = HIVE_REACH[phase].wall;
		for (const f of ROOF_FANS) {
			const infected = phase >= 2 && f.dist < wallReach - 0.5;
			const speedMult = phase === 3 && infected ? 0.1 : phase === 2 && infected ? 0.5 : 1.0;
			const ang = f.ph + time * f.speed * speedMult;

			g.save();
			g.translate(f.cx, f.cy);
			g.beginPath();
			g.arc(0, 0, f.r, 0, TAU);
			g.clip();

			g.fillStyle = '#111615';
			g.fillRect(-f.r, -f.r, f.r * 2, f.r * 2);

			g.rotate(ang);
			for (let b = 0; b < 5; b++) {
				g.rotate(TAU / 5);
				g.fillStyle = '#2b3533';
				g.beginPath();
				g.moveTo(0, 0);
				g.quadraticCurveTo(f.r * 0.45, -f.r * 0.28, f.r * 0.94, -f.r * 0.14);
				g.lineTo(f.r * 0.94, f.r * 0.22);
				g.quadraticCurveTo(f.r * 0.45, f.r * 0.12, 0, 0);
				g.closePath();
				g.fill();

				g.strokeStyle = 'rgba(170, 192, 186, 0.16)';
				g.lineWidth = 0.6;
				g.stroke();
			}

			g.fillStyle = '#3c4744';
			g.beginPath();
			g.arc(0, 0, f.r * 0.24, 0, TAU);
			g.fill();

			g.rotate(-ang);
			g.strokeStyle = 'rgba(16, 22, 20, 0.72)';
			g.lineWidth = 1.1;
			g.beginPath();
			g.moveTo(-f.r, 0);
			g.lineTo(f.r, 0);
			g.moveTo(0, -f.r);
			g.lineTo(0, f.r);
			g.stroke();
			g.restore();
		}
	}

	/** Draws slowly spinning dark exhaust turbines BEHIND the steel slats of 0A, 0B, 0C ducts. */
	function drawLiveDuctTurbines(g: CanvasRenderingContext2D, time: number, phase: number) {
		const mult = phase === 3 ? 0.55 : phase === 2 ? 0.85 : 1.0;

		for (const d of DUCT_TURBINES) {
			const x = d.cx - d.rx;
			const y = d.cy - d.ry;
			const w = d.rx * 2;
			const h = d.ry * 2;
			const bladeR = Math.min(d.rx, d.ry) * 0.92;
			const ang = d.ph + time * d.speed * mult;

			g.save();
			g.beginPath();
			g.rect(x, y, w, h);
			g.clip();

			g.fillStyle = '#060909';
			g.fillRect(x, y, w, h);

			g.save();
			g.translate(d.cx, d.cy);
			g.rotate(ang);
			for (let b = 0; b < 6; b++) {
				g.rotate(TAU / 6);
				g.fillStyle = '#222b29';
				g.beginPath();
				g.moveTo(0, 0);
				g.lineTo(bladeR * 1.15, -3.2);
				g.lineTo(bladeR * 1.15, 3.2);
				g.closePath();
				g.fill();
				g.strokeStyle = 'rgba(162, 184, 178, 0.12)';
				g.lineWidth = 0.6;
				g.stroke();
			}
			g.fillStyle = '#333e3b';
			g.beginPath();
			g.arc(0, 0, 3.5, 0, TAU);
			g.fill();
			g.restore();

			if (d.orient === 'v') {
				for (let sy = y + 4; sy < y + h - 2; sy += 9.5) {
					g.fillStyle = '#2b3532';
					g.fillRect(x + 1, sy, w - 2, 2.8);
					g.fillStyle = 'rgba(182, 204, 198, 0.16)';
					g.fillRect(x + 1, sy, w - 2, 0.9);
				}
			} else {
				for (let sx = x + 4; sx < x + w - 2; sx += 9.5) {
					g.fillStyle = '#2b3532';
					g.fillRect(sx, y + 1, 2.8, h - 2);
					g.fillStyle = 'rgba(182, 204, 198, 0.16)';
					g.fillRect(sx, y + 1, 0.9, h - 2);
				}
			}
			g.restore();
		}
	}

	// --- LIVE BIOLAB B-7 SPECIMEN TANKS ---
	const bRand = mulberry32(6042);
	const TANK_BUBBLES: Array<{
		tk: (typeof TANKS)[number];
		ang: number;
		radNorm: number;
		speed: number;
		ph: number;
		size: number;
		phase3Only: boolean;
	}> = [];
	for (const tk of TANKS) {
		if (tk.kind !== 'intact') continue;
		const count = tk.id === 2 ? 26 : 15;
		for (let i = 0; i < count; i++) {
			TANK_BUBBLES.push({
				tk,
				ang: bRand() * TAU,
				radNorm: 0.14 + bRand() * 0.74,
				speed: 0.17 + bRand() * 0.24,
				ph: bRand() * TAU,
				size: 1.0 + bRand() * 2.1,
				phase3Only: tk.id === 2 && i >= 15
			});
		}
	}

	function drawLiveBiolabTanks(g: CanvasRenderingContext2D, time: number, phase: number) {
		for (const tk of TANKS) {
			if (tk.kind !== 'intact') continue;
			const { x, y, r, seed, id } = tk;
			const frantic = id === 2 && phase === 3;
			const breathFreq = frantic ? 2.8 : phase === 2 ? 1.35 : 0.85;
			const breath = Math.sin(time * breathFreq + seed);
			const driftX = Math.sin(time * 0.45 + seed) * (frantic ? 3.8 : 2.1);
			const driftY = Math.cos(time * 0.38 + seed * 1.7) * (frantic ? 3.2 : 1.8);

			g.save();
			g.beginPath();
			g.arc(x, y, r - 1.5, 0, TAU);
			g.clip();

			g.save();
			g.translate(x + 3 + driftX, y + 2 + driftY);
			g.rotate(0.52 + Math.sin(time * 0.35 + seed) * (frantic ? 0.14 : 0.05));
			const swell = 1 + breath * (frantic ? 0.08 : 0.045);

			g.fillStyle = 'rgba(6, 12, 8, 0.86)';
			g.beginPath();
			g.ellipse(0, 0, r * 0.38 * swell, r * 0.26 * (2 - swell * 0.96), 0, 0, TAU);
			g.fill();

			g.strokeStyle = 'rgba(6, 11, 7, 0.9)';
			g.lineCap = 'round';
			for (let s = 0; s < 5; s++) {
				const a =
					s * 1.18 + seed + Math.sin(time * (frantic ? 3.2 : 1.1) + s) * (frantic ? 0.22 : 0.08);
				g.lineWidth = 4.6 - s * 0.5;
				g.beginPath();
				g.moveTo(Math.cos(a) * r * 0.2, Math.sin(a) * r * 0.2);
				g.quadraticCurveTo(
					Math.cos(a + 0.65) * r * 0.56,
					Math.sin(a + 0.65) * r * 0.56,
					Math.cos(a + 1.25) * r * 0.72,
					Math.sin(a + 1.25) * r * 0.72
				);
				g.stroke();
			}

			g.strokeStyle = 'rgba(186, 232, 180, 0.26)';
			g.lineWidth = 1.4;
			g.beginPath();
			g.arc(-2, -2, r * 0.24 * swell, Math.PI * 0.9, Math.PI * 1.65);
			g.stroke();
			g.restore();

			const speedMult = frantic ? 2.6 : phase === 2 ? 1.25 : 1.0;
			for (const b of TANK_BUBBLES) {
				if (b.tk !== tk) continue;
				if (b.phase3Only && !frantic) continue;
				const cycle = (time * b.speed * speedMult + b.ph) % 1;
				const bx =
					x +
					Math.cos(b.ang + Math.sin(time * 0.7 + b.ph) * 0.22) * r * b.radNorm * (1 - cycle * 0.22);
				const by = y + Math.sin(b.ang) * r * b.radNorm - cycle * (frantic ? 18 : 12);
				if (Math.hypot(bx - x, by - y) > r - 4) continue;
				const alpha = Math.sin(cycle * Math.PI) * (frantic ? 0.62 : 0.45);
				g.strokeStyle = `rgba(190, 242, 188, ${alpha})`;
				g.lineWidth = 0.9;
				g.beginPath();
				g.arc(bx, by, b.size * (0.65 + cycle * 0.55), 0, TAU);
				g.stroke();
			}

			g.strokeStyle = 'rgba(220, 244, 236, 0.3)';
			g.lineWidth = 3.2;
			g.beginPath();
			g.arc(x, y, r * 0.82, Math.PI * 1.08, Math.PI * 1.54);
			g.stroke();

			if (frantic) {
				const cx0 = x + r * 0.28;
				const cy0 = y - r * 0.18;
				g.strokeStyle = 'rgba(230, 250, 244, 0.72)';
				g.lineWidth = 1.05;
				const spokes = [
					[cx0, cy0, cx0 + 18, cy0 - 14, cx0 + 34, cy0 - 18],
					[cx0, cy0, cx0 - 16, cy0 - 12, cx0 - 30, cy0 - 6],
					[cx0, cy0, cx0 - 8, cy0 + 18, cx0 - 20, cy0 + 36],
					[cx0, cy0, cx0 + 14, cy0 + 15, cx0 + 28, cy0 + 26],
					[cx0, cy0, cx0 + 2, cy0 - 22, cx0 - 6, cy0 - 36]
				];
				for (const [ax, ay, bx, by, ex, ey] of spokes) {
					g.beginPath();
					g.moveTo(ax, ay);
					g.lineTo(bx, by);
					g.lineTo(ex, ey);
					g.stroke();
				}
				g.strokeStyle = 'rgba(230, 250, 244, 0.45)';
				g.lineWidth = 0.75;
				g.beginPath();
				g.arc(cx0, cy0, 9, 0, TAU);
				g.stroke();
			}
			g.restore();
		}
	}

	// --- LIVE STORM PLANET VIEWPORT & SYNCHRONIZED RIGHT WINDOW FLASH ---
	const vpRand = mulberry32(8219);
	const VP_STARS = Array.from({ length: 110 }, () => ({
		x: VIEWPORT.x - VIEWPORT.r + vpRand() * VIEWPORT.r * 2,
		y: VIEWPORT.y - VIEWPORT.r + vpRand() * VIEWPORT.r * 1.45,
		base: 0.25 + vpRand() * 0.65,
		sz: vpRand() < 0.15 ? 1.8 : 1.0,
		ph: vpRand() * TAU
	}));

	const VP_CLOUDS = Array.from({ length: 78 }, () => ({
		ang0: -Math.PI * 0.96 + vpRand() * Math.PI * 0.65,
		radNorm: 0.56 + vpRand() * 0.42,
		span: 0.08 + vpRand() * 0.22,
		speed: 0.012 + vpRand() * 0.016,
		lw: 2.2 + vpRand() * 5.2,
		r: Math.round(188 + vpRand() * 64),
		g: Math.round(108 + vpRand() * 44),
		b: Math.round(44 + vpRand() * 24),
		a: 0.07 + vpRand() * 0.11
	}));

	const VP_CRACKS = (() => {
		const crX = VIEWPORT.x - VIEWPORT.r * 0.38;
		const crY = VIEWPORT.y - VIEWPORT.r * 0.22;
		const crRand = mulberry32(911);
		const lines = [];
		for (let i = 0; i < 8; i++) {
			let a = (i / 8) * TAU + crRand() * 0.35;
			let qx = crX;
			let qy = crY;
			const pts = [[qx, qy]];
			for (let s = 0; s < 5; s++) {
				a += (crRand() - 0.5) * 0.45;
				qx += Math.cos(a) * (9 + crRand() * 14);
				qy += Math.sin(a) * (9 + crRand() * 14);
				pts.push([qx, qy]);
			}
			lines.push(pts);
		}
		return { crX, crY, lines };
	})();

	function stormLightning(time: number) {
		const cycle = (time % 10.4) / 1.15;
		if (cycle >= 1) return 0;
		return Math.pow(Math.sin(cycle * Math.PI), 2) * 0.56;
	}

	function drawLiveViewportAndWindowGlint(g: CanvasRenderingContext2D, time: number) {
		const { x, y, r } = VIEWPORT;
		const storm = stormLightning(time);

		g.save();
		g.beginPath();
		g.arc(x, y, r, 0, TAU);
		g.clip();

		g.fillStyle = '#020408';
		g.fillRect(x - r, y - r, r * 2, r * 2);

		for (const st of VP_STARS) {
			const tw = 0.72 + 0.28 * Math.sin(time * 1.4 + st.ph);
			g.fillStyle = `rgba(220, 232, 255, ${st.base * tw})`;
			g.fillRect(st.x, st.y, st.sz, st.sz);
		}

		const px = x + r * 0.76;
		const py = y + r * 1.46;
		const pr = r * 1.54;

		const atmo = g.createRadialGradient(px, py, pr * 0.88, px, py, pr * 1.18);
		atmo.addColorStop(0, `rgba(238, 142, 54, ${0.52 + storm * 0.25})`);
		atmo.addColorStop(0.5, 'rgba(182, 88, 28, 0.2)');
		atmo.addColorStop(1, 'rgba(120, 48, 16, 0)');
		g.fillStyle = atmo;
		g.beginPath();
		g.arc(px, py, pr * 1.18, 0, TAU);
		g.fill();

		const pGrad = g.createRadialGradient(px - pr * 0.35, py - pr * 0.55, pr * 0.12, px, py, pr);
		pGrad.addColorStop(0, '#864e22');
		pGrad.addColorStop(0.55, '#462612');
		pGrad.addColorStop(0.88, '#22130b');
		pGrad.addColorStop(0.97, '#a65d24');
		pGrad.addColorStop(1, '#df8a3c');
		g.fillStyle = pGrad;
		g.beginPath();
		g.arc(px, py, pr, 0, TAU);
		g.fill();

		g.save();
		g.beginPath();
		g.arc(px, py, pr, 0, TAU);
		g.clip();
		for (const cl of VP_CLOUDS) {
			const drift = ((cl.ang0 + time * cl.speed + Math.PI * 1.2) % (Math.PI * 0.8)) - Math.PI * 1.1;
			const rad = pr * cl.radNorm;
			g.strokeStyle = `rgba(${cl.r}, ${cl.g}, ${cl.b}, ${cl.a})`;
			g.lineWidth = cl.lw;
			g.beginPath();
			g.arc(px, py, rad, drift, drift + cl.span);
			g.stroke();
		}

		if (storm > 0.02) {
			const lx = x + r * 0.18;
			const ly = y + r * 0.34;
			const lg = g.createRadialGradient(lx, ly, 4, lx, ly, r * 0.72);
			lg.addColorStop(0, `rgba(255, 224, 178, ${storm * 0.65})`);
			lg.addColorStop(1, 'rgba(255, 168, 86, 0)');
			g.fillStyle = lg;
			g.fillRect(x - r, y - r, r * 2, r * 2);
		}
		g.restore();

		g.strokeStyle = `rgba(255, 184, 96, ${0.68 + storm * 0.25})`;
		g.lineWidth = 2.6;
		g.beginPath();
		g.arc(px, py, pr - 0.5, Math.PI * 1.04, Math.PI * 1.58);
		g.stroke();

		g.strokeStyle = `rgba(220, 238, 236, ${0.42 + storm * 0.25})`;
		g.lineWidth = 0.9;
		for (const pts of VP_CRACKS.lines) {
			g.beginPath();
			pts.forEach(([qx, qy], i) => (i ? g.lineTo(qx, qy) : g.moveTo(qx, qy)));
			g.stroke();
		}
		g.beginPath();
		g.arc(VP_CRACKS.crX, VP_CRACKS.crY, 8, 0, TAU);
		g.stroke();

		g.strokeStyle = `rgba(216, 234, 248, ${0.24 + storm * 0.18})`;
		g.lineWidth = 5;
		g.beginPath();
		g.arc(x, y, r * 0.87, Math.PI * 1.12, Math.PI * 1.38);
		g.stroke();
		g.restore();

		// Synchronized subtle cold lightning glint on right bulkhead observation windows
		if (storm > 0.03) {
			g.save();
			const wx = tx(COLS - 2) + 10;
			g.fillStyle = `rgba(222, 242, 255, ${storm * 0.34})`;
			g.fillRect(wx, ty(4) + 5, TILE - 20, TILE * 4 - 10);
			g.fillRect(wx, ty(19) + 5, TILE - 20, TILE * 4 - 10);
			g.restore();
		}
	}

	/** Animates the 3 curved CRT telemetry monitors on the Observation Deck console. */
	function drawLiveObsConsoleScreens(g: CanvasRenderingContext2D, time: number, phase: number) {
		const cx = OBS_CONSOLE.x;
		const cy = OBS_CONSOLE.y;
		const angles = [Math.PI * 1.24, Math.PI * 1.42, Math.PI * 1.6];

		for (let i = 0; i < 3; i++) {
			const a = angles[i];
			const mx = cx + Math.cos(a) * 71;
			const my = cy + 14 + Math.sin(a) * 71;

			g.save();
			g.translate(mx, my);
			g.rotate(a + Math.PI / 2);

			g.fillStyle = '#080d0b';
			g.fillRect(-16, -9, 32, 18);
			g.strokeStyle = '#5c6b66';
			g.lineWidth = 1;
			g.strokeRect(-16, -9, 32, 18);

			g.beginPath();
			g.rect(-15, -8, 30, 16);
			g.clip();

			if (i === 0) {
				// Flatline ECG trace beside fallen crew member
				g.strokeStyle = 'rgba(96, 214, 138, 0.25)';
				g.lineWidth = 0.6;
				g.beginPath();
				g.moveTo(-15, 0);
				g.lineTo(15, 0);
				g.stroke();

				const headU = (time * 0.42) % 1;
				const headX = -14 + headU * 28;
				g.strokeStyle = 'rgba(110, 232, 150, 0.9)';
				g.lineWidth = 1.25;
				g.beginPath();
				for (let s = -14; s <= 14; s += 1.5) {
					const distFromBlip = Math.abs(s + 6);
					const twitch =
						phase === 1 && distFromBlip < 2.2
							? -Math.cos((distFromBlip / 2.2) * (Math.PI / 2)) * 3.5
							: 0;
					const yVal = twitch + (phase === 2 && distFromBlip < 1.5 ? -1.4 : 0);
					if (s === -14) g.moveTo(s, yVal);
					else g.lineTo(s, yVal);
				}
				g.stroke();

				g.fillStyle = '#d8ffe6';
				g.beginPath();
				g.arc(headX, 0, 1.3, 0, TAU);
				g.fill();
			} else if (i === 1) {
				// Rotating sector radar sweep
				g.strokeStyle = 'rgba(110, 214, 148, 0.28)';
				g.lineWidth = 0.7;
				g.beginPath();
				g.arc(0, 0, 6.2, 0, TAU);
				g.arc(0, 0, 3.1, 0, TAU);
				g.stroke();

				const sw = time * 1.1;
				g.fillStyle = phase === 3 ? 'rgba(224, 78, 62, 0.34)' : 'rgba(235, 163, 52, 0.32)';
				g.beginPath();
				g.moveTo(0, 0);
				g.arc(0, 0, 6.4, sw - 0.55, sw);
				g.closePath();
				g.fill();

				g.strokeStyle = phase === 3 ? '#ff6854' : '#f2c264';
				g.lineWidth = 1;
				g.beginPath();
				g.moveTo(0, 0);
				g.lineTo(Math.cos(sw) * 6.4, Math.sin(sw) * 6.4);
				g.stroke();

				const ping = 0.5 + 0.5 * Math.sin(time * 2.4);
				g.fillStyle =
					phase >= 2 ? `rgba(255, 86, 68, ${0.5 + 0.5 * ping})` : 'rgba(235, 163, 52, 0.75)';
				g.beginPath();
				g.arc(1.2, -0.8, 1.35, 0, TAU);
				g.fill();
			} else {
				// Status readout turning red in Phase 2/3
				const pulse = 0.55 + 0.45 * Math.sin(time * (phase === 3 ? 3.0 : 1.8));
				const col =
					phase === 1
						? 'rgba(110, 218, 148, 0.78)'
						: phase === 2
							? `rgba(230, 96, 64, ${0.65 + 0.32 * pulse})`
							: `rgba(232, 62, 50, ${0.64 + 0.36 * pulse})`;

				g.fillStyle = col;
				g.fillRect(-12, -5.5, 24, 2.2);
				g.fillRect(-12, -1.2, phase === 3 ? 22 : 17, 2.0);
				g.fillRect(-12, 3.2, phase === 1 ? 14 : 20, 2.0);

				if (phase >= 2) {
					g.strokeStyle = `rgba(232, 66, 54, ${(phase === 3 ? 0.5 : 0.28) + 0.35 * pulse})`;
					g.lineWidth = 1.1;
					g.strokeRect(-14.2, -7.2, 28.4, 14.4);
				}
			}

			g.restore();
		}
	}

	// --- LIVE LAIR COCOONS ---
	const LAIR_COCOONS = [
		{ x: 10.9, y: 13.44, rx: 10.8, ry: 12.8, rot: -0.2, ph: 0.0 },
		{ x: 11.96, y: 13.56, rx: 11.6, ry: 13.6, rot: 0.12, ph: 1.55 },
		{ x: 13.06, y: 13.56, rx: 11.4, ry: 13.4, rot: -0.1, ph: 3.1 },
		{ x: 14.1, y: 13.44, rx: 10.6, ry: 12.6, rot: 0.24, ph: 4.6 }
	];

	function drawLairCocoons(g: CanvasRenderingContext2D, time: number, phase: number) {
		if (opts.lairCocoons === false) return;
		const boost = phase === 1 ? 0.84 : phase === 2 ? 1.0 : 1.15;
		for (const pod of LAIR_COCOONS) {
			const cx = tx(pod.x);
			const cy = ty(pod.y);
			const pulse = 0.5 + 0.5 * Math.sin(time * 1.4 + pod.ph);
			const swell = 1 + pulse * 0.048;
			const rx = pod.rx * swell;
			const ry = pod.ry * swell;

			g.save();
			g.translate(cx, cy);
			g.rotate(pod.rot);

			g.fillStyle = 'rgba(0, 0, 0, 0.88)';
			g.beginPath();
			g.ellipse(2.2, 2.6, rx * 1.15, ry * 1.13, 0, 0, TAU);
			g.fill();

			const sh = g.createRadialGradient(-rx * 0.28, -ry * 0.28, 1, 0, 0, ry * 1.15);
			sh.addColorStop(0, '#5c6848');
			sh.addColorStop(0.42, '#242c1c');
			sh.addColorStop(0.84, '#0d110b');
			sh.addColorStop(1, '#060806');
			g.fillStyle = sh;
			g.beginPath();
			g.ellipse(0, 0, rx, ry, 0, 0, TAU);
			g.fill();

			g.strokeStyle = '#8f9a89';
			g.lineWidth = 1.45;
			for (let k = 0; k < 4; k++) {
				const a = (k / 4) * TAU + 0.38;
				g.beginPath();
				g.moveTo(0, -ry * 0.14);
				g.quadraticCurveTo(
					Math.cos(a) * rx * 0.5,
					Math.sin(a) * ry * 0.5,
					Math.cos(a) * rx * 0.92,
					Math.sin(a) * ry * 0.92
				);
				g.stroke();
			}

			const coreA = (0.42 + 0.38 * pulse) * boost;
			const cleft = g.createRadialGradient(0, -ry * 0.1, 0, 0, -ry * 0.1, rx * 0.66);
			cleft.addColorStop(0, `rgba(246, 224, 134, ${coreA})`);
			cleft.addColorStop(0.48, `rgba(176, 166, 68, ${coreA * 0.55})`);
			cleft.addColorStop(1, 'rgba(110, 108, 40, 0)');
			g.fillStyle = cleft;
			g.beginPath();
			g.arc(0, -ry * 0.1, rx * 0.66, 0, TAU);
			g.fill();

			g.fillStyle = 'rgba(236, 244, 224, 0.72)';
			g.beginPath();
			g.ellipse(-rx * 0.35, -ry * 0.35, rx * 0.28, ry * 0.13, -0.65, 0, TAU);
			g.fill();
			g.restore();
		}
	}

	// --- STANDALONE ESCAPE PROPS (NO GREEN FLOOR CABLE!) ---
	function drawEscapeProps(g: CanvasRenderingContext2D, time: number, phase: number) {
		// 1. Round Mechanical Extraction Hatch at (6, 1)
		{
			const cx = tcx(HATCH_TILE.x);
			const cy = tcy(HATCH_TILE.y);
			const r = TILE * 0.46;

			g.save();
			for (let i = 0; i < 16; i++) {
				g.fillStyle = i % 2 === 0 ? '#ba922c' : '#141817';
				g.beginPath();
				g.arc(cx, cy, r + 2.4, (i / 16) * TAU, ((i + 1) / 16) * TAU);
				g.arc(cx, cy, r - 1.4, ((i + 1) / 16) * TAU, (i / 16) * TAU, true);
				g.closePath();
				g.fill();
			}

			const lid = g.createRadialGradient(cx - r * 0.25, cy - r * 0.25, 1, cx, cy, r);
			lid.addColorStop(0, '#525e5a');
			lid.addColorStop(0.72, '#2c3431');
			lid.addColorStop(1, '#161b1a');
			g.fillStyle = lid;
			g.beginPath();
			g.arc(cx, cy, r - 1.4, 0, TAU);
			g.fill();
			g.strokeStyle = '#080b0a';
			g.lineWidth = 1.4;
			g.stroke();

			g.strokeStyle = '#0b0f0e';
			g.lineWidth = 3.0;
			for (let i = 0; i < 4; i++) {
				const a = (i / 4) * TAU + Math.PI / 4;
				g.beginPath();
				g.moveTo(cx + Math.cos(a) * 2.5, cy + Math.sin(a) * 2.5);
				g.lineTo(cx + Math.cos(a) * (r - 3.2), cy + Math.sin(a) * (r - 3.2));
				g.stroke();
			}
			g.strokeStyle = '#7a8b85';
			g.lineWidth = 1.4;
			g.beginPath();
			g.arc(cx, cy, r * 0.48, 0, TAU);
			g.stroke();

			const p = 0.65 + 0.35 * Math.sin(time * 2.2);
			g.fillStyle = '#141918';
			g.beginPath();
			g.arc(cx, cy, 3.8, 0, TAU);
			g.fill();
			g.fillStyle = `rgba(116, 232, 160, ${p})`;
			g.beginPath();
			g.arc(cx, cy, 1.9, 0, TAU);
			g.fill();
			g.restore();
		}

		// 2. Standalone Quarantine Console at (12, 24)
		{
			const cx = tcx(CONSOLE_TILE.x);
			const cy = tcy(CONSOLE_TILE.y) - 2;
			const w = TILE * 0.86;
			const h = TILE * 0.58;

			g.save();
			g.fillStyle = 'rgba(0, 0, 0, 0.74)';
			g.beginPath();
			g.roundRect(cx - w / 2 + 2.2, cy - h / 2 + 3.0, w, h, 3);
			g.fill();

			const dg = g.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
			dg.addColorStop(0, '#505d59');
			dg.addColorStop(1, '#232a28');
			g.fillStyle = dg;
			g.beginPath();
			g.roundRect(cx - w / 2, cy - h / 2, w, h, 3);
			g.fill();
			g.strokeStyle = '#080b0a';
			g.lineWidth = 1.3;
			g.stroke();

			g.fillStyle = '#09100d';
			g.fillRect(cx - w * 0.37, cy - h * 0.32, w * 0.74, h * 0.44);
			const p = 0.78 + 0.22 * Math.sin(time * 2.4);
			g.fillStyle =
				phase === 3 ? `rgba(235, 84, 68, ${0.88 * p})` : `rgba(116, 232, 160, ${0.86 * p})`;
			g.fillRect(cx - w * 0.31, cy - h * 0.22, w * 0.44, 1.8);
			g.fillStyle = `rgba(235, 163, 52, ${0.75 * p})`;
			g.fillRect(cx - w * 0.31, cy - h * 0.05, w * 0.58, 1.4);

			for (let i = 0; i < 4; i++) {
				g.fillStyle = i === 3 ? '#eba334' : '#5a6864';
				g.fillRect(cx - w * 0.31 + i * (w * 0.165), cy + h * 0.22, w * 0.1, 2.4);
			}
			g.restore();
		}
	}

	// Precompute DT & EU tiles
	/** The game's food: whether a tile's spore or power cell is still there (the mock-up shows all). */
	let present: (x: number, y: number) => boolean = () => true;
	const setPresent = (fn: (x: number, y: number) => boolean) => {
		present = fn;
	};
	const DT_TILES: Array<{ x: number; y: number }> = [];
	const EU_TILES: Array<{ x: number; y: number }> = [];
	for (let y = 0; y < ROWS; y++) {
		for (let x = 0; x < COLS; x++) {
			const tk = tileAt(x, y);
			if (tk === 'DT') DT_TILES.push({ x, y });
			else if (tk === 'EU') EU_TILES.push({ x, y });
		}
	}

	// --- COMPACT, LOW-NOISE BIO-SPORE SPRITE (DT) ---
	// Delicate ~5.6px organic pearl (r=2.8) inside tight ~7.2px dark socket (r=3.6) + subtle ~9px halo
	function buildCompactSporeSprite() {
		const sz = 24;
		const mid = sz / 2;
		const c = makeCanvas(sz * BAKE_SCALE, sz * BAKE_SCALE);
		const g = getCtx(c);
		g.scale(BAKE_SCALE, BAKE_SCALE);

		// Very tight, restrained warm halo (max radius ~9px, alpha ~0.24 — zero fuzzy overlap!)
		const halo = g.createRadialGradient(mid, mid, 1.4, mid, mid, 9.0);
		halo.addColorStop(0, 'rgba(235, 174, 70, 0.24)');
		halo.addColorStop(0.6, 'rgba(215, 140, 38, 0.09)');
		halo.addColorStop(1, 'rgba(180, 100, 20, 0)');
		g.fillStyle = halo;
		g.fillRect(0, 0, sz, sz);

		// Soft 1px drop shadow
		g.fillStyle = 'rgba(0, 0, 0, 0.78)';
		g.beginPath();
		g.arc(mid + 0.8, mid + 1.0, 3.85, 0, TAU);
		g.fill();

		// Tiny tight dark circular socket (~7.2px diameter)
		g.fillStyle = '#0b0e0b';
		g.beginPath();
		g.arc(mid, mid, 3.6, 0, TAU);
		g.fill();
		g.strokeStyle = 'rgba(148, 160, 144, 0.34)';
		g.lineWidth = 0.65;
		g.stroke();

		// Crisp organic amber-ivory pearl (~5.6px diameter)
		const bulb = g.createRadialGradient(mid - 0.85, mid - 0.9, 0.25, mid, mid, 2.8);
		bulb.addColorStop(0, '#fff9e0');
		bulb.addColorStop(0.55, '#e5a63e');
		bulb.addColorStop(1, '#9b5c16');
		g.fillStyle = bulb;
		g.beginPath();
		g.arc(mid, mid, 2.8, 0, TAU);
		g.fill();

		// Tiny crisp specular dot
		g.fillStyle = '#ffffff';
		g.beginPath();
		g.arc(mid - 0.9, mid - 0.85, 0.75, 0, TAU);
		g.fill();

		return c;
	}

	const compactSporeSprite = buildCompactSporeSprite();

	/** One spore at a stage point (a mimic's disguise): `breath` scales it like the food's breathing. */
	function drawSporeAt(g: CanvasRenderingContext2D, x: number, y: number, breath: number) {
		const w = 24 * breath;
		g.drawImage(compactSporeSprite, x - w / 2, y - w / 2, w, w);
	}

	function drawBioSpores(g: CanvasRenderingContext2D, time: number, showProps: boolean) {
		// Gentle synchronized breathing (±4%, slow ~2.0 rad/s)
		const breath = 1 + 0.04 * Math.sin(time * 2.0);
		const w = 24 * breath;
		const half = w / 2;
		for (let i = 0; i < DT_TILES.length; i++) {
			const tile = DT_TILES[i];
			if (showProps && tile.x === CONSOLE_TILE.x && tile.y === CONSOLE_TILE.y) continue;
			if (!present(tile.x, tile.y)) continue;
			g.drawImage(compactSporeSprite, tcx(tile.x) - half, tcy(tile.y) - half, w, w);
		}
	}

	// --- UNMISTAKABLE, ICONIC ENERGIZERS (EU): HEAVY LAB POWER CELLS / CONTAINMENT CANISTERS ---
	/** The power cell's colours (rgb triples for the glows, css colours for the core and ring). */
	interface CellPalette {
		readonly aura: string;
		readonly halo: string;
		readonly rim: string;
		readonly core: readonly [string, string, string];
		readonly ring: string;
		readonly light: string;
	}
	// the game's: the hot coral (the owner's pick, 2026-11-25), apart from the amber spores
	let cell: CellPalette = {
		aura: '255, 200, 170',
		halo: '255, 110, 70',
		rim: '200, 50, 30',
		core: ['#ffe1cf', '#ff7a4a', '#b22a14'],
		ring: 'rgba(255, 214, 190, 0.95)',
		light: '255, 130, 90'
	};
	const setCellPalette = (p: CellPalette) => {
		cell = p;
	};

	function drawLabPowerCellsEU(g: CanvasRenderingContext2D, time: number) {
		const R = 11.0; // ~22px diameter (~64% of 34px tile)
		const octPath = (cx: number, cy: number, rad: number) => {
			g.beginPath();
			for (let k = 0; k < 8; k++) {
				const a = (k / 8) * TAU + Math.PI / 8;
				const px = cx + Math.cos(a) * rad;
				const py = cy + Math.sin(a) * rad;
				if (k === 0) g.moveTo(px, py);
				else g.lineTo(px, py);
			}
			g.closePath();
		};

		for (let i = 0; i < EU_TILES.length; i++) {
			const { x, y } = EU_TILES[i];
			if (!present(x, y)) continue;
			const cx = tcx(x);
			const cy = tcy(y);
			const pulse = 0.5 + 0.5 * Math.sin(time * 2.1 + i * 1.4);

			g.save();
			// the plasma's localized aura
			const aura = g.createRadialGradient(cx, cy, 3, cx, cy, R * 2.15);
			aura.addColorStop(0, `rgba(${cell.aura}, ${0.34 + 0.14 * pulse})`);
			aura.addColorStop(0.55, `rgba(${cell.halo}, ${0.14 + 0.08 * pulse})`);
			aura.addColorStop(1, `rgba(${cell.rim}, 0)`);
			g.fillStyle = aura;
			g.beginPath();
			g.arc(cx, cy, R * 2.15, 0, TAU);
			g.fill();

			// Grounded drop shadow
			octPath(cx + 1.8, cy + 2.3, R + 1.3);
			g.fillStyle = 'rgba(0, 0, 0, 0.85)';
			g.fill();

			// Heavy brushed-steel octagonal/circular containment casing (#586662 to #222927)
			octPath(cx, cy, R);
			const casing = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
			casing.addColorStop(0, '#586662');
			casing.addColorStop(0.5, '#36403d');
			casing.addColorStop(1, '#222927');
			g.fillStyle = casing;
			g.fill();
			g.strokeStyle = '#080b0a';
			g.lineWidth = 1.4;
			g.stroke();

			// Subtle upper-left metallic bevel on casing
			g.strokeStyle = 'rgba(204, 222, 216, 0.28)';
			g.lineWidth = 0.9;
			g.beginPath();
			g.arc(cx, cy, R * 0.88, Math.PI * 0.88, Math.PI * 1.62);
			g.stroke();

			// 4 dark recessed mechanical grip notches at 45/135/225/315° + tiny perimeter bolts
			for (let k = 0; k < 4; k++) {
				const a = (k / 4) * TAU + Math.PI / 4;
				g.save();
				g.translate(cx + Math.cos(a) * (R - 1.2), cy + Math.sin(a) * (R - 1.2));
				g.rotate(a);
				g.fillStyle = '#0b0f0e';
				g.fillRect(-2.1, -1.6, 3.6, 3.2);
				g.restore();

				const ba = (k / 4) * TAU;
				drawHexBolt(g, cx + Math.cos(ba) * (R - 2.3), cy + Math.sin(ba) * (R - 2.3), 1.0);
			}

			// Dark protective inner bezel ring
			g.fillStyle = '#0c100f';
			g.beginPath();
			g.arc(cx, cy, R * 0.72, 0, TAU);
			g.fill();

			// one large crystal-clear glass core of plasma
			const coreR = R * 0.61;
			const core = g.createRadialGradient(cx - 1.2, cy - 1.3, 0.4, cx, cy, coreR);
			core.addColorStop(0, '#ffffff');
			core.addColorStop(0.32, cell.core[0]);
			core.addColorStop(0.72, cell.core[1]);
			core.addColorStop(1, cell.core[2]);
			g.fillStyle = core;
			g.globalAlpha = 0.88 + 0.12 * pulse;
			g.beginPath();
			g.arc(cx, cy, coreR, 0, TAU);
			g.fill();

			// Subtle slow-rotating segmented containment reticle/filament inside glass core
			g.save();
			g.translate(cx, cy);
			// the slow ring: bright arcs turning round the plasma
			g.rotate(time * 0.35 + i * 0.8);
			g.globalAlpha = 0.85;
			g.strokeStyle = cell.ring;
			g.lineWidth = 1.1;
			for (let s = 0; s < 3; s++) {
				const a0 = (s / 3) * TAU;
				g.beginPath();
				g.arc(0, 0, coreR * 1.12, a0, a0 + 1.4);
				g.stroke();
			}
			g.restore();

			// Crisp curved glass specular reflection arc on upper-left lens
			g.globalAlpha = 0.78;
			g.strokeStyle = '#ffffff';
			g.lineWidth = 1.3;
			g.lineCap = 'round';
			g.beginPath();
			g.arc(cx, cy, coreR * 0.72, Math.PI * 1.06, Math.PI * 1.48);
			g.stroke();

			g.restore();
		}
	}

	// --- ATMOSPHERIC FX: VENT CONDENSATE, PHASE 2/3 STEAM LEAKS, DUST MOTES ---
	const fxRand = mulberry32(5193);
	const DUST_MOTES = Array.from({ length: 50 }, () => ({
		x: 80 + fxRand() * (STAGE_W - 160),
		y: 130 + fxRand() * (STAGE_H - 260),
		vx: (fxRand() - 0.5) * 6.0,
		vy: -2.0 - fxRand() * 4.0,
		r: 0.65 + fxRand() * 1.15,
		ph: fxRand() * TAU
	}));

	const STEAM_EMITTERS = [
		// External pneumatic vents (gentle wisps in Phase 2/3)
		{ x: MAZE_L - 66, y: tcy(13), dx: -26, dy: -6, minPhase: 2, maxR: 20, alpha: 0.1 },
		{ x: MAZE_R + 66, y: tcy(13), dx: 26, dy: -6, minPhase: 2, maxR: 20, alpha: 0.1 },
		{ x: tcx(18), y: MAZE_T - 20, dx: 6, dy: -22, minPhase: 2, maxR: 16, alpha: 0.09 },
		{ x: tcx(6), y: MAZE_B + 20, dx: -6, dy: 22, minPhase: 2, maxR: 16, alpha: 0.09 },
		{ x: 460, y: 74, dx: 26, dy: 14, minPhase: 2, maxR: 15, alpha: 0.15 },
		{ x: 1450, y: 74, dx: -24, dy: 15, minPhase: 2, maxR: 15, alpha: 0.15 }
	];

	const STEAM_PUFFS: Array<{
		em: (typeof STEAM_EMITTERS)[number];
		age: number;
		life: number;
		spread: number;
	}> = [];
	for (const em of STEAM_EMITTERS) {
		for (let i = 0; i < 5; i++) {
			STEAM_PUFFS.push({
				em,
				age: (i / 5) * 3.6,
				life: 3.0 + fxRand() * 1.2,
				spread: (fxRand() - 0.5) * 7
			});
		}
	}

	function drawAtmosphereFX(g: CanvasRenderingContext2D, dt: number, time: number, phase: number) {
		for (const p of STEAM_PUFFS) {
			p.age += dt;
			if (p.age >= p.life) p.age -= p.life;
			if (phase < p.em.minPhase) continue;

			const u = p.age / p.life;
			const alpha = Math.sin(u * Math.PI) * p.em.alpha * (phase === 3 ? 1.2 : 1.0);
			const px = p.em.x + p.em.dx * u * 1.85 + Math.sin(time * 1.1 + p.spread) * 3.2 * u;
			const py = p.em.y + p.em.dy * u * 1.85 + p.spread * u;
			const rad = 4 + p.em.maxR * u;

			const sg = g.createRadialGradient(px, py, 0, px, py, rad);
			sg.addColorStop(0, `rgba(196, 218, 214, ${alpha})`);
			sg.addColorStop(1, 'rgba(196, 218, 214, 0)');
			g.fillStyle = sg;
			g.fillRect(px - rad, py - rad, rad * 2, rad * 2);
		}

		for (const m of DUST_MOTES) {
			m.x += (m.vx + Math.sin(time * 0.45 + m.ph) * 2.5) * dt;
			m.y += m.vy * dt;
			if (m.y < 120) m.y = STAGE_H - 120;
			if (m.x < 70) m.x = STAGE_W - 70;
			if (m.x > STAGE_W - 70) m.x = 70;

			const a = 0.12 + 0.2 * (0.5 + 0.5 * Math.sin(time * 1.1 + m.ph));
			g.fillStyle = `rgba(218, 228, 214, ${a})`;
			g.beginPath();
			g.arc(m.x, m.y, m.r, 0, TAU);
			g.fill();
		}
	}

	// =========================================================================
	// 14. PHASE-EVOLVING CINEMATIC LIGHTMAP & FILM GRAIN (EYE-SAFE < 2 Hz)
	// =========================================================================
	const CORRIDOR_LAMPS = [
		{ x: 5.5, y: 2.5, central: false, ph: 0.4 },
		{ x: 19.5, y: 2.5, central: false, ph: 1.8 },
		{ x: 5.5, y: 24.5, central: false, ph: 3.1 },
		{ x: 19.5, y: 24.5, central: false, ph: 4.5 },
		{ x: 4.5, y: 8.5, central: false, ph: 2.2 },
		{ x: 20.5, y: 8.5, central: true, ph: 5.0 },
		{ x: 4.5, y: 18.5, central: true, ph: 1.1 },
		{ x: 20.5, y: 18.5, central: false, ph: 3.8 },
		{ x: 12.5, y: 6.5, central: true, ph: 2.7 },
		{ x: 12.5, y: 20.5, central: true, ph: 4.2 },
		{ x: 8.5, y: 13.5, central: true, ph: 0.9 },
		{ x: 16.5, y: 13.5, central: true, ph: 5.4 }
	];

	const RED_BEACONS = [
		{ x: tcx(12), y: tcy(10), speed: 1.15, ph: 0.0, sweep: true },
		{ x: tcx(8), y: tcy(16), speed: 1.0, ph: 2.1, sweep: true },
		{ x: tcx(16), y: tcy(10), speed: 1.08, ph: 3.9, sweep: true },
		{ x: tcx(4), y: tcy(13), speed: 0.92, ph: 1.4, sweep: false },
		{ x: tcx(20), y: tcy(13), speed: 0.92, ph: 4.7, sweep: false }
	];

	// A light pool: the mock-up's radial gradient (alpha, 0.44 alpha at 0.45, 0 at the rim),
	// drawn from a sprite per colour baked at alpha 1 and scaled, its alpha the draw's.
	const lightSprites = new Map<string, HTMLCanvasElement>();
	function lightSprite(rgb: string): HTMLCanvasElement {
		let c = lightSprites.get(rgb);
		if (!c) {
			c = makeCanvas(96, 96);
			const sg = getCtx(c);
			const gr = sg.createRadialGradient(48, 48, 0, 48, 48, 48);
			gr.addColorStop(0, `rgba(${rgb}, 1)`);
			gr.addColorStop(0.45, `rgba(${rgb}, 0.44)`);
			gr.addColorStop(1, `rgba(${rgb}, 0)`);
			sg.fillStyle = gr;
			sg.fillRect(0, 0, 96, 96);
			lightSprites.set(rgb, c);
		}
		return c;
	}

	function radialLight(
		g: CanvasRenderingContext2D,
		x: number,
		y: number,
		r: number,
		rgb: string,
		alpha: number
	) {
		if (alpha <= 0.002 || r <= 1) return;
		const prev = g.globalAlpha;
		g.globalAlpha = prev * Math.min(1, alpha);
		g.drawImage(lightSprite(rgb), x - r, y - r, r * 2, r * 2);
		g.globalAlpha = prev;
	}

	// The cinema vignette, baked once per light map size.
	let vignette: HTMLCanvasElement | null = null;
	function vignetteFor(w: number, h: number): HTMLCanvasElement {
		if (vignette && vignette.width === w && vignette.height === h) return vignette;
		vignette = makeCanvas(w, h);
		const vg = getCtx(vignette);
		const gr = vg.createRadialGradient(
			w * 0.5,
			h * 0.5,
			Math.min(w, h) * 0.38,
			w * 0.5,
			h * 0.5,
			Math.hypot(w, h) * 0.64
		);
		gr.addColorStop(0, 'rgb(255, 255, 255)');
		gr.addColorStop(1, 'rgb(148, 156, 154)');
		vg.fillStyle = gr;
		vg.fillRect(0, 0, w, h);
		return vignette;
	}

	/** Extra lights of the game (the hero's flashlight in the escape), in stage space. */
	let extraLights: Array<{ x: number; y: number; r: number; rgb: string; alpha: number }> = [];
	const setExtraLights = (list: typeof extraLights) => {
		extraLights = list;
	};

	function renderLightmap(
		lg: CanvasRenderingContext2D,
		scale: number,
		offX: number,
		offY: number,
		ls: number,
		time: number,
		phase: number,
		mode: string,
		showSpores: boolean,
		showProps: boolean
	) {
		const toX = (sx: number) => (offX + sx * scale) * ls;
		const toY = (sy: number) => (offY + sy * scale) * ls;
		const R = (u: number) => u * scale * ls;

		lg.setTransform(1, 0, 0, 1, 0, 0);
		lg.globalCompositeOperation = 'source-over';

		if (infection >= 0) {
			// the game: the light sinks with the infection
			const k = infection;
			lg.fillStyle =
				mode === 'alert'
					? lerp3([68, 62, 64], [56, 50, 52], k)
					: k < 0.5
						? lerp3([124, 134, 132], [104, 113, 111], k * 2)
						: lerp3([104, 113, 111], [74, 80, 80], k * 2 - 1);
		} else if (mode === 'alert') {
			lg.fillStyle = phase === 3 ? 'rgb(56, 50, 52)' : 'rgb(68, 62, 64)';
		} else {
			lg.fillStyle =
				phase === 1 ? 'rgb(124, 134, 132)' : phase === 2 ? 'rgb(104, 113, 111)' : 'rgb(74, 80, 80)';
		}
		lg.fillRect(0, 0, lg.canvas.width, lg.canvas.height);

		lg.globalCompositeOperation = 'lighter';

		// 1. Overhead corridor lamps evolve across phases
		for (let i = 0; i < CORRIDOR_LAMPS.length; i++) {
			const l = CORRIDOR_LAMPS[i];
			let power = 0;
			if (infection >= 0) {
				// the game: each lamp falters (slowly, unevenly) and goes out at its own point
				const fail = lampFails(i);
				const base = (mode === 'alert' ? 0.32 : 0.68) - 0.06 * infection;
				const uneven = 0.28 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.15 + l.ph));
				if (infection < fail - 0.14) power = base;
				else if (infection < fail)
					power = base * (uneven + (1 - uneven) * ((fail - infection) / 0.14));
				else if (i === 0 || i === 3)
					power =
						(mode === 'alert' ? 0.18 : 0.38) *
						(0.35 + 0.45 * (0.5 + 0.5 * Math.sin(time * 0.9 + l.ph)));
			} else if (phase === 1) {
				power = mode === 'alert' ? 0.32 : 0.68;
			} else if (phase === 2) {
				const base = mode === 'alert' ? 0.25 : 0.62;
				if (l.central) {
					const uneven = 0.28 + 0.45 * (0.5 + 0.5 * Math.sin(time * 1.15 + l.ph));
					power = base * uneven;
				} else {
					power = base * 0.92;
				}
			} else {
				if (i === 0 || i === 3) {
					const weak = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(time * 0.9 + l.ph));
					power = (mode === 'alert' ? 0.18 : 0.38) * weak;
				}
			}
			if (power > 0.01) {
				radialLight(lg, toX(tx(l.x)), toY(ty(l.y)), R(TILE * 4.5), '196, 222, 216', 0.56 * power);
			}
		}

		// 2. Biolab B-7 specimen tank bio-green pools
		for (const tk of TANKS) {
			if (tk.kind !== 'intact') continue;
			const pulse =
				0.88 + 0.12 * Math.sin(time * (tk.id === 2 && phase === 3 ? 2.6 : 1.3) + tk.seed);
			radialLight(
				lg,
				toX(tk.x),
				toY(tk.y),
				R(205),
				'126, 218, 134',
				(mode === 'alert' ? 0.62 : 0.7) * pulse
			);
		}
		if (phase < 3) {
			radialLight(lg, toX(210), toY(520), R(180), '186, 212, 206', mode === 'alert' ? 0.18 : 0.34);
		}

		// 3. Storm planet orange glow & lightning swell from Observation Deck viewport
		const storm = stormLightning(time);
		radialLight(
			lg,
			toX(VIEWPORT.x + 12),
			toY(VIEWPORT.y + 18),
			R(345),
			'244, 142, 58',
			(mode === 'alert' || phase === 3 ? 0.68 : 0.62) + storm * 0.28
		);
		if (storm > 0.01) {
			radialLight(
				lg,
				toX(VIEWPORT.x),
				toY(VIEWPORT.y),
				R(440),
				'255, 220, 174',
				storm * (mode === 'alert' || phase === 3 ? 0.72 : 0.45)
			);
		}
		radialLight(
			lg,
			toX(OBS_CONSOLE.x),
			toY(OBS_CONSOLE.y - 40),
			R(145),
			phase === 3 ? '226, 72, 58' : '136, 212, 148',
			phase === 3 ? 0.44 : 0.34
		);

		// 4. Real warm amber light pools cast onto adjacent walls by the 4 EU Power Cells
		if (showSpores) {
			for (let i = 0; i < EU_TILES.length; i++) {
				const { x, y } = EU_TILES[i];
				if (!present(x, y)) continue;
				const fl = 0.88 + 0.12 * Math.sin(time * 2.1 + i * 1.4);
				radialLight(
					lg,
					toX(tcx(x)),
					toY(tcy(y)),
					R(TILE * 4.4),
					cell.light,
					(phase === 3 ? 0.96 : 0.86) * fl
				);
			}
		}

		// 5. Optional Console & Extraction Hatch pools
		if (showProps) {
			radialLight(
				lg,
				toX(tcx(CONSOLE_TILE.x)),
				toY(tcy(CONSOLE_TILE.y)),
				R(TILE * 2.5),
				phase === 3 ? '232, 92, 72' : '136, 224, 152',
				0.52
			);
			radialLight(
				lg,
				toX(tcx(HATCH_TILE.x)),
				toY(tcy(HATCH_TILE.y)),
				R(TILE * 2.5),
				'156, 220, 150',
				0.48
			);
		}

		// 6. Central sunken lair pit glow
		const lairP = 0.82 + 0.18 * Math.sin(time * 1.4);
		const lairA =
			infection >= 0 ? 0.38 + 0.32 * infection : phase === 1 ? 0.38 : phase === 2 ? 0.54 : 0.7;
		radialLight(lg, toX(tx(12.5)), toY(ty(13.5)), R(TILE * 4.8), '186, 176, 86', lairA * lairP);

		// 7. Slow sweeping/pulsing Red Emergency Beacons (< 2 Hz)
		const redPower =
			mode === 'alert'
				? 1.05
				: infection >= 0
					? 0.14 + 0.72 * Math.pow(infection, 1.3)
					: phase === 1
						? 0.14
						: phase === 2
							? 0.38
							: 0.86;

		for (const b of RED_BEACONS) {
			const bx = toX(b.x);
			const by = toY(b.y);
			const pulse = 0.42 + 0.58 * (0.5 + 0.5 * Math.sin(time * b.speed * 1.35 + b.ph));
			radialLight(lg, bx, by, R(155), '224, 52, 42', 0.52 * redPower * pulse);

			if (b.sweep && (mode === 'alert' || (infection >= 0 ? infection >= 0.35 : phase >= 2))) {
				const ang = time * b.speed * 1.15 + b.ph;
				const swR = R(mode === 'alert' || phase === 3 ? 210 : 155);
				for (const dir of [0, Math.PI]) {
					const sw = lg.createRadialGradient(bx, by, 0, bx, by, swR);
					sw.addColorStop(0, `rgba(232, 56, 44, ${0.44 * redPower})`);
					sw.addColorStop(1, 'rgba(232, 56, 44, 0)');
					lg.fillStyle = sw;
					lg.beginPath();
					lg.moveTo(bx, by);
					lg.arc(bx, by, swR, ang + dir - 0.3, ang + dir + 0.3);
					lg.closePath();
					lg.fill();
				}
			}
		}

		// the game's own lights (the escape's flashlight)
		for (const l of extraLights) radialLight(lg, toX(l.x), toY(l.y), R(l.r), l.rgb, l.alpha);

		// Soft cinema vignette
		lg.globalCompositeOperation = 'multiply';
		lg.drawImage(vignetteFor(lg.canvas.width, lg.canvas.height), 0, 0);
		lg.globalCompositeOperation = 'source-over';
	}

	function buildGrainTile() {
		const c = makeCanvas(256, 256);
		const g = getCtx(c);
		const img = g.createImageData(256, 256);
		const rand = mulberry32(4491);
		for (let i = 0; i < img.data.length; i += 4) {
			const v = Math.floor(rand() * 255);
			img.data[i] = v;
			img.data[i + 1] = v;
			img.data[i + 2] = v;
			img.data[i + 3] = 14;
		}
		g.putImageData(img, 0, 0);
		return c;
	}

	// =========================================================================
	// 15. STATIC ARCHITECTURE BAKE, EDGE-TO-EDGE CAMERA & 60 FPS RENDER LOOP
	// =========================================================================
	function bakeBaseScene() {
		// Transparent outside the station modules so infinite hull backdrop shows seamlessly!
		const [c, g] = makeStageCanvas();
		const rand = mulberry32(7719);

		paintManifoldDuctsAndPlaques(g, rand);
		paintLeftBiolabBase(g, rand);
		paintRightObservationBase(g, rand);
		paintCleanCorridorFloors(g, rand);
		paintAirlockVents(g, rand);

		const wallGeom = buildUnifiedWallGeometries();
		paint25DWallsAndModules(g, wallGeom);
		paintCentralLairPitAndDoors(g, rand);

		return c;
	}

	return {
		STAGE_W,
		STAGE_H,
		TILE,
		MAZE_X,
		MAZE_Y,
		ROWS,
		COLS,
		tx,
		ty,
		tcx,
		tcy,
		bakeBaseScene,
		buildGrainTile,
		bakeRestrainedHivePhase,
		drawInfiniteHullBackdrop,
		drawLiveDuctTurbines,
		drawLiveBiolabTanks,
		drawLiveViewportAndWindowGlint,
		drawLiveObsConsoleScreens,
		drawLiveRoofFans,
		drawEscapeProps,
		drawLairCocoons,
		drawBioSpores,
		drawLabPowerCellsEU,
		drawSporeAt,
		setPresent,
		CONSOLE_TILE,
		HATCH_TILE,
		drawAtmosphereFX,
		renderLightmap,
		radialLight,
		setExtraLights,
		setInfection,
		setCellPalette,
		infectionDistance
	};
}
