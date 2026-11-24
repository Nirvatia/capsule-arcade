const LEVELS = [...DATA.levels, ...FUNC_TASKS, ...PDF_TASKS], POOL = [...FUNC_TASKS, ...PDF_TASKS];
const LOOP_LIMIT = 20000;
const limitFor = e => e === LOOP ? LOOP_LIMIT : LIMIT;
const showExp = e => e === LOOP ? '∞ (работает вечно)' : e;
const B = '_', LIMIT = 1000000, HIST = 500, KEY = 'tm-game-v3';
const $ = id => document.getElementById(id);
const sym = s => s === B ? 'λ' : s;
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const qh = q => `<span class="q">q<sub>${q.slice(1)}</sub></span>`;
const MOVES = [['L','← L'],['R','→ R'],['S','• S']];
const dx = m => m === 'L' ? -1 : m === 'R' ? 1 : 0;
const KIND = {build: 'собери машину', predict: 'прочитай таблицу', trace: 'запиши конфигурации'};

let store = {done: {}, rules: {}, cur: 0, test: null};
try {
  const s = JSON.parse(localStorage.getItem(KEY));
  if (s && s.done) store = Object.assign(store, s);
  else {
    const o = JSON.parse(localStorage.getItem('tm-game-v2')) || JSON.parse(localStorage.getItem('tm-game-v1'));
    if (o && o.done) { store.done = o.done; store.rules = o.rules || {}; store.cur = o.cur || 0; store.test = o.test || null; }
  }
} catch (e) {}
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} };

let view = 'level', li = 0, L = null, ctx = null, sim = null, timer = null, clockTimer = null;
let inputIdx = 0, customWord = '', hintN = 0, armed = {}, tr = null, rulePage = 0;

/* ================= core ================= */
const get = (t, p) => t.has(p) ? t.get(p) : B;
function newSim(rules, word, limit = LIMIT) {
  const tape = new Map(); [...word].forEach((c, i) => tape.set(i, c));
  const table = new Map();
  rules.forEach((r, i) => { const key = r[0] + '|' + r[1]; if (!table.has(key)) table.set(key, i); });
  const s = {rules, table, tape, limit, pos: 0, q: 'q1', steps: 0, status: 'idle', last: -1, missing: null, hist: [], recent: [], lastMove: null, used: new Set()};
  s.hist.push(cfgHTML(s.tape, s.pos, s.q)); return s;
}
function step(s) {
  if (s.q === 'q0') return;
  const a = get(s.tape, s.pos), i = s.table.get(s.q + '|' + a);
  if (i === undefined) { s.status = 'hang'; s.missing = [s.q, a]; return; }
  const r = s.rules[i];
  s.tape.set(s.pos, r[3]); s.pos += dx(r[4]); s.q = r[2]; s.steps++; s.last = i; s.lastMove = r[4]; s.used.add(i);
  s.recent.push([r[0], a, r[4]]); if (s.recent.length > 60) s.recent.shift();
  if (s.hist.length < HIST) s.hist.push(cfgHTML(s.tape, s.pos, s.q));
  s.status = s.q === 'q0' ? 'done' : s.steps >= s.limit ? 'loop' : 'run';
}
function runWord(rules, word, limit = LIMIT) { const s = newSim(rules, word, limit); while (s.status === 'idle' || s.status === 'run') step(s); return s; }
function bounds(t) { let lo = Infinity, hi = -Infinity; for (const [k, v] of t) if (v !== B) { lo = Math.min(lo, k); hi = Math.max(hi, k); } return [lo, hi]; }
function contentOf(t) { const [lo, hi] = bounds(t); if (lo === Infinity) return ''; let s = ''; for (let i = lo; i <= hi; i++) s += get(t, i); return s; }
function cfgRange(t, pos) { let [lo, hi] = bounds(t); if (lo === Infinity) lo = hi = pos; return [Math.min(lo - 1, pos), Math.max(hi + 1, pos)]; }
function cfgHTML(t, pos, q) { const [lo, hi] = cfgRange(t, pos); let h = ''; for (let i = lo; i <= hi; i++) h += (i === pos ? qh(q) : '') + esc(sym(get(t, i))); return h; }
function cfgKey(t, pos, q) {
  let [lo, hi] = bounds(t); if (lo === Infinity) lo = hi = pos;
  lo = Math.min(lo, pos); hi = Math.max(hi, pos);
  let c = ''; for (let i = lo; i <= hi; i++) c += get(t, i);
  return q + '|' + (pos - lo) + '|' + c;
}
function parseCfg(text, alphabet) {
  const s = text.replace(/\s+/g, '').replace(/[₀-₉]/g, d => String('₀₁₂₃₄₅₆₇₈₉'.indexOf(d)));
  const cells = []; let q = null, head = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ((c === 'q' || c === 'Q') && /[0-9]/.test(s[i + 1] || '')) { if (q) return {err: 'Состояние должно встречаться в записи один раз.'}; q = 'q' + s[i + 1]; head = cells.length; i++; continue; }
    if (c === 'λ' || c === '_' || c === 'Λ') { cells.push(B); continue; }
    if (alphabet.includes(c)) { cells.push(c); continue; }
    return {err: `Непонятный символ «${c}». Можно: ${[...alphabet].map(sym).join(' ')} и состояние вида q1.`};
  }
  if (!q) return {err: 'В записи нет состояния (например, q1). Его ставят перед клеткой, на которую смотрит робот.'};
  if (head === cells.length) cells.push(B);
  const t = new Map(); cells.forEach((c, i) => t.set(i, c));
  return {key: cfgKey(t, head, q)};
}
function snapshots(rules, word) {
  const s = newSim(rules, word), out = [{t: new Map(s.tape), pos: s.pos, q: s.q, rule: -1}];
  while ((s.status === 'idle' || s.status === 'run') && out.length < 200) { step(s); if (s.status === 'hang') break; out.push({t: new Map(s.tape), pos: s.pos, q: s.q, rule: s.last}); }
  return out;
}

/* ================= smart tips ================= */
function staticTips(rules) {
  const tips = [];
  if (!rules.length) return ['Таблица пуста. Начни с вопроса: что робот делает в q1, когда видит первый символ?'];
  const has = new Set(rules.map(r => r[0]));
  if (!has.has('q1')) tips.push('Нет ни одной команды для q1, а робот всегда начинает в q1.');
  if (!rules.some(r => r[2] === 'q0')) tips.push('Ни одна команда не ведёт в q0, поэтому робот никогда не остановится. Подумай, в какой момент работа закончена, — там нужен переход в q0.');
  [...new Set(rules.map(r => r[2]))].filter(q => q !== 'q0' && !has.has(q)).forEach(q => tips.push(`В ${q} есть переход, но для ${q} нет ни одной команды: попав туда, робот сразу зависнет.`));
  return tips;
}
function runTip(s, exp, word) {
  if (exp === LOOP && s.status === 'done') return 'На этом входе функция не определена, поэтому машина должна работать вечно, а она остановилась. Найди место, где выясняется, что ответа нет, и поставь туда вечный цикл — например, команду «в том же состоянии пишу тот же символ, ход S».';
  if (exp === LOOP && s.status === 'loop') return '';
  if (s.status === 'hang') {
    const [q, a] = s.missing;
    if (a === B) {
      if (s.lastMove === 'R') return `Робот в ${q} дошёл до пустой клетки справа. Что делать на λ? Обычно здесь стоп (→ q0), разворот (ход L) или дописывание символа.`;
      if (s.lastMove === 'L') return `Робот в ${q} уехал левее слова и видит λ. Обычно здесь разворот (ход R) или стоп.`;
      return `В ${q} нет команды для λ.`;
    }
    return `Робот в ${q} видит «${sym(a)}», а команды нет. Если он и правда сюда попадает — реши, что делать. Часто нужно просто пройти мимо: записать тот же символ и идти дальше.`;
  }
  if (s.status === 'loop') {
    const rec = s.recent.slice(-30);
    if (rec.every(x => x[1] === B) && new Set(rec.map(x => x[2])).size === 1)
      return `Робот уехал в бесконечность ${rec[0][2] === 'R' ? 'вправо' : 'влево'}: в ${rec[rec.length - 1][0]} на λ стоит «иди дальше». На λ нужен стоп или разворот.`;
    return `Робот ходит по кругу (${[...new Set(s.recent.map(x => x[0]))].join(', ')}) и не останавливается. Проверь, что каждый круг что-то меняет (например, помечает взятый символ) и что есть выход в q0.`;
  }
  if (s.status === 'done' && exp != null) {
    const got = contentOf(s.tape);
    if (got === exp) return '';
    if (got.includes(B)) return 'Внутри ответа осталась пустая клетка — дырка. Скорее всего, стёрт символ в середине. Стирать можно с края, а в середине — помечать.';
    const extra = [...new Set([...got].filter(c => !exp.includes(c)))];
    if (extra.length) return `На ленте остались лишние символы: ${extra.map(sym).join(' ')}. Не забыта ли уборка в конце?`;
    if (got === word) return 'Лента не изменилась. Проверь, что команды пишут новые символы, а не переписывают те же.';
    if (got.length !== exp.length) return `Ответ ${got.length > exp.length ? 'длиннее' : 'короче'} нужного на ${Math.abs(got.length - exp.length)} симв. Возможно, робот остановился ${got.length > exp.length ? 'не стерев лишнее' : 'слишком рано'}.`;
    let i = 0; while (got[i] === exp[i]) i++;
    return `Длина верная, но символ №${i + 1} не тот: ${sym(got[i])} вместо ${exp[i]}.`;
  }
  return '';
}
const tipHTML = t => t ? `<div class="tip">${esc(t)}</div>` : '';

/* ================= navigation ================= */
let navMode = 'course';
const inMode = (l, m) => m === 'pdf' ? l.source === 'pdf' : m === 'func' ? l.source === 'func' : !l.source;
function renderNav() {
  const entries = LEVELS.map((l, i) => ({l, i})).filter(({l}) => inMode(l, navMode));
  const n = entries.filter(({l}) => store.done[l.id]).length;
  $('prog').innerHTML = `<div class="prog-label"><span>${navMode === 'pdf' ? 'Задачи PDF' : navMode === 'func' ? 'Функции' : 'Учебная миссия'}</span><b>${n}/${entries.length}</b></div><div class="bar"><i style="width:${100 * n / entries.length}%"></i></div>`;
  let h = '', part = '';
  entries.forEach(({l, i}) => {
    if (l.part !== part) { part = l.part; h += `<div class="part">${esc(part)}</div>`; }
    const cur = view === 'level' && i === li, d = store.done[l.id];
    const number = l.source === 'pdf' || l.source === 'func' ? l.id : i + 1;
    h += `<button class="lv${cur ? ' cur' : ''}${d ? ' done' : ''}" data-i="${i}" ${cur ? 'aria-current="true"' : ''} title="${esc(KIND[l.kind])}"><span class="n k-${l.kind}">${d ? '✓' : esc(number)}</span><span class="t">${esc(l.title)}</span></button>`;
  });
  $('lvlist').innerHTML = h;
  $('navtest').classList.toggle('cur', view === 'test');
  document.querySelectorAll('[data-navmode]').forEach(b => b.classList.toggle('on', b.dataset.navmode === navMode));
}
$('lvlist').addEventListener('click', e => { const b = e.target.closest('.lv'); if (b) openLevel(+b.dataset.i); });
$('navtest').onclick = () => openTest();

function show(ids) {
  ['testbar', 'testintro', 'testres', 'story', 'quiz', 'machine', 'tracer', 'rules', 'check', 'histcard'].forEach(id => $(id).hidden = !ids.includes(id));
}

/* ================= levels ================= */
function openLevel(i) {
  stopRun(); view = 'level'; li = i; L = LEVELS[i]; navMode = L.source || 'course'; store.cur = i; save();
  const k = L.kind;
  ctx = {kind: k, states: L.states, alphabet: L.alphabet, notes: L.notes, hints: L.hints || [], solution: L.solution, readonly: k !== 'build',
    rules: (k === 'build' ? (store.rules[L.id] || L.start || []) : L.rules).map(r => r.slice()),
    tests: k === 'build' ? L.tests : k === 'predict' ? L.items.map(w => [w, null]) : [[L.input, null]],
    custom: k !== 'trace', showSol: k === 'build',
    persist: () => { if (k === 'build') { store.rules[L.id] = ctx.rules; save(); } }};
  inputIdx = 0; customWord = ''; hintN = 0; armed = {}; rulePage = 0;
  $('eyebrow').innerHTML = `Уровень ${i + 1} из ${LEVELS.length} · ${esc(L.part)}<span class="kind">${KIND[k]}</span>`;
  $('title').textContent = L.title; $('theory').innerHTML = L.theory; $('goal').innerHTML = L.goal;
  $('tasks').textContent = L.warning || (L.tasks ? 'Где пригодится: ' + L.tasks : '');
  $('tasks').classList.toggle('source-warning', Boolean(L.warning));
  $('res').innerHTML = ''; $('win').innerHTML = ''; $('hints').innerHTML = '';
  show(['story', 'machine', 'rules', ...(k === 'build' ? ['check', 'histcard'] : k === 'predict' ? ['quiz', 'histcard'] : ['tracer'])]);
  $('controls').hidden = k === 'trace';
  setupRulesCard(); renderNav(); renderInputs(); resetSim();
  if (k === 'trace') initTrace();
  if (k === 'predict') renderQuiz();
  if (window.scrollY > 200) window.scrollTo({top: 0, behavior: 'smooth'});
}
function markDone(winHTML) {
  const first = !store.done[L.id];
  store.done[L.id] = true; save(); renderNav();
  window.dispatchEvent(new CustomEvent('tm:complete', {detail: {level: L, first, hints: hintN}}));
  const nx = li + 1 < LEVELS.length ? LEVELS[li + 1] : null;
  return `<div class="win"><div><b>Уровень пройден!</b><div style="color:var(--muted);font-size:14px">${winHTML || ''}${nx ? 'Дальше: ' + esc(nx.title) : 'Это был последний уровень. Попробуй «Пробный тест» сверху.'}</div></div>${nx ? `<button class="btn primary" data-next="1">Следующий уровень →</button>` : `<button class="btn primary" data-totest="1">Пробный тест →</button>`}</div>`;
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-next]')) openLevel(li + 1);
  if (e.target.closest('[data-totest]')) openTest();
});

/* ================= rules card ================= */
function setupRulesCard() {
  $('rulesSub').innerHTML = ctx.readonly
    ? 'Эта таблица готовая, менять её не нужно. Читай строку <span class="mono">q<sub>i</sub>, a → q<sub>k</sub>, b, X</span> так: «в состоянии q<sub>i</sub> вижу a → перехожу в q<sub>k</sub>, пишу b, сдвигаюсь X».'
    : 'Каждая строка — одна команда в записи <span class="mono">q<sub>i</sub>, a → q<sub>k</sub>, b, X</span>: «в состоянии q<sub>i</sub> вижу a → перехожу в q<sub>k</sub>, пишу b, сдвигаюсь X». Для одной пары «состояние + символ» — ровно одна строка.';
  $('notes').innerHTML = ctx.notes ? Object.entries(ctx.notes).map(([q, t]) => `<span>${qh(q)} = ${esc(t)}</span>`).join('') : '';
  $('rthead').innerHTML = ctx.readonly ? '' : '<tr><th>состояние</th><th>видит</th><th></th><th>новое</th><th>пишет</th><th>ход</th><th></th></tr>';
  $('rt').className = 'rt' + (ctx.readonly ? ' ro' : '');
  $('bAdd').hidden = $('bClear').hidden = ctx.readonly;
  $('bSol').hidden = !ctx.showSol || !ctx.solution;
  $('bHint').hidden = !ctx.hints.length;
  $('bSol').textContent = 'Показать решение'; $('bClear').textContent = 'Очистить';
  updateHintBtn(); renderRules();
}
function dups(rules) { const c = {}; rules.forEach(r => { const k = r[0] + '|' + r[1]; c[k] = (c[k] || 0) + 1; }); return c; }
function opts(list, val, label = x => x) { return list.map(x => `<option value="${esc(x)}"${x === val ? ' selected' : ''}>${esc(label(x))}</option>`).join(''); }
function renderRules(active = -1) {
  const rules = ctx.rules;
  if (ctx.readonly) {
    $('rulePager').hidden = true;
    $('rows').innerHTML = rules.map((r, i) => `<tr class="${i === active ? 'active' : ''}"><td>${qh(r[0])},</td><td>${esc(sym(r[1]))}</td><td class="arrow">→</td><td>${qh(r[2])},</td><td>${esc(sym(r[3]))},</td><td>${r[4]}</td></tr>`).join('');
    $('empty').hidden = true; return;
  }
  const per = 40, pages = Math.max(1, Math.ceil(rules.length / per));
  if (active >= 0) rulePage = Math.floor(active / per);
  rulePage = Math.max(0, Math.min(rulePage, pages - 1));
  const start = rulePage * per, visible = rules.slice(start, start + per);
  const d = dups(rules), targets = [...ctx.states, 'q0'], al = [...ctx.alphabet];
  $('rows').innerHTML = visible.map((r, offset) => { const i = start + offset; return `<tr class="${d[r[0] + '|' + r[1]] > 1 ? 'dup' : ''}${i === active ? ' active' : ''}" data-i="${i}">
    <td><select data-k="0" aria-label="состояние">${opts(ctx.states, r[0])}</select></td>
    <td><select data-k="1" aria-label="видит">${opts(al, r[1], sym)}</select></td>
    <td class="arrow">→</td>
    <td><select data-k="2" aria-label="новое состояние">${opts(targets, r[2])}</select></td>
    <td><select data-k="3" aria-label="пишет">${opts(al, r[3], sym)}</select></td>
    <td><select data-k="4" aria-label="ход">${MOVES.map(([v, t]) => `<option value="${v}"${v === r[4] ? ' selected' : ''}>${t}</option>`).join('')}</select></td>
    <td><button class="del" aria-label="удалить строку" title="удалить">×</button></td></tr>`; }).join('');
  $('empty').hidden = rules.length > 0;
  $('rulePager').hidden = pages === 1;
  $('rulePageLabel').textContent = `Строки ${rules.length ? start + 1 : 0}–${Math.min(start + per, rules.length)} из ${rules.length}`;
  $('bRulesPrev').disabled = rulePage === 0; $('bRulesNext').disabled = rulePage >= pages - 1;
}
$('bRulesPrev').onclick = () => { rulePage--; renderRules(); };
$('bRulesNext').onclick = () => { rulePage++; renderRules(); };
function rulesChanged() { ctx.persist(); renderRules(); resetSim(); $('res').innerHTML = ''; $('win').innerHTML = ''; }
$('rows').addEventListener('change', e => {
  const sel = e.target.closest('select'), row = e.target.closest('tr'); if (!sel || !row || ctx.readonly) return;
  ctx.rules[+row.dataset.i][+sel.dataset.k] = sel.value; rulesChanged();
});
$('rows').addEventListener('click', e => { const b = e.target.closest('.del'); if (!b) return; ctx.rules.splice(+b.closest('tr').dataset.i, 1); rulesChanged(); });
function addRow(q, a) {
  const al = [...ctx.alphabet], rules = ctx.rules;
  q = q || (rules.length ? rules[rules.length - 1][0] : ctx.states[0]);
  a = a || al.find(c => !rules.some(r => r[0] === q && r[1] === c)) || al[0];
  rules.push([q, a, q, a, 'R']); rulePage = Math.floor((rules.length - 1) / 40); rulesChanged();
}
$('bAdd').onclick = () => addRow();
$('bClear').onclick = () => {
  if (!armed.clr) { armed.clr = true; $('bClear').textContent = 'Точно очистить?'; return; }
  armed.clr = false; $('bClear').textContent = 'Очистить'; ctx.rules.length = 0; rulePage = 0; rulesChanged();
};
function updateHintBtn() { const n = ctx.hints.length; $('bHint').textContent = hintN >= n ? 'Подсказок больше нет' : `Подсказка ${hintN + 1} из ${n}`; $('bHint').disabled = hintN >= n; }
$('bHint').onclick = () => { if (hintN < ctx.hints.length) { $('hints').insertAdjacentHTML('beforeend', `<li>${ctx.hints[hintN]}</li>`); hintN++; updateHintBtn(); window.dispatchEvent(new CustomEvent('tm:hint')); } };
$('bSol').onclick = () => {
  if (!armed.sol) { armed.sol = true; $('bSol').textContent = 'Да, показать (лучше сначала сам)'; return; }
  armed.sol = false; $('bSol').textContent = 'Показать решение';
  ctx.rules.splice(0, ctx.rules.length, ...ctx.solution.map(r => r.slice())); rulePage = 0; rulesChanged();
  window.dispatchEvent(new CustomEvent('tm:solution'));
};

/* ================= machine view ================= */
function renderInputs() {
  let h = '<span class="lbl">Вход:</span>';
  ctx.tests.forEach((t, i) => h += `<button class="chip${inputIdx === i ? ' on' : ''}" data-i="${i}">${esc(t[0])}${t[1] != null ? ` <span class="ar">→ ${esc(t[1])}</span>` : ''}</button>`);
  if (ctx.custom) h += `<span class="custom"><input id="cw" aria-label="Свой вход" placeholder="свой вход" value="${esc(customWord)}"><button class="chip${inputIdx === -1 ? ' on' : ''}" id="cgo">запустить</button></span>`;
  $('inputs').innerHTML = h;
}
$('inputs').addEventListener('click', e => {
  const b = e.target.closest('.chip'); if (!b) return;
  if (b.id === 'cgo') {
    const w = $('cw').value.trim(), bad = [...w].filter(c => !ctx.alphabet.includes(c) || c === B);
    if (!w || bad.length) { setStatus('bad', `Во входе можно использовать только символы: ${[...ctx.alphabet].filter(c => c !== B).join(' ')}`); return; }
    customWord = w; inputIdx = -1;
  } else inputIdx = +b.dataset.i;
  renderInputs(); resetSim();
});
$('inputs').addEventListener('keydown', e => { if (e.target.id === 'cw' && e.key === 'Enter') $('cgo').click(); });
const curWord = () => inputIdx === -1 ? customWord : ctx.tests[inputIdx][0];
const curExpect = () => inputIdx === -1 ? null : ctx.tests[inputIdx][1];

function speedMs() { return Math.round(900 * Math.pow(0.04, +$('speed').value / 100)); }
function resetSim() { stopRun(); sim = newSim(ctx.rules, curWord(), limitFor(curExpect())); drawSim(); setStatus('', curExpect() === LOOP ? `На этом входе функция не определена — машина должна работать вечно. Чтобы проверить быстро, сдвинь скорость до упора вправо и жми «Пуск».` : `Робот в ${qh('q1')} стоит на первом символе. Жми «Шаг» или «Пуск».`); }
function stopRun() { if (timer) { clearTimeout(timer); timer = null; } $('bRun').textContent = '▶ Пуск'; }
const isOver = () => ['done', 'hang', 'loop'].includes(sim.status);
function canRun() {
  const bad = Object.entries(dups(ctx.rules)).find(([, n]) => n > 1);
  if (bad) { const [q, a] = bad[0].split('|'); setStatus('bad', `Для пары (${qh(q)}, ${esc(sym(a))}) две команды — робот не знает, какую выбрать. Оставь одну (строки подсвечены красным).`); return false; }
  return true;
}
function doStep() {
  if (!canRun()) { stopRun(); return false; }
  if (isOver()) return false;
  const prev = sim.pos; step(sim); drawSim(prev); afterStep();
  return sim.status === 'run';
}
function afterStep() {
  const s = sim, exp = curExpect();
  if (s.status === 'hang') {
    const [q, a] = s.missing;
    setStatus('bad', `Робот в состоянии ${qh(q)} видит <b>${esc(sym(a))}</b>, но такой команды нет — он завис.${tipHTML(runTip(s, exp, curWord()))}${ctx.readonly ? '' : `<button class="btn" id="addMissing">+ добавить строку для (${qh(q)}, ${esc(sym(a))})</button>`}`);
    if (!ctx.readonly) $('addMissing').onclick = () => { addRow(q, a); setStatus('warn', 'Строка добавлена в конец таблицы. Выбери в ней, что писать, куда идти и в какое состояние перейти.'); };
    stopRun(); return;
  }
  if (s.status === 'loop' && exp === LOOP) { setStatus('ok', `${s.steps} шагов без остановки — так и нужно: на этом входе функция не определена ✓${view === 'level' ? '<span class="small">Теперь нажми «Проверить на всех примерах».</span>' : ''}`); stopRun(); return; }
  if (s.status === 'loop') { setStatus('bad', `Уже ${s.limit} шагов, а робот не остановился.${tipHTML(runTip(s, exp, curWord()))}`); stopRun(); return; }
  if (s.status === 'done' && exp === LOOP) { setStatus('bad', `Машина остановилась, а на этом входе должна работать вечно.${tipHTML(runTip(s, exp, curWord()))}`); stopRun(); return; }
  if (s.status === 'done') {
    const got = contentOf(s.tape), shown = got ? got.replace(/_/g, 'λ') : '(пусто)';
    if (exp == null) setStatus('ok', `Стоп за ${s.steps} шагов. На ленте: <code>${esc(shown)}</code>`);
    else if (got === exp) setStatus('ok', `Стоп за ${s.steps} шагов. На ленте <code>${esc(shown)}</code> — верно ✓${view === 'level' ? '<span class="small">Теперь нажми «Проверить на всех примерах».</span>' : ''}`);
    else setStatus('bad', `Машина остановилась, но на ленте <code>${esc(shown)}</code>, а нужно <code>${esc(exp)}</code>.${tipHTML(runTip(s, exp, curWord()))}`);
    stopRun(); return;
  }
  const r = ctx.rules[s.last];
  setStatus('', `Шаг ${s.steps}. Сработала команда <span class="mono">${qh(r[0])}, ${esc(sym(r[1]))} → ${qh(r[2])}, ${esc(sym(r[3]))}, ${r[4]}</span>
    <span class="small">«В ${r[0]} вижу ${esc(sym(r[1]))}: пишу ${esc(sym(r[3]))}, ${r[4] === 'L' ? 'шагаю влево' : r[4] === 'R' ? 'шагаю вправо' : 'стою на месте'}, перехожу в ${r[2]}».</span>`);
}
function setStatus(kind, html) { const el = $('status'); el.className = 'status' + (kind ? ' ' + kind : ''); el.innerHTML = html; }
$('bStep').onclick = () => { stopRun(); if (isOver()) resetSim(); doStep(); };
$('bReset').onclick = resetSim;
$('bRun').onclick = () => {
  if (timer) { stopRun(); return; }
  if (isOver()) resetSim();
  if (!canRun()) return;
  $('bRun').textContent = '⏸ Пауза';
  const tick = () => {
    const burst = +$('speed').value >= 95 ? 400 : 1;
    for (let i = 1; i < burst && sim.status !== 'hang'; i++) {
      step(sim);
      if (isOver()) { drawSim(); afterStep(); stopRun(); return; }
    }
    if (doStep()) timer = setTimeout(tick, speedMs()); else stopRun();
  };
  tick();
};
function drawTape(t, pos, q, prev) {
  let [lo, hi] = bounds(t); if (lo === Infinity) lo = hi = pos;
  lo = Math.min(lo, pos) - 3; hi = Math.max(hi, pos) + 3;
  while (hi - lo < 12) { lo--; hi++; }
  let h = '';
  for (let i = lo; i <= hi; i++) {
    const c = get(t, i);
    h += `<div class="cell${c === B ? ' blank' : ''}${i === pos ? ' head' : ''}${i === prev ? ' flash' : ''}"${i === pos ? ' id="headcell"' : ''}>${i === pos ? `<span class="mk">${esc(q)}</span>` : ''}${esc(sym(c))}</div>`;
  }
  $('tape').innerHTML = h;
  const w = $('tapewrap'), hc = $('headcell');
  if (hc) w.scrollLeft = hc.offsetLeft - w.clientWidth / 2 + hc.offsetWidth / 2;
  $('cfg').innerHTML = `<span class="k">конфигурация:</span>${cfgHTML(t, pos, q)}`;
}
function drawSim(prev) {
  drawTape(sim.tape, sim.pos, sim.q, prev);
  $('trace').innerHTML = sim.hist.map(x => `<span>${x}</span>`).join(' ⊢ ') + (sim.steps >= HIST ? ' ⊢ …' : '');
  renderRules(sim.last >= 0 && sim.status !== 'idle' ? sim.last : -1);
}

/* ================= check (build levels) ================= */
$('bCheck').onclick = () => {
  stopRun(); if (!canRun()) return;
  const st = staticTips(ctx.rules);
  let all = true; const used = new Set();
  const out = ctx.tests.map(([w, e]) => {
    const s = runWord(ctx.rules, w, limitFor(e)), got = contentOf(s.tape); s.used.forEach(i => used.add(i));
    const ok = e === LOOP ? s.status === 'loop' : s.status === 'done' && got === e; all = all && ok;
    const why = s.status === 'hang' ? `завис: нет команды для (${s.missing[0]}, ${sym(s.missing[1])})` : s.status === 'loop' ? (ok ? `работает вечно — верно` : `не остановился за ${s.limit} шагов`) : ok ? `${s.steps} шаг.` : `получилось ${got ? got.replace(/_/g, 'λ') : '(пусто)'}`;
    return `<div class="${ok ? 'y' : 'n'}">${ok ? '✓' : '✗'} ${esc(w)} → ${esc(showExp(e))} · ${esc(why)}${ok ? '' : tipHTML(runTip(s, e, w))}</div>`;
  });
  $('res').innerHTML = (!all && st.length ? `<div class="n">${st.map(t => `<div class="tip">${esc(t)}</div>`).join('')}</div>` : '') + out.join('');
  if (all) {
    const unused = ctx.rules.map((r, i) => i).filter(i => !used.has(i));
    const note = unused.length ? `Строки ${unused.map(i => i + 1).join(', ')} не сработали в этих примерах — для других входов они могут понадобиться. ` : '';
    $('win').innerHTML = markDone(note);
  } else {
    $('win').innerHTML = '';
    window.dispatchEvent(new CustomEvent('tm:mistake'));
  }
};

/* ================= predict ================= */
function renderQuiz() {
  const items = L.items;
  let h = `<h2 style="font-size:17px">Вопросы</h2><p class="sub">Ответь, не запуская машину. Пустую клетку внутри слова пиши как λ. Потом можешь выбрать вход над лентой и посмотреть прогон.</p>`;
  items.forEach((w, i) => h += `<div class="item"><span>Вход <code>${esc(w)}</code> → на ленте будет:</span><input type="text" id="pa${i}" aria-label="ответ для ${esc(w)}" autocomplete="off"><span class="mark" id="pm${i}"></span></div>`);
  h += `<div class="mc" role="radiogroup" aria-label="${esc(L.mc.q)}"><b>${esc(L.mc.q)}</b>${L.mc.options.map((o, i) => `<label id="pl${i}"><input type="radio" name="mc" value="${i}"> ${esc(o)}</label>`).join('')}</div>
    <div class="rowbtns"><button class="btn primary" id="bQuiz">Проверить ответы</button></div><div id="qres"></div>`;
  $('quiz').innerHTML = h;
  $('bQuiz').onclick = checkQuiz;
}
function checkQuiz() {
  let all = true;
  L.items.forEach((w, i) => {
    const exp = contentOf(runWord(ctx.rules, w).tape), ans = $('pa' + i).value.replace(/\s+/g, '').replace(/λ/g, B);
    const ok = ans === exp; all = all && ok;
    $('pm' + i).className = 'mark ' + (ok ? 'y' : 'n'); $('pm' + i).textContent = ok ? '✓ верно' : (ans ? '✗ не так' : '✗ нет ответа');
  });
  const sel = document.querySelector('input[name=mc]:checked');
  L.mc.options.forEach((_, i) => $('pl' + i).className = '');
  const mcOk = sel && +sel.value === L.mc.correct;
  if (sel) $('pl' + sel.value).className = mcOk ? 'y' : 'n';
  all = all && mcOk;
  $('qres').innerHTML = all ? markDone('') : `<div class="fb bad">Есть ошибки. Пройди по таблице шаг за шагом на бумаге или выбери вход над лентой и нажми «Шаг», чтобы проверить себя.</div>`;
}

/* ================= trace ================= */
function initTrace() { tr = {snaps: snapshots(ctx.rules, L.input), k: 0, wrong: 0}; drawSnap(); renderTracer(); }
function drawSnap() { const s = tr.snaps[tr.k]; drawTape(s.t, s.pos, s.q); renderRules(s.rule); setStatus('', `Шаг ${tr.k} из ${tr.snaps.length - 1}. ${tr.k === tr.snaps.length - 1 ? 'Робот в q0 — запись закончена.' : 'Какой будет следующая конфигурация?'}`); }
function renderTracer() {
  const last = tr.snaps.length - 1;
  const chain = tr.snaps.slice(0, tr.k + 1).map(s => `<span>${cfgHTML(s.t, s.pos, s.q)}</span>`).join(' ⊢ ');
  const states = [...ctx.states, 'q0'], al = [...ctx.alphabet];
  let h = `<h2 style="font-size:17px">Запиши конфигурации</h2><p class="sub">Что уже записано:</p><div class="chain">${chain}${tr.k < last ? ' ⊢ …' : ''}</div>`;
  if (tr.k < last) {
    h += `<div class="tin"><input id="tinp" aria-label="следующая конфигурация" placeholder="например: λ1q11λ" autocomplete="off" spellcheck="false"><button class="btn primary" id="tchk">Проверить</button></div>
      <div class="palette">${al.map(c => `<button data-ins="${esc(sym(c))}">${esc(sym(c))}</button>`).join('')}${states.map(q => `<button class="st" data-ins="${q}">${q}</button>`).join('')}<button data-bs="1" aria-label="стереть символ">⌫</button></div><div id="tfb"></div>`;
  } else h += `<div id="tfb">${markDone('Ты записал всю работу машины — ровно так это и пишут на тесте. ')}</div>`;
  $('tracer').innerHTML = h;
  if (tr.k < last) {
    $('tchk').onclick = checkTrace;
    $('tinp').addEventListener('keydown', e => { if (e.key === 'Enter') checkTrace(); });
  }
}
$('tracer').addEventListener('click', e => {
  const b = e.target.closest('[data-ins],[data-bs]'); if (!b) return; const inp = $('tinp'); if (!inp) return;
  const s = inp.selectionStart ?? inp.value.length, en = inp.selectionEnd ?? s;
  if (b.dataset.bs) { const p = s === en ? Math.max(0, s - 1) : s; inp.value = inp.value.slice(0, p) + inp.value.slice(en); inp.setSelectionRange(p, p); }
  else { const t = b.dataset.ins; inp.value = inp.value.slice(0, s) + t + inp.value.slice(en); inp.setSelectionRange(s + t.length, s + t.length); }
  inp.focus();
});
function checkTrace() {
  const inp = $('tinp'), p = parseCfg(inp.value, ctx.alphabet), nx = tr.snaps[tr.k + 1], cur = tr.snaps[tr.k];
  if (p.err) { $('tfb').innerHTML = `<div class="fb bad">${esc(p.err)}</div>`; return; }
  if (p.key === cfgKey(nx.t, nx.pos, nx.q)) { tr.k++; tr.wrong = 0; drawSnap(); renderTracer(); $('tinp') && $('tinp').focus(); return; }
  tr.wrong++;
  const a = get(cur.t, cur.pos), r = ctx.rules[nx.rule];
  renderRules(nx.rule);
  let h = `<div class="fb bad">Не так. Сейчас робот в ${qh(cur.q)} видит <b>${esc(sym(a))}</b>. Найди строку (${qh(cur.q)}, ${esc(sym(a))}) — она подсвечена в таблице: пишем <b>${esc(sym(r[3]))}</b>, ход <b>${r[4]}</b>, новое состояние ${qh(r[2])}. Перепиши ленту с этим изменением и поставь ${qh(r[2])} перед клеткой, куда сдвинулась головка.`;
  if (tr.wrong >= 2) h += `<div style="margin-top:8px">Правильно: <span class="mono">${cfgHTML(nx.t, nx.pos, nx.q)}</span> <button class="btn" id="tskip">Принять и дальше</button></div>`;
  $('tfb').innerHTML = h + '</div>';
  if (tr.wrong >= 2) $('tskip').onclick = () => { tr.k++; tr.wrong = 0; drawSnap(); renderTracer(); };
}

/* ================= test mode ================= */
const poolById = id => POOL.find(p => p.id === id);
function openTest() {
  stopRun(); view = 'test'; renderNav();
  if (store.test && (!poolById(store.test.ids[0]) || !poolById(store.test.ids[1]))) store.test = null;
  if (!store.test) return showTestIntro();
  if (store.test.submitted) return showTestResult();
  showTestTask(store.test.cur || 0);
}
function showTestIntro() {
  show(['testintro']); stopClock();
  $('durs').innerHTML = [30, 40, 60].map(m => `<button class="btn${m === 40 ? ' primary' : ''}" data-dur="${m}">Начать: ${m} минут</button>`).join('');
}
$('durs').addEventListener('click', e => {
  const b = e.target.closest('[data-dur]'); if (!b) return;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  store.test = {ids: [pick(FUNC_TASKS).id, pick(PDF_TASKS).id], start: Date.now(), dur: +b.dataset.dur * 60000, rules: {}, cur: 0, submitted: false};
  save(); showTestTask(0);
});
function showTestTask(t) {
  const T = store.test; T.cur = t; save();
  const P = poolById(T.ids[t]);
  ctx = {kind: 'build', states: P.states, alphabet: P.alphabet, notes: null, hints: [], solution: null, readonly: false,
    rules: (T.rules[P.id] || []).map(r => r.slice()), tests: [P.tests[0]], custom: false, showSol: false,
    persist: () => { T.rules[P.id] = ctx.rules; save(); }};
  inputIdx = 0; armed = {}; rulePage = 0;
  $('eyebrow').innerHTML = `Пробный тест · задача ${t + 1} из 2`;
  $('title').textContent = P.title;
  $('theory').innerHTML = `<p>${P.cond}</p><p class="sub">Символы, которые можно использовать: ${[...P.alphabet].map(c => `<code>${esc(sym(c))}</code>`).join(' ')}. Состояний доступно: до q${P.states.length}.</p>`;
  $('goal').innerHTML = 'Реши на бумаге, потом перенеси таблицу. Запускать можно только на примере из условия.';
  $('tasks').textContent = ''; $('hints').innerHTML = '';
  show(['testbar', 'story', 'machine', 'rules', 'histcard']); $('controls').hidden = false;
  $('tabs').innerHTML = [0, 1].map(i => `<button class="tab${i === t ? ' on' : ''}" data-tab="${i}">Задача ${i + 1}</button>`).join('');
  setupRulesCard(); renderInputs(); resetSim(); startClock();
}
$('tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { stopRun(); showTestTask(+b.dataset.tab); } });
let submitArmed = false;
$('bSubmit').onclick = () => {
  if (!submitArmed) { submitArmed = true; $('bSubmit').textContent = 'Точно сдать?'; setTimeout(() => { submitArmed = false; $('bSubmit').textContent = 'Сдать тест'; }, 4000); return; }
  submitArmed = false; $('bSubmit').textContent = 'Сдать тест'; submitTest();
};
function fmt(ms) { const s = Math.max(0, Math.round(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function tickClock() {
  const T = store.test; if (!T || T.submitted) { stopClock(); return; }
  const left = T.start + T.dur - Date.now();
  $('clock').textContent = fmt(left); $('clock').classList.toggle('low', left < 5 * 60000); $('navclock').textContent = fmt(left);
  if (left <= 0) submitTest();
}
function startClock() { stopClock(); tickClock(); clockTimer = setInterval(tickClock, 1000); }
function stopClock() { if (clockTimer) clearInterval(clockTimer); clockTimer = null; $('navclock').textContent = ''; }
function submitTest() { stopRun(); const T = store.test; T.submitted = true; T.end = Math.min(Date.now(), T.start + T.dur); save(); stopClock(); if (view === 'test') showTestResult(); }
function showTestResult() {
  const T = store.test; show(['testres']); stopClock();
  let total = 0;
  const parts = T.ids.map((id, t) => {
    const P = poolById(id), rules = T.rules[id] || [], d = dups(rules), dup = Object.values(d).some(n => n > 1);
    const st = staticTips(rules); let ok = 0;
    const lines = P.tests.map(([w, e]) => {
      if (dup) return `<div class="n">✗ ${esc(w)} → ${esc(showExp(e))} · в таблице две команды для одной пары</div>`;
      const s = runWord(rules, w, limitFor(e)), got = contentOf(s.tape), y = e === LOOP ? s.status === 'loop' : s.status === 'done' && got === e; if (y) ok++;
      const why = s.status === 'hang' ? `завис на (${s.missing[0]}, ${sym(s.missing[1])})` : s.status === 'loop' ? (y ? 'работает вечно — верно' : 'не остановился') : y ? 'верно' : `получилось ${got ? got.replace(/_/g, 'λ') : '(пусто)'}`;
      return `<div class="${y ? 'y' : 'n'}">${y ? '✓' : '✗'} ${esc(w)} → ${esc(showExp(e))} · ${esc(why)}${y ? '' : tipHTML(runTip(s, e, w))}</div>`;
    });
    const full = ok === P.tests.length; if (full) total++;
    const sol = P.solution.map(r => `<tr><td>${qh(r[0])},</td><td>${esc(sym(r[1]))}</td><td class="arrow">→</td><td>${qh(r[2])},</td><td>${esc(sym(r[3]))},</td><td>${r[4]}</td></tr>`).join('');
    return `<div style="margin-top:16px"><h2 style="font-size:17px">Задача ${t + 1}: ${esc(P.title)} — ${ok} из ${P.tests.length} ${full ? '✓' : ''}</h2>
      <p style="margin:4px 0 6px">${P.cond}</p>${!full && st.length ? `<div class="res"><div class="n">${st.map(x => `<div class="tip">${esc(x)}</div>`).join('')}</div></div>` : ''}<div class="res">${lines.join('')}</div>
      <details style="margin-top:8px"><summary style="cursor:pointer;font-weight:600">Эталонное решение (${P.nsol} состояний)</summary><div class="tbl"><table class="rt ro">${sol}</table></div>
      <p class="sub">Твоя таблица может быть другой — главное, чтобы она проходила все проверки.</p></details></div>`;
  });
  const used = Math.round(((T.end || Date.now()) - T.start) / 60000);
  window.dispatchEvent(new CustomEvent('tm:test', {detail: {total}}));
  $('testres').innerHTML = `<div class="eyebrow">Пробный тест · результат</div><div class="score" style="margin-top:6px">Решено ${total} из 2</div>
    <p class="sub" style="margin-top:4px">Время: ${used} мин из ${Math.round(T.dur / 60000)}. Каждая задача проверена на ${T.ids.map(id => poolById(id).tests.length).join(' и ')} входах.</p>
    ${parts.join('')}<div class="rowbtns" style="margin-top:18px"><button class="btn primary" id="bNewTest">Новый тест</button><button class="btn" id="bBack">К урокам</button></div>`;
  $('bNewTest').onclick = () => { store.test = null; save(); showTestIntro(); };
  $('bBack').onclick = () => openLevel(store.cur | 0);
}

/* ================= boot ================= */
function start(data) {
  if (data && data.view === 'test') { openTest(); return; }
  openLevel(Math.min(Math.max((data && typeof data.li === 'number' ? data.li : store.cur) | 0, 0), LEVELS.length - 1));
  if (store.test && !store.test.submitted) { tickClock(); clockTimer = setInterval(tickClock, 1000); }
}
window.claude?.hot?.snapshot?.(() => ({view, li}));
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
