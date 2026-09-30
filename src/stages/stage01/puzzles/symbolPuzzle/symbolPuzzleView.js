import { machine } from '../../facilityView.js';
import { near } from '../../../../core/physics/collision.js';
import { symbolPuzzleConfig } from './symbolPuzzleConfig.js';

export function drawSymbolPuzzle(ctx, puzzle, players) {
  const reader = players.find((player) => player.abilities.readHint);

  // Toont de geheime code alleen zolang de lezer bij de clue staat
  const clueVisible =
    puzzle.clue.state === 'READ' && reader !== undefined && near(reader, puzzle.clue, 25);

  machine(ctx, puzzle.clue, 'ACCESS ARCHIVE / P1', clueVisible ? 'ONLINE' : 'PARTIAL');
  ctx.fillStyle = '#9cd6ae';
  ctx.font = 'bold 23px monospace';
  ctx.fillText(clueVisible ? puzzle.clue.symbol : '···', puzzle.clue.x + 9, puzzle.clue.y + 29);

  // Tekent de drie symboolblokken
  puzzle.symbolBlocks.forEach((block) => {
    machine(ctx, block, 'ACCESS', block.state === 'ON' ? 'ONLINE' : 'OFF');
    ctx.fillStyle = block.state === 'ON' ? '#87d4a2' : '#c2b791';
    ctx.font = 'bold 21px monospace';
    ctx.fillText(block.symbol, block.x + 12, block.y + 24);
  });

  // Tekent de voortgang van de ingevoerde symboolcode
  ctx.fillStyle = '#b9afd1';
  ctx.font = '12px monospace';
  ctx.fillText(
    `${puzzle.matchIndex}/${puzzle.code.length}`,
    symbolPuzzleConfig.progress.x,
    symbolPuzzleConfig.progress.y,
  );
}
