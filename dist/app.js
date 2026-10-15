(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const engine = window.SnakeEngine;
  const canvas = $('canvas');
  const ctx = canvas.getContext('2d');
  const board = $('board');
  const levels = { slow: { tick: 190, name: '悠閒速度', note: '放慢一點，享受每一口。' }, normal: { tick: 130, name: '標準速度', note: '不急不徐，找到你的節奏。' }, fast: { tick: 85, name: '挑戰速度', note: '眼明手快，挑戰你的反應力！' } };
  let level = 'normal';
  let game = engine.createGame();
  let best = 0;
  let oldBest = 0;
  let soundOn = false;
  let audio;
  let previous = 0;
  let elapsed = 0;
  let pointerStart = null;
  try {
    const saved = Number(localStorage.getItem('snake-club-best'));
    if (Number.isFinite(saved) && saved >= 0) best = Math.floor(saved);
  } catch (_) { /* Game remains playable when storage is unavailable. */ }

  function tone(frequency, duration = .08, type = 'sine') {
    if (!soundOn) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
      gain.gain.setValueAtTime(.055, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(); oscillator.stop(audio.currentTime + duration);
    } catch (_) { /* Audio is optional. */ }
  }

  const pad = value => String(value).padStart(3, '0');
  function updateScores() {
    $('score').textContent = pad(game.score);
    if (game.score > best) {
      best = game.score;
      try { localStorage.setItem('snake-club-best', String(best)); } catch (_) {}
    }
    $('best').textContent = pad(best);
    $('length-label').textContent = `長度 ${String(game.snake.length).padStart(2, '0')}`;
  }

  function syncUI() {
    const { status } = game;
    const playing = status === 'playing';
    const paused = status === 'paused';
    const ended = status === 'over' || status === 'won';
    $('overlay').hidden = playing;
    $('status-text').textContent = { ready: '準備出發', playing: '開吃中', paused: '休息一下', over: '下次會更長', won: '完美通關' }[status];
    $('main-action-text').textContent = playing ? '暫停一下' : paused ? '繼續遊戲' : ended ? '再玩一次' : '開始遊戲';
    $('action-icon').innerHTML = playing ? '<path d="M8 5v14M16 5v14" style="fill:none;stroke-width:4"/>' : '<path d="m9 5 11 7-11 7V5Z"/>';
    $('overlay-title').textContent = paused ? '休息一下，等等再吃。' : status === 'won' ? '整片果園，都是你的！' : ended ? (game.score > oldBest ? '新紀錄，吃得漂亮！' : '差一口，就更長了。') : '準備好開吃了嗎？';
    $('overlay-eyebrow').textContent = paused ? 'TAKE YOUR TIME.' : status === 'won' ? 'YOU ATE IT ALL!' : ended ? (game.score > oldBest ? 'A NEW PERSONAL BEST!' : 'ONE MORE ROUND?') : 'HEY, HUNGRY SNAKE!';
    $('overlay-description').textContent = paused ? '準備好了就繼續，你的果實還在等你。' : ended ? `這次拿下 ${game.score} 分，長度達到 ${game.snake.length} 格。` : '吃果實、變長長，小心別撞到自己。';
    $('overlay-action-text').textContent = paused ? '繼續遊戲' : ended ? '再玩一次' : '開始遊戲';
    $('overlay-hint').textContent = paused ? '或按空白鍵繼續' : ended ? '按 Enter 或 R 再來一局' : '或按 Enter 開始';
    if (!playing) $('announcement').textContent = `${$('overlay-title').textContent} ${$('overlay-description').textContent}`;
    updateScores();
  }

  function rounded(x, y, width, height, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
  }

  function draw() {
    const size = canvas.width;
    const cell = size / game.size;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#e5efdf';
    ctx.fillRect(0, 0, size, size);
    for (let y = 0; y < game.size; y++) {
      for (let x = 0; x < game.size; x++) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = '#e1ecda';
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
    }
    if (game.food) {
      const { x, y } = game.food;
      const cx = (x + .5) * cell;
      const cy = (y + .54) * cell;
      ctx.fillStyle = '#739852';
      ctx.beginPath();
      ctx.ellipse(cx + cell * .1, cy - cell * .39, cell * .17, cell * .075, -.6, 0, Math.PI * 2);
      ctx.fill();
      rounded(x * cell + cell * .15, y * cell + cell * .24, cell * .7, cell * .65, cell * .23, '#ed795e');
      rounded(x * cell + cell * .26, y * cell + cell * .36, cell * .1, cell * .19, cell * .05, '#ffc4a8');
    }
    const gap = cell * .07;
    for (let i = game.snake.length - 1; i >= 0; i--) {
      const part = game.snake[i];
      rounded(part.x * cell + gap, part.y * cell + gap, cell - gap * 2, cell - gap * 2, cell * .23, i === 0 ? '#255c3c' : '#65904f');
      if (i > 0 && i < game.snake.length - 1) rounded(part.x * cell + cell * .33, part.y * cell + cell * .33, cell * .22, cell * .22, cell * .04, '#7ba063');
    }
    const head = game.snake[0];
    const directions = { right: [1, 0], left: [-1, 0], up: [0, -1], down: [0, 1] };
    const [dx, dy] = directions[game.direction];
    for (const side of [-1, 1]) {
      const ex = (head.x + .5 + dx * .17 - dy * side * .22) * cell;
      const ey = (head.y + .5 + dy * .17 + dx * side * .22) * cell;
      ctx.fillStyle = '#f1f5d9'; ctx.beginPath(); ctx.arc(ex, ey, cell * .12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1b442e'; ctx.beginPath(); ctx.arc(ex + dx * cell * .04, ey + dy * cell * .04, cell * .055, 0, Math.PI * 2); ctx.fill();
    }
  }

  function reset(start = false) {
    oldBest = best;
    game = engine.createGame();
    elapsed = 0;
    board.classList.remove('collision');
    if (start) { engine.start(game); tone(440); }
    syncUI(); draw();
  }

  function mainAction() {
    if (game.status === 'ready') { oldBest = best; engine.start(game); tone(440); }
    else if (game.status === 'playing' || game.status === 'paused') engine.pause(game);
    else { reset(true); return; }
    elapsed = 0;
    syncUI();
  }

  function move(direction) {
    if (game.status === 'ready') mainAction();
    if (game.status === 'playing') engine.turn(game, direction);
  }

  function loop(now) {
    const delta = Math.min(now - (previous || now), 250);
    previous = now;
    if (game.status === 'playing') {
      elapsed += delta;
      const tick = levels[level].tick;
      while (elapsed >= tick && game.status === 'playing') {
        elapsed -= tick;
        const eatenAt = game.food ? { ...game.food } : null;
        const result = engine.step(game);
        if (result.ate) {
          tone(620 + (game.score % 50) * 5, .1, 'triangle');
          updateScores();
          const pop = $('point-pop');
          pop.style.left = `${(eatenAt.x + .5) / game.size * 100}%`;
          pop.style.top = `${(eatenAt.y + .5) / game.size * 100}%`;
          pop.classList.remove('show'); void pop.offsetWidth; pop.classList.add('show');
        }
        if (result.ended || result.won) {
          tone(result.won ? 880 : 150, .25, 'triangle');
          if (!result.won) board.classList.add('collision');
          syncUI();
        }
        draw();
      }
    }
    requestAnimationFrame(loop);
  }

  $('overlay-action').addEventListener('click', mainAction);
  $('main-action').addEventListener('click', mainAction);
  $('restart').addEventListener('click', () => reset(true));
  $('sound').addEventListener('click', () => {
    soundOn = !soundOn;
    $('sound').setAttribute('aria-pressed', String(soundOn));
    $('sound').setAttribute('aria-label', soundOn ? '關閉音效' : '開啟音效');
    $('sound-label').textContent = soundOn ? '音效開啟' : '音效關閉';
    $('sound-waves').setAttribute('d', soundOn ? 'M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14' : 'm16 9 6 6m0-6-6 6');
    tone(550);
  });
  document.querySelectorAll('[data-level]').forEach(button => {
    button.addEventListener('click', () => {
      level = button.dataset.level;
      elapsed = 0;
      document.querySelectorAll('[data-level]').forEach(item => {
        const selected = item.dataset.level === level;
        item.classList.toggle('selected', selected);
        item.setAttribute('aria-pressed', String(selected));
      });
      $('speed-label').textContent = levels[level].name;
      $('difficulty-note').textContent = levels[level].note;
    });
  });
  const keyDirections = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' };
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (keyDirections[event.code]) { event.preventDefault(); if (!event.repeat) move(keyDirections[event.code]); }
    else if (event.code === 'Space') {
      if (event.target.closest('button, a')) return;
      event.preventDefault();
      if (!event.repeat) mainAction();
    } else if (event.code === 'Enter' && event.target.tagName !== 'BUTTON' && event.target.tagName !== 'A') {
      event.preventDefault(); if (!event.repeat && game.status !== 'playing') mainAction();
    } else if (event.code === 'KeyR') { event.preventDefault(); if (!event.repeat) reset(true); }
  });
  document.querySelectorAll('[data-direction]').forEach(button => {
    button.addEventListener('pointerdown', event => { event.preventDefault(); move(button.dataset.direction); });
    button.addEventListener('click', event => { if (event.detail === 0) move(button.dataset.direction); });
  });
  board.addEventListener('pointerdown', event => {
    if (event.target.closest('button')) return;
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
    board.setPointerCapture(event.pointerId);
  });
  board.addEventListener('pointermove', event => {
    if (!pointerStart || event.pointerId !== pointerStart.id) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 16) return;
    move(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
    pointerStart = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });
  board.addEventListener('pointerup', () => { pointerStart = null; });
  board.addEventListener('pointercancel', () => { pointerStart = null; });
  function autoPause() { if (game.status === 'playing') { engine.pause(game); elapsed = 0; syncUI(); } }
  window.addEventListener('blur', autoPause);
  document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
  syncUI(); draw(); requestAnimationFrame(loop);
})();
