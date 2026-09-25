import { near } from '../collision.js';

function drawCell(ctx, x, y) {
  ctx.fillStyle = '#ffdc79';
  ctx.fillRect(x, y, 24, 26);
  ctx.fillRect(x + 8, y - 4, 8, 4);
  ctx.fillStyle = '#40304c';
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 3);
  ctx.lineTo(x + 6, y + 15);
  ctx.lineTo(x + 12, y + 15);
  ctx.lineTo(x + 10, y + 23);
  ctx.lineTo(x + 19, y + 10);
  ctx.lineTo(x + 13, y + 10);
  ctx.closePath();
  ctx.fill();
}

function drawBackground(ctx) {
  ctx.clearRect(0, 0, 1200, 660);
  ctx.fillStyle = '#10162c';
  ctx.fillRect(0, 0, 1200, 660);
  ctx.fillStyle = '#292841';
  for (let x = 20; x < 1200; x += 40) for (let y = 80; y < 600; y += 40) ctx.fillRect(x, y, 2, 2);
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
  stage.platforms.forEach((p) => p.draw(ctx));
  const reader = stage.players.find((p) => p.abilities.readHint);
  stage.symbolHint.draw(
    ctx,
    stage.symbolHint.state === 'READ' && near(reader, stage.symbolHint, 25),
  );
  stage.symbolSwitches.forEach((s) => s.draw(ctx));
  ctx.fillStyle = '#b9afd1';
  ctx.font = '12px monospace';
  ctx.fillText(`${stage.matchIndex}/2`, 320, 548);
  stage.key.draw(ctx);
}

function drawGates(ctx, stage) {
  [stage.gateA, stage.gateB].forEach((gate, i) => {
    ctx.strokeStyle = gate.active ? '#f379d0' : '#64e4ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
    if (gate.active) {
      ctx.fillStyle = '#f379d0';
      for (let y = gate.y + 12; y < 600; y += 22) ctx.fillRect(gate.x + 6, y, 10, 6);
    }
    ctx.fillStyle = ctx.strokeStyle;
    ctx.font = 'bold 17px monospace';
    ctx.fillText(`${i + 1}`, gate.x + 6, gate.y - 12);
  });
}

function drawWinch(ctx, stage) {
  stage.plate.draw(ctx);
  ctx.strokeStyle = stage.winch.active ? '#64e4ff' : '#ab8bff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(760, 283, 17, 0, Math.PI * 2);
  ctx.stroke();
  const angle = stage.winch.active ? stage.time * 4 : 0;
  ctx.beginPath();
  ctx.moveTo(760 - Math.cos(angle) * 15, 283 - Math.sin(angle) * 15);
  ctx.lineTo(760 + Math.cos(angle) * 15, 283 + Math.sin(angle) * 15);
  ctx.stroke();
}

function drawSockets(ctx, stage) {
  [stage.socketA, stage.socketB].forEach((socket, i) => {
    const occupied = stage.cell.state === `SOCKET_${i === 0 ? 'A' : 'B'}`;
    ctx.fillStyle = occupied ? '#324b66' : '#292b47';
    ctx.fillRect(socket.x, socket.y, socket.w, socket.h);
    ctx.strokeStyle = occupied ? '#64e4ff' : '#ffdc79';
    ctx.lineWidth = 2;
    ctx.strokeRect(socket.x, socket.y, socket.w, socket.h);
    if (occupied) drawCell(ctx, socket.x + 10, socket.y + 9);
    ctx.fillStyle = '#ffdc79';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(i === 0 ? 'I' : 'II', socket.x + 14, socket.y - 12);
  });
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
  if (['CAGED', 'LOOSE', 'CARRIED'].includes(stage.cell.state))
    drawCell(ctx, stage.cell.x, stage.cell.y);
  if (stage.cell.state === 'CAGED') {
    ctx.strokeStyle = '#f379d0';
    ctx.lineWidth = 3;
    ctx.strokeRect(170, 553, 54, 46);
    for (let x = 180; x < 224; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, 553);
      ctx.lineTo(x, 599);
      ctx.stroke();
    }
  }
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
  drawGates(ctx, stage);
  drawWinch(ctx, stage);
  drawSockets(ctx, stage);
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
