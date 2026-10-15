(function (root, factory) {
  'use strict';
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) root.SnakeEngine = engine;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  const vectors = Object.freeze({
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  });

  function placeFood(game) {
    const occupied = new Set(game.snake.map(cell => cell.y * game.size + cell.x));
    const empty = [];
    for (let y = 0; y < game.size; y += 1) {
      for (let x = 0; x < game.size; x += 1) {
        if (!occupied.has(y * game.size + x)) empty.push({ x, y });
      }
    }
    if (empty.length === 0) return null;
    const sample = Number(game._random());
    const fraction = Number.isFinite(sample) ? Math.max(0, Math.min(sample, 1)) : 0;
    return empty[Math.min(empty.length - 1, Math.floor(fraction * empty.length))];
  }

  function createGame({ size = 24, random = Math.random } = {}) {
    if (!Number.isInteger(size) || size < 4) throw new RangeError('Board size must be an integer of at least 4.');
    if (typeof random !== 'function') throw new TypeError('random must be a function.');
    const headX = Math.max(3, Math.floor(size / 2));
    const centerY = Math.floor(size / 2);
    const game = {
      size,
      snake: Array.from({ length: 4 }, (_, index) => ({ x: headX - index, y: centerY })),
      direction: 'right',
      queue: [],
      food: null,
      score: 0,
      status: 'ready',
    };
    Object.defineProperty(game, '_random', { value: random });
    game.food = placeFood(game);
    return game;
  }

  function start(game) {
    if (game.status === 'ready') game.status = 'playing';
    return game;
  }

  function turn(game, direction) {
    if (game.status !== 'playing' || !Object.hasOwn(vectors, direction) || game.queue.length >= 2) return false;
    const previous = game.queue.length ? game.queue[game.queue.length - 1] : game.direction;
    const from = vectors[previous];
    const to = vectors[direction];
    if (previous === direction || (from.x + to.x === 0 && from.y + to.y === 0)) return false;
    game.queue.push(direction);
    return true;
  }

  function step(game) {
    const result = { ate: false, ended: false, won: false };
    if (game.status !== 'playing') return result;
    if (game.queue.length) game.direction = game.queue.shift();
    const vector = vectors[game.direction];
    const head = { x: game.snake[0].x + vector.x, y: game.snake[0].y + vector.y };
    const eating = game.food !== null && head.x === game.food.x && head.y === game.food.y;
    const bodyLength = game.snake.length - (eating ? 0 : 1);
    const hitsWall = head.x < 0 || head.y < 0 || head.x >= game.size || head.y >= game.size;
    const hitsBody = game.snake.slice(0, bodyLength).some(cell => cell.x === head.x && cell.y === head.y);
    if (hitsWall || hitsBody) {
      game.status = 'over';
      game.queue.length = 0;
      result.ended = true;
      return result;
    }
    game.snake.unshift(head);
    if (eating) {
      game.score += 10;
      game.food = placeFood(game);
      result.ate = true;
      if (game.food === null) {
        game.status = 'won';
        game.queue.length = 0;
        result.ended = true;
        result.won = true;
      }
    } else {
      game.snake.pop();
    }
    return result;
  }

  function pause(game) {
    if (game.status === 'playing') game.status = 'paused';
    else if (game.status === 'paused') game.status = 'playing';
    return game;
  }

  return Object.freeze({ createGame, start, turn, step, pause });
});
