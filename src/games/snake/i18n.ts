// Тексты игры на трёх языках. Язык общий с залом игр ($shared/i18n).

import { LANGS, i18n, setLang, type Lang } from '$shared/i18n/i18n.svelte';

const ru = {
	name: 'Дрейф',
	sub: 'спокойная змейка · без поражений',
	play: 'Плыть',
	album: 'Альбом',
	language: 'Язык: Русский',
	soundOn: 'Звук: вкл',
	soundOff: 'Звук: выкл',
	leave: 'В зал игр',
	resume: 'Продолжить',
	mainmenu: 'В меню',
	back: 'Назад',
	paused: 'Пауза',
	sparks: 'искры',
	picture: 'Рисунок',
	tide: 'Прилив',
	albumEmpty: 'Пока пусто. Первый рисунок ждёт в течении.',
	inProgress: 'рисуется',
	unknown: 'ещё не найден',
	keySwim: 'плыть и поворачивать',
	keyStairs: 'две стрелки — лесенкой',
	keyCall: 'зов искр',
	keyPause: 'пауза',
	hintCurrent: 'Стрелки — плыть. Собирайте искры. Пробел — зов',
	hintCurrentTouch: 'Ведите пальцем — плыть. Тап — зов искр',
	hintOpen: 'Портал открыт — плывите в него',
	hintPond: 'Начните со звёздочки и обведите линию клетка за клеткой',
	hintPondTouch: 'Начните со звёздочки и обведите линию: палец задаёт поворот',
	hintStairs: 'Зажмите две стрелки — змейка пойдёт лесенкой по линии',
	hintStairsTouch: 'Палец по диагонали — змейка пойдёт лесенкой по линии',
	hintLost: 'Сбились — линию можно начать заново с любой звёздочки',
	cleared: 'Линии зажжены',
	clearedSub: 'рисунок проступает',
	revealed: 'записано в альбом',
	'pic.fish': 'Рыбка',
	'pic.jelly': 'Медуза',
	'pic.starfish': 'Морская звезда',
	'pic.whale': 'Кит',
	'pic.turtle': 'Черепаха',
	'pic.octopus': 'Осьминог',
	'pic.manta': 'Скат',
	'pic.crab': 'Краб'
};

export type TextKey = keyof typeof ru;

const en: Record<TextKey, string> = {
	name: 'Drift',
	sub: 'a calm snake · no losing',
	play: 'Swim',
	album: 'Album',
	language: 'Language: English',
	soundOn: 'Sound: on',
	soundOff: 'Sound: off',
	leave: 'Game hall',
	resume: 'Resume',
	mainmenu: 'Main menu',
	back: 'Back',
	paused: 'Paused',
	sparks: 'sparks',
	picture: 'Picture',
	tide: 'Tide',
	albumEmpty: 'Empty for now. The first picture waits in the current.',
	inProgress: 'in progress',
	unknown: 'not found yet',
	keySwim: 'swim and turn',
	keyStairs: 'two arrows — a staircase',
	keyCall: 'call the sparks',
	keyPause: 'pause',
	hintCurrent: 'Arrows to swim. Gather sparks. Space to call them',
	hintCurrentTouch: 'Drag to swim. Tap to call the sparks',
	hintOpen: 'The portal is open — swim into it',
	hintPond: 'Start at a star and trace the line cell by cell',
	hintPondTouch: 'Start at a star and trace the line: your finger sets the turn',
	hintStairs: 'Hold two arrows — the snake follows the line as a staircase',
	hintStairsTouch: 'Drag diagonally — the snake follows the line as a staircase',
	hintLost: 'Off the line — start again from either star',
	cleared: 'The lines are lit',
	clearedSub: 'the picture emerges',
	revealed: 'added to the album',
	'pic.fish': 'Fish',
	'pic.jelly': 'Jellyfish',
	'pic.starfish': 'Starfish',
	'pic.whale': 'Whale',
	'pic.turtle': 'Turtle',
	'pic.octopus': 'Octopus',
	'pic.manta': 'Manta ray',
	'pic.crab': 'Crab'
};

const es: Record<TextKey, string> = {
	name: 'Deriva',
	sub: 'una serpiente tranquila · sin derrotas',
	play: 'Nadar',
	album: 'Álbum',
	language: 'Idioma: Español',
	soundOn: 'Sonido: sí',
	soundOff: 'Sonido: no',
	leave: 'Sala de juegos',
	resume: 'Continuar',
	mainmenu: 'Menú principal',
	back: 'Volver',
	paused: 'Pausa',
	sparks: 'chispas',
	picture: 'Dibujo',
	tide: 'Marea',
	albumEmpty: 'Vacío por ahora. El primer dibujo espera en la corriente.',
	inProgress: 'en curso',
	unknown: 'aún sin descubrir',
	keySwim: 'nadar y girar',
	keyStairs: 'dos flechas — en escalera',
	keyCall: 'llamar a las chispas',
	keyPause: 'pausa',
	hintCurrent: 'Flechas para nadar. Recoge chispas. Espacio para llamarlas',
	hintCurrentTouch: 'Arrastra para nadar. Toca para llamar a las chispas',
	hintOpen: 'El portal está abierto: nada hacia él',
	hintPond: 'Empieza en una estrella y repasa la línea casilla a casilla',
	hintPondTouch: 'Empieza en una estrella y repasa la línea: tu dedo marca el giro',
	hintStairs: 'Mantén dos flechas: la serpiente seguirá la línea en escalera',
	hintStairsTouch: 'Arrastra en diagonal: la serpiente seguirá la línea en escalera',
	hintLost: 'Te saliste: empieza de nuevo desde cualquier estrella',
	cleared: 'Las líneas brillan',
	clearedSub: 'el dibujo aparece',
	revealed: 'añadido al álbum',
	'pic.fish': 'Pez',
	'pic.jelly': 'Medusa',
	'pic.starfish': 'Estrella de mar',
	'pic.whale': 'Ballena',
	'pic.turtle': 'Tortuga',
	'pic.octopus': 'Pulpo',
	'pic.manta': 'Manta raya',
	'pic.crab': 'Cangrejo'
};

const DICT: Record<Lang, Record<TextKey, string>> = { ru, en, es };

export function tr(key: TextKey): string {
	return DICT[i18n.lang][key];
}

export function picName(id: string): string {
	const key = `pic.${id}` as TextKey;
	return key in ru ? tr(key) : id;
}

export function nextLang(): void {
	const i = LANGS.findIndex((l) => l.id === i18n.lang);
	setLang(LANGS[(i + 1) % LANGS.length].id);
}

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
export function roman(n: number): string {
	return ROMAN[n] ?? String(n);
}
