import { stage01Config } from '../stage01Config.js';

// Only rendering state lives here; all availability checks use the stage's existing guards.
const animations = new WeakMap();

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
    // Once the cell is delivered the gate stays open without operating the winch.
    if (stage.phase === 'TRANSFER' && stage.canOperateWinch(player)) targets.push(stage.winch);
    if (stage.phase === 'CHARGE')
      targets.push(...stage.chargePads.filter((pad) => pad.isPressedBy(player)));
    if (stage.canExit() && stage.door.canOpen(stage.players)) targets.push(stage.door);
    return [...new Set(targets)].map((object) => ({ player, object, binding }));
  });
}

export function drawStage01ControlHints(ctx, stage, bindings) {
  let animation = animations.get(stage);
  if (!animation) {
    animation = { time: stage.time, entries: [] };
    animations.set(stage, animation);
  }
  const elapsed = Math.max(0, Math.min(0.05, stage.time - animation.time));
  animation.time = stage.time;
  animation.entries.forEach((entry) => (entry.visible = false));
  for (const hint of getStage01ControlHints(stage, bindings)) {
    let entry = animation.entries.find(
      (item) => item.object === hint.object && item.player === hint.player,
    );
    if (!entry) {
      entry = { ...hint, opacity: 0 };
      animation.entries.push(entry);
    }
    entry.binding = hint.binding;
    entry.visible = true;
  }
  for (const entry of animation.entries) {
    entry.opacity = Math.max(
      0,
      Math.min(1, entry.opacity + elapsed / (entry.visible ? 0.14 : -0.12)),
    );
  }
  animation.entries = animation.entries.filter((entry) => entry.visible || entry.opacity > 0);
  const reducedMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  ctx.save();
  ctx.font = '600 12px system-ui';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const width = (entry) =>
    entry.binding.kind === 'controller'
      ? 26
      : Math.max(28, ctx.measureText(entry.binding.label).width + 16);
  for (const entry of animation.entries) {
    const { object, player, binding, opacity } = entry;
    if (!opacity) continue;
    const group = animation.entries
      .filter((item) => item.object === object)
      .sort((a, b) => a.player.id - b.player.id);
    const totalWidth = group.reduce((sum, item) => sum + width(item), 0) + (group.length - 1) * 8;
    const preceding = group
      .slice(0, group.indexOf(entry))
      .reduce((sum, item) => sum + width(item) + 8, 0);
    const w = width(entry);
    const center = Math.max(
      totalWidth / 2 + 4,
      Math.min(ctx.canvas.width - totalWidth / 2 - 4, object.x + object.w / 2),
    );
    const x = center - totalWidth / 2 + preceding + w / 2;
    const visuals = stage01Config.interactionVisuals;
    const access =
      object === stage.symbolPuzzle.clue || stage.symbolPuzzle.symbolBlocks.includes(object);
    const top = access
      ? Math.min(
          object.y,
          object.y +
            object.h -
            (object.w > 50 ? visuals.terminalSize : visuals.robotSize) * visuals.spriteHeightRatio,
        )
      : object.y - (stage.chargePads.includes(object) ? visuals.chargeHintHeight : 0);
    const floating = reducedMotion ? 0 : Math.sin(stage.time * 2.4) * 2;
    const y = Math.max(16, top - stage01Config.interactionHintOffsetY + floating);
    const fade = opacity * opacity * (3 - 2 * opacity);
    const pulse = reducedMotion ? 1 : 1 + 0.025 * (1 - Math.cos((stage.time * Math.PI * 2) / 3));
    const scale = (reducedMotion ? 1 : 0.94 + 0.06 * fade) * pulse;
    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#11172cf5';
    ctx.strokeStyle = player.id === 0 ? '#64e4ffb3' : '#ab8bffb3';
    ctx.lineWidth = 1;
    ctx.shadowColor = '#64e4ff80';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    if (binding.kind === 'controller') ctx.arc(0, 0, 13, 0, Math.PI * 2);
    else ctx.roundRect(-w / 2, -13, w, 26, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.stroke();
    ctx.fillStyle = '#f0f2ff';
    ctx.fillText(binding.label, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}
