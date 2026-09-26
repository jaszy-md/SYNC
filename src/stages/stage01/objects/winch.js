export class Winch {
  constructor(x, y) {
    Object.assign(this, { x, y, w: 40, h: 42, active: false });
  }
  draw(ctx, time) {
    const x = this.x + this.w / 2,
      y = this.y + this.h / 2 - 1;
    ctx.strokeStyle = this.active ? '#64e4ff' : '#ab8bff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, 17, 0, Math.PI * 2);
    ctx.stroke();
    const angle = this.active ? time * 4 : 0;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angle) * 15, y - Math.sin(angle) * 15);
    ctx.lineTo(x + Math.cos(angle) * 15, y + Math.sin(angle) * 15);
    ctx.stroke();
  }
}
