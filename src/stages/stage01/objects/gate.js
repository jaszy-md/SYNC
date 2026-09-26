import { Platform } from '../../../entities/objects/platform.js';

export class Gate extends Platform {
  constructor(x, y, w, h, label) {
    super(x, y, w, h, '#673554');
    this.label = label;
  }
  draw(ctx, layer = 'all') {
    if (layer !== 'details') super.draw(ctx);
    if (layer === 'base') return;
    ctx.strokeStyle = this.active ? '#f379d0' : '#64e4ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.w, this.h);
    if (this.active) {
      ctx.fillStyle = '#f379d0';
      for (let y = this.y + 12; y < this.y + this.h; y += 22) ctx.fillRect(this.x + 6, y, 10, 6);
    }
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = 'bold 17px monospace';
    ctx.fillText(this.label, this.x + 6, this.y - 12);
  }
}
