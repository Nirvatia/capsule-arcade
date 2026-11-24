(() => {
  const scene = $('gameScene'), welcome = $('welcomeScene'), world = $('worldBg');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const particles = [];
  const ink = '#34433f', paper = '#f3eddd', teal = '#397c75', red = '#c65d49', brass = '#d3a64f';
  let camera = 0, previousSteps = 0, lastFrame = 0;

  function fit(canvas) {
    const ratio = Math.min(devicePixelRatio || 1, 2), w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return null;
    if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio);
    }
    const g = canvas.getContext('2d');
    g.setTransform(ratio, 0, 0, ratio, 0, 0);
    g.lineJoin = 'round'; g.lineCap = 'round';
    return {g, w, h};
  }

  function rect(g, color, x, y, w, h, stroke = null, width = 1.5) {
    g.fillStyle = color; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.strokeRect(Math.round(x) + .5, Math.round(y) + .5, Math.round(w), Math.round(h)); }
  }

  function circle(g, x, y, r, fill, stroke = ink, width = 1.5) {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = fill; g.fill();
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = width; g.stroke(); }
  }

  function paperGrid(g, w, h, detailed) {
    g.fillStyle = paper; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#dfd7c6'; g.lineWidth = 1;
    for (let x = 0; x < w; x += 24) { g.beginPath(); g.moveTo(x + .5, 0); g.lineTo(x + .5, h); g.stroke(); }
    for (let y = 0; y < h; y += 24) { g.beginPath(); g.moveTo(0, y + .5); g.lineTo(w, y + .5); g.stroke(); }
    g.strokeStyle = '#c8bca5';
    g.beginPath(); g.moveTo(0, h * .78 + .5); g.lineTo(w, h * .78 + .5); g.stroke();
    if (detailed) {
      g.fillStyle = '#a9a08e'; g.font = '12px "JetBrains Mono", monospace'; g.textAlign = 'left';
      g.fillText('q, a → q′, b, X', 18, 26);
      g.fillText('R / L / S', 18, 45);
      g.strokeStyle = '#b8ad98'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(18, 53); g.lineTo(118, 53); g.stroke();
      gear(g, w - 68, 44, 19, 0);
    }
  }

  function gear(g, x, y, r, angle) {
    g.save(); g.translate(x, y); g.rotate(angle);
    g.strokeStyle = '#9d9584'; g.lineWidth = 3;
    for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.moveTo(r - 2, 0); g.lineTo(r + 5, 0); g.stroke(); }
    circle(g, 0, 0, r, 'rgba(0,0,0,0)', '#9d9584', 2);
    circle(g, 0, 0, 5, paper, '#9d9584', 2);
    g.restore();
  }

  function depot(g, x, floor, active) {
    const door = active ? '#73926c' : '#a9a28f';
    rect(g, '#ded5c2', x - 34, floor - 83, 68, 82, ink, 2);
    g.fillStyle = '#c5b99f'; g.beginPath(); g.moveTo(x - 43, floor - 82); g.lineTo(x, floor - 108); g.lineTo(x + 43, floor - 82); g.closePath(); g.fill(); g.strokeStyle = ink; g.lineWidth = 2; g.stroke();
    rect(g, door, x - 19, floor - 48, 38, 47, ink, 2);
    for (let i = 0; i < 3; i++) rect(g, '#887f6d', x - 13 + i * 12, floor - 42, 2, 35);
    rect(g, paper, x - 26, floor - 78, 52, 19, ink, 1.5);
    g.fillStyle = ink; g.font = '700 11px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText(active ? 'q0 · ГОТОВО' : 'q0 · ДЕПО', x, floor - 65);
    if (active) {
      circle(g, x + 27, floor - 91, 4, '#5e8c62', ink, 1);
      g.fillStyle = '#4f7554'; g.font = '10px Onest, sans-serif'; g.fillText('работа принята', x, floor - 114);
    }
  }

  function mechanic(g, x, y, scale, time, status, direction) {
    const done = status === 'done', bad = status === 'hang' || status === 'loop';
    const body = done ? '#78a574' : bad ? '#c66a54' : brass;
    const bob = reduced.matches ? 0 : Math.sin(time * .004) * .8;
    g.save(); g.translate(Math.round(x), Math.round(y + bob)); g.scale(scale, scale);
    if (direction === 'L') g.scale(-1, 1);
    g.globalAlpha = .15; circle(g, 0, 35, 38, ink, null); g.globalAlpha = 1;
    rect(g, '#58615b', -30, 18, 60, 19, ink, 2);
    for (const wx of [-20, 0, 20]) {
      circle(g, wx, 28, 8, '#39443f', ink, 1.5); circle(g, wx, 28, 3, '#b9b19d', ink, 1);
    }
    rect(g, body, -26, -12, 52, 34, ink, 2);
    rect(g, '#edcf82', -20, -7, 30, 7);
    circle(g, -15, 7, 4, '#f2e8ca', ink, 1);
    rect(g, '#6b705f', 2, 2, 16, 13, ink, 1);
    g.fillStyle = ink; g.font = '700 8px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText('T-1', 10, 12);
    rect(g, '#bb8f43', -20, -34, 35, 23, ink, 2);
    rect(g, '#b9d5cc', -14, -29, 23, 10, ink, 1);
    circle(g, 7, -25, 2, ink, null);
    g.strokeStyle = ink; g.lineWidth = 2; g.beginPath(); g.moveTo(-4, -34); g.lineTo(-4, -43); g.stroke();
    circle(g, -4, -45, 3.5, red, ink, 1);
    const stamp = reduced.matches ? 0 : Math.max(0, Math.sin(time * .006)) * 5;
    g.strokeStyle = ink; g.lineWidth = 5; g.beginPath(); g.moveTo(25, -4); g.lineTo(37, 7 + stamp); g.lineTo(44, 22 + stamp); g.stroke();
    circle(g, 25, -4, 5, '#c38e41', ink, 1.5); circle(g, 37, 7 + stamp, 4, '#c38e41', ink, 1.5);
    g.strokeStyle = red; g.lineWidth = 3; g.beginPath(); g.moveTo(44, 20 + stamp); g.lineTo(44, 31 + stamp); g.stroke();
    g.restore();
  }

  function spawn(x, y) {
    if (reduced.matches) return;
    for (let i = 0; i < 5; i++) particles.push({x, y, vx: (Math.random() - .5) * 2.2, vy: -1 - Math.random(), life: 1});
  }

  function drawParticles(g) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += .08; p.life -= .045;
      g.globalAlpha = Math.max(0, p.life); rect(g, red, p.x, p.y, 2, 3);
      if (p.life <= 0) particles.splice(i, 1);
    }
    g.globalAlpha = 1;
  }

  function conveyor(g, w, h, time, s) {
    const pos = s ? s.pos : 0, tape = s ? s.tape : new Map([[0, '1'], [1, '0'], [2, '1']]);
    const status = s ? s.status : 'idle', steps = s ? s.steps : 0, state = s ? s.q : 'q1';
    const direction = s && s.lastMove ? s.lastMove : 'R';
    camera += (pos - camera) * (reduced.matches ? 1 : .1);
    const tileW = Math.max(55, Math.min(72, w / 10)), floor = h * .72;
    depot(g, w - 56, floor + 3, status === 'done');
    rect(g, '#777c6f', 0, floor + 39, w, 8);
    for (let x = 22; x < w; x += 72) {
      rect(g, '#9b9684', x, floor + 46, 6, 15);
      circle(g, x + 3, floor + 60, 5, '#5f685f', ink, 1);
    }
    const first = Math.floor(camera - w / tileW / 2) - 2, last = Math.ceil(camera + w / tileW / 2) + 2;
    for (let i = first; i <= last; i++) {
      const x = w / 2 + (i - camera) * tileW, current = i === pos;
      rect(g, current ? '#e2eee4' : '#faf5e8', x - tileW / 2 + 2, floor, tileW - 4, 35, current ? teal : '#7f8175', current ? 3 : 1.5);
      circle(g, x - tileW / 2 + 8, floor + 29, 1.5, '#a49b87', null);
      circle(g, x + tileW / 2 - 8, floor + 29, 1.5, '#a49b87', null);
      const symbol = tape.get(i) || '_';
      g.fillStyle = current ? '#245f5b' : symbol === '_' ? '#9c988b' : ink;
      g.font = '700 18px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText(symbol === '_' ? 'λ' : symbol, x, floor + 24);
      g.fillStyle = '#8c887b'; g.font = '8px "JetBrains Mono", monospace'; g.fillText(String(i), x, floor + 49);
    }
    const rx = w / 2 + (pos - camera) * tileW, ry = floor - 48;
    if (s && steps !== previousSteps) { spawn(rx + 42, ry + 27); previousSteps = steps; }
    mechanic(g, rx, ry, 1, time, status, direction);
    rect(g, paper, rx - 25, ry - 79, 50, 22, status === 'done' ? '#5d865e' : status === 'hang' ? red : teal, 1.5);
    g.fillStyle = status === 'done' ? '#4c7550' : status === 'hang' ? red : '#285f5b';
    g.font = '700 12px "JetBrains Mono", monospace'; g.textAlign = 'center'; g.fillText(state, rx, ry - 64);
    drawParticles(g);
    $('sceneState').textContent = state;
    $('sceneSteps').textContent = 'Шаг ' + steps;
    $('sceneSector').textContent = typeof L !== 'undefined' && L ? String(L.id).toUpperCase() : '01';
    $('sceneMission').textContent = typeof L !== 'undefined' && L && L.source === 'pdf' ? 'Задачник PDF · конвейер' : 'Учебный цех · конвейер';
  }

  function drawWelcome(time) {
    if (!welcome || welcome.closest('[hidden]')) return;
    const fitted = fit(welcome); if (!fitted) return;
    const {g, w, h} = fitted;
    paperGrid(g, w, h, false);
    const floor = h * .72;
    for (let i = 0; i < 7; i++) {
      const x = w / 2 + (i - 3) * 43;
      rect(g, i === 3 ? '#e2eee4' : '#faf5e8', x - 20, floor, 40, 27, i === 3 ? teal : '#7f8175', i === 3 ? 2.5 : 1.2);
      g.fillStyle = ink; g.font = '700 13px "JetBrains Mono", monospace'; g.textAlign = 'center';
      g.fillText(['1', '0', '1', '1', '0', '0', '1'][i], x, floor + 19);
    }
    depot(g, w - 48, floor + 2, false);
    mechanic(g, w / 2, floor - 39, .9, time, 'run', 'R');
    g.fillStyle = '#777363'; g.font = '11px Onest, sans-serif'; g.textAlign = 'left'; g.fillText('Схема 01 · механик и лента', 12, 20);
  }

  function frame(time) {
    if (time - lastFrame > 32) {
      const fitted = fit(scene); if (fitted) { paperGrid(fitted.g, fitted.w, fitted.h, true); conveyor(fitted.g, fitted.w, fitted.h, time, typeof sim !== 'undefined' ? sim : null); }
      drawWelcome(time); lastFrame = time;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
