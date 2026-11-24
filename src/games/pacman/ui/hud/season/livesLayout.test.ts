import { describe, expect, it } from 'vitest';
import { LIVES_ICON } from './livesLayout';

// The lives boards as SeasonHud / SeasonHudStack draw them (`boardArt` x, y, w, h), and the
// ink and bevel along their edge, inside which the icon must stay.
const BOARDS = {
	side: { x: 1076, y: 206, width: 142, height: 46, inset: 5 },
	stack: { x: 236, y: 124, width: 118, height: 38, inset: 4 }
} as const;
/** The icon's bob, up, in its own units (it is scaled with the icon). */
const BOB_HEIGHT = 3;

describe('the lives icon', () => {
	for (const mode of ['side', 'stack'] as const) {
		it(`stays inside the ${mode} board's frame throughout its bob`, () => {
			const icon = LIVES_ICON[mode];
			const board = BOARDS[mode];
			// the art fills its whole box: her bow reaches the top edge
			const half = (icon.size * icon.scale) / 2;
			const bob = BOB_HEIGHT * icon.scale;
			expect(icon.y - half - bob).toBeGreaterThanOrEqual(board.y + board.inset);
			expect(icon.y + half).toBeLessThanOrEqual(board.y + board.height - board.inset);
			expect(icon.x - half).toBeGreaterThanOrEqual(board.x + board.inset);
		});
	}
});
