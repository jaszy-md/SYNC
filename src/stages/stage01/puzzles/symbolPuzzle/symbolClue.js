import { near } from '../../../../core/physics/collision.js';

export class SymbolClue {
  constructor(x, y, symbol, width = 40, height = 44) {
    Object.assign(this, {
      x,
      y,
      w: width,
      h: height,
      symbol,
      state: 'UNREAD',
    });
  }

  canRead(player) {
    return player.abilities.readHint && near(player, this, 18);
  }

  read(player) {
    if (!this.canRead(player)) return false;

    this.state = 'READ';
    return true;
  }

  draw(ctx, visible) {
    // Bepaalt de kleur op basis van de zichtbaarheid van de clue
    ctx.fillStyle = visible ? '#64e4ff' : '#ab8bff';
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Tekent de binnenrand van de clue
    ctx.strokeStyle = '#ded6ff';
    ctx.strokeRect(this.x + 4, this.y + 4, this.w - 8, this.h - 8);

    // Toont de code alleen wanneer de clue zichtbaar mag zijn
    ctx.fillStyle = '#152330';
    ctx.font = 'bold 25px system-ui';
    ctx.fillText(visible ? this.symbol : '?', this.x + 8, this.y + 31);
  }
}
