import { near } from '../../core/physics/collision.js';

export class Hint {
  constructor(x, y, symbol) {
    Object.assign(this, { x, y, w: 40, h: 44, symbol, state: 'UNREAD' });
  }
  read(player) {
    if (player.abilities.readHint && near(player, this, 18)) {
      this.state = 'READ';
      return true;
    }
    return false;
  }
  draw(ctx, visible) {
    ctx.fillStyle = visible ? '#64e4ff' : '#ab8bff';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeStyle = '#ded6ff';
    ctx.strokeRect(this.x + 4, this.y + 4, this.w - 8, this.h - 8);
    ctx.fillStyle = '#152330';
    ctx.font = 'bold 25px system-ui';
    ctx.fillText(visible ? this.symbol : '?', this.x + 8, this.y + 31);
  }
}
