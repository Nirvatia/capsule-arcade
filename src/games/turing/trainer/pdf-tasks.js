const PDF_TASKS = (() => {
  const B = '_';

  function Builder(alphabet) {
    this.alphabet = alphabet;
    this.names = [];
    this.rules = [];
    this.q('start');
  }
  Builder.prototype.q = function(name) {
    if (name !== 'HALT' && !this.names.includes(name)) this.names.push(name);
    return name;
  };
  Builder.prototype.r = function(from, read, to, write = read, move = 'S') {
    this.q(from); this.q(to);
    this.rules.push([from, read, to, write, move]);
  };
  Builder.prototype.same = function(from, reads, to, move) {
    [...reads].forEach(a => this.r(from, a, to, a, move));
  };
  Builder.prototype.finish = function() {
    const ids = new Map(this.names.map((name, i) => [name, 'q' + (i + 1)]));
    return {
      alphabet: this.alphabet,
      states: this.names.map(name => ids.get(name)),
      solution: this.rules.map(r => [ids.get(r[0]), r[1], r[2] === 'HALT' ? 'q0' : ids.get(r[2]), r[3], r[4]])
    };
  };

  const digits = base => Array.from({length: base}, (_, i) => String(i)).join('');
  const valueOf = (word, base) => [...word].reduce((n, d) => n * base + Number(d), 0);
  const inBase = (n, base) => n.toString(base);

  function constantMachine(base, operation, amount) {
    const d = digits(base), last = d[base - 1];
    const b = new Builder(B + d);
    b.same('start', d, 'start', 'R');
    if (operation === 'sub') {
      b.r('start', B, 'borrow', B, 'L');
      b.r('borrow', '0', 'borrow', last, 'L');
      for (let i = 1; i < base; i++) b.r('borrow', String(i), 'checkLeft', String(i - 1), 'L');
      b.same('checkLeft', d, 'HALT', 'S');
      b.r('checkLeft', B, 'first', B, 'R');
      b.r('first', '0', 'hasRight', '0', 'R');
      for (let i = 1; i < base; i++) b.r('first', String(i), 'HALT', String(i), 'S');
      b.same('hasRight', d, 'eraseFirst', 'L');
      b.r('hasRight', B, 'HALT', B, 'S');
      b.r('eraseFirst', '0', 'HALT', B, 'S');
      return b.finish();
    }
    const initial = operation === 'add' ? amount : 0;
    b.r('start', B, 'carry' + initial, B, 'L');
    const maxCarry = operation === 'add' ? amount : amount - 1;
    for (let carry = 0; carry <= maxCarry; carry++) {
      for (let i = 0; i < base; i++) {
        const v = operation === 'add' ? i + carry : i * amount + carry;
        b.r('carry' + carry, String(i), 'carry' + Math.floor(v / base), String(v % base), 'L');
      }
      if (!carry) b.r('carry0', B, 'HALT', B, 'S');
      else b.r('carry' + carry, B, 'carry' + Math.floor(carry / base), String(carry % base), 'L');
    }
    return b.finish();
  }

  function reverseMachine(symbols) {
    const b = new Builder(B + symbols + '#x');
    b.same('start', symbols, 'start', 'R');
    b.r('start', B, 'take', '#', 'L');
    b.r('take', 'x', 'take', 'x', 'L');
    for (const a of symbols) {
      b.r('take', a, 'carry' + a, 'x', 'R');
      b.same('carry' + a, symbols + 'x#', 'carry' + a, 'R');
      b.r('carry' + a, B, 'return', a, 'L');
    }
    b.r('take', B, 'clean', B, 'R');
    b.same('return', symbols, 'return', 'L');
    b.r('return', '#', 'take', '#', 'L');
    b.r('clean', 'x', 'clean', B, 'R');
    b.r('clean', '#', 'HALT', B, 'R');
    return b.finish();
  }

  function sortMachine(symbols) {
    const b = new Builder(B + symbols);
    for (let i = 0; i < symbols.length; i++) {
      const previous = 'previous' + symbols[i];
      for (let j = 0; j < symbols.length; j++) {
        const current = symbols[j];
        if (j >= i) b.r(previous, current, 'previous' + current, current, 'R');
        else {
          b.r(previous, current, 'put' + current, symbols[i], 'L');
          b.r('put' + current, symbols[i], 'home', current, 'L');
        }
      }
      b.r(previous, B, 'stopHome', B, 'L');
    }
    b.same('start', symbols, 'previous' + symbols[0], 'S');
    b.r('start', B, 'stopHome', B, 'L');
    b.same('home', symbols, 'home', 'L');
    b.r('home', B, 'previous' + symbols[0], B, 'R');
    b.same('stopHome', symbols, 'stopHome', 'L');
    b.r('stopHome', B, 'HALT', B, 'R');
    return b.finish();
  }

  function unaryGroupMachine(group, output) {
    const b = new Builder(B + '|#x');
    b.same('start', '|', 'start', 'R');
    b.r('start', B, 'take1', '#', 'L');
    b.r('take1', 'x', 'take1', 'x', 'L');
    b.r('take1', B, 'clean', B, 'R');
    for (let i = 1; i <= group; i++) {
      b.r('take' + i, '|', i === group ? 'append1' : 'take' + (i + 1), 'x', i === group ? 'R' : 'L');
    }
    for (let i = 1; i <= output; i++) {
      b.same('append' + i, '|x#', 'append' + i, 'R');
      b.r('append' + i, B, i === output ? 'return' : 'append' + (i + 1), '|', i === output ? 'L' : 'R');
    }
    b.same('return', '|', 'return', 'L');
    b.r('return', '#', 'take1', '#', 'L');
    b.r('clean', 'x', 'clean', B, 'R');
    b.r('clean', '#', 'HALT', B, 'R');
    return b.finish();
  }

  function compareMachine(symbols, mode) {
    const marks = symbols === '|' ? {'|': 'x'} : Object.fromEntries([...symbols].map((a, i) => [a, String.fromCharCode(97 + i)]));
    const marked = Object.values(marks).join('');
    const b = new Builder(B + symbols + marked + '*' + (mode === 'sign' ? '<>=' : '#$'));
    b.same('start', symbols, 'start', 'R');
    b.r('start', '*', 'takeA', '*', 'L');
    b.same('takeA', marked, 'takeA', 'L');
    for (const a of symbols) b.r('takeA', a, 'crossA', marks[a], 'R');
    b.r('takeA', B, 'checkLeftEmpty', B, 'R');
    b.same('crossA', symbols + marked, 'crossA', 'R');
    b.r('crossA', '*', 'takeB', '*', 'R');
    b.same('takeB', marked, 'takeB', 'R');
    for (const a of symbols) b.r('takeB', a, 'returnStar', marks[a], 'L');
    b.r('takeB', B, 'gtHome', B, 'L');
    b.same('returnStar', symbols + marked, 'returnStar', 'L');
    b.r('returnStar', '*', 'takeA', '*', 'L');
    b.same('checkLeftEmpty', symbols + marked, 'checkLeftEmpty', 'R');
    b.r('checkLeftEmpty', '*', 'checkRightEmpty', '*', 'R');
    b.same('checkRightEmpty', marked, 'checkRightEmpty', 'R');
    for (const a of symbols) b.r('checkRightEmpty', a, 'ltHome', a, 'S');
    b.r('checkRightEmpty', B, symbols.length === 1 ? 'eqHome' : 'equalLengthHome', B, 'L');

    const restore = (name, action) => {
      b.same(name + 'Home', symbols + marked + '*', name + 'Home', 'L');
      b.r(name + 'Home', B, name, B, 'R');
      b.same(name, symbols, name, 'R');
      for (const a of symbols) b.r(name, marks[a], name, a, 'R');
      action(name);
    };
    const finalAction = sign => name => {
      const swap = mode !== 'sign' && ((mode === 'asc' && sign === '>') || (mode === 'desc' && sign === '<'));
      const after = name + 'After';
      b.r(name, '*', after, mode === 'sign' ? sign : '*', 'R');
      b.same(after, symbols, after, 'R');
      for (const a of symbols) b.r(after, marks[a], after, a, 'R');
      b.r(after, B, swap ? 'swapEnd' : 'HALT', B, 'S');
    };
    restore('lt', finalAction('<'));
    restore('gt', finalAction('>'));
    restore('eq', finalAction('='));

    if (symbols.length > 1) {
      restore('equalLength', name => {
        b.r(name, '*', 'equalLengthAfter', '*', 'R');
        b.same('equalLengthAfter', symbols, 'equalLengthAfter', 'R');
        for (const a of symbols) b.r('equalLengthAfter', marks[a], 'equalLengthAfter', a, 'R');
        b.r('equalLengthAfter', B, 'lexHome', B, 'L');
      });
      b.same('lexHome', symbols + marked + '*', 'lexHome', 'L');
      b.r('lexHome', B, 'lexA', B, 'R');
      b.same('lexA', marked, 'lexA', 'R');
      for (const a of symbols) {
        b.r('lexA', a, 'lexCross' + a, marks[a], 'R');
        b.same('lexCross' + a, symbols + marked, 'lexCross' + a, 'R');
        b.r('lexCross' + a, '*', 'lexB' + a, '*', 'R');
        b.same('lexB' + a, marked, 'lexB' + a, 'R');
        for (const c of symbols) {
          const destination = a < c ? 'ltHome' : a > c ? 'gtHome' : 'lexHome';
          b.r('lexB' + a, c, destination, a === c ? marks[c] : c, a === c ? 'L' : 'S');
        }
      }
      b.r('lexA', '*', 'eqHome', '*', 'S');
    }

    if (mode !== 'sign') {
      b.same('swapEnd', symbols + '*', 'swapEnd', 'R');
      b.r('swapEnd', B, 'swapHashHome', '$', 'L');
      b.same('swapHashHome', symbols + '*', 'swapHashHome', 'L');
      b.r('swapHashHome', B, 'swapA', '#', 'R');
      b.same('swapB', marked, 'swapB', 'R');
      b.r('swapB', '|', 'pipeBToHash', 'x', 'L');
      b.r('swapB', '$', 'swapCleanMiddle', B, 'L');
      b.same('swapA', marked, 'swapA', 'R');
      b.r('swapA', '|', 'pipeAToHash', 'x', 'L');
      b.r('swapA', '*', 'separatorToHash', '*', 'L');

      const prepend = (prefix, symbol, returnState) => {
        b.same(prefix + 'ToHash', symbols + marked + '*', prefix + 'ToHash', 'L');
        b.r(prefix + 'ToHash', '#', prefix + 'Out', '#', 'L');
        b.same(prefix + 'Out', '|*', prefix + 'Out', 'L');
        b.r(prefix + 'Out', B, returnState, symbol, 'R');
      };
      prepend('pipeB', '|', 'swapReturnB');
      prepend('separator', '*', 'swapReturnB');
      prepend('pipeA', '|', 'swapReturnA');
      b.same('swapReturnB', '|*', 'swapReturnB', 'R');
      b.r('swapReturnB', '#', 'swapSourceB', '#', 'R');
      b.same('swapSourceB', symbols + marked + B, 'swapSourceB', 'R');
      b.r('swapSourceB', '*', 'swapB', '*', 'R');
      b.same('swapReturnA', '|*', 'swapReturnA', 'R');
      b.r('swapReturnA', '#', 'swapA', '#', 'R');
      b.r('swapCleanMiddle', B, 'swapCleanMiddle', B, 'L');
      b.r('swapCleanMiddle', 'x', 'swapCleanMiddle', B, 'L');
      b.r('swapCleanMiddle', '*', 'swapCleanLeft', B, 'L');
      b.r('swapCleanLeft', 'x', 'swapCleanLeft', B, 'L');
      b.r('swapCleanLeft', '#', 'HALT', B, 'S');
    }
    return b.finish();
  }

  function twoNumberMachine(base, operation) {
    const d = digits(base), last = d[base - 1];
    const b = new Builder(B + d + '*');
    b.same('start', d + '*', 'start', 'R');
    b.r('start', B, 'decB', B, 'L');
    b.r('decB', '0', 'decB', last, 'L');
    for (let i = 1; i < base; i++) {
      b.r('decB', String(i), operation === 'add' ? 'toAIncrement' : 'toADecrement', String(i - 1), 'L');
    }
    b.r('decB', '*', 'clearB', '*', 'R');
    b.r('clearB', B, 'clearSeparator', B, 'L');
    for (const a of d) b.r('clearB', a, 'clearB', B, 'R');
    b.r('clearSeparator', B, 'clearSeparator', B, 'L');
    b.r('clearSeparator', '*', 'HALT', B, 'L');

    if (operation === 'add') {
      b.same('toAIncrement', d, 'toAIncrement', 'L');
      b.r('toAIncrement', '*', 'incA', '*', 'L');
      b.r('incA', last, 'incA', '0', 'L');
      for (let i = 0; i < base - 1; i++) b.r('incA', String(i), 'start', String(i + 1), 'R');
      b.r('incA', B, 'start', '1', 'R');
      return b.finish();
    }

    b.same('toADecrement', d, 'toADecrement', 'L');
    b.r('toADecrement', '*', 'decA', '*', 'L');
    b.r('decA', '0', 'decA', last, 'L');
    for (let i = 1; i < base; i++) b.r('decA', String(i), 'aCheckLeft', String(i - 1), 'L');
    b.same('aCheckLeft', d, 'start', 'S');
    b.r('aCheckLeft', B, 'aFirst', B, 'R');
    b.r('aFirst', '0', 'aHasRight', '0', 'R');
    for (let i = 1; i < base; i++) b.r('aFirst', String(i), 'start', String(i), 'S');
    b.same('aHasRight', d, 'aErase', 'L');
    b.r('aHasRight', '*', 'start', '*', 'S');
    b.r('aErase', '0', 'start', B, 'R');

    if (operation === 'sub') {
      b.r('decA', B, 'clearAll', '0', 'R');
      for (const a of d + '*') b.r('clearAll', a, 'clearAll', B, 'R');
      b.r('clearAll', B, 'HALT', B, 'S');
    } else {
      b.r('decA', B, 'absToEnd', B, 'R');
      b.same('absToEnd', d + '*', 'absToEnd', 'R');
      b.r('absToEnd', B, 'incB', B, 'L');
      b.r('incB', last, 'incB', '0', 'L');
      for (let i = 0; i < base - 1; i++) b.r('incB', String(i), 'absHome', String(i + 1), 'L');
      b.same('absHome', d + '*', 'absHome', 'L');
      b.r('absHome', B, 'absClearA', B, 'R');
      for (const a of d) b.r('absClearA', a, 'absClearA', B, 'R');
      b.r('absClearA', '*', 'stripB', B, 'R');
      b.r('stripB', '0', 'stripCheck', '0', 'R');
      for (let i = 1; i < base; i++) b.r('stripB', String(i), 'HALT', String(i), 'S');
      b.same('stripCheck', d, 'stripErase', 'L');
      b.r('stripCheck', B, 'HALT', B, 'S');
      b.r('stripErase', '0', 'stripB', B, 'R');
    }
    return b.finish();
  }

  function multiplyMachine(base, square = false) {
    const d = digits(base), last = d[base - 1];
    const marks = Object.fromEntries([...d].map((a, i) => [a, String.fromCharCode(97 + i)]));
    const marked = Object.values(marks).join('');
    const all = d + marked + '*#$';
    const b = new Builder(B + all);

    if (square) {
      b.same('start', d, 'start', 'R');
      b.r('start', B, 'dupHome', '*', 'L');
      b.same('dupHome', d, 'dupHome', 'L');
      b.r('dupHome', B, 'dupFind', B, 'R');
      b.same('dupFind', marked, 'dupFind', 'R');
      for (const a of d) {
        b.r('dupFind', a, 'dupCarry' + a, marks[a], 'R');
        b.same('dupCarry' + a, d + marked + '*', 'dupCarry' + a, 'R');
        b.r('dupCarry' + a, B, 'dupReturn', a, 'L');
      }
      b.r('dupFind', '*', 'dupRestore', '*', 'L');
      b.same('dupReturn', d + marked + '*', 'dupReturn', 'L');
      b.r('dupReturn', B, 'dupFind', B, 'R');
      for (const a of d) b.r('dupRestore', marks[a], 'dupRestore', a, 'L');
      b.r('dupRestore', B, 'workEnd', B, 'R');
    } else b.same('start', d + '*', 'workEnd', 'R');

    b.same('workEnd', d + '*', 'workEnd', 'R');
    b.r('workEnd', B, 'initZero', '#', 'R');
    b.r('initZero', B, 'initDollar', '0', 'R');
    b.r('initDollar', B, 'reserveHome', '$', 'L');
    b.same('reserveHome', all, 'reserveHome', 'L');
    b.r('reserveHome', B, 'reserveFind', B, 'R');
    b.same('reserveFind', marked, 'reserveFind', 'R');
    b.r('reserveFind', '*', 'reserveFind', '*', 'R');
    for (const a of d) b.r('reserveFind', a, 'reserveCarry', marks[a], 'R');
    b.same('reserveCarry', d + marked + '*#', 'reserveCarry', 'R');
    b.r('reserveCarry', '$', 'reserveNewDollar', '0', 'R');
    b.r('reserveNewDollar', B, 'reserveReturn', '$', 'L');
    b.same('reserveReturn', all, 'reserveReturn', 'L');
    b.r('reserveReturn', B, 'reserveFind', B, 'R');
    b.r('reserveFind', '#', 'reserveRestore', '#', 'L');
    b.r('reserveRestore', '*', 'reserveRestore', '*', 'L');
    for (const a of d) b.r('reserveRestore', marks[a], 'reserveRestore', a, 'L');
    b.r('reserveRestore', B, 'outerToHash', B, 'R');
    b.same('coreHome', all, 'coreHome', 'L');
    b.r('coreHome', B, 'outerToHash', B, 'R');
    b.same('outerToHash', d + marked + '*$', 'outerToHash', 'R');
    b.r('outerToHash', '#', 'decB', '#', 'L');
    b.r('decB', '0', 'decB', last, 'L');
    for (let i = 1; i < base; i++) b.r('decB', String(i), 'copyHome', String(i - 1), 'L');
    b.r('decB', '*', 'finalClearB', '*', 'R');

    b.same('copyHome', all, 'copyHome', 'L');
    b.r('copyHome', B, 'copyFind', B, 'R');
    b.same('copyFind', marked, 'copyFind', 'R');
    for (const a of d) {
      b.r('copyFind', a, 'copyCarry' + a, marks[a], 'R');
      b.same('copyCarry' + a, all, 'copyCarry' + a, 'R');
      b.r('copyCarry' + a, B, 'copyReturn', a, 'L');
    }
    b.r('copyFind', '*', 'copyRestore', '*', 'L');
    b.same('copyReturn', all, 'copyReturn', 'L');
    b.r('copyReturn', B, 'copyFind', B, 'R');
    for (const a of d) b.r('copyRestore', marks[a], 'copyRestore', a, 'L');
    b.r('copyRestore', B, 'cFindEnd', B, 'R');

    b.same('cFindEnd', all, 'cFindEnd', 'R');
    b.r('cFindEnd', B, 'decC', B, 'L');
    b.r('decC', '0', 'decC', last, 'L');
    for (let i = 1; i < base; i++) b.r('decC', String(i), 'incFindDollar', String(i - 1), 'L');
    b.r('decC', '$', 'clearC', '$', 'R');
    b.same('incFindDollar', d, 'incFindDollar', 'L');
    b.r('incFindDollar', '$', 'incR', '$', 'L');
    b.r('incR', last, 'incR', '0', 'L');
    for (let i = 0; i < base - 1; i++) b.r('incR', String(i), 'cReturnHome', String(i + 1), 'L');
    b.same('cReturnHome', all, 'cReturnHome', 'L');
    b.r('cReturnHome', B, 'cFindEnd', B, 'R');
    for (const a of d) b.r('clearC', a, 'clearC', B, 'R');
    b.r('clearC', B, 'afterClearC', B, 'L');
    b.r('afterClearC', B, 'afterClearC', B, 'L');
    b.same('afterClearC', all, 'coreHome', 'L');

    for (const a of d) b.r('finalClearB', a, 'finalClearB', B, 'R');
    b.r('finalClearB', '#', 'finalFindDollar', '#', 'R');
    b.same('finalFindDollar', d, 'finalFindDollar', 'R');
    b.r('finalFindDollar', '$', 'finalBackHash', B, 'L');
    b.same('finalBackHash', d, 'finalBackHash', 'L');
    b.r('finalBackHash', '#', 'finalSkipB', B, 'L');
    b.r('finalSkipB', B, 'finalSkipB', B, 'L');
    b.r('finalSkipB', '*', 'finalClearA', B, 'L');
    for (const a of d) b.r('finalClearA', a, 'finalClearA', B, 'L');
    b.r('finalClearA', B, 'stripR', B, 'R');
    b.r('stripR', B, 'stripR', B, 'R');
    b.r('stripR', '0', 'stripRCheck', '0', 'R');
    for (let i = 1; i < base; i++) b.r('stripR', String(i), 'HALT', String(i), 'S');
    b.same('stripRCheck', d, 'stripRErase', 'L');
    b.r('stripRCheck', B, 'HALT', B, 'S');
    b.r('stripRErase', '0', 'stripR', B, 'R');
    return b.finish();
  }

  const tasks = [];
  const add = (id, title, cond, machine, tests, theory, hints, extra = {}) => {
    const statesUsed = machine.solution.length ? Math.max(...machine.solution.map(r => Number(r[0].slice(1)))) : 1;
    tasks.push({
      id, title, cond, tests, theory, hints,
      goal: cond,
      part: 'Задачник PDF',
      kind: 'build',
      source: 'pdf',
      alphabet: machine.alphabet,
      states: machine.states,
      solution: machine.solution,
      nsol: statesUsed,
      cat: /^(1|8|9|10|11|12|13)/.test(id) ? 'carry' : 'other',
      ...extra
    });
  };
  const arithmeticTheory = 'Иди в конец числа и обрабатывай цифры справа налево. Состояние хранит перенос: записал младшую цифру результата, а новый перенос унеси влево. На пустой клетке слева допиши оставшийся перенос или остановись.';
  const arithmeticHints = ['Сначала нужен проход в q1 до правого края.', 'Для каждой пары «перенос + цифра» вычисли результат и новый перенос.', 'Не забудь команду для λ слева от числа.'];

  for (const [id, amount] of [['1а', 2], ['1б', 3], ['1в', 5]]) {
    const input = '11010111';
    add(id, `${id}. Двоичное + ${amount}`, `Увеличить натуральное число в двоичной записи на ${amount}. Вход и ответ — в двоичной записи.`, constantMachine(2, 'add', amount), [[input, inBase(valueOf(input, 2) + amount, 2)], ['1', inBase(1 + amount, 2)], ['11', inBase(3 + amount, 2)], ['101', inBase(5 + amount, 2)], ['111', inBase(7 + amount, 2)]], arithmeticTheory, arithmeticHints);
  }
  add('2', '2. Реверс двоичного набора', 'Записать произвольный двоичный набор в обратном порядке.', reverseMachine('01'), [['001101010', '010101100'], ['111', '111'], ['1', '1'], ['10', '01'], ['0011', '1100']], 'Помечай взятые справа символы меткой x и дописывай их после #. Когда исходные символы закончатся, сотри метки и #.', ['Состояние должно помнить, какой символ ты несёшь: 0 или 1.', 'В середине слова не стирай символ, а заменяй его на x.']);
  add('3', '3. Реверс набора 0/1/2', 'Записать входной набор из символов 0, 1, 2 в обратном порядке.', reverseMachine('012'), [['10020111220', '02211102001'], ['1221', '1221'], ['0', '0'], ['210', '012'], ['12002', '20021']], 'Тот же челнок, что и для двоичного слова, но нужны три состояния-носителя: для 0, 1 и 2.', ['Берите символы справа налево.', 'После построения ответа удали все x и вспомогательную границу #.']);
  add('4', '4. Сортировка 0/1/2', 'Упорядочить последовательность из 0, 1, 2 по возрастанию слева направо.', sortMachine('012'), [['2011200', '0001122'], ['200202220', '000022222'], ['21', '12'], ['0', '0'], ['2100', '0012']], 'Пузырьковая сортировка: запоминай предыдущий символ состоянием. Если текущий меньше предыдущего, поменяй их местами и вернись в начало. Проход без обменов означает конец.', ['Для соседней пары «больший, меньший» сначала запиши больший в текущую клетку.', 'После обмена вернись к левому краю и начни новый проход.']);
  add('5', '5. Половина в унарной записи', 'Разделить пополам чётное число в унарной записи.', unaryGroupMachine(2, 1), [['||||||', '|||'], ['||', '|'], ['||||', '||'], ['||||||||', '||||']], 'Забирай по две исходные палочки, помечая их x, и дописывай одну новую справа от #. В конце удали метки и #.', ['Каждая группа — две палочки.', 'Не стирай палочки в середине: используй x.']);
  add('6', '6. Увеличение в полтора раза', 'Увеличить чётное число в унарной записи в полтора раза.', unaryGroupMachine(2, 3), [['||||||', '|||||||||'], ['||', '|||'], ['||||', '||||||'], ['||||||||', '||||||||||||']], 'На каждые две помеченные исходные палочки дописывай три новые. В конце удали исходные помеченные палочки и #.', ['Схема как в задаче 5, но после группы из двух палочек нужно три символа.', 'После каждой группы возвращайся к #.']);

  for (const [id, mode, title] of [['7а', 'asc', 'по возрастанию'], ['7б', 'desc', 'по убыванию'], ['7в', 'sign', 'знак сравнения']]) {
    const machine = compareMachine('|', mode);
    const cond = mode === 'sign' ? 'Сравнить два унарных числа, разделённые *. Заменить * на >, < или =.' : `Упорядочить два унарных числа, разделённые *, ${title}.`;
    const tests = mode === 'asc' ? [['||||*|||', '|||*||||'], ['|||*|||||', '|||*|||||'], ['|||*|||', '|||*|||']] : mode === 'desc' ? [['||||*|||', '||||*|||'], ['|||*|||||', '|||||*|||'], ['|||*|||', '|||*|||']] : [['||||*|||', '||||>|||'], ['|||*|||||', '|||<|||||'], ['|||*|||', '|||=|||']];
    add(id, `${id}. Два унарных числа: ${title}`, cond, machine, tests, 'Попарно помечай палочки слева и справа. Так определяется, какое число длиннее. Для перестановки построй новую запись слева от исходной, затем сотри исходную.', ['Метка x позволяет не потерять уже сравненные палочки.', 'Сначала восстанови исходные палочки, затем меняй * на знак или выполняй перестановку.']);
  }

  add('8а', '8а. Сравнение двоичных чисел', 'Сравнить a и b в двоичной записи, разделённые *. Заменить * на >, < или =, сохранив числа.', compareMachine('01', 'sign'), [['10111*10101', '10111>10101'], ['10111*11000', '10111<11000'], ['101*101', '101=101'], ['1*10', '1<10'], ['10*1', '10>1']], 'Сначала сравни длины попарной разметкой. При равной длине восстанови цифры и сравнивай пары слева направо. Разметка хранит исходную цифру: a — это 0, b — это 1.', ['Если длины разные, лексикографическое сравнение не нужно.', 'После ответа восстанови все помеченные цифры и замени *.']);
  for (const [id, operation, title] of [['8б', 'sub', 'усечённая разность'], ['8в', 'abs', 'модуль разности']]) {
    const tests = operation === 'sub' ? [['101*1111', '0'], ['1111*101', '1010'], ['101*101', '0']] : [['101*1111', '1010'], ['1111*101', '1010'], ['101*101', '0']];
    add(id, `${id}. Двоичная ${title}`, `Вычислить ${operation === 'sub' ? 'усечённую разность a ∸ b' : '|a − b|'} для двух двоичных чисел, разделённых *.`, twoNumberMachine(2, operation), tests, 'Повторяй цикл: вычти 1 из b, затем 1 из a. Если b стало нулём, ответ слева. Если первым стал нулём a, для усечённой разности ответ 0, а для модуля разности верни последний заём в b и оставь b.', ['Вычитание единицы — это заём: 0 → 1 и влево, 1 → 0.', 'Для модуля разности важна компенсирующая +1 к b, если a уже был нулём.']);
  }
  add('9а', '9а. Троичное + 4', 'Увеличить натуральное число в троичной записи на четыре.', constantMachine(3, 'add', 4), [['1022', '1110'], ['222', '1010'], ['1', '12'], ['12', '100'], ['212', '1000']], arithmeticTheory, arithmeticHints);
  add('9б', '9б. Троичное × 4', 'Увеличить натуральное число в троичной записи в четыре раза.', constantMachine(3, 'mul', 4), [['1022', '12012'], ['222', '10212'], ['1', '11'], ['12', '202'], ['2', '22']], arithmeticTheory, arithmeticHints);
  add('10а', '10а. Десятичное − 1', 'Вычесть единицу из натурального числа в десятичной записи.', constantMachine(10, 'sub', 1), [['1000', '999'], ['127', '126'], ['1', '0'], ['10', '9'], ['100', '99']], 'Вычитай справа налево: 0 заменяется на 9, а заём идёт влево. Первая ненулевая цифра уменьшается. Если появился ведущий ноль и после него есть цифры, сотри его.', ['Заём продолжается, пока видишь 0.', 'Для 1 ответ должен остаться 0, а не пустая лента.']);
  add('10б', '10б. Десятичное + 1', 'Прибавить единицу к натуральному числу в десятичной записи.', constantMachine(10, 'add', 1), [['99', '100'], ['105', '106'], ['1', '2'], ['1999', '2000']], arithmeticTheory, arithmeticHints);
  add('10в', '10в. Десятичное × 2', 'Увеличить натуральное число в десятичной записи в два раза.', constantMachine(10, 'mul', 2), [['5197', '10394'], ['1', '2'], ['5', '10'], ['99', '198'], ['100', '200']], arithmeticTheory, arithmeticHints);
  add('10г', '10г. Десятичное × 3', 'Увеличить натуральное число в десятичной записи в три раза.', constantMachine(10, 'mul', 3), [['5197', '15591'], ['1', '3'], ['4', '12'], ['99', '297'], ['100', '300']], arithmeticTheory, arithmeticHints);
  add('11а', '11а. Десятичная сумма', 'Сложить два натуральных числа a и b в десятичной записи, разделённые *.', twoNumberMachine(10, 'add'), [['152*99', '251'], ['1*1', '2'], ['9*1', '10'], ['99*1', '100'], ['152*0', '152']], 'Перекладывай по единице: пока b не ноль, вычитай 1 из b и прибавляй 1 к a. В конце сотри b и разделитель.', ['Используй готовые алгоритмы десятичных +1 и −1.', 'После каждого цикла снова ищи правый конец b.']);
  for (const [id, operation, title] of [['11б', 'sub', 'усечённая разность'], ['11в', 'abs', 'модуль разности']]) {
    const tests = operation === 'sub' ? [['152*99', '53'], ['99*152', '0'], ['152*152', '0']] : [['152*99', '53'], ['99*152', '53'], ['99*99', '0']];
    add(id, `${id}. Десятичная ${title}`, `Вычислить ${operation === 'sub' ? 'усечённую разность a ∸ b' : '|a − b|'} для десятичных чисел, разделённых *.`, twoNumberMachine(10, operation), tests, 'Цикл: b − 1, затем a − 1. Если b стало нулём, оставь a. Если a уже был нулём, для усечённой разности оставь 0; для модуля разности компенсируй последнее вычитание из b и оставь b.', ['Ведущий ноль у a стирай после вычитания.', 'В конце у b тоже удали ведущие нули, оставив один ноль при равенстве.']);
  }
  add('12а', '12а. Квадрат двоичного числа', 'Возвести натуральное число в двоичной записи в квадрат.', multiplyMachine(2, true), [['1011', '1111001'], ['1', '1'], ['10', '100'], ['101', '11001'], ['111', '110001']], 'Скопируй число, получив a*a. Затем повторяй: уменьшай правый сомножитель на 1 и прибавляй a к результату. Для сохранения a копируй его во временную область; вспомогательные буквы — помеченные цифры.', ['Результат справа от # сначала равен 0.', 'Временная копия находится после $. После каждого слагаемого она стирается.']);
  add('12б', '12б. Квадрат десятичного числа', 'Возвести натуральное число в десятичной записи в квадрат.', multiplyMachine(10, true), [['115', '13225'], ['1', '1'], ['2', '4'], ['10', '100'], ['12', '144']], 'Скопируй число и используй умножение повторным сложением. Результат начинается с 0, а временная копия a сохраняет исходный сомножитель между циклами.', ['Состояния с буквенными метками нужны только для копирования цифр.', 'При переполнении результата # сдвигается на одну клетку влево.']);
  add('13а', '13а. Произведение двоичных чисел', 'Вычислить произведение двух натуральных чисел в двоичной записи, разделённых *. В PDF в примере опечатка: правильно 1101 * 1111 → 11000011 (13 × 15 = 195), а не 1011011.', multiplyMachine(2), [['1101*1111', '11000011'], ['101*11', '1111'], ['1*1', '1'], ['10*11', '110'], ['111*111', '110001']], 'Умножение повторным сложением: b раз прибавь a к результату. Копия a во временной области после $ позволяет не портить исходный сомножитель.', ['В условии PDF допущена арифметическая ошибка, ориентируйся на 11000011.', 'Сначала результат 0; после каждого сложения уменьшай b на 1.'], {warning: 'В PDF неверный пример: 1011011₂ = 91. Правильный ответ для 1101₂ × 1111₂ — 11000011₂ = 195.'});
  add('13б', '13б. Произведение троичных чисел', 'Вычислить произведение двух натуральных чисел в троичной записи, разделённых *. Ответ — в троичной записи.', multiplyMachine(3), [['212*12', '11021'], ['1*1', '1'], ['2*2', '11'], ['10*2', '20'], ['21*12', '1022']], 'Повторное сложение в троичной системе: вычитай 1 из b, копируй a во временную область и переноси его в результат по единице.', ['Перенос при +1 возникает на цифре 2.', 'Не забудь очистить оба сомножителя и вспомогательные разделители.']);
  add('13в', '13в. Произведение десятичных чисел', 'Вычислить произведение двух натуральных чисел в десятичной записи, разделённых *. Ответ — в десятичной записи.', multiplyMachine(10), [['218*14', '3052'], ['2*3', '6'], ['10*10', '100'], ['12*11', '132'], ['99*2', '198']], 'Повторное сложение в десятичной системе: b раз прибавь a к результату, используя временную копию a и отдельный результат после #.', ['Таблица большая, но состоит из повторяющихся блоков: копирование, −1 и +1.', 'Буквы a–j обозначают помеченные цифры 0–9 при копировании.']);

  return tasks;
})();

if (typeof module !== 'undefined' && module.exports) module.exports = {PDF_TASKS};
