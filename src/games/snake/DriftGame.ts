// Точка входа «Дрейфа»: цикл, режимы (Течение → Полотно → оживление), ввод, связь
// логики с видом, звуком и UI.

import { goto } from '$app/navigation';
import { resolve } from '$app/paths';
import type { GameModule } from '$shared/core/types';
import { saveScore } from '$shared/utils/scoreStore';
import { Sound } from './audio/Sound';
import { COLS, CURRENT, POND, ROWS, SAVE_KEY } from './config';
import { nextLang, picName, tr, type TextKey } from './i18n';
import { LIBRARY } from './pictures/library';
import { parsePicture } from './pictures/parse';
import { strokeShape, type StrokeShape } from './pictures/smooth';
import type { Picture, Pt } from './pictures/types';
import { Current } from './sim/current';
import { DIRS, Pond, entryPoint, opposite, type Dir } from './sim/pond';
import { Progress } from './sim/progress';
import {
	actions,
	ui,
	type AlbumCard,
	type HudState,
	type MenuItem,
	type Screen
} from './ui/stores';
import { Fx } from './view/fx';
import type { Tunnel } from './view/post';
import { Renderer } from './view/Renderer';

type Mode = 'current' | 'pond' | 'reveal';

const KEY_DIR: Record<string, Dir> = {
	ArrowUp: 0,
	KeyW: 0,
	ArrowRight: 1,
	KeyD: 1,
	ArrowDown: 2,
	KeyS: 2,
	ArrowLeft: 3,
	KeyA: 3
};

const MENUS: Record<Exclude<Screen, null | 'album'>, MenuItem[]> = {
	title: ['play', 'album', 'language', 'sound', 'leave'],
	pause: ['resume', 'album', 'sound', 'mainmenu']
};

/** Время оживления рисунка до перехода к следующему, с. */
const REVEAL_TIME = 9.5;

interface Transition {
	t: number;
	d1: number;
	d2: number;
	swapped: boolean;
	cx: number;
	cy: number;
	swap: () => Pt;
}

export class DriftGame implements GameModule {
	private renderer!: Renderer;
	private readonly fx = new Fx();
	private readonly sound = new Sound();
	private readonly pictures: Picture[] = LIBRARY.map((p) => parsePicture(p, COLS, ROWS));
	private readonly shapes = new Map<string, StrokeShape[]>();
	private progress!: Progress;

	private mode: Mode = 'current';
	private screen: Screen = 'title';
	/** Куда вернуться из альбома. */
	private albumFrom: Screen = 'title';
	private sel = 0;
	private current: Current | null = null;
	private pond: Pond | null = null;
	private trans: Transition | null = null;
	private time = 0;
	private readonly litAt = new Map<number, number>();
	private colors: number[] = [];
	private colorsKey = '';
	private clearAt = -1;
	private revealT = 0;
	private revealDone = false;
	private readonly held: Dir[] = [];
	private touchVec: Pt | null = null;
	private readonly touch =
		typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

	private raf = 0;
	private last = -1;
	private hintId = 0;
	private bannerId = 0;
	private hudKey = '';
	private readonly cleanups: (() => void)[] = [];

	async init(parent: HTMLDivElement): Promise<void> {
		let store: Storage | null;
		try {
			store = window.localStorage;
		} catch {
			store = null;
		}
		this.progress = new Progress(this.pictures, store, SAVE_KEY);
		this.renderer = new Renderer(parent);
		this.sound.setRoot(this.picture.root);
		this.newCurrent(true);
		this.bindInput(parent);
		actions.set({
			select: (i) => this.activate(i),
			hover: (i) => this.setSel(i),
			pause: () => this.togglePause()
		});
		ui.update((s) => ({ ...s, touch: this.touch, muted: this.sound.muted }));
		this.setScreen('title');
		this.raf = requestAnimationFrame(this.frame);
	}

	destroy(): void {
		cancelAnimationFrame(this.raf);
		for (const off of this.cleanups) off();
		this.cleanups.length = 0;
		this.sound.destroy();
		this.renderer?.destroy();
		actions.set(null);
		ui.update((s) => ({ ...s, screen: null, banner: null, hud: { ...s.hud, visible: false } }));
	}

	private get picture(): Picture {
		return this.progress.picture;
	}

	private shapesOf(p: Picture): StrokeShape[] {
		let s = this.shapes.get(p.id);
		if (!s) this.shapes.set(p.id, (s = p.strokes.map(strokeShape)));
		return s;
	}

	// ------------------------------------------------------------------ экраны и меню

	private setScreen(screen: Screen): void {
		this.screen = screen;
		this.sel = 0;
		const items =
			screen === 'title' || screen === 'pause'
				? MENUS[screen]
				: screen === 'album'
					? (['back'] as MenuItem[])
					: [];
		ui.update((s) => ({
			...s,
			screen,
			items,
			sel: 0,
			album: screen === 'album' ? this.albumCards() : s.album
		}));
		this.pushHud(true);
	}

	private setSel(i: number): void {
		const n = this.menuItems().length;
		if (!n) return;
		this.sel = ((i % n) + n) % n;
		ui.update((s) => ({ ...s, sel: this.sel }));
	}

	private menuItems(): MenuItem[] {
		if (this.screen === 'title' || this.screen === 'pause') return MENUS[this.screen];
		if (this.screen === 'album') return ['back'];
		return [];
	}

	private activate(i: number): void {
		this.sound.unlock();
		const items = this.menuItems();
		if (!items.length) return;
		this.setSel(i);
		switch (items[this.sel]) {
			case 'play':
				this.startPlay();
				return;
			case 'resume':
				this.setScreen(null);
				return;
			case 'album':
				this.albumFrom = this.screen;
				this.setScreen('album');
				return;
			case 'back':
				this.setScreen(this.albumFrom);
				return;
			case 'language':
				nextLang();
				ui.update((s) => ({ ...s }));
				return;
			case 'sound':
				this.toggleMute();
				return;
			case 'mainmenu':
				this.toTitle();
				return;
			case 'leave':
				void goto(resolve('/'));
				return;
		}
	}

	private togglePause(): void {
		if (this.screen === null) this.setScreen('pause');
		else if (this.screen === 'pause') this.setScreen(null);
		else if (this.screen === 'album') this.setScreen(this.albumFrom);
	}

	private toggleMute(): void {
		this.sound.setMuted(!this.sound.muted);
		ui.update((s) => ({ ...s, muted: this.sound.muted }));
	}

	private startPlay(): void {
		this.setScreen(null);
		if (this.mode === 'current' && this.current) {
			this.current.autopilot = false;
			this.current.steer(null);
		}
		if (!this.progress.taught('current')) {
			this.progress.teach('current');
			this.hint(this.touch ? 'hintCurrentTouch' : 'hintCurrent', 7);
		}
	}

	private toTitle(): void {
		this.trans = null;
		this.pond = null;
		this.mode = 'current';
		this.newCurrent(true);
		this.setScreen('title');
	}

	private hint(key: TextKey | null, seconds = 5): void {
		const id = ++this.hintId;
		ui.update((s) => ({ ...s, hint: { id, key } }));
		if (key)
			window.setTimeout(() => {
				if (this.hintId === id) ui.update((s) => ({ ...s, hint: { id, key: null } }));
			}, seconds * 1000);
	}

	private banner(title: string, sub: string, seconds: number): void {
		const id = ++this.bannerId;
		ui.update((s) => ({ ...s, banner: { id, title, sub } }));
		window.setTimeout(() => {
			if (this.bannerId === id) ui.update((s) => ({ ...s, banner: null }));
		}, seconds * 1000);
	}

	private albumCards(): AlbumCard[] {
		const toPath = (pts: Pt[]): string =>
			pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('');
		return this.pictures.map((pic) => {
			const tides = this.progress.data.album.filter((a) => a.id === pic.id).map((a) => a.tide);
			const inProgress = pic.id === this.picture.id && this.progress.data.lit.length > 0;
			const state: AlbumCard['state'] = tides.length ? 'done' : inProgress ? 'progress' : 'unknown';
			const show = (i: number): boolean =>
				state === 'done' || (state === 'progress' && this.progress.isLit(i));
			const shapes = this.shapesOf(pic);
			const paths: string[] = [];
			const dots: Pt[] = [];
			pic.strokes.forEach((s, i) => {
				if (!show(i)) return;
				if (s.cells.length === 1) dots.push(shapes[i].raw[0]);
				else paths.push(toPath(shapes[i].smooth));
			});
			return { id: pic.id, hue: pic.hue, paths, dots, state, tides };
		});
	}

	// ------------------------------------------------------------------ поля

	private newCurrent(demo: boolean): void {
		const { w, h } = this.renderer.field;
		const seed = Math.random;
		this.current = new Current(w, h, seed, CURRENT.NEED);
		this.current.autopilot = demo;
		this.mode = 'current';
		this.pond = null;
		this.held.length = 0;
	}

	private enterPond(): Pt {
		const pic = this.picture;
		const pending = this.progress.pending();
		const strokes = pending.map((id) => ({ id, cells: pic.strokes[id].cells }));
		const all = pic.strokes.map((s) => ({ cells: s.cells }));
		const { cell, dir } = entryPoint(COLS, ROWS, all, Math.random);
		this.pond = new Pond({ cols: COLS, rows: ROWS, strokes, start: cell, dir });
		this.pond.setHeld(this.heldPair());
		this.current = null;
		this.mode = 'pond';
		this.clearAt = -1;
		if (!this.progress.taught('pond')) {
			this.progress.teach('pond');
			this.hint(this.touch ? 'hintPondTouch' : 'hintPond', 8);
		} else if (!this.progress.taught('stairs')) {
			this.progress.teach('stairs');
			this.hint(this.touch ? 'hintStairsTouch' : 'hintStairs', 8);
		}
		return this.renderer.cellPx(cell);
	}

	private startTransition(cx: number, cy: number, swap: () => Pt): void {
		if (this.trans) return;
		this.trans = { t: 0, d1: 0.62, d2: 0.85, swapped: false, cx, cy, swap };
		this.sound.dive();
	}

	private tunnel(): Tunnel | null {
		const T = this.trans;
		if (!T) return null;
		const { W, H } = this.renderer;
		let zoom: number;
		let flash: number;
		let swirl: number;
		if (T.t < T.d1) {
			const p = T.t / T.d1;
			const e = p * p * p;
			zoom = 1 + 11 * e;
			flash = Math.max(0, (p - 0.5) * 2) ** 2;
			swirl = 1.4 * e;
		} else {
			const q = (T.t - T.d1) / T.d2;
			zoom = 1 + 11 * Math.pow(1 - q, 3);
			flash = Math.max(0, 1 - q / 0.65) ** 2;
			swirl = -1.4 * Math.pow(1 - q, 3);
		}
		return { x: T.cx / W, y: T.cy / H, zoom, flash: flash * 0.75, swirl };
	}

	// ------------------------------------------------------------------ ввод

	private heldPair(): Dir[] {
		if (this.held.length < 2) return [];
		const [a, b] = this.held.slice(-2);
		return a === b || a === opposite(b) ? [] : [a, b];
	}

	private steerVec(): Pt | null {
		let x = 0;
		let y = 0;
		for (const d of this.held) {
			x += DIRS[d][0];
			y += DIRS[d][1];
		}
		if (x || y) return { x, y };
		return this.touchVec;
	}

	private bindInput(parent: HTMLElement): void {
		const playing = (): boolean => this.screen === null;
		const onKey = (e: KeyboardEvent): void => {
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const dir = KEY_DIR[e.code];
			this.sound.unlock();
			if (dir !== undefined) {
				e.preventDefault();
				if (!playing()) {
					if (!e.repeat) {
						if (dir === 0) this.setSel(this.sel - 1);
						else if (dir === 2) this.setSel(this.sel + 1);
					}
					return;
				}
				if (!this.held.includes(dir)) this.held.push(dir);
				if (!e.repeat && this.pond && !this.trans) this.pond.press(dir);
				this.pond?.setHeld(this.heldPair());
				return;
			}
			if (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter') {
				e.preventDefault();
				if (e.repeat) return;
				if (!playing()) this.activate(this.sel);
				else if (e.code === 'Space') this.callSparks();
				return;
			}
			if (e.code === 'Escape' || e.code === 'KeyP') {
				e.preventDefault();
				if (this.screen !== 'title') this.togglePause();
				return;
			}
			if (e.code === 'KeyM') this.toggleMute();
		};
		const onKeyUp = (e: KeyboardEvent): void => {
			const dir = KEY_DIR[e.code];
			if (dir === undefined) return;
			const i = this.held.indexOf(dir);
			if (i >= 0) this.held.splice(i, 1);
			this.pond?.setHeld(this.heldPair());
		};
		const onBlur = (): void => {
			this.held.length = 0;
			this.pond?.setHeld([]);
			if (this.screen === null) this.setScreen('pause');
		};

		// Палец: вектор от точки касания задаёт направление. Короткий тап — зов.
		let origin: { x: number; y: number; at: number; moved: boolean; sector: number } | null = null;
		const onDown = (e: PointerEvent): void => {
			this.sound.unlock();
			if (!playing() || (e.target as HTMLElement | null)?.closest('[data-drift-ui]')) return;
			origin = { x: e.clientX, y: e.clientY, at: performance.now(), moved: false, sector: -1 };
		};
		const onMove = (e: PointerEvent): void => {
			if (!origin || !playing()) return;
			const dx = e.clientX - origin.x;
			const dy = e.clientY - origin.y;
			const len = Math.hypot(dx, dy);
			if (len < 16) return;
			origin.moved = true;
			this.touchVec = { x: dx, y: dy };
			if (!this.pond) return;
			// 8 секторов: прямые — поворот, диагонали — лесенка
			const sector = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
			if (sector === origin.sector) return;
			origin.sector = sector;
			const toDir = (s: number): Dir => ((s / 2 + 1) % 4) as Dir;
			if (sector % 2 === 0) {
				this.pond.setHeld([]);
				this.pond.press(toDir(sector));
			} else {
				const a = toDir((sector + 7) % 8);
				const b = toDir((sector + 1) % 8);
				this.pond.setHeld([a, b]);
				if (a !== this.pond.dir && b !== this.pond.dir) this.pond.press(a);
			}
		};
		const onUp = (): void => {
			if (origin && !origin.moved && performance.now() - origin.at < 280) this.callSparks();
			origin = null;
			this.touchVec = null;
			this.pond?.setHeld(this.heldPair());
		};
		const onResize = (): void => {
			const before = this.renderer.field;
			this.renderer.resize();
			const after = this.renderer.field;
			if (before.w !== after.w || before.h !== after.h) this.current?.resize(after.w, after.h);
		};

		window.addEventListener('keydown', onKey);
		window.addEventListener('keyup', onKeyUp);
		window.addEventListener('blur', onBlur);
		parent.addEventListener('pointerdown', onDown);
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
		window.addEventListener('resize', onResize);
		this.cleanups.push(() => {
			window.removeEventListener('keydown', onKey);
			window.removeEventListener('keyup', onKeyUp);
			window.removeEventListener('blur', onBlur);
			parent.removeEventListener('pointerdown', onDown);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
			window.removeEventListener('resize', onResize);
		});
	}

	private callSparks(): void {
		if (this.screen !== null || this.mode !== 'current' || !this.current || this.trans) return;
		this.current.call();
	}

	// ------------------------------------------------------------------ цикл

	private readonly frame = (now: number): void => {
		this.raf = requestAnimationFrame(this.frame);
		const dt = this.last < 0 ? 1 / 60 : Math.min(0.05, (now - this.last) / 1000);
		this.last = now;
		const live =
			this.screen === null ||
			this.screen === 'title' ||
			(this.screen === 'album' && this.albumFrom === 'title');
		if (live) this.update(dt);
		this.renderer.render({
			t: this.time,
			mode: this.mode,
			picture: this.picture,
			shapes: this.shapesOf(this.picture),
			lit: new Set(this.progress.data.lit),
			litAt: this.litAt,
			current: this.current,
			pond: this.pond,
			reveal: this.revealT,
			colors: this.returnedColors(),
			fx: this.fx,
			tunnel: this.tunnel(),
			dim: this.screen === 'title' ? 0.35 : this.screen ? 0.7 : 0
		});
		this.pushHud();
	};

	private update(dt: number): void {
		this.time += dt;
		this.fx.update(dt);
		const T = this.trans;
		if (T) {
			T.t += dt;
			if (!T.swapped && T.t >= T.d1) {
				T.swapped = true;
				const c = T.swap();
				T.cx = c.x;
				T.cy = c.y;
			}
			if (T.t >= T.d1 + T.d2) this.trans = null;
		}
		if (this.mode === 'current' && this.current) this.updateCurrent(dt, this.current);
		else if (this.mode === 'pond' && this.pond) this.updatePond(dt, this.pond);
		else if (this.mode === 'reveal') this.updateReveal(dt);
	}

	private updateCurrent(dt: number, cur: Current): void {
		if (!cur.autopilot && this.screen === null) cur.steer(this.steerVec());
		cur.update(dt);
		const u = this.renderer.unit;
		for (const e of cur.events) {
			if (e.k === 'spark') {
				this.fx.burst(e.x * u, e.y * u, e.big ? 12 : 7, this.picture.hue, 70, 1.2, e.big ? 16 : 11);
				this.fx.ripple(e.x * u, e.y * u, 0.22, 0.08, 0.6);
				if (!cur.autopilot) this.sound.spark(e.big);
			} else if (e.k === 'open') {
				this.fx.burst(cur.gate.x * u, cur.gate.y * u, 18, this.picture.hue, 120, 1.5, 16);
				this.fx.ripple(cur.gate.x * u, cur.gate.y * u, 0.3, 0.13, 0.9);
				if (!cur.autopilot) {
					this.sound.gateOpen();
					if (!this.progress.taught('open')) {
						this.progress.teach('open');
						this.hint('hintOpen', 5);
					}
				}
			} else if (e.k === 'enter') {
				this.startTransition(cur.gate.x * u, cur.gate.y * u, () => this.enterPond());
			} else if (e.k === 'call') {
				this.sound.call();
				this.fx.ripple(cur.x * u, cur.y * u, 0.25, 0.16, 0.9);
			} else if (e.k === 'wrap') {
				const size = Math.min(this.renderer.W, this.renderer.H) * 0.09;
				this.fx.portal(e.from.x * u, e.from.y * u, e.dx, e.dy, size, this.picture.hue, 'in');
				this.fx.portal(e.to.x * u, e.to.y * u, e.dx, e.dy, size, this.picture.hue, 'out', 0.1);
				if (!cur.autopilot) this.sound.whoosh(0.14, 0.55);
			}
		}
		cur.events.length = 0;
	}

	private updatePond(dt: number, pond: Pond): void {
		if (this.clearAt < 0 || this.time - this.clearAt < 0.4) pond.update(dt);
		const pic = this.picture;
		const c = this.renderer.grid.cell;
		for (const e of pond.events) {
			if (e.k === 'trace') this.sound.trace(e.n);
			else if (e.k === 'lost') {
				this.sound.lost();
				if (!this.progress.taught('lost')) {
					this.progress.teach('lost');
					this.hint('hintLost', 5);
				}
			} else if (e.k === 'lit') {
				this.progress.light(e.stroke);
				this.litAt.set(e.stroke, this.time);
				const cells = pic.strokes[e.stroke].cells;
				this.sound.lit(cells.length);
				cells.forEach((cell, i) => {
					if (i % 2 && cells.length > 2) return;
					const p = this.renderer.cellPx(cell);
					this.fx.burst(p.x, p.y, 3, pic.hue, 50, 1.2, c * 0.22);
				});
				const end = this.renderer.cellPx(this.pond?.head ?? cells[0]);
				this.fx.ripple(end.x, end.y, 0.3, 0.1, 0.8);
			} else if (e.k === 'clear') {
				this.clearAt = this.time;
				this.sound.clear();
				if (!this.progress.complete) this.banner(tr('cleared'), tr('clearedSub'), 2.6);
			} else if (e.k === 'wrap') {
				const [dx, dy] = DIRS[e.dir];
				const a = this.renderer.cellPx(e.from);
				const b = this.renderer.cellPx(e.to);
				this.fx.portal(
					a.x + dx * c * 0.5,
					a.y + dy * c * 0.5,
					dx,
					dy,
					c * 1.1,
					this.picture.hue,
					'in'
				);
				this.fx.portal(
					b.x - dx * c * 0.5,
					b.y - dy * c * 0.5,
					dx,
					dy,
					c * 1.1,
					this.picture.hue,
					'out',
					0.1
				);
				this.sound.whoosh(0.1, 0.5);
			}
		}
		pond.events.length = 0;
		if (this.clearAt >= 0 && this.time - this.clearAt > POND.CLEAR_HOLD && !this.trans) {
			if (this.progress.complete) this.startReveal();
			else {
				const h = this.renderer.cellPx(pond.head);
				this.startTransition(h.x, h.y, () => {
					this.newCurrent(false);
					const cur = this.current as Current;
					const u = this.renderer.unit;
					return { x: cur.x * u, y: cur.y * u };
				});
				this.clearAt = Number.POSITIVE_INFINITY;
			}
		}
	}

	private startReveal(): void {
		this.mode = 'reveal';
		this.revealT = 0;
		this.revealDone = false;
		this.clearAt = -1;
		this.sound.reveal();
	}

	private updateReveal(dt: number): void {
		const before = this.revealT;
		this.revealT += dt;
		const pic = this.picture;
		if (before < 3.4 && this.revealT >= 3.4) {
			this.banner(picName(pic.id), tr('revealed'), 5.5);
			const { cell, x, y } = this.renderer.grid;
			this.fx.ripple(x + (cell * COLS) / 2, y + (cell * ROWS) / 2, 0.25, 0.3, 1.4);
		}
		if (this.revealT >= REVEAL_TIME && !this.revealDone && !this.trans) {
			this.revealDone = true;
			this.progress.finishPicture();
			saveScore('snake', this.progress.collected);
			this.litAt.clear();
			const { cell, x, y } = this.renderer.grid;
			this.startTransition(x + (cell * COLS) / 2, y + (cell * ROWS) / 2, () => {
				this.sound.setRoot(this.picture.root);
				this.newCurrent(false);
				const cur = this.current as Current;
				const u = this.renderer.unit;
				return { x: cur.x * u, y: cur.y * u };
			});
		}
	}

	/** Цвета, вернувшиеся в воду: по одному на каждый собранный рисунок, в порядке сбора. */
	private returnedColors(): number[] {
		const key = this.progress.data.album.map((a) => a.id).join(',');
		if (key !== this.colorsKey) {
			this.colorsKey = key;
			const ids = [...new Set(this.progress.data.album.map((a) => a.id))];
			this.colors = ids.map((id) => this.pictures.find((p) => p.id === id)?.hue ?? 0);
		}
		return this.colors;
	}

	// ------------------------------------------------------------------ HUD

	private pushHud(force = false): void {
		const pic = this.picture;
		const pending = new Set(
			this.mode === 'pond' && this.pond
				? this.pond.strokes.map((s) => s.id)
				: this.progress.pending()
		);
		const strokes = pic.strokes.map((_, i) =>
			this.mode === 'reveal' || this.progress.isLit(i) ? 'lit' : pending.has(i) ? 'now' : 'later'
		) as HudState['strokes'];
		const hud: HudState = {
			visible: this.screen !== 'title' && !(this.screen === 'album' && this.albumFrom === 'title'),
			mode: this.mode,
			pic: this.progress.data.pic + 1,
			strokes,
			got: this.current?.got ?? 0,
			need: this.current?.need ?? CURRENT.NEED,
			tide: this.progress.data.tide
		};
		const key = JSON.stringify(hud);
		if (!force && key === this.hudKey) return;
		this.hudKey = key;
		ui.update((s) => ({ ...s, hud }));
	}

	/** Для проверок в браузере: состояние без доступа к приватным полям. */
	debug(): {
		mode: Mode;
		screen: Screen;
		pond: Pond | null;
		current: Current | null;
		progress: Progress;
		renderer: Renderer;
	} {
		return {
			mode: this.mode,
			screen: this.screen,
			pond: this.pond,
			current: this.current,
			progress: this.progress,
			renderer: this.renderer
		};
	}
}
