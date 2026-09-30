// Short, forgiving cooperative restart. Releasing during HOLD resets only the hold.
export class RestartPuzzle {
  constructor() {
    this.reset();
  }
  reset() {
    this.state = 'OFF';
    this.timer = 0;
  }
  update(dt, inputs, pads, enabled) {
    if (!enabled || this.state === 'READY') return;
    if (this.state === 'OFF' && pads[0].active && inputs[0].interact) {
      this.state = 'WARMUP';
      this.timer = 0;
    } else if (this.state === 'WARMUP') {
      this.timer += dt;
      if (this.timer >= 1.2) this.state = 'GREEN';
    } else if (this.state === 'GREEN' && pads[0].active && inputs[0].interact) {
      this.state = 'CONFIRM';
    } else if (this.state === 'CONFIRM' && pads[1].active && inputs[1].interact) {
      this.state = 'READY';
    }
  }
  get instruction() {
    return {
      OFF: 'P1: START GENERATOR',
      WARMUP: 'WACHT OP GROEN…',
      GREEN: 'GROEN • P1: SCHAKEL',
      CONFIRM: 'P2: BEVESTIG',
      READY: 'BEIDEN: HOUD VAST',
    }[this.state];
  }
}
