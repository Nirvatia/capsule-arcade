(() => {
  const defaults = {xp: 0, streak: 0, best: 0, achievements: {}, sound: true, seen: false, theme: '', testRewards: {}};
  store.game = Object.assign({}, defaults, store.game || {});
  store.game.achievements = store.game.achievements || {};
  store.game.testRewards = store.game.testRewards || {};
  const game = store.game;
  const assisted = new Set();
  const ranks = [
    ['Стажёр', 0], ['Оператор', 100], ['Конструктор', 250], ['Инженер', 500],
    ['Архитектор', 850], ['Исследователь', 1300], ['Мастер ленты', 1900], ['Легенда Тьюринга', 2600]
  ];
  const achievements = [
    {id: 'first', mark: '01', title: 'Первый запуск', text: 'Пройди первую миссию.', ready: () => Object.keys(store.done).length >= 1},
    {id: 'five', mark: '05', title: 'Пять шагов', text: 'Пройди пять разных миссий.', ready: () => Object.keys(store.done).length >= 5},
    {id: 'course', mark: 'C', title: 'Курс пройден', text: 'Заверши все учебные уровни.', ready: () => DATA.levels.every(l => store.done[l.id])},
    {id: 'pdf', mark: 'P', title: 'Из задачника', text: 'Реши любую задачу из PDF.', ready: () => PDF_TASKS.some(l => store.done[l.id])},
    {id: 'func', mark: 'ƒ', title: 'Функционер', text: 'Реши любую задачу на функцию.', ready: () => FUNC_TASKS.some(l => store.done[l.id])},
    {id: 'partial', mark: '∞', title: 'Не определена', text: 'Реши функцию с вечным циклом: ф4, ф5 или ф6.', ready: () => ['ф4', 'ф5', 'ф6'].some(id => store.done[id])},
    {id: 'half', mark: '14', title: 'Половина сборника', text: 'Реши 14 задач из PDF.', ready: () => PDF_TASKS.filter(l => store.done[l.id]).length >= 14},
    {id: 'boss', mark: 'B', title: 'Босс повержен', text: 'Реши обе задачи пробного теста.', ready: () => Boolean(game.achievements.boss)}
  ];

  let audio = null;
  function tone(freq, duration = .08, delay = 0, volume = .035) {
    if (!game.sound) return;
    try {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      audio = audio || new Audio();
      const osc = audio.createOscillator(), gain = audio.createGain(), at = audio.currentTime + delay;
      osc.type = 'sine'; osc.frequency.setValueAtTime(freq, at);
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + .01); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
      osc.connect(gain); gain.connect(audio.destination); osc.start(at); osc.stop(at + duration + .02);
    } catch (e) {}
  }
  const successSound = () => { tone(440, .1); tone(660, .12, .08); tone(880, .16, .17); };

  function toast(title, text = '') {
    const el = document.createElement('div');
    el.className = 'toast';
    const b = document.createElement('b'); b.textContent = title;
    const span = document.createElement('span'); span.textContent = text;
    el.append(b, span); $('toastStack').append(el);
    setTimeout(() => { el.classList.add('leaving'); setTimeout(() => el.remove(), 300); }, 3400);
  }

  function unlock(id) {
    if (game.achievements[id]) return;
    game.achievements[id] = true;
    const a = achievements.find(x => x.id === id);
    if (a && id !== 'boss') toast('Награда: ' + a.title, a.text);
  }
  function checkAchievements() {
    achievements.forEach(a => { if (!game.achievements[a.id] && a.ready()) unlock(a.id); });
    save(); updateHUD();
  }

  function updateHUD() {
    let rank = 0;
    ranks.forEach((r, i) => { if (game.xp >= r[1]) rank = i; });
    const next = ranks[rank + 1], floor = ranks[rank][1];
    $('hudRank').textContent = ranks[rank][0];
    $('hudLevel').textContent = 'Уровень ' + (rank + 1);
    $('hudXp').textContent = next ? `${game.xp} / ${next[1]} XP` : `${game.xp} XP · максимум`;
    $('hudXpBar').style.width = next ? Math.min(100, 100 * (game.xp - floor) / (next[1] - floor)) + '%' : '100%';
    $('hudStreak').textContent = game.streak;
    $('hudStreak').title = 'Лучшая серия: ' + game.best;
    $('bSound').textContent = 'Звук: ' + (game.sound ? 'вкл.' : 'выкл.');
    $('bSound').setAttribute('aria-pressed', String(game.sound));
    $('achievementCount').textContent = `${achievements.filter(a => game.achievements[a.id]).length}/${achievements.length}`;
    renderAchievements();
  }

  function renderAchievements() {
    $('achievementGrid').innerHTML = achievements.map(a => {
      const open = Boolean(game.achievements[a.id]);
      return `<div class="achievement ${open ? 'unlocked' : 'locked'}"><span class="medal">${open ? '✓' : a.mark}</span><div><b>${esc(a.title)}</b><p>${esc(a.text)}</p></div></div>`;
    }).join('');
  }

  function celebrate() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = $('confetti'), ctx = canvas.getContext('2d'), ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * ratio; canvas.height = innerHeight * ratio;
    const colors = ['#397c75', '#d3a64f', '#c65d49', '#34433f'];
    const parts = Array.from({length: 75}, () => ({
      x: canvas.width * (.25 + Math.random() * .5), y: canvas.height * .18,
      vx: (Math.random() - .5) * 16 * ratio, vy: (-4 - Math.random() * 8) * ratio,
      size: (3 + Math.random() * 5) * ratio, color: colors[Math.floor(Math.random() * colors.length)], spin: Math.random() * 6
    }));
    const started = performance.now();
    function frame(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const progress = (now - started) / 1500;
      parts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.vy += .28 * ratio; p.spin += .12;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); ctx.globalAlpha = Math.max(0, 1 - progress);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .66); ctx.restore();
      });
      if (progress < 1) requestAnimationFrame(frame); else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('tm:hint', () => tone(300, .06));
  window.addEventListener('tm:solution', () => { if (L) assisted.add(L.id); });
  window.addEventListener('tm:mistake', () => { game.streak = 0; save(); updateHUD(); tone(170, .12); });
  window.addEventListener('tm:complete', e => {
    if (!e.detail.first) return;
    const level = e.detail.level, help = assisted.has(level.id);
    const base = level.source === 'pdf' ? 90 : level.source === 'func' ? 70 : level.kind === 'build' ? 50 : 35;
    const reward = Math.max(20, base - e.detail.hints * 5 - (help ? 30 : 0));
    game.xp += reward;
    game.streak = help ? 0 : game.streak + 1;
    game.best = Math.max(game.best, game.streak);
    save(); updateHUD(); checkAchievements();
    toast(`+${reward} XP`, help ? 'Миссия пройдена с готовым решением.' : game.streak > 1 ? `Серия без готовых решений: ${game.streak}` : 'Миссия пройдена.');
    successSound(); celebrate();
  });
  window.addEventListener('tm:test', e => {
    if (!store.test || game.testRewards[store.test.start]) return;
    game.testRewards[store.test.start] = true;
    const total = e.detail.total, reward = total * 100;
    game.xp += reward;
    if (total === 2) unlock('boss');
    save(); updateHUD(); checkAchievements();
    if (reward) { toast(`Тест: +${reward} XP`, `Решено ${total} из 2.`); successSound(); celebrate(); }
  });

  document.querySelectorAll('[data-navmode]').forEach(button => button.addEventListener('click', () => {
    const mode = button.dataset.navmode;
    const candidates = LEVELS.map((l, i) => ({l, i})).filter(({l}) => inMode(l, mode));
    const next = candidates.find(({l}) => !store.done[l.id]) || candidates[0];
    if (next) openLevel(next.i);
  }));
  $('bAchievements').onclick = () => {
    const open = $('achievementPanel').hidden;
    $('achievementPanel').hidden = !open;
    $('bAchievements').setAttribute('aria-expanded', String(open));
    if (open) $('achievementPanel').scrollIntoView({behavior: 'smooth', block: 'nearest'});
  };
  $('bSound').onclick = () => { game.sound = !game.sound; save(); updateHUD(); if (game.sound) tone(520, .08); };
  $('bTheme').onclick = () => {
    const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    game.theme = dark ? 'light' : 'dark';
    document.documentElement.dataset.theme = game.theme; save();
  };
  $('bStartGame').onclick = () => {
    game.seen = true; save(); $('welcome').hidden = true;
    tone(440, .08); tone(660, .12, .08);
  };

  if (game.theme) document.documentElement.dataset.theme = game.theme;
  if (!game.seen) { $('welcome').hidden = false; setTimeout(() => $('bStartGame').focus(), 0); }
  updateHUD(); renderNav(); checkAchievements();
})();
