// Точка входа игры: цикл, состояния, ввод, связь симуляции с видом, звуком и UI.

import type { GameModule } from '$shared/core/types';
import { getSavedScore, saveScore } from '$shared/utils/scoreStore';
import { Sound } from './audio/Sound';
import { CELL_PX } from './config';
import { OP_NAME, nextLang, roman, tr } from './i18n';
import { autopilot } from './sim/autopilot';
import { Sim } from './sim/Sim';
import type { Dir, Op } from './sim/types';
import {
	actionsStore,
	hudStore,
	screenStore,
	type HudState,
	type MenuItem,
	type Screen
} from './ui/stores';
import { Fx } from './view/Fx';
import { Renderer } from './view/Renderer';

type State = 'title' | 'play' | 'pause' | 'dying' | 'over';

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

const MENUS: Record<Exclude<Screen, null>, MenuItem[]> = {
	title: ['begin', 'language', 'sound'],
	pause: ['resume', 'restart', 'sound', 'mainmenu'],
	over: ['again', 'mainmenu']
};

const STAGE_BG = 'radial-gradient(120% 90% at 50% 0%, #1a1f20, #07090a)';

export class SnakeGame implements GameModule {
	private renderer!: Renderer;
	private sim!: Sim;
	private fx!: Fx;
	private readonly sound = new Sound();
	private state: State = 'title';
	private sel = 0;
	private raf = 0;
	private last = -1;
	private hitStop = 0;
	private demoRestart = 0;
	private lastHud = '';
	private isRecord = false;
	private readonly cleanups: (() => void)[] = [];

	async init(parent: HTMLDivElement): Promise<void> {
		this.renderer = new Renderer(parent);
		this.fx = this.makeFx();
		this.startDemo();
		this.bindInput();
		actionsStore.set({
			select: (i) => this.activate(i),
			hover: (i) => this.setSel(i),
			pause: () => this.togglePause()
		});
		if (typeof document !== 'undefined')
			document.documentElement.style.setProperty('--stage-bg', STAGE_BG);
		this.enter('title');
		this.raf = requestAnimationFrame(this.frame);
	}

	destroy(): void {
		cancelAnimationFrame(this.raf);
		for (const off of this.cleanups) off();
		this.cleanups.length = 0;
		this.sound.destroy();
		this.renderer.destroy();
		actionsStore.set(null);
		screenStore.update((s) => ({ ...s, screen: null }));
		hudStore.update((h) => ({ ...h, visible: false }));
		if (typeof document !== 'undefined')
			document.documentElement.style.removeProperty('--stage-bg');
	}

	// GameStage (тач-панель на планшетах)
	touchDirection(dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): void {
		this.sound.unlock();
		this.steer(({ UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 } as const)[dir]);
	}

	touchPause(): void {
		this.sound.unlock();
		if (this.state === 'play' || this.state === 'pause') this.togglePause();
		else this.activate(this.sel);
	}

	touchMute(): void {
		this.sound.unlock();
		this.toggleMute();
	}

	// ------------------------------------------------------------------ состояния

	private makeFx(): Fx {
		return new Fx(CELL_PX, {
			onEvent: (e) => {
				if (this.state === 'play' || this.state === 'dying') this.sound.play(e);
			},
			actLabel: (act: number) => {
				const op: Op | null = act === 1 ? 'or' : act === 2 ? 'and' : act === 3 ? 'xor' : null;
				return [
					`${tr('act')} ${roman(act)}`,
					op ? `${tr('seal')} ${OP_NAME[op]} — ${tr(op)}` : tr('mixed')
				];
			}
		});
	}

	private startDemo(): void {
		this.sim = new Sim({ seed: (Math.random() * 1e9) | 0, pilot: autopilot });
		this.fx.reset();
		this.renderer.resize(this.sim);
	}

	private startGame(): void {
		this.sim = new Sim({ seed: (Math.random() * 1e9) | 0 });
		this.fx.reset();
		this.renderer.resize(this.sim);
		this.isRecord = false;
		this.lastHud = '';
		this.enter('play');
		this.fx.announceAct(performance.now() / 1000, 1);
	}

	private enter(state: State): void {
		this.state = state;
		const screen: Screen =
			state === 'title' ? 'title' : state === 'pause' ? 'pause' : state === 'over' ? 'over' : null;
		if (screen) this.sel = 0;
		this.sound.setMusic(state === 'play');
		this.pushScreen(screen);
		hudStore.update((h) => ({ ...h, visible: state !== 'title', width: this.renderer.width }));
	}

	private pushScreen(screen: Screen): void {
		const best = parseInt(getSavedScore('snake', 0), 10) || 0;
		screenStore.set({
			screen,
			items: screen ? MENUS[screen] : [],
			sel: this.sel,
			muted: this.sound.muted,
			score: this.sim.score,
			best,
			isRecord: this.isRecord,
			alphas: this.sim.stats.alphas,
			maxLen: this.sim.stats.maxLen,
			act: this.sim.act
		});
	}

	private currentScreen(): Screen {
		return this.state === 'title'
			? 'title'
			: this.state === 'pause'
				? 'pause'
				: this.state === 'over'
					? 'over'
					: null;
	}

	private setSel(i: number): void {
		const screen = this.currentScreen();
		if (!screen) return;
		const n = MENUS[screen].length;
		this.sel = ((i % n) + n) % n;
		screenStore.update((s) => ({ ...s, sel: this.sel }));
	}

	private activate(i: number): void {
		this.sound.unlock();
		const screen = this.currentScreen();
		if (!screen) return;
		this.setSel(i);
		const item = MENUS[screen][this.sel];
		switch (item) {
			case 'begin':
			case 'again':
			case 'restart':
				this.startGame();
				return;
			case 'resume':
				this.enter('play');
				return;
			case 'mainmenu':
				this.startDemo();
				this.enter('title');
				return;
			case 'language':
				nextLang();
				this.pushScreen(screen);
				return;
			case 'sound':
				this.toggleMute();
				return;
		}
	}

	private togglePause(): void {
		if (this.state === 'play') this.enter('pause');
		else if (this.state === 'pause') this.enter('play');
	}

	private toggleMute(): void {
		this.sound.setMuted(!this.sound.muted);
		screenStore.update((s) => ({ ...s, muted: this.sound.muted }));
	}

	private steer(d: Dir): void {
		if (this.state === 'play') this.sim.press(d);
		else if (this.currentScreen()) {
			if (d === 0) this.setSel(this.sel - 1);
			else if (d === 2) this.setSel(this.sel + 1);
		}
	}

	// ------------------------------------------------------------------ ввод

	private bindInput(): void {
		const onKey = (e: KeyboardEvent): void => {
			const dir = KEY_DIR[e.code];
			if (dir !== undefined) {
				e.preventDefault();
				this.sound.unlock();
				this.steer(dir);
				return;
			}
			if (e.code === 'Space' || e.code === 'Escape') {
				e.preventDefault();
				this.sound.unlock();
				if (this.state === 'play' || this.state === 'pause') this.togglePause();
				else if (e.code === 'Space') this.activate(this.sel);
				return;
			}
			if (e.code === 'Enter' || e.code === 'NumpadEnter') {
				e.preventDefault();
				this.sound.unlock();
				if (this.currentScreen()) this.activate(this.sel);
				return;
			}
			if (e.code === 'KeyM') {
				this.sound.unlock();
				this.toggleMute();
			}
		};
		window.addEventListener('keydown', onKey);
		this.cleanups.push(() => window.removeEventListener('keydown', onKey));

		// Свайпы для телефонов: направление по первому заметному смещению.
		let sx = 0;
		let sy = 0;
		let tracking = false;
		const onDown = (e: PointerEvent): void => {
			if (e.pointerType === 'mouse') return;
			this.sound.unlock();
			sx = e.clientX;
			sy = e.clientY;
			tracking = this.state === 'play';
		};
		const onMove = (e: PointerEvent): void => {
			if (!tracking) return;
			const dx = e.clientX - sx;
			const dy = e.clientY - sy;
			if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
			this.steer(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0);
			sx = e.clientX;
			sy = e.clientY;
		};
		const onUp = (): void => {
			tracking = false;
		};
		window.addEventListener('pointerdown', onDown, { passive: true });
		window.addEventListener('pointermove', onMove, { passive: true });
		window.addEventListener('pointerup', onUp, { passive: true });
		window.addEventListener('pointercancel', onUp, { passive: true });
		this.cleanups.push(() => {
			window.removeEventListener('pointerdown', onDown);
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			window.removeEventListener('pointercancel', onUp);
		});

		const onBlur = (): void => {
			if (this.state === 'play') this.enter('pause');
		};
		window.addEventListener('blur', onBlur);
		this.cleanups.push(() => window.removeEventListener('blur', onBlur));
	}

	// ------------------------------------------------------------------ цикл

	private readonly frame = (now: number): void => {
		this.raf = requestAnimationFrame(this.frame);
		const dt = this.last < 0 ? 16.7 : Math.min(100, now - this.last);
		this.last = now;
		const t = now / 1000;

		const live = this.state === 'play' || this.state === 'title' || this.state === 'dying';
		if (live) {
			const angle = this.sim.alpha ? this.renderer.alphaAngle(this.sim.alpha.id) : 0;
			if (this.hitStop > 0) this.hitStop -= dt;
			else this.sim.update(dt);
			if (this.sim.events.length) {
				this.fx.handle(this.sim.events, this.sim, t, angle);
				this.sim.events.length = 0;
				this.hitStop = Math.max(this.hitStop, this.fx.consumeHitStop());
			}
			this.fx.update(dt, t, this.sim);
		}

		if (this.state === 'play' && !this.sim.alive) this.enter('dying');
		if (this.state === 'dying' && this.fx.deathDone(t)) this.finish();
		if (this.state === 'title' && !this.sim.alive) {
			this.demoRestart += dt;
			if (this.demoRestart > 1800) {
				this.demoRestart = 0;
				this.startDemo();
			}
		}

		this.renderer.render(this.sim, this.fx, t, {
			dim:
				this.state === 'title' ? 0.45 : this.state === 'pause' || this.state === 'over' ? 0.6 : 0,
			seal: this.state !== 'title'
		});
		if (this.state !== 'title') this.pushHud();
	};

	private finish(): void {
		this.isRecord = saveScore('snake', this.sim.score);
		this.enter('over');
	}

	private pushHud(): void {
		const pv = this.sim.preview();
		const next: Omit<HudState, 'visible' | 'width'> = {
			score: this.sim.score,
			act: this.sim.act,
			streak: this.sim.streak,
			op: pv ? pv.op : null,
			touching: pv ? pv.touching : 0,
			total: pv ? pv.total : 0,
			ok: pv ? pv.ok : false
		};
		const key = `${next.score}|${next.act}|${next.streak}|${next.op}|${next.touching}|${next.total}|${next.ok}`;
		if (key === this.lastHud) return;
		this.lastHud = key;
		hudStore.update((h) => ({ ...h, ...next }));
	}
}
