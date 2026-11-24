import type { GameModule } from '../../../shared/core/types';
import type { PacmanEventMap } from './Events';
import { EventBus } from '../engine/EventBus';
import { GameLoop } from '../engine/GameLoop';
import { Director } from './Director';
import { InputController } from './InputController';
import { RenderPipeline } from '../render/RenderPipeline';
import { LevelLoader } from '../logic/level/LevelLoader';
import { PacmanAudioPlayer } from '../audio/PacmanAudioPlayer';
import { muted } from '../audio/audioSettings';
import { hudFrame, screenActions } from '../ui/hud/hudFrame';
import { buildHudSnapshot } from '../ui/hud/hudSnapshot';
import { getSavedScore, saveScore } from '../../../shared/utils/scoreStore';
import {
	setDebugController,
	clearDebugController,
	toggleDebugVisible
} from '../ui/debug/debugActions';
import { TimeControl } from '../engine/TimeControl';
import { FrameMeter } from './debug/FrameMeter';
import { AutoQuality } from '../render/common/autoQuality';
import { graphics, loadAutoQuality, saveAutoQuality } from '../render/common/graphicsSetting';
import { DebugController } from './debug/DebugController';
import { debugLog } from '../logic/debug/debugLog';
import { pushDevLog } from '../ui/debug/devLog';

export class GameMain implements GameModule {
	private events: EventBus<PacmanEventMap> | null = null;
	private level: LevelLoader | null = null;
	private director: Director | null = null;
	private loop: GameLoop | null = null;
	private input: InputController | null = null;
	private render: RenderPipeline | null = null;
	private audio: PacmanAudioPlayer | null = null;
	private detachAutoPause: (() => void) | null = null;
	private detachGraphics: (() => void) | null = null;

	async init(container: HTMLDivElement): Promise<void> {
		if (this.loop) {
			return;
		}
		const events = new EventBus<PacmanEventMap>();
		const level = new LevelLoader(events);
		const audio = new PacmanAudioPlayer(
			events,
			() => ({
				active: level.secretMode,
				urgency: level.progress?.collectionRatio ?? 0
			}),
			() =>
				level.hellMode
					? 'hell'
					: level.stationMode
						? 'station'
						: level.secretMode
							? 'secret'
							: (level.season?.name ?? null)
		);
		const director = new Director(events, level);
		const render = new RenderPipeline(container, director, level, events);
		let highScore = parseInt(getSavedScore('pacman'), 10) || 0;
		let lastState = '';
		const time = new TimeControl();
		const frameMeter = import.meta.env.DEV ? new FrameMeter() : null;
		// the graphics setting: a tier picked by hand, or Auto watching the frames of play
		let auto: AutoQuality | null = null;
		this.detachGraphics = graphics.subscribe((choice) => {
			if (choice === 'auto') {
				auto = new AutoQuality(loadAutoQuality());
				render.setQuality(auto.quality);
			} else {
				auto = null;
				render.setQuality(choice);
			}
		});
		const loop = new GameLoop(
			(dt) => {
				const held = input.heldDirection;
				if (held && (director.stateName === 'playing' || director.stateName === 'ready')) {
					level.setDesiredDirection(held);
				}
				director.update(dt);
			},
			(dt) => {
				render.render(dt);
				const state = director.flow.state;
				if (state === 'game-over' && lastState !== 'game-over') {
					saveScore('pacman', level.score);
					highScore = Math.max(highScore, level.score);
				}
				lastState = state;
				hudFrame.set(buildHudSnapshot(director, level, highScore));
			},
			1 / 60,
			(real) => time.advance(real),
			(timing) => {
				frameMeter?.recordFrame({ ...timing, ...render.canvasInfo });
				const flow = director.flow;
				if (auto && !auto.settled && flow.state === 'playing' && !flow.paused) {
					const next = auto.sample(timing.frameMs);
					if (next) {
						render.setQuality(next);
						saveAutoQuality(auto.state);
					}
				}
			}
		);
		const input = new InputController({
			direction: (direction) => {
				const facing = level.player?.facing ?? '—';
				debugLog(events, 'input', `${direction} (facing ${facing}, ${director.stateName})`);
				frameMeter?.observeInput();
				if (director.stateName === 'playing' || director.stateName === 'ready') {
					level.setDesiredDirection(direction);
				}
			},
			confirm: () => {
				if (director.stateName === 'menu' || director.stateName === 'game-over') {
					director.startGame();
					return;
				}
				if (director.stateName === 'paused') {
					director.togglePause();
					return;
				}
				// READY runs its own countdown: Enter does not skip it
			},
			fire: () => {
				frameMeter?.observeInput();
				if (director.stateName === 'playing') {
					level.requestFire();
				}
			},
			pause: () => {
				director.togglePause();
			},
			menu: () => {
				const state = director.stateName;
				if (
					state === 'playing' ||
					state === 'death' ||
					state === 'level-clear' ||
					state === 'world-shift'
				) {
					director.togglePause();
					return;
				}
				if (
					director.stateName === 'paused' ||
					director.stateName === 'ready' ||
					director.stateName === 'game-over'
				) {
					director.returnToMenu();
				}
			},
			profile: () => {
				if (director.stateName === 'menu' || director.stateName === 'game-over') {
					level.toggleProfile();
				}
			},
			mute: () => muted.toggle(),
			...(import.meta.env.DEV
				? { debugToggle: () => toggleDebugVisible(), debugStep: () => time.step() }
				: {})
		});
		input.attach();
		// a hidden tab or an unfocused window pauses the game; resuming is left to the player
		const onVisibility = (): void => {
			if (document.hidden) {
				director.autoPause();
			}
		};
		const onBlur = (): void => director.autoPause();
		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('blur', onBlur);
		const releasePage = holdPageForTouch(() => audio.unlock());
		this.detachAutoPause = () => {
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('blur', onBlur);
			releasePage();
		};
		screenActions.set({
			confirm: () => input.pressConfirm(),
			pause: () => input.pressPause(),
			menu: () => input.pressMenu(),
			profile: () => input.pressProfile(),
			fire: () => input.pressFire(),
			steer: (direction) => input.steer(direction)
		});
		if (import.meta.env.DEV) {
			const dev = new DebugController(director, level, time, frameMeter, render);
			render.setDebugFlags(dev.renderFlags);
			setDebugController(dev);
			events.on('debug:log', (line) => pushDevLog(line, director.flow.state));
		}
		loop.start();
		if (import.meta.env.DEV) {
			// dev only: lets the browser console and automated play-tests inspect the game
			(window as unknown as { __pacman?: unknown }).__pacman = { level, director, render };
		}
		this.events = events;
		this.level = level;
		this.audio = audio;
		this.director = director;
		this.render = render;
		this.loop = loop;
		this.input = input;
	}

	destroy(): void {
		if (import.meta.env.DEV) {
			delete (window as unknown as { __pacman?: unknown }).__pacman;
		}
		this.loop?.stop();
		this.input?.detach();
		this.detachAutoPause?.();
		this.detachAutoPause = null;
		this.detachGraphics?.();
		this.detachGraphics = null;
		screenActions.set(null);
		hudFrame.set(null);
		clearDebugController();
		this.render?.destroy();
		this.audio?.destroy();
		this.events?.clear();
		this.events = null;
		this.level = null;
		this.director = null;
		this.loop = null;
		this.input = null;
		this.render = null;
		this.audio = null;
	}
}

/**
 * A touch screen plays the game, it does not scroll, zoom or select it: the page holds still
 * under the fingers while the game is open. The first touch (or key) also starts the sound,
 * which a phone allows only inside a gesture. Returns what undoes it.
 */
function holdPageForTouch(unlockAudio: () => void): () => void {
	if (typeof document === 'undefined') {
		return () => undefined;
	}
	const root = document.documentElement;
	const body = document.body;
	const saved = {
		rootTouch: root.style.touchAction,
		rootOverscroll: root.style.overscrollBehavior,
		bodyTouch: body.style.touchAction,
		bodySelect: body.style.userSelect,
		bodyCallout: body.style.getPropertyValue('-webkit-touch-callout'),
		bodyTap: body.style.getPropertyValue('-webkit-tap-highlight-color')
	};
	root.style.touchAction = 'none';
	root.style.overscrollBehavior = 'none';
	body.style.touchAction = 'none';
	body.style.userSelect = 'none';
	body.style.setProperty('-webkit-touch-callout', 'none');
	body.style.setProperty('-webkit-tap-highlight-color', 'transparent');
	// iOS Safari zooms on a pinch even under touch-action: none
	const noGesture = (event: Event): void => event.preventDefault();
	const noMenu = (event: Event): void => {
		if ((event as PointerEvent).pointerType !== 'mouse') {
			event.preventDefault();
		}
	};
	let unlocked = false;
	const unlock = (): void => {
		if (unlocked) {
			return;
		}
		unlocked = true;
		unlockAudio();
		window.removeEventListener('pointerup', unlock);
		window.removeEventListener('keydown', unlock);
	};
	document.addEventListener('gesturestart', noGesture);
	window.addEventListener('contextmenu', noMenu);
	window.addEventListener('pointerup', unlock);
	window.addEventListener('keydown', unlock);
	return () => {
		root.style.touchAction = saved.rootTouch;
		root.style.overscrollBehavior = saved.rootOverscroll;
		body.style.touchAction = saved.bodyTouch;
		body.style.userSelect = saved.bodySelect;
		body.style.setProperty('-webkit-touch-callout', saved.bodyCallout);
		body.style.setProperty('-webkit-tap-highlight-color', saved.bodyTap);
		document.removeEventListener('gesturestart', noGesture);
		window.removeEventListener('contextmenu', noMenu);
		window.removeEventListener('pointerup', unlock);
		window.removeEventListener('keydown', unlock);
	};
}
