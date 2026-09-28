import { near } from '../../../../core/physics/collision.js';
import { symbolPuzzleConfig } from './symbolPuzzleConfig.js';

export function drawSymbolPuzzle(ctx, puzzle, players) {
  const reader = players.find((player) => player.abilities.readHint);

  // Toont de geheime code alleen zolang de lezer bij de clue staat
  const clueVisible =
    puzzle.clue.state === 'READ' && reader !== undefined && near(reader, puzzle.clue, 25);

  puzzle.clue.draw(ctx, clueVisible);

  // Tekent de drie symboolblokken
  puzzle.symbolBlocks.forEach((symbolBlock) => symbolBlock.draw(ctx));

  // Tekent de voortgang van de ingevoerde symboolcode
  ctx.fillStyle = '#b9afd1';
  ctx.font = '12px monospace';
  ctx.fillText(
    `${puzzle.matchIndex}/${puzzle.code.length}`,
    symbolPuzzleConfig.progress.x,
    symbolPuzzleConfig.progress.y,
  );
}
