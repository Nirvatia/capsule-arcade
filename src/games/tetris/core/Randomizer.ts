import { ALL_PIECES } from './pieces';
import type { PieceType } from './types';

export class Randomizer {
	private bag: PieceType[] = [];

	constructor(private readonly random: () => number = Math.random) {}

	reset(): void {
		this.bag = [];
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
			const j = Math.floor(this.random() * (i + 1));
			[bag[i], bag[j]] = [bag[j], bag[i]];
		}
		this.bag = bag;
	}
}
