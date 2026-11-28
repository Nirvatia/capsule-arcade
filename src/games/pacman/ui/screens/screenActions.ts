/** What the screens' buttons do (the game wires them to its input). */
export interface ScreenActions {
	confirm: () => void;
	pause: () => void;
	menu: () => void;
	profile: () => void;
	/** The ability (a season level) or a shot (the hell): the HUD's dial on a touch screen. */
	fire: () => void;
	/** The dial let go (the hell's plasma fires while it is held). */
	fireRelease: () => void;
	/** The on-screen pad: a direction while pressed, null when let go. */
	steer: (direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT' | null) => void;
}
