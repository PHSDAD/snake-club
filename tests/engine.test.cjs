'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../dist/engine.js');

function playing(options) {
  return engine.start(engine.createGame({ random: () => 0, ...options }));
}

test('initial game has a centered four-cell snake and unoccupied food', () => {
  for (const random of [() => 0, () => 0.5, () => 0.999999, () => 1]) {
    const game = engine.createGame({ random });
    assert.equal(game.status, 'ready');
    assert.deepEqual(game.snake, [{ x: 12, y: 12 }, { x: 11, y: 12 }, { x: 10, y: 12 }, { x: 9, y: 12 }]);
    assert.equal(game.snake.some(cell => cell.x === game.food.x && cell.y === game.food.y), false);
    assert.ok(game.food.x >= 0 && game.food.x < game.size && game.food.y >= 0 && game.food.y < game.size);
  }
});

test('ready and paused games do not move; pause resumes the same game', () => {
  const game = engine.createGame();
  const before = JSON.stringify(game);
  engine.step(game);
  assert.equal(JSON.stringify(game), before);
  assert.equal(engine.turn(game, 'up'), false);
  engine.start(game);
  engine.pause(game);
  const paused = JSON.stringify(game);
  engine.step(game);
  assert.equal(JSON.stringify(game), paused);
  assert.equal(engine.turn(game, 'up'), false);
  engine.pause(game);
  engine.step(game);
  assert.deepEqual(game.snake[0], { x: 13, y: 12 });
});

test('wall collision ends the game without committing the invalid position', () => {
  const game = playing({ size: 8 });
  game.snake = [{ x: 7, y: 2 }, { x: 6, y: 2 }, { x: 5, y: 2 }, { x: 4, y: 2 }];
  const snake = structuredClone(game.snake);
  assert.deepEqual(engine.step(game), { ate: false, ended: true, won: false });
  assert.equal(game.status, 'over');
  assert.deepEqual(game.snake, snake);
  engine.start(game);
  engine.pause(game);
  assert.equal(game.status, 'over');
  assert.deepEqual(engine.step(game), { ate: false, ended: false, won: false });
});

test('self collision ends the game', () => {
  const game = playing();
  game.snake = [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }, { x: 4, y: 2 }];
  assert.equal(engine.step(game).ended, true);
  assert.equal(game.status, 'over');
});

test('moving into the cell vacated by the tail is legal', () => {
  const game = playing();
  game.snake = [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }];
  assert.deepEqual(engine.step(game), { ate: false, ended: false, won: false });
  assert.equal(game.status, 'playing');
  assert.deepEqual(game.snake[0], { x: 3, y: 2 });
  assert.equal(new Set(game.snake.map(cell => `${cell.x},${cell.y}`)).size, 4);
});

test('reversals are rejected and two rapid turns are applied on separate ticks', () => {
  const game = playing();
  assert.equal(engine.turn(game, 'left'), false);
  assert.equal(engine.turn(game, 'right'), false);
  assert.equal(engine.turn(game, 'invalid'), false);
  assert.equal(engine.turn(game, 'toString'), false);
  assert.equal(engine.turn(game, 'up'), true);
  assert.equal(engine.turn(game, 'down'), false);
  assert.equal(engine.turn(game, 'left'), true);
  assert.equal(engine.turn(game, 'down'), false);
  assert.deepEqual(game.queue, ['up', 'left']);
  engine.step(game);
  assert.deepEqual(game.snake[0], { x: 12, y: 11 });
  assert.equal(game.direction, 'up');
  engine.step(game);
  assert.deepEqual(game.snake[0], { x: 11, y: 11 });
  assert.equal(game.direction, 'left');
  assert.deepEqual(game.queue, []);
});

test('eating grows the snake, adds ten points and chooses a free food cell', () => {
  for (const sample of [0, 0.5, 0.999999]) {
    const game = playing({ random: () => sample });
    game.food = { x: 13, y: 12 };
    assert.deepEqual(engine.step(game), { ate: true, ended: false, won: false });
    assert.equal(game.score, 10);
    assert.equal(game.snake.length, 5);
    assert.deepEqual(game.snake[0], { x: 13, y: 12 });
    assert.equal(game.snake.some(cell => cell.x === game.food.x && cell.y === game.food.y), false);
  }
});

test('consuming the last empty cell wins without trying to place another food', () => {
  const game = playing({ size: 4 });
  game.snake = [
    { x: 2, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 0 },
    { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
    { x: 3, y: 2 }, { x: 2, y: 2 }, { x: 1, y: 2 }, { x: 0, y: 2 },
    { x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
  ];
  game.food = { x: 3, y: 0 };
  assert.deepEqual(engine.step(game), { ate: true, ended: true, won: true });
  assert.equal(game.status, 'won');
  assert.equal(game.snake.length, 16);
  assert.equal(game.score, 10);
  assert.equal(game.food, null);
  assert.equal(engine.turn(game, 'down'), false);
});
