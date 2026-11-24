// Собирает тренажёр в один файл: node src/games/turing/trainer/build.mjs → src/games/turing/Turing.html
// Проверяет решения функций (verify.cjs) перед сборкой.
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
execFileSync(process.execPath, [join(here, 'verify.cjs')], { stdio: 'inherit' });
const read = (f) => readFileSync(join(here, f), 'utf8');
const scripts = ['data.js', 'pdf-tasks.js', 'func-tasks.js', 'app.js', 'game.js', 'scene.js']
	.map((f) => `/* ---- ${f} ---- */\n${read(f)}`)
	.join('\n')
	.replace(/<\/script/gi, '<\\/script');
const html = read('index.html')
	.replace('/*STYLE*/', () => read('style.css'))
	.replace('/*SCRIPTS*/', () => scripts);
const out = join(here, '..', 'Turing.html');
writeFileSync(out, html);
console.log('src/games/turing/Turing.html', Math.round(html.length / 1024), 'KB');
