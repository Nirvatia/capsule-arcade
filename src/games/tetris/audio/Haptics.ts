import type { EventBus } from '../engine/EventBus';

export class Haptics {
	private enabled = true;
	private readonly unsubscribe: (() => void)[];

	constructor(bus: EventBus) {
		this.unsubscribe = [
			bus.on('hardDrop', () => this.buzz(12)),
			bus.on('clear', (e) => {
				if (e.count >= 4 || e.perfect) this.buzz([30, 40, 70]);
				else if (e.count > 0) this.buzz(18);
			}),
			bus.on('levelUp', () => this.buzz([20, 40, 20])),
			bus.on('gameOver', () => this.buzz([80, 60, 140]))
		];
	}

	setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	destroy(): void {
		for (const off of this.unsubscribe) off();
	}

	private buzz(pattern: number | number[]): void {
		if (!this.enabled || typeof navigator === 'undefined' || !navigator.vibrate) return;
		try {
			navigator.vibrate(pattern);
		} catch {
			this.enabled = false;
		}
	}
}
