import { ALL_PIECES } from './pieces';
import { createRng, type Rng } from './random';
import type { PieceType } from './types';

export class Randomizer {
	private bag: PieceType[] = [];
	private rng: Rng = createRng(1);

	reset(seed: number): void {
		this.bag = [];
		this.rng = createRng(seed);
	}

	next(): PieceType {
		if (this.bag.length === 0) this.refill();
		const piece = this.bag.pop();
		if (piece === undefined) {
			throw new Error('[Tetris/Randomizer] Bag is empty after refill');
		}
		return piece;
	}

	private refill(): void {
		const bag = [...ALL_PIECES];
		for (let i = bag.length - 1; i > 0; i--) {
			const j = Math.floor(this.rng() * (i + 1));
			[bag[i], bag[j]] = [bag[j], bag[i]];
		}
		this.bag = bag;
	}
}
