import {
  drawFacilityBackground,
  drawFacilityStructure,
  drawRepairSystems,
  machine,
} from './facilityView.js';
import { drawStage01ControlHints } from './hints/controlHints.js';
import { drawEnergyPuzzle } from './puzzles/energyPuzzle/energyPuzzleView.js';

function drawConnections(ctx, stage) {
  const powered = stage.cell.state === 'SOCKET_A';

  ctx.lineWidth = 3;
  ctx.setLineDash([]);

  const wire = (points, active) => {
    ctx.strokeStyle = active ? '#87d4a2' : '#575649';
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
  drawFacilityStructure(ctx, stage);
  stage.symbolPuzzle.draw(ctx, stage.players);
  stage.key.draw(ctx);
}

function drawPlayersAndItems(ctx, stage) {
  machine(
    ctx,
    stage.door,
    'EXIT / AUTHORIZATION',
    stage.door.state === 'LOCKED' ? 'OFF' : 'ONLINE',
  );
  ctx.fillStyle = '#68786a';
  ctx.fillRect(stage.door.x + 25, stage.door.y + 9, 2, 70);
  stage.players.forEach((player) => player.draw(ctx));
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
  drawFacilityBackground(ctx, stage.time);
  drawConnections(ctx, stage);
  drawWorldObjects(ctx, stage);

  // Tekent de gezamenlijke onderdelen van de energypuzzel
  drawEnergyPuzzle(ctx, stage);

  drawRepairSystems(ctx, stage);
  stage.guardian.draw(ctx);
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
