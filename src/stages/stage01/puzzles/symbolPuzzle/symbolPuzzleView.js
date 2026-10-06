import { stage01Config } from '../../stage01Config.js';
import { machine } from '../../facilityView.js';
import { near } from '../../../../core/physics/collision.js';
import { symbolPuzzleConfig } from './symbolPuzzleConfig.js';
import { stage01Image, drawStage01Image } from '../../stage01Assets.js';

function drawTerminal(ctx, rect, symbol, active) {
  const isScreen = rect.w > 50;
  const image = stage01Image(isScreen ? 'symbol_screen' : 'symbol_robot');
  ctx.save();
  if (active) {
    ctx.shadowColor = '#64e4ff';
    ctx.shadowBlur = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      ? 12
      : 12 + Math.sin(performance.now() / 450) * 3;
  }
  if (image) {
    const size = isScreen
      ? stage01Config.interactionVisuals.terminalSize
      : stage01Config.interactionVisuals.robotSize;
    const frame = {
      x: rect.x + rect.w / 2 - size / 2,
      y: rect.y + rect.h - size * stage01Config.interactionVisuals.spriteHeightRatio,
      w: size,
      h: size,
    };
    drawStage01Image(ctx, image, frame);
    // Source coordinates: screen display center 50% / 32%; robot chest 49% / 50%.
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${isScreen ? 20 : 18}px monospace`;
    ctx.fillStyle = active ? '#baffed' : '#ffe0a5';
    ctx.shadowColor = '#08161a';
    ctx.shadowBlur = 3;
    const scale = Math.min(frame.w / image.naturalWidth, frame.h / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.fillText(
      symbol,
      frame.x + (size - width) / 2 + width * (isScreen ? 0.5 : 0.49),
      frame.y + (size - height) / 2 + height * (isScreen ? 0.32 : 0.5),
      width * (isScreen ? 0.44 : 0.21),
    );
  } else {
    machine(ctx, rect, '', active ? 'ONLINE' : 'OFF');
    ctx.fillStyle = active ? '#87d4a2' : '#c2b791';
    ctx.font = 'bold 21px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(symbol, rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
  ctx.restore();
}

export function drawSymbolPuzzle(ctx, puzzle, players) {
  const reader = players.find((player) => player.abilities.readHint);

  // Toont de geheime code alleen zolang de lezer bij de clue staat
  const clueVisible =
    puzzle.clue.state === 'READ' && reader !== undefined && near(reader, puzzle.clue, 25);

  drawTerminal(
    ctx,
    puzzle.clue,
    clueVisible ? puzzle.clue.symbol : '···',
    clueVisible || (reader !== undefined && puzzle.clue.canRead(reader)),
  );

  // Tekent de drie symboolblokken
  puzzle.symbolBlocks.forEach((block) => {
    drawTerminal(
      ctx,
      block,
      block.symbol,
      block.state === 'ON' ||
        (puzzle.clue.state === 'READ' &&
          reader &&
          near(reader, puzzle.clue, 25) &&
          players.some((player) => player.abilities.operateSwitch && near(player, block, 14))),
    );
  });

  // Tekent de voortgang van de ingevoerde symboolcode
  for (let i = 0; i < puzzle.code.length; i++) {
    const x = symbolPuzzleConfig.progress.x + i * 12;
    const y = symbolPuzzleConfig.progress.y - 7;
    ctx.fillStyle = '#19292b';
    ctx.fillRect(x, y, 8, 6);
    ctx.fillStyle = i < puzzle.matchIndex ? '#9af1ce' : '#536368';
    ctx.fillRect(x + 1, y + 1, 6, 4);
  }
}
