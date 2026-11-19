import { describe, expect, it } from 'vitest';
import { LIVES_ICON } from './livesLayout';

const BOARDS = {
	side: { y: 206, height: 46 },
	stack: { y: 124, height: 38 }
} as const;
const BOB_HEIGHT = 3;

describe('the lives icon', () => {
	for (const mode of ['side', 'stack'] as const) {
		it(`fits inside the ${mode} board throughout its bob`, () => {
			const icon = LIVES_ICON[mode];
			const board = BOARDS[mode];
			const radius = (icon.size * icon.scale) / 2;
			expect(icon.y - radius - BOB_HEIGHT).toBeGreaterThanOrEqual(board.y);
			expect(icon.y + radius).toBeLessThanOrEqual(board.y + board.height);
		});
	}
});
