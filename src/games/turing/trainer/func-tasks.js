// Function tasks: numbers as n+1 ones (0 = 1, 2 = 111), arguments separated by *. Outside the
// domain the machine must run forever (LOOP). Every reference solution is checked by verify.cjs.
const LOOP = '∞';
const FUNC_TASKS = (() => {
  const B = '_';
  function Builder(alphabet) { this.alphabet = alphabet; this.names = []; this.rules = []; this.q('start'); }
  Builder.prototype.q = function (n) { if (n !== 'HALT' && !this.names.includes(n)) this.names.push(n); return n; };
  Builder.prototype.r = function (from, read, to, write = read, move = 'S') { this.q(from); this.q(to); this.rules.push([from, read, to, write, move]); };
  Builder.prototype.same = function (from, reads, to, move) { [...reads].forEach(a => this.r(from, a, to, a, move)); };
  Builder.prototype.loop = function (from, reads) { [...reads].forEach(a => this.r(from, a, from, a, 'S')); };
  Builder.prototype.finish = function () {
    const ids = new Map(this.names.map((n, i) => [n, 'q' + (i + 1)]));
    return {alphabet: this.alphabet, states: this.names.map(n => ids.get(n)),
      solution: this.rules.map(r => [ids.get(r[0]), r[1], r[2] === 'HALT' ? 'q0' : ids.get(r[2]), r[3], r[4]])};
  };
  const enc = n => '1'.repeat(n + 1);
  const word = args => args.map(enc).join('*');

  // ×k for one argument (k ≥ 2): keep the first 1, every other 1 is marked a and k−1 b's are appended.
  function multiply(b, p, k) {
    b.r(p + 'start', '1', p + 'take', '1', 'R');
    b.r(p + 'take', '1', p + 'go', 'a', 'R');
    b.r(p + 'take', 'b', p + 'cleanL', 'b', 'L');
    b.r(p + 'take', B, 'HALT', B, 'S');
    b.same(p + 'go', '1b', p + 'go', 'R');
    for (let i = 1; i < k; i++) b.r(i === 1 ? p + 'go' : p + 'app' + i, B, i === k - 1 ? p + 'ret' : p + 'app' + (i + 1), 'b', i === k - 1 ? 'L' : 'R');
    b.same(p + 'ret', '1b', p + 'ret', 'L');
    b.r(p + 'ret', 'a', p + 'take', 'a', 'R');
    b.r(p + 'cleanL', 'a', p + 'cleanL', '1', 'L');
    b.r(p + 'cleanL', '1', p + 'cleanL', '1', 'L');
    b.r(p + 'cleanL', B, p + 'cleanR', B, 'R');
    b.r(p + 'cleanR', '1', p + 'cleanR', '1', 'R');
    b.r(p + 'cleanR', 'b', p + 'cleanR', '1', 'R');
    b.r(p + 'cleanR', B, 'HALT', B, 'S');
  }

  const tasks = [];
  const add = (id, title, cond, machine, f, inputs, theory, hints, extra = {}) => {
    const tests = inputs.map(args => { const v = f(...args); return [word(args), v == null ? LOOP : enc(v)]; });
    tasks.push({id, title, cond, goal: cond, tests, theory, hints, part: 'Функции', kind: 'build', source: 'func',
      alphabet: machine.alphabet, states: machine.states, solution: machine.solution, nsol: machine.states.length, ...extra});
  };
  const code = '<p>Числа записаны как на лекции: <b>n — это n+1 единиц</b> (0 = <code>1</code>, 2 = <code>111</code>), аргументы разделены <code>*</code>. Ответ — тоже n+1 единиц, без дырок и лишних символов.</p>';
  const partial = '<p>Функция <b>частичная</b>: на некоторых входах её значения нет (в натуральных числах нет отрицательных и дробных). На таких входах машина обязана <b>работать вечно</b> — это и есть «не определена». Остановиться с мусором или зависнуть без команды — ошибка. В тестах такой вход отмечен <code>→ ∞</code>.</p>';

  { const b = new Builder(B + '1');
    b.same('start', '1', 'start', 'R'); b.r('start', B, 'HALT', '1', 'S');
    add('ф1', 'ф1. f(x) = x + 1', 'Вычислить f(x) = x + 1.', b.finish(), x => x + 1, [[2], [0], [1], [4]],
      code + '<p>Если x — это x+1 единиц, то x+1 — это x+2 единиц. Достаточно дописать одну единицу.</p>',
      ['Дойди до конца числа.', 'На λ запиши 1 и остановись.']); }

  { const b = new Builder(B + '1*');
    b.same('start', '1', 'start', 'R'); b.r('start', '*', 'start', '1', 'R'); b.r('start', B, 'del1', B, 'L');
    b.r('del1', '1', 'del2', B, 'L'); b.r('del2', '1', 'HALT', B, 'S');
    add('ф2', 'ф2. f(x, y) = x + y', 'Вычислить f(x, y) = x + y.', b.finish(), (x, y) => x + y, [[2, 3], [0, 0], [1, 0], [0, 2], [3, 1]],
      code + '<p>На входе (x+1) + (y+1) единиц, нужно x+y+1. Замени * на 1 — единиц станет x+y+3, лишние две сотри с конца.</p>',
      ['* → 1, дальше вправо до λ.', 'С конца сотри две единицы.']); }

  { const b = new Builder(B + '1ab'); multiply(b, '', 2);
    const m = b.finish();
    add('ф3', 'ф3. f(x) = 2x', 'Вычислить f(x) = 2x.', m, x => 2 * x, [[2], [0], [1], [3], [5]],
      code + '<p>Нужно 2x+1 единиц, а есть x+1. Значит, к числу надо дописать ещё x единиц: по одной за каждую единицу, кроме первой. Это челнок: пометь единицу (a), допиши в конец b, вернись к метке. Когда единицы кончились — замени a и b обратно на 1.</p>',
      ['Первую единицу пропусти — она и есть «+1».', 'Помечай a, дописывай b, чтобы не путать старое и новое.', 'Уборка: все a и b → 1.']); }

  { const b = new Builder(B + '1*');
    b.same('start', '1*', 'start', 'R'); b.r('start', B, 'cutY', B, 'L');
    b.r('cutY', '1', 'home', B, 'L'); b.r('cutY', '*', 'HALT', '1', 'S');
    b.same('home', '1*', 'home', 'L'); b.r('home', B, 'cutX', B, 'R');
    b.r('cutX', '1', 'start', B, 'R'); b.loop('cutX', '*');
    add('ф4', 'ф4. f(x, y) = x − y', 'Вычислить f(x, y) = x − y. Определена при x ≥ y; при x < y машина должна работать вечно.', b.finish(), (x, y) => x >= y ? x - y : null,
      [[4, 1], [2, 2], [0, 0], [3, 0], [1, 3], [0, 1]],
      code + partial + '<p>Стирай по единице с правого конца y и с левого конца x. Когда y кончился (с конца видна *), замени * на 1 — это «+1» ответа. Если первым кончился x, ответа нет — вечный цикл.</p>',
      ['Стирать можно только с краёв — тогда дырок не будет.', 'Вечный цикл проще всего сделать командой «стою на месте в том же состоянии».']); }

  { const b = new Builder(B + '1*');
    b.same('start', '1*', 'start', 'R'); b.r('start', B, 'takeZ', B, 'L');
    b.r('takeZ', '1', 'putX', B, 'L'); b.r('takeZ', '*', 'subY', B, 'L');
    b.same('putX', '1*', 'putX', 'L'); b.r('putX', B, 'start', '1', 'R');
    b.r('subY', '1', 'home', B, 'L'); b.r('subY', '*', 'check', B, 'L');
    b.same('home', '1*', 'home', 'L'); b.r('home', B, 'cutP', B, 'R');
    b.r('cutP', '1', 'end', B, 'R'); b.loop('cutP', '*');
    b.r('check', '1', 'HALT', '1', 'S'); b.loop('check', B);
    b.same('end', '1*', 'end', 'R'); b.r('end', B, 'subY', B, 'L');
    add('ф5', 'ф5. f(x, y, z) = x − y + z', 'Вычислить f(x, y, z) = x − y + z. Определена при x + z ≥ y; иначе машина должна работать вечно.', b.finish(), (x, y, z) => x + z >= y ? x - y + z : null,
      [[2, 1, 3], [0, 0, 0], [1, 3, 2], [3, 1, 0], [0, 2, 1], [1, 4, 1], [2, 5, 0]],
      code + partial + '<p>Ответу нужно x−y+z+1 = (x+1) + (z+1) − (y+1) единиц. План: 1) перенеси все единицы z в начало ленты, слева от x, и сотри вторую *; 2) стирай по единице с конца y и с начала левой кучи; 3) y кончился — сотри *: если осталась хоть одна единица, это ответ. Если куча кончилась раньше или одновременно с y, значение отрицательное — вечный цикл.</p>',
      ['Перенос z: сотри последнюю единицу, допиши 1 слева от всего слова.', 'Вычитание: только с краёв, чтобы не было дырок.', 'Две точки вечного цикла: куча кончилась посреди вычитания и «осталось ноль единиц» в конце.']); }

  { const b = new Builder(B + '1a');
    ['start', 'd2', 'd3', 'd4'].forEach((s, i, a) => { b.r(s, '1', i < 3 ? a[i + 1] : 'end', B, 'R'); b.loop(s, B); });
    b.same('end', '1a', 'end', 'R'); b.r('end', B, 'r1', B, 'L');
    b.r('r1', '1', 'r2', '1', 'L'); b.loop('r1', 'a' + B);
    b.r('r2', '1', 'e1', '1', 'R'); b.r('r2', 'a', 'fin', '1', 'L'); b.r('r2', B, 'HALT', B, 'S');
    b.r('e1', '1', 'e2', B, 'L'); b.r('e2', '1', 'toLeft', B, 'L');
    b.same('toLeft', '1a', 'toLeft', 'L'); b.r('toLeft', B, 'end', 'a', 'R');
    b.r('fin', 'a', 'fin', '1', 'L'); b.r('fin', B, 'HALT', B, 'S');
    add('ф6', 'ф6. f(x) = |x − 4| / 2', 'Вычислить f(x) = |x − 4| / 2. Как на занятии: определена при x ≥ 4 и чётном x; иначе машина должна работать вечно.', b.finish(), x => x >= 4 && x % 2 === 0 ? (x - 4) / 2 : null,
      [[6], [4], [8], [10], [5], [2], [0], [3]],
      code + partial + '<p>При x ≥ 4 модуль раскрывается: (x−4)/2. Сотри 4 единицы слева — останется x−3 = (x−4)+1. Потом дели пополам: стирай по две единицы справа и за каждую пару ставь метку a слева. Когда осталась одна единица (рядом a или λ) — замени a на 1, это ответ. Если единиц не хватило на четыре или на пару — вечный цикл.</p>',
      ['Четыре одинаковых состояния: «сотри 1 и вправо». На λ в любом из них — вечный цикл.', 'Перед тем как стирать пару, проверь, что единиц хотя бы две.']); }

  { const b = new Builder(B + '1*ab');
    b.same('start', 'a', 'start', 'R'); b.r('start', '1', 'toY', 'a', 'R'); b.r('start', '*', 'xDone', '*', 'R');
    b.same('toY', '1a', 'toY', 'R'); b.r('toY', '*', 'findY', '*', 'R');
    b.same('findY', 'b', 'findY', 'R'); b.r('findY', '1', 'back', 'b', 'L'); b.r('findY', B, 'geErase', B, 'L');
    b.same('back', '1ab*', 'back', 'L'); b.r('back', B, 'start', B, 'R');
    b.same('xDone', 'b', 'xDone', 'R'); b.r('xDone', '1', 'ltLeft', '1', 'L'); b.r('xDone', B, 'geErase', B, 'L');
    b.r('geErase', 'b', 'geErase', B, 'L'); b.r('geErase', '1', 'geErase', B, 'L'); b.r('geErase', '*', 'geRestore', B, 'L');
    b.r('geRestore', 'a', 'geRestore', '1', 'L'); b.same('geRestore', '1', 'geRestore', 'L'); b.r('geRestore', B, 'x3start', B, 'R');
    b.same('ltLeft', 'ab*', 'ltLeft', 'L'); b.r('ltLeft', B, 'ltErase', B, 'R');
    b.r('ltErase', 'a', 'ltErase', B, 'R'); b.r('ltErase', '*', 'ltRestore', B, 'R');
    b.r('ltRestore', 'b', 'ltRestore', '1', 'R'); b.same('ltRestore', '1', 'ltRestore', 'R'); b.r('ltRestore', B, 'ltHome', B, 'L');
    b.same('ltHome', '1', 'ltHome', 'L'); b.r('ltHome', B, 'y2start', B, 'R');
    multiply(b, 'x3', 3); multiply(b, 'y2', 2);
    add('ф7', 'ф7. f(x, y) = 3x, если x ≥ y; 2y, если x < y', 'Вычислить f(x, y) = 3x при x ≥ y и 2y при x < y.', b.finish(), (x, y) => x >= y ? 3 * x : 2 * y,
      [[3, 2], [2, 2], [1, 4], [0, 0], [0, 3], [4, 1], [2, 3]],
      code + '<p>Три части. <b>Сравнение</b>: помечай по одной единице слева (a) и справа (b). Кончился x, а в y ещё есть единицы — x &lt; y; иначе x ≥ y. <b>Ветка</b>: сотри ненужный аргумент и *, верни метки в 1. <b>Умножение</b>: челнок, как в ф3, но для 3x за каждую единицу дописывай две.</p>',
      ['Сравнение заканчивается в одном из двух мест — оттуда и расходятся ветки.', 'Ответ 3x — это 3x+1 единиц: первая единица остаётся, за каждую следующую дописываются две.', 'Разные ветки — разные состояния умножения (x3… и y2…).']); }

  return tasks;
})();
if (typeof module !== 'undefined' && module.exports) module.exports = {FUNC_TASKS, LOOP};
