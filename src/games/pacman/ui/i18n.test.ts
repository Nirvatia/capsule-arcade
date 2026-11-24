import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import { lang, t, toggleLang } from './i18n';

describe('the interface language', () => {
	it('goes round English, Russian, Spanish; the knob names the next one', () => {
		lang.set('en');
		const seen: string[] = [];
		for (let i = 0; i < 3; i++) {
			seen.push(get(lang));
			const next = get(t)('language');
			toggleLang();
			expect(get(t)('menu')).not.toBe('');
			expect(next.length).toBeGreaterThan(0);
		}
		expect(seen).toEqual(['en', 'ru', 'es']);
		expect(get(lang)).toBe('en');
		lang.set('es');
		expect(get(t)('ready')).toBe('¡LISTO!');
		expect(get(t)('language')).toBe('ENGLISH');
	});
});
