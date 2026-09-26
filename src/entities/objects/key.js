import { near } from '../../core/physics/collision.js';

export class Key {
  constructor(x, y) {
    Object.assign(this, { x, y, w: 28, h: 28, state: 'HIDDEN' });
  }
  reveal() {
    this.state = 'VISIBLE';
  }
  collect(player) {
    if (this.state === 'VISIBLE' && player.abilities.collectKey && near(player, this, 20)) {
      this.state = 'COLLECTED';
      return true;
    }
    return false;
  }
  draw(ctx) {
    if (this.state !== 'VISIBLE') return;
    ctx.strokeStyle = '#ffe58b';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(this.x + 9, this.y + 10, 7, 0, Math.PI * 2);
    ctx.moveTo(this.x + 16, this.y + 10);
    ctx.lineTo(this.x + 30, this.y + 10);
    ctx.lineTo(this.x + 30, this.y + 19);
    ctx.stroke();
  }
}
