export class EnergyCell {
  constructor(x, y, width, height) {
    Object.assign(this, {
      x,
      y,
      w: width,
      h: height,
      state: 'CAGED',
    });
  }

  draw(ctx) {
    if (['CAGED', 'LOOSE', 'CARRIED'].includes(this.state)) {
      this.drawAt(ctx, this.x, this.y);
    }

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
    // Tekent de batterij op basis van de ingestelde afmetingen
    ctx.fillStyle = '#ffdc79';
    ctx.fillRect(x, y, this.w, this.h);

    // Tekent het contactpunt boven op de batterij
    const terminalWidth = Math.max(6, Math.round(this.w / 3));
    const terminalHeight = 4;
    ctx.fillRect(
      x + (this.w - terminalWidth) / 2,
      y - terminalHeight,
      terminalWidth,
      terminalHeight,
    );

    // Tekent het bliksemsymbool relatief binnen de batterij
    ctx.fillStyle = '#40304c';

    const scaleX = this.w / 24;
    const scaleY = this.h / 26;

    ctx.beginPath();
    ctx.moveTo(x + 14 * scaleX, y + 3 * scaleY);
    ctx.lineTo(x + 6 * scaleX, y + 15 * scaleY);
    ctx.lineTo(x + 12 * scaleX, y + 15 * scaleY);
    ctx.lineTo(x + 10 * scaleX, y + 23 * scaleY);
    ctx.lineTo(x + 19 * scaleX, y + 10 * scaleY);
    ctx.lineTo(x + 13 * scaleX, y + 10 * scaleY);
    ctx.closePath();
    ctx.fill();
  }
}
