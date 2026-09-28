import { near } from '../../../../core/physics/collision.js';
import { SymbolClue } from './symbolClue.js';
import { symbolPuzzleConfig } from './symbolPuzzleConfig.js';
import { SymbolPuzzleBlock } from './symbolPuzzleBlock.js';
import { drawSymbolPuzzle } from './symbolPuzzleView.js';

export class SymbolPuzzle {
  constructor(random) {
    const symbols = ['○', '△', '□'];
    const firstSymbolIndex = Math.floor(random() * symbols.length);
    const secondSymbolOffset = 1 + Math.floor(random() * 2);

    // Bepaalt de willekeurige code die spelers moeten invoeren
    this.code = [
      symbols[firstSymbolIndex],
      symbols[(firstSymbolIndex + secondSymbolOffset) % symbols.length],
    ];

    // Maakt de clue aan op basis van de configuratie
    this.clue = new SymbolClue(
      symbolPuzzleConfig.clue.x,
      symbolPuzzleConfig.clue.y,
      this.code.join(' '),
      symbolPuzzleConfig.clue.width,
      symbolPuzzleConfig.clue.height,
    );

    // Maakt de drie symboolblokken aan met vaste onderlinge afstand
    this.symbolBlocks = symbols.map(
      (symbol, index) =>
        new SymbolPuzzleBlock(
          symbolPuzzleConfig.symbolBlocks.startX + index * symbolPuzzleConfig.symbolBlocks.spacing,
          symbolPuzzleConfig.symbolBlocks.y,
          symbol,
          symbolPuzzleConfig.symbolBlocks.width,
          symbolPuzzleConfig.symbolBlocks.height,
        ),
    );

    this.matchIndex = 0;
    this.ping = null;
  }

  interact(player, players, preview = false) {
    if (near(player, this.clue, 18)) {
      if (preview) {
        return this.clue.state === 'UNREAD' && this.clue.canRead(player) ? this.clue : 'HANDLED';
      }

      this.clue.read(player);
      return 'HANDLED';
    }

    const targetBlock = this.symbolBlocks.find((symbolBlock) => near(player, symbolBlock, 14));

    if (!targetBlock) return null;

    const reader = players.find((candidate) => candidate.abilities.readHint);

    // Blokkeert bediening zolang de clue niet correct wordt gelezen
    if (
      !player.abilities.operateSwitch ||
      this.clue.state !== 'READ' ||
      !reader ||
      !near(reader, this.clue, 25)
    ) {
      return 'HANDLED';
    }

    if (preview) return targetBlock;

    const expectedSymbol = this.code[this.matchIndex];

    const activationResult = targetBlock.activate(player, targetBlock.symbol === expectedSymbol);

    if (activationResult === 'ON') {
      this.matchIndex += 1;

      if (this.matchIndex === this.code.length) {
        return 'COMPLETE';
      }

      return 'HANDLED';
    }

    // Reset de puzzel na een verkeerde symboolkeuze
    this.matchIndex = 0;

    this.symbolBlocks.forEach((symbolBlock) => {
      symbolBlock.state = 'OFF';
    });

    this.ping = {
      x: targetBlock.x + 12,
      y: targetBlock.y - 15,
    };

    return 'WRONG';
  }

  draw(ctx, players) {
    drawSymbolPuzzle(ctx, this, players);
  }
}
