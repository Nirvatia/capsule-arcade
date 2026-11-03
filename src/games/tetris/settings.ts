import { ARR_MS, DAS_MS } from './config';

export interface Settings {
	dasMs: number;
	arrMs: number;
	ghost: boolean;
	gestures: boolean;
	vibration: boolean;
	sound: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
	dasMs: DAS_MS,
	arrMs: ARR_MS,
	ghost: true,
	gestures: false,
	vibration: true,
	sound: true
};

export const DAS_RANGE = { min: 60, max: 300, step: 10 } as const;
export const ARR_RANGE = { min: 0, max: 100, step: 5 } as const;

const KEY = 'neo_arcade_tetris_settings';

function clamp(value: unknown, min: number, max: number, fallback: number): number {
	return typeof value === 'number' && Number.isFinite(value)
		? Math.min(max, Math.max(min, Math.round(value)))
		: fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
	return typeof value === 'boolean' ? value : fallback;
}

export function normalizeSettings(raw: unknown): Settings {
	const v = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
	return {
		dasMs: clamp(v.dasMs, DAS_RANGE.min, DAS_RANGE.max, DEFAULT_SETTINGS.dasMs),
		arrMs: clamp(v.arrMs, ARR_RANGE.min, ARR_RANGE.max, DEFAULT_SETTINGS.arrMs),
		ghost: bool(v.ghost, DEFAULT_SETTINGS.ghost),
		gestures: bool(v.gestures, DEFAULT_SETTINGS.gestures),
		vibration: bool(v.vibration, DEFAULT_SETTINGS.vibration),
		sound: bool(v.sound, DEFAULT_SETTINGS.sound)
	};
}

export function loadSettings(): Settings {
	try {
		const raw = localStorage.getItem(KEY);
		return normalizeSettings(raw ? JSON.parse(raw) : null);
	} catch (error) {
		console.warn('[Tetris/settings] Failed to read settings', error);
		return { ...DEFAULT_SETTINGS };
	}
}

export function saveSettings(settings: Settings): void {
	try {
		localStorage.setItem(KEY, JSON.stringify(settings));
	} catch (error) {
		console.warn('[Tetris/settings] Failed to save settings', error);
	}
}
