let background;
const backgroundUrl = '/assets/images/stage01/background_test_facility.png';

export function drawFacilityBackground(ctx, time) {
  if (backgroundUrl && !background && typeof Image !== 'undefined') {
    background = new Image();
    background.src = backgroundUrl;
  }

  ctx.fillStyle = '#101a1c';
  ctx.fillRect(0, 0, 1200, 660);

  if (background?.complete && background.naturalWidth > 0) {
    ctx.drawImage(background, 0, 0, 1200, 660);
    ctx.fillStyle = '#07131699';
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

  ctx.save();

  ctx.fillStyle = '#03090dcc';
  ctx.fillRect(x + 5, y + 7, w + 2, h + 2);

  ctx.shadowColor = color;
  ctx.shadowBlur = 9;

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);

  ctx.shadowBlur = 0;

  const metal = ctx.createLinearGradient(x, y, x + w, y + h);
  metal.addColorStop(0, '#819b9e');
  metal.addColorStop(0.35, '#425d64');
  metal.addColorStop(1, '#1a2c36');

  ctx.fillStyle = metal;
  ctx.fillRect(x, y, w, h);

  ctx.fillStyle = '#badcce';
  ctx.fillRect(x + 2, y + 2, w - 4, 2);

  ctx.fillStyle = '#101e26';
  ctx.fillRect(x + w - 4, y + 4, 3, h - 5);

  ctx.strokeStyle = '#819087';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  ctx.fillStyle = '#101e20';
  ctx.fillRect(x + 6, y + 7, w - 12, Math.max(8, h - 16));

  ctx.fillStyle = '#b6f5eb18';

  ctx.beginPath();
  ctx.moveTo(x + 7, y + 8);
  ctx.lineTo(x + w - 8, y + 8);
  ctx.lineTo(x + 7, y + h / 2);
  ctx.fill();

  for (const sx of [x + 3, x + w - 4]) {
    ctx.fillStyle = '#b0ab8e';
    ctx.fillRect(sx, y + 3, 2, 2);
    ctx.fillRect(sx, y + h - 5, 2, 2);
  }

  ctx.fillStyle = color;
  ctx.fillRect(x + w - 10, y + h - 6, 5, 3);

  ctx.font = 'bold 11px monospace';

  if (label) {
    ctx.fillStyle = '#061219';
    ctx.fillRect(x - 3, y - 19, label.length * 6.7 + 6, 15);
    ctx.fillStyle = '#e0eee0';
    ctx.fillText(label, x, y - 7);
  }

  ctx.restore();
}

export function drawFacilityStructure(ctx, stage) {
  for (const p of stage.platforms) {
    if (!p.active || p === stage.gateA || p === stage.gateB) continue;

    ctx.fillStyle = '#070f17';
    ctx.fillRect(p.x + 4, p.y + 7, p.w, p.h);

    ctx.fillStyle = '#435b64';
    ctx.fillRect(p.x, p.y, p.w, p.h);

    ctx.fillStyle = '#b8ded4';
    ctx.fillRect(p.x, p.y, p.w, 3);

    ctx.fillStyle = '#1b2929';

    for (let x = p.x + 5; x < p.x + p.w - 5; x += 18) {
      ctx.fillRect(x, p.y + 7, 10, Math.min(p.h - 9, 12));
    }
  }

  for (const gate of [stage.gateA, stage.gateB]) {
    ctx.fillStyle = '#53615a';
    ctx.fillRect(gate.x - 5, gate.y - 8, gate.w + 10, 8);

    ctx.strokeStyle = '#68716a';
    ctx.strokeRect(gate.x, gate.y, gate.w, gate.h);

    const visibleHeight = gate.h * (1 - (gate.slide ?? (gate.active ? 0 : 1)));

    if (visibleHeight > 0) {
      ctx.fillStyle = '#38423e';
      ctx.fillRect(gate.x, gate.y, gate.w, visibleHeight);

      for (let y = gate.y + 5; y < gate.y + visibleHeight - 5; y += 16) {
        ctx.fillStyle = '#b8a260';
        ctx.fillRect(gate.x + 3, y, gate.w - 6, 5);
      }
    }

    ctx.fillStyle = gate.active ? '#cf7758' : '#87d4a2';
    ctx.fillRect(gate.x + 5, gate.y - 6, 12, 4);
  }

  // Railings are decorative and never alter jump collision.
  for (const p of [stage.keyPlatform, stage.platforms[2]]) {
    ctx.strokeStyle = '#74968b80';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 23);
    ctx.lineTo(p.x + p.w, p.y - 23);

    for (let x = p.x; x <= p.x + p.w; x += 30) {
      ctx.moveTo(x, p.y - 23);
      ctx.lineTo(x, p.y);
    }

    ctx.stroke();
  }

  for (const pad of [stage.plate, ...stage.chargePads]) {
    ctx.fillStyle = '#677369';
    ctx.fillRect(pad.x, pad.y, pad.w, pad.h);

    ctx.fillStyle = pad.active ? '#87d4a2' : '#bf9e60';
    ctx.fillRect(pad.x + 4, pad.y, pad.w - 8, 3);
  }

  stage.winch.draw(ctx, stage.time);
}
