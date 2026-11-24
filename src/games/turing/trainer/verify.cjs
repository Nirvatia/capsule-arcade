// node src/games/turing/trainer/verify.cjs — runs every reference solution of the function tasks on
// its tests and on a grid of extra inputs: answers must match, LOOP inputs must not halt.
const {FUNC_TASKS, LOOP} = new Function(require('fs').readFileSync(__dirname + '/func-tasks.js', 'utf8') + '; return {FUNC_TASKS, LOOP};')();
const B = '_';
function run(rules, word, limit) {
  const t = new Map([...word].map((c, i) => [i, c])), tab = new Map(rules.map(r => [r[0] + '|' + r[1], r]));
  let p = 0, q = 'q1', n = 0;
  while (q !== 'q0' && n < limit) {
    const r = tab.get(q + '|' + (t.get(p) ?? B)); if (!r) return {status: 'hang', q, a: t.get(p) ?? B};
    t.set(p, r[3]); p += r[4] === 'L' ? -1 : r[4] === 'R' ? 1 : 0; q = r[2]; n++;
  }
  if (q !== 'q0') return {status: 'loop'};
  const ks = [...t].filter(([, v]) => v !== B).map(([k]) => k);
  let s = ''; if (ks.length) for (let i = Math.min(...ks); i <= Math.max(...ks); i++) s += t.get(i) ?? B;
  return {status: 'done', out: s, steps: n};
}
let bad = 0;
const grid = {1: [], 2: [], 3: []};
for (let x = 0; x <= 7; x++) { grid[1].push([x]); for (let y = 0; y <= 7; y++) { grid[2].push([x, y]); for (let z = 0; z <= 5; z++) grid[3].push([x, y, z]); } }
const fns = {'ф1': x => x + 1, 'ф2': (x, y) => x + y, 'ф3': x => 2 * x, 'ф4': (x, y) => x >= y ? x - y : null,
  'ф5': (x, y, z) => x + z >= y ? x - y + z : null, 'ф6': x => x >= 4 && x % 2 === 0 ? (x - 4) / 2 : null, 'ф7': (x, y) => x >= y ? 3 * x : 2 * y};
for (const T of FUNC_TASKS) {
  const keys = new Set(T.solution.map(r => r[0] + '|' + r[1]));
  if (keys.size !== T.solution.length) { console.log(T.id, 'duplicate command'); bad++; }
  const extra = grid[T.tests[0][0].split('*').length].map(a => [a.map(n => '1'.repeat(n + 1)).join('*'), (v => v == null ? LOOP : '1'.repeat(v + 1))(fns[T.id](...a))]);
  let maxSteps = 0;
  for (const [w, e] of [...T.tests, ...extra]) {
    const r = run(T.solution, w, e === LOOP ? 20000 : 1e6);
    const ok = e === LOOP ? r.status === 'loop' : r.status === 'done' && r.out === e;
    if (r.steps) maxSteps = Math.max(maxSteps, r.steps);
    if (!ok) { bad++; if (bad < 15) console.log(T.id, w, 'want', e, 'got', JSON.stringify(r)); }
  }
  console.log(`${T.id}: ${T.solution.length} команд, ${T.states.length} состояний, тестов ${T.tests.length}+${extra.length}, макс. шагов ${maxSteps}`);
}
console.log(bad ? `FAILED: ${bad}` : 'all ok');
process.exit(bad ? 1 : 0);
