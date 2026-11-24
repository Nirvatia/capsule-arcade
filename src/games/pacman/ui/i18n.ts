import { derived, writable } from 'svelte/store';

export type Lang = 'en' | 'ru' | 'es';

/** The language knob goes round in this order. */
const ORDER: readonly Lang[] = ['en', 'ru', 'es'];

const STORAGE_KEY = 'pacman.lang';

const EN = {
	score: 'SCORE',
	high: 'HIGH',
	level: 'LEVEL',
	lives: 'LIVES',
	weapon: 'WEAPON',
	boss: 'BOSS',
	phase: 'PHASE',
	hp: 'HP',
	power: 'POWER',
	overdrive: 'OVERDRIVE',
	echo: 'ECHO',
	mask: 'MASK',
	shock: 'SHOCK',
	/** The ability waits in the slot: the key that spends it. */
	abilityKey: 'F:',
	/** The same on a touch screen: the dial is the button. */
	abilityTap: 'TAP:',
	controls: 'CONTROLS',
	ctl_swipe: 'SWIPE',
	ctl_pad: 'PAD',
	pressTouch: 'Tap START · Swipe on the maze to move · ❚❚ pauses',
	fireTouch: 'The dial: your ability (in the hell, fire)',
	berserk: 'BERSERK',
	bfg: 'BFG',
	barrel: 'BARREL',
	none: '—',
	charge: 'CHARGE',
	rewardHint: 'Take the heart (+1 life) or the exit',
	weather: 'weather',
	night: 'night',
	start: 'START',
	playAgain: 'PLAY AGAIN',
	resume: 'RESUME',
	menu: 'MENU',
	gameSelect: 'GAME SELECT',
	ready: 'READY!',
	paused: 'PAUSED',
	gameOver: 'GAME OVER',
	newRecord: 'NEW RECORD',
	livesLeft: 'lives left',
	lastLife: 'last life',
	pressEnter: 'Enter to start · Arrows / WASD to move · Space to pause · H hero · M mute',
	fire: 'F / Shift — fire (hell)',
	language: 'РУССКИЙ',
	world_spring: 'Spring',
	world_summer: 'Summer',
	world_autumn: 'Autumn',
	world_winter: 'Winter',
	world_hell: 'Hell',
	world_secret: 'Secret',
	boss_hell: 'LORD OF HELL',
	oneUp: '1UP',
	highScore: 'HIGH SCORE',
	round: 'ROUND',
	mute: 'Mute',
	unmute: 'Unmute',
	volume: 'Volume',
	pause: 'Pause',
	food: 'FOOD',
	graphics: 'GRAPHICS',
	gfx_auto: 'AUTO',
	gfx_high: 'HIGH',
	gfx_medium: 'MEDIUM',
	gfx_low: 'LOW'
} as const;

export type I18nKey = keyof typeof EN;

const RU: Record<I18nKey, string> = {
	score: 'ОЧКИ',
	high: 'РЕКОРД',
	level: 'УРОВЕНЬ',
	lives: 'ЖИЗНИ',
	weapon: 'ОРУЖИЕ',
	boss: 'БОСС',
	phase: 'ФАЗА',
	hp: 'ЗДОРОВЬЕ',
	power: 'СИЛА',
	overdrive: 'ОВЕРДРАЙВ',
	echo: 'ЭХО',
	mask: 'МАСКА',
	shock: 'РАЗРЯД',
	abilityKey: 'F:',
	abilityTap: 'ЖМИ:',
	controls: 'УПРАВЛЕНИЕ',
	ctl_swipe: 'СВАЙП',
	ctl_pad: 'КРЕСТ',
	pressTouch: 'Жми СТАРТ · Свайп по лабиринту — ход · ❚❚ — пауза',
	fireTouch: 'Циферблат: способность (в аду — выстрел)',
	berserk: 'БЕРСЕРК',
	bfg: 'BFG',
	barrel: 'БОЧКА',
	none: '—',
	charge: 'ЗАРЯД',
	rewardHint: 'Возьми сердце (+1 жизнь) или выход',
	weather: 'непогода',
	night: 'ночь',
	start: 'СТАРТ',
	playAgain: 'ЕЩЁ РАЗ',
	resume: 'ПРОДОЛЖИТЬ',
	menu: 'МЕНЮ',
	gameSelect: 'ВЫБОР ИГР',
	ready: 'ГОТОВЬСЯ!',
	paused: 'ПАУЗА',
	gameOver: 'ИГРА ОКОНЧЕНА',
	newRecord: 'НОВЫЙ РЕКОРД',
	livesLeft: 'жизней осталось',
	lastLife: 'последняя жизнь',
	pressEnter: 'Enter — старт · Стрелки / WASD — движение · Пробел — пауза · H — герой · M — звук',
	fire: 'F / Shift — выстрел (ад)',
	language: 'ESPAÑOL',
	world_spring: 'Весна',
	world_summer: 'Лето',
	world_autumn: 'Осень',
	world_winter: 'Зима',
	world_hell: 'Ад',
	world_secret: 'Секрет',
	boss_hell: 'ПОВЕЛИТЕЛЬ АДА',
	oneUp: '1UP',
	highScore: 'HIGH SCORE',
	round: 'РАУНД',
	mute: 'Выключить звук',
	unmute: 'Включить звук',
	volume: 'Громкость',
	pause: 'Пауза',
	food: 'ЕДА',
	graphics: 'ГРАФИКА',
	gfx_auto: 'АВТО',
	gfx_high: 'ВЫСОКАЯ',
	gfx_medium: 'СРЕДНЯЯ',
	gfx_low: 'НИЗКАЯ'
};

const ES: Record<I18nKey, string> = {
	score: 'PUNTOS',
	high: 'RÉCORD',
	level: 'NIVEL',
	lives: 'VIDAS',
	weapon: 'ARMA',
	boss: 'JEFE',
	phase: 'FASE',
	hp: 'SALUD',
	power: 'PODER',
	overdrive: 'SOBRECARGA',
	echo: 'ECO',
	mask: 'MÁSCARA',
	shock: 'DESCARGA',
	abilityKey: 'F:',
	abilityTap: 'TOCA:',
	controls: 'CONTROLES',
	ctl_swipe: 'DESLIZAR',
	ctl_pad: 'CRUCETA',
	pressTouch: 'Toca INICIO · Desliza por el laberinto para moverte · ❚❚ pausa',
	fireTouch: 'El dial: tu habilidad (en el infierno, disparar)',
	berserk: 'FURIA',
	bfg: 'BFG',
	barrel: 'BARRIL',
	none: '—',
	charge: 'CARGA',
	rewardHint: 'Toma el corazón (+1 vida) o la salida',
	weather: 'mal tiempo',
	night: 'noche',
	start: 'INICIO',
	playAgain: 'OTRA VEZ',
	resume: 'CONTINUAR',
	menu: 'MENÚ',
	gameSelect: 'ELEGIR JUEGO',
	ready: '¡LISTO!',
	paused: 'PAUSA',
	gameOver: 'FIN DEL JUEGO',
	newRecord: 'NUEVO RÉCORD',
	livesLeft: 'vidas restantes',
	lastLife: 'última vida',
	pressEnter:
		'Enter para empezar · Flechas / WASD para mover · Espacio pausa · H héroe · M sonido',
	fire: 'F / Shift — disparar (infierno)',
	language: 'ENGLISH',
	world_spring: 'Primavera',
	world_summer: 'Verano',
	world_autumn: 'Otoño',
	world_winter: 'Invierno',
	world_hell: 'Infierno',
	world_secret: 'Secreto',
	boss_hell: 'SEÑOR INFERNAL',
	oneUp: '1UP',
	highScore: 'HIGH SCORE',
	round: 'RONDA',
	mute: 'Silenciar',
	unmute: 'Activar sonido',
	volume: 'Volumen',
	pause: 'Pausa',
	food: 'COMIDA',
	graphics: 'GRÁFICOS',
	gfx_auto: 'AUTO',
	gfx_high: 'ALTA',
	gfx_medium: 'MEDIA',
	gfx_low: 'BAJA'
};

const TABLES: Record<Lang, Record<I18nKey, string>> = { en: EN, ru: RU, es: ES };

function initial(): Lang {
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		return ORDER.find((l) => l === stored) ?? 'en';
	} catch {
		return 'en';
	}
}

/** Interface language: English by default, Russian or Spanish on request, remembered per viewer. */
export const lang = writable<Lang>(typeof window === 'undefined' ? 'en' : initial());

lang.subscribe((value) => {
	try {
		localStorage.setItem(STORAGE_KEY, value);
	} catch {
		// storage blocked: the choice lasts for this page only
	}
});

/** The knob: the next language in `ORDER` (each table's `language` names the one it goes to). */
export function toggleLang(): void {
	lang.update((value) => ORDER[(ORDER.indexOf(value) + 1) % ORDER.length]);
}

/** `$t('score')` in components. */
export const t = derived(
	lang,
	(value) =>
		(key: I18nKey): string =>
			TABLES[value][key]
);
