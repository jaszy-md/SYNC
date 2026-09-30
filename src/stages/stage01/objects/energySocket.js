import { machine } from '../facilityView.js';
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

    machine(
      ctx,
      this,
      this.label === 'I' ? 'CORE / LIFT' : 'CORE / REACTOR',
      occupied ? 'ONLINE' : 'OFF',
    );

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
