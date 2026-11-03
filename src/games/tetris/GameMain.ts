import type { GameModule } from '$shared/core/types';
import { Sfx } from './audio/Sfx';
import { MAX_TICKS_PER_FRAME, TICK_MS } from './config';
import { Simulation } from './core/Simulation';
import { Action, Phase } from './core/types';
import { EventBus } from './engine/EventBus';
import { GameLoop } from './engine/GameLoop';
import { Gestures } from './input/Gestures';
import { Keyboard } from './input/Keyboard';
import { BoardRenderer } from './render/BoardRenderer';
import { persistMuted, ui } from './ui/store.svelte';
import { UiBridge } from './ui/UiBridge';

export class GameMain implements GameModule {
	private readonly bus = new EventBus();
	private readonly sim = new Simulation(this.bus);
	private readonly abort = new AbortController();
	private renderer: BoardRenderer | null = null;
	private bridge: UiBridge | null = null;
	private sfx: Sfx | null = null;
	private keyboard: Keyboard | null = null;
	private gestures: Gestures | null = null;
	private loop: GameLoop | null = null;

	async init(canvasParent: HTMLDivElement): Promise<void> {
		if (!canvasParent) throw new Error('[Tetris/GameMain] Canvas parent is missing');
		const renderer = new BoardRenderer(this.bus);
		renderer.mount(canvasParent);
		this.renderer = renderer;
		this.bridge = new UiBridge(this.bus);
		this.sfx = new Sfx(this.bus, ui.muted);
		this.keyboard = new Keyboard(this);
		this.gestures = new Gestures(renderer.canvas, this.sim, () => renderer.cssCellSize);
		this.loop = new GameLoop(
			TICK_MS,
			MAX_TICKS_PER_FRAME,
			(dt) => this.sim.update(dt),
			(frameMs) => {
				renderer.render(this.sim.state, frameMs);
				this.bridge?.sync(this.sim.state);
			}
		);

		this.sfx.attach();
		this.keyboard.attach();
		this.gestures.attach();
		document.addEventListener(
			'visibilitychange',
			() => {
				if (document.hidden) this.pause();
			},
			{ signal: this.abort.signal }
		);
		window.addEventListener('blur', () => this.pause(), { signal: this.abort.signal });
		this.loop.start();
	}

	destroy(): void {
		this.abort.abort();
		this.loop?.stop();
		this.keyboard?.destroy();
		this.gestures?.destroy();
		this.sfx?.destroy();
		this.bridge?.destroy();
		this.renderer?.destroy();
		this.bus.clear();
		this.loop = null;
		this.renderer = null;
	}

	resize(cellSize: number): void {
		this.renderer?.resize(cellSize);
	}

	start(): void {
		this.sim.start();
	}

	confirm(): void {
		const phase = this.sim.state.phase;
		if (phase === Phase.IDLE || phase === Phase.GAMEOVER) this.sim.start();
		else if (phase === Phase.PAUSED) this.sim.togglePause();
	}

	restart(): void {
		const phase = this.sim.state.phase;
		if (phase === Phase.PAUSED || phase === Phase.GAMEOVER || phase === Phase.IDLE)
			this.sim.start();
	}

	togglePause(): void {
		this.sim.togglePause();
	}

	pause(): void {
		this.sim.releaseAll();
		this.sim.pause();
	}

	press(action: Action): void {
		this.sim.press(action);
	}

	tap(action: Action): void {
		this.sim.tap(action);
	}

	release(action: Action): void {
		this.sim.release(action);
	}

	releaseAll(): void {
		this.sim.releaseAll();
	}

	toggleMute(): void {
		ui.muted = !ui.muted;
		persistMuted(ui.muted);
		this.sfx?.setMuted(ui.muted);
	}
}
