import { energyPuzzleConfig } from './energyPuzzleConfig.js';
import { stage01LayoutConfig } from '../../stage01LayoutConfig.js';
import { drawConduit } from '../../powerNetworkView.js';

export function drawEnergyPuzzle(ctx, stage) {
  stage.socketA.draw(ctx, stage.cell);
  stage.socketB.draw(ctx, stage.cell);

  // Tekent de gezamenlijke laadindicator van de energypuzzel
  const { x: indicatorX, y: indicatorY, radius } = stage01LayoutConfig.objects.chargeIndicator;
  const powered = stage.cell.state === 'SOCKET_B';
  const ring = Array.from({ length: 33 }, (_, index) => {
    const angle = (index * Math.PI) / 16;
    return [
      Math.round(indicatorX + Math.cos(angle) * radius),
      Math.round(indicatorY + Math.sin(angle) * radius),
    ];
  });
  drawConduit(ctx, ring, powered, stage.time, {
    junctions: false,
    color: '#58d8ff',
    glow: '#64e4ff',
  });

  const progress = Math.min(stage.charge / energyPuzzleConfig.chargeDuration, 1);

  ctx.save();
  ctx.strokeStyle = powered ? '#b8ffff' : '#527d89';
  ctx.shadowColor = '#58d8ff';
  ctx.shadowBlur = powered ? 8 + Math.sin(stage.time * 5) * 2 : 0;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(indicatorX, indicatorY, radius - 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.stroke();
  if (powered) {
    for (let i = 0; i < 3; i++) {
      const angle = stage.time * 1.8 + (i * Math.PI * 2) / 3;
      const x = Math.round(indicatorX + Math.cos(angle) * radius);
      const y = Math.round(indicatorY + Math.sin(angle) * radius);
      ctx.fillStyle = '#d1ffff';
      ctx.fillRect(x - 1, y - 2, 3, 5);
    }
  }
  ctx.restore();

  ctx.fillStyle = powered ? '#b8ffff' : '#527d89';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(stage.phase === 'EXIT' ? '✓' : '↯', indicatorX - 12, indicatorY + 8);
}
