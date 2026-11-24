// Step 0 mock-up: three static screens drawn with the game's render modules.
import { drawCustomer, type Customer } from '../../../src/games/turing/render/characters';
import { C } from '../../../src/games/turing/render/palette';
import { drawScene, type SceneState } from '../../../src/games/turing/render/scene';

const q = new URLSearchParams(location.search);
const screen = (['hub', 'task', 'func'] as const).find((s) => s === q.get('screen')) ?? 'hub';
const frozen = q.has('t') ? Number(q.get('t')) : null;

const section = document.getElementById(`s-${screen}`)!;
section.classList.add('on');
document.getElementById('crumbs')!.innerHTML = section.dataset.crumbs ?? '';
document.querySelector(`.proto a[data-s="${screen}"]`)?.classList.add('on');
if (frozen !== null) document.querySelector<HTMLElement>('.proto')!.hidden = true;

const tape = (s: string) => [...s];

const scenes: Record<string, (t: number) => SceneState> = {
	heroScene: (t) => ({
		t,
		cells: tape('КАРЕТКА'),
		head: 4,
		focus: 3,
		focusX: 0.66,
		state: 'q1',
		mood: 'happy',
		arm: 'wave',
		tileSize: 64,
		font: 'head',
		sign: 'ЦЕХ «БЕСКОНЕЧНАЯ ЛЕНТА»',
		signColor: C.glow,
		signX: 0.87
	}),
	taskScene: (t) => ({
		t,
		cells: tape('xx||*xx|'),
		head: 6,
		focusX: 0.42,
		state: 'q3',
		mood: 'focus',
		arm: 'write',
		tileSize: 54,
		flash: { index: 6, amount: 0.25 + 0.2 * Math.sin(t * 6) },
		sign: 'ЦЕХ 1 · ПАЛОЧКИ',
		signColor: C.mint,
		signX: 0.13
	}),
	funcScene: (t) => ({
		t,
		cells: tape('aa*aa||||'),
		head: 2,
		focusX: 0.42,
		state: 'q3',
		mood: 'dizzy',
		tileSize: 54,
		sign: 'ОТДЕЛ ФУНКЦИЙ',
		signColor: C.violet,
		signX: 0.12
	})
};

function fit(canvas: HTMLCanvasElement) {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	const w = canvas.clientWidth;
	const h = canvas.clientHeight;
	if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
	}
	const ctx = canvas.getContext('2d')!;
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	return { ctx, w, h };
}

function frame(now: number) {
	const t = frozen ?? now / 1000;
	for (const [id, make] of Object.entries(scenes)) {
		const el = document.getElementById(id) as HTMLCanvasElement | null;
		if (!el || !el.offsetParent) continue;
		const { ctx, w, h } = fit(el);
		drawScene(ctx, w, h, make(t));
	}
	for (const el of section.querySelectorAll<HTMLCanvasElement>('canvas[data-portrait]')) {
		const { ctx, w } = fit(el);
		ctx.clearRect(0, 0, w, w);
		drawCustomer(ctx, el.dataset.portrait as Customer, w, t);
	}
	if (frozen === null) requestAnimationFrame(frame);
}

document.fonts.ready.then(() => requestAnimationFrame(frame));
