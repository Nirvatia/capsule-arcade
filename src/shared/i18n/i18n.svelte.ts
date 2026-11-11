import { en, type Key } from './en';
import { es } from './es';
import { ru } from './ru';

export type Lang = 'ru' | 'en' | 'es';

export const LANGS: { id: Lang; label: string; locale: string }[] = [
	{ id: 'ru', label: 'RU', locale: 'ru-RU' },
	{ id: 'en', label: 'EN', locale: 'en-US' },
	{ id: 'es', label: 'ES', locale: 'es-ES' }
];

const STORAGE_KEY = 'capsule_arcade_lang';
const dictionaries: Record<Lang, Record<Key, string>> = { en, ru, es };

// The first render, on the server and on the client, is English so that hydration matches;
// `initLang` switches to the saved or the browser's language once the page is mounted.
export const i18n = $state<{ lang: Lang }>({ lang: 'en' });

const isLang = (value: unknown): value is Lang =>
	value === 'ru' || value === 'en' || value === 'es';

function detect(): Lang {
	try {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (isLang(saved)) {
			return saved;
		}
	} catch (e) {
		console.warn('[i18n] Failed to read the language', e);
	}
	for (const tag of navigator.languages ?? [navigator.language]) {
		const base = tag.slice(0, 2).toLowerCase();
		if (isLang(base)) {
			return base;
		}
	}
	return 'en';
}

function apply(lang: Lang) {
	i18n.lang = lang;
	document.documentElement.lang = lang;
}

export function initLang() {
	apply(detect());
}

export function setLang(lang: Lang) {
	apply(lang);
	try {
		localStorage.setItem(STORAGE_KEY, lang);
	} catch (e) {
		console.warn('[i18n] Failed to save the language', e);
	}
}

export function locale(): string {
	return LANGS.find((l) => l.id === i18n.lang)?.locale ?? 'en-US';
}

/** Looks a string up in the current language; `{name}` placeholders take the given values. */
export function t(key: Key, params?: Record<string, string | number>): string {
	const text = dictionaries[i18n.lang][key];
	return params ? text.replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? '')) : text;
}

/** Game texts live in the dictionaries under `game.<id>.<field>`. */
export function gameText(id: string, field: 'title' | 'description' | 'genre'): string {
	return t(`game.${id}.${field}` as Key);
}
