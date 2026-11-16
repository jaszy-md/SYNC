import { stage01Config } from '../stage01Config.js';
import { drawControlHints } from '../../../ui/controlHints.js';

export function getStage01ControlHints(stage, bindings) {
  if (stage.complete || stage.exitAnimation) return [];
  return stage.players.flatMap((player) => {
    const binding = bindings[player.id];
    if (!binding) return [];
    const targets = [];
    const target = stage.interact(player, true);
    if (
      target &&
      typeof target === 'object' &&
      (target !== stage.hintDevice || stage.hintRequested)
    )
      targets.push(target);
    if (stage.canOperateWinch(player)) targets.push(stage.winch);
    if (stage.phase === 'CHARGE')
      targets.push(...stage.chargePads.filter((pad) => pad.isPressedBy(player)));
    if (stage.canExit() && stage.door.canOpen(stage.players)) targets.push(stage.door);
    return [...new Set(targets)].map((object) => ({ player, object, binding }));
  });
}

export function drawStage01ControlHints(ctx, stage, bindings) {
  drawControlHints(
    ctx,
    stage,
    getStage01ControlHints(stage, bindings),
    (object) => {
      const visuals = stage01Config.interactionVisuals;
      const access =
        object === stage.symbolPuzzle.clue || stage.symbolPuzzle.symbolBlocks.includes(object);
      return access
        ? Math.min(
            object.y,
            object.y +
              object.h -
              (object.w > 50 ? visuals.terminalSize : visuals.robotSize) *
                visuals.spriteHeightRatio,
          )
        : object.y - (stage.chargePads.includes(object) ? visuals.chargeHintHeight : 0);
    },
    stage01Config.interactionHintOffsetY,
  );
}
