import { stage01Config } from './stage01Config.js';

function drawBackground(ctx) {
  ctx.clearRect(0, 0, stage01Config.width, stage01Config.height);
  ctx.fillStyle = '#10162c';
  ctx.fillRect(0, 0, stage01Config.width, stage01Config.height);
  ctx.fillStyle = '#292841';
  for (let x = 20; x < stage01Config.width; x += 40)
    for (let y = 80; y < 600; y += 40) ctx.fillRect(x, y, 2, 2);
}

function drawConnections(ctx, stage) {
  const powered = stage.cell.state === 'SOCKET_A';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 8]);
  const wire = (points, active) => {
    ctx.strokeStyle = active ? '#64e4ff' : '#493e62';
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
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
  stage.platforms.forEach((p) => p.draw(ctx, 'base'));
  stage.symbolPuzzle.draw(ctx, stage.players);
  stage.key.draw(ctx);
}

function drawChargeIndicator(ctx, stage) {
  stage.chargePads.forEach((pad, i) => {
    pad.draw(ctx);
    ctx.fillStyle = pad.active ? '#64e4ff' : '#b9afd1';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`P${i + 1}`, pad.x + 12, 582);
  });
  ctx.strokeStyle = '#403956';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(1070, 495, 29, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffdc79';
  ctx.beginPath();
  ctx.arc(1070, 495, 29, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * stage.charge) / 2.5);
  ctx.stroke();
  ctx.fillStyle = stage.phase === 'EXIT' ? '#64e4ff' : '#ffdc79';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(stage.phase === 'EXIT' ? '✓' : '↯', 1058, 503);
  ctx.font = '12px monospace';
  ctx.fillText('E + ↵', 1050, 540);
}

function drawPlayersAndItems(ctx, stage) {
  stage.door.draw(ctx);
  stage.players.forEach((p) => p.draw(ctx));
  stage.cell.draw(ctx);
  if (stage.keyCarrier !== null && stage.door.state === 'LOCKED') {
    const carrier = stage.players[stage.keyCarrier];
    ctx.fillStyle = '#ffdc79';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('⚿', carrier.x + 3, carrier.y - 30);
  }
}

function drawAffordances(ctx, stage) {
  // Small local affordances, never explanatory banners.
  ctx.fillStyle = '#b9afd1';
  ctx.font = '12px monospace';
  ctx.fillText('P1 ↓', 294, 430);
  ctx.fillText('P1 [E]', 733, 247);
  if (stage.cell.state === 'LOOSE') ctx.fillText('P2 [↵]', 172, 551);
  ctx.fillText('↓', 703, 522);
  if (stage.ping && stage.ping.until > stage.time) {
    ctx.fillStyle = '#f379d0';
    ctx.font = 'bold 24px monospace';
    ctx.fillText('×', stage.ping.x, stage.ping.y);
  }
}

export function drawStage1(ctx, stage, debug = false) {
  drawBackground(ctx);
  drawConnections(ctx, stage);
  drawWorldObjects(ctx, stage);
  stage.gateA.draw(ctx, 'details');
  stage.gateB.draw(ctx, 'details');
  stage.plate.draw(ctx);
  stage.winch.draw(ctx, stage.time);
  stage.socketA.draw(ctx, stage.cell);
  stage.socketB.draw(ctx, stage.cell);
  drawChargeIndicator(ctx, stage);
  drawPlayersAndItems(ctx, stage);
  drawAffordances(ctx, stage);
  stage.helpMarker?.draw(ctx, stage.time);
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
    ].forEach((r) => ctx.strokeRect(r.x, r.y, r.w, r.h));
  }
}
