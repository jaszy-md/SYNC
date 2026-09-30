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

  get cage() {
    return { x: this.x - 15, y: this.y - 19, w: 54, h: 46 };
  }

  draw(ctx) {
    if (['CAGED', 'LOOSE', 'CARRIED'].includes(this.state)) {
      this.drawAt(ctx, this.x, this.y);
    }

    if (this.state === 'CAGED') {
      ctx.strokeStyle = '#927c59';
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
    ctx.save();
    ctx.shadowColor = '#ffe3a1';
    ctx.shadowBlur = 13;
    ctx.strokeStyle = '#fff1b9';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, this.w + 2, this.h + 2);
    ctx.shadowBlur = 0;
    // Tekent de batterij op basis van de ingestelde afmetingen
    ctx.fillStyle = '#b1a77c';
    ctx.fillRect(x, y, this.w, this.h);

    ctx.strokeStyle = '#5b695e';
    ctx.strokeRect(x + 2, y + 2, this.w - 4, this.h - 4);
    ctx.fillStyle = '#86d3a0';
    ctx.fillRect(x + 3, y + 5, 3, this.h - 10);

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
    ctx.restore();
  }
}
