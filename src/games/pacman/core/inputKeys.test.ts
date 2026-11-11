import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputController, type InputHandlers } from './InputController';

type Listener = (event: unknown) => void;

function press(code: string, listeners: Map<string, Listener[]>): void {
	for (const listener of listeners.get('keydown') ?? []) {
		listener({ code, repeat: false, preventDefault: () => {} });
	}
}

function setup() {
	const listeners = new Map<string, Listener[]>();
	vi.stubGlobal('window', {
		addEventListener: (type: string, fn: Listener) => {
			listeners.set(type, [...(listeners.get(type) ?? []), fn]);
		},
		removeEventListener: () => {}
	});
	const handlers = {
		menu: vi.fn(),
		profile: vi.fn(),
		mute: vi.fn(),
		pause: vi.fn()
	} satisfies InputHandlers;
	new InputController(handlers).attach();
	return { handlers, key: (code: string) => press(code, listeners) };
}

describe('keys', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('M mutes and does not switch the hero', () => {
		const { handlers, key } = setup();
		key('KeyM');
		expect(handlers.mute).toHaveBeenCalledTimes(1);
		expect(handlers.profile).not.toHaveBeenCalled();
	});

	it('H switches the hero', () => {
		const { handlers, key } = setup();
		key('KeyH');
		expect(handlers.profile).toHaveBeenCalledTimes(1);
		expect(handlers.mute).not.toHaveBeenCalled();
	});

	it('Escape does nothing: it neither pauses nor leaves the game', () => {
		const { handlers, key } = setup();
		key('Escape');
		expect(handlers.menu).not.toHaveBeenCalled();
		expect(handlers.pause).not.toHaveBeenCalled();
	});
});
