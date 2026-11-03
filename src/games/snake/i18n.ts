import { writable, type Readable } from 'svelte/store';
import type { Op } from './sim/types';

export type Lang = 'ru' | 'en' | 'es';
export const LANGS: readonly Lang[] = ['ru', 'en', 'es'];

const DICT = {
	ru: {
		name: 'УДАВ',
		sub: 'Храм четырёх печатей',
		score: 'Очки',
		seal: 'Печать',
		act: 'Акт',
		streak: 'Серия',
		ring: 'Кольцо',
		ok: 'Удар пройдёт',
		fail: 'Удар не пройдёт',
		hiding: 'Альфа прячется',
		encircle: 'Окружите Альфу',
		begin: 'Начать охоту',
		language: 'Язык: Русский',
		soundOn: 'Звук: вкл',
		soundOff: 'Звук: выкл',
		best: 'Рекорд',
		press: 'Нажмите Enter',
		paused: 'Пауза',
		resume: 'Продолжить',
		restart: 'Заново',
		mainmenu: 'В меню',
		spacehint: 'Пробел — продолжить',
		over: 'Охота окончена',
		record: 'Новый рекорд',
		alphas: 'Альф',
		length: 'Длина',
		again: 'Ещё раз',
		pause: 'Пауза',
		hint: 'Окружите Альфу телом. Печать решает, пройдёт ли удар.',
		or: 'хотя бы одна единица',
		and: 'все щитки — единицы',
		xor: 'нечётное число единиц',
		mixed: 'печати сменяются'
	},
	en: {
		name: 'BOA',
		sub: 'Temple of Four Seals',
		score: 'Score',
		seal: 'Seal',
		act: 'Act',
		streak: 'Streak',
		ring: 'Ring',
		ok: 'Strike will land',
		fail: 'Strike will fail',
		hiding: 'The Alpha is hiding',
		encircle: 'Encircle the Alpha',
		begin: 'Begin the hunt',
		language: 'Language: English',
		soundOn: 'Sound: on',
		soundOff: 'Sound: off',
		best: 'Best',
		press: 'Press Enter',
		paused: 'Paused',
		resume: 'Resume',
		restart: 'Restart',
		mainmenu: 'Main menu',
		spacehint: 'Space to resume',
		over: 'The hunt is over',
		record: 'New record',
		alphas: 'Alphas',
		length: 'Length',
		again: 'Again',
		pause: 'Pause',
		hint: 'Encircle the Alpha with your body. The seal decides if the strike lands.',
		or: 'at least one 1',
		and: 'every shield is 1',
		xor: 'an odd number of 1s',
		mixed: 'the seals keep changing'
	},
	es: {
		name: 'BOA',
		sub: 'Templo de los Cuatro Sellos',
		score: 'Puntos',
		seal: 'Sello',
		act: 'Acto',
		streak: 'Racha',
		ring: 'Anillo',
		ok: 'El golpe acertará',
		fail: 'El golpe fallará',
		hiding: 'El alfa se esconde',
		encircle: 'Rodea al alfa',
		begin: 'Comenzar la caza',
		language: 'Idioma: Español',
		soundOn: 'Sonido: sí',
		soundOff: 'Sonido: no',
		best: 'Récord',
		press: 'Pulsa Enter',
		paused: 'Pausa',
		resume: 'Continuar',
		restart: 'Reiniciar',
		mainmenu: 'Menú principal',
		spacehint: 'Espacio para continuar',
		over: 'La caza ha terminado',
		record: 'Nuevo récord',
		alphas: 'Alfas',
		length: 'Longitud',
		again: 'Otra vez',
		pause: 'Pausa',
		hint: 'Rodea al alfa con tu cuerpo. El sello decide si el golpe acierta.',
		or: 'al menos un 1',
		and: 'todos los escudos son 1',
		xor: 'un número impar de unos',
		mixed: 'los sellos cambian'
	}
} as const;

export type TextKey = keyof (typeof DICT)['ru'];

const STORAGE_KEY = 'neo_arcade_lang';

function initialLang(): Lang {
	if (typeof window === 'undefined') return 'ru';
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved === 'ru' || saved === 'en' || saved === 'es') return saved;
	} catch {
		// хранилище недоступно — берём язык браузера
	}
	const nav = navigator.language.slice(0, 2);
	return nav === 'en' || nav === 'es' ? nav : 'ru';
}

const langStore = writable<Lang>(initialLang());
export const lang: Readable<Lang> = langStore;

let current: Lang = initialLang();
langStore.subscribe((l) => (current = l));

export function setLang(l: Lang): void {
	langStore.set(l);
	try {
		localStorage.setItem(STORAGE_KEY, l);
	} catch {
		// не критично
	}
}

export function nextLang(): void {
	setLang(LANGS[(LANGS.indexOf(current) + 1) % LANGS.length]);
}

export function tr(key: TextKey, l: Lang = current): string {
	return DICT[l][key];
}

export const OP_NAME: Record<Op, string> = { or: 'OR', and: 'AND', xor: 'XOR' };

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
export function roman(n: number): string {
	return ROMAN[n] ?? String(n);
}

/** 12840 → «12 840». */
export function formatScore(n: number): string {
	return String(Math.max(0, Math.floor(n))).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
