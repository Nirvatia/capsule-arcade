/**
 * Where the hero's icon sits on the lives board (SeasonHud / BossHud `side`, SeasonHudStack
 * `stack`): inside the board's frame throughout its bob, her bow included (livesLayout.test).
 */
export const LIVES_ICON = {
	side: { x: 1099, y: 230, size: 32, scale: 1 },
	stack: { x: 255, y: 144, size: 38, scale: 0.7 }
} as const;
