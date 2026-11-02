import { describe, expect, it } from 'vitest';
import { seeded } from './logic/seeded';
import { REAL_SOURCE } from './logic/orders';
import type { Mode, Pad } from './logic/types';
import { SimonGame, type Fx } from './SimonGame.svelte';

function setup(seed = 42) {
	const saved: Partial<Record<Mode, number>> = {};
	const game = new SimonGame(
		{ load: (mode) => saved[mode] ?? 0, save: (mode, score) => (saved[mode] = score) },
		seeded(seed)
	);
	const fx: Fx[] = [];
	game.onFx((event) => fx.push(event));
	return { game, fx, saved };
}

function run(game: SimonGame, ms: number, step = 16): void {
	for (let t = 0; t < ms; t += step) game.tick(step);
}

/** Прокручивает показ и возвращает показанную последовательность. */
function watchPlayback(game: SimonGame, fx: Fx[]): Pad[] {
	fx.length = 0;
	let guard = 0;
	while (game.phase === 'playback' && guard++ < 2000) game.tick(16);
	return fx.flatMap((e) => (e.type === 'pad' && e.playback ? [e.pad] : []));
}

describe('SimonGame — classic', () => {
	it('grows the same sequence by one each round', () => {
		const { game, fx } = setup();
		game.start('classic');

		let previous: Pad[] = [];
		for (let round = 1; round <= 6; round += 1) {
			const shown = watchPlayback(game, fx);
			expect(shown).toHaveLength(round);
			expect(shown.slice(0, previous.length)).toEqual(previous);
			expect(game.phase).toBe('input');

			for (const pad of shown) game.press(pad);
			expect(game.phase).toBe('cleared');
			expect(game.score).toBe(round);
			run(game, 1000);
			previous = shown;
		}
	});

	it('ends the game on the first mistake and saves the record', () => {
		const { game, fx, saved } = setup();
		game.start('classic');
		const [first] = watchPlayback(game, fx);
		game.press(first!);
		run(game, 1000);
		const shown = watchPlayback(game, fx);
		game.press(((shown[0]! + 1) % 4) as Pad);

		expect(game.phase).toBe('fail');
		run(game, 2000);
		expect(game.phase).toBe('gameover');
		expect(saved.classic).toBe(1);
	});

	it('times out when the player waits too long', () => {
		const { game, fx } = setup();
		game.start('classic');
		watchPlayback(game, fx);
		run(game, 3100);
		expect(game.phase).toBe('fail');
	});

	it('ignores input during playback and while paused', () => {
		const { game } = setup();
		game.start('classic');
		game.press(0);
		expect(game.phase).toBe('playback');
		game.pause();
		run(game, 10000);
		expect(game.phase).toBe('playback');
	});
});

describe('SimonGame — orders', () => {
	function nextOrder(game: SimonGame) {
		let guard = 0;
		while (game.phase !== 'order' && guard++ < 1000) game.tick(16);
		return game.order!;
	}

	it('rewards correct reactions and punishes mistakes', () => {
		const { game } = setup(7);
		game.start('orders');

		for (let i = 0; i < 30; i += 1) {
			const order = nextOrder(game);
			const livesBefore = game.lives;
			if (order.kind === 'real') game.press(order.pad!);
			else if (order.kind === 'fake') game.skip();
			else run(game, order.durationMs + 50);
			expect(game.phase).toBe('feedback');
			expect(game.lives).toBeGreaterThanOrEqual(livesBefore);
		}
		expect(game.score).toBeGreaterThan(0);
		expect(game.level).toBeGreaterThan(1);
	});

	it('loses a life on a fake order and ends after three mistakes', () => {
		const { game } = setup(3);
		game.start('orders');

		let mistakes = 0;
		while (game.phase !== 'gameover' && mistakes < 10) {
			const order = nextOrder(game);
			if (order.kind === 'real') game.skip();
			else game.press(0);
			expect(game.phase).toBe('fail');
			mistakes += 1;
			run(game, 2000);
		}
		expect(mistakes).toBe(3);
		expect(game.phase).toBe('gameover');
	});

	it('never lets the mascot hint whether an order is fake', () => {
		const { game } = setup(11);
		game.start('orders');
		for (let i = 0; i < 40; i += 1) {
			const order = nextOrder(game);
			if (order.kind !== 'break') expect(game.mood).toBe('shout');
			expect(order.text.startsWith(`${REAL_SOURCE}:`)).toBe(order.kind !== 'fake');
			run(game, order.durationMs + 50);
			if (game.phase === 'fail') run(game, 2000);
			if (game.phase === 'gameover') game.start('orders');
		}
	});
});
