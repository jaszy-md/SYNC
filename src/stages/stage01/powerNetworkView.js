import { stage01LayoutConfig } from './stage01LayoutConfig.js';

// Rendering only: circuit states remain owned by the existing puzzles.
export function drawConduit(ctx, points, active, time) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  const trace = () => {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  };
  ctx.setLineDash([]);
  for (const [width, color] of [
    [10, '#071013'],
    [7, '#536368'],
    [4, '#1b2b30'],
  ]) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    trace();
  }
  // Riveted sleeves and elbow couplings give the conduit physical structure.
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i - 1],
      [endX, endY] = points[i];
    const length = Math.hypot(endX - x, endY - y);
    for (let d = 20; d < length; d += 36) {
      const px = Math.round(x + ((endX - x) * d) / length);
      const py = Math.round(y + ((endY - y) * d) / length);
      const horizontal = Math.abs(endX - x) > Math.abs(endY - y);
      ctx.fillStyle = '#798b87';
      ctx.fillRect(
        px - (horizontal ? 2 : 6),
        py - (horizontal ? 6 : 2),
        horizontal ? 4 : 12,
        horizontal ? 12 : 4,
      );
    }
  }
  if (active) {
    ctx.strokeStyle = '#58bcae';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#71f4dc';
    ctx.shadowBlur = 6;
    trace();
    ctx.strokeStyle = '#d1fff0';
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 27]);
    ctx.lineDashOffset = -time * 48;
    trace();
    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
  }
  points.forEach(([x, y], i) => {
    ctx.fillStyle = '#101c20';
    ctx.fillRect(x - 6, y - 6, 12, 12);
    ctx.strokeStyle = '#70847d';
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 6, y - 6, 12, 12);
    ctx.fillStyle = active ? '#9af1ce' : '#555e55';
    ctx.fillRect(x - 2, y - 2, 4, 4);
    if (active && i === points.length - 1) {
      ctx.strokeStyle = '#baf5d9';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 3, y);
      ctx.lineTo(x, y + 3);
      ctx.lineTo(x + 5, y - 4);
      ctx.stroke();
    }
  });
  ctx.restore();
}

export function drawPowerNetwork(ctx, stage) {
  const routes = stage01LayoutConfig.connections;
  const circuits = {
    access: !stage.gateA.active,
    bridge: stage.bridge.active,
    maintenance: !stage.gateB.active,
    portal: stage.cell.state === 'SOCKET_B',
  };
  for (const [name, points] of Object.entries(routes))
    drawConduit(ctx, points, circuits[name], stage.time);
}

export function drawPortalGate(ctx, stage) {
  const { x, y, w, h, state } = stage.door;
  const powered = ['KEY', 'EXIT'].includes(stage.phase);
  const unlocked = state !== 'LOCKED';
  const color = unlocked ? '#9ef7ec' : powered ? '#578fbd' : '#455d64';
  ctx.save();
  // Mechanical arch, anchored to the catwalk; no ordinary door panel.
  ctx.fillStyle = '#08141b';
  ctx.fillRect(x, y + 9, w, h - 9);
  ctx.fillStyle = '#425a62';
  ctx.fillRect(x, y + 10, 9, h - 10);
  ctx.fillRect(x + w - 9, y + 10, 9, h - 10);
  ctx.fillRect(x + 6, y, w - 12, 12);
  ctx.fillStyle = '#aec4b6';
  ctx.fillRect(x + 7, y + 2, w - 14, 2);
  for (let offset = 18; offset < h - 5; offset += 18) {
    ctx.fillStyle = '#182c34';
    ctx.fillRect(x + 1, y + offset, 7, 6);
    ctx.fillRect(x + w - 8, y + offset, 7, 6);
    ctx.fillStyle = color;
    ctx.fillRect(x + 3, y + offset + 1, 3, 3);
    ctx.fillRect(x + w - 6, y + offset + 1, 3, 3);
  }
  ctx.translate(x + w / 2, y + h / 2 + 3);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.shadowColor = '#58d8ff';
  ctx.shadowBlur = powered ? 12 : 0;
  ctx.beginPath();
  ctx.ellipse(0, 0, w / 2 - 12, h / 2 - 10, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (powered) {
    ctx.fillStyle = unlocked ? '#49bedd35' : '#375c8220';
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = unlocked ? 0.45 + Math.sin(stage.time * 2 + i) * 0.2 : 0.25;
      ctx.beginPath();
      ctx.ellipse(0, 0, 8 + i * 4, 17 + i * 6, Math.sin(stage.time + i) * 0.18, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 8; i++) {
      const a = stage.time * 0.8 + (i * Math.PI) / 4;
      ctx.fillStyle = '#c6ffff';
      ctx.fillRect(Math.cos(a) * (w / 2 - 12) - 1, Math.sin(a) * (h / 2 - 10) - 1, 2, 2);
    }
  }
  ctx.restore();
}
