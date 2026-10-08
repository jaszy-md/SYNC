import { Trigger } from './trigger.js';

export class PressurePlate extends Trigger {
  constructor(x, y, w = 64) {
    super(x, y, w, 8);
    this.active = false;
  }
  update(players) {
    this.active = players.some((player) => this.isPressedBy(player));
    return this.active;
  }
  isPressedBy(player) {
    return (
      player.grounded &&
      player.x + player.w > this.x &&
      player.x < this.x + this.w &&
      Math.abs(player.y + player.h - (this.y + this.h)) < 4
    );
  }
  draw(ctx) {
    ctx.fillStyle = this.active ? '#64e4ff' : '#ab8bff';
    ctx.fillRect(this.x, this.y + (this.active ? 4 : 0), this.w, this.active ? 4 : 8);
    ctx.strokeStyle = '#64e4ff';
    ctx.strokeRect(this.x, this.y - 4, this.w, 12);
  }
}
