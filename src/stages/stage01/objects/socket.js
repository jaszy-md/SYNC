export class Socket {
  constructor(x, y, label) {
    Object.assign(this, { x, y, w: 44, h: 39, label });
  }
  draw(ctx, cell) {
    const occupied = cell.state === `SOCKET_${this.label === 'I' ? 'A' : 'B'}`;
    ctx.fillStyle = occupied ? '#324b66' : '#292b47';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    ctx.strokeStyle = occupied ? '#64e4ff' : '#ffdc79';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.w, this.h);
    if (occupied) cell.drawAt(ctx, this.x + 10, this.y + 9);
    ctx.fillStyle = '#ffdc79';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(this.label, this.x + 14, this.y - 12);
  }
}
