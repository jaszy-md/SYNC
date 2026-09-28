export class EnergySocket {
  constructor(x, y, width, height, label) {
    Object.assign(this, {
      x,
      y,
      w: width,
      h: height,
      label,
    });
  }

  draw(ctx, cell) {
    const occupied = cell.state === `SOCKET_${this.label === 'I' ? 'A' : 'B'}`;

    // Bepaalt de kleur op basis van de bezetting van de socket
    ctx.fillStyle = occupied ? '#324b66' : '#292b47';
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Tekent de rand van de energy socket
    ctx.strokeStyle = occupied ? '#64e4ff' : '#ffdc79';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.w, this.h);

    // Tekent de batterij in de socket wanneer deze bezet is
    if (occupied) {
      cell.drawAt(ctx, this.x + 10, this.y + 9);
    }

    // Toont het nummer van de socket
    ctx.fillStyle = '#ffdc79';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(this.label, this.x + 14, this.y - 12);
  }
}
