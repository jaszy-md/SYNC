import { near } from '../../../../core/physics/collision.js';

export class SymbolPuzzleBlock {
  constructor(x, y, symbol, width, height) {
    Object.assign(this, {
      x,
      y,
      w: width,
      h: height,
      symbol,
      state: 'OFF',
    });
  }

  activate(player, enabled) {
    if (!near(player, this, 22) || !player.abilities.operateSwitch) {
      return 'DENIED';
    }

    this.state = enabled ? 'ON' : 'OFF';
    return enabled ? 'ON' : 'WRONG';
  }

  draw(ctx) {
    // Bepaalt de kleur op basis van de status van het symboolblok
    ctx.fillStyle = this.state === 'ON' ? '#64e4ff' : '#ffdc79';
    ctx.fillRect(this.x, this.y, this.w, this.h);

    // Tekent het symbool in het midden van het blok
    ctx.fillStyle = '#152330';
    ctx.font = 'bold 24px system-ui';
    ctx.fillText(this.symbol, this.x + 10, this.y + 25);

    // Toont onderaan een eenvoudige statusindicator
    ctx.fillStyle = this.state === 'ON' ? '#fff' : '#846650';
    ctx.fillRect(this.x + 4, this.y + this.h - 4, this.w - 8, 3);
  }
}
