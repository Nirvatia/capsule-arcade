// Step 0 mock-up, take 2: one canvas, the play screen of level Ф-1 «x + y». The carriage replays
// a fixed table on a loop (no editing, no gameplay); ?frame=edit|run|win freezes one frame.
import { drawPlayScreen, VIEW, type PlayModel } from '../../../src/games/turing/render/screen';
import { BLANK } from '../../../src/games/turing/render/tape';
import { cellKey, type Cmd, type Lamp } from '../../../src/games/turing/render/ui';

const q = new URLSearchParams(location.search);
const frame = q.get('frame');
const frozenT = q.has('t') ? Number(q.get('t')) : 1.3;

const INPUT = '||*||';
const program: Record<string, Cmd> = {
	[cellKey(1, '|')]: { write: '|', move: 1, next: 1 },
	[cellKey(1, '*')]: { write: '|', move: 1, next: 2 },
	[cellKey(2, '|')]: { write: '|', move: 1, next: 2 },
	[cellKey(2, BLANK)]: { write: BLANK, move: -1, next: 3 },
	[cellKey(3, '|')]: { write: BLANK, move: 0, next: 0 }
};

interface Step {
	q: number;
	head: number;
	sym: string;
	cmd: Cmd;
	tape: string[];
}

function simulate() {
	const tape = [...INPUT];
	let head = 0;
	let st = 1;
	const steps: Step[] = [];
	while (st !== 0 && steps.length < 100) {
		const sym = tape[head] ?? BLANK;
		const cmd = program[cellKey(st, sym)];
		steps.push({ q: st, head, sym, cmd, tape: [...tape] });
		tape[head] = cmd.write;
		head += cmd.move;
		st = cmd.next;
	}
	return { steps, final: tape, head };
}

const run = simulate();
const STEP = 0.62;
const START = 1.6;
const END = START + run.steps.length * STEP;
const LOOP = END + 4.6;

function base(t: number): PlayModel {
	return {
		t,
		code: 'ФУНКЦИЯ 1',
		title: 'x + y',
		customer: 'goose',
		goal: { input: INPUT, output: '||||' },
		tests: ['wait', 'wait', 'wait', 'wait'],
		tape: [...INPUT],
		head: 0,
		headPos: 0,
		focus: 2,
		state: 1,
		mood: 'idle',
		board: { states: 3, symbols: ['|', '*', BLANK], cells: { ...program } },
		running: false,
		stars: 0
	};
}

function at(t: number): PlayModel {
	const m = base(t);
	const lt = t % LOOP;
	if (lt < START) {
		m.say = { who: 'customer', text: 'Сложи мои кучки в одну. Га.' };
		return m;
	}
	if (lt < END) {
		const i = Math.floor((lt - START) / STEP);
		const ph = (lt - START - i * STEP) / STEP;
		const s = run.steps[i];
		const written = ph > 0.3;
		m.tape = [...s.tape];
		if (written) m.tape[s.head] = s.cmd.write;
		const mv = ph > 0.45 ? Math.min(1, (ph - 0.45) / 0.5) : 0;
		const ease = mv * mv * (3 - 2 * mv);
		m.head = mv > 0.5 ? s.head + s.cmd.move : s.head;
		m.headPos = s.head + s.cmd.move * ease;
		m.tilt = -s.cmd.move * 0.12 * Math.sin(Math.PI * mv);
		m.state = mv > 0.5 ? s.cmd.next : s.q;
		m.mood = 'focus';
		m.arm = s.cmd.write !== s.sym && ph < 0.6 ? (s.cmd.write === BLANK ? 'erase' : 'write') : 'rest';
		if (s.cmd.write !== s.sym && ph > 0.3) m.flash = { index: s.head, amount: Math.max(0, 1 - (ph - 0.3) * 2.5) };
		m.board.active = { q: s.q, sym: s.sym };
		m.running = true;
		m.tests = ['run', 'wait', 'wait', 'wait'];
		return m;
	}
	const k = lt - END;
	m.tape = run.final;
	m.head = run.head;
	m.headPos = run.head;
	m.state = 0;
	m.tests = m.tests.map((_, i) => (k > 0.25 + i * 0.3 ? 'ok' : i === 0 ? 'ok' : 'run')) as Lamp[];
	if (k > 1.5) {
		m.win = Math.min(1, (k - 1.5) / 0.5);
		m.stars = 3;
		m.mood = 'happy';
		m.arm = 'wave';
		m.say = { who: 'customer', text: 'Га! Четыре. Ни одной лишней.' };
	}
	return m;
}

function frozen(): PlayModel {
	if (frame === 'edit') {
		const m = base(frozenT);
		delete m.board.cells[cellKey(3, '|')];
		m.board.editing = { q: 3, sym: '|' };
		m.picker = { write: BLANK, move: 0 };
		return m;
	}
	if (frame === 'run') return at(START + 2 * STEP + 0.36 * STEP + frozenT * 0);
	return at(END + 4);
}

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function draw(now: number) {
	const dpr = Math.min(2, window.devicePixelRatio || 1);
	const W = window.innerWidth;
	const H = window.innerHeight;
	canvas.width = Math.round(W * dpr);
	canvas.height = Math.round(H * dpr);
	const k = Math.min(W / VIEW.w, H / VIEW.h);
	ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
	ctx.fillStyle = '#07090f';
	ctx.fillRect(0, 0, W, H);
	ctx.translate((W - VIEW.w * k) / 2, (H - VIEW.h * k) / 2);
	ctx.scale(k, k);
	drawPlayScreen(ctx, frame ? frozen() : at(now / 1000));
	if (!frame) requestAnimationFrame(draw);
}

Promise.all(
	['800 20px Unbounded', '700 20px Tektur', '600 20px Tektur', '800 20px "JetBrains Mono"'].map((f) =>
		document.fonts.load(f)
	)
).then(() => requestAnimationFrame(draw));
