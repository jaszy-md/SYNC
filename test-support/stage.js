import { Stage1 } from '../src/stages/stage01/stage01.js';
import { CHARACTERS } from '../src/entities/player/characters.js';
import { energyPuzzleConfig } from '../src/stages/stage01/puzzles/energyPuzzle/energyPuzzleConfig.js';

export const idle = () => ({
  move: 0,
  jump: false,
  crouch: false,
  interact: false,
  interactHeld: false,
});
export const makeStage = () => new Stage1(CHARACTERS.slice(0, 2), () => 0.6);
export const placeAt = (player, object) =>
  Object.assign(player, {
    x: object.x,
    y: object.y + object.h - player.h,
    vx: 0,
    vy: 0,
    grounded: true,
  });
export const moveAway = (player, object) =>
  Object.assign(player, {
    x: object.x + object.w + player.w * 10,
    y: object.y - player.h * 10,
  });
export function solveSymbols(stage) {
  const [explorer, tech] = stage.players;
  placeAt(explorer, stage.symbolPuzzle.clue);
  stage.interact(explorer);
  for (const symbol of stage.symbolPuzzle.code) {
    placeAt(
      tech,
      stage.symbolPuzzle.symbolBlocks.find((block) => block.symbol === symbol),
    );
    stage.interact(tech);
  }
}
export function dockFirst(stage) {
  solveSymbols(stage);
  const tech = stage.players[1];
  placeAt(tech, stage.cell);
  stage.interact(tech);
  placeAt(tech, stage.socketA);
  stage.interact(tech);
  stage.updateRoutes([idle(), idle()]);
}
export function dockFinal(stage) {
  dockFirst(stage);
  const tech = stage.players[1];
  stage.interact(tech);
  placeAt(tech, stage.socketB);
  stage.interact(tech);
}
export function charge(stage) {
  dockFinal(stage);
  stage.players.forEach((player, i) => placeAt(player, stage.chargePads[i]));
  stage.energyPuzzle.updateCharging(energyPuzzleConfig.chargeDuration, [
    { interactHeld: true },
    { interactHeld: true },
  ]);
  stage.updateRoutes([idle(), idle()]);
}
export function collectKey(stage) {
  charge(stage);
  placeAt(stage.players[0], stage.key);
  stage.interact(stage.players[0]);
}
