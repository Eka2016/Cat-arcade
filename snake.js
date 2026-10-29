/** Pure game rules: no SillyTavern, network, DOM, or timer dependencies. */
export const DIRECTIONS = Object.freeze({
  up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 },
});

export const SPEEDS = Object.freeze({ calm: 180, normal: 130, fast: 90 });

export class Snake {
  constructor({ size = 20, random = Math.random } = {}) {
    if (!Number.isInteger(size) || size < 5 || size > 60) throw new RangeError('Invalid board size');
    this.size = size;
    this.random = random;
    this.reset();
  }

  reset() {
    const mid = Math.floor(this.size / 2);
    this.body = [{ x: mid, y: mid }, { x: mid - 1, y: mid }, { x: mid - 2, y: mid }];
    this.direction = 'right';
    this.turns = [];
    this.score = 0;
    this.status = 'ready';
    this.reason = '';
    this.food = this.placeFood();
  }

  placeFood() {
    const occupied = new Set(this.body.map(p => `${p.x},${p.y}`));
    const free = [];
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
      }
    }
    if (!free.length) return null;
    const sample = Number(this.random());
    const index = Math.min(free.length - 1, Math.max(0, Math.floor((Number.isFinite(sample) ? sample : 0) * free.length)));
    return free[index];
  }

  turn(next) {
    if (!Object.hasOwn(DIRECTIONS, next) || !['ready', 'running', 'paused'].includes(this.status)) return false;
    if (this.turns.length >= 2) return false;
    const previous = DIRECTIONS[this.turns.at(-1) || this.direction];
    const direction = DIRECTIONS[next];
    if ((previous.x === direction.x && previous.y === direction.y)
      || (previous.x + direction.x === 0 && previous.y + direction.y === 0)) return false;
    this.turns.push(next);
    return true;
  }

  start() {
    if (this.status === 'ready' || this.status === 'paused') this.status = 'running';
  }

  pause() {
    if (this.status === 'running') this.status = 'paused';
  }

  tick() {
    if (this.status !== 'running') return { moved: false, ate: false };
    this.direction = this.turns.shift() || this.direction;
    const vector = DIRECTIONS[this.direction];
    // The board wraps on both axes: crossing any edge enters the opposite side.
    const head = {
      x: (this.body[0].x + vector.x + this.size) % this.size,
      y: (this.body[0].y + vector.y + this.size) % this.size,
    };
    const ate = !!this.food && head.x === this.food.x && head.y === this.food.y;
    // On a normal move, the last segment vacates its cell simultaneously.
    const occupied = ate ? this.body : this.body.slice(0, -1);
    if (occupied.some(p => p.x === head.x && p.y === head.y)) {
      this.status = 'over'; this.reason = 'self';
      return { moved: false, ate: false };
    }
    this.body.unshift(head);
    if (ate) {
      this.score++;
      this.food = this.placeFood();
      if (!this.food) this.status = 'won';
    } else this.body.pop();
    return { moved: true, ate };
  }

  interval(speed = 'normal') {
    return Math.max(65, (SPEEDS[speed] || SPEEDS.normal) - Math.floor(this.score / 5) * 6);
  }
}
