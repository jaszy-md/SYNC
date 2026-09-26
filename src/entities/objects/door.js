import { near } from '../../core/physics/collision.js';

export class Door {
  constructor(x, y, w, h) {
    Object.assign(this, { x, y, w, h, state: 'LOCKED' });
  }
  unlock() {
    if (this.state === 'LOCKED') this.state = 'UNLOCKED';
  }
  open(players, inputs) {
    if (
      this.state !== 'LOCKED' &&
      players.every((p, i) => near(p, this, 40) && inputs[i].interactHeld)
    ) {
      this.state = 'OPEN';
      return true;
    }
    return false;
  }
  draw(ctx) {
    ctx.fillStyle = this.state === 'LOCKED' ? '#533251' : '#355376';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeStyle = this.state === 'LOCKED' ? '#f379d0' : '#64e4ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x + 8, this.y + 8, this.w - 16, this.h - 8);
    ctx.fillStyle = '#e7ddfc';
    ctx.font = '12px system-ui';
    ctx.fillText(this.state, this.x - 8, this.y - 14);
  }
}
