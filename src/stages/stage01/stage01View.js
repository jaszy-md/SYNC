import { stage01Config } from './stage01Config.js';
import { drawStage01ControlHints } from './hints/controlHints.js';
import { drawEnergyPuzzle } from './puzzles/energyPuzzle/energyPuzzleView.js';

function drawBackground(ctx) {
  ctx.clearRect(0, 0, stage01Config.width, stage01Config.height);
  ctx.fillStyle = '#10162c';
  ctx.fillRect(0, 0, stage01Config.width, stage01Config.height);

  ctx.fillStyle = '#292841';
  for (let x = 20; x < stage01Config.width; x += 40) {
    for (let y = 80; y < 600; y += 40) {
      ctx.fillRect(x, y, 2, 2);
    }
  }
}

function drawConnections(ctx, stage) {
  const powered = stage.cell.state === 'SOCKET_A';

  ctx.lineWidth = 3;
  ctx.setLineDash([6, 8]);

  const wire = (points, active) => {
    ctx.strokeStyle = active ? '#64e4ff' : '#493e62';
    ctx.beginPath();

    points.forEach(([x, y], index) => {
      if (index) ctx.lineTo(x, y);
      else ctx.moveTo(x, y);
    });

    ctx.stroke();
  };

  wire(
    [
      [312, 450],
      [312, 493],
      [450, 493],
    ],
    !stage.gateA.active,
  );

  wire(
    [
      [572, 568],
      [572, 390],
      [535, 390],
      [535, 370],
    ],
    powered,
  );

  wire(
    [
      [760, 305],
      [760, 330],
      [881, 330],
      [881, 355],
    ],
    !stage.gateB.active,
  );

  wire(
    [
      [992, 580],
      [1068, 580],
      [1068, 480],
      [1165, 480],
      [1165, 510],
    ],
    ['CHARGE', 'KEY', 'EXIT'].includes(stage.phase),
  );

  ctx.setLineDash([]);
}

function drawWorldObjects(ctx, stage) {
  stage.platforms.forEach((platform) => platform.draw(ctx, 'base'));
  stage.symbolPuzzle.draw(ctx, stage.players);
  stage.key.draw(ctx);
}

function drawPlayersAndItems(ctx, stage) {
  stage.door.draw(ctx);
  stage.players.forEach((player) => player.draw(ctx));
  stage.cell.draw(ctx);

  if (stage.keyCarrier !== null && stage.door.state === 'LOCKED') {
    const carrier = stage.players[stage.keyCarrier];

    ctx.fillStyle = '#ffdc79';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('⚿', carrier.x + 3, carrier.y - 30);
  }
}

function drawAffordances(ctx, stage) {
  // Kleine lokale aanwijzingen zonder grote uitlegblokken
  ctx.fillStyle = '#b9afd1';
  ctx.font = '12px monospace';
  ctx.fillText('P1 ↓', 294, 430);
  ctx.fillText('↓', 703, 522);

  if (stage.ping && stage.ping.until > stage.time) {
    ctx.fillStyle = '#f379d0';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('×', stage.ping.x, stage.ping.y);
  }
}

export function drawStage1(ctx, stage, debug = false, bindings = []) {
  drawBackground(ctx);
  drawConnections(ctx, stage);
  drawWorldObjects(ctx, stage);

  stage.gateA.draw(ctx, 'details');
  stage.gateB.draw(ctx, 'details');
  stage.plate.draw(ctx);
  stage.winch.draw(ctx, stage.time);

  // Tekent de gezamenlijke onderdelen van de energypuzzel
  drawEnergyPuzzle(ctx, stage);

  drawPlayersAndItems(ctx, stage);
  drawAffordances(ctx, stage);

  stage.helpMarker?.draw(ctx, stage.time);
  drawStage01ControlHints(ctx, stage, bindings);

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
