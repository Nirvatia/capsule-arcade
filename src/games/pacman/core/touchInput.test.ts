import { afterEach, describe, expect, it, vi } from 'vitest';
import { SwipeTracker, swipeDirection, swipeThreshold } from './touchInput';
import { InputController, type InputDirection } from './InputController';
import { nextControlScheme } from '../ui/controlsSetting';

describe('a swipe', () => {
	it('goes along its longer axis once it is long enough', () => {
		expect(swipeDirection(20, 5, 16)).toBe('RIGHT');
		expect(swipeDirection(-20, 5, 16)).toBe('LEFT');
		expect(swipeDirection(3, 30, 16)).toBe('DOWN');
		expect(swipeDirection(3, -30, 16)).toBe('UP');
		expect(swipeDirection(10, 10, 16)).toBeNull();
		expect(swipeDirection(NaN, 40, 16)).toBeNull();
	});

	it('is longer on a bigger screen, within limits', () => {
		expect(swipeThreshold(320)).toBe(14);
		expect(swipeThreshold(600)).toBeCloseTo(21);
		expect(swipeThreshold(2000)).toBe(28);
	});
});

describe('the swipe tracker', () => {
	it('holds a direction while the finger is down, and lets go with it', () => {
		const t = new SwipeTracker(16);
		t.down(1, 100, 100);
		expect(t.move(1, 105, 100)).toBeNull();
		expect(t.move(1, 120, 102)).toBe('RIGHT');
		expect(t.held).toBe('RIGHT');
		t.up(1);
		expect(t.held).toBeNull();
		expect(t.active).toBe(false);
	});

	it('turns again without lifting the finger: each swipe starts where the last one ended', () => {
		const t = new SwipeTracker(16);
		t.down(1, 0, 0);
		expect(t.move(1, 30, 0)).toBe('RIGHT');
		// the same way again is no new press
		expect(t.move(1, 60, 0)).toBeNull();
		expect(t.move(1, 62, -25)).toBe('UP');
		expect(t.held).toBe('UP');
	});

	it('steers with one finger only', () => {
		const t = new SwipeTracker(16);
		t.down(1, 0, 0);
		t.down(2, 0, 0);
		expect(t.move(2, 40, 0)).toBeNull();
		expect(t.move(1, 0, 40)).toBe('DOWN');
		t.up(2);
		expect(t.held).toBe('DOWN');
	});
});

describe('steering by touch in the input controller', () => {
	type Listener = (event: unknown) => void;
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	function setup() {
		const listeners = new Map<string, Listener[]>();
		vi.stubGlobal('window', {
			innerWidth: 390,
			innerHeight: 844,
			addEventListener: (type: string, fn: Listener) => {
				listeners.set(type, [...(listeners.get(type) ?? []), fn]);
			},
			removeEventListener: () => {}
		});
		const pressed: InputDirection[] = [];
		const input = new InputController({ direction: (d) => pressed.push(d) });
		input.attach();
		const fire = (type: string, event: Record<string, unknown>) => {
			for (const fn of listeners.get(type) ?? []) {
				fn({
					pointerType: 'touch',
					pointerId: 1,
					preventDefault: () => {},
					cancelable: true,
					...event
				});
			}
		};
		return { input, pressed, fire };
	}

	it('a swipe on the game presses a direction and holds it until the finger lifts', () => {
		const { input, pressed, fire } = setup();
		fire('pointerdown', { clientX: 100, clientY: 400, target: null });
		fire('pointermove', { clientX: 100, clientY: 360 });
		expect(pressed).toEqual(['UP']);
		expect(input.heldDirection).toBe('UP');
		fire('pointerup', {});
		expect(input.heldDirection).toBeNull();
	});

	it('a touch on a button, the dial or the pad does not steer', () => {
		const { input, pressed, fire } = setup();
		const button = { closest: (s: string) => (s.includes('[data-no-swipe]') ? {} : null) };
		fire('pointerdown', { clientX: 100, clientY: 400, target: button });
		fire('pointermove', { clientX: 100, clientY: 300 });
		expect(pressed).toEqual([]);
		expect(input.heldDirection).toBeNull();
	});

	it('the mouse never swipes', () => {
		const { pressed, fire } = setup();
		fire('pointerdown', { pointerType: 'mouse', clientX: 100, clientY: 400, target: null });
		fire('pointermove', { pointerType: 'mouse', clientX: 300, clientY: 400 });
		expect(pressed).toEqual([]);
	});

	it('the pad presses a new direction once and holds it; a held key comes first', () => {
		const { input, pressed } = setup();
		input.steer('LEFT');
		input.steer('LEFT');
		expect(pressed).toEqual(['LEFT']);
		expect(input.heldDirection).toBe('LEFT');
		input.steer(null);
		expect(input.heldDirection).toBeNull();
	});
});

describe('the control scheme', () => {
	it('goes round swipe → pad → swipe', () => {
		expect(nextControlScheme('swipe')).toBe('pad');
		expect(nextControlScheme('pad')).toBe('swipe');
	});
});
