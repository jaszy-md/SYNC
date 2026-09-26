import { near } from '../../../core/physics/collision.js';
import { Hint } from '../../../entities/objects/hint.js';
import { Switch } from '../../../entities/objects/switch.js';

export class SymbolPuzzle {
  constructor(random) {
    const symbols = ['○', '△', '□'],
      first = Math.floor(random() * 3);
    this.code = [symbols[first], symbols[(first + 1 + Math.floor(random() * 2)) % 3]];
    this.symbolHint = new Hint(335, 398, this.code.join(' '));
    this.symbolHint.w = 78;
    this.symbolSwitches = symbols.map((symbol, i) => new Switch(245 + i * 65, 566, symbol));
    this.matchIndex = 0;
    this.ping = null;
  }
  interact(player, players) {
    if (near(player, this.symbolHint, 18)) {
      this.symbolHint.read(player);
      return 'HANDLED';
    }
    const target = this.symbolSwitches.find((s) => near(player, s, 14));
    if (target) {
      const reader = players.find((p) => p.abilities.readHint);
      if (
        !player.abilities.operateSwitch ||
        this.symbolHint.state !== 'READ' ||
        !near(reader, this.symbolHint, 25)
      )
        return 'HANDLED';
      if (target.activate(player, target.symbol === this.code[this.matchIndex]) === 'ON') {
        if (++this.matchIndex === this.code.length) {
          return 'COMPLETE';
        }
      } else {
        this.matchIndex = 0;
        this.symbolSwitches.forEach((s) => (s.state = 'OFF'));
        this.ping = { x: target.x + 12, y: target.y - 15 };
        return 'WRONG';
      }
      return 'HANDLED';
    }

    return null;
  }
  draw(ctx, players) {
    const reader = players.find((p) => p.abilities.readHint);
    this.symbolHint.draw(
      ctx,
      this.symbolHint.state === 'READ' && near(reader, this.symbolHint, 25),
    );
    this.symbolSwitches.forEach((s) => s.draw(ctx));
    ctx.fillStyle = '#b9afd1';
    ctx.font = '12px monospace';
    ctx.fillText(`${this.matchIndex}/2`, 320, 548);
  }
}
