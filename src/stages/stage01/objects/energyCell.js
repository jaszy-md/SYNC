export class EnergyCell {
  constructor(x, y) {
    Object.assign(this, { x, y, w: 24, h: 26, state: 'CAGED' });
  }
  draw(ctx) {
    if (['CAGED', 'LOOSE', 'CARRIED'].includes(this.state)) this.drawAt(ctx, this.x, this.y);
    if (this.state === 'CAGED') {
      ctx.strokeStyle = '#f379d0';
      ctx.lineWidth = 3;
      ctx.strokeRect(this.x - 15, this.y - 19, 54, 46);
      for (let x = this.x - 5; x < this.x + 39; x += 12) {
        ctx.beginPath();
        ctx.moveTo(x, this.y - 19);
        ctx.lineTo(x, this.y + 27);
        ctx.stroke();
      }
    }
  }
  drawAt(ctx, x, y) {
    ctx.fillStyle = '#ffdc79';
    ctx.fillRect(x, y, 24, 26);
    ctx.fillRect(x + 8, y - 4, 8, 4);
    ctx.fillStyle = '#40304c';
    ctx.beginPath();
    ctx.moveTo(x + 14, y + 3);
    ctx.lineTo(x + 6, y + 15);
    ctx.lineTo(x + 12, y + 15);
    ctx.lineTo(x + 10, y + 23);
    ctx.lineTo(x + 19, y + 10);
    ctx.lineTo(x + 13, y + 10);
    ctx.closePath();
    ctx.fill();
  }
}
