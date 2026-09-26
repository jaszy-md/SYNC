export class Platform {
  constructor(x, y, w, h, color = '#425570') {
    Object.assign(this, { x, y, w, h, color, active: true });
  }
  draw(ctx) {
    if (this.active) {
      ctx.fillStyle = this.color;
      ctx.fillRect(this.x, this.y, this.w, this.h);
      ctx.fillStyle = '#aaa9d6';
      ctx.fillRect(this.x, this.y, this.w, 3);
      ctx.fillStyle = '#080d2444';
      ctx.fillRect(this.x, this.y + this.h - 5, this.w, 5);
    }
  }
}
