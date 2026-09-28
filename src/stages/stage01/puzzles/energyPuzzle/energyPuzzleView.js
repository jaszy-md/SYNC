import { energyPuzzleConfig } from './energyPuzzleConfig.js';

export function drawEnergyPuzzle(ctx, stage) {
  stage.socketA.draw(ctx, stage.cell);
  stage.socketB.draw(ctx, stage.cell);

  stage.chargePads.forEach((pad, index) => {
    pad.draw(ctx);

    ctx.fillStyle = pad.active ? '#64e4ff' : '#b9afd1';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(`P${index + 1}`, pad.x + 12, 582);
  });

  // Tekent de gezamenlijke laadindicator van de energypuzzel
  const indicatorX = 1070;
  const indicatorY = 495;
  const radius = 29;

  ctx.strokeStyle = '#403956';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(indicatorX, indicatorY, radius, 0, Math.PI * 2);
  ctx.stroke();

  const progress = Math.min(stage.charge / energyPuzzleConfig.chargeDuration, 1);

  ctx.strokeStyle = '#ffdc79';
  ctx.beginPath();
  ctx.arc(
    indicatorX,
    indicatorY,
    radius,
    -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * progress,
  );
  ctx.stroke();

  ctx.fillStyle = stage.phase === 'EXIT' ? '#64e4ff' : '#ffdc79';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(stage.phase === 'EXIT' ? '✓' : '↯', 1058, 503);
}
