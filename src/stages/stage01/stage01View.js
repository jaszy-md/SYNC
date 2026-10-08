import { drawFacilityBackground, drawFacilityStructure } from './facilityView.js';
import { drawStage01ControlHints } from './hints/controlHints.js';
import { drawPowerNetwork, drawPortalGate } from './powerNetworkView.js';
import { drawEnergyPuzzle } from './puzzles/energyPuzzle/energyPuzzleView.js';
import { stage01Config } from './stage01Config.js';

function drawWorldObjects(ctx, stage) {
  drawFacilityStructure(ctx, stage);
  stage.symbolPuzzle.draw(ctx, stage.players);
  stage.key.draw(ctx);
  stage.hintDevice.draw(ctx, stage.progress, stage.time);
}

function drawPlayersAndItems(ctx, stage) {
  drawPortalGate(ctx, stage);
  stage.players.forEach((player) => {
    ctx.save();
    if (stage.health[player.id].invulnerable > 0 && Math.floor(stage.time * 12) % 2)
      ctx.globalAlpha = 0.4;
    ctx.globalAlpha *= stage.opening?.playerOpacity ?? 1;
    if (stage.exitAnimation) {
      const t = stage.exitAnimation.elapsed / stage01Config.exitAnimation.duration;
      const progress = t * t * (3 - 2 * t);
      const start = stage.exitAnimation.starts[player.id];
      const center = { x: stage.door.x + stage.door.w / 2, y: stage.door.y + stage.door.h / 2 };
      ctx.globalAlpha *= 1 - progress;
      ctx.translate(
        start.x + (center.x - start.x) * progress,
        start.y + (center.y - start.y) * progress,
      );
      ctx.scale(1 - progress * 0.85, 1 - progress * 0.85);
      ctx.translate(-start.x, -start.y);
    } else if (player.damageFlashUntil > stage.time && Math.floor(stage.time * 20) % 2 === 0) {
      ctx.filter = 'sepia(1) saturate(8) hue-rotate(320deg)';
    }
    player.draw(ctx);
    ctx.restore();
  });
  stage.players
    .filter((player) => player.facilityStun > 0)
    .forEach((player) => {
      ctx.strokeStyle = '#e0b567';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(player.x + 14, player.y - 7, 17, 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
  stage.cell.draw(ctx);

  if (stage.keyCarrier !== null && stage.door.state === 'LOCKED') {
    const carrier = stage.players[stage.keyCarrier];

    ctx.fillStyle = '#ffdc79';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('⚿', carrier.x + 3, carrier.y - 30);
  }
}

function drawAffordances(ctx, stage) {
  if (stage.ping && stage.ping.until > stage.time) {
    ctx.fillStyle = '#f379d0';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('×', stage.ping.x, stage.ping.y);
  }
}

export function drawStage1(ctx, stage, debug = false, bindings = []) {
  drawFacilityBackground(ctx, stage.time);
  drawPowerNetwork(ctx, stage);
  drawWorldObjects(ctx, stage);

  // Tekent de gezamenlijke onderdelen van de energypuzzel
  drawEnergyPuzzle(ctx, stage);

  if (stage.guardsEnabled) stage.guards.forEach((guard) => guard.draw(ctx));
  drawPlayersAndItems(ctx, stage);
  drawAffordances(ctx, stage);
  stage.blaster.draw(ctx);

  drawStage01ControlHints(ctx, stage, bindings);

  drawHealth(ctx, stage);
  stage.opening?.draw(ctx, stage.players);

  if (debug) {
    ctx.strokeStyle = '#ff7493';

    [
      ...stage.solids,
      ...stage.players,
      stage.plate,
      stage.winch,
      stage.socketA,
      stage.socketB,
      ...stage.chargePads,
    ].forEach((rect) => {
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    });
  }
}

function drawHealth(ctx, stage) {
  ctx.save();
  stage.health.forEach((health, index) => {
    const x = 18 + index * 170;
    ctx.fillStyle = '#0b1725e6';
    ctx.fillRect(x, 14, 154, 30);
    ctx.font = 'bold 12px monospace';
    for (let pip = 0; pip < health.max; pip++) {
      ctx.fillStyle =
        pip < health.value ? (health.invulnerable > 0 ? '#ffbe79' : '#a9dfd5') : '#33434e';
      ctx.fillRect(x + 36 + pip * 27, 22, 22, 14);
    }
  });
  ctx.restore();
}
