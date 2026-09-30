// Vite discovers the optional asset without issuing a missing-file request.
let background;
let backgroundUrl;
if (typeof window !== 'undefined') {
  const assets = import.meta.glob('./assets/background_test_facility.png', {
    eager: true,
    query: '?url',
    import: 'default',
  });
  backgroundUrl = assets['./assets/background_test_facility.png'];
}
export function drawFacilityBackground(ctx, time) {
  if (backgroundUrl && !background && typeof Image !== 'undefined') {
    background = new Image();
    background.src = backgroundUrl;
  }
  ctx.fillStyle = '#101a1c';
  ctx.fillRect(0, 0, 1200, 660);
  if (background?.complete && background.naturalWidth > 0) {
    ctx.drawImage(background, 0, 0, 1200, 660);
    ctx.fillStyle = '#07131655';
    ctx.fillRect(0, 0, 1200, 660);
    return;
  }
  const light = ctx.createLinearGradient(0, 0, 0, 660);
  light.addColorStop(0, '#243637');
  light.addColorStop(1, '#0c1418');
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, 1200, 660);
  for (let x = 0; x < 1200; x += 150) {
    ctx.fillStyle = '#172326';
    ctx.fillRect(x + 8, 90, 133, 480);
    ctx.strokeStyle = '#344342';
    ctx.strokeRect(x + 8, 90, 133, 480);
    ctx.fillStyle = '#35413d';
    ctx.fillRect(x, 60, 7, 540);
    ctx.strokeStyle = '#4a504530';
    ctx.beginPath();
    ctx.moveTo(x + 110, 130);
    ctx.lineTo(x + 80, 240);
    ctx.lineTo(x + 103, 278);
    ctx.stroke();
    ctx.fillStyle = '#b3b393';
    ctx.fillRect(x + 30, 95, 50, 3);
  }
  for (let y = 130; y < 200; y += 18) {
    ctx.strokeStyle = '#566157';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(470, y);
    ctx.lineTo(490, y + 30);
    ctx.lineTo(1200, y + 30);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const x = 45 + i * 157;
    ctx.strokeStyle = '#284f3d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x - 40, 70, x + 35, 120, x - 12, 210 + (i % 3) * 30);
    ctx.stroke();
    for (let j = 0; j < 8; j++) {
      ctx.fillStyle = j % 2 ? '#3a6042' : '#294f3d';
      ctx.beginPath();
      ctx.ellipse(x + Math.sin(j) * 12, 25 + j * 23, 12, 4, j, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#839589';
  ctx.font = 'bold 28px monospace';
  ctx.fillText('MERIDIAN / TEST FACILITY', 36, 48);
  ctx.font = '12px monospace';
  ctx.fillStyle = '#8f9b88';
  ctx.fillText('SECTOR 01   •   AUXILIARY POWER ONLY   •   EVACUATED', 38, 72);
  for (const x of [430, 865, 1145]) {
    ctx.fillStyle = Math.sin(time * 3) > 0 ? '#d7874c' : '#6d4938';
    ctx.fillRect(x, 105, 14, 8);
  }
  // Abandoned test cabinets and broken glass stay behind collision geometry.
  for (const x of [30, 475, 925]) {
    ctx.fillStyle = '#22332f';
    ctx.fillRect(x, 402, 90, 165);
    ctx.strokeStyle = '#4b5b50';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, 402, 90, 165);
    ctx.fillStyle = '#142323';
    ctx.fillRect(x + 9, 414, 72, 54);
    ctx.strokeStyle = '#748577';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 43, 415);
    ctx.lineTo(x + 29, 437);
    ctx.lineTo(x + 57, 449);
    ctx.stroke();
    for (let y = 482; y < 547; y += 9) {
      ctx.fillStyle = '#101f20';
      ctx.fillRect(x + 12, y, 65, 3);
    }
    ctx.fillStyle = '#777754';
    ctx.fillRect(x + 66, 552, 12, 4);
  }
}

export function machine(ctx, rect, label, status = 'OFF') {
  const { x, y, w, h } = rect;
  const color = status === 'ONLINE' ? '#87d4a2' : status === 'PARTIAL' ? '#e0b567' : '#b76b55';
  ctx.fillStyle = '#080f11';
  ctx.fillRect(x + 3, y + 4, w, h);
  ctx.fillStyle = '#394744';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#819087';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = '#101e20';
  ctx.fillRect(x + 6, y + 7, w - 12, Math.max(8, h - 16));
  for (const sx of [x + 3, x + w - 4]) {
    ctx.fillStyle = '#b0ab8e';
    ctx.fillRect(sx, y + 3, 2, 2);
    ctx.fillRect(sx, y + h - 5, 2, 2);
  }
  ctx.fillStyle = color;
  ctx.fillRect(x + w - 10, y + h - 6, 5, 3);
  ctx.font = '10px monospace';
  ctx.fillStyle = '#c3c6ad';
  ctx.fillText(label, x, y - 7);
}

export function drawFacilityStructure(ctx, stage) {
  machine(
    ctx,
    { x: 1017, y: 450, w: 110, h: 106 },
    'AUX GENERATOR',
    ['KEY', 'EXIT'].includes(stage.phase) ? 'ONLINE' : stage.phase === 'CHARGE' ? 'PARTIAL' : 'OFF',
  );
  for (const p of stage.platforms) {
    if (!p.active || p === stage.gateA || p === stage.gateB) continue;
    ctx.fillStyle = '#35433e';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = '#8a9580';
    ctx.fillRect(p.x, p.y, p.w, 3);
    ctx.fillStyle = '#1b2929';
    for (let x = p.x + 5; x < p.x + p.w - 5; x += 18)
      ctx.fillRect(x, p.y + 7, 10, Math.min(p.h - 9, 12));
  }
  for (const gate of [stage.gateA, stage.gateB]) {
    ctx.fillStyle = '#53615a';
    ctx.fillRect(gate.x - 5, gate.y - 8, gate.w + 10, 8);
    ctx.strokeStyle = '#68716a';
    ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);
    if (gate.active) {
      ctx.fillStyle = '#38423e';
      ctx.fillRect(gate.x, gate.y, gate.w, gate.h);
      for (let y = gate.y + 5; y < gate.y + gate.h; y += 16) {
        ctx.fillStyle = '#b8a260';
        ctx.fillRect(gate.x + 3, y, gate.w - 6, 5);
      }
    }
    ctx.fillStyle = gate.active ? '#cf7758' : '#87d4a2';
    ctx.fillRect(gate.x + 5, gate.y - 6, 12, 4);
  }
  ctx.font = '11px monospace';
  ctx.fillStyle = '#98a798';
  ctx.fillText('01 / ACCESS ARCHIVE', 210, 485);
  ctx.fillText('02 / MAINTENANCE', 645, 348);
  ctx.fillText('↓ SERVICE DUCT', 650, 519);
  ctx.fillText('03 / REACTOR', 969, 384);
  for (const pad of [stage.plate, ...stage.chargePads]) {
    ctx.fillStyle = '#677369';
    ctx.fillRect(pad.x, pad.y, pad.w, pad.h);
    ctx.fillStyle = pad.active ? '#87d4a2' : '#bf9e60';
    ctx.fillRect(pad.x + 4, pad.y, pad.w - 8, 3);
  }
  machine(ctx, stage.winch, 'MANUAL RELEASE', stage.winch.active ? 'ONLINE' : 'PARTIAL');
  stage.winch.draw(ctx, stage.time);
}

export function drawRepairSystems(ctx, stage) {
  const puzzle = stage.wiringPuzzle;
  const enabled = stage.phase === 'TRANSFER';
  const visible = enabled && puzzle.readerPresent(stage.players) && !puzzle.complete;
  machine(ctx, puzzle.monitor, 'DIAGNOSTICS / P1', puzzle.complete ? 'ONLINE' : 'PARTIAL');
  ctx.fillStyle = '#9cd6ae';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(
    puzzle.complete
      ? 'OK'
      : visible
        ? `${'ABC'[puzzle.index]} → ${puzzle.code[puzzle.index]}`
        : '---',
    puzzle.monitor.x + 9,
    puzzle.monitor.y + 27,
  );
  machine(ctx, puzzle.panel, 'JUNCTION / P2', puzzle.complete ? 'ONLINE' : 'OFF');
  ctx.font = 'bold 17px monospace';
  ctx.fillStyle = '#e0b567';
  ctx.fillText(
    puzzle.complete ? 'OK' : `${'ABC'[puzzle.index]}:${puzzle.selection}`,
    puzzle.panel.x + 9,
    puzzle.panel.y + 27,
  );
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = i < puzzle.index ? '#87d4a2' : '#977958';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(puzzle.panel.x + 8 + i * 15, puzzle.panel.y + 37);
    ctx.bezierCurveTo(790 + i * 20, 530, 826 + i * 8, 510, 825 + i * 10, 487);
    ctx.stroke();
  }
  if (enabled && !puzzle.complete) {
    ctx.font = '11px monospace';
    ctx.fillStyle = '#d3c8a7';
    ctx.fillText('P1 leest + bevestigt • P2 kiest 1–4', 608, 221);
    ctx.fillText(puzzle.status, 608, 237);
    if (Math.sin(stage.time * 11) > 0.97) {
      ctx.strokeStyle = '#f0d68b';
      ctx.beginPath();
      ctx.moveTo(828, 520);
      ctx.lineTo(833, 509);
      ctx.lineTo(839, 516);
      ctx.stroke();
    }
  }
  if (stage.phase === 'CHARGE') {
    ctx.fillStyle = '#d3c8a7';
    ctx.font = '12px monospace';
    ctx.fillText(stage.restartPuzzle.instruction, 970, 420);
    ctx.fillStyle = ['GREEN', 'CONFIRM', 'READY'].includes(stage.restartPuzzle.state)
      ? '#87d4a2'
      : Math.sin(stage.time * 5) > 0
        ? '#e0b567'
        : '#785637';
    ctx.beginPath();
    ctx.arc(1109, 467, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  if (stage.guardian.active) {
    ctx.fillStyle = '#d5b587';
    ctx.font = '11px monospace';
    ctx.fillText('SEC-04 • Tech: interact = 4s bypass', 670, 630);
  }
}
