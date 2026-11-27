import { ZONE } from '../../config/zoneConfig';

export type EmissionPhase = 'calm' | 'siren' | 'wave';
export type EmissionEvent = 'siren' | 'wave' | 'peak' | 'over';

/**
 * The emission: a calm, a siren (time to reach a shelter), then the wave. It hurts whoever is out in
 * the open at the wave's `peak`; when it is over the anomalies move. `calmScale` shortens the calm
 * (a wish's price), `off` is a world without it.
 */
export class EmissionClock {
	private phaseValue: EmissionPhase = 'calm';
	private elapsed = 0;
	private peaked = false;
	private firstCalm = true;

	constructor(
		private readonly calmScale = 1,
		private readonly off = false
	) {}

	get phase(): EmissionPhase {
		return this.phaseValue;
	}

	/** Seconds to the end of the phase. */
	get left(): number {
		return Math.max(0, this.length() - this.elapsed);
	}

	/** 0..1 through the wave, else 0. */
	get waveProgress(): number {
		return this.phaseValue === 'wave' ? Math.min(1, this.elapsed / ZONE.emission.wave) : 0;
	}

	/** True while a hero in the open would be hurt by the wave's peak (the siren and the wave). */
	get dangerous(): boolean {
		return !this.off && this.phaseValue !== 'calm';
	}

	/** For the prototype's button: the siren now. */
	skipCalm(): void {
		if (this.phaseValue === 'calm') {
			this.elapsed = this.length();
		}
	}

	update(dt: number): EmissionEvent[] {
		const events: EmissionEvent[] = [];
		if (this.off) {
			return events;
		}
		this.elapsed += dt;
		if (
			this.phaseValue === 'wave' &&
			!this.peaked &&
			this.elapsed >= ZONE.emission.wave * ZONE.emission.peak
		) {
			this.peaked = true;
			events.push('peak');
		}
		if (this.elapsed < this.length()) {
			return events;
		}
		this.elapsed -= this.length();
		if (this.phaseValue === 'calm') {
			this.phaseValue = 'siren';
			events.push('siren');
		} else if (this.phaseValue === 'siren') {
			this.phaseValue = 'wave';
			this.peaked = false;
			events.push('wave');
		} else {
			this.phaseValue = 'calm';
			this.firstCalm = false;
			events.push('over');
		}
		return events;
	}

	private length(): number {
		const e = ZONE.emission;
		if (this.phaseValue === 'siren') {
			return e.siren;
		}
		if (this.phaseValue === 'wave') {
			return e.wave;
		}
		return (this.firstCalm ? e.first : e.calm) * this.calmScale;
	}
}
